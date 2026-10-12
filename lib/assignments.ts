// Kendi hızında çözülen ödevler: ödev ve öğrenci ilerlemeleri DATA_DIR/odevler
// altında kalıcı tutulur. Her cihaz token'ıyla kendi kaldığı yerden devam eder.
import fs from 'node:fs';
import path from 'node:path';
import {fold,isOpinion,TEXT_TYPES,type LiveQ} from './quiz.ts';
import {AVATARS} from './live.ts';
import type {ReportAnswer,StoredReport} from './reports.ts';

export type AssignmentAnswer={pick:number[];typed:string;value:number|null;pin:{x:number;y:number}|null;text:string;ok:boolean|null;points:number;ms:number};
export type AssignmentPlayer={token:string;name:string;avatar:string;score:number;streak:number;at:number;phase:'question'|'reveal'|'end';answers:(AssignmentAnswer|null)[];votes:Record<number,string>;startedAt:number;questionAt:number;completedAt?:number};
export type Assignment={pin:string;quizId:string;label:string;deadline:number|null;timer:boolean;createdAt:number;updatedAt:number;qs:LiveQ[];players:Record<string,AssignmentPlayer>};

const root=path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR||'data'),dir=path.join(root,'odevler');
const file=(pin:string)=>/^\d{6}$/.test(pin)?path.join(dir,`${pin}.json`):undefined;
const key=(s:string)=>s.trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
const scored=(q:LiveQ)=>!isOpinion(q.type)&&q.type!=='open'&&q.points>0;
function ready(){fs.mkdirSync(dir,{recursive:true});}

export function newAssignment(o:{pin:string;quizId:string;label:string;deadline:number|null;timer:boolean;qs:LiveQ[]},now=Date.now()):Assignment{
return {...o,createdAt:now,updatedAt:now,players:{}};}
export function saveAssignment(a:Assignment){ready();const target=file(a.pin);if(!target)throw Error('Geçersiz ödev PIN’i.');a.updatedAt=Date.now();const temp=`${target}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(a,null,1));fs.renameSync(temp,target);return a;}
export function getAssignment(pin:unknown):Assignment|undefined{if(typeof pin!=='string')return;ready();const target=file(pin);if(!target||!fs.existsSync(target))return;try{return JSON.parse(fs.readFileSync(target,'utf8'));}catch{return;}}
export function listAssignments():Assignment[]{ready();const out:Assignment[]=[];for(const name of fs.readdirSync(dir))if(name.endsWith('.json')){try{out.push(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')));}catch(e){console.error('Ödev okunamadı',name,e);}}return out.sort((a,b)=>b.createdAt-a.createdAt);}

export function joinAssignment(a:Assignment,name:string,token:string,avatar?:string,now=Date.now()):'ok'|'taken'|'expired'|'full'{
if(a.players[token])return 'ok';if(a.deadline&&now>a.deadline)return 'expired';const players=Object.values(a.players);if(players.some(p=>key(p.name)===key(name)))return 'taken';if(players.length>=300)return 'full';
a.players[token]={token,name,avatar:avatar&&AVATARS.includes(avatar)?avatar:AVATARS[players.length%AVATARS.length],score:0,streak:0,at:0,phase:'question',answers:[],votes:{},startedAt:now,questionAt:now};return 'ok';}

type Parsed={pick:number[];typed:string;value:number|null;pin:{x:number;y:number}|null};
function parse(q:LiveQ,choice:unknown):Parsed|undefined{const n=q.options.length,idx=(x:unknown)=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<n,empty:Parsed={pick:[],typed:'',value:null,pin:null};
if(TEXT_TYPES.includes(q.type)){if(typeof choice!=='string')return;const typed=choice.replace(/\s+/g,' ').trim().slice(0,q.type==='open'?250:60);return typed?{...empty,typed}:undefined;}
if(q.type==='slider'||q.type==='scale'){if(typeof choice!=='number'||!Number.isFinite(choice)||choice<q.min||choice>q.max)return;return {...empty,value:choice};}
if(q.type==='pin'){const point=choice&&typeof choice==='object'?choice as Record<string,unknown>:null;if(!point||typeof point.x!=='number'||typeof point.y!=='number'||point.x<0||point.x>100||point.y<0||point.y>100)return;return {...empty,pin:{x:point.x,y:point.y}};}
if(q.type==='puzzle'||q.multi){if(!Array.isArray(choice)||!choice.length||!choice.every(idx)||new Set(choice).size!==choice.length)return;if(q.type==='puzzle'&&choice.length!==n)return;return {...empty,pick:choice as number[]};}
return idx(choice)?{...empty,pick:[choice as number]}:undefined;}
function judge(q:LiveQ,x:Parsed){if(isOpinion(q.type)||q.type==='open')return null;if(q.type==='type'){const typed=fold(x.typed);return !!typed&&q.accept.some(v=>fold(v)===typed);}if(q.type==='slider')return x.value!==null&&Math.abs(x.value-q.value)<=q.tolerance;if(q.type==='pin')return !!x.pin&&Math.hypot(x.pin.x-q.pinX,x.pin.y-q.pinY)<=q.pinRadius;
if(q.type==='puzzle')return x.pick.every((v,i)=>v===q.correct[i]);if(q.multi)return x.pick.length===q.correct.length&&x.pick.every(v=>q.correct.includes(v));return q.correct.includes(x.pick[0]);}
function text(q:LiveQ,x:Parsed){return TEXT_TYPES.includes(q.type)?x.typed:q.type==='slider'||q.type==='scale'?`${x.value??''}${q.unit?` ${q.unit}`:''}`:q.type==='pin'&&x.pin?`%${Math.round(x.pin.x)}, %${Math.round(x.pin.y)}`:x.pick.map(i=>q.options[i]).join(q.type==='puzzle'?' → ':' + ');}
function miss(a:Assignment,p:AssignmentPlayer,now:number){const q=a.qs[p.at];p.answers[p.at]={pick:[],typed:'',value:null,pin:null,text:'',ok:isOpinion(q.type)||q.type==='open'?null:false,points:0,ms:q.time*1000};if(scored(q))p.streak=0;p.phase='reveal';a.updatedAt=now;}
export function expireAssignment(a:Assignment,token:string,now=Date.now()){const p=a.players[token],q=p&&a.qs[p.at];if(!p||!q||!a.timer||p.phase!=='question'||now<p.questionAt+q.time*1000)return false;miss(a,p,now);return true;}
export function answerAssignment(a:Assignment,token:string,choice:unknown,now=Date.now()){const p=a.players[token],q=p&&a.qs[p.at];if(!p||!q||p.phase!=='question'||(a.deadline&&now>a.deadline))return false;
if(a.timer&&now>=p.questionAt+q.time*1000){miss(a,p,now);return false;}const parsed=parse(q,choice);if(!parsed)return false;const ms=Math.max(0,now-p.questionAt),ok=judge(q,parsed),base=1000*q.points;
const points=ok&&scored(q)?Math.round(a.timer?base*(1-Math.min(1,ms/(q.time*1000))/2):base)+Math.min(p.streak,5)*100:0;
p.answers[p.at]={...parsed,text:text(q,parsed),ok,points,ms};if(scored(q))p.streak=ok?p.streak+1:0;p.score+=points;p.phase='reveal';a.updatedAt=now;return true;}
export function nextAssignment(a:Assignment,token:string,now=Date.now()){const p=a.players[token];if(!p||p.phase!=='reveal')return false;if(p.at+1>=a.qs.length){p.phase='end';p.completedAt=now;}else{p.at++;p.phase='question';p.questionAt=now;}a.updatedAt=now;return true;}
export function voteAssignment(a:Assignment,token:string,idea:unknown){const p=a.players[token],q=p&&a.qs[p.at];if(!p||p.phase!=='reveal'||q?.type!=='brainstorm'||typeof idea!=='string'||idea===token||!a.players[idea]?.answers[p.at]?.typed)return false;p.votes??={};p.votes[p.at]=idea;return true;}
export function gradeAssignment(a:Assignment,token:string,index:number,ok:boolean){const p=a.players[token],q=a.qs[index],answer=p?.answers[index];if(!p||q?.type!=='open'||!answer)return false;p.score-=answer.points;answer.ok=ok;answer.points=ok?1000*q.points:0;p.score+=answer.points;return true;}

export function viewAssignment(a:Assignment,token:string|null,now=Date.now()){const p=token?a.players[token]:undefined,q=p&&p.phase!=='end'?a.qs[p.at]:undefined,answer=p&&q?p.answers[p.at]:null;
const done=p?.answers.filter(Boolean).length??0,players=Object.values(a.players),rank=p?[...players].sort((x,y)=>y.score-x.score||x.startedAt-y.startedAt).findIndex(x=>x.token===p.token)+1:0;
return {pin:a.pin,label:a.label,total:a.qs.length,deadline:a.deadline,timer:a.timer,closed:!!a.deadline&&now>a.deadline,phase:p?.phase??null,
q:q?{type:q.type,prompt:q.prompt,image:q.image,options:q.options,multi:q.multi,points:q.points,time:q.time,min:q.min,max:q.max,step:q.step,unit:q.unit,lowLabel:q.lowLabel,highLabel:q.highLabel,intro:0,left:a.timer&&p?.phase==='question'?Math.max(0,p.questionAt+q.time*1000-now):q.time*1000,answered:done}:undefined,
result:p?.phase==='reveal'&&q?{correct:q.correct,answer:q.answer,number:q.type==='slider'?q.value:undefined,target:q.type==='pin'?{x:q.pinX,y:q.pinY,radius:q.pinRadius}:undefined,ideas:q.type==='brainstorm'?players.filter(x=>x.answers[p.at]?.typed).map(x=>({id:x.token,text:x.answers[p.at]!.typed,votes:players.filter(y=>y.votes?.[p.at]===x.token).length})).sort((x,y)=>y.votes-x.votes):undefined}:undefined,
me:p?{name:p.name,avatar:p.avatar,score:p.score,streak:p.streak,rank,at:p.at,answered:!!answer,answer:answer?{text:answer.text,ok:answer.ok,points:answer.points,value:answer.value,pin:answer.pin}:null,vote:p.votes?.[p.at]??null,correct:p.answers.filter(x=>x?.ok).length}:undefined};}
export type AssignmentView=ReturnType<typeof viewAssignment>;

export function assignmentReport(a:Assignment,now=Date.now()):StoredReport{const ranked=Object.values(a.players).sort((x,y)=>y.score-x.score||x.startedAt-y.startedAt),status=a.deadline&&now>a.deadline?'expired':'active';
return {id:`odev-${a.pin}`,mode:'assignment',quizId:a.quizId,pin:a.pin,label:a.label,createdAt:a.createdAt,completedAt:ranked.length&&ranked.every(p=>p.completedAt)?Math.max(...ranked.map(p=>p.completedAt??0)):undefined,deadline:a.deadline,status,questions:a.qs.map(q=>({prompt:q.prompt,answer:q.answer,type:q.type,points:q.points})),
players:ranked.map((p,i)=>({id:p.token,rank:i+1,name:p.name,avatar:p.avatar,team:'',score:p.score,correct:p.answers.filter(x=>x?.ok).length,completed:p.phase==='end',startedAt:p.startedAt,completedAt:p.completedAt,
answers:a.qs.map((_,n):ReportAnswer=>{const x=p.answers[n];return x?{text:x.text,ok:x.ok,points:x.points,secs:Math.round(x.ms/100)/10}:{text:'',ok:null,points:0,secs:null};})}))};}
