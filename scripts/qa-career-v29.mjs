import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=playwright.chromium?playwright:playwright.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4187').replace(/\/$/,'');
const output=path.resolve('docs/qa-career-v29');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report=[];
async function enter(page){
 await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:40000});
 await page.locator('#lite').click();
 await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
 await page.locator('#vh-map').click();
 await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
 await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.mode==='career',null,{timeout:12000});
}
try{
 for(const view of [{name:'desktop',width:1366,height:768},{name:'tablet',width:768,height:1024},{name:'galaxy',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},hasTouch:view.name!=='desktop',isMobile:view.name==='galaxy',locale:'ko-KR'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await enter(page);
   assert.equal(await page.locator('.career-card').count(),100);
   assert.equal(await page.locator('.career-card-artwork').count(),100);
   assert.equal(await page.locator('.career-sort').inputValue(),'familiar');
   assert.equal(await page.locator('.career-card').first().getAttribute('data-career'),'career-410');
   assert.equal(await page.locator('.career-card').nth(1).getAttribute('data-career'),'career-395');
   const bounds=await page.locator('.vh-dialog').boundingBox();
   assert(bounds,'Dialog missing');
   assert(bounds.width>=view.width-6,JSON.stringify(bounds));
   assert(bounds.height>=view.height-8,JSON.stringify(bounds));
   await page.locator('.career-card-artwork').first().scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const img=document.querySelector('.career-card-artwork');return img?.complete&&img.naturalWidth>0;},null,{timeout:10000});
   assert((await page.locator('.career-card-artwork').first().evaluate(img=>img.complete&&img.naturalWidth>0)), 'First portrait not loaded');
   await page.screenshot({path:path.join(output,view.name+'-full-career-list.png'),fullPage:false});
   await page.locator('.career-sort').selectOption('wage');
   assert.equal(await page.locator('.career-card').first().getAttribute('data-career'),'ceo');
   await page.locator('.career-sort').selectOption('wageAsc');
   assert.equal(await page.locator('.career-card').first().getAttribute('data-career'),'career-352');
   await page.locator('.career-sort').selectOption('name');
   const name=await page.locator('.career-card-label').first().innerText();
   assert(name.length>0);
   await page.locator('.career-sort').selectOption('familiar');
   await page.locator('.career-card').first().click();
   assert.equal(await page.locator('.career-explorer.career-detail-open').count(),1);
   assert.equal(await page.locator('.career-details.selected').count(),1);
   assert.equal(await page.locator('.career-locked-stat').count(),3);
   assert.equal(await page.locator('.career-detail-artwork').count(),1);
   assert(await page.locator('.career-details').getByText('📚 먼저 알아보는 교육·자격 경로').count()===1);
   assert(await page.locator('.career-details .career-source-link').count()>=2);
   assert.equal(await page.locator('.career-wage-annual').count(),0);
   assert.equal(await page.locator('.career-study-evidence').count(),0);
   assert(await page.locator('.career-card').first().isHidden());
   await page.screenshot({path:path.join(output,view.name+'-career-partially-locked.png'),fullPage:false});
   await page.locator('.career-return-button').last().click();
   assert.equal(await page.locator('.career-explorer.career-detail-open').count(),0);
   assert.equal(await page.locator('.career-card').count(),100);
   assert(!errors.length,errors.join('; '));
   const result={viewport:view.name,pass:true,dialog:{w:Math.round(bounds.width),h:Math.round(bounds.height)},cards:100,first:'career-410',artwork:true,sort:true,lockedPreview:3,freeSources:true,errors};
   report.push(result);console.log('CAREER_V29_BROWSER_PASS',JSON.stringify(result));
  }finally{await context.close()}
 }
}finally{
 await browser.close();
 await fs.writeFile(path.join(output,'career-v29-browser-qa.json'),JSON.stringify({pass:report.length===3&&report.every(x=>x.pass),results:report},null,2)+'\n');
}
console.log('CAREER_V29_ALL_DEVICES_PASS',report.length);
