import {CLOUD_CONFIG} from './cloud-config.js';
import * as Progress from './progress.js?v=ecology-v19-20261015';
import * as Rewards from './rewards.js?v=unified-20261013';
import * as Settings from './settings.js?v=unified-20261013';
import * as Progression from './progression.js?v=parent-v14-20261015';
import * as VillageState from '../village/village-state.js?v=unified-20261013';
import * as Relationships from '../village/relationship-state.js?v=ecology-v19-20261015';
import * as Ecology from '../village/ecology-state.js?v=ecology-v19-20261015';

export const SESSION_KEY='sparkle-cloud-session-v1';
export const CLOUD_STATE_KEY='sparkle-cloud-state-v1';
export const DEVICE_KEY='sparkle-cloud-device-key-v1';
const SESSION_VERSION=1,STATE_VERSION=1;
let syncFlight=null,syncTimer=null;
const apiBase=()=>CLOUD_CONFIG.url.replace(/\/$/,'');
const now=()=>Date.now();

const safeJson=text=>{try{return text?JSON.parse(text):null;}catch{return null;}};
const read=(key)=>{try{return globalThis.localStorage?.getItem(key)||'';}catch{return '';}};
const write=(key,value)=>{try{globalThis.localStorage?.setItem(key,value);return true;}catch{return false;}};
const remove=key=>{try{globalThis.localStorage?.removeItem(key);}catch{}};

function validateEmail(email){
 const value=String(email||'').trim().toLowerCase();
 if(value.length<5||value.length>160||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('보호자 이메일을 확인해 주세요.');
 return value;
}
function validatePassword(password){
 const value=String(password||'');
 if(value.length<8||value.length>128)throw new Error('비밀번호는 8자 이상으로 입력해 주세요.');
 return value;
}
function cleanSession(raw){
 if(!raw||raw.version!==SESSION_VERSION||typeof raw.accessToken!=='string'||typeof raw.refreshToken!=='string'||
   !Number.isFinite(raw.expiresAt)||typeof raw.userId!=='string')return null;
 return {version:SESSION_VERSION,accessToken:raw.accessToken,refreshToken:raw.refreshToken,
   expiresAt:raw.expiresAt,userId:raw.userId,email:typeof raw.email==='string'?raw.email:''};
}
function sessionFromResponse(data){
 if(!data?.access_token||!data.refresh_token||!data.user?.id)return null;
 const expiresIn=Number(data.expires_in)||3600;
 return {version:SESSION_VERSION,accessToken:data.access_token,refreshToken:data.refresh_token,
   expiresAt:now()+expiresIn*1000,userId:data.user.id,email:data.user.email||''};
}
function saveSession(session){
 if(!session){remove(SESSION_KEY);return null;}
 if(!write(SESSION_KEY,JSON.stringify(session)))throw new Error('로그인 정보를 이 기기에 저장할 수 없어요.');
 return session;
}
export function storedSession(){return cleanSession(safeJson(read(SESSION_KEY)));}

async function request(path,{method='GET',body=null,session=null,headers={}}={}){
 if(!CLOUD_CONFIG.enabled)throw new Error('클라우드 연결이 꺼져 있어요.');
 const init={method,headers:{apikey:CLOUD_CONFIG.publishableKey,...headers}};
 if(session)init.headers.Authorization='Bearer '+session.accessToken;
 if(body!==null){
   init.headers['Content-Type']='application/json';
   init.body=JSON.stringify(body);
 }
 const response=await fetch(apiBase()+path,init);
 const text=await response.text(),data=safeJson(text);
 if(!response.ok){
   const message=data?.msg||data?.message||data?.error_description||data?.error||'클라우드 요청을 처리하지 못했어요.';
   const error=new Error(String(message).slice(0,240));error.status=response.status;throw error;
 }
 return data??(text||null);
}

export async function signUp(email,password){
 const value=validateEmail(email),secret=validatePassword(password);
 const data=await request('/auth/v1/signup',{method:'POST',body:{email:value,password:secret}});
 const session=sessionFromResponse(data);
 if(session)saveSession(session);
 return {signedIn:Boolean(session),needsConfirmation:!session,email:value,userId:data?.user?.id||''};
}
export async function signIn(email,password){
 const value=validateEmail(email),secret=validatePassword(password);
 const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:value,password:secret}});
 const session=sessionFromResponse(data);
 if(!session)throw new Error('로그인 세션을 만들지 못했어요.');
 saveSession(session);
 return session;
}
export async function signOut(){
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null;}
 const session=storedSession();
 try{if(session)await request('/auth/v1/logout',{method:'POST',session});}catch{}
 remove(SESSION_KEY);remove(CLOUD_STATE_KEY);
 return true;
}
export async function freshSession(){
 let session=storedSession();
 if(!session)return null;
 if(session.expiresAt-now()>90_000)return session;
 const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refreshToken}});
 session=sessionFromResponse(data);
 if(!session){remove(SESSION_KEY);return null;}
 return saveSession(session);
}

function cleanCloudState(raw,userId=''){
 if(!raw||raw.version!==STATE_VERSION||typeof raw.familyId!=='string'||typeof raw.deviceId!=='string'||
   typeof raw.deviceKey!=='string'||!Number.isSafeInteger(raw.revision)||raw.revision<0||
   (userId&&raw.userId!==userId))return null;
 return {version:STATE_VERSION,userId:raw.userId,familyId:raw.familyId,deviceId:raw.deviceId,
   deviceKey:raw.deviceKey,revision:raw.revision,lastHash:typeof raw.lastHash==='string'?raw.lastHash:'',
   lastSyncedAt:Number.isFinite(raw.lastSyncedAt)?raw.lastSyncedAt:0,
   learners:raw.learners&&typeof raw.learners==='object'?raw.learners:{}};
}
export function cloudState(){
 const session=storedSession();
 return cleanCloudState(safeJson(read(CLOUD_STATE_KEY)),session?.userId||'');
}
function saveCloudState(state){
 if(!write(CLOUD_STATE_KEY,JSON.stringify(state)))throw new Error('클라우드 연결 상태를 저장할 수 없어요.');
 return state;
}
function deviceKey(){
 let value=read(DEVICE_KEY);
 if(/^[a-zA-Z0-9_-]{8,160}$/.test(value))return value;
 value='web-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36)).replace(/[^a-zA-Z0-9_-]/g,'');
 if(!write(DEVICE_KEY,value))throw new Error('기기 식별자를 저장할 수 없어요.');
 return value;
}

function endpoint(table,params={}){
 const url=new URL(apiBase()+'/rest/v1/'+table);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
 return url.pathname+url.search;
}
async function bootstrap(session){
 let state=cleanCloudState(safeJson(read(CLOUD_STATE_KEY)),session.userId);
 if(state)return state;
 const familyId=await request('/rest/v1/rpc/bootstrap_magic_family',{method:'POST',body:{},session});
 if(typeof familyId!=='string'||familyId.length<20)throw new Error('가족 클라우드 공간을 만들지 못했어요.');
 const learners=await request(endpoint('magic_learners',{select:'id,learner_key,display_name',family_id:'eq.'+familyId}),{session});
 const learnerMap={};
 for(const item of Array.isArray(learners)?learners:[])if(['tae','se'].includes(item.learner_key)&&typeof item.id==='string')learnerMap[item.learner_key]=item.id;
 if(!learnerMap.tae||!learnerMap.se)throw new Error('아이별 클라우드 공간을 확인하지 못했어요.');
 const key=deviceKey();
 const devices=await request(endpoint('magic_devices',{on_conflict:'family_id,device_key',select:'id,device_key'}),{
   method:'POST',session,headers:{Prefer:'resolution=merge-duplicates,return=representation'},
   body:{family_id:familyId,device_key:key,label:'Magic Village Web'}
 });
 const device=Array.isArray(devices)?devices[0]:devices;
 if(!device?.id)throw new Error('이 기기를 클라우드에 등록하지 못했어요.');
 state={version:STATE_VERSION,userId:session.userId,familyId,deviceId:device.id,deviceKey:key,
   revision:0,lastHash:'',lastSyncedAt:0,learners:learnerMap};
 return saveCloudState(state);
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
 if(raw.familySettings&&settingsAreDefaults(Settings.getSettings()))Settings.saveSettings(Settings.validateSettings(raw.familySettings));
 return true;
}
function stable(value){
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object'){
   return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
 }
 return JSON.stringify(value);
}
async function sha256(value){
 const bytes=new TextEncoder().encode(stable(value));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function latestFamilySnapshot(session,state){
 const rows=await request(endpoint('magic_device_snapshots',{
   select:'payload,content_sha256,created_at,device_id,client_revision',
   family_id:'eq.'+state.familyId,order:'created_at.desc',limit:'1'
 }),{session});
 return Array.isArray(rows)&&rows.length?rows[0]:null;
}
async function latestDeviceSnapshots(session,state){
 const devices=await request(endpoint('magic_devices',{select:'id',family_id:'eq.'+state.familyId}),{session});
 const ids=[...new Set((Array.isArray(devices)?devices:[]).map(x=>x?.id).filter(Boolean))];
 if(!ids.includes(state.deviceId))ids.push(state.deviceId);
 const rows=(await Promise.all(ids.map(async id=>{
   const result=await request(endpoint('magic_device_snapshots',{
     select:'payload,content_sha256,created_at,device_id,client_revision',
     device_id:'eq.'+id,order:'client_revision.desc',limit:'1'
   }),{session});
   return Array.isArray(result)&&result.length?result[0]:null;
 }))).filter(Boolean);
 return rows.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
}
async function latestDeviceRevision(session,state){
 const rows=await request(endpoint('magic_device_snapshots',{
   select:'client_revision',device_id:'eq.'+state.deviceId,order:'client_revision.desc',limit:'1'
 }),{session});
 return Array.isArray(rows)&&rows.length?Number(rows[0].client_revision)||0:0;
}
async function uploadSnapshot(session,state,snapshot,hash){
 const latest=await latestFamilySnapshot(session,state);
 if(latest?.content_sha256===hash)return {uploaded:false,remote:latest,state};
 const remoteRevision=await latestDeviceRevision(session,state);
 let revision=Math.max(state.revision||0,remoteRevision)+1;
 const body={family_id:state.familyId,device_id:state.deviceId,client_revision:revision,
   payload:snapshot,content_sha256:hash};
 try{
   await request(endpoint('magic_device_snapshots'),{method:'POST',session,
     headers:{Prefer:'return=minimal'},body});
 }catch(error){
   if(error.status!==409)throw error;
   revision=Math.max(revision,await latestDeviceRevision(session,state)+1);
   body.client_revision=revision;
   await request(endpoint('magic_device_snapshots'),{method:'POST',session,
     headers:{Prefer:'return=minimal'},body});
 }
 state={...state,revision,lastHash:hash,lastSyncedAt:now()};
 saveCloudState(state);
 return {uploaded:true,state};
}

async function performSync(){
 const session=await freshSession();
 if(!session)throw new Error('보호자 클라우드 로그인이 필요해요.');
 let state=await bootstrap(session);
 const remotes=await latestDeviceSnapshots(session,state);
 let downloaded=false;
 for(const remote of remotes)if(remote?.payload&&remote.content_sha256!==state.lastHash){
   applySnapshot(remote.payload);downloaded=true;
 }
 const snapshot=buildLocalSnapshot(),hash=await sha256(snapshot);
 const result=await uploadSnapshot(session,state,snapshot,hash);
 state=result.state||state;
 if(!result.uploaded){
   state={...state,lastHash:hash,lastSyncedAt:now()};saveCloudState(state);
 }
 return {signedIn:true,email:session.email,downloaded,uploaded:result.uploaded,
   lastSyncedAt:state.lastSyncedAt,familyId:state.familyId};
}
export async function syncNow(){
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null;}
 if(syncFlight)return syncFlight;
 syncFlight=performSync().finally(()=>{syncFlight=null;});
 return syncFlight;
}
export function scheduleSync(delayMs=4000){
 if(!storedSession())return false;
 if(syncTimer)clearTimeout(syncTimer);
 const delay=Number.isFinite(delayMs)?Math.max(250,Math.min(30000,delayMs)):4000;
 syncTimer=setTimeout(()=>{syncTimer=null;syncNow().catch(()=>{});},delay);
 return true;
}
export async function flushScheduledSync(){
 if(!storedSession())return {signedIn:false};
 if(syncTimer){clearTimeout(syncTimer);syncTimer=null;}
 try{return await syncNow();}catch(error){return {signedIn:true,error:error.message};}
}
export async function autoSync(){
 if(!storedSession())return {signedIn:false};
 try{return await syncNow();}catch(error){return {signedIn:true,error:error.message};}
}
export function status(){
 const session=storedSession(),state=cloudState();
 return {enabled:CLOUD_CONFIG.enabled,signedIn:Boolean(session),email:session?.email||'',
   lastSyncedAt:state?.lastSyncedAt||0,familyId:state?.familyId||''};
}
