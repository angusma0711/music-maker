const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8754/');
  await page.locator('[data-language="en"]').click();
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('#startBtn').innerText(),'Start');
  assert.equal(await page.title(),'Music Maker');
  await page.locator('#startBtn').click();await page.locator('#gate').waitFor({state:'hidden'});
  async function assertEnglish(){
   assert(!/\p{Script=Han}/u.test(await page.locator('#app').innerText()),'Chinese remained in English screen');
   const labels=await page.locator('#app [aria-label]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
   assert(!labels.some(s=>/\p{Script=Han}/u.test(s)),'Chinese remained in English accessibility labels');
  }
  await assertEnglish();
  await page.locator('[data-group="instrument"][data-value="flute"]').click();
  await page.locator('[data-group="style"][data-value="light"]').click();
  await page.locator('[data-group="dynamics"][data-value="soft"]').click();
  const state=await page.evaluate(()=>JSON.stringify(AdMusic.getState()));
  await page.locator('#previewBtn').click();await page.waitForTimeout(400);
  const before=await page.evaluate(()=>({time:AdEngine.transportSeconds(),gain:AdEngine.masterGain()}));
  await page.locator('[data-language="zh"]').click();
  assert.equal(await page.locator('#previewBtn').innerText(),'停止');
  assert.equal(await page.locator('#status').innerText(),'正在試聽。');
  assert(!/[A-Za-z]/.test(await page.locator('#app').innerText()),'English remained in Chinese screen');
  assert.equal(await page.evaluate(()=>JSON.stringify(AdMusic.getState())),state);
  const after=await page.evaluate(()=>({time:AdEngine.transportSeconds(),gain:AdEngine.masterGain(),state:AdEngine.transportState()}));
  assert.equal(after.state,'started');assert(after.time>=before.time);assert(Math.abs(after.gain-before.gain)<1e-6);
  await page.locator('[data-language="en"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#previewBtn').innerText(),'Stop');await assertEnglish();
  await page.locator('#previewBtn').click();assert.equal(await page.locator('#status').innerText(),'Preview finished.');
  await page.screenshot({path:'/tmp/music-maker-en.png',fullPage:true});
  await page.locator('[data-language="zh"]').click();await page.screenshot({path:'/tmp/music-maker-zh.png',fullPage:true});
  for(const lang of ['en','zh']){
   await page.setViewportSize({width:375,height:812});await page.locator('[data-language="'+lang+'"]').click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow '+lang);
   await page.screenshot({path:'/tmp/music-maker-'+lang+'-mobile.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS: gate, both languages, accessibility labels, keyboard, state/transport/gain preserved, mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
