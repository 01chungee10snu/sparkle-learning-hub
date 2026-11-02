import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildJourney} from '../platform/adventure-loop-v40.js';
import {WORLD_DESTINATIONS,artPath,worldLocation} from '../platform/world-art-v40.js';
const root=new URL('../',import.meta.url);
const locations = new Set(WORLD_DESTINATIONS.map(place=>place.id));
assert.equal(locations.size,WORLD_DESTINATIONS.length);
for(const place of WORLD_DESTINATIONS){
  const src=artPath(place.id);
  assert(src.startsWith('./assets/kenney-sketch-v40/'));
  assert(existsSync(new URL(src,root)), 'missing sprite '+place.id);
}
assert.equal(worldLocation('bad'),null);
assert.equal(artPath('../escape'), '');
assert.equal(artPath('math','https://example.com/'), '');
for(const id of ['math','korean','english','hanja','kma','practice','academy','growth','pond','ocean','career']) assert(locations.has(id));
const missions=[
  {gameId:'a',kind:'review',subject:'math',title:'A'},
  {gameId:'b',kind:'challenge',subject:'english',title:'B'},
  {gameId:'c',kind:'transfer',subject:'korean',title:'C'}
];
const original=JSON.stringify(missions);
const route=buildJourney(missions,{playAllowed:false,completedGameIds:['a']});
assert.equal(route.next.id,'b');
assert.deepEqual(route.steps.map(x=>x.completed),[true,false,false]);
assert.equal(route.playAllowed,false);
assert.equal(JSON.stringify(missions),original);
assert.equal(buildJourney(missions,{playAllowed:true,completedGameIds:['a','b','c']}).mode,'exploration');
assert.equal(buildJourney([...missions,missions[0],{gameId:'bad',subject:'random'}]).steps.length,3);
assert.throws(()=>buildJourney(null),TypeError);
const manifest=JSON.parse(readFileSync(new URL('../assets/kenney-sketch-v40/manifest.json',import.meta.url)));
assert.equal(Object.values(manifest.packs).flatMap(pack=>pack.files).length,28);
assert(Object.values(manifest.packs).every(pack=>pack.license==='CC0-1.0'&&pack.author==='Kenney'));
const derivatives=JSON.parse(readFileSync(new URL('../assets/kenney-sketch-v40/composite/derivatives.json',import.meta.url)));
assert.equal(derivatives.entries.length,14);
for(const entry of derivatives.entries){
 const bytes=readFileSync(new URL('../'+entry.path,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'Derived art sha mismatch: '+entry.name);
}
assert(derivatives.entries.some(entry=>entry.name==='island-scene'));

console.log('v40 art registry, license manifest, route policy: PASS');
