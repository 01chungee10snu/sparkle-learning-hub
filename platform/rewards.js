import * as Progress from './progress.js';

/** Rewards never rewrite learning stars. The separate ledger keeps two siblings
 * isolated and makes spending, repeat clicks and backup merges idempotent. */
export const REWARDS_KEY='sparkle-rewards-v1';
export {REWARD_ITEMS,REWARD_CATEGORIES} from './reward-catalog.js';
import {REWARD_ITEMS,OUTFIT_SLOTS} from './reward-catalog.js';
const BY_ID=new Map(REWARD_ITEMS.map(item=>[item.id,item]));
const LEARNERS=['tae','se'],KINDS=['hint','retry','session','reflection','explain','recovery'];
const THINKING_STRATEGIES=new Set(['count','compare','pattern','draw','explain']);
const MAX_ENTRIES=50000,MAX_RECEIPTS=3000;
const profile=()=>({events:{},purchases:{},equipped:null,outfit:{}});
const blank=()=>({version:1,profiles:{tae:profile(),se:profile()}});
let memory=blank(),dirty=false,storageOK=true,writeFailed=false,configuredCatalog=null;
const copy=value=>JSON.parse(JSON.stringify(value));
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const validId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,159}$/.test(value);
const validTime=value=>Number.isSafeInteger(value)&&value>=0&&value<=Date.now()+60000;
const day=at=>new Date(at+9*3600000).toISOString().slice(0,10);
function whoId(who){if(!LEARNERS.includes(who))throw new Error('아이를 선택해 주세요.');return who;}
function fail(){throw new Error('보상 기록의 형식을 확인해 주세요.');}
function keys(value,allowed){if(!plain(value)||Object.keys(value).some(key=>!allowed.includes(key)))fail();}
function boundedMap(value,limit){if(!plain(value)||Object.keys(value).length>limit)fail();return Object.entries(value);}
function validate(raw){
 keys(raw,['version','profiles']);if(raw.version!==1)fail();keys(raw.profiles,LEARNERS);
 const next=blank();
 for(const who of LEARNERS){
  const src=raw.profiles[who];keys(src,['events','purchases','equipped','outfit']);const dest=next.profiles[who];
  for(const [id,event] of boundedMap(src.events,MAX_ENTRIES)){
   keys(event,['id','kind','gameId','questionId','roundId','strategy','at']);
   if(!validId(id)||event.id!==id||!KINDS.includes(event.kind)||!validId(event.gameId)||!validTime(event.at))fail();
   if(['hint','retry','recovery'].includes(event.kind)){
    if(!validId(event.questionId)||event.roundId!==undefined||event.strategy!==undefined)fail();
   }else{
    if(!validId(event.roundId)||event.questionId!==undefined)fail();
    if(event.kind==='explain'?!THINKING_STRATEGIES.has(event.strategy):event.strategy!==undefined)fail();
   }
   dest.events[id]={id,kind:event.kind,gameId:event.gameId,
    ...(event.questionId?{questionId:event.questionId}:{roundId:event.roundId}),
    ...(event.kind==='explain'?{strategy:event.strategy}:{}),at:event.at};
  }
  const familyOrdinals=new Map();
  for(const [id,purchase] of boundedMap(src.purchases,MAX_RECEIPTS)){
   keys(purchase,['id','rewardId','cost','at','completedAt']);
   const item=BY_ID.get(purchase.rewardId);
   if(!item||purchase.id!==id||purchase.cost!==item.cost||!validTime(purchase.at)||(purchase.completedAt!==undefined&&(!validTime(purchase.completedAt)||purchase.completedAt<purchase.at)))fail();
   if(item.kind==='cosmetic'){if(id!==`cosmetic-${item.id}`||purchase.completedAt!==undefined)fail();}
   else{
    const match=id.match(new RegExp(`^request-${item.id}-([1-9][0-9]{0,3})$`));if(!match)fail();
    const list=familyOrdinals.get(item.id)||[];list.push({ordinal:Number(match[1]),pending:purchase.completedAt===undefined,at:purchase.at,completedAt:purchase.completedAt});familyOrdinals.set(item.id,list);
   }
   dest.purchases[id]={id,rewardId:item.id,cost:item.cost,at:purchase.at,...(purchase.completedAt!==undefined?{completedAt:purchase.completedAt}:{})};
  }
  // A coupon is a monotone chain. A newer request can only exist after the
  // preceding activity was explicitly marked complete by a parent.
  for(const list of familyOrdinals.values()){
   list.sort((a,b)=>a.ordinal-b.ordinal);
   if(list.some((p,i)=>p.ordinal!==i+1||(p.pending&&i!==list.length-1)||(i>0&&p.at<list[i-1].completedAt)))fail();
  }
  if(src.equipped!==null){
   keys(src.equipped,['id','at']);const item=BY_ID.get(src.equipped.id);
   if(!validTime(src.equipped.at)||(src.equipped.id!==null&&(!item||item.kind!=='cosmetic'||item.category!=='light'||!dest.purchases[`cosmetic-${item.id}`])))fail();
   dest.equipped={id:src.equipped.id,at:src.equipped.at};
  }
  if(src.outfit!==undefined){
   keys(src.outfit,OUTFIT_SLOTS);
   for(const [slot,selection] of Object.entries(src.outfit)){
    keys(selection,['id','at']);const item=BY_ID.get(selection.id);
    if(!validTime(selection.at)||(selection.id!==null&&(!item||item.category!==slot||!dest.purchases[`cosmetic-${item.id}`])))fail();
    dest.outfit[slot]={id:selection.id,at:selection.at};
   }
  }
 }
 return next;
}
function load(){
 if(dirty)return memory;
 try{const value=globalThis.localStorage.getItem(REWARDS_KEY);memory=value===null?blank():validate(JSON.parse(value));storageOK=!writeFailed;}
 catch{storageOK=false;}
 return memory;
}
function mergeStates(current,incoming){
 const merged=copy(current);
 for(const who of LEARNERS){
  const dest=merged.profiles[who],src=incoming.profiles[who];
  for(const [id,event] of Object.entries(src.events)){
   const old=Object.hasOwn(dest.events,id)?dest.events[id]:undefined;
   if(old&&(old.kind!==event.kind||old.gameId!==event.gameId||old.questionId!==event.questionId||old.roundId!==event.roundId||old.strategy!==event.strategy))throw new Error('같은 노력 기록의 내용이 달라요.');
   if(!old||event.at<old.at)dest.events[id]=copy(event);
  }
  for(const [id,receipt] of Object.entries(src.purchases)){
   const old=dest.purchases[id];
   if(!old){dest.purchases[id]=copy(receipt);continue;}
   old.at=Math.min(old.at,receipt.at);
   if(receipt.completedAt!==undefined)old.completedAt=Math.max(old.completedAt||0,receipt.completedAt,old.at);
  }
  if(src.equipped&&(!dest.equipped||src.equipped.at>=dest.equipped.at))dest.equipped=copy(src.equipped);
  for(const slot of OUTFIT_SLOTS){
   const selection=src.outfit[slot];
   if(selection&&(!dest.outfit[slot]||selection.at>=dest.outfit[slot].at))dest.outfit[slot]=copy(selection);
  }
 }
 return validate(merged);
}
function assertFunding(state){
 if(!configuredCatalog)throw new Error('놀이 목록을 먼저 불러 주세요.');
 for(const who of LEARNERS){
  const p=state.profiles[who],spent=Object.values(p.purchases).reduce((sum,r)=>sum+r.cost,0),earned=Progress.summary(configuredCatalog,who).stars+effortTotal(p)+bebsuChallengeStars(configuredCatalog,who);
  if(spent>earned)throw new Error('이 보상에 연결된 학습 기록을 먼저 가져와 주세요.');
 }
}
function save(state,{spending=false}={}){
 // Purchases must commit against the latest durable balance. If storage is
 // unavailable, keep the old wallet and let learning continue in memory.
 if(spending){
  let persisted,candidate;
  try{persisted=globalThis.localStorage.getItem(REWARDS_KEY);}catch{storageOK=false;return {ok:false,reason:'storage-unavailable'};}
  try{candidate=persisted===null?validate(state):mergeStates(validate(JSON.parse(persisted)),state);assertFunding(candidate);}
  catch{return {ok:false,reason:'balance-changed'};}
  try{globalThis.localStorage.setItem(REWARDS_KEY,JSON.stringify(candidate));}catch{writeFailed=true;storageOK=false;return {ok:false,reason:'storage-unavailable'};}
  memory=candidate;dirty=false;writeFailed=false;storageOK=true;return {ok:true};
 }
 memory=state;dirty=true;
 try{
  // Recovering from a blocked first read must preserve the older on-device
  // spending ledger, even when the new effort initially existed only in memory.
  const persisted=globalThis.localStorage.getItem(REWARDS_KEY);
  if(persisted!==null)memory=mergeStates(validate(JSON.parse(persisted)),memory);
  globalThis.localStorage.setItem(REWARDS_KEY,JSON.stringify(memory));dirty=false;writeFailed=false;storageOK=true;
 }catch{writeFailed=true;storageOK=false;}
}
function configure(catalog){if(!Array.isArray(catalog))throw new Error('놀이 목록을 확인해 주세요.');configuredCatalog=catalog;return catalog;}
const quizEntry=(catalog,id)=>catalog.find(game=>game.id===id&&game.status==='published'&&game.kind==='quiz');
const BEBSU_CHALLENGE_BONUS={tae:160,se:60};
const isBebsuOriginal=id=>/^bebsu-(?:g[1-6]|m[1-3])-original$/.test(id);
function validBebsuCompletion(round,entry){
 return /^kma-[0-9]{1,5}$/.test(round.paperId??'')&&
 Array.isArray(round.questionIds)&&round.questionIds.length===25&&
 new Set(round.questionIds).size===25&&round.questionIds.every(id=>entry.questionIds?.includes(id));
}
export function bebsuChallengeStars(catalog,who=Progress.learner()){
 whoId(who);
 let completedPapers=0;
 for(const entry of catalog.filter(e=>e.kind==='quiz'&&e.status==='published'&&isBebsuOriginal(e.id))){
  const seen=new Set();
  for(const round of Progress.gameProgress(entry.id,who).completedRounds||[]){
   if(!validBebsuCompletion(round,entry)||seen.has(round.paperId))continue;
   seen.add(round.paperId);completedPapers++;
  }
 }
 return completedPapers*BEBSU_CHALLENGE_BONUS[who];
}
// A paper is rewarded once per child even after multiple 25-question replays.
export function challengeRoundBonus(catalog,who,gameId,roundId){
 whoId(who);const entry=quizEntry(catalog,gameId);
 if(!entry||!isBebsuOriginal(gameId))return 0;
 const rounds=Progress.gameProgress(gameId,who).completedRounds||[];
 const round=rounds.find(r=>r.id===roundId);
 if(!round||!validBebsuCompletion(round,entry))return 0;
 const first=rounds.filter(r=>r.paperId===round.paperId&&validBebsuCompletion(r,entry))
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))[0];
 return first?.id===roundId?BEBSU_CHALLENGE_BONUS[who]:0;
}
function effortBreakdown(p){
 const questionCounts=new Map(),rounds=new Set(),dates=new Set(),
  explained=new Set(),recovered=new Set(),explainPerDay=new Map(),recoverPerDay=new Map();
 const earned={traditional:0,explain:0,recovery:0};
 for(const event of Object.values(p.events).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){
  const key=`${event.gameId}/${event.questionId||event.roundId}`,date=day(event.at);
  if(['hint','retry'].includes(event.kind)){
   const count=questionCounts.get(key)||0;
   if(count<2){earned.traditional++;questionCounts.set(key,count+1);}
  }else if(event.kind==='session'||event.kind==='reflection'){
   if(!rounds.has(key)&&!dates.has(date)){
    earned.traditional+=3;rounds.add(key);dates.add(date);
   }
  }else if(event.kind==='explain'){
   const count=explainPerDay.get(date)||0;
   if(!explained.has(key)&&count<2){
    earned.explain+=2;explained.add(key);explainPerDay.set(date,count+1);
   }
  }else if(event.kind==='recovery'){
   const count=recoverPerDay.get(date)||0;
   if(!recovered.has(key)&&count<3){
    earned.recovery+=4;recovered.add(key);recoverPerDay.set(date,count+1);
   }
  }
 }
 return earned;
}
function effortTotal(p){const x=effortBreakdown(p);return x.traditional+x.explain+x.recovery;}
function evidence(catalog,who,p){
 const results=Progress.summary(catalog,who),subjects=new Set(),correctDates=new Set(),retryTimes=new Map();let completed=0,retry=false;
 for(const event of Object.values(p.events))if(event.kind==='retry'){const key=`${event.gameId}/${event.questionId}`;retryTimes.set(key,Math.max(retryTimes.get(key)||0,event.at));}
 for(const entry of catalog.filter(g=>g.status==='published')){
  const game=entry.progressAdapter==='unit-garden-v1'?Progress.legacyProgress(who):Progress.gameProgress(entry.id,who);
  completed+=game.finishedRounds||0;
  if(Object.keys(game.records).length||game.finishedRounds)subjects.add(entry.subject);
  for(const [questionId,record] of Object.entries(game.records)){
   // The app emits retry only after grading a guided re-practice as correct.
   // It remains separate from the original independent-answer/growth evidence.
   const firstAttempt=Math.min(...(record.attempts||[]).map(attempt=>attempt.at));
   const retryAt=retryTimes.get(`${entry.id}/${questionId}`);
   if(entry.kind==='quiz'&&entry.questionIds?.includes(questionId)&&retryAt!==undefined&&(!Number.isFinite(firstAttempt)||retryAt>=firstAttempt))retry=true;
   let wrong=false;
   for(const attempt of [...(record.attempts||[])].sort((a,b)=>a.at-b.at)){
    if(!attempt.correct)wrong=true;
    else{correctDates.add(day(attempt.at));if(wrong)retry=true;}
   }
  }
 }
 return {results,completed,subjects:subjects.size,retry,correctDays:correctDates.size};
}
// Include the game in the session identity: imported rounds can share an ID.
function gameToken(id){let a=2166136261,b=2246822507;for(const c of id){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),3266489909);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
function hasQuestionEvidence(game,questionId){return Object.hasOwn(game.records,questionId)||(game.round&&!game.round.finished&&game.round.ids[game.round.index]===questionId);}
function successfulRecovery(record){
 const first=record?.firstAttempt;
 if(!first||first.correct!==false||!validTime(first.at))return null;
 const attempts=[...(record.attempts||[])].filter(a=>a.correct===true&&
  a.at>first.at&&a.roundId!==first.roundId&&validTime(a.at))
  .sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 return attempts[0]||null;
}
/** Self-reported strategy (not mastery evidence): one completed round, maximum
 * two 2-star reflections per local day. No child voice/text stored. */
export function recordLearningExplanation({who=Progress.learner(),gameId,roundId,strategy}={}){
 whoId(who);
 if(!configuredCatalog||!quizEntry(configuredCatalog,gameId)||!THINKING_STRATEGIES.has(strategy))
  throw new Error('학습을 설명한 방법을 확인해 주세요.');
 const round=Progress.gameProgress(gameId,who).completedRounds?.find(r=>r.id===roundId);
 if(!round||!Array.isArray(round.questionIds)||!round.questionIds.length)
  throw new Error('실제로 완료한 학습 후에만 생각을 기록할 수 있어요.');
 const state=load(),p=state.profiles[who];
 const id=`explain-${gameToken(gameId)}-${round.id}`;
 if(!validId(id))throw new Error('완료 기록이 올바르지 않아요.');
 if(Object.hasOwn(p.events,id))return {added:false,earned:0,reason:'duplicate'};
 const at=Math.max(Date.now(),round.at);
 if(Object.values(p.events).filter(e=>e.kind==='explain'&&day(e.at)===day(at)).length>=2)
  return {added:false,earned:0,reason:'daily-cap'};
 if(Object.keys(p.events).length>=MAX_ENTRIES)return {added:false,earned:0,reason:'ledger-full'};
 const before=effortTotal(p);
 p.events[id]={id,kind:'explain',gameId,roundId:round.id,strategy,at};
 const earned=effortTotal(p)-before;
 save(state);
 return {added:true,earned,reason:earned?'earned':'capped',strategy};
}
export function syncRewards(catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const state=load(),p=state.profiles[who];let changed=false,eventCount=Object.keys(p.events).length;
 const seenRounds=new Set(Object.values(p.events).filter(e=>['session','reflection'].includes(e.kind)).map(e=>`${e.gameId}/${e.roundId}`));
 for(const entry of catalog.filter(g=>g.status==='published'&&g.kind==='quiz')){
  const game=Progress.gameProgress(entry.id,who);
  for(const [questionId,record] of Object.entries(game.records||{})){
   if(!entry.questionIds?.includes(questionId))continue;
   const improvement=successfulRecovery(record);
   if(!improvement)continue;
   const id=`recovery-${gameToken(entry.id)}-${questionId}`;
   if(!validId(id)||Object.hasOwn(p.events,id)||eventCount>=MAX_ENTRIES)continue;
   const perDay=Object.values(p.events).filter(e=>e.kind==='recovery'&&day(e.at)===day(improvement.at)).length;
   if(perDay>=3)continue;
   p.events[id]={id,kind:'recovery',gameId:entry.id,questionId,at:improvement.at};
   eventCount++;changed=true;
  }
  for(const round of game.completedRounds||[]){
   // Preserve old session IDs without rewarding them again after migration.
   const logicalId=`${entry.id}/${round.id}`;
   if(seenRounds.has(logicalId))continue;
   const id=`session-${gameToken(entry.id)}-${round.id}`;
   if(validId(id)&&!Object.hasOwn(p.events,id)&&eventCount<MAX_ENTRIES){p.events[id]={id,kind:'session',gameId:entry.id,roundId:round.id,at:round.at};seenRounds.add(logicalId);eventCount++;changed=true;}
  }
 }
 if(changed)save(state);
 return wallet(catalog,who);
}
export function wallet(catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const p=load().profiles[who],ev=evidence(catalog,who,p),effortStars=effortTotal(p);
 const reinforcement=effortBreakdown(p);
 const learningStars=ev.results.stars,challengeStars=bebsuChallengeStars(catalog,who),lifetime=learningStars+effortStars+challengeStars,purchases=Object.values(p.purchases).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)),spent=purchases.reduce((total,receipt)=>total+receipt.cost,0),available=Math.max(0,lifetime-spent);
 const badges=[
  {id:'first-round',title:'첫 모험 완주',emoji:'🌱',description:'놀이 한 판을 끝까지 해냈어요.',unlocked:ev.completed>=1,progress:Math.min(1,ev.completed),target:1},
  {id:'three-subjects',title:'세 가지 탐험가',emoji:'🧭',description:'수학·국어·영어를 골고루 만났어요.',unlocked:ev.subjects>=3,progress:ev.subjects,target:3},
  {id:'try-again',title:'다시 생각하는 힘',emoji:'💪',description:'풀이를 보고 다시 연습해 답을 찾았어요.',unlocked:ev.retry,progress:Number(ev.retry),target:1},
  {id:'two-days',title:'다시 만난 배움',emoji:'🌈',description:'서로 다른 두 날에 정답을 발견했어요.',unlocked:ev.correctDays>=2,progress:Math.min(2,ev.correctDays),target:2}
 ];
 const thresholds=[10,30,60,100,200,400];
 const milestones=thresholds.map(stars=>({id:`stars-${stars}`,stars,title:`${stars}별의 발자국`,unlocked:lifetime>=stars}));
 const items=REWARD_ITEMS.map(item=>{
  const owned=item.kind==='cosmetic'&&Boolean(p.purchases[`cosmetic-${item.id}`]);
  const pending=item.kind==='family'?purchases.find(receipt=>receipt.rewardId===item.id&&receipt.completedAt===undefined):null;
  return {...item,owned,equipped:(item.category==='light'?p.equipped?.id:p.outfit[item.category]?.id)===item.id,pending:pending?copy(pending):null,canPurchase:!owned&&!pending&&available>=item.cost};
 });
 const look=Object.fromEntries(['light',...OUTFIT_SLOTS].map(slot=>[slot,BY_ID.get(slot==='light'?p.equipped?.id:p.outfit[slot]?.id)||null]));
 return {look,who,learningStars,effortStars,reinforcementStars:reinforcement.explain+reinforcement.recovery,
  explanationStars:reinforcement.explain,recoveryStars:reinforcement.recovery,challengeStars,lifetime,spent,available,items,equipped:p.equipped?.id||null,badges,milestones,nextMilestone:milestones.find(mark=>!mark.unlocked)||null,purchases:copy(purchases),requests:copy(purchases.filter(receipt=>BY_ID.get(receipt.rewardId).kind==='family')),storageAvailable:storageOK};
}
export function recordEffort({who=Progress.learner(),eventId,kind,gameId,questionId,roundId,at=Date.now()}={}){
 whoId(who);if(!configuredCatalog)throw new Error('놀이 목록을 먼저 불러 주세요.');
 const entry=quizEntry(configuredCatalog,gameId);
 if(!entry||!validId(eventId)||!KINDS.includes(kind)||!validTime(at)||at>Date.now()+60000)throw new Error('노력 기록을 확인해 주세요.');
 const state=load(),p=state.profiles[who];
 if(Object.hasOwn(p.events,eventId))return {added:false,earned:0,reason:'duplicate'};
 let event;
 if(['hint','retry'].includes(kind)){
  if(!entry.questionIds?.includes(questionId))throw new Error('노력한 문제를 확인해 주세요.');
  const game=Progress.gameProgress(gameId,who);
  if(!hasQuestionEvidence(game,questionId))throw new Error('지금 풀고 있거나 풀어 본 문제에서 도움을 받아 주세요.');
  if(kind==='retry'&&!Object.hasOwn(game.records,questionId))throw new Error('먼저 풀어 본 문제를 다시 연습해 주세요.');
  const count=Object.values(p.events).filter(e=>e.gameId===gameId&&e.questionId===questionId).length;
  // Two hint credits cannot erase later successful practice. Keep one capped
  // retry as badge evidence, while effortTotal still awards at most two stars.
  if(count>=2&&(kind!=='retry'||Object.values(p.events).some(e=>e.kind==='retry'&&e.gameId===gameId&&e.questionId===questionId)))return {added:false,earned:0,reason:'question-cap'};
  event={id:eventId,kind,gameId,questionId,at};
 }else{
  const completed=Progress.gameProgress(gameId,who).completedRounds||[],id=roundId||questionId;
  const round=completed.find(r=>r.id===id);
  if(!round)throw new Error('끝까지 마친 놀이에서 느낌을 나눠 주세요.');
  event={id:eventId,kind,gameId,roundId:round.id,at:round.at};
  if(Object.values(p.events).some(e=>['session','reflection'].includes(e.kind)&&((e.gameId===gameId&&e.roundId===round.id)||day(e.at)===day(round.at))))return {added:false,earned:0,reason:'daily-cap'};
 }
 if(Object.keys(p.events).length>=MAX_ENTRIES)return {added:false,earned:0,reason:'ledger-full'};
 const before=effortTotal(p);p.events[eventId]=event;const earned=effortTotal(p)-before;save(state);
 return {added:true,earned,reason:earned?'earned':['hint','retry'].includes(kind)?'question-cap':'daily-cap'};
}
export function purchaseReward(id,catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const item=BY_ID.get(id);if(!item)throw new Error('별로 고를 선물을 확인해 주세요.');
 syncRewards(catalog,who);const balance=wallet(catalog,who),state=copy(load()),p=state.profiles[who];
 const existing=item.kind==='cosmetic'?p.purchases[`cosmetic-${id}`]:Object.values(p.purchases).find(receipt=>receipt.rewardId===id&&receipt.completedAt===undefined);
 if(existing)return {ok:true,duplicate:true,purchase:copy(existing),wallet:balance};
 if(balance.available<item.cost)return {ok:false,reason:'insufficient-stars',wallet:balance};
 if(Object.keys(p.purchases).length>=MAX_RECEIPTS)return {ok:false,reason:'ledger-full',wallet:balance};
 const number=Object.values(p.purchases).filter(receipt=>receipt.rewardId===id).length+1;
 const receipt={id:item.kind==='cosmetic'?`cosmetic-${id}`:`request-${id}-${number}`,rewardId:id,cost:item.cost,at:Date.now()};
 p.purchases[receipt.id]=receipt;if(item.kind==='cosmetic')wear(p,item,receipt.at);
 const saved=save(state,{spending:true});
 if(!saved.ok)return {...saved,wallet:wallet(catalog,who)};
 return {ok:true,duplicate:false,purchase:copy(receipt),wallet:wallet(catalog,who)};
}
function wear(p,item,at=Date.now()){
 const slot=item.category;
 if(slot==='light')p.equipped={id:item.id,at:Math.max(at,(p.equipped?.at||0)+1)};
 else p.outfit[slot]={id:item.id,at:Math.max(at,(p.outfit[slot]?.at||0)+1)};
}
export function unequipCategory(slot,who=Progress.learner()){
 if(slot==='light')return equipReward(null,who);
 if(!OUTFIT_SLOTS.includes(slot))throw new Error('선물 종류를 확인해 주세요.');
 whoId(who);const state=load(),p=state.profiles[who];
 p.outfit[slot]={id:null,at:Math.max(Date.now(),(p.outfit[slot]?.at||0)+1)};save(state);return null;
}
export function equipReward(id,who=Progress.learner()){
 whoId(who);const state=load(),p=state.profiles[who];
 if(id===null||id==='none'){p.equipped={id:null,at:Math.max(Date.now(),(p.equipped?.at||0)+1)};save(state);return null;}
 const item=BY_ID.get(id);if(item?.kind!=='cosmetic'||!p.purchases[`cosmetic-${id}`])throw new Error('먼저 별로 장식을 골라 주세요.');
 wear(p,item);save(state);return id;
}
/** Call only after a user-driven parent action: this marks a family activity
 * complete in the local ledger and never schedules or promises an actual gift. */
export function completeFamilyReward(requestId,who=Progress.learner()){
 whoId(who);const state=load(),receipt=state.profiles[who].purchases[requestId];
 if(!receipt||BY_ID.get(receipt.rewardId)?.kind!=='family')throw new Error('가족 활동 요청을 확인해 주세요.');
 if(receipt.completedAt!==undefined)return copy(receipt);
 receipt.completedAt=Math.max(Date.now(),receipt.at);save(state);return copy(receipt);
}
export function exportRewards(){return {format:'sparkle-rewards-backup',version:1,state:copy(load())};}
export function importRewards(raw){
 keys(raw,['format','version','state']);if(raw.format!=='sparkle-rewards-backup'||raw.version!==1)fail();
 if(!configuredCatalog)throw new Error('놀이 목록을 먼저 불러 주세요.');
 const incoming=validate(raw.state),current=copy(load());
 if(configuredCatalog)for(const who of LEARNERS)for(const event of Object.values(incoming.profiles[who].events)){
  const entry=quizEntry(configuredCatalog,event.gameId);
  if(!entry||(['hint','retry','recovery'].includes(event.kind)&&!entry.questionIds?.includes(event.questionId)))throw new Error('보상에 연결된 놀이와 문제를 확인해 주세요.');
  const game=Progress.gameProgress(event.gameId,who);
  if(['hint','retry','recovery'].includes(event.kind)&&(!hasQuestionEvidence(game,event.questionId)||(event.kind==='retry'&&!Object.hasOwn(game.records,event.questionId))))throw new Error('노력에 연결된 학습 기록을 먼저 가져와 주세요.');
  if(event.kind==='recovery'&&successfulRecovery(game.records[event.questionId])?.at!==event.at)
   throw new Error('오답 후 재도전 보상은 실제 다른 회차의 정답 기록이 필요해요.');
  const round=game.completedRounds?.find(r=>r.id===event.roundId);
  if(['session','reflection'].includes(event.kind)&&round&&event.at!==round.at)throw new Error('완료 회차와 노력 기록의 시간이 달라요.');
  if(event.kind==='explain'&&(!round||event.at<round.at))
   throw new Error('풀이 설명 기록에 연결된 완료 회차가 필요해요.');
 }
 const merged=mergeStates(current,incoming);
 // A standalone reward backup cannot restore the learning stars that funded
 // its purchases. Import the associated learning backup first.
 for(const who of LEARNERS){
  const roundsByGame=new Map();
  for(const e of Object.values(merged.profiles[who].events))if(['session','reflection'].includes(e.kind)){
   const ids=roundsByGame.get(e.gameId)||new Set();ids.add(e.roundId);roundsByGame.set(e.gameId,ids);
  }
  // Progress retains only the latest 100 round receipts. Historical backups
  // may contain older rewards, but never more unique rounds than were played.
  for(const [gameId,ids] of roundsByGame)if(ids.size>Progress.gameProgress(gameId,who).finishedRounds)throw new Error('완료한 학습 회차보다 노력 기록이 많아요.');
 }
 assertFunding(merged);
 const saved=save(merged,{spending:true});
 if(!saved.ok)throw new Error(saved.reason==='storage-unavailable'?'보상 기록을 저장할 수 없어요. 저장 공간을 확인해 주세요.':'보상 기록이 바뀌었어요. 다시 확인해 주세요.');
 return exportRewards();
}
export function rewardStorageAvailable(){load();return storageOK;}
