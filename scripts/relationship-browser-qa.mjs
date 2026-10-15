import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.REL_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.REL_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-relationship-v18';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];

async function openLite(seedRelationship=null){
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
  if(seedRelationship)await context.addInitScript(({seedRelationship})=>{
    localStorage.setItem('sparkle-village-relationships-v1',JSON.stringify(seedRelationship));
    localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
  },{seedRelationship});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
  await page.locator('#learner-choices [data-learner="tae"]').click();
  await page.locator('#lite').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:30000});
  return {context,page,errors};
}
async function openFriends(page){
  const more=page.locator('#vh-more');
  if(await page.locator('#vh-extra-tools').getAttribute('hidden')!==null)await more.click();
  await page.locator('#vh-friends').click();
  await page.getByRole('heading',{name:'💞 나를 기억하는 마을 친구들'}).waitFor();
}

try{
  // Real bridge visit: first visit becomes familiar, second visit on same day is deduped.
  {
    const {context,page,errors}=await openLite();
    await openFriends(page);
    const bunny=page.locator('.vh-friend-card').filter({hasText:'토끼 친구'});
    assert((await bunny.innerText()).includes('처음 만나는 사이'));
    await page.locator('#vh-exit').click();

    await page.evaluate(async()=>{
      await window.SparkleVillageBridge.handle(JSON.stringify({
        action:'NPC_VISIT',requestId:'qa-rel-visit-1',itemId:'bunny'
      }));
    });
    await page.waitForTimeout(100);
    await openFriends(page);
    const familiar=page.locator('.vh-friend-card').filter({hasText:'토끼 친구'});
    assert((await familiar.innerText()).includes('익숙한 사이'));
    assert((await familiar.innerText()).includes('다시 만나서 반가워'));
    await page.locator('#vh-exit').click();

    await page.evaluate(async()=>{
      await window.SparkleVillageBridge.handle(JSON.stringify({
        action:'NPC_VISIT',requestId:'qa-rel-visit-2',itemId:'bunny'
      }));
    });
    const state=await page.evaluate(async()=>{
      const R=await import('./relationship-state.js');
      return R.relationshipSnapshot(R.loadRelationships(),'tae');
    });
    assert.equal(state.npcs.find(n=>n.id==='bunny').visits,1,'same-day visit must be deduped');
    assert.equal(errors.length,0,'visit JS errors: '+errors.join('; '));
    results.push({case:'daily-visit',pass:true,visits:1});
    await context.close();
  }

  // Seed only raw relationship events: UI must derive special friendship/residents.
  {
    const at=Date.now()-86400000;
    const seed={version:1,profiles:{
      tae:{events:{
        'visit:owl:20261001':{type:'visit',npcId:'owl',at:at-15*86400000,day:'20261001'},
        'memory:memory-7:r7':{type:'memory',npcId:'owl',at:at-7*86400000,tier:'memory-7',roundId:'r7',subject:'math'},
        'memory:memory-14:r14':{type:'memory',npcId:'owl',at,tier:'memory-14',roundId:'r14',subject:'math'}
      }},
      se:{events:{}}
    }};
    const {context,page,errors}=await openLite(seed);
    await openFriends(page);
    const owl=page.locator('.vh-friend-card').filter({hasText:'부엉이 친구'});
    assert((await owl.innerText()).includes('특별한 친구'));
    assert((await owl.innerText()).includes('오래전 배운 방법'));
    const panel=await page.locator('.vh-resident-panel').innerText();
    assert(panel.includes('기억나비'));
    assert(panel.includes('별빛 기억 부엉이'));
    await page.screenshot({path:path.join(out,'friends-special-390x844.png'),animations:'disabled'});
    assert.equal(errors.length,0,'special UI JS errors: '+errors.join('; '));
    results.push({case:'special-residents',pass:true});
    await context.close();
  }
}finally{
  await browser.close();
}
await fs.writeFile(path.join(out,'relationship-browser-qa.json'),JSON.stringify({
  date:new Date().toISOString(),pass:results.every(x=>x.pass),results,physicalDevice:false
},null,2)+'\n');
assert(results.every(x=>x.pass));
console.log('RELATIONSHIP_BROWSER_QA_PASS',JSON.stringify(results));
