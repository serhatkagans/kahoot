// İstemci yardımcıları: alt adres (BASE_PATH), API çağrıları, cihaz anahtarı ve sekme oturumu.
export const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export const imageUrl=(id:string|null|undefined)=>id?`${base}/api/images?id=${encodeURIComponent(id)}`:'';
// Hata mesajı sunucudan gelir; durum kodu (404, 401…) hatanın üstünde taşınır.
export async function api<T=Record<string,unknown>>(path:string,body?:unknown,method=body===undefined?'GET':'POST'):Promise<T>{
const r=await fetch(base+path,{method,headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const d=await r.json().catch(()=>({error:'Sunucuya ulaşılamadı.'}));if(!r.ok)throw Object.assign(Error(d.error||'İstek gönderilemedi.'),{status:r.status});return d as T;}
export async function upload(file:File){const f=new FormData();f.append('file',file);const r=await fetch(`${base}/api/images`,{method:'POST',body:f}),d=await r.json().catch(()=>({}));
if(!r.ok)throw Error(d.error||'Görsel yüklenemedi.');return d.id as string;}
// Oyuncunun cihaz anahtarı: aynı cihaz oyuna geri dönünce kaldığı yerden sürer.
let memoryToken='';
export function deviceToken(){const make=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
try{let t=localStorage.getItem('kahoot-cihaz')||'';if(!/^[a-f0-9]{32}$/.test(t)){t=make();localStorage.setItem('kahoot-cihaz',t);}return t;}catch{return memoryToken||=make();}}
export function readSession<T>(key:string,fallback:T):T{try{const v=sessionStorage.getItem(key);return v?JSON.parse(v) as T:fallback;}catch{return fallback;}}
export function writeSession(key:string,value:unknown){try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}}
// Öğretmenin açtığı oyunların yönetim anahtarları (PIN → anahtar); sayfa yenilense de oyun yönetilebilsin diye bu tarayıcıda tutulur.
const hostKey='kahoot-sunucu';
export function hosts():Record<string,string>{try{const v=JSON.parse(localStorage.getItem(hostKey)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}}
export function rememberHost(pin:string,secret:string){try{localStorage.setItem(hostKey,JSON.stringify({...Object.fromEntries(Object.entries(hosts()).slice(-20)),[pin]:secret}));}catch{}}
