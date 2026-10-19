import assert from 'node:assert/strict';
import {CAREERS} from '../village/career-library.js';
import {ADMISSION_REFERENCES,VERIFIED_EXAM_FACTS,academicSignalsForCareer,HEALTHCARE_MEDIAN_CONTEXT,SKKU_2025_RESULT_REPORT_PDF} from '../village/career-academic-evidence-v28.js';
assert.equal(CAREERS.length,100);
assert.equal(Object.keys(ADMISSION_REFERENCES).length,8);
assert.equal(ADMISSION_REFERENCES.medicine.percentiles.join(','),'98,100,98,100');
assert(SKKU_2025_RESULT_REPORT_PDF.startsWith('https://school.busanedu.net/'));
assert(SKKU_2025_RESULT_REPORT_PDF.endsWith('.pdf'));
// Extracted from the source's regular admissions table, final-registration
// student at the 70% position (Korean, mathematics and two electives).
const verifiedRows={medicine:[98,100,98,100],pharmacy:[99,98,100,94],
 semiconductor:[95,98,96,94],software:[97,98,87,97],
 economics:[96,93,92,91],mathematics:[94,95,94,96],
 engineering:[86,97,90,100],business:[98,87,94,91]};
for(const [key,percentiles] of Object.entries(verifiedRows))
 assert.deepEqual(ADMISSION_REFERENCES[key].percentiles,percentiles,'Published SKKU 2025 table mismatch: '+key);
assert.equal(VERIFIED_EXAM_FACTS.cpa.passedPer10000ExamTakers,2633);
assert.equal(VERIFIED_EXAM_FACTS.bar.passedPer10000ExamTakers,5095);

const find=name=>{const c=CAREERS.find(c=>c.name===name);assert(c,name);return academicSignalsForCareer(c);};
const doctor=find('일반의사');
assert.equal(doctor.admission.per10000SubjectMeanEquivalent,100);
assert(doctor.mandatory.includes('의과대학'));
const pharmacy=find('약사 및 한약사');
assert.equal(pharmacy.admission.per10000SubjectMeanEquivalent,225);
const robot=find('지능형 로봇개발자');
assert.equal(robot.admission.per10000SubjectMeanEquivalent,525);
const cpa=find('회계사');
assert.equal(cpa.exam.passedPer10000ExamTakers,2633);
const lawyer=find('변호사');
assert.equal(lawyer.exam.passedPer10000ExamTakers,5095);
const cleaner=find('청소원');
assert.equal(cleaner.admission,null);
assert.equal(cleaner.exam,null);
for(const c of CAREERS){
 const e=academicSignalsForCareer(c);
 assert.equal(e.minimumNationalStudentRankPer10000,null);
 assert(e.mandatory.length>12);
 if(e.admission){
   assert(e.admission.percentiles.length===4);
   assert(e.admission.caution.includes('전국 종합석차'));
 }
 if(e.exam)assert(e.exam.caution.includes('응시'));
}
assert.equal(HEALTHCARE_MEDIAN_CONTEXT.doctor.meanAnnualWan,28518);
assert.equal(Math.round(28518*10000/2080),137106);
assert.equal(Math.round(8500*10000/2080),40865);
assert(HEALTHCARE_MEDIAN_CONTEXT.doctor.source.startsWith('https://www.mohw.go.kr/'));
console.log('CAREER_STUDY_V28_PASS 100 careers, 8 school comparator sets, conditional CPA and bar denominators, no fabricated national rank, government MD pay context');
