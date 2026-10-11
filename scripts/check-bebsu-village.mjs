import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import {createVillageHost} from '../village/village-bridge.js';
class Storage {
  state=new Map();
  getItem(key){return this.state.get(key)??null;}
  setItem(key,value){this.state.set(key,String(value));}
  removeItem(key){this.state.delete(key);}
}
globalThis.localStorage=new Storage();
globalThis.fetch=async url=>({ok:true,async json(){return JSON.parse(await readFile(new URL(url)));}});
const catalog=JSON.parse(await readFile(new URL('../games/catalog.json',import.meta.url)));
const challenges=JSON.parse(await readFile(new URL('../games/bebsu-challenges.json',import.meta.url)));
const firstGrade=challenges.grades.find(g=>g.grade==='g1');
assert.equal(firstGrade.papers.length,3);
let seq=0,replies=[],host=createVillageHost(reply=>replies.push(reply));
async function send(action,fields={},expectSuccess=true) {
 await host.handle(JSON.stringify({action,requestId:'bebsu-'+(++seq),...fields}));
 const message=replies.at(-1);
 assert.equal(message?.ok,expectSuccess,JSON.stringify(message));
 return message;
}
function answerFor(q) {
 const type=q.interaction?.type??'choice';
 if(type==='choice')return q.answer;
 if(type==='numeric')return String(q.interaction.target);
 if(type==='build')return q.interaction.target;
 if(type==='match')return q.interaction.pairs;
 if(type==='memory'||type==='sequence')return q.interaction.order;
 throw new Error('Unsupported mode '+type);
}
const game=JSON.parse(await readFile(new URL('../games/bebsu-g1-original/game.json',import.meta.url)));
async function play(who,paper,{checkResume=false}={}) {
 Progress.selectLearner(who);
 let current=await send('START',{gameId:firstGrade.gameId,paperId:paper.paperId});
 for(let i=0;i<25;i++){
  assert.equal(current.question.index,i+1,'incorrect sequential question index');
  assert.equal(current.question.total,25);
  assert.equal(current.question.paperId,paper.paperId);
  assert.equal(current.question.questionId,paper.questionIds[i],'exam item ordering changed');
  assert(current.question.problemImage.startsWith('../assets/bebsu/math/'),'original question figure missing');
  assert(current.question.solutionImage.startsWith('../assets/bebsu/math/'),'original solution figure missing');
  await stat(new URL(current.question.problemImage, new URL('../village/',import.meta.url)));
  const q=game.questions.find(x=>x.id===current.question.questionId);
  assert(q,'question is absent in source');
  const result=await send('SUBMIT',{gameId:firstGrade.gameId,response:JSON.stringify(answerFor(q))});
  assert.equal(result.correct,true,'verified item disagrees at '+(i+1));
  if(checkResume&&i===8){
   // Persist and reimport a partially answered 25-item round; restart host.
   const backup=Progress.exportRecords();Progress.importRecords(backup);
   replies=[];host=createVillageHost(reply=>replies.push(reply));
   const resumed=await send('START',{gameId:firstGrade.gameId,paperId:paper.paperId});
   assert.equal(resumed.question.index,9);
   assert.equal(resumed.answered,true);
  }
  current=await send('NEXT',{gameId:firstGrade.gameId});
 }
 assert.equal(current.finished,true);
 return send('COMPLETE_WORLD',{gameId:firstGrade.gameId,roundId:current.roundId});
}
const chooser=await send('SHOW_BEBSU');
assert.equal(chooser.challenges.length,9);
const bad=await send('START',{gameId:firstGrade.gameId,paperId:'kma-99999'},false);
assert.match(bad.error,/학년|도전/);
let completed=await play('tae',firstGrade.papers[1],{checkResume:true});
assert.equal(completed.challengeBonus,160);
assert.equal(completed.flowers,1);
assert.equal(Rewards.wallet(catalog,'tae').challengeStars,160);
const firstAvailable=Rewards.wallet(catalog,'tae').available;
let again=await play('tae',firstGrade.papers[1]);
assert.equal(again.challengeBonus,0,'replay must not repeat bonus');
assert.equal(Rewards.wallet(catalog,'tae').challengeStars,160);
assert(Rewards.wallet(catalog,'tae').available>=firstAvailable);
assert.equal((await send('COMPLETE_WORLD',{gameId:firstGrade.gameId,roundId:'round-forged'},false)).ok,false);
completed=await play('se',firstGrade.papers[0]);
assert.equal(completed.challengeBonus,60);
assert.equal(Rewards.wallet(catalog,'se').challengeStars,60);
assert.equal(Rewards.wallet(catalog,'tae').challengeStars,160,'sibling separation');
assert.equal(completed.familyFlowers,3);
assert.equal(challenges.calibration,'editorial_provisional_not_psychometrically_calibrated');
console.log('PASS: Bebsu 9 grades, 27 papers, ordered 25 questions, question/answer source images, persistence, Taehee +160 / Sehee +60 once per paper, sibling separation, forged round blocked.');
