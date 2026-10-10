import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const origin=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4191';
const output='/Users/01chungee10/AI-Interop/evidence/sparkle-major-v1-20261010/webgl-final';
await mkdir(output,{recursive:true});
const pm=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pm.chromium?pm:pm.default;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];
try{
 for(const learner of [{id:'tae',width:1280,height:800},{id:'se',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:learner.width,height:learner.height},locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/village/',{waitUntil:'networkidle'});
   await page.evaluate(async id=>{const P=await import('/platform/progress.js');P.selectLearner(id);},learner.id);
   await page.locator('#start').click();
   await page.waitForFunction(()=>document.querySelector('#loading').hidden,undefined,{timeout:180000});
   await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:30000});
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),learner.id);
   await page.locator('#vh-shop').click();
   await page.getByRole('heading',{name:/별빛 마법상점/}).waitFor({timeout:15000});
   assert(await page.locator('.vh-shop-item').count()>0);
   await page.locator('#vh-exit').click();
   await page.locator('#vh-adaptive').click();
   await page.getByRole('heading',{name:/마법 수정구슬/}).waitFor({timeout:15000});
   assert(await page.locator('.vh-route').count()>0);
   await page.locator('#vh-exit').click();
   await page.locator('#vh-bebsu').click();
   await page.getByRole('heading',{name:/벡수 수학 경시대회/}).waitFor({timeout:15000});
   assert.equal(await page.locator('.vh-challenge-select').first().locator('option').count(),9);
   await page.getByRole('button',{name:/1번 문제부터 시작/}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-counter').textContent==='1 / 25',undefined,{timeout:15000});
   await page.waitForFunction(()=>{
     const image=document.querySelector('.vh-original-image');return image&&image.complete&&image.naturalWidth>0;
   },undefined,{timeout:12000});
   const filepath=path.join(output,'real-'+learner.id+'.png');
   await page.screenshot({path:filepath});
   results.push({learner:learner.id,pass:true,shop:true,IRT:true,KMA25:true,sourceImage:true,capture:filepath});
  }finally{await context.close();}
 }
}finally{await browser.close();}
const receipt={createdAt:new Date().toISOString(),results,errors,pass:results.length===2&&!errors.length};
await writeFile(path.join(output,'result.json'),JSON.stringify(receipt,null,2));
console.log(receipt.pass?'PASS':'FAIL','final native Unity WebGL v0.5.0: shop + IRT adaptive + KMA 25 original figure for two learners, pageErrors',errors.length);
if(!receipt.pass)process.exitCode=1;
