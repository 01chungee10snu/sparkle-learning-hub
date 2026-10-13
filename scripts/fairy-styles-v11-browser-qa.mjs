import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=process.env.VILLAGE_ORIGIN||'http://127.0.0.1:4189';
const output=path.resolve('docs/qa-fairy-v11');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const contexts=[],errors=[],missing=[],checks=[];
try {
  for(const device of [
    {name:'galaxy-360x740',width:360,height:740},
    {name:'iphone-390x844',width:390,height:844},
    {name:'tablet-768x1024',width:768,height:1024}
  ]){
    const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},
      deviceScaleFactor:device.width<500?2:1,hasTouch:true,isMobile:device.width<500,
      locale:'ko-KR',reducedMotion:'reduce'});
    contexts.push(ctx);
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(device.name+': '+e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))
      missing.push(device.name+': '+r.status()+' '+r.url());});

    const enter=async learner=>{
      await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('[data-learner="'+learner+'"]').click();
      await page.locator('#lite').click();
      await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'
        &&document.querySelector('#loading')?.hidden===true,undefined,{timeout:35000});
    };
    const wardrobe=async()=>{
      await page.locator('#vh-more').click();
      await page.locator('#vh-wardrobe').click();
      await page.waitForFunction(()=>!document.querySelector('#village-dialog-wrap').hidden
        &&document.querySelector('#village-ui')?.dataset.mode==='wardrobe');
      assert.equal(await page.locator('.vh-style-card').count(),5);
      assert.equal(await page.locator('#vh-stars').count(),1);
    };
    await enter('tae');
    const taeBefore=await page.locator('#vh-stars').innerText();
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'classic');
    await wardrobe();
    const card=page.locator('.vh-style-card[data-style="garden"]');
    const dimensions=await card.boundingBox();
    assert(dimensions.width>=44&&dimensions.height>=44,
      device.name+': too small for child touch');
    const source=await page.locator('.vh-style-portrait img').first().evaluate(i=>({
      loaded:i.complete&&i.naturalWidth>=1000,src:i.getAttribute('src')}));
    assert(source.loaded&&source.src.includes('taehee_original'),device.name+': missing base character artwork');
    await card.click();
    assert.equal(await card.getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'garden');
    const store=await page.evaluate(()=>localStorage.getItem('sparkle:fairy-visual-style:v11:tae'));
    assert.equal(store,'garden');
    assert.equal(await page.locator('#vh-stars').innerText(),taeBefore,
      device.name+': changing artwork unexpectedly altered the star wallet');
    await page.screenshot({path:path.join(output,device.name+'-tae-garden.png'),animations:'disabled'});
    await page.locator('#vh-exit').click();

    await enter('se');
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'classic',
      device.name+': first learner variant leaked into second learner');
    const seBefore=await page.locator('#vh-stars').innerText();
    await wardrobe();
    await page.locator('.vh-style-card[data-style="starlight"]').click();
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'starlight');
    assert.equal(await page.locator('#vh-stars').innerText(),seBefore);
    await page.screenshot({path:path.join(output,device.name+'-se-starlight.png'),animations:'disabled'});
    await page.locator('#vh-exit').click();

    await enter('tae');
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'garden',
      device.name+': learner-specific style did not survive page reload');
    await wardrobe();
    const names=await page.locator('.vh-style-name').allTextContents();
    assert(names.includes('처음 만난 요정')&&names.includes('반짝 축제 요정'));
    const pageGeometry=await page.evaluate(()=>({
      viewport:{width:innerWidth,height:innerHeight},
      content:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      dialog:document.querySelector('.vh-dialog')?.getBoundingClientRect().toJSON()}));
    assert(pageGeometry.content.width<=device.width+3,device.name+': wardrobe page overflows horizontally');
    checks.push({device:device.name,styles:5,taeSaved:'garden',seSaved:'starlight',
      walletUntouched:true,originalArtLoaded:true,pageGeometry});
    await ctx.close();contexts.pop();
  }
  assert.deepEqual(errors,[],'JS exceptions');
  assert.deepEqual(missing,[],'HTTP errors');
  await fs.writeFile(path.join(output,'FAIRY_STYLE_QA_RESULT.json'),JSON.stringify({
    pass:true,observedAt:new Date().toISOString(),mode:'isolated-incognito-real-local-host-lite',
    originalArtworkPreserved:true,physicalDeviceTested:false,origin,checks,errors,missing
  },null,2)+'\n');
  console.log('FAIRY_STYLE_BROWSER_QA_PASS '+checks.map(x=>x.device).join(','));
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
