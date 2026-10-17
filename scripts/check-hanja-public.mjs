import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCatalog,validateGame} from '../platform/catalog.js';
import * as P from '../platform/progress.js';
import * as IRT from '../platform/irt.js';
import * as HanjaUI from '../platform/hanja-ui.js';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=validateCatalog(json('games/catalog.json')),bank=json('games/irt-bank.json');
P.configureCatalog(catalog);assert.equal(P.configureIrtBank(bank),bank.count);
const expected=[['H8',50],['H7II',50],['H7',50],['H6II',75],['H6',75],['H5II',100],['H5',100],['H4II',250],['H4',250],['H3II',500],['H3',317]];
const entries=catalog.filter(g=>g.subject==='hanja');assert.equal(entries.length,11);
const all=new Set();let count=0,rounds=0;
for(const who of ['tae','se']){
 P.selectLearner(who);
 for(const [band,glyphCount] of expected){
  const entry=entries.find(e=>e.gradeBand===band);assert(entry);assert.equal(entry.maxChoices,4);
  const game=validateGame(json(entry.source.slice(2)),entry);const family=new Set();
  for(const q of game.questions){
   assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);
   assert(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.equal(q.visual.text,q.hanjaCharacter);
   assert.equal(IRT.itemAt(game.id,q.id).family,q.hanjaFamily);family.add(q.hanjaFamily);
   if(who==='tae')all.add(q.hanjaFamily);
  }
  assert.equal(family.size,glyphCount);if(who==='tae')count+=game.questions.length;
  const r=P.beginRound(game);assert.equal(new Set(r.ids.map(id=>IRT.itemAt(game.id,id).family)).size,r.ids.length);
  const firstId=r.ids[0];P.answerQuestion(game,3);
  // Regression: the fourth choice must survive the next read/clean/reload.
  assert.equal(P.gameProgress(game.id).round.answers[0].response,3);
  P.nextQuestion(game.id,game);
  while(!P.gameProgress(game.id).round.finished){
   const current=P.gameProgress(game.id).round;
   const q=game.questions.find(q=>q.id===current.ids[current.index]);
   P.answerQuestion(game,q.answer);P.nextQuestion(game.id,game);
  }
  const completed=P.gameProgress(game.id).round;
  assert.equal(completed.answers.length,P.LEARNERS[who].roundSize);
  assert.equal(new Set(completed.ids.map(id=>IRT.itemAt(game.id,id).family)).size,completed.ids.length);
  rounds++;
 }
}
assert.equal(count,3634);assert.equal(all.size,1817);assert.equal(rounds,22);
const preserved=P.exportRecords();P.importRecords(preserved);
for(const who of ['tae','se'])for(const e of entries)assert.equal(P.gameProgress(e.id,who).completedRounds.length,1);
assert.equal(P.ability('hanja','tae').n,55);assert.equal(P.ability('hanja','se').n,33);
const e=entries[0],q1=e.questionIds[0],q2=e.questionIds[1];
const rec=(correct,at,assisted=false)=>({seen:1,firstAttempt:{id:'attempt-x',roundId:'round-x',at,correct,assisted}});
const ev=IRT.evidenceFor({[e.id]:{records:{[q1]:rec(false,1),[q2]:rec(true,2)}}},'hanja');
assert.equal(ev.length,1);assert.equal(ev[0].correct,false);
assert.equal(IRT.evidenceFor({[e.id]:{records:{[q1]:rec(false,1,true),[q2]:rec(true,2)}}},'hanja').length,0);
const html=HanjaUI.renderHanjaHome({catalog,who:'tae',selected:'H3',flipped:new Set()});
assert.equal((html.match(/class="hanja-grade-tab/g)||[]).length,11);
assert(html.includes('3급 모험 시작')&&html.includes('hanja-grade-dataset'));
console.log(JSON.stringify({status:'PASS_HANJA_PUBLIC',grades:11,glyphs:1817,questions:3634,totalIrtItems:bank.count,completedSyntheticRounds:22,fourthChoicePersists:true,backupMerge:true,siblingIsolation:true,firstGlyphDedupe:true}));
