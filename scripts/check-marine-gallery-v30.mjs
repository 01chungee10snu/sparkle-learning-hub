import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {FISH_SPECIES,RESOURCE_SUBJECTS} from '../platform/resource-economy.js';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const folder=path.join(repo,'village/assets/marine-premium-v25');
const ids=new Set(),hashes=new Set(),speciesWorlds={pond:[],ocean:[]};
let webpBytes=0;
for(const species of FISH_SPECIES){
 assert(!ids.has(species.id),`Duplicate species ID: ${species.id}`);
 ids.add(species.id);
 assert(Object.hasOwn(speciesWorlds,species.world),`Invalid habitat ${species.id}`);
 speciesWorlds[species.world].push(species);
 assert(/^[a-z][a-z0-9-]*$/.test(species.id),`Unsafe species ID ${species.id}`);
 assert(species.name.length>=2 && species.description.length>=8,`Missing biological description ${species.id}`);
 assert(Number.isInteger(species.minSolved)&&species.minSolved>=0,`Invalid learning gate: ${species.id}`);
 assert(Number.isInteger(species.minBalancedDays)&&species.minBalancedDays>=0);
 assert(RESOURCE_SUBJECTS.every(s=>Number.isInteger(species.cost[s])&&species.cost[s]>=0),`Bad four-resource cost ${species.id}`);
 assert(species.art===`./assets/marine-premium-v25/${species.id}.webp`,`Unexpected art path ${species.id}`);
 const art=path.join(folder,`${species.id}.webp`),source=path.join(folder,`${species.id}.svg`);
 const bytes=fs.readFileSync(art),svg=fs.readFileSync(source,'utf8');
 assert(bytes.length>=30_000 && bytes.length<=1_500_000,`Missing/oversized image ${species.id}: ${bytes.length}`);
 assert(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP',`Invalid WebP ${species.id}`);
 assert(svg.length>=1600&&svg.length<=180_000&&svg.includes('<svg')&&svg.includes('</svg>'),`Missing/editability SVG ${species.id}`);
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 assert(!hashes.has(hash),`Reused identical image: ${species.id}`);
 hashes.add(hash);webpBytes+=bytes.length;
}
assert.equal(speciesWorlds.pond.length,24,`Expected 24 freshwater species, got ${speciesWorlds.pond.length}`);
assert.equal(speciesWorlds.ocean.length,40,`Expected 40 ocean species, got ${speciesWorlds.ocean.length}`);
for(const world of Object.keys(speciesWorlds)){
 const rows=speciesWorlds[world].toSorted((a,b)=>a.minSolved-b.minSolved);
 for(let i=1;i<rows.length;i++){
  const prev=rows[i-1],next=rows[i],oldTotal=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+prev.cost[s],0),newTotal=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+next.cost[s],0);
  assert(next.minSolved>prev.minSolved,`${world} learning thresholds collide: ${prev.id}/${next.id}`);
  assert(next.minBalancedDays>=prev.minBalancedDays,`${world} balance requirement decreases: ${next.id}`);
  assert(newTotal>oldTotal,`${world} cost must rise with learning rank: ${prev.id}/${next.id} (${oldTotal}/${newTotal})`);
 }
}
assert(FISH_SPECIES.find(s=>s.id==='humpback-whale')?.careMode==='observe');
assert(FISH_SPECIES.find(s=>s.id==='reef-shark')?.careMode==='observe');
assert(FISH_SPECIES.find(s=>s.id==='sea-turtle')?.careMode==='observe');
console.log(`MARINE_GALLERY_V30_PASS ${ids.size} original creatures, 24 freshwater + 40 ocean, 128 files, distinct WebP SHA, rising learning/currency gates, ${(webpBytes/1_048_576).toFixed(1)} MiB compressed`);
