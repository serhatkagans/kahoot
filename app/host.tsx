'use client';
import {useCallback,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import LiveGame from './live-game';
import {Gate,TopBar} from './teacher';
import {api,base,hosts,imageUrl,rememberHost} from './client';
import {TYPES,playable,type Quiz} from '../lib/quiz';
// Oyunu sun: öğretmen kütüphaneden seçtiği kahootun ayarlarını yapar ve canlı oyunu açar.
// Açılan oyunun PIN'i adrese (?pin=482913) yazılır, yönetim anahtarı bu tarayıcıda tutulur: sayfa yenilense de oyun kaldığı yerden sürer.
function Setup({id,onOpen}:{id:string;onOpen:(pin:string)=>void}){const [quiz,setQuiz]=useState<Quiz|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
const [label,setLabel]=useState(''),[shuffleQ,setShuffleQ]=useState(false),[shuffleA,setShuffleA]=useState(true);
useEffect(()=>{if(id)api<Quiz>(`/api/quizzes?id=${id}`).then(setQuiz).catch(e=>setError(e.message));},[id]);
async function open(){setBusy(true);setError('');try{const d=await api<{pin:string;host:string}>('/api/live',{action:'create',quiz:id,label,shuffleQ,shuffleA});rememberHost(d.pin,d.host);onOpen(d.pin);}
catch(e){setError(e instanceof Error?e.message:'Oyun açılamadı.');}finally{setBusy(false);}}
const ready=quiz?playable(quiz):[],skipped=quiz?quiz.questions.length-ready.length:0,minutes=Math.ceil(ready.reduce((s,q)=>s+q.time+12,0)/60);
if(!id)return <><TopBar/><main className="page narrow"><p className="error">Önce kütüphaneden bir kahoot seç.</p><a className="primary" href={`${base}/kahootlar`}>Kahootlarım</a></main></>;
return <><TopBar/><main className="page narrow">{error&&<p className="error" role="alert">{error}</p>}{!quiz?!error&&<p className="muted">Yükleniyor…</p>:
<div className="card host-setup">{quiz.cover&&<img className="host-cover" src={imageUrl(quiz.cover)} alt=""/>}<div className="eyebrow">CANLI OYUN</div><h1>{quiz.title||'Adsız kahoot'}</h1>
<p className="muted">{ready.length} soru · yaklaşık {minutes} dakika{skipped?` · ${skipped} eksik soru atlanacak`:''}</p>
<form onSubmit={e=>{e.preventDefault();void open();}}><label>Oyunun adı (tahtada görünür)<input maxLength={40} placeholder={quiz.title.slice(0,40)||'ör. 9-B'} value={label} onChange={e=>setLabel(e.target.value)}/></label>
<fieldset><legend>Oyun seçenekleri</legend><label className="check"><input type="checkbox" checked={shuffleQ} onChange={e=>setShuffleQ(e.target.checked)}/> Soruların sırasını karıştır</label>
<label className="check"><input type="checkbox" checked={shuffleA} onChange={e=>setShuffleA(e.target.checked)}/> Şıkların sırasını karıştır <small className="muted">(Doğru/Yanlış hariç)</small></label></fieldset>
<button className="primary big" disabled={busy||!ready.length}>{ready.length?'Oyunu aç ↗':'Oynanabilir soru yok'}</button></form>
<details><summary>Sorular ({ready.length})</summary><ol className="host-list">{ready.map(q=><li key={q.id}><span>{TYPES[q.type].icon} {TYPES[q.type].label} · {q.time} sn</span>{q.text}</li>)}</ol></details>
<a className="text-link" href={`${base}/duzenle?id=${quiz.id}`}>✎ Düzenle</a></div>}</main></>;}
function Run({id,pin:start}:{id:string;pin:string}){const [pin,setPin]=useState(start),[gone,setGone]=useState(''),router=useRouter();
const secret=pin?hosts()[pin]??'':'';
const openPin=(p:string)=>{setPin(p);history.replaceState(null,'',`${base}/sun?pin=${p}`);};
const exit=useCallback((msg?:string)=>{if(msg){setGone(msg);setPin('');history.replaceState(null,'',`${base}/sun${id?`?id=${id}`:''}`);}else router.push('/kahootlar');},[id,router]);
if(pin&&secret)return <LiveGame pin={pin} secret={secret} onExit={exit}/>;
if(pin)return <><TopBar/><main className="page narrow"><p className="error">Bu oyun başka bir tarayıcıda açılmış; yalnızca açan tarayıcı yönetebilir.</p><a className="primary" href={`${base}/kahootlar`}>Kahootlarıma dön</a></main></>;
return <>{gone&&<p className="error banner" role="alert">{gone}</p>}<Setup id={id} onOpen={openPin}/></>;}
export default function Host({id,pin}:{id:string;pin:string}){return <Gate><Run id={id} pin={pin}/></Gate>;}
