/** Real PhotoCraft exports, with source files retained unchanged alongside them. */
const portraits = new Set(['taehee_original', 'sehee_original']);
const rewards = new Set(['star_yellow', 'sprout', 'bloom']);
const districts = new Set(['math','korean','english','kma','practice','academy','growth','garden','shop']);

export function refinedPortrait(who) {
  return './assets/artcraft-v12/' + (who === 'se' ? 'sehee_original' : 'taehee_original') + '.png';
}
export function refinedReward(name) {
  if (!/^[a-z_]+$/.test(name)) throw new TypeError('Invalid reward asset name');
  return rewards.has(name) ? './assets/artcraft-v12/' + name + '.png' : './assets/' + name + '.png';
}
export function refinedScenery(district, icon = false) {
  if (!districts.has(district)) return null;
  return './assets/artcraft-v12/illustration-' + district + (icon ? '-icon' : '') + '.png';
}
export const ARTCRAFT_REFINEMENT = Object.freeze({
  version:'photocraft-0.8.2-v12', portraits:[...portraits], nativeProjectExtension:'.pcraft',
  generativeResynthesis:false, originalsOverwritten:false, alphaPreserved:true
});
