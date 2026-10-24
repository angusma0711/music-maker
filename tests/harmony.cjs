const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const scope = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/presets.js'),'utf8'),scope);
const presets=scope.window.AdPresets;
const expected={bouncy:['C','F','C','F'],steady:['C','G','F','G'],light:['C','G','C','G'],groovy:['C','F','C','F']};
for(const style of Object.keys(expected)) {
 const score=presets.build({mood:'happy',speed:'medium',style});
 assert.equal(JSON.stringify(score.chordNames),JSON.stringify(expected[style]));
 for(const instrument of presets.instruments) {
  const other=presets.build({mood:'happy',speed:'medium',style,instrument:instrument.id});
  assert.equal(JSON.stringify(other.melody),JSON.stringify(score.melody));
  assert.equal(JSON.stringify(other.chords),JSON.stringify(score.chords));
 }
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:8754/');await page.locator('#startBtn').click();await page.waitForSelector('#gate',{state:'hidden'});
  // A distinct four-chord fixture catches skipped slots even when Float repeats I/V.
  await page.evaluate(()=>{
   window.fixture=AdPresets.build({mood:'calm',speed:'medium',style:'light'});
   fixture.instrument='piano';fixture.dynamics='mid';fixture.bpm=240;
   fixture.melody.forEach(r=>r.fill(false));for(const k in fixture.drums)fixture.drums[k].fill(false);
   window.chordEvents=[];
   const original=Tone.Sampler.prototype.triggerAttackRelease;
   Tone.Sampler.prototype.triggerAttackRelease=function(notes,duration,time,velocity){
    if(Array.isArray(notes))chordEvents.push({notes:notes.join(','),time});
    return original.call(this,notes,duration,time,velocity);
   };
  });
  for(const every of [4,8]) {
   const offline=await page.evaluate(async(every)=>{
    fixture.chordEvery=every;chordEvents.length=0;
    await AdEngine.exportWav(fixture,2.01);
    return {actual:chordEvents.slice(0,4),expected:fixture.chords.map(c=>c.join(','))};
   },every);
   assert.deepEqual(offline.actual.map(x=>x.notes),offline.expected);
   assert(Math.abs(offline.actual[1].time-offline.actual[0].time-every*.0625)<1e-6);
   await page.evaluate(async()=>{chordEvents.length=0;await AdEngine.init(()=>fixture);AdEngine.playFrom(0);});
   await page.waitForTimeout(every===8?2100:1100);
   const live=await page.evaluate(()=>{AdEngine.pauseMusic();return chordEvents.slice(0,4).map(e=>e.notes);});
   assert.deepEqual(live,offline.expected);
   // Seek directly to chord slot 2; it must preserve harmonic phase.
   await page.evaluate((seconds)=>{chordEvents.length=0;AdEngine.playFrom(seconds);},every*.0625*2);
   await page.waitForTimeout(150);
   const seek=await page.evaluate(()=>{AdEngine.pauseMusic();return chordEvents[0]?.notes;});
   assert.equal(seek,offline.expected[2]);
  }
  assert.deepEqual(errors,[]); console.log('PASS: preset harmony, instrument invariance, all four chord slots, live/offline spacing and seek phase');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
