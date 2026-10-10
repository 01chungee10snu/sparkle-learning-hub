import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const SERVER=process.env.MAGIC_KMA_ORIGIN||'http://127.0.0.1:4198';
const BASE='/magic-village-kma-v06';
const OUTPUT='/Users/01chungee10/AI-Interop/evidence/magic-kma-public-20261010';
const pk=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pk.chromium?pk:pk.default;
await fs.mkdir(OUTPUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],result=[];
async function test(who,width,height,complete){
 const ctx=await browser.newContext({viewport:{width,height},locale:'ko-KR',reducedMotion:'reduce'});
 const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push({who,error:e.message}));
 const prefix=BASE+'/village/';
 try{
  await page.goto(SERVER+prefix,{waitUntil:'networkidle'});
  const sentinel='{\"protected\":true}';
  await page.evaluate(value=>{
   for(const key of ['sparkle-learning-progress-v3','sparkle-rewards-v1','sparkle-public-village-progress-v06'])
    localStorage.setItem(key,value);
  },sentinel);
  await page.evaluate(async who=>{const p=await import('/magic-village-kma-v06/platform/progress.js');p.selectLearner(who);},who);
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#loading').hidden,undefined,{timeout:180000});
  await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:30000});
  assert.equal(await page.locator('#canvas').isVisible(),true);
  assert.equal(await page.locator('#village-ui').getAttribute('data-who'),who);
  await page.locator('#vh-bebsu').click();
  await page.getByRole('heading',{name:/벡수 수학 경시대회/}).waitFor({timeout:15000});
  assert.equal(await page.locator('.vh-challenge-select').first().locator('option').count(),9);
  const reg=await (await page.request.get(SERVER+BASE+'/games/bebsu-challenges.json')).json();
  const paper=reg.grades[0].papers[1];
  const game=(await (await page.request.get(SERVER+BASE+'/games/bebsu-g1-original/game.json')).json());
  await page.getByRole('button',{name:/1번 문제부터 시작/}).click();
  const max=complete?25:1;
  for(let i=0;i<max;i++){
   await page.waitForFunction(i=>document.querySelector('#vh-counter')?.textContent.replace(/\s/g,'')===(i+1)+'/25',i,{timeout:20000});
   const q=game.questions.find(q=>q.id===paper.questionIds[i]);
   assert(q,'Original paper item lost: '+i);
   const image=page.locator('.vh-original-image').first();
   await image.waitFor({state:'visible',timeout:12000});
   await page.waitForFunction(()=>{const image=document.querySelector('.vh-original-image');return image?.complete&&image.naturalWidth>0;},undefined,{timeout:12000});
   const src=await image.getAttribute('src');
   assert.match(src,/^\.\.\/\.\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/);
   if(i===0){
    const file=path.join(OUTPUT,who+'-original-01.png');
    await page.screenshot({path:file});result.push({who,screenshot:file});
   }
   const type=q.interaction?.type||'choice';
   if(type==='choice')await page.locator('.vh-option').nth(q.answer).click();
   else if(type==='numeric'){await page.getByRole('textbox',{name:'숫자 답'}).fill(String(q.interaction.target));await page.locator('.vh-wide').click();}
   else if(type==='build'){for(let j=0;j<q.interaction.target;j++)await page.getByRole('button',{name:'하나 늘리기'}).click();await page.locator('.vh-wide').click();}
   else throw Error('Unexpected KMA interaction '+type);
   await page.getByRole('button',{name:/다음 이야기/}).waitFor({state:'visible',timeout:20000});
   await page.getByRole('button',{name:/다음 이야기/}).click();
  }
  if(complete){
   await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent==='완료',undefined,{timeout:25000});
   assert.match(await page.locator('.vh-challenge-bonus').textContent(),/160별/);
   const wallet=await page.evaluate(async()=>{const r=await import('/magic-village-kma-v06/platform/rewards.js');const c=await (await fetch('/magic-village-kma-v06/games/catalog.json')).json();return r.wallet(c);});
   assert.equal(wallet.challengeStars,160);
   await page.screenshot({path:path.join(OUTPUT,'tae-kma-25-complete.png')});
  }
  const preserve=await page.evaluate(()=>['sparkle-learning-progress-v3','sparkle-rewards-v1','sparkle-public-village-progress-v06'].every(key=>localStorage.getItem(key)==='{\"protected\":true}'));
  assert(preserve,'KMA must not alter old learning records');
  console.log('KMA_WEBGL_PASS',who,max,'sourceImage200','isolatedHistory');
 }finally {
  await Promise.race([ctx.close(),new Promise(resolve=>setTimeout(resolve,12000))]);
 }
}
try{
 await test('tae',1280,800,true);
 await test('se',390,844,false);
}finally {
 await fs.writeFile(path.join(OUTPUT,'result.json'),JSON.stringify({results:result,errors,success:errors.length===0},null,2));
 await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,12000))]);
}
if(errors.length){console.error('ERRORS',errors);process.exitCode=1;}
console.log('PASS: LIVE KMA original images and v0.6 Unity, Tae 25/25, Se mobile source, legacy storage isolation');
