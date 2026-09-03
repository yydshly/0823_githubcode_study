import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const origin = process.env.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143';
const runId = process.argv[2];
const output = path.resolve(process.argv[3] || '.artifacts/generated-run');
if (!runId) throw new Error('Usage: node scripts/capture-generated-run.mjs <run-id> [output-directory]');
await mkdir(output, { recursive: true });

let desktopCheckpoints = [
  { id: 'opening', progress: 0 },
  { id: 'middle', progress: .48 },
  { id: 'final', progress: 1 },
];
try {
  const buildReport = JSON.parse(await readFile(path.resolve('generated', 'runs', runId, 'build-report.json'), 'utf8'));
  const beats = buildReport?.request?.creativeContract?.experience?.beats;
  if (Array.isArray(beats) && beats.length >= 2 && beats.length <= 6) {
    desktopCheckpoints = beats.map((beat, index) => ({
      id: index === 0 ? 'opening' : index === beats.length - 1 ? 'final' : String(beat.id || `beat-${index}`),
      progress: Number(beat.position),
    })).filter((beat) => Number.isFinite(beat.progress));
  }
} catch {
  // Compatibility fallback for old runs without a creative contract.
}

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});
const report = { runId, browserErrors: [], responseErrors: [], frames: [] };

async function capture(page, name, progress) {
  await page.evaluate((value) => window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) * value)), progress);
  await page.waitForTimeout(700);
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    progress: document.documentElement.scrollHeight <= innerHeight
      ? 0
      : scrollY / (document.documentElement.scrollHeight - innerHeight),
    scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    canvasCount: document.querySelectorAll('canvas').length,
    imageSources: [...document.images].map((image) => image.currentSrc || image.src),
    headingVisible: (() => {
      const node = document.querySelector('h1');
      if (!node) return false;
      const box = node.getBoundingClientRect();
      return box.bottom > 0 && box.top < innerHeight;
    })(),
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    visibleText: document.body.innerText.trim().length,
  }));
  await page.screenshot({ path: path.join(output, `${name}.jpg`), type: 'jpeg', quality: 84 });
  report.frames.push({ name, ...metrics });
}

async function observe(page) {
  page.on('pageerror', (error) => report.browserErrors.push(String(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) report.responseErrors.push(`${response.status()} ${response.url()}`);
  });
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await observe(desktop);
  await desktop.goto(`${origin}/generated-runs/${runId}/?quality=high&motion=full`, { waitUntil: 'networkidle', timeout: 30_000 });
  await desktop.waitForFunction(() => {
    const app = document.querySelector('#app');
    return app && !app.querySelector('.generated-loading') && app.children.length > 0 && [...document.images].every((image) => image.complete);
  }, undefined, { timeout: 20_000 });
  for (let index = 0; index < desktopCheckpoints.length; index += 1) {
    const checkpoint = desktopCheckpoints[index];
    await capture(desktop, `${String(index + 1).padStart(2, '0')}-${checkpoint.id}`, checkpoint.progress);
  }
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await observe(mobile);
  await mobile.goto(`${origin}/generated-runs/${runId}/?quality=low&motion=reduce`, { waitUntil: 'networkidle', timeout: 30_000 });
  await mobile.waitForFunction(() => {
    const app = document.querySelector('#app');
    return app && !app.querySelector('.generated-loading') && app.children.length > 0 && [...document.images].every((image) => image.complete);
  }, undefined, { timeout: 20_000 });
  await capture(mobile, `${String(desktopCheckpoints.length + 1).padStart(2, '0')}-mobile`, 0);
  await mobile.close();
} finally {
  await browser.close();
}

await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
