import assert from 'node:assert/strict';
import {validateInteraction,normalizeResponse,normalizeNumericResponse,gradeResponse,answerText,responseText} from '../platform/activities.js';
import * as UI from '../platform/activity-ui.js';
import {validateCatalog,validateGame} from '../platform/catalog.js';

const numeric={interaction:{type:'numeric',target:70,max:99}},zero={interaction:{type:'numeric',target:0,max:10}};
const negative={interaction:{type:'numeric',target:-11,min:-99,max:9999}};
assert.equal(validateInteraction(numeric),numeric);
assert.equal(normalizeResponse(numeric,' ００７０ '),'70');
assert.equal(normalizeResponse(zero,'000'),'0');
assert.equal(gradeResponse(numeric,'70').correct,true);
assert.equal(gradeResponse(numeric,'69').correct,false);
assert.equal(gradeResponse(zero,'0').correct,true);
assert.equal(gradeResponse(zero,'1').correct,false);
assert.equal(answerText(numeric),'70');assert.equal(responseText(zero,'000'),'0');
for(const bad of ['', ' ', '-1', '+1', '7.0', '1e2', '0x46', '7 0', '1,000', 'NaN', 'Infinity', '10000000', null, 70, [], {}])assert.throws(()=>normalizeResponse(numeric,bad),String(bad));
assert.throws(()=>normalizeResponse(zero,'11'));
assert.throws(()=>normalizeNumericResponse('1000001'));
assert.equal(normalizeNumericResponse('1000000'),'1000000');
assert.equal(validateInteraction(negative),negative);
assert.equal(normalizeResponse(negative,' −００１１ '),'-11');
assert.equal(normalizeResponse(negative,'－11'),'-11');
assert.equal(normalizeResponse(negative,'-0'),'0');
assert.equal(gradeResponse(negative,'-11').correct,true);assert.equal(gradeResponse(negative,'-10').correct,false);
assert.equal(answerText(negative),'-11');assert.equal(responseText(negative,'−0010'),'-10');
assert.equal(normalizeNumericResponse('-1000000',1000000,-1000000),'-1000000');
for(const text of ['-','--11','-1e2','-100','+11','－ 11','-11.0'])assert.throws(()=>normalizeResponse(negative,text));
assert.throws(()=>normalizeResponse(numeric,'-11'),'Positive-only questions keep rejecting negative answers');
for(const interaction of [
 {type:'numeric',target:-1,max:10},{type:'numeric',target:11,max:10},
 {type:'numeric',target:1.5,max:10},{type:'numeric',target:1,max:10.5},
 {type:'numeric',target:1,max:1000001},{type:'numeric',target:1,max:NaN},
 {type:'numeric',target:'1',max:10},{type:'numeric',target:1,max:'10'},
 {type:'numeric',target:-11,min:-10,max:99},{type:'numeric',target:-11,min:-1000001,max:99},
 {type:'numeric',target:1,min:null,max:99},{type:'numeric',target:1,min:'-99',max:99}
])assert.throws(()=>validateInteraction({interaction}));
assert.throws(()=>validateInteraction({...numeric,choices:['1','2','3'],answer:1}));
const fiveChoice={choices:['하나','둘','셋','넷','다섯'],answer:4};
assert.equal(validateInteraction(fiveChoice),fiveChoice);assert.equal(gradeResponse(fiveChoice,4).correct,true);assert.equal(gradeResponse(fiveChoice,0).correct,false);assert.equal(answerText(fiveChoice),'다섯');
assert.throws(()=>normalizeResponse(fiveChoice,5));assert.throws(()=>validateInteraction({choices:['하나','둘'],answer:0}));assert.throws(()=>validateInteraction({choices:['1','2','3','4','5','6'],answer:0}));
assert.equal((UI.renderActivity(fiveChoice,null,null,String).match(/data-action="answer"/g)||[]).length,5);

// The actual keypad preserves blank vs zero and creates canonical strings.
const d=UI.createDraft(numeric);assert.deepEqual(d,{digits:''});assert.equal(UI.ready(numeric,d),false);
UI.interact(numeric,d,'activity-digit',0);assert.equal(UI.draftResponse(numeric,d),'0');assert.equal(UI.ready(numeric,d),true);
UI.interact(numeric,d,'activity-digit',0);assert.equal(d.digits,'0');
UI.interact(numeric,d,'activity-digit',7);assert.equal(d.digits,'7');
UI.interact(numeric,d,'activity-digit',0);assert.equal(d.digits,'70');
UI.interact(numeric,d,'activity-digit',1);assert.equal(d.digits,'70','Input cannot exceed the declared numeric bound');
UI.interact(numeric,d,'activity-delete');assert.equal(d.digits,'7');
UI.interact(numeric,d,'activity-delete');assert.equal(d.digits,'');assert.equal(UI.ready(numeric,d),false);
UI.interact(numeric,d,'activity-digit',-1);UI.interact(numeric,d,'activity-digit',10);assert.equal(d.digits,'');
UI.interact(numeric,d,'activity-digit',9);UI.interact(numeric,d,'activity-reset');assert.equal(d.digits,'');
const html=UI.renderActivity(numeric,null,d,String);
assert.equal((html.match(/data-action="activity-digit"/g)||[]).length,10);
assert.ok(html.includes('data-action="activity-delete"'));
assert.ok(html.includes('data-action="activity-submit" disabled'));
assert.equal(html.includes('<input'),false,'The keypad does not open the operating-system keyboard');
const nd=UI.createDraft(negative);UI.interact(negative,nd,'activity-sign');assert.equal(nd.digits,'-');assert.equal(UI.ready(negative,nd),false);
UI.interact(negative,nd,'activity-digit',1);UI.interact(negative,nd,'activity-digit',1);assert.equal(nd.digits,'-11');assert.equal(UI.ready(negative,nd),true);
UI.interact(negative,nd,'activity-sign');assert.equal(nd.digits,'11');UI.interact(negative,nd,'activity-sign');assert.equal(nd.digits,'-11');
UI.interact(negative,nd,'activity-delete');assert.equal(nd.digits,'-1');UI.interact(negative,nd,'activity-delete');assert.equal(nd.digits,'-');assert.equal(UI.ready(negative,nd),false);
UI.interact(negative,nd,'activity-digit',0);assert.equal(nd.digits,'0');assert.equal(UI.ready(negative,nd),true);
UI.interact(negative,nd,'activity-sign');assert.equal(nd.digits,'0');UI.interact(negative,nd,'activity-reset');assert.equal(nd.digits,'');
const negativeHtml=UI.renderActivity(negative,null,nd,String);
assert.equal((negativeHtml.match(/data-action="activity-digit"/g)||[]).length,10);
assert.equal((negativeHtml.match(/data-action="activity-sign"/g)||[]).length,1);
assert.equal(html.includes('activity-sign'),false,'Positive-only keypads do not show a sign switch');

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const P=await import('../platform/progress.js');
const makeGame=(id,q)=>({id,subject:'math',questions:Array.from({length:5},(_,n)=>({...structuredClone(q),id:`${id}-${n+1}`,title:'숫자로 생각해요',story:'문제를 살펴보아요.',prompt:'알맞은 수를 눌러요.',explanation:['내가 찾은 수를 함께 확인해요.']}))});
const highGame=makeGame('numeric-high',numeric),zeroGame=makeGame('numeric-zero',zero),oldGame=makeGame('numeric-legacy',{choices:['하나','둘','셋'],answer:1});
const mixedGame=makeGame('numeric-mixed',numeric);mixedGame.questions=mixedGame.questions.map((q,n)=>n<2?q:{...q,interaction:undefined,...structuredClone(fiveChoice)});
const negativeGame=makeGame('numeric-negative',negative);
const games=[highGame,zeroGame,oldGame,mixedGame,negativeGame];
const catalog=games.map(g=>({id:g.id,subject:'math',title:'함께 생각해요',description:'숫자를 직접 눌러 답해요.',kind:'quiz',status:'published',source:`./games/${g.id}/game.json`,modes:g.id===mixedGame.id?['numeric','choice']:[g.id===oldGame.id?'choice':'numeric'],...(g.id===mixedGame.id?{maxChoices:5}:{}),...(g.id===negativeGame.id?{numericMin:-99}:{}),questionCount:5,questionIds:g.questions.map(q=>q.id)}));
validateCatalog(catalog);games.forEach((g,n)=>validateGame(g,catalog[n]));P.configureCatalog(catalog);
const empty=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
const reset=()=>{storage.clear();storage.set(P.KEY,JSON.stringify(empty()));P.selectLearner('tae');};
const finish=(progress,game,response)=>{const r=progress.beginRound(game);for(const id of r.ids){assert.equal(progress.gameProgress(game.id).round.ids[progress.gameProgress(game.id).round.index],id);assert.ok(progress.answerQuestion(game,response));assert.equal(progress.answerQuestion(game,response),null);progress.nextQuestion(game.id);}return r;};

reset();
finish(P,highGame,'69');assert.equal(P.summary(catalog).stars,10,'Five valid incorrect answers preserve the two-star rule');
finish(P,highGame,'70');assert.equal(P.summary(catalog).stars,50,'Later correct answers add only the eight-star difference');
finish(P,highGame,'69');assert.equal(P.summary(catalog).stars,50,'A later error never removes stars');
P.selectLearner('se');const zeroRound=P.beginRound(zeroGame);assert.equal(zeroRound.ids.length,3);
assert.equal(P.answerQuestion(zeroGame,'000').response,'0');assert.equal(P.summary(catalog).stars,10);
assert.equal(P.summary(catalog,'tae').stars,50,'Sibling records and wallet inputs remain separate');
P.nextQuestion(zeroGame.id);P.answerQuestion(zeroGame,'0');P.nextQuestion(zeroGame.id);P.answerQuestion(zeroGame,'0');P.nextQuestion(zeroGame.id);
assert.equal(P.gameProgress(zeroGame.id).finishedRounds,1);assert.equal(P.summary(catalog).stars,30);

// Values beyond the legacy integer bound survive a real partial-round restore.
reset();const partial=P.beginRound(highGame);const first=P.answerQuestion(highGame,'００７０');
assert.equal(first.response,'70');assert.equal(first.earned,10);assert.equal(Object.hasOwn(first,'choice'),false);
const backup=structuredClone(P.exportRecords());
assert.equal(backup.format,'sparkle-learning-backup');assert.equal(backup.version,1);assert.equal(backup.platform.version,1);
reset();P.importRecords(backup);P.importRecords(backup);
const resumed=P.beginRound(highGame);assert.equal(resumed.id,partial.id);assert.equal(resumed.answers[0].response,'70');assert.equal(P.summary(catalog).stars,10);
assert.equal(P.answerQuestion(highGame,'70'),null,'Restored partial rounds cannot award the same question twice');
P.nextQuestion(highGame.id);P.answerQuestion(highGame,'70');assert.equal(P.summary(catalog).stars,20);

for(const response of ['','00','070','-1','1e2','1000001','7.0','x',70]){
 const corrupt=structuredClone(backup.platform);corrupt.profiles.tae.games[highGame.id].round.answers[0].response=response;
 assert.equal(P.clean(corrupt).profiles.tae.games[highGame.id].round,null,`Corrupt stored numeric response ${response}`);
}
const wrongGame=structuredClone(backup.platform),oldIds=oldGame.questions.map(q=>q.id);
wrongGame.profiles.tae.games[oldGame.id]={records:{},round:{id:'round-legacy',ids:oldIds,index:0,answers:[{id:oldIds[0],response:'1',correct:true,earned:10}],updatedAt:1}};
assert.equal(P.clean(wrongGame).profiles.tae.games[oldGame.id].round,null,'Legacy choice games do not gain string-answer acceptance');
wrongGame.profiles.tae.games[oldGame.id].round.answers[0]={id:oldIds[0],choice:1,correct:true,earned:10};
assert.equal(P.clean(wrongGame).profiles.tae.games[oldGame.id].round.answers[0].choice,1);
wrongGame.profiles.tae.games[oldGame.id].round.answers[0]={id:oldIds[0],choice:4,response:4,correct:true,earned:10};
assert.equal(P.clean(wrongGame).profiles.tae.games[oldGame.id].round,null,'Old three-choice imports still reject fourth/fifth choice indices');

// A faithful bank can mix numeric responses and original five-choice questions.
reset();const mixedRound=P.beginRound(mixedGame);
for(let n=0;n<mixedRound.ids.length;n++){
 const q=mixedGame.questions.find(q=>q.id===mixedRound.ids[n]);
 const a=P.answerQuestion(mixedGame,q.interaction?'70':4);
 assert.equal(a.correct,true);assert.equal(a.response,q.interaction?'70':4);
 const mixedBackup=structuredClone(P.exportRecords());P.importRecords(mixedBackup);
 assert.equal(P.gameProgress(mixedGame.id).round.answers[n].response,a.response);
 assert.equal(P.answerQuestion(mixedGame,q.interaction?'70':4),null);
 P.nextQuestion(mixedGame.id);
}
assert.equal(P.gameProgress(mixedGame.id).finishedRounds,1);assert.equal(P.summary(catalog).stars,50);
assert.equal(P.gameProgress(mixedGame.id).round.answers.filter(a=>typeof a.response==='string').length,2);
assert.equal(P.gameProgress(mixedGame.id).round.answers.filter(a=>a.choice===4).length,3);

// The one signed answer in the source bank keeps its meaning and reward rules.
reset();finish(P,negativeGame,'-10');assert.equal(P.summary(catalog).stars,10);
const signedRound=P.beginRound(negativeGame),signedAnswer=P.answerQuestion(negativeGame,'−11');
assert.equal(signedAnswer.response,'-11');assert.equal(signedAnswer.earned,8);assert.equal(P.summary(catalog).stars,18);
const signedBackup=structuredClone(P.exportRecords());reset();P.importRecords(signedBackup);P.importRecords(signedBackup);
assert.equal(P.beginRound(negativeGame).id,signedRound.id);assert.equal(P.gameProgress(negativeGame.id).round.answers[0].response,'-11');assert.equal(P.summary(catalog).stars,18);
assert.equal(P.answerQuestion(negativeGame,'-11'),null);P.nextQuestion(negativeGame.id);
while(!P.gameProgress(negativeGame.id).round.finished){assert.equal(P.answerQuestion(negativeGame,'-11').earned,8);P.nextQuestion(negativeGame.id);}
assert.equal(P.summary(catalog).stars,50);
for(const response of ['-0','−11','-100','--11']){const corrupt=structuredClone(signedBackup.platform);corrupt.profiles.tae.games[negativeGame.id].round.answers[0].response=response;assert.equal(P.clean(corrupt).profiles.tae.games[negativeGame.id].round,null,'Signed stored responses must be canonical and within the declared game bounds');}
const positiveBank=structuredClone(backup.platform);positiveBank.profiles.tae.games[highGame.id].round.answers[0].response='-11';
assert.equal(P.clean(positiveBank).profiles.tae.games[highGame.id].round,null,'Catalogs without numericMin never accept negative stored answers');

let instance=0;
async function fresh(){const p=await import(`../platform/progress.js?numeric-check-${++instance}`);p.configureCatalog(catalog);return p;}
function legacyState(best=10){const raw=empty();raw.profiles.tae.stageSelections.math={stage:3,updatedAt:10};raw.profiles.tae.games[oldGame.id]={records:{[oldIds[0]]:{best,seen:2,attempts:[{id:'attempt-legacy',roundId:'round-legacy',correct:best===10,at:10}]}},round:{id:'round-legacy',ids:oldIds,index:0,answers:[{id:oldIds[0],choice:1,correct:true,earned:10}],updatedAt:10},finishedRounds:2,lastPlayed:10};return raw;}

// Prefer v2 when both old keys exist; preserve both source snapshots exactly.
storage.clear();const v2=JSON.stringify(legacyState(10)),v1=JSON.stringify(legacyState(2));
storage.set(P.PREVIOUS_KEY,v2);storage.set(P.FIRST_KEY,v1);
const fromV2=await fresh();fromV2.selectLearner('tae');
assert.equal(fromV2.gameProgress(oldGame.id).records[oldIds[0]].best,10);assert.equal(fromV2.stageSelection('math'),3);
assert.equal(fromV2.gameProgress(oldGame.id).round.answers[0].choice,1);assert.equal(storage.get(P.PREVIOUS_KEY),v2);assert.equal(storage.get(P.FIRST_KEY),v1);
assert.ok(storage.has(P.KEY));
fromV2.beginRound(highGame);fromV2.answerQuestion(highGame,'70');const isolated=storage.get(P.KEY);
storage.set(P.PREVIOUS_KEY,JSON.stringify(empty()));storage.set(P.FIRST_KEY,JSON.stringify(empty()));
const reload=await fresh();assert.equal(reload.gameProgress(highGame.id).round.answers[0].response,'70');assert.equal(reload.gameProgress(oldGame.id).records[oldIds[0]].best,10);assert.equal(storage.get(P.KEY),isolated,'Old tabs cannot replace the independently stored v3 data');
reload.importRecords({format:'sparkle-learning-backup',version:1,platform:legacyState(2)});
assert.equal(reload.gameProgress(highGame.id).round.answers[0].response,'70');assert.equal(reload.gameProgress(oldGame.id).records[oldIds[0]].best,10,'Importing an older backup cannot lower existing stars');

// Devices that never wrote v2 still migrate v1 directly, without altering v1.
storage.clear();storage.set(P.FIRST_KEY,v2);const fromV1=await fresh();
assert.equal(fromV1.gameProgress(oldGame.id,'tae').records[oldIds[0]].best,10);assert.equal(storage.get(P.FIRST_KEY),v2);assert.equal(storage.has(P.PREVIOUS_KEY),false);assert.ok(storage.has(P.KEY));
console.log('PASS: faithful integer numeric grading, optional negative bounds and sign keypad, blank/zero keypad, unsafe input rejection, bounded drafts, >20 and signed response restore, mixed five-choice/numeric bank restore, legacy three-choice validation, 2/10 star rules, duplicate prevention, learner isolation, old backups and v2/v1→v3 migration with old-tab isolation');
