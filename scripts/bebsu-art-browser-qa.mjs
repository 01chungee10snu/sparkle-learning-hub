import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const browserModule=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=browserModule.chromium?browserModule:browserModule.default;
const base=process.env.BROWSER_BASE_URL||'http://127.0.0.1:4198';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'docs','qa-bebsu-art-20261011');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];
async function check(name,who,viewport){
 const ctx=await browser.newContext({viewport,locale:'ko-KR',reducedMotion:'reduce'});
 const page=await ctx.newPage();
 page.on('pageerror',error=>errors.push(name+': '+error.message));
 try{
  await page.goto(base+'/learning.html?view=workbooks',{waitUntil:'networkidle',timeout:90000});
  if(who==='se'){
   await page.evaluate(async()=>{const p=await import('/platform/progress.js');p.selectLearner('se');});
   await page.goto(base+'/learning.html?view=workbooks',{waitUntil:'networkidle',timeout:90000});
  }
  await page.locator('.bebsu-study-banner .bebsu-companion-art').waitFor({state:'visible',timeout:20000});
  await page.getByRole('heading',{name:/뱁수 수학 문제집/}).waitFor({timeout:20000});
  await page.locator('.bebsu-art').evaluateAll(async images=>{await Promise.all(images.map(async i=>{i.loading='eager';await i.decode();}));});
  const art=await page.locator('.bebsu-art').evaluateAll(images=>images.map(i=>({path:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,complete:i.complete})));
  assert(art.length>=3,name+': expected multiple Bebsu art images');
  assert(art.every(i=>i.width>0&&i.height>0&&i.complete),name+': Bebsu image load failed: '+JSON.stringify(art));
  const scale=await page.locator('.bebsu-study-banner').evaluate(e=>({height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert(scale.height>=55,name+': banner collapsed');
  assert(scale.scrollWidth<=scale.viewport+3,name+': horizontal overflow '+JSON.stringify(scale));
  const portrait=await page.locator('.bebsu-study-banner .bebsu-companion-art').getAttribute('src');
  assert(portrait.includes(who==='se'?'pink':'brown'),name+': wrong learner Bebsu sprite');
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
  if(name.endsWith('-mobile')){
   await page.locator('.game-card [data-action="play"]').first().click();
   await page.locator('.question-panel').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.question-type .bebsu-inline-art').count(),1,'Math question has no Bebsu illustration');
   if(await page.locator('.question-play').count())await page.locator('.question-play').click();
   if(await page.locator('[data-action="answer"]').count())await page.locator('[data-action="answer"]').first().click();
   else{
    await page.locator('[data-action="activity-digit"][data-index="1"]').click();
    await page.locator('[data-action="activity-submit"]').click();
   }
   await page.locator('.feedback-panel .bebsu-companion-art').waitFor({state:'visible',timeout:20000});
   await page.locator('.feedback-panel .bebsu-companion-art').evaluate(async i=>i.decode());
   const reaction=await page.locator('.feedback-panel .bebsu-companion-art').getAttribute('src');
   assert(reaction.includes(who==='se'?'pink':'brown'),name+': wrong tutor reaction');
   await page.screenshot({path:path.join(output,name+'-feedback.png'),fullPage:true});
   console.log('PASS',name,'math feedback art',reaction);
  }
  console.log('PASS',name,'loaded_images',art.length,'banner_height',Math.round(scale.height),'portrait',portrait);
 }finally{await ctx.close();}
}
try{
 await check('taehee-mobile', 'tae', {width:390,height:844});
 await check('sehee-mobile', 'se', {width:390,height:844});
 await check('desktop', 'tae', {width:1280,height:800});
 assert.equal(errors.length,0,'Browser JS errors: '+JSON.stringify(errors));
 console.log('PASS browser QA / mobile & desktop / Bebsu artwork loaded without horizontal overflow');
}finally{await browser.close();}
