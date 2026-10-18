import {CAREERS,CAREER_GROUPS,CAREER_SOURCES} from './career-library.js';

const subjects={math:['💎','수학'],korean:['🌸','국어'],english:['🪶','영어'],hanja:['🖋️','한자']};
const el=(tag,klass='',value='')=>{
 const node=document.createElement(tag);if(klass)node.className=klass;
 if(value)node.textContent=value;return node;
};
const small=(txt)=>el('p','career-detail-copy',txt);
/** Pure child-friendly DOM; profile data uses textContent, not untrusted HTML. */
export function mountCareerExplorer(container,{dreams=[],onDream,onTravel}={}){
 if(!(container instanceof Element))throw new TypeError('Career container required.');
 const state={group:'all',term:'',selected:'',dreams:new Set(dreams)};
 const intro=el('p','career-promise','나는 무엇을 잘하고 싶을까? 큰 꿈은 질문에서 시작돼요.');
 const ribbon=el('p','career-integrity','높은 전문성과 사회적 영향력을 가진 진로부터 살펴봐요. 사람을 돕는 모든 일은 소중하며, 실제 소득과 기회는 달라질 수 있어요.');
 const layout=el('div','career-explorer'),filters=el('div','career-filters'),
       search=el('input','career-search'),grid=el('div','career-grid'),
       details=el('section','career-details');
 search.type='search';search.maxLength=30;search.autocomplete='off';
 search.placeholder='🔎 궁금한 직업 찾기';
 search.setAttribute('aria-label','직업 이름 검색');
 filters.setAttribute('aria-label','직업 분야 선택');
 const options=[{id:'all',name:'전체',emoji:'✨'},...CAREER_GROUPS];
 const buttons=new Map();
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
  const listed=CAREERS.filter(c=>(state.group==='all'||c.group===state.group) &&
    (!state.term||(c.name+' '+c.mission).includes(state.term)));
  count.textContent='발견할 직업 '+listed.length+'개 · 내 꿈 후보 '+state.dreams.size+'개';
  for(const c of listed){
   const b=el('button','career-card');
   b.type='button';b.dataset.career=c.id;
   if(state.selected===c.id)b.setAttribute('aria-pressed','true');
   const art=el('span','career-card-icon',c.emoji),
         title=el('span','career-card-label',c.name),
         note=el('span','career-card-caption',c.mission);
   const fav=el('span','career-saved-mark',state.dreams.has(c.id)?'💖 내 꿈 후보':'');
   b.append(art,title,note,fav);
   b.addEventListener('click',()=>showDetail(c.id));
   grid.append(b);
  }
  if(!listed.length)grid.append(small('검색한 이름의 직업이 없어요. 다른 단어로 찾아봐요.'));
 }
 function showDetail(id){
  const c=CAREERS.find(c=>c.id===id);if(!c)return;
  state.selected=id;details.replaceChildren();
  details.classList.add('selected');
  details.append(el('div','career-detail-icon',c.emoji),el('h3','career-detail-name',c.name));
  const group=CAREER_GROUPS.find(g=>g.id===c.group);
  details.append(el('p','career-detail-category',group.emoji+' '+group.name));
  const add=(heading,text)=>{
   const section=el('section','career-detail-section');
   section.append(el('h4','',heading),small(text));details.append(section);
  };
  add('🌎 어떤 일을 할까?',c.mission);
  add('✨ 세상에 어떤 도움이 될까?',c.impact);
  add('📚 어떤 힘을 기를까?',c.journey);
  add('🎯 오늘 해 볼 어린이 미션',c.tryIt);
  const bookmark=el('button','career-bookmark',state.dreams.has(id)?'💖 꿈 후보에서 빼기':'💗 내 꿈 후보로 담기');
  bookmark.type='button';bookmark.addEventListener('click',()=>onDream?.(id));
  details.append(bookmark);
  const related=el('div','career-related');
  related.append(el('h4','','나의 마법마을 공부와 연결하기'));
  for(const subject of c.subjects){
   const [emoji,name]=subjects[subject];
   const b=el('button','career-subject-button',emoji+' '+name+' 학습관으로 이동');
   b.type='button';b.addEventListener('click',()=>onTravel?.(subject));
   related.append(b);
  }
  details.append(related);
  updateGrid();
  details.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 search.addEventListener('input',()=>{state.term=search.value.trim().slice(0,30);updateGrid();});
 layout.append(filters,search,count,grid,details);
 const sourceBox=el('div','career-refs');
 sourceBox.append(small('보호자 참고: 한국의 직업정보·진로 경로는 공식 자료에서 더 자세히 확인할 수 있어요.'));
 for(const source of CAREER_SOURCES){
  const a=el('a','career-source-link',source.label+' ↗');
  a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';sourceBox.append(a);
 }
 container.append(intro,ribbon,layout,sourceBox);
 updateGrid();
 return {updateDreams(next){
  state.dreams=new Set(next||[]);
  updateGrid();if(state.selected)showDetail(state.selected);
 }};
}
