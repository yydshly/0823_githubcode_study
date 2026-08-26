import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const brief = process.argv[2] || '为一款面向独立创作者的智能声音产品，设计清冷、克制但有未来感的发布网页；先建立情绪，再解释核心能力，最后留下明确行动。';
const evidenceDirectory = resolve(process.argv[3] || 'evidence/r40-smart-audio-live');
const provider = process.argv[4] || 'codex';
const seed = process.argv[5] || '61';
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});
const errors = [];
const startedAt = Date.now();

try {
  const workbench = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  collectErrors(workbench, 'workbench');
  await workbench.addInitScript(() => {
    window.__liveOutcomeEvents = [];
    addEventListener('creative-lab:pipeline-stage', (event) => window.__liveOutcomeEvents.push({
      at: Date.now(),
      type: 'stage',
      detail: event instanceof CustomEvent ? event.detail : null
    }));
    addEventListener('creative-lab:pipeline-complete', (event) => window.__liveOutcomeEvents.push({
      at: Date.now(),
      type: 'complete',
      detail: event instanceof CustomEvent ? event.detail : null
    }));
  });

  const url = new URL('http://127.0.0.1:8143/workbench.html');
  url.searchParams.set('provider', provider);
  url.searchParams.set('brief', brief);
  url.searchParams.set('quality', 'high');
  url.searchParams.set('seed', seed);
  await workbench.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await workbench.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready', null, { timeout: 45_000 });
  await workbench.locator('#generate').waitFor({ state: 'visible' });
  await workbench.screenshot({ path: resolve(evidenceDirectory, 'workbench-before.png'), fullPage: true });
  console.log(JSON.stringify({ event: 'baseline-ready', provider, seed, elapsedSeconds: seconds() }));

  await workbench.locator('#generate').click();
  let last = '';
  let terminal = '';
  while (Date.now() - startedAt < 1_200_000) {
    const state = await workbench.evaluate(() => {
      const shell = document.querySelector('.wb-stage-shell');
      const snapshot = window.__creativeLab?.snapshot();
      return {
        snapshotState: snapshot?.state || '',
        jobId: snapshot?.jobId || '',
        model: snapshot?.model || '',
        pipelineState: shell?.dataset.pipelineState || '',
        finalRunId: shell?.dataset.finalRunId || '',
        routeTitle: document.querySelector('#outcome-route-title')?.textContent?.trim() || '',
        status: document.querySelector('#workbench-status')?.textContent?.trim() || '',
        receipt: document.querySelector('[data-direct-state]')?.textContent?.trim() || '',
        openHref: document.querySelector('#creative-stage-open')?.href || ''
      };
    });
    const signature = JSON.stringify(state);
    if (signature !== last) {
      console.log(JSON.stringify({ event: 'progress', elapsedSeconds: seconds(), ...state }));
      last = signature;
    }
    if (state.pipelineState === 'complete') { terminal = 'complete'; break; }
    if (state.pipelineState === 'review-failed' || state.pipelineState === 'asset-blocked' || state.snapshotState === 'error') {
      terminal = state.pipelineState || state.snapshotState;
      break;
    }
    await workbench.waitForTimeout(3_000);
  }

  const workbenchState = await workbench.evaluate(() => {
    const shell = document.querySelector('.wb-stage-shell');
    const local = localStorage.getItem('signal-lab:last-best-pipeline:v1');
    return {
      pipelineState: shell?.dataset.pipelineState || '',
      finalRunId: shell?.dataset.finalRunId || '',
      openHref: document.querySelector('#creative-stage-open')?.href || '',
      routeTitle: document.querySelector('#outcome-route-title')?.textContent?.trim() || '',
      routeNote: document.querySelector('#outcome-route-note')?.textContent?.trim() || '',
      receiptState: document.querySelector('[data-direct-state]')?.textContent?.trim() || '',
      receiptNote: document.querySelector('[data-direct-note]')?.textContent?.trim() || '',
      status: document.querySelector('#workbench-status')?.textContent?.trim() || '',
      pipelineSelection: local ? JSON.parse(local) : null,
      events: window.__liveOutcomeEvents || []
    };
  });
  await workbench.screenshot({ path: resolve(evidenceDirectory, 'workbench-final.png'), fullPage: true });

  if (terminal !== 'complete' || !workbenchState.openHref) {
    const report = { brief, provider, seed, elapsedSeconds: seconds(), terminal, workbench: workbenchState, errors };
    await writeFile(resolve(evidenceDirectory, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    throw new Error(`Live outcome did not complete: ${terminal || 'timeout'} ${workbenchState.status}`);
  }

  const finalUrl = new URL(workbenchState.openHref);
  finalUrl.searchParams.set('quality', 'high');
  finalUrl.searchParams.set('motion', 'full');
  finalUrl.searchParams.delete('embed');
  const result = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  collectErrors(result, 'desktop');
  const response = await result.goto(finalUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await result.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 45_000 });
  await result.waitForTimeout(1_000);
  await result.evaluate(() => scrollTo(0, 0));
  await result.waitForTimeout(500);
  const opening = await inspect(result, response?.status() || 0);
  await result.screenshot({ path: resolve(evidenceDirectory, 'desktop-opening.png') });

  await result.evaluate(() => scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * .5)));
  await result.waitForTimeout(900);
  const middle = await inspect(result, response?.status() || 0);
  await result.screenshot({ path: resolve(evidenceDirectory, 'desktop-middle.png') });

  await result.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await result.waitForTimeout(900);
  const ending = await inspect(result, response?.status() || 0);
  await result.screenshot({ path: resolve(evidenceDirectory, 'desktop-ending.png') });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  collectErrors(mobile, 'mobile');
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  const mobileUrl = new URL(finalUrl);
  mobileUrl.searchParams.set('quality', 'low');
  mobileUrl.searchParams.set('motion', 'reduce');
  await mobile.goto(mobileUrl.href, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await mobile.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 45_000 });
  await mobile.waitForTimeout(700);
  const mobileState = await inspect(mobile, 200);
  await mobile.screenshot({ path: resolve(evidenceDirectory, 'mobile-reduced.png') });

  const report = {
    brief,
    provider,
    seed,
    elapsedSeconds: seconds(),
    terminal,
    finalUrl: finalUrl.href,
    workbench: workbenchState,
    opening,
    middle,
    ending,
    mobile: mobileState,
    scrollChanged: opening.scrollY !== ending.scrollY,
    progressChanged: opening.progress !== middle.progress || middle.progress !== ending.progress,
    errors
  };
  await writeFile(resolve(evidenceDirectory, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ event: 'complete', finalRunId: workbenchState.finalRunId || workbenchState.pipelineSelection?.finalRunId, finalUrl: finalUrl.href, elapsedSeconds: seconds(), errors }, null, 2));
  if (!opening.canvasCount || !opening.headingVisible || !report.scrollChanged || mobileState.overflow > 1 || errors.length) process.exitCode = 3;
} finally {
  await browser.close();
}

function collectErrors(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
}

async function inspect(page, status) {
  return page.evaluate((httpStatus) => {
    const heading = document.querySelector('h1');
    const rect = heading?.getBoundingClientRect();
    return {
      status: httpStatus,
      title: document.title,
      heading: heading?.textContent?.trim() || '',
      headingVisible: Boolean(rect && rect.bottom > 0 && rect.top < innerHeight && rect.width > 0 && rect.height > 0),
      canvasCount: document.querySelectorAll('canvas').length,
      imageCount: document.querySelectorAll('img').length,
      ready: document.body.dataset.generatedReady || '',
      progress: document.body.dataset.generatedProgress || '',
      scrollY: Math.round(scrollY),
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: document.documentElement.clientHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visibleText: [...document.querySelectorAll('h1,h2,h3,p,a,button')].filter((node) => {
        const box = node.getBoundingClientRect();
        return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
      }).slice(0, 12).map((node) => node.textContent?.trim()).filter(Boolean)
    };
  }, status);
}

function seconds() {
  return Math.round((Date.now() - startedAt) / 1000);
}
