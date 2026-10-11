import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const mod=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=mod.chromium?mod:mod.default;
const base=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4198';
const dir=process.env.SPARKLE_QA_OUTPUT||path.resolve('docs/qa-bebsu-art-20261012/webgl-smoke');
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence=[],issues=[];
try{
 for(const child of [{id:'tae',width:1280,height:800},{id:'se',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:child.width,height:child.height},locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>issues.push(child.id+': '+error.message));
  try{
   await page.goto(base+'/village/',{waitUntil:'networkidle',timeout:90000});
   await page.evaluate(async who=>{const P=await import('/platform/progress.js');P.selectLearner(who);},child.id);
   await page.locator('#start').click();
   await page.waitForFunction(()=>document.querySelector('#loading').hidden&&document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:180000});
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),child.id);
   await page.locator('#vh-bebsu').click();
   const selects=page.locator('.vh-challenge-select');
   await selects.first().waitFor({state:'visible',timeout:30000});
   assert.equal(await selects.count(),2);
   assert.equal(await selects.first().locator('option').count(),9);
   await selects.first().selectOption('g1');
   assert.equal(await selects.nth(1).locator('option').count(),3);
   const paperId=await selects.nth(1).locator('option').first().getAttribute('value');
   await selects.nth(1).selectOption(paperId);
   await page.getByRole('button',{name:/1번 문제부터 시작하기/}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.replace(/\s+/g,'')==='1/25',undefined,{timeout:30000});
   const actual=await page.evaluate(async ()=>{
    const P=await import('/platform/progress.js');const R=await import('/platform/rewards.js');
    const C=await (await fetch('/games/catalog.json')).json(),raw=P.exportRecords(),who=P.learner();
    const games=Object.entries(raw.platform.profiles[who].games).filter(([,g])=>g.round&&!g.round.finished);
    return {who,paperId:games[0]?.[1].round.paperId,gameId:games[0]?.[0],roundLength:games[0]?.[1].round.ids.length,answered:games[0]?.[1].round.answers.length,available:R.wallet(C,who).available,otherWallet:R.wallet(C,who==='tae'?'se':'tae').available};
   });
   assert.equal(actual.who,child.id);
   assert.equal(actual.paperId,paperId);
   assert.equal(actual.gameId,'bebsu-g1-original');
   assert.equal(actual.roundLength,25);
   assert.equal(actual.answered,0);
   assert.equal(actual.available,0);
   assert.equal(actual.otherWallet,0);
   const image=page.locator('.vh-original-image').first();
   await image.waitFor({state:'visible',timeout:30000});
   await image.evaluate(async img=>{await img.decode();});
   assert((await image.evaluate(i=>i.naturalWidth))>10);
   const file=path.join(dir,'webgl-'+child.id+'-bebsu-first-question.png');
   await page.screenshot({path:file,fullPage:true});
   await page.locator('#vh-exit').click();
   assert.equal(await page.locator('#village-dialog-wrap').isHidden(),true);
   evidence.push({who:child.id,viewport:child.width+'x'+child.height,gradeOptions:9,paperOptions:3,selectedPaper:paperId,roundLength:25,originalQuestionImage:true,starsBeforeFirstAnswer:0,screenshot:file,webglStarted:true});
   console.log('PASS',child.id,'WebGL Unity started, 9 grade choices, 25-question paper selected, source artwork decoded, profile isolated');
  }finally{await context.close();}
 }
 assert.deepEqual(issues,[]);
 await writeFile(path.join(dir,'qa-bebsu-webgl-smoke.json'),JSON.stringify({pass:true,mode:'real-unity-headless-webgl',realDevice:false,startedAt:new Date().toISOString(),cases:evidence,pageErrors:issues},null,2)+'\n');
 console.log('PASS Bebsu Unity WebGL browser smoke',evidence.length,'profiles');
}finally{await browser.close();}
