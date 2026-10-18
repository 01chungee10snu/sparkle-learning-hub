import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

class Storage {
 constructor(){this.data=new Map();}
 getItem(k){return this.data.has(k)?this.data.get(k):null;}
 setItem(k,v){this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}
globalThis.localStorage=new Storage();

const catalog=JSON.parse(await fs.readFile(new URL('../games/catalog.json',import.meta.url),'utf8'));
const bank=JSON.parse(await fs.readFile(new URL('../games/irt-bank.json',import.meta.url),'utf8'));
const P=await import('../platform/progress.js');
const D=await import('../platform/learning-director.js');
const R=await import('../platform/retrieval.js');
P.configureCatalog(catalog);
P.configureIrtBank(bank);

const blankPlan=D.plan(catalog,{who:'tae',preferredSubject:'math'});
assert(blankPlan.missions.length>=2&&blankPlan.missions.length<=3);
assert.equal(new Set(blankPlan.missions.map(m=>m.gameId)).size,blankPlan.missions.length);
assert(blankPlan.missions.every(m=>['adaptive','review'].includes(m.strategy)));

const now=Date.now(),old=now-3*24*60*60*1000,recent=now-60*1000;
assert.equal(R.reviewStatus({seen:1,attempts:[{id:'a',roundId:'r',correct:true,at:old}]},now).intervalDays,2);
assert.equal(R.reviewStatus({seen:2,attempts:[{id:'a',roundId:'r',correct:true,at:now-8*24*60*60*1000},{id:'b',roundId:'r2',correct:true,at:old}]},now).due,false,'two successful retrievals expand the interval to four days');
assert.equal(R.reviewStatus({seen:2,attempts:[{id:'a',roundId:'r',correct:true,at:old},{id:'b',roundId:'r2',correct:false,at:recent}]},now).due,true,'a new error becomes immediately reviewable');
const gid='growth-math-3',entry=catalog.find(g=>g.id===gid),[qOld,qWrong]=entry.questionIds;
const platform={version:1,profiles:{
 tae:{games:{[gid]:{
  records:{
   [qOld]:{best:10,seen:1,attempts:[{id:'attempt-old',roundId:'round-old',correct:true,at:old}]},
   [qWrong]:{best:2,seen:1,attempts:[{id:'attempt-wrong',roundId:'round-wrong',correct:false,at:recent}]}
  },round:null,finishedRounds:0,lastPlayed:recent,completedRounds:[]
 }},stageSelections:{}},
 se:{games:{},stageSelections:{}}
}};
P.importRecords({format:'sparkle-learning-backup',version:1,platform,learner:'tae'});

assert.equal(D.reviewDue(P.gameProgress(gid,'tae').records[qOld],now),true);
assert.equal(D.reviewDue(P.gameProgress(gid,'tae').records[qWrong],now),true);
const plan=D.plan(catalog,{who:'tae',now,preferredSubject:'math'});
assert.equal(plan.missions[0].kind,'review');
assert.equal(plan.missions[0].gameId,gid);
assert.equal(plan.missions[0].strategy,'review');

const game=JSON.parse(await fs.readFile(new URL('../'+entry.source.replace(/^\.\//,''),import.meta.url),'utf8'));
const round=P.beginRound(game,{size:5,level:3,strategy:'review'});
assert.equal(round.ids[0],qWrong,'recent wrong answer should be retrieved first');
assert.equal(round.ids[1],qOld,'spaced correct answer should be retrieved before fresh fillers');
assert.equal(new Set(round.ids).size,5);

assert.throws(()=>P.beginRound(game,{size:5,level:3,strategy:'unknown'}),/학습 방식/);
console.log('LEARNING_DIRECTOR_PASS',plan.missions.map(m=>m.kind+':'+m.gameId).join(', '));
