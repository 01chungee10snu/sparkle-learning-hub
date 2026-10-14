/** Independently validate source equivalence, numeric correctness and index coverage.
 * Only the preserved public/owned question data is read. No profile code is executed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateCatalog,validateGame} from '../platform/catalog.js';
import {gradeResponse} from '../platform/activities.js';
import {STAGE_DIFFICULTY,configureBank,selectQuestions} from '../platform/irt.js';
const web=fileURLToPath(new URL('../',import.meta.url));
const root=path.dirname(web.replace(/[\\/]$/,''));
const source=path.join(root,'rea/legacy-unit-garden/questions.js');
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const raw=fs.readFileSync(source);
const expectedSha='4428fdba23ac18c6e4eecfb5c8a07b0012877d2d496e26b5700916d97dc7caf1';
assert.equal(sha(raw),expectedSha);
const match=raw.toString('utf8').match(/^\s*export const QUESTIONS\s*=\s*(\[[\s\S]*\]);\s*$/);
assert(match);
const originals=JSON.parse(match[1]);
const catalog=validateCatalog(JSON.parse(fs.readFileSync(path.join(web,'games/catalog.json'),'utf8')));
const entry=catalog.find(e=>e.id==='unit-garden');
assert.equal(entry.kind,'quiz');assert.equal(entry.progressAdapter,'unit-garden-v1');
assert.equal(entry.url,undefined);assert.equal(entry.source,'./games/unit-garden/game.json');
const gameBytes=fs.readFileSync(path.join(web,'games/unit-garden/game.json'));
const game=validateGame(JSON.parse(gameBytes),entry);
assert.equal(game.questions.length,48);assert.equal(originals.length,48);
assert.deepEqual(entry.questionIds,originals.map(q=>q.id));
const bankBytes=fs.readFileSync(path.join(web,'games/irt-bank.json'));
const bank=JSON.parse(bankBytes);
const indexed=bank.items.filter(item=>item.gameId==='unit-garden');
assert.equal(indexed.length,48);
assert.equal(bank.count,4876);assert.equal(bank.items.length,4876);
assert.equal(catalog.filter(e=>e.kind==='quiz'&&e.status==='published').length,55);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'evidence/unit-garden-migration-v12/catalog-before.json'),'utf8'));
assert.deepEqual(catalog.filter(e=>e.id!=='unit-garden'),baseline.filter(e=>e.id!=='unit-garden'),'Unrelated catalog entries changed');
const proof=[];
let answerChecks=0;
for(const [position,original] of originals.entries()){
  const q=game.questions[position];
  for(const [key,value] of Object.entries(original))assert.deepEqual(q[key],value,q.id+': source field '+key);
  assert.deepEqual(q.explanation,original.explain,q.id+': explanation alias');
  assert.equal(q.skill,original.course);assert.equal(q.provenance.skillCode,original.course);
  assert.equal(q.source.id,original.id);assert.equal(q.source.sha256,expectedSha);
  // Integer multiplication proves the percentage relation without floating rounding.
  assert.equal(original.result*100,original.total*original.percent,q.id+': percentage');
  const factor=original.baseUnit==='cm'?100:1000;
  assert.equal(original.convertValue*factor,original.result,q.id+': conversion');
  const choicePattern=/^(\d+(?:\.\d+)?)(cm|g|m) · (\d+(?:\.\d+)?)(m|kg|km)$/;
  const numericChoices=original.choices.map(choice=>{
    const parts=choice.match(choicePattern);assert(parts,q.id+': choice syntax');
    return {value:Number(parts[1]),unit:parts[2],converted:Number(parts[3]),convertedUnit:parts[4]};
  });
  const mathematicalMatches=numericChoices.map((c,i)=>c.value===original.result&&c.unit===original.baseUnit&&c.converted===original.convertValue&&c.convertedUnit===original.convertUnit?i:null).filter(i=>i!==null);
  assert.deepEqual(mathematicalMatches,[original.answer],q.id+': independently decoded answer');
  for(let answer=0;answer<q.choices.length;answer++){
    assert.equal(gradeResponse(q,answer).correct,answer===original.answer,q.id+': authoritative grading');answerChecks++;
  }
  const items=indexed.filter(item=>item.id===q.id);assert.equal(items.length,1);
  const item=items[0];
  assert.equal(item.skill,original.course);assert.equal(item.stage,original.level);
  assert.equal(item.c,.333);assert.equal(item.mode,'choice');
  assert.equal(item.verification,'independently_arithmetic_checked');
  const expectedB=Math.round((STAGE_DIFFICULTY[original.level]+(position/47-.5)*.24)*1000)/1000;
  assert.equal(item.b,expectedB,q.id+': editorial difficulty');
  const projection=Object.fromEntries(Object.keys(original).map(k=>[k,q[k]]));
  const originalHash=sha(JSON.stringify(original));
  assert.equal(sha(JSON.stringify(projection)),originalHash);
  proof.push({id:q.id,course:q.course,level:q.level,preservedFields:Object.keys(original).length,
    sourceObjectSha256:originalHash,importedSourceProjectionSha256:sha(JSON.stringify(projection)),
    exactExplanation:true,independentArithmetic:true,choiceGradingCases:q.choices.length,
    indexedOnce:true,editorialB:item.b,notEmpiricallyCalibrated:true});
}
const courseCounts=Object.fromEntries(['length','weight','distance','mix'].map(c=>[c,proof.filter(q=>q.course===c).length]));
assert.deepEqual(Object.values(courseCounts),[12,12,12,12]);
assert.equal(originals.filter(q=>q.percent===0).length,4);
assert.equal(originals.filter(q=>q.percent===100).length,4);
// The actual shared IRT selector can draw every imported item and remains fail-closed.
configureBank(bank);
const syntheticProfile={games:{}};
const gameBefore=JSON.stringify(game),profileBefore=JSON.stringify(syntheticProfile);
const selectionArgs={game,candidates:game.questions,profile:syntheticProfile,size:5,stage:2};
const selected=selectQuestions(selectionArgs);
assert.equal(selected.length,5);assert.equal(new Set(selected).size,5);
assert(selected.every(id=>entry.questionIds.includes(id)));
assert.deepEqual(selectQuestions(selectionArgs),selected,'IRT selection must be deterministic');
const all=selectQuestions({...selectionArgs,size:48});
assert.deepEqual([...all].sort(),[...entry.questionIds].sort(),'Every original ID is selectable');
assert.equal(selectQuestions({...selectionArgs,size:49}).length,0,'Exhaustion must not fall back');
const excluded=selectQuestions({...selectionArgs,exclude:selected});
assert.equal(excluded.length,5);assert(excluded.every(id=>!selected.includes(id)));
configureBank({...bank,items:bank.items.filter(item=>!(item.gameId==='unit-garden'&&item.id===entry.questionIds[0]))});
assert.deepEqual(selectQuestions(selectionArgs),[],'Missing item metadata must fail closed');
configureBank(bank);
assert.equal(JSON.stringify(game),gameBefore);assert.equal(JSON.stringify(syntheticProfile),profileBefore);
const report={status:'PASS_SOURCE_EQUIVALENCE_AND_SYNTHETIC_GRADING',version:'unit-garden-v12-lossless-1',
  sourceSha256:sha(raw),gameSha256:sha(gameBytes),bankSha256:sha(bankBytes),
  totalIndexed:bank.count,publishedQuizCount:55,unitCount:48,courseCounts,answerCases:answerChecks,
  sourceAllFieldsPreserved:true,questionOrderPreserved:true,unrelatedCatalogEntriesUnchanged:true,
  priorProfileAccess:false,priorStorageAccess:false,newRewardWrites:false,
  syntheticIrtChecks:{fiveUnique:true,deterministic:true,all48Selectable:true,exclusionRespected:true,
    insufficientCandidatesFailClosed:true,missingItemMetadataFailClosed:true,inputsUnchanged:true},
  limits:['Original external source hash/commit attested by prime; preserved copy independently hashed here.',
    'Calibration is an editorial assumption; no learning-effectiveness or empirical IRT validation.',
    'Prior wallet/profile migration and browser route validation are separate tasks.',
    'Legacy percentage slider and visual rendering were not ported; original data fields remain available.'],
  command:'node scripts/check-unit-garden-v12.mjs',questions:proof};
fs.writeFileSync(path.join(root,'rea/legacy-unit-garden/EQUIVALENCE_PROOF.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS: 48 lossless questions, 4x12 courses, 144 grading cases, 7 synthetic IRT invariants, 4876 indexed items / 55 quizzes; no child-profile access');
