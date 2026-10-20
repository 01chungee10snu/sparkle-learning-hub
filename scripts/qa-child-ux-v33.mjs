#!/usr/bin/env node
// Real browser checks for child-first navigation, Lite mode and keyboard focus.
import assert from 'node:assert/strict';

const playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=playwright.chromium?playwright:playwright.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4199').replace(/\/$/,'');
const browser=await chromium.launch({
  headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
try {
  for(const device of [
    {name:'small-phone',width:320,height:568,who:'se'},
    {name:'galaxy',width:390,height:844,who:'tae'},
    {name:'tablet',width:768,height:1024,who:'se'}
  ]){
    const context=await browser.newContext({
      viewport:{width:device.width,height:device.height},
      isMobile:true,hasTouch:true,locale:'ko-KR',reducedMotion:'reduce'
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await page.locator('.entry-learner-choice[data-learner="'+device.who+'"]').click();
      assert.match(await page.locator('#entry-learning-link').getAttribute('href'),
        new RegExp('who='+device.who));
      await page.goto(origin+'/village/?who='+device.who,{waitUntil:'domcontentloaded'});
      await page.locator('#lite').click();
      await page.waitForFunction(()=>
        document.querySelector('#village-ui')?.dataset.ready==='true',{},{timeout:40000});
      assert.equal(await page.locator('#village-ui').getAttribute('data-who'),device.who);
      assert.match(await page.locator('#vh-help').textContent(),/수학·국어·영어·한자/);
      for(const id of ['vh-home','vh-plaza','vh-run','vh-hop','vh-wave']){
        assert(await page.locator('#'+id).isHidden(),id+' should not be a dead-end Lite control');
      }
      const pond=page.locator('#vh-pond');
      await pond.click();
      await page.waitForFunction(()=>
        document.querySelector('#vh-title')?.textContent.includes('생명 연못'),null,{timeout:18000});
      assert(await page.locator('#village-dialog-wrap').isVisible());
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'vh-title');
      await page.keyboard.press('Shift+Tab');
      assert(await page.evaluate(()=>
        document.querySelector('#village-dialog-wrap').contains(document.activeElement)),
      'Shift+Tab from dialog title must stay inside the modal');
      await page.keyboard.press('Escape');
      assert(await page.locator('#village-dialog-wrap').isHidden());
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'vh-pond',
        'Closing a dialog should restore focus to its launcher');
      await page.locator('#vh-more').click();
      assert(await page.locator('#vh-extra-tools').isVisible());
      assert.match(await page.locator('#vh-more').textContent(),/둘러보기/);
      // A child can plant once without pressure, but may not rapidly farm
      // multiple upgrades without returning to a *different* quiz item.
      await page.locator('#vh-garden').click();
      await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('정원'));
      await page.locator('.vh-garden-grid').first().getByRole('button',{name:/1번 흙자리/}).click();
      await page.locator('.vh-garden-grid').nth(1).getByRole('button',{name:/분홍 꽃/}).click();
      await page.waitForFunction(who=> {
        try{return JSON.parse(localStorage.getItem('sparkle-play-balance-v1'))?.profiles?.[who]?.plays===1;}
        catch{return false;}
      },device.who,{timeout:10000});
      await page.locator('.vh-garden-care').getByRole('button',{name:/물주기/}).click();
      await page.waitForFunction(()=>document.querySelector('#village-toast')?.textContent.includes('새로운 문제'));
      const persistedStage=await page.evaluate(()=> {
        const key='sparkle-care-garden-v1:'+new URL('../',location.href).pathname;
        return JSON.parse(localStorage.getItem(key))?.[document.querySelector('#village-ui').dataset.who]?.[0]?.stage;
      });
      assert.equal(persistedStage,0,'Repeated care without new learning must not grow a plant');
      await page.keyboard.press('Escape');
      assert.equal(errors.length,0,'JavaScript exception: '+errors.join('; '));
      const overflow=await page.evaluate(()=>
        document.documentElement.scrollWidth>window.innerWidth+4);
      assert.equal(overflow,false,device.name+' should not overflow horizontally');
      console.log('PASS_CHILD_UX_V33 '+device.name+' '+device.who);
    } finally {await context.close();}
  }
} finally {await browser.close();}
