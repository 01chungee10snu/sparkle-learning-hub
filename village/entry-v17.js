import {createVillageHost} from './village-bridge.js?v=connected-v17-20261014';
import * as Progress from '../platform/progress.js';
import {createVillageUI} from './village-ui.js?v=connected-v17-20261014';
import {createLifeStore} from './life-state-v16.js';
import {createCloudSync} from './cloud-sync-v17.js';
import {createCloudSnapshotAdapter} from './cloud-snapshot-v17.js';
import {CLOUD_SYNC_ENDPOINT} from './cloud-config-v17.js';

const BUILD_VERSION = 'connected-v17-20261014';
const status = document.querySelector('#status');
const overlay = document.querySelector('#loading');
const canvas = document.querySelector('#canvas');
const start = document.querySelector('#start');
const lite = document.querySelector('#lite');
const liteScene = document.querySelector('#lite-village-scene');
const uiRoot = document.querySelector('#village-ui');
const meter = document.querySelector('#meter');
const bar = document.querySelector('#bar');
let liteMode = false, starting = false, retryBlocked = false;
let instance = null, host = null;
const queued = [];
let queuedCosmetics = null, queuedGarden = null;
const commandHistory = [];
let liteAreaRequest = 0;
const pendingLiteAreas = new Map();
const namespace=new URL('../',import.meta.url).pathname;
const lifeStore=createLifeStore({namespace});
let cloudSync=null, cloudAdapter=null, cloudStarted=false, syncRefreshNumber=0;
let animalReport=null;
window.MagicVillageLifeWorldReceive=raw=>{
  if(typeof raw!=='string'||raw.length>30000)return;
  try{
    const report=JSON.parse(raw),context=ui.currentContext();
    if(report.who!==context.who||report.area!==context.area||!Array.isArray(report.animals)||report.animals.length>5)return;
    animalReport=report;
  }catch{/* Diagnostics never replace the saved state. */}
};
function sendLifeSnapshot(){
  if(!instance||uiRoot.hidden)return;
  try{
    const context=ui.currentContext();
    const snapshot=lifeStore.snapshot(context.who,context.area);
    instance.SendMessage('VillageRuntime','OnLifeMessage',JSON.stringify(snapshot));
  }catch(error){ui.announce(error.message||'동물 친구의 기록을 확인해 주세요.');}
}
function lifeChanged(){sendLifeSnapshot();cloudSync?.notifyLocalChange();}
function startCloud(){
  if(cloudStarted)return;cloudStarted=true;
  try{
    cloudAdapter=createCloudSnapshotAdapter({namespace,canApply:()=>ui.canApplyCloud(),onApplied:()=>{
      queueMicrotask(()=>{
        ui.refreshLife();ui.syncAvatarStyle();sendLifeSnapshot();
        if(ui.canApplyCloud())void host.handle(JSON.stringify({action:'INIT',area:ui.currentContext().area,requestId:'cloud-refresh-'+(++syncRefreshNumber)}));
      });
    }});
    cloudSync=createCloudSync({endpoint:CLOUD_SYNC_ENDPOINT,namespace,
      readSnapshot:cloudAdapter.readSnapshot,applySnapshot:cloudAdapter.applySnapshot,
      mergeSnapshots:cloudAdapter.mergeSnapshots,onStatus:state=>ui.updateCloudStatus(state)});
    void cloudSync.start().catch(error=>ui.updateCloudStatus({state:'error',detail:error.message}));
  }catch(error){cloudStarted=false;ui.updateCloudStatus({state:'error',detail:error.message});}
}

function setEntryBusy(busy) {
  starting = busy;
  start.disabled = busy || retryBlocked;
  lite.disabled = busy;
  for (const control of document.querySelectorAll('[data-learner]')) control.disabled = busy;
  overlay.setAttribute('aria-busy', String(busy));
}

function sendToUnity(command) {
  if (instance) {
    instance.SendMessage('VillageRuntime', 'OnUiCommand', command);
    // Presentation command names only; never question contents, answers or balances.
    commandHistory.push({command, at:Math.round(performance.now())});
    if (commandHistory.length > 24) commandHistory.shift();
    return;
  }
  if (liteMode && command === 'START_RECOMMENDED')
    return host.handle(JSON.stringify({action:'AREA_OPEN', district:'math', requestId:'lite-'+Date.now()}));
  if (liteMode && (command === 'GO_HOME' || command === 'GO_PLAZA')) {
    // The 2D mode has no Unity INIT callback. Confirm the same host-owned area
    // snapshot explicitly instead of leaving its old setZone controls busy forever.
    const area = command === 'GO_PLAZA' ? 'plaza' : 'home';
    const requestId = 'lite-area-'+(++liteAreaRequest);
    pendingLiteAreas.set(requestId, area);
    return host.handle(JSON.stringify({action:'INIT', area, requestId}));
  }
}

for (const control of document.querySelectorAll('[data-learner]')) {
  control.addEventListener('click', () => {
    if (starting) return;
    Progress.selectLearner(control.dataset.learner);
    for (const button of document.querySelectorAll('[data-learner]'))
      button.setAttribute('aria-pressed', String(button === control));
  });
  control.setAttribute('aria-pressed', String(control.dataset.learner === Progress.learner()));
}

const ui = createVillageUI({root:uiRoot, sendToUnity,
  sendRequest:request => host.handle(JSON.stringify(request)),getCloudSync:()=>cloudSync,onLifeChange:lifeChanged});

const deliver = message => {
  if (pendingLiteAreas.has(message?.requestId)) {
    const area = pendingLiteAreas.get(message.requestId);
    pendingLiteAreas.delete(message.requestId);
    if (message.ok) {
      liteScene.dataset.area = area;
      liteScene.setAttribute('aria-label', area === 'plaza' ? '가족 광장 · 2D 마을' : '내 마을 · 2D 마을');
    }
  }
  ui.update(message);
  if (liteMode && message?.ok && message.action === 'NEXT' && message.finished &&
      message.roundId && message.gameId) {
    queueMicrotask(() => void host.handle(JSON.stringify({action:'COMPLETE_WORLD',
      requestId:'lite-complete-'+message.roundId, gameId:message.gameId, roundId:message.roundId})));
  }
  if (message?.ok && message.cosmetics) {
    const wear = JSON.stringify(message.cosmetics);
    if (instance) instance.SendMessage('VillageRuntime', 'OnCosmeticsMessage', wear);
    else queuedCosmetics = wear;
  }
  const payload = JSON.stringify(message);
  if (instance) instance.SendMessage('VillageRuntime', 'OnBridgeMessage', payload);
  else if (!liteMode) queued.push(payload);
  if (message?.ok && message.garden) {
    const garden = JSON.stringify(message.garden);
    if (instance) instance.SendMessage('VillageRuntime', 'OnGardenMessage', garden);
    else queuedGarden = garden;
  }
  if(message?.ok){
    if(message.action==='INIT')queueMicrotask(sendLifeSnapshot);
    if(['SUBMIT','NEXT','COMPLETE_WORLD','GARDEN_PLANT','GARDEN_CARE','SHOP_BUY','SHOP_EQUIP','SHOP_UNEQUIP','REFLECT'].includes(message.action))cloudSync?.notifyLocalChange();
  }
};
host = createVillageHost(deliver);
window.SparkleVillageBridge = {handle:raw => host.handle(raw)};

async function exists(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {method:'HEAD', cache:'no-store', signal:controller.signal});
    return response.ok;
  } finally { clearTimeout(timeout); }
}

async function discoverBuild() {
  for (const name of ['WebGL', 'sparkle-fairy-village']) {
    const loaderUrl = './Build/'+name+'.loader.js?v='+BUILD_VERSION;
    try { if (await exists(loaderUrl)) return {name, loaderUrl}; }
    catch { /* A second supported filename may still be available. */ }
  }
  return null;
}

function script(url) {
  if (typeof window.createUnityInstance === 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = url;
    element.onload = resolve;
    element.onerror = () => {element.remove(); reject(new Error('3D 실행 파일을 불러오지 못했어요.'));};
    document.head.appendChild(element);
  });
}

function revealWorld() {
  overlay.hidden = true;
  overlay.setAttribute('aria-busy', 'false');
  uiRoot.hidden = false;
  ui.syncNavigation?.();
  sendLifeSnapshot();startCloud();
  // A background transition during loading must not be lost before Unity exists.
  if (document.hidden) sendToUnity('APP_PAUSE');
}

lite.addEventListener('click', async () => {
  if (starting) return;
  setEntryBusy(true);
  try {
    status.textContent = '배움과 마을 메뉴를 준비하고 있어요.';
    await host.prepare();
    liteMode = true;
    liteScene.hidden = false;
    canvas.style.display = 'none';
    uiRoot.dataset.lite = 'true';
    const help = uiRoot.querySelector('#vh-help');
    if (help) help.textContent = '꾸미기에서 텃밭과 동물 친구를 만나요.';
    uiRoot.querySelector('#vh-quest')?.setAttribute('aria-label', '이야기 모험 열기');
    await host.handle(JSON.stringify({action:'INIT', requestId:'lite-initial'}));
    revealWorld();
  } catch (error) {
    status.textContent = '마을을 불러오지 못했어요. '+(error?.message || '');
    liteMode = false;
    liteScene.hidden = true;
    uiRoot.hidden = true;
    overlay.hidden = false;
  } finally { setEntryBusy(false); }
});

start.addEventListener('click', async () => {
  if (starting || retryBlocked) return;
  setEntryBusy(true);
  try {
    status.textContent = '이 기기의 배움 기록을 확인하고 있어요.';
    await host.prepare();
    const build = await discoverBuild();
    if (!build) throw new Error('3D 빌드가 없어요. 같은 기록으로 2D 마을을 이용할 수 있어요.');
    meter.hidden = false;
    meter.setAttribute('aria-valuenow', '0');
    bar.style.width = '0%';
    status.textContent = '마을의 길과 친구들을 불러오고 있어요.';
    await script(build.loaderUrl);
    if (typeof window.createUnityInstance !== 'function') throw new Error('3D 실행 모듈을 찾지 못했어요.');
    const base = './Build/'+build.name;
    const compressed = await exists(base+'.data.unityweb').catch(() => false);
    const suffix = compressed ? '.unityweb' : '';
    canvas.style.display = 'block';
    instance = await window.createUnityInstance(canvas, {
      dataUrl:base+'.data'+suffix+'?v='+BUILD_VERSION,
      frameworkUrl:base+'.framework.js'+suffix+'?v='+BUILD_VERSION,
      codeUrl:base+'.wasm'+suffix+'?v='+BUILD_VERSION,
      streamingAssetsUrl:'StreamingAssets', companyName:'Family Learning',
      productName:'Sparkle Fairy Village', productVersion:'0.17.0-connected-v17'
    }, progress => {
      const percent = Math.min(100, Math.max(0, Math.round(progress*100)));
      bar.style.width = percent+'%';
      meter.setAttribute('aria-valuenow', String(percent));
      status.textContent = '마을 준비 중 '+percent+'%';
    });
    ui.syncMotion();
    for (const payload of queued.splice(0)) instance.SendMessage('VillageRuntime', 'OnBridgeMessage', payload);
    if (queuedCosmetics) {
      instance.SendMessage('VillageRuntime', 'OnCosmeticsMessage', queuedCosmetics);
      queuedCosmetics = null;
    }
    if (queuedGarden) {
      instance.SendMessage('VillageRuntime', 'OnGardenMessage', queuedGarden);
      queuedGarden = null;
    }
    ui.syncAvatarStyle();
    uiRoot.dataset.lite = 'false';
    revealWorld();
  } catch (error) {
    const orphan = instance;
    instance = null;
    let cleanupFailure = null;
    if (orphan && typeof orphan.Quit === 'function') {
      try { await orphan.Quit(); }
      catch (failure) { cleanupFailure = failure; retryBlocked = true; }
    }
    canvas.style.display = 'none';
    uiRoot.hidden = true;
    overlay.hidden = false;
    meter.hidden = true;
    status.textContent = (error?.message || '3D 마을을 시작하지 못했어요.')+
      (cleanupFailure ? ' 3D 재시도 전에 새로고침해 주세요. 2D 마을은 이용할 수 있어요.' : ' 다시 시도하거나 2D 마을을 이용해 주세요.');
    console.error('[Village startup]', error);
    if (cleanupFailure) console.error('[Village cleanup]', cleanupFailure);
  } finally { setEntryBusy(false); }
});

const diagnostics = Object.freeze({snapshot:() => Object.freeze({
  featureVersion:'connected-v17-20261014',life:ui.lifeSnapshot?.()??null,
  entryVersion:BUILD_VERSION, mode:liteMode?'2d':instance?'3d':'entry',
  loading:!overlay.hidden, starting, modalOpen:!uiRoot.querySelector('#village-dialog-wrap').hidden,
  learner:Progress.learner(), navigation:ui.navigationSnapshot?.() ?? null,
  commands:commandHistory.map(item => ({...item})), status:status.textContent,
  animals:animalReport?structuredClone(animalReport):null,cloud:cloudSync?.getStatus()??{state:'not-started'},context:ui.currentContext()
})});
window.MagicVillageV17Diagnostics = diagnostics;
window.MagicVillageV15Diagnostics = diagnostics;
window.MagicVillageV16Diagnostics = diagnostics;
// Existing read-only test clients may still inspect the old name.
window.MagicVillageV14Diagnostics = diagnostics;
window.addEventListener('storage',event=>{
  if(event.key==='sparkle-life-v16:'+namespace){ui.refreshLife();sendLifeSnapshot();}
});
window.addEventListener('online',()=>{void cloudSync?.flush();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void cloudSync?.flush();});
