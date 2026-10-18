import {CAREER_DATA} from './career-data-v27.js';
import {academicSignalsForCareer} from './career-academic-evidence-v28.js';

/** 100 deliberately sampled, source-documented professions.
 * Ordering is annual median wage in the source sample, NOT social prestige,
 * academic ability, social worth, fairness or individual life outcomes.
 */
export const CAREER_SOURCES=Object.freeze([
 Object.freeze({label:'한국직업사전 · 직무·자격',url:'https://www.work.go.kr/consltJobCarpa/srch/jobDic/jobDicIntro.do'}),
 Object.freeze({label:'커리어넷 직업백과 · 소득·교육',url:'https://www.career.go.kr/cloud/m/job/list'}),
 Object.freeze({label:'OECD 2025 · 교육과 소득',url:'https://www.oecd.org/en/publications/education-at-a-glance-2025_1a3543e2-en/korea_252c9ed2-en.html'})
]);
export const CAREER_GROUPS=Object.freeze([
 Object.freeze({id:'medical',name:'의료·생명',emoji:'🩺'}),
 Object.freeze({id:'tech',name:'AI·공학·우주',emoji:'🚀'}),
 Object.freeze({id:'justice',name:'법·공공·안전',emoji:'⚖️'}),
 Object.freeze({id:'leadership',name:'경제·경영',emoji:'🏛️'}),
 Object.freeze({id:'creative',name:'교육·창작',emoji:'🎨'}),
 Object.freeze({id:'planet',name:'생활·환경·미래',emoji:'🌎'})
]);
const GROUP_IDS=new Set(CAREER_GROUPS.map(g=>g.id));
const SUBJECT_IDS=new Set(['math','korean','english','hanja']);
export const CAREERS=Object.freeze(CAREER_DATA.map(raw=>{
 if(!raw||!/^(career-\d+|[a-z][a-z-]+)$/.test(raw.id)||
    !GROUP_IDS.has(raw.group)||!Array.isArray(raw.subjects)||
    raw.subjects.length!==2||new Set(raw.subjects).size!==2||
    !raw.subjects.every(s=>SUBJECT_IDS.has(s))||
    !Number.isSafeInteger(raw.annualMedianWan)||raw.annualMedianWan<=0||
    !Number.isSafeInteger(raw.hourlyEquivalentWon)||raw.hourlyEquivalentWon<=0||
    ![2021,2023].includes(raw.wageSurveyYear)||
    !/^https:\/\/www\.career\.go\.kr\/cloud\/m\/job\/view\?seq=\d+$/.test(raw.sourceUrl)||
    raw.requiredStudentRankPer10000!==null)
    throw new Error('Career source audit failed');
 return Object.freeze({...raw,subjects:Object.freeze([...raw.subjects]),academic:academicSignalsForCareer(raw)});
}));
if(CAREERS.length!==100||new Set(CAREERS.map(c=>c.id)).size!==100||
   new Set(CAREERS.map(c=>c.name)).size!==100)
 throw new Error('Exactly 100 unique source-matched careers required');
export const CAREER_BY_ID=new Map(CAREERS.map(c=>[c.id,c]));
export const findCareer=id=>CAREER_BY_ID.get(id)||null;
