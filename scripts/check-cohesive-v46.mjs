#!/usr/bin/env node
/** Inspectable current-build and coverage contract; no production browser state. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ART46,COHESIVE_VERSION,cohesiveArt} from '../platform/cohesive-art-v46.js';
import {FISH_SPECIES} from '../platform/resource-economy.js';
import {CAREERS} from '../village/career-library.js';
const root=new URL('../',import.meta.url),dir='docs/qa-cohesive-v46/';
const read=p=>readFileSync(new URL(p,root)),json=p=>JSON.parse(read(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=json('unity-v46/source-descriptors.json');
assert.deepEqual(source.marine.map(x=>[x.id,x.name,x.description]),FISH_SPECIES.map(x=>[x.id,x.name,x.description]));
assert.deepEqual(source.careers.map(x=>[x.id,x.name,x.group]),CAREERS.map(x=>[x.id,x.name,x.group]));
assert.deepEqual([...ART46.marine].sort(),FISH_SPECIES.map(x=>x.id).sort());assert.equal(ART46.marine.length,64);
assert.deepEqual([...ART46.careers].sort(),CAREERS.map(x=>x.id).sort());assert.equal(ART46.careers.length,100);
assert.equal(ART46.characters.length,11);assert.equal(ART46.icons.length,43);assert.equal(ART46.scenery.length,6);assert.equal(ART46.gifts.length,48);
assert.equal(cohesiveArt('marine','../../private'),'');assert.equal(cohesiveArt('unknown','star'),'');
const atlas=json('assets/cohesive-v46/manifest.json');assert.equal(atlas.version,COHESIVE_VERSION);assert.equal(atlas.assets.length,272);
assert.equal(new Set(atlas.assets.map(x=>x.path)).size,272);
for(const a of atlas.assets){
 assert(a.path.startsWith('assets/cohesive-v46/'));assert(a.width>0&&a.height>0);
 const b=read(a.path);assert.equal(b.length,a.bytes);assert.equal(hash(b),a.sha256,'Changed rendered asset '+a.id);
}
for(const f of atlas.scenes||[]){assert.equal(hash(read(f.path)),f.sha256);}
const model=json(dir+'authoring-manifest.json');assert.equal(model.version,46);assert(model.fullExport);assert.equal(model.assets.length,272);
for(const m of model.assets){
 assert(m.triangles>0);assert(m.pieces.length>0);
 const a=atlas.assets.find(a=>a.id===m.id);assert(a&&a.modelSha256===m.sha256,'Unlinked model/render '+m.id);
 if(m.id.startsWith('Career/'))assert.equal(m.meaning.length,2,'Profession lacks explicit tool mapping '+m.id);
}
for(const key of ['Character/tae','Character/se']){
 const m=model.assets.find(m=>m.id===key);
 for(const part of ['Head','Body','ArmL','ArmR','LegL','LegR','WingL','WingR'])assert(m.pieces.includes(part));
}
for(const [id,meaning] of [['giant-squid','squid-10'],['octopus','octopus-8'],['common-starfish','starfish-5'],['sea-turtle','turtle'],['whale-shark','shark']])assert.equal(model.assets.find(m=>m.id==='Marine/'+id).meaning,meaning);
const build=json(dir+'build-summary.json');assert.equal(build.result,'Succeeded');assert.equal(build.errors,0);
const binaries=json(dir+'webgl-build-manifest.json');assert.equal(binaries.version,COHESIVE_VERSION);assert.equal(binaries.files.length,4);
for(const f of binaries.files){const b=read('village/Build/'+f.file);assert(b.length>10000);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);}
const audit=json(dir+'native-audit.json');assert.equal(audit.version,COHESIVE_VERSION);assert.equal(audit.checkedRoutes,44);assert(audit.nativeHero&&audit.allSpecies);assert.equal(audit.scenes.length,4);
for(const s of audit.scenes){assert(s.nativeHero&&s.nativeActors>=4&&s.nativeMarine>=1);assert.equal(s.legacySprites,0);}
const protectedFiles=json(dir+'protected-source-hashes.json');for(const f of protectedFiles.files)assert.equal(hash(read(f.path)),f.sha256,'Protected authority changed '+f.path);
const browser=json(dir+'browser-qa.json');assert(browser.pass&&!browser.productionDataTouched);assert.deepEqual(browser.results.map(r=>r.who).sort(),['se','tae']);
for(const r of browser.results){assert(r.nativeHero&&r.wardrobe&&r.friends&&r.pond&&r.ocean&&r.career);assert.equal(r.jsErrors,0);assert.equal(r.legacySprites,0);}
assert(browser.standaloneGifts&&browser.parentReport);
const provenance=json(dir+'public-fairy-provenance.json');
assert.equal(provenance.license,'CC0-1.0');
assert.deepEqual(provenance.variants,['tae','se']);
const derivatives=json(dir+'public-fairy-derivatives.json');
for(const key of ['Character/tae','Character/se']){
 const m=model.assets.find(m=>m.id===key),p=derivatives.derivatives.find(m=>m.id===key);
 assert(m&&p&&m.sha256===p.sha256,'Current model must match the public-source derivative');
 assert.equal(m.sourceAsset,'Pixor library Fairy');assert.equal(m.license,'CC0-1.0');
 assert.equal(m.sourceSha256,provenance.sourceBlendSha256);
}
const mobile=json(dir+'mobile-hero-qa.json');
assert(mobile.pass&&!mobile.productionDataTouched&&!mobile.physicalDeviceVerified);
assert.deepEqual(mobile.results.map(r=>r.who).sort(),['se','tae']);
for(const r of mobile.results){
 assert(r.centredWhileMoving&&r.exteriorRestored&&r.animationEnabled&&r.hudDoesNotCoverHero);
 assert.equal(r.samples.filter(s=>s.viewport).length,4);
 for(const p of [...r.samples,...r.moving]){
  assert(Math.abs(p.x-.5)<.02&&Math.abs(p.y-.5)<.02,'Character drift: '+r.who+'/'+p.label);
  assert(p.source.includes('Pixor Fairy')&&p.source.includes('CC0'));
 }
 assert.equal(r.jsErrors,0);
}
const binding=json(dir+'release-binding.json');assert(binding.sourceGLBDownloadedAndMatched);
assert.equal(binding.mobileProofSha256,hash(read(dir+'mobile-hero-qa.json')));
assert.deepEqual(binding.binaryFiles,binaries.files,'Mobile proof must bind to current tested runtime');
console.log('PASS_COHESIVE_V46: 272 model-linked renders; 64 species, 100 professions, articulated heroes, native NPCs, 44 routes, preserved authority bytes and current synthetic browser proof.');
