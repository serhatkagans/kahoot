import {randomInt} from 'node:crypto';
import {answerAssignment,expireAssignment,getAssignment,joinAssignment,newAssignment,nextAssignment,saveAssignment,viewAssignment,voteAssignment} from '../../../lib/assignments';
import {fail,getQuiz,isTeacher,limited,sameOrigin,text} from '../../../lib/server';
import {liveQuestions} from '../../../lib/quiz';
import {findLive} from '../../../lib/live';
export const dynamic='force-dynamic';
const gone=()=>fail('Bu PIN ile bir ödev bulunamadı.',404);

// PIN bilgisi herkese açıktır; öğrenci token gönderirse yalnızca kendi ilerlemesini görür.
export async function GET(request:Request){const q=new URL(request.url).searchParams,a=getAssignment(q.get('pin'));if(!a)return gone();const token=q.get('token');
if(a.deadline&&Date.now()>a.deadline&&(!token||!a.players[token]?.completedAt))return fail('Bu ödevin süresi doldu.',410);
if(token&&expireAssignment(a,token)){saveAssignment(a);}return Response.json(viewAssignment(a,token));}

export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);try{const p=await request.json() as Record<string,unknown>;
if(p.action==='create'){if(!isTeacher(request))return fail('Öğretmen girişi gerekli.',401);if(limited(request,'assignments',30,10*60_000))return fail('Çok fazla ödev oluşturuldu. Birkaç dakika sonra tekrar dene.',429);
const quiz=getQuiz(p.quiz);if(!quiz)return fail('Bu kahoot bulunamadı.',404);const qs=liveQuestions(quiz,{shuffleQ:!!p.shuffleQ,shuffleA:!!p.shuffleA});if(!qs.length)return fail('Bu kahootta oynanabilir soru yok.',409);
const deadline=typeof p.deadline==='number'&&Number.isFinite(p.deadline)&&p.deadline>Date.now()?p.deadline:null;if(!deadline)return fail('Gelecekte bir bitiş tarihi seç.',400);
const label=text(p.label,1,40)??(quiz.title.slice(0,40)||'Ödev');for(let i=0;i<30;i++){const pin=String(randomInt(100000,1000000));if(!getAssignment(pin)&&!findLive(pin)){const a=newAssignment({pin,quizId:quiz.id,label,deadline,timer:!!p.timer,qs});saveAssignment(a);return Response.json({pin:a.pin,label:a.label,deadline:a.deadline},{status:201});}}
return fail('Ödev oluşturulamadı. Tekrar dene.',503);}
const a=getAssignment(p.pin);if(!a)return gone();const token=typeof p.token==='string'&&/^[a-f0-9]{16,64}$/.test(p.token)?p.token:undefined;if(!token)return fail('Geçersiz istek.');
if(a.deadline&&Date.now()>a.deadline&&!a.players[token]?.completedAt)return fail('Bu ödevin süresi doldu.',410);
if(p.action==='join'){if(limited(request,'assignment-joins',900,10*60_000))return fail('Çok fazla giriş yapıldı. Birkaç dakika sonra tekrar dene.',429);const name=text(p.name,2,15);if(!name)return fail('Takma adını yaz (2–15 karakter).');
const result=joinAssignment(a,name,token,typeof p.avatar==='string'?p.avatar:undefined);if(result==='taken')return fail('Bu ad ödevde kullanılıyor; başka bir ad yaz.',409);if(result==='expired')return fail('Bu ödevin süresi doldu.',410);if(result==='full')return fail('Ödev katılımcı sınırına ulaştı.',409);saveAssignment(a);return Response.json(viewAssignment(a,token),{status:201});}
if(p.action==='answer'){if(expireAssignment(a,token)){saveAssignment(a);return Response.json(viewAssignment(a,token));}if(!answerAssignment(a,token,p.choice))return fail('Cevap alınamadı.',409);saveAssignment(a);return Response.json(viewAssignment(a,token));}
if(p.action==='next'){if(!nextAssignment(a,token))return fail('Önce soruyu cevapla.',409);saveAssignment(a);return Response.json(viewAssignment(a,token));}
if(p.action==='vote'){if(!voteAssignment(a,token,p.idea))return fail('Bu fikir oylanamadı.',409);saveAssignment(a);return Response.json(viewAssignment(a,token));}
if(p.action==='expire'){expireAssignment(a,token);saveAssignment(a);return Response.json(viewAssignment(a,token));}
return fail('Geçersiz istek.');
}catch(e){console.error('Ödev isteği işlenemedi',e);return fail('İstek işlenemedi. Tekrar dene.',503);}}
