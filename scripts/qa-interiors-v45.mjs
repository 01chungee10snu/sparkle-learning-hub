#!/usr/bin/env node
/** Real Unity interior + accessible learning UI. Synthetic browser states; no production RPC. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try{pw=await import('playwright');}catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.INTERIOR_QA_ORIGIN||'http://127.0.0.1:4655').replace(/\/$/,'');
const output=process.env.INTERIOR_QA_OUTPUT||'/tmp/sparkle-v45-interior-qa';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
const devices=process.env.QUICK_V45==='1'?[{name:'tablet',width:1024,height:768,who:'tae'}]:[{name:'tablet',width:1024,height:768,who:'tae'},{name:'galaxy',width:390,height:844,who:'se'}];
try{
 for(const device of devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:true,isMobile:device.width<800,deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],engineErrors=[],rooms=new Set();let hintVerified=false,completionVerified=false,literalObjectVerified=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/ArgumentNullException|InvalidOperationException|NullReferenceException|MissingReferenceException|V45 interior catalog missing|Shader.*not supported/.test(m.text()))engineErrors.push(m.text());});
  await page.route('**/*.supabase.co/**',route=>route.abort());
  async function room(key,capture=true){
   await page.waitForFunction(key=>document.querySelector('#village-ui')?.dataset.interior===key&&document.querySelector('#village-ui')?.dataset.interiorRenderer==='native'&&window.SparkleInteriorEvidence?.version==='interiors-v45-20261105'&&window.SparkleInteriorEvidence.open&&window.SparkleInteriorEvidence.room===key,key,{timeout:30000});
   const evidence=await page.evaluate(()=>window.SparkleInteriorEvidence);
   assert(evidence.meshes>0&&evidence.triangles>1000,'Real native interior geometry missing '+key);
   const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:innerHeight,board:(()=>{let r=document.querySelector('.vh-dialog').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()}));
   assert(layout.width<=device.width+2,'Outer page horizontally overflows');
   assert(layout.board.x>=-1&&layout.board.right<=device.width+2&&layout.board.bottom<=device.height+2,'Content board clipped: '+JSON.stringify(layout));
   rooms.add(key);
   if(capture)await page.screenshot({path:output+'/'+device.name+'-'+key+'.png'});
  }
  async function close(){
   if(await page.locator('#village-dialog-wrap').isVisible()){
    // Completion deliberately offers its own home action instead of the pause button.
    const home=page.locator('.vh-completion-home');
    if(await home.isVisible())await home.click();
    else await page.locator('#vh-exit').click();
   }
   await page.waitForFunction(()=>document.querySelector('#village-dialog-wrap')?.hidden&&!window.SparkleInteriorEvidence?.open,null,{timeout:15000});
  }
  async function travel(label,key){
   await close();await page.locator('#vh-map').click();await room('commons',false);
   await page.locator('.vh-map-district-entry').filter({hasText:label}).click();
   await page.waitForFunction(()=>!document.querySelector('#village-dialog-wrap')?.hidden&&document.querySelector('#village-ui')?.dataset.mode!=='map',null,{timeout:70000});
   await room(key);
  }
  async function shortcut(id,key){
   await close();
   if(!(await page.locator('#'+id).isVisible()))await page.locator('#vh-more').click();
   await page.locator('#'+id).click();await room(key);
  }
  try{
   await page.goto(origin+'/village/?who='+device.who+'&autostart=1&nativeQA=1&environmentPreview=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:150000});
   await page.evaluate(()=>window.SparkleEnvironmentPreview('spring','noon'));
   await page.locator('#vh-first-visit').waitFor({state:'hidden',timeout:12000});
   await travel('영어학교','english');
   await page.locator('.vh-mission-card button').first().click();
   await page.locator('#village-ui[data-mode="question"]').waitFor({timeout:25000});await room('english');
   const literal=await page.locator('.vh-visual .v45-counted-object').first().getAttribute('src').catch(()=>null);
   if(literal?.endsWith('/cat.png')){await page.waitForFunction(()=>window.SparkleInteriorEvidence?.taskObject==='cat',null,{timeout:10000});literalObjectVerified=true;}
   const option=page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)').first();
   const optionMetrics=await option.evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),height:el.getBoundingClientRect().height}));
   assert(optionMetrics.font>=20&&optionMetrics.height>=48,'Answer options too small');
   if(await page.locator('#vh-hint').isVisible()){
    await page.locator('#vh-hint').click();await page.locator('.vh-hint-text').waitFor({timeout:10000});
    await page.waitForFunction(()=>window.SparkleInteriorEvidence?.effect==='hint',null,{timeout:10000});hintVerified=true;
   }
   await option.click();
   await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:20000});await room('english',false);
   await page.waitForFunction(()=>['correct','learn'].includes(window.SparkleInteriorEvidence?.effect),null,{timeout:10000});
   await page.screenshot({path:output+'/'+device.name+'-feedback.png'});
   await close();
   await page.waitForTimeout(550);await page.evaluate(()=>window.SparkleNativeWorldProbe());
   await page.waitForFunction(()=>window.SparkleNativeWorldEvidence?.hotspots?.some(h=>h.id==='english'&&h.visible));
   const probe=await page.evaluate(()=>window.SparkleNativeWorldEvidence),gate=probe.hotspots.find(h=>h.id==='english');
   const canvas=await page.locator('#canvas').boundingBox();
   const tap={x:canvas.x+gate.screenX/probe.screenWidth*canvas.width,y:canvas.y+(1-gate.screenY/probe.screenHeight)*canvas.height};
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,tap),'canvas');
   await page.touchscreen.tap(tap.x,tap.y);await room('english',false);
   console.log('V45_LEARNING_RESTORE_PASS',device.name,JSON.stringify(optionMetrics));
   if(device.name==='galaxy'){
    await page.locator('.vh-mission-card button').first().click();
    for(let step=0;step<14;step++){
     await page.waitForFunction(()=>['question','feedback','complete'].includes(document.querySelector('#village-ui')?.dataset.mode),null,{timeout:25000});
     const mode=await page.locator('#village-ui').getAttribute('data-mode');
     if(mode==='complete'){completionVerified=true;break;}
     if(mode==='question'){
      await page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)').first().click();
      await page.locator('#village-ui[data-mode="feedback"]').waitFor({timeout:15000});
     }else{
      await page.locator('#vh-body .vh-wide').filter({hasText:'다음 이야기'}).click();
      await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.mode!=='feedback',null,{timeout:20000});
     }
    }
    assert(completionVerified,'Native interior must allow a full child learning round to finish');
    await page.screenshot({path:output+'/'+device.name+'-completion.png'});
   }

   if(!process.env.QUICK_V45&&device.name==='tablet'){
    for(const [label,key] of [['수학 정원','math'],['이야기 도서관','korean'],['한자 수련관','hanja'],['경시대회 성','challenge'],['마법 연습장','practice'],['성장의 탑','growth']]){
     await travel(label,key);console.log('V45_ROOM_PASS',key);
    }
   }
   await shortcut('vh-pond','pond');
   assert((await page.locator('.vh-pond-fish').count())>0,'Owned/species content preserved');
   await shortcut('vh-garden','garden');
   await shortcut('vh-ocean','ocean');
   await shortcut('vh-shop','shop');
   if(!process.env.QUICK_V45&&device.name==='tablet')await shortcut('vh-career','career');
   await close();
   assert.deepEqual(errors,[]);assert.deepEqual(engineErrors,[]);
   const result={device:device.name,who:device.who,rooms:[...rooms],nativeInteriors:true,learningAnswer:true,hintVisual:hintVerified,literalObjectVerified,completionVerified,feedbackVisual:true,exteriorRestored:true,directBuildingRetap:true,answerFont:optionMetrics.font,answerHeight:optionMetrics.height,jsErrors:0};
   results.push(result);console.log('V45_CONTENT_PASS',JSON.stringify(result));
  }catch(e){await page.screenshot({path:output+'/'+device.name+'-failure.png'}).catch(()=>{});console.error('V45_FAIL',device.name,e.message,JSON.stringify(errors),JSON.stringify(engineErrors));throw e;}
  finally{await context.close();}
 }
 if(!process.env.QUICK_V45){
  const context=await browser.newContext({viewport:{width:360,height:740},locale:'ko-KR',reducedMotion:'reduce'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*.supabase.co/**',route=>route.abort());
  try{
   await page.goto(origin+'/village/?who=se',{waitUntil:'domcontentloaded'});await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true');
   await page.locator('#vh-map').click();await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.interior==='commons');
   assert.equal(await page.locator('#village-ui').getAttribute('data-interior-renderer'),'render');
   assert(await page.locator('.v45-room-fallback').evaluate(img=>img.complete&&img.naturalWidth>0));
   await page.screenshot({path:output+'/compact-2d-fallback.png'});
   await page.goto(origin+'/learning.html?who=se',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.contentRoom==='commons');
   assert(await page.locator('.v45-study-vignette').evaluate(img=>img.complete&&img.naturalWidth>0));
   await page.screenshot({path:output+'/compact-standalone-learning.png'});
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
 await fs.writeFile(output+'/summary.json',JSON.stringify({pass:true,version:'interiors-v45-20261105',productionDataTouched:false,results,fallbackVerified:!process.env.QUICK_V45},null,2));
 console.log('V45_INTERIOR_QA_PASS',results.length);
}finally{await browser.close();}
