import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const mod=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=mod.chromium?mod:mod.default;
const origin=process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4184';
const baseline=process.env.TABLET_BASELINE==='1';
const sizes=[
 {name:'tablet-768x1024',width:768,height:1024},
 {name:'tablet-landscape-1024x768',width:1024,height:768},
 {name:'tablet-800x1280',width:800,height:1280},
 {name:'tablet-landscape-1280x800',width:1280,height:800},
 {name:'small-tablet-600x960',width:600,height:960}
];
const folder=process.env.TABLET_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/unified-village-tablet-20261014';
await fs.mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const sel=['.vh-dialog','.vh-dialog-title','.vh-dialog-title h2','.vh-progress',
 '.vh-dialog-body','.vh-dialog-footer','.vh-story','.vh-prompt','.vh-option','.vh-explanation',
 '.vh-small','.vh-wide','.vh-secondary','.vh-mission-card .vh-route-title',
 '.vh-mission-card .vh-small','.vh-area-caption','.vh-challenge-select',
 '.vh-select-label','.vh-pair-label','.vh-pair select','.vh-numeric-input',
 '.vh-number-key','.vh-number-instruction','.vh-original-image',
 '#vh-learning-districts .vh-district','#village-controls .vh-action',
 '.vh-shortcut','#village-info .vh-meta h2','#village-info .vh-meta p',
 '.vh-book-spread','.vh-book-page','.vh-route'];
const results=[];
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function snapshot(page,size,step){
 const state=await page.evaluate(selectors=>{
  function measure(s){
   const e=document.querySelector(s);
   if(!e||e.closest('[hidden]'))return null;
   const c=getComputedStyle(e),r=e.getBoundingClientRect();
   if(!r.width||!r.height||c.visibility==='hidden'||c.display==='none')return null;
   return {font:parseFloat(c.fontSize),lineHeight:c.lineHeight,
    padding:[c.paddingTop,c.paddingRight,c.paddingBottom,c.paddingLeft],
    margin:[c.marginTop,c.marginRight,c.marginBottom,c.marginLeft],
    bounds:{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)},
    text:e.textContent?.trim()?.slice(0,105)};
  }
  const modal=document.querySelector('.vh-dialog'),
    body=document.querySelector('#vh-body'),doc=document.documentElement;
  const positions={};
  for(const s of selectors)positions[s]=measure(s);
  const buttons=[...document.querySelectorAll('.vh-dialog button, .vh-dialog select')]
   .filter(x=>x.getClientRects().length&&!x.closest('[hidden]'))
   .map(x=>({name:x.textContent?.trim()?.slice(0,36),width:Math.round(x.getBoundingClientRect().width),
    height:Math.round(x.getBoundingClientRect().height)}));
  const broken=buttons.filter(b=>b.width<42||b.height<42);
  return {positions,bodyOverflow:body?body.scrollHeight-body.clientHeight:0,
   docOverflow:doc.scrollWidth-doc.clientWidth,buttonsBroken:broken,
   dialogFullness:modal?modal.getBoundingClientRect().width/innerWidth:null,
   dialogHeightFraction:modal?modal.getBoundingClientRect().height/innerHeight:null};
 },sel);
 const record={name:size.name,step,...state};
 results.push(record);
 await page.screenshot({path:path.join(folder,size.name+'-'+step+(baseline?'-baseline':'')+'.png'),
  animations:'disabled'});
 console.log('CAPTURE',size.name,step,
  JSON.stringify({fontStory:state.positions['.vh-story']?.font,
   fontPrompt:state.positions['.vh-prompt']?.font,
   fontOption:state.positions['.vh-option']?.font,
   fontSmall:state.positions['.vh-small']?.font,
   fontRoute:state.positions['.vh-mission-card .vh-route-title']?.font,
   dialogFullness:state.dialogFullness?.toFixed(2),bodyOverflow:state.bodyOverflow,
   buttonsBroken:state.buttonsBroken?.length}));
 return state;
}
for(const size of sizes) {
 const ctx=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1.5,
  locale:'ko-KR',reducedMotion:'reduce'});
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:90000});
  await page.locator('[data-learner="tae"]').click();
  await page.locator('#lite').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',
   undefined,{timeout:20000});
  await snapshot(page,size,'explore');
  await page.locator('[data-district="english"]').click();
  await page.locator('.vh-mission-card').first().waitFor({state:'visible'});
  await snapshot(page,size,'district');
  await page.locator('.vh-mission-card button').first().click();
  await page.locator('.vh-prompt').first().waitFor({state:'visible',timeout:20000});
  await snapshot(page,size,'question');
  if(await page.locator('.vh-option').count()){
   await page.locator('.vh-option').first().click();
   await page.getByRole('button',{name:/다음 이야기/}).waitFor({state:'visible',timeout:12000});
   await snapshot(page,size,'feedback');
  }
  await page.locator('#vh-exit').click();
  await page.locator('[data-district="practice"]').click();
  await page.locator('.vh-challenge-select').nth(1).selectOption('magic-g1-basic');
  await snapshot(page,size,'paper');
  await page.getByRole('button',{name:/1번 문제부터 시작/}).click();
  await page.locator('.vh-prompt').waitFor({state:'visible',timeout:15000});
  await snapshot(page,size,'exam');
  if(await page.locator('.vh-option').count()){
   for(let i=0;i<2;i++){
    await page.locator('.vh-option').first().click();
    await page.getByRole('button',{name:/다음 이야기/}).waitFor();
    await page.getByRole('button',{name:/다음 이야기/}).click();
   }
   await page.locator('.vh-numeric-input').waitFor({state:'visible',timeout:15000});
   await snapshot(page,size,'numeric');
  }
  assert.equal(errors.length,0,errors.join('; '));
 } catch(e) {console.log('ERR',size.name,e.message);results.push({name:size.name,error:e.message});}
 finally {await ctx.close();}
}
await browser.close();
const report={baseline,origin,resultCount:results.length,errors:results.filter(x=>x.error),results};
await fs.writeFile(path.join(folder,baseline?'tablet-baseline.json':'tablet-qa.json'),JSON.stringify(report,null,2)+'\n');
if(!baseline){
 assert(!report.errors.length,'Tablet browser QA failed');
 // For tablet reading, these are deliberately firm thresholds rather than arbitrary enlargement.
 for(const entry of results){
  if(!['question','exam','numeric','feedback','district','paper'].includes(entry.step))continue;
  const p=entry.positions;
  if(entry.step==='district')assert(p['.vh-mission-card .vh-route-title']?.font>=19,'District title too small: '+entry.name);
  if(['question','exam','numeric'].includes(entry.step)){
   assert(p['.vh-prompt']?.font>=23,'Question too small: '+entry.name);
   assert((p['.vh-story']?.font??20)>=19,'Question story too small: '+entry.name);
   if(p['.vh-option'])assert(p['.vh-option'].font>=20,'Choice too small: '+entry.name);
  }
  if(entry.step==='feedback')assert(p['.vh-explanation']?.font>=19,'Explanation too small: '+entry.name);
  assert(entry.docOverflow<=2,'Horizontal body overflow: '+entry.name+'/'+entry.step);
  assert(!entry.buttonsBroken?.length,'Small buttons: '+entry.name+'/'+entry.step);
  if(p['.vh-dialog'])assert(entry.dialogFullness>=.93,'Dialog wastes tablet width: '+entry.name+'/'+entry.step);
 }
}
console.log('TABLET_QA',baseline?'BASELINE':'PASS',report.errors.length,'errors,',results.length,'captures');
