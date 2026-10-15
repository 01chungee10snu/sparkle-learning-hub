import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.REL3D_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.REL3D_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-relationship-v18/3d';
await fs.mkdir(out,{recursive:true});

function pixelDiff(a,b){
 const code=[
  'from PIL import Image,ImageChops,ImageStat',
  'import sys',
  'a=Image.open(sys.argv[1]).convert("RGB");b=Image.open(sys.argv[2]).convert("RGB")',
  'd=ImageChops.difference(a,b);s=ImageStat.Stat(d)',
  'print(sum(s.mean)/3)'
 ].join(';');
 return Number(execFileSync('python3',['-c',code,a,b],{encoding:'utf8'}).trim());
}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

async function open3d(seed=null){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',
   hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
 await context.addInitScript(({seed})=>{
   localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
   if(seed)localStorage.setItem('sparkle-village-relationships-v1',JSON.stringify(seed));
 },{seed});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/village/?motionPreview=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#learner-choices [data-learner="tae"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading')?.hidden===true &&
   document.querySelector('#village-ui')?.dataset.ready==='true' &&
   typeof window.SparkleMotionMode==='function' &&
   typeof window.SparkleNpcPreview==='function',undefined,{timeout:240000});
 await page.evaluate(()=>{window.SparkleMotionMode(true);document.querySelector('#village-ui').style.visibility='hidden';});
 await page.waitForTimeout(500);
 return {context,page,errors};
}

try{
 // Baseline no resident.
 const base=await open3d();
 const baseline=path.join(out,'baseline.png');
 await base.page.locator('#canvas').screenshot({path:baseline});
 assert.equal(base.errors.length,0,'baseline errors: '+base.errors.join('; '));
 await base.context.close();

 // Raw memory relationship events must recreate persistent rare residents on fresh load.
 const at=Date.now()-86400000;
 const seed={version:1,profiles:{
   tae:{events:{
     'memory:memory-7:r7':{type:'memory',npcId:'owl',at:at-7*86400000,tier:'memory-7',roundId:'r7',subject:'math'},
     'memory:memory-14:r14':{type:'memory',npcId:'owl',at,tier:'memory-14',roundId:'r14',subject:'math'}
   }},
   se:{events:{}}
 }};
 const special=await open3d(seed);
 const resident=path.join(out,'persistent-residents.png');
 await special.page.locator('#canvas').screenshot({path:resident});
 const residentDiff=pixelDiff(baseline,resident);
 assert(residentDiff>.08,'persistent rare residents were not visibly restored');

 // Actual Unity proximity bubble must create one host-owned visit event.
 await special.page.evaluate(()=>window.SparkleNpcPreview('bunny'));
 await special.page.waitForTimeout(1800);
 const snapshot=await special.page.evaluate(async()=>{
   const R=await import('./relationship-state.js');
   return R.relationshipSnapshot(R.loadRelationships(),'tae');
 });
 assert.equal(snapshot.npcs.find(n=>n.id==='bunny').visits,1,'Unity proximity did not record bunny visit');
 assert.equal(snapshot.residents.memoryButterfly,true);
 assert.equal(snapshot.residents.starlightOwl,true);
 assert.equal(special.errors.length,0,'special errors: '+special.errors.join('; '));
 await special.context.close();

 const report={pass:true,residentDiff,bunnyVisits:1,residents:snapshot.residents,
   softwareWebGL:true,physicalDevice:false};
 await fs.writeFile(path.join(out,'relationship-3d-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('RELATIONSHIP_3D_QA_PASS',JSON.stringify(report));
}finally{await browser.close();}
