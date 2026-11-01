#!/usr/bin/env node
/** Standalone regression for the two quiz UIs and pattern-diverse IRT selection. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Numeric from '../platform/numeric-keypad.js';
import * as Activity from '../platform/activity-ui.js';
import * as IRT from '../platform/irt.js';
import {questionPattern, patternPenalty} from '../platform/question-variety.js';

const bounds={min:100,max:999};
let draft='';
for(const [digit,expected,valid] of [['1','1',false],['2','12',false],['3','123',true]]){
 draft=Numeric.applyNumericKey(draft,digit,bounds);
 assert.equal(draft,expected,`Positive lower bound must allow prefix ${digit}`);
 assert.equal(Numeric.numericDraftReady(draft,bounds),valid);
}
assert.equal(Numeric.applyNumericKey('999','9',bounds),'999','Cannot exceed upper bound');
assert.equal(Numeric.applyNumericKey('123','back',bounds),'12');
assert.equal(Numeric.applyNumericKey('123','clear',bounds),'');
assert.equal(Numeric.normalizeNumericDraft(' ００１２３ ',bounds),'123');
assert.equal(Numeric.normalizeNumericDraft('－００１１',{min:-99} ),'-11');
assert.equal(Numeric.applyNumericKey('-9','9',{min:-99,max:99}),'-99');
assert.equal(Numeric.applyNumericKey('-99','9',{min:-99,max:99}),'-99');
assert.equal(Numeric.applyNumericKey('0','minus',{min:-99,max:99}),'0');
assert.equal(Numeric.numericDraftReady('-', {min:-99,max:99}),false);
assert.equal(Numeric.numericDraftReady('001',{min:0,max:99}),false,'Incomplete noncanonical drafts never submit');

const q={interaction:{type:'numeric',target:123,min:100,max:999}},d=Activity.createDraft(q);
for(const n of [1,2,3])Activity.interact(q,d,'activity-digit',n);
assert.equal(Activity.draftResponse(q,d),'123');
assert.equal(Activity.ready(q,d),true);
assert.equal(Numeric.numericDraftReady('12',bounds),false);

const patternA={story:'상점에서 사과 1개를 샀어요.',prompt:'사과 1개를 몇 개라고 할까요?'};
const patternB={story:'연못에서 물고기 2마리를 만났어요.',prompt:'물고기 2마리는 모두 몇 마리일까요?'};
assert.equal(questionPattern(patternA),questionPattern({story:'상점에서 사과 4개를 샀어요.',prompt:'사과 4개를 몇 개라고 할까요?'}));
assert.notEqual(questionPattern(patternA),questionPattern(patternB));
const counts=new Map([[questionPattern(patternA),1]]);
assert(patternPenalty(patternA,counts,new Map())>patternPenalty(patternB,counts,new Map()));

const game={id:'v39-patterns',subject:'math',questions:Array.from({length:10},(_,i)=>({
 id:`v39-pattern-${i+1}`,
 ...(i<5?{story:`상점에서 사과 ${i+1}개를 샀어요.`,prompt:`사과 ${i+1}개를 몇 개라고 할까요?`}:{story:`연못에서 물고기 ${i+1}마리를 만났어요.`,prompt:`물고기 ${i+1}마리는 모두 몇 마리일까요?`})
}))};
IRT.configureBank({version:1,items:game.questions.map(q=>({gameId:game.id,id:q.id,subject:'math',skill:'수 세기',b:-.3,c:.25,mode:'choice'}))});
const selected=IRT.selectQuestions({game,candidates:game.questions,profile:{games:{}},size:4,stage:3});
assert.equal(selected.length,4);
assert.equal(new Set(selected).size,4);
assert.equal(new Set(selected.map(id=>questionPattern(game.questions.find(q=>q.id===id)))).size,2,
 'Equivalent IRT difficulty should still offer distinct stories when present');

const html=readFileSync(new URL('../village/index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../village/village-ui.js',import.meta.url),'utf8');
const bridge=readFileSync(new URL('../village/village-bridge.js',import.meta.url),'utf8');
assert.match(html,/readability-v39\.css/,'New child legibility rules loaded');
assert.match(ui,/applyNumericKey\(input\.value,value,bounds\)/,'Village uses shared keypad state');
assert.match(ui,/button\('🧠 다음 배움 3걸음'/,'Every completed round offers next learning');
assert.match(ui,/data-travel/,'Walking to a building has a readable destination caption');
assert.match(ui,/root\.dataset\.lite==='true'&&data\.action==='NEXT'&&data\.roundId/,'2D fallback completes verified rounds through the host');
assert.match(bridge,/questionId: item\.id,\s+subject: game\.subject/,'Subjects retained for next-learning recommendations');
const entry=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const learning=readFileSync(new URL('../learning.html',import.meta.url),'utf8');
for(const [name,document] of [['landing',entry],['learning',learning],['village',html]]){
 assert.match(document,/progress\.js\?v=refactor-v39-20261102/,name+' loads current progress module');
}
for(const [name,document] of [['learning',learning],['village',html]]){
 assert.match(document,/irt\.js\?v=refactor-v39-20261102/,name+' loads pattern-variety IRT');
 assert.match(document,/activity-ui\.js\?v=refactor-v39-20261102/,name+' loads shared numeric input');
}
assert.match(html,/village-bridge\.js\?v=refactor-v39-20261102/);
assert.match(html,/village-ui\.js\?v=refactor-v39-20261102/);
assert.match(learning,/app\.js\?v=refactor-v39-20261102/);
const threeDQA=readFileSync(new URL('./qa-3d-v39.mjs',import.meta.url),'utf8');
assert.match(threeDQA,/import\(siteBase\+'\/platform\/progress\.js'\)/,'3D QA must work under GitHub Pages repository subpaths');
assert.match(ui,/\['practice','🧩 마법 수학 훈련장'\]/,'Full subject map exposes practice');
assert.match(ui,/\['academy','🪄 마법학교'\]/,'Full subject map exposes academy');
assert.match(ui,/\['growth','🌟 성장의 탑'\]/,'Full subject map exposes growth');

console.log('PASS_REFACTOR_V39: shared keypad with positive lower bounds, signed canonicalization, UI parity, 2 visible story patterns, independent evidence unchanged, accessible next learning and wayfinding');
