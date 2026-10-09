import assert from 'node:assert/strict';
import {validateInteraction,normalizeResponse,gradeResponse,answerText,responseText} from '../platform/activities.js';
import {validateCatalog,validateGame} from '../platform/catalog.js';

const questions=[
 {choices:['하나','둘','셋'],answer:1},
 {interaction:{type:'build',target:4,max:10,emoji:'🍎',unit:'개'}},
 {interaction:{type:'sequence',items:['개','지','무','꽃'],order:[2,1,0,3],joiner:''}},
 {interaction:{type:'match',left:['one','two','three'],right:['3','1','2'],pairs:[1,2,0],leftLang:'en-US'}},
 {interaction:{type:'memory',items:['🐱','🐶','🐰'],order:[2,0,1],itemLabels:['고양이','강아지','토끼'],joiner:' '}}
];
const correct=[1,4,[2,1,0,3],[1,2,0],[2,0,1]],wrong=[0,5,[0,1,2,3],[0,1,2],[1,2,0]];
const invalid=[[-1,3,'1',null,NaN],[-1,11,1.5,'4',undefined],[[0,1,2],[0,1,1,3],[0,1,2,4],null],[[0,1],[0,1,1],[0,1,3],3],[[0,1],[0,1,1],[0,1,3],[]]];
questions.forEach((q,index)=>{
 assert.equal(validateInteraction(q),q);
 assert.equal(gradeResponse(q,correct[index]).correct,true);
 assert.equal(gradeResponse(q,wrong[index]).correct,false);
 invalid[index].forEach(r=>assert.throws(()=>normalizeResponse(q,r)));
 assert.equal(typeof answerText(q),'string');
 assert.equal(typeof responseText(q,wrong[index]),'string');
});
assert.equal(answerText(questions[0]),'둘');
assert.equal(answerText(questions[1]),'4개');
assert.equal(answerText(questions[2]),'무지개꽃');
assert.equal(answerText(questions[3]),'one → 1 · two → 2 · three → 3');
assert.equal(answerText(questions[4]),'토끼 고양이 강아지');
const arr=[2,0,1],normalized=normalizeResponse(questions[4],arr);arr[0]=0;
assert.deepEqual(normalized,[2,0,1],'Grading snapshots the submitted order');
assert.throws(()=>normalizeResponse(questions[4],[0,1,,]),'Sparse responses are not complete submissions');
for(const bad of [
 {},{interaction:{type:'unknown'}},{interaction:null},{choices:['가','가','나'],answer:0},
 {interaction:{type:'build',target:5,max:4,emoji:'🍎',unit:'개'}},
 {interaction:{type:'build',target:21,max:21,emoji:'🍎',unit:'개'}},
 {...questions[1],choices:['1','2','3'],answer:0},
 {interaction:{type:'sequence',items:['가','가','나'],order:[0,1,2]}},
 {interaction:{type:'sequence',items:['가','나','다'],order:[0,1,3]}},
 {interaction:{type:'memory',items:['가','나','다'],order:[0,1,2]}},
 {interaction:{...questions[3].interaction,pairs:[1,1,0]}}
])assert.throws(()=>validateInteraction(bad));

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const P=await import('../platform/progress.js');
const G=await import('../platform/growth.js');
const games=questions.map((q,index)=>({
 id:`activity-${index}`,subject:'math',title:'함께 놀이',description:'함께 생각해요.',emoji:'🌟',adventure:true,minStage:2,maxStage:4,offline:'사과를 세어 보아요.',prerequisite:'하나씩 세어요.',
 questions:Array.from({length:12},(_,n)=>({...structuredClone(q),id:`activity-${index}-${n+1}`,level:n<6?2:4,skill:'함께 생각하기',title:'함께 놀이',story:'정원에서 놀아요.',prompt:'답을 골라요.',explanation:['먼저 하나씩 살펴보아요.','생각한 답을 함께 확인해요.']}))
}));
const catalog=games.map(game=>({id:game.id,subject:game.subject,title:game.title,description:game.description,kind:'quiz',status:'published',source:`./games/${game.id}/game.json`,adventure:true,minStage:game.minStage,maxStage:game.maxStage,questionCount:game.questions.length,questionIds:game.questions.map(q=>q.id)}));
validateCatalog(catalog);games.forEach((game,i)=>validateGame(game,catalog[i]));
assert.throws(()=>validateCatalog([{...catalog[0],growth:true,stage:2}]));
assert.throws(()=>validateCatalog([{...catalog[0],minStage:0}]));
assert.throws(()=>validateCatalog([{...catalog[0],maxStage:1}]));
assert.throws(()=>validateGame({...games[0],questions:games[0].questions.map((q,n)=>({...q,level:n<5?2:4}))},catalog[0]));
assert.throws(()=>validateGame({...games[0],questions:games[0].questions.map(q=>({...q,level:5}))},catalog[0]));
P.configureCatalog(catalog);
const empty=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
const reset=who=>{storage.set(P.KEY,JSON.stringify(empty()));P.selectLearner(who);};
const play=(game,response,level=2,size)=>{
 const round=P.beginRound(game,{level,...(size?{size}:{})});
 for(const id of round.ids){
  assert.equal(P.gameProgress(game.id).round.ids[P.gameProgress(game.id).round.index],id);
  const answer=P.answerQuestion(game,response);
  assert.ok(answer);
  assert.equal(P.answerQuestion(game,response),null,'Double submission cannot award stars or record attempts twice');
  P.nextQuestion(game.id);
 }
 return P.gameProgress(game.id);
};

for(let index=0;index<games.length;index++){
 const game=games[index];reset('se');
 const round=P.beginRound(game,{level:1});assert.equal(round.ids.length,3);
 assert.ok(round.ids.every(id=>game.questions.find(q=>q.id===id).level===2),'A below-minimum request gets the first eligible level');
 invalid[index].forEach(r=>assert.throws(()=>P.answerQuestion(game,r)));
 assert.equal(P.gameProgress(game.id).round.answers.length,0,'Invalid submissions never become answers');
 const first=P.answerQuestion(game,correct[index]);assert.equal(first.earned,10);
 if(index===0)assert.equal(first.choice,correct[index]);else assert.equal(Object.hasOwn(first,'choice'),false);
 assert.deepEqual(first.response,correct[index]);
 const backup=structuredClone(P.exportRecords());
 reset('tae');P.importRecords(backup);P.selectLearner('se');
 const resumed=P.beginRound(game,{level:4,size:5});
 assert.equal(resumed.id,round.id);assert.deepEqual(resumed.ids,round.ids);assert.equal(resumed.ids.length,3);
 assert.deepEqual(resumed.answers[0].response,correct[index],'Submitted answers survive export/import and a level change');
 assert.equal(P.answerQuestion(game,correct[index]),null);
 P.nextQuestion(game.id);
 for(let n=1;n<3;n++){P.answerQuestion(game,correct[index]);P.nextQuestion(game.id);}
 assert.equal(P.gameProgress(game.id).finishedRounds,1);
 P.selectLearner('tae');assert.equal(P.beginRound(game,{level:2}).ids.length,5);
 assert.equal(P.gameProgress(game.id,'se').round.finished,true,'Learners retain independent sessions');

 reset('se');play(game,wrong[index]);play(game,wrong[index]);
 assert.equal(P.summary(catalog).stars,12,'Six incorrect answers earn two stars each');
 play(game,correct[index]);play(game,correct[index]);
 assert.equal(P.summary(catalog).stars,60,'Later correct answers earn only the eight-star difference');
 play(game,wrong[index]);assert.equal(P.summary(catalog).stars,60,'A later mistake never removes stars');
 assert.equal(G.recommendation('math',catalog).recentCount,0,'Adventure results do not alter the established growth gates');

 reset('tae');const seen=new Set();
 for(let n=0;n<2;n++){const r=P.beginRound(game,{level:2});r.ids.forEach(id=>seen.add(id));play(game,correct[index]);}
 assert.equal(seen.size,6,'Repeated low-level rounds cover all six eligible items');
 assert.ok([...seen].every(id=>game.questions.find(q=>q.id===id).level===2));
 const higher=P.beginRound(game,{level:4});
 assert.ok(higher.ids.every(id=>game.questions.find(q=>q.id===id).level===4),'Fresh advanced questions are preferred after familiar lower ones');
}

// Import bounds must reject corrupt responses while retaining old choice-only rounds.
const game=games[0],ids=game.questions.slice(0,3).map(q=>q.id),raw=empty();
raw.profiles.se.games[game.id]={records:{[ids[0]]:{best:10,seen:1}},round:{id:'round-legacy',ids,index:0,answers:[{id:ids[0],choice:1,correct:true,earned:10}],updatedAt:1}};
assert.equal(P.clean(raw).profiles.se.games[game.id].round.answers[0].choice,1);
for(const response of [21,-1,1.5,'1',[0,1],[0,1,1],[0,1,5],[0,1,2,3,4,5],null]){
 raw.profiles.se.games[game.id].round.answers=[{id:ids[0],response,correct:true,earned:10}];
 assert.equal(P.clean(raw).profiles.se.games[game.id].round,null);
}
raw.profiles.se.games[game.id].round.answers=[{id:ids[0],choice:1,response:2,correct:true,earned:10}];
assert.equal(P.clean(raw).profiles.se.games[game.id].round,null,'Ambiguous duplicate answer representations are rejected');
reset('se');assert.throws(()=>P.beginRound(game,{level:5}));

// Reproduce a quota failure specific to the large progress key. Small profile-key
// writes still succeed, so they must never unprotect unsaved in-memory answers.
storage.clear();
const quotaProgress=await import('../platform/progress.js?quota-regression');
quotaProgress.configureCatalog(catalog);
quotaProgress.selectLearner('se');
const quotaGame=games[1],quotaRound=quotaProgress.beginRound(quotaGame,{level:2});
const diskBeforeFailure=storage.get(quotaProgress.KEY),normalSet=globalThis.localStorage.setItem;
globalThis.localStorage.setItem=(key,value)=>{if(key===quotaProgress.KEY)throw new Error('QuotaExceededError');normalSet(key,value);};
try{
 assert.equal(quotaProgress.answerQuestion(quotaGame,4).earned,10);
 assert.equal(quotaProgress.storageAvailable,false);
 assert.equal(storage.get(quotaProgress.KEY),diskBeforeFailure,'The failed write leaves the older disk snapshot intact');
 quotaProgress.selectLearner('tae');quotaProgress.selectLearner('se');
 assert.equal(quotaProgress.storageAvailable,false,'Successful small-key writes cannot report progress as saved');
 assert.equal(quotaProgress.gameProgress(quotaGame.id).round.answers.length,1,'Profile switching cannot reload stale disk over the unsaved answer');
 assert.equal(quotaProgress.gameProgress(quotaGame.id).records[quotaRound.ids[0]].best,10);
 quotaProgress.nextQuestion(quotaGame.id);
 assert.equal(quotaProgress.answerQuestion(quotaGame,4).earned,10);
 const unsavedBackup=quotaProgress.exportRecords();
 assert.equal(unsavedBackup.platform.profiles.se.games[quotaGame.id].round.answers.length,2,'Export preserves all answers even during quota failure');
}finally{globalThis.localStorage.setItem=normalSet;}
quotaProgress.nextQuestion(quotaGame.id);
assert.equal(quotaProgress.storageAvailable,true,'Only a successful progress save clears the fallback');
assert.equal(JSON.parse(storage.get(quotaProgress.KEY)).profiles.se.games[quotaGame.id].round.answers.length,2,'Recovered persistence includes both formerly unsaved answers');
const quotaReload=await import('../platform/progress.js?quota-reload');quotaReload.configureCatalog(catalog);
assert.equal(quotaReload.gameProgress(quotaGame.id,'se').round.answers.length,2);

// Reproduce an old v1.1 tab writing its smaller catalog after new games have been
// played. Its v1 write must never change the independently persisted v2 state.
storage.clear();
const migrationProgress=await import('../platform/progress.js?migration-regression');migrationProgress.configureCatalog(catalog);
const oldState=empty(),oldGame=games[0],oldIds=oldGame.questions.slice(0,3).map(q=>q.id);
oldState.profiles.se.stageSelections.math={stage:2,updatedAt:10};
oldState.profiles.se.games[oldGame.id]={records:{[oldIds[0]]:{best:10,seen:4,attempts:[{id:'attempt-old',roundId:'round-old',correct:true,at:20}]}},finishedRounds:4,lastPlayed:20,completedRounds:[],round:{id:'round-old',ids:oldIds,index:0,answers:[{id:oldIds[0],choice:1,correct:true,earned:10}],updatedAt:20}};
oldState.profiles.tae.games[oldGame.id]={records:{[oldIds[1]]:{best:2,seen:1}},finishedRounds:1,lastPlayed:10};
const oldSerialized=JSON.stringify(oldState);storage.set(migrationProgress.PREVIOUS_KEY,oldSerialized);
migrationProgress.selectLearner('se');
assert.equal(migrationProgress.gameProgress(oldGame.id).records[oldIds[0]].best,10);
assert.equal(migrationProgress.gameProgress(oldGame.id).records[oldIds[0]].seen,4);
assert.equal(migrationProgress.gameProgress(oldGame.id).records[oldIds[0]].attempts.length,1);
assert.equal(migrationProgress.gameProgress(oldGame.id).round.answers[0].choice,1);
assert.equal(migrationProgress.gameProgress(oldGame.id,'tae').records[oldIds[1]].best,2);
assert.equal(migrationProgress.stageSelection('math','se'),2);
assert.ok(storage.has(migrationProgress.KEY));
assert.equal(storage.get(migrationProgress.PREVIOUS_KEY),oldSerialized,'Migration never edits or deletes the old data');
migrationProgress.beginRound(games[4],{level:2});migrationProgress.answerQuestion(games[4],[2,0,1]);
const migratedSnapshot=storage.get(migrationProgress.KEY);
storage.set(migrationProgress.PREVIOUS_KEY,JSON.stringify(empty())); // Old tab saves its known-only state.
const newerReload=await import('../platform/progress.js?migration-reload');newerReload.configureCatalog(catalog);
assert.equal(newerReload.gameProgress(games[4].id,'se').round.answers.length,1,'Old tabs cannot discard newer game records');
assert.equal(newerReload.gameProgress(oldGame.id,'se').records[oldIds[0]].best,10,'Migration is not repeated over existing v2 data');
assert.equal(storage.get(newerReload.KEY),migratedSnapshot);
const compatibleBackup=newerReload.exportRecords();
assert.equal(compatibleBackup.format,'sparkle-learning-backup');assert.equal(compatibleBackup.version,1);assert.equal(compatibleBackup.platform.version,1);
newerReload.importRecords({format:'sparkle-learning-backup',version:1,platform:oldState});
assert.equal(newerReload.gameProgress(games[4].id,'se').round.answers.length,1,'Importing an old backup preserves newer game records');
assert.equal(storage.get(newerReload.PREVIOUS_KEY),JSON.stringify(empty()),'Backup imports write only the new progress key');
console.log('PASS: all five interactions, strict submissions, catalog levels, legacy answers, restore, learner isolation, 3/5 rounds, level sampling, duplicate prevention and unchanged reward/growth rules');
console.log('PASS: quota fallback survives profile changes, unsaved export, successful retry, v1→v2 migration, old-tab isolation and v1 backup compatibility');
