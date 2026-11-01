#!/usr/bin/env node
/** Browser E2E: real 2D quiz completion and the voluntary next-learning loop. */
import assert from 'node:assert/strict';
let playwright;
try {playwright=await import('playwright');}
catch {playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=playwright.chromium?playwright:playwright.default;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const origin=process.env.READABLE_QA_ORIGIN||'http://127.0.0.1:4194';
const errors=[];
try{
 for(const [who,roundSize,viewport] of [
  ['se',3,{width:360,height:740}],
  ['tae',5,{width:768,height:1024}]
 ]){
  const context=await browser.newContext({viewport,locale:'ko-KR',hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(who+': '+error.message));
  await page.route('**/*.supabase.co/**',route=>route.abort());
  try{
   await page.goto(origin+'/village/?who='+who,{waitUntil:'domcontentloaded'});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:25000});
   await page.evaluate(()=>window.SparkleVillageBridge.handle(JSON.stringify({
    action:'START',gameId:'growth-math-1',requestId:'v39-test-start-'+Date.now()
   })));
   for(let i=0;i<roundSize;i++){
    await page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)').first().waitFor({state:'visible',timeout:15000});
    await page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)').first().click();
    await page.locator('#village-ui[data-mode="feedback"] .vh-wide').first().waitFor({state:'visible',timeout:15000});
    await page.locator('#village-ui[data-mode="feedback"] .vh-wide').first().click();
   }
   await page.locator('#village-ui[data-mode="complete"] .vh-next-learning').waitFor({state:'visible',timeout:15000});
   const ctas=page.locator('.vh-completion-actions > button');
   assert.equal(await ctas.count(),2,'Child controls whether to keep studying or rest');
   for(const btn of await ctas.all()){
    const box=await btn.boundingBox();
    const font=await btn.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    assert(box&&box.width>=90&&box.height>=50&&font>=17,'Completion action must remain readable and tappable: '+who+' '+JSON.stringify({box,font,label:await btn.textContent()}));
   }
   await page.locator('.vh-next-learning').click();
   await page.locator('#village-ui[data-mode="adaptive"] .vh-learning-step').first().waitFor({state:'visible',timeout:15000});
   assert((await page.locator('.vh-learning-step').count())>=2,'Learning plan should contain varied next activities');
   const body=await page.locator('.vh-dialog-body').textContent();
   assert(body.includes('오늘의 3걸음'));
   const bounds=await page.locator('#village-dialog-wrap').boundingBox();
   assert(bounds&&bounds.width<=viewport.width+2,'Dialog must remain in viewport');
   console.log('PASS_V39_BROWSER',who,roundSize+' completed answers',viewport.width+'x'+viewport.height,'optional next steps');
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[],'Unexpected browser errors');
 console.log('PASS_REFACTOR_BROWSER_V39: 3/5 real 2D rounds, verified completion, next learning, touch targets, no browser errors');
}finally{await browser.close();}
