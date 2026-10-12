'use client';
import {useEffect,useRef,useState} from 'react';
import {Gate,TopBar} from './teacher';
import {api,base,imageUrl} from './client';
import type {Quiz} from '../lib/quiz';
// Kahootlarım: öğretmenin soru setleri. Her kart: başlat (canlı oyun aç), düzenle, kopyala, dosya olarak indir, sil.
// İçe aktarma, buradan indirilen .json dosyasını (başka bir bilgisayardan da) kütüphaneye ekler.
type Item={id:string;title:string;description:string;cover:string|null;count:number;playable:number;updatedAt:number};
const date=(t:number)=>new Date(t).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
function List(){const [items,setItems]=useState<Item[]|null>(null),[query,setQuery]=useState(''),[error,setError]=useState(''),[sure,setSure]=useState(''),[busy,setBusy]=useState(false),file=useRef<HTMLInputElement>(null);
const load=()=>api<Item[]>('/api/quizzes').then(setItems).catch(e=>setError(e.message));
useEffect(()=>{void load();},[]);
useEffect(()=>{if(!sure)return;const t=setTimeout(()=>setSure(''),4000);return()=>clearTimeout(t);},[sure]);
async function run(f:()=>Promise<unknown>){setBusy(true);setError('');try{await f();await load();}catch(e){setError(e instanceof Error?e.message:'İşlem yapılamadı.');}finally{setBusy(false);}}
async function download(id:string){const q=await api<Quiz>(`/api/quizzes?id=${id}`),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(q,null,1)],{type:'application/json'}));
a.download=`${q.title.replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').toLocaleLowerCase('tr')||'kahoot'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
// İçe aktarılan sete yeni kimlik verilir: aynı dosya iki kez aktarılırsa var olanın üzerine yazılmaz.
async function importFile(f:File){await run(async()=>{let q:Record<string,unknown>;try{q=JSON.parse(await f.text());}catch{throw Error('Dosya okunamadı: kahoot .json dosyası seç.');}
if(!q||!Array.isArray(q.questions))throw Error('Bu dosyada soru yok.');await api('/api/quizzes',{action:'save',quiz:{...q,id:undefined,createdAt:undefined}});});}
const q=query.trim().toLocaleLowerCase('tr'),shown=(items??[]).filter(i=>!q||`${i.title} ${i.description}`.toLocaleLowerCase('tr').includes(q));
return <><TopBar><a className="primary" href={`${base}/duzenle`}>+ Oluştur</a></TopBar><main className="page">
<div className="page-head"><div><h1>Kahootlarım</h1><p className="muted">Bir kahootu başlatınca oyun PIN’i açılır; ekranını tahtaya yansıt, öğrenciler kendi cihazından katılsın.</p></div>
<div className="row"><input className="search" type="search" placeholder="Ara…" aria-label="Kahoot ara" value={query} onChange={e=>setQuery(e.target.value)}/>
<button className="ghost" disabled={busy} onClick={()=>file.current?.click()}>⬆ İçe aktar</button><input ref={file} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void importFile(f);}}/></div></div>
{error&&<p className="error" role="alert">{error}</p>}
{!items?<p className="muted">Yükleniyor…</p>:!items.length?<div className="empty"><p>Henüz kahoot yok.</p><a className="primary" href={`${base}/duzenle`}>+ İlk kahootunu oluştur</a></div>:
<ul className="grid">{shown.map(i=><li key={i.id} className="quiz-card">
<a className="cover" href={`${base}/duzenle?id=${i.id}`} aria-label={`${i.title||'Adsız kahoot'} düzenle`}>{i.cover?<img src={imageUrl(i.cover)} alt=""/>:<span aria-hidden="true">▲◆●■</span>}<small>{i.count} soru</small></a>
<div className="body"><h2>{i.title||'Adsız kahoot'}</h2>{i.description&&<p>{i.description}</p>}<small className="muted">Son değişiklik: {date(i.updatedAt)}</small>
{i.playable<i.count&&<small className="warn">⚠ {i.count-i.playable} soruda eksik var; oyunda atlanır.</small>}</div>
<div className="actions"><a className={`primary${i.playable?'':' disabled'}`} aria-disabled={!i.playable} href={i.playable?`${base}/sun?id=${i.id}`:undefined}>▶ Başlat</a>
<a className={`ghost${i.playable?'':' disabled'}`} aria-disabled={!i.playable} href={i.playable?`${base}/odev-ver?id=${i.id}`:undefined}>⌛ Ödev ver</a>
<a className="ghost" href={`${base}/duzenle?id=${i.id}`}>✎ Düzenle</a>
<button className="ghost" disabled={busy} onClick={()=>void run(()=>api('/api/quizzes',{action:'copy',id:i.id}))}>⧉ Kopyala</button>
<button className="ghost" disabled={busy} onClick={()=>void download(i.id).catch(e=>setError(e.message))}>⬇ İndir</button>
<button className={`ghost danger${sure===i.id?' sure':''}`} disabled={busy} onClick={()=>{if(sure===i.id){setSure('');void run(()=>api('/api/quizzes',{action:'delete',id:i.id}));}else setSure(i.id);}}>{sure===i.id?'Emin misin? Tekrar bas':'🗑 Sil'}</button></div></li>)}</ul>}
{items&&!!items.length&&!shown.length&&<p className="muted">“{query}” ile eşleşen kahoot yok.</p>}</main></>;}
export default function Library(){return <Gate><List/></Gate>;}
