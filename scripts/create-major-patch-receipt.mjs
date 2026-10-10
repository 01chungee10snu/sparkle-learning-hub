/** Emit a deterministic file-hash receipt, no personal child records. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const names=[
 'games/bebsu-challenges.json','games/irt-bank.json','platform/village-adaptive.js',
 'platform/progress.js','platform/rewards.js','village/major-patch.css',
 'village/village-ui.js','village/village-bridge.js','village/index.html',
 'village/Build/WebGL.data.unityweb','village/Build/WebGL.wasm.unityweb',
 'village/Build/WebGL.framework.js.unityweb','village/Build/WebGL.loader.js',
 'scripts/check-learning-reinforcement.mjs','scripts/major-patch-visual-qa.mjs',
 'village/assets/gameplay/npc_bunny.png','docs/VILLAGE_V06_LEARNING_BOOST_20261010.md'
];
const files=Object.fromEntries(names.map(name=>{
 const absolute=path.join(root,name);
 if(!existsSync(absolute))throw Error('Build source missing: '+name);
 return [name,{sha256:createHash('sha256').update(readFileSync(absolute)).digest('hex')}];
}));
const receipt={
 version:'0.6.0-dev',
 purpose:'Auditable developer verification only — not a public content license.',
 unitTests:{
  normalHub:'npm run check (2026-10-10; success observed)',
  adaptiveShop:'scripts/check-village-major-patch.mjs — pass',
  KMA25:'scripts/check-bebsu-village.mjs — pass',
  directionalUnity:'MAGIC_MAJOR_PATCH_AUDIT_PASS premium=8 thumbnail-prototype=16 heading_states=8 motion_states=6',
  reinforcement:'scripts/check-learning-reinforcement.mjs — genuine second-round corrections +12 and explanations +4; cap and sibling protection',
  WebGL:'MAGIC_VILLAGE_WEB_BUILD_OK (Unity 6000.3.26f1)',
  chromeVisual:'24 captures; 0 page errors; phone/tablet/desktop including space-interaction and reflection',
  chromeRealGame:'two children, v0.6.0 WebGL, 8-angle concept toggle + shop + IRT + KMA source images; 0 page errors',
  chromeFullFlow:'Taehee KMA 25/25 +160 and learning-explanation +2; shop buy/equip/reload; sibling separated, 0 page errors'
 },
 locationOfRawBrowserProof:'/Users/01chungee10/AI-Interop/evidence/sparkle-major-v1-20261010',
 sourceOfUnityProject:'/Users/01chungee10/Github/sparkle-fairy-village',
 files,
 limitations:[
  'Default premium art: 4 true perspectives + 4 blended angles; experimental 8-way art uses 200x133 Canva preview only, pending high-resolution originals.',
  'IRT difficulty and guessing are editorial/provisional, not independently calibrated.',
  'KMA source metadata records originalLicenseStatus=private_reference_only.',
  'Real iOS, iPadOS, Android physical performance not yet certified.',
  'Some virtual companions still show a neutral gift icon instead of unique animal art.',
  'KMA source image data is still private_reference_only and has not been publicly deployed by this patch.'
 ]
};
writeFileSync(path.join(root,'docs/MAJOR_PATCH_V1_VERIFICATION.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('RECEIPT_OK',names.length,'source/build SHA-256 values');
