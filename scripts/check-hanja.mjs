import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateCatalog,validateGame} from '../platform/catalog.js';
import * as IRT from '../platform/irt.js';
import * as Progress from '../platform/progress.js';
import * as HanjaUI from '../platform/hanja-ui.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const catalog=validateCatalog(json('games/catalog.json')),bank=json('games/irt-bank.json');
const expected=[
 ['H8',50],['H7II',50],['H7',50],['H6II',75],['H6',75],
 ['H5II',100],['H5',100],['H4II',250],['H4',250],['H3II',500],['H3',317]
],hanja=catalog.filter(g=>g.subject==='hanja');
assert.equal(hanja.length,11);
assert.equal(bank.count,8462);
assert.equal(IRT.configureBank(bank),8462);
let total=0;
const allFamilies=new Set(),allIDs=new Set();
for(const [i,[band,glyphCount]] of expected.entries()){
 const entry=hanja.find(g=>g.gradeBand===band);
 assert(entry,'grade missing: '+band);
 const game=validateGame(json(entry.source.slice(1)),entry);
 assert.equal(game.hanjaGrade,entry.hanjaGrade);
 assert.equal(game.questions.length,glyphCount*2);
 assert.equal(entry.starterCards.length,8);
 const families=new Set();
 for(const q of game.questions){
   assert(!allIDs.has(q.id),'repeated question id');
   allIDs.add(q.id);
   assert.equal(q.choices.length,4);
   assert.equal(new Set(q.choices).size,4);
   assert(typeof q.hanjaCharacter==='string'&&[...q.hanjaCharacter].length===1);
   assert(IRT.itemAt(entry.id,q.id)?.family===q.hanjaFamily);
   assert(IRT.itemAt(entry.id,q.id)?.gradeBand===band);
   families.add(q.hanjaFamily);
   allFamilies.add(q.hanjaFamily);
   assert.equal(q.visual.text,q.hanjaCharacter);
 }
 assert.equal(families.size,glyphCount,'distinct glyphs: '+band);
 total+=game.questions.length;
 const select=IRT.selectQuestions({game,candidates:game.questions,profile:{games:{}},size:5,stage:1});
 assert.equal(select.length,5);
 assert.equal(new Set(select.map(id=>IRT.itemAt(entry.id,id).family)).size,5,'siblings in one round');
}
assert.equal(total,3634);
assert.equal(allFamilies.size,1817);
assert.equal(IRT.bankSize(),8462);
const entry=hanja[0],one=entry.questionIds[0],two=entry.questionIds[1],t=Date.now();
const record=(correct,at,assisted)=>({seen:1,firstAttempt:{id:'attempt-a',roundId:'round-a',at,correct,assisted}});
let games={[entry.id]:{records:{[one]:record(false,t,false),[two]:record(true,t+500,false)}}};
let e=IRT.evidenceFor(games,'hanja');
assert.equal(e.length,1,'same glyph counted twice');
assert.equal(e[0].correct,false,'earliest answer should win');
games={[entry.id]:{records:{[one]:record(false,t,true),[two]:record(true,t+500,false)}}};
e=IRT.evidenceFor(games,'hanja');
assert.equal(e.length,0,'hinted first exposure must not be counted');
const store=new Map();
globalThis.localStorage={
 getItem:key=>store.get(key)??null,
 setItem:(key,value)=>{store.set(key,String(value));},
 removeItem:key=>{store.delete(key);},
};
Progress.configureCatalog(catalog);
assert.equal(Progress.configureIrtBank(bank),8462);
const html=HanjaUI.renderHanjaHome({catalog,who:'tae',selected:'H8',flipped:new Set()});
assert(html.includes('hanja-start')&&html.includes('data-action="hanja-grade"')&&html.includes('data-action="hanja-flip"'));
assert.equal((html.match(/class="hanja-grade-tab/g)||[]).length,11);
assert(html.includes('한자 수련관'));
console.log('PASS_HANJA: 11 grades; 1,817 independent glyph families; 3,634 validated practice questions; 8,462-item IRT; sibling dedupe; assisted exclusion; five distinct glyphs/round; child UI');
