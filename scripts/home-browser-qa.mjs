import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const module = await import(process.env.HOME_QA_PLAYWRIGHT ||
  '/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium} = module.chromium ? module : module.default;
const origin = (process.env.HOME_QA_ORIGIN || 'http://127.0.0.1:4179').replace(/\/$/, '');
const out = process.env.HOME_QA_OUTPUT ||
  '/Users/01chungee10/AI-Interop/evidence/sparkle-home-main-20261012/final-qa';
const executablePath = process.env.HOME_QA_CHROME ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
await mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true,executablePath});
const cases = [
 {name:'tiny-320x640',width:320,height:640,who:'tae'},
 {name:'galaxy-360x780',width:360,height:780,who:'tae'},
 {name:'phone-390x844',width:390,height:844,who:'tae'},
 {name:'sehee-390x844',width:390,height:844,who:'se'},
 {name:'short-390x680',width:390,height:680,who:'tae'},
 {name:'landscape-844x390',width:844,height:390,who:'tae'},
 {name:'tablet-768x1024',width:768,height:1024,who:'tae'},
 {name:'tablet-landscape-1024x768',width:1024,height:768,who:'tae'},
 {name:'desktop-1440x900',width:1440,height:900,who:'tae'}
];
const results=[];
try {
 for (const sample of cases) {
  const context=await browser.newContext({viewport:{width:sample.width,height:sample.height},
    locale:'ko-KR',reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failedRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
   if(response.status()>=400)failedRequests.push({status:response.status(),url:response.url()});
  });
  try{
   await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:100000});
   await page.locator('.home-screen').waitFor({timeout:20000});
   if(sample.who==='se'){
    await page.locator('.profile-button').click();
    await page.locator('.profile-choice[data-profile="se"]').click();
    await page.getByRole('heading',{name:'세희의 오늘의 모험'}).waitFor();
   }
   const geometry=await page.evaluate(()=>{
    const box=el=>{const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height};};
    const cards=[...document.querySelectorAll('.home-screen .game-card')];
    const starts=[...document.querySelectorAll('.home-screen .game-card .game-launch')];
    const links=[...document.querySelectorAll('.home-village-grid .village-launch')];
    const nav=[...document.querySelectorAll('.nav button')];
    const shell=document.querySelector('.shell'),reward=document.querySelector('.home-screen .reward-preview-link');
    return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
      shellWidth:shell.clientWidth,shellScrollWidth:shell.scrollWidth,
      shellHeight:shell.clientHeight,contentHeight:shell.scrollHeight,
      cardRects:cards.map(box),startRects:starts.map(box),
      homeTools:box(document.querySelector('.home-screen .home-tools')),
      reward:box(reward),village:box(document.querySelector('.home-villages')),
      villageLinks:links.map(el=>({href:el.getAttribute('href'),rect:box(el)})),
      nav:nav.map(el=>({label:el.textContent.trim(),background:getComputedStyle(el).backgroundImage,...box(el)})),
      cardTitles:cards.map(el=>el.querySelector('h3')?.textContent.trim()),
      invalidImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth).map(e=>e.src)};
   });
   assert(geometry.documentWidth<=geometry.viewport+2,'document horizontal overflow');
   assert(geometry.shellScrollWidth<=geometry.shellWidth+2,'shell horizontal overflow');
   assert.equal(geometry.nav.length,4);
   for(const nav of geometry.nav){
    assert(nav.height>=44,'navigation touch target height <44');
    assert(nav.width>=40,'navigation touch target width <40');
    assert.equal(nav.background,'none','menu text is obscured by asset skin');
   }
   assert(geometry.cardRects.length>0,'no daily learning cards');
   assert.equal(geometry.cardRects.length,geometry.startRects.length);
   for(let i=0;i<geometry.cardRects.length;i++){
    const card=geometry.cardRects[i],start=geometry.startRects[i];
    assert(card.height>=170,'daily card was squeezed: '+card.height);
    assert(start.height>=44,'daily learning action too short');
    assert(start.top>=card.top&&start.bottom<=card.bottom+2,'start button spills out of card');
   }
   assert(geometry.cardRects.every(card=>card.bottom<=geometry.homeTools.top+2),
     'daily cards overlap pagination');
   assert(geometry.reward.bottom<=geometry.village.top+2,
     'village area overlaps rewards');
   assert.equal(geometry.villageLinks.length,1);
   assert.equal(geometry.villageLinks[0].href,'./village/');
   assert(geometry.villageLinks.every(({rect})=>rect.height>=44));
   assert.equal(geometry.invalidImages.length,0,'visible broken image');
   await page.screenshot({path:path.join(out,sample.name+'-top.png')});
   await page.locator('.home-village-grid .village-launch').last().scrollIntoViewIfNeeded();
   const lastVillage=await page.locator('.home-village-grid .village-launch').last().boundingBox();
   assert(lastVillage?.y>=0&&lastVillage.y<sample.height,
     'last village link remains unreachable on screen');
   await page.screenshot({path:path.join(out,sample.name+'-village.png')});

   // Test route navigation and child separation without touching real browser data.
   await page.locator('.nav [data-action="workbooks"]').click();
   await page.locator('.workbook-screen').waitFor();
   await page.locator('.brand').click();
   await page.locator('.home-screen').waitFor();
   await page.locator('.nav [data-action="growth"]').click();
   await page.locator('.growth-screen').waitFor();
   await page.locator('.brand').click();
   await page.locator('.nav [data-action="collection"]').click();
   await page.locator('.collection-screen').waitFor();
   await page.locator('.brand').click();

   await page.locator('.filters [data-subject="math"]').click();
   assert.equal(await page.locator('.filters [data-subject="math"]').getAttribute('aria-pressed'),'true');
   const mathCount=await page.locator('.home-screen .game-card').count();
   assert(mathCount>=1,'math filter hides every recommended activity');
   await page.locator('.filters [data-subject="all"]').click();

   await page.locator('.home-screen .game-card .game-launch').first().click();
   await page.locator('.question-panel').waitFor({timeout:20000});
   await page.locator('.activity-head [data-action="home"],.activity-head [data-action="workbooks"],.activity-head [data-action="back"]').first().click();
   await page.locator('.home-screen').waitFor();
   const stars=await page.locator('.header-star').textContent();
   assert(stars.includes('0'),'navigation-only QA changed star balance');

   await page.locator('.section-top [data-action="all-games"]').click();
   await page.getByRole('heading',{name:/놀이 보물지도/}).waitFor();
   assert((await page.locator('.home-screen .game-card').count())>0);
   assert(await page.locator('#mode-select').isVisible(),'catalogue filter absent after all-games toggle');
   if(!await page.locator('.home-tools [data-action="game-page"][data-direction="1"]').isDisabled()){
    const old=await page.locator('.home-screen .game-card h3').first().textContent();
    await page.locator('.home-tools [data-action="game-page"][data-direction="1"]').click();
    const updated=await page.locator('.home-screen .game-card h3').first().textContent();
    assert.notEqual(updated,old,'pagination did not change activity');
   }
   await page.locator('.section-top [data-action="all-games"]').click();
   await page.getByRole('heading',{name:/오늘의 모험/}).waitFor();
   assert.equal(errors.length,0,'script error: '+errors.join('; '));
   assert.equal(failedRequests.length,0,'missing resource: '+JSON.stringify(failedRequests));
   results.push({name:sample.name,pass:true,who:sample.who,...geometry,
    actionChecks:['route workbooks','route growth','route collection','math filter',
      'daily game begins','back to home','reward unchanged','catalogue','pagination',
      'return from catalogue','village scrolling']});
   console.log('PASS '+sample.name+' cards='+geometry.cardRects.map(b=>Math.round(b.height)).join(',')
    +' main links='+geometry.villageLinks.length+' actions=11');
  } catch(error){
   console.error('FAIL '+sample.name+' '+error.stack);
   results.push({name:sample.name,pass:false,error:error.message,errors,failedRequests});
  } finally {
   await context.close();
  }
 }
} finally {
 await browser.close();
}
const report={date:new Date().toISOString(),origin,cases:results,pass:results.every(r=>r.pass),
 note:'Viewport Chrome headless with isolated localStorage; not a physical Galaxy touch test.'};
await writeFile(path.join(out,'home-qa.json'),JSON.stringify(report,null,2)+'\n');
assert(report.pass,'Home QA failed for '+results.filter(r=>!r.pass).map(r=>r.name).join(', '));
console.log('PASS HOME QA',results.length,'viewports and all functional checks');
