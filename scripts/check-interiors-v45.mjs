#!/usr/bin/env node
/** Current content-art contract, exact native build, and real browser evidence. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONTENT_VERSION,CONTENT_ROOMS,CONTENT_PROPS,contentArt,roomFor,countedProp} from '../platform/content-art-v45.js';
const root=new URL('../',import.meta.url),dir='docs/qa-interiors-v45/';
const read=path=>readFileSync(new URL(path,root));const json=path=>JSON.parse(read(path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(Object.keys(CONTENT_ROOMS).length,13);assert.equal(CONTENT_PROPS.length,32);
assert.equal(new Set(CONTENT_PROPS).size,32);
for(const room of Object.keys(CONTENT_ROOMS))assert(existsSync(new URL(contentArt('rooms',room,'./'),root)));
for(const prop of CONTENT_PROPS)assert(existsSync(new URL(contentArt('props',prop,'./'),root)));
assert.equal(contentArt('rooms','../../secret'),'');assert.equal(contentArt('props','book','https://example.com/'),'');
assert.equal(roomFor({mode:'question',subject:'english',gameId:'english-word',total:3}),'english');
assert.equal(roomFor({mode:'question',subject:'math',gameId:'bebsu-g1-original',total:25}),'challenge');
assert.equal(roomFor({mode:'question',subject:'math',gameId:'magic-g1-original',total:25}),'practice');
assert.equal(roomFor({mode:'question',subject:'hanja',gameId:'hanja-8',total:3}),'hanja');
assert.equal(roomFor({mode:'district',district:'math',subject:'english'}),'math');
assert.equal(roomFor({mode:'pond',subject:'math'}),'pond');assert.equal(roomFor({mode:'explore'}),'');
assert.equal(countedProp('🐱'),'cat');assert.equal(countedProp('🍎'),'apple');assert.equal(countedProp('red'),'');
const build=json(dir+'build-summary.json');assert.equal(build.result,'Succeeded');assert.equal(build.errors,0);
const audit=json(dir+'interior-audit.json');assert.equal(audit.version,CONTENT_VERSION);
assert.equal(audit.rooms,13);assert.equal(audit.props,32);assert.equal(audit.checkedRoutes,44);
assert(audit.exteriorRestored&&audit.invalidKeyRejected);
assert.equal(new Set(audit.interiorTests.map(x=>x.room)).size,13);
for(const room of audit.interiorTests)assert(room.open&&room.meshes>0&&room.triangles>1000);
assert.equal(audit.interiorTests.find(r=>r.room==='english').taskObject,'cat');
const models=json(dir+'authoring-manifest.json');assert.equal(models.assets.length,45);
const atlas=json('assets/interiors-v45/manifest.json');assert.equal(atlas.files.length,47);
for(const f of atlas.files){assert(f.path.startsWith('assets/interiors-v45/'));const b=read(f.path);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);}
const manifest=json(dir+'webgl-build-manifest.json');assert.equal(manifest.version,CONTENT_VERSION);assert.equal(manifest.files.length,4);
for(const f of manifest.files){
 assert(/^WebGL\.(data\.unityweb|framework\.js\.unityweb|loader\.js|wasm\.unityweb)$/.test(f.file));
 const b=read('village/Build/'+f.file);assert(b.length>10000);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);
}
const baseline=json(dir+'protected-source-hashes.json');
for(const f of baseline.files)assert.equal(hash(read(f.path)),f.sha256,'Protected learning authority changed: '+f.path);
const html=read('village/index.html').toString();assert(html.includes("productVersion: '0.45.0-interiors'"));
assert(html.includes('content-style-v45.css'));assert(html.includes(CONTENT_VERSION));
const entry=read('index.html').toString();assert(entry.includes('&autostart=1&v=45'));assert(entry.includes("encodeURIComponent(who)+'&v=45'"),'Entry must not navigate to stale cached learning HTML');
const ui=read('village/village-ui.js').toString();assert(ui.includes('mountContentWorld'));assert(ui.includes("contentWorld?.pulse(result.correct?'correct':'learn')"));
const browser=json(dir+'browser-interiors-qa.json');assert.equal(browser.pass,true);assert.equal(browser.productionDataTouched,false);assert(browser.fallbackVerified);
assert.deepEqual(browser.results.map(r=>r.who).sort(),['se','tae']);
assert.equal(new Set(browser.results.flatMap(r=>r.rooms)).size,13);
assert(browser.results.some(r=>r.completionVerified),'Full native learning round not verified');
assert(browser.results.some(r=>r.literalObjectVerified),'Native literal question object not verified');
for(const r of browser.results){assert(r.nativeInteriors&&r.learningAnswer&&r.feedbackVisual&&r.exteriorRestored&&r.directBuildingRetap);assert(r.answerFont>=20&&r.answerHeight>=48);assert.equal(r.jsErrors,0);}
const interactions=json(dir+'interaction-qa.json');assert.equal(interactions.pass,true);assert.equal(interactions.productionDataTouched,false);
assert.deepEqual(interactions.results.map(r=>r.viewport).sort(),['compact','landscape']);
for(const r of interactions.results){assert(r.numericInput&&r.matching&&r.counting&&r.semanticPreservation);assert(r.numericMetrics.height>=48&&r.numericMetrics.font>=20);assert.equal(r.jsErrors,0);}
console.log('PASS_INTERIORS_V45: 13 real native rooms, 32 authored props, 47 rendered assets; exact binaries, 44 routes, semantic object mapping, readable answers, both learner profiles, fallbacks, protected learning/data code.');
