import {CAREER_BY_ID} from './career-library.js';

export const CAREER_KEY='sparkle-career-dreams-v1';
const CHILDREN=['tae','se'],MAX_ENTRIES=30;
const emptyProfile=()=>({choices:{}});
const empty=()=>({version:1,profiles:{tae:emptyProfile(),se:emptyProfile()}});
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function normalise(raw){
 if(!isPlain(raw)||raw.version!==1||!isPlain(raw.profiles))
  throw new Error('진로 탐색 기록 형식을 확인해 주세요.');
 const data=empty();
 for(const who of CHILDREN){
  const profile=raw.profiles[who];
  if(!isPlain(profile))throw new Error('어린이별 진로 탐색 기록을 확인해 주세요.');
  const records=profile.choices||profile.dreams;
  if(!isPlain(records)||Object.keys(records).length>MAX_ENTRIES)
   throw new Error('꿈 탐색 기록 크기를 확인해 주세요.');
  for(const [id,entry] of Object.entries(records)){
   if(!CAREER_BY_ID.has(id))continue;
   const legacy=Number.isSafeInteger(entry),timestamp=legacy?entry:entry?.at;
   if(!Number.isSafeInteger(timestamp)||timestamp<0||timestamp>Date.now()+86400000)continue;
   const selected=legacy?true:entry.selected===true;
   data.profiles[who].choices[id]={selected,at:timestamp};
  }
 }
 return data;
}
export function loadCareer(storage=globalThis.localStorage){
 try{const raw=storage?.getItem(CAREER_KEY);return raw?normalise(JSON.parse(raw)):empty();}
 catch{return empty();}
}
export function mergeCareer(a,b){
 const copy=normalise(a),other=normalise(b);
 for(const who of CHILDREN)for(const [id,v] of Object.entries(other.profiles[who].choices)){
  const old=copy.profiles[who].choices[id];
  // Latest explicit choice (including unticking) wins across family devices.
  if(!old||v.at>old.at||(v.at===old.at&&v.selected===false))
    copy.profiles[who].choices[id]={...v};
 }
 return copy;
}
export function exportCareer(){return loadCareer();}
export function importCareer(raw,storage=globalThis.localStorage){
 const merged=mergeCareer(loadCareer(storage),normalise(raw));
 try{storage?.setItem(CAREER_KEY,JSON.stringify(merged));return merged;}
 catch{throw new Error('꿈 탐색 기록을 안전하게 저장하지 못했어요.');}
}
export function careerSnapshot(who){
 if(!CHILDREN.includes(who))throw new Error('요정을 선택해 주세요.');
 const choices=loadCareer().profiles[who].choices;
 return Object.keys(choices).filter(id=>choices[id].selected===true);
}
export function toggleDream(who,id,storage=globalThis.localStorage){
 if(!CHILDREN.includes(who)||!CAREER_BY_ID.has(id))throw new Error('직업과 요정을 선택해 주세요.');
 const state=loadCareer(storage),choices=state.profiles[who].choices,old=choices[id];
 if(!old&&Object.keys(choices).length>=MAX_ENTRIES)throw new Error('꿈의 책장이 가득 찼어요.');
 const selected=!old?.selected;
 choices[id]={selected,at:Date.now()};
 try{storage?.setItem(CAREER_KEY,JSON.stringify(normalise(state)));}
 catch{throw new Error('꿈 탐색 기록을 저장하지 못했어요.');}
 return {careerId:id,selected,dreams:Object.keys(choices).filter(key=>choices[key].selected)};
}
