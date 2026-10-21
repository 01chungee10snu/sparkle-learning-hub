/** Immutable response evidence. A synchronous write-ahead journal protects the
 * answer before the UI advances; IndexedDB retains the complete event history.
 * Acknowledgements change delivery metadata, never the original evidence.
 * Without IndexedDB the journal is retained (no five-attempt or age pruning).
 */
export const JOURNAL_PREFIX='sparkle-response-event-v1:';
export const RESPONSE_DB='sparkle-response-history-v1';
const STORE='events', SUBJECTS=['math','korean','english','hanja'];
let dbPromise,draining=null,lastError='',lastPending=0;
const recent=new Map();
const counters=new Map(),COUNTER_PREFIX='sparkle-response-counter-v1:';
const clone=v=>JSON.parse(JSON.stringify(v));
const id=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9:_-]{0,239}$/i.test(v);
export function validateEvent(raw){
 if(!raw||raw.version!==1||!id(raw.eventId)||!['tae','se'].includes(raw.learnerKey)||
   !['answer','hint','retry'].includes(raw.eventType)||!id(raw.sessionId)||!id(raw.gameId)||!id(raw.questionId)||
   !SUBJECTS.includes(raw.subject)||!Number.isSafeInteger(raw.submittedAt)||raw.submittedAt<0||
   !Number.isSafeInteger(raw.attemptIndex)||raw.attemptIndex<0||raw.attemptIndex>100000||
   (raw.eventType==='hint'?raw.isCorrect!==null:typeof raw.isCorrect!=='boolean')||
   typeof raw.hintUsed!=='boolean'||typeof raw.assistanceUsed!=='boolean'||typeof raw.independentFirst!=='boolean'||
   typeof raw.itemVersion!=='string'||raw.itemVersion.length>100||typeof raw.skill!=='string'||raw.skill.length>180||
   ![raw.thetaBefore,raw.thetaAfter,raw.difficulty,raw.guessing].every(n=>n===null||Number.isFinite(n))||
   !(raw.presentedAt===null||Number.isSafeInteger(raw.presentedAt)&&raw.presentedAt>=0)||
   !(raw.responseMs===null||Number.isInteger(raw.responseMs)&&raw.responseMs>=0&&raw.responseMs<=600000)||
   typeof raw.modelVersion!=='string'||raw.modelVersion.length>80||raw.difficultySource!=='editorial_provisional')
   throw Error('문제 풀이 기록의 형식을 확인해 주세요.');
 const event={version:1,eventId:raw.eventId,learnerKey:raw.learnerKey,eventType:raw.eventType,
  sessionId:raw.sessionId,gameId:raw.gameId,questionId:raw.questionId,subject:raw.subject,skill:raw.skill,
  itemVersion:raw.itemVersion,submittedAt:raw.submittedAt,presentedAt:raw.presentedAt,responseMs:raw.responseMs,
  responseTimeKind:'elapsed_capped_ms',attemptIndex:raw.attemptIndex,attemptIndexScope:'device_item',isCorrect:raw.isCorrect,
  hintUsed:raw.hintUsed,assistanceUsed:raw.assistanceUsed,independentFirst:raw.independentFirst,
  difficulty:raw.difficulty,guessing:raw.guessing,difficultySource:raw.difficultySource,
  thetaBefore:raw.thetaBefore,thetaAfter:raw.thetaAfter,modelVersion:raw.modelVersion};
 if(raw.response!==undefined){
  const r=raw.response;
  if(!(Number.isFinite(r)||typeof r==='string'&&r.length<=32||Array.isArray(r)&&r.length<=10&&r.every(Number.isFinite)))
   throw Error('응답 기록의 형식을 확인해 주세요.');
  event.response=clone(r);
 }
 return event;
}
function journalEntries(storage=globalThis.localStorage){
 const out=[];
 if(!storage)return out;
 // The fallback also supports small deterministic storage adapters in tests.
 const keys=typeof storage.key==='function'?Array.from({length:storage.length},(_,i)=>storage.key(i)):
  typeof storage.keys==='function'?[...storage.keys()]:[];
 for(const key of keys)if(key?.startsWith(JOURNAL_PREFIX)){
  const row=JSON.parse(storage.getItem(key));
  if(row?.event)out.push({event:validateEvent(row.event),synced:row.synced===true});
 }
 return out;
}
function database(){
 if(!globalThis.indexedDB)return Promise.resolve(null);
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const r=indexedDB.open(RESPONSE_DB,1);
  r.onupgradeneeded=()=>{const s=r.result.createObjectStore(STORE,{keyPath:'event.eventId'});s.createIndex('submittedAt','event.submittedAt');};
  r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};
  r.onerror=()=>reject(r.error||Error('응답 기록 저장소를 열 수 없어요.'));
  r.onblocked=()=>reject(Error('다른 창을 닫고 응답 기록 저장소를 다시 열어 주세요.'));
 }).catch(e=>{dbPromise=null;throw e;});
 return dbPromise;
}
async function archiveRow(row){
 const db=await database();if(!db)return false;
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),read=store.get(row.event.eventId);
  read.onsuccess=()=>{
   const old=read.result;
   if(old&&JSON.stringify(old.event)!==JSON.stringify(row.event)){tx.abort();return;}
   if(!old)store.add(row);else if(row.synced&&!old.synced)store.put({...old,synced:true});
  };
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('응답 기록을 보관하지 못했어요.'));
  tx.onabort=()=>reject(tx.error||Error('서로 다른 응답 기록이 같은 식별자를 사용해요.'));
 });
}
export function appendEvent(raw,{storage=globalThis.localStorage}={}){
 const event=validateEvent(raw),key=JOURNAL_PREFIX+event.eventId;
 const cached=recent.get(event.eventId);
 if(cached){if(JSON.stringify(cached)!==JSON.stringify(event))throw Error('응답 식별자가 중복되었어요.');return {event:clone(event),duplicate:true};}
 try{
  if(!storage)throw Error('no storage');
  const old=storage.getItem(key);
  if(old){if(JSON.stringify(JSON.parse(old).event)!==JSON.stringify(event))throw Error('conflicting event');return {event,duplicate:true};}
  storage.setItem(key,JSON.stringify({event,synced:false}));
 }catch{lastError='응답 기록을 저장할 공간이 필요해요. 보호자와 저장 공간을 확인해 주세요.';throw Error(lastError);}
 recent.set(event.eventId,event);if(recent.size>500)recent.delete(recent.keys().next().value);
 const counterKey=COUNTER_PREFIX+event.learnerKey+':'+event.gameId+':'+event.questionId;
 const index=Math.max(counters.get(counterKey)||0,event.attemptIndex);counters.set(counterKey,index);
 try{storage.setItem(counterKey,String(Math.max(index,Number(storage.getItem(counterKey))||0)));}catch{/* Evidence itself is already durable. */}
 lastPending++;lastError='';
 if(globalThis.indexedDB)void drainJournal({storage}).catch(()=>{});
 globalThis.dispatchEvent?.(new Event('sparkle-response-recorded'));
 return {event:clone(event),duplicate:false};
}
/** Per-device/per-item submission ordinal. Server analyses must independently
 * order/deduplicate by learner, content version and event ID across devices. */
export function attemptIndex(learnerKey,gameId,questionId,{hint=false,minimum=0,storage=globalThis.localStorage}={}){
 const key=COUNTER_PREFIX+learnerKey+':'+gameId+':'+questionId;
 let stored=0;try{stored=Number(storage?.getItem(key))||0;}catch{}
 const value=Math.max(minimum,stored,counters.get(key)||0);
 return Math.min(100000,value+(hint?0:1));
}
export function drainJournal({storage=globalThis.localStorage}={}){
 if(draining)return draining;
 draining=(async()=>{
  for(const row of journalEntries(storage))if(await archiveRow(row)){
   const key=JOURNAL_PREFIX+row.event.eventId;
   // A concurrent acknowledgement may have changed delivery metadata; its
   // original evidence remains identical and the server deduplicates resends.
   const current=storage.getItem(key);
   if(current&&JSON.stringify(JSON.parse(current).event)===JSON.stringify(row.event))storage.removeItem(key);
  }
 })().catch(e=>{lastError=String(e.message||e);throw e;}).finally(()=>{draining=null;});
 return draining;
}
async function archivedRows(){
 const db=await database();if(!db)return [];
 return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function exportEvents({storage=globalThis.localStorage}={}){
 const merged=new Map();
 let rows=[];try{rows=await archivedRows();}catch(e){lastError=String(e.message||e);}
 for(const row of [...rows,...journalEntries(storage)]){
  const event=validateEvent(row.event),old=merged.get(event.eventId);
  if(old&&JSON.stringify(old.event)!==JSON.stringify(event))throw Error('응답 기록이 충돌했어요.');
  merged.set(event.eventId,{event,synced:Boolean(old?.synced||row.synced)});
 }
 return [...merged.values()].sort((a,b)=>a.event.submittedAt-b.event.submittedAt||a.event.eventId.localeCompare(b.event.eventId));
}
export async function pendingEvents({limit=100,storage=globalThis.localStorage}={}){
 const pending=(await exportEvents({storage})).filter(row=>!row.synced);lastPending=pending.length;
 return pending.slice(0,Math.max(1,Math.min(100,limit))).map(row=>row.event);
}
export async function acknowledge(eventIds,{storage=globalThis.localStorage}={}){
 const ids=new Set(eventIds);
 for(const row of await exportEvents({storage}))if(ids.has(row.event.eventId)){
  const updated={...row,synced:true},stored=await archiveRow(updated);
  const key=JOURNAL_PREFIX+row.event.eventId;
  if(stored)storage?.removeItem(key);else storage.setItem(key,JSON.stringify(updated));
 }
 lastPending=Math.max(0,lastPending-ids.size);
}
export function status(){return {pending:lastPending,error:lastError,archive:globalThis.indexedDB?'indexeddb':'local-journal'};}
