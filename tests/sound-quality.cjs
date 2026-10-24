const { chromium } = require('playwright-core');
const fs = require('fs');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try {
 const page=await browser.newPage(); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://127.0.0.1:8754/');
 await page.locator('#startBtn').click();
 await page.waitForSelector('#gate',{state:'hidden',timeout:30000});
 console.log('ready',await page.evaluate(()=>AdEngine.ready));
 const results=await page.evaluate(async()=>{
  const results={};
  for(const instrument of ['contrabass','cello','piano','flute','bells']) {
   const score=AdPresets.build({mood:'happy',speed:'medium',instrument,style:'bouncy'});
   score.instrument=instrument; score.dynamics='mid';
   for(const key in score.drums) score.drums[key].fill(false);
   score.chords=[[],[],[],[]];
   const blob=await AdEngine.exportWav(score,3);
   const data=await blob.arrayBuffer(); const pcm=new DataView(data); let sum=0,peak=0;
   for(let i=44;i<data.byteLength;i+=2){const a=pcm.getInt16(i,true)/32768;sum+=a*a;peak=Math.max(peak,Math.abs(a));}
   results[instrument]={rms:Math.sqrt(sum/((data.byteLength-44)/2)),peak,bytes:data.byteLength};
   const url=URL.createObjectURL(blob); results[instrument].audio=Array.from(new Uint8Array(data));
  }
  const score=AdPresets.build({mood:'happy',speed:'medium',instrument:'piano',style:'bouncy'});
  score.instrument='piano';
  for(const key in score.drums)score.drums[key].fill(false);
  score.chords=[[],[],[],[]];
  const levels=[];
  for(const dynamics of ['loud','mid','soft']) {
   score.dynamics=dynamics;
   const data=await (await AdEngine.exportWav(score,1)).arrayBuffer();
   const pcm=new DataView(data);let sum=0;
   for(let i=44;i<data.byteLength;i+=2){const a=pcm.getInt16(i,true)/32768;sum+=a*a;}
   levels.push(Math.sqrt(sum/((data.byteLength-44)/2)));
  }
  if(Math.abs(20*Math.log10(levels[1]/levels[0])+6)>.1 || Math.abs(20*Math.log10(levels[2]/levels[0])+14)>.1)throw Error('WAV dynamics mismatch');
  for(const instrument of ['contrabass','cello','piano','flute','bells']) {
   const mixed=AdPresets.build({mood:'happy',speed:'fast',instrument,style:'groovy'});
   mixed.instrument=instrument;mixed.dynamics='loud';
   const data=await (await AdEngine.exportWav(mixed,3)).arrayBuffer();const pcm=new DataView(data);
   for(let i=44;i<data.byteLength;i+=2)if(Math.abs(pcm.getInt16(i,true))>=32767)throw Error('Clipping: '+instrument);
  }
  return results;
 });
 for (const [name,r] of Object.entries(results)) {fs.writeFileSync('/tmp/music-maker-'+name+'.wav',Buffer.from(r.audio)); delete r.audio; if(r.rms<.0001||r.peak>=.999) throw Error('Bad audio '+name);}
 console.log(JSON.stringify(results));
 for(const instrument of ['contrabass','cello','piano','flute','bells']) {
  await page.locator('[data-group="instrument"][data-value="'+instrument+'"]').click();
  await page.locator('#previewBtn').click(); await page.waitForTimeout(350);
  if(await page.evaluate(()=>AdEngine.transportState())!=='started') throw Error('Playback not started '+instrument);
  await page.locator('[data-group="dynamics"][data-value="soft"]').click();
  await page.locator('#previewBtn').click();
 }
 // One continuous 30-second preview must finish and release the voices.
 await page.locator('#previewBtn').click();
 await page.waitForFunction(()=>document.querySelector('#previewBtn').getAttribute('aria-pressed')==='false', null, {timeout: 35000});
 if(await page.evaluate(()=>AdEngine.transportState())==='started') throw Error('Preview did not stop');
 // file:// must work without any remote sample requests.
 const offline=await browser.newPage();
 const external=[]; offline.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url())});
 await offline.goto(require('url').pathToFileURL(require('path').resolve(__dirname,'../index.html')).href);
 await offline.locator('#startBtn').click();
 await offline.waitForSelector('#gate',{state:'hidden'});
 if(external.length) throw Error('External requests: '+external.join(','));
 await offline.close();
 // A malformed sample leaves Start available, and a corrected bank can retry.
 const retry=await browser.newPage();
 await retry.goto(process.env.APP_URL||'http://127.0.0.1:8754/');
 await retry.evaluate(()=>{window.originalSample=MusicMakerSamples.piano.C4;MusicMakerSamples.piano.C4='data:audio/mpeg;base64,AA==';});
 await retry.locator('#startBtn').click();
 await retry.waitForFunction(()=>!document.querySelector('#startBtn').disabled);
 if(await retry.evaluate(()=>AdEngine.ready))throw Error('Ready after decode failure');
 await retry.evaluate(()=>{MusicMakerSamples.piano.C4=window.originalSample;});
 await retry.locator('#startBtn').click();
 await retry.waitForSelector('#gate',{state:'hidden'});
 await retry.close();
 console.log('offline, failure recovery, preview timeout passed');
 console.log('errors',errors); if(errors.length)throw Error(errors.join(';'));
 await page.screenshot({path:'/tmp/music-maker-sampled.png',fullPage:true});
} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
