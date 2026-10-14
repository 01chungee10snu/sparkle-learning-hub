import {refinedPortrait} from './artcraft-assets-v12.js';
/** Original PNGs remain immutable. V12 previews use actual reversible PhotoCraft exports. */
export const FAIRY_STYLES=Object.freeze([
  Object.freeze({id:'classic',icon:'🧚',name:'처음 만난 요정',detail:'원래의 분홍 별 · 연보라 달빛 모습을 그대로',
    theme:'original'}),
  Object.freeze({id:'garden',icon:'🌸',name:'꽃정원 수호자',detail:'꽃잎 · 새싹 · 연한 꽃빛이 따라와요',theme:'garden'}),
  Object.freeze({id:'starlight',icon:'🌙',name:'달빛 별지기',detail:'작은 별과 반짝이는 마법 먼지',theme:'starlight'}),
  Object.freeze({id:'explorer',icon:'📚',name:'호기심 탐험가',detail:'책 배지 · 여행의 별 · 작은 꽃',theme:'explorer'}),
  Object.freeze({id:'festival',icon:'🎀',name:'반짝 축제 요정',detail:'무지개 별 · 하트 · 축제 반짝임',theme:'festival'})
]);
const ALLOWED=new Set(FAIRY_STYLES.map(s=>s.id));
export function safeStyle(id){return ALLOWED.has(id)?id:'classic';}
export function styleStorageKey(who){
  if(who!=='tae'&&who!=='se')throw new TypeError('unknown learner');
  return 'sparkle:fairy-visual-style:v11:'+who;
}
export function loadFairyStyle(who,storage){
  try{return safeStyle((storage??globalThis.localStorage)?.getItem(styleStorageKey(who)));}
  catch{return 'classic';}
}
export function saveFairyStyle(who,id,storage){
  const style=safeStyle(id);
  if(style!==id)return false;
  try{(storage??globalThis.localStorage)?.setItem(styleStorageKey(who),style);}
  catch{return false;}
  return true;
}
export function findFairyStyle(style){
  return FAIRY_STYLES.find(s=>s.id===style)||FAIRY_STYLES[0];
}
export function fairyPortrait(who){
  return refinedPortrait(who);
}
