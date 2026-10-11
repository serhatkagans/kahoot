'use client';
import {useCallback,useEffect,useState} from 'react';
import LiveGame from './live-game';
import {base} from './client';
// Oyuncu girişi (kahoot.it gibi): 6 haneli PIN yazılır ya da ?pin=482913 bağlantısıyla/kare kodla doğrudan gelinir.
// Girilen PIN adrese yazılır; sayfa yenilense de oyuna geri dönülür (aynı cihaz kaldığı yerden sürer).
export default function Join({start}:{start:string}){const [pin,setPin]=useState(start),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{if(pin)history.replaceState(null,'',`${base}/?pin=${pin}`);},[pin]);
const exit=useCallback((msg?:string)=>{setPin('');setError(msg||'');history.replaceState(null,'',`${base}/`);},[]);
// PIN önce denetlenir: yanlışsa giriş kutusunda uyarı çıkar.
async function enter(){setBusy(true);setError('');try{const r=await fetch(`${base}/api/live?pin=${code}`),d=await r.json();if(!r.ok)setError(d.error||'Bu PIN ile açık bir oyun yok.');else setPin(code);}catch{setError('Sunucuya ulaşılamadı.');}finally{setBusy(false);}}
if(pin)return <LiveGame pin={pin} onExit={exit}/>;
return <main className="join"><div className="join-shapes" aria-hidden="true"><i>▲</i><i>◆</i><i>●</i><i>■</i></div>
<h1 className="join-logo">GençTek <b>Kahoot!</b></h1>
<form className="join-card" onSubmit={e=>{e.preventDefault();void enter();}}><label className="sr-only" htmlFor="pin">Oyun PIN’i</label>
<input id="pin" inputMode="numeric" autoComplete="off" autoFocus maxLength={6} placeholder="Oyun PIN’i" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/>
<button disabled={busy||code.length!==6}>Gir</button>{error&&<p className="error" role="alert">{error}</p>}</form>
<p className="join-foot">Öğretmen misin? <a href={`${base}/kahootlar`}>Kahoot oluştur ve sun →</a></p></main>;}
