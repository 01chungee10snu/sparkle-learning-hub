import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as P from '../platform/progress.js';
import * as IRT from '../platform/irt.js';
import {createVillageHost} from '../village/village-bridge.js';

class Storage {
 values=new Map();
 getItem(key){return this.values.get(key)??null;}
 setItem(key,value){this.values.set(key,String(value));}
}
globalThis.localStorage=new Storage();
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(url)))});
const replies=[],host=createVillageHost(reply=>replies.push(structuredClone(reply)));
let n=0;const command=(action,fields={})=>({action,requestId:'quality-'+ ++n,...fields});
async function send(request){await host.handle(JSON.stringify(request));return replies.at(-1);}
function ok(result){assert.equal(result.ok,true,JSON.stringify(result));return result;}
const game=JSON.parse(await readFile(new URL('../games/measure-lab/game.json',import.meta.url)));
const snacks=JSON.parse(await readFile(new URL('../games/snack-count/game.json',import.meta.url)));
const solution=q=>{const mode=q.interaction?.type??'choice';return mode==='choice'?q.answer:mode==='match'?q.interaction.pairs:mode==='build'?q.interaction.target:mode==='numeric'?String(q.interaction.target):q.interaction.order;};
P.selectLearner('tae');
ok(await send(command('INIT')));
assert.ok(IRT.bankSize()>0,'The model test uses the actual configured item bank');
const start=command('START',{gameId:game.id});
const started=ok(await send(start));
assert.deepEqual(ok(await send(start)),started,'Sequential request replay returns the same receipt');
const originalRound=structuredClone(P.gameProgress(game.id,'tae').round);
const before=localStorage.getItem(P.KEY);
const wrongPayload=await send({...start,gameId:'snack-count'});
assert.equal(wrongPayload.ok,false,'Same request ID cannot carry another action payload');
assert.equal(localStorage.getItem(P.KEY),before,'Conflicting request payload leaves progress unchanged');
const earlyNext=ok(await send(command('NEXT',{gameId:game.id})));
assert.equal(earlyNext.question.questionId,started.question.questionId,'NEXT cannot advance an unanswered question');
assert.equal(P.gameProgress(game.id,'tae').round.index,0);
const q=game.questions.find(q=>q.id===started.question.questionId);
assert.equal(started.question.hintAvailable,true,'Actual legacy content has a method hint fallback');
const hintRequest=command('HINT',{gameId:game.id});
const hint=ok(await send(hintRequest));assert.ok(hint.hint.length>10);
assert.deepEqual(ok(await send(hintRequest)),hint,'Hint replay is idempotent');
const abilityBefore=P.ability('math','tae');
const submit=command('SUBMIT',{gameId:game.id,response:JSON.stringify(solution(q))});
const submitted=ok(await send(submit));assert.equal(submitted.correct,true);
const afterSubmit=localStorage.getItem(P.KEY);
assert.deepEqual(ok(await send(submit)),submitted,'Same SUBMIT request returns its prior earned amount');
assert.equal(localStorage.getItem(P.KEY),afterSubmit,'Reply replay cannot append another scored attempt');
const record=P.gameProgress(game.id,'tae').records[q.id];
assert.equal(record.attempts.length,1);
assert.equal(record.attempts[0].assisted,true,'A real hint request labels the next attempt assisted');
assert.equal(record.firstAttempt.assisted,true);
assert.equal(P.ability('math','tae').n,abilityBefore.n,'Hinted correctness is excluded from independent IRT evidence');
const extraSubmit=await send(command('SUBMIT',{gameId:game.id,response:JSON.stringify(solution(q))}));
assert.equal(extraSubmit.ok,false,'A second submit with a new ID still cannot grade twice');
const recordBeforePause=structuredClone(P.gameProgress(game.id,'tae').records[q.id]);
ok(await send(command('CANCEL',{gameId:game.id})));
const resumed=ok(await send(command('START',{gameId:game.id})));
assert.equal(resumed.answered,true,'Resuming after a graded answer presents feedback, not a second unanswered question');
assert.equal(resumed.correct,true);assert.equal(resumed.earned,0,'Resume feedback cannot promise the original earned stars again');
assert.equal(resumed.question.questionId,q.id);assert.ok(resumed.explanation.length>0);
assert.deepEqual(P.gameProgress(game.id,'tae').records[q.id],recordBeforePause,'Pause and resume never rescore the recorded answer');
const nextRequest=command('NEXT',{gameId:game.id});
const next=ok(await send(nextRequest));assert.equal(next.question.index,2);
assert.deepEqual(ok(await send(nextRequest)),next,'NEXT replay cannot advance twice');
assert.equal(P.gameProgress(game.id,'tae').round.index,1);
const unanswered=ok(await send(command('NEXT',{gameId:game.id})));
assert.equal(unanswered.question.index,2,'Repeated new-ID NEXT still stays at the unanswered second question');
const independentQ=game.questions.find(q=>q.id===next.question.questionId);
ok(await send(command('SUBMIT',{gameId:game.id,response:JSON.stringify(solution(independentQ))})));
assert.equal(P.ability('math','tae').n,abilityBefore.n+1,'An independent first answer contributes one model evidence item');

P.selectLearner('se');
const beforeSibling=localStorage.getItem(P.KEY);
const stale=await send(command('NEXT',{gameId:game.id}));
assert.equal(stale.ok,false);
assert.match(stale.error,/아이가 바뀌/);
assert.equal(localStorage.getItem(P.KEY),beforeSibling,'Changing children cannot advance the prior child round');
const staleReplay=await send(submit);
assert.equal(staleReplay.ok,false,'Replaying the previous child receipt cannot leak its wallet/reply');
assert.equal(P.gameProgress(game.id,'se').round,null);
const seStart=ok(await send(command('START',{gameId:snacks.id})));
assert.equal(seStart.question.total,3,'Younger child receives the three-item round');
const snack=snacks.questions.find(q=>q.id===seStart.question.questionId);
assert.deepEqual(seStart.question.visual,snack.visual??null,'Public question retains the actual visual evidence');
ok(await send(command('CANCEL',{gameId:snacks.id})));
const cancelled=localStorage.getItem(P.KEY);
const cancelledSubmit=await send(command('SUBMIT',{gameId:snacks.id,response:JSON.stringify(solution(snack))}));
assert.equal(cancelledSubmit.ok,false,'CANCEL retires the host mission');
assert.equal(localStorage.getItem(P.KEY),cancelled,'A late submit after pause cannot mutate either learner');
assert.equal(P.gameProgress(game.id,'tae').round.id,originalRound.id,'The paused older child retains its own round');
const concurrent=command('START',{gameId:snacks.id});
const count=replies.length;
await Promise.all([host.handle(JSON.stringify(concurrent)),host.handle(JSON.stringify(concurrent))]);
assert.equal(replies.length,count+2);
assert.deepEqual(replies.at(-1),replies.at(-2),'Concurrent duplicate requests are serialized to one receipt');
assert.equal(P.gameProgress(snacks.id,'se').round.index,0);

// A profile may change while START awaits an uncached game fetch.
// Pause the real fetch, switch the selected learner, then let START continue.
const raceReplies=[],raceHost=createVillageHost(reply=>raceReplies.push(structuredClone(reply)));
P.selectLearner('tae');await raceHost.prepare();
const beforeRace=structuredClone(P.exportRecords().platform),beforeRaceStored=localStorage.getItem(P.KEY);
const fetchOriginal=globalThis.fetch;
let releaseFetch,fetchEntered;
const fetchGate=new Promise(resolve=>{releaseFetch=resolve;}),entered=new Promise(resolve=>{fetchEntered=resolve;});
globalThis.fetch=async url=>{
 if(new URL(url).pathname.endsWith('/games/kind-dialogue/game.json')){fetchEntered();await fetchGate;}
 return fetchOriginal(url);
};
try{
 const pendingStart=raceHost.handle(JSON.stringify(command('START',{gameId:'kind-dialogue'})));
 await entered;P.selectLearner('se');releaseFetch();await pendingStart;
 const raceReply=raceReplies.at(-1);
 assert.equal(raceReply.ok,false,'START cannot attach a stale profile to a round after an awaited game fetch');
 assert.match(raceReply.error,/아이가 바뀌/);
 assert.deepEqual(P.exportRecords().platform,beforeRace,'A learner switch during START leaves both profile progress records unchanged');
 assert.equal(localStorage.getItem(P.KEY),beforeRaceStored,'The asynchronous START race writes no progress');
}finally{releaseFetch();globalThis.fetch=fetchOriginal;}

console.log('PASS: actual-item-bank bridge quality; sequential/concurrent receipt replay, conflicting IDs atomicity, unanswered and replayed NEXT, real hint-assisted IRT exclusion, independent evidence, stale learner isolation, deferred START profile-switch atomicity and CANCEL late-submit protection; source visual retained.');
