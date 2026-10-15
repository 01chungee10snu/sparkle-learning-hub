import assert from 'node:assert/strict';
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}}
globalThis.localStorage=new Storage();
const R=await import('../village/relationship-state.js');
let state=R.emptyRelationships();
const day=Date.UTC(2026,9,15,2);
let visit=R.recordVisit(state,{who:'tae',npcId:'bunny',at:day});state=visit.state;
assert.equal(visit.added,true);
assert.equal(R.recordVisit(state,{who:'tae',npcId:'bunny',at:day+1000}).added,false,'daily visit must dedupe');
for(let d=1;d<=3;d++)state=R.recordVisit(state,{who:'tae',npcId:'bunny',at:day+d*86400000}).state;
let snap=R.relationshipSnapshot(state,'tae');
assert.equal(snap.npcs.find(n=>n.id==='bunny').level,'friend');
assert(snap.npcs.find(n=>n.id==='bunny').line1.includes('발소리'));

let mem=R.recordMemory(state,{who:'tae',subject:'math',tier:'memory-7',roundId:'r7',at:day+8*86400000});state=mem.state;
assert.equal(mem.npcId,'owl');
snap=R.relationshipSnapshot(state,'tae');
assert.equal(snap.residents.memoryButterfly,true);
assert.equal(snap.residents.starlightOwl,false);
assert.equal(snap.npcs.find(n=>n.id==='owl').level,'friend');

state=R.recordMemory(state,{who:'tae',subject:'math',tier:'memory-14',roundId:'r14',at:day+16*86400000}).state;
snap=R.relationshipSnapshot(state,'tae');
assert.equal(snap.residents.starlightOwl,true);
assert.equal(snap.npcs.find(n=>n.id==='owl').level,'special');
assert(snap.npcs.find(n=>n.id==='owl').line1.includes('오래전'));

assert.equal(R.relationshipSnapshot(state,'se').totals.visits,0,'siblings must remain isolated');
assert.equal(R.familyResidentSnapshot(state).starlightOwl,true,'family plaza should share verified rare residents');
assert.equal(R.saveRelationships(state),true);
const exported=R.exportRelationships();
globalThis.localStorage=new Storage();
R.importRelationships(exported);
assert.equal(R.relationshipSnapshot(R.loadRelationships(),'tae').totals.memory14,1);
console.log('RELATIONSHIP_STATE_PASS',snap.totals);
