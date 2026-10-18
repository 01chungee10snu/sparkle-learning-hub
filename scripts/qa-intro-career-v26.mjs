import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const output=path.resolve('docs/qa-world-v26');
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
  try{
   await page.goto(origin+'/',{waitUntil:'networkidle',timeout:45000});
   assert.equal(await page.locator('.entry-portal').count(),2);
   assert.equal((await page.locator('.entry-portal-primary strong').innerText()).trim(),'마법마을 입장하기');
   assert.equal((await page.locator('.entry-portal-study strong').innerText()).trim(),'학습페이지 가기');
   assert(await page.locator('#world-kst-badge').innerText().then(t=>t.includes('KST')));
   assert(await page.locator('.entry-island-art').evaluate(img=>img.complete&&img.naturalWidth>0));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
   assert(!overflow,'Horizontal overflow at landing');
   await page.screenshot({path:path.join(output,device.name+'-immersive-root.png')});
   await page.locator('.entry-portal-primary').click();
   await page.locator('#learner-choices button[data-learner=tae]').waitFor();
   assert(await page.locator('#start').innerText().then(t=>t.includes('마법마을 입장하기')));
   await page.waitForFunction(()=>document.querySelector('#world-kst-badge')?.textContent?.includes('KST'),null,{timeout:15000});
   await page.screenshot({path:path.join(output,device.name+'-game-entry.png')});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('미래 직업 탐색관'),null,{timeout:10000});
   assert.equal(await page.locator('.career-card').count(),30);
   await page.locator('.career-card[data-career=doctor]').click();
   assert(await page.locator('.career-detail-name').innerText().then(t=>t.includes('의사')));
   await page.locator('.career-bookmark').click();
   await page.waitForFunction(()=>document.querySelector('.career-saved-mark')?.textContent.includes('내 꿈 후보'),null,{timeout:8000});
   const selected=await page.evaluate(async()=>{
     const c=await import('/village/career-state.js?v=career-v25-20261019');return c.careerSnapshot('tae');
   });
   assert(selected.includes('doctor'),'Career dream bookmark must persist');
   await page.screenshot({path:path.join(output,device.name+'-career-explorer.png')});
   const ctrl=await page.locator('#village-controls').boundingBox();
   assert(ctrl.x<device.width*.20,'World action bar should be anchored to LEFT, not centered');
   assert(!errors.length,'JS errors '+errors.join('; '));
   results.push({device:device.name,pass:true,careerCards:30,leftControls:ctrl.x,bookmarked:true,
     rootTwoActions:true,seasonClock:true,jsErrors:errors});
   console.log('V26_INTRO_AND_CAREER_PASS',JSON.stringify(results.at(-1)));
  }finally{await context.close();}
 }
}finally{
 await browser.close();
 await fs.writeFile(path.join(output,'intro-career-qa.json'),JSON.stringify({origin,pass:results.length===3&&results.every(r=>r.pass),results},null,2)+'\n');
}
console.log('V26_INTRO_AND_CAREER_ALL_PASS');
