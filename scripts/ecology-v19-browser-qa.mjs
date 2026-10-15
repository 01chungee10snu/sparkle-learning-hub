import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.ECOLOGY_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.ECOLOGY_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-ecology-v19';
await fs.mkdir(out,{recursive:true});

const game=JSON.parse(await fs.readFile(new URL('../games/growth-math-3/game.json',import.meta.url),'utf8'));
const ids=game.questions.slice(0,5).map(q=>q.id);
const now=Date.now(),old=now-35*24*60*60*1000;
const records=Object.fromEntries(ids.map((id,i)=>[id,{
 best:10,seen:1,
 attempts:[{id:'old30-'+i,roundId:'old30-round-'+i,correct:true,at:old}],
 firstAttempt:{id:'old30-'+i,roundId:'old30-round-'+i,correct:true,at:old}
}]));
const seed={version:1,profiles:{
 tae:{games:{'growth-math-3':{records,round:null,finishedRounds:0,lastPlayed:old,completedRounds:[]}},stageSelections:{}},
 se:{games:{},stageSelections:{}}
}};

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
await context.addInitScript(({seed})=>{
 localStorage.setItem('sparkle-learning-progress-v3',JSON.stringify(seed));
 localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
},{seed});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
 await page.locator('#learner-choices [data-learner="tae"]').click();
 await page.locator('#lite').click();
 await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:30000});
 await page.locator('#vh-adaptive').click();
 await page.locator('.vh-learning-step').first().waitFor();
 assert((await page.locator('.vh-learning-step').first().innerText()).includes('다시 떠올리기'));
 await page.locator('.vh-learning-step').first().getByRole('button',{name:'기억 꺼내기'}).click();
 await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.includes('/'),undefined,{timeout:15000});

 const round=await page.evaluate(async()=>{
   const P=await import('../platform/progress.js');
   return P.gameProgress('growth-math-3').round;
 });
 assert.equal(round.purpose,'review');
 assert.equal(round.ids.length,5);

 for(let i=0;i<round.ids.length;i++){
   const item=game.questions.find(q=>q.id===round.ids[i]);
   assert(item&&Number.isInteger(item.answer));
   const choices=page.locator('.vh-spatial-gate, .vh-options button');
   await choices.nth(item.answer).click();
   await page.getByRole('button',{name:'다음 이야기 →'}).waitFor({timeout:10000});
   await page.getByRole('button',{name:'다음 이야기 →'}).click();
   if(i<round.ids.length-1)
     await page.waitForFunction(expected=>document.querySelector('#vh-counter')?.textContent?.startsWith(String(expected)),i+2,{timeout:10000});
 }
 const completed=await page.evaluate(async()=>{
   const P=await import('../platform/progress.js');
   return P.gameProgress('growth-math-3').completedRounds.at(-1);
 });
 await page.evaluate(({roundId})=>window.SparkleVillageBridge.handle(JSON.stringify({
   action:'COMPLETE_WORLD',requestId:'webui-ecology30-qa',gameId:'growth-math-3',roundId
 })),{roundId:completed.id});

 await page.locator('.vh-memory-moment.guardian').waitFor({timeout:15000});
 const memoryText=await page.locator('.vh-memory-moment.guardian').innerText();
 assert(memoryText.includes('기억 수호수'));
 assert(memoryText.includes('30일 이상'));

 const state=await page.evaluate(async()=>{
   const E=await import('./ecology-state.js');
   const R=await import('./relationship-state.js');
   return {
     ecology:E.ecologySnapshot(E.loadEcology(),'tae'),
     relation:R.relationshipSnapshot(R.loadRelationships(),'tae')
   };
 });
 assert.equal(state.ecology.guardianTree,true);
 assert.equal(state.ecology.totals.memory30,1);
 assert.equal(state.relation.residents.memoryGuardian,true);
 assert.equal(state.relation.npcs.find(n=>n.id==='owl').level,'guardian');
 const number=state.ecology.habitats.find(h=>h.id==='number-garden');
 const measure=state.ecology.habitats.find(h=>h.id==='measure-river');
 assert(number?.memory30===1,'addition/subtraction should grow number garden');
 assert(measure?.memory30===1,'clock skill should grow measure river');

 await page.screenshot({path:path.join(out,'memory-30-completion.png'),animations:'disabled'});
 await page.getByRole('button',{name:'마을로 돌아가기'}).click();
 const more=page.locator('#vh-more');
 if(await page.locator('#vh-extra-tools').getAttribute('hidden')!==null)await more.click();
 await page.locator('#vh-ecology').click();
 await page.getByRole('heading',{name:'🌿 오래 기억한 배움 생태계'}).waitFor();
 assert((await page.locator('.vh-resident-panel').innerText()).includes('한 달 이상'));
 assert.equal(await page.locator('.vh-ecology-card.memory-30').count()>=2,true);
 await page.screenshot({path:path.join(out,'ecology-map-390x844.png'),animations:'disabled'});
 assert.equal(errors.length,0,'JS errors: '+errors.join('; '));

 const report={pass:true,memory:'memory-30',guardianTree:true,
   habitats:state.ecology.habitats.filter(h=>h.memory30>0).map(h=>h.id),
   relationship:state.relation.npcs.find(n=>n.id==='owl').level,physicalDevice:false};
 await fs.writeFile(path.join(out,'ecology-v19-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('ECOLOGY_V19_BROWSER_QA_PASS',JSON.stringify(report));
}finally{await context.close();await browser.close();}
