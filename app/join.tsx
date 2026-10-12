'use client';
import {useCallback,useEffect,useState} from 'react';
import LiveGame from './live-game';
import AssignmentGame from './assignment-game';
import {base} from './client';
// Oyuncu girişi (kahoot.it gibi): 6 haneli PIN yazılır ya da ?pin=482913 bağlantısıyla/kare kodla doğrudan gelinir.
// Girilen PIN adrese yazılır; sayfa yenilense de oyuna geri dönülür (aynı cihaz kaldığı yerden sürer).
export default function Join({start,assignment}:{start:string;assignment:string}){const [pin,setPin]=useState(start||assignment),[mode,setMode]=useState<'live'|'assignment'|''>(assignment?'assignment':start?'live':''),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{if(pin)history.replaceState(null,'',`${base}/?${mode==='assignment'?'odev':'pin'}=${pin}`);},[pin,mode]);
const exit=useCallback((msg?:string)=>{setPin('');setMode('');setError(msg||'');history.replaceState(null,'',`${base}/`);},[]);
// PIN önce denetlenir: yanlışsa giriş kutusunda uyarı çıkar.
async function enter(){setBusy(true);setError('');try{const live=await fetch(`${base}/api/live?pin=${code}`),liveData=await live.json();if(live.ok){setMode('live');setPin(code);return;}
const task=await fetch(`${base}/api/assignments?pin=${code}`),taskData=await task.json();if(task.ok){setMode('assignment');setPin(code);}else setError(taskData.error||liveData.error||'Bu PIN ile açık oyun veya ödev yok.');}catch{setError('Sunucuya ulaşılamadı.');}finally{setBusy(false);}}
if(pin&&mode==='assignment')return <AssignmentGame pin={pin} onExit={exit}/>;
if(pin)return <LiveGame pin={pin} onExit={exit}/>;
return <main className="join"><div className="join-shapes" aria-hidden="true"><i>▲</i><i>◆</i><i>●</i><i>■</i></div>
<h1 className="join-logo">GençTek <b>Kahoot!</b></h1>
<form className="join-card" onSubmit={e=>{e.preventDefault();void enter();}}><label className="sr-only" htmlFor="pin">Oyun PIN’i</label>
<input id="pin" inputMode="numeric" autoComplete="off" autoFocus maxLength={6} placeholder="Oyun PIN’i" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
<button disabled={busy||code.length!==6}>Gir</button>{error&&<p className="error" role="alert">{error}</p>}</form>
<p className="join-foot">Öğretmen misin? <a href={`${base}/kahootlar`}>Kahoot oluştur ve sun →</a></p></main>;}
