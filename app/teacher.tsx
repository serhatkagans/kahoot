'use client';
import {useEffect,useState} from 'react';
import {api,base} from './client';
// Öğretmen sayfalarının ortak kabuğu: üst çubuk ve (KAHOOT_PASSWORD tanımlıysa) şifre girişi.
export function TopBar({children}:{children?:React.ReactNode}){return <header className="topbar"><a className="brand" href={`${base}/kahootlar`}><i aria-hidden="true">▲◆●■</i> GençTek <b>Kahoot!</b></a>
<nav>{children}<a href={`${base}/`} className="ghost">Oyuna katıl</a></nav></header>;}
export function Gate({children}:{children:React.ReactNode}){const [state,setState]=useState<'wait'|'in'|'out'>('wait'),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{api<{teacher:boolean}>('/api/login').then(d=>setState(d.teacher?'in':'out')).catch(()=>setState('out'));},[]);
async function login(){setBusy(true);setError('');try{await api('/api/login',{password});setState('in');}catch(e){setError(e instanceof Error?e.message:'Giriş yapılamadı.');}finally{setBusy(false);}}
if(state==='wait')return <><TopBar/><main className="page"><p className="muted">Yükleniyor…</p></main></>;
if(state==='out')return <><TopBar/><main className="page narrow"><form className="card login" onSubmit={e=>{e.preventDefault();void login();}}><h1>Öğretmen girişi</h1><p className="muted">Kahoot hazırlamak ve oyun açmak için şifreyi gir. Öğrenciler şifresiz, yalnızca PIN ile katılır.</p>
<label>Şifre<input type="password" autoFocus autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error" role="alert">{error}</p>}
<button className="primary" disabled={busy||!password}>Giriş yap</button></form></main></>;
return <>{children}</>;}
