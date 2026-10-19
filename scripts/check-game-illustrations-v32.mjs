import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'village/assets/career-illustrations/manifest.json'),'utf8'));
assert(Array.isArray(manifest.illustrations)&&manifest.illustrations.length===100,'Career illustrated job count changed');
const ids=new Set(),paths=new Set();
for(const job of manifest.illustrations){
 assert(typeof job.id==='string'&&!ids.has(job.id),`Repeated profession ${job.id}`);ids.add(job.id);
 assert(/^\.\/assets\/career-illustrations\/[a-z0-9-]+\.svg$/.test(job.src),`Unexpected profession art path ${job.src}`);
 assert(!paths.has(job.src));paths.add(job.src);
 const full=path.join(root,'village',job.src),bytes=fs.readFileSync(full);
 assert(bytes.length>1300,`Missing low-resolution career art: ${job.id}`);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),job.sha256,`Manifest SHA mismatch: ${job.id}`);
 assert(bytes.toString('utf8').includes('<svg')&&bytes.toString('utf8').includes('</svg>'),`Invalid SVG marker: ${job.id}`);
}

const bespoke=['doctor','dentist','pilot','veterinarian','robot-engineer','ai-researcher','architect','game-designer','cybersecurity','career-395','career-182','career-104'];
for(const id of bespoke){
 assert(ids.has(id),`Missing targeted v32 illustration ${id}`);
 const job=manifest.illustrations.find(e=>e.id===id),source=fs.readFileSync(path.join(root,'village',job.src),'utf8');
 assert(!/<text(?:\s|>)/i.test(source),`Unstable native-emoji prop remains in bespoke vector: ${id}`);
}

const ui=fs.readFileSync(path.join(root,'village/village-ui.js'),'utf8');
const districtIds=[...ui.matchAll(/data-district=\\?"([a-z]+)\\?"/g)].map(row=>row[1]);
assert(districtIds.length>=8,'Expected child navigation districts');
for(const district of new Set(districtIds)){
 const file=path.join(root,'village/assets/illustrations',district+'-icon.webp');
 assert(fs.existsSync(file),`Missing child-facing illustrated region icon: ${district}`);
 const bytes=fs.readFileSync(file);
 assert(bytes.length>2500&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP',`Invalid region art ${district}`);
}
console.log('PASS_GAME_ILLUSTRATIONS_V32 100 unique career vectors SHA-verified, 12 custom vector props, child navigation icons present');
