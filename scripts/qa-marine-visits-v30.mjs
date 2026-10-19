import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4197').replace(/\/$/,'');
const out=path.resolve(process.env.VILLAGE_QA_OUTPUT||'docs/qa-marine-v30/browser');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const summary=[];
try{
 for(const device of [{id:'desktop',width:1440,height:900},{id:'galaxy',width:390,height:844},{id:'tablet',width:768,height:1024}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'ko-KR',isMobile:device.id!=='desktop',hasTouch:device.id!=='desktop',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  try{
   await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#learner-choices [data-learner=tae]').click();
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:40000});
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),'tae');
   const base=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-subject-resources-v1')));
   assert(base.profiles.tae.visitBonuses.home,'Home must grant exactly once on INIT');
   assert.equal(Object.keys(base.profiles.tae.visitBonuses).length,1);
   assert(await page.locator('#vh-first-visit').innerText().then(t=>t.includes('첫 방문 선물')));
   await page.locator('#vh-ocean').click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('푸른 바다'),null,{timeout:10000});
   assert((await page.locator('#vh-counter').innerText()).includes('40종'));
   assert.equal(await page.locator('.vh-pond-fish').count(),10);
   assert.equal(await page.locator('.vh-water-filter').count(),3);
   assert.equal(await page.locator('#village-ui .vh-water-paging').count(),1);
   const images=page.locator('.vh-pond-fish .vh-fish-art img');
   await images.evaluateAll(async images=>{
    await Promise.all(images.map(async img=>{img.loading='eager';await img.decode().catch(()=>{});}));
   });
   assert(await images.evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>50)),'All first-page original marine artworks must decode');
   await page.screenshot({path:path.join(out,device.id+'-marine-40-v30.png')});
   const paging=page.locator('.vh-water-paging');
   for(let i=0;i<3;i++)await paging.getByRole('button',{name:/다음/}).click();
   assert.equal(await page.locator('.vh-pond-fish').count(),10);
   assert((await paging.innerText()).includes('4 / 4'));
   await page.locator('.vh-water-filter').filter({hasText:'보유'}).click();
   assert.equal(await page.locator('.vh-pond-fish').count(),0,'Ocean must not award a wild animal on visit alone');
   await page.locator('.vh-water-filter').filter({hasText:'전체'}).click();
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-subject-resources-v1')));
   assert(before.profiles.tae.visitBonuses.ocean,'Ocean must have a receipt on first real visit');
   await page.locator('#vh-exit').click();
   await page.locator('#vh-ocean').click();
   const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-subject-resources-v1')));
   assert.deepEqual(after.profiles.tae.visitBonuses.ocean,before.profiles.tae.visitBonuses.ocean,'Repeat visits must not mint again');
   await page.locator('#vh-exit').click();
   await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#learner-choices [data-learner=se]').click();
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&document.querySelector('#village-ui')?.dataset.who==='se',null,{timeout:40000});
   const sibling=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-subject-resources-v1')));
   assert(sibling.profiles.se.visitBonuses.home);
   assert.equal(Object.keys(sibling.profiles.se.visitBonuses).length,1);
   assert(sibling.profiles.tae.visitBonuses.ocean,'Other child must preserve first child records');
   assert(!errors.length,'JS errors: '+errors.join('; '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
   assert(!overflow,'Horizontal overflow');
   summary.push({device:device.id,pass:true,waterSpecies:40,firstVisitReceipts:{tae:Object.keys(sibling.profiles.tae.visitBonuses).length,se:1},errors});
   console.log('VISIT_MARINE_V30_PASS '+JSON.stringify(summary.at(-1)));
  }finally{await context.close();}
 }
 await fs.writeFile(path.join(out,'visit-marine-qa.json'),JSON.stringify({pass:true,summary},null,2)+'\n');
 console.log('VISIT_MARINE_V30_ALL_PASS '+summary.length);
}finally{await browser.close();}
