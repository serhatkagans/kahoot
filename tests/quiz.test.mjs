import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,cleanQuiz,liveQuestions,parsePaste,playable,problems,retype} from '../lib/quiz.ts';
import {SEEDS} from '../lib/seed.ts';
test('Hazır soru setleri eksiksiz; Tekno Girişimcilik 25 soru (10 Doğru/Yanlış, 15 test)',()=>{
 for(const s of SEEDS){const q=cleanQuiz(s);assert.equal(playable(q).length,q.questions.length,s.title);}
 const g=cleanQuiz(SEEDS[0]);assert.equal(g.questions.length,25);assert.equal(g.questions.filter(q=>q.type==='tf').length,10);
 const qs=liveQuestions(g,{shuffleA:true});for(const q of qs){assert.ok(q.correct.length===1);assert.equal(q.options[q.correct[0]],q.answer);}
 assert.deepEqual(qs[0].options,['Doğru','Yanlış'],'Doğru/Yanlış sırası korunur');assert.deepEqual(qs[0].correct,[1]);
});
test('Temizleme: geçersiz alanlar düzelir, Doğru/Yanlış ve anket kuralları',()=>{
 const q=cleanQuiz({title:'  Deneme  ',questions:[{type:'tf',options:[{text:'x',ok:false}]},{type:'poll',points:2,options:[{text:'a',ok:true},{text:'b',ok:true}]},{type:'nope',time:7,image:'../etc/passwd'}]});
 assert.equal(q.title,'Deneme');assert.deepEqual(q.questions[0].options,[{text:'Doğru',ok:false},{text:'Yanlış',ok:true}]);
 assert.equal(q.questions[1].points,0);assert.ok(q.questions[1].options.every(o=>!o.ok));assert.equal(q.questions[2].type,'quiz');assert.equal(q.questions[2].time,20);assert.equal(q.questions[2].image,undefined);
 assert.deepEqual(problems(blank('quiz')),['Soru metni yaz.','En az iki şık doldur.','Doğru cevabı işaretle.']);assert.deepEqual(problems(blank('type')),['Soru metni yaz.','Kabul edilen cevabı yaz.']);
 const t=retype({...blank('quiz'),text:'S',options:[{text:'A',ok:false},{text:'B',ok:true},{text:'',ok:false},{text:'',ok:false}]},'type');assert.deepEqual(t.accept,['B']);assert.equal(t.text,'S');
});
test('Canlıya hazırlama: eksikli soru atlanır, sıralama karışık gelir, doğru sırayı verir',()=>{
 const q=cleanQuiz({questions:[{type:'puzzle',text:'Sırala',options:['1','2','3','4'].map(text=>({text}))},{type:'quiz',text:'Eksik',options:[{text:'a'},{text:'b'}]},{type:'type',text:'Yaz',accept:['x','']}]});
 const [p,t,...rest]=liveQuestions(q);assert.equal(rest.length,0);assert.notDeepEqual(p.options,['1','2','3','4']);assert.deepEqual(p.correct.map(i=>p.options[i]),['1','2','3','4']);
 assert.deepEqual(t.accept,['x']);assert.equal(t.options.length,0);
});
test('Toplu yapıştırma: Excel satırları ve metin blokları',()=>{
 const xs=parsePaste('Soru\tCevap 1\tCevap 2\tCevap 3\tCevap 4\tSüre\tDoğru\n1\tBaşkent?\tİzmir\tAnkara\t\t\t30\t2\nAsal olanlar?\t2\t4\t5\t9\t20\t1,3');
 assert.equal(xs.length,2);assert.equal(xs[0].time,30);assert.deepEqual(xs[0].options.map(o=>o.ok),[false,true]);assert.ok(xs[1].multi);
 const ts=parsePaste("Bölüm başlığı\n1. MVP'nin amacı?\nSeçenekler: Hızlı geri bildirim, Kusursuz ürün\nDoğru Cevap: Hızlı geri bildirim\n------\n2. Patent ömür boyu geçerlidir.\nSeçenekler: Doğru, Yanlış\nDoğru Cevap: Yanlış\n\n3. Hangisi meyve?\nA) Elma\nB) Havuç\nCevap: A\n4. CPU kısaltması?\nCevap: CPU, MİB");
 assert.deepEqual(ts.map(q=>q.type),['quiz','tf','quiz','type']);assert.equal(ts[0].text,"MVP'nin amacı?");assert.ok(ts[1].options[1].ok);assert.ok(ts[2].options[0].ok);assert.deepEqual(ts[3].accept,['CPU','MİB']);
 assert.ok(ts.every(q=>!problems(q).length));
});
test('Yeni soru türleri: temizleme, doğrulama ve canlı soru ayarları',()=>{
 const quiz=cleanQuiz({questions:[
  {type:'wordcloud',text:'Tek kelime?'},{type:'open',text:'Açıkla'},{type:'slider',text:'Kaç?',min:0,max:10,value:7,tolerance:1,unit:'kg'},
  {type:'pin',text:'Nerede?',image:'aaaaaaaaaaaaaaaa.png',pinX:25,pinY:75,pinRadius:10},{type:'scale',text:'Puanla',min:1,max:5},{type:'brainstorm',text:'Fikrin?'}]});
 assert.equal(playable(quiz).length,6);assert.deepEqual(quiz.questions.map(q=>q.type),['wordcloud','open','slider','pin','scale','brainstorm']);
 const live=liveQuestions(quiz);assert.equal(live[2].value,7);assert.equal(live[2].answer,'7 kg');assert.equal(live[3].pinX,25);assert.equal(live[4].points,0);assert.equal(live[5].options.length,0);
 const bad=blank('pin');bad.text='Nerede?';assert.deepEqual(problems(bad),['İşaretlenecek görseli ekle.']);
});
