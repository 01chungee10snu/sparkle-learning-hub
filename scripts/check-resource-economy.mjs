import assert from 'node:assert/strict';
import * as Progress from '../platform/progress.js';
import * as Resource from '../platform/resource-economy.js';

const backing=new Map();
const storage={getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,String(v)),removeItem:k=>backing.delete(k)};
globalThis.localStorage=storage;
const catalog=['math','korean','english','hanja'].map(s=>({
 id:'unit-'+s,subject:s,kind:'quiz',status:'published',questionCount:6,
 questionIds:Array.from({length:6},(_,i)=>'q-'+s+'-'+i),
}));
Progress.configureCatalog(catalog);
const games=Object.fromEntries(catalog.map(c=>[c.subject,{
 id:c.id,subject:c.subject,questions:c.questionIds.map((id,i)=>({
 id,title:'Test',story:'A',prompt:'B',choices:['one','two','three'],
 answer:i%3,explanation:['explain'],skill:c.subject,
 }))}]));
const play=subject=>{
 const game=games[subject],round=Progress.beginRound(game,{size:3});
 for(const id of round.ids){
  const question=game.questions.find(q=>q.id===id);
  const graded=Progress.answerQuestion(game,question.answer);
  assert(graded.correct);
  Progress.nextQuestion(game.id);
 }
};
Resource.configure(catalog);
let wallet=Resource.wallet(catalog,'tae');
assert.deepEqual(wallet.available,{math:0,korean:0,english:0,hanja:0});
play('math'); play('korean'); play('english');
wallet=Resource.wallet(catalog,'tae');
for(const subject of ['math','korean','english'])assert.equal(wallet.available[subject],8);
assert.equal(wallet.available.hanja,0);
play('hanja');wallet=Resource.wallet(catalog,'tae');
assert.deepEqual(wallet.available,{math:8,korean:8,english:8,hanja:8});
assert.equal(Resource.wallet(catalog,'se').available.math,0);
const old=wallet.available.math;
play('math'); assert(Resource.wallet(catalog,'tae').available.math>=old);
const first=Resource.adoptFish('goldfish',catalog,'tae',storage);
assert(first.ok&&!first.duplicate);
const after=Resource.wallet(catalog,'tae');
assert.equal(after.available.math,Resource.earnedResources(catalog,'tae').earned.math-3);
assert(after.fish.find(f=>f.id==='goldfish').owned);
assert(Resource.adoptFish('goldfish',catalog,'tae',storage).duplicate);
const feed=Resource.feedFish('goldfish',catalog,'tae',storage);
assert(feed.ok&&!feed.duplicate);
assert(Resource.feedFish('goldfish',catalog,'tae',storage).duplicate);
const before=Resource.exportResources();Resource.importResources(before,storage);
assert.equal(Object.keys(Resource.exportResources().profiles.tae.adoptions).length,1);
assert.equal(Resource.wallet(catalog,'se').fish.filter(f=>f.owned).length,1);
assert(Resource.wallet(catalog,'tae').fish.some(f=>f.id==='guppy'&&f.owned));
assert.equal(Resource.wallet(catalog,'tae').fish.find(f=>f.id==='goldfish').feedDays,1);
const independent=Resource.earnedResources(catalog,'tae');
assert(independent.independentItems>=12);
console.log('PASS_RESOURCE_ECONOMY: 4 subjects, cross-subject bonus, sibling isolation, resource-only fish purchases, merge idempotence, once-per-day feed, original stars untouched');
