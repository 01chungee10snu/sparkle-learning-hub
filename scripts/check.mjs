import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCatalog,validateGame} from '../platform/catalog.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=validateCatalog(JSON.parse(await fs.readFile(path.join(root,'games/catalog.json'),'utf8')));
let count=0;
for(const entry of catalog){
 if(entry.status!=='published')continue;
 if(entry.kind==='external')continue;
 const game=validateGame(JSON.parse(await fs.readFile(path.join(root,entry.source),'utf8')),entry);
 assert.equal(entry.questionCount,game.questions.length,entry.id);
 for(const q of game.questions){
  assert.ok(q.explanation.every(s=>typeof s==='string'&&s.length>3),q.id);
  if(q.visual?.kind==='counters'){
   const {left,right,operator}=q.visual;
   assert.ok(Number.isInteger(left)&&Number.isInteger(right)&&left>=0&&right>=0,q.id);
   assert.ok(['+','-'].includes(operator),q.id);
   const value=operator==='+'?left+right:left-right;
   assert.ok(value>=0&&value<=20,q.id);
   assert.equal(parseInt(q.choices[q.answer],10),value,q.id);
  }
  if(q.speak){assert.equal(q.speak.lang,'en-US',q.id);assert.equal(q.speak.text.toLowerCase(),q.choices[q.answer].toLowerCase(),q.id);}
 }
 count+=game.questions.length;
}
console.log(`PASS: ${catalog.filter(g=>g.status==='published').length} published games; ${count} new questions; catalog, arithmetic and speech answers verified`);
