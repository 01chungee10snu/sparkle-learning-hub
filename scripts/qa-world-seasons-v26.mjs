import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const output=path.resolve('docs/qa-world-v26');
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const cases=[];
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:800},locale:'ko-KR'});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/village/?environmentPreview=1',{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&!!window.SparkleEnvironmentPreview,null,{timeout:125000});
  await page.waitForTimeout(1200);
  for(const [season,daypart] of [
   ['autumn','sunrise'],['autumn','noon'],['autumn','sunset'],['autumn','night'],
   ['spring','noon'],['summer','noon'],['winter','noon']]){
   const accepted=await page.evaluate(([s,t])=>window.SparkleEnvironmentPreview(s,t),[season,daypart]);
   assert.equal(accepted,true);
   await page.waitForTimeout(1100);
   const state=await page.evaluate(()=>({season:document.documentElement.dataset.season,
     daypart:document.documentElement.dataset.daypart,
     clock:document.querySelector('#world-scene-clock')?.textContent}));
   assert.equal(state.season,season);
   assert.equal(state.daypart,daypart);
   assert(state.clock.includes('미리보기'));
   const shot=path.join(output,'world-'+season+'-'+daypart+'.png');
   await page.screenshot({path:shot});
   cases.push({season,daypart,clock:state.clock,screenshot:shot});
   console.log('V26_WORLD_CLIMATE_PASS',season,daypart);
  }
  const invalid=await page.evaluate(()=>window.SparkleEnvironmentPreview('fifthSeason','noon'));
  assert.equal(invalid,false);
  assert(!errors.length,'3D client errors: '+errors.join('; '));
  // Return the environment to the real local KST scene and check the world
  // building approach after animation shifts.
  await page.locator('#vh-map').click();
  await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
  assert(await page.locator('#village-dialog-wrap').isHidden(),'Career map must approach real building first');
  await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('미래 직업 탐색관')&&
    !document.querySelector('#village-dialog-wrap')?.hidden,null,{timeout:50000});
  const count=await page.locator('.career-card').count();
  assert.equal(count,30,'30 career cards must open from Unity 3D building');
  await page.screenshot({path:path.join(output,'unity-career-building-arrival.png')});
  console.log('V26_UNITY_CAREER_HOTSPOT_PASS',count,'jobs');
 }finally{await ctx.close();}
}finally{await browser.close();}
await fs.writeFile(path.join(output,'world-seasons-unity-qa.json'),JSON.stringify({
 pass:cases.length===7,worldScenes:cases,careerFromReal3D:true,errors:[]
},null,2)+'\n');
console.log('V26_WORLD_TIME_AND_CAREER_FULL_PASS');
