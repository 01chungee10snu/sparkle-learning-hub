import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IRT from '../platform/irt.js';
import * as P from '../platform/progress.js';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v))};
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const catalog=read('../games/catalog.json'),bank=read('../games/irt-bank.json');
P.configureCatalog(catalog);P.configureIrtBank(bank);P.selectLearner('tae');
const meta=catalog.find(g=>g.id==='bebsu-g1-original');
const game={...read('../games/bebsu-g1-original/game.json'),gradeBand:meta.gradeBand};
const paperId='kma-16';
const checks=[];
const answer=q=>q.interaction?.type==='numeric'?String(q.interaction.target):q.interaction?.type==='build'?q.interaction.target:q.interaction?.type==='match'?q.interaction.pairs:['sequence','memory'].includes(q.interaction?.type)?q.interaction.order:q.answer;
const snapshot=()=>structuredClone(JSON.parse(store.get(P.KEY)));
const reset=()=>store.set(P.KEY,JSON.stringify({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}}));
const current=()=>P.gameProgress(game.id).round;
const stepAnswer=()=>{const s=current(),q=game.questions.find(q=>q.id===s.ids[s.index]);assert.ok(q);assert.ok(P.answerQuestion(game,answer(q)));};
reset();const starting=P.beginRound(game,{paperId});assert.equal(starting.ids.length,25);
for(let i=0;i<22;i++){stepAnswer();P.nextQuestion(game.id,game);}
assert.equal(current().index,22);stepAnswer();
const checkpoint=snapshot(),before=current();
const remain=before.ids.slice(23).map(id=>game.questions.find(q=>q.id===id));
const profile=checkpoint.profiles.tae;
const expected=IRT.selectQuestions({game,candidates:remain,profile,size:2,stage:P.stageSelection(game.subject),exclude:before.ids.slice(0,23),positionOffset:23,roundSize:25});
assert.equal(expected.length,2);
P.nextQuestion(game.id,game);
assert.equal(current().index,23);
assert.deepEqual(current().ids.slice(23),expected);
assert.equal(new Set(current().ids).size,25);
checks.push('25-item suffix at index 23 uses absolute offset 23 and roundSize 25');
const restore=()=>store.set(P.KEY,JSON.stringify(checkpoint));
const rejectPreserving=(variant,label)=>{
 restore();const beforeRaw=store.get(P.KEY);const prev=current();
 assert.throws(()=>P.nextQuestion(game.id,variant),/IRT|원문|색인|게임/);
 assert.equal(store.get(P.KEY),beforeRaw,`${label}: persisted record must remain identical`);
 assert.deepEqual(current(),prev,`${label}: index, IDs, answers, timestamps, hinted must remain`);
 checks.push(label);
};
rejectPreserving({...game,id:'wrong-game'},'wrong game rejected before mutation');
rejectPreserving({...game,questions:game.questions.filter(q=>q.id!==before.ids[23])},'missing question rejected before mutation');
const missingId=before.ids[23];
const incompleteBank={...bank,items:bank.items.filter(x=>!(x.gameId===game.id&&x.id===missingId))};
IRT.configureBank(incompleteBank);
try{rejectPreserving(game,'missing bank entry rejected before mutation');}
finally{P.configureIrtBank(bank);}
const full=IRT.selectQuestions({game,candidates:remain,profile,size:2,stage:3});
assert.deepEqual(full,IRT.selectQuestions({game,candidates:remain,profile,size:2,stage:3,positionOffset:0,roundSize:2}));
for(const opts of [{positionOffset:-1,roundSize:25},{positionOffset:24,roundSize:25},{positionOffset:0.5,roundSize:25},{positionOffset:0,roundSize:1}]){
 assert.deepEqual(IRT.selectQuestions({game,candidates:remain,profile,size:2,stage:3,...opts}),[]);
}
checks.push('legacy selector defaults identical; invalid offsets and round sizes fail closed');
console.log(JSON.stringify({status:'PASS',checks,productionFilesChanged:false,syntheticStorage:true}));
