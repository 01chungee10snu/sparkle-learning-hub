import assert from 'node:assert/strict';
import {createLifeStore,LIFE_ACTIONS} from '../village/life-state-v16.js';

const map=new Map([['unrelated','keep']]);
const storage={
  getItem:k=>map.has(k)?map.get(k):null,
  setItem:(k,v)=>map.set(k,v)
};
const balance={checkPlay:()=>({allowed:true}),recordPlay:()=>{}};
const start=createLifeStore({storage,namespace:'/test',balance});
const send=(who,area,type,fields={})=>start.dispatch({who,area,type,expectedRevision:start.snapshot(who,area).revision,...fields});
const bad=fn=>assert.throws(fn,Error);
assert.equal(LIFE_ACTIONS.length,9);
assert.equal(start.snapshot('tae').plots.length,0);
let planted=send('tae','home','PLANT',{slot:0,species:'carrot'});
assert.equal(planted.snapshot.revision,1);
bad(()=>start.dispatch({who:'tae',type:'PLANT',slot:1,species:'tomato',expectedRevision:0}));
bad(()=>start.dispatch({who:'tae',type:'CARE_PLANT',slot:0,care:'water',expectedStage:0,expectedCycle:0,expectedRevision:0}));
for(let stage=0;stage<3;stage++)send('tae','home','CARE_PLANT',{slot:0,care:['water','sun','tend'][stage],expectedStage:stage,expectedCycle:0});
bad(()=>send('tae','home','HARVEST',{slot:0,expectedCycle:1}));
send('tae','home','HARVEST',{slot:0,expectedCycle:0});
assert.equal(start.snapshot('tae').harvest.carrot,1);
assert.deepEqual(start.snapshot('tae').plots[0],{slot:0,species:'carrot',stage:0,cycle:1});
bad(()=>send('tae','home','CARE_PLANT',{slot:0,care:'water',expectedStage:0,expectedCycle:0}));
assert.equal(start.snapshot('se').revision,0);
send('se','plaza','ADOPT_FISH',{species:'guppy'});
assert.equal(start.snapshot('tae','plaza').fish.length,1);
assert.equal(start.snapshot('se').fish.length,0);
send('tae','plaza','ADOPT_PET',{species:'hamster'});
send('tae','plaza','RENAME',{kind:'pet',id:2,name:'  보리🐹  '});
bad(()=>send('tae','plaza','RENAME',{kind:'pet',id:2,name:'<script>'}));
bad(()=>send('tae','plaza','RENAME',{kind:'pet',id:2,name:'😄'.repeat(13)}));
bad(()=>send('tae','plaza','RENAME',{kind:'pet',id:2,name:'a\u0000b'}));
for(let i=0;i<8;i++){
  send('tae','plaza','CARE_FISH',{id:1,care:['feed','clean','observe'][i%3],expectedStep:i});
  send('tae','plaza','CARE_PET',{id:2,care:['feed','play','rest'][i%3],expectedStep:i});
}
assert.equal(start.snapshot('tae','plaza').fish[0].growth,3);
assert.equal(start.snapshot('tae','plaza').pets[0].bond,3);
assert.equal(start.snapshot('tae','plaza').fish[0].careStep,8);
send('tae','plaza','DECORATE',{kind:'pond',value:'reeds'});
bad(()=>send('tae','plaza','DECORATE',{kind:'__proto__',value:'anything'}));
bad(()=>send('tae','home','PLANT',{slot:2,species:'__proto__'}));
bad(()=>send('tae','home','PLANT',{slot:6,species:'tomato'}));
bad(()=>start.dispatch({who:'tae',type:'PLANT',slot:2,species:'tomato',expectedRevision:'6'}));
assert.equal(createLifeStore({storage,namespace:'/test',balance}).snapshot('se','plaza').decor.pond,'reeds');
const failing={getItem:k=>storage.getItem(k),setItem:()=>{throw Error('quota');}};
bad(()=>createLifeStore({storage:failing,namespace:'/test',balance}).dispatch({who:'tae',type:'PLANT',slot:3,species:'tomato',expectedRevision:start.snapshot('tae').revision}));
assert.equal(start.snapshot('tae').plots.length,1);
bad(()=>createLifeStore({storage:{getItem:()=>{throw Error('denied');},setItem:()=>{}},namespace:'/test',balance}).snapshot('tae'));
const key='sparkle-life-v16:/test',valid=map.get(key);
for(const corrupt of ['{bad','null',JSON.stringify({...JSON.parse(valid),version:17}),JSON.stringify({...JSON.parse(valid),tae:{}})]){
  map.set(key,corrupt);
  bad(()=>start.snapshot('tae'));
  bad(()=>send('tae','home','PLANT',{slot:4,species:'tomato'}));
  assert.equal(map.get(key),corrupt);
}
map.set(key,valid);
// Forged but otherwise plausible persisted extras must never override identity or survive.
const original=JSON.parse(valid);
for(const mutate of [
  r=>{r.tae.who='se';},
  r=>{r.tae.area='plaza';},
  r=>{r.tae.plots[0].unexpected='x';},
  r=>{r.family.fish[0].unexpected='x';},
  r=>{r.family.pets[0].unexpected='x';},
  r=>{r.tae.unexpected='x';}
]){
  const altered=structuredClone(original);
  mutate(altered);
  const before=JSON.stringify(altered);
  map.set(key,before);
  bad(()=>start.snapshot('tae'));
  bad(()=>start.dispatch({who:'tae',type:'PLANT',slot:1,species:'tomato',expectedRevision:original.tae.revision}));
  assert.equal(map.get(key),before,'Invalid stored data was unexpectedly rewritten');
}
map.set(key,valid);
const beforeMax=structuredClone(original);
beforeMax.tae.plots[0].stage=3;
beforeMax.tae.plots[0].cycle=1000000;
const maxRaw=JSON.stringify(beforeMax);
map.set(key,maxRaw);
assert.deepEqual(start.snapshot('tae').plots[0],beforeMax.tae.plots[0]);
bad(()=>start.dispatch({who:'tae',type:'HARVEST',slot:0,expectedCycle:1000000,expectedRevision:beforeMax.tae.revision}));
assert.equal(map.get(key),maxRaw,'Overflow harvest must leave entire storage unchanged');
map.set(key,valid);
assert.equal(map.get('unrelated'),'keep');
assert.equal([...map.keys()].length,2);
console.log('PASS life-state-v16: persistence, revision, cycles, owners, bounds, invalid input, read/write faults');
