// Kahoot soru seti modeli: türler, doğrulama ve canlı oyuna hazırlama. Bağımlılığı yoktur (testler doğrudan içe aktarır).
// Soru türleri Kahoot'takiyle aynıdır:
//  quiz   – Test: 2–4 şık, bir ya da birden çok doğru; "çoklu seçim" açıksa oyuncu birden çok şık işaretler.
//  tf     – Doğru/Yanlış: iki sabit şık.
//  type   – Cevabı yaz: oyuncu cevabı yazar (en çok 20 karakter); kabul edilen 1–4 yazım.
//  puzzle – Sıralama: 2–4 öğe doğru sırayla girilir, oyunda karışık gösterilir.
//  poll/wordcloud/scale/brainstorm – görüş toplama türleri; otomatik puan yoktur.
//  open – Açık uçlu yanıt; rapordan öğretmen tarafından değerlendirilir.
//  slider – Sayısal tahmin; doğru değer ve kabul aralığı vardır.
//  pin – Görsel üzerinde doğru alanı işaretleme.
export type QType='quiz'|'tf'|'type'|'puzzle'|'poll'|'wordcloud'|'open'|'slider'|'pin'|'scale'|'brainstorm';
export type Option={text:string;ok:boolean};
export type Question={id:string;type:QType;text:string;image?:string;time:number;points:0|1|2;multi?:boolean;options:Option[];accept?:string[];
min?:number;max?:number;step?:number;value?:number;tolerance?:number;unit?:string;lowLabel?:string;highLabel?:string;pinX?:number;pinY?:number;pinRadius?:number};
export type Quiz={id:string;title:string;description:string;cover?:string;questions:Question[];createdAt:number;updatedAt:number};
export const TYPES:Record<QType,{label:string;icon:string;hint:string}>={
quiz:{label:'Test',icon:'▦',hint:'2–4 şıktan doğruyu bul'},
tf:{label:'Doğru / Yanlış',icon:'◐',hint:'İfade doğru mu, yanlış mı?'},
type:{label:'Cevabı yaz',icon:'⌨',hint:'Cevabı klavyeyle yaz'},
puzzle:{label:'Sıralama',icon:'⇅',hint:'Öğeleri doğru sıraya koy'},
poll:{label:'Anket',icon:'▤',hint:'Görüş topla; puan yok'},
wordcloud:{label:'Kelime bulutu',icon:'☁',hint:'Kısa yanıtları ortak bulutta göster'},
open:{label:'Açık uçlu',icon:'✎',hint:'Uzun yanıtı raporda değerlendir'},
slider:{label:'Sayısal kaydırıcı',icon:'↔',hint:'Bir sayıyı kabul aralığıyla tahmin et'},
pin:{label:'Nokta işaretleme',icon:'⌖',hint:'Görselde doğru alanı bul'},
scale:{label:'Ölçek',icon:'⑴',hint:'1–5 arasında görüş topla'},
brainstorm:{label:'Beyin fırtınası',icon:'✦',hint:'Fikir üret ve en iyi fikre oy ver'},
};
export const TIMES=[5,10,20,30,45,60,90,120,240];
export const POINTS:{value:0|1|2;label:string}[]=[{value:1,label:'Standart (1000)'},{value:2,label:'Çift puan (2000)'},{value:0,label:'Puansız'}];
export const TF=['Doğru','Yanlış'];
export const LIMITS={title:95,description:500,question:120,option:75,typed:20,open:250,questions:100};
export const OPINION_TYPES:QType[]=['poll','wordcloud','scale','brainstorm'];
export const TEXT_TYPES:QType[]=['type','wordcloud','open','brainstorm'];
export const isOpinion=(type:QType)=>OPINION_TYPES.includes(type);
const IMAGE=/^[a-f0-9]{16,64}\.(png|jpe?g|webp|gif)$/;
const plain:Record<string,string>={ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u',â:'a',î:'i',û:'u'};
// Yazılan cevabı karşılaştırmak için: büyük/küçük harf, Türkçe harf, boşluk ve işaret farkı yok sayılır ("Yapay zekâ" = "yapay zeka").
export const fold=(s:string)=>s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g,c=>plain[c]).replace(/[^\p{L}\p{N}]/gu,'');
export function shuffle<T>(list:T[],rnd=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const newId=(rnd=Math.random)=>Array.from({length:12},()=>'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(rnd()*32)]).join('');
const str=(v:unknown,max:number)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
// Yeni soru: türüne göre boş şıklarla.
export function blank(type:QType='quiz'):Question{const q:Question={id:newId(),type,text:'',time:20,points:isOpinion(type)?0:1,options:[]};
if(type==='tf')q.options=TF.map((text,i)=>({text,ok:i===0}));
else if(type==='type')q.accept=[''];
else if(type==='quiz'||type==='poll'||type==='puzzle')q.options=Array.from({length:4},()=>({text:'',ok:false}));
else if(type==='slider')Object.assign(q,{min:0,max:100,step:1,value:50,tolerance:0,unit:''});
else if(type==='scale')Object.assign(q,{min:1,max:5,lowLabel:'Düşük',highLabel:'Yüksek'});
else if(type==='pin')Object.assign(q,{pinX:50,pinY:50,pinRadius:12});
return q;}
// Soruyu başka türe çevirir; uyan şıklar korunur.
export function retype(q:Question,type:QType):Question{if(q.type===type)return q;const b=blank(type),keep=q.options.filter(o=>o.text).slice(0,4);
if(type==='quiz'||type==='poll'||type==='puzzle')b.options=b.options.map((o,i)=>({text:keep[i]?.text??'',ok:type==='quiz'&&!!keep[i]?.ok}));
if(type==='type')b.accept=[q.options.find(o=>o.ok&&o.text)?.text.slice(0,LIMITS.typed)??''];
return {...b,id:q.id,text:q.text,image:q.image,time:q.time,points:isOpinion(type)?0:q.points};}
// Dışarıdan gelen (düzenleyici, içe aktarma) soruyu güvenli biçime getirir. Eksikler problems() ile ayrıca bildirilir.
export function cleanQuestion(v:unknown):Question{const o=(v&&typeof v==='object'?v:{}) as Record<string,unknown>;
const type:QType=typeof o.type==='string'&&o.type in TYPES?o.type as QType:'quiz';
const time=TIMES.includes(o.time as number)?o.time as number:20,points=isOpinion(type)?0:[0,1,2].includes(o.points as number)?o.points as 0|1|2:1;
const raw=Array.isArray(o.options)?o.options:[];
let options:Option[]=raw.slice(0,4).map(x=>{const r=(x&&typeof x==='object'?x:{}) as Record<string,unknown>;return {text:str(r.text,LIMITS.option),ok:!!r.ok};});
if(type==='tf'){const yes=options[0]?.ok??true;options=TF.map((text,i)=>({text,ok:i===0?yes:!yes}));}
if(TEXT_TYPES.includes(type)||type==='slider'||type==='pin'||type==='scale')options=[];
if(type==='poll'||type==='puzzle')options=options.map(x=>({...x,ok:false}));
if(type==='quiz'||type==='poll'||type==='puzzle')while(options.length<2)options.push({text:'',ok:false});
const q:Question={id:typeof o.id==='string'&&/^[a-z0-9]{6,24}$/.test(o.id)?o.id:newId(),type,text:str(o.text,LIMITS.question),time,points,options};
if(typeof o.image==='string'&&IMAGE.test(o.image))q.image=o.image;
if(type==='quiz'&&o.multi)q.multi=true;
if(type==='type'){const a=(Array.isArray(o.accept)?o.accept:[]).map(x=>str(x,LIMITS.typed)).slice(0,4);q.accept=a.length?a:[''];}
const num=(v:unknown,fallback:number,min=-1_000_000,max=1_000_000)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
if(type==='slider'){q.min=num(o.min,0);q.max=num(o.max,100);if(q.max<=q.min)q.max=q.min+100;q.step=num(o.step,1,.01,Math.max(.01,q.max-q.min));q.value=num(o.value,(q.min+q.max)/2,q.min,q.max);q.tolerance=num(o.tolerance,0,0,q.max-q.min);q.unit=str(o.unit,20);}
if(type==='scale'){q.min=Math.round(num(o.min,1,1,9));q.max=Math.round(num(o.max,5,q.min+1,10));q.lowLabel=str(o.lowLabel,30)||'Düşük';q.highLabel=str(o.highLabel,30)||'Yüksek';}
if(type==='pin'){q.pinX=num(o.pinX,50,0,100);q.pinY=num(o.pinY,50,0,100);q.pinRadius=num(o.pinRadius,12,3,30);}
return q;}
export function cleanQuiz(v:unknown,now=Date.now()):Quiz{const o=(v&&typeof v==='object'?v:{}) as Record<string,unknown>;
const qs=(Array.isArray(o.questions)?o.questions:[]).slice(0,LIMITS.questions).map(cleanQuestion),seen=new Set<string>();
for(const q of qs){if(seen.has(q.id))q.id=newId();seen.add(q.id);}
const quiz:Quiz={id:typeof o.id==='string'&&/^[a-z0-9-]{3,40}$/.test(o.id)?o.id:newId(),title:str(o.title,LIMITS.title),description:typeof o.description==='string'?o.description.trim().slice(0,LIMITS.description):'',
questions:qs,createdAt:typeof o.createdAt==='number'?o.createdAt:now,updatedAt:now};
if(typeof o.cover==='string'&&IMAGE.test(o.cover))quiz.cover=o.cover;
return quiz;}
// Sorudaki eksikler (düzenleyicide uyarı olarak gösterilir; eksikli soru oyunda kullanılmaz).
export function problems(q:Question):string[]{const out:string[]=[];if(!q.text&&!q.image)out.push('Soru metni yaz.');
const filled=q.options.filter(o=>o.text);
if(q.type==='quiz'){if(filled.length<2)out.push('En az iki şık doldur.');if(!filled.some(o=>o.ok))out.push('Doğru cevabı işaretle.');}
if(q.type==='poll'&&filled.length<2)out.push('En az iki seçenek doldur.');
if(q.type==='puzzle'&&filled.length<2)out.push('En az iki öğe doldur.');
if(q.type==='type'&&!q.accept?.some(Boolean))out.push('Kabul edilen cevabı yaz.');
if(q.type==='pin'&&!q.image)out.push('İşaretlenecek görseli ekle.');
if(q.type==='slider'&&((q.max??0)<=(q.min??0)||(q.value??0)<(q.min??0)||(q.value??0)>(q.max??0)))out.push('Sayısal aralığı ve doğru değeri düzelt.');
return out;}
export const playable=(quiz:Quiz)=>quiz.questions.filter(q=>!problems(q).length);
// Canlı oyunda bir soru. Doğru cevap (correct/accept) sunucuda kalır; istemciye soru kapanınca gider.
// correct: quiz/tf için doğru şıkların sırası; puzzle için gösterilen (karışık) şıkların doğru sıralaması; poll için boş.
export type LiveQ={type:QType;prompt:string;image:string|null;options:string[];correct:number[];accept:string[];multi:boolean;time:number;points:0|1|2;answer:string;
min:number;max:number;step:number;value:number;tolerance:number;unit:string;lowLabel:string;highLabel:string;pinX:number;pinY:number;pinRadius:number};
// Soru setini canlı oyuna hazırlar: eksikli sorular atlanır; istenirse soruların ve şıkların sırası karıştırılır.
// Sıralama sorusunda öğeler her zaman karıştırılır (mümkünse doğru sırayla gösterilmez); Doğru/Yanlış'ta sıra korunur.
export function liveQuestions(quiz:Quiz,o:{shuffleQ?:boolean;shuffleA?:boolean}={},rnd=Math.random):LiveQ[]{const list=playable(quiz);
return (o.shuffleQ?shuffle(list,rnd):list).map(q=>{const base={type:q.type,prompt:q.text,image:q.image??null,time:q.time,points:isOpinion(q.type)?0 as const:q.points,multi:false,accept:[] as string[],options:[] as string[],correct:[] as number[],answer:'',
min:q.min??0,max:q.max??100,step:q.step??1,value:q.value??0,tolerance:q.tolerance??0,unit:q.unit??'',lowLabel:q.lowLabel??'',highLabel:q.highLabel??'',pinX:q.pinX??50,pinY:q.pinY??50,pinRadius:q.pinRadius??12};
if(q.type==='type'){const accept=q.accept!.filter(Boolean);return {...base,options:[],correct:[],accept,answer:accept.join(' / ')};}
if(q.type==='wordcloud'||q.type==='open'||q.type==='brainstorm'||q.type==='scale')return base;
if(q.type==='slider')return {...base,answer:`${q.value}${q.unit?` ${q.unit}`:''}`};
if(q.type==='pin')return {...base,answer:'İşaretli alan'};
const opts=q.options.filter(o=>o.text);
if(q.type==='puzzle'){const idx=opts.map((_,i)=>i);let order=shuffle(idx,rnd);for(let t=0;t<5&&order.every((v,i)=>v===i);t++)order=shuffle(idx,rnd);
const shown=order.map(i=>opts[i].text);return {...base,options:shown,correct:idx.map(i=>order.indexOf(i)),answer:opts.map(o=>o.text).join(' → ')};}
const shown=q.type==='tf'||!o.shuffleA?opts:shuffle(opts,rnd),correct=shown.flatMap((x,i)=>x.ok?[i]:[]);
return {...base,options:shown.map(x=>x.text),correct:q.type==='poll'?[]:correct,multi:q.type==='quiz'&&!!q.multi,answer:q.type==='poll'?'':shown.filter(x=>x.ok).map(x=>x.text).join(' / ')};});}
// Toplu soru ekleme (düzenleyicide "Yapıştır"). İki biçim okunur:
// 1) Excel/Kahoot şablonu satırları (sekmeyle ayrılmış): Soru · Şık 1 · Şık 2 · Şık 3 · Şık 4 · Süre (sn) · Doğru şık(lar) ("2" ya da "1,3"). Başlık satırı atlanır.
// 2) Metin blokları: "1. Soru" satırı, "Seçenekler: a, b, c" ya da her şık ayrı satırda ("A) …", "- …"), "Doğru Cevap: b" (harf, numara ya da şıkkın kendisi).
//    Bloklar boş satır ya da "-----" ile ayrılır. Şıklar Doğru/Yanlış ise soru Doğru/Yanlış olur; tek şık yoksa ve cevap varsa "Cevabı yaz" olur.
const letters='abcdefgh';
function pickCorrect(answer:string,options:string[]):number[]{const out=new Set<number>();
for(const part of answer.split(/\s*[,;/]\s*|\s+ve\s+/)){const p=part.trim().replace(/[).]$/,'');if(!p)continue;
const byText=options.findIndex(o=>fold(o)===fold(p));if(byText>=0){out.add(byText);continue;}
if(/^\d$/.test(p)&&+p>=1&&+p<=options.length)out.add(+p-1);else if(p.length===1&&letters.indexOf(p.toLocaleLowerCase('tr'))>=0&&letters.indexOf(p.toLocaleLowerCase('tr'))<options.length)out.add(letters.indexOf(p.toLocaleLowerCase('tr')));}
if(!out.size){const whole=options.findIndex(o=>fold(o)===fold(answer));if(whole>=0)out.add(whole);}
return [...out];}
function build(text:string,options:string[],answer:string,time?:number):Question{const opts=options.map(o=>o.trim()).filter(Boolean).slice(0,4);
const isTf=opts.length===2&&fold(opts[0])===fold(TF[0])&&fold(opts[1])===fold(TF[1]);
if(!opts.length&&answer){const q=blank('type');q.text=text.slice(0,LIMITS.question);q.accept=answer.split(/\s*[,;/]\s*/).filter(Boolean).slice(0,4).map(a=>a.slice(0,LIMITS.typed));if(time)q.time=time;return q;}
const correct=pickCorrect(answer,opts),q=blank(isTf?'tf':'quiz');q.text=text.slice(0,LIMITS.question);if(time&&TIMES.includes(time))q.time=time;
if(isTf)q.options=TF.map((t,i)=>({text:t,ok:i===(correct[0]??0)}));
else{q.options=opts.map((t,i)=>({text:t.slice(0,LIMITS.option),ok:correct.includes(i)}));while(q.options.length<2)q.options.push({text:'',ok:false});if(correct.length>1)q.multi=true;}
return q;}
export function parsePaste(raw:string):Question[]{const text=raw.replace(/\r/g,'');
// Kahoot şablonunda ilk sütun soru numarası olabilir; atlanır.
if(text.includes('\t'))return text.split('\n').map(l=>{const c=l.split('\t').map(x=>x.trim());return /^\d+$/.test(c[0])?c.slice(1):c;})
.filter(c=>c[0]&&c.length>=3&&!/^(soru|question)\b/i.test(c[0])).map(c=>build(c[0],c.slice(1,5),c[6]??'',Number(c[5])||undefined));
// Numaralı satır ("12. …") yeni soru başlatır; öncesindeki numarasız satırlar (bölüm başlıkları) soruya katılmaz.
const out:Question[]=[];let q='',numbered=false,answer='',opts:string[]=[];
const flush=()=>{if(q&&(opts.length>=2||answer))out.push(build(q,opts,answer));q='';numbered=false;answer='';opts=[];};
for(const l of text.split('\n').map(x=>x.trim())){let m:RegExpMatchArray|null;
if(!l||/^[-_=]{3,}$/.test(l)){if(opts.length||answer)flush();continue;}
if((m=l.match(/^(?:seçenekler|şıklar|secenekler)\s*:\s*(.*)$/i)))opts.push(...m[1].split(/\s*,\s*/));
else if((m=l.match(/^(?:doğru\s*cevap|dogru\s*cevap|cevap|yanıt)\s*:\s*(.*)$/i)))answer=m[1].trim();
else if((m=l.match(/^\d+\s*[.)-]\s*(.+)$/))&&(!numbered||opts.length||answer)){flush();q=m[1];numbered=true;}
else if((m=l.match(/^(?:[a-hA-H][).]|[-•*])\s+(.*)$/))&&q){let o=m[1];if(/^\*/.test(l)||/\s\*$/.test(o)){o=o.replace(/\s*\*$/,'');answer=answer||o;}opts.push(o);}
else if(q&&answer){flush();q=l;}
else if(!q||(!numbered&&!opts.length)){q=l;}
else if(!opts.length)q+=' '+l;}
flush();return out;}
