import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const playwrightModule=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=playwrightModule.chromium?playwrightModule:playwrightModule.default;
const OUTPUT='/Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/bebsu-browser-final';
const ORIGIN=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4179';
await mkdir(OUTPUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence=[],errors=[];
const source=JSON.parse(await readFile(new URL('../games/bebsu-g1-original/game.json',import.meta.url)));
async function save(page,name){
 const file=path.join(OUTPUT,name+'.png');await page.screenshot({path:file});
 evidence.push(file);console.log('CAPTURE',name);
}
function answer(q){
 const type=q.interaction?.type||'choice';
 return type==='choice'?q.answer:type==='numeric'?String(q.interaction.target):
   type==='build'?q.interaction.target:type==='match'?q.interaction.pairs:q.interaction.order;
}
async function start(name,width,height,learner,complete){
 const ctx=await browser.newContext({viewport:{width,height},locale:'ko-KR',reducedMotion:'reduce'});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push({name,error:e.message}));
 page.on('console',m=>{if(m.type()==='error')errors.push({name,console:m.text()});});
 try{
  await page.goto(ORIGIN+'/village/',{waitUntil:'networkidle'});
  await page.evaluate(async id=>{const p=await import('/platform/progress.js');p.selectLearner(id);},learner);
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#loading').hidden,undefined,{timeout:180000});
  await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:30000});
  await page.waitForTimeout(1200);
  assert(await page.locator('#canvas').isVisible(),'Unity canvas hidden');
  await save(page,name+'-world');
  await page.locator('#vh-bebsu').click();
  await page.getByRole('heading',{name:/벡수 수학 경시대회/}).waitFor({timeout:12000});
  assert.equal(await page.locator('.vh-challenge-select').count(),2);
  assert.equal(await page.locator('.vh-challenge-select').first().locator('option').count(),9);
  await save(page,name+'-picker');
  await page.getByRole('button',{name:/1번 문제부터 시작하기/}).click();
  await page.waitForFunction(()=>document.querySelector('#vh-counter').textContent==='1 / 25',undefined,{timeout:12000});
  await page.locator('.vh-original-image').first().waitFor({state:'visible'});
  await save(page,name+'-question1');
  const progress=await page.evaluate(async()=>{const p=await import('/platform/progress.js');return p.gameProgress('bebsu-g1-original');});
  assert.equal(progress.round.ids.length,25);
  const expected=progress.round.ids;
  const mode=async q=>{
   const kind=q.interaction?.type||'choice';
   if(kind==='choice')await page.locator('.vh-option').nth(q.answer).click();
   else if(kind==='numeric'){await page.getByRole('textbox',{name:'숫자 답'}).fill(String(q.interaction.target));await page.locator('.vh-wide').click();}
   else if(kind==='build'){for(let n=0;n<q.interaction.target;n++)await page.getByRole('button',{name:'하나 늘리기'}).click();await page.locator('.vh-wide').click();}
   else if(['memory','match','sequence'].includes(kind)){
    const values=answer(q);for(let n=0;n<values.length;n++)await page.locator('.vh-pair select').nth(n).selectOption(String(values[n]));await page.locator('.vh-wide').click();
   }else throw Error('unhandled '+kind);
  };
  const limit=complete?25:1;
  for(let i=0;i<limit;i++){
   assert.equal((await page.locator('#vh-counter').textContent()).replaceAll(' ',''),(i+1)+'/25');
   const q=source.questions.find(q=>q.id===expected[i]);assert(q);
   await mode(q);
   await page.getByRole('button',{name:/다음 이야기/}).waitFor({state:'visible',timeout:20000});
   if(i===0)await save(page,name+'-feedback');
   await page.getByRole('button',{name:/다음 이야기/}).click();
   await page.waitForFunction(({i,limit})=>{const text=document.querySelector('#vh-counter').textContent.replaceAll(' ','');return i===24?text==='완료':text===(i+2)+'/25';},{i,limit},{timeout:30000});
  }
  if(complete){
   assert.match(await page.locator('#vh-title').textContent(),/25문제 완주/);
   assert.match(await page.locator('.vh-challenge-bonus').textContent(),/160별/);
   const snapshot=await page.evaluate(async()=>{const R=await import('/platform/rewards.js');const catalog=await (await fetch('/games/catalog.json')).json();return R.wallet(catalog);});
   assert.equal(snapshot.challengeStars,160);
   await save(page,name+'-completed');
  }
  console.log('PASS',name,'question count',limit,'Unity actual startup / image / answer / bonus');
 }finally{await ctx.close();}
}
try{
 await start('tae-desktop',1280,800,'tae',true);
 await start('se-mobile',390,844,'se',false);
}finally{
 await browser.close();
 await writeFile(path.join(OUTPUT,'report.json'),JSON.stringify({results:evidence,errors,createdAt:new Date().toISOString()},null,2));
 console.log('BROWSER_ERRORS',errors.length,JSON.stringify(errors).slice(0,2000));
}
