import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Reuse the existing approved Playwright installation and ONE owned browser.
const imported=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=imported.chromium?imported:imported.default;
const origin=process.env.GAMEPLAY_ORIGIN||'http://127.0.0.1:4189';
const out=process.env.GAMEPLAY_QA_OUTPUT||path.resolve('docs/qa-gameplay-v10');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({
 headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const results=[],jsErrors=[],unexpected=[];
try {
 for(const device of [
  {name:'galaxy-360x740',width:360,height:740},
  {name:'iphone-390x844',width:390,height:844},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'tablet-landscape-1024x768',width:1024,height:768}
 ]) {
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},
   deviceScaleFactor:device.width<500?2:1,hasTouch:true,
   isMobile:device.width<500,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',err=>jsErrors.push(device.name+': '+err.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))unexpected.push(device.name+': '+r.status()+' '+r.url());});
  await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:60000});
  assert.equal(await page.locator('#page > header').count(),0,'no external top bar');
  await page.locator('[data-learner="tae"]').click();
  await page.locator('#lite').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&
   document.querySelector('#loading')?.hidden===true,undefined,{timeout:40000});
  await page.waitForTimeout(300);
  const stats=await page.evaluate(()=>{
   const selectors=['#village-info','#vh-world-shortcuts','#vh-learning-districts','#village-controls','#vh-map','#vh-quest'];
   const rect=id=>{const e=document.querySelector(id);if(!e)return null;
     const style=getComputedStyle(e);if(style.display==='none'||e.hidden)return null;
     const {x,y,width,height}=e.getBoundingClientRect();return {x,y,width,height};};
   const positions=Object.fromEntries(selectors.map(k=>[k,rect(k)]));
   return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
     scrollHeight:document.documentElement.scrollHeight,positions,
     working:document.querySelector('#village-ui').dataset.ready,
     appearance:document.querySelector('#village-ui').dataset.reducedMotion};
  });
  assert(stats.scrollWidth<=stats.width+2,
   device.name+': horizontal overflow '+JSON.stringify(stats));
  assert(stats.scrollHeight<=stats.height+4,
   device.name+': vertical page overflow '+JSON.stringify(stats));
  assert.equal(stats.positions['#vh-learning-districts'],null,'7-item rail must be folded');
  for(const id of ['#vh-map','#vh-quest']){
   const rect=stats.positions[id];assert(rect?.width>=44&&rect?.height>=44,
    device.name+': inaccessible tap '+id+JSON.stringify(rect));
   assert(rect.x>=-1&&rect.x+rect.width<=stats.width+2&&rect.y>=-1&&
     rect.y+rect.height<=stats.height+2,device.name+': offscreen '+id);
  }
  const a=stats.positions['#village-info'],b=stats.positions['#vh-world-shortcuts'];
  if(a&&b){const intersection=(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
   (Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
   const overlap=Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+3 &&
     Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+3;
   assert(!overlap,device.name+': small HUD overlaps map controls');
  }
  await page.screenshot({path:path.join(out,device.name+'-world.png')});

  await page.locator('#vh-map').click();
  await page.waitForFunction(()=>document.querySelectorAll('.vh-story-card').length===8);
  assert.equal(await page.locator('.vh-story-card').count(),8,'eight districts story map');
  const mapTitle=await page.locator('#vh-title').textContent();
  assert(mapTitle.includes('모험 지도'));
  await page.screenshot({path:path.join(out,device.name+'-story-map.png')});
  const selected=page.locator('.vh-story-card').filter({hasText:'별빛 길 밝히기'});
  await selected.locator('.vh-story-go').click();
  await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('별빛 길'));
  assert.equal(await page.locator('.vh-story-option').count(),2);
  await page.screenshot({path:path.join(out,device.name+'-choice.png')});

  const before=await page.locator('#vh-stars').textContent();
  await page.locator('.vh-story-option').first().click();
  await page.waitForFunction(()=>document.querySelector('.vh-story-bridge')?.textContent.includes('숲길부터') &&
   document.querySelector('.vh-mission-card'),undefined,{timeout:20000});
  const after=await page.locator('#vh-stars').textContent();
  assert.equal(after,before,'story navigation cannot award stars');
  assert((await page.locator('.vh-story-bridge').textContent()).includes('숲길부터'));
  await page.screenshot({path:path.join(out,device.name+'-learning-link.png')});
  await page.locator('#vh-exit').click();
  assert(await page.locator('#village-dialog-wrap').isHidden(),'quit story safely');

  await page.locator('#vh-more').click();
  const reduce=page.locator('#vh-motion');
  assert(await reduce.isVisible(),'reduced-motion setting available');
  await reduce.click();
  assert.equal(await page.locator('#village-ui').getAttribute('data-reduced-motion'),'false');
  await reduce.click();
  assert.equal(await page.locator('#village-ui').getAttribute('data-reduced-motion'),'true');
  // The fresh browser context has no shared or real child profile; no production
  // learning data is written by this UX inspection.
  results.push({device:device.name,pass:true,stats,
    mapStories:8,chosen:'lantern-road',walletUntouched:before===after,
    focusSafe:await page.locator('#vh-quest').isVisible()});
  await context.close();
 }
 assert.deepEqual(jsErrors,[],'unhandled JS errors');
 assert.deepEqual(unexpected,[],'missing or invalid assets');
 await fs.writeFile(path.join(out,'RESULT.json'),JSON.stringify({
  status:'PASS',verifiedAt:new Date().toISOString(),
  mode:'incognito-lite-with-real-host',origin,results,jsErrors,unexpected
 },null,2)+'\n');
 console.log('GAMEPLAY_V10_BROWSER_QA_PASS '+JSON.stringify(results.map(x=>x.device)));
} finally {
 await browser.close();
}
