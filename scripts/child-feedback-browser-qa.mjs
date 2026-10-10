import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const mod=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=mod.chromium?mod:mod.default;
const out='/Users/01chungee10/Github/sparkle-learning-feedback-v07/docs/child-feedback-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],errors=[];
try {
 for(const {folder,viewport} of [{folder:'magic-village-kma-v06',viewport:{width:390,height:844}},{folder:'magic-village-v06',viewport:{width:844,height:390}}]) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();const localErrors=[];
  page.on('pageerror',e=>localErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')localErrors.push(m.text());});
  await page.addInitScript(()=> {
   let factory;
   Object.defineProperty(window,'createUnityInstance',{configurable:true,get:()=>factory,set:value=>{
    factory=async(...args)=>{const unity=await value(...args);window.__qaUnity=unity;return unity;};
   }});
  });
  const url='http://127.0.0.1:4197/'+folder+'/village/';
  await page.goto(url);
  await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&!document.querySelector('#village-ui').hidden,{},{timeout:120000});
  await page.screenshot({path:out+'/'+folder+'-world.png'});
  await page.getByRole('button',{name:'🗺️ 탐험 지도',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.mode==='map');
  assert.equal(await page.locator('.vh-garden-grid button').count(),5);
  await page.getByRole('button',{name:'✨ 별빛 언덕',exact:true}).click();
  await page.getByRole('button',{name:'🏃 달리기',exact:true}).click();
  assert.equal(await page.locator('#vh-run').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'🪽 살짝 날기',exact:true}).click();
  await page.getByRole('button',{name:'👋 인사',exact:true}).click();
  await page.getByRole('button',{name:'🌱 나무·꽃 키우기',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.mode==='garden');
  await page.getByRole('button',{name:'🌰 1번 흙자리',exact:true}).click();
  await page.getByRole('button',{name:'🌸 분홍 꽃',exact:true}).click();
  for(const [i,name] of ['💧 물주기','☀️ 햇빛','🎵 노래'].entries()) {
   await page.getByRole('button',{name,exact:true}).click();
   await page.waitForFunction(stage=>Number(document.querySelector('[data-mode="garden"] progress')?.value)===stage,i+1);
  }
  assert.equal(await page.locator('progress').getAttribute('max'),'3');
  await page.screenshot({path:out+'/'+folder+'-grown-flower.png'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,'mobile horizontal overflow');
  const small=await page.locator('.vh-garden-slot').evaluateAll(nodes=>nodes.filter(n=>!n.disabled).some(n=>n.getBoundingClientRect().height<44));
  assert.equal(small,false,'garden touch targets under 44px');
  await page.getByRole('button',{name:'🧚 정원으로 걸어가기',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.mode==='explore');
  await page.waitForTimeout(10000);
  await page.screenshot({path:out+'/'+folder+'-garden-world.png'});
  await page.reload();await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&!document.querySelector('#village-ui').hidden,{},{timeout:120000});
  await page.getByRole('button',{name:'🌱 나무·꽃 키우기',exact:true}).click();
  await page.getByRole('button',{name:'🌸 분홍 꽃 3/3',exact:true}).click();
  assert.equal(await page.locator('progress').evaluate(p=>p.value),3);
  await page.getByRole('button',{name:'잠깐 쉬기',exact:true}).click();
  await page.locator('#vh-plaza').click();
  await page.waitForFunction(()=>!document.querySelector('#vh-plaza').disabled);
  await page.getByRole('button',{name:'🌱 나무·꽃 키우기',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'🌰 1번 흙자리',exact:true}).count(),1);
  assert.equal(localErrors.length,0,JSON.stringify(localErrors));
  results.push({folder,viewport,checks:['Unity boot','five destinations','run toggle','hop and wave commands','plant','water sun song','44px targets','no horizontal overflow','reload persistence','family garden separation','no runtime errors'],pass:true});
  console.log('BROWSER_FEEDBACK_PASS',folder);
  await context.close();
 }
} catch(e){errors.push(e.stack);console.error(e);process.exitCode=1;}
finally {await browser.close();await writeFile(out+'/results.json',JSON.stringify({results,errors},null,2));}
