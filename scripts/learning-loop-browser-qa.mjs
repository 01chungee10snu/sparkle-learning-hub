import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.LEARNING_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.LEARNING_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-learning-loop-20261015/learning';
await fs.mkdir(out,{recursive:true});
const now=Date.now(),old=now-3*24*60*60*1000,recent=now-60*1000;
const qOld='growth-math-3-01',qWrong='growth-math-3-02';
const growthGame=JSON.parse(await fs.readFile(new URL('../games/growth-math-3/game.json',import.meta.url),'utf8'));
const seed={version:1,profiles:{
 tae:{games:{'growth-math-3':{records:{
  [qOld]:{best:10,seen:1,attempts:[{id:'attempt-old',roundId:'round-old',correct:true,at:old}]},
  [qWrong]:{best:2,seen:1,attempts:[{id:'attempt-wrong',roundId:'round-wrong',correct:false,at:recent}]}
 },round:null,finishedRounds:0,lastPlayed:recent,completedRounds:[]}},stageSelections:{}},
 se:{games:{},stageSelections:{}}
}};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
async function context(){
 const c=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
 await c.addInitScript(({seed})=>{
  localStorage.setItem('sparkle-learning-progress-v3',JSON.stringify(seed));
  localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
 },{seed});
 return c;
}
try{
 // Learning hub: review mission must be first and must actually use retrieval selection.
 {
  const c=await context(),page=await c.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:100000});
  await page.getByRole('heading',{name:/태희의 오늘의 3걸음/}).waitFor();
  assert((await page.locator('.mission-tag').first().innerText()).includes('다시 떠올리기'));
  assert.equal(await page.locator('.learning-mission h3').first().innerText(),'꽃잎 생활 수학');
  await page.screenshot({path:path.join(out,'hub-review-first.png'),animations:'disabled'});
  await page.locator('.learning-mission .game-launch').first().click();
  await page.locator('.question-panel').waitFor({timeout:20000});
  const round=await page.evaluate(async()=>{const P=await import('./platform/progress.js');return P.gameProgress('growth-math-3').round;});
  assert.equal(round.ids[0],qWrong);
  assert.equal(round.ids[1],qOld);
  for(let i=0;i<round.ids.length;i++){
   const item=growthGame.questions.find(q=>q.id===round.ids[i]);
   assert(item&&Number.isInteger(item.answer),'review QA expects choice items');
   const play=page.locator('[data-action="question-play"]');
   if(await play.isVisible().catch(()=>false))await play.click();
   await page.locator('.answer').nth(item.answer).click();
   await page.locator('.feedback-panel').waitFor({timeout:10000});
   await page.locator('[data-action="next"]').click();
   if(i<round.ids.length-1)await page.locator('.question-panel').waitFor({timeout:10000});
  }
  await page.locator('.result .teach-back').waitFor({timeout:10000});
  assert((await page.locator('.result .teach-back').innerText()).includes('화면을 보지 않고'));
  await page.screenshot({path:path.join(out,'hub-review-teach-back.png'),animations:'disabled'});
  assert.equal(errors.length,0,'hub JS errors: '+errors.join('; '));
  results.push({surface:'learning-hub',pass:true,firstTwo:round.ids.slice(0,2),teachBack:true});
  await c.close();
 }
 // Village: the crystal recommendation must expose the same learning loop.
 {
  const c=await context(),page=await c.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
  await page.locator('[data-learner="tae"]').click();
  await page.locator('#lite').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:30000});
  assert.equal(await page.locator('#vh-adaptive').isVisible(),true,'learning loop must be a primary village shortcut');
  assert((await page.locator('#vh-adaptive').innerText()).includes('오늘의 3걸음'));
  await page.locator('#vh-adaptive').click();
  await page.locator('.vh-learning-loop').waitFor({timeout:20000});
  assert((await page.locator('.vh-learning-step').first().innerText()).includes('다시 떠올리기'));
  assert((await page.locator('.vh-learning-step').first().innerText()).includes('꽃잎 생활 수학'));
  await page.screenshot({path:path.join(out,'village-learning-loop.png'),animations:'disabled'});
  await page.locator('.vh-learning-step').first().getByRole('button',{name:'기억 꺼내기'}).click();
  await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.replace(/\s/g,'')==='1/5',undefined,{timeout:20000});
  const round=await page.evaluate(async()=>{const P=await import('../platform/progress.js');return P.gameProgress('growth-math-3').round;});
  assert.equal(round.ids[0],qWrong);
  assert.equal(round.ids[1],qOld);
  assert.equal(errors.length,0,'village JS errors: '+errors.join('; '));
  results.push({surface:'village',pass:true,firstTwo:round.ids.slice(0,2)});
  await c.close();
 }
}finally{await browser.close();}
const report={date:new Date().toISOString(),pass:results.every(r=>r.pass),results,physicalDevice:false};
await fs.writeFile(path.join(out,'learning-loop-qa.json'),JSON.stringify(report,null,2)+'\n');
assert(report.pass);
console.log('LEARNING_LOOP_BROWSER_QA_PASS',JSON.stringify(results));
