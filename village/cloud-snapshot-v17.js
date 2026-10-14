import * as Progress from '../platform/progress.js';
import * as Rewards from '../platform/rewards.js';
import * as Settings from '../platform/settings.js';
import * as Village from './village-state.js';
import {createLifeStore} from './life-state-v16.js';
import {gardenSnapshot} from './garden-state.js';
import {loadFairyStyle,styleStorageKey} from './fairy-styles-v11.js';

const JOURNAL='sparkle-cloud-snapshot-journal-v17:';
const GARDEN_KEY='sparkle-care-garden-v1:'+new URL('../',import.meta.url).pathname;
const careSnapshot=storage=>({version:1,tae:gardenSnapshot('tae','home',storage).plants,se:gardenSnapshot('se','home',storage).plants,family:gardenSnapshot('tae','plaza',storage).plants});
const clone=x=>JSON.parse(JSON.stringify(x));
const learningSnapshot=()=>{
 const {learner,createdAt,...record}=Progress.exportRecords();
 if(record.unitGarden&&typeof record.unitGarden==='object'){
  record.unitGarden=clone(record.unitGarden);
  delete record.unitGarden.selected;
 }
 return record;
};
const freshSettings=storage=>{
 const raw=storage.getItem(Settings.SETTINGS_KEY);
 return Settings.validateSettings(raw===null?Settings.getSettings():JSON.parse(raw));
};
const keys=namespace=>[
 Progress.KEY,Progress.LEGACY_KEY,Rewards.REWARDS_KEY,Village.VILLAGE_KEY,
 Settings.SETTINGS_KEY,GARDEN_KEY,'sparkle-life-v16:'+namespace,styleStorageKey('tae'),styleStorageKey('se')
];
const same=(a,b)=>a===b;
function validateLocalLife(storage,namespace){
 const life=createLifeStore({storage,namespace});
 const first=life.snapshot('tae'),second=life.snapshot('se'),shared=life.snapshot('tae','plaza');
 const strip=({who,area,...state})=>state;
 return {version:16,tae:strip(first),se:strip(second),family:strip(shared)};
}
function workerJob(request,{workerFactory,timeoutMs=30000}={}){
 return new Promise((resolve,reject)=>{
  const worker=workerFactory?workerFactory():new Worker(new URL('./cloud-validator-worker-v17.js',import.meta.url),{type:'module'});
  let finished=false;
  const done=(err,value)=>{
   if(finished)return;finished=true;clearTimeout(timer);worker.terminate();
   err?reject(err):resolve(value);
  };
  const timer=setTimeout(()=>done(Error('동기화 검증 시간이 초과되었습니다.')),timeoutMs);
  worker.onerror=e=>done(Error(e.message||'동기화 검증 Worker 오류'));
  worker.onmessage=e=>{
   if(e.data?.id!==1)return;
   if(e.data.ok){done(null,e.data.result);return;}
   const error=Error(e.data.error||'동기화 검증 실패');
   const code=error.message.match(/^(LIFE_OWNER_CONFLICT|CARE_GARDEN_CONFLICT|FAMILY_SETTINGS_CONFLICT)(?=:|$)/)?.[1];
   if(code)error.code=code;
   done(error);
  };
  worker.postMessage({id:1,request});
 });
}
export function createCloudSnapshotAdapter({namespace='/',storage=globalThis.localStorage,canApply=()=>true,onApplied=()=>{},workerFactory}={}){
 if(typeof namespace!=='string'||namespace.length>512)throw Error('마을 주소를 확인해 주세요.');
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function'||typeof storage.removeItem!=='function')throw Error('저장소에 접근할 수 없습니다.');
 const journalKey=JOURNAL+namespace;
 let applying=false;
 const allowed=new Set(keys(namespace));
 function recover(){
  const raw=storage.getItem(journalKey);
  if(raw===null)return false;
  const journal=JSON.parse(raw);
  if(!journal||journal.version!==17||!Array.isArray(journal.entries)||journal.entries.length>allowed.size||
     journal.entries.some(e=>!allowed.has(e.key)||!['string','object'].includes(typeof e.before)||
     (e.before!==null&&typeof e.before!=='string')||typeof e.after!=='string'))throw Error('복구 기록이 손상되어 자동 변경을 중단했습니다.');
  // Recovery never overrides values changed by another tab after a partial transaction.
  for(const e of journal.entries){
   const actual=storage.getItem(e.key);
   if(actual!==e.before&&actual!==e.after)throw Error('복구 중 다른 화면의 변경을 확인했습니다.');
  }
  for(const e of [...journal.entries].reverse()){
   if(e.before===null)storage.removeItem(e.key);else storage.setItem(e.key,e.before);
  }
  storage.removeItem(journalKey);
  return true;
 }
 recover();
 function readSnapshot(){
  if(applying)throw Error('저장 중에는 스냅샷을 만들 수 없습니다.');
  if(storage.getItem(journalKey)!==null)throw Error('복구되지 않은 동기화 기록이 있습니다.');
  for(const key of keys(namespace))storage.getItem(key);
  return {schema:17,learning:learningSnapshot(),rewards:Rewards.exportRewards(),
   village:clone(Village.loadVillage(storage)),careGarden:careSnapshot(storage),life:validateLocalLife(storage,namespace),
   settings:freshSettings(storage),
   fairyStyles:{tae:loadFairyStyle('tae',storage),se:loadFairyStyle('se',storage)}};
 }
 async function mergeSnapshots(local,remote){
  let prefer=null;
  let base=null;
  if(remote===undefined&&local&&Object.hasOwn(local,'local')&&Object.hasOwn(local,'remote')){
   ({remote,base=null,prefer=null,local}=local);
  }
  if(!local||!remote)throw Error('비교할 동기화 기록이 없습니다.');
  return (await workerJob({local,remote,base,namespace,prefer},{workerFactory})).snapshot;
 }
 async function commitSnapshot(remote,{prefer=null,base=null,expectedLocal=null}={}){
  if(applying)throw Error('동기화 저장이 이미 진행 중입니다.');
  if(!canApply())throw Error('문제 풀이 또는 진행 중인 작업을 마친 후 동기화해 주세요.');
  applying=true;
  try{
   recover();
   const beforeSnapshot=readDuringApply();
   if(expectedLocal!==null&&JSON.stringify(beforeSnapshot)!==JSON.stringify(expectedLocal))throw Error('동기화가 준비되는 동안 이 기기의 기록이 변경되었습니다.');
   const beforeValues=new Map(keys(namespace).map(key=>[key,storage.getItem(key)]));
   const result=await workerJob({local:beforeSnapshot,remote,base,namespace,prefer},{workerFactory});
   if(!canApply())throw Error('학습 진행 상태가 변경되어 동기화를 취소했습니다.');
   if(expectedLocal!==null&&JSON.stringify(readDuringApply())!==JSON.stringify(expectedLocal))throw Error('동기화 검증 중 이 기기의 기록이 변경되었습니다.');
   const entries=[];
   for(const [key,after] of Object.entries(result.writes)){
    if(!allowed.has(key)||typeof after!=='string')throw Error('허용되지 않은 동기화 저장키입니다.');
    entries.push({key,before:beforeValues.get(key),after});
   }
   for(const e of entries)if(!same(storage.getItem(e.key),e.before))throw Error('다른 화면에서 기록을 변경했습니다.');
   storage.setItem(journalKey,JSON.stringify({version:17,entries}));
   try{
    for(const e of entries){
     if(storage.getItem(e.key)!==e.before)throw Error('다른 화면에서 기록을 변경했습니다.');
     storage.setItem(e.key,e.after);
    }
    storage.removeItem(journalKey);
   }catch(error){
    recover();
    throw error;
   }
   try{onApplied(clone(result.snapshot));}catch{/* Durable commit already succeeded. Caller may refresh. */}
   return clone(result.snapshot);
 }finally{applying=false;}
 }
 function applySnapshot(remote,options={}){
  const locks=globalThis.navigator?.locks;
  return locks?.request
   ?locks.request('sparkle-life-v16:'+namespace,{mode:'exclusive'},()=>
     locks.request('sparkle-connected-snapshot-v17:'+namespace,{mode:'exclusive'},()=>commitSnapshot(remote,options)))
   :commitSnapshot(remote,options);
 }
 function readDuringApply(){
  return {schema:17,learning:learningSnapshot(),rewards:Rewards.exportRewards(),
   village:clone(Village.loadVillage(storage)),careGarden:careSnapshot(storage),life:validateLocalLife(storage,namespace),
   settings:freshSettings(storage),
   fairyStyles:{tae:loadFairyStyle('tae',storage),se:loadFairyStyle('se',storage)}};
 }
 return Object.freeze({readSnapshot,applySnapshot,mergeSnapshots,recover});
}
