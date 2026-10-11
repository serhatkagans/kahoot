// Sunucu yardımcıları: soru setlerinin dosyada saklanması, görseller, öğretmen girişi ve istek denetimleri.
// Veriler DATA_DIR (varsayılan ./data) altındadır: kahootlar/<kimlik>.json ve gorseller/<özet>.<uzantı>.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {cleanQuiz,type Quiz} from './quiz';
import {SEEDS} from './seed';
const root=path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR||'data'),quizDir=path.join(root,'kahootlar'),imageDir=path.join(root,'gorseller');
// İlk açılışta hazır soru setleri yazılır; silinenler geri gelmesin diye bir kez yapılır.
function ready(){if(fs.existsSync(quizDir))return;fs.mkdirSync(quizDir,{recursive:true});for(const q of SEEDS)write(cleanQuiz(q));}
const file=(id:string)=>/^[a-z0-9-]{3,40}$/.test(id)?path.join(quizDir,`${id}.json`):undefined;
function write(q:Quiz){const f=file(q.id)!,tmp=`${f}.${process.pid}.tmp`;fs.writeFileSync(tmp,JSON.stringify(q,null,1));fs.renameSync(tmp,f);}
export function listQuizzes():Quiz[]{ready();const out:Quiz[]=[];
for(const n of fs.readdirSync(quizDir))if(n.endsWith('.json')){try{out.push(JSON.parse(fs.readFileSync(path.join(quizDir,n),'utf8')));}catch(e){console.error('Kahoot okunamadı',n,e);}}
return out.sort((a,b)=>b.updatedAt-a.updatedAt);}
export function getQuiz(id:unknown):Quiz|undefined{if(typeof id!=='string')return;ready();const f=file(id);if(!f||!fs.existsSync(f))return;try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return;}}
// Kaydeder: kimlik varsa üzerine yazar (oluşturulma zamanı korunur), yoksa yeni kimlik verilir.
export function saveQuiz(input:unknown):Quiz{ready();const q=cleanQuiz(input),old=getQuiz(q.id);if(old)q.createdAt=old.createdAt;write(q);return q;}
export function deleteQuiz(id:unknown){const f=typeof id==='string'?file(id):undefined;if(f&&fs.existsSync(f)){fs.unlinkSync(f);return true;}return false;}
// Görseller içerik özetiyle adlandırılır (aynı dosya iki kez yüklenirse tek kopya kalır). Türü dosyanın ilk baytlarından anlaşılır.
const MAGIC:[string,(b:Buffer)=>boolean][]=[['png',b=>b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))],['jpg',b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff],
['gif',b=>b.subarray(0,4).toString('latin1')==='GIF8'],['webp',b=>b.subarray(0,4).toString('latin1')==='RIFF'&&b.subarray(8,12).toString('latin1')==='WEBP']];
export const MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'};
export const maxImage=3*1024*1024;
export function saveImage(b:Buffer){const ext=MAGIC.find(([,ok])=>ok(b))?.[0];if(!ext)return undefined;fs.mkdirSync(imageDir,{recursive:true});
const id=`${createHash('sha256').update(b).digest('hex').slice(0,32)}.${ext}`,f=path.join(imageDir,id);if(!fs.existsSync(f))fs.writeFileSync(f,b);return id;}
export function readImage(id:unknown){if(typeof id!=='string'||!/^[a-f0-9]{16,64}\.(png|jpe?g|webp|gif)$/.test(id))return;const f=path.join(imageDir,id);if(!fs.existsSync(f))return;
return {body:fs.readFileSync(f),type:MIME[id.split('.').pop()!]};}
// Öğretmen girişi: KAHOOT_PASSWORD tanımlıysa soru setlerini düzenlemek ve oyun açmak için şifre istenir; tanımlı değilse herkes öğretmendir.
// Çerezde şifrenin kendisi değil, ondan türetilen imza tutulur.
export const cookieName='kahoot-ogretmen';
const password=()=>process.env.KAHOOT_PASSWORD||'';
export const needsLogin=()=>!!password();
const sign=()=>createHmac('sha256',password()).update('kahoot-ogretmen').digest('hex');
export function cookieValue(given:unknown){if(!needsLogin()||typeof given!=='string')return undefined;const a=createHash('sha256').update(given).digest(),b=createHash('sha256').update(password()).digest();return timingSafeEqual(a,b)?sign():undefined;}
export function isTeacher(request:Request){if(!needsLogin())return true;const c=(request.headers.get('cookie')||'').split(/;\s*/).find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)||'';
const s=sign();return c.length===s.length&&timingSafeEqual(Buffer.from(c),Buffer.from(s));}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(!origin)return true;const host=request.headers.get('x-forwarded-host')||request.headers.get('host');try{return new URL(origin).host===host;}catch{return false;}}
// Basit bellek içi sınırlayıcı. Sınıfta öğrenciler aynı ağdan (aynı IP) geldiği için sınırlar geniş tutulur.
const hits=new Map<string,number[]>();
export function limited(request:Request,name:string,max:number,windowMs:number){const ip=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'yerel';const key=`${name}:${ip}`,now=Date.now();const list=(hits.get(key)||[]).filter(t=>now-t<windowMs);list.push(now);hits.set(key,list);return list.length>max;}
export const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max?v.trim():undefined;
export const fail=(error:string,status=400)=>Response.json({error},{status});
