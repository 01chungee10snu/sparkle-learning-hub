/**
 * Canonical practice-bank import for the unified village.
 * Source is the user's already-public, app-authored practice world, not KMA source material.
 * Never mutate the archived source world; deterministic, idempotent copies only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const old=path.join(root,'magic-village-v06');
const file=relative=>path.join(root,relative);
const srcCatalog=JSON.parse(fs.readFileSync(path.join(old,'games/catalog.json'),'utf8'));
const practice=JSON.parse(fs.readFileSync(path.join(old,'games/bebsu-challenges.json'),'utf8'));
const original=fs.readFileSync(file('games/catalog.json'),'utf8');
const catalog=JSON.parse(original);
assert.equal(practice.publicPractice,true);
assert.equal(practice.grades.length,9);
const expected=practice.grades.map(g=>g.gameId),byId=new Map(srcCatalog.map(g=>[g.id,g]));
const shouldExist=new Set();
for (const grade of practice.grades) {
 assert.equal(grade.papers.length,3);
 const g=byId.get(grade.gameId);
 assert(g,'Practice catalog missing '+grade.gameId);
 const src=path.join(old,g.source.replace(/^\.\//,''));
 const out=file(g.source.replace(/^\.\//,''));
 const bytes=fs.readFileSync(src);
 const parsed=JSON.parse(bytes);
 assert.equal(parsed.questions.length,75);
 const questionIds=new Set(parsed.questions.map(q=>q.id));
 for(const paper of grade.papers){
   assert.equal(paper.questionIds.length,25);
   assert.equal(new Set(paper.questionIds).size,25);
   assert(paper.questionIds.every(id=>questionIds.has(id)));
 }
 fs.mkdirSync(path.dirname(out),{recursive:true});
 if(fs.existsSync(out))assert.deepEqual(fs.readFileSync(out),bytes,'Existing practice file differs: '+out);
 else fs.writeFileSync(out,bytes);
 shouldExist.add(g.id);
 if(!catalog.some(entry=>entry.id===g.id))catalog.push({
  ...g,sourceGroup:'village-practice',gradeBand:g.gradeBand||grade.grade.toUpperCase(),
  papers:grade.papers.map(p=>({paperId:p.paperId,difficulty:p.difficulty,
    label:p.label,title:p.title,questionIds:p.questionIds}))
 });
}
assert.equal(shouldExist.size,9);
const output=file('games/magic-practice-challenges.json');
const content=fs.readFileSync(path.join(old,'games/bebsu-challenges.json'));
if(fs.existsSync(output))assert.deepEqual(fs.readFileSync(output),content);
else fs.writeFileSync(output,content);
const existingIds=new Set();
for(const entry of catalog){assert(!existingIds.has(entry.id),'Duplicate '+entry.id);existingIds.add(entry.id);}
const final=JSON.stringify(catalog,null,2)+'\n';
if(final!==original)fs.writeFileSync(file('games/catalog.json'),final);
console.log('PRACTICE_BANK_IMPORT_PASS source world unchanged, nine games and 675 authored questions, three 25-item papers/grade; catalog='+catalog.length);
