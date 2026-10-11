import {deleteQuiz,fail,getQuiz,isTeacher,listQuizzes,sameOrigin,saveQuiz} from '../../../lib/server';
import {newId,playable} from '../../../lib/quiz';
export const dynamic='force-dynamic';
const denied=()=>fail('Öğretmen girişi gerekli.',401);
// Kütüphane (?id= verilmezse özet liste) ya da tek soru seti (düzenleyici ve oyun açma ekranı için). Yalnızca öğretmen görür: cevaplar içindedir.
export async function GET(request:Request){if(!isTeacher(request))return denied();const id=new URL(request.url).searchParams.get('id');
if(id){const q=getQuiz(id);return q?Response.json(q):fail('Bu kahoot bulunamadı.',404);}
return Response.json(listQuizzes().map(q=>({id:q.id,title:q.title,description:q.description,cover:q.cover??null,count:q.questions.length,playable:playable(q).length,updatedAt:q.updatedAt})));}
// action: save (kaydet; yeni ya da var olan), copy (kopyasını oluştur), delete (sil).
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);if(!isTeacher(request))return denied();
try{const p=await request.json() as Record<string,unknown>;
if(p?.action==='save'){if(JSON.stringify(p.quiz??null).length>2_000_000)return fail('Kahoot çok büyük.',413);return Response.json(saveQuiz(p.quiz));}
if(p?.action==='copy'){const q=getQuiz(p.id);if(!q)return fail('Bu kahoot bulunamadı.',404);return Response.json(saveQuiz({...q,id:newId(),title:`${q.title} (kopya)`.slice(0,95),createdAt:Date.now()}),{status:201});}
if(p?.action==='delete')return deleteQuiz(p.id)?Response.json({ok:true}):fail('Bu kahoot bulunamadı.',404);
return fail('Geçersiz istek.');
}catch(e){console.error('Kahoot isteği işlenemedi',e);return fail('İstek işlenemedi. Tekrar dene.',503);}}
