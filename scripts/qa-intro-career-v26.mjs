import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const output=path.resolve(process.env.VILLAGE_QA_OUTPUT||'docs/qa-world-v26');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const device of [
  {name:'desktop',width:1440,height:900,isMobile:false},
  {name:'galaxy',width:390,height:844,isMobile:true},
  {name:'tablet',width:768,height:1024,isMobile:true}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},
    hasTouch:device.isMobile,isMobile:device.isMobile,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const nativeClick=HTMLButtonElement.prototype.click;
   window.__programmaticStartClicks=0;
   HTMLButtonElement.prototype.click=function(...args){
    if(this.id==='start')window.__programmaticStartClicks++;
    return nativeClick.apply(this,args);
   };
  });
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle',timeout:45000});
   assert.equal(await page.locator('.entry-learner-choice').count(),2);
   assert.equal(await page.locator('.entry-portal').count(),2);
   assert.equal((await page.locator('.entry-portal-primary strong').innerText()).trim(),'마을 입장');
   assert.equal((await page.locator('.entry-portal-study strong').innerText()).trim(),'학습페이지 입장');
   assert(await page.locator('#world-kst-badge').innerText().then(t=>t.includes('KST')));
   assert(await page.locator('.entry-island-art').evaluate(img=>img.complete&&img.naturalWidth>0));
   await page.locator('.entry-learner-choice[data-learner=se]').click();
   assert.equal(await page.locator('.entry-learner-choice[data-learner=se]').getAttribute('aria-pressed'),'true');
   const villageHref=await page.locator('#entry-village-link').getAttribute('href');
   const learningHref=await page.locator('#entry-learning-link').getAttribute('href');
   assert(villageHref.includes('who=se')&&villageHref.includes('autostart=1'));
   assert(learningHref.endsWith('learning.html?who=se'));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
   assert(!overflow,'Horizontal overflow at landing');
   await page.screenshot({path:path.join(output,device.name+'-immersive-root.png')});

   await page.goto(origin+'/learning.html?who=se&drop=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.body.dataset.learner==='se',null,{timeout:30000});
   assert.equal(new URL(page.url()).search,'','Learning route should consume and normalize who/query params');

   await page.route('**/village/Build/*',route=>route.fulfill({status:404,body:''}));
   await page.goto(origin+'/village/?who=se&autostart=1&garbage=drop',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('3D 웹 빌드를 불러오지 못했어요'),null,{timeout:30000});
   assert.equal(new URL(page.url()).search,'','Village route should strip consumed/unknown params');
   assert.equal(await page.evaluate(()=>window.__programmaticStartClicks),1,'Autostart must programmatically click 3D start exactly once');
   assert.equal(await page.locator('#loading').getAttribute('aria-live'),'polite');
   assert.equal(await page.locator('#learner-choices [data-learner=se]').getAttribute('aria-pressed'),'true');
   assert(await page.locator('#learner-choices').isVisible(),'Failed autostart must restore the entry controls');
   await page.unroute('**/village/Build/*');

   await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(await page.evaluate(()=>window.__programmaticStartClicks),0,'Direct village visit must not autostart');
   assert(await page.locator('#learner-choices').isVisible());
   await page.locator('#learner-choices [data-learner=tae]').click();
   assert(await page.locator('#start').innerText().then(t=>t.includes('마법마을 입장하기')));
   await page.waitForFunction(()=>document.querySelector('#world-kst-badge')?.textContent?.includes('KST'),null,{timeout:15000});
   await page.screenshot({path:path.join(output,device.name+'-game-entry.png')});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'푸른 바다'}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('푸른 바다'),null,{timeout:10000});
   assert((await page.locator('#vh-counter').innerText()).includes('40종'));
   assert.equal(await page.locator('.vh-pond-fish').count(),10);
   const marineImages=page.locator('.vh-pond-fish .vh-fish-art img');
   assert.equal(await marineImages.count(),10);
   for(let i=0;i<await marineImages.count();i++){
    const image=marineImages.nth(i);await image.scrollIntoViewIfNeeded();
    await image.evaluate(img=>img.complete&&img.naturalWidth>0?true:new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Marine art load timeout: '+img.src)),10000);
      img.addEventListener('load',()=>{clearTimeout(timer);resolve(true);},{once:true});
      img.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Marine art failed: '+img.src));},{once:true});
    }));
   }
   for(let p=0;p<3;p++)await page.locator('.vh-water-paging').getByRole('button',{name:/다음/}).click();
   assert(await page.locator('.vh-pond-fish[data-species="reef-shark"]').innerText().then(t=>t.includes('학습을 통해 해금해요')));
   await page.screenshot({path:path.join(output,device.name+'-ocean-entry.png')});
   await page.locator('#vh-exit').click();
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('미래 직업 탐색관'),null,{timeout:10000});
   assert.equal(await page.locator('.career-card').count(),100);
   await page.locator('.career-card[data-career=doctor]').click();
   assert(await page.locator('.career-detail-name').innerText().then(t=>t.includes('의사')));
   await page.locator('.career-bookmark').click();
   await page.waitForFunction(async()=>{
     const c=await import('/village/career-state.js?v=career-v25-20261019');
     return c.careerSnapshot('tae').includes('doctor');
   },null,{timeout:8000});
   assert(await page.locator('.career-bookmark').innerText().then(t=>t.includes('꿈 후보에서 빼기')));
   const selected=await page.evaluate(async()=>{
     const c=await import('/village/career-state.js?v=career-v25-20261019');return c.careerSnapshot('tae');
   });
   assert(selected.includes('doctor'),'Career dream bookmark must persist');
   await page.screenshot({path:path.join(output,device.name+'-career-explorer.png')});
   const ctrl=await page.locator('#village-controls').boundingBox();
   assert(ctrl.x<device.width*.20,'World action bar should be anchored to LEFT, not centered');
   assert(!errors.length,'JS errors '+errors.join('; '));
   results.push({device:device.name,pass:true,careerCards:100,leftControls:ctrl.x,bookmarked:true,
     rootTwoActions:true,learnerFirst:true,learningWhoRoute:true,autostartOnce:true,oceanSpecies:10,
     seasonClock:true,jsErrors:errors});
   console.log('V26_INTRO_AND_CAREER_PASS',JSON.stringify(results.at(-1)));
  }finally{await context.close();}
 }
}finally{
 await browser.close();
 await fs.writeFile(path.join(output,'intro-career-qa.json'),JSON.stringify({origin,pass:results.length===3&&results.every(r=>r.pass),results},null,2)+'\n');
}
console.log('V26_INTRO_AND_CAREER_ALL_PASS');
