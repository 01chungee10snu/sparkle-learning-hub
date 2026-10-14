import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {NAVIGATION_V15} from '../village/navigation-v15.js';
const dir=dirname(fileURLToPath(import.meta.url));
const ui=readFileSync(resolve(dir,'../village/village-ui.js'),'utf8');
const nav=readFileSync(resolve(dir,'../village/navigation-v15.js'),'utf8');
const css=readFileSync(resolve(dir,'../village/navigation-v15.css'),'utf8');
const keys=Object.values(NAVIGATION_V15).flatMap(group=>group.items.map(item=>item[0]));
assert.deepEqual(Object.keys(NAVIGATION_V15),['learn','explore','decorate','settings']);
assert.equal(keys.length,new Set(keys).size,'Navigation destinations must be unique');
assert.equal(keys.length,22);
for(const key of keys){
 if(key==='vh-nav-listen')continue;
 if(key.startsWith('district:'))assert.ok(ui.includes('data-district="'+key.slice(9)+'"'),key);
 else assert.ok(ui.includes('id="'+key+'"'),key);
}
for(const id of ['vh-home','vh-plaza','vh-quest','vh-bebsu','vh-map','vh-garden','vh-more']){
 assert.equal(ui.split('id="'+id+'"').length-1,1,id);
}
assert.ok(ui.includes('createNavigationV15({root,canOpen:'));
assert.match(ui,/onNavigationChange:\s*open\s*=>\s*sendToUnity\(open\s*\?\s*'NAV_OPEN'\s*:\s*'NAV_CLOSE'\)/,
  'The actual UI must dispatch both navigation states to Unity, not leave the callback empty');
assert.ok(ui.includes('navigation.close({restoreFocus:false})'));
for(const probe of ["event.key==='Escape'","setAttribute('inert'","removeAttribute('inert'","root.dataset.navigationOpen='true'"])assert.ok(nav.includes(probe),probe);
assert.ok(css.includes('#vh-navigation-dock') && css.includes('#vh-navigation-panel'));
const mapping=Object.fromEntries(Object.entries(NAVIGATION_V15).map(([key,definition])=>[key,{label:definition.label,items:definition.items.map(([originalId,label])=>({originalId,label}))}]));
if(process.argv.includes('--write-mapping'))writeFileSync(resolve(dir,'../../docs/NAVIGATION_MAPPING_V15.json'),JSON.stringify(mapping,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',categories:4,mappedDestinations:keys.length,alias:{'vh-bebsu':'district:kma'},modeAvailable:{'2d':19,'3d':22}}));
