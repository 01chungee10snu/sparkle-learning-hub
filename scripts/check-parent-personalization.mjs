
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
const M=await import('../platform/memory-model.js');
const R=await import('../platform/retrieval.js');
const D=await import('../platform/parent-dashboard.js');
P.configureCatalog(catalog);
P.configureIrtBank(bank);

const now=Date.now(),DAY=24*60*60*1000;
const gameId='growth-math-3',entry=catalog.find(g=>g.id===gameId);
const ids=entry.questionIds.slice(0,6);
const records={};
for(let i=0;i<ids.length;i++){
 records[ids[i]]={
  best:10,seen:2,
  attempts:[
   {id:'attempt-base-'+i,roundId:'round-base-'+i,correct:true,at:now-10*DAY},
   {id:'attempt-retain-'+i,roundId:'round-retain-'+i,correct:true,at:now-2*DAY,purpose:'review',strategy:'review'}
  ],
  firstAttempt:{id:'attempt-base-'+i,roundId:'round-base-'+i,correct:true,at:now-10*DAY}
 };
}
const platform={version:1,profiles:{
 tae:{games:{[gameId]:{records,round:null,finishedRounds:0,lastPlayed:now-2*DAY,completedRounds:[]}},stageSelections:{}},
 se:{games:{},stageSelections:{}}
}};
P.importRecords({format:'sparkle-learning-backup',version:1,platform,learner:'tae'});

const strong=M.estimate(P.exportRecords().platform.profiles.tae.games,'math');
assert.equal(strong.eligible,true);
assert(strong.factor>1,'successful 8-day retrievals should expand the conservative interval');
assert(strong.n>=6);
const weakRecords={};
for(let i=0;i<ids.length;i++)weakRecords[ids[i]]={best:10,seen:2,attempts:[
 {id:'weak-a-'+i,roundId:'weak-r-'+i,correct:true,at:now-3*DAY},
 {id:'weak-b-'+i,roundId:'weak-s-'+i,correct:false,at:now-DAY}
]};
const weak=M.estimate({[gameId]:{records:weakRecords}},'math');
assert.equal(weak.eligible,true);
assert(weak.factor<1,'failed delayed retrievals should shorten the conservative interval');
const base=R.reviewStatus(records[ids[0]],now,{factor:1});
const personalized=R.reviewStatus(records[ids[0]],now,{factor:strong.factor});
assert(personalized.intervalDays>=base.intervalDays);

const dashboard=D.build(catalog,{who:'tae',now});
assert(dashboard.personalizedSubjects>=1);
assert(dashboard.subjects.find(s=>s.subject==='math').memory.eligible);
assert(dashboard.subjects.find(s=>s.subject==='math').delayed.some(row=>row.n>0));
assert.equal(dashboard.note.includes('형제 비교'),true);

// A mission purpose must survive the canonical progress writer and backup round-trip.
const game=JSON.parse(await fs.readFile(new URL('../'+entry.source.replace(/^\.\//,''),import.meta.url),'utf8'));
P.selectLearner('se');
const round=P.beginRound(game,{size:3,level:3,strategy:'adaptive',purpose:'transfer'});
assert.equal(round.purpose,'transfer');
const q=game.questions.find(item=>item.id===round.ids[0]);
assert(Number.isInteger(q.answer));
P.answerQuestion(game,q.answer);
const saved=P.gameProgress(gameId,'se').records[q.id].attempts.at(-1);
assert.equal(saved.purpose,'transfer');
assert.equal(saved.strategy,'adaptive');
const backup=P.exportRecords();
globalThis.localStorage=new Storage();
P.configureCatalog(catalog);
P.configureIrtBank(bank);
P.importRecords(backup);
const restored=P.gameProgress(gameId,'se').records[q.id].attempts.at(-1);
assert.equal(restored.purpose,'transfer');
assert.equal(restored.strategy,'adaptive');
const transferDash=D.build(catalog,{who:'se',now:Date.now()});
assert.equal(transferDash.transfer.n,1);
assert.equal(transferDash.transfer.correct,1);

console.log('PARENT_PERSONALIZATION_PASS',{
 factor:strong.factor,halfLifeDays:strong.halfLifeDays,weakFactor:weak.factor,
 mathDelayed:dashboard.subjects.find(s=>s.subject==='math').delayed,
 transfer:transferDash.transfer
});
