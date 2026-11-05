#!/usr/bin/env node
/** Real learning host with temporary test profiles. Only input gestures supply responses. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try{pw=await import('playwright');}catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.INTERIOR_QA_ORIGIN||'http://127.0.0.1:4655').replace(/\/$/,'');
const output=process.env.INTERACTION_QA_OUTPUT||'/tmp/sparkle-v45-input-qa';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
try{
 for(const size of [{name:'compact',width:360,height:740},{name:'landscape',width:844,height:390}]){
  const ctx=await browser.newContext({viewport:size,hasTouch:true,isMobile:true,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*.supabase.co/**',r=>r.abort());
  try{
   await page.goto(origin+'/village/?who=se',{waitUntil:'domcontentloaded'});await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true');
   async function start(id){
    if(await page.locator('#village-dialog-wrap').isVisible()){
     const home=page.locator('.vh-completion-home');
     if(await home.isVisible())await home.click();else await page.locator('#vh-exit').click();
    }
    // Select an existing published game through the actual host, never mock a question/answer.
    await page.evaluate(id=>window.SparkleVillageBridge.handle(JSON.stringify({action:'START',gameId:id,requestId:'v45-input-'+id+'-'+Date.now()})),id);
    await page.waitForFunction(id=>document.querySelector('#village-ui')?.dataset.mode==='question'&&document.querySelector('#village-ui')?.dataset.gameId===id,id,{timeout:15000});
   }
   await start('bebsu-foundation');
   const input=page.locator('.vh-numeric-input'),submit=page.locator('.vh-number-submit');
   assert(await submit.isDisabled());
   await page.locator('.vh-number-key[data-key="2"]').click();assert.equal(await input.inputValue(),'2');
   await page.locator('.vh-number-key[data-key="back"]').click();assert.equal(await input.inputValue(),'');assert(await submit.isDisabled());
   await page.locator('.vh-number-key[data-key="2"]').click();assert(await submit.isEnabled());
   const numericMetrics=await page.locator('.vh-number-key[data-key="2"]').evaluate(el=>({height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
   assert(numericMetrics.height>=48&&numericMetrics.font>=20);
   await submit.scrollIntoViewIfNeeded();const rect=await submit.boundingBox();
   assert(rect.y>=0&&rect.y+rect.height<=size.height+1,'Numeric submit must remain accessible');
   await page.screenshot({path:output+'/'+size.name+'-numeric.png'});
   await submit.click();await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:15000});
   await start('classroom-bag');
   const selects=page.locator('.vh-pair select');assert((await selects.count())>=2);
   for(let i=0;i<await selects.count();i++)await selects.nth(i).selectOption(String(i));
   await page.getByRole('button',{name:'모두 연결했어요 ✨',exact:true}).click();
   await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:15000});
   await start('snack-count');
   const plus=page.locator('.vh-stepper[aria-label="하나 늘리기"],.vh-spatial-add');
   const minus=page.locator('.vh-stepper[aria-label="하나 줄이기"],.vh-spatial-remove');
   // The adaptive bank mixes choice and build items. Reach a build by answering
   // real intervening items; do not force a question, correct answer or learner level.
   for(let n=0;n<24&&!(await plus.count());n++){
    const mode=await page.locator('#village-ui').getAttribute('data-mode');
    if(mode==='complete'){await start('snack-count');continue;}
    if(mode==='question'){
     await page.locator('.vh-option,.vh-spatial-gate').first().click();
     await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:10000});
    }
    await page.locator('#vh-body .vh-wide').filter({hasText:'다음 이야기'}).click();
    await page.waitForFunction(()=>['question','complete'].includes(document.querySelector('#village-ui')?.dataset.mode),null,{timeout:10000});
   }
   assert.equal(await plus.count(),1,'Adaptive session should eventually include a build task');
   await plus.click();await plus.click();await plus.click();await minus.click();
   const quantity=await page.locator('.vh-number,.vh-spatial-count').first().textContent();assert(/2/.test(quantity),'Counting interaction loses quantity: '+quantity);
   await page.locator('#vh-body .vh-wide').filter({hasText:/이만큼/}).click();
   await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:15000});
   const semantics=await page.evaluate(async site=>{
    const {decorateCountedObjects}=await import(site+'/platform/content-art-v45.js');
    const root=document.createElement('div');root.innerHTML='<div class="vh-counted" role="img" aria-label="사과 3개">🍎 🍎 🍎</div><button class="vh-option" data-answer-index="2">2. 🐱 고양이</button><span class="vh-counted">◆</span>';
    let clicked=0;root.querySelector('button').addEventListener('click',()=>clicked++);
    decorateCountedObjects(root);decorateCountedObjects(root);root.querySelector('button').click();
    return {count:root.firstChild.querySelectorAll('img').length,label:root.firstChild.getAttribute('aria-label'),answer:root.querySelector('button').dataset.answerIndex,clicks:clicked,unmapped:root.lastChild.textContent};
   },origin);
   assert.deepEqual(semantics,{count:3,label:'사과 3개',answer:'2',clicks:1,unmapped:'◆'});
   assert.deepEqual(errors,[]);
   const result={viewport:size.name,numericInput:true,numericMetrics,matching:true,counting:true,semanticPreservation:true,jsErrors:0};results.push(result);
   console.log('V45_INTERACTION_PASS',JSON.stringify(result));
  }catch(e){await page.screenshot({path:output+'/'+size.name+'-failure.png'}).catch(()=>{});throw e;}
  finally{await ctx.close();}
 }
 await fs.writeFile(output+'/summary.json',JSON.stringify({pass:true,productionDataTouched:false,results},null,2));
}finally{await browser.close();}
