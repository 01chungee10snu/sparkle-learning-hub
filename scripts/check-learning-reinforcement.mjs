import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import {createVillageHost} from '../village/village-bridge.js';

class Storage{
 data=new Map();
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}
globalThis.localStorage=new Storage();
globalThis.fetch=async url=>({ok:true,async json(){return JSON.parse(await readFile(new URL(url)));}});
const catalog=JSON.parse(await readFile(new URL('../games/catalog.json',import.meta.url)));
Progress.configureCatalog(catalog);
const real=JSON.parse(await readFile(new URL('../games/snack-count/game.json',import.meta.url)));
const narrow={...real,questions:real.questions.slice(0,3)};
Progress.selectLearner('tae');
Rewards.syncRewards(catalog,'tae');

function respond(q,wrong=false){
 const kind=q.interaction?.type||'choice';
 if(kind==='choice')return wrong?(q.answer+1)%q.choices.length:q.answer;
 if(kind==='build')return wrong?(q.interaction.target===0?1:q.interaction.target-1):q.interaction.target;
 if(kind==='numeric')return String(wrong?q.interaction.target+1:q.interaction.target);
 throw Error('unsupported first three '+kind);
}
function finish(wrong=false){
 const round=Progress.beginRound(narrow,{size:3});
 assert.equal(round.ids.length,3);
 for(let i=0;i<3;i++){
  const live=Progress.gameProgress(narrow.id).round;
  const q=narrow.questions.find(q=>q.id===live.ids[live.index]);
  const grade=Progress.answerQuestion(narrow,respond(q,wrong));
  assert.equal(grade.correct,!wrong);
  Progress.nextQuestion(narrow.id);
 }
 const done=Progress.gameProgress(narrow.id).round;
 assert.equal(done.finished,true);
 Rewards.syncRewards(catalog,Progress.learner());
 return done.id;
}
const first=finish(true);
assert.equal(Rewards.wallet(catalog,'tae').recoveryStars,0);
const second=finish(false);
assert.equal(Rewards.wallet(catalog,'tae').recoveryStars,12,'3 independent real wrong-to-right corrections grant 4 each');
const same=Rewards.syncRewards(catalog,'tae');
assert.equal(same.recoveryStars,12,'duplicate sync is idempotent');
const firstReflection=Rewards.recordLearningExplanation({gameId:'snack-count',roundId:first,strategy:'count'});
assert.equal(firstReflection.earned,2);
assert.equal(Rewards.recordLearningExplanation({gameId:'snack-count',roundId:first,strategy:'compare'}).earned,0,'replay same round blocked');
assert.equal(Rewards.recordLearningExplanation({gameId:'snack-count',roundId:second,strategy:'pattern'}).earned,2);
const third=finish(false);
assert.equal(Rewards.recordLearningExplanation({gameId:'snack-count',roundId:third,strategy:'draw'}).earned,0,'reflection max 2 rounds/day');
const wallet=Rewards.wallet(catalog,'tae');
assert.equal(wallet.recoveryStars,12);
assert.equal(wallet.explanationStars,4);
assert.equal(wallet.reinforcementStars,16);
assert.throws(()=>Rewards.recordLearningExplanation({gameId:'snack-count',roundId:'fake-round',strategy:'count'}));
assert.throws(()=>Rewards.recordLearningExplanation({gameId:'snack-count',roundId:first,strategy:'made-up'}));
const rewardBackup=Rewards.exportRewards();
const invalid=structuredClone(rewardBackup);
const added=Object.keys(invalid.state.profiles.tae.events).find(id=>id.startsWith('explain-'));
invalid.state.profiles.tae.events[added].strategy='not-a-real-strategy';
assert.throws(()=>Rewards.importRewards(invalid),'fake strategy refused');
Rewards.importRewards(rewardBackup);
assert.equal(Rewards.wallet(catalog,'tae').reinforcementStars,16,'restore retains explanation and recovery');
Progress.selectLearner('se');
assert.equal(Rewards.wallet(catalog,'se').reinforcementStars,0,'sibling receives none');
Progress.selectLearner('tae');

// Exercise the actual WebGL bridge REFLECT against an authentic new completed round.
const replies=[],host=createVillageHost(message=>replies.push(message));let serial=0;
async function send(action,more={},ok=true){
 await host.handle(JSON.stringify({action,requestId:'boost-'+(++serial),gameId:'snack-count',...more}));
 assert.equal(replies.at(-1).ok,ok,JSON.stringify(replies.at(-1)));
 return replies.at(-1);
}
let quiz=await send('START');
for(let i=0;i<5;i++){
 const q=real.questions.find(item=>item.id===quiz.question.questionId);
 await send('SUBMIT',{response:JSON.stringify(respond(q))});
 quiz=await send('NEXT');
}
assert.equal(quiz.finished,true);
await send('COMPLETE_WORLD',{roundId:quiz.roundId});
const capped=await send('REFLECT',{roundId:quiz.roundId,strategy:'explain'});
assert.equal(capped.reflectionEarned,0,'daily cap also applies through bridge');
assert.equal(capped.reflectionReason,'daily-cap');

console.log('PASS: 3 authentic wrong-to-correct corrections +12, explanation +2 twice per day, replay/fake/strategy/daily guards, backup restore, sibling isolation, real bridge REFLECT.');
