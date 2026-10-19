import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4196').replace(/\/$/,'');
const output=path.resolve('docs/qa-unity-marine-v25');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const device of [{name:'desktop',width:1280,height:800},{name:'galaxy',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/village/?who=tae&autostart=1',{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:175000});
   const isCanvasVisible=await page.locator('#canvas').isVisible();
   assert(isCanvasVisible,'New Unity WebGL canvas must be visible');
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),'tae');
   await page.screenshot({path:path.join(output,device.name+'-marine-coast-unity-loaded.png')});
   await page.locator('#vh-ocean').click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('푸른 바다'),null,{timeout:30000});
   assert.equal(await page.locator('.vh-pond-fish').count(),10);
   assert(!errors.length,'Unity game page exceptions: '+errors.join('; '));
   results.push({device:device.name,unityStarted:true,learner:'tae',oceanSpecies:10,errors});
   console.log('UNITY_MARINE_V25_PASS '+JSON.stringify(results.at(-1)));
  }finally{await context.close();}
 }
 await fs.writeFile(path.join(output,'unity-marine-qa.json'),JSON.stringify({pass:true,webGlBuild:'marine-coast-v25',results},null,2)+'\n');
 console.log('UNITY_MARINE_V25_ALL_PASS '+results.length);
}finally{await browser.close();}
