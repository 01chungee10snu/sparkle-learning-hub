import * as Progress from './progress.js';
import {CAREER_BY_ID} from '../village/career-library.js';
import {EXTRA_SPECIES} from './marine-species-extra.js';
import {FIRST_VISIT_REWARDS} from './first-visit-rewards.js';

/**
 * Four distinct subject resources. Ordinary problem rewards require independently
 * correct, distinct items; first visits and completed mixed pond-learning cycles
 * have separate, bounded receipts. Legacy stars retain their historical ledger.
 *
 * The client is a learning game, not a secure economy server: local storage
 * and family snapshot synchronization are eventually consistent. No academic
 * competence or financial value is represented.
 */
// Older cached writers discard unknown receipt fields. Keep new receipts in a
// new key and merge legacy observations without ever letting v1 erase v2.
export const RESOURCE_KEY='sparkle-subject-resources-v2';
export const PREVIOUS_RESOURCE_KEY='sparkle-subject-resources-v1';
export const RESOURCE_SUBJECTS=Object.freeze(['math','korean','english','hanja']);
export const RESOURCE_TYPES=Object.freeze({
  math:Object.freeze({id:'math',name:'수정',emoji:'💎',color:'#387fa9'}),
  korean:Object.freeze({id:'korean',name:'꽃잎',emoji:'🌸',color:'#b05c83'}),
  english:Object.freeze({id:'english',name:'깃털',emoji:'🪶',color:'#5d9562'}),
  hanja:Object.freeze({id:'hanja',name:'먹방울',emoji:'🖋️',color:'#8261ab'})
});
const zero=()=>({math:0,korean:0,english:0,hanja:0});
const cost=(math,korean,english,hanja)=>Object.freeze({math,korean,english,hanja});
// Original illustrations are provided under assets and village/assets. Thresholds
// are game progression targets, not measurements of intelligence or ability.
const creature=(id,name,world,costs,minimum,balanced,color,size,description,careMode='feed')=>Object.freeze({
 id,name,world,emoji:'',color,size,cost:cost(...costs),minSolved:minimum,
 minBalancedDays:balanced,art:world==='pond'?'../assets/pond-originals-v34/'+id+'.webp':'./assets/marine-premium-v25/'+id+'.webp',
 careMode,description
});
export const FISH_SPECIES=Object.freeze([
 creature('guppy','무지개 구피','pond',[0,0,0,0],0,0,'#ff8d59',.45,'처음부터 함께하는 연못 친구'),
 creature('goldfish','황금 금붕어','pond',[3,2,2,1],4,0,'#ffb640',.65,'금빛 비늘이 반짝이는 연못 친구'),
 creature('neon','네온 테트라','pond',[4,3,3,1],6,0,'#36c6df',.50,'푸른 줄무늬가 빛나는 작은 물고기'),
 creature('betta','비단 베타','pond',[4,4,3,2],8,0,'#b778ee',.70,'긴 지느러미가 펼쳐지는 물고기'),
 creature('koi','연못 잉어','pond',[6,4,4,3],10,0,'#f5efe2',.85,'연못에 잔잔한 물결을 만드는 잉어'),
 creature('angel','별빛 엔젤피시','pond',[5,5,5,4],12,0,'#ffe691',.70,'넓은 지느러미가 아름다운 친구'),
 creature('clownfish','산호 흰동가리','ocean',[7,5,5,4],14,0,'#ff9951',.52,'말미잘 곁에서 사는 작은 바닷물고기'),
 creature('blue-tang','푸른 블루탱','ocean',[9,7,7,5],24,1,'#296dbd',.56,'산호초 사이를 헤엄치는 푸른 물고기'),
 creature('shrimp','산호 새우','ocean',[13,9,8,7],34,1,'#ff9084',.38,'바다 바닥을 돌보는 작은 갑각류'),
 creature('hermit-crab','소라게','ocean',[17,13,11,9],46,2,'#d7956b',.52,'자기 몸에 맞는 껍데기를 찾는 갑각류'),
 creature('sea-crab','바다 게','ocean',[23,18,14,12],60,2,'#e66f68',.68,'옆으로 걸으며 바닷가를 탐험하는 게'),
 creature('seahorse','별빛 해마','ocean',[30,23,19,15],78,3,'#eab84d',.65,'해초를 꼬리로 붙잡는 작은 바다 친구'),
 creature('octopus','산호 문어','ocean',[39,31,25,22],98,4,'#bd8ad5',.80,'여덟 팔로 주위를 탐색하는 문어'),
 creature('sea-turtle','푸른 바다거북','ocean',[54,42,34,28],125,5,'#67b9a3',.95,'긴 여정을 헤엄치는 보호 대상 바다거북','observe'),
 creature('reef-shark','산호초 상어','ocean',[75,60,50,40],165,6,'#608ca2',1.12,'바다 생태계의 균형에 중요한 역할을 하는 상어','observe'),
 creature('humpback-whale','혹등고래','ocean',[110,90,75,60],220,8,'#638bc0',1.65,'먼 바다를 이동하는 거대한 야생 고래','observe'),
 ...EXTRA_SPECIES.map(row=>creature(...row))
].sort((a,b)=>(a.world==='pond'?0:1)-(b.world==='pond'?0:1)||
 a.minSolved-b.minSolved||a.id.localeCompare(b.id)));
const BY_FISH=new Map(FISH_SPECIES.map(f=>[f.id,f]));
const MAX_RECEIPTS=256,MAX_FEED_EVENTS=5000,DAY=86400000;
const now=()=>Date.now();
const validTimestamp=t=>Number.isSafeInteger(t)&&t>=0&&t<=now()+60000;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const blankProfile=()=>({adoptions:{},feedEvents:{},careerUnlocks:{},visitBonuses:{},pondCharges:{},pondRefills:{}});
const blank=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});
const copy=x=>JSON.parse(JSON.stringify(x));
const validWho=who=>{if(!Object.hasOwn(Progress.LEARNERS,who))throw new Error('학습자 정보를 확인해 주세요.');return who;};
const dateKey=t=>new Date(t+9*3600000).toISOString().slice(0,10);
const knownFish=id=>BY_FISH.get(id);
let memory=blank(),dirty=false,storageOK=true;
let configuredCatalog=[];

function clean(raw){
 if(!plain(raw)||raw.version!==1||!plain(raw.profiles))throw new Error('배움 재료 기록을 확인해 주세요.');
 const result=blank();
 for(const who of ['tae','se']){
  const src=raw.profiles[who];
  if(!plain(src)||!plain(src.adoptions)||!plain(src.feedEvents)||
    (src.careerUnlocks!==undefined&&!plain(src.careerUnlocks))||
    (src.visitBonuses!==undefined&&!plain(src.visitBonuses))||
    Object.keys(src.adoptions).length>MAX_RECEIPTS||Object.keys(src.feedEvents).length>MAX_FEED_EVENTS||
    Object.keys(src.careerUnlocks||{}).length>100||Object.keys(src.visitBonuses||{}).length>Object.keys(FIRST_VISIT_REWARDS).length)throw new Error('배움 재료 기록의 크기를 확인해 주세요.');
  for(const [id,receipt] of Object.entries(src.visitBonuses||{})){
   const reward=Object.hasOwn(FIRST_VISIT_REWARDS,id)?FIRST_VISIT_REWARDS[id]:null;
   if(!reward||!plain(receipt)||receipt.id!==id||!validTimestamp(receipt.at)||!plain(receipt.cost)||
      RESOURCE_SUBJECTS.some((subject,index)=>receipt.cost[subject]!==reward.amounts[index] || Object.keys(receipt.cost).length!==4))
    throw new Error('첫 방문 보상 영수증을 확인해 주세요.');
   result.profiles[who].visitBonuses[id]={id,at:receipt.at,cost:Object.fromEntries(RESOURCE_SUBJECTS.map((subject,index)=>[subject,reward.amounts[index]]))};
  }
  for(const [id,adoption] of Object.entries(src.adoptions)){
   if(!knownFish(id)||id==='guppy'||!plain(adoption)||adoption.id!==id||!validTimestamp(adoption.at)||
      !plain(adoption.cost)||RESOURCE_SUBJECTS.some(s=>adoption.cost[s]!==BY_FISH.get(id).cost[s]))
    throw new Error('물고기 친구를 만난 기록을 확인해 주세요.');
   result.profiles[who].adoptions[id]={id,at:adoption.at,cost:{...BY_FISH.get(id).cost}};
  }
  for(const [key,event] of Object.entries(src.feedEvents)){
   if(!plain(event)||!knownFish(event.fishId)||!validTimestamp(event.at)||
      event.day!==dateKey(event.at)||key!==event.day+'-'+event.fishId)
    throw new Error('물고기 돌봄 기록을 확인해 주세요.');
   result.profiles[who].feedEvents[key]={fishId:event.fishId,day:event.day,at:event.at};
  }
  for(const [id,receipt] of Object.entries(src.careerUnlocks||{})){
   if(!CAREER_BY_ID.has(id)||!plain(receipt)||receipt.id!==id||!validTimestamp(receipt.at)||!plain(receipt.cost)||
      RESOURCE_SUBJECTS.some(s=>![0,1].includes(receipt.cost[s]))||
      RESOURCE_SUBJECTS.reduce((sum,s)=>sum+receipt.cost[s],0)!==2)
      throw new Error('직업사전 열람 영수증을 확인해 주세요.');
   result.profiles[who].careerUnlocks[id]={id,at:receipt.at,cost:{...zero(),...receipt.cost}};
  }
  for(const name of ['pondCharges','pondRefills']){
   const receipts=src[name]??{};
   if(!plain(receipts)||Object.keys(receipts).length>100000)throw new Error('연못 재료 기록의 크기를 확인해 주세요.');
   for(const [id,receipt] of Object.entries(receipts)){
    const charge=name==='pondCharges',pattern=charge?/^pond-(0|[1-9][0-9]{0,5}):[1-5]$/:/^pond-(0|[1-9][0-9]{0,5})$/;
    const maximum=who==='se'?3:5;
    if(!pattern.test(id)||(charge&&Number(id.split(':')[1])>maximum)||!plain(receipt)||receipt.id!==id||!validTimestamp(receipt.at)||!plain(receipt.cost)||
      Object.keys(receipt.cost).length!==4||RESOURCE_SUBJECTS.some(s=>!Number.isSafeInteger(receipt.cost[s])||receipt.cost[s]<0||receipt.cost[s]>maximum)||
      (charge?RESOURCE_SUBJECTS.reduce((n,s)=>n+receipt.cost[s],0)!==1:RESOURCE_SUBJECTS.reduce((n,s)=>n+receipt.cost[s],0)>maximum))
      throw new Error('연못 재료 영수증을 확인해 주세요.');
    result.profiles[who][name][id]={id,at:receipt.at,cost:{...receipt.cost}};
   }
  }
 }
 return result;
}
function merge(a,b){
 const merged=clean(a),incoming=clean(b);
 for(const who of ['tae','se']){
  for(const [id,e] of Object.entries(incoming.profiles[who].adoptions)){
   const old=merged.profiles[who].adoptions[id];
   if(!old||e.at<old.at)merged.profiles[who].adoptions[id]=e;
  }
  for(const [id,e] of Object.entries(incoming.profiles[who].feedEvents)){
   const old=merged.profiles[who].feedEvents[id];
   if(!old||e.at<old.at)merged.profiles[who].feedEvents[id]=e;
  }
  for(const [id,e] of Object.entries(incoming.profiles[who].careerUnlocks)){
   const old=merged.profiles[who].careerUnlocks[id];
   if(!old||e.at<old.at || (e.at===old.at && JSON.stringify(e.cost)<JSON.stringify(old.cost)))
     merged.profiles[who].careerUnlocks[id]=e;
  }
  for(const [id,e] of Object.entries(incoming.profiles[who].visitBonuses)){
   const old=merged.profiles[who].visitBonuses[id];
   if(!old||e.at<old.at)merged.profiles[who].visitBonuses[id]=e;
  }
  for(const name of ['pondCharges','pondRefills'])for(const [id,e] of Object.entries(incoming.profiles[who][name])){
   const old=merged.profiles[who][name][id];
   // A minute and a completed learning cycle each have one stable receipt.
   // Concurrent snapshots choose the same receipt rather than adding it twice.
   if(!old||e.at<old.at||(e.at===old.at&&JSON.stringify(e.cost)<JSON.stringify(old.cost)))merged.profiles[who][name][id]=e;
  }
 }
 return merged;
}
export function loadResources(storage=globalThis.localStorage){
 if(dirty)return clean(memory);
 try{const value=storage?.getItem(RESOURCE_KEY),legacy=storage?.getItem(PREVIOUS_RESOURCE_KEY);
  memory=value?clean(JSON.parse(value)):blank();
  if(legacy)memory=merge(memory,clean(JSON.parse(legacy)));
  storageOK=true;
 }catch{storageOK=false;}
 return clean(memory);
}
function persist(state,storage=globalThis.localStorage){
 let merged=clean(state);
 try{
  if(!storage)throw new Error('storage unavailable');
  const old=storage.getItem(RESOURCE_KEY);
  if(old)merged=merge(clean(JSON.parse(old)),merged);
  const legacy=storage.getItem(PREVIOUS_RESOURCE_KEY);
  if(legacy)merged=merge(clean(JSON.parse(legacy)),merged);
  storage.setItem(RESOURCE_KEY,JSON.stringify(merged));
  memory=merged;dirty=false;storageOK=true;return true;
 }catch{storageOK=false;return false;}
}
export function exportResources(){return clean(loadResources());}
export function importResources(incoming,storage=globalThis.localStorage){
 const combined=merge(loadResources(storage),clean(incoming));
 if(!persist(combined,storage))throw new Error('물고기와 배움 재료 기록을 기기에 저장할 수 없어요.');
 return exportResources();
}
export function configure(catalog){
 if(!Array.isArray(catalog))throw new Error('학습 게임 목록을 확인해 주세요.');
 configuredCatalog=catalog.filter(g=>g.kind==='quiz'&&g.status==='published'&&RESOURCE_SUBJECTS.includes(g.subject));
}
function independentAttempt(record){
 if(record?.firstAttempt&&typeof record.firstAttempt.correct==='boolean')return record.firstAttempt;
 const attempts=Array.isArray(record?.attempts)?record.attempts:[];
 return record?.seen===attempts.length&&attempts.length?attempts.slice().sort((a,b)=>a.at-b.at)[0]:null;
}
/** Deterministic and bounded for old records and across merged device snapshots. */
export function earnedResources(catalog,who=Progress.learner()){
 validWho(who);const out=zero(),dates=new Map(),families=new Set(),perDay=new Map();
 // Read one coherent learner snapshot rather than reparsing the entire family
 // JSON once for each of 66+ game entries during every village HUD refresh.
 const profileGames=Progress.exportRecords().platform.profiles[who].games;
 const rows=[];
 for(const entry of catalog.filter(e=>e.kind==='quiz'&&e.status==='published'&&RESOURCE_SUBJECTS.includes(e.subject))){
  const records=profileGames[entry.id]?.records||{};
  for(const [qid,r] of Object.entries(records)){
   if(!entry.questionIds?.includes(qid)||r.best!==10)continue;
   // A later independent correction earns resources once, but only the first
   // independent first-exposure answer is used by IRT (a separate concern).
   const attempt=[independentAttempt(r),...(r.attempts||[])].filter(a=>a&&a.correct===true&&a.assisted!==true&&Number.isFinite(a.at)).sort((a,b)=>a.at-b.at)[0];
   if(!attempt)continue;
   const family=entry.subject==='hanja'?('hanja:'+(/^(hanja-h\w+)-([a-f0-9]+)-/.exec(qid)?.[2]??qid)):entry.id+':'+qid;
   if(families.has(family))continue;
   families.add(family);
   rows.push({subject:entry.subject,at:attempt.at,key:family,day:dateKey(attempt.at)});
  }
 }
 rows.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key));
 for(const row of rows){
  const key=row.day+':'+row.subject,n=perDay.get(key)||0;
  if(n>=12)continue; // replay-resistant per-subject daily learning credit cap.
  perDay.set(key,n+1);
  out[row.subject]+=2;
  const daySubjects=dates.get(row.day)||new Set();daySubjects.add(row.subject);dates.set(row.day,daySubjects);
 }
 let balancedDays=0;
 for(const subjects of dates.values())if(subjects.size>=3){
  balancedDays++;
  for(const subject of subjects)out[subject]+=2;
 }
 return {earned:out,balancedDays,independentItems:rows.length};
}
export function awardFirstVisit(locationId,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);
 const reward=Object.hasOwn(FIRST_VISIT_REWARDS,locationId)?FIRST_VISIT_REWARDS[locationId]:null;
 if(!reward)throw new Error('방문 장소를 확인해 주세요.');
 const state=loadResources(storage),profile=state.profiles[who];
 if(profile.visitBonuses[locationId])return null;
 const amounts=Object.fromEntries(RESOURCE_SUBJECTS.map((subject,index)=>[subject,reward.amounts[index]]));
 profile.visitBonuses[locationId]={id:locationId,cost:amounts,at:now()};
 if(!persist(state,storage))throw new Error('첫 방문 기록을 저장하지 못했어요.');
 return {locationId,label:reward.label,amounts};
}
export function wallet(catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 const state=loadResources(storage),p=state.profiles[who],source=earnedResources(catalog,who),spent=zero();
 for(const receipt of [...Object.values(p.adoptions),...Object.values(p.careerUnlocks),...Object.values(p.pondCharges)])
  for(const subject of RESOURCE_SUBJECTS)spent[subject]+=receipt.cost[subject];
 const visitBonuses=Object.fromEntries(Object.entries(p.visitBonuses).map(([id,receipt])=>[id,{...receipt,cost:{...receipt.cost}}]));
 const visitAward=zero();
 for(const receipt of Object.values(p.visitBonuses))for(const subject of RESOURCE_SUBJECTS)visitAward[subject]+=receipt.cost[subject];
 const pondAward=zero();
 for(const receipt of Object.values(p.pondRefills))for(const subject of RESOURCE_SUBJECTS)pondAward[subject]+=receipt.cost[subject];
 const totalEarned=Object.fromEntries(RESOURCE_SUBJECTS.map(subject=>[subject,source.earned[subject]+visitAward[subject]+pondAward[subject]]));
 const available=Object.fromEntries(RESOURCE_SUBJECTS.map(subject=>[subject,Math.max(0,totalEarned[subject]-spent[subject])]));
 const deficits=Object.fromEntries(RESOURCE_SUBJECTS.map(subject=>[subject,Math.max(0,spent[subject]-totalEarned[subject])]));
 const fish=FISH_SPECIES.map(species=>{
  const owned=species.id==='guppy'||Boolean(p.adoptions[species.id]);
  const fed=Object.values(p.feedEvents).filter(e=>e.fishId===species.id).length;
  const canAfford=RESOURCE_SUBJECTS.every(s=>available[s]>=species.cost[s]);
  const meetsLearning=source.independentItems>=species.minSolved&&source.balancedDays>=species.minBalancedDays;
  return {...species,cost:{...species.cost},owned,feedDays:fed,growth:Math.min(3,Math.floor(fed/3)),fedToday:Boolean(p.feedEvents[dateKey(now())+'-'+species.id]),meetsLearning,
   remainingSolved:Math.max(0,species.minSolved-source.independentItems),remainingBalanced:Math.max(0,species.minBalancedDays-source.balancedDays),
   canAdopt:!owned&&canAfford&&meetsLearning&&RESOURCE_SUBJECTS.every(s=>deficits[s]===0)};
 });
 const next=[...fish].filter(f=>!f.owned&&f.id!=='guppy').sort((a,b)=>{
  const aCost=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+Math.max(0,a.cost[s]-available[s]),0);
  const bCost=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+Math.max(0,b.cost[s]-available[s]),0);
  return aCost-bCost;
 })[0];
 return {who,earned:totalEarned,learningEarned:source.earned,visitAward,visitBonuses,pondAward,available,spent,deficits,balancedDays:source.balancedDays,
   uniqueCorrect:source.independentItems,fish,next,careerUnlocked:Object.keys(p.careerUnlocks),
   storageAvailable:storageOK};
}
export function adoptFish(id,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 const species=knownFish(id);
 if(!species||id==='guppy')throw new Error('새로 만날 물고기 종류를 확인해 주세요.');
 const state=loadResources(storage),p=state.profiles[who];
 if(p.adoptions[id])return {ok:true,duplicate:true,wallet:wallet(catalog,who)};
 const funds=wallet(catalog,who);
 if(funds.uniqueCorrect<species.minSolved||funds.balancedDays<species.minBalancedDays)
  return {ok:false,reason:'learning-milestone',wallet:funds};
 if(!RESOURCE_SUBJECTS.every(subject=>funds.available[subject]>=species.cost[subject]))
  return {ok:false,reason:'insufficient-resources',wallet:funds};
 p.adoptions[id]={id,at:now(),cost:{...species.cost}};
 // A purchase is never announced unless its receipt reached durable storage.
 if(!persist(state,storage))return {ok:false,reason:'storage-unavailable',wallet:funds};
 return {ok:true,duplicate:false,wallet:wallet(catalog,who)};
}
export function feedFish(id,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 const species=knownFish(id),state=loadResources(storage),p=state.profiles[who];
 if(!species||(id!=='guppy'&&!p.adoptions[id]))throw new Error('내가 키우는 물고기를 선택해 주세요.');
 const at=now(),day=dateKey(at),key=day+'-'+id;
 if(p.feedEvents[key])return {ok:true,duplicate:true,wallet:wallet(catalog,who)};
 if(Object.keys(p.feedEvents).length>=MAX_FEED_EVENTS)return {ok:false,reason:'record-limit'};
 p.feedEvents[key]={fishId:id,day,at};
 if(!persist(state,storage))return {ok:false,reason:'storage-unavailable'};
 return {ok:true,duplicate:false,wallet:wallet(catalog,who)};
}
export function resourceStorageAvailable(){loadResources();return storageOK;}

/** One resource for a completed active pond minute. The caller supplies only a
 * stable cycle/minute identity; it cannot choose a cost or create a balance.
 * Subject order rotates, skipping empty wallets. No negative balance is spent.
 */
export function spendPondMinute(cycleId,minute,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 if(!/^pond-(0|[1-9][0-9]{0,5})$/.test(cycleId)||!Number.isInteger(minute)||minute<1||minute>(who==='se'?3:5))throw new Error('연못 시간을 확인해 주세요.');
 const id=cycleId+':'+minute,state=loadResources(storage),p=state.profiles[who];
 if(p.pondCharges[id])return {ok:true,duplicate:true,receipt:copy(p.pondCharges[id])};
 const funds=wallet(catalog,who,storage),offset=(Number(cycleId.slice(5))+minute-1)%RESOURCE_SUBJECTS.length;
 const subject=Array.from({length:4},(_,n)=>RESOURCE_SUBJECTS[(offset+n)%4]).find(s=>funds.available[s]>0);
 if(!subject)return {ok:false,reason:'insufficient-resources'};
 const costs=zero();costs[subject]=1;
 p.pondCharges[id]={id,at:now(),cost:costs};
 if(!persist(state,storage))return {ok:false,reason:'storage-unavailable'};
 return {ok:true,duplicate:false,receipt:copy(p.pondCharges[id])};
}

/** Completing a mixed learning cycle tops the wallet up to one full next visit.
 * This is participation credit, independent of correctness rewards. A stable
 * cycle receipt (including a zero top-up) prevents replay and cloud duplication.
 */
export function replenishPondResources(cycleId,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 if(!/^pond-(0|[1-9][0-9]{0,5})$/.test(cycleId))throw new Error('연못 배움 기록을 확인해 주세요.');
 const state=loadResources(storage),p=state.profiles[who];
 if(p.pondRefills[cycleId])return {ok:true,duplicate:true,receipt:copy(p.pondRefills[cycleId])};
 const funds=wallet(catalog,who,storage),maximum=who==='se'?3:5;
 let missing=Math.max(0,maximum-RESOURCE_SUBJECTS.reduce((n,s)=>n+funds.available[s],0));
 const costs=zero(),subjects=who==='se'?['math','korean','english']:RESOURCE_SUBJECTS;
 let index=Number(cycleId.slice(5))%subjects.length;
 while(missing-->0){costs[subjects[index%subjects.length]]++;index++;}
 p.pondRefills[cycleId]={id:cycleId,at:now(),cost:costs};
 if(!persist(state,storage))return {ok:false,reason:'storage-unavailable'};
 return {ok:true,duplicate:false,receipt:copy(p.pondRefills[cycleId])};
}

/** Permanent career fact unlock: exactly 1 credit each from 2 different
 * subjects, regardless of source salary or occupation status. Salary facts
 * have no real-money monetary value and may be viewed freely at source.
 */
export function unlockCareer(id,subjects,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 if(!CAREER_BY_ID.has(id))throw new Error('찾을 수 없는 직업이에요.');
 if(!Array.isArray(subjects)||subjects.length!==2||new Set(subjects).size!==2||
    !subjects.every(s=>RESOURCE_SUBJECTS.includes(s)))
    throw new Error('서로 다른 두 과목의 자원을 골라 주세요.');
 const state=loadResources(storage),profile=state.profiles[who];
 if(profile.careerUnlocks[id])return {ok:true,duplicate:true,wallet:wallet(catalog,who)};
 const funds=wallet(catalog,who);
 if(!subjects.every(s=>funds.available[s]>=1) ||
    RESOURCE_SUBJECTS.some(s=>funds.deficits[s]>0))
    return {ok:false,reason:'insufficient-resources',wallet:funds};
 const cost=zero();
 for(const subject of subjects)cost[subject]=1;
 profile.careerUnlocks[id]={id,at:now(),cost};
 if(!persist(state,storage))return {ok:false,reason:'storage-unavailable',wallet:funds};
 return {ok:true,duplicate:false,wallet:wallet(catalog,who)};
}
