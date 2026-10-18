export const ECOLOGY_KEY='sparkle-village-ecology-v1';
const KIDS=new Set(['tae','se']);
const SUBJECTS=new Set(['math','korean','english','hanja']);
const TIERS=new Set(['memory-7','memory-14','memory-30']);
const SAFE_EVENT=/^[a-zA-Z0-9:_-]{1,420}$/;
const MAX_EVENTS=5000;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const bag=()=>Object.create(null);
const blankProfile=()=>({events:bag()});
export const emptyEcology=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});

export const ECOLOGIES=Object.freeze({
  'number-garden':{id:'number-garden',subject:'math',emoji:'🌻',name:'수의 정원',art:'flowers_sun'},
  'measure-river':{id:'measure-river',subject:'math',emoji:'💧',name:'측정 물길',art:'pond'},
  'pattern-grove':{id:'pattern-grove',subject:'math',emoji:'🌳',name:'별무늬 숲',art:'tree_lilac'},
  'shape-hill':{id:'shape-hill',subject:'math',emoji:'⛰️',name:'도형 언덕',art:'stepping_stones'},
  'ratio-orchard':{id:'ratio-orchard',subject:'math',emoji:'🍎',name:'비율 과수원',art:'picnic_basket'},
  'word-flower':{id:'word-flower',subject:'korean',emoji:'🌸',name:'말꽃 정원',art:'flowers_pink'},
  'story-library':{id:'story-library',subject:'korean',emoji:'📚',name:'이야기 숲',art:'house_library'},
  'guide-path':{id:'guide-path',subject:'korean',emoji:'🪧',name:'안내 길',art:'signpost'},
  'soundbird-forest':{id:'soundbird-forest',subject:'english',emoji:'🐦',name:'소리새 숲',art:'tree_mint'},
  'listening-meadow':{id:'listening-meadow',subject:'english',emoji:'🎧',name:'듣기 초원',art:'flowers_blue'},
  'sentence-moon':{id:'sentence-moon',subject:'english',emoji:'🌙',name:'문장 달빛숲',art:'house_moon'},
  'sequence-trail':{id:'sequence-trail',subject:'english',emoji:'🧭',name:'순서 탐험길',art:'bridge_stone'},
  'hanja-scroll-grove':{id:'hanja-scroll-grove',subject:'hanja',emoji:'📜',name:'한자 두루마리 숲',art:'house_library'}
});

const includesAny=(text,terms)=>terms.some(term=>text.includes(term));
export function ecologyForSkill(subject,skill){
  const s=String(skill||'').toLowerCase();
  if(subject==='math'){
    if(includesAny(s,['geometry','도형','삼각','직사각','각도','좌표','둘레','넓이']))return 'shape-hill';
    if(includesAny(s,['길이','단위','측정','시간','시계','무게','들이','measure']))return 'measure-river';
    if(includesAny(s,['분수','비율','백분율','소수','fraction','ratio','percent']))return 'ratio-orchard';
    if(includesAny(s,['규칙','pattern','logic','논리','분류','추론']))return 'pattern-grove';
    return 'number-garden';
  }
  if(subject==='korean'){
    if(includesAny(s,['안내','절차','순서','위치','조건','길 안내']))return 'guide-path';
    if(includesAny(s,['낱말','음절','소리','글자','어휘','첫 음절']))return 'word-flower';
    return 'story-library';
  }
  if(subject==='english'){
    if(includesAny(s,['cvc','phon','첫소리','첫 글자','단어 읽기','단어 조립']))return 'soundbird-forest';
    if(includesAny(s,['듣기','지시']))return 'listening-meadow';
    if(includesAny(s,['순서','위치','준비물','조건','기억']))return 'sequence-trail';
    return 'sentence-moon';
  }
  if(subject==='hanja')return 'hanja-scroll-grove';
  return '';
}

function cleanEvent(id,value){
 if(!SAFE_EVENT.test(id)||!plain(value)||value.type!=='memory'||!TIERS.has(value.tier)||
    !SUBJECTS.has(value.subject)||typeof value.roundId!=='string'||!value.roundId||value.roundId.length>128||
    !Number.isSafeInteger(value.at)||value.at<0||!Array.isArray(value.skills))return null;
 const skills=[...new Set(value.skills.filter(skill=>typeof skill==='string'&&skill.length>0&&skill.length<=160))].slice(0,12);
 if(!skills.length)return null;
 return {type:'memory',tier:value.tier,subject:value.subject,roundId:value.roundId,at:value.at,skills};
}
export function cleanEcology(raw){
 const out=emptyEcology();
 if(!plain(raw)||raw.version!==1)return out;
 for(const who of KIDS){
  const source=raw.profiles?.[who]?.events;
  if(!plain(source))continue;
  const entries=Object.entries(source);
  if(entries.length>MAX_EVENTS)throw new Error('배움 생태계 기록 저장 한도를 초과했어요.');
  for(const [id,value] of entries){
   const event=cleanEvent(id,value);if(event)out.profiles[who].events[id]=event;
  }
 }
 return out;
}
export function recordEcologyMemory(state,{who,subject,tier,roundId,skills,at=Date.now()}){
 if(!KIDS.has(who)||!SUBJECTS.has(subject)||!TIERS.has(tier)||typeof roundId!=='string'||!roundId||
    roundId.length>128||!Number.isSafeInteger(at)||at<0||!Array.isArray(skills))
  throw new Error('배움 생태계 기록을 확인해 주세요.');
 const normalized=[...new Set(skills.filter(skill=>typeof skill==='string'&&skill.length>0&&skill.length<=160))].slice(0,12);
 if(!normalized.length)return {state:cleanEcology(state),added:false,eventId:''};
 const out=cleanEcology(state),id='ecology:'+tier+':'+roundId,added=!out.profiles[who].events[id];
 if(added)out.profiles[who].events[id]={type:'memory',tier,subject,roundId,at,skills:normalized};
 return {state:out,added,eventId:id};
}
function tierRank(tier){return tier==='memory-30'?3:tier==='memory-14'?2:tier==='memory-7'?1:0;}
export function ecologySnapshot(state,who){
 if(!KIDS.has(who))throw new Error('학습자를 확인해 주세요.');
 const clean=cleanEcology(state),events=Object.values(clean.profiles[who].events),map=new Map();
 for(const event of events){
  const grouped=new Map();
  for(const skill of event.skills){
   const id=ecologyForSkill(event.subject,skill);
   if(!id)continue;
   if(!grouped.has(id))grouped.set(id,new Set());
   grouped.get(id).add(skill);
  }
  for(const [id,skills] of grouped){
   const row=map.get(id)||{...ECOLOGIES[id],events:0,memory7:0,memory14:0,memory30:0,tier:'',skills:new Set()};
   row.events++;
   if(event.tier==='memory-7')row.memory7++;
   else if(event.tier==='memory-14')row.memory14++;
   else if(event.tier==='memory-30')row.memory30++;
   if(tierRank(event.tier)>tierRank(row.tier))row.tier=event.tier;
   for(const skill of skills)row.skills.add(skill);
   map.set(id,row);
  }
 }
 const habitats=Object.values(ECOLOGIES).map(base=>{
   const row=map.get(base.id);
   if(!row)return {...base,events:0,memory7:0,memory14:0,memory30:0,tier:'',skills:[]};
   return {...row,skills:[...row.skills].slice(0,5)};
 });
 return {who,habitats,guardianTree:events.some(e=>e.tier==='memory-30'),
   totals:{events:events.length,memory7:events.filter(e=>e.tier==='memory-7').length,
    memory14:events.filter(e=>e.tier==='memory-14').length,memory30:events.filter(e=>e.tier==='memory-30').length}};
}
export function familyEcologySnapshot(state){
 const clean=cleanEcology(state),merged=emptyEcology();
 Object.assign(merged.profiles.tae.events,clean.profiles.tae.events);
 for(const [id,event] of Object.entries(clean.profiles.se.events))merged.profiles.tae.events['se:'+id]=event;
 return ecologySnapshot(merged,'tae');
}
export function mergeEcology(current,incoming){
 const a=cleanEcology(current),b=cleanEcology(incoming);
 for(const who of KIDS)Object.assign(a.profiles[who].events,b.profiles[who].events);
 return cleanEcology(a);
}
let inMemory=emptyEcology(),dirty=false;
export function loadEcology(storage=globalThis.localStorage){
 if(dirty)return cleanEcology(inMemory);
 try{
  const raw=storage?.getItem(ECOLOGY_KEY);
  inMemory=raw?cleanEcology(JSON.parse(raw)):emptyEcology();
  return cleanEcology(inMemory);
 }catch{return cleanEcology(inMemory);}
}
export function saveEcology(state,storage=globalThis.localStorage){
 inMemory=dirty?mergeEcology(inMemory,state):cleanEcology(state);dirty=true;
 if(!storage)return false;
 try{
  const raw=storage.getItem(ECOLOGY_KEY);
  if(raw)inMemory=mergeEcology(cleanEcology(JSON.parse(raw)),inMemory);
  storage.setItem(ECOLOGY_KEY,JSON.stringify(inMemory));dirty=false;return true;
 }catch{return false;}
}
export function exportEcology(storage=globalThis.localStorage){return cleanEcology(loadEcology(storage));}
export function importEcology(raw,storage=globalThis.localStorage){
 const merged=mergeEcology(loadEcology(storage),raw);saveEcology(merged,storage);return merged;
}
