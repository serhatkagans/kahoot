import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLive,answerLive,createLive,endLive,findLive,joinLive,kickLive,lockLive,reportLive,viewLive} from '../lib/live.ts';
const Q=(o)=>({type:'quiz',prompt:'soru',image:null,options:['a','b','c','d'],correct:[0],accept:[],multi:false,time:20,points:1,answer:'a',...o});
const qs=[0,1,2].map(i=>Q({prompt:`soru ${i}`,correct:[i],answer:'abcd'[i]}));
const A='a'.repeat(32),B='b'.repeat(32),C='c'.repeat(32);
let n=100000;const pin=()=>String(n++);
test('Canlı yarışma: katılım, öğretmenin ilerletmesi, puan, sıra değişimi ve podyum',()=>{
 const g=createLive({pin:'111111',host:'h',label:'9-B',qs,intro:0},0);assert.ok(g);assert.equal(createLive({pin:'111111',host:'x',label:'',qs},0),undefined,'aynı PIN ikinci kez açılmaz');
 assert.equal(advanceLive(g,0),false,'oyuncu yokken başlamaz');
 assert.equal(joinLive(g,'Elif',A),'ok');assert.equal(joinLive(g,' elif ',B),'taken');assert.equal(joinLive(g,'Can',B),'ok');assert.equal(joinLive(g,'Başka',A),'ok','aynı cihaz geri gelir');assert.equal(joinLive(g,'Uygunsuz',C),'ok');
 kickLive(g,'Uygunsuz');assert.deepEqual(viewLive(g,null,true,0).players.map(p=>p.name),['Elif','Can']);assert.equal(viewLive(g,C,false,0).me,undefined);
 // 1. soru: Can hemen doğru, Elif yanlış.
 assert.ok(advanceLive(g,1000));assert.equal(g.phase,'question');
 assert.ok(answerLive(g,B,0,1000));assert.ok(!answerLive(g,B,1,1500),'tek cevap');
 let v=viewLive(g,B,false,2000);assert.equal(v.result,undefined,'soru kapanmadan doğru cevap gitmez');assert.equal(v.me.score,0);assert.equal(v.me.ok,null);assert.deepEqual(v.me.pick,[0]);assert.equal(v.q.answered,1);
 assert.ok(answerLive(g,A,3,11000));assert.equal(g.phase,'reveal','herkes cevaplayınca soru kapanır');
 v=viewLive(g,B,false,11000);assert.equal(v.me.points,1000);assert.equal(v.me.rank,1);assert.deepEqual(v.result.counts,[1,0,0,1]);assert.deepEqual(v.result.correct,[0]);assert.equal(v.result.right,1);assert.equal(v.result.wrong,1);
 assert.equal(viewLive(g,A,false,11000).me.behind.name,'Can');
 assert.ok(advanceLive(g,12000));assert.equal(g.phase,'board');assert.equal(viewLive(g,null,true,12000).board[0].name,'Can');
 // 2. soru: Elif hemen doğru, Can cevap vermez; süre bitince soru kapanır.
 assert.ok(advanceLive(g,20000));assert.ok(answerLive(g,A,1,20000));
 assert.equal(findLive('111111',41000).phase,'reveal');assert.ok(!answerLive(g,B,1,41000));
 advanceLive(g,42000);v=viewLive(g,A,false,42000);assert.equal(v.me.score,1000);assert.equal(v.board[0].name,'Elif','eşit puanda önce katılan üstte');assert.equal(v.me.move,1);assert.equal(v.stars.riser.name,'Elif');assert.equal(v.stars.fastest.name,'Elif');
 // 3. soru: Elif yine hemen doğru (seri bonusu), Can yanlış.
 advanceLive(g,50000);answerLive(g,A,2,50000);answerLive(g,B,0,51000);assert.equal(g.phase,'reveal');
 advanceLive(g,60000);assert.equal(g.phase,'end');v=viewLive(g,A,false,60000);assert.equal(v.board[0].name,'Elif');assert.equal(v.board[0].score,2100,'hız 1000 + seri bonusu 100');assert.equal(v.board.length,2);
 assert.equal(advanceLive(g,61000),false);assert.equal(joinLive(g,'Geç',C),'ended');
 const r=reportLive(g);assert.equal(r.players[0].name,'Elif');assert.equal(r.players[0].correct,2);assert.equal(r.players[1].answers[1].text,'');assert.equal(r.players[1].answers[0].text,'a');
});
test('Canlı yarışma: şıklar açılmadan cevap alınmaz; soru başına süre, çift puan ve puansız soru',()=>{
 const g=createLive({pin:pin(),host:'h',label:'',qs:[Q({time:10,points:2}),Q({points:0}),Q({time:5})]},0);
 joinLive(g,'Elif',A,'🐼');joinLive(g,'Can',B,'yok');let v=viewLive(g,A,false,0);assert.equal(v.me.avatar,'🐼');assert.ok(v.players[1].avatar,'geçersiz avatar yerine sıradaki verilir');
 advanceLive(g,0);v=viewLive(g,A,false,1000);assert.equal(v.q.intro,3000);assert.equal(v.q.left,13000);assert.equal(v.time,10);
 assert.ok(!answerLive(g,A,0,3999));assert.ok(answerLive(g,A,0,4000));answerLive(g,B,0,9000);
 v=viewLive(g,A,false,9000);assert.equal(v.me.points,2000,'çift puan');assert.equal(viewLive(g,B,false,9000).me.points,1500,'süre yarıda: 2000 × 0,75');
 advanceLive(g,10000);advanceLive(g,10000);answerLive(g,A,0,14000);answerLive(g,B,1,14000);
 v=viewLive(g,A,false,14000);assert.equal(v.me.ok,true);assert.equal(v.me.points,0,'puansız soru');assert.equal(v.me.streak,1,'puansız soru seriyi değiştirmez');
 assert.equal(viewLive(g,B,false,14000).me.streak,1,'puansız soruda yanlış seriyi bozmaz');
 advanceLive(g,15000);advanceLive(g,15000);assert.equal(viewLive(g,A,false,15000).time,5);
});
test('Soru türleri: çoklu seçim, Doğru/Yanlış, cevabı yaz, sıralama ve anket',()=>{
 const g=createLive({pin:pin(),host:'h',label:'',intro:0,qs:[
  Q({multi:true,correct:[0,2]}),Q({type:'tf',options:['Doğru','Yanlış'],correct:[1]}),Q({type:'type',options:[],accept:['Yapay zekâ','YZ']}),
  Q({type:'puzzle',options:['c','a','b'],correct:[1,2,0]}),Q({type:'poll',correct:[],points:0})]},0);
 joinLive(g,'Elif',A);joinLive(g,'Can',B);
 advanceLive(g,0);assert.ok(!answerLive(g,A,0,0),'çoklu seçimde dizi beklenir');assert.ok(!answerLive(g,A,[0,0],0),'aynı şık iki kez seçilemez');
 assert.ok(answerLive(g,A,[2,0],0));assert.ok(answerLive(g,B,[0],0));let v=viewLive(g,A,false,0);assert.equal(v.me.ok,true);assert.equal(viewLive(g,B,false,0).me.ok,false,'eksik seçim yanlış');assert.deepEqual(v.result.counts,[2,0,1,0]);
 advanceLive(g,0);advanceLive(g,0);assert.ok(!answerLive(g,A,2,0),'Doğru/Yanlış iki şıklı');assert.ok(answerLive(g,A,1,0));answerLive(g,B,0,0);assert.equal(viewLive(g,A,false,0).me.ok,true);
 advanceLive(g,0);advanceLive(g,0);assert.ok(!answerLive(g,A,'   ',0),'boş yazı alınmaz');assert.ok(answerLive(g,A,'yapay ZEKA',0));answerLive(g,B,'yz.',0);
 v=viewLive(g,A,false,0);assert.equal(v.me.ok,true,'harf ve Türkçe karakter farkı yok sayılır');assert.equal(viewLive(g,B,false,0).me.ok,true,'kabul edilen ikinci yazım');assert.equal(v.result.typed.length,2);
 advanceLive(g,0);advanceLive(g,0);assert.ok(!answerLive(g,A,[1,2],0),'sıralamada bütün öğeler girilir');assert.ok(answerLive(g,A,[1,2,0],0));answerLive(g,B,[0,1,2],0);
 assert.equal(viewLive(g,A,false,0).me.ok,true);assert.equal(viewLive(g,B,false,0).me.ok,false);
 const streak=viewLive(g,A,false,0).me.streak;advanceLive(g,0);advanceLive(g,0);assert.ok(answerLive(g,A,3,0));answerLive(g,B,3,0);v=viewLive(g,A,false,0);
 assert.equal(v.me.ok,null,'ankette doğru yok');assert.equal(v.me.points,0);assert.equal(v.me.streak,streak,'anket seriyi bozmaz');assert.deepEqual(v.result.counts,[0,0,0,2]);
});
test('Lobi kilidi ve oyunu erken bitirme',()=>{
 const g=createLive({pin:pin(),host:'h',label:'',qs},0);joinLive(g,'Elif',A);lockLive(g,true);assert.equal(joinLive(g,'Can',B),'locked');assert.equal(joinLive(g,'Elif',A),'ok','içerideki geri dönebilir');
 lockLive(g,false);assert.equal(joinLive(g,'Can',B),'ok');advanceLive(g,0);assert.ok(endLive(g,1000));assert.equal(g.phase,'end');assert.ok(!endLive(g,1000));assert.equal(viewLive(g,null,true,1000).board.length,2);
});
