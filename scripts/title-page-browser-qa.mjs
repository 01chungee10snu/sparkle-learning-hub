import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.TITLE_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.TITLE_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-title-v15';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const samples=[
 {name:'compact-320x568',width:320,height:568},
 {name:'phone-390x844',width:390,height:844},
 {name:'landscape-844x390',width:844,height:390},
 {name:'desktop-1440x900',width:1440,height:900}
];
const results=[];
try{
 for(const sample of samples){
  const context=await browser.newContext({viewport:{width:sample.width,height:sample.height},locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],http=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))http.push(r.status()+' '+r.url());});
  await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
  await page.locator('#loading .title-shell').waitFor();
  const images=await page.locator('#loading img').evaluateAll(imgs=>imgs.map(img=>({src:img.src,ok:img.complete&&img.naturalWidth>0})));
  assert(images.every(x=>x.ok),'title artwork failed to load');
  assert.equal(await page.locator('#learner-choices button').count(),2);
  assert.equal(await page.locator('.title-destinations img').count(),3);
  assert((await page.locator('#magic-village-title').innerText()).includes('마법마을'));
  const geometry=await page.evaluate(()=>{
    const rect=sel=>{const e=document.querySelector(sel),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const loading=document.querySelector('#loading');
    return {vw:innerWidth,vh:innerHeight,docW:document.documentElement.scrollWidth,title:rect('.title-shell'),
      start:rect('#start'),lite:rect('#lite'),hero:rect('.title-art'),choices:[...document.querySelectorAll('#learner-choices button')].map(e=>e.getBoundingClientRect().toJSON()),
      scrollHeight:loading.scrollHeight,clientHeight:loading.clientHeight};
  });
  assert(geometry.docW<=geometry.vw+2,'horizontal overflow');
  assert(geometry.start.width>=44&&geometry.start.height>=44,'3D action too small');
  assert(geometry.lite.width>=44&&geometry.lite.height>=44,'2D action too small');
  assert(geometry.choices.every(b=>b.width>=44&&b.height>=44),'learner choice too small');
  if(sample.height>=700)assert(geometry.start.bottom<=sample.height+2,'primary entry action below initial phone viewport');
  await page.locator('#learner-choices [data-learner="se"]').click();
  assert.equal(await page.locator('#learner-choices [data-learner="se"]').getAttribute('aria-pressed'),'true');
  assert((await page.locator('#status').innerText()).includes('세희'));
  await page.screenshot({path:path.join(out,sample.name+'-title.png'),animations:'disabled',fullPage:false});
  assert.equal(errors.length,0,'JS errors '+errors.join('; '));
  assert.equal(http.length,0,'HTTP errors '+http.join('; '));
  results.push({...sample,pass:true,geometry});
  console.log('PASS TITLE',sample.name,'shell='+Math.round(geometry.title.width)+'x'+Math.round(geometry.title.height),'scroll='+geometry.scrollHeight+'/'+geometry.clientHeight);
  await context.close();
 }
}finally{await browser.close();}
await fs.writeFile(path.join(out,'title-page-qa.json'),JSON.stringify({date:new Date().toISOString(),origin,pass:results.every(x=>x.pass),results},null,2)+'\n');
console.log('TITLE_PAGE_QA_PASS',results.length);
