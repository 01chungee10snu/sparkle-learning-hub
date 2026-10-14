import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IRT from '../platform/irt.js';
import * as P from '../platform/progress.js';
import * as R from '../platform/rewards.js';

const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,val)=>store.set(key,String(val))};
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog=read('../games/catalog.json'),bank=read('../games/irt-bank.json');
P.configureCatalog(catalog);
assert.equal(P.configureIrtBank(bank),catalog.filter(e=>e.kind==='quiz'&&e.status==='published').reduce((n,e)=>n+e.questionIds.length,0));
const byId=new Map(catalog.map(e=>[e.id,e]));
const game=id=>({...read('../games/'+id+'/game.json'),gradeBand:byId.get(id).gradeBand});
const reset=()=>store.set(P.KEY,JSON.stringify({version:1,profiles:{
 tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}}));
const chooseCorrect=q=>q.interaction?.type==='numeric'?String(q.interaction.target):
 q.interaction?.type==='build'?q.interaction.target:
 q.interaction?.type==='match'?q.interaction.pairs:
 ['sequence','memory'].includes(q.interaction?.type)?q.interaction.order:q.answer;
function finish(g,round,{hint=false}={}){
 for(let i=0;i<round.ids.length;i++){
  const active=P.gameProgress(g.id).round;
  assert.equal(active.index,i);
  const q=g.questions.find(q=>q.id===active.ids[i]);
  if(hint&&i===0)P.markHint(g.id);
  assert.ok(P.answerQuestion(g,chooseCorrect(q)));
  P.nextQuestion(g.id,g);
 }
 return P.gameProgress(g.id).round;
}
const checks=[];
const kma=game('bebsu-g1-original');
const paper='kma-16';
reset();P.selectLearner('tae');
const original=kma.questions.filter(q=>q.source?.id?.startsWith('kma:16:'));
assert.equal(original.length,25);
const kmaRound=P.beginRound(kma,{paperId:paper});
assert.equal(kmaRound.irtVersion,2);
assert.deepEqual(new Set(kmaRound.ids),new Set(original.map(q=>q.id)));
assert.equal(kmaRound.ids.length,25);
const originalNo=new Map(original.map(q=>[q.id,q.provenance.examQuestionNo]));
assert.equal(new Set([...originalNo.values()]).size,25);
finish(kma,kmaRound,{hint:true});
assert.equal(P.gameProgress(kma.id).round.finished,true);
assert.equal(P.ability('math','tae').n,24);
assert.equal(R.bebsuChallengeStars(catalog,'tae'),160);
const kmaSnapshot=JSON.parse(store.get(P.KEY));
const otherPaper=kma.questions.filter(q=>q.source?.id?.startsWith('kma:1:')).map(q=>q.id);
assert.equal(otherPaper.length,25);
const spoofedKma=structuredClone(kmaSnapshot);
spoofedKma.profiles.tae.games[kma.id].completedRounds[0].questionIds=otherPaper;
spoofedKma.profiles.tae.games[kma.id].round=null;
store.set(P.KEY,JSON.stringify(spoofedKma));
assert.equal(R.bebsuChallengeStars(catalog,'tae'),0,'Correct 25 IDs from another KMA paper cannot claim kma-16 bonus');
store.set(P.KEY,JSON.stringify(kmaSnapshot));
checks.push('KMA 25 source exact set, dynamic route, hinted exclusion, completion');

const practice=game('magic-g1-challenge');
const practicePaper='magic-g1-basic';
const expected=practice.questions.filter(q=>q.source?.id?.startsWith('magic:'+practicePaper+':'));
assert.equal(expected.length,25);
const practiceRound=P.beginRound(practice,{paperId:practicePaper});
assert.deepEqual(new Set(practiceRound.ids),new Set(expected.map(q=>q.id)));
finish(practice,practiceRound);
const practiceEntry=byId.get(practice.id);
assert.equal(R.magicPracticeStars(catalog,'tae'),80);
const stored=JSON.parse(store.get(P.KEY));
const completed=stored.profiles.tae.games[practice.id].completedRounds[0];
assert.equal(completed.irtVersion,2);
checks.push('Practice 25 IRT ordered completion, reward');
for(const spoof of [
 {...completed,questionIds:[...completed.questionIds.slice(0,24),completed.questionIds[0]]},
 {...completed,questionIds:completed.questionIds.slice(0,24)},
 {...completed,paperId:'magic-g1-challenge'}
]){
 const tampered=structuredClone(stored);
 tampered.profiles.tae.games[practice.id].completedRounds=[spoof];
 tampered.profiles.tae.games[practice.id].round=null;
 store.set(P.KEY,JSON.stringify(tampered));
 assert.equal(R.magicPracticeStars(catalog,'tae'),0);
}
store.set(P.KEY,JSON.stringify(stored));
assert.equal(R.magicPracticeStars(catalog,'tae'),80);
checks.push('Duplicate, partial and wrong-paper reward spoof blocked');

// Preexisting old 1..25 source-order rounds must be resumed without mutation.
const legacy=structuredClone(stored);
const oldIds=expected.map(q=>q.id);
legacy.profiles.tae.games[practice.id].round={
 id:'round-legacy-practice',paperId:practicePaper,ids:oldIds,index:0,
 answers:[],finished:false,updatedAt:Date.now(),shownAt:Date.now(),hinted:false
};
store.set(P.KEY,JSON.stringify(legacy));
const resumed=P.beginRound(practice,{paperId:practicePaper});
assert.deepEqual(resumed.ids,oldIds);
assert.equal(resumed.irtVersion,undefined);
const q=practice.questions.find(x=>x.id===oldIds[0]);
P.answerQuestion(practice,chooseCorrect(q));
P.nextQuestion(practice.id,practice);
assert.deepEqual(P.gameProgress(practice.id).round.ids,oldIds);
checks.push('Legacy in-flight fixed order preserved across answer');

for(const theta of [-2,0,2,5]){
 const m=IRT.estimate(Array.from({length:10},(_,i)=>({item:{b:theta,c:0.2},correct:i<8,at:i})));
 assert.ok(Number.isFinite(m.theta)&&m.uncertainty>0);
}
checks.push('Synthetic cold/low/high ability finite posterior');
const source=game('growth-math-1'),lab=game('measure-lab');
const synthetic=correct=>{
 const records={};
 for(const [i,q] of source.questions.entries())records[q.id]={
  seen:1,firstAttempt:{id:'synthetic-'+i,roundId:'round-synthetic',at:i+1,correct}
 };
 return {games:{[source.id]:{records}}};
};
const lowProfile=synthetic(false),highProfile=synthetic(true);
const lowTheta=IRT.estimateSubject(lowProfile.games,'math',3).theta;
const highTheta=IRT.estimateSubject(highProfile.games,'math',3).theta;
assert.ok(highTheta>lowTheta,'Independent answers must change ability');
const lowPick=IRT.selectQuestions({game:lab,candidates:lab.questions,profile:lowProfile,size:5,stage:3});
const highPick=IRT.selectQuestions({game:lab,candidates:lab.questions,profile:highProfile,size:5,stage:3});
assert.notDeepEqual(lowPick.map(id=>IRT.itemAt(lab.id,id).b),
 highPick.map(id=>IRT.itemAt(lab.id,id).b),'Synthetic ability contrast changes selected b order');
checks.push('Low versus high independent evidence yields distinct selected b');
console.log('PASS V12:',checks.join('; '));
