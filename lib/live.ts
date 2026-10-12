// Canlı yarışma (Kahoot): öğretmen oyunu açar, öğrenciler PIN ile bağlanır, sorular öğretmenin hızıyla ilerler.
// Akış: lobby (bekleme salonu) → question (önce yalnızca soru, sonra şıklar) → reveal (doğru cevap ve dağılım) → board (ara skor tablosu) → … → end (podyum).
// Oyunlar sunucu belleğinde tutulur (tek süreç); sunucu yeniden başlarsa süren oyunlar kapanır. Bağımlılığı yoktur (testler doğrudan içe aktarır).
import {fold,isOpinion,TEXT_TYPES,type LiveQ} from './quiz.ts';
export type {LiveQ};
export type LivePhase='lobby'|'question'|'reveal'|'board'|'end';
export const AVATARS=['🦊','🐼','🐯','🐸','🐵','🦄','🐙','🐧','🦁','🐨','🐲','🤖'];
export const TEAMS=[{id:'mor',name:'Mor Takım',color:'#7b2cbf'},{id:'mavi',name:'Mavi Takım',color:'#1368ce'},{id:'yesil',name:'Yeşil Takım',color:'#26890c'},{id:'turuncu',name:'Turuncu Takım',color:'#d96c06'}];
// pick: seçilen şıklar (tek seçimde bir tane; sıralamada girilen sıra), typed: yazılan cevap. ok: ankette null.
type Ans={pick:number[];typed:string;value:number|null;pin:{x:number;y:number}|null;ok:boolean|null;points:number;ms:number};
// prev: soru başlamadan önceki sıra (ara tabloda kimin yükseldiğini göstermek için).
type Player={token:string;name:string;avatar:string;team:string;score:number;streak:number;prev:number;answers:(Ans|undefined)[];votes:Record<number,string>;joined:number};
// intro: şıklar açılmadan önce sorunun tek başına göründüğü süre (ms); cevap süresi şıklar açılınca (opensAt) başlar ve soruya göre değişir.
export type Live={pin:string;host:string;quizId:string;label:string;intro:number;qs:LiveQ[];phase:LivePhase;at:number;opensAt:number;endsAt:number;locked:boolean;teamMode:boolean;teamChoice:boolean;teams:typeof TEAMS;players:Map<string,Player>;seq:number;createdAt:number;updatedAt:number};
// Next, rotaları ayrı paketleyebildiği için depo globalThis üzerinde tutulur.
const store=():Map<string,Live>=>((globalThis as {__kahootLive?:Map<string,Live>}).__kahootLive??=new Map());
const idle=3*60*60_000,maxGames=300,maxPlayers=300;
export function createLive(o:{pin:string;host:string;quizId?:string;label:string;qs:LiveQ[];intro?:number;teamMode?:boolean;teamChoice?:boolean},now=Date.now()):Live|undefined{const s=store();for(const [k,g] of s)if(now-g.updatedAt>idle)s.delete(k);
if(s.has(o.pin)||s.size>=maxGames||!o.qs.length)return undefined;const g:Live={intro:4000,quizId:'',teamMode:false,teamChoice:true,...o,teams:TEAMS,phase:'lobby',at:-1,opensAt:0,endsAt:0,locked:false,players:new Map(),seq:0,createdAt:now,updatedAt:now};s.set(o.pin,g);return g;}
export function findLive(pin:unknown,now=Date.now()){if(typeof pin!=='string')return undefined;const g=store().get(pin);if(g&&g.phase==='question'&&now>=g.endsAt)close(g);return g;}
const key=(s:string)=>s.trim().toLocaleLowerCase('tr').replace(/\s+/g,' ');
const ranked=(g:Live)=>[...g.players.values()].sort((a,b)=>b.score-a.score||a.joined-b.joined);
const scored=(q:LiveQ)=>!isOpinion(q.type)&&q.type!=='open'&&q.points>0;
// Oyun başladıktan sonra da katılınabilir (lobi kilitli değilse); aynı cihaz (token) geri gelirse kaldığı yerden sürer.
export function joinLive(g:Live,name:string,token:string,avatar?:string,team?:string,now=Date.now()):'ok'|'taken'|'ended'|'full'|'locked'{if(g.players.has(token))return 'ok';if(g.phase==='end')return 'ended';if(g.locked)return 'locked';
if([...g.players.values()].some(p=>key(p.name)===key(name)))return 'taken';if(g.players.size>=maxPlayers)return 'full';
const chosen=g.teamMode&&(g.teamChoice&&g.teams.some(t=>t.id===team)?team:g.teams.reduce((best,t)=>[...g.players.values()].filter(p=>p.team===t.id).length<[...g.players.values()].filter(p=>p.team===best.id).length?t:best,g.teams[0]).id)||'';
g.players.set(token,{token,name,avatar:avatar&&AVATARS.includes(avatar)?avatar:AVATARS[g.seq%AVATARS.length],team:chosen,score:0,streak:0,prev:g.players.size,answers:[],votes:{},joined:g.seq++});g.updatedAt=now;return 'ok';}
export function kickLive(g:Live,name:string){for(const p of g.players.values())if(p.name===name)g.players.delete(p.token);}
export function lockLive(g:Live,locked:boolean){g.locked=locked;}
function ask(g:Live,i:number,now:number){ranked(g).forEach((p,r)=>{p.prev=r;});g.at=i;g.phase='question';g.opensAt=now+g.intro;g.endsAt=g.opensAt+g.qs[i].time*1000;}
// Soru kapanır: puanlı soruda cevap vermeyenlerin serisi sıfırlanır.
function close(g:Live){if(scored(g.qs[g.at]))for(const p of g.players.values())if(!p.answers[g.at])p.streak=0;g.phase='reveal';}
// Gelen cevabı soru türüne göre doğrular; geçersizse undefined.
function parse(q:LiveQ,choice:unknown):{pick:number[];typed:string;value:number|null;pin:{x:number;y:number}|null}|undefined{const n=q.options.length,idx=(x:unknown)=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<n,empty={pick:[] as number[],typed:'',value:null,pin:null};
if(TEXT_TYPES.includes(q.type)){if(typeof choice!=='string')return;const typed=choice.replace(/\s+/g,' ').trim().slice(0,q.type==='open'?250:60);return typed?{...empty,typed}:undefined;}
if(q.type==='slider'||q.type==='scale'){if(typeof choice!=='number'||!Number.isFinite(choice)||choice<q.min||choice>q.max)return;return {...empty,value:choice};}
if(q.type==='pin'){const p=choice&&typeof choice==='object'?choice as Record<string,unknown>:null;if(!p||typeof p.x!=='number'||typeof p.y!=='number'||p.x<0||p.x>100||p.y<0||p.y>100)return;return {...empty,pin:{x:p.x,y:p.y}};}
if(q.type==='puzzle'||q.multi){if(!Array.isArray(choice)||!choice.length||!choice.every(idx)||new Set(choice).size!==choice.length)return;
if(q.type==='puzzle'&&choice.length!==n)return;return {...empty,pick:choice as number[]};}
return idx(choice)?{...empty,pick:[choice as number]}:undefined;}
function judge(q:LiveQ,a:{pick:number[];typed:string;value:number|null;pin:{x:number;y:number}|null}):boolean|null{if(isOpinion(q.type)||q.type==='open')return null;
if(q.type==='type'){const t=fold(a.typed);return !!t&&q.accept.some(x=>fold(x)===t);}
if(q.type==='slider')return a.value!==null&&Math.abs(a.value-q.value)<=q.tolerance;
if(q.type==='pin')return !!a.pin&&Math.hypot(a.pin.x-q.pinX,a.pin.y-q.pinY)<=q.pinRadius;
if(q.type==='puzzle')return a.pick.every((v,i)=>v===q.correct[i]);
if(q.multi)return a.pick.length===q.correct.length&&a.pick.every(v=>q.correct.includes(v));
return q.correct.includes(a.pick[0]);}
// Puan (Kahoot'taki gibi): doğru cevap, sorunun puanının (1000 ya da 2000) hıza göre yarısı ile tamamı arası; seri bonusu ardışık her doğru için +100 (en çok +500).
// Anket ve puansız sorular puan getirmez, seriyi bozmaz. Herkes cevaplayınca soru kendiliğinden kapanır. Şıklar açılmadan (intro) cevap alınmaz.
export function answerLive(g:Live,token:string,choice:unknown,now=Date.now()){const p=g.players.get(token),q=g.qs[g.at];
if(!p||!q||g.phase!=='question'||now<g.opensAt||now>=g.endsAt||p.answers[g.at])return false;const a=parse(q,choice);if(!a)return false;
const total=q.time*1000,ms=Math.min(total,now-g.opensAt),ok=judge(q,a),points=ok&&scored(q)?Math.round(1000*q.points*(1-ms/total/2))+Math.min(p.streak,5)*100:0;
p.answers[g.at]={...a,ok,points,ms};if(scored(q))p.streak=ok?p.streak+1:0;p.score+=points;g.updatedAt=now;
if([...g.players.values()].every(x=>x.answers[g.at]))close(g);return true;}
export function voteLive(g:Live,token:string,idea:unknown){const p=g.players.get(token),q=g.qs[g.at];if(!p||g.phase!=='reveal'||q?.type!=='brainstorm'||typeof idea!=='string'||idea===token)return false;const owner=g.players.get(idea);if(!owner?.answers[g.at]?.typed)return false;p.votes[g.at]=idea;g.updatedAt=Date.now();return true;}
// Öğretmenin "ilerlet" düğmesi: her basışta bir sonraki aşamaya geçilir.
export function advanceLive(g:Live,now=Date.now()){g.updatedAt=now;
if(g.phase==='lobby'){if(!g.players.size)return false;ask(g,0,now);}
else if(g.phase==='question')close(g);
else if(g.phase==='reveal')g.phase=g.at+1<g.qs.length?'board':'end';
else if(g.phase==='board')ask(g,g.at+1,now);
else return false;return true;}
// Öğretmen oyunu erken bitirir: doğrudan podyuma geçilir.
export function endLive(g:Live,now=Date.now()){if(g.phase==='end')return false;if(g.phase==='question')close(g);g.phase='end';g.updatedAt=now;return true;}
// İstemciye giden görünüm. Doğru cevap ve puanlar soru kapanmadan gönderilmez (cevaplayanın puanı da soru bitene dek eski hâliyle görünür).
// q.intro: şıkların açılmasına kalan süre; q.left: sorunun kapanmasına kalan süre (ikisi de ms).
export function viewLive(g:Live,token:string|null,host:boolean,now=Date.now()){const list=ranked(g),q=g.phase==='end'||g.at<0?undefined:g.qs[g.at],open=g.phase==='question',shown=!!q&&!open;
const row=(p:Player,i:number)=>({name:p.name,avatar:p.avatar,score:p.score,gain:p.answers[g.at]?.points??0,move:g.at>0?p.prev-i:0,streak:p.streak});
const i=token?list.findIndex(p=>p.token===token):-1,p=list[i],a=p?.answers[g.at];
const done=list.filter(x=>x.answers[g.at]),best=<T,>(xs:T[],v:(x:T)=>number)=>xs.reduce<T|undefined>((m,x)=>!m||v(x)>v(m)?x:m,undefined);
const riser=best(list.map(row).filter(r=>r.move>0),r=>r.move),fast=best(done.filter(x=>x.answers[g.at]!.ok),x=>-x.answers[g.at]!.ms),hot=best(list.filter(x=>x.streak>=2),x=>x.streak);
// Cevabı yaz sorusunda en sık verilen yazımlar (aynı yazım tek satırda).
const typed=()=>{const m=new Map<string,{text:string;n:number;ok:boolean}>();for(const x of done){const t=x.answers[g.at]!,k=fold(t.typed)||t.typed;const e=m.get(k)??{text:t.typed,n:0,ok:!!t.ok};e.n++;m.set(k,e);}return [...m.values()].sort((a,b)=>b.n-a.n).slice(0,6);};
const values=()=>{const m=new Map<number,number>();for(const x of done){const value=x.answers[g.at]!.value;if(value!==null)m.set(value,(m.get(value)||0)+1);}return [...m].sort((a,b)=>a[0]-b[0]).map(([value,n])=>({value,n}));};
const ideas=()=>done.filter(x=>x.answers[g.at]!.typed).map(x=>({id:x.token,text:x.answers[g.at]!.typed,votes:list.filter(p=>p.votes[g.at]===x.token).length})).sort((a,b)=>b.votes-a.votes);
const teamBoard=g.teamMode?g.teams.map(t=>({id:t.id,name:t.name,color:t.color,score:list.filter(p=>p.team===t.id).reduce((s,p)=>s+p.score,0),members:list.filter(p=>p.team===t.id).length})).filter(t=>t.members).sort((a,b)=>b.score-a.score):undefined;
const above=p&&i>0?list[i-1]:undefined,score=p?(open?p.score-(a?.points??0):p.score):0;
return {pin:g.pin,label:g.label,phase:g.phase,at:g.at,total:g.qs.length,time:q?.time??0,count:list.length,host,locked:g.locked,
teamMode:g.teamMode,teamChoice:g.teamChoice,teams:g.teamMode?g.teams.map(t=>({...t,count:list.filter(p=>p.team===t.id).length})):undefined,teamBoard:g.phase==='board'||g.phase==='end'?teamBoard:undefined,
players:g.phase==='lobby'?list.map(x=>({name:x.name,avatar:x.avatar,team:x.team})):undefined,
q:q?{type:q.type,prompt:q.prompt,options:q.options,image:q.image,multi:q.multi,points:q.points,min:q.min,max:q.max,step:q.step,unit:q.unit,lowLabel:q.lowLabel,highLabel:q.highLabel,intro:open?Math.max(0,g.opensAt-now):0,left:open?Math.max(0,g.endsAt-now):0,answered:done.length}:undefined,
result:shown?{correct:q.correct,answer:q.answer,counts:q.options.map((_,n)=>done.filter(x=>x.answers[g.at]!.pick.includes(n)).length),right:done.filter(x=>x.answers[g.at]!.ok).length,
wrong:done.filter(x=>x.answers[g.at]!.ok===false).length,missed:list.length-done.length,typed:TEXT_TYPES.includes(q.type)?typed():undefined,values:q.type==='slider'||q.type==='scale'?values():undefined,pins:q.type==='pin'?done.flatMap(x=>x.answers[g.at]!.pin?[{...x.answers[g.at]!.pin!,ok:x.answers[g.at]!.ok}]:[]):undefined,target:q.type==='pin'?{x:q.pinX,y:q.pinY,radius:q.pinRadius}:undefined,number:q.type==='slider'?q.value:undefined,ideas:q.type==='brainstorm'?ideas():undefined}:undefined,
board:g.phase==='board'?list.slice(0,10).map(row):g.phase==='end'?list.map(row):undefined,
stars:g.phase==='board'?{riser:riser&&{name:riser.name,move:riser.move},fastest:fast&&{name:fast.name,secs:Math.round(fast.answers[g.at]!.ms/100)/10},streak:hot&&{name:hot.name,streak:hot.streak}}:undefined,
me:p?{id:p.token,name:p.name,avatar:p.avatar,team:p.team,score,rank:(open?p.prev:i)+1,answered:!!a,pick:a?a.pick:null,typed:a?a.typed:null,value:a?a.value:null,pin:a?a.pin:null,vote:p.votes[g.at]??null,ok:!open&&a?a.ok:null,points:!open&&a?a.points:0,streak:open?0:p.streak,move:!open&&g.at>0?p.prev-i:0,
behind:!open&&above?{name:above.name,gap:above.score-p.score}:null}:undefined};}
export type LiveView=ReturnType<typeof viewLive>;
// Oyun raporu (öğretmen indirir): her oyuncunun sırası, puanı, doğru sayısı ve her sorudaki cevabı.
export function reportLive(g:Live){const list=ranked(g);
const say=(q:LiveQ,a:Ans|undefined)=>!a?'':TEXT_TYPES.includes(q.type)?a.typed:q.type==='slider'||q.type==='scale'?`${a.value??''}${q.unit?` ${q.unit}`:''}`:q.type==='pin'&&a.pin?`%${Math.round(a.pin.x)}, %${Math.round(a.pin.y)}`:a.pick.map(n=>q.options[n]).join(q.type==='puzzle'?' → ':' + ');
return {label:g.label,questions:g.qs.map(q=>({prompt:q.prompt,answer:q.answer,type:q.type,points:q.points})),
players:list.map((p,i)=>({id:p.token,rank:i+1,name:p.name,avatar:p.avatar,team:g.teams.find(t=>t.id===p.team)?.name??'',score:p.score,correct:p.answers.filter(a=>a?.ok).length,answers:g.qs.map((q,n)=>{const a=p.answers[n];return {text:say(q,a),ok:a?.ok??null,points:a?.points??0,secs:a?Math.round(a.ms/100)/10:null};})}))};}
