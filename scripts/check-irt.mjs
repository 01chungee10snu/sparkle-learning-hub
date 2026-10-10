import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IRT from '../platform/irt.js';
import * as P from '../platform/progress.js';
import * as Growth from '../platform/growth.js';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const catalog=read('../games/catalog.json'),bank=read('../games/irt-bank.json');
P.configureCatalog(catalog);
assert.equal(P.configureIrtBank(bank),4153);
assert.equal(IRT.bankSize(),4153);
assert.equal(bank.calibration,'editorial_provisional');
for(const [a,b] of Object.entries(IRT.STAGE_DIFFICULTY).slice(1)){
 assert.ok(b>IRT.STAGE_DIFFICULTY[Number(a)-1],'Growth anchors rise by stage');
}
for(const item of bank.items)assert.ok(IRT.itemAt(item.gameId,item.id),'All descriptors addressable');
const first=IRT.itemAt('bebsu-g1-generated',read('../games/bebsu-g1-generated/game.json').questions[0].id);
assert.equal(first.gradeBand,'G1');
const low=IRT.estimate(Array.from({length:12},(_,i)=>({item:{b:0,c:0.2},correct:false,at:i})));
const high=IRT.estimate(Array.from({length:12},(_,i)=>({item:{b:0,c:0.2},correct:true,at:i})));
assert.ok(high.theta>low.theta+1.5,'More correct answers increase MAP theta');
assert.ok(high.uncertainty<1.35&&low.uncertainty<1.35);
const empty=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
const reset=who=>{store.set(P.KEY,JSON.stringify(empty()));P.selectLearner(who)};
const byId=new Map(catalog.map(entry=>[entry.id,entry]));
const game=id=>({...read('../games/'+id+'/game.json'),...{adventure:byId.get(id).adventure,gradeBand:byId.get(id).gradeBand}});
const right=q=>q.interaction?.type==='numeric'?String(q.interaction.target):
 q.interaction?.type==='build'?q.interaction.target:
 q.interaction?.type==='match'?q.interaction.pairs:
 ['sequence','memory'].includes(q.interaction?.type)?q.interaction.order:q.answer;
const play=(g,{hint=false,correct=true}={})=>{
 const round=P.beginRound(g,{level:P.stageSelection(g.subject)});
 const ids=[...round.ids];
 for(let i=0;i<ids.length;i++){
  const q=g.questions.find(q=>q.id===ids[i]);
  if(hint&&i===0)assert.equal(P.markHint(g.id),true);
  const result=P.answerQuestion(g,correct?right(q):(q.interaction?.type==='numeric'?'999999':(q.answer+1)%q.choices.length));
  assert.ok(result);
  assert.equal(P.answerQuestion(g,right(q)),null);
  P.nextQuestion(g.id);
 }
 return ids;
};
reset('se');
const growth=game('growth-math-1');
const started=play(growth,{hint:true});
const hinted=P.gameProgress(growth.id).records[started[0]];
assert.equal(hinted.firstAttempt.assisted,true);
assert.equal(P.ability('math','se').n,2,'Hinted answers excluded');
assert.equal(P.ability('math','tae').n,0,'Siblings isolated');
const second=play(growth);
assert.equal(new Set([...started,...second]).size,6,'Fresh items preferred');
assert.equal(P.ability('math').n,5);
const third=play(growth);
assert.equal(new Set([...started,...second,...third]).size,8,'All unseen exhausted first');
assert.equal(P.ability('math').n,7,'Repeated items never inflate evidence');
assert.equal(Growth.recommendation('math',catalog).canAdvance,false,'Hinted item cannot count toward raw readiness');
const snapshot=P.exportRecords();
reset('tae');P.importRecords(snapshot);P.selectLearner('se');
assert.equal(P.ability('math').n,7,'First independent answers survive merge');
P.importRecords(snapshot);
assert.equal(P.ability('math').n,7,'Import is idempotent');
const diagnostics=IRT.skillEvidence(P.exportRecords().platform.profiles.se.games,'math',1);
assert.ok(diagnostics.length>0&&diagnostics.every(g=>g.n>=1&&Number.isFinite(g.accuracy)&&Number.isFinite(g.gap)),'Concept-specific response profiles remain calculable');
console.log('PASS: 4153 descriptors, Bayesian updates, concept evidence, uncertainty, per-child isolation, new items, hinted exclusion, repeated-item protection and backup merge');
