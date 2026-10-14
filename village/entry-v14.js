import { createVillageHost } from './village-bridge.js?v=production-v14-20261014';
import * as Progress from '../platform/progress.js';
import { createVillageUI } from './village-ui.js?v=production-v14-20261014';

const BUILD_VERSION = 'production-v14-20261014';
const status = document.querySelector('#status');
const overlay = document.querySelector('#loading');
const canvas = document.querySelector('#canvas');
const start = document.querySelector('#start');
const lite = document.querySelector('#lite');
const liteScene = document.querySelector('#lite-village-scene');
let liteMode = false;
for(const control of document.querySelectorAll('[data-learner]')){
 control.addEventListener('click',()=>{
   if(start.disabled)return;
   Progress.selectLearner(control.dataset.learner);
   document.querySelectorAll('[data-learner]').forEach(button=>
     button.setAttribute('aria-pressed',String(button===control)));
 });
 control.setAttribute('aria-pressed',String(control.dataset.learner===Progress.learner()));
}
const meter = document.querySelector('#meter');
const bar = document.querySelector('#bar');
let instance = null;
const queued = [];
let queuedCosmetics = null;
let queuedGarden = null;
const uiRoot = document.querySelector('#village-ui');
const ui = createVillageUI({
  root:uiRoot,
  sendToUnity: command => {
    if(instance)return instance.SendMessage('VillageRuntime','OnUiCommand',command);
    // Lightweight mode runs the same host-owned questions, wallet and garden;
    // its 2D scene does not pretend to support free-roam locomotion.
    if(liteMode && command==='START_RECOMMENDED')
      return host.handle(JSON.stringify({action:'AREA_OPEN',district:'math',requestId:'lite-'+Date.now()}));
  },
  sendRequest: request => host.handle(JSON.stringify(request))
});
const deliver = message => {
  ui.update(message);
  // The lightweight renderer has no Unity runtime to acknowledge a finished
  // round. Use the same host-verified, duplicate-protected completion route.
  if(liteMode && message?.ok && message.action==='NEXT' && message.finished &&
     message.roundId && message.gameId){
    queueMicrotask(()=>void host.handle(JSON.stringify({action:'COMPLETE_WORLD',
      requestId:'lite-complete-'+message.roundId,gameId:message.gameId,roundId:message.roundId})));
  }
  if(message?.ok && message.cosmetics){
    const wear=JSON.stringify(message.cosmetics);
    if(instance)instance.SendMessage('VillageRuntime','OnCosmeticsMessage',wear);
    else queuedCosmetics=wear;
  }
  const payload = JSON.stringify(message);
  if (instance) instance.SendMessage('VillageRuntime', 'OnBridgeMessage', payload);
  else if(!liteMode) queued.push(payload);
  if(message?.ok && message.garden) {
    const garden=JSON.stringify(message.garden);
    if(instance)instance.SendMessage('VillageRuntime','OnGardenMessage',garden);
    else queuedGarden=garden;
  }

};
const host = createVillageHost(deliver);
window.SparkleVillageBridge = {handle: raw => host.handle(raw)};

async function discoverBuild() {
  for (const name of ['WebGL', 'sparkle-fairy-village']) {
    const loaderUrl = './Build/' + name + '.loader.js?v=' + BUILD_VERSION;
    try {
      const result = await fetch(loaderUrl, {method:'HEAD', cache:'no-store'});
      if (result.ok) return {name, loaderUrl};
    } catch { /* other filename or not built yet */ }
  }
  return null;
}
function script(url) {
  return new Promise((resolve, reject) => {
    if(typeof window.createUnityInstance === 'function'){resolve();return;}
    const el = document.createElement('script');
    el.src = url;
    el.onload = resolve;
    el.onerror = () => {el.remove();reject(new Error('Unity 로더를 불러오지 못했어요.'));};
    document.head.appendChild(el);
  });
}
lite.addEventListener('click',async()=>{
  lite.disabled=true;
  start.disabled=true;
  try{
    status.textContent='가벼운 학습 마을을 준비하는 중이에요.';
    await host.prepare();
    liteMode=true;
    liteScene.hidden=false;
    canvas.style.display='none';
    uiRoot.dataset.lite='true';
    uiRoot.querySelector('#vh-help').textContent='학습 지역을 눌러 수학·국어·영어로 이동해요.';
    const questControl=uiRoot.querySelector('#vh-quest');
    questControl.setAttribute('aria-label','추천하는 이야기 모험 열기');
    uiRoot.hidden=false;
    overlay.hidden=true;
    await host.handle(JSON.stringify({action:'INIT',requestId:'lite-initial'}));
  }catch(error){
    status.textContent='가벼운 마을을 불러오지 못했어요. '+(error?.message||'');
    liteMode=false;liteScene.hidden=true;uiRoot.hidden=true;overlay.hidden=false;
    lite.disabled=false;start.disabled=false;
  }
});
start.addEventListener('click', async () => {
  start.disabled = true;
  lite.disabled = true;
  try {
    status.textContent = '기존 학습 기록을 확인하는 중이에요.';
    await host.prepare();
    const build = await discoverBuild();
    if (!build) {
      status.textContent = '3D 웹 빌드가 없어요. 2D 마을에서 같은 학습 기록으로 계속할 수 있어요.';
      start.disabled = false;
      lite.disabled = false;
      return;
    }
      status.textContent = '마법마을과 여러 학습 지역을 불러오는 중이에요.';
    meter.hidden = false;
    await script(build.loaderUrl);
    if (typeof createUnityInstance !== 'function')
      throw new Error('Unity 실행 모듈을 찾지 못했어요.');
    const base = './Build/' + build.name;
    const compressed = await fetch(base + '.data.unityweb',{method:'HEAD'}).then(r=>r.ok).catch(()=>false);
    const suffix=compressed ? '.unityweb' : '';
    canvas.style.display = 'block';
    instance = await createUnityInstance(canvas, {
      dataUrl: base + '.data' + suffix + '?v=' + BUILD_VERSION,
      frameworkUrl: base + '.framework.js' + suffix + '?v=' + BUILD_VERSION,
      codeUrl: base + '.wasm' + suffix + '?v=' + BUILD_VERSION,
      streamingAssetsUrl: 'StreamingAssets',
      companyName: 'Family Learning',
      productName: 'Sparkle Fairy Village',
      productVersion: '0.14.0-production-v14'
    }, progress => {
      bar.style.width = Math.round(progress * 100) + '%';
      status.textContent = '마법마을 로딩 ' + Math.round(progress * 100) + '%';
    });
    // Honour the learner's reduced-motion setting after WebGL finishes loading.
    ui.syncMotion();
    for (const payload of queued.splice(0))
      instance.SendMessage('VillageRuntime', 'OnBridgeMessage', payload);
    if(queuedCosmetics){
      instance.SendMessage('VillageRuntime','OnCosmeticsMessage',queuedCosmetics);
      queuedCosmetics=null;
    }
    if(queuedGarden){instance.SendMessage('VillageRuntime','OnGardenMessage',queuedGarden);queuedGarden=null;}
    // Restore the current learner's free cosmetic variation after INIT.
    ui.syncAvatarStyle();
    overlay.hidden = true;
    uiRoot.hidden = false;
  } catch (error) {
    const orphan = instance;
    instance = null;
    let cleanupFailure = null;
    if(orphan && typeof orphan.Quit === 'function'){
      try { await orphan.Quit(); } catch (quitError) { cleanupFailure = quitError; }
    }
    canvas.style.display = 'none';
    meter.hidden = true;
    start.disabled = false;
    lite.disabled = false;
    status.textContent = '3D 마을을 시작하지 못했어요. 2D 마을을 이용하거나 다시 시도해 주세요. ' + (error?.message || '') +
      (cleanupFailure ? ' 이전 3D 실행을 정리하지 못했으니 화면을 새로고침해 주세요.' : '');
    if(cleanupFailure)start.disabled=true;
    console.error('[Village]', error);
    if(cleanupFailure)console.error('[Village cleanup]', cleanupFailure);
  }
});
// Diagnostic hooks expose state only, never questions, student records or wallet mutations.
window.MagicVillageV14Diagnostics = Object.freeze({
  snapshot: () => Object.freeze({
    mode: liteMode?'2d':instance?'3d':'entry',
    loading: !overlay.hidden,
    modalOpen: !uiRoot.querySelector('#village-dialog-wrap').hidden,
    learner: Progress.learner(),
    status: status.textContent
  })
});
