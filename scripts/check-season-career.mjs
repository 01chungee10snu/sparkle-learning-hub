import assert from 'node:assert/strict';
import {koreaScene,SEASONS,DAYPARTS} from '../village/korea-season-clock.js';
import {CAREERS,CAREER_GROUPS,CAREER_SOURCES} from '../village/career-library.js';
import {ADMISSION_REFERENCES,VERIFIED_EXAM_FACTS,academicSignalsForCareer} from '../village/career-academic-evidence-v28.js';
import {readFileSync} from 'node:fs';
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
assert.equal(CAREERS.length,100);
const audit=JSON.parse(readFileSync(new URL('../docs/CAREER_V27_SOURCE_AUDIT.json',import.meta.url)));
assert.equal(audit.count,100);
assert.equal(audit.occupationEvidence.length,100);
assert.equal(audit.wageAndEducationSource.proxyOccupationCases,43);
assert.deepEqual(audit.wageAndEducationSource.wageSurveyYears,{'2021':96,'2023':4});
assert(audit.occupationEvidence.every((e,i)=>
  e.name===CAREERS[i].name&&e.annualMedianWan===CAREERS[i].annualMedianWan&&
  e.wageSurveyYear===CAREERS[i].wageSurveyYear));
assert.equal(CAREERS[0].name,'기업고위임원');
assert.equal(CAREERS.at(-1).name,'가사도우미');
assert.equal(new Set(CAREERS.map(c=>c.id)).size,100);
assert.equal(new Set(CAREERS.map(c=>c.name)).size,100);
for(const group of CAREER_GROUPS)assert(CAREERS.some(c=>c.group===group.id));
for(const c of CAREERS) {
 for(const field of ['mission','impact','journey','tryIt'])assert(c[field].length>=12,c.name+' '+field);
 assert(c.subjects.length===2&&new Set(c.subjects).size===2&&c.subjects.every(s=>['math','korean','english','hanja'].includes(s)));
 assert(c.annualMedianWan>=2000&&c.hourlyEquivalentWon===Math.round(c.annualMedianWan*10000/2080));
 assert([2021,2023].includes(c.wageSurveyYear));
 assert(c.requiredStudentRankPer10000===null,'School ranking must never be fabricated');
 assert(c.sourceCode&&c.sourceUrl.includes('career.go.kr'));
}
assert(CAREER_SOURCES.every(s=>new URL(s.url).protocol==='https:'));
assert.equal(Object.keys(ADMISSION_REFERENCES).length,8);
assert.equal(ADMISSION_REFERENCES.medicine.percentiles.join(','),'98,100,98,100');
const byName=name=>CAREERS.find(c=>c.name===name)?.academic;
assert.equal(byName('일반의사').admission.per10000SubjectMeanEquivalent,100);
assert.equal(byName('약사 및 한약사').admission.per10000SubjectMeanEquivalent,225);
assert.equal(byName('반도체공학기술자').admission.per10000SubjectMeanEquivalent,425);
assert.equal(byName('지능형 로봇개발자').admission.per10000SubjectMeanEquivalent,525);
assert.equal(byName('기업고위임원').admission.per10000SubjectMeanEquivalent,750);
assert.equal(byName('자연계중등학교교사').admission.per10000SubjectMeanEquivalent,525);
assert.deepEqual([VERIFIED_EXAM_FACTS.cpa.participants,VERIFIED_EXAM_FACTS.cpa.passed,VERIFIED_EXAM_FACTS.cpa.passedPer10000ExamTakers],[4368,1150,2633]);
assert.deepEqual([VERIFIED_EXAM_FACTS.bar.participants,VERIFIED_EXAM_FACTS.bar.passed,VERIFIED_EXAM_FACTS.bar.passedPer10000ExamTakers],[3364,1714,5095]);
assert(byName('판사').examIsRouteOnly,'Judicial hiring != bar exam pass rate');
assert(byName('변호사').mandatory.includes('법학전문대학원'),'Bar eligibility must identify mandatory graduate qualification');
assert(byName('치과의사').mandatory.includes('치의학'),'Mandatory field must be identified separately from elite college');
for(const c of CAREERS){
 const a=c.academic;
 assert(a&&a.minimumNationalStudentRankPer10000===null);
 assert(a.mandatory.length>12);
 if(a.admission){
  assert(a.admission.percentiles.length===4);
  assert(a.admission.sourceUrl.startsWith('https://www.adiga.kr/'));
  assert(a.admission.caution.includes('전국 종합석차'));
 }
 if(a.exam)assert(a.exam.caution.includes('응시'));
}
const uncoded=CAREERS.filter(c=>!c.academic.evidencePresent);
assert(uncoded.length>60,'Do not invent a benchmark for every occupation');

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
console.log('SEASON_CAREER_PASS 4 seasons × 4 KST periods, 100 source-matched careers, 6 groups, income/education provenance, no fabricated grade percentiles, 2-child isolation');
