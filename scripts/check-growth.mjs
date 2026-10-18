import assert from 'node:assert/strict';

// Exercise persistence and actual answer transitions without browser dependencies.
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const P=await import('../platform/progress.js');
const G=await import('../platform/growth.js');
let now=1800000000000;
const originalNow=Date.now;
Date.now=()=>++now;
const catalog=[];
for(const subject of ['math','korean','english'])for(let stage=1;stage<=4;stage++)catalog.push({id:`g-${subject}-${stage}`,subject,stage,growth:true,kind:'quiz',status:'published',questionIds:Array.from({length:12},(_,i)=>`q-${subject}-${stage}-${i+1}`)});
P.configureCatalog(catalog);
const entry=(subject='math',stage=1)=>catalog.find(e=>e.subject===subject&&e.stage===stage);
const game=(subject='math',stage=1)=>({...entry(subject,stage),questions:entry(subject,stage).questionIds.map(id=>({id,choices:['맞아요','다시 생각해요','다른 답'],answer:0}))});
const empty=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
const reset=(who='tae')=>{storage.set(P.KEY,JSON.stringify(empty()));P.selectLearner(who);};
const play=(quiz,isCorrect=true)=>{
 const round=P.beginRound(quiz),ids=[...round.ids];
 for(let i=0;i<ids.length;i++){
  const correct=typeof isCorrect==='function'?isCorrect(i):isCorrect;
  const a=P.answerQuestion(quiz,correct?0:1);assert.ok(a);
  const next=P.nextQuestion(quiz.id);assert.equal(next.finished,i===ids.length-1);
 }
 return P.gameProgress(quiz.id).round;
};

try{
 reset('se');
 assert.equal(P.LEARNERS.se.name,'세희');
 assert.equal(G.selectedStage('math','tae'),3);
 assert.equal(G.selectedStage('english','tae'),2);
 assert.equal(G.selectedStage('math','se'),1);
 assert.equal(P.beginRound(game()).ids.length,3);
 P.selectLearner('tae');assert.equal(P.beginRound(game()).ids.length,5);
 assert.equal(P.gameProgress(game().id,'se').round.ids.length,3,'Learners retain separate round sizes and sessions');

 // An old 5-question session resumes unchanged, even for the younger profile.
 reset('se');
 const old=empty(),ids=entry().questionIds.slice(0,5);
 old.profiles.se.games[game().id]={records:{[ids[0]]:{best:10,seen:4}},finishedRounds:7,lastPlayed:now,round:{ids,index:1,answers:[{id:ids[0],choice:0,correct:true,earned:10}],updatedAt:now}};
 storage.set(P.KEY,JSON.stringify(old));
 assert.deepEqual(P.beginRound(game()).ids,ids);
 assert.equal(P.gameProgress(game().id).records[ids[0]].best,10);
 assert.deepEqual(P.gameProgress(game().id).records[ids[0]].attempts,[],'Old rewards do not invent attempt evidence');
 for(let i=1;i<5;i++){P.answerQuestion(game(),0);P.nextQuestion(game().id);}
 assert.equal(P.gameProgress(game().id).finishedRounds,8);
 assert.equal(P.beginRound(game()).ids.length,3,'A new round uses the new profile size');
 assert.equal(G.recommendation('math',catalog).canAdvance,false,'Legacy reward and completion counters do not certify readiness');

 // Strict import cleaning: unsupported length, duplicate IDs, wrong choices or
 // unknown question IDs cannot become resumable sessions or growth evidence.
 const dirty=empty(),gid=game().id;
 dirty.profiles.se.games[gid]={records:{[ids[0]]:{best:10,seen:2,attempts:[{id:'attempt-ok',roundId:'round-ok',correct:true,at:now},{id:'attempt-ok',roundId:'round-ok',correct:true,at:now},{id:'attempt-bad',roundId:'round-ok',correct:'yes',at:now}]}},round:{ids:ids.slice(0,4),index:0,answers:[]},completedRounds:[{id:'round-invalid',at:now,questionIds:['unknown','unknown','unknown']}]};
 let cleaned=P.clean(dirty).profiles.se.games[gid];assert.equal(cleaned.round,null);assert.equal(cleaned.completedRounds.length,0);assert.equal(cleaned.records[ids[0]].attempts.length,1);
 dirty.profiles.se.games[gid].round={ids:ids.slice(0,3),index:0,answers:[{id:ids[0],choice:3,correct:true,earned:10}]};
 assert.equal(P.clean(dirty).profiles.se.games[gid].round,null);
 assert.throws(()=>P.clean({version:9}),/기록/);

 // Score remains monotone while current answers can be wrong; accidental double
 // submissions and next clicks never produce duplicate attempts or rewards.
 reset('se');const short={...game(),questions:game().questions.slice(0,3)};
 P.beginRound(short);const answeredId=P.gameProgress(short.id).round.ids[0];
 assert.equal(P.answerQuestion(short,0).earned,10);assert.equal(P.answerQuestion(short,0),null);
 assert.equal(P.gameProgress(short.id).records[answeredId].attempts.length,1);
 P.nextQuestion(short.id);P.nextQuestion(short.id);assert.equal(P.gameProgress(short.id).round.index,1);
 for(let i=1;i<3;i++){P.answerQuestion(short,0);P.nextQuestion(short.id);}
 for(let i=0;i<6;i++)play(short,false);
 assert.equal(P.summary(catalog).stars,30,'Old earned stars survive subsequent incorrect answers');
 for(const record of Object.values(P.gameProgress(short.id).records)){assert.equal(record.attempts.length,5);assert.ok(record.attempts.every(a=>!a.correct));assert.equal(new Set(record.attempts.map(a=>a.id)).size,5);}
 assert.equal(G.recommendation('math',catalog).canAdvance,false,'Repeating only three questions cannot establish six-question coverage');

 // Full, varied learning: 2 x 3 is insufficient to fill an 8-attempt window;
 // 3 x 3 gives evidence for an optional next-stage recommendation, not a change.
 reset('se');play(game());play(game());
 let rec=G.recommendation('math',catalog);assert.equal(rec.recentCount,6);assert.equal(rec.completedRounds,2);assert.equal(rec.canAdvance,false);
 play(game());rec=G.recommendation('math',catalog);
 assert.equal(rec.recentCount,8);assert.equal(rec.distinctCorrect,8);assert.equal(rec.accuracy,1);assert.equal(rec.canAdvance,true);assert.equal(rec.suggestedStage,2);assert.equal(G.selectedStage('math'),1,'Recommendation never changes the stage automatically');

 // Completing only one round plus starting a second cannot trigger advancement.
 reset('tae');G.setStage('math',1);play(game());P.beginRound(game());
 for(let i=0;i<4;i++){P.answerQuestion(game(),0);P.nextQuestion(game().id);}
 rec=G.recommendation('math',catalog);assert.equal(rec.recentCount,8);assert.equal(rec.completedRounds,1);assert.equal(rec.canAdvance,false);
 P.answerQuestion(game(),0);P.nextQuestion(game().id);assert.equal(G.recommendation('math',catalog).canAdvance,true);

 // At the 80% boundary, 6/8 fails and 7/8 succeeds.
 reset('tae');G.setStage('math',1);play(game());play(game(),i=>i>1);
 assert.equal(G.recommendation('math',catalog).accuracy,0.75);assert.equal(G.recommendation('math',catalog).canAdvance,false);
 reset('tae');G.setStage('math',1);play(game());play(game(),i=>i!==0);
 assert.equal(G.recommendation('math',catalog).accuracy,0.875);assert.equal(G.recommendation('math',catalog).canAdvance,true);

 // Two hard rounds suggest review without forcing a downward stage change.
 reset('tae');play(game('math',3),false);play(game('math',3),false);
 rec=G.recommendation('math',catalog);assert.equal(rec.action,'practice');assert.equal(rec.suggestedStage,2);assert.equal(G.selectedStage('math'),3);
 assert.equal(G.recommendation('korean',catalog).completedRounds,0,'Subjects do not share readiness evidence');

 // Only timestamped correctness can be due for a spaced review.
 reset('se');play(game());assert.equal(G.recommendation('math',catalog).reviewDue,false);
 now+=2*86400000+1;assert.equal(G.recommendation('math',catalog).reviewDue,true);

 // Explicit profile/subject selections and attempts survive backup and restore.
 G.setStage('math',2,'se');G.setStage('english',4,'tae');
 const backup=structuredClone(P.exportRecords()),before=P.gameProgress(game().id,'se');
 reset('tae');P.importRecords(backup);
 assert.equal(G.selectedStage('math','se'),2);assert.equal(G.selectedStage('english','tae'),4);assert.equal(G.selectedStage('korean','tae'),3);
 assert.deepEqual(P.gameProgress(game().id,'se').records,before.records);
 P.importRecords(backup);
 assert.deepEqual(P.gameProgress(game().id,'se').records,before.records,'Importing the same backup twice never duplicates evidence');
 assert.equal(P.gameProgress(game().id,'se').completedRounds.length,1);
 assert.throws(()=>G.setStage('math',5),/단계/);assert.throws(()=>G.setStage('science',2),/단계/);
 console.log('PASS: growth state migration, 3/5-question rounds, learner isolation, strict import, duplicate prevention, capped attempts, readiness gates, voluntary progression, review dates and backup roundtrip');
}finally{Date.now=originalNow;}
