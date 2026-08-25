import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightPath = path.resolve(project, '..', 'kage', 'lab', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath));
const url = 'http://127.0.0.1:8882/projects/kindergrimm/asset-lab/';
const evidenceDir = path.join(project, 'evidence');
const consoleErrors = [];

async function open(context, label, suffix = '') {
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ label, message: message.text() }); });
  page.on('pageerror', error => consoleErrors.push({ label, message: error.message }));
  const started = performance.now();
  await page.goto(url + suffix, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__assetLab?.currentUsageStats) && !window.__assetLab.snapshot().busy, null, { timeout: 30000 });
  return { page, loadMs: Math.round(performance.now() - started) };
}

const browser = await chromium.launch({ headless: true });
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const { page, loadMs } = await open(desktopContext, 'desktop', '?mode=usage');
const narrative = await page.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(), stats: window.__assetLab.currentUsageStats,
  title: document.querySelector('#usage-story-title').textContent,
  copy: document.querySelector('#usage-story-copy').textContent,
  characterSource: document.querySelector('#usage-story-character').src.startsWith('data:image/png'),
  itemSource: document.querySelector('#usage-story-item').src.startsWith('data:image/png'),
  contextTitle: document.querySelector('#usage-context-title').textContent,
  contextFields: document.querySelectorAll('.usage-context dd').length,
  selectedTabs: document.querySelectorAll('[data-usage-proof][aria-selected="true"]').length,
  viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
}));
await page.locator('.usage-workspace').screenshot({ path: path.join(evidenceDir, 'asset-lab-v04-usage-narrative.png') });

await page.click('[data-usage-proof="collection"]');
const collection = await page.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  characterSource: document.querySelector('#usage-collection-character').src.startsWith('data:image/png'),
  itemSource: document.querySelector('#usage-collection-item').src.startsWith('data:image/png'),
  ledgerRows: document.querySelectorAll('#usage-collection-ledger > div').length,
  title: document.querySelector('#usage-collection-title').textContent,
  contextTitle: document.querySelector('#usage-context-title').textContent,
}));
await page.locator('.usage-workspace').screenshot({ path: path.join(evidenceDir, 'asset-lab-v04-usage-collection.png') });

await page.click('[data-usage-proof="world"]');
await page.waitForFunction(() => window.__assetLab.snapshot().activeUsageProof === 'world' && document.querySelector('#usage-world-stage canvas'));
const world = await page.evaluate(() => {
  const canvas = document.querySelector('#usage-world-stage canvas');
  return {
    snapshot: window.__assetLab.snapshot(), stats: window.__assetLab.currentUsageStats.world,
    canvas: { width: canvas.width, height: canvas.height, cssWidth: Math.round(canvas.getBoundingClientRect().width), cssHeight: Math.round(canvas.getBoundingClientRect().height) },
    itemHud: document.querySelector('#usage-world-item').src.startsWith('data:image/png'),
    fallbackHidden: document.querySelector('#usage-world-fallback').hidden,
    contextTitle: document.querySelector('#usage-context-title').textContent,
    statLabel: document.querySelector('#usage-world-stats').textContent,
  };
});
await page.locator('.usage-workspace').screenshot({ path: path.join(evidenceDir, 'asset-lab-v04-usage-world.png') });

const firstPlan = await page.evaluate(() => window.__assetLab.currentUsageStats.planFingerprint);
await page.selectOption('#usage-scene-preset', 'winter-greenhouse-shelter');
await page.waitForFunction(previous => window.__assetLab.currentUsageStats.planFingerprint !== previous && !window.__assetLab.snapshot().busy, firstPlan);
const alternative = await page.evaluate(() => ({
  planFingerprint: window.__assetLab.currentUsageStats.planFingerprint,
  sceneTitle: window.__assetLab.currentScenePlan.intent.title,
  storyTitle: document.querySelector('#usage-story-title').textContent,
  collectionTitle: document.querySelector('#usage-collection-title').textContent,
  worldTitle: document.querySelector('#usage-world-title').textContent,
  itemLabel: document.querySelector('#usage-world-item-label').textContent,
  worldTriangles: window.__assetLab.snapshot().usageWorldTriangles,
}));
await page.evaluate(async () => { await window.__assetLab.generateUsageProofs(); });
const deterministic = await page.evaluate(previous => ({ samePlan: window.__assetLab.currentUsageStats.planFingerprint === previous, worldTriangles: window.__assetLab.snapshot().usageWorldTriangles, generatedMs: window.__assetLab.currentUsageStats.generatedMs }), alternative.planFingerprint);

await page.focus('[data-usage-proof="world"]');
const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
await page.keyboard.press('ArrowLeft');
const keyboard = await page.evaluate(focusOutline => ({ activeUsageProof: window.__assetLab.snapshot().activeUsageProof, focusProof: document.activeElement.dataset.usageProof, outline: focusOutline }), outline);
await desktopContext.close();

const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const { page: tabletPage } = await open(tabletContext, 'tablet', '?mode=usage');
const tablet = await tabletPage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, workspaceColumns: getComputedStyle(document.querySelector('.usage-workspace')).gridTemplateColumns, usageProofs: window.__assetLab.snapshot().usageProofCount }));
await tabletContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const { page: mobilePage } = await open(mobileContext, 'mobile', '?mode=usage');
await mobilePage.click('[data-usage-proof="world"]');
const mobile = await mobilePage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, activeUsageProof: window.__assetLab.snapshot().activeUsageProof, workspaceColumns: getComputedStyle(document.querySelector('.usage-workspace')).gridTemplateColumns, worldCanvas: document.querySelectorAll('#usage-world-stage canvas').length }));
await mobilePage.locator('.usage-workspace').screenshot({ path: path.join(evidenceDir, 'asset-lab-v04-usage-mobile.png') });
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const { page: reducedPage } = await open(reducedContext, 'reduced', '?mode=usage');
const reduced = await reducedPage.evaluate(() => ({ matched: matchMedia('(prefers-reduced-motion: reduce)').matches, transition: getComputedStyle(document.querySelector('.usage-tabs button')).transitionDuration, proofCount: window.__assetLab.snapshot().usageProofCount }));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const { page: fallbackPage } = await open(fallbackContext, 'fallback', '?render=off&mode=usage');
await fallbackPage.click('[data-usage-proof="world"]');
const fallback = await fallbackPage.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  worldCanvas: document.querySelectorAll('#usage-world-stage canvas').length,
  fallbackVisible: !document.querySelector('#usage-world-fallback').hidden,
  itemHud: document.querySelector('#usage-world-item').src.startsWith('data:image/png'),
  storyItem: document.querySelector('#usage-story-item').src.startsWith('data:image/png'),
  collectionItem: document.querySelector('#usage-collection-item').src.startsWith('data:image/png'),
  unavailableMedia: document.querySelectorAll('[data-usage-unavailable]').length,
  contextTitle: document.querySelector('#usage-context-title').textContent,
}));
await fallbackPage.locator('.usage-workspace').screenshot({ path: path.join(evidenceDir, 'asset-lab-v04-usage-fallback.png') });
await fallbackContext.close();
await browser.close();

const report = {
  schemaVersion: 'kindergrimm-asset-usage-proofs-browser-review/0.4', canonicalUrl: url, capturedAt: new Date().toISOString(), loadMs,
  narrative, collection, world, alternative, deterministic, keyboard, tablet, mobile, reduced, fallback, consoleErrors,
  evidence: ['evidence/asset-lab-v04-usage-narrative.png','evidence/asset-lab-v04-usage-collection.png','evidence/asset-lab-v04-usage-world.png','evidence/asset-lab-v04-usage-mobile.png','evidence/asset-lab-v04-usage-fallback.png'],
};
await fs.writeFile(path.join(project, 'analysis', 'asset-usage-proofs-v0.4-browser-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
