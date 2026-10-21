#!/usr/bin/env node
/** Real UI + host/storage integration. All profiles are synthetic, in a new
 * temporary browser context. No existing browser profile or cloud login is used.
 *
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.js
 * CHROME_PATH=/absolute/path/to/Chrome
 * VILLAGE_QA_ORIGIN=http://127.0.0.1:4199
 * VILLAGE_QA_OUTPUT=/tmp/sparkle-pond-v34-qa
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let playwright;
if(process.env.PLAYWRIGHT_MODULE)playwright=await import(process.env.PLAYWRIGHT_MODULE);
else{
 try{playwright=await import('playwright');}
 catch{playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
}
const {chromium}=playwright.chromium?playwright:playwright.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4199').replace(/\/$/,'');
const allowedOrigin=new URL(origin).origin;
const out=path.resolve(process.env.VILLAGE_QA_OUTPUT||path.join(os.tmpdir(),'sparkle-pond-v34-'+new Date().toISOString().replace(/[:.]/g,'-')));
await fs.mkdir(out,{recursive:true});
const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const results=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Poll with Node time, because the page's clock is intentionally paused.
async function until(page,predicate,arg,label,timeout=15000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  if(await page.evaluate(predicate,arg))return;
  await sleep(40);
 }
 throw Error('Timed out: '+label);
}
async function ready(page,who){
 await until(page,who=>document.querySelector('#village-ui')?.dataset.ready==='true'&&document.querySelector('#village-ui')?.dataset.who===who,who,'Lite village ready',45000);
}
async function enter(page,who,{reload=false}={}){
 if(reload)await page.reload({waitUntil:'domcontentloaded',timeout:45000});
 else await page.goto(origin+'/village/?who='+who,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#lite').click();await ready(page,who);
 await page.locator('#vh-pond').click();
 await until(page,()=>Boolean(document.querySelector('.pond-experience')&&document.querySelector('#village-ui')?.dataset.mode==='pond'),null,'Pond UI ready');
}
async function running(page,expected){
 await until(page,expected=>document.querySelector('.pond-experience')?.dataset.state===(expected?'active':'paused'),expected,'Pond '+(expected?'active':'paused'));
}
async function advance(page,ms){
 // runFor executes every timer (unlike fastForward, which models sleep). Each
 // short step lets the host's serialized async mutations finish before another.
 while(ms>0){const step=Math.min(1000,ms);await page.clock.runFor(step);await page.evaluate(()=>Promise.resolve());ms-=step;}
}
async function pondState(page,who){
 return page.evaluate(async who=>{
  const Pond=await import('../platform/pond-session.js');
  const Resources=await import('../platform/resource-economy.js');
  const catalog=await fetch('../games/catalog.json').then(r=>r.json());
  const status=Pond.status(who,{catalog}),wallet=Resources.wallet(catalog,who);
  return {status,resources:Resources.exportResources(),wallet:{available:wallet.available,spent:wallet.spent,pondAward:wallet.pondAward},state:Pond.exportPond()};
 },who);
}
async function stopButton(page){
 const button=page.locator('.pond-interactions').getByRole('button',{name:/잠깐 쉬기/});
 await button.scrollIntoViewIfNeeded();await button.click();await running(page,false);
}
async function startButton(page){
 const button=page.locator('.pond-pause-actions .pond-primary');
 await button.scrollIntoViewIfNeeded();await button.click();await running(page,true);
}
async function screenshot(page,name){
 const file=path.join(out,name+'.png');await page.screenshot({path:file,fullPage:false,animations:'disabled'});return file;
}
async function verifyLayout(page,label){
 const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
  touch:[...document.querySelectorAll('.pond-button')].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
 assert(layout.scrollWidth<=layout.width+3,label+': horizontal overflow');
 assert(layout.touch.every(b=>b.width>=40&&b.height>=44),label+': touch controls are too small');
 return layout;
}
async function question(page){
 await until(page,()=>document.querySelector('#village-ui')?.dataset.mode==='question',null,'Guided question');
 return page.evaluate(async()=>{
  const root=document.querySelector('#village-ui'),gameId=root.dataset.gameId,itemId=root.dataset.questionId;
  if(!gameId||!itemId)throw Error('Question identity is absent: add dataset.gameId / dataset.questionId in showQuestion()');
  const catalog=await fetch('../games/catalog.json').then(r=>r.json());
  const entry=catalog.find(g=>g.id===gameId);if(!entry)throw Error('Unknown displayed game');
  const game=await fetch(new URL('../'+entry.source.replace(/^\.\//,''),location.href)).then(r=>r.json());
  const item=game.questions.find(q=>q.id===itemId);if(!item)throw Error('Unknown displayed question');
  const mode=item.interaction?.type||'choice',i=item.interaction;
  let wrong;
  if(mode==='choice')wrong=(item.answer+1)%item.choices.length;
  else if(mode==='build'||mode==='numeric'){
   const min=i.min??0;wrong=i.target===min?min+1:min;
   if(wrong>i.max)throw Error('Question has no valid incorrect numeric response');
   if(mode==='numeric')wrong=String(wrong);
  }else{wrong=[...(mode==='match'?i.pairs:i.order)];[wrong[0],wrong[1]]=[wrong[1],wrong[0]];}
  const Activities=await import('../platform/activities.js');
  if(Activities.gradeResponse(item,wrong).correct)throw Error('Synthetic answer must be incorrect');
  return {gameId,itemId,subject:game.subject,mode,wrong};
 });
}
async function answerWrong(page,q){
 if(q.mode==='choice'){
  const options=page.locator('.vh-options > button, .vh-spatial-gates > button');
  await options.nth(q.wrong).click();
 }else if(q.mode==='numeric'){
  for(const char of String(q.wrong)){
   if(char==='-')await page.locator('.vh-number-sign').click();
   else await page.locator('.vh-number-key[data-key="'+char+'"]').click();
  }
  await page.locator('.vh-number-submit').click();
 }else if(q.mode==='build'){
  const plus=page.locator('.vh-spatial-add, .vh-stepper[aria-label="하나 늘리기"]');
  for(let i=0;i<q.wrong;i++)await plus.click();
  await page.getByRole('button',{name:/이만큼 (담았어요|모았어요)/}).click();
 }else{
  const selects=page.locator('.vh-pair select');
  assert.equal(await selects.count(),q.wrong.length,'All sequence/memory/match positions should be reachable');
  for(let i=0;i<q.wrong.length;i++)await selects.nth(i).selectOption(String(q.wrong[i]));
  await page.getByRole('button',{name:/모두 연결했어요/}).click();
 }
 await until(page,()=>document.querySelector('#village-ui')?.dataset.mode==='feedback',null,'Incorrect-answer feedback');
 assert.match(await page.locator('#vh-title').innerText(),/다시 생각/);
}

try{
 for(const device of [
  {name:'small-phone',width:320,height:568,who:'se',items:3,subjects:2,maxMs:180000,motion:'no-preference'},
  {name:'galaxy',width:390,height:844,who:'tae',items:5,subjects:3,maxMs:300000,motion:'no-preference'},
  {name:'tablet',width:768,height:1024,who:'se',items:3,subjects:2,maxMs:180000,motion:'reduce'}
 ]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:true,hasTouch:true,locale:'ko-KR',reducedMotion:device.motion,serviceWorkers:'block'});
  const errors=[],httpErrors=[],blockedExternal=[];
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===allowedOrigin||['data:','blob:'].includes(url.protocol))return route.continue();
   blockedExternal.push(url.origin+url.pathname);return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===allowedOrigin)httpErrors.push({status:response.status(),url:response.url()});});
  const result={device:device.name,who:device.who,pass:false,screenshots:[],checks:[],errors,httpErrors,blockedExternal};
  try{
   await page.clock.install({time:new Date(Date.now()-86400000)});
   await enter(page,device.who);
   await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+100)));
   await running(page,false);
   assert.match(await page.locator('.pond-cost').innerText(),/1분마다.*1개/);
   assert.match(await page.locator('.pond-pause-actions .pond-primary').innerText(),/함께 보기 시작/);
   assert(await page.locator('.pond-swimmer').first().isDisabled());
   const before=await pondState(page,device.who);assert.equal(before.status.activeMs,0,'A stopped preview must be free');
   await advance(page,2500);const still=await pondState(page,device.who);assert.equal(still.status.activeMs,0);
   result.layout=await verifyLayout(page,device.name);

   const art=await page.evaluate(async()=>{
    const Resources=await import('../platform/resource-economy.js');
    const visible=[...document.querySelectorAll('.pond-scene-art,.pond-swimmer img')];
    await Promise.all(visible.map(image=>image.decode()));
    const species=Resources.FISH_SPECIES.filter(f=>f.world==='pond');
    const dimensions=await Promise.all(species.map(async f=>{
     const image=new Image();image.src=f.art;await image.decode();
     return {id:f.id,width:image.naturalWidth,height:image.naturalHeight};
    }));
    return {scene:visible[0].naturalWidth,dimensions};
   });
   assert(art.scene>=1000,'Original pond background must decode at high resolution');
   assert.equal(art.dimensions.length,24);assert(art.dimensions.every(a=>a.width>=100&&a.height>=100),'All 24 pond originals must decode');
   result.art=art;result.checks.push('stopped preview and stated cost','24 pond originals + landscape decode');
   result.screenshots.push(await screenshot(page,device.name+'-preview'));

   await startButton(page);await advance(page,400);
   await page.locator('.pond-swimmer').first().click();
   assert.match(await page.locator('.pond-response').innerText(),/꼬리.*인사/);
   assert.equal(await page.locator('.pond-swimmer').first().getAttribute('data-reaction'),'hello');
   await page.locator('.pond-interactions').getByRole('button',{name:/물결 따라오기/}).click();
   const scene=page.locator('.pond-scene'),rect=await scene.boundingBox();assert(rect);
   await scene.click({position:{x:rect.width*.82,y:rect.height*.27}});
   assert.match(await page.locator('.pond-response').innerText(),/물결을 따라/);
   assert.equal(await page.locator('.pond-swimmer[data-reaction="follow"]').count(),1);
   assert.equal(await page.locator('.pond-scene').getAttribute('data-motion'),device.motion==='reduce'?'reduced':'full');
   await advance(page,1300);result.checks.push('greeting and following responses','motion preference respected');
   result.screenshots.push(await screenshot(page,device.name+'-interaction'));

   // Observe without clicking for 61 seconds. The view, ray animation and
   // billing must really stop at the idle pause, rather than becoming free play.
   await advance(page,61000);await running(page,false);
   const idle=await pondState(page,device.who);
   const pose=await page.locator('.pond-swimmer').first().evaluate(el=>({left:el.style.left,top:el.style.top,transform:el.style.transform}));
   assert(await page.locator('.pond-light-rays').evaluate(el=>{const s=getComputedStyle(el);return s.animationPlayState==='paused'||s.animationName==='none';}),
    'Light animation must pause or be disabled by reduced-motion preference');
   await advance(page,10000);
   const afterIdle=await pondState(page,device.who);
   assert.equal(afterIdle.status.activeMs,idle.status.activeMs,'Idle time must not accrue');
   assert.deepEqual(afterIdle.wallet.spent,idle.wallet.spent,'Idle state must not spend resources');
   assert.deepEqual(await page.locator('.pond-swimmer').first().evaluate(el=>({left:el.style.left,top:el.style.top,transform:el.style.transform})),pose,'Idle fish must actually stop moving');
   result.checks.push('60-second idle pauses animation and spending');

   // Seed only a near-limit visit counter via the production merge API. The
   // final seconds, charging, stop and learning redirect run through the UI.
   const seeded=await page.evaluate(async({who,maxMs})=>{
    const Pond=await import('../platform/pond-session.js'),Resources=await import('../platform/resource-economy.js');
    const state=Pond.exportPond(),p=state.profiles[who],number=Math.max(...Object.keys(p.cycles).map(Number)),cycle=p.cycles[number];
    const used=Object.values(cycle.visits).reduce((n,v)=>n+v.ms,0);
    const catalog=await fetch('../games/catalog.json').then(r=>r.json());
    const target=maxMs/60000-Math.floor(used/60000);
    // One-unit synthetic visit receipts leave the wallet exactly empty at the
    // cap, so the all-wrong path must exercise an actual participation top-up.
    for(const location of ['plaza','garden','ocean','shop','kma','practice']){
     const wallet=Resources.wallet(catalog,who);
     if(Object.values(wallet.available).reduce((n,v)=>n+v,0)>=target)break;
     Resources.awardFirstVisit(location,who);
    }
    cycle.visits['qa-near-limit']={ms:Math.max(0,maxMs-2000-used),at:Date.now()};Pond.importPond(state);
    return cycle.id;
   },device);
   await startButton(page);await advance(page,3500);await running(page,false);
   const exhausted=await pondState(page,device.who);
   assert.equal(exhausted.status.activeMs,device.maxMs);assert.equal(exhausted.status.allowed,false);
   assert.equal(exhausted.status.reason,'time-limit');assert.equal(exhausted.status.cycleId,seeded);
   assert.equal(exhausted.status.resourceTotal,0,'The synthetic fixture should exhaust its exact visit budget');
   assert.equal(exhausted.status.learning.total,device.items);assert.equal(exhausted.status.learning.minSubjects,device.subjects);
   assert.match(await page.locator('.pond-pause-actions .pond-primary').innerText(),/배움 산책 시작/);
   result.screenshots.push(await screenshot(page,device.name+'-time-limit'));
   result.checks.push('max time stops play and offers a mixed learning walk');

   await page.locator('.pond-pause-actions .pond-primary').click();
   const answers=[];
   for(let i=0;i<device.items;i++){
    const q=await question(page);assert(!answers.some(a=>a.gameId===q.gameId&&a.itemId===q.itemId),'Guided items must be new and distinct');
    answers.push(q);await answerWrong(page,q);
    const record=await page.evaluate(async({who,gameId,itemId})=>{
     const Progress=await import('../platform/progress.js');
     return Progress.gameProgress(gameId,who).records[itemId]?.firstAttempt;
    },{who:device.who,...q});
    assert.equal(record?.correct,false,'The actual first-attempt log must preserve the incorrect answer');
    if(i===device.items-1)result.screenshots.push(await screenshot(page,device.name+'-learning-complete-feedback'));
    await page.getByRole('button',{name:i===device.items-1?/연못에 다시 가기/:/다음 이야기/}).click();
   }
   assert.equal(new Set(answers.map(q=>q.gameId+':'+q.itemId)).size,device.items);
   assert(new Set(answers.map(q=>q.subject)).size>=device.subjects,'Required subject distribution must be met');
   assert(answers.every((q,i)=>i===0||q.subject!==answers[i-1].subject),'The guided walk should alternate available subjects');
   await until(page,()=>document.querySelector('#village-ui')?.dataset.mode==='pond-learning-complete',null,'Learning walk complete');
   await page.getByRole('button',{name:/연못으로 돌아가기/}).click();
   await running(page,false);
   const restored=await pondState(page,device.who);
   assert.equal(restored.status.allowed,true);assert.equal(restored.status.activeMs,0);
   assert.equal(restored.status.remainingMs,device.maxMs);assert.notEqual(restored.status.cycleId,seeded);
   assert(restored.status.resourceTotal>=device.maxMs/60000,'All-wrong participation should still prepare a complete next visit');
   const refill=restored.resources.profiles[device.who].pondRefills[seeded];
   assert.equal(Object.values(refill.cost).reduce((n,v)=>n+v,0),device.maxMs/60000,'The zero-funds, all-wrong cycle must receive its full participation top-up exactly once');
   result.answers=answers.map(({gameId,itemId,subject,mode})=>({gameId,itemId,subject,mode,firstCorrect:false}));
   result.checks.push('all-wrong first attempts recorded','fresh questions across required subjects','participation restores a full next visit');

   await startButton(page);await advance(page,1250);await stopButton(page);
   const persisted=await pondState(page,device.who);
   assert(persisted.status.activeMs>=1250,'The partial last tick should be preserved on pause');
   // Resume the browser clock for loading, then pause again after navigation.
   await page.clock.resume();await enter(page,device.who,{reload:true});
   await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now()+100)));
   const reloaded=await pondState(page,device.who);
   assert.equal(reloaded.status.cycleId,persisted.status.cycleId);
   assert.equal(reloaded.status.activeMs,persisted.status.activeMs,'Reload must not refund the previous partial visit');
   result.checks.push('reload retains spent time including partial seconds');

   // Native Web Locks are shared across actual same-origin tabs. Bring the
   // first tab to front and resume it; a second tab's public session API must
   // deny an overlapping visit even if its document is currently hidden.
   if(device.name==='galaxy'){
    const other=await context.newPage();other.on('pageerror',e=>errors.push('second tab: '+e.message));
    await other.clock.install({time:new Date(await page.evaluate(()=>Date.now()))});
    await enter(other,device.who);await page.bringToFront();
    await startButton(page);
    const conflict=await other.evaluate(async who=>{
     const Pond=await import('../platform/pond-session.js');
     const catalog=await fetch('../games/catalog.json').then(r=>r.json());
     const visit=await Pond.openVisit(who,{catalog});const result={allowed:visit.allowed,reason:visit.status.reason};
     Pond.closeVisit(visit);return result;
    },device.who);
    assert.equal(conflict.allowed,false);assert.equal(conflict.reason,'another-tab');
    await stopButton(page);await other.close();result.checks.push('second-tab native lock denies duplicate active visit');
   }
   await verifyLayout(page,device.name+' final');
   assert.equal(errors.length,0,'Browser exceptions: '+errors.join('; '));
   assert.equal(httpErrors.length,0,'Missing local assets: '+JSON.stringify(httpErrors));
   result.pass=true;
   console.log('PASS_POND_V34 '+JSON.stringify({device:device.name,checks:result.checks,subjects:[...new Set(result.answers.map(a=>a.subject))]}));
  }catch(error){
   result.failure=String(error?.stack||error);
   try{result.screenshots.push(await screenshot(page,device.name+'-failure'));}catch{}
   console.error('FAIL_POND_V34 '+device.name+' '+result.failure);
  }finally{
   results.push(result);await context.close();
   await fs.writeFile(path.join(out,'pond-v34-qa.json'),JSON.stringify({pass:results.every(r=>r.pass),origin,results},null,2)+'\n');
  }
 }
 assert(results.every(r=>r.pass),'Pond browser QA failed; see '+path.join(out,'pond-v34-qa.json'));
 console.log('PASS_POND_V34_ALL '+JSON.stringify({devices:results.length,output:out}));
}finally{await browser.close();}
