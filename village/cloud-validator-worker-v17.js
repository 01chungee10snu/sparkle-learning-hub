// An isolated worker per validation job. Never import stateful app modules in the page.
import {createLifeStore} from './life-state-v16.js';
const CATALOG_URL=new URL('../games/catalog.json',import.meta.url);
const readOnlyKeys=['sparkle-learning-progress-v3','fairy-math-garden-v1','sparkle-rewards-v1','sparkle-unity-village-v1','sparkle-family-settings-v1'];
const GARDEN_KEY='sparkle-care-garden-v1:'+new URL('../',import.meta.url).pathname;
const allowed=new Set([...readOnlyKeys,GARDEN_KEY,'sparkle:fairy-visual-style:v11:tae','sparkle:fairy-visual-style:v11:se']);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const clone=x=>JSON.parse(JSON.stringify(x));
const safeJson=x=>JSON.stringify(x);
function lifeValid(life,namespace){
 if(!plain(life)||life.version!==16||Object.keys(life).sort().join(',')!=='family,se,tae,version')throw Error('생활 마을 저장 구조를 확인해 주세요.');
 const m=new Map([['sparkle-life-v16:'+namespace,JSON.stringify(life)]]);
 const store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 const api=createLifeStore({storage:store,namespace});
 api.snapshot('tae');api.snapshot('se');api.snapshot('tae','plaza');
 return clone(life);
}
function careValid(raw){
 if(!plain(raw)||raw.version!==1||Object.keys(raw).sort().join(',')!=='family,se,tae,version')throw Error('기존 정원 형식 오류');
 const species={flowers_pink:3,flowers_blue:3,flowers_sun:3,tree_oak:6,tree_mint:6,tree_gold:6};
 for(const owner of ['tae','se','family']){
  const plants=raw[owner],slots=new Set();
  if(!Array.isArray(plants)||plants.length>8)throw Error('정원 개수 오류');
  for(const p of plants){
   if(!plain(p)||Object.keys(p).sort().join(',')!=='slot,species,stage'||!Number.isInteger(p.slot)||p.slot<0||p.slot>7||slots.has(p.slot)||!Object.hasOwn(species,p.species)||!Number.isInteger(p.stage)||p.stage<0||p.stage>species[p.species])throw Error('정원 항목 오류');
   slots.add(p.slot);
  }
 }return clone(raw);
}
function styleValid(style){
 if(!plain(style)||Object.keys(style).sort().join(',')!=='se,tae')throw Error('요정 스타일 형식을 확인해 주세요.');
 return Object.fromEntries(['tae','se'].map(k=>{
   const x=style[k];if(typeof x!=='string'||x.length>100||!/^[a-z0-9-]+$/.test(x))throw Error('요정 스타일 형식을 확인해 주세요.');
   return [k,x];
 }));
}
function preserveEvidence(source,cleaned){
 for(const who of ['tae','se']){
  const incoming=source?.profiles?.[who]?.games;
  if(!plain(incoming))throw Error('학습 기록 형식을 확인해 주세요.');
  for(const [gameId,game] of Object.entries(incoming)){
   const restored=cleaned.profiles[who].games[gameId];
   if(!restored)throw Error('등록되지 않은 학습 게임 기록을 보존할 수 없습니다: '+gameId);
   const originalRecords=Object.keys(game.records||{}),surviving=Object.keys(restored.records);
   if(originalRecords.some(id=>!surviving.includes(id)))throw Error('문항 이력의 손실을 감지했습니다: '+gameId);
   const completed=(game.completedRounds||[]).map(round=>round.id),saved=restored.completedRounds.map(round=>round.id);
   if(completed.some(id=>!saved.includes(id)))throw Error('완료 회차 이력의 손실을 감지했습니다: '+gameId);
  }
 }
}
async function run({local,remote,base=null,namespace,prefer=null}){
 if(typeof namespace!=='string'||namespace.length>512)throw Error('동기화 마을 주소가 잘못됐어요.');
 if(prefer!==null&&!['local','remote'].includes(prefer))throw Error('동기화 충돌 선택을 확인해 주세요.');
 if(!plain(local)||!plain(remote)||local.schema!==17||remote.schema!==17)throw Error('동기화 파일 버전을 확인해 주세요.');
 const lifeA=lifeValid(local.life,namespace),lifeB=lifeValid(remote.life,namespace);
 const lifeBase=base?lifeValid(base.life,namespace):null;
 const conflictBackup={life:{},careGarden:{},settings:null};
 const careA=careValid(local.careGarden),careB=careValid(remote.careGarden),careGarden={version:1};
 const careBase=base?careValid(base.careGarden):null;
 for(const owner of ['tae','se','family']){
  const rows=new Map(careA[owner].map(p=>[p.slot,p]));
  for(const p of careB[owner]){
   const existing=rows.get(p.slot);
   if(existing&&existing.species!==p.species){
    const prior=careBase?.[owner].find(x=>x.slot===p.slot);
    if(prior&&JSON.stringify(existing)===JSON.stringify(prior)){rows.set(p.slot,p);continue;}
    if(prior&&JSON.stringify(p)===JSON.stringify(prior))continue;
    if(!prefer)throw Error('CARE_GARDEN_CONFLICT:'+owner+':'+p.slot);
    conflictBackup.careGarden[owner]??=[];
    conflictBackup.careGarden[owner].push({slot:p.slot,local:clone(existing),remote:clone(p)});
    if(prefer==='remote')rows.set(p.slot,p);
    continue;
   }
   if(!existing||p.stage>existing.stage)rows.set(p.slot,p);
  }
  careGarden[owner]=[...rows.values()].sort((a,b)=>a.slot-b.slot);
 }
 const mergedLife={version:16};
 for(const owner of ['tae','se','family']){
   const a=lifeA[owner],b=lifeB[owner];
   if(JSON.stringify(a)===JSON.stringify(b))mergedLife[owner]=a;
   else if(lifeBase&&JSON.stringify(a)===JSON.stringify(lifeBase[owner]))mergedLife[owner]=b;
   else if(lifeBase&&JSON.stringify(b)===JSON.stringify(lifeBase[owner]))mergedLife[owner]=a;
   else if(a.revision===0)mergedLife[owner]=b;
   else if(b.revision===0)mergedLife[owner]=a;
   else if(prefer){
    const nextRevision=Math.max(a.revision,b.revision)+1;
    if(nextRevision>1000000)throw Error('LIFE_REVISION_LIMIT:'+owner);
    mergedLife[owner]={...clone(prefer==='local'?a:b),revision:nextRevision};
    conflictBackup.life[owner]={local:a,remote:b};
   }
   else throw Error('LIFE_OWNER_CONFLICT:'+owner);
 }
 const map=new Map();
 const mem={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(!allowed.has(k))throw Error('비허용 저장키');map.set(k,String(v));},removeItem:k=>map.delete(k)};
 globalThis.localStorage=mem;
 // Imported after setting localStorage, in an isolated Worker.
 const [P,R,S,V,F]=await Promise.all([
   import('../platform/progress.js'),import('../platform/rewards.js'),import('../platform/settings.js'),
   import('./village-state.js'),import('./fairy-styles-v11.js')]);
 const catResponse=await fetch(CATALOG_URL);
 if(!catResponse.ok)throw Error('학습 목록을 확인할 수 없습니다.');
 const cat=await catResponse.json();
 const {validateCatalog}=await import('../platform/catalog.js');
 P.configureCatalog(validateCatalog(cat));
 const seed=clone(local.learning);
 const incoming=clone(remote.learning);
 if(!seed||!incoming||seed.format!=='sparkle-learning-backup'||incoming.format!=='sparkle-learning-backup')throw Error('학습 백업 형식을 확인해 주세요.');
 // Do not synchronize the selected learner.
 const currentLearner='tae';
 const cleanSeed=P.clean(seed.platform),cleanIncoming=P.clean(incoming.platform);
 preserveEvidence(seed.platform,cleanSeed);
 preserveEvidence(incoming.platform,cleanIncoming);
 map.set(P.KEY,JSON.stringify(cleanSeed));
 if(seed.unitGarden!==null&&seed.unitGarden!==undefined)map.set(P.LEGACY_KEY,JSON.stringify(seed.unitGarden));
 P.importRecords({...incoming,learner:currentLearner});
 const progress=P.exportRecords();
 const expected=clone(local.rewards);
 if(!expected||expected.format!=='sparkle-rewards-backup')throw Error('보상 백업 형식이 잘못됐어요.');
 map.set(R.REWARDS_KEY,JSON.stringify(expected.state));
 R.wallet(cat,'tae');
 R.importRewards(remote.rewards);
 const rewards=R.exportRewards();
 const village=V.mergeVillage(V.cleanVillage(local.village),V.cleanVillage(remote.village));
 const localSettings=S.validateSettings(local.settings),remoteSettings=S.validateSettings(remote.settings);
 const baseSettings=base?S.validateSettings(base.settings):null;
 const differs=JSON.stringify(localSettings)!==JSON.stringify(remoteSettings);
 const localUnchanged=baseSettings&&JSON.stringify(localSettings)===JSON.stringify(baseSettings);
 const remoteUnchanged=baseSettings&&JSON.stringify(remoteSettings)===JSON.stringify(baseSettings);
 if(differs&&!prefer&&!localUnchanged&&!remoteUnchanged)throw Error('FAMILY_SETTINGS_CONFLICT');
 if(JSON.stringify(localSettings)!==JSON.stringify(remoteSettings)&&prefer)conflictBackup.settings={local:localSettings,remote:remoteSettings};
 const settings=prefer==='local'||(remoteUnchanged&&prefer===null)?localSettings:remoteSettings;
 const styles=styleValid(remote.fairyStyles);
 for(const id of Object.values(styles))if(F.safeStyle(id)!==id)throw Error('알 수 없는 요정 스타일입니다.');
 const {learner,createdAt,...learning}=progress;
 if(learning.unitGarden&&typeof learning.unitGarden==='object')delete learning.unitGarden.selected;
 const result={schema:17,learning,rewards,village,careGarden,life:mergedLife,settings,fairyStyles:styles};
 const hasConflictBackup=Boolean(Object.keys(conflictBackup.life).length||Object.keys(conflictBackup.careGarden).length||conflictBackup.settings);
 const writes={
  [P.KEY]:safeJson(result.learning.platform),
  [R.REWARDS_KEY]:safeJson(result.rewards.state),
  [V.VILLAGE_KEY]:safeJson(village),
  [GARDEN_KEY]:safeJson(careGarden),
  [S.SETTINGS_KEY]:safeJson(settings),
  ['sparkle-life-v16:'+namespace]:safeJson(mergedLife),
  ['sparkle:fairy-visual-style:v11:tae']:styles.tae,
  ['sparkle:fairy-visual-style:v11:se']:styles.se
 };
 if(map.has(P.LEGACY_KEY))writes[P.LEGACY_KEY]=map.get(P.LEGACY_KEY);
 return {snapshot:result,writes,...(hasConflictBackup?{conflictBackup}:{})};
}
self.onmessage=async ({data})=>{
 const {id,request}=data||{};
 try{self.postMessage({id,ok:true,result:await run(request)});}
 catch(e){self.postMessage({id,ok:false,error:String(e?.message||e)});}
};
