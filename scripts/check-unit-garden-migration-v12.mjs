import assert from 'node:assert/strict';
import * as P from '../platform/progress.js';
import * as R from '../platform/rewards.js';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
const ids=['length-01','length-02','length-03'];
const catalog=[{id:'unit-garden',kind:'quiz',status:'published',subject:'math',progressAdapter:'unit-garden-v1',questionIds:ids,modes:['choice']}];
const game={...catalog[0],questions:ids.map(id=>({id,choices:['yes','no','other'],answer:0}))};
P.configureCatalog(catalog);
P.configureIrtBank({version:1,count:3,items:ids.map((id,i)=>({gameId:'unit-garden',id,subject:'math',skill:'units',b:i/5,c:1/3}))});
const empty={version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}};
const legacy={version:1,profiles:{
 tae:{records:{'length-01':{best:10},'length-02':{best:2}},active:{course:'length',level:1,ids:['length-04','length-05'],index:1,answers:[{correct:true}],finished:false},sessions:3},
 se:{records:{'length-01':{best:2}},sessions:1}
}};
storage.set(P.KEY,JSON.stringify(empty));
storage.set(P.LEGACY_KEY,JSON.stringify(legacy));
P.selectLearner('tae');
assert.equal(P.summary(catalog).stars,12);
assert.equal(P.summary(catalog).games[0].resume,true);
assert.equal(R.wallet(catalog,'tae').learningStars,12);
const beforeLegacy=storage.get(P.LEGACY_KEY);
const round=P.beginRound(game,{size:3});
const actual={};
for(const id of round.ids){
 const active=P.gameProgress('unit-garden').round;
 const qid=active.ids[active.index];
 const answer=P.answerQuestion(game,0);
 actual[qid]=answer.earned;
 P.nextQuestion('unit-garden',game);
}
assert.deepEqual(actual,{'length-01':0,'length-02':8,'length-03':10});
assert.equal(P.summary(catalog).stars,30);
assert.equal(R.wallet(catalog,'tae').learningStars,30);
assert.equal(P.summary(catalog,'se').stars,2);
assert.equal(storage.get(P.LEGACY_KEY),beforeLegacy,'Original progress bytes remain unchanged');
assert.equal(P.legacyProgress('tae').round.ids[0],'length-04','Legacy active order preserved');
const exported=P.exportRecords();
P.importRecords(exported);
assert.equal(P.summary(catalog).stars,30,'Round trip cannot double credit');
assert.equal(R.wallet(catalog,'tae').learningStars,30);
assert.equal(storage.get(P.LEGACY_KEY),beforeLegacy);
assert.equal(P.ability('math','tae').n,3,'Old legacy answers are not backfilled as IRT evidence');
assert.equal(P.ability('math','se').n,0);
console.log('PASS legacy48 coexistence: 0+8+10 delta, no doubled balance, untouched legacy, sibling isolation, round preservation, backup idempotency');
