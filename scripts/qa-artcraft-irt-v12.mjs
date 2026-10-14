import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const library=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=library.chromium?library:library.default;
const root=path.resolve('..'),out=path.join(root,'evidence/browser-v12');
const origin=process.env.V12_ORIGIN||'http://127.0.0.1:4192';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[],httpErrors=[];
try{
  for(const screen of [{name:'phone',width:390,height:844},{name:'tablet',width:768,height:1024}]){
    const ctx=await browser.newContext({viewport:screen,hasTouch:true,isMobile:screen.width<500,
      deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(screen.name+': '+e.message));
    page.on('response',r=>{if(r.status()>=400)httpErrors.push(screen.name+': '+r.status()+' '+r.url());});
    await page.goto(origin+'/web/village/',{waitUntil:'networkidle',timeout:60000});
    const welcome=await page.locator('.vh-welcome-art').evaluate(i=>({src:i.getAttribute('src'),w:i.naturalWidth}));
    assert(welcome.src.includes('artcraft-v12')&&welcome.w===1200);
    await page.locator('#lite').click();
    await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:45000});
    const initialStars=await page.locator('#vh-stars').innerText();
    await page.locator('#vh-more').click();await page.locator('#vh-workshop').click();
    await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.mode==='workshop');
    await page.locator('.vh-mechanic-number').filter({hasText:/^4$/}).click();
    assert((await page.locator('.vh-mechanic-explanation').first().innerText()).includes('4 + 4 = 8'));
    for(const label of ['씨앗','흙','물'])await page.locator('.vh-mechanic-ingredient').filter({hasText:label}).click();
    assert((await page.locator('.vh-mechanic-explanation').nth(1).innerText()).includes('모두 맞아요'));
    await page.locator('.vh-mechanic-role').nth(0).click();
    await page.locator('.vh-mechanic-role').nth(1).click();
    assert((await page.locator('.vh-mechanic-explanation').nth(2).innerText()).includes('두 역할'));
    assert.equal(await page.locator('#vh-stars').innerText(),initialStars,'sandbox must not award stars');
    const layout=await page.evaluate(()=>({w:innerWidth,docW:document.documentElement.scrollWidth,
      minTap:[...document.querySelectorAll('.vh-mechanic-number')].map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height];})}));
    assert(layout.docW<=layout.w+2);
    assert(layout.minTap.every(([w,h])=>w>=44&&h>=44));
    await page.screenshot({path:path.join(out,screen.name+'-thinking-workshop.png')});
    await page.locator('#vh-exit').click();

    await page.locator('#vh-bebsu').click();
    await page.getByRole('button',{name:'✨ IRT 맞춤 모험 시작하기',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.vh-irt-provenance')?.dataset.selection==='adaptive');
    const assessment=await page.evaluate(async()=>{
      const p=await import('../platform/progress.js?v=artcraft-irt-v12-20261014');
      const round=p.gameProgress('bebsu-g1-original','tae').round;
      const source=await fetch('../games/bebsu-g1-original/game.json').then(r=>r.json());
      const q=source.questions.find(q=>q.id===round.ids[round.index]);
      return {irtVersion:round.irtVersion,count:round.ids.length,unique:new Set(round.ids).size,
        sourceNumber:q.provenance.examQuestionNo,position:round.index+1,paperId:round.paperId,
        firstId:q.id,shownIds:round.ids,mode:q.interaction?.type||'choice'};
    });
    assert.equal(assessment.irtVersion,2);assert.equal(assessment.count,25);assert.equal(assessment.unique,25);
    assert((await page.locator('.vh-irt-provenance').innerText()).includes('원문 '+assessment.sourceNumber+'번'));
    await page.screenshot({path:path.join(out,screen.name+'-irt-source-number.png')});
    // Inspect real controls rather than writing any response record directly.
    if(assessment.mode==='choice'){
      await page.locator('#vh-hint').click();
      await page.locator('.vh-option').first().click();
      await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.mode==='feedback');
      await page.getByRole('button',{name:'다음 이야기 →',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.mode==='question');
      const next=await page.evaluate(async()=>{
        const p=await import('../platform/progress.js?v=artcraft-irt-v12-20261014');
        const r=p.gameProgress('bebsu-g1-original','tae').round;
        return {index:r.index,ids:r.ids,ability:p.ability('math','tae')};
      });
      assert.equal(next.index,1);assert.equal(next.ids[0],assessment.firstId);
      assert.equal(next.ability.n,0,'assisted answer must not become independent IRT evidence');
      assessment.afterHint={index:next.index,evidence:next.ability.n,ids:next.ids};
    }
    results.push({screen:screen.name,photoCraftWelcome:true,workshopNoStars:true,layout,assessment});
    await ctx.close();
  }
  const blocked=await browser.newContext({viewport:{width:390,height:844}});
  const failpage=await blocked.newPage();
  await failpage.route('**/games/irt-bank.json*',route=>route.fulfill({status:503,body:'deliberately unavailable in isolated QA'}));
  await failpage.goto(origin+'/web/village/',{waitUntil:'domcontentloaded'});
  await failpage.locator('#lite').click();
  await failpage.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('IRT'));
  assert.notEqual(await failpage.locator('#village-ui').getAttribute('data-ready'),'true');
  await failpage.screenshot({path:path.join(out,'missing-bank-fail-closed.png')});
  await blocked.close();

  const review=await browser.newContext({viewport:{width:1200,height:1600},deviceScaleFactor:1});
  const gallery=await review.newPage();
  await gallery.goto(origin+'/artcraft/review/',{waitUntil:'networkidle'});
  await gallery.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await gallery.locator('article').count(),32);
  for(let group=0;group<4;group++){
    await gallery.evaluate(group=>{document.querySelectorAll('article').forEach((e,i)=>e.hidden=!(i>=group*8&&i<group*8+8));},group);
    await gallery.screenshot({path:path.join(out,'artcraft-pairs-'+(group+1)+'.png'),fullPage:true});
  }
  await review.close();
  assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);
  await fs.writeFile(path.join(out,'WEB_INTEGRATION_QA.json'),JSON.stringify({pass:true,
    checkedAt:new Date().toISOString(),browser:'headless Chrome; isolated contexts',
    realChildProfilesUsed:false,physicalDevice:false,results,missingBank:'blocked without random fallback',
    imagePairsLoaded:32,errors,httpErrors},null,2)+'\n');
  console.log('V12_WEB_INTEGRATION_QA_PASS '+results.map(r=>r.screen).join(','));
}finally{await browser.close();}
