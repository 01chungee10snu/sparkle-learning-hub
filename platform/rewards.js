import * as Progress from './progress.js';

/** Rewards never rewrite learning stars. The separate ledger keeps two siblings
 * isolated and makes spending, repeat clicks and backup merges idempotent. */
export const REWARDS_KEY='sparkle-rewards-v1';
export const REWARD_ITEMS=Object.freeze([
 Object.freeze({id:'trail-stars',kind:'cosmetic',cost:30,title:'반짝 별 꼬리',description:'요정 뒤에 작은 별이 따라와요.',emoji:'✨'}),
 Object.freeze({id:'halo',kind:'cosmetic',cost:60,title:'빛나는 꽃 고리',description:'요정 머리 위에 꽃빛이 떠올라요.',emoji:'🌸'}),
 Object.freeze({id:'comet',kind:'cosmetic',cost:100,title:'혜성 날개',description:'요정이 혜성빛을 펼쳐요.',emoji:'☄️'}),
 Object.freeze({id:'story',kind:'family',cost:40,title:'함께 이야기 읽기',description:'보호자에게 함께 읽을 시간을 부탁해요.',emoji:'📖'}),
 Object.freeze({id:'walk',kind:'family',cost:80,title:'함께 산책하기',description:'보호자와 산책할 날을 함께 정해요.',emoji:'🌳'}),
 Object.freeze({id:'picnic',kind:'family',cost:120,title:'함께 소풍 계획하기',description:'보호자와 작은 소풍을 의논해요.',emoji:'🧺'})
]);
const BY_ID=new Map(REWARD_ITEMS.map(item=>[item.id,item]));
const LEARNERS=['tae','se'],KINDS=['hint','retry','session','reflection'];
const MAX_ENTRIES=50000,MAX_RECEIPTS=3000;
const profile=()=>({events:{},purchases:{},equipped:null});
const blank=()=>({version:1,profiles:{tae:profile(),se:profile()}});
let memory=blank(),dirty=false,storageOK=true,configuredCatalog=null;
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
  const src=raw.profiles[who];keys(src,['events','purchases','equipped']);const dest=next.profiles[who];
  for(const [id,event] of boundedMap(src.events,MAX_ENTRIES)){
   keys(event,['id','kind','gameId','questionId','roundId','at']);
   if(!validId(id)||event.id!==id||!KINDS.includes(event.kind)||!validId(event.gameId)||!validTime(event.at))fail();
   if(['hint','retry'].includes(event.kind)){if(!validId(event.questionId)||event.roundId!==undefined)fail();}
   else if(!validId(event.roundId)||event.questionId!==undefined)fail();
   dest.events[id]={id,kind:event.kind,gameId:event.gameId,...(event.questionId?{questionId:event.questionId}:{roundId:event.roundId}),at:event.at};
  }
  const familyOrdinals=new Map();
  for(const [id,purchase] of boundedMap(src.purchases,MAX_RECEIPTS)){
   keys(purchase,['id','rewardId','cost','at','completedAt']);
   const item=BY_ID.get(purchase.rewardId);
   if(!item||purchase.id!==id||purchase.cost!==item.cost||!validTime(purchase.at)||(purchase.completedAt!==undefined&&(!validTime(purchase.completedAt)||purchase.completedAt<purchase.at)))fail();
   if(item.kind==='cosmetic'){if(id!==`cosmetic-${item.id}`||purchase.completedAt!==undefined)fail();}
   else{
    const match=id.match(new RegExp(`^request-${item.id}-([1-9][0-9]{0,3})$`));if(!match)fail();
    const list=familyOrdinals.get(item.id)||[];list.push({ordinal:Number(match[1]),pending:purchase.completedAt===undefined});familyOrdinals.set(item.id,list);
   }
   dest.purchases[id]={id,rewardId:item.id,cost:item.cost,at:purchase.at,...(purchase.completedAt!==undefined?{completedAt:purchase.completedAt}:{})};
  }
  // A coupon is a monotone chain. A newer request can only exist after the
  // preceding activity was explicitly marked complete by a parent.
  for(const list of familyOrdinals.values()){
   list.sort((a,b)=>a.ordinal-b.ordinal);
   if(list.some((p,i)=>p.ordinal!==i+1||(p.pending&&i!==list.length-1)))fail();
  }
  if(src.equipped!==null){
   keys(src.equipped,['id','at']);const item=BY_ID.get(src.equipped.id);
   if(!validTime(src.equipped.at)||(src.equipped.id!==null&&(!item||item.kind!=='cosmetic'||!dest.purchases[`cosmetic-${item.id}`])))fail();
   dest.equipped={id:src.equipped.id,at:src.equipped.at};
  }
 }
 return next;
}
function load(){
 if(dirty)return memory;
 try{const value=globalThis.localStorage.getItem(REWARDS_KEY);if(value!==null)memory=validate(JSON.parse(value));}
 catch{storageOK=false;}
 return memory;
}
function mergeStates(current,incoming){
 const merged=copy(current);
 for(const who of LEARNERS){
  const dest=merged.profiles[who],src=incoming.profiles[who];
  for(const [id,event] of Object.entries(src.events)){
   const old=dest.events[id];
   if(old&&(old.kind!==event.kind||old.gameId!==event.gameId||old.questionId!==event.questionId||old.roundId!==event.roundId))throw new Error('같은 노력 기록의 내용이 달라요.');
   if(!old||event.at<old.at)dest.events[id]=copy(event);
  }
  for(const [id,receipt] of Object.entries(src.purchases)){
   const old=dest.purchases[id];
   if(!old){dest.purchases[id]=copy(receipt);continue;}
   old.at=Math.min(old.at,receipt.at);
   if(receipt.completedAt!==undefined)old.completedAt=Math.max(old.completedAt||0,receipt.completedAt,old.at);
  }
  if(src.equipped&&(!dest.equipped||src.equipped.at>=dest.equipped.at))dest.equipped=copy(src.equipped);
 }
 return validate(merged);
}
function save(state){
 memory=state;dirty=true;
 try{
  // Recovering from a blocked first read must preserve the older on-device
  // spending ledger, even when the new effort initially existed only in memory.
  const persisted=globalThis.localStorage.getItem(REWARDS_KEY);
  if(persisted!==null)memory=mergeStates(validate(JSON.parse(persisted)),memory);
  globalThis.localStorage.setItem(REWARDS_KEY,JSON.stringify(memory));dirty=false;storageOK=true;
 }catch{storageOK=false;}
}
function configure(catalog){if(!Array.isArray(catalog))throw new Error('놀이 목록을 확인해 주세요.');configuredCatalog=catalog;return catalog;}
const quizEntry=(catalog,id)=>catalog.find(game=>game.id===id&&game.status==='published'&&game.kind==='quiz');
function effortTotal(p){
 const questionCounts=new Map(),rounds=new Set(),dates=new Set();let total=0;
 for(const event of Object.values(p.events).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){
  if(['hint','retry'].includes(event.kind)){
   const key=`${event.gameId}/${event.questionId}`,count=questionCounts.get(key)||0;
   if(count<2){total++;questionCounts.set(key,count+1);}
  }else{
   const key=`${event.gameId}/${event.roundId}`,date=day(event.at);
   if(!rounds.has(key)&&!dates.has(date)){total+=3;rounds.add(key);dates.add(date);}
  }
 }
 return total;
}
function evidence(catalog,who){
 const results=Progress.summary(catalog,who),subjects=new Set(),correctDates=new Set(),events=Object.values(load().profiles[who].events);let completed=0,retry=false;
 for(const entry of catalog.filter(g=>g.status==='published')){
  const game=entry.progressAdapter==='unit-garden-v1'?Progress.legacyProgress(who):Progress.gameProgress(entry.id,who);
  completed+=game.finishedRounds||0;
  if(Object.keys(game.records).length||game.finishedRounds)subjects.add(entry.subject);
  for(const [questionId,record] of Object.entries(game.records)){
   // The app emits retry only after grading a guided re-practice as correct.
   // It remains separate from the original independent-answer/growth evidence.
   const firstAttempt=Math.min(...(record.attempts||[]).map(attempt=>attempt.at));
   if(entry.kind==='quiz'&&entry.questionIds?.includes(questionId)&&events.some(event=>event.kind==='retry'&&event.gameId===entry.id&&event.questionId===questionId&&(!Number.isFinite(firstAttempt)||event.at>=firstAttempt)))retry=true;
   let wrong=false;
   for(const attempt of [...(record.attempts||[])].sort((a,b)=>a.at-b.at)){
    if(!attempt.correct)wrong=true;
    else{correctDates.add(day(attempt.at));if(wrong)retry=true;}
   }
  }
 }
 return {results,completed,subjects:subjects.size,retry,correctDays:correctDates.size};
}
export function syncRewards(catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const state=load(),p=state.profiles[who];let changed=false;
 for(const entry of catalog.filter(g=>g.status==='published'&&g.kind==='quiz')){
  const game=Progress.gameProgress(entry.id,who);
  for(const round of game.completedRounds||[]){
   // Long ids are shortened deterministically without exposing learner names.
   const id=`session-${round.id}`;
   if(validId(id)&&!p.events[id]&&Object.keys(p.events).length<MAX_ENTRIES){p.events[id]={id,kind:'session',gameId:entry.id,roundId:round.id,at:round.at};changed=true;}
  }
 }
 if(changed)save(state);
 return wallet(catalog,who);
}
export function wallet(catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const p=load().profiles[who],ev=evidence(catalog,who),effortStars=effortTotal(p);
 const learningStars=ev.results.stars,lifetime=learningStars+effortStars,purchases=Object.values(p.purchases).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)),spent=purchases.reduce((total,receipt)=>total+receipt.cost,0),available=Math.max(0,lifetime-spent);
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
  return {...item,owned,equipped:p.equipped?.id===item.id,pending:pending?copy(pending):null,canPurchase:!owned&&!pending&&available>=item.cost};
 });
 return {who,learningStars,effortStars,lifetime,spent,available,items,equipped:p.equipped?.id||null,badges,milestones,nextMilestone:milestones.find(mark=>!mark.unlocked)||null,purchases:copy(purchases),requests:copy(purchases.filter(receipt=>BY_ID.get(receipt.rewardId).kind==='family')),storageAvailable:storageOK};
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
  if(kind==='retry'&&!Object.hasOwn(Progress.gameProgress(gameId,who).records,questionId))throw new Error('먼저 풀어 본 문제를 다시 연습해 주세요.');
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
  if(Object.values(p.events).some(e=>['session','reflection'].includes(e.kind)&&(e.roundId===round.id||day(e.at)===day(round.at))))return {added:false,earned:0,reason:'daily-cap'};
 }
 if(Object.keys(p.events).length>=MAX_ENTRIES)return {added:false,earned:0,reason:'ledger-full'};
 const before=effortTotal(p);p.events[eventId]=event;const earned=effortTotal(p)-before;save(state);
 return {added:true,earned,reason:earned?'earned':['hint','retry'].includes(kind)?'question-cap':'daily-cap'};
}
export function purchaseReward(id,catalog,who=Progress.learner()){
 configure(catalog);whoId(who);const item=BY_ID.get(id);if(!item)throw new Error('별로 고를 선물을 확인해 주세요.');
 syncRewards(catalog,who);const balance=wallet(catalog,who),state=load(),p=state.profiles[who];
 const existing=item.kind==='cosmetic'?p.purchases[`cosmetic-${id}`]:Object.values(p.purchases).find(receipt=>receipt.rewardId===id&&receipt.completedAt===undefined);
 if(existing)return {ok:true,duplicate:true,purchase:copy(existing),wallet:balance};
 if(balance.available<item.cost)return {ok:false,reason:'insufficient-stars',wallet:balance};
 if(Object.keys(p.purchases).length>=MAX_RECEIPTS)return {ok:false,reason:'ledger-full',wallet:balance};
 const number=Object.values(p.purchases).filter(receipt=>receipt.rewardId===id).length+1;
 const receipt={id:item.kind==='cosmetic'?`cosmetic-${id}`:`request-${id}-${number}`,rewardId:id,cost:item.cost,at:Date.now()};
 p.purchases[receipt.id]=receipt;if(item.kind==='cosmetic')p.equipped={id,at:Math.max(receipt.at,(p.equipped?.at||0)+1)};save(state);
 return {ok:true,duplicate:false,purchase:copy(receipt),wallet:wallet(catalog,who)};
}
export function equipReward(id,who=Progress.learner()){
 whoId(who);const state=load(),p=state.profiles[who];
 if(id===null||id==='none'){p.equipped={id:null,at:Math.max(Date.now(),(p.equipped?.at||0)+1)};save(state);return null;}
 const item=BY_ID.get(id);if(item?.kind!=='cosmetic'||!p.purchases[`cosmetic-${id}`])throw new Error('먼저 별로 장식을 골라 주세요.');
 p.equipped={id,at:Math.max(Date.now(),(p.equipped?.at||0)+1)};save(state);return id;
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
 const incoming=validate(raw.state),current=copy(load());
 if(configuredCatalog)for(const who of LEARNERS)for(const event of Object.values(incoming.profiles[who].events)){
  const entry=quizEntry(configuredCatalog,event.gameId);
  if(!entry||(['hint','retry'].includes(event.kind)&&!entry.questionIds?.includes(event.questionId)))throw new Error('보상에 연결된 놀이와 문제를 확인해 주세요.');
 }
 const merged=mergeStates(current,incoming);
 // A standalone reward backup cannot restore the learning stars that funded
 // its purchases. Import the associated learning backup first.
 if(configuredCatalog)for(const who of LEARNERS){
  const p=merged.profiles[who],spent=Object.values(p.purchases).reduce((sum,r)=>sum+r.cost,0),earned=Progress.summary(configuredCatalog,who).stars+effortTotal(p);
  if(spent>earned)throw new Error('이 보상에 연결된 학습 기록을 먼저 가져와 주세요.');
 }
 save(merged);return exportRewards();
}
export function rewardStorageAvailable(){load();return storageOK;}
