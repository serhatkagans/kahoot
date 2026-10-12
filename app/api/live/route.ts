import {randomBytes,randomInt} from 'node:crypto';
import {fail,getQuiz,isTeacher,limited,sameOrigin,text} from '../../../lib/server';
import {liveQuestions} from '../../../lib/quiz';
import {advanceLive,answerLive,createLive,endLive,findLive,joinLive,kickLive,lockLive,viewLive,voteLive} from '../../../lib/live';
import {archiveLive,reportCsv} from '../../../lib/reports';
import {getAssignment} from '../../../lib/assignments';
export const dynamic='force-dynamic';
const gone=()=>fail('Bu PIN ile açık bir oyun yok.',404);
// Oyunun o anki görünümü (?pin=482913&token=… ya da &host=…). Ekranlar bu adresi saniyede bir yoklar; bu yüzden hız sınırı yoktur.
// &rapor=1 ile öğretmen oyun raporunu CSV olarak indirir (Excel'de Türkçe karakterler için BOM ve ; ayırıcı).
export async function GET(request:Request){const q=new URL(request.url).searchParams,g=findLive(q.get('pin'));if(!g)return gone();const host=q.get('host')===g.host;
if(q.get('rapor')){if(!host)return fail('Raporu yalnızca oyunu açan öğretmen indirebilir.',403);if(g.phase!=='end')return fail('Rapor oyun bitince indirilebilir.',409);const csv=reportCsv(archiveLive(g));
return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="kahoot-rapor-${g.pin}.csv"`}});}
return Response.json(viewLive(g,q.get('token'),host));}
// action: create (öğretmen kütüphaneden bir kahoot ile oyun açar), join (öğrenci adıyla katılır), answer (cevap verir),
// next (öğretmen ilerletir), kick (bir adı çıkarır), lock (lobiyi kilitler/açar), end (oyunu bitirip podyuma geçer).
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);
try{const p=await request.json() as Record<string,unknown>;
if(p?.action==='create'){if(!isTeacher(request))return fail('Öğretmen girişi gerekli.',401);if(limited(request,'live',30,10*60_000))return fail('Çok fazla oyun açıldı. Birkaç dakika sonra tekrar dene.',429);
const quiz=getQuiz(p.quiz);if(!quiz)return fail('Bu kahoot bulunamadı.',404);
const qs=liveQuestions(quiz,{shuffleQ:!!p.shuffleQ,shuffleA:!!p.shuffleA});if(!qs.length)return fail('Bu kahootta oynanabilir soru yok. Düzenleyicideki uyarıları gider.');
const host=randomBytes(16).toString('hex'),label=text(p.label,1,40)??(quiz.title.slice(0,40)||'Kahoot');
for(let i=0;i<20;i++){const pin=String(randomInt(100000,1000000));if(getAssignment(pin))continue;const g=createLive({pin,host,quizId:quiz.id,label,qs,teamMode:!!p.teamMode,teamChoice:p.teamChoice!==false});if(g)return Response.json({pin:g.pin,host},{status:201});}
return fail('Oyun açılamadı. Biraz sonra tekrar dene.',503);}
const g=findLive(p?.pin);if(!g)return gone();
if(p.action==='next'||p.action==='kick'||p.action==='lock'||p.action==='end'){if(p.host!==g.host)return fail('Bu oyunu yalnızca açan öğretmen yönetebilir.',403);
if(p.action==='kick'){if(typeof p.name==='string')kickLive(g,p.name);}
else if(p.action==='lock')lockLive(g,!!p.locked);
else if(p.action==='end')endLive(g);
else if(!advanceLive(g))return fail(g.phase==='lobby'?'Başlatmak için en az bir oyuncu bağlanmalı.':'Oyun bitti.',409);
if(g.phase==='end')archiveLive(g);
return Response.json(viewLive(g,null,true));}
const token=typeof p.token==='string'&&/^[a-f0-9]{16,64}$/.test(p.token)?p.token:undefined;if(!token)return fail('Geçersiz istek.');
if(p.action==='join'){if(limited(request,'live-joins',900,10*60_000))return fail('Çok fazla giriş yapıldı. Birkaç dakika sonra tekrar dene.',429);
const name=text(p.name,2,15);if(!name)return fail('Takma adını yaz (2–15 karakter).');const r=joinLive(g,name,token,typeof p.avatar==='string'?p.avatar:undefined,typeof p.team==='string'?p.team:undefined);
if(r==='taken')return fail('Bu takma ad oyunda kullanılıyor; başka bir ad yaz.',409);if(r==='ended')return fail('Bu oyun bitti.',409);if(r==='full')return fail('Oyun dolu.',409);
if(r==='locked')return fail('Öğretmen oyunu kilitledi; şu an katılınamıyor.',423);
return Response.json(viewLive(g,token,false),{status:201});}
if(p.action==='answer'){answerLive(g,token,p.choice);return Response.json(viewLive(g,token,false));}
if(p.action==='vote'){voteLive(g,token,p.idea);return Response.json(viewLive(g,token,false));}
return fail('Geçersiz istek.');
}catch(e){console.error('Canlı oyun isteği işlenemedi',e);return fail('İstek işlenemedi. Tekrar dene.',503);}}
