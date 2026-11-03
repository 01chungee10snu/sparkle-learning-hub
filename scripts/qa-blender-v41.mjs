#!/usr/bin/env node
/** Isolated real-browser QA for exported Blender GLB and Unity map integration. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
let pw;
try{pw=await import('playwright');}
catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const port=Number(process.env.BLENDER_QA_PORT||4601);
const origin='http://127.0.0.1:'+port;
const out='/tmp/sparkle-v41-blender-qa';
await fs.mkdir(out,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
const results=[];
try{
 let ready=false;
 for(let n=0;n<50;n++){
   try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}
   await new Promise(r=>setTimeout(r,220));
 }
 assert(ready,'Local server failed');
 browser=await chromium.launch({headless:true,
   executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
   args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const device of [
   {who:'se',id:'galaxy',viewport:{width:390,height:844}},
   {who:'tae',id:'tablet',viewport:{width:1024,height:768}}
 ]){
   const context=await browser.newContext({viewport:device.viewport,locale:'ko-KR',
     hasTouch:true,isMobile:device.viewport.width<900,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[],warnings=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',message=>{if(message.type()==='error')warnings.push(message.text());});
   await page.route('**/*.supabase.co/**',route=>route.abort());
   try{
     await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
     await page.locator('[data-learner="'+device.who+'"]').click();
     await page.waitForFunction(()=>document.querySelector('#entry-blender-stage')?.dataset.blenderReady==='true',null,{timeout:50000});
     assert(await page.locator('#entry-blender-stage canvas').isVisible(),'Blender GLB rendered to WebGL canvas');
     assert((await page.locator('#entry-blender-stage .blender-v41-marker').count())>=4);
     const mat=await page.locator('#entry-blender-stage').evaluate(el=>({
       size:[el.clientWidth,el.clientHeight],canvas:el.querySelector('canvas')?.width,
       visible:[...el.querySelectorAll('button')].filter(btn=>!btn.hidden).map(btn=>btn.dataset.destination)
     }));
     assert(mat.canvas>0,'WebGL backing store must have size');
     assert(mat.visible.length>=1,'At least one Blender map hotspot must be visible');
     await page.locator('#entry-blender-stage').screenshot({path:out+'/'+device.id+'-3d-stage.png'});
     if(device.id==='galaxy'){
       // Pixel-level mesh picking, distinct from the visible horizontal shortcuts.
       const canvas=page.locator('#entry-blender-stage canvas');
       const box=await canvas.boundingBox();
       await canvas.click({position:{x:Math.round(box.width*.53),y:Math.round(box.height*.35)}});
       assert((await page.locator('#entry-village-link').getAttribute('href')).includes('go='),
         '3D building raycast must map to an existing Unity learning district');
     }
     const destination=mat.visible[0];
     await page.locator('#entry-blender-stage button[data-destination="'+destination+'"]').click();
     assert((await page.locator('#entry-village-link').getAttribute('href')).includes('go='+destination));
     assert((await page.locator('#entry-village-link').getAttribute('href')).includes('who='+device.who));
     await page.screenshot({path:out+'/'+device.id+'-landing.png'});
     await page.goto(origin+'/learning.html?who='+device.who+'&subject=math',{waitUntil:'domcontentloaded'});
     await page.locator('.home-screen').waitFor({timeout:25000});
     assert((await page.locator('.filter[data-subject="math"]').getAttribute('aria-pressed'))==='true','Subject deep link');
     await page.goto(origin+'/village/?who='+device.who,{waitUntil:'domcontentloaded'});
     await page.locator('#lite').click();
     await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:50000});
     await page.locator('#vh-map').click();
     const toggle=page.locator('.vh-blender-map-details > summary');
     await toggle.click();
     await page.waitForFunction(()=>document.querySelector('.vh-blender-stage')?.dataset.blenderReady==='true',null,{timeout:50000});
     assert(await page.locator('.vh-blender-stage canvas').isVisible(),'3D map in Unity host UI');
     assert.equal(await page.locator('.vh-v40-map-place').count(),11,'Existing flat accessible map preserved');
     await page.screenshot({path:out+'/'+device.id+'-village-map.png'});
     await page.locator('.vh-blender-map-details > summary').click();
     assert.equal(await page.locator('.vh-v40-map-place').count(),11);
     assert.deepEqual(errors,[],'No JS page errors '+device.id);
     assert.equal(warnings.filter(s=>/GLTFLoader|WebGL.*context.*lost|Failed to load resource/.test(s)).length,0,'No model/GPU errors');
     results.push({...device,blender:true,learners:true,unityMap:true,errorCount:0});
     console.log('BLENDER_V41_PASS',device.id,JSON.stringify(mat));
   }finally{await context.close();}
 }
 // Force model failure to prove the original learning/game controls still work.
 const failContext=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',hasTouch:true,isMobile:true});
 try{
   const failPage=await failContext.newPage();
   await failPage.route('**/sparkle-magic-world-v41.glb',route=>route.abort());
   await failPage.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await failPage.waitForFunction(()=>document.querySelector('#entry-blender-stage')?.dataset.blenderReady==='false',null,{timeout:25000});
   assert(await failPage.locator('.entry-island-art').evaluate(img=>img.complete&&img.naturalWidth>0),'Poster must survive missing GLB');
   assert((await failPage.locator('#entry-village-link').getAttribute('href')).includes('who='),'Village entry must work without Blender');
   assert(await failPage.locator('#entry-learning-link').isVisible());
   console.log('BLENDER_V41_FALLBACK_PASS');
 }finally{await failContext.close();}
 const result={ok:true,results,fallback:true};await fs.writeFile(out+'/summary.json',JSON.stringify(result,null,2));
 console.log('ALL_BLENDER_V41_QA_PASS',results.length);
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
