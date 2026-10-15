import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.MOTION_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.MOTION_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-motion-v16/runtime';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',
 hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[],httpErrors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))httpErrors.push(r.status()+' '+r.url());});
const states=['Idle','Walk','Run','Hop','Interact','Focus','Think','Cast','Wave','Care','Discover','Celebrate','Receive'];
try{
 await page.goto(origin+'/village/?motionPreview=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('[data-learner="tae"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading')?.hidden===true &&
   document.querySelector('#village-ui')?.dataset.ready==='true' &&
   typeof window.SparkleMotionPreview==='function',undefined,{timeout:240000});
 await page.waitForTimeout(900);
 await page.evaluate(()=>{document.querySelector('#village-ui').style.visibility='hidden';});
 for(const state of states){
   await page.evaluate(state=>window.SparkleMotionPreview(state),state);
   await page.waitForTimeout(state==='Idle'?300:430);
   const file=path.join(out,state.toLowerCase()+'.png');
   await page.screenshot({path:file,clip:{x:45,y:170,width:300,height:430},animations:'disabled'});
   const stat=await fs.stat(file);
   assert(stat.size>12000,state+' screenshot too small');
   console.log('PASS MOTION FRAME',state,stat.size);
 }
 assert.equal(errors.length,0,'JS errors: '+errors.join('; '));
 assert.equal(httpErrors.length,0,'HTTP errors: '+httpErrors.join('; '));
 const report={pass:true,origin,states,physicalDevice:false,softwareWebGL:true,errors,httpErrors};
 await fs.writeFile(path.join(out,'motion-runtime-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('MOTION_RUNTIME_QA_PASS',states.length);
}finally{await context.close();await browser.close();}
