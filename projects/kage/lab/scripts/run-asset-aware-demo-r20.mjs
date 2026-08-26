import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const brief = process.argv[2] || '为一个先锋时装品牌设计梦幻流体光幕、柔和但有张力的编辑感沉浸式网页，面向年轻创意人群。';
const evidenceDirectory = resolve(process.argv[3] || 'evidence/r20-asset-aware-live-final');
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});
const errors = [];
const captures = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  collectErrors(page, 'workbench');
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
  await capture(page, 'workbench-ready.png');
  console.log(JSON.stringify({ event: 'ready', model: await build.getAttribute('title') }));
  await build.click();

  const started = Date.now();
  let lastState = '';
  let buildState = '';
  while (Date.now() - started < 960_000) {
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
    throw new Error(`Asset-aware build did not compile: ${buildState} ${note}`);
  }

  const iframe = page.locator('#creative-stage-frame');
  const frame = page.frameLocator('#creative-stage-frame');
  await frame.locator('body[data-generated-ready=true]').waitFor({ timeout: 45_000 });
  const directUrl = await iframe.getAttribute('src');
  if (!directUrl) throw new Error('Compiled receipt did not expose a preview URL.');
  await capture(page, 'workbench-compiled.png');
  const receipt = {
    state: await page.locator('[data-direct-state]').textContent(),
    note: await page.locator('[data-direct-note]').textContent(),
    files: await page.locator('[data-direct-files]').textContent(),
    compile: await page.locator('[data-direct-compile-note]').textContent(),
    security: await page.locator('[data-direct-security]').textContent(),
    runtime: await page.locator('[data-direct-runtime]').textContent()
  };

  const result = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  collectErrors(result, 'desktop');
  await result.goto(directUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await result.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 45_000 });
  await result.waitForTimeout(1_200);
  const opening = await inspect(result);
  await capture(result, 'desktop-opening.png');
  await result.evaluate(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * .5, behavior: 'instant' }));
  await result.mouse.move(1180, 280, { steps: 14 });
  await result.waitForTimeout(1_000);
  const middle = await inspect(result);
  await capture(result, 'desktop-middle-pointer.png');
  await result.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await result.waitForTimeout(1_000);
  const ending = await inspect(result);
  await capture(result, 'desktop-ending.png');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  collectErrors(mobile, 'mobile');
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  const mobileUrl = new URL(directUrl);
  mobileUrl.searchParams.set('quality', 'low');
  mobileUrl.searchParams.set('motion', 'reduce');
  await mobile.goto(mobileUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobile.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 45_000 });
  await mobile.waitForTimeout(800);
  const mobileState = await inspect(mobile);
  await capture(mobile, 'mobile-reduced.png');

  const report = {
    directUrl,
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
    receipt,
    opening,
    middle,
    ending,
    mobile: mobileState,
    scrollChanged: middle.scrollY !== opening.scrollY && ending.scrollY !== middle.scrollY,
    errors,
    captures
  };
  await writeFile(resolve(evidenceDirectory, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ event: 'complete', ...report }, null, 2));
  if (!receipt.state?.includes('GPT-5.6-SOL') || !receipt.files?.includes('1 ASSETS')) process.exitCode = 2;
  if (!opening.canvasCount || !opening.heading || !report.scrollChanged || mobileState.overflow > 1 || errors.length) process.exitCode = 3;
} finally {
  await browser.close();
}

function collectErrors(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
}

async function capture(page, filename) {
  try {
    await page.screenshot({ path: resolve(evidenceDirectory, filename) });
    captures.push(filename);
  } catch (error) {
    errors.push(`capture ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function inspect(page) {
  return page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    canvasCount: document.querySelectorAll('canvas').length,
    imageCount: document.querySelectorAll('img').length,
    ready: document.body.dataset.generatedReady || '',
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: document.documentElement.clientHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
}
