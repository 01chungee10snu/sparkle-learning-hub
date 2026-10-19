import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// This guard makes child-friendly copy editing safe. Child-facing story text,
// helper messages and explanations MAY change, but the assessment evidence,
// published source references, original illustrations and scoring never do.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baselinePath=path.join(root,'docs/CHILD_COPY_QUESTION_INTEGRITY_V32.json');
const creating=process.argv.includes('--create-baseline');
const gitBase='a5c008cb8b96f82d27e7fb98831669f51e75b925';
const immutableQuestionFields=['id','answer','choices','interaction','visual','problemImage','solutionImage','provenance','paperId','source','sourceQuestion','gradeBand','hanjaCharacter','hanjaFamily','hanjaTask'];
const immutableGameFields=['id','subject','kind','status','sourceInfo','growth','stage','gradeBand','hanjaGrade','sourceGroup'];
const canon=value=>{
 if(Array.isArray(value))return value.map(canon);
 if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canon(value[k])]));
 return value;
};
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(canon(value))).digest('hex');
const readJSON=rel=>{
 const raw=creating?cp.execFileSync('git',['show',gitBase+':'+rel],{cwd:root,maxBuffer:40*1024*1024,encoding:'utf8'}):fs.readFileSync(path.join(root,rel),'utf8');
 return JSON.parse(raw);
};
const catalog=readJSON('games/catalog.json');
assert(Array.isArray(catalog),'Quiz catalog should be an array');
const tests=[], seen=new Set();let total=0;
for(const entry of catalog){
 if(entry.kind!=='quiz')continue;
 const rel=entry.source?.replace(/^\.\//,'');
 assert(/^games\/[a-z0-9-]+\/game\.json$/.test(rel||''),`Unexpected quiz source ${rel}`);
 assert(!seen.has(rel),`Repeated source ${rel}`);seen.add(rel);
 const game=readJSON(rel);
 assert(Array.isArray(game.questions),`No items in ${rel}`);
 assert.equal(game.questions.length,entry.questionCount,`Catalog count drift in ${rel}`);
 assert.deepEqual(game.questions.map(q=>q.id),entry.questionIds,`Catalog ID/order drift in ${rel}`);
 const restricted=game.questions.map(q=>Object.fromEntries(immutableQuestionFields.filter(k=>Object.hasOwn(q,k)).map(k=>[k,q[k]])));
 const gameIdentity=Object.fromEntries(immutableGameFields.filter(k=>Object.hasOwn(game,k)).map(k=>[k,game[k]]));
 tests.push({source:rel,count:game.questions.length,immutableSha256:digest({game:gameIdentity,questions:restricted})});
 total+=game.questions.length;
}
const catalogIdentity=catalog.filter(g=>g.kind==='quiz').map(g=>({id:g.id,subject:g.subject,kind:g.kind,status:g.status,source:g.source,questionCount:g.questionCount,questionIds:g.questionIds}));
const bank=readJSON('games/irt-bank.json');
// Authored copy edits legitimately refresh this fingerprint. Every ability
// coefficient/item/order/model field remains immutable.
const {sourceSha256: contentChecksum,...irtCalibration}=bank;
const current={format:'child-copy-fidelity-v32',reference:gitBase,gameCount:tests.length,questionCount:total,
 catalogQuestionIdentitySha256:digest(catalogIdentity),IRTCalibrationSha256:digest(irtCalibration),games:tests};
if(creating){
 fs.writeFileSync(baselinePath,JSON.stringify(current,null,2)+'\n');
 console.log('CREATED_CHILD_COPY_INTEGRITY_BASELINE',tests.length,'game files',total,'questions');
}else{
 assert(fs.existsSync(baselinePath),'Missing immutable content baseline');
 const expected=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
 assert.equal(current.reference,expected.reference);
 assert.equal(current.gameCount,expected.gameCount);
 assert.equal(current.questionCount,expected.questionCount);
 assert.equal(current.catalogQuestionIdentitySha256,expected.catalogQuestionIdentitySha256,'Question IDs/sequence/catalog identity changed');
 assert.equal(current.IRTCalibrationSha256,expected.IRTCalibrationSha256,'The IRT calibration bank coefficients and item identity must never change while editing copy');
 const map=new Map(expected.games.map(e=>[e.source,e]));
 for(const entry of current.games){
  assert(map.has(entry.source),'Unexpected new source '+entry.source);
  assert.equal(entry.count,map.get(entry.source).count,`Question count changed: ${entry.source}`);
  assert.equal(entry.immutableSha256,map.get(entry.source).immutableSha256,`Answer/choices/visual/interactions/provenance changed: ${entry.source}`);
 }
 console.log('PASS_CHILD_COPY_CONTENT_INTEGRITY',current.gameCount,'quiz sources,',current.questionCount,'items, no answer/provenance/IRT drift');
}
