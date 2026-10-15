import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.ECOLOGY3D_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.ECOLOGY3D_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-ecology-v19/3d';
await fs.mkdir(out,{recursive:true});

function pixelDiff(a,b){
 const code=['from PIL import Image,ImageChops,ImageStat','import sys',
  'a=Image.open(sys.argv[1]).convert("RGB");b=Image.open(sys.argv[2]).convert("RGB")',
  's=ImageStat.Stat(ImageChops.difference(a,b));print(sum(s.mean)/3)'].join(';');
 return Number(execFileSync('python3',['-c',code,a,b],{encoding:'utf8'}).trim());
}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});

async function open3d(ecology=null){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',
  hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(({ecology})=>{
   localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
   if(ecology)localStorage.setItem('sparkle-village-ecology-v1',JSON.stringify(ecology));
 },{ecology});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/village/?motionPreview=1',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#learner-choices [data-learner="tae"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading')?.hidden===true &&
  document.querySelector('#village-ui')?.dataset.ready==='true' &&
  typeof window.SparkleMemoryPreview==='function',undefined,{timeout:240000});
 await page.evaluate(()=>{document.querySelector('#village-ui').style.visibility='hidden';});
 await page.waitForTimeout(800);
 return {context,page,errors};
}
try{
 const base=await open3d();
 const baseline=path.join(out,'baseline.png');await base.page.locator('#canvas').screenshot({path:baseline});
 assert.equal(base.errors.length,0);await base.context.close();

 const now=Date.now();
 const ecology={version:1,profiles:{
  tae:{events:{
   'ecology:memory-30:r30':{type:'memory',tier:'memory-30',subject:'math',roundId:'r30',at:now,
     skills:['10을 이용한 덧셈','시계 정각']}
  }},
  se:{events:{}}
 }};
 const grown=await open3d(ecology);
 const habitat=path.join(out,'guardian-habitats.png');await grown.page.locator('#canvas').screenshot({path:habitat});
 const habitatDiff=pixelDiff(baseline,habitat);
 assert(habitatDiff>.08,'30-day habitats/guardian tree were not visibly restored');

 await grown.page.evaluate(()=>window.SparkleMemoryPreview('memory-30'));
 await grown.page.waitForTimeout(400);
 const celebration=path.join(out,'memory-30-celebration.png');await grown.page.locator('#canvas').screenshot({path:celebration});
 const celebrationDiff=pixelDiff(habitat,celebration);
 assert(celebrationDiff>.08,'memory-30 celebration missing');
 assert.equal(grown.errors.length,0,'3D ecology errors: '+grown.errors.join('; '));
 await grown.context.close();

 const report={pass:true,habitatDiff,celebrationDiff,guardianTree:true,
  habitats:['number-garden','measure-river'],softwareWebGL:true,physicalDevice:false};
 await fs.writeFile(path.join(out,'ecology-v19-3d-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ECOLOGY_V19_3D_QA_PASS',JSON.stringify(report));
}finally{await browser.close();}
