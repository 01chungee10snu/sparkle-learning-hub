import assert from 'node:assert/strict';
import {retainedMemoryMoment} from '../platform/learning-moments.js';

const DAY=24*60*60*1000,now=Date.now();
const progress={completedRounds:[
 {id:'r-review',at:now,purpose:'review',strategy:'review',questionIds:['q7','q14','qhint']},
 {id:'r-transfer',at:now,purpose:'transfer',strategy:'adaptive',questionIds:['qtransfer']}
],records:{
 q7:{attempts:[
  {id:'q7-a',roundId:'old-7',correct:true,at:now-8*DAY},
  {id:'q7-b',roundId:'r-review',correct:true,at:now}
 ]},
 q14:{attempts:[
  {id:'q14-a',roundId:'old-14',correct:true,at:now-16*DAY},
  {id:'q14-b',roundId:'r-review',correct:true,at:now}
 ]},
 qhint:{attempts:[
  {id:'qh-a',roundId:'old-h',correct:true,at:now-20*DAY},
  {id:'qh-b',roundId:'r-review',correct:true,assisted:true,at:now},
  {id:'qh-c',roundId:'r-review',correct:true,at:now+1000}
 ]},
 qtransfer:{attempts:[
  {id:'qt-a',roundId:'old-t',correct:true,at:now-20*DAY},
  {id:'qt-b',roundId:'r-transfer',correct:true,at:now}
 ]}
}};
assert.deepEqual(retainedMemoryMoment(progress,'missing'),{kind:'',days:0,items:0,maxDelayDays:0,questionIds:[]});
const rare=retainedMemoryMoment(progress,'r-review');
assert.equal(rare.kind,'memory-14');
assert.equal(rare.days,14);
assert.equal(rare.items,2,'assisted recall must not qualify');
assert(rare.maxDelayDays>=16);
assert.equal(retainedMemoryMoment(progress,'r-transfer').kind,'','transfer is not a delayed-review milestone');

const sevenOnly={completedRounds:[{id:'r7',purpose:'review',questionIds:['q']}],records:{
 q:{attempts:[{id:'a',roundId:'old',correct:true,at:now-8*DAY},{id:'b',roundId:'r7',correct:true,at:now}]}
}};
assert.equal(retainedMemoryMoment(sevenOnly,'r7').kind,'memory-7');
const thirty={completedRounds:[{id:'r30',purpose:'review',questionIds:['q']}],records:{
 q:{attempts:[{id:'a30',roundId:'old30',correct:true,at:now-35*DAY},{id:'b30',roundId:'r30',correct:true,at:now}]}
}};
const long=retainedMemoryMoment(thirty,'r30');
assert.equal(long.kind,'memory-30');
assert.equal(long.days,30);
assert.deepEqual(long.questionIds,['q']);
console.log('LEARNING_MOMENTS_PASS',rare,long);
