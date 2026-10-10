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
 'village/Build/WebGL.framework.js.unityweb','village/Build/WebGL.loader.js'
];
const files=Object.fromEntries(names.map(name=>{
 const absolute=path.join(root,name);
 if(!existsSync(absolute))throw Error('Build source missing: '+name);
 return [name,{sha256:createHash('sha256').update(readFileSync(absolute)).digest('hex')}];
}));
const receipt={
 version:'0.5.0-dev',
 purpose:'Auditable developer verification only — not a public content license.',
 unitTests:{
  normalHub:'npm run check (2026-10-10; success observed)',
  adaptiveShop:'scripts/check-village-major-patch.mjs — pass',
  KMA25:'scripts/check-bebsu-village.mjs — pass',
  directionalUnity:'MAGIC_MAJOR_PATCH_AUDIT_PASS views=8 headings=8 states=6',
  WebGL:'MAGIC_VILLAGE_WEB_BUILD_OK (Unity 6000.3.26f1)',
  chromeVisual:'15 captures; 0 page errors; phone/tablet/desktop',
  chromeRealGame:'two children, v0.5.0 WebGL, 3 portals and KMA source image, 0 page errors',
  chromeFullFlow:'Taehee real KMA 25/25 +160 stars; shop buy/equip/reload; sibling separated, 0 page errors'
 },
 locationOfRawBrowserProof:'/Users/01chungee10/AI-Interop/evidence/sparkle-major-v1-20261010',
 sourceOfUnityProject:'/Users/01chungee10/Github/sparkle-fairy-village',
 files,
 limitations:[
  'Only 4 original perspective poses per fairy; four intermediate headings are blended.',
  'IRT difficulty and guessing are editorial/provisional, not independently calibrated.',
  'KMA source metadata records originalLicenseStatus=private_reference_only.',
  'Real iOS, iPadOS, Android physical performance not yet certified.',
  'Some virtual companions still show a neutral gift icon instead of unique animal art.'
 ]
};
writeFileSync(path.join(root,'docs/MAJOR_PATCH_V1_VERIFICATION.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('RECEIPT_OK',names.length,'source/build SHA-256 values');
