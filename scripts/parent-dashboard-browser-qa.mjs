
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.PARENT_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.PARENT_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-parent-dashboard-20261015';
await fs.mkdir(out,{recursive:true});
const now=Date.now(),DAY=24*60*60*1000;
const ids=['growth-math-3-01','growth-math-3-02','growth-math-3-03','growth-math-3-04','growth-math-3-05','growth-math-3-06'];
const records={};
for(let i=0;i<ids.length;i++){
 records[ids[i]]={best:10,seen:2,attempts:[
  {id:'attempt-a-'+i,roundId:'round-a-'+i,correct:true,at:now-10*DAY},
  {id:'attempt-b-'+i,roundId:'round-b-'+i,correct:true,at:now-2*DAY,purpose:i===0?'transfer':'review',strategy:i===0?'adaptive':'review'}
 ],firstAttempt:{id:'attempt-a-'+i,roundId:'round-a-'+i,correct:true,at:now-10*DAY}};
}
records['growth-math-3-07']={best:2,seen:1,attempts:[
 {id:'attempt-wrong-now',roundId:'round-wrong-now',correct:false,at:now-30*60*1000,purpose:'review',strategy:'review'}
],firstAttempt:{id:'attempt-wrong-now',roundId:'round-wrong-now',correct:false,at:now-30*60*1000}};
records['growth-math-3-08']={best:10,seen:1,attempts:[
 {id:'attempt-hint',roundId:'round-hint',correct:true,at:now-20*60*1000,assisted:true,purpose:'challenge',strategy:'adaptive'}
],firstAttempt:{id:'attempt-hint',roundId:'round-hint',correct:true,at:now-20*60*1000,assisted:true,purpose:'challenge',strategy:'adaptive'}};
const seed={version:1,profiles:{
 tae:{games:{'growth-math-3':{records,round:null,finishedRounds:2,lastPlayed:now-20*60*1000,
   completedRounds:[{id:'round-complete-1',at:now-DAY,questionIds:ids.slice(0,5)},{id:'round-complete-2',at:now-2*DAY,questionIds:ids.slice(1,6)}]}},stageSelections:{}},
 se:{games:{},stageSelections:{}}
}};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const cases=[];
try{
 for(const sample of [{name:'phone-390x844',width:390,height:844},{name:'desktop-1440x900',width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:sample.width,height:sample.height},locale:'ko-KR',reducedMotion:'reduce'});
  await context.addInitScript(({seed})=>{
   localStorage.setItem('sparkle-learning-progress-v3',JSON.stringify(seed));
   localStorage.setItem('sparkle-learner-v1',JSON.stringify({id:'tae'}));
  },{seed});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:100000});
  await page.locator('[data-action="parents"]').click();
  await page.locator('.parent-dashboard').waitFor({timeout:20000});
  assert.equal(await page.locator('.parent-kpis>div').count(),4);
  assert.equal(await page.locator('.parent-subject-card').count(),3);
  assert.equal(await page.locator('.parent-cloud').count(),1,'cloud sync panel missing');
  assert((await page.locator('.parent-cloud').innerText()).includes('보호자 클라우드'));
  assert.equal(await page.locator('.parent-friends').count(),1,'relationship evidence section missing');
  assert.equal(await page.locator('.parent-ecology').count(),1,'skill ecology evidence section missing');
  assert((await page.locator('.parent-friends').innerText()).includes('마을 친구 관계'));
  assert((await page.locator('.parent-subject-card').first().innerText()).includes('개인화 활성'));
  assert((await page.locator('.parent-dashboard').innerText()).includes('형제 비교'));
  assert((await page.locator('.parent-due-badge').innerText()).includes('복습'));
  const geometry=await page.evaluate(()=>{
   const box=sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
   const modal=document.querySelector('#modal .dialog');
   return {vw:innerWidth,docW:document.documentElement.scrollWidth,modal:box('#modal .dialog'),
    dashboard:box('.parent-dashboard'),kpis:[...document.querySelectorAll('.parent-kpis>div')].map(e=>e.getBoundingClientRect().width)};
  });
  assert(geometry.docW<=geometry.vw+2,'horizontal overflow');
  assert(geometry.modal.width<=geometry.vw-4,'parent modal wider than viewport');
  await page.screenshot({path:path.join(out,sample.name+'-dashboard.png'),animations:'disabled'});
  await page.locator('[data-action="parent-dashboard-profile"][data-profile="se"]').click();
  assert.equal(await page.locator('.parent-dashboard').getAttribute('data-who'),'se');
  const learner=await page.evaluate(()=>JSON.parse(localStorage.getItem('sparkle-learner-v1')).id);
  assert.equal(learner,'tae','viewing sibling dashboard must not change active learner');
  await page.locator('[data-action="parent-guide"]').click();
  await page.getByRole('heading',{name:'보호자 설정·안내'}).waitFor();
  await page.locator('[data-action="parent-dashboard"]').click();
  await page.getByRole('heading',{name:'보호자 학습 대시보드'}).waitFor();
  if(sample.name==='phone-390x844'){
   await page.goto(origin+'/learning.html?view=parents',{waitUntil:'networkidle',timeout:100000});
   await page.getByRole('heading',{name:'보호자 학습 대시보드'}).waitFor();
   assert.equal(await page.locator('.parent-dashboard').getAttribute('data-who'),'tae');
  }
  assert.equal(errors.length,0,'JS errors: '+errors.join('; '));
  cases.push({...sample,pass:true,geometry});
  console.log('PASS PARENT DASHBOARD',sample.name,'modal',Math.round(geometry.modal.width));
  await context.close();
 }
}finally{await browser.close();}
const report={date:new Date().toISOString(),origin,pass:cases.every(c=>c.pass),cases,physicalDevice:false};
await fs.writeFile(path.join(out,'parent-dashboard-qa.json'),JSON.stringify(report,null,2)+'\n');
assert(report.pass);
console.log('PARENT_DASHBOARD_BROWSER_QA_PASS',cases.length);
