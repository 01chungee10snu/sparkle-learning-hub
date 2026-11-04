#!/usr/bin/env node
/** Verify current built v43 artifact, four real Editor worlds and isolated browser evidence. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const bytes=path=>readFileSync(new URL(path,root));
const read=path=>JSON.parse(bytes(path));
const ev='docs/qa-unity-v43/';
const build=read(ev+'build-summary.json');
assert.equal(build.result,'Succeeded');assert.equal(build.errors,0);
const audit=read(ev+'habitat-audit.json');
assert.equal(audit.newPrefabs,18);assert.equal(audit.retainedPrefabs,39);
assert.equal(audit.routeChecks,44);assert.equal(audit.scenes.length,4);
assert.deepEqual(audit.scenes.map(s=>s.area+'/'+s.who).sort(),['home/se','home/tae','plaza/se','plaza/tae']);
for(const s of audit.scenes){
 assert.equal(s.routes,11);assert(s.motionChanges&&s.reducedMotionStable);
 assert.equal(s.habitat.assetKinds,18);assert(s.habitat.instances>=45);
 assert(s.habitat.motionElements>=19);assert.equal(s.habitat.decorationColliders,0);
 assert(s.habitat.triangles<95000,'Expanded decoration triangle budget exceeded');
}
const source=read(ev+'habitat-source-manifest.json');assert.equal(source.assets.length,18);
assert.equal(new Set(source.assets.map(a=>a.id)).size,18);
for(const a of source.assets){assert(a.triangles>0);assert(a.width>0&&a.height>0&&a.depth>0);assert(/^[a-f0-9]{64}$/.test(a.sha256));}
const manifest=read(ev+'webgl-build-manifest.json');assert.equal(manifest.version,'blender-habitats-v43-20261104');assert.equal(manifest.files.length,4);
for(const f of manifest.files){
 assert(/^WebGL\.(data\.unityweb|framework\.js\.unityweb|loader\.js|wasm\.unityweb)$/.test(f.file));
 const b=bytes('village/Build/'+f.file);assert.equal(b.length,f.bytes);
 assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert(f.changed);
}
const browser=read(ev+'browser-habitat-qa.json');assert.equal(browser.pass,true);assert.equal(browser.productionDataTouched,false);
assert.deepEqual(browser.results.map(s=>s.who).sort(),['se','tae']);
for(const r of browser.results){
 assert.equal(r.habitatKinds,18);assert(r.habitatInstances>=45&&r.motionElements>=19);
 assert(r.rotationVerified&&r.reducedMotionVerified);assert.equal(r.decorationColliders,0);
 assert(r.nativeInstances>=70&&r.directNativeTap&&r.learningAnswer&&r.pond&&r.garden);assert.equal(r.jsErrors,0);
}
const html=bytes('village/index.html').toString('utf8');assert(html.includes(manifest.version));
assert(html.includes("productVersion: '0.43.0-blender-habitats'"));assert(html.includes('if(nativeQA)'));
console.log('PASS_HABITATS_V43: 18 new + 39 retained prefab kinds; 44 routes; moving rotors/reduced motion; actual Unity taps, learning, pond, garden; current four WebGL binaries SHA verified.');
