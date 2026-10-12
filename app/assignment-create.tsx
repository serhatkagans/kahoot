'use client';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {Gate,TopBar} from './teacher';
import {api,base,imageUrl} from './client';
import {playable,type Quiz} from '../lib/quiz';

const localDate=(time:number)=>{const d=new Date(time);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
function Creator({id}:{id:string}){const [quiz,setQuiz]=useState<Quiz|null>(null),[label,setLabel]=useState(''),[deadline,setDeadline]=useState(()=>localDate(Date.now()+24*60*60_000));
const [timer,setTimer]=useState(false),[shuffleQ,setShuffleQ]=useState(false),[shuffleA,setShuffleA]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
const [created,setCreated]=useState<{pin:string;label:string;deadline:number}|null>(null),[qr,setQr]=useState(''),[copied,setCopied]=useState(false),[minimum]=useState(()=>localDate(Date.now()+60_000));
useEffect(()=>{if(id)api<Quiz>(`/api/quizzes?id=${id}`).then(setQuiz).catch(e=>setError(e.message));},[id]);
const link=created&&typeof location!=='undefined'?`${location.origin}${base}/?odev=${created.pin}`:'';
useEffect(()=>{if(!link)return;QRCode.toDataURL(link,{width:230,margin:2,color:{dark:'#1d0b40',light:'#ffffff'}}).then(setQr).catch(()=>{});},[link]);
async function create(){setBusy(true);setError('');try{const end=new Date(deadline).getTime();const result=await api<{pin:string;label:string;deadline:number}>('/api/assignments',{action:'create',quiz:id,label,deadline:end,timer,shuffleQ,shuffleA});setCreated(result);}catch(e){setError(e instanceof Error?e.message:'Ödev oluşturulamadı.');}finally{setBusy(false);}}
if(!id)return <><TopBar/><main className="page narrow"><p className="error">Önce kütüphaneden bir kahoot seç.</p></main></>;
if(created)return <><TopBar/><main className="page narrow"><div className="card assignment-share"><div className="eyebrow">ÖDEV HAZIR</div><h1>{created.label}</h1><p className="muted">Bitiş: {new Date(created.deadline).toLocaleString('tr-TR')}</p>{qr&&<img src={qr} alt="Ödev bağlantısı kare kodu"/>}<small>Ödev PIN’i</small><b className="share-pin">{created.pin.slice(0,3)} {created.pin.slice(3)}</b><input readOnly value={link}/><div className="row"><button className="primary" onClick={()=>navigator.clipboard.writeText(link).then(()=>setCopied(true))}>{copied?'✓ Kopyalandı':'Bağlantıyı kopyala'}</button><a className="ghost" href={`${base}/raporlar`}>Raporlara git</a></div></div></main></>;
const ready=quiz?playable(quiz):[];return <><TopBar/><main className="page narrow">{error&&<p className="error">{error}</p>}{!quiz?!error&&<p className="muted">Yükleniyor…</p>:<div className="card host-setup">{quiz.cover&&<img className="host-cover" src={imageUrl(quiz.cover)} alt=""/>}<div className="eyebrow">BİREYSEL ÖDEV</div><h1>{quiz.title||'Adsız kahoot'}</h1><p className="muted">{ready.length} soru · Öğrenciler kendi zamanlarında çözer.</p>
<form onSubmit={e=>{e.preventDefault();void create();}}><label>Ödev adı<input maxLength={40} placeholder={quiz.title.slice(0,40)} value={label} onChange={e=>setLabel(e.target.value)}/></label><label>Bitiş tarihi ve saati<input type="datetime-local" required min={minimum} value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
<fieldset><legend>Ödev seçenekleri</legend><label className="check"><input type="checkbox" checked={timer} onChange={e=>setTimer(e.target.checked)}/> Her soruda süre sınırı kullan</label><label className="check"><input type="checkbox" checked={shuffleQ} onChange={e=>setShuffleQ(e.target.checked)}/> Soruları karıştır</label><label className="check"><input type="checkbox" checked={shuffleA} onChange={e=>setShuffleA(e.target.checked)}/> Şıkları karıştır</label></fieldset>
<button className="primary big" disabled={busy||!ready.length}>{busy?'Oluşturuluyor…':'Ödevi oluştur'}</button></form></div>}</main></>;}
export default function AssignmentCreate({id}:{id:string}){return <Gate><Creator id={id}/></Gate>;}
