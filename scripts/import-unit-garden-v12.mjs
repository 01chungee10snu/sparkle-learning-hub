/** Lossless import of the authorized, source-hashed unit garden question copy.
 * Source data is parsed as JSON; no source JavaScript or app/profile code runs.
 * Usage: node scripts/import-unit-garden-v12.mjs [--verify]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateCatalog,validateGame} from '../platform/catalog.js';
import {STAGE_DIFFICULTY} from '../platform/irt.js';

const web=fileURLToPath(new URL('../',import.meta.url));
const root=path.dirname(web.replace(/[\\/]$/,''));
const sourceDir=path.join(root,'rea/legacy-unit-garden');
const evidenceDir=path.join(root,'evidence/unit-garden-migration-v12');
const sourcePath=path.join(sourceDir,'questions.js');
const sourceSha='4428fdba23ac18c6e4eecfb5c8a07b0012877d2d496e26b5700916d97dc7caf1';
const readmeSha='3e6e7129797ce83c7ec00abd028f3ee8b3cac2ef79c382279d374e7cd7169d7a';
const sourceCommit='9774bd198648f10ac8d73b704288505ebb880d53';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=data=>JSON.stringify(data,null,2)+'\n';
const verify=process.argv.includes('--verify');
const bytes=fs.readFileSync(sourcePath);
assert.equal(hash(bytes),sourceSha,'Source question bytes drifted');
assert.equal(hash(fs.readFileSync(path.join(sourceDir,'README.md'))),readmeSha,'Source README bytes drifted');
const match=bytes.toString('utf8').match(/^\s*export const QUESTIONS\s*=\s*(\[[\s\S]*\]);\s*$/);
assert(match,'Expected a data-only JSON export; refusing to execute source code');
const original=JSON.parse(match[1]);
assert.equal(original.length,48);
const courses=['length','weight','distance','mix'];
for(const course of courses){
  assert.equal(original.filter(q=>q.course===course).length,12,course);
  for(const level of [1,2])assert.equal(original.filter(q=>q.course===course&&q.level===level).length,6,course+':'+level);
}
const identity={
  type:'authorized_user_project_copy',
  originalPath:'/Users/01chungee10/GitHub/fairy-math-garden/questions.js',
  preservedCopy:'rea/legacy-unit-garden/questions.js',
  sha256:sourceSha,
  repositoryCommit:sourceCommit,
  license:'No project LICENSE found; authorized local user-project adaptation. No open-source license inferred.',
  acquisition:'Prime copied source and reported original SHA/HEAD; this importer independently verifies the preserved copy.',
  sourceQuestionGitStatus:'Prime reported questions.js unchanged at source HEAD; README and other source-repository files have uncommitted changes.'
};

const questions=original.map((source,index)=>{
  assert(courses.includes(source.course));
  assert([1,2].includes(source.level));
  assert(Number.isFinite(source.total)&&Number.isFinite(source.percent));
  assert(source.percent>=0&&source.percent<=100);
  assert.equal(source.total*source.percent/100,source.result,source.id+': remaining amount');
  const divisor={cm:100,g:1000,m:1000}[source.baseUnit];
  assert(divisor&&({cm:'m',g:'kg',m:'km'})[source.baseUnit]===source.convertUnit,source.id+': units');
  assert.equal(source.result/divisor,source.convertValue,source.id+': conversion');
  const expected=String(source.result)+source.baseUnit+' · '+String(source.convertValue)+source.convertUnit;
  assert.equal(source.choices[source.answer],expected,source.id+': original answer');
  assert.equal(source.choices.filter(c=>c===expected).length,1,source.id+': unique answer');
  return {
    ...source,
    explanation:[...source.explain],
    skill:source.course,
    source:{id:source.id,...identity},
    provenance:{
      source:'owned_unit_garden_original',sourceId:source.id,sourcePosition:index,
      sourceSha256:sourceSha,skillCode:source.course,
      answerVerificationStatus:'independently_arithmetic_checked',
      answerVerificationScope:'total * remainingPercent / 100; metric unit conversion; exact unique correct-choice label. Wording suitability not independently reviewed.',
      difficultyB:0,
      difficultyCalibration:'editorial_provisional',
      difficultyBasis:{
        sourceLevel:source.level,
        sourceTier:source.level===1?'whole-half-zero':'varied-percent',
        anchorRule:'STAGE_DIFFICULTY[source.level]',
        anchorB:STAGE_DIFFICULTY[source.level],
        sequenceOffsetRule:'(position / 47 - 0.5) * 0.24',
        empiricalCalibration:false,
        limitation:'Source local levels 1/2 are mapped editorially to the existing engine anchors; they are not proven equivalent to growth stages, age or measured ability.'
      }
    }
  };
});

const catalogPath=path.join(web,'games/catalog.json');
const catalogBytes=fs.readFileSync(catalogPath);
const catalog=validateCatalog(JSON.parse(catalogBytes));
const index=catalog.findIndex(e=>e.id==='unit-garden');
assert(index>=0,'Original unit-garden entry is missing');
const oldEntry=catalog[index];
assert.equal(oldEntry.progressAdapter,'unit-garden-v1');
assert.equal(oldEntry.questionCount,48);
assert(['external','quiz'].includes(oldEntry.kind));
const entry={...oldEntry,kind:'quiz',source:'./games/unit-garden/game.json',questionIds:questions.map(q=>q.id),
  sourceGroup:'unit-garden-owned',growth:false,courses,modes:['choice']};
delete entry.url;
const game={id:'unit-garden',subject:'math',title:entry.title,description:entry.description,emoji:entry.emoji,
  growth:false,strand:'math.units.percent',progressAdapter:'unit-garden-v1',
  prerequisite:'전체·부분과 단위를 구분하고, 길이·무게·거리의 양을 이야기해요.',
  offline:'같은 길이의 종이띠를 나누어 보고 실제 자와 저울의 단위를 살펴보세요.',
  provenance:{...identity,sourceQuestionCount:48,calibration:'editorial_provisional',preservedFields:Object.keys(original[0]),
    explanationMapping:'explain -> explanation (exact array copy); original explain field also retained',
    presentationScope:'Questions, choices, answers and explanations are carried into the existing quiz renderer. The legacy app renderer, percentage slider and animation are not ported.'},
  questions};
validateGame(game,entry);
const nextCatalog=catalog.map((e,i)=>i===index?entry:e);
validateCatalog(nextCatalog);
const gamePath=path.join(web,'games/unit-garden/game.json');
const gameContent=json(game),catalogContent=json(nextCatalog);
const backupPath=path.join(evidenceDir,'catalog-before.json');
const manifestPath=path.join(sourceDir,'MIGRATION_MANIFEST.json');
const preserved=[{file:'questions.js',sha256:sourceSha},{file:'README.md',sha256:readmeSha}];
const manifest={version:'unit-garden-v12-lossless-1',source:identity,preserved,
  destination:'web/games/unit-garden/game.json',gameSha256:hash(gameContent),questionCount:48,
  sourceOrderPreserved:true,allOriginalQuestionFieldsPreserved:true,explanationAliasExact:true,
  courseCounts:Object.fromEntries(courses.map(c=>[c,questions.filter(q=>q.course===c).length])),
  catalog:{id:entry.id,kind:entry.kind,source:entry.source,progressAdapter:entry.progressAdapter,questionIds:entry.questionIds},
  gradingAndProfiles:'Existing learning engine owns grading and IRT. This importer reads no child profiles or browser storage and grants no rewards.',
  rendererMigration:'Legacy visual interaction not imported; original numeric and visualLabel source fields retained as data.',
  calibration:'Editorial initial values only, not empirical calibration.',
  commands:['node scripts/import-unit-garden-v12.mjs','node scripts/build-irt-bank.mjs','node scripts/check-unit-garden-v12.mjs','node scripts/import-unit-garden-v12.mjs --verify','node scripts/build-irt-bank.mjs --verify']};

if(verify){
  assert.equal(fs.readFileSync(gamePath,'utf8'),gameContent,'Imported game is stale');
  assert.equal(fs.readFileSync(catalogPath,'utf8'),catalogContent,'Catalog mapping is stale');
  assert.equal(fs.readFileSync(manifestPath,'utf8'),json(manifest),'Migration manifest is stale');
}else{
  fs.mkdirSync(path.dirname(gamePath),{recursive:true});
  fs.mkdirSync(evidenceDir,{recursive:true});
  if(!fs.existsSync(backupPath))fs.writeFileSync(backupPath,catalogBytes,{flag:'wx'});
  const writeExactNew=(p,content)=>{
    if(fs.existsSync(p)){assert.equal(fs.readFileSync(p,'utf8'),content,'Unrelated existing output: '+p);return;}
    fs.writeFileSync(p,content,{flag:'wx'});
  };
  writeExactNew(gamePath,gameContent);
  assert.equal(fs.readFileSync(catalogPath,'utf8'),catalogBytes.toString('utf8'),'Concurrent catalog edit detected');
  if(catalogContent!==catalogBytes.toString('utf8')){
    const temporary=catalogPath+'.unit-v12.tmp';
    fs.writeFileSync(temporary,catalogContent,{flag:'wx'});
    fs.renameSync(temporary,catalogPath);
  }
  writeExactNew(manifestPath,json(manifest));
}
assert.equal(hash(fs.readFileSync(sourcePath)),sourceSha,'Preserved source was modified');
console.log((verify?'VERIFIED':'IMPORTED')+': 48 original unit-garden questions; all source fields and adapter preserved; game SHA256 '+hash(gameContent));
