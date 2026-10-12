// Tamamlanan canlı oyunların kalıcı raporları. Ödev raporları ödev dosyasından
// anlık üretilir; bu modül yalnızca canlı oyun arşivini yönetir.
import fs from 'node:fs';
import path from 'node:path';
import {isOpinion,type QType} from './quiz.ts';
import {reportLive,type Live} from './live.ts';

export type ReportAnswer={text:string;ok:boolean|null;points:number;secs:number|null};
export type ReportPlayer={id?:string;rank:number;name:string;avatar?:string;team?:string;score:number;correct:number;completed:boolean;startedAt?:number;completedAt?:number;answers:ReportAnswer[]};
export type ReportQuestion={prompt:string;answer:string;type:QType;points?:0|1|2};
export type StoredReport={
  id:string;mode:'live'|'assignment';quizId:string;pin:string;label:string;
  createdAt:number;completedAt?:number;deadline?:number|null;status:'active'|'completed'|'expired';
  questions:ReportQuestion[];players:ReportPlayer[];
};

const root=path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR||'data');
const dir=path.join(root,'raporlar');
const safe=(id:string)=>/^[a-z0-9-]{6,80}$/.test(id)?path.join(dir,`${id}.json`):undefined;
function ready(){fs.mkdirSync(dir,{recursive:true});}
export function saveLiveReport(report:StoredReport){ready();const file=safe(report.id)!;const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(report,null,1));fs.renameSync(temp,file);return report;}

// Oyun bitince bir kez arşivlenir; sonraki çağrılar (ör. CSV indirme) öğretmenin değerlendirmelerini korumak için kayıtlı raporu döndürür.
export function archiveLive(g:Live):StoredReport{const id=`canli-${g.pin}-${g.createdAt}`,old=getLiveReport(id);if(old)return old;const base=reportLive(g);
const report:StoredReport={id,mode:'live',quizId:g.quizId,pin:g.pin,label:g.label,createdAt:g.createdAt,completedAt:g.updatedAt,status:'completed',questions:base.questions,
players:base.players.map(p=>({...p,avatar:p.avatar,completed:true,startedAt:g.createdAt,completedAt:g.updatedAt}))};saveLiveReport(report);return report;}

export function listLiveReports():StoredReport[]{ready();const out:StoredReport[]=[];for(const name of fs.readdirSync(dir))if(name.endsWith('.json')){try{out.push(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')));}catch(e){console.error('Rapor okunamadı',name,e);}}
return out.sort((a,b)=>b.createdAt-a.createdAt);}
export function getLiveReport(id:unknown):StoredReport|undefined{if(typeof id!=='string')return;ready();const file=safe(id);if(!file||!fs.existsSync(file))return;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return;}}

export function gradeLiveReport(r:StoredReport,playerId:string,index:number,ok:boolean){const player=r.players.find(p=>p.id===playerId),q=r.questions[index],answer=player?.answers[index];if(!player||q?.type!=='open'||!answer)return false;player.score-=answer.points;answer.ok=ok;answer.points=ok?1000*(q.points??1):0;player.score+=answer.points;player.correct=player.answers.filter(a=>a.ok).length;r.players.sort((a,b)=>b.score-a.score).forEach((p,i)=>p.rank=i+1);saveLiveReport(r);return true;}

export function reportSummary(r:StoredReport){const scored=r.questions.filter(q=>!isOpinion(q.type)).length,completed=r.players.filter(p=>p.completed).length;
const average=r.players.length&&scored?Math.round(r.players.reduce((sum,p)=>sum+p.correct/scored*100,0)/r.players.length):0;
return {id:r.id,mode:r.mode,pin:r.pin,label:r.label,createdAt:r.createdAt,completedAt:r.completedAt??null,deadline:r.deadline??null,status:r.status,participants:r.players.length,completed,average};}

export function reportCsv(r:StoredReport){const cell=(v:unknown)=>{const s=String(v??'');return /[";\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
const head=['Sıra','Ad','Takım','Durum','Puan','Doğru sayısı',...r.questions.flatMap((x,i)=>[`${i+1}. ${x.prompt}`,`${i+1}. puan`,`${i+1}. süre (sn)`])];
const answers=['','Doğru cevap','','','','',...r.questions.flatMap(x=>[isOpinion(x.type)?'(görüş)':x.type==='open'?'(öğretmen değerlendirir)':x.answer,'',''])];
const rows=r.players.map(p=>[p.rank,p.name,p.team??'',p.completed?'Tamamladı':'Tamamlamadı',p.score,`${p.correct}/${r.questions.filter(q=>!isOpinion(q.type)).length}`,...p.answers.flatMap(a=>[a.text?`${a.ok===true?'✓ ':a.ok===false?'✗ ':''}${a.text}`:'—',a.points,a.secs??''])]);
return '\ufeff'+[head,answers,...rows].map(row=>row.map(cell).join(';')).join('\r\n');}
