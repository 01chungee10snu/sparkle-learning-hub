/**
 * Evidence-based education and credential-selectivity examples.
 *
 * IMPORTANT: Official admission 70% data are the subject percentiles of one
 * admitted student at the 70% enrollment position, NOT a composite nationwide
 * aptitude rank. Averaging four subject percentiles and converting the average
 * to a notional "out of 10,000" is an intentionally labelled ILLUSTRATION.
 * It is NEVER a legal qualification or cutoff to pursue a profession.
 */
// Original university-format public report, 2025 regular admission 70% student
// subject percentiles, page 7. Hosted by a Korean public-school portal.
// Verified against the source PDF on 2026-10-19 (medical, pharmacy, engineering,
// software, economics, mathematics, business and semiconductor programmes).
export const SKKU_2025_RESULT_REPORT_PDF='https://school.busanedu.net/upload/bbs/files/2025/hgschl/gaesung-h/ntt/1018346/09/9f8ddfc0ec73bd16a66881809e2ab2d8.pdf';
const ADMISSION_URL='https://www.adiga.kr/ucp/uvt/uni/univDetailSelection.do?menuId=PCUVTINF2000&searchSyr=2026&unvCd=0000133';
export const ADMISSION_REFERENCES=Object.freeze({
 medicine:Object.freeze({program:'성균관대학교 의예과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 가군',percentiles:[98,100,98,100],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 pharmacy:Object.freeze({program:'성균관대학교 약학과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 가군',percentiles:[99,98,100,94],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 semiconductor:Object.freeze({program:'성균관대학교 반도체시스템공학과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 가군',percentiles:[95,98,96,94],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 software:Object.freeze({program:'성균관대학교 지능형소프트웨어학과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 가군',percentiles:[97,98,87,97],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 economics:Object.freeze({program:'성균관대학교 글로벌경제학과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 가군',percentiles:[96,93,92,91],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 mathematics:Object.freeze({program:'성균관대학교 수학교육과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 나군',percentiles:[94,95,94,96],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 engineering:Object.freeze({program:'성균관대학교 공학계열',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 나군',percentiles:[86,97,90,100],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL}),
 business:Object.freeze({program:'성균관대학교 경영학과',studentYear:2025,studentAdmission:'정시 수능위주 일반전형 나군',percentiles:[98,87,94,91],cut:'최종등록자 70% 컷(과목별 백분위 요약)',sourceUrl:ADMISSION_URL})
});
const admissionAcademic=key=>{
 const benchmark=ADMISSION_REFERENCES[key];
 if(!benchmark)throw new Error('Unknown admission benchmark');
 const total=benchmark.percentiles.reduce((a,b)=>a+b,0);
 const mean=total/4;
 return Object.freeze({...benchmark,kind:'admission_example',
  percentileMean:mean,
  per10000SubjectMeanEquivalent:Math.round((100-mean)*100),
  percentileDomains:Object.freeze(['국어','수학','탐구1','탐구2']),
  methodology:'네 과목 백분위의 산술평균을 1만 명 규모로 환산한 감각지표',
  caution:'과목 백분위 평균은 전국 종합석차가 아닙니다. 합격자 분포를 요약한 과목별 값이므로 한 명의 실제 종합석차가 아니며, 합격 최저선·직업 필수 석차·합격 확률이 아닙니다. 대학·전형·연도·선택과목에 따라 달라집니다.'
 });
};
const EXAMS=Object.freeze({
 cpa:Object.freeze({
  kind:'licence_exam',
  name:'공인회계사 2026년도 제61회 제2차시험',
  examYear:2026,participants:4368,passed:1150,
  requiredPreviousStep:'해당 제2차 시험 응시 자격을 가진 응시자만의 통계',
  sourceUrl:'https://www.fsc.go.kr/no010101/87628',
  caution:'응시자 집단의 한 해 2차 합격률이며, 전체 학생이나 취업 희망자 중 합격 가능성이 아닙니다. 1차시험 합격·유예생 등 서로 다른 자격 상태가 포함됩니다.'
 }),
 bar:Object.freeze({
  kind:'licence_exam',
  name:'변호사시험 2026년도 제15회',
  examYear:2026,participants:3364,passed:1714,
  requiredPreviousStep:'법학전문대학원 학위 취득(예정)자 등 응시요건을 충족한 집단',
  sourceUrl:'https://www.corrections.go.kr/bbs/moj/182/493830/download.do',
  caution:'법학전문대학원 석사 취득 이후 해당 시험 응시자 집단의 합격률입니다. 고등학생/학부생 1만 명 중 변호사가 되는 숫자가 아닙니다.'
 })
});
const verifiedExam=key=>{
 const info=EXAMS[key];if(!info)throw new Error('Unknown credential');
 return Object.freeze({...info,ratePercent:Number((100*info.passed/info.participants).toFixed(2)),
   passedPer10000ExamTakers:Math.round(10000*info.passed/info.participants)});
};
export const VERIFIED_EXAM_FACTS=Object.freeze({cpa:verifiedExam('cpa'),bar:verifiedExam('bar')});

// Proven teaching examples, NOT mandatory university degrees. Distinguish
// the actual legally required major/license from optional elite-school
// examples. Never assign the same admission proxy to every job in a field.
export const PROFESSION_PATHWAYS=Object.freeze({
 doctor:{admission:'medicine',mandatory:'인정된 의과대학·의학전문대학원 교육과 의사 국가시험·면허',pathNote:'성균관대 의예과는 진학 예시일 뿐, 특정 대학 진학이 의무는 아닙니다.'},
 dentist:{mandatory:'치의학 전공 교육과 치과의사 국가시험·면허'},
 'career-37':{mandatory:'한의학 전공 교육과 한의사 국가시험·면허'},
 pharmacist:{admission:'pharmacy',mandatory:'약사·한약사는 각각 다른 관련 전문교육과 면허 요건이 있습니다.',pathNote:'성균관대 약학과 사례는 약사 양성 경로에 해당하며, 한약사 경로에 그대로 적용하지 않습니다.'},
 veterinarian:{mandatory:'수의학 전공 교육과 수의사 국가시험·면허'},
 nurse:{mandatory:'간호학 전공 교육과 간호사 국가시험·면허'},
 lawyer:{exam:'bar',mandatory:'변호사시험 응시요건에 해당하는 법학전문대학원 석사학위 취득(예정) 후 합격·등록. 학부 전공은 특정 학과만으로 제한되지 않습니다.'},
 'career-199':{exam:'bar',examIsRouteOnly:true,mandatory:'검사 임용을 위한 법조 자격과 별도 임용 요건이 필요합니다. 변호사시험 합격은 검사 임용률이 아닙니다.'},
 judge:{exam:'bar',examIsRouteOnly:true,mandatory:'법률 전문가 경력과 법관 임용 심사 등. 변호사시험은 법률자격 취득을 위한 일반적 경로의 참고 지표이며 판사 채용 합격률은 아닙니다.'},
 accountant:{exam:'cpa',mandatory:'공인회계사시험의 응시 요건과 해당 전문 자격시험 합격·등록. 특정 한 대학교나 학부 전공만 필수는 아닙니다.'},
 ceo:{admission:'business',mandatory:'정해진 단일 필수 대학·전공·국가시험 없음.',pathNote:'경영학과는 여러 가능한 진학 사례 중 하나입니다.'},
 economist:{admission:'economics',mandatory:'정해진 단일 필수 대학·전공 없음.',pathNote:'경제학부는 한 연구·학습 경로의 참고 예시입니다.'},
 'robot-engineer':{admission:'software',mandatory:'필수 단일 대학·전공 없음. 로봇·AI·수학 등 복수의 진입 경로가 있습니다.',pathNote:'소프트웨어 전공 진학은 한 가지 선택지입니다.'},
 'ai-researcher':{admission:'software',mandatory:'필수 단일 대학·전공 없음. 수학·컴퓨터·AI 및 실무·연구 경로가 다양합니다.'},
 semiconductor:{admission:'semiconductor',mandatory:'필수 단일 대학·전공 없음. 전자·재료·반도체 교육 및 현장 전문성이 중요합니다.'},
 'career-364':{admission:'engineering',mandatory:'대학 교수 임용·연구 업적 등이 요구되며, 전공·기관별 요건이 다릅니다.'},
 'career-950':{admission:'economics',mandatory:'특정 대학 전공이 모든 투자분석가의 필수 요건은 아닙니다.'},
 'career-239':{admission:'economics',mandatory:'특정 대학 전공이 모든 증권분석가의 필수 요건은 아닙니다.'},
 'career-1089':{admission:'mathematics',mandatory:'중등 교원자격 및 임용 절차 등을 확인해야 합니다. 수학교육과 진학은 자연계 중등교사에 도전하는 여러 경로 중 한 가지입니다.'}
});
export function academicSignalsForCareer(c){
 const guide=PROFESSION_PATHWAYS[c.id]||{};
 const admission=guide.admission?admissionAcademic(guide.admission):null;
 const exam=guide.exam?VERIFIED_EXAM_FACTS[guide.exam]:null;
 return Object.freeze({
  mandatory:guide.mandatory||'직업과 근무기관에 따라 여러 학업·훈련·자격 경로가 있습니다. 해당 직업의 최신 자격조건을 공식 직업사전에서 확인해 주세요.',
  admission,exam,
  examIsRouteOnly:Boolean(guide.examIsRouteOnly),
  pathNote:guide.pathNote||'제시된 상위권 대학의 입결은 특정 교육경로 사례이며 해당 직업의 필수 학업 성적이나 최소 커트라인이 아닙니다.',
  evidencePresent:Boolean(admission||exam),
  minimumNationalStudentRankPer10000:null,
  rankIsEstimatedNotObserved:true
 });
}

// A second official wage statistic (mean rather than median) is separately
// labelled, never substituted into the CareerNet median ranking. Verified
// against the 2026-09-29 Ministry of Health welfare workforce survey release.
const HEALTH_SOURCE='https://www.mohw.go.kr/board.es?act=view&bid=0027&list_no=1492074&mid=a10503010100&nPage=1&tag=';
export const HEALTHCARE_MEDIAN_CONTEXT=Object.freeze({
 doctor:Object.freeze({
  meanAnnualWan:28518,year:2023,
  population:'요양기관 근무 의사 전체(일반의사와 전문의 포함), 주 40시간 이상 상근, 인턴·레지던트 제외',
  measure:'보수월액 기준 연평균 보수(평균), 상하위 1% 보정',source:HEALTH_SOURCE
 }),
 dentist:Object.freeze({
  meanAnnualWan:20277,year:2023,
  population:'요양기관 근무 상근 치과의사, 주 40시간 이상',
  measure:'보수월액 기준 연평균 보수(평균), 상하위 1% 보정',source:HEALTH_SOURCE
 }),
 'career-37':Object.freeze({
  meanAnnualWan:10368,year:2023,
  population:'요양기관 근무 한의사',
  measure:'보수월액 기준 연평균 보수(평균), 상하위 1% 보정',source:HEALTH_SOURCE
 }),
 pharmacist:Object.freeze({
  meanAnnualWan:8426,year:2023,
  population:'요양기관 근무 약사, 한약사와 구분된 모집단',
  measure:'보수월액 기준 연평균 보수(평균), 상하위 1% 보정',source:HEALTH_SOURCE
 }),
 'career-354':Object.freeze({
  meanAnnualWan:5195,year:2023,
  population:'요양기관 근무 간호사',
  measure:'보수월액 기준 연평균 보수(평균), 상하위 1% 보정',source:HEALTH_SOURCE
 })
});
