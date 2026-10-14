import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const module=await import(process.env.GROWTH_QA_PLAYWRIGHT||'/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=module.chromium?module:module.default;
const origin=(process.env.GROWTH_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.GROWTH_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-growth-20261015/growth';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const cases=[{name:'phone-390x844',width:390,height:844},{name:'desktop-1440x900',width:1440,height:900}];
const results=[];
try{
 for(const sample of cases){
  const context=await browser.newContext({viewport:{width:sample.width,height:sample.height},locale:'ko-KR',reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),url:r.url()});});
  await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:100000});
  await page.locator('.nav [data-action="growth"]').click();
  await page.locator('.growth-screen').waitFor();
  const geometry=await page.evaluate(()=>{
   const box=s=>{const el=document.querySelector(s),b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom};};
   const goals=[...document.querySelectorAll('.growth-goals button')];
   const stages=[...document.querySelectorAll('.growth-path .stage-node')];
   return {
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    shellWidth:document.querySelector('.shell').clientWidth,shellScrollWidth:document.querySelector('.shell').scrollWidth,
    hero:box('.growth-hero'),goalPanel:box('.growth-goal-panel'),path:box('.growth-path'),
    metrics:document.querySelectorAll('.growth-metrics>div').length,goals:goals.length,stages:stages.length,
    goalHeights:goals.map(x=>x.getBoundingClientRect().height),
    broken:[...document.images].filter(x=>x.complete&&!x.naturalWidth).map(x=>x.src)
   };
  });
  assert(geometry.documentWidth<=geometry.viewport+2,'document horizontal overflow');
  assert(geometry.shellScrollWidth<=geometry.shellWidth+2,'shell horizontal overflow');
  assert.equal(geometry.metrics,4,'growth metrics missing');
  assert.equal(geometry.goals,5,'growth goals missing');
  assert(geometry.stages>=2,'growth stages missing');
  assert(geometry.goalHeights.every(h=>h>=44),'growth goal touch target too small');
  assert.equal(geometry.broken.length,0,'broken image in growth UI');
  await page.locator('[data-action="growth-goal"][data-goal="garden"]').click();
  assert.equal(await page.locator('[data-action="growth-goal"][data-goal="garden"]').getAttribute('aria-pressed'),'true');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-growth-goal-v1')));
  assert.equal(stored.profiles.tae.goal,'garden','growth goal did not persist');
  await page.screenshot({path:path.join(out,sample.name+'-growth-top.png')});
  await page.locator('.growth-path').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,sample.name+'-growth-path.png')});
  assert.equal(errors.length,0,'script errors: '+errors.join('; '));
  assert.equal(failed.length,0,'failed requests: '+JSON.stringify(failed));
  results.push({...sample,pass:true,geometry});
  console.log('PASS',sample.name,'hero='+Math.round(geometry.hero.height),'goals='+geometry.goals,'stages='+geometry.stages);
  await context.close();
 }
}finally{await browser.close();}
const report={date:new Date().toISOString(),origin,cases:results,pass:results.every(x=>x.pass),note:'Headless Chrome isolated storage; visual screenshots saved alongside this report.'};
await writeFile(path.join(out,'growth-qa.json'),JSON.stringify(report,null,2)+'\n');
assert(report.pass,'growth QA failed');
console.log('PASS GROWTH QA',results.length,'viewports');
