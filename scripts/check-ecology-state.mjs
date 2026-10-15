import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}}
globalThis.localStorage=new Storage();
const E=await import('../village/ecology-state.js');
assert.equal(E.ecologyForSkill('math','kma.g3.addition'),'number-garden');
assert.equal(E.ecologyForSkill('math','길이 단위 환산'),'measure-river');
assert.equal(E.ecologyForSkill('math','규칙성'),'pattern-grove');
assert.equal(E.ecologyForSkill('math','kma.g6.geometry'),'shape-hill');
assert.equal(E.ecologyForSkill('math','백분율'),'ratio-orchard');
assert.equal(E.ecologyForSkill('korean','세 글자 낱말 조립'),'word-flower');
assert.equal(E.ecologyForSkill('korean','안내문 절차 순서'),'guide-path');
assert.equal(E.ecologyForSkill('english','CVC 단어 읽기'),'soundbird-forest');
assert.equal(E.ecologyForSkill('english','세 단계 지시 듣기'),'listening-meadow');
assert.equal(E.ecologyForSkill('english','세 준비물 순서 기억'),'sequence-trail');
const bank=JSON.parse(await fs.readFile(new URL('../games/irt-bank.json',import.meta.url),'utf8'));
for(const item of bank.items){
 const habitat=E.ecologyForSkill(item.subject,item.skill);
 assert(habitat&&E.ECOLOGIES[habitat],`unmapped skill ${item.subject}/${item.skill}`);
 assert.equal(E.ECOLOGIES[habitat].subject,item.subject,`cross-subject habitat ${item.skill}`);
}

let state=E.emptyEcology();
state=E.recordEcologyMemory(state,{who:'tae',subject:'math',tier:'memory-7',roundId:'r7',skills:['규칙성','수의 합'],at:1}).state;
state=E.recordEcologyMemory(state,{who:'tae',subject:'math',tier:'memory-30',roundId:'r30',skills:['규칙성'],at:2}).state;
const snap=E.ecologySnapshot(state,'tae');
assert.equal(snap.guardianTree,true);
assert.equal(snap.habitats.find(h=>h.id==='pattern-grove').memory30,1);
assert.equal(snap.habitats.find(h=>h.id==='number-garden').memory7,1);
assert.equal(E.ecologySnapshot(state,'se').guardianTree,false);
assert.equal(E.saveEcology(state),true);
const exported=E.exportEcology();globalThis.localStorage=new Storage();E.importEcology(exported);
assert.equal(E.ecologySnapshot(E.loadEcology(),'tae').totals.memory30,1);
console.log('ECOLOGY_STATE_PASS',snap.totals);
