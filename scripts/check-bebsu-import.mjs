import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateGame} from '../platform/catalog.js';
import {gradeResponse} from '../platform/activities.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const entries=read('docs/bebsu-catalog-fragment.json');
const manifest=read('docs/bebsu-import-manifest.json');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizedNumber=raw=>String(raw).trim().replace(/[０-９]/g,char=>String.fromCharCode(char.charCodeAt(0)-0xfee0)).replace(/[−－]/g,'-').replace(/[\s,]/g,'');
const ids=new Set(), sourceIds=new Set(), imagePaths=new Set(manifest.assets.map(asset=>asset.path));
let imported=0, arithmetic=0, originals=0, negative=0;

function generatedAnswer(question){
 const values=(question.story.match(/\d+/g)??[]).map(Number), slot=question.provenance.examQuestionNo;
 if(slot===1)return values[0];
 if(slot===2)return values[0]+1;
 if([3,8,23,14].includes(slot))return values.reduce((a,b)=>a+b,0);
 if([4,9].includes(slot))return values[0]-values[1];
 if([5,19].includes(slot))return Math.max(...values);
 if([6,13].includes(slot))return values[1]-values[0];
 if([7,16].includes(slot))return values[0]*10+values[1];
 if(slot===10)return (values[0]+values[1])/2;
 if(slot===11)return Math.abs(values[0]-values[1]);
 if([12,17,24].includes(slot))return values[2]*2-values[1];
 if([15,25].includes(slot))return values[0]+values[1]-values[2];
 if(slot===18)return values[1];
 if(slot===20)return Object.entries({'삼각형':3,'사각형':4,'오각형':5}).find(([name])=>question.story.includes(name))[1];
 if(slot===21)return values[0]*values[1];
 if(slot===22)return values[1]*10+values[3];
 throw new Error(`Unknown native template: ${question.source.id}`);
}

for(const entry of entries){
 assert.equal(entry.sourceGroup,'bebsu');assert.equal(entry.growth,false);
 const game=validateGame(read(entry.source),entry);
 for(const question of game.questions){
  assert(!ids.has(question.id),'Duplicated stable question ID');ids.add(question.id);
  assert(!sourceIds.has(question.source.id),'Duplicated original question ID');sourceIds.add(question.source.id);
  assert.equal(question.id,`bebsu-${hash(Buffer.from(question.source.id)).slice(0,16)}`,'Stable source-to-question ID');
  const answer=question.source.answer;
  if(answer.type==='number'){
   assert.equal(question.interaction.type,'numeric');assert.equal(question.interaction.target,answer.value,'Source answer changed');
   assert.notEqual(normalizedNumber(answer.raw),'','Numeric raw answer must exist');assert.equal(Number(normalizedNumber(answer.raw)),answer.value,'Numeric raw answer disagrees with source value');
   assert(gradeResponse(question,String(answer.value)).correct,'Source numeric answer must pass');
   assert(!gradeResponse(question,String(answer.value===question.interaction.max?answer.value-1:answer.value+1)).correct,'A different number must fail');
   if(answer.value<0){negative++;assert.equal(entry.numericMin,-99);assert.equal(question.interaction.min,-99);}
  }else{
   const expected='①②③④⑤'.indexOf(answer.raw);assert(expected>=0);assert.equal(question.answer,expected,'Source choice answer changed');
   if(answer.correct_choice_id!==undefined)assert.equal('ABCDE'.indexOf(answer.correct_choice_id),expected,'Choice letter and raw circle disagree');
   assert(gradeResponse(question,expected).correct);assert(!gradeResponse(question,(expected+1)%5).correct);
  }
  if(question.provenance.source==='sehee_foundation'){
   const [,a,operation,b]=question.story.match(/^(\d+)\s*([+-])\s*(\d+)\s*=\s*\?$/);
   assert.equal(question.interaction.target,operation==='+'?Number(a)+Number(b):Number(a)-Number(b));arithmetic++;
  }else if(question.provenance.source==='generated_g1_variant'){
   assert.equal(question.interaction.target,generatedAnswer(question));arithmetic++;
  }else{
   originals++;assert(imagePaths.has(question.problemImage),'Original problem image provenance required');assert(imagePaths.has(question.solutionImage),'Original solution image provenance required');
   if(process.argv.includes('--final'))for(const name of ['problemImage','solutionImage']){
    const image=question.provenance[name];assert.equal(image.path,question[name]);assert.equal(Number(image.sourcePath.match(/_q(\d+)\.png$/)?.[1]),question.provenance.examQuestionNo,'Original image question number differs');
    assert(image.recovery?.kind,'Strict official PDF image recovery provenance required');assert(image.recovery.source_pdf,'Official source PDF path required');
    assert(Number.isInteger(image.recovery.page)&&image.recovery.page>=0,'Source PDF page required');assert.equal(image.recovery.bounds.length,4,'Source PDF bounds required');
   }
  }
  imported++;
 }
}
assert.equal(imported,manifest.importedQuestions);assert.equal(arithmetic,125);assert.equal(ids.size,imported);assert.equal(sourceIds.size,imported);
assert.equal(manifest.excludedCounts.missing_or_unverified_answer,13);
const sourceCount=Object.values(manifest.sourceCounts).reduce((a,b)=>a+b,0);assert.equal(sourceCount,3795);assert.equal(manifest.foundationQuestions,25);
assert.equal(imported+manifest.excluded.length,sourceCount+manifest.foundationQuestions,'All source questions must be imported or explicitly excluded');
assert.equal(Object.values(manifest.excludedCounts).reduce((a,b)=>a+b,0),manifest.excluded.length);
if(process.argv.includes('--final')){
 assert.equal(imported,3805);assert.equal(originals,3680);assert.equal(negative,1);assert.equal(manifest.importedGames,12);assert.equal(manifest.excludedCounts.missing_problem_or_solution_image??0,0);assert.equal(manifest.excludedCounts.unsupported_original_answer,2);assert.equal(manifest.excluded.length,15);
}
let imageFiles=0;
if(process.argv.includes('--assets')){
 const checked=new Set();
 for(const asset of manifest.assets){
  assert.match(asset.path,/^\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/);assert.equal(asset.path.slice(-20,-4),asset.sha256.slice(0,16));
  if(checked.has(asset.path))continue;checked.add(asset.path);
  const path=resolve(root,asset.path);assert(existsSync(path),'Published original image missing');const bytes=readFileSync(path);
  assert.equal(hash(bytes),asset.sha256,'Original image bytes changed');assert.equal(bytes.length,asset.bytes);assert.equal(bytes.readUInt32BE(16),asset.width);assert.equal(bytes.readUInt32BE(20),asset.height);imageFiles++;
 }
 assert.equal(imageFiles,manifest.uniqueAssetFiles);
}
console.log(JSON.stringify({imported,arithmeticIndependentlyChecked:arithmetic,originalAnswersMappedUnchanged:originals,uniqueStableIds:ids.size,negativeAnswers:negative,imageFilesVerified:imageFiles},null,2));
