import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import {createVillageHost} from '../village/village-bridge.js';

const storage=new Map();
globalThis.localStorage={
 getItem:k=>storage.get(k)??null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
const OLD_KEY_A='sparkle-kma-public-progress-v06',OLD_KEY_B='sparkle-public-village-progress-v06';
storage.set(OLD_KEY_A,'{"historical":"kma","score":81}');
storage.set(OLD_KEY_B,'{"historical":"practice","score":35}');
const historical=[storage.get(OLD_KEY_A),storage.get(OLD_KEY_B)];
const nativeFetch=globalThis.fetch;
globalThis.fetch=async input=>{
 const url=input instanceof URL?input:new URL(input);
 assert.equal(url.protocol,'file:','Tests must only read project JSON, no network');
 try{
  const bytes=fs.readFileSync(fileURLToPath(url));
  return new Response(bytes,{status:200,headers:{'content-type':'application/json'}});
 }catch(error){if(error.code==='ENOENT')return new Response('',{status:404});throw error;}
};
const catalog=JSON.parse(fs.readFileSync(new URL('../games/catalog.json',import.meta.url)));
const games=new Map(catalog.filter(e=>e.kind==='quiz').map(e=>[e.id,
 JSON.parse(fs.readFileSync(new URL('../'+e.source.slice(2),import.meta.url)))]));
const responses=[];
const host=createVillageHost(reply=>responses.push(reply));
let rid=0;
const request=async(action,extra={})=>{
 const id='unified-'+ ++rid;
 await host.handle(JSON.stringify({action,requestId:id,...extra}));
 const response=responses.findLast(r=>r.requestId===id);
 assert(response,'No reply for '+action);
 assert.equal(response.ok,true,action+' '+(response.error||''));
 return response;
};
const right=q=>{
 const type=q.interaction?.type??'choice';
 if(type==='numeric')return String(q.interaction.target);
 if(type==='build')return q.interaction.target;
 if(type==='match')return q.interaction.pairs;
 if(type==='sequence'||type==='memory')return q.interaction.order;
 return q.answer;
};
async function finish25(gameId,paperId){
 let response=await request('START',{gameId,paperId});
 assert.equal(response.question.total,25);
 for(let i=0;i<25;i++){
  const round=Progress.gameProgress(gameId).round;
  assert.equal(round.paperId,paperId);assert.equal(round.index,i);
  const game=games.get(gameId),q=game.questions.find(q=>q.id===round.ids[i]);
  assert(q);
  assert.equal(response.question.questionId,q.id);
  const submit=await request('SUBMIT',{gameId,response:JSON.stringify(right(q))});
  assert.equal(submit.correct,true,q.id);
  assert.equal(submit.earned>=0,true);
  const next=await request('NEXT',{gameId});
  if(i<24){assert.equal(next.finished,undefined);response=next;}
  else{
   assert.equal(next.finished,true);
   const last=await request('COMPLETE_WORLD',{gameId,roundId:next.roundId});
   return {round,next,last};
  }
 }
 throw new Error('Round did not complete');
}
try{
 await host.prepare();
 const init=await request('INIT');
 assert.equal(init.who,'tae');
 assert.equal(init.available,0);
 for(const id of ['math','korean','english','academy']){
  const area=await request('AREA_OPEN',{district:id});
  assert.equal(area.district,id);
  assert(area.missions.games.length>=3);
  const filter=id==='academy'?null:id;
  if(filter)assert(area.missions.games.every(g=>g.subject===filter));
  assert(area.missions.games.every(g=>!g.id.startsWith('magic-')&&!/bebsu-(?:g[1-6]|m[1-3])-original/.test(g.id)));
 }
 const kma=await request('AREA_OPEN',{district:'kma'});
 const practice=await request('AREA_OPEN',{district:'practice'});
 assert.equal(kma.challenges.length,9);
 assert.equal(practice.challenges.length,9);
 assert.equal(kma.challenges.reduce((n,g)=>n+g.papers.length,0),27);
 assert.equal(practice.challenges.reduce((n,g)=>n+g.papers.length,0),27);
 assert.equal(practice.publicPractice,true);
 const shop=await request('AREA_OPEN',{district:'shop'});
 assert(shop.shop.items.length>=35);
 const tower=await request('AREA_OPEN',{district:'growth'});
 assert.equal(tower.growth.length,3);
 assert(tower.growth.every(item=>item.stage>=1&&item.stage<=4));
 const stageBefore=Progress.stageSelection('korean','tae');
 const nextStage=stageBefore===4?3:stageBefore+1;
 await request('AREA_SET_STAGE',{subject:'korean',stage:nextStage});
 assert.equal(Progress.stageSelection('korean','tae'),nextStage);
 await request('AREA_SET_STAGE',{subject:'korean',stage:stageBefore});
 assert.equal(Progress.stageSelection('korean','tae'),stageBefore);
 const garden=await request('AREA_OPEN',{district:'garden'});
 assert(Array.isArray(garden.garden.plants));
 const first=await finish25('magic-g1-challenge','magic-g1-basic');
 assert.equal(first.last.challengeBonus,80);
 const after=Rewards.wallet(catalog,'tae');
 assert.equal(after.challengeStars,80);
 assert.equal(after.learningStars,250);
 assert.equal(after.effortStars,3);
 assert.equal(after.available,333);
 const again=await finish25('magic-g1-challenge','magic-g1-basic');
 assert.equal(again.last.challengeBonus,0);
 assert.equal(Rewards.wallet(catalog,'tae').available,333);
 const kmaOne=await finish25('bebsu-g1-original',kma.challenges[0].papers[0].paperId);
 assert.equal(kmaOne.last.challengeBonus,160);
 const mixed=Rewards.wallet(catalog,'tae');
 assert.equal(mixed.challengeStars,240);
 assert.equal(mixed.available,743); // 2*250 learning + 240 once-only challenge + 3 daily
 assert.equal(storage.get(OLD_KEY_A),historical[0]);
 assert.equal(storage.get(OLD_KEY_B),historical[1]);
 Progress.selectLearner('se');
 assert.equal(Rewards.wallet(catalog,'se').available,0);
 const child=await finish25('magic-g1-challenge','magic-g1-basic');
 assert.equal(child.last.challengeBonus,35);
 assert.equal(Rewards.wallet(catalog,'se').challengeStars,35);
 assert.equal(Rewards.wallet(catalog,'se').available,288);
 assert.equal(Rewards.wallet(catalog,'tae').available,743);
 assert.equal(storage.get(OLD_KEY_A),historical[0]);
 assert.equal(storage.get(OLD_KEY_B),historical[1]);
 const copied=Progress.exportRecords(), firstTa=copied.platform.profiles.tae.games['magic-g1-challenge'];
 assert.equal(firstTa.completedRounds.length,2);
 assert.equal(firstTa.records&&Object.keys(firstTa.records).length,25);
 console.log('PASS_UNIFIED_WORLD 55 games, 4828 items, 7 learning districts, 27+27 papers, practice and KMA shared future wallet, repeat credit blocked, sibling isolation, historical keys untouched');
}finally{globalThis.fetch=nativeFetch;}
