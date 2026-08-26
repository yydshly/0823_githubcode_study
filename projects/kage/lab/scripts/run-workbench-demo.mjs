import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const brief = process.argv[2] || '为一个先锋时装品牌设计梦幻流体光幕、柔和但有张力的编辑感沉浸式网页，面向年轻创意人群。';
const evidenceDirectory = resolve(process.argv[3] || 'evidence/r19-gpt56-live');
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`workbench: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`workbench: ${error.message}`));
  const url = new URL('http://127.0.0.1:8143/workbench.html');
  url.searchParams.set('provider', 'local');
  url.searchParams.set('brief', brief);
  url.searchParams.set('quality', 'balanced');
  url.searchParams.set('seed', '17');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready', null, { timeout: 30_000 });
  const build = page.locator('#build-dedicated-experience');
  await build.waitFor({ state: 'visible' });
  if (!await build.isEnabled()) throw new Error(`Dedicated build button disabled: ${await build.getAttribute('title')}`);
  await page.screenshot({ path: resolve(evidenceDirectory, 'workbench-ready.png') });
  console.log(JSON.stringify({ event: 'ready', model: await build.getAttribute('title') }));
  await build.click();

  const started = Date.now();
  let lastState = '';
  let buildState = '';
  while (Date.now() - started < 660_000) {
    buildState = await page.locator('.wb-direct-build-receipt').getAttribute('data-state') || '';
    const stateText = await page.locator('[data-direct-state]').textContent().catch(() => '') || '';
    const combined = `${buildState}:${stateText}`;
    if (combined !== lastState) {
      console.log(JSON.stringify({ event: 'progress', elapsedSeconds: Math.round((Date.now() - started) / 1000), buildState, stateText }));
      lastState = combined;
    }
    if (buildState === 'compiled' || buildState === 'failed') break;
    await page.waitForTimeout(5_000);
  }
  if (buildState !== 'compiled') {
    const note = await page.locator('[data-direct-note]').textContent().catch(() => '') || 'timeout';
    throw new Error(`Dedicated build did not compile: ${buildState} ${note}`);
  }

  const frame = page.frameLocator('#creative-stage-frame');
  await frame.locator('body[data-generated-ready=true]').waitFor({ timeout: 30_000 });
  const iframe = page.locator('#creative-stage-frame');
  const directUrl = await iframe.getAttribute('src');
  if (!directUrl) throw new Error('Compiled receipt did not expose a preview URL.');
  await page.screenshot({ path: resolve(evidenceDirectory, 'workbench-compiled.png') });
  const receipt = {
    state: await page.locator('[data-direct-state]').textContent(),
    note: await page.locator('[data-direct-note]').textContent(),
    files: await page.locator('[data-direct-files]').textContent(),
    compile: await page.locator('[data-direct-compile-note]').textContent(),
    security: await page.locator('[data-direct-security]').textContent(),
    runtime: await page.locator('[data-direct-runtime]').textContent()
  };

  const result = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  result.on('console', (message) => { if (message.type() === 'error') errors.push(`desktop: ${message.text()}`); });
  result.on('pageerror', (error) => errors.push(`desktop: ${error.message}`));
  await result.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await result.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
  await result.waitForTimeout(900);
  const opening = await inspect(result);
  await result.screenshot({ path: resolve(evidenceDirectory, 'desktop-opening.png') });
  await result.mouse.move(1130, 300, { steps: 12 });
  await result.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await result.waitForTimeout(1000);
  const ending = await inspect(result);
  await result.screenshot({ path: resolve(evidenceDirectory, 'desktop-ending.png') });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('console', (message) => { if (message.type() === 'error') errors.push(`mobile: ${message.text()}`); });
  mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  const mobileUrl = new URL(directUrl);
  mobileUrl.searchParams.set('quality', 'low');
  mobileUrl.searchParams.set('motion', 'reduce');
  await mobile.goto(mobileUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobile.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
  await mobile.waitForTimeout(600);
  const mobileState = await inspect(mobile);
  await mobile.screenshot({ path: resolve(evidenceDirectory, 'mobile-reduced.png') });

  const report = {
    model: receipt.state,
    directUrl,
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
    receipt,
    opening,
    ending,
    mobile: mobileState,
    scrollChanged: ending.scrollY !== opening.scrollY,
    headingChanged: ending.heading !== opening.heading,
    errors
  };
  await writeFile(resolve(evidenceDirectory, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ event: 'complete', ...report }, null, 2));
  if (!receipt.state?.includes('GPT-5.6-SOL')) process.exitCode = 2;
  if (!opening.canvasCount || !opening.heading || !report.scrollChanged || mobileState.overflow > 1 || errors.length) process.exitCode = 3;
} finally {
  await browser.close();
}

async function inspect(page) {
  return page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    canvasCount: document.querySelectorAll('canvas').length,
    ready: document.body.dataset.generatedReady || '',
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
}

declareGlobal();
function declareGlobal() { return undefined; }
