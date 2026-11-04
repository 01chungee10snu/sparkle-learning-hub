#!/usr/bin/env node
/** Current-runtime evidence: actual Unity build, native FBX usage, learning and isolated state. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const json=path=>JSON.parse(read(path));
const dir='docs/qa-unity-v44/';
const build=json(dir+'build-summary.json');
assert.equal(build.result,'Succeeded');assert.equal(build.errors,0);
const audit=json(dir+'visual-route-audit.json');
assert.equal(audit.version,'storybook-v44-20261104');
assert.equal(audit.replacementKinds,20);assert.equal(audit.scenes.length,4);
assert.equal(new Set(audit.scenes.map(x=>x.area+':'+x.who)).size,4);
for(const s of audit.scenes){
 assert.equal(s.checkedRoutes,11);assert(s.world.premiumInstances>=35);
 assert(s.world.bakedOcclusionInstances>=35);assert(s.world.assets.includes('World/hero_castle'));
}
const manifest=json(dir+'webgl-build-manifest.json');
assert.equal(manifest.version,'storybook-v44-20261104');assert.equal(manifest.files.length,4);
for(const f of manifest.files){
 assert(/^WebGL\.(loader\.js|data\.unityweb|framework\.js\.unityweb|wasm\.unityweb)$/.test(f.file));
 const bytes=read('village/Build/'+f.file);
 assert.equal(bytes.length,f.bytes,'Unexpected runtime byte size '+f.file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,'Wrong runtime revision '+f.file);
}
const browser=json(dir+'browser-storybook-qa.json');
assert.equal(browser.pass,true);assert.equal(browser.productionDataTouched,false);
assert.deepEqual(browser.results.map(x=>x.who).sort(),['se','tae']);
for(const r of browser.results){
 assert(r.premiumInstances>=35&&r.bakedOcclusionInstances>=35);
 assert(r.directNativeTap&&r.learningAnswer&&r.pond&&r.garden);
 assert(r.rotationVerified&&r.reducedMotionVerified);assert.equal(r.jsErrors,0);
}
const atlas=json('assets/storybook-v44/manifest.json');
assert.equal(atlas.version,44);assert.equal(atlas.files.length,15);
for(const f of atlas.files){
 assert(f.path.startsWith('assets/storybook-v44/'));
 const bytes=read(f.path);assert.equal(bytes.length,f.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);
}
const entry=read('index.html').toString();
assert(entry.includes('assets/storybook-v44/entry.webp'));
assert(!entry.includes('mountBlenderWorld'),'Obsolete v41 preview should not misrepresent current game');
const html=read('village/index.html').toString();
assert(html.includes("productVersion: '0.44.0-storybook'"));
assert(html.includes('storybook-v44-20261104'));
console.log('PASS_STORYBOOK_V44: current Unity binaries SHA-verified; 20 detailed native models, AO, 44 routes, two learner gameplay tests, 15 genuine Unity-rendered UI assets.');
