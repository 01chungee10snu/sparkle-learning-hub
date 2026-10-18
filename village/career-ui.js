import {CAREERS,CAREER_GROUPS,CAREER_SOURCES} from './career-library.js';
import {academicSignalsForCareer,HEALTHCARE_MEDIAN_CONTEXT} from './career-academic-evidence-v28.js';
import {ARCHIVED_CAREER_NAMES} from './career-state.js';

const subjects={math:['💎','수학'],korean:['🌸','국어'],english:['🪶','영어'],hanja:['🖋️','한자']};
const subjectIds=Object.keys(subjects);
const money=n=>Number(n).toLocaleString('ko-KR');
const el=(tag,klass='',value='')=>{
 const node=document.createElement(tag);
 if(klass)node.className=klass;
 if(value)node.textContent=String(value);
 return node;
};
const small=(txt)=>el('p','career-detail-copy',txt);
const sourceLink=(label,url)=>{
 const a=el('a','career-source-link',label+' ↗');
 a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
function addDetail(parent,heading,text){
 const section=el('section','career-detail-section');
 section.append(el('h4','',heading),small(text));parent.append(section);
}
const pairList=Object.freeze([
 ['math','korean'],['math','english'],['math','hanja'],
 ['korean','english'],['korean','hanja'],['english','hanja']
]);
/**
 * Profession names/median annual wage & education come from official Korean
 * occupational sources. "1 out of 10,000 rank" is never generated: those
 * admission cutoffs are not occupational statistics and cannot be inferred
 * from the surveyed incumbent educational distribution.
 *
 * Two different subjects cost 1 virtual learning credit each to open an
 * evidence page forever. All source links and the children's mission stay free.
 */
export function mountCareerExplorer(container,{
 dreams=[],unlocked=[],available={},selectedId='',onSelect,onDream,onTravel,onUnlock
}={}){
 if(!(container instanceof Element))throw new TypeError('Career container required');
 const state={group:'all',term:'',sort:'wage',selected:selectedId,
              dreams:new Set(dreams),unlocked:new Set(unlocked)};
 const intro=el('p','career-promise','직업 100가지 · 어떤 꿈을 선택할까?');
 const ribbon=el('p','career-integrity','커리어넷 직업별 임금 중앙값을 기준으로 정렬할 수 있어요. 직업의 존엄성·사회적 위세·진입 시험 등수를 매긴 것이 아닙니다.');
 const socioeconomic=el('p','career-oecd-evidence',
  '📊 OECD 2025: 한국 고등교육 이수 근로자의 소득은 고졸 근로자보다 집단 평균 31% 높았습니다. 공부는 선택지를 넓힐 수 있지만, 개개인의 시험점수나 소득을 보장하지 않습니다.');
 const layout=el('div','career-explorer'),filters=el('div','career-filters'),
   search=el('input','career-search'),sortControl=el('select','career-sort'),
   grid=el('div','career-grid'),details=el('section','career-details');
 search.type='search';search.maxLength=30;search.autocomplete='off';
 search.placeholder='🔎 궁금한 직업 찾기';
 search.setAttribute('aria-label','직업 이름 검색');
 sortControl.setAttribute('aria-label','직업 목록 정렬');
 for(const [key,name] of [
  ['wage','연봉 중앙값 높은 순 (100개 내)'],
  ['wageAsc','연봉 중앙값 낮은 순 (100개 내)'],
  ['name','이름 가나다순']
 ]){
  const option=el('option','',name);option.value=key;sortControl.append(option);
 }
 sortControl.value='wage';
 const toolbar=el('div','career-toolbar');
 toolbar.append(search,sortControl);
 filters.setAttribute('aria-label','직업 분야 선택');
 const options=[{id:'all',name:'전체',emoji:'✨'},...CAREER_GROUPS],buttons=new Map();
 for(const group of options){
  const button=el('button','career-filter',group.emoji+' '+group.name);
  button.type='button';button.setAttribute('aria-pressed',String(group.id==='all'));
  button.addEventListener('click',()=>{
   state.group=group.id;
   for(const [id,control] of buttons)control.setAttribute('aria-pressed',String(id===state.group));
   updateGrid();
  });
  buttons.set(group.id,button);filters.append(button);
 }
 const count=el('p','career-count');
 function updateGrid(){
  grid.replaceChildren();
  const listed=CAREERS.filter(c=>(state.group==='all'||c.group===state.group)&&
    (!state.term||(c.name+' '+c.mission).includes(state.term)));
  if(state.sort==='name')listed.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  else if(state.sort==='wageAsc')listed.reverse();
  count.textContent='직업 '+listed.length+'개 · 내 꿈 후보 '+state.dreams.size+'개 · 통계 상세 해금 '+state.unlocked.size+'개';
  for(const c of listed){
   const b=el('button','career-card');
   b.type='button';b.dataset.career=c.id;
   if(state.selected===c.id)b.setAttribute('aria-pressed','true');
   const art=el('span','career-card-icon',c.emoji),
     title=el('span','career-card-label',c.name),
     note=el('span','career-card-caption',c.mission),
     fav=el('span','career-saved-mark',
       [state.dreams.has(c.id)?'💖 내 꿈 후보':'',
        state.unlocked.has(c.id)?'📚 상세 열람 완료':''].filter(Boolean).join(' · '));
   b.append(art,title,note,fav);
   b.addEventListener('click',()=>showDetail(c.id));
   grid.append(b);
  }
  if(!listed.length)grid.append(small('검색한 이름의 직업이 없어요. 다른 단어로 찾아봐요.'));
 }
 function showDetail(id){
  const c=CAREERS.find(c=>c.id===id);if(!c)return;
  state.selected=id;onSelect?.(id);details.replaceChildren();
  details.classList.add('selected');
  const backToList=()=>{
   state.selected='';onSelect?.('');details.replaceChildren();
   details.classList.remove('selected');updateGrid();
   grid.scrollIntoView({block:'start',behavior:'auto'});
  };
  const back=()=>{
   const b=el('button','career-return-button','← 다른 직업 100가지 둘러보기');
   b.type='button';b.addEventListener('click',backToList);return b;
  };
  details.append(back());
  details.append(el('div','career-detail-icon',c.emoji),el('h3','career-detail-name',c.name));
  const group=CAREER_GROUPS.find(g=>g.id===c.group);
  details.append(el('p','career-detail-category',group.emoji+' '+group.name));
  addDetail(details,'🌎 어떤 일을 할까?',c.mission);
  addDetail(details,'✨ 사회에 어떻게 기여할까?',c.impact);
  addDetail(details,'📚 어떤 공부와 역량을 기를까?',c.journey);
  addDetail(details,'🎯 오늘의 작은 직업 체험',c.tryIt);
  const bookmark=el('button','career-bookmark',state.dreams.has(id)?'💖 꿈 후보에서 빼기':'💗 내 꿈 후보로 담기');
  bookmark.type='button';bookmark.addEventListener('click',()=>onDream?.(id));
  details.append(bookmark);
  const facts=el('section','career-fact-panel');
  facts.append(el('h4','','📖 직업사전 통계와 배움의 증거'));
  if(state.unlocked.has(id)){
   facts.classList.add('unlocked');
   const medicalMean=HEALTHCARE_MEDIAN_CONTEXT[c.id]||null;
   if(medicalMean){
    facts.append(el('strong','career-official-health-mean',
      '보건복지부 '+medicalMean.year+'년 '+(c.id==='doctor'?'의사 전체 ':'')+'평균 보수 '+money(medicalMean.meanAnnualWan)+'만원'));
    facts.append(el('strong','career-health-hourly',
      '연 2,080시간 가정 시 시간당 환산 약 '+money(Math.round(medicalMean.meanAnnualWan*10000/2080))+'원'));
    facts.append(small(medicalMean.population+' '+medicalMean.measure));
    facts.append(small('최신 평균과 아래 커리어넷 중앙값은 조사 모집단·통계량·연도가 달라 차액이 임금 인상액을 뜻하지 않습니다.'));
    facts.append(sourceLink('보건복지부 2026년 발표 원자료',medicalMean.source));
   }
   facts.append(el('strong','career-wage-annual','연봉 중앙값 '+money(c.annualMedianWan)+'만원'));
   facts.append(el('strong','career-wage-hourly','시간당 단순 환산 약 '+money(c.hourlyEquivalentWon)+'원'));
   facts.append(small('계산: 연봉 중앙값 '+money(c.annualMedianWan*10000)+'원 ÷ 2,080시간(주 40시간×52주). 실제 시간당 임금·근로시간·개인 소득이 아닙니다.'));
   facts.append(el('p','career-data-vintage',
    '자료: '+c.wageSurveyYear+'년 '+c.wageSourceLabel+
    (c.wageIsRelatedOccupationProxy?' · ⚠ 해당 직업이 아닌 관련 직업의 대체 수치':' 해당 직업 통계')));
   const ed=c.educationBachelorPlusPct;
   facts.append(el('strong','career-education',
    ed===null?'종사자 학력: 공식 분포 자료 없음':
      '조사된 종사자의 대졸 이상 비율 '+ed+'%'));
   if(c.educationSourceLabel)facts.append(small('학력분포 조사 출처: '+c.educationSourceLabel));
   if(c.educationDistribution){
    const table=el('div','career-education-distribution');
    for(const [level,percentage] of Object.entries(c.educationDistribution)){
     const block=el('span','career-education-level',
       level+' '+percentage+'%');table.append(block);
    }
    facts.append(table);
   }
   facts.append(small('이것은 현재 종사자 표본의 학력 분포이며, 진입에 필요한 학력·학생 석차·합격 커트라인을 뜻하지 않습니다.'));
   const evidence=academicSignalsForCareer(c),study=el('section','career-study-evidence');
   study.append(el('h4','','🎓 입학·전문자격 공부 난도 · 출처가 있는 비교 사례'));
   addDetail(study,'반드시 갖추어야 할 자격과 교육',evidence.mandatory);
   if(evidence.admission){
     const u=evidence.admission;
     study.append(el('strong','career-university-benchmark',
       '대학 진학 사례: '+u.program+' · '+u.studentYear+'학년도 정시 · '+u.cut));
     study.append(el('strong','career-university-percentiles',
       '국어 '+u.percentiles[0]+' · 수학 '+u.percentiles[1]+' · 탐구1 '+u.percentiles[2]+' · 탐구2 '+u.percentiles[3]+' 백분위'));
     study.append(el('strong','career-rank-equivalent',
       '1만 명 백분위 감각지표: 상위 약 '+money(u.per10000SubjectMeanEquivalent)+'명 수준에 해당'));
     study.append(small('계산: (100 − 네 영역 백분위 평균 '+u.percentileMean+') × 100 = '+u.per10000SubjectMeanEquivalent+'명.'));
     study.append(small('⚠ '+u.caution));
     study.append(small('⚠ '+evidence.pathNote));
     study.append(sourceLink('대입정보포털 어디가 · 2025학년도 정시 원문',u.sourceUrl));
   }
   if(evidence.exam){
     const e=evidence.exam;
     study.append(el('strong','career-exam-benchmark',
       '전문자격시험 사례: '+e.name+' · '+money(e.participants)+'명 응시, '+money(e.passed)+'명 합격 ('+e.ratePercent+'%)'));
     study.append(el('strong','career-exam-equivalent',
       '자격시험 응시자 1만 명을 기준으로 약 '+money(e.passedPer10000ExamTakers)+'명 합격'));
     study.append(small('계산: '+e.passed+' ÷ '+e.participants+' × 10,000. '+e.requiredPreviousStep+'.'));
     study.append(small('⚠ '+e.caution));
     if(evidence.examIsRouteOnly)
       study.append(small('이 시험 통계는 법률 전문자격 취득 경로의 참고값이며 해당 직업의 별도 임용률이 아닙니다.'));
     study.append(sourceLink('국가 전문자격시험 공식 발표',e.sourceUrl));
   }
   if(!evidence.admission&&!evidence.exam)
     study.append(el('strong','career-no-statistical-cutoff',
       '검증 가능한 해당 학업·시험 선택 난도의 정량 사례가 없어 단정하지 않습니다.'));
   study.append(el('strong','career-national-rank-warning',
     '이 직업에 필요한 학생의 필수 전국 석차: 직업별 공식 통계 없음'));
   study.append(small('대학 합격자의 국수탐 백분위와 전문자격시험 응시자 합격률은 서로 다른 지표입니다. 이를 합쳐 직업의 우열이나 미래 소득을 예언할 수 없습니다.'));
   facts.append(study);
  }else{
   facts.classList.add('locked');
   facts.append(small('🗝️ 연봉 중앙값, 시간당 환산, 학력분포 등 출처가 있는 상세 통계는 서로 다른 두 과목의 배움 화폐로 한 번 열면 계속 읽을 수 있어요.'));
   const holdings=el('div','career-balance');
   for(const subject of subjectIds){
    const [emoji,name]=subjects[subject],value=Number(available[subject]||0);
    holdings.append(el('span','',emoji+' '+name+' '+value));
   }
   facts.append(holdings);
   const unlockOptions=el('div','career-unlock-options');
   for(const pair of pairList){
    const costs=pair.map(id=>subjects[id][0]+' '+subjects[id][1]+' 1개').join(' + ');
    const b=el('button','career-unlock-button','📜 '+costs+'로 영구 해금');
    b.type='button';b.disabled=!pair.every(s=>(available[s]||0)>=1);
    b.addEventListener('click',()=>onUnlock?.(id,pair));
    unlockOptions.append(b);
   }
   facts.append(unlockOptions);
   if(!pairList.some(pair=>pair.every(s=>(available[s]||0)>=1)))
    facts.append(small('지금은 자원이 부족해요. 서로 다른 두 과목의 새로운 문제를 스스로 풀면 돼요.'));
  }
  facts.append(sourceLink('커리어넷 원자료 무료로 확인',c.sourceUrl));
  facts.append(sourceLink('한국직업사전 직무·자격 기준',CAREER_SOURCES[0].url));
  details.append(facts);
  const related=el('div','career-related');
  related.append(el('h4','','나의 마법마을 공부와 연결하기'));
  for(const subject of c.subjects){
   const [emoji,name]=subjects[subject],
     b=el('button','career-subject-button',emoji+' '+name+' 학습관으로 이동');
   b.type='button';b.addEventListener('click',()=>onTravel?.(subject));
   related.append(b);
  }
  details.append(related,back());
  updateGrid();
  details.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 search.addEventListener('input',()=>{state.term=search.value.trim().slice(0,30);updateGrid();});
 sortControl.addEventListener('change',()=>{state.sort=sortControl.value;updateGrid();});
 layout.append(filters,toolbar,count,grid,details);
 const oldDreams=[...state.dreams].filter(id=>!CAREERS.some(c=>c.id===id)&&Object.hasOwn(ARCHIVED_CAREER_NAMES,id));
 if(oldDreams.length){
  const archive=el('div','career-legacy-records');
  archive.append(el('h4','','🗂️ 이전 꿈 후보 보존'));
  archive.append(small('이전에 선택한 직업명이 새 공식 직업정보와 일대일로 대응하지 않아 기존 기록을 그대로 남겼어요.'));
  for(const id of oldDreams)archive.append(el('p','',ARCHIVED_CAREER_NAMES[id]));
  container.append(archive);
 }
 const sourceBox=el('div','career-refs');
 sourceBox.append(small('공식 자료: 커리어넷의 소득·학력, 한국직업사전의 직무, OECD의 교육·소득 통계. 서로 다른 조사연도의 임금을 직접 비교하는 데는 한계가 있어요.'));
 for(const source of CAREER_SOURCES)sourceBox.append(sourceLink(source.label,source.url));
 container.append(intro,ribbon,socioeconomic,layout,sourceBox);
 updateGrid();
 if(state.selected)showDetail(state.selected);
 return {
  updateDreams(next){state.dreams=new Set(next||[]);updateGrid();if(state.selected)showDetail(state.selected);}
 };
}
