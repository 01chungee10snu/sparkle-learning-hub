import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const module=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=module.chromium?module:module.default;
const base=process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4184';
const out=process.env.UNIFIED_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/unified-village-20261013';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[];
async function enter(page,who){
 await page.goto(base+'/',{waitUntil:'networkidle',timeout:100000});
 assert(page.url().includes('/village/'));
 await page.locator('[data-learner="'+who+'"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading').hidden&&document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:180000});
 assert.equal(await page.locator('#village-ui').getAttribute('data-who'),who);
}
function checkNext(after,before){assert.equal(after,before,'Current pupil wallet changed unexpectedly');}
for(const c of [{name:'tae-desktop',who:'tae',viewport:{width:1280,height:800}},
 {name:'se-galaxy',who:'se',viewport:{width:390,height:844}}]){
 const context=await browser.newContext({viewport:c.viewport,locale:'ko-KR',reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await enter(page,c.who);
  const before=await page.locator('#vh-stars').innerText();
  await page.locator('[data-district="english"]').click();
  const names=await page.locator('.vh-mission-card .vh-route-title').allInnerTexts();
  assert(names.length>=2,'English area empty');
  await page.locator('.vh-mission-card button').first().click();
  await page.locator('.vh-dialog[data-theme] .vh-prompt').first().waitFor({timeout:15000}).catch(()=>{});
  assert.equal((await page.locator('#vh-counter').innerText()).replace(/\s/g,''),'1/5'===('1/'+(c.who==='tae'?5:3))?'1/5':'1/3');
  const q=await page.evaluate(async()=>{const P=await import('../platform/progress.js');return Object.entries(P.exportRecords().platform.profiles[P.learner()].games).find(([,g])=>g.round&&!g.round.finished)?.[0]});
  assert(q,'English route must create a valid game round');
  const game=await(await page.request.get(base+'/games/'+q+'/game.json')).json();
  assert.equal(game.subject,'english');
  await page.screenshot({path:path.join(out,c.name+'-english.png')});
  await page.locator('#vh-exit').click();
  await page.locator('[data-district="practice"]').click();
  await page.locator('.vh-challenge-select').first().selectOption('g1');
  await page.locator('.vh-challenge-select').nth(1).selectOption('magic-g1-basic');
  await page.getByRole('button',{name:/1번 문제부터 시작하기/}).click();
  await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.replace(/\s/g,'')==='1/25');
  const practice=await page.evaluate(async()=>{
   const P=await import('../platform/progress.js'),id=P.learner(),games=P.exportRecords().platform.profiles[id].games;
   return games['magic-g1-challenge']?.round;
  });
  assert.equal(practice.paperId,'magic-g1-basic');
  assert.equal(practice.ids.length,25);
  assert.equal(practice.index,0);
  const first=await(await page.request.get(base+'/games/magic-g1-challenge/game.json')).json();
  const item=first.questions.find(q=>q.id===practice.ids[0]);assert(item);
  if(item.interaction?.type==='numeric'){
   const digits=String(item.interaction.target).split('');
   for(const digit of digits)await page.locator('.vh-number-key').getByText(digit,{exact:true}).first().click();
   await page.getByRole('button',{name:'정답 확인 ✨'}).click();
  }else if(item.interaction?.type==='build'){
   for(let i=0;i<item.interaction.target;i++)await page.getByRole('button',{name:'하나 늘리기'}).click();
   await page.getByRole('button',{name:'이만큼 담았어요 ✨'}).click();
  }else await page.locator('.vh-option').nth(item.answer).click();
  await page.getByRole('button',{name:'다음 이야기 →'}).waitFor({timeout:15000});
  const earned=await page.evaluate(async()=>{
   const P=await import('../platform/progress.js');
   const g=P.gameProgress('magic-g1-challenge');return g.round.answers.length;
  });
  assert.equal(earned,1);
  await page.getByRole('button',{name:'다음 이야기 →'}).click();
  await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.replace(/\s/g,'')==='2/25');
  await page.locator('#vh-exit').click();
  await page.locator('[data-district="practice"]').click();
  await page.locator('.vh-challenge-select').first().selectOption('g1');
  await page.locator('.vh-challenge-select').nth(1).selectOption('magic-g1-basic');
  await page.getByRole('button',{name:/1번 문제부터 시작하기/}).click();
  await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent?.replace(/\s/g,'')==='2/25');
  const after=await page.evaluate(async()=>{const P=await import('../platform/progress.js');return P.gameProgress('magic-g1-challenge').round.index});
  assert.equal(after,1);
  await page.screenshot({path:path.join(out,c.name+'-practice-resume.png')});
  await page.locator('#vh-exit').click();
  assert.equal(errors.length,0,'JS errors: '+errors.join('; '));
  cases.push({name:c.name,pass:true,who:c.who,englishGame:q,practiceResumeIndex:after});
  console.log('PASS',c.name,'english game',q,'practice 25 resume preserved','JS errors',errors.length);
 }catch(e){console.error('FAIL',c.name,e.message);cases.push({name:c.name,pass:false,error:e.message,errors});}
 finally{await context.close();}
}
await browser.close();
await fs.writeFile(path.join(out,'unified-browser-qa.json'),JSON.stringify({origin:base,cases,pass:cases.every(c=>c.pass),realDevice:false},null,2));
assert(cases.every(c=>c.pass),'Unified browser end-to-end failed');
