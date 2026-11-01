#!/usr/bin/env node
/** Full Unity WebGL browser navigation and learning, without touching real child data. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try {pw=await import('playwright');}
catch {pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4496').replace(/\/$/,'');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const output=process.env.QA_3D_OUTPUT||'/tmp/sparkle-v39-3d';
await fs.mkdir(output,{recursive:true});
const results=[];
try{
 for(const device of [{name:'tablet',width:1024,height:768,who:'tae'},{name:'galaxy',width:390,height:844,who:'se'}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*.supabase.co/**',route=>route.abort());
  try{
   await page.goto(origin+'/village/?who='+device.who+'&autostart=1',{waitUntil:'domcontentloaded',timeout:40000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:150000});
   assert(await page.locator('#canvas').isVisible(),'Real Unity canvas should render');
   console.log('3D_READY',device.name,device.who);
   assert(await page.locator('#vh-map').isVisible(),'Story map should be an available game control');
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'영어학교'}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-help')?.dataset.travel==='true',undefined,{timeout:10000});
   assert((await page.locator('#vh-help').innerText()).includes('영어 숲'));
   console.log('3D_TRAVEL_REQUEST',device.name);
   await page.locator('.vh-mission-card').first().waitFor({state:'visible',timeout:70000});
   assert((await page.locator('.vh-mission-card').count())>=1);
   console.log('3D_ARRIVED',device.name);
   await page.locator('.vh-mission-card button').first().click();
   await page.locator('#village-ui[data-mode="question"]').waitFor({state:'visible',timeout:20000});
   const q=await page.evaluate(async()=>{
    const P=await import('/platform/progress.js');
    const p=P.exportRecords().platform.profiles[P.learner()];
    return Object.entries(p.games).find(([,g])=>g.round&&!g.round.finished)?.[0]||null;
   });
   assert(q,'A real English round should start');
   const game=await(await page.request.get(origin+'/games/'+q+'/game.json')).json();
   assert.equal(game.subject,'english');
   const options=page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)');
   await options.first().waitFor({state:'visible',timeout:12000});
   await options.first().click();
   await page.locator('#village-ui[data-mode="feedback"]').waitFor({state:'visible',timeout:12000});
   console.log('3D_QUESTION_ANSWERED',device.name,q);
   await page.locator('#vh-exit').click();
   await page.locator('#vh-pond').click();
   await page.locator('#village-ui[data-mode="pond"]').waitFor({state:'visible',timeout:70000});
   assert((await page.locator('.vh-pond-fish').count())>0,'Pond should render animal species');
   console.log('3D_POND_ARRIVED',device.name);
   await page.screenshot({path:output+'/'+device.name+'-pond.png'});
   assert.deepEqual(errors,[],'No uncaught errors in game UI');
   results.push({device:device.name,who:device.who,unity:true,learningGame:q,pond:true,jsErrors:0});
   console.log('PASS_3D_V39',JSON.stringify(results.at(-1)));
  }catch(error){
   const state=await page.evaluate(()=>({mode:document.querySelector('#village-ui')?.dataset.mode,title:document.querySelector('#vh-title')?.textContent,help:document.querySelector('#vh-help')?.textContent,ready:document.querySelector('#village-ui')?.dataset.ready,location:location.href})).catch(()=>null);
   await page.screenshot({path:output+'/'+device.name+'-failure.png'}).catch(()=>{});
   console.error('FAIL_3D_V39',device.name,String(error),JSON.stringify(state),JSON.stringify(errors));
   throw error;
  }finally{await context.close();}
 }
 await fs.writeFile(output+'/summary.json',JSON.stringify({pass:true,results},null,2));
 console.log('PASS_FULL_3D_V39',results.length,'Unity WebGL browser navigations');
}finally{await browser.close();}
