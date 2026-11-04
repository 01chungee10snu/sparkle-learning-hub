#!/usr/bin/env node
/** Verify the exact built Unity artifact and retained QA evidence, not a mock scene. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const json=path=>JSON.parse(read(path));
const evidence='docs/qa-unity-v42/';
const build=json(evidence+'build-summary.json');
assert.equal(build.result,'Succeeded');
assert.equal(build.errors,0);
const audit=json(evidence+'native-audit.json');
assert.equal(audit.prefabs,39);
assert.equal(audit.checkedRoutes,11);
assert.equal(new Set(audit.routeIds).size,11);
assert.equal(audit.world.source,'Unity MeshRenderer runtime');
assert(audit.world.nativeInstances>=70&&audit.world.interactiveBuildings>=11);
const manifest=json(evidence+'webgl-build-manifest.json');
assert.equal(manifest.version,'blender-native-v42-20261104');
assert.equal(manifest.files.length,4);
for(const entry of manifest.files){
 assert(/^WebGL\.(data\.unityweb|framework\.js\.unityweb|loader\.js|wasm\.unityweb)$/.test(entry.file));
 const bytes=read('village/Build/'+entry.file);
 assert.equal(bytes.length,entry.bytes,'WebGL size mismatch: '+entry.file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,'WebGL hash mismatch: '+entry.file);
 assert.equal(entry.changed,true,'Unchanged legacy build: '+entry.file);
}
const browser=json(evidence+'browser-native-qa.json');
assert.equal(browser.pass,true);
assert.equal(browser.productionDataTouched,false);
assert.deepEqual(browser.results.map(row=>row.who).sort(),['se','tae']);
for(const result of browser.results){
 assert(result.nativeInstances>=70);
 assert(result.directNativeTap&&result.learningAnswer&&result.pond&&result.garden);
 assert.equal(result.jsErrors,0);
}
const html=read('village/index.html').toString('utf8');
assert(html.includes('blender-native-v42-20261104'),'Missing browser cache version');
assert(html.includes("productVersion: '0.42.0-blender-native'"));
assert(html.includes('if(nativeQA)'), 'Diagnostics must be opt-in');
console.log('PASS_UNITY_NATIVE_V42: 39 native prefabs; 11 navigation paths; 4 built binaries SHA-verified; real Unity taps/learning/pond/garden verified in 2 isolated profiles.');
