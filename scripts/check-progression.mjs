import assert from 'node:assert/strict';
globalThis.localStorage=new class{
 constructor(){this.data=new Map();}
 getItem(k){return this.data.has(k)?this.data.get(k):null;}
 setItem(k,v){this.data.set(k,String(v));}
 removeItem(k){this.data.delete(k);}
}();
const P=await import('../platform/progress.js');
const G=await import('../platform/progression.js');
P.configureCatalog([]);
assert.equal(G.goal('tae').id,'balanced');
assert.equal(G.setGoal('garden','tae').id,'garden');
assert.equal(G.goal('tae').id,'garden');
const exported=G.exportGoals();
assert.equal(exported.profiles.tae.goal,'garden');
assert.equal(G.snapshot([], 'tae').rank.level,1);
assert.equal(G.snapshot([], 'tae').goal.id,'garden');
assert.equal(G.snapshot([], 'tae').points,0);
console.log('PROGRESSION_PASS');
