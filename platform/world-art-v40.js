/**
 * Single art registry for entry, learning and the Unity-connected world map.
 * Assets are fixed local paths, curated from Kenney Sketch Town CC0 packs.
 * No remote runtime requests, untrusted URLs, or procedural sprite names.
 */
export const WORLD_ART_BASE = 'assets/kenney-sketch-v40/';
export const WORLD_DESTINATIONS = Object.freeze([
  {id:'math', name:'수학 정원', hint:'숫자로 보물을 찾아요', art:'composite/math.png', group:'study'},
  {id:'korean', name:'이야기 도서관', hint:'글과 이야기를 발견해요', art:'composite/korean.png', group:'study'},
  {id:'english', name:'영어학교', hint:'새로운 말로 인사해요', art:'composite/english.png', group:'study'},
  {id:'hanja', name:'한자 수련관', hint:'글자의 뜻을 알아봐요', art:'composite/hanja.png', group:'study'},
  {id:'kma', name:'경시대회 성', hint:'수학 도전의 성문', art:'composite/kma.png', group:'study'},
  {id:'practice', name:'마법 연습장', hint:'여러 방법으로 다시 도전', art:'composite/practice.png', group:'study'},
  {id:'academy', name:'마법학교', hint:'배움을 연결해요', art:'composite/academy.png', group:'study'},
  {id:'growth', name:'성장의 탑', hint:'내가 쌓은 발견', art:'composite/growth.png', group:'growth'},
  {id:'pond', name:'생명 연못', hint:'물고기와 교감해요', art:'composite/pond.png', group:'play'},
  {id:'ocean', name:'푸른 바다', hint:'새로운 생물을 만나봐요', art:'composite/ocean.png', group:'play'},
  {id:'career', name:'미래 직업 탐색관', hint:'다양한 일을 찾아봐요', art:'composite/career.png', group:'explore'},
  {id:'garden', name:'나의 정원', hint:'꽃과 나무를 키워요', art:'composite/garden.png', group:'play'},
  {id:'plaza', name:'가족 광장', hint:'함께 인사해요', art:'composite/plaza.png', group:'explore'}
]);
const lookup = new Map(WORLD_DESTINATIONS.map(place=>[place.id,place]));
export const SUBJECT_TO_WORLD = Object.freeze({math:'math',korean:'korean',english:'english',hanja:'hanja'});
export function worldLocation(id) { return lookup.get(id) || null; }
export function artPath(id, prefix='./') {
  const value = worldLocation(id);
  if (!value || !['./','../'].includes(prefix)) return '';
  return prefix+WORLD_ART_BASE+value.art;
}
