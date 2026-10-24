import { createRequire } from 'module';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const base = process.env.APP_URL || 'http://127.0.0.1:8743/';
const shotPath = process.env.SHOT || '/tmp/screenshot_main_screen.png';
const errors = [];

function wavInfo(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]);
  const wave = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
  const rate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bits = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);
  const bytesPer = channels * (bits / 8);
  let sum = 0;
  let peak = 0;
  let n = 0;
  const end = Math.min(buf.length, 44 + dataSize);
  for (let i = 44; i + 1 < end; i += 2) {
    const s = view.getInt16(i, true) / 32768;
    sum += s * s;
    peak = Math.max(peak, Math.abs(s));
    n += 1;
  }
  return {
    tag,
    wave,
    rate,
    channels,
    bits,
    duration: dataSize / (rate * bytesPer),
    rms: Math.sqrt(sum / n),
    peak
  };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required', '--disable-gpu']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('console: ' + msg.text());
});

try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#startBtn');
  const startText = await page.locator('#startBtn').innerText();
  assert(startText.includes('開始'), 'start button missing Chinese label: ' + startText);

  await page.locator('#startBtn').click();
  await page.waitForSelector('#gate', { state: 'hidden' });
  await page.waitForFunction(() => document.querySelectorAll('#grid .cell').length >= 160);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v && v.readyState >= 2 && v.videoWidth === 480 && v.videoHeight === 848 && v.duration > 5 && v.duration < 5.4;
  });
  const adLabel = await page.locator('#tvLabel').innerText();
  assert(adLabel.includes('廣告') && adLabel.includes('5'), 'default label: ' + adLabel);
  await page.evaluate(() => { document.querySelector('video').currentTime = 1.2; });
  await page.waitForFunction(() => document.querySelector('video').currentTime > 1);

  const title = await page.locator('h1').innerText();
  assert(title.includes('廣告音樂'), 'title: ' + title);
  const onCells = await page.locator('#grid .cell[aria-pressed="true"]').count();
  assert(onCells > 8, 'default preset should light several cells, got ' + onCells);

  await mkdir('/tmp', { recursive: true });
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log('screenshot', shotPath);

  const combos = await page.evaluate(() => {
    const moods = ['happy', 'exciting', 'calm', 'sad', 'mysterious'];
    const speeds = ['slow', 'medium', 'fast'];
    const instruments = ['contrabass', 'cello', 'piano', 'flute', 'bells'];
    const styles = ['bouncy', 'steady', 'light', 'groovy'];
    for (const mood of moods) {
      for (const speed of speeds) {
        for (const instrument of instruments) {
          for (const style of styles) {
            const built = AdPresets.build({ mood, speed, instrument, style });
            if (built.melody.length !== 5 || built.scale.length !== 5 || built.chords.length !== 4) return false;
            if (built.melody.some((row) => row.length !== 16)) return false;
            if (['kick', 'snare', 'hat', 'clap', 'tom'].some((id) => built.drums[id].length !== 16)) return false;
          }
        }
      }
    }
    return true;
  });
  assert(combos, 'preset builder failed for a combination');

  await page.locator('[data-group="mood"][data-value="mysterious"]').click();
  await page.waitForFunction(() => document.getElementById('scaleLine').textContent.includes('小調'));
  const mysteriousOn = await page.locator('#grid .cell[aria-pressed="true"]').count();
  assert(mysteriousOn > 0, 'mysterious preset empty');

  const offCell = page.locator('#grid .cell[data-kind="melody"][aria-pressed="false"]').first();
  const beforeLabel = await offCell.getAttribute('aria-label');
  await offCell.click();
  const pressed = await page.locator('#grid .cell[aria-label="' + beforeLabel.replace(/"/g, '\\"') + '"]').getAttribute('aria-pressed');
  assert(pressed === 'true', 'grid click did not turn a cell on');
  const edited = await page.locator('#summary').innerText();
  assert(edited.includes('已修改') || edited.includes('edited'), 'edit flag missing: ' + edited);

  await page.locator('#previewBtn').click();
  await page.waitForFunction(() => Tone.Transport.state === 'started', null, { timeout: 4000 });
  await page.waitForTimeout(700);
  const playhead = await page.locator('#grid').getAttribute('data-playhead');
  assert(playhead !== null && playhead !== '', 'playhead did not move during preview: ' + playhead);
  await page.locator('#previewBtn').click();
  await page.waitForFunction(() => Tone.Transport.state !== 'started');

  await page.locator('#watchMusic').click();
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && !video.paused && video.currentTime > 0.35 && Tone.Transport.state === 'started';
  }, null, { timeout: 5000 });
  await page.waitForTimeout(400);
  const sync = await page.evaluate(() => ({
    video: document.querySelector('video').currentTime,
    music: Tone.Transport.seconds,
    state: Tone.Transport.state
  }));
  console.log('sync', sync);
  assert(Math.abs(sync.video - sync.music) < 0.35, 'video and music drifted: ' + JSON.stringify(sync));

  await page.locator('#videoToggle').click();
  await page.waitForFunction(() => document.querySelector('video').paused && Tone.Transport.state !== 'started');
  await page.evaluate(() => { document.querySelector('video').currentTime = 4; });
  await page.waitForTimeout(250);
  const parked = await page.evaluate(() => ({
    video: document.querySelector('video').currentTime,
    music: Tone.Transport.seconds,
    state: Tone.Transport.state
  }));
  console.log('parked', parked);
  assert(parked.state !== 'started', 'music kept playing while video was paused');
  assert(Math.abs(parked.video - 4) < 0.3, 'video did not seek: ' + JSON.stringify(parked));
  assert(Math.abs(parked.music - 4) < 0.35, 'seek did not move the music: ' + JSON.stringify(parked));

  await page.locator('#videoToggle').click();
  await page.waitForFunction(() => document.querySelector('video').ended, null, { timeout: 4000 });
  const shortEnd = await page.evaluate(() => ({
    duration: document.querySelector('video').duration,
    music: Tone.Transport.state,
    status: document.getElementById('status').textContent,
    length: AdMusic.getState().length
  }));
  console.log('shortEnd', shortEnd);
  assert(shortEnd.duration < shortEnd.length, 'expected the classroom ad to be shorter than the music');
  assert(shortEnd.music !== 'started', 'music kept going after the short ad ended');
  assert(shortEnd.status.includes('播完'), 'missing end message after the short ad: ' + shortEnd.status);

  await page.locator('#useDemo').click();
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v.duration > 14 && v.readyState >= 1 && document.getElementById('tvLabel').textContent.includes('陽光橙');
  });
  await page.locator('#watchMusic').click();
  await page.waitForFunction(() => !document.querySelector('video').paused && Tone.Transport.state === 'started');
  await page.locator('#videoToggle').click();
  await page.waitForFunction(() => document.querySelector('video').paused && Tone.Transport.state !== 'started');
  await page.evaluate(() => {
    const input = document.getElementById('length');
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('video').currentTime = 11;
  });
  await page.waitForTimeout(250);
  const ended = await page.evaluate(() => ({
    length: AdMusic.getState().length,
    video: document.querySelector('video').currentTime,
    state: Tone.Transport.state,
    status: document.getElementById('status').textContent
  }));
  console.log('ended', ended);
  assert(ended.length === 10, 'length slider did not stick');
  assert(ended.video > 10.5, 'video did not seek past the music: ' + JSON.stringify(ended));
  assert(ended.state !== 'started', 'music played past the chosen length');
  assert(ended.status.includes('播完'), 'missing end message: ' + ended.status);

  async function downloadWav(filename) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#saveWav').click()
    ]);
    const file = '/tmp/' + filename;
    await download.saveAs(file);
    return readFile(file);
  }

  await page.evaluate(() => {
    const input = document.getElementById('length');
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#exportWav').click();
  await page.waitForSelector('#saveWav:not([hidden])', { timeout: 60000 });
  const wavA = wavInfo(await downloadWav('ad-a.wav'));
  console.log('wavA', wavA);
  assert(wavA.tag === 'RIFF' && wavA.wave === 'WAVE', 'not a wav');
  assert(wavA.duration > 9.9 && wavA.duration < 10.6, 'wav duration ' + wavA.duration);
  assert(wavA.rms > 0.02, 'wav too quiet ' + wavA.rms);
  assert(wavA.peak < 1.01, 'wav peak ' + wavA.peak);

  await page.locator('#previewBtn').click();
  await page.waitForFunction(() => Tone.Transport.state === 'started', null, { timeout: 4000 });
  await page.locator('#previewBtn').click();
  await page.waitForFunction(() => Tone.Transport.state !== 'started');

  await page.locator('[data-group="mood"][data-value="happy"]').click();
  await page.locator('#exportWav').click();
  await page.waitForSelector('#saveWav:not([hidden])', { timeout: 60000 });
  const wavB = await downloadWav('ad-b.wav');
  assert(!wavAEquals(await readFile('/tmp/ad-a.wav'), wavB), 'happy and mysterious exports were identical');

  const cell = page.locator('#grid .cell[data-kind="melody"][aria-pressed="false"]').first();
  await cell.click();
  await page.locator('#exportWav').click();
  await page.waitForSelector('#saveWav:not([hidden])', { timeout: 60000 });
  const wavC = await downloadWav('ad-c.wav');
  assert(!wavAEquals(wavB, wavC), 'grid edit did not change the wav');

  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#saveJson').click()
  ]);
  const jsonPath = '/tmp/ad-music.json';
  await jsonDownload.saveAs(jsonPath);
  const saved = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert(saved.app === 'ad-music-workshop', 'json app id');
  assert(saved.melody.length === 5 && saved.drums.kick.length === 16, 'json shape');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#startBtn').click();
  await page.waitForSelector('#gate', { state: 'hidden' });
  await page.setInputFiles('#loadJson', jsonPath);
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('已載入'));
  const roundTrip = await page.evaluate((expected) => {
    const now = AdMusic.getState();
    return JSON.stringify(now.melody) === JSON.stringify(expected.melody) &&
      JSON.stringify(now.drums) === JSON.stringify(expected.drums) &&
      now.mood === expected.mood &&
      now.length === expected.length;
  }, saved);
  assert(roundTrip, 'json load did not restore the grid');

  await page.setInputFiles('#videoFile', new URL('../media/placeholder.mp4', import.meta.url).pathname);
  await page.waitForFunction(() => document.querySelector('video').src.startsWith('blob:'));
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('已載入你的影片'));

  for (const size of [{ width: 1280, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    assert(!overflow, 'horizontal overflow at ' + size.width + 'x' + size.height);
  }

  const realErrors = errors.filter((line) => !/favicon/i.test(line));
  assert(realErrors.length === 0, 'console errors:\n' + realErrors.join('\n'));
  console.log('PASS');
} finally {
  await browser.close();
}

function wavAEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 44; i < a.length; i += 80) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
