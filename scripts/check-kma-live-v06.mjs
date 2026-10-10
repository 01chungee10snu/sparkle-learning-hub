/** Verify the published KMA original portal and complete real 25-question rounds.
 * No user progress is accessed: a synthetic in-memory browser storage is used.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve('.');
const site=path.join(root,'magic-village-kma-v06');
const read=name=>JSON.parse(fs.readFileSync(path.join(site,name),'utf8'));
const registry=read('games/bebsu-challenges.json');
const catalog=read('games/catalog.json');
const bank=read('games/irt-bank.json');
assert.equal(registry.grades.length,9);
assert.equal(registry.itemCount,675);
assert.equal(bank.count,4153);
assert.equal(bank.items.length,4153);
assert.equal(catalog.length,45);
assert.equal(new Set(bank.items.map(q=>q.gameId+':'+q.id)).size,4153);
const originals=catalog.filter(e=>/^bebsu-(?:g[1-6]|m[1-3])-original$/.test(e.id));
assert.equal(originals.length,9);
for(const entry of catalog){
 const game=read(entry.source.slice(2));
 assert.equal(game.questions.length,entry.questionCount,entry.id);
 assert.deepEqual(game.questions.map(q=>q.id),entry.questionIds,entry.id);
}
const oldKeys=['sparkle-learning-progress-v3','sparkle-learning-progress-v2','sparkle-rewards-v1',
 'sparkle-unity-village-v1','sparkle-public-village-progress-v06','sparkle-public-village-rewards-v06'];
const sentinel='{"protected":"pre-existing-data-must-not-be-changed"}';
class Storage{
 data=new Map(oldKeys.map(k=>[k,sentinel]));
 getItem(k){return this.data.get(k)??null}
 setItem(k,v){this.data.set(k,String(v))}
 removeItem(k){this.data.delete(k)}
}
globalThis.localStorage=new Storage();
globalThis.fetch=async value=>{
 const url=new URL(value);
 return {ok:fs.existsSync(url.pathname),async json(){return JSON.parse(fs.readFileSync(url.pathname,'utf8'));}};
};
const importRoot=name=>pathToFileURL(path.join(site,name)).href;
const Progress=await import(importRoot('platform/progress.js'));
const Rewards=await import(importRoot('platform/rewards.js'));
const {createVillageHost}=await import(importRoot('village/village-bridge.js'));
const replies=[],host=createVillageHost(value=>replies.push(value));
let serial=0;
async function send(action,fields={},expected=true){
 const requestId='test-kma-'+(++serial);
 await host.handle(JSON.stringify({action,requestId,...fields}));
 const reply=replies.at(-1);
 assert.equal(reply?.ok,expected,JSON.stringify(reply));
 return reply;
}
await send('INIT');
const choose=await send('SHOW_BEBSU');
assert.equal(choose.challenges.length,9);
assert.equal(choose.publicPractice,undefined,'source original, not fabricated practice');
function answer(item){
 const kind=item.interaction?.type||'choice';
 if(kind==='choice')return item.answer;
 if(kind==='numeric')return String(item.interaction.target);
 if(kind==='build')return item.interaction.target;
 if(kind==='match')return item.interaction.pairs;
 if(kind==='memory'||kind==='sequence')return item.interaction.order;
 throw new Error('Unsupported interaction '+kind);
}
let imageCount=0;
async function play(who){
 Progress.selectLearner(who);
 const grade=registry.grades[0],paper=grade.papers[1];
 const game=read('games/'+grade.gameId+'/game.json');
 let msg=await send('START',{gameId:grade.gameId,paperId:paper.paperId});
 for(let i=0;i<25;i++){
  assert.equal(msg.question.index,i+1);
  assert.equal(msg.question.total,25);
  assert.equal(msg.question.paperId,paper.paperId);
  assert.equal(msg.question.questionId,paper.questionIds[i]);
  const q=game.questions.find(x=>x.id===msg.question.questionId);
  assert(q);
  for(const field of ['problemImage','solutionImage']){
   const src=msg.question[field];
   assert(/^\.\.\/\.\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/.test(src),'original source path broken: '+src);
   const file=path.join(site,'village',src);
   assert(fs.existsSync(file),'original KMA image is not in published root: '+file);
   imageCount++;
  }
  const result=await send('SUBMIT',{gameId:grade.gameId,response:JSON.stringify(answer(q))});
  assert.equal(result.correct,true,'published answer mismatch #'+(i+1));
  msg=await send('NEXT',{gameId:grade.gameId});
 }
 assert.equal(msg.finished,true);
 return send('COMPLETE_WORLD',{gameId:grade.gameId,roundId:msg.roundId});
}
const first=await play('tae');
assert.equal(first.challengeBonus,160);
const second=await play('tae');
assert.equal(second.challengeBonus,0);
const third=await play('se');
assert.equal(third.challengeBonus,60);
assert.equal(Rewards.wallet(catalog,'tae').challengeStars,160);
assert.equal(Rewards.wallet(catalog,'se').challengeStars,60);
assert.equal(imageCount,150);
for(const key of oldKeys)
 assert.equal(globalThis.localStorage.getItem(key),sentinel,'existing user data mutated: '+key);
assert(globalThis.localStorage.data.has('sparkle-kma-public-progress-v06'));
assert(globalThis.localStorage.data.has('sparkle-kma-public-rewards-v06'));
assert(globalThis.localStorage.data.has('sparkle-kma-public-garden-v06'));
let images=0;
for(const grade of registry.grades){
 const game=read('games/'+grade.gameId+'/game.json');
 for(const paper of grade.papers){
  assert.equal(paper.questionIds.length,25);
  for(let i=0;i<25;i++){
   const q=game.questions.find(item=>item.id===paper.questionIds[i]);
   assert(q&&q.provenance?.examQuestionNo===i+1);
   for(const prop of ['problemImage','solutionImage']){
    const file=path.join(root,q[prop].slice(2));
    assert(fs.existsSync(file),file);
    images++;
   }
  }
 }
}
assert.equal(images,1350);
console.log('PASS_ORIGINAL_KMA_PORTAL',JSON.stringify({games:catalog.length,IRT:bank.count,gradeCourses:9,papers:27,examItems:675,
 referencedImages:images,full25Cycles:3,taeBonus:first.challengeBonus,duplicateBonus:second.challengeBonus,seBonus:third.challengeBonus,
 storageIsolated:true}));
