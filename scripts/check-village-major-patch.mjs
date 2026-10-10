import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import * as IRT from '../platform/irt.js';
import {createVillageHost} from '../village/village-bridge.js';
import {recommendVillageRoutes} from '../platform/village-adaptive.js';

class FakeStorage {
  data=new Map();
  getItem(key){return this.data.get(key)??null;}
  setItem(key,value){this.data.set(key,String(value));}
  removeItem(key){this.data.delete(key);}
}
globalThis.localStorage=new FakeStorage();
globalThis.fetch=async url=>({ok:true,async json(){return JSON.parse(await readFile(new URL(url)));}});
const catalog=JSON.parse(await readFile(new URL('../games/catalog.json',import.meta.url)));
const replies=[],host=createVillageHost(value=>replies.push(value));let serial=0;
async function send(action,more={},ok=true,id='') {
  const requestId=id||'major-'+ ++serial;
  const raw=JSON.stringify({action,requestId,...more});
  await host.handle(raw);const r=replies.at(-1);
  assert.equal(r.ok,ok,JSON.stringify(r));
  return r;
}
function solve(q){
  const kind=q.interaction?.type??'choice';
  if(kind==='choice')return q.answer;
  if(kind==='build'||kind==='numeric')return kind==='build'?q.interaction.target:String(q.interaction.target);
  if(kind==='match')return q.interaction.pairs;
  if(kind==='memory'||kind==='sequence')return q.interaction.order;
  throw Error(kind);
}
async function earnThree() {
  const game=JSON.parse(await readFile(new URL('../games/snack-count/game.json',import.meta.url)));
  let r=await send('START',{gameId:'snack-count'});
  for(let i=0;i<3;i++){
    const q=game.questions.find(x=>x.id===r.question.questionId);
    await send('SUBMIT',{gameId:'snack-count',response:JSON.stringify(solve(q))});
    r=await send('NEXT',{gameId:'snack-count'});
  }
  assert(r.finished);
  await send('COMPLETE_WORLD',{gameId:'snack-count',roundId:r.roundId});
}
Progress.selectLearner('se');
const start=await send('SHOP_OPEN');
assert.equal(start.shop.items.length,41,'only 41 cosmetic gifts; family items require parent');
assert.equal(start.available,0);
assert.equal(start.cosmetics.friend,'');
assert.equal((await send('SHOP_BUY',{itemId:'friend-rabbit'},false)).ok,false,'zero stars cannot buy');
const chooser=await send('ADAPTIVE_OFFER',{subject:'math',grade:'K'});
assert.equal(chooser.adaptive.who,'se');
assert.equal(chooser.adaptive.grade,'K');
assert(chooser.adaptive.routes.length>0&&chooser.adaptive.routes.length<=4);
assert(chooser.adaptive.routes.every(r=>!r.gameId.endsWith('-original')));
assert(chooser.adaptive.ability.provisional);
assert(IRT.bankSize()>=4153,'all existing internal quizzes indexed');
assert.throws(()=>recommendVillageRoutes(catalog,{who:'se',subject:'math',grade:'invalid'}));
await earnThree();
const before=Rewards.wallet(catalog,'se');
assert(before.available>=15);
const purchased=await send('SHOP_BUY',{itemId:'friend-rabbit'});
assert.equal(purchased.cosmetics.friend,'friend-rabbit','purchase should immediately equip');
assert.equal(purchased.shop.items.find(x=>x.id==='friend-rabbit').equipped,true);
assert.equal(Rewards.wallet(catalog,'se').spent,15);
assert.equal(Rewards.wallet(catalog,'se').available,before.available-15);
const dup=await send('SHOP_BUY',{itemId:'friend-rabbit'});
assert.equal(dup.cosmetics.friend,'friend-rabbit');
assert.equal(Rewards.wallet(catalog,'se').spent,15,'cosmetic one-time purchase');
assert.equal((await send('SHOP_EQUIP',{itemId:'friend-cat'},false)).ok,false,'unowned gift cannot equip');
const bare=await send('SHOP_UNEQUIP',{category:'friend'});
assert.equal(bare.cosmetics.friend,'');
assert.equal(bare.shop.items.find(x=>x.id==='friend-rabbit').owned,true);
const restored=await send('SHOP_EQUIP',{itemId:'friend-rabbit'});
assert.equal(restored.cosmetics.friend,'friend-rabbit');
assert.equal(Rewards.wallet(catalog,'se').spent,15);
const exactRaw={itemId:'friend-rabbit'};
const replayKey='major-exact-receipt';
await send('SHOP_EQUIP',exactRaw,true,replayKey);
await send('SHOP_EQUIP',exactRaw,true,replayKey);
assert.equal(Rewards.wallet(catalog,'se').spent,15);
await send('SHOP_UNEQUIP',{category:'__proto__'},false);
Progress.selectLearner('tae');
const sibling=await send('SHOP_OPEN');
assert.equal(sibling.available,0);
assert.equal(sibling.cosmetics.friend,'');
assert.equal(sibling.shop.items.find(x=>x.id==='friend-rabbit').owned,false);
const tae=await send('ADAPTIVE_OFFER',{subject:'english',grade:'G1'});
assert(tae.adaptive.routes.every(r=>r.subject==='english'));
assert(tae.adaptive.ability.provisional);
console.log('PASS: adaptive IRT routes, all bank metadata indexed, explicit grade gating, 41 owned cosmetic choices, buy/equip/unequip/replay, zero-balance and unowned guard, sibling isolation.');
