import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const origin = process.env.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143';
const runId = process.argv[2] || 'dedicated-715b072fe2d4';
const jobId = process.argv[3] || 'job-9921a75220e1d50d';
const output = path.resolve('docs/evidence/main-loop-r44');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist'],
});
const report = { runId, jobId, browserErrors: [], frames: [] };

async function captureFrame(page, name, progress) {
  await page.evaluate((value) => window.scrollTo(0, Math.max(0, (document.documentElement.scrollHeight - innerHeight) * value)), progress);
  await page.waitForTimeout(900);
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvasCount: document.querySelectorAll('canvas').length,
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    textLength: document.body.innerText.trim().length,
  }));
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
  report.frames.push({ name, ...metrics });
}

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  desktop.on('pageerror', (error) => report.browserErrors.push(String(error)));
  await desktop.goto(`${origin}/generated-runs/${runId}/?quality=high&motion=full`, { waitUntil: 'networkidle', timeout: 30_000 });
  await desktop.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, { timeout: 15_000 });
  await captureFrame(desktop, '01-opening', 0);
  await captureFrame(desktop, '02-middle', 0.48);
  await captureFrame(desktop, '03-final', 1);
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  mobile.on('pageerror', (error) => report.browserErrors.push(String(error)));
  await mobile.goto(`${origin}/generated-runs/${runId}/?quality=low&motion=reduce`, { waitUntil: 'networkidle', timeout: 30_000 });
  await mobile.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, { timeout: 15_000 });
  await captureFrame(mobile, '04-mobile', 0);
  await mobile.close();

  const workbench = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  workbench.on('pageerror', (error) => report.browserErrors.push(String(error)));
  const brief = encodeURIComponent('为一枚会收集清晨雨声的桌面声学器物设计沉浸式网页。');
  await workbench.goto(`${origin}/workbench.html?provider=codex&quality=high&job=${jobId}&brief=${brief}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await workbench.waitForFunction((id) => document.querySelector('#creative-stage-frame')?.getAttribute('src')?.includes(id), runId, { timeout: 20_000 });
  const recovery = await workbench.evaluate(() => ({
    frameSrc: document.querySelector('#creative-stage-frame')?.getAttribute('src') || '',
    status: document.querySelector('#workbench-status')?.textContent?.trim() || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await workbench.screenshot({ path: path.join(output, '05-workbench-recovery.png'), fullPage: false });
  report.frames.push({ name: 'workbench-recovery', ...recovery });
  await workbench.close();
} finally {
  await browser.close();
}

await writeFile(path.join(output, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
