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
 assert.equal(init.firstVisitBonus?.locationId,'home','Only first real entry mints a welcome award');
 assert.equal(init.resources.available.math,1,'The first location credits the learner resource ledger');
 const repeatHome=await request('INIT');
 assert.equal(repeatHome.firstVisitBonus,undefined,'A repeated entry never mints again');
 assert.equal(repeatHome.resources.available.math,1);
 for(const id of ['math','korean','english','academy']){
  const area=await request('AREA_OPEN',{district:id});
  assert.equal(area.district,id);
  assert.equal(area.firstVisitBonus?.locationId,id,'Successful first district entry grants the fixed award');
  assert(area.missions.games.length>=3);
  const filter=id==='academy'?null:id;
  if(filter)assert(area.missions.games.every(g=>g.subject===filter));
  assert(area.missions.games.every(g=>!g.id.startsWith('magic-')&&!/bebsu-(?:g[1-6]|m[1-3])-original/.test(g.id)));
 }
 const careerArea=await request('AREA_OPEN',{district:'career'});
 assert.equal(careerArea.district,'career');
 assert.deepEqual(careerArea.career.dreams,[]);
 const careerSaved=await request('CAREER_TOGGLE',{itemId:'doctor'});
 assert.deepEqual(careerSaved.career.dreams,['doctor']);
 const careerRemoved=await request('CAREER_TOGGLE',{itemId:'doctor'});
 assert.deepEqual(careerRemoved.career.dreams,[]);
 const hanjaArea=await request('AREA_OPEN',{district:'hanja'});
 assert.equal(hanjaArea.missions.games.length,11);
 assert.equal(hanjaArea.missions.games[0].id,'hanja-h8');
 assert.equal(hanjaArea.missions.games.at(-1).id,'hanja-h3');
 const hanjaFirst=await request('START',{gameId:'hanja-h8'});
 assert.equal(hanjaFirst.question.visual.kind,'word');
 assert.equal(hanjaFirst.question.choices.length,4);
 await request('CANCEL');
 const pond=await request('AREA_OPEN',{district:'pond'});
 assert.equal(pond.firstVisitBonus?.locationId,'pond');
 assert.equal(pond.pondShop.fish.filter(f=>f.owned).length,1);
 assert.equal(pond.pond.fish.length,1,'Unity pond snapshot must contain pond residents only');
 assert.equal(pond.pond.fish[0].id,'guppy');
 assert.deepEqual(Object.keys(pond.resources.available).sort(),['english','hanja','korean','math']);
 const ocean=await request('AREA_OPEN',{district:'ocean'});
 assert.equal(ocean.district,'ocean');
 assert.equal(ocean.firstVisitBonus?.locationId,'ocean');
 const revisitOcean=await request('AREA_OPEN',{district:'ocean'});
 assert.equal(revisitOcean.firstVisitBonus,undefined,'The same ocean does not mint an additional award');
 assert.equal(ocean.pondShop.fish.filter(f=>f.world==='ocean').length,40);
 assert.equal(ocean.pondShop.fish.filter(f=>f.world==='ocean'&&f.owned).length,0);
 assert(ocean.pondShop.fish.filter(f=>f.world==='ocean').every(f=>f.art.endsWith('/'+f.id+'.webp')));
 const blockedOceanId='ocean-learning-gate';
 await host.handle(JSON.stringify({action:'OCEAN_ADOPT',requestId:blockedOceanId,itemId:'clownfish'}));
 const blockedOcean=responses.findLast(r=>r.requestId===blockedOceanId);
 assert.equal(blockedOcean?.ok,false,'Ocean adoption must respect learning milestone before resource spend');
 assert(/새로운 것|새로운 문제/.test(blockedOcean?.error||''),'Learning gates should explain the next step without shaming the learner');
 const feed=await request('POND_FEED',{itemId:'guppy'});
 assert.equal(feed.pondShop.fish.find(f=>f.id==='guppy').feedDays,1);
 const repeatFeed=await request('POND_FEED',{itemId:'guppy'});
 assert.equal(repeatFeed.pondShop.fish.find(f=>f.id==='guppy').feedDays,1);
 const failedAdoption='pond-no-resources';
 await host.handle(JSON.stringify({action:'POND_ADOPT',requestId:failedAdoption,itemId:'goldfish'}));
 const blocked=responses.findLast(r=>r.requestId===failedAdoption);
 assert.equal(blocked?.ok,false,'One subject cannot purchase a balanced-currency fish');
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
 const sePond=await request('POND_OPEN');
 assert.equal(sePond.firstVisitBonus?.locationId,'pond','Sibling independently receives first pond visit');
 assert.equal(sePond.pondShop.fish.find(f=>f.id==='guppy').feedDays,0,'Siblings keep separate ponds');
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
 console.log('PASS_UNIFIED_WORLD '+catalog.filter(g=>g.status==='published').length+' games, '+catalog.filter(g=>g.kind==='quiz'&&g.status==='published').reduce((n,g)=>n+g.questionCount,0)+' items, 8 native learning districts including Hanja academy, 27+27 papers, practice and KMA shared future wallet, repeat credit blocked, sibling isolation, historical keys untouched');
}finally{globalThis.fetch=nativeFetch;}
