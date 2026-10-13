import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const module=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=module.chromium?module:module.default;
const BASE=(process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const OUT=process.env.TABLET_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/tablet-legibility-20261014';
const BASELINE=process.env.TABLET_BASELINE==='1';
const viewports=[
  {name:'tablet-portrait-768',width:768,height:1024},
  {name:'tablet-landscape-1024',width:1024,height:768},
  {name:'tablet-portrait-800',width:800,height:1280},
  {name:'tablet-landscape-1280',width:1280,height:800}
];
await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];

const read=async(page)=>page.evaluate(()=>{
  const selectors=['#page','#game','#village-info','#vh-name','.vh-meta p','#vh-learning-districts .vh-district','#village-controls .vh-action','#vh-world-shortcuts .vh-shortcut',
    '#village-dialog-wrap','.vh-dialog','.vh-dialog-title','.vh-dialog-title h2','.vh-dialog-body',
    '.vh-story','.vh-prompt','.vh-option','.vh-book-page .vh-story','.vh-book-page .vh-prompt','.vh-book-page .vh-option',
    '.vh-mission-card','.vh-mission-card .vh-route-title','.vh-mission-card .vh-small','.vh-mission-card .vh-wide',
    '.vh-small','.vh-wide','.vh-dialog-footer .vh-secondary','.vh-original-image','.vh-number-key','.vh-challenge-select'];
  const data={viewport:{width:innerWidth,height:innerHeight},bodyScrollWidth:document.documentElement.scrollWidth};
  for(const sel of selectors){
    const e=document.querySelector(sel);
    if(!e){data[sel]=null;continue;}
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    data[sel]={font:parseFloat(s.fontSize),lineHeight:s.lineHeight,
      margin:[parseFloat(s.marginTop),parseFloat(s.marginRight),parseFloat(s.marginBottom),parseFloat(s.marginLeft)],
      padding:[parseFloat(s.paddingTop),parseFloat(s.paddingRight),parseFloat(s.paddingBottom),parseFloat(s.paddingLeft)],
      x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),scrollHeight:e.scrollHeight,clientHeight:e.clientHeight};
  }
  return data;
});
async function snap(page,name,label){ await page.screenshot({path:path.join(OUT,name+'-'+label+'.png'),animations:'disabled'}); }

for(const vp of viewports){
  const context=await browser.newContext({viewport:vp,isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(BASE+'/village/',{waitUntil:'networkidle',timeout:90000});
    await page.locator('[data-learner="tae"]').click();
    await page.locator('#lite').click();
    await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',{timeout:20000});
    const home=await read(page);
    await snap(page,vp.name,'home');
    await page.locator('[data-district="english"]').click();
    await page.locator('.vh-mission-card').first().waitFor({state:'visible',timeout:10000});
    const area=await read(page);
    await snap(page,vp.name,'learning-area');
    await page.locator('.vh-mission-card button').first().click();
    await page.locator('.vh-prompt').first().waitFor({state:'visible',timeout:15000});
    const question=await read(page);
    await snap(page,vp.name,'question');
    await page.locator('#vh-exit').click();
    await page.locator('[data-district="practice"]').click();
    await page.locator('.vh-challenge-select').nth(1).selectOption('magic-g1-basic');
    await page.getByRole('button',{name:/1번 문제부터 시작하기/}).click();
    await page.locator('.vh-book-page .vh-prompt').first().waitFor({state:'visible',timeout:15000});
    const exam=await read(page);
    await snap(page,vp.name,'exam');
    const report={name:vp.name,viewport:vp,home,area,question,exam,errors};
    if(!BASELINE){
      const at=(p,sel)=>p[sel];
      const closeEnough=(font,min,label)=>assert(font>=min,`${vp.name} ${label} is ${font}px; target ${min}px`);
      closeEnough(at(home,'#vh-learning-districts .vh-district')?.font,16,'district nav');
      closeEnough(at(home,'#village-controls .vh-action')?.font,16,'bottom nav');
      closeEnough(at(area,'.vh-mission-card .vh-route-title')?.font,20,'area mission');
      closeEnough(at(area,'.vh-mission-card .vh-small')?.font,18,'area description');
      closeEnough(at(question,'.vh-prompt')?.font,24,'prompt');
      closeEnough(at(exam,'.vh-book-page .vh-story')?.font,19,'exam story');
      closeEnough(at(exam,'.vh-book-page .vh-prompt')?.font,24,'exam prompt');
      closeEnough(at(exam,'.vh-book-page .vh-option')?.font,21,'exam options');
      closeEnough(at(exam,'.vh-dialog-footer .vh-secondary')?.font,18,'footer controls');
      const box=at(exam,'.vh-dialog'),viewport=exam.viewport;
      assert(box.x<=10&&box.y<=10,'dialog outer top/left margin too wide');
      assert(box.width>=viewport.width-20,'dialog too narrow');
      assert(box.height>=viewport.height-24,'dialog too short');
      assert(!errors.length,'browser errors: '+errors.join(', '));
      assert(exam.bodyScrollWidth<=viewport.width+2,'horizontal page overflow');
    }
    results.push({...report,passed:true});
    console.log((BASELINE?'BASELINE':'PASS'),vp.name,JSON.stringify({
      text:{nav:home['#vh-learning-districts .vh-district']?.font,mission:area['.vh-mission-card .vh-route-title']?.font,
       story:exam['.vh-book-page .vh-story']?.font,prompt:exam['.vh-book-page .vh-prompt']?.font,option:exam['.vh-book-page .vh-option']?.font},
      dialog:{width:exam['.vh-dialog']?.width,height:exam['.vh-dialog']?.height},errors
    }));
  } catch(error){
    results.push({name:vp.name,passed:false,error:error.message,errors});
    console.error('FAIL',vp.name,error.message);
  } finally {await context.close();}
}
await browser.close();
await fs.writeFile(path.join(OUT,BASELINE?'baseline.json':'verified.json'),JSON.stringify({base:BASE,realDevice:false,baseline:BASELINE,results,pass:results.every(r=>r.passed)},null,2)+'\n');
assert(results.every(r=>r.passed),'Tablet legibility QA failed');
