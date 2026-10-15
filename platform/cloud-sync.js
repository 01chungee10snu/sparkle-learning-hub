import {CLOUD_CONFIG} from './cloud-config.js';
import * as Progress from './progress.js?v=ecology-v19-20261015';
import * as Rewards from './rewards.js?v=unified-20261013';
import * as Settings from './settings.js?v=unified-20261013';
import * as Progression from './progression.js?v=parent-v14-20261015';
import * as VillageState from '../village/village-state.js?v=unified-20261013';
import * as Relationships from '../village/relationship-state.js?v=ecology-v19-20261015';
import * as Ecology from '../village/ecology-state.js?v=ecology-v19-20261015';

export const PAIRING_KEY='sparkle-family-pairing-code-v1';
export const CLOUD_STATE_KEY='sparkle-cloud-state-v2';
export const DEVICE_KEY='sparkle-cloud-device-key-v1';
const STATE_VERSION=2;
let syncFlight=null,syncTimer=null;
const apiBase=()=>CLOUD_CONFIG.url.replace(/\/$/,'');
const now=()=>Date.now();

const safeJson=text=>{try{return text?JSON.parse(text):null;}catch{return null;}};
const read=key=>{try{return globalThis.localStorage?.getItem(key)||'';}catch{return '';}};
const write=(key,value)=>{try{globalThis.localStorage?.setItem(key,value);return true;}catch{return false;}};
const remove=key=>{try{globalThis.localStorage?.removeItem(key);}catch{}};

function cleanPairingCode(value){
 const code=String(value||'').trim();
 if(code.length<20||code.length>128||!/^[A-Za-z0-9_-]+$/.test(code))
   throw new Error('가족 동기화 코드를 확인해 주세요.');
 return code;
}
export function pairingCode(){
 const value=read(PAIRING_KEY);
 try{return value?cleanPairingCode(value):'';}catch{return '';}
}
export function isPaired(){return Boolean(pairingCode());}

async function request(path,{method='POST',body=null}={}){
 if(!CLOUD_CONFIG.enabled)throw new Error('클라우드 연결이 꺼져 있어요.');
 const init={method,headers:{apikey:CLOUD_CONFIG.publishableKey}};
 if(body!==null){
  init.headers['Content-Type']='application/json';
  init.body=JSON.stringify(body);
 }
 const response=await fetch(apiBase()+path,init);
 const text=await response.text(),data=safeJson(text);
 if(!response.ok){
  const raw=data?.message||data?.msg||data?.error_description||data?.error||'가족 클라우드 요청을 처리하지 못했어요.';
  const message=String(raw).includes('invalid family pairing code')?'가족 동기화 코드가 맞지 않아요.':String(raw).slice(0,240);
  const error=new Error(message);error.status=response.status;throw error;
 }
 return data??(text||null);
}

function cleanCloudState(raw){
 if(!raw||raw.version!==STATE_VERSION||typeof raw.familyId!=='string'||typeof raw.deviceId!=='string'||
    typeof raw.deviceKey!=='string'||!Number.isSafeInteger(raw.revision)||raw.revision<0)return null;
 return {version:STATE_VERSION,familyId:raw.familyId,deviceId:raw.deviceId,deviceKey:raw.deviceKey,
  revision:raw.revision,lastHash:typeof raw.lastHash==='string'?raw.lastHash:'',
  lastSyncedAt:Number.isFinite(raw.lastSyncedAt)?raw.lastSyncedAt:0,
  learners:raw.learners&&typeof raw.learners==='object'?raw.learners:{}};
}
export function cloudState(){return cleanCloudState(safeJson(read(CLOUD_STATE_KEY)));}
function saveCloudState(state){
 if(!write(CLOUD_STATE_KEY,JSON.stringify(state)))throw new Error('가족 클라우드 연결 상태를 저장할 수 없어요.');
 return state;
}
function deviceKey(){
 let value=read(DEVICE_KEY);
 if(/^[A-Za-z0-9_-]{8,160}$/.test(value))return value;
 value='web-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36))
   .replace(/[^A-Za-z0-9_-]/g,'');
 if(!write(DEVICE_KEY,value))throw new Error('기기 식별자를 저장할 수 없어요.');
 return value;
}

async function rpc(name,body){return request('/rest/v1/rpc/'+name,{body});}

async function ensurePaired(code=pairingCode()){
 if(!code)throw new Error('이 기기를 가족 마법마을에 먼저 연결해 주세요.');
 let state=cloudState();
 if(state)return state;
 const key=deviceKey();
 const data=await rpc('magic_family_pair',{p_code:code,p_device_key:key,p_label:'Magic Village Web'});
 if(!data?.familyId||!data.deviceId)throw new Error('가족 기기 연결을 완료하지 못했어요.');
 state={version:STATE_VERSION,familyId:data.familyId,deviceId:data.deviceId,deviceKey:key,
  revision:0,lastHash:'',lastSyncedAt:0,learners:data.learners||{}};
 return saveCloudState(state);
}

export async function pairFamily(code){
 const value=cleanPairingCode(code),key=deviceKey();
 const data=await rpc('magic_family_pair',{p_code:value,p_device_key:key,p_label:'Magic Village Web'});
 if(!data?.familyId||!data.deviceId)throw new Error('가족 기기 연결을 완료하지 못했어요.');
 if(!write(PAIRING_KEY,value))throw new Error('가족 동기화 코드를 이 기기에 저장할 수 없어요.');
 const state={version:STATE_VERSION,familyId:data.familyId,deviceId:data.deviceId,deviceKey:key,
  revision:0,lastHash:'',lastSyncedAt:0,learners:data.learners||{}};
 saveCloudState(state);
 return {paired:true,familyId:data.familyId};
}
export function unpairFamily(){
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null;}
 remove(PAIRING_KEY);remove(CLOUD_STATE_KEY);
 return true;
}

export function buildLocalSnapshot(){
 return {...Progress.exportRecords(),familySettings:Settings.getSettings(),rewards:Rewards.exportRewards(),
  village:VillageState.loadVillage(),growthGoals:Progression.exportGoals(),
  relationships:Relationships.exportRelationships(),ecology:Ecology.exportEcology(),cloudSnapshotVersion:1};
}
function settingsAreDefaults(value){
 return value?.tae?.place==='우리 학교'&&value?.se?.place==='우리 어린이집';
}
export function applySnapshot(raw){
 if(!raw||raw.cloudSnapshotVersion!==1)throw new Error('마법마을 클라우드 기록 형식을 확인해 주세요.');
 Progress.importRecords(raw);
 if(raw.rewards)Rewards.importRewards(raw.rewards);
 if(raw.village)VillageState.saveVillage(VillageState.mergeVillage(VillageState.loadVillage(),raw.village));
 if(raw.growthGoals)Progression.importGoals(raw.growthGoals);
 if(raw.relationships)Relationships.importRelationships(raw.relationships);
 if(raw.ecology)Ecology.importEcology(raw.ecology);
 if(raw.familySettings&&settingsAreDefaults(Settings.getSettings()))
  Settings.saveSettings(Settings.validateSettings(raw.familySettings));
 return true;
}
function stable(value){
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 return JSON.stringify(value);
}
async function sha256(value){
 const bytes=new TextEncoder().encode(stable(value));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function pullFamily(code){
 const result=await rpc('magic_family_pull',{p_code:code});
 return Array.isArray(result)?result:[];
}
async function pushSnapshot(code,state,snapshot,hash){
 const result=await rpc('magic_family_push',{
  p_code:code,p_device_key:state.deviceKey,p_client_revision:(state.revision||0)+1,
  p_payload:snapshot,p_content_sha256:hash
 });
 if(!result?.deviceId)throw new Error('가족 클라우드 저장 결과를 확인하지 못했어요.');
 return result;
}

async function performSync(){
 const code=pairingCode();
 if(!code)throw new Error('이 기기를 가족 마법마을에 먼저 연결해 주세요.');
 let state=await ensurePaired(code);
 const remotes=await pullFamily(code);
 let downloaded=false;
 for(const remote of remotes){
  if(remote?.payload&&remote.content_sha256!==state.lastHash){
   applySnapshot(remote.payload);downloaded=true;
  }
 }
 const snapshot=buildLocalSnapshot(),hash=await sha256(snapshot);
 const remoteHasHash=remotes.some(row=>row?.content_sha256===hash);
 let uploaded=false,revision=state.revision||0;
 if(!remoteHasHash){
  const pushed=await pushSnapshot(code,state,snapshot,hash);
  uploaded=Boolean(pushed.uploaded);
  revision=Number(pushed.revision)||revision;
 }
 state={...state,revision,lastHash:hash,lastSyncedAt:now()};
 saveCloudState(state);
 return {paired:true,downloaded,uploaded,lastSyncedAt:state.lastSyncedAt,familyId:state.familyId};
}
export async function syncNow(){
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null;}
 if(syncFlight)return syncFlight;
 syncFlight=performSync().finally(()=>{syncFlight=null;});
 return syncFlight;
}
export function scheduleSync(delayMs=4000){
 if(!isPaired())return false;
 if(syncTimer)clearTimeout(syncTimer);
 const delay=Number.isFinite(delayMs)?Math.max(250,Math.min(30000,delayMs)):4000;
 syncTimer=setTimeout(()=>{syncTimer=null;syncNow().catch(()=>{});},delay);
 return true;
}
export async function autoSync(){
 if(!isPaired())return {paired:false};
 try{return await syncNow();}catch(error){return {paired:true,error:error.message};}
}
export function status(){
 const state=cloudState();
 return {enabled:CLOUD_CONFIG.enabled,paired:isPaired(),lastSyncedAt:state?.lastSyncedAt||0,
  familyId:state?.familyId||''};
}
