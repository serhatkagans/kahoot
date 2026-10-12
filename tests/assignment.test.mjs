import test from 'node:test';
import assert from 'node:assert/strict';
import {answerAssignment,assignmentReport,expireAssignment,joinAssignment,newAssignment,nextAssignment,viewAssignment} from '../lib/assignments.ts';

const A='a'.repeat(32),B='b'.repeat(32);
const quiz=(o={})=>({type:'quiz',prompt:'2 + 2?',image:null,options:['4','5'],correct:[0],accept:[],multi:false,time:20,points:1,answer:'4',...o});

test('Bireysel ödev: katılım, kendi hızında cevaplama, sonuç ve kalıcı rapor modeli',()=>{
 const a=newAssignment({pin:'654321',quizId:'mat',label:'Matematik',deadline:100_000,timer:false,qs:[quiz()]},1000);
 assert.equal(joinAssignment(a,'Elif',A,'🐼',2000),'ok');
 assert.equal(joinAssignment(a,' elif ',B,undefined,2000),'taken');
 let v=viewAssignment(a,A,2000);assert.equal(v.phase,'question');assert.equal(v.result,undefined);assert.equal(v.q.prompt,'2 + 2?');
 assert.ok(answerAssignment(a,A,0,9000));v=viewAssignment(a,A,9000);assert.equal(v.phase,'reveal');assert.equal(v.me.answer.ok,true);assert.equal(v.me.score,1000);assert.equal(v.result.answer,'4');
 assert.ok(nextAssignment(a,A,10_000));v=viewAssignment(a,A,10_000);assert.equal(v.phase,'end');assert.equal(v.me.correct,1);
 let report=assignmentReport(a,10_000);assert.equal(report.status,'active','son tarihe kadar yeni öğrenci katılabilir');assert.equal(report.completedAt,10_000);
 report=assignmentReport(a,100_001);assert.equal(report.status,'expired');assert.equal(report.players[0].completed,true);assert.equal(report.players[0].answers[0].text,'4');
});

test('Süreli ödev: süre dolunca soru yanıtsız kapanır',()=>{
 const a=newAssignment({pin:'654322',quizId:'mat',label:'Süreli',deadline:100_000,timer:true,qs:[quiz({time:5})]},0);
 joinAssignment(a,'Can',A,undefined,1000);assert.equal(expireAssignment(a,A,5999),false);assert.equal(expireAssignment(a,A,6000),true);
 const v=viewAssignment(a,A,6000);assert.equal(v.phase,'reveal');assert.equal(v.me.answer.ok,false);assert.equal(v.me.score,0);
});
