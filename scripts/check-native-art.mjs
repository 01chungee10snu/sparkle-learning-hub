import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {REWARD_ITEMS} from '../platform/reward-catalog.js';

// Pinned native-v2 originals, recorded from Unity asset-catalog.json. This
// read-only contract checks delivered bytes and executes the actual UI helpers;
// it never imports app startup or reads/writes a learner's browser storage.
const expectedAssets=[
 {
  "id": "taehee_original",
  "category": "Characters",
  "sha256": "29a25499f32ac5f6f2ae83250b53239a55f963eaa3fb1d1b91b604fd4695b65c",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "sehee_original",
  "category": "Characters",
  "sha256": "cc68444107297e904c292233e2b804dfbb3fb5395fc41b64b5e1ee850446cc6f",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "star_yellow",
  "category": "Rewards",
  "sha256": "1339b0adb2b66b80f71050d15f765df2bcf6898714ba0f4e80fd92934eabd0b1",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "star_blue",
  "category": "Rewards",
  "sha256": "413274ccca15646789c93e4be8bca8cb7371a2c6d10aa0b220e6f6fe3fa34dcf",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "star_purple",
  "category": "Rewards",
  "sha256": "7afb1bafbdc6395ded3ef9fa5b081d49738887d8a8ec8b31b8a0ed102a820e87",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "star_rainbow",
  "category": "Rewards",
  "sha256": "6054a6a4bac57295bb1dff136e9dcb08e921cee67371532d4a3a470c4db4cd13",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "seed",
  "category": "Rewards",
  "sha256": "8d55b672e00e0b377d97fafd22f0217f97ad1c7bff770e1fb02fcb064d04805a",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "sprout",
  "category": "Rewards",
  "sha256": "8f751d56534fca3efca213d8361ff50b6680bb439a091a2c8ab20bd74906b4cf",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "bud",
  "category": "Rewards",
  "sha256": "b833782b42a2cf0f4acf24bb3b3ea1b448cd282eb0a9305a6403cbd8b1c5196e",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "bloom",
  "category": "Rewards",
  "sha256": "822c49a1b4b81d67869c2ffe6b120ae0624829f49ee17587f980f92fde223d44",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "gift",
  "category": "Rewards",
  "sha256": "13399e047f4ec479712bd6d51faf329306d9f332d683b61684d03e3762897882",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "heart",
  "category": "Rewards",
  "sha256": "9ba1376c789041173391b15c57f5c781322a790203083d37fc267c9b0b7eef0a",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "badge_book",
  "category": "Rewards",
  "sha256": "a0f4fbd387f52eb510d1112daf3c0ba74a30ac891ad7e0ef6f21365bc95d3857",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "badge_leaf",
  "category": "Rewards",
  "sha256": "d0dfdc9759accf33ba834ebadc125f7dc984ee24569876244584232e6a99ddd4",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "badge_crown",
  "category": "Rewards",
  "sha256": "bb2106ffd706a8306f2fd41a5617aa9a8e2ecf8a6cc6ceca39273e77136963ee",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "magic_dust",
  "category": "Rewards",
  "sha256": "8e9e53d93393409eeeb8d009cf7a78ad9aec4ccfcbd1a78bf314d693a39122f7",
  "width": 1254,
  "height": 1254
 },
 {
  "id": "ui_mission_panel",
  "category": "UI",
  "sha256": "39b8b5f9fec708a48c687304f17bd9cd7065fe5c008efc7e4f796d2283c80628",
  "width": 1774,
  "height": 887
 },
 {
  "id": "ui_star_pill",
  "category": "UI",
  "sha256": "4cfe2b9bf556c942e337249993e18fca8c44cbce551563d167202e0e28241ad4",
  "width": 2172,
  "height": 724
 },
 {
  "id": "ui_button",
  "category": "UI",
  "sha256": "3a8b734f1460ae3c7f090f09847c221cfd4a78f97813ae27e21b9aa399e6dd75",
  "width": 1983,
  "height": 793
 }
];
const root=fileURLToPath(new URL('..',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function option(name){
 const index=process.argv.indexOf(name);
 if(index<0)return null;
 assert.ok(process.argv[index+1]&&!process.argv[index+1].startsWith('--'),name+' requires a path');
 return path.resolve(process.argv[index+1]);
}
const unityRoot=option('--unity-root'),baselineRoot=option('--baseline-root');
let checked=0;
const check=(description,fn)=>{fn();checked++;console.log('PASS',description);};
const files=['app.js','experience.css','village/village-ui.js','village/village-ui.css'];
const [app,appCSS,village,villageCSS]=await Promise.all(files.map(name=>readFile(path.join(root,name),'utf8')));
const delivered=await Promise.all(expectedAssets.map(async asset=>({...asset,bytes:await readFile(path.join(root,'village/assets',asset.id+'.png'))})));
for(const asset of delivered){
 check('exact native PNG '+asset.id,()=>{
  assert.equal(sha(asset.bytes),asset.sha256,asset.id+' must retain the Unity native original bytes');
  assert.equal(asset.bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(asset.bytes.toString('ascii',12,16),'IHDR');
  assert.equal(asset.bytes.readUInt32BE(16),asset.width);
  assert.equal(asset.bytes.readUInt32BE(20),asset.height);
  assert.ok([4,6].includes(asset.bytes[25]),asset.id+' must have an alpha channel');
 });
}
check('complete native art category contract',()=>{
 assert.equal(expectedAssets.filter(a=>a.category==='Rewards').length,14);
 assert.equal(expectedAssets.filter(a=>a.category==='UI').length,3);
 assert.equal(expectedAssets.filter(a=>a.category==='Characters').length,2);
 assert.equal(new Set(expectedAssets.map(a=>a.id)).size,19);
});
if(unityRoot){
 const catalog=JSON.parse(await readFile(path.join(unityRoot,'Assets/Art/Generated/asset-catalog.json'),'utf8'));
 const manifest=JSON.parse(await readFile(path.join(unityRoot,'Assets/Art/Generated/native-v2-file-manifest.json'),'utf8'));
 for(const asset of delivered){
  const relative='Assets/Resources/Sprites/'+asset.category+'/'+asset.id+'.png';
  const original=await readFile(path.join(unityRoot,relative));
  check('live Unity original and manifest '+asset.id,()=>{
   assert.equal(sha(original),asset.sha256);
   assert.deepEqual(asset.bytes,original);
   const row=catalog.assets.find(a=>a.assetId===asset.id);assert.ok(row);assert.equal(row.sha256,asset.sha256);assert.equal(row.file,relative);
   const entry=manifest.entries.find(e=>e.role==='current-native-png'&&e.path.endsWith('/'+relative));assert.ok(entry);assert.equal(entry.sha256,asset.sha256);
  });
 }
}

// Extract selected pure declarations, with a lexical brace scan so their
// actual branches execute in an isolated VM. Unrelated app startup is excluded.
// This small scanner covers these declarations' strings/templates/comments;
// it is intentionally not a general JavaScript parser.
function declaration(source,name){
 const match=new RegExp('(?:^|\\n)function '+name+'\\s*\\(').exec(source);assert.ok(match,'Actual helper is defined: '+name);
 const start=match.index+(source[match.index]==='\n'?1:0),open=source.indexOf('{',start);
 let depth=0,quote='',lineComment=false,blockComment=false;
 for(let i=open;i<source.length;i++){
  const c=source[i],next=source[i+1];
  if(lineComment){if(c==='\n')lineComment=false;continue;}
  if(blockComment){if(c==='*'&&next==='/'){blockComment=false;i++;}continue;}
  if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
  if(c==='/'&&next==='/'){lineComment=true;i++;continue;}
  if(c==='/'&&next==='*'){blockComment=true;i++;continue;}
  if(c==='"'||c==="'"||c===String.fromCharCode(96)){quote=c;continue;}
  if(c==='{')depth++;
  else if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw new Error('Unclosed actual helper: '+name);
}
const names=['nativeRewardArt','nativeProgressArt','nativeStarArt','nativeGiftArt','nativeBadgeArt','nativeRoundCue'];
const allowlist=/^const NATIVE_REWARDS=.*;$/m.exec(app);assert.ok(allowlist,'Actual native allowlist exists');
const helpers=vm.runInNewContext(allowlist[0]+'\n'+names.map(name=>declaration(app,name)).join('\n')+'\n({'+names.join(',')+',allowed:[...NATIVE_REWARDS]})',{}, {timeout:1000});
const villageProgress=vm.runInNewContext(declaration(village,'nativeProgressArt')+'\nnativeProgressArt',{}, {timeout:1000});
check('actual allowlist contains only the fourteen approved reward IDs',()=>{
 assert.deepEqual([...helpers.allowed].sort(),expectedAssets.filter(a=>a.category==='Rewards').map(a=>a.id).sort());
});
check('unknown and path-like native IDs render no image',()=>{
 for(const id of ['missing','../star_yellow','star_yellow.png','toString','__proto__','<img>',undefined,null,{}])
  assert.equal(helpers.nativeRewardArt(id),'');
});
check('decorative images have empty alt fixed dimensions and safe classes',()=>{
 for(const id of helpers.allowed){
  const html=helpers.nativeRewardArt(id,'badge " onerror="alert(1)');
  assert.match(html,new RegExp('src="\\./village/assets/'+id+'\\.png"'));
  assert.match(html,/alt="" aria-hidden="true" width="48" height="48"/);
  assert.match(html,/class="native-art [a-zA-Z0-9 _-]*" src=/);
  assert.equal(html.includes('onerror='),false);
 }
});
const stages=[
 [0,5,'seed'],[1,5,'sprout'],[2,5,'sprout'],[3,5,'bud'],[4,5,'bud'],[5,5,'bloom'],
 [6,5,'bloom'],[-2,5,'seed'],[.9,5,'seed'],[1.9,5,'sprout'],[2,4,'bud'],
 [1,3,'sprout'],[2,3,'bud'],[3,3,'bloom'],[NaN,5,'seed'],[Infinity,5,'seed'],
 ['2',5,'seed'],[1,0,'seed'],[1,-1,'seed'],[1,1.5,'seed'],[1,NaN,'seed']
];
for(const [answered,total,stage]of stages)check('actual app and village stage boundary '+String(answered)+'/'+String(total),()=>{
 assert.equal(helpers.nativeProgressArt(answered,total),stage);
 assert.equal(villageProgress(answered,total),stage);
});
check('subject star variants follow the actual subject',()=>{
 assert.equal(helpers.nativeStarArt('math'),'star_yellow');
 assert.equal(helpers.nativeStarArt('korean'),'star_purple');
 assert.equal(helpers.nativeStarArt('english'),'star_blue');
 assert.equal(helpers.nativeStarArt(undefined),'star_yellow');
});
const badges=[['first-round','badge_leaf'],['three-subjects','badge_book'],['try-again','badge_crown'],['two-days','star_rainbow']];
check('locked and truthy-but-unconfirmed badges remain neutral',()=>{
 for(const [id]of badges)for(const unlocked of [false,undefined,null,0,1,'true'])
  assert.equal(helpers.nativeBadgeArt({id,unlocked}),'seed');
 assert.equal(helpers.nativeBadgeArt(null),'seed');
});
check('only confirmed known badges get earned art',()=>{
 for(const [id,art]of badges)assert.equal(helpers.nativeBadgeArt({id,unlocked:true}),art);
 for(const id of ['unknown','toString','__proto__','constructor'])
  assert.equal(helpers.nativeBadgeArt({id,unlocked:true}),'seed');
});
const gifts={'sun-spark':'star_yellow','ocean-stars':'star_blue','galaxy-glow':'star_purple','rainbow-orbit':'star_rainbow','mark-heart':'heart','mark-leaf':'sprout','mark-flower':'bloom'};
check('actual gift catalog preserves specific art and fallback emoji',()=>{
 assert.equal(REWARD_ITEMS.length,48);
 for(const item of REWARD_ITEMS)assert.equal(helpers.nativeGiftArt(item),gifts[item.id]||(item.kind==='family'?'gift':''));
 for(const id of ['unknown','toString','__proto__','constructor'])assert.equal(helpers.nativeGiftArt({id,kind:'cosmetic'}),'');
 assert.equal(helpers.nativeGiftArt(null),'');
});
check('round cue counts confirmed answers and never mutates a round',()=>{
 for(const [answers,stage]of [[0,'seed'],[1,'sprout'],[3,'bud'],[5,'bloom'],[6,'bloom']]){
  const round={ids:['a','b','c','d','e'],answers:Array.from({length:answers},()=>({correct:false,earned:0}))},before=JSON.stringify(round);
  const html=helpers.nativeRoundCue(round);
  assert.ok(html.includes('data-stage="'+stage+'"'));
  assert.ok(html.includes('답 '+Math.min(answers,5)+'/5'));
  assert.equal(JSON.stringify(round),before);
 }
});
check('native UI images are referenced by actual controls in both surfaces',()=>{
 for(const id of ['ui_mission_panel','ui_star_pill','ui_button']){
  assert.ok(appCSS.includes("url('./village/assets/"+id+".png')"),'App CSS uses '+id);
  assert.ok(villageCSS.includes("url('./assets/"+id+".png')"),'Village CSS uses '+id);
 }
 for(const id of ['taehee_original','sehee_original']){
  assert.ok(appCSS.includes("url('./village/assets/"+id+".png')"));
  assert.ok(villageCSS.includes("url('./assets/"+id+".png')"));
 }
 assert.match(appCSS,/\.native-art\s*\{[^}]*object-fit:contain/);
 assert.match(villageCSS,/\.vh-currency-art,\.vh-round-image\s*\{[^}]*object-fit:contain/);
 assert.ok(app.includes("nativeRewardArt('magic_dust')"),'Brand uses dust decoration');
 assert.ok(app.includes('nativeRewardArt(nativeGiftArt(look.light))'),'Equipped light follows authoritative wallet look');
 assert.ok(app.includes('nativeRewardArt(nativeBadgeArt(b))'),'Badge cards use locked guard');
 assert.ok(app.includes('nativeRoundCue(r)'),'Quiz includes confirmed-answer cue');
 assert.ok(village.includes("gameId==='kind-dialogue'?'star_purple':'star_yellow'"),'Village uses the concrete available-game subject mapping');
});
if(baselineRoot){
 for(const name of ['platform/rewards.js','platform/reward-catalog.js','platform/progress.js','platform/irt.js','village/village-state.js','village/village-bridge.js']){
  const [current,baseline]=await Promise.all([readFile(path.join(root,name)),readFile(path.join(baselineRoot,name))]);
  check('authoritative model unchanged '+name,()=>assert.deepEqual(current,baseline));
 }
}
console.log('native-art PASS',checked,'checks; Rewards 14 + UI 3 + Characters 2 bytes verified; live Unity comparison',Boolean(unityRoot),'; baseline model comparison',Boolean(baselineRoot));
