import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4187').replace(/\/$/,'');
const folder=path.resolve('docs/qa-career-v27');
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const reports=[];
async function career(page){
 await page.locator('#vh-map').click();
 await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
 await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('미래 직업 탐색관'),null,{timeout:12000});
}
try{
 for(const device of [
  {name:'galaxy',width:390,height:844},
  {name:'tablet',width:768,height:1024}
 ]){
  const ctx=await browser.newContext({
   viewport:{width:device.width,height:device.height},
   hasTouch:true,isMobile:true,locale:'ko-KR'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:40000});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
   await career(page);
   assert.equal(await page.locator('.career-card').count(),100);
   await page.locator('.career-card[data-career=doctor]').click();
   assert.equal(await page.locator('.career-fact-panel.locked').count(),1,'Details must require an unlock');
   assert.equal(await page.locator('.career-wage-hourly').count(),0,'Statistics hidden until the virtual purchase');
   assert.equal(await page.locator('.career-unlock-button').count(),6,'Six combinations of two subjects');
   assert.equal(await page.locator('.career-unlock-button:enabled').count(),0);
   assert(await page.locator('.career-fact-panel .career-source-link').count()>=2,'Official source is still free');
   await page.screenshot({path:path.join(folder,device.name+'-career-locked.png')});
   // Add two legitimate independent learning observations, keeping the same
   // source-of-truth answer receipt schema used by subject currency accrual.
   const seeded=await page.evaluate(async()=>{
    const Progress=await import(new URL('../platform/progress.js?v=ecology-v19-20261015',location.href));
    const Resources=await import(new URL('../platform/resource-economy.js?v=career-v27-20261019',location.href));
    const catalog=await (await fetch(new URL('../games/catalog.json',location.href))).json();
    const save=Progress.exportRecords(),timestamp=Date.now()-10000;
    for(const subject of ['math','korean']){
     const item=catalog.find(g=>g.subject===subject&&g.kind==='quiz'&&g.status==='published'&&g.questionIds?.length>=2);
     if(!item)throw new Error('Missing practice game '+subject);
     const records={};
     for(let i=0;i<2;i++){
      const qid=item.questionIds[i];
      const attempt={id:'careerqa-'+subject+i,roundId:'careerqa-round-'+subject,correct:true,at:timestamp+i,assisted:false};
      records[qid]={best:10,seen:1,attempts:[attempt],firstAttempt:attempt};
     }
     save.platform.profiles.tae.games[item.id]={records,round:null,finishedRounds:0,lastPlayed:timestamp,completedRounds:[]};
    }
    Progress.importRecords(save);
    return Resources.wallet(catalog,'tae').available;
   });
   assert(seeded.math>=2&&seeded.korean>=2,'Independent questions must award subject credits');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
   await career(page);
   await page.locator('.career-card[data-career=doctor]').click();
   const enabled=page.locator('.career-unlock-button:enabled');
   assert(await enabled.count()>=1);
   await enabled.first().click();
   await page.waitForFunction(()=>document.querySelector('.career-wage-hourly')?.textContent.includes('원'),null,{timeout:15000});
   const hourly=await page.locator('.career-wage-hourly').innerText();
   assert(hourly.includes('40,865'),hourly);
   const annual=await page.locator('.career-wage-annual').innerText();
   assert(annual.includes('8,500'),annual);
   assert((await page.locator('.career-data-vintage').innerText()).includes('2021'));
   assert((await page.locator('.career-study-evidence').innerText()).includes('필수 전국 석차'));
   assert((await page.locator('.career-university-benchmark').innerText()).includes('성균관대학교 의예과'));
   assert((await page.locator('.career-university-percentiles').innerText()).includes('수학 100'));
   const inferred=(await page.locator('.career-rank-equivalent').innerText());
   assert(inferred.includes('상위 약 100명'),inferred);
   assert((await page.locator('.career-study-evidence').innerText()).includes('전국 종합석차가 아닙니다'));
   assert((await page.locator('.career-study-evidence a[href*="adiga.kr"]').count())===1);
   assert((await page.locator('.career-study-evidence a[href*="school.busanedu.net"][href$=".pdf"]').count())===1,'Original 2025 SKKU PDF must open directly');

   assert((await page.locator('.career-official-health-mean').innerText()).includes('28,518'));
   assert((await page.locator('.career-health-hourly').innerText()).includes('137,106'));
   assert((await page.locator('.career-university-benchmark').innerText()).includes('의예과'));
   assert((await page.locator('.career-rank-equivalent').innerText()).includes('100'));
   assert((await page.locator('.career-study-evidence').innerText()).includes('전국 종합석차'));

   const state=await page.evaluate(async()=>{
    const Resources=await import(new URL('../platform/resource-economy.js?v=career-v27-20261019',location.href));
    const catalog=await (await fetch(new URL('../games/catalog.json',location.href))).json();
    return {mine:Resources.wallet(catalog,'tae'),sister:Resources.wallet(catalog,'se')};
   });
   assert(state.mine.careerUnlocked.includes('doctor'));
   assert.equal(state.sister.careerUnlocked.length,0,'Career coin purchases may not leak between children');
   assert.equal(state.mine.spent.math+state.mine.spent.korean,2);
   assert.equal(state.mine.spent.english+state.mine.spent.hanja,0);
   await page.screenshot({path:path.join(folder,device.name+'-career-stats-unlocked.png')});
   await page.locator('.career-return-button').last().click();
   // A second profession uses a genuinely different denominator: qualified
   // accountancy exam takers, never 10,000 general school students.
   await page.locator('.career-card[data-career=accountant]').click();
   assert.equal(await page.locator('.career-exam-benchmark').count(),0);
   await page.locator('.career-unlock-button:enabled').first().click();
   await page.waitForFunction(()=>document.querySelector('.career-exam-equivalent')?.textContent?.includes('2,633'),null,{timeout:12000});
   assert((await page.locator('.career-exam-benchmark').innerText()).includes('4,368'));
   assert((await page.locator('.career-study-evidence').innerText()).includes('응시자 집단'));
   assert((await page.locator('.career-study-evidence').innerText()).includes('2026'));
   await page.screenshot({path:path.join(folder,device.name+'-career-exam-stats.png')});

   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:30000});
   await career(page);await page.locator('.career-card[data-career=doctor]').click();
   assert.equal(await page.locator('.career-wage-hourly').count(),1,'Unlock persists');
   assert((await page.locator('.career-official-health-mean').innerText()).includes('28,518'));
   assert(!errors.length,'Browser JS errors '+errors.join('; '));
   const outcome={device:device.name,pass:true,cards:100,freeOverview:true,salaryGated:true,
    lockedSourceFree:true,coinPrice:[1,1],permanentUnlock:true,sisterIsolated:true,
    wageDataYear:2021,healthcareOfficial2023MeanWan:28518,universityRankEquivalentPer10000:100,professionalExamPassEquivalentPer10000:2633,hourly,errors};
   reports.push(outcome);
   console.log('CAREER_100_TOKENOMICS_BROWSER_PASS',JSON.stringify(outcome));
  }finally{await ctx.close();}
 }
}finally{
 await browser.close();
 await fs.writeFile(path.join(folder,'career-100-tokenomics-browser-qa.json'),JSON.stringify({
   pass:reports.length===2&&reports.every(x=>x.pass),origin,results:reports
 },null,2)+'\n');
}
console.log('CAREER_100_ALL_DEVICE_QA_PASS',reports.length);
