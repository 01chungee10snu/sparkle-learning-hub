import * as Progress from './progress.js';
import * as Resources from './resource-economy.js';
import * as IRT from './irt.js';

/** A local, eventually consistent family game ledger, not a payment server.
 * Time is accumulated per unique visit and merged by maximum; separate visits
 * add together. Completed learning cycles and minute receipts never roll back.
 */
export const POND_SESSION_KEY='sparkle-pond-session-v1';
export const POND_LEASE_KEY='sparkle-pond-lease-v1';
export const POND_RULES=Object.freeze({
 se:Object.freeze({maxMs:180000,requiredItems:3,minSubjects:2,subjects:['math','korean','english']}),
 tae:Object.freeze({maxMs:300000,requiredItems:5,minSubjects:3,subjects:['math','korean','english','hanja']})
});
export const CHARGE_INTERVAL_MS=60000;
export const MAX_TICK_GAP_MS=5000;
const LEASE_MS=5000,MAX_ENTRIES=100000,SUBJECTS=Resources.RESOURCE_SUBJECTS;
const whoList=['tae','se'];
const GRADES={K:0,G1:1,G2:2,G3:3,G4:4,G5:5,G6:6,M:7,M1:7,M2:8,M3:9};
const excluded=id=>/^(?:bebsu-(?:g[1-6]|m[1-3])-original|magic-(?:g[1-6]|m[1-3])-challenge)$/.test(id);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const idOK=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]{0,199}$/.test(value);
const learningIdOK=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9._:-]{0,199}:[a-z0-9][a-z0-9._:-]{0,199}$/.test(value);
const timeOK=value=>Number.isSafeInteger(value)&&value>=0&&value<=Date.now()+60000;
const copy=value=>JSON.parse(JSON.stringify(value));
const compare=(a,b)=>a.at-b.at||JSON.stringify(a).localeCompare(JSON.stringify(b));
const mono=()=>globalThis.performance?.now?.()??Date.now();
const uuid=()=>globalThis.crypto?.randomUUID?.()??'v-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const validWho=who=>{if(!whoList.includes(who))throw Error('아이를 선택해 주세요.');return who;};
const blankProfile=()=>({cycles:{},attempts:{}});
export const blankPond=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});
let configuredCatalog=[];

export function configure(catalog){
 if(!Array.isArray(catalog))throw Error('학습 목록을 확인해 주세요.');
 configuredCatalog=catalog.filter(e=>e?.kind==='quiz'&&e.status==='published'&&SUBJECTS.includes(e.subject));
 return configuredCatalog;
}
function catalogFor(options){return Array.isArray(options?.catalog)?configure(options.catalog):configuredCatalog;}
function learningKey(gameId,itemId,subject){
 // Several Hanja activities can ask about the same character. Renaming that
 // exposure does not create fresh participation credit.
 const character=subject==='hanja'?/^(hanja-h\w+)-([a-f0-9]+)-/.exec(itemId)?.[2]:null;
 return character?'hanja:'+character:gameId+':'+itemId;
}
export function validatePond(raw){
 if(!plain(raw)||raw.version!==1||!plain(raw.profiles)||Object.keys(raw.profiles).sort().join(',')!=='se,tae')throw Error('연못 시간 기록을 확인해 주세요.');
 const out=blankPond();
 for(const who of whoList){
  const p=raw.profiles[who],dest=out.profiles[who],rule=POND_RULES[who];
  if(!plain(p)||!plain(p.cycles)||!plain(p.attempts)||Object.keys(p.cycles).length>MAX_ENTRIES||Object.keys(p.attempts).length>MAX_ENTRIES)throw Error('연못 기록의 크기를 확인해 주세요.');
  for(const [key,a] of Object.entries(p.attempts)){
   if(!plain(a)||!idOK(a.gameId)||!idOK(a.itemId)||!SUBJECTS.includes(a.subject)||key!==learningKey(a.gameId,a.itemId,a.subject)||!timeOK(a.at))throw Error('연못 배움 참여 기록을 확인해 주세요.');
   if(a.legacySeen!==undefined&&a.legacySeen!==true)throw Error('이전 문항 기록을 확인해 주세요.');
   dest.attempts[key]={gameId:a.gameId,itemId:a.itemId,subject:a.subject,at:a.at,...(a.legacySeen?{legacySeen:true}:{})};
  }
  for(const [number,c] of Object.entries(p.cycles)){
   if(!/^(0|[1-9][0-9]{0,5})$/.test(number)||!plain(c)||c.id!=='pond-'+number||!timeOK(c.at)||!plain(c.visits)||Object.keys(c.visits).length>MAX_ENTRIES)throw Error('연못 방문 주기를 확인해 주세요.');
   const cycle={id:c.id,at:c.at,visits:{},gate:null,completedAt:null,consumedIds:[]};
   for(const [id,v] of Object.entries(c.visits)){
    if(!idOK(id)||!plain(v)||!Number.isSafeInteger(v.ms)||v.ms<0||v.ms>rule.maxMs||!timeOK(v.at))throw Error('연못에서 함께한 시간을 확인해 주세요.');
    cycle.visits[id]={ms:v.ms,at:v.at};
   }
   if(c.gate!==null&&c.gate!==undefined){
    const g=c.gate;
    if(!plain(g)||!timeOK(g.at)||!['time-limit','resources','storage-unavailable'].includes(g.reason)||
      !Number.isInteger(g.total)||g.total<1||g.total>rule.requiredItems||!Number.isInteger(g.minSubjects)||g.minSubjects<1||g.minSubjects>rule.minSubjects||
      !Array.isArray(g.subjects)||!g.subjects.length||new Set(g.subjects).size!==g.subjects.length||g.subjects.some(s=>!rule.subjects.includes(s))||g.minSubjects>g.subjects.length)throw Error('연못 다음 배움 계획을 확인해 주세요.');
    cycle.gate={at:g.at,reason:g.reason,total:g.total,minSubjects:g.minSubjects,subjects:[...g.subjects]};
   }
   if(c.completedAt!==null&&c.completedAt!==undefined){
    if(!cycle.gate||!timeOK(c.completedAt)||c.completedAt<cycle.gate.at)throw Error('연못 배움 완료 시간을 확인해 주세요.');
    cycle.completedAt=c.completedAt;
   }
   if(c.consumedIds!==undefined){
    if(!Array.isArray(c.consumedIds)||c.consumedIds.length>MAX_ENTRIES||new Set(c.consumedIds).size!==c.consumedIds.length||c.consumedIds.some(id=>!learningIdOK(id))||cycle.completedAt===null&&c.consumedIds.length)throw Error('연못 배움 사용 기록을 확인해 주세요.');
    cycle.consumedIds=[...c.consumedIds].sort();
   }else if(cycle.completedAt!==null){
    // Older snapshots have no receipts. Conservatively consume their own
    // responses in the completed window once, before any snapshot merge.
    // Re-deriving after merges would make the result depend on merge order.
    cycle.consumedIds=Object.entries(dest.attempts).filter(([,a])=>!a.legacySeen&&a.at>=cycle.gate.at&&a.at<=cycle.completedAt&&cycle.gate.subjects.includes(a.subject)).map(([id])=>id).sort();
   }
   dest.cycles[number]=cycle;
  }
 }
 return out;
}
export function mergePond(a,b){
 a=validatePond(a??blankPond());b=validatePond(b??blankPond());
 const out=copy(a);
 for(const who of whoList){
  const p=out.profiles[who],incoming=b.profiles[who];
  for(const [key,event] of Object.entries(incoming.attempts))if(!p.attempts[key]||compare(event,p.attempts[key])<0)p.attempts[key]=event;
  for(const [number,c] of Object.entries(incoming.cycles)){
   const old=p.cycles[number];
   if(!old){p.cycles[number]=c;continue;}
   old.at=Math.min(old.at,c.at);
   for(const [id,visit] of Object.entries(c.visits)){
    const previous=old.visits[id];
    old.visits[id]=previous?{ms:Math.max(previous.ms,visit.ms),at:Math.min(previous.at,visit.at)}:visit;
   }
   if(c.gate&&(!old.gate||compare(c.gate,old.gate)<0))old.gate=c.gate;
   if(c.completedAt!==null)old.completedAt=old.completedAt===null?c.completedAt:Math.min(old.completedAt,c.completedAt);
   old.consumedIds=[...new Set([...old.consumedIds,...c.consumedIds])].sort();
  }
 }
 return validatePond(out);
}
export function loadPond(storage=globalThis.localStorage){
 if(!storage)throw Error('연못 기록을 저장할 수 없어요.');
 const value=storage.getItem(POND_SESSION_KEY);
 return value===null?blankPond():validatePond(JSON.parse(value));
}
function savePond(state,storage){
 const result=mergePond(loadPond(storage),state);
 storage.setItem(POND_SESSION_KEY,JSON.stringify(result));
 return result;
}
export function exportPond(storage=globalThis.localStorage){return loadPond(storage);}
export function importPond(raw,{storage=globalThis.localStorage}={}){return savePond(validatePond(raw),storage);}
function latest(p){
 const numbers=Object.keys(p.cycles).map(Number);
 return numbers.length?Math.max(...numbers):0;
}
function ensureCycle(p,at){
 const number=latest(p);
 return p.cycles[number]??(p.cycles[number]={id:'pond-'+number,at,visits:{},gate:null,completedAt:null,consumedIds:[]});
}
function activeTime(c,who){return Math.min(POND_RULES[who].maxMs,Object.values(c.visits).reduce((n,v)=>n+v.ms,0));}
function addRecord(p,event,catalog){
 if(!event||typeof event.correct!=='boolean'||!idOK(event.gameId)||!idOK(event.itemId)||!SUBJECTS.includes(event.subject)||!timeOK(event.at))return false;
 const game=catalog.find(g=>g.id===event.gameId&&g.subject===event.subject);
 if(catalog.length&&(!game||!game.questionIds?.includes(event.itemId)))return false;
 const key=learningKey(event.gameId,event.itemId,event.subject),entry={gameId:event.gameId,itemId:event.itemId,subject:event.subject,at:event.at,...(event.legacySeen?{legacySeen:true}:{})};
 if(p.attempts[key]&&compare(p.attempts[key],entry)<=0)return false;
 p.attempts[key]=entry;return true;
}
function ingest(p,who,records,catalog){
 const games=records?.platform?.profiles?.[who]?.games;
 if(!plain(games))return;
 const subjects=new Map(catalog.map(g=>[g.id,g.subject]));
 for(const [gameId,game] of Object.entries(games))for(const [itemId,r] of Object.entries(game.records||{})){
  // If an old bounded log has lost its earliest exposure, do not pretend a
  // recent retry was a fresh item. Modern records preserve firstAttempt.
  const first=r.firstAttempt??(r.seen===(r.attempts||[]).length?[...(r.attempts||[])].sort((a,b)=>a.at-b.at)[0]:r.seen>0?{correct:false,at:0,legacySeen:true}:null);
  if(first)addRecord(p,{gameId,itemId,subject:subjects.get(gameId),...first},catalog);
 }
}
function availableSubjects(who,p,catalog){
 const rule=POND_RULES[who];
 if(!catalog.length)return {subjects:[...rule.subjects],fresh:Infinity,counts:Object.fromEntries(rule.subjects.map(s=>[s,0]))};
 const freshBySubject=Object.fromEntries(rule.subjects.map(s=>[s,new Set()]));
 const stages=Object.fromEntries(rule.subjects.map(s=>[s,Progress.stageSelection(s,who)]));
 const seenFamilies=new Set(Object.values(p.attempts).map(a=>IRT.itemAt(a.gameId,a.itemId)?.family).filter(Boolean));
 for(const game of catalog){
  if(!rule.subjects.includes(game.subject))continue;
  // Keep eligibility aligned with pond-learning-guide.js; age/stage is a
  // content boundary, and IRT ranks questions within that permitted pool.
  if(excluded(game.id)||game.subject==='hanja'&&game.id!=='hanja-h8')continue;
  if(game.subject!=='hanja'&&game.gradeBand&&(GRADES[game.gradeBand]??99)>(who==='se'?0:1))continue;
  if(game.stage&&game.stage>stages[game.subject])continue;
  for(const itemId of game.questionIds||[]){
   const evidence=IRT.itemAt(game.id,itemId);
   if(IRT.bankSize()&&(!evidence||evidence.stage>stages[game.subject]||evidence.family&&seenFamilies.has(evidence.family)))continue;
   const key=learningKey(game.id,itemId,game.subject);
   if(!p.attempts[key])freshBySubject[game.subject].add(evidence?.family??key);
  }
 }
 const subjects=rule.subjects.filter(s=>freshBySubject[s].size>0);
 return {subjects,fresh:Object.values(freshBySubject).reduce((n,set)=>n+set.size,0),counts:Object.fromEntries(Object.entries(freshBySubject).map(([s,items])=>[s,items.size]))};
}
function openGate(c,p,who,reason,at,catalog){
 if(c.gate)return;
 const rule=POND_RULES[who],available=availableSubjects(who,p,catalog);
 // Empty item banks remain an explicit content issue, never an automatic
 // completion that can replenish resources repeatedly without learning.
 const subjects=available.subjects.length?available.subjects:[...rule.subjects];
 c.gate={at,reason,total:Math.max(1,Math.min(rule.requiredItems,available.fresh)),minSubjects:Math.min(rule.minSubjects,subjects.length),subjects};
 c.gate.minSubjects=Math.min(c.gate.minSubjects,c.gate.total);
}
function learningRows(c,p){
 if(!c.gate)return [];
 const number=Number(c.id.slice(5)),consumed=new Set(Object.entries(p.cycles).filter(([n,cycle])=>Number(n)<number&&cycle.completedAt!==null).flatMap(([,cycle])=>cycle.consumedIds??[]));
 return Object.entries(p.attempts).filter(([id,a])=>!a.legacySeen&&!consumed.has(id)&&a.at>=c.gate.at&&c.gate.subjects.includes(a.subject)).sort((a,b)=>a[1].at-b[1].at||a[0].localeCompare(b[0]));
}
function learningStatus(c,p,who){
 const rule=POND_RULES[who],gate=c.gate,total=gate?.total??rule.requiredItems,minSubjects=gate?.minSubjects??rule.minSubjects;
 const eligible=gate?.subjects??rule.subjects,rows=learningRows(c,p);
 const counts=Object.fromEntries(SUBJECTS.map(s=>[s,0]));
 for(const [,row] of rows)counts[row.subject]++;
 const subjects=eligible.filter(s=>counts[s]>0);
 const recent=Object.values(p.attempts).sort((a,b)=>b.at-a.at).slice(0,20);
 const load=Object.fromEntries(eligible.map(s=>[s,recent.filter(a=>a.subject===s).length]));
 const neededSubjects=eligible.filter(s=>counts[s]===0).sort((a,b)=>load[a]-load[b]||rule.subjects.indexOf(a)-rule.subjects.indexOf(b)).slice(0,Math.max(0,minSubjects-subjects.length));
 return {done:rows.length,total,requiredItems:total,minSubjects,subjects,counts,neededSubjects,
  remainingItems:Math.max(0,total-rows.length),complete:Boolean(gate&&rows.length>=total&&subjects.length>=minSubjects)};
}
function funds(catalog,who,storage){
 const wallet=Resources.wallet(catalog,who,storage);
 return {wallet,total:SUBJECTS.reduce((n,s)=>n+wallet.available[s],0)};
}
/** Reconcile accrued minutes and completed learning before returning the UI
 * state. State reads may finish a previously interrupted durable transaction.
 */
export function status(who,{storage=globalThis.localStorage,records,catalog,nowWall=Date.now()}={}){
 validWho(who);const list=catalogFor({catalog}),state=loadPond(storage),p=state.profiles[who];
 if(records)ingest(p,who,records,list);
 let cycle=ensureCycle(p,nowWall),activeMs=activeTime(cycle,who),rule=POND_RULES[who];
 for(let minute=1;minute<=Math.floor(activeMs/CHARGE_INTERVAL_MS);minute++){
  const charge=Resources.spendPondMinute(cycle.id,minute,list,who,storage);
  if(!charge.ok){openGate(cycle,p,who,charge.reason==='storage-unavailable'?'storage-unavailable':'resources',nowWall,list);break;}
 }
 let balance=funds(list,who,storage);
 if(activeMs>=rule.maxMs)openGate(cycle,p,who,'time-limit',nowWall,list);
 else if(balance.total===0)openGate(cycle,p,who,'resources',nowWall,list);
 let learning=learningStatus(cycle,p,who),justCompleted=false,completedLearning=null,completedCycleId=null;
 if(learning.complete){
  const award=Resources.replenishPondResources(cycle.id,list,who,storage);
  if(award.ok){
   completedLearning=copy(learning);completedCycleId=cycle.id;
   cycle.consumedIds=[...new Set([...(cycle.consumedIds??[]),...learningRows(cycle,p).map(([id])=>id)])].sort();
   cycle.completedAt??=Math.max(cycle.gate.at,nowWall);
   const next=Number(cycle.id.slice(5))+1;
   cycle=p.cycles[next]??(p.cycles[next]={id:'pond-'+next,at:nowWall,visits:{},gate:null,completedAt:null,consumedIds:[]});
   activeMs=activeTime(cycle,who);learning=learningStatus(cycle,p,who);balance=funds(list,who,storage);justCompleted=true;
  }
 }
 const availability=availableSubjects(who,p,list);
 savePond(state,storage);
 const allowed=!cycle.gate&&activeMs<rule.maxMs&&balance.total>0;
 return {who,allowed,reason:cycle.gate?.reason??(allowed?null:'resources'),cycleId:cycle.id,
  activeMs,remainingMs:Math.max(0,rule.maxMs-activeMs),maxMs:rule.maxMs,
  nextChargeMs:CHARGE_INTERVAL_MS-(activeMs%CHARGE_INTERVAL_MS),requiredItems:rule.requiredItems,minSubjects:rule.minSubjects,
  resourceTotal:balance.total,available:{...balance.wallet.available},learning,justCompleted,completedLearning,completedCycleId,
  eligibleSubjects:availability.subjects,availableItemCounts:availability.counts,learningContentAvailable:availability.fresh>0,
  costPerMinute:1,idlePauseMs:60000};
}
export function refreshLearning(who,{records=Progress.exportRecords(),...options}={}){return status(who,{...options,records});}
export function recordLearning(who,event,{storage=globalThis.localStorage,catalog,nowWall=Date.now()}={}){
 validWho(who);const list=catalogFor({catalog}),state=loadPond(storage);
 // Recover original exposure from the authoritative learning log before a
 // caller reports this submission, so an old retry cannot masquerade as new.
 if(event?.gameId&&event?.itemId){
  const r=Progress.gameProgress(event.gameId,who).records?.[event.itemId];
  if(r)ingest(state.profiles[who],who,{platform:{profiles:{[who]:{games:{[event.gameId]:{records:{[event.itemId]:r}}}}}}},list);
 }
 addRecord(state.profiles[who],event,list);savePond(state,storage);
 return status(who,{storage,catalog:list,nowWall});
}
function leaseKey(who){return POND_LEASE_KEY+':'+who;}
function claimLease(visit,at){
 const key=leaseKey(visit.who),raw=visit.storage.getItem(key);
 let old=null;try{old=raw?JSON.parse(raw):null;}catch{return false;}
 if(old&&old.owner!==visit.id&&old.expiresAt>at)return false;
 const next={owner:visit.id,expiresAt:at+LEASE_MS};
 visit.storage.setItem(key,JSON.stringify(next));
 return JSON.parse(visit.storage.getItem(key)||'null')?.owner===visit.id;
}
function releaseLease(visit){
 try{const key=leaseKey(visit.who),old=JSON.parse(visit.storage.getItem(key)||'null');
  if(old?.owner===visit.id)visit.storage.removeItem?visit.storage.removeItem(key):visit.storage.setItem(key,'null');
 }catch{/* Release is best-effort; an abandoned lease expires. */}
 visit._releaseLock?.();visit._releaseLock=null;
}
async function acquire(visit){
 const locks=visit.locks;
 if(locks?.request){
  const acquired=await new Promise(resolve=>{
   let release;const held=new Promise(done=>{release=done;});
   visit._lockTask=locks.request('sparkle-pond:'+visit.who,{ifAvailable:true},async lock=>{
    if(!lock){resolve(false);return;}
    visit._releaseLock=release;resolve(true);await held;
   }).catch(()=>resolve(false));
  });
  if(!acquired)return false;
 }
 if(!claimLease(visit,visit.wall())){releaseLease(visit);return false;}
 return true;
}
function updateVisit(visit,state){visit.status=state;visit.allowed=state.allowed;return state;}
function unavailable(visit,reason){return updateVisit(visit,{...visit.status,allowed:false,reason});}
function accrue(visit,delta,nowWall){
 if(!(delta>0&&delta<=MAX_TICK_GAP_MS))return;
 const state=loadPond(visit.storage),p=state.profiles[visit.who],cycle=p.cycles[Number(visit.cycleId?.slice(5))];
 if(!cycle||cycle.gate||'pond-'+latest(p)!==visit.cycleId)return;
 const previous=cycle.visits[visit.id]??{ms:0,at:nowWall};
 cycle.visits[visit.id]={ms:Math.min(POND_RULES[visit.who].maxMs,previous.ms+Math.floor(delta)),at:previous.at};
 savePond(state,visit.storage);
 updateVisit(visit,status(visit.who,{storage:visit.storage,catalog:visit.catalog,nowWall}));
}
/** Returns a runtime object with .allowed and .status. Keep that object in the
 * bridge; only serialize its status to the frame. */
export async function openVisit(who,{storage=globalThis.localStorage,catalog,records=Progress.exportRecords(),clock=mono,wall=Date.now,locks=globalThis.navigator?.locks,ownerId=uuid()}={}){
 validWho(who);const list=catalogFor({catalog});
 const visit={who,id:ownerId,storage,catalog:list,clock,wall,locks,lastMono:clock(),paused:true,closed:false,allowed:false,status:null};
 updateVisit(visit,status(who,{storage,catalog:list,records,nowWall:wall()}));
 if(!visit.allowed)return visit;
 if(!await acquire(visit)){unavailable(visit,'another-tab');return visit;}
 visit.cycleId=visit.status.cycleId;visit.paused=false;visit.lastMono=clock();
 return visit;
}
/** Call at about one-second intervals. Large gaps and negative clocks accrue
 * no time: background throttling and sleep must never cause catch-up charges. */
export function tickVisit(visit,{active=true,nowMono=visit.clock(),nowWall=visit.wall()}={}){
 if(!visit||visit.closed)return visit?.status;
 if(!active){pauseVisit(visit,{nowMono,nowWall});return visit.status;}
 const delta=nowMono-visit.lastMono;visit.lastMono=nowMono;
 if(visit.paused)return visit.status;
 if(!claimLease(visit,nowWall)){pauseVisit(visit);return unavailable(visit,'another-tab');}
 let current=status(visit.who,{storage:visit.storage,catalog:visit.catalog,nowWall});
 if(!current.allowed||current.cycleId!==visit.cycleId){pauseVisit(visit);return updateVisit(visit,current);}
 updateVisit(visit,current);accrue(visit,delta,nowWall);
 if(!visit.status.allowed)pauseVisit(visit);
 return visit.status;
}
export function pauseVisit(visit,{flush=true,nowMono=visit?.clock(),nowWall=visit?.wall()}={}){
 if(!visit)return null;
 // Preserve the fraction since the latest one-second tick. Rapid open/close or
 // visibility toggles must not provide an unlimited free visit. Sleep gaps are
 // still excluded, and a runtime that lost ownership must never add time.
 if(flush&&!visit.paused&&!visit.closed){
  const owner=JSON.parse(visit.storage.getItem(leaseKey(visit.who))||'null');
  if(owner?.owner===visit.id)accrue(visit,nowMono-visit.lastMono,nowWall);
 }
 visit.paused=true;visit.lastMono=visit.clock();releaseLease(visit);
 return visit.status;
}
export async function resumeVisit(visit){
 if(!visit||visit.closed)return visit;
 if(!visit.paused)return visit;
 // A released Web Lock finishes on a microtask. Wait for our own release before
 // trying to reacquire it during a fast pause/resume transition.
 if(visit._lockTask)await visit._lockTask;
 updateVisit(visit,status(visit.who,{storage:visit.storage,catalog:visit.catalog,nowWall:visit.wall()}));
 if(!visit.allowed)return visit;
 if(!await acquire(visit)){unavailable(visit,'another-tab');return visit;}
 visit.cycleId=visit.status.cycleId;visit.lastMono=visit.clock();visit.paused=false;
 return visit;
}
export function closeVisit(visit){
 if(!visit)return null;
 pauseVisit(visit);visit.closed=true;return visit.status;
}
