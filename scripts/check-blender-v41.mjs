#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const file=uri=>fs.readFileSync(new URL(uri,root));
const manifest=JSON.parse(file('assets/blender-v41/source/manifest.json'));
assert.equal(manifest.license,'CC0-1.0');
assert.equal(manifest.packs.length,3);
let counted=0;
for(const pack of manifest.packs){
  const lic=file(pack.original_license).toString('utf8');
  assert(lic.includes('Kenney')&&lic.includes('CC0'),pack.name+' license missing');
  for(const tex of pack.textures||[]){
    const bytes=file(tex.path);
    assert.equal(bytes.length,tex.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),tex.sha256);
  }
  for(const entry of pack.models){
    const bytes=file(entry.path);
    assert.equal(bytes.length,entry.bytes,entry.name+' source byte drift');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.name+' SHA mismatch');
    counted++;
  }
}
assert.equal(counted,51);
const raw=file('assets/blender-v41/sparkle-magic-world-v41.glb');
assert.equal(raw.readUInt32LE(0),0x46546c67,'not a GLB');
assert.equal(raw.readUInt32LE(4),2,'not glTF 2');
assert.equal(raw.readUInt32LE(8),raw.length,'GLB byte length mismatch');
assert(raw.length<8*1024*1024,'Over budget on mobile GLB');
assert.equal(raw.readUInt32LE(16),0x4e4f534a,'missing JSON chunk');
const json=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString('utf8'));
const names=new Set((json.nodes||[]).map(n=>n.name));
for(const id of ['math','korean','english','hanja','kma','practice','academy','growth','pond','ocean','career']){
  assert(names.has('POI_'+id),'missing Blender POI '+id);
  assert(names.has('PICK_'+id),'missing tappable hitbox '+id);
}
assert((json.animations||[]).length>=1,'Blender keyframed motion missing');
assert((json.meshes||[]).length>=18,'This is not a full 3D environment');
assert((json.materials||[]).length>=6,'No visual/material variety');
const poster=file('assets/blender-v41/blender-world-poster.webp');
assert(poster.length>20000&&poster.length<400000);
const blender=file('assets/blender-v41/sparkle-magic-world-v41.blend');
assert(blender.length>100000,'Blender editable source missing'); // Blender 5 may use compressed .blend files
const html=file('index.html').toString('utf8');
const ui=file('village/village-ui.js').toString('utf8');
assert(html.includes('entry-blender-stage')&&html.includes('entry-blender-v41.css'));
assert(ui.includes('vh-blender-map-details')&&ui.includes('disposeBlenderViewer'));
for(const name of ['platform/progress.js','platform/irt.js','platform/cloud-sync.js'])
  assert(fs.existsSync(new URL(name,root)));
console.log('BLENDER_V41_ASSET_AUDIT_PASS',{
  sourceModels:counted,poi:11,animations:json.animations.length,
  meshes:json.meshes.length,materials:json.materials.length,bytes:raw.length
});
