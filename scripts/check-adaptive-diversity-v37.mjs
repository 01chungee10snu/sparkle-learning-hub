#!/usr/bin/env node
/** Regression: adaptive difficulty, diversity and source integrity in synthetic child records. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IRT from '../platform/irt.js';
import * as Progress from '../platform/progress.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../games/catalog.json',import.meta.url),'utf8'));
const bank=JSON.parse(fs.readFileSync(new URL('../games/irt-bank.json',import.meta.url),'utf8'));
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Progress.configureCatalog(catalog);Progress.configureIrtBank(bank);Progress.selectLearner('tae');
const entry=id=>catalog.find(g=>g.id===id);
const load=id=>({...JSON.parse(fs.readFileSync(new URL('../games/'+id+'/game.json',import.meta.url),'utf8')),...{gradeBand:entry(id).gradeBand}});
const blank=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
const update=profile=>store.set(Progress.KEY,JSON.stringify(profile));
const math=load('growth-math-3'),multi=load('measure-lab');
const now=Date.now();
const answers=correct=>({records:Object.fromEntries(math.questions.map((q,i)=>[q.id,{best:correct?10:2,seen:1,
 firstAttempt:{id:'first-'+i,correct,roundId:'source-round',at:now-60000+i*1000},
 attempts:[{id:'first-'+i,correct,roundId:'source-round',at:now-60000+i*1000}]}])),
 round:null,finishedRounds:2,lastPlayed:now-1000,completedRounds:[]});
const profile=correct=>{const p=blank();p.profiles.tae.games[math.id]=answers(correct);return p;};
const low=profile(false),high=profile(true);
const lower=IRT.responseTrend(low.profiles.tae.games,'math',3);
const higher=IRT.responseTrend(high.profiles.tae.games,'math',3);
assert.equal(lower.consecutive,0);assert.equal(lower.challenge,0);
assert.equal(higher.consecutive,8);assert(higher.challenge>0);
assert.equal(IRT.challengeStage(low.profiles.tae.games,'math',3),3);
assert.equal(IRT.challengeStage(high.profiles.tae.games,'math',3),4);
const lowQuestions=IRT.selectQuestions({game:multi,candidates:multi.questions.filter(q=>q.level<=3),profile:low.profiles.tae,size:5,stage:3});
const highQuestions=IRT.selectQuestions({game:multi,candidates:multi.questions,profile:high.profiles.tae,size:5,stage:3});
const diffs=ids=>ids.map(id=>IRT.itemAt(multi.id,id).b);
assert.equal(lowQuestions.length,5);assert.equal(highQuestions.length,5);
assert(Math.min(...diffs(highQuestions))>Math.max(...diffs(lowQuestions)),'High evidence should receive harder available material');
assert.equal(new Set(highQuestions.map(id=>IRT.itemAt(multi.id,id).skill)).size,5,'Different concepts within one round');
const modeCounts=highQuestions.map(id=>IRT.itemAt(multi.id,id).mode);
assert(new Set(modeCounts).size>1,'Use available interaction formats');
update(high);const beforeStage=Progress.stageSelection('math');
const round=Progress.beginRound(multi,{level:3,size:5,strategy:'adaptive'});
assert(round.ids.some(id=>IRT.itemAt(multi.id,id).stage===4),'Guided next-stage preview included in adaptive adventure');
assert.equal(Progress.stageSelection('math'),beforeStage,'Stage remains parent-controlled');
const response=q=>q.interaction?.type==='numeric'?String(q.interaction.target):
 q.interaction?.type==='build'?q.interaction.target:q.interaction?.type==='match'?q.interaction.pairs:
 ['sequence','memory'].includes(q.interaction?.type)?q.interaction.order:q.answer;
for(let i=0;i<round.ids.length;i++){
 const active=Progress.gameProgress(multi.id).round,id=active.ids[active.index];
 const q=multi.questions.find(q=>q.id===id);
 assert(q,'Adaptive question must be original published source');
 assert(Progress.answerQuestion(multi,response(q))?.correct,'Correct source answer must remain correct');
 const before=structuredClone(Progress.gameProgress(multi.id).round),prefix=before.ids.slice(0,i+1);
 const after=Progress.nextQuestion(multi.id,multi);
 assert.deepEqual(after.ids.slice(0,i+1),prefix,'Already answered questions immutable');
 assert.equal(new Set(after.ids).size,after.ids.length,'No duplicate question after reranking');
 assert.equal(after.index,i+1);assert.equal(after.ids.length,5);
 assert.deepEqual(Progress.gameProgress(multi.id).round,after,'Latest adaptive suffix persists and survives reload');
}
assert(Progress.gameProgress(multi.id).round.finished);
assert.equal(Progress.gameProgress(multi.id).completedRounds.length,1,'Completion ledger records actual final IDs');
assert.equal(Progress.stageSelection('math'),beforeStage,'Finishing did not secretly promote grade');

// Review rounds must keep their spaced-retrieval queue instead of being overwritten by adaptation.
const review=profile(true),game=review.profiles.tae.games[math.id];
for(const r of Object.values(game.records)){
 r.firstAttempt.at=now-8*24*3600000;r.attempts[0].at=r.firstAttempt.at;
}
update(review);
const due=Progress.beginRound(math,{size:5,strategy:'review',level:3});
assert.equal(due.strategy,'review');
const q=math.questions.find(q=>q.id===due.ids[0]);assert(Progress.answerQuestion(math,response(q)));
const afterReview=Progress.nextQuestion(math.id,math);
assert.deepEqual(afterReview.ids,due.ids,'Retrieval order must never be reshuffled');

// 25-question source papers preserve their 1..25 numbering even after correct answers.
update(blank());const original=load('bebsu-g1-original');const source=Progress.beginRound(original,{paperId:'kma-16'});
assert.equal(source.ids.length,25);const question=original.questions.find(q=>q.id===source.ids[0]);
assert(Progress.answerQuestion(original,response(question)));
const next=Progress.nextQuestion(original.id,original);
assert.deepEqual(next.ids,source.ids,'Published paper question order and score identity preserved');

// Hint-assisted correct answers never inflate IRT evidence or the challenge streak.
update(blank());const easy=load('growth-math-1');
const start=Progress.beginRound(easy,{size:3,level:1});
Progress.markHint(easy.id);
const hinted=easy.questions.find(q=>q.id===start.ids[0]);
assert(Progress.answerQuestion(easy,response(hinted)));
assert.equal(IRT.responseTrend(Progress.exportRecords().platform.profiles.tae.games,'math',1).n,0);
assert.equal(IRT.challengeStage(Progress.exportRecords().platform.profiles.tae.games,'math',1),1);
assert.equal(Progress.ability('math','se').n,0,'Sibling profile isolated');

// Hanja glyph meaning/readings remain in separate families during the same round.
const hanja=load('hanja-h8');
const selected=IRT.selectQuestions({game:hanja,candidates:hanja.questions,profile:{games:{}},size:5,stage:1});
assert.equal(new Set(selected.map(id=>IRT.itemAt(hanja.id,id).family)).size,5);
console.log('PASS_ADAPTIVE_DIVERSITY_V37: strong vs weak IRT, success streak, stage+1 preview, mixed modes, 5 live adaptive transitions, review and 25-paper immutability, hinted exclusion, sibling isolation, hanja family uniqueness');
