#!/usr/bin/env node
/** Browser integration proof: native Unity meshes, real building taps, quiz and play.
 * Isolated synthetic browser profiles only; all production Supabase calls blocked.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try{pw=await import('playwright');}catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.NATIVE_QA_ORIGIN||'http://127.0.0.1:4622').replace(/\/$/,'');
const output=process.env.NATIVE_QA_OUTPUT||'/tmp/sparkle-v42-native-qa';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const device of [{name:'tablet',width:1024,height:768,who:'tae'},{name:'galaxy',width:390,height:844,who:'se'}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],engineErrors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{const s=message.text();if(/NullReferenceException|MissingReferenceException|Shader.*(error|not supported)|V42 native catalog missing/.test(s))engineErrors.push(s);});
  await page.route('**/*.supabase.co/**',route=>route.abort());
  try{
   await page.goto(origin+'/village/?who='+device.who+'&autostart=1&nativeQA=1&environmentPreview=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#village-ui')?.dataset.ready==='true'&&window.SparkleNativeWorldEvidence?.version==='blender-v42-20261104',null,{timeout:150000});
   assert(await page.locator('#canvas').isVisible());
   const evidence=await page.evaluate(()=>window.SparkleNativeWorldEvidence);
   assert.equal(evidence.source,'Unity MeshRenderer runtime');
   assert(evidence.nativeInstances>70&&evidence.nativeMeshes>70&&evidence.interactiveBuildings>=11);
   for(const id of ['World/learning_castle','World/house_library','World/house_moon','World/tree_oak'])assert(evidence.assets.includes(id),'native asset not used '+id);
   await page.evaluate(()=>window.SparkleEnvironmentPreview('spring','noon'));
   await page.locator('#vh-first-visit').waitFor({state:'hidden',timeout:10000});
   await page.waitForTimeout(500);
   await page.screenshot({path:output+'/'+device.name+'-native-world.png'});
   console.log('V42_NATIVE_READY',device.name,evidence.nativeInstances,evidence.nativeTriangles);
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'영어학교'}).click();
   await page.locator('.vh-mission-card').first().waitFor({state:'visible',timeout:70000});
   await page.locator('.vh-mission-card button').first().click();
   await page.locator('#village-ui[data-mode="question"]').waitFor({state:'visible',timeout:20000});
   await page.locator('#village-ui[data-mode="question"] :is(.vh-option,.vh-spatial-gate)').first().click();
   await page.locator('#village-ui[data-mode="feedback"]').waitFor({state:'visible',timeout:15000});
   await page.screenshot({path:output+'/'+device.name+'-native-learning.png'});
   await page.locator('#vh-exit').click();
   await page.waitForTimeout(900);
   await page.evaluate(()=>window.SparkleNativeWorldProbe());
   await page.waitForFunction(()=>window.SparkleNativeWorldEvidence?.hotspots?.length>0);
   const probe=await page.evaluate(()=>window.SparkleNativeWorldEvidence);
   const english=probe.hotspots.find(x=>x.id==='english');
   assert(english?.visible&&english.nativeCollider,'Native English model collider must be in view');
   const canvas=await page.locator('#canvas').boundingBox();
   const tap={x:canvas.x+english.screenX/probe.screenWidth*canvas.width,y:canvas.y+(1-english.screenY/probe.screenHeight)*canvas.height};
   const element=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,tap);
   assert.equal(element,'canvas','Actual native 3D tap must not be intercepted by UI');
   await page.screenshot({path:output+'/'+device.name+'-native-school.png'});
   await page.touchscreen.tap(tap.x,tap.y);
   await page.locator('.vh-mission-card').first().waitFor({state:'visible',timeout:20000});
   console.log('V42_DIRECT_BUILDING_TAP_PASS',device.name,JSON.stringify(tap));
   await page.locator('#vh-exit').click();
   await page.locator('#vh-pond').click();
   await page.locator('#village-ui[data-mode="pond"]').waitFor({state:'visible',timeout:70000});
   assert((await page.locator('.vh-pond-fish').count())>0);
   await page.screenshot({path:output+'/'+device.name+'-native-pond.png'});
   await page.locator('#vh-exit').click();
   await page.locator('#vh-garden').click();
   await page.locator('#village-ui[data-mode="garden"]').waitFor({state:'visible',timeout:20000});
   assert.deepEqual(errors,[]);assert.deepEqual(engineErrors,[]);
   const result={device:device.name,who:device.who,nativeInstances:evidence.nativeInstances,nativeTriangles:evidence.nativeTriangles,directNativeTap:true,learningAnswer:true,pond:true,garden:true,jsErrors:0};
   results.push(result);console.log('V42_NATIVE_PLAY_PASS',JSON.stringify(result));
  }catch(error){
   await page.screenshot({path:output+'/'+device.name+'-failure.png'}).catch(()=>{});
   console.error('V42_NATIVE_QA_FAILURE',device.name,error.message,JSON.stringify(errors),JSON.stringify(engineErrors));
   throw error;
  }finally{await context.close();}
 }
 await fs.writeFile(output+'/summary.json',JSON.stringify({pass:true,environment:'spring/noon preview',productionDataTouched:false,results},null,2));
 console.log('V42_NATIVE_QA_ALL_PASS',results.length);
}finally{await browser.close();}
