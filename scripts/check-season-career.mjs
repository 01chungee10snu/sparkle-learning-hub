import assert from 'node:assert/strict';
import {koreaScene,SEASONS,DAYPARTS} from '../village/korea-season-clock.js';
import {CAREERS,CAREER_GROUPS,CAREER_SOURCES} from '../village/career-library.js';
import * as CareerState from '../village/career-state.js';
const kst=iso=>koreaScene(new Date(iso));
assert.deepEqual(
  [kst('2026-10-18T20:00:00Z').displayClock,kst('2026-10-18T20:00:00Z').daypart,
   kst('2026-10-18T20:00:00Z').season],['05:00','sunrise','autumn']);
assert.equal(kst('2026-10-19T00:00:00Z').daypart,'noon');
assert.equal(kst('2026-10-19T08:00:00Z').daypart,'sunset');
assert.equal(kst('2026-10-19T11:00:00Z').daypart,'night');
assert.equal(kst('2026-02-28T15:00:00Z').season,'spring');
assert.equal(kst('2026-05-31T15:00:00Z').season,'summer');
assert.equal(kst('2026-08-31T15:00:00Z').season,'autumn');
assert.equal(kst('2026-11-30T15:00:00Z').season,'winter');
assert.equal(kst('2026-10-19T15:00:00Z').displayDate,'2026.10.20');
assert.equal(Object.keys(SEASONS).length,4);assert.equal(Object.keys(DAYPARTS).length,4);
assert.equal(CAREERS.length,30);
assert.equal(new Set(CAREERS.map(c=>c.id)).size,30);
assert.equal(new Set(CAREERS.map(c=>c.name)).size,30);
for(const group of CAREER_GROUPS)assert(CAREERS.some(c=>c.group===group.id));
for(const c of CAREERS) {
 for(const field of ['mission','impact','journey','tryIt'])assert(c[field].length>=12,c.name+' '+field);
 assert(c.subjects.length>=1&&c.subjects.every(s=>['math','korean','english','hanja'].includes(s)));
}
assert(CAREER_SOURCES.every(s=>new URL(s.url).protocol==='https:'));
const memory=new Map(),store={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
globalThis.localStorage=store;
assert.deepEqual(CareerState.careerSnapshot('tae'),[]);
const first=CareerState.toggleDream('tae','doctor',store);
assert(first.selected);assert.deepEqual(CareerState.careerSnapshot('tae'),['doctor']);
CareerState.toggleDream('se','ai-researcher',store);
assert.deepEqual(CareerState.careerSnapshot('se'),['ai-researcher']);
const before=CareerState.exportCareer();
const removed=CareerState.toggleDream('tae','doctor',store);
assert.equal(removed.selected,false);
assert.deepEqual(CareerState.careerSnapshot('tae'),[]);
const local=CareerState.exportCareer();
CareerState.importCareer(before,store);
assert.deepEqual(CareerState.careerSnapshot('tae'),[],
 'Older snapshot must not resurrect a removed dream');
assert.deepEqual(CareerState.mergeCareer(before,local).profiles.tae.choices.doctor.selected,false);
assert(CareerState.exportCareer().profiles.se.choices['ai-researcher'].selected);
assert.throws(()=>CareerState.toggleDream('tae','made-up-career',store),/직업/);
console.log('SEASON_CAREER_PASS 4 seasons × 4 KST periods, 30 authored profiles, 6 groups, 2-child isolation, latest-write tombstones, official sources');
