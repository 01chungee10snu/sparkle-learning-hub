import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FISH_SPECIES,RESOURCE_SUBJECTS} from '../platform/resource-economy.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ids=new Set();
const costs=species=>RESOURCE_SUBJECTS.reduce((total,s)=>total+species.cost[s],0);
for(const species of FISH_SPECIES){
 assert(!ids.has(species.id),`duplicate creature ${species.id}`);ids.add(species.id);
 assert(['pond','ocean'].includes(species.world),`unknown habitat for ${species.id}`);
 assert(Number.isInteger(species.minSolved)&&species.minSolved>=0);
 assert(Number.isInteger(species.minBalancedDays)&&species.minBalancedDays>=0);
 assert(RESOURCE_SUBJECTS.every(subject=>Number.isSafeInteger(species.cost[subject])&&species.cost[subject]>=0));
 assert(species.art===`./assets/marine-premium-v25/${species.id}.webp`,`unexpected artwork ${species.id}`);
 const art=path.resolve(root,'village',species.art);
 assert(fs.statSync(art).size>30000,`${species.id} production artwork missing/too small`);
 assert(fs.statSync(art.replace(/\.webp$/,'.svg')).size>1600,`${species.id} original SVG missing`);
}
const pond=FISH_SPECIES.filter(s=>s.world==='pond');
const ocean=FISH_SPECIES.filter(s=>s.world==='ocean');
assert.equal(pond.length,24);assert.equal(ocean.length,40);
assert.equal(pond[0].id,'guppy');assert.equal(costs(pond[0]),0);
const expected=['clownfish','blue-tang','shrimp','hermit-crab','sea-crab','seahorse','octopus','sea-turtle','reef-shark','humpback-whale'];
for(const id of expected)assert(ocean.some(s=>s.id===id),`existing marine species lost: ${id}`);
for(const world of [pond,ocean])for(let i=1,sorted=[...world].sort((a,b)=>a.minSolved-b.minSolved);i<sorted.length;i++){
 const older=sorted[i-1],next=sorted[i];
 assert(next.minSolved>older.minSolved,`${next.name}: discovery threshold must grow`);
 assert(next.minBalancedDays>=older.minBalancedDays,`${next.name}: balance threshold must not decrease`);
 assert(costs(next)>costs(older),`${next.name}: total resource cost must rise`);
}
const first=[...ocean].sort((a,b)=>a.minSolved-b.minSolved)[0],last=[...ocean].sort((a,b)=>a.minSolved-b.minSolved).at(-1);
assert(last.minSolved>=220 && costs(last)>costs(first)*12);
for(const id of ['sea-turtle','reef-shark','humpback-whale'])assert.equal(FISH_SPECIES.find(s=>s.id===id).careMode,'observe');
for(const [file,pattern] of [
 ['village/village-ui.js',/\bOCEAN_OPEN\b/],
 ['village/village-ui.js',/\bOCEAN_FEED\b/],
 ['village/village-bridge.js',/\bOCEAN_ADOPT\b/],
 ['village/index.html',/ocean-world-v25\.css/],
 ['app.js',/selectLearner\(who\)/],
 ['index.html',/data-learner="tae"/],
 ['index.html',/data-learner="se"/]
])assert(pattern.test(fs.readFileSync(path.join(root,file),'utf8')),`missing integration: ${file} ${pattern}`);
console.log('PASS_OCEAN_V25_COMPAT 24 pond + 40 marine original species, ascending unlock requirements, two-child entry, marine bridge and ethical observation');
