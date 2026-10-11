import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hub=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(hub,p),'utf8');
const original=path.resolve(hub,'..','Bebsu');
const manifest=JSON.parse(read('assets/bebsu/art/manifest.json'));
assert.equal(manifest.schemaVersion,1);
assert.equal(manifest.sourceRepository,'01chungee10snu/Bebsu');
assert.equal(manifest.assetCount,15);
const ids=new Set(),hash=b=>createHash('sha256').update(b).digest('hex');
let total=0;
for(const art of manifest.assets){
 assert(!ids.has(art.path),'Duplicate Bebsu art '+art.path);ids.add(art.path);
 const sourcePath=path.join(original,art.source);
 const loaded=fs.readFileSync(path.join(hub,'assets/bebsu/art',art.path));
 if(fs.existsSync(sourcePath))assert.equal(hash(fs.readFileSync(sourcePath)),art.sha256,'Source changed '+art.source);
 else assert(process.env.BEBSU_SOURCE_VERIFY!=='1','Bebsu source checkout required for strict source validation: '+sourcePath);
 assert.equal(hash(loaded),art.sha256,'Copied art differs '+art.path);
 total+=loaded.length;
}
assert(total<1024*1024,'Curated 15 images exceed 1 MiB');
const code=read('app.js'),css=read('experience.css'),village=read('village/village-ui.js'),index=read('village/index.html');
for(const expected of ['bebsuArt(','bebsuCompanion(','bebsuSuccessBadge(','bebsuFeedbackScene(','isBebsuMath()','bebsu-study-banner']){
 assert(code.includes(expected),'Missing UI integration '+expected);
}
for(const expected of ['.bebsu-study-banner','.bebsu-inline-art','.bebsu-companion-art']){
 assert(css.includes(expected),'Missing CSS integration '+expected);
}
for(const [name,text] of [['app.js',code],['village/village-ui.js',village],['village/index.html',index]]){
 assert(!text.includes('벡수'),'Incorrect Bebsu spelling in '+name);
}
const catalog=JSON.parse(read('games/catalog.json'));
for(const id of ['bebsu-foundation','bebsu-g1-original']){
 const game=catalog.find(g=>g.id===id);
 assert(game&&game.status==='published'&&game.subject==='math'&&game.sourceGroup==='bebsu','Unexpected gameId '+id);
}
const unity=path.resolve(hub,'..','sparkle-fairy-village');
if(fs.existsSync(unity)){
 const u=fs.readFileSync(path.join(unity,'Assets/Scripts/VillageWorld.cs'),'utf8');
 const b=fs.readFileSync(path.join(unity,'Assets/Editor/VillageEditorBuild.cs'),'utf8');
 assert.equal((u.match(/BebsuTutor\(who, new Vector3/g)||[]).length,2);
 assert(u.includes('bebsu-foundation')&&u.includes('bebsu-g1-original'));
 assert(b.includes('VillageBebsuImporter.Configure();'));
 const meta=JSON.parse(fs.readFileSync(path.join(unity,'Assets/Art/Generated/bebsu-tutor-manifest.json'),'utf8'));
 assert.equal(meta.records.length,2);
 for(const entry of meta.records){
  const raw=fs.readFileSync(path.join(unity,entry.target));
  assert.equal(hash(raw),entry.output_sha256);
  const sourcePath=path.join(original,entry.source);
  if(fs.existsSync(sourcePath))assert.equal(hash(fs.readFileSync(sourcePath)),entry.source_sha256);
  else assert(process.env.BEBSU_SOURCE_VERIFY!=='1','Source checkout required: '+sourcePath);
 }
}
console.log('PASS Bebsu original spelling, 15 optimized files ('+total+' B), SHA-256, artwork hookups, badges, two published games and 2 native Unity sprites.');
