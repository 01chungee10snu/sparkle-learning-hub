import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const lib=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=lib.chromium?lib:lib.default;
const base=process.env.VILLAGE_ORIGIN||'http://127.0.0.1:4189';
const dir=path.resolve('docs/qa-fairy-v11');
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({
  headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']
});
const context=await browser.newContext({viewport:{width:390,height:844},
  hasTouch:true,isMobile:true,deviceScaleFactor:2,locale:'ko-KR',reducedMotion:'reduce'});
const page=await context.newPage();
const jsErrors=[],httpErrors=[],consoleErrors=[],steps=[];
page.on('pageerror',e=>jsErrors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))
  httpErrors.push(r.status()+' '+r.url());});
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,350));});
try{
  await page.goto(base+'/village/',{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('[data-learner="tae"]').click();
  const started=Date.now();
  await page.locator('#start').click();
  await page.waitForFunction(()=>{
    const ui=document.querySelector('#village-ui');
    return document.querySelector('#loading')?.hidden===true && ui?.dataset.ready==='true'
      && document.querySelector('#canvas')?.style.display==='block';
  },undefined,{timeout:240000});
  const durationMs=Date.now()-started;
  const canvasOk=await page.locator('#canvas').evaluate(node=>{
    const c=node.getContext('webgl2')||node.getContext('webgl');
    return !!c&&node.width>=200&&node.height>=200;
  });
  assert(canvasOk,'Unity WebGL canvas not ready');
  const originalArt=await page.locator('#village-ui').getAttribute('data-avatar-style');
  assert.equal(originalArt,'classic');
  const before=await page.locator('#vh-stars').innerText();
  await page.waitForTimeout(1100);
  await page.locator('#canvas').screenshot({path:path.join(dir,'tae-3d-classic.png')});
  steps.push('real-webgl-loaded','classic-canvas-captured');

  for(const style of ['garden','starlight','explorer','festival']){
    await page.locator('#vh-more').click();
    await page.locator('#vh-wardrobe').click();
    await page.locator('.vh-style-card[data-style="'+style+'"]').click();
    assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),style);
    assert.equal(await page.locator('#vh-stars').innerText(),before,'skin must not spend stars');
    await page.locator('#vh-exit').click();
    await page.waitForTimeout(650);
    await page.locator('#canvas').screenshot({path:path.join(dir,'tae-3d-'+style+'.png')});
    steps.push('style-'+style+'-3d-screenshot');
  }
  await page.locator('#vh-more').click();
  await page.locator('#vh-wardrobe').click();
  await page.locator('.vh-style-card[data-style="classic"]').click();
  assert.equal(await page.locator('#village-ui').getAttribute('data-avatar-style'),'classic');
  await page.locator('#vh-exit').click();
  assert.equal(await page.locator('#vh-stars').innerText(),before);
  await page.screenshot({path:path.join(dir,'tae-3d-return-to-classic.png')});
  const result={pass:jsErrors.length===0&&httpErrors.length===0,
    checkedAt:new Date().toISOString(),mode:'incognito-3d-webgl-swiftshader',
    origin:base,durationMs,canvasOk,variations:4,sourceArtPreserved:true,
    learningWalletUntouched:true,realMobileHardwareTested:false,steps,
    jsErrors,httpErrors,consoleErrors};
  await fs.writeFile(path.join(dir,'FAIRY_STYLE_3D_QA_RESULT.json'),
    JSON.stringify(result,null,2)+'\n');
  assert.deepEqual(jsErrors,[],'JS errors');
  assert.deepEqual(httpErrors,[],'HTTP errors');
  console.log('FAIRY_STYLE_REAL_WEBGL_QA_PASS '+JSON.stringify({durationMs,steps,consoleErrors}));
} finally {await context.close();await browser.close();}
