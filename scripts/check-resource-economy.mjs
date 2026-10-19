import assert from 'node:assert/strict';
import * as Progress from '../platform/progress.js';
import * as Resource from '../platform/resource-economy.js';
import {CAREERS} from '../village/career-library.js';

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
assert.equal(Resource.FISH_SPECIES.length,16);
assert.equal(Resource.FISH_SPECIES.filter(f=>f.world==='pond').length,6);
assert.equal(Resource.FISH_SPECIES.filter(f=>f.world==='ocean').length,10);
assert(Resource.FISH_SPECIES.every(f=>f.art===`./assets/marine-premium-v25/${f.id}.webp`));
const oceanMilestones=Resource.FISH_SPECIES.filter(f=>f.world==='ocean').map(f=>f.minSolved);
assert.deepEqual(oceanMilestones,[14,24,34,46,60,78,98,125,165,220]);
assert.deepEqual(wallet.available,{math:0,korean:0,english:0,hanja:0});
play('math'); play('korean'); play('english');
wallet=Resource.wallet(catalog,'tae');
for(const subject of ['math','korean','english'])assert.equal(wallet.available[subject],8);
assert.equal(wallet.available.hanja,0);
play('hanja');wallet=Resource.wallet(catalog,'tae');
assert.deepEqual(wallet.available,{math:8,korean:8,english:8,hanja:8});
let clown=wallet.fish.find(f=>f.id==='clownfish');
assert.equal(clown.meetsLearning,false);
assert.equal(clown.remainingSolved,2);
assert.equal(Resource.wallet(catalog,'se').available.math,0);
const old=wallet.available.math;
play('math'); wallet=Resource.wallet(catalog,'tae');assert(wallet.available.math>=old);
clown=wallet.fish.find(f=>f.id==='clownfish');
assert(clown.meetsLearning&&clown.canAdopt,'First ocean habitat becomes eligible only after its learning milestone');
const whale=wallet.fish.find(f=>f.id==='humpback-whale');
assert.equal(whale.careMode,'observe');
assert.equal(whale.canAdopt,false);
assert.equal(Resource.adoptFish('humpback-whale',catalog,'tae',storage).reason,'learning-milestone');
const first=Resource.adoptFish('goldfish',catalog,'tae',storage);
assert(first.ok&&!first.duplicate);
const after=Resource.wallet(catalog,'tae');
assert.equal(after.available.math,Resource.earnedResources(catalog,'tae').earned.math-3);
assert(after.fish.find(f=>f.id==='goldfish').owned);
assert(Resource.adoptFish('goldfish',catalog,'tae',storage).duplicate);
const known=Resource.unlockCareer('doctor',['math','english'],catalog,'tae',storage);
assert(known.ok&&!known.duplicate,'Two independently earned currencies unlock the same-priced career');
assert(Resource.wallet(catalog,'tae').careerUnlocked.includes('doctor'));
assert.equal(Resource.wallet(catalog,'tae').available.math,after.available.math-1);
assert.equal(Resource.unlockCareer('doctor',['math','english'],catalog,'tae',storage).duplicate,true);
assert.throws(()=>Resource.unlockCareer('dentist',['math','math'],catalog,'tae',storage),/서로 다른/);
assert.equal(Resource.wallet(catalog,'se').careerUnlocked.length,0);
const high=Resource.unlockCareer(CAREERS[0].id,['math','korean'],catalog,'tae',storage);
const low=Resource.unlockCareer(CAREERS.at(-1).id,['math','korean'],catalog,'tae',storage);
assert(high.ok&&low.ok,'High and low salary occupations must be equally priced');
const receipts=Resource.exportResources().profiles.tae.careerUnlocks;
assert.deepEqual(receipts[CAREERS[0].id].cost,receipts[CAREERS.at(-1).id].cost);
assert.equal(Object.values(receipts[CAREERS[0].id].cost).reduce((a,b)=>a+b,0),2);

const feed=Resource.feedFish('goldfish',catalog,'tae',storage);
assert(feed.ok&&!feed.duplicate);
assert(Resource.feedFish('goldfish',catalog,'tae',storage).duplicate);
const before=Resource.exportResources();Resource.importResources(before,storage);
assert.equal(Object.keys(Resource.exportResources().profiles.tae.adoptions).length,1);
assert.equal(Object.keys(Resource.exportResources().profiles.tae.careerUnlocks).length,3);
assert.equal(Resource.wallet(catalog,'se').fish.filter(f=>f.owned).length,1);
assert(Resource.wallet(catalog,'tae').fish.some(f=>f.id==='guppy'&&f.owned));
assert.equal(Resource.wallet(catalog,'tae').fish.find(f=>f.id==='goldfish').feedDays,1);
const independent=Resource.earnedResources(catalog,'tae');
assert(independent.independentItems>=12);
console.log('PASS_RESOURCE_ECONOMY: 4 subjects, 16 premium pond/ocean species, progressive learning gates, career unlock coexistence, sibling isolation, merge idempotence, once-per-day care, original stars untouched');
