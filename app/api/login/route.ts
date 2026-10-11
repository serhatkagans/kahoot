import {cookieName,cookieValue,fail,isTeacher,limited,needsLogin,sameOrigin} from '../../../lib/server';
export const dynamic='force-dynamic';
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
const cookie=(v:string,age:number)=>`${cookieName}=${v}; Path=${base||'/'}; HttpOnly; SameSite=Lax; Max-Age=${age}`;
// Oturum durumu: şifre gerekiyor mu, bu tarayıcı öğretmen mi?
export async function GET(request:Request){return Response.json({teacher:isTeacher(request),needsLogin:needsLogin()});}
export async function POST(request:Request){if(!sameOrigin(request))return fail('Geçersiz istek.',403);
if(limited(request,'login',20,10*60_000))return fail('Çok fazla deneme. Birkaç dakika sonra tekrar dene.',429);
const p=await request.json().catch(()=>({})) as Record<string,unknown>,v=cookieValue(p.password);if(!v)return fail('Şifre yanlış.',401);
return Response.json({ok:true},{headers:{'Set-Cookie':cookie(v,60*60*24*30)}});}
export async function DELETE(){return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0)}});}
