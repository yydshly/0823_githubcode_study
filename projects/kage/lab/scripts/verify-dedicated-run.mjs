import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const runId = process.argv[2];
const evidenceDirectory = resolve(process.argv[3] || 'evidence/dedicated-run');
if (!runId || !/^dedicated-[a-z0-9]+$/.test(runId)) throw new Error('Usage: node scripts/verify-dedicated-run.mjs dedicated-<id> [evidence-dir]');
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});
const errors = [];
const assetResponses = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('response', (response) => {
    if (response.url().includes('/creative-assets/')) assetResponses.push({ url: response.url(), status: response.status() });
  });
  const url = `http://127.0.0.1:8143/generated-runs/${runId}/?quality=high&motion=full&visual-review=1`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
  await page.waitForTimeout(800);
  const opening = await inspect(page, response?.status() || 0);
  await page.screenshot({ path: resolve(evidenceDirectory, 'desktop-opening.png'), fullPage: false });
  await page.evaluate(() => {
    window.scrollTo({ top: Math.round((document.documentElement.scrollHeight - innerHeight) * .5), behavior: 'instant' });
    window.postMessage({ type: 'signal-lab:preview-progress', progress: .5 }, '*');
  });
  await page.waitForTimeout(900);
  const middle = await inspect(page, response?.status() || 0);
  await page.screenshot({ path: resolve(evidenceDirectory, 'desktop-middle.png'), fullPage: false });
  await page.mouse.move(1120, 310, { steps: 12 });
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    window.postMessage({ type: 'signal-lab:preview-progress', progress: 1 }, '*');
  });
  await page.waitForTimeout(900);
  const ending = await inspect(page, response?.status() || 0);
  await page.screenshot({ path: resolve(evidenceDirectory, 'desktop-ending.png'), fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('console', (message) => { if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`); });
  mobile.on('pageerror', (error) => errors.push(`mobile page: ${error.message}`));
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.goto(`http://127.0.0.1:8143/generated-runs/${runId}/?quality=low&motion=reduce&visual-review=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobile.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
  await mobile.waitForTimeout(500);
  const mobileState = await inspect(mobile, 200);
  await mobile.screenshot({ path: resolve(evidenceDirectory, 'mobile-reduced.png'), fullPage: false });

  const report = {
    runId,
    opening,
    middle,
    ending,
    mobile: mobileState,
    progressChanged: ending.progress !== opening.progress,
    scrollChanged: ending.scrollY !== opening.scrollY,
    assetResponses,
    errors
  };
  console.log(JSON.stringify(report, null, 2));
  if (!opening.canvasCount || !opening.heading || opening.status !== 200) process.exitCode = 2;
  if (!report.scrollChanged || errors.some((message) => !message.includes('WebSocket'))) process.exitCode = 3;
  if (mobileState.overflow > 1) process.exitCode = 4;
} finally {
  await browser.close();
}

async function inspect(page, status) {
  return page.evaluate((httpStatus) => {
    const final = document.querySelector('.dream-copy--final');
    const finalStyle = final ? getComputedStyle(final) : null;
    const finalRect = final?.getBoundingClientRect();
    return {
      status: httpStatus,
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.trim() || '',
      canvasCount: document.querySelectorAll('canvas').length,
      ready: document.body.dataset.generatedReady || '',
      progress: document.body.dataset.generatedProgress || '',
      scrollY: Math.round(window.scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      finalCopy: finalStyle && finalRect ? {
        pageClass: document.querySelector('.dream-page')?.className || '',
        cssVariable: document.querySelector('.dream-page') instanceof HTMLElement ? getComputedStyle(document.querySelector('.dream-page')).getPropertyValue('--final-copy').trim() : '',
        opacity: finalStyle.opacity,
        visibility: finalStyle.visibility,
        zIndex: finalStyle.zIndex,
        color: finalStyle.color,
        top: Math.round(finalRect.top),
        bottom: Math.round(finalRect.bottom),
        width: Math.round(finalRect.width)
      } : null
    };
  }, status);
}
