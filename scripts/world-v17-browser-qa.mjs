import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.WORLD17_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.WORLD17_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-world-v17/runtime';
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
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',
  hasTouch:true,isMobile:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(origin+'/village/?motionPreview=1',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('#learner-choices [data-learner="tae"]').click();
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#loading')?.hidden===true &&
    document.querySelector('#village-ui')?.dataset.ready==='true' &&
    typeof window.SparkleMotionMode==='function' &&
    typeof window.SparkleMemoryPreview==='function',undefined,{timeout:240000});
  await page.evaluate(()=>{document.querySelector('#village-ui').style.visibility='hidden';});
  const canvas=page.locator('#canvas');

  await page.evaluate(()=>{window.SparkleMotionMode(false);window.SparkleMotionPreview('Idle');});
  await page.waitForTimeout(500);
  const onA=path.join(out,'ambient-on-a.png'),onB=path.join(out,'ambient-on-b.png');
  await canvas.screenshot({path:onA});await page.waitForTimeout(1200);await canvas.screenshot({path:onB});
  const onDiff=pixelDiff(onA,onB);
  assert(onDiff>.08,'ambient world should visibly move');

  await page.evaluate(()=>window.SparkleMotionMode(true));
  await page.waitForTimeout(500);
  const lowA=path.join(out,'ambient-low-a.png'),lowB=path.join(out,'ambient-low-b.png');
  await canvas.screenshot({path:lowA});await page.waitForTimeout(1200);await canvas.screenshot({path:lowB});
  const lowDiff=pixelDiff(lowA,lowB);
  assert(lowDiff<onDiff*.8,'reduced motion should materially lower frame movement');

  const baseline=lowB;
  await page.evaluate(()=>window.SparkleMemoryPreview('memory-7'));
  await page.waitForTimeout(350);
  const memory7=path.join(out,'memory-7.png');await canvas.screenshot({path:memory7});
  const memory7Diff=pixelDiff(baseline,memory7);
  assert(memory7Diff>.10,'7-day memory butterfly effect missing');

  await page.waitForTimeout(4200);
  await page.evaluate(()=>window.SparkleMemoryPreview('memory-14'));
  await page.waitForTimeout(350);
  const memory14=path.join(out,'memory-14.png');await canvas.screenshot({path:memory14});
  const memory14Diff=pixelDiff(baseline,memory14);
  assert(memory14Diff>.10,'14-day memory festival effect missing');

  assert.equal(errors.length,0,'JS errors: '+errors.join('; '));
  const report={pass:true,onDiff,lowDiff,memory7Diff,memory14Diff,softwareWebGL:true,physicalDevice:false};
  await fs.writeFile(path.join(out,'world-v17-qa.json'),JSON.stringify(report,null,2)+'\n');
  console.log('WORLD_V17_RUNTIME_QA_PASS',JSON.stringify(report));
}finally{
  await context.close();
  await browser.close();
}
