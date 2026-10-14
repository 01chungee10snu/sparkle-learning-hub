import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=path.resolve(root,'../../magic-village-production-v14-20261014/web');
const read=relative=>readFileSync(path.join(root,relative),'utf8');
const html=read('village/index.html'),entry=read('village/entry-v15.js');
assert.match(html,/type="module" src="\.\/entry-v15\.js\?v=nav-v15-20261014"/);
assert.match(html,/navigation-v15\.css/);
assert(!html.includes('type="module" src="./entry-v14.js'));
const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
assert(match,'A single module-identity map is required');
const imports=JSON.parse(match[1]).imports;
for(const name of ['progress','irt','rewards','catalog','settings','activities'])
  assert.equal(imports[`../platform/${name}.js`],`../platform/${name}.js?v=nav-v15-20261014`);
assert.match(entry,/productVersion:'0\.15\.0-navigation-v15'/);
assert.match(entry,/window\.MagicVillageV15Diagnostics = diagnostics/);
assert.match(entry,/command === 'GO_HOME' \|\| command === 'GO_PLAZA'/);
assert.match(entry,/action:'INIT', area, requestId/);
assert.match(entry,/if \(document\.hidden\) sendToUnity\('APP_PAUSE'\)/);
assert.match(entry,/ui\.syncNavigation\?\.\(\)/);
const protectedFiles=['platform/progress.js','platform/irt.js','platform/rewards.js',
  'games/catalog.json','games/irt-bank.json','village/village-bridge.js'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of protectedFiles)
  assert.equal(hash(readFileSync(path.join(root,file))),hash(readFileSync(path.join(baseline,file))),
    'Navigation changes must not mutate the protected learning host: '+file);
console.log(JSON.stringify({status:'PASS',entry:'v15',protectedFiles:protectedFiles.length,
  moduleMap:'single-v15',checks:'static entry wiring plus exact protected-file equality; browser runtime is separate'}));
