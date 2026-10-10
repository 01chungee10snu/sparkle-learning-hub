// Persistent care play is separate from quiz scores and star rewards.
export const SPECIES = Object.freeze({
 flowers_pink:{title:'분홍 꽃',emoji:'🌸',steps:3},
 flowers_blue:{title:'파란 꽃',emoji:'🪻',steps:3},
 flowers_sun:{title:'해바라기',emoji:'🌻',steps:3},
 tree_oak:{title:'참나무',emoji:'🌳',steps:6},
 tree_mint:{title:'민트 나무',emoji:'🌲',steps:6},
 tree_gold:{title:'황금 나무',emoji:'🍁',steps:6}
});
export const CARE = ['water','sun','song'];
const key='sparkle-care-garden-v1:'+new URL('../',import.meta.url).pathname;
function cleanPlants(value) {
 if(!Array.isArray(value))return [];
 const seen=new Set();
 return value.filter(p=>p&&Number.isInteger(p.slot)&&p.slot>=0&&p.slot<8&&
   Object.hasOwn(SPECIES,p.species)&&Number.isInteger(p.stage)&&p.stage>=0&&
   p.stage<=SPECIES[p.species].steps&&!seen.has(p.slot)&&seen.add(p.slot))
   .map(({slot,species,stage})=>({slot,species,stage})).slice(0,8);
}
function read(storage) {
 let raw={};
 try { raw=JSON.parse(storage.getItem(key)||'{}')||{}; } catch {}
 return {version:1,tae:cleanPlants(raw.tae),se:cleanPlants(raw.se),family:cleanPlants(raw.family)};
}
function owner(who,area) {
 if(!['tae','se'].includes(who))throw new Error('요정을 먼저 선택해 주세요.');
 if(!['home','plaza'].includes(area))throw new Error('정원 위치를 확인해 주세요.');
 return area==='plaza'?'family':who;
}
export function gardenSnapshot(who,area='home',storage=globalThis.localStorage) {
 const name=owner(who,area);
 return {who,area,plants:read(storage)[name]};
}
export function mutateGarden({who,area='home',action,slot,species,care,expectedStage},storage=globalThis.localStorage) {
 const name=owner(who,area), state=read(storage);
 if(action==='GARDEN_OPEN')return {garden:{who,area,plants:state[name]},gardenSlot:Number.isInteger(slot)?slot:-1};
 if(!Number.isInteger(slot)||slot<0||slot>7)throw new Error('정원 자리를 골라 주세요.');
 const plants=state[name], plant=plants.find(p=>p.slot===slot);
 let message='';
 if(action==='GARDEN_PLANT') {
  if(plant)throw new Error('이미 심은 자리예요. 다른 자리를 골라 주세요.');
  if(!Object.hasOwn(SPECIES,species))throw new Error('씨앗을 골라 주세요.');
  plants.push({slot,species,stage:0});message=SPECIES[species].title+' 씨앗을 심었어요!';
 } else if(action==='GARDEN_CARE') {
  if(!plant)throw new Error('먼저 씨앗을 심어 주세요.');
  if(plant.stage>=SPECIES[plant.species].steps)throw new Error('다 자랐어요! 다른 식물도 가꿔 볼까요?');
  if(expectedStage!==plant.stage)throw new Error('이미 돌본 단계예요. 자란 모습을 확인해 주세요.');
  if(care!==CARE[plant.stage%CARE.length])throw new Error('지금 필요한 돌봄을 골라 주세요.');
  plant.stage++;
  message=plant.stage===SPECIES[plant.species].steps?'내가 가꾼 '+SPECIES[plant.species].title+'!': '내 손으로 조금 더 키웠어요!';
 } else throw new Error('정원 놀이를 확인해 주세요.');
 // Write before acknowledging. A failed save never projects an unsaved plant.
 try { storage.setItem(key,JSON.stringify(state)); } catch { throw new Error('정원을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
 return {garden:{who,area,plants:state[name]},gardenSlot:slot,gardenMessage:message};
}
