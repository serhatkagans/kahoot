'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Gate,TopBar} from './teacher';
import {api,base,imageUrl,upload} from './client';
import {LIMITS,POINTS,TIMES,TYPES,blank,isOpinion,newId,parsePaste,problems,retype,type QType,type Question,type Quiz} from '../lib/quiz';
// Kahoot oluşturucu: solda soru listesi (sırala, çoğalt, sil), ortada soru metni, görsel ve şıklar, sağda soru türü, süre ve puan.
// Değişiklikler birkaç saniye içinde kendiliğinden kaydedilir (Ctrl+S ile hemen). Eksikli soru kaydedilir ama oyunda atlanır.
const SHAPES=['▲','◆','●','■'];
const tone=(type:QType,i:number)=>type==='tf'?[1,0][i]:i;
// Düzenlerken şıklı sorularda her zaman dört kutu görünür; boş kutular kaydedilir ama oyunda gösterilmez.
const choice=(type:QType)=>type==='quiz'||type==='poll'||type==='puzzle';
const pad=(q:Question):Question=>!choice(q.type)||q.options.length>=4?q:{...q,options:[...q.options,...Array.from({length:4-q.options.length},()=>({text:'',ok:false}))]};
const fresh=():Quiz=>({id:newId(),title:'',description:'',questions:[blank('quiz')],createdAt:Date.now(),updatedAt:Date.now()});
// Boş soru: metni, görseli, doldurulmuş şıkkı ya da cevabı yok. Hiçbir şey yazılmamış yeni kahoot kaydedilmez (kütüphane boş kayıtlarla dolmasın).
const empty=(x:Question)=>!x.text&&!x.image&&(x.type==='tf'||x.options.every(o=>!o.text))&&!x.accept?.some(Boolean);
const worth=(q:Quiz)=>!!q.title||q.questions.some(x=>!empty(x));
function ImageBox({id,onChange,label,marker,onMark}:{id?:string;onChange:(id?:string)=>void;label:string;marker?:{x:number;y:number;radius:number};onMark?:(x:number,y:number)=>void}){const [busy,setBusy]=useState(false),[error,setError]=useState(''),[over,setOver]=useState(false),input=useRef<HTMLInputElement>(null);
async function put(f?:File|null){if(!f)return;setBusy(true);setError('');try{onChange(await upload(f));}catch(e){setError(e instanceof Error?e.message:'Görsel yüklenemedi.');}finally{setBusy(false);}}
return <div className={`image-box${over?' over':''}${id?' has':''}`} onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);void put(e.dataTransfer.files[0]);}}>
{id?<><span className="pin-frame"><img className={onMark?'markable':''} src={imageUrl(id)} alt="" onClick={onMark?e=>{const r=e.currentTarget.getBoundingClientRect();onMark((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100);}:undefined}/>{marker&&<i className="pin-marker" style={{left:`${marker.x}%`,top:`${marker.y}%`,width:`${marker.radius*2}%`,aspectRatio:'1'}}/>}</span><div className="image-tools"><button type="button" onClick={()=>input.current?.click()}>Değiştir</button><button type="button" onClick={()=>onChange(undefined)}>Kaldır</button></div></>
:<button type="button" className="image-add" disabled={busy} onClick={()=>input.current?.click()}><b aria-hidden="true">＋</b><span>{busy?'Yükleniyor…':label}</span><small>Sürükle bırak ya da seç · PNG, JPG, GIF, WEBP · en çok 3 MB</small></button>}
<input ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];e.target.value='';void put(f);}}/>{error&&<p className="error">{error}</p>}</div>;}
// Ortadaki çalışma alanı: soru metni, görsel ve türe göre cevap alanı.
function Canvas({q,set}:{q:Question;set:(q:Question)=>void}){const opt=(i:number,v:Partial<Question['options'][number]>)=>set({...q,options:q.options.map((o,k)=>k===i?{...o,...v}:o)});
// Tek seçimli testte ve Doğru/Yanlış'ta bir şık doğru işaretlenince diğerleri kalkar.
const mark=(i:number)=>{const on=!q.options[i].ok;set({...q,options:q.options.map((o,k)=>k===i?{...o,ok:q.type==='tf'?true:on}:q.multi&&q.type==='quiz'?o:{...o,ok:false})});};
const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=q.options.length)return;const o=[...q.options];[o[i],o[j]]=[o[j],o[i]];set({...q,options:o});};
let answers:React.ReactNode;
if(q.type==='type'){const acc=q.accept??[''];answers=<div className="accept"><p className="muted">Oyuncular cevabı yazar; büyük/küçük harf, Türkçe harf ve boşluk farkı yok sayılır. En çok 20 karakter.</p>
{acc.map((a,i)=><div key={i} className="accept-row"><span className="tone c3" aria-hidden="true">✓</span><label className="sr-only" htmlFor={`acc-${i}`}>{i?'Kabul edilen başka yazım':'Doğru cevap'}</label>
<input id={`acc-${i}`} maxLength={LIMITS.typed} placeholder={i?'Kabul edilen başka yazım (isteğe bağlı)':'Doğru cevap'} value={a} onChange={e=>set({...q,accept:acc.map((x,k)=>k===i?e.target.value:x)})}/><small>{LIMITS.typed-a.length}</small>
{i>0&&<button type="button" className="icon" aria-label="Bu yazımı kaldır" onClick={()=>set({...q,accept:acc.filter((_,k)=>k!==i)})}>✕</button>}</div>)}
{acc.length<4&&<button type="button" className="ghost" onClick={()=>set({...q,accept:[...acc,'']})}>+ Başka yazım ekle</button>}</div>;}
else if(q.type==='wordcloud'||q.type==='open'||q.type==='brainstorm')answers=<div className="response-preview"><b>{q.type==='wordcloud'?'☁ Kelime bulutu':q.type==='open'?'✎ Açık uçlu yanıt':'✦ Beyin fırtınası'}</b><p className="muted">{q.type==='wordcloud'?'Oyuncular kısa yanıt yazar; aynı yanıtlar bulutta büyür.':q.type==='open'?'Oyuncular ayrıntılı yanıt yazar; öğretmen rapordan doğru/yanlış değerlendirir.':'Oyuncular fikir yazar ve cevaplar açılınca en iyi fikre oy verir.'}</p></div>;
else if(q.type==='slider')answers=<div className="numeric-editor"><label>En düşük<input type="number" value={q.min??0} onChange={e=>set({...q,min:Number(e.target.value)})}/></label><label>En yüksek<input type="number" value={q.max??100} onChange={e=>set({...q,max:Number(e.target.value)})}/></label><label>Doğru değer<input type="number" value={q.value??50} onChange={e=>set({...q,value:Number(e.target.value)})}/></label><label>Kabul payı (±)<input type="number" min="0" value={q.tolerance??0} onChange={e=>set({...q,tolerance:Number(e.target.value)})}/></label><label>Adım<input type="number" min="0.01" step="0.01" value={q.step??1} onChange={e=>set({...q,step:Number(e.target.value)})}/></label><label>Birim<input maxLength={20} placeholder="km, yıl, ₺…" value={q.unit??''} onChange={e=>set({...q,unit:e.target.value})}/></label></div>;
else if(q.type==='scale')answers=<div className="numeric-editor"><label>En düşük<input type="number" min="1" max="9" value={q.min??1} onChange={e=>set({...q,min:Number(e.target.value)})}/></label><label>En yüksek<input type="number" min="2" max="10" value={q.max??5} onChange={e=>set({...q,max:Number(e.target.value)})}/></label><label>Düşük etiketi<input maxLength={30} value={q.lowLabel??'Düşük'} onChange={e=>set({...q,lowLabel:e.target.value})}/></label><label>Yüksek etiketi<input maxLength={30} value={q.highLabel??'Yüksek'} onChange={e=>set({...q,highLabel:e.target.value})}/></label></div>;
else if(q.type==='pin')answers=<div className="response-preview"><b>⌖ Doğru alan: %{Math.round(q.pinX??50)}, %{Math.round(q.pinY??50)}</b><p className="muted">Görsele dokunarak doğru noktanın merkezini belirle.</p><label>Alan yarıçapı: %{q.pinRadius??12}<input type="range" min="3" max="30" value={q.pinRadius??12} onChange={e=>set({...q,pinRadius:Number(e.target.value)})}/></label></div>;
else if(q.type==='puzzle')answers=<div className="puzzle"><p className="muted">Öğeleri <b>doğru sırayla</b> yukarıdan aşağıya yaz; oyunda karışık gösterilir.</p>{q.options.map((o,i)=><div key={i} className={`answer-row c${i}`}><b className="order">{i+1}</b><span aria-hidden="true">{SHAPES[i]}</span>
<label className="sr-only" htmlFor={`opt-${i}`}>{i+1}. öğe</label><input id={`opt-${i}`} maxLength={LIMITS.option} placeholder={`${i+1}. öğe${i>1?' (isteğe bağlı)':''}`} value={o.text} onChange={e=>opt(i,{text:e.target.value})}/>
<button type="button" className="icon" aria-label="Yukarı taşı" disabled={!i} onClick={()=>move(i,-1)}>↑</button><button type="button" className="icon" aria-label="Aşağı taşı" disabled={i===q.options.length-1} onClick={()=>move(i,1)}>↓</button></div>)}</div>;
else answers=<div className={`answers${q.type==='tf'?' tf':''}`}>{q.options.map((o,i)=>{const c=tone(q.type,i);return <div key={i} className={`answer c${c}${o.text?' filled':''}`}><span aria-hidden="true">{SHAPES[c]}</span>
{q.type==='tf'?<b>{o.text}</b>:<><label className="sr-only" htmlFor={`opt-${i}`}>{q.type==='poll'?'Seçenek':'Cevap'} {i+1}</label><textarea id={`opt-${i}`} rows={2} maxLength={LIMITS.option} placeholder={`${q.type==='poll'?'Seçenek':'Cevap'} ${i+1}${i>1?' (isteğe bağlı)':''}`} value={o.text} onChange={e=>opt(i,{text:e.target.value.replace(/\n/g,' ')})}/></>}
{q.type!=='poll'&&<button type="button" className={`tick${o.ok?' on':''}`} role={q.multi?'checkbox':'radio'} aria-checked={o.ok} aria-label={`${i+1}. şık doğru cevap`} title="Doğru cevap" onClick={()=>mark(i)}>{o.ok?'✓':''}</button>}</div>;})}</div>;
return <section className="canvas"><label className="sr-only" htmlFor="q-text">Soru</label><div className="q-text"><textarea id="q-text" rows={2} maxLength={LIMITS.question} placeholder="Sorunu buraya yaz" value={q.text} onChange={e=>set({...q,text:e.target.value.replace(/\n/g,' ')})}/><small>{LIMITS.question-q.text.length}</small></div>
<ImageBox id={q.image} label={q.type==='pin'?'İşaretlenecek görseli ekle':'Görsel ekle'} onChange={image=>set({...q,image})} marker={q.type==='pin'&&q.image?{x:q.pinX??50,y:q.pinY??50,radius:q.pinRadius??12}:undefined} onMark={q.type==='pin'?(x,y)=>set({...q,pinX:x,pinY:y}):undefined}/>{answers}</section>;}
function Props({q,set,copy,remove,only}:{q:Question;set:(q:Question)=>void;copy:()=>void;remove:()=>void;only:boolean}){const issues=problems(q);
return <aside className="props"><label>Soru türü<select value={q.type} onChange={e=>set(pad(retype(q,e.target.value as QType)))}>{Object.entries(TYPES).map(([k,t])=><option key={k} value={k}>{t.icon} {t.label}</option>)}</select></label>
<label>Süre sınırı<select value={q.time} onChange={e=>set({...q,time:Number(e.target.value)})}>{TIMES.map(t=><option key={t} value={t}>{t<60?`${t} saniye`:`${t/60} dakika`}</option>)}</select></label>
{!isOpinion(q.type)&&<label>Puan<select value={q.points} onChange={e=>set({...q,points:Number(e.target.value) as 0|1|2})}>{POINTS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>}
{q.type==='quiz'&&<label>Cevap seçenekleri<select value={q.multi?'multi':'single'} onChange={e=>{const multi=e.target.value==='multi';let seen=false;
set({...q,multi,options:multi?q.options:q.options.map(o=>{const ok=o.ok&&!seen;if(o.ok)seen=true;return {...o,ok};})});}}><option value="single">Tek seçim</option><option value="multi">Çoklu seçim</option></select></label>}
<p className="muted small">{TYPES[q.type].hint}.{q.type==='quiz'&&q.multi?' Oyuncu bütün doğruları seçip göndermeli.':''}</p>
{issues.length>0&&<ul className="issues" aria-label="Eksikler">{issues.map(x=><li key={x}>⚠ {x}</li>)}</ul>}
<div className="row"><button type="button" className="ghost" onClick={copy}>⧉ Çoğalt</button><button type="button" className="ghost danger" disabled={only} onClick={remove}>🗑 Sil</button></div></aside>;}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);},[onClose]);
return <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-box"><div className="modal-head"><h2>{title}</h2><button type="button" className="icon" aria-label="Kapat" onClick={onClose}>✕</button></div>{children}</div></div>;}
function Paste({onAdd,onClose}:{onAdd:(qs:Question[])=>void;onClose:()=>void}){const [text,setText]=useState(''),found=parsePaste(text);
return <Modal title="Soruları toplu ekle" onClose={onClose}><p className="muted small">Excel’den (Kahoot şablonu: <i>Soru · Cevap 1–4 · Süre · Doğru cevap numarası</i>) satırları kopyalayıp yapıştır ya da soruları metin olarak yaz:</p>
<pre className="sample">{`1. MVP'nin amacı hangisidir?
Seçenekler: Hızlı geri bildirim, Kusursuz ürün, Borç almak
Doğru Cevap: Hızlı geri bildirim

2. Patent hakları ömür boyu geçerlidir.
Seçenekler: Doğru, Yanlış
Doğru Cevap: Yanlış`}</pre>
<p className="muted small">Şıklar ayrı satırlarda da olabilir (<i>A) …</i>); “Cevap: B” harf, numara ya da şıkkın kendisi olabilir, birden çok doğru virgülle ayrılır. Şıksız ama cevaplı soru “Cevabı yaz” olur.</p>
<label className="sr-only" htmlFor="paste">Sorular</label><textarea id="paste" className="paste" rows={10} autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Soruları buraya yapıştır"/>
<div className="row end"><span className="muted">{text.trim()?`${found.length} soru bulundu${found.filter(q=>problems(q).length).length?` (${found.filter(q=>problems(q).length).length} tanesinde eksik var)`:''}`:''}</span>
<button type="button" className="primary" disabled={!found.length} onClick={()=>onAdd(found.map(pad))}>{found.length?`${found.length} soruyu ekle`:'Ekle'}</button></div></Modal>;}
function Settings({quiz,set,onClose}:{quiz:Quiz;set:(q:Partial<Quiz>)=>void;onClose:()=>void}){
return <Modal title="Kahoot ayarları" onClose={onClose}><div className="form"><label>Başlık<input autoFocus maxLength={LIMITS.title} placeholder="Kahootun başlığı" value={quiz.title} onChange={e=>set({title:e.target.value})}/></label>
<label>Açıklama (isteğe bağlı)<textarea rows={3} maxLength={LIMITS.description} value={quiz.description} onChange={e=>set({description:e.target.value})}/></label>
<div><span className="label">Kapak görseli</span><ImageBox id={quiz.cover} label="Kapak görseli ekle" onChange={cover=>set({cover})}/></div>
<div className="row end"><button type="button" className="primary" onClick={onClose}>Tamam</button></div></div></Modal>;}
type Status='idle'|'dirty'|'saving'|'saved'|'error';
// Yeni kahoot (?id= yok) ayarlar penceresi açık başlar; kimliği baştan verilir, ilk kayıtta adrese yazılır.
function Edit({id}:{id:string}){const [quiz,setQuiz]=useState<Quiz|null>(()=>id?null:fresh()),[sel,setSel]=useState(0),[status,setStatus]=useState<Status>('idle'),[error,setError]=useState(''),[modal,setModal]=useState<''|'settings'|'paste'|'add'>(id?'':'settings');
const latest=useRef<Quiz|null>(quiz),created=useRef(!!id),router=useRouter();
useEffect(()=>{if(id)api<Quiz>(`/api/quizzes?id=${id}`).then(q=>setQuiz({...q,questions:q.questions.length?q.questions.map(pad):[blank('quiz')]})).catch(e=>setError(e.message));},[id]);
useEffect(()=>{latest.current=quiz;},[quiz]);
const save=useCallback(async()=>{const q=latest.current;if(!q||!worth(q))return;setStatus('saving');try{await api('/api/quizzes',{action:'save',quiz:q});
if(!created.current){created.current=true;history.replaceState(null,'',`${base}/duzenle?id=${q.id}`);}setStatus(s=>s==='saving'?'saved':s);}catch(e){setStatus('error');setError(e instanceof Error?e.message:'Kaydedilemedi.');}},[]);
// Kendiliğinden kaydetme: son değişiklikten 1,5 saniye sonra.
useEffect(()=>{if(status!=='dirty')return;const t=setTimeout(()=>void save(),1500);return()=>clearTimeout(t);},[status,quiz,save]);
useEffect(()=>{const k=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save();}};addEventListener('keydown',k);return()=>removeEventListener('keydown',k);},[save]);
useEffect(()=>{if(status!=='dirty'&&status!=='saving')return;const h=(e:BeforeUnloadEvent)=>{e.preventDefault();};addEventListener('beforeunload',h);return()=>removeEventListener('beforeunload',h);},[status]);
const change=(f:(q:Quiz)=>Quiz)=>{setQuiz(q=>q&&f(q));setStatus('dirty');setError('');};
const closeModal=useCallback(()=>setModal(''),[]);
if(!quiz)return <><TopBar/><main className="page">{error?<p className="error">{error}</p>:<p className="muted">Yükleniyor…</p>}</main></>;
const qs=quiz.questions,i=Math.min(sel,qs.length-1),q=qs[i];
const setQ=(n:Question)=>change(z=>({...z,questions:z.questions.map((x,k)=>k===i?n:x)}));
const add=(list:Question[],replace=false)=>{change(z=>({...z,questions:replace?list:[...z.questions.slice(0,i+1),...list,...z.questions.slice(i+1)]}));setSel(replace?0:i+1);setModal('');};
// Tek ve boş soru varsa toplu eklenen sorular onun yerine geçer.
const lonely=qs.length===1&&empty(q);
const move=(k:number,d:number)=>{const j=k+d;if(j<0||j>=qs.length)return;change(z=>{const a=[...z.questions];[a[k],a[j]]=[a[j],a[k]];return {...z,questions:a};});setSel(j);};
const label=status==='saving'?'Kaydediliyor…':status==='saved'?'✓ Kaydedildi':status==='dirty'?'Kaydedilmedi':status==='error'?'⚠ Kaydedilemedi':'';
const ready=qs.filter(x=>!problems(x).length).length;
async function start(){await save();if(latest.current&&worth(latest.current))router.push(`/sun?id=${latest.current.id}`);}
return <><TopBar><button className="title-button" onClick={()=>setModal('settings')}>{quiz.title||'Kahoot başlığını gir…'} <small>Ayarlar</small></button><span className={`save-state ${status}`} aria-live="polite">{label}</span>
<button className="ghost" disabled={status==='saving'} onClick={()=>void save()}>Kaydet</button><button className="primary" disabled={!ready} title={ready?'':'Oynanabilir soru yok'} onClick={()=>void start()}>▶ Başlat</button></TopBar>
{error&&<p className="error banner" role="alert">{error}</p>}
<div className="editor"><aside className="qlist"><ol>{qs.map((x,k)=>{const bad=problems(x).length>0;return <li key={x.id} className={k===i?'on':''}>
<button className="qitem" onClick={()=>setSel(k)} aria-current={k===i}><span className="qnum">{k+1}</span><span className="qmeta"><small>{TYPES[x.type].icon} {TYPES[x.type].label}{bad&&<b className="warn" title={problems(x).join(' ')}> ⚠</b>}</small><span>{x.text||<i>Soru yazılmadı</i>}</span></span></button>
{k===i&&<div className="qtools"><button className="icon" aria-label="Yukarı taşı" disabled={!k} onClick={()=>move(k,-1)}>↑</button><button className="icon" aria-label="Aşağı taşı" disabled={k===qs.length-1} onClick={()=>move(k,1)}>↓</button></div>}</li>;})}</ol>
<div className="qlist-foot"><button className="primary" onClick={()=>setModal('add')}>+ Soru ekle</button><button className="ghost" onClick={()=>setModal('paste')}>⎘ Toplu ekle</button><small className="muted">{qs.length} soru · {ready} oynanabilir</small></div></aside>
<Canvas key={q.id} q={q} set={setQ}/>
<Props q={q} set={setQ} only={qs.length===1} copy={()=>add([{...q,id:newId(),options:q.options.map(o=>({...o})),accept:q.accept&&[...q.accept]}])} remove={()=>{change(z=>({...z,questions:z.questions.filter((_,k)=>k!==i)}));setSel(Math.max(0,i-1));}}/></div>
{modal==='add'&&<Modal title="Soru türü seç" onClose={closeModal}><div className="type-grid">{(Object.keys(TYPES) as QType[]).map(t=><button key={t} className="type-card" onClick={()=>add([pad(blank(t))])}><b aria-hidden="true">{TYPES[t].icon}</b><span>{TYPES[t].label}</span><small>{TYPES[t].hint}</small></button>)}</div></Modal>}
{modal==='paste'&&<Paste onClose={closeModal} onAdd={list=>add(list,lonely)}/>}
{modal==='settings'&&<Settings quiz={quiz} onClose={closeModal} set={v=>change(z=>({...z,...v}))}/>}</>;}
export default function Editor({id}:{id:string}){return <Gate><Edit id={id}/></Gate>;}
