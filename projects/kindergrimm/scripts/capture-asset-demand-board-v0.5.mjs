import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightPath = path.resolve(project, '..', 'kage', 'lab', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath));
const url = 'http://127.0.0.1:8882/projects/kindergrimm/asset-lab/';
const evidenceDir = path.join(project, 'evidence');
const consoleErrors = [];

async function open(context, label, suffix = '?mode=usage') {
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ label, message: message.text() }); });
  page.on('pageerror', error => consoleErrors.push({ label, message: error.message }));
  const started = performance.now();
  await page.goto(url + suffix, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__assetLab?.currentUsageStats) && window.__assetLab.snapshot().demandRows > 0 && !window.__assetLab.snapshot().busy, null, { timeout: 30000 });
  return { page, loadMs: Math.round(performance.now() - started) };
}

function inspectDemand() {
  const snapshot = window.__assetLab.snapshot();
  return {
    proof: snapshot.activeUsageProof,
    filter: snapshot.demandFilter,
    rows: snapshot.demandRows,
    coverage: snapshot.demandCoverage,
    percent: document.querySelector('#demand-coverage-percent').textContent,
    label: document.querySelector('#demand-coverage-label').textContent,
    nextTitle: document.querySelector('#demand-next-title').textContent,
    nextCopy: document.querySelector('#demand-next-copy').textContent,
    statuses: [...document.querySelectorAll('#demand-table-body tr')].map(row => row.dataset.status),
    sources: [...document.querySelectorAll('#demand-table-body tr td:nth-child(4)')].map(cell => cell.textContent),
    pressedFilters: document.querySelectorAll('[data-demand-filter][aria-pressed="true"]').length,
  };
}

const browser = await chromium.launch({ headless: true });
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const { page, loadMs } = await open(desktopContext, 'desktop');
const narrative = await page.evaluate(inspectDemand);
await page.click('[data-demand-filter="gap"]');
const narrativeGaps = await page.evaluate(inspectDemand);
await page.click('[data-usage-proof="collection"]');
const collectionGaps = await page.evaluate(inspectDemand);
await page.click('[data-demand-filter="ready"]');
const collectionReady = await page.evaluate(inspectDemand);
await page.click('[data-usage-proof="world"]');
const worldReady = await page.evaluate(inspectDemand);
await page.click('[data-demand-filter="gap"]');
const worldGaps = await page.evaluate(inspectDemand);
await page.locator('.demand-board').screenshot({ path: path.join(evidenceDir, 'asset-lab-v05-demand-world-gaps.png') });

const beforeSources = worldGaps.sources;
const firstFingerprint = await page.evaluate(() => window.__assetLab.currentUsageStats.planFingerprint);
await page.selectOption('#usage-scene-preset', 'winter-greenhouse-shelter');
await page.waitForFunction(previous => window.__assetLab.currentUsageStats.planFingerprint !== previous && !window.__assetLab.snapshot().busy, firstFingerprint);
await page.click('[data-demand-filter="all"]');
const presetDemand = await page.evaluate(inspectDemand);
const presetMeta = await page.evaluate(previous => ({ title: window.__assetLab.currentScenePlan.intent.title, fingerprintChanged: window.__assetLab.currentUsageStats.planFingerprint !== previous }), firstFingerprint);
const presetSync = { demand: presetDemand, ...presetMeta };
const sourceSync = { beforeSources, afterSources: presetSync.demand.sources, changed: JSON.stringify(beforeSources) !== JSON.stringify(presetSync.demand.sources) };

await page.focus('[data-demand-filter="gap"]');
const focusOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
await page.click('[data-usage-proof="narrative"]');
const proofSync = await page.evaluate(inspectDemand);
await desktopContext.close();

const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const { page: tabletPage } = await open(tabletContext, 'tablet');
const tablet = await tabletPage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, rows: window.__assetLab.snapshot().demandRows }));
await tabletContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const { page: mobilePage } = await open(mobileContext, 'mobile');
await mobilePage.click('[data-demand-filter="gap"]');
const mobileDemand = await mobilePage.evaluate(inspectDemand);
const mobileMeta = await mobilePage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, filtersColumns: getComputedStyle(document.querySelector('.demand-filters')).gridTemplateColumns }));
const mobile = { ...mobileMeta, demand: mobileDemand };
await mobilePage.locator('.demand-board').screenshot({ path: path.join(evidenceDir, 'asset-lab-v05-demand-mobile.png') });
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const { page: reducedPage } = await open(reducedContext, 'reduced');
const reduced = await reducedPage.evaluate(() => ({ matched: matchMedia('(prefers-reduced-motion: reduce)').matches, meterTransition: getComputedStyle(document.querySelector('#demand-coverage-bar')).transitionDuration }));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const { page: fallbackPage } = await open(fallbackContext, 'fallback', '?render=off&mode=usage');
await fallbackPage.click('[data-usage-proof="world"]');
const fallbackDemand = await fallbackPage.evaluate(inspectDemand);
const fallbackMeta = await fallbackPage.evaluate(() => ({ worldCanvas: document.querySelectorAll('#usage-world-stage canvas').length, fallbackVisible: !document.querySelector('#usage-world-fallback').hidden }));
const fallback = { ...fallbackMeta, demand: fallbackDemand };
await fallbackContext.close();
await browser.close();

const report = {
  schemaVersion: 'kindergrimm-asset-demand-board-browser-review/0.5', canonicalUrl: url + '?mode=usage', capturedAt: new Date().toISOString(), loadMs,
  narrative, narrativeGaps, collectionGaps, collectionReady, worldReady, worldGaps, presetSync, sourceSync, focusOutline, proofSync, tablet, mobile, reduced, fallback, consoleErrors,
  evidence: ['evidence/asset-lab-v05-demand-world-gaps.png', 'evidence/asset-lab-v05-demand-mobile.png'],
};
await fs.writeFile(path.join(project, 'analysis', 'asset-demand-board-v0.5-browser-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

