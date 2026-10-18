import * as Progress from './progress.js';
import {CAREER_BY_ID} from '../village/career-library.js';

/**
 * Four distinct subject resources. Only independently correct, distinct items
 * pay resources. Legacy stars remain a separate, intact historical ledger.
 *
 * The client is a learning game, not a secure economy server: local storage
 * and family snapshot synchronization are eventually consistent. No academic
 * competence or financial value is represented.
 */
export const RESOURCE_KEY='sparkle-subject-resources-v1';
export const RESOURCE_SUBJECTS=Object.freeze(['math','korean','english','hanja']);
export const RESOURCE_TYPES=Object.freeze({
  math:Object.freeze({id:'math',name:'수정',emoji:'💎',color:'#387fa9'}),
  korean:Object.freeze({id:'korean',name:'꽃잎',emoji:'🌸',color:'#b05c83'}),
  english:Object.freeze({id:'english',name:'깃털',emoji:'🪶',color:'#5d9562'}),
  hanja:Object.freeze({id:'hanja',name:'먹방울',emoji:'🖋️',color:'#8261ab'})
});
const zero=()=>({math:0,korean:0,english:0,hanja:0});
const cost=(math,korean,english,hanja)=>Object.freeze({math,korean,english,hanja});
export const FISH_SPECIES=Object.freeze([
 Object.freeze({id:'guppy',name:'무지개 구피',emoji:'🐟',color:'#ff8d59',size:0.45,cost:cost(0,0,0,0),description:'처음부터 함께 살아가는 알록달록한 물고기'}),
 Object.freeze({id:'goldfish',name:'황금 금붕어',emoji:'🐠',color:'#ffb640',size:0.65,cost:cost(3,2,2,1),description:'여러 과목의 배움을 모아 만나는 금빛 친구'}),
 Object.freeze({id:'neon',name:'네온 테트라',emoji:'🐟',color:'#36c6df',size:0.5,cost:cost(4,3,3,1),description:'파란 빛을 따라 무리를 지어 헤엄쳐요'}),
 Object.freeze({id:'betta',name:'비단 베타',emoji:'🐠',color:'#b778ee',size:0.7,cost:cost(4,4,3,2),description:'부드러운 지느러미를 펼치고 헤엄쳐요'}),
 Object.freeze({id:'koi',name:'연못 잉어',emoji:'🐟',color:'#f5efe2',size:0.85,cost:cost(6,4,4,3),description:'연못을 크게 돌며 긴 물결을 만들어요'}),
 Object.freeze({id:'angel',name:'별빛 엔젤피시',emoji:'🐠',color:'#ffe691',size:0.7,cost:cost(5,5,5,4),description:'고른 배움으로 나타나는 특별한 친구'})
]);
const BY_FISH=new Map(FISH_SPECIES.map(f=>[f.id,f]));
const MAX_RECEIPTS=64,MAX_FEED_EVENTS=5000,DAY=86400000;
const now=()=>Date.now();
const validTimestamp=t=>Number.isSafeInteger(t)&&t>=0&&t<=now()+60000;
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v)&&(Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const blankProfile=()=>({adoptions:{},feedEvents:{},careerUnlocks:{}});
const blank=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});
const copy=x=>JSON.parse(JSON.stringify(x));
const validWho=who=>{if(!Object.hasOwn(Progress.LEARNERS,who))throw new Error('학습자 정보를 확인해 주세요.');return who;};
const dateKey=t=>new Date(t+9*3600000).toISOString().slice(0,10);
const knownFish=id=>BY_FISH.get(id);
let memory=blank(),dirty=false,storageOK=true;
let configuredCatalog=[];

function clean(raw){
 if(!plain(raw)||raw.version!==1||!plain(raw.profiles))throw new Error('화폐 기록 형식을 확인해 주세요.');
 const result=blank();
 for(const who of ['tae','se']){
  const src=raw.profiles[who];
  if(!plain(src)||!plain(src.adoptions)||!plain(src.feedEvents)||
    (src.careerUnlocks!==undefined&&!plain(src.careerUnlocks))||
    Object.keys(src.adoptions).length>MAX_RECEIPTS||Object.keys(src.feedEvents).length>MAX_FEED_EVENTS||
    Object.keys(src.careerUnlocks||{}).length>100)throw new Error('화폐 기록 크기를 확인해 주세요.');
  for(const [id,adoption] of Object.entries(src.adoptions)){
   if(!knownFish(id)||id==='guppy'||!plain(adoption)||adoption.id!==id||!validTimestamp(adoption.at)||
      !plain(adoption.cost)||RESOURCE_SUBJECTS.some(s=>adoption.cost[s]!==BY_FISH.get(id).cost[s]))
    throw new Error('물고기 영입 영수증을 확인해 주세요.');
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
 }
 return merged;
}
export function loadResources(storage=globalThis.localStorage){
 if(dirty)return clean(memory);
 try{const value=storage?.getItem(RESOURCE_KEY);
  memory=value?clean(JSON.parse(value)):blank();storageOK=true;
 }catch{storageOK=false;}
 return clean(memory);
}
function persist(state,storage=globalThis.localStorage){
 let merged=clean(state);
 try{
  if(!storage)throw new Error('storage unavailable');
  const old=storage.getItem(RESOURCE_KEY);
  if(old)merged=merge(clean(JSON.parse(old)),merged);
  storage.setItem(RESOURCE_KEY,JSON.stringify(merged));
  memory=merged;dirty=false;storageOK=true;return true;
 }catch{storageOK=false;return false;}
}
export function exportResources(){return clean(loadResources());}
export function importResources(incoming,storage=globalThis.localStorage){
 const combined=merge(loadResources(storage),clean(incoming));
 if(!persist(combined,storage))throw new Error('물고기·화폐 기록을 기기에 저장할 수 없어요.');
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
export function wallet(catalog,who=Progress.learner()){
 validWho(who);configure(catalog);
 const state=loadResources(),p=state.profiles[who],source=earnedResources(catalog,who),spent=zero();
 for(const receipt of [...Object.values(p.adoptions),...Object.values(p.careerUnlocks)])
  for(const subject of RESOURCE_SUBJECTS)spent[subject]+=receipt.cost[subject];
 const available=Object.fromEntries(RESOURCE_SUBJECTS.map(subject=>[subject,Math.max(0,source.earned[subject]-spent[subject])]));
 const deficits=Object.fromEntries(RESOURCE_SUBJECTS.map(subject=>[subject,Math.max(0,spent[subject]-source.earned[subject])]));
 const fish=FISH_SPECIES.map(species=>{
  const owned=species.id==='guppy'||Boolean(p.adoptions[species.id]);
  const fed=Object.values(p.feedEvents).filter(e=>e.fishId===species.id).length;
  const canAfford=RESOURCE_SUBJECTS.every(s=>available[s]>=species.cost[s]);
  return {...species,cost:{...species.cost},owned,feedDays:fed,growth:Math.min(3,Math.floor(fed/3)),fedToday:Boolean(p.feedEvents[dateKey(now())+'-'+species.id]),canAdopt:!owned&&canAfford&&RESOURCE_SUBJECTS.every(s=>deficits[s]===0)};
 });
 const next=[...fish].filter(f=>!f.owned&&f.id!=='guppy').sort((a,b)=>{
  const aCost=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+Math.max(0,a.cost[s]-available[s]),0);
  const bCost=RESOURCE_SUBJECTS.reduce((sum,s)=>sum+Math.max(0,b.cost[s]-available[s]),0);
  return aCost-bCost;
 })[0];
 return {who,earned:source.earned,available,spent,deficits,balancedDays:source.balancedDays,
   uniqueCorrect:source.independentItems,fish,next,careerUnlocked:Object.keys(p.careerUnlocks),
   storageAvailable:storageOK};
}
export function adoptFish(id,catalog,who=Progress.learner(),storage=globalThis.localStorage){
 validWho(who);configure(catalog);
 const species=knownFish(id);
 if(!species||id==='guppy')throw new Error('영입할 물고기 종류를 확인해 주세요.');
 const state=loadResources(storage),p=state.profiles[who];
 if(p.adoptions[id])return {ok:true,duplicate:true,wallet:wallet(catalog,who)};
 const funds=wallet(catalog,who);
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
