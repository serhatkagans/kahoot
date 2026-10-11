'use client';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {AVATARS,type LiveView} from '../lib/live';
import {TYPES} from '../lib/quiz';
import {isMuted,music,setMuted,sfx} from './sound';
import {api,base,deviceToken,imageUrl} from './client';
// Canlı Kahoot ekranı. Öğretmen (secret verilir) ekranını tahtaya yansıtır; öğrenciler kendi cihazından PIN ve takma adla bağlanır.
// Sorular öğretmenin düğmesiyle ilerler: soru → doğru cevap ve dağılım → ara skor tablosu (yükselenler, seriler) → … → podyum.
// Her soru önce tek başına görünür, birkaç saniye sonra şıklar açılır ve süre başlar. Sesler sound.ts'te üretilir; sahne tam ekran yapılabilir.
// Ekranlar sunucuyu saniyede bir yoklar (/api/live).
const SHAPES=['▲','◆','●','■'],clock=()=>Date.now(),spaced=(pin:string)=>`${pin.slice(0,3)} ${pin.slice(3)}`;
// Doğru/Yanlış'ta Kahoot'taki gibi "Doğru" mavi baklava, "Yanlış" kırmızı üçgendir.
const tone=(type:string,i:number)=>type==='tf'?[1,0][i]:i;
type View=LiveView;type Row=NonNullable<View['board']>[number];type Q=NonNullable<View['q']>;
const Move=({n}:{n:number})=>n>0?<i className="up">▲{n}</i>:n<0?<i className="down">▼{-n}</i>:<i>–</i>;
const still=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
// Puan, önceki değerinden yenisine hızlıca sayarak çıkar (satırın beliriş animasyonundan sonra başlar). Hareket azaltma tercihinde doğrudan son değer görünür.
function Count({from,to,delay=0}:{from:number;to:number;delay?:number}){const [n,setN]=useState(from);
useEffect(()=>{if(from===to)return;const calm=still(),t0=performance.now()+delay,
t=setInterval(()=>{const k=calm?1:Math.min(1,Math.max(0,(performance.now()-t0)/1100));setN(Math.round(from+(to-from)*(1-(1-k)**3)));if(k>=1)clearInterval(t);},33);return()=>clearInterval(t);},[from,to,delay]);
return <>{n}</>;}
// Skor tablosu: satırlar önce soru öncesindeki sırasında görünür ve puanlar sayarak artar; sonra sırası değişenler kayarak yeni yerine geçer (ROW: satır yüksekliği + aralık, CSS ile aynı).
const ROW=60,SETTLE=2300;
function Board({rows,me}:{rows:Row[];me?:string}){const [settled,setSettled]=useState(()=>rows.every(r=>!r.move)||still());
useEffect(()=>{if(settled)return;const t=setTimeout(()=>setSettled(true),SETTLE);return()=>clearTimeout(t);},[settled]);
return <ol className={`live-board${settled?' settled':''}`}>{rows.map((r,i)=><li key={r.name} className={`${r.name===me?'me':''}${r.move>0?' rose':''}`} style={{animationDelay:`${Math.min(i,10)*60}ms`,transform:settled?undefined:`translateY(${r.move*ROW}px)`}}><span>{settled?i+1:i+1+r.move}</span><b><u aria-hidden="true">{r.avatar}</u> {r.name}{r.streak>=3&&<small> 🔥{r.streak}</small>}</b><Move n={r.move}/>{r.gain>0&&<em>+{r.gain}</em>}<strong className={r.gain>0?'up':''} style={{animationDelay:`${Math.min(i,10)*60+450}ms`}}><Count from={r.score-r.gain} to={r.score} delay={Math.min(i,10)*60+450}/></strong></li>)}</ol>;}
// Podyum sırayla açılır: önce üçüncü, sonra ikinci, davul sesinden sonra birinci (süreler CSS'teki gecikmelerle ve sound.ts'teki fanfarla aynıdır); birinciyle birlikte konfeti yağar.
const REVEAL=[4200,2200,600];
function seeded(key:string){let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^=h>>>16)>>>0)/4294967296;};}
const CONFETTI=(()=>{const r=seeded('konfeti'),colors=['#e21b3c','#1368ce','#ffd166','#26890c','#ffffff'];return Array.from({length:70},()=>({left:r()*100,delay:r()*2.5,dur:2.6+r()*2.2,color:colors[Math.floor(r()*colors.length)],w:6+r()*8,rot:r()*360}));})();
const Confetti=()=><div className="live-confetti" aria-hidden="true">{CONFETTI.map((c,i)=><i key={i} style={{left:`${c.left}%`,width:c.w,height:c.w*1.6,background:c.color,rotate:`${c.rot}deg`,animationDelay:`${REVEAL[0]/1000+c.delay}s`,animationDuration:`${c.dur}s`}}/>)}</div>;
function Podium({rows}:{rows:Row[]}){return <div className="live-podium">{[1,0,2].map(i=>rows[i]&&<div key={i} className={`p${i+1}`}><span aria-hidden="true">{rows[i].avatar}</span><b>{['🥇','🥈','🥉'][i]} {rows[i].name}</b><small><Count from={0} to={rows[i].score} delay={REVEAL[i]+300}/> puan</small><div>{i+1}</div></div>)}</div>;}
// Sorunun türünü ve puanını anlatan küçük etiketler (soru ekranında ve girişte).
function Badges({q}:{q:Q}){return <>{q.type!=='quiz'&&<small>{TYPES[q.type].icon} {TYPES[q.type].label}</small>}{q.multi&&<small>☑ Birden çok doğru</small>}
{q.type!=='poll'&&q.points===2&&<small className="double">×2 Çift puan</small>}{q.type!=='poll'&&q.points===0&&<small>Puansız</small>}</>;}
// Oyuncunun cevap alanı: tek seçimde şıkka dokunmak yeter; çoklu seçimde işaretleyip gönderir, sıralamada şıklara sırayla dokunur, yazılı soruda cevabı yazar.
// Soru değişince sıfırlansın diye soru sırasıyla anahtarlanır.
function Answer({q,busy,left,send}:{q:Q;busy:boolean;left:number;send:(choice:unknown)=>void}){const [sel,setSel]=useState<number[]>([]),[typed,setTyped]=useState('');
const off=busy||left<=0,ordered=q.type==='puzzle';
if(q.type==='type')return <form className="live-type" onSubmit={e=>{e.preventDefault();if(typed.trim())send(typed.trim());}}><label className="sr-only" htmlFor="live-typed">Cevabın</label>
<input id="live-typed" autoFocus autoComplete="off" maxLength={20} placeholder="Cevabını yaz" value={typed} onChange={e=>setTyped(e.target.value)}/><small>{typed.length}/20</small><button className="live-next" disabled={off||!typed.trim()}>Gönder</button></form>;
const toggle=(i:number)=>setSel(s=>s.includes(i)?ordered?s.slice(0,s.indexOf(i)):s.filter(x=>x!==i):[...s,i]);
return <><div className={`live-tiles${q.options.some(o=>o.length>40)?' long':''} fresh`}>{q.options.map((o,i)=>{const n=sel.indexOf(i);
return <button key={i} className={`live-tile c${tone(q.type,i)}${n>=0?' picked':''}`} disabled={off} aria-pressed={q.multi||ordered?n>=0:undefined}
onClick={()=>q.multi||ordered?toggle(i):send(i)}><i aria-hidden="true">{SHAPES[tone(q.type,i)]}</i><span>{o}</span>{n>=0&&<em>{ordered?n+1:'✓'}</em>}</button>;})}</div>
{(q.multi||ordered)&&<div className="live-actions">{ordered&&<button className="live-ghost" disabled={!sel.length} onClick={()=>setSel([])}>↺ Sıfırla</button>}
<button className="live-next" disabled={off||!sel.length||(ordered&&sel.length!==q.options.length)} onClick={()=>send(sel)}>{ordered?sel.length===q.options.length?'Sıralamayı gönder':`Sırayla dokun (${sel.length}/${q.options.length})`:`Gönder (${sel.length})`}</button></div>}</>;}
export default function LiveGame({pin,secret='',onExit}:{pin:string;secret?:string;onExit:(msg?:string)=>void}){
const [token]=useState(deviceToken),[view,setView]=useState<View|null>(null),[got,setGot]=useState(0),[now,setNow]=useState(0);
const [name,setName]=useState(()=>{try{return localStorage.getItem('kahoot-ad')||'';}catch{return '';}}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[qr,setQr]=useState('');
const [avatar,setAvatar]=useState(()=>{try{const a=localStorage.getItem('kahoot-avatar')||'';return AVATARS.includes(a)?a:AVATARS[0];}catch{return AVATARS[0];}}),[muted,setMute]=useState(isMuted),[full,setFull]=useState(false),[sure,setSure]=useState(false);
function take(v:View){const t=clock();setView(v);setGot(t);setNow(t);}
async function act(body:Record<string,unknown>){if(busy)return;setBusy(true);setError('');try{take(await api<View>('/api/live',{pin,...body}));}catch(e){const x=e as Error&{status?:number};if(x.status===404)onExit(x.message);else setError(x.message||'İstek gönderilemedi. Tekrar dene.');}finally{setBusy(false);}}
const lead=(action:string,more:Record<string,unknown>={})=>act({action,host:secret,...more});
function join(){try{localStorage.setItem('kahoot-ad',name.trim());localStorage.setItem('kahoot-avatar',avatar);}catch{}void act({action:'join',name:name.trim(),avatar,token});}
// Yoklama: oyun bulunamazsa (yanlış PIN, kapanmış oyun) giriş ekranına dönülür.
useEffect(()=>{let on=true;const load=()=>fetch(`${base}/api/live?pin=${pin}&${secret?`host=${secret}`:`token=${token}`}`).then(async r=>{const d=await r.json();if(!on)return;if(r.status===404)onExit(d.error);else if(r.ok)take(d);}).catch(()=>{});
load();const t=setInterval(load,1000);return()=>{on=false;clearInterval(t);};},[pin,secret,token,onExit]);
const phase=view?.phase;
useEffect(()=>{if(phase!=='question')return;const t=setInterval(()=>setNow(clock()),200);return()=>clearInterval(t);},[phase]);
const link=`${typeof location==='undefined'?'':location.origin}${base}/?pin=${pin}`,isHost=!!view?.host;
useEffect(()=>{let on=true;if(isHost)QRCode.toDataURL(link,{width:220,margin:2,color:{dark:'#1d0b40',light:'#ffffff'}}).then(u=>{if(on)setQr(u);}).catch(()=>{});return()=>{on=false;};},[link,isHost]);
// Şıkların açılmasına (intro) ve sorunun kapanmasına (left) kalan saniye: sunucunun bildirdiği süreden bu cihazda geçen süre düşülür.
const vq=phase==='question'?view?.q:undefined,spent=Math.max(now,got)-got,intro=vq?Math.max(0,vq.intro-spent)/1000:0,left=vq?Math.max(0,Math.min((view?.time??0)*1000,vq.left-spent))/1000:0;
const opened=!!vq&&!intro,beep=opened&&left>0&&left<=5?Math.ceil(left):0,ok=view?.me?.ok,joined=view?.count??0,at=view?.at;
// Sesler: tahtada (öğretmen ekranı) müzik çalar; herkes soru, cevap, tablo ve podyum seslerini kendi cihazında duyar.
useEffect(()=>{if(!phase){music(null);return;}if(isHost)music(phase==='lobby'?'lobby':phase==='question'?'think':null);
if(phase==='question')sfx.start();else if(phase==='reveal'){if(isHost||ok===null)sfx.reveal();else if(ok)sfx.correct();else sfx.wrong();}else if(phase==='board')sfx.board();else if(phase==='end')sfx.fanfare();},[phase,isHost,at,ok]);
useEffect(()=>()=>music(null),[]);
useEffect(()=>{if(isHost&&phase==='lobby'&&joined)sfx.join();},[joined,isHost,phase]);
useEffect(()=>{if(opened)sfx.open();},[opened]);
useEffect(()=>{if(beep)sfx.tick();},[beep]);
useEffect(()=>{if(!sure)return;const t=setTimeout(()=>setSure(false),4000);return()=>clearTimeout(t);},[sure]);
useEffect(()=>{const h=()=>setFull(!!document.fullscreenElement);document.addEventListener('fullscreenchange',h);return()=>document.removeEventListener('fullscreenchange',h);},[]);
const toggleFull=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.querySelector('.live-stage')?.requestFullscreen().catch(()=>{});};
const err=error&&<p className="error" role="alert">{error}</p>;
const stage=(body:React.ReactNode,cls='')=><main className="live"><div className={`live-stage ${cls}`}>{view&&<div className="live-top"><span>PIN <b>{spaced(view.pin)}</b></span><span className="live-label">{view.label}</span>{view.at>=0&&phase!=='end'&&<span>Soru <b>{view.at+1}</b>/{view.total}</span>}<span>👥 <b>{view.count}</b></span>
<button className="live-icon" title={muted?'Sesi aç':'Sesi kapat'} aria-label={muted?'Sesi aç':'Sesi kapat'} onClick={()=>{setMuted(!muted);setMute(!muted);}}><span aria-hidden="true">{muted?'🔇':'🔊'}</span><b>{muted?'Ses kapalı':'Ses açık'}</b></button>
<button className="live-icon" title={full?'Tam ekrandan çık':'Tam ekran'} aria-label={full?'Tam ekrandan çık':'Tam ekran'} onClick={toggleFull}><span aria-hidden="true">⛶</span><b>{full?'Küçült':'Tam ekran'}</b></button>
{isHost&&phase!=='end'&&phase!=='lobby'&&<button className="live-icon warn" disabled={busy} onClick={()=>{if(sure){setSure(false);void lead('end');}else setSure(true);}}><span aria-hidden="true">⏹</span><b>{sure?'Emin misin? Tekrar bas':'Oyunu bitir'}</b></button>}
<button className="live-icon exit" onClick={()=>onExit()}><span aria-hidden="true">✕</span><b>Çık</b></button></div>}{body}{err}</div></main>;
if(!view)return stage(<p className="live-wait">Bağlanılıyor…</p>);
const {q,result,me,board}=view,host=view.host,last=view.at+1>=view.total;
const next=(t:string)=><button className="live-next" disabled={busy} onClick={()=>void lead('next')}>{t}</button>;
// Henüz katılmamış (ya da öğretmenin çıkardığı) öğrenci: takma ad ve avatar sorulur.
if(!host&&!me)return stage(phase==='end'?<><h2 className="live-title">Bu oyun bitti.</h2>{board&&<Podium rows={board}/>}</>:view.locked?<><h2 className="live-title">🔒 Oyun kilitli</h2><p className="live-wait">Öğretmen kilidi açınca katılabilirsin; bu ekran kendiliğinden yenilenir.</p></>:
<form className="live-join" onSubmit={e=>{e.preventDefault();join();}}><h2 className="live-title">Takma adın ne?</h2><p>Adın ve avatarın tahtada herkese görünür.</p><div className="live-avatars" role="radiogroup" aria-label="Avatar">{AVATARS.map(a=><button type="button" key={a} role="radio" aria-checked={avatar===a} className={avatar===a?'chosen':''} onClick={()=>setAvatar(a)}>{a}</button>)}</div><label className="sr-only" htmlFor="live-name">Takma ad</label><input id="live-name" autoFocus autoComplete="off" maxLength={15} placeholder="Takma ad" value={name} onChange={e=>setName(e.target.value)}/><button className="live-next" disabled={busy||name.trim().length<2}>Tamam, başla!</button></form>);
const t=q?q.type:'quiz',optionsQ=t!=='type';
// Soru açılışı: şıklardan önce sorunun numarası, türü ve geri sayım çubuğu.
const introBox=q&&<div className="live-intro" role="status"><b>Soru {view.at+1}</b><div className="live-badges"><Badges q={q}/></div><div className="live-bar"><span style={{width:`${100-Math.min(100,intro/4*100)}%`}}/></div><small>{optionsQ?'Şıklar':'Cevap alanı'} {Math.ceil(intro)} saniye sonra açılıyor</small></div>;
// Öğretmen ekranında ve sonuçta gösterilen (dokunulamayan) şıklar; sonuçta doğrular işaretlenir, diğerleri soluklaşır.
const tiles=q&&optionsQ&&!(result&&t==='puzzle')&&<div className={`live-tiles${q.options.some(o=>o.length>40)?' long':''}${phase==='question'?' fresh':''}`}>{q.options.map((o,i)=>{const right=result&&t!=='poll'&&t!=='puzzle'&&result.correct.includes(i),mine=me?.pick?.includes(i);
const cls=`live-tile c${tone(t,i)}${result&&t!=='poll'&&t!=='puzzle'?right?' correct':' faded':me?.answered&&!mine&&t!=='puzzle'?' faded':''}${mine&&t!=='puzzle'?' picked':''}`;
return <div key={i} className={cls}><i aria-hidden="true">{SHAPES[tone(t,i)]}</i><span>{o}</span>{right&&<em>✓</em>}{t==='puzzle'&&me?.pick&&<em>{me.pick.indexOf(i)+1}</em>}</div>;})}</div>;
// Cevap dağılımı: şıklı sorularda her şık için aşağıdan yükselen çubuk; sıralama ve yazılı soruda doğru/yanlış sayısı.
const bars=q&&result&&(optionsQ&&t!=='puzzle'?<div className="live-bars" aria-label="Cevap dağılımı">{result.counts.map((c,i)=><div key={i} className={`c${tone(t,i)}${t==='poll'||result.correct.includes(i)?' correct':''}`}><b>{t!=='poll'&&result.correct.includes(i)&&'✓ '}{c}</b><span style={{height:6+c/Math.max(1,...result.counts)*90}}/><i aria-hidden="true">{SHAPES[tone(t,i)]}</i></div>)}</div>
:<div className="live-bars" aria-label="Doğru ve yanlış sayısı">{[[result.right,'c3 correct','✓'],[result.wrong,'c0 correct','✗']].map(([c,cls,s])=><div key={s as string} className={cls as string}><b>{c}</b><span style={{height:6+(c as number)/Math.max(1,result.right,result.wrong)*90}}/><i aria-hidden="true">{s}</i></div>)}</div>);
// Sonuçta doğru cevap: sıralamada doğru dizilim, yazılı soruda kabul edilen yazımlar ve en sık verilen cevaplar.
const answer=q&&result&&(t==='puzzle'?<ol className="live-order">{result.correct.map((n,k)=><li key={n} className={`c${tone(t,n)}`}><b>{k+1}</b><i aria-hidden="true">{SHAPES[tone(t,n)]}</i><span>{q.options[n]}</span></li>)}</ol>
:t==='type'?<div className="live-typed"><p>Doğru cevap: <b>{result.answer}</b></p>{!!result.typed?.length&&<ul>{result.typed.map(x=><li key={x.text} className={x.ok?'ok':''}><span>{x.ok?'✓':'✗'} {x.text}</span><b>{x.n}</b></li>)}</ul>}</div>
:t!=='poll'&&<p className="live-sub">Doğru cevap: <b>{result.answer}</b></p>);
const question=q&&<div className="live-question" key={view.at}>{q.image&&<img src={imageUrl(q.image)} alt=""/>}<div><div className="live-badges"><Badges q={q}/></div><h2>{q.prompt}</h2></div></div>;
const timer=q&&phase==='question'&&!intro&&<div className={`live-timer${left<=5?' low':''}`} role="timer" aria-label={`${Math.ceil(left)} saniye kaldı`}><b>{Math.ceil(left)}</b><div><span style={{width:`${left/view.time*100}%`}}/></div><small>{q.answered}/{view.count} cevap</small></div>;
if(phase==='end'&&board)return stage(<><h2 className="live-title">{host?'🏆 Podyum':me&&me.rank<=3?'🎉 Podyumdasın!':`${me?.rank}. oldun`}</h2>{me&&<p className="live-sub">{me.name} · {me.score} puan</p>}<Podium rows={board}/>{board.length>3&&<div className="live-after"><Board rows={board} me={me?.name}/></div>}
<div className="live-actions">{host&&<a className="live-ghost" href={`${base}/api/live?pin=${view.pin}&host=${secret}&rapor=1`} download>⬇ Raporu indir (Excel)</a>}<button className="live-next" onClick={()=>onExit()}>{host?'Kahootlarıma dön':'Bitir'}</button></div><Confetti/></>);
if(phase==='board'&&board){const s=view.stars;return stage(<><h2 className="live-title">Skor tablosu</h2>
{s&&(s.riser||s.fastest||s.streak)&&<ul className="live-stars">{s.riser&&<li><span aria-hidden="true">🚀</span><small>En çok yükselen</small><b>{s.riser.name}</b><em>▲{s.riser.move} sıra</em></li>}{s.fastest&&<li><span aria-hidden="true">⚡</span><small>En hızlı doğru</small><b>{s.fastest.name}</b><em>{s.fastest.secs} sn</em></li>}{s.streak&&<li><span aria-hidden="true">🔥</span><small>Seride</small><b>{s.streak.name}</b><em>{s.streak.streak} doğru üst üste</em></li>}</ul>}
{me&&<p className="live-sub">{me.rank}. sıradasın · {me.score} puan{me.move>0?` · ▲ ${me.move} sıra yükseldin`:me.move<0?` · ▼ ${-me.move} sıra düştün`:''}</p>}
<Board rows={board} me={me?.name}/>{host?next('Sonraki soru →'):<p className="live-wait">Öğretmen sonraki soruya geçince devam edeceksin.</p>}</>);}
if(host){if(phase==='lobby')return stage(<><div className="live-lobby"><div><p>Katılmak için <b>{link.replace(/^https?:\/\//,'').replace(/\?pin=\d+$/,'')}</b> adresine gir ya da kare kodu okut</p><small>Oyun PIN’i:</small><b className="live-pin">{spaced(view.pin)}</b></div>{qr&&<img src={qr} alt="Oyuna katılma kare kodu" width={220} height={220}/>}</div>
<div className="live-lobby-bar"><span>👥 <b>{view.count}</b> oyuncu</span><button className="live-ghost" disabled={busy} onClick={()=>void lead('lock',{locked:!view.locked})}>{view.locked?'🔒 Kilitli: aç':'🔓 Girişi kilitle'}</button>{next('Başlat ↗')}</div>
<h2 className="live-title">{view.count?'Oyuncular hazır!':'Oyuncular bekleniyor…'}</h2>
<ul className="live-names">{view.players?.map(p=><li key={p.name}><button title="Oyundan çıkar" onClick={()=>void lead('kick',{name:p.name})}><span aria-hidden="true">{p.avatar}</span> {p.name}</button></li>)}</ul>
{!!view.count&&<p className="live-wait">Uygunsuz bir adı çıkarmak için üstüne dokun.</p>}</>);
return stage(<>{question}{phase==='question'&&intro?introBox:<>{timer}{bars}{tiles}{phase==='question'&&!optionsQ&&<p className="live-typing">⌨ Oyuncular cevabını yazıyor…</p>}{answer}</>}
{next(phase==='question'?intro?'Geç ⏭':'Süreyi bitir, cevabı göster':last?'Podyuma geç 🏆':'Skor tablosu →')}</>);}
if(!me)return stage(null);
if(phase==='lobby')return stage(<><h2 className="live-title">İçeridesin!</h2><p className="live-me"><span aria-hidden="true">{me.avatar}</span> {me.name}</p><p className="live-wait">Adını tahtada görüyor musun? Öğretmen oyunu başlatınca soru burada açılır.</p></>);
if(phase==='question')return stage(<>{question}{intro?introBox:<>{timer}{me.answered?<>{tiles}{t==='type'&&<p className="live-sub">Cevabın: <b>{me.typed}</b></p>}<p className="live-wait">Cevabın alındı. Herkes cevaplayınca ya da süre bitince sonuç açılır.</p></>
:<Answer key={view.at} q={q!} busy={busy} left={left} send={choice=>void act({action:'answer',token,choice})}/>}</>}</>);
const poll=t==='poll';
return stage(<><div className={`live-verdict ${poll?'poll':me.ok?'ok':'no'}`} role="status"><b>{poll?me.answered?'✓ Cevabın kaydedildi':'⏱ Süre doldu':me.ok?'✓ Doğru!':!me.answered?'⏱ Süre doldu':'✗ Yanlış'}</b>
{poll?<span>Anket sorusu: puan yok</span>:me.ok?<span>{me.points?`+${me.points} puan`:'Puansız soru'}</span>:<span>{q?.points?'Seri sıfırlandı':'Puansız soru'}</span>}{me.ok&&me.streak>=2&&<em><i aria-hidden="true">🔥</i> {me.streak} doğru üst üste!</em>}</div>
{question}{bars}{tiles}{answer}<p className="live-sub">{me.rank}. sıradasın · {me.score} puan</p>{me.behind&&<p className="live-wait">{me.behind.gap?`${me.behind.name} seni ${me.behind.gap} puanla geçiyor`:`${me.behind.name} ile eşitsin`}</p>}
<p className="live-wait">Öğretmen ilerletince devam edeceksin.</p></>,poll?'':me.ok?'ok':'no');}
