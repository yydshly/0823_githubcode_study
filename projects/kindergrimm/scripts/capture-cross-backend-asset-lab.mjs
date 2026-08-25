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
  await page.waitForFunction(() => Boolean(window.__assetLab?.current) && !window.__assetLab.snapshot().busy, null, { timeout: 30000 });
  return { page, loadMs: Math.round(performance.now() - started) };
}

const browser = await chromium.launch({ headless: true });

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const { page: desktop, loadMs } = await open(desktopContext, 'desktop');
const desktopState = await desktop.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  viewport: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  title: document.querySelector('h1').textContent,
  cards: document.querySelectorAll('.preview-card').length,
  canvasSizes: [...document.querySelectorAll('.canvas-host canvas')].map(canvas => ({ width: canvas.width, height: canvas.height })),
  sourceBoundary: document.querySelector('.source-boundary').textContent.includes('buildVoxelCharacter'),
}));
await desktop.screenshot({ path: path.join(evidenceDir, 'asset-lab-desktop.png') });

const originalFingerprint = desktopState.snapshot.fingerprint;
await desktop.selectOption('#preset', 'forest-scout');
await desktop.waitForFunction(previous => window.__assetLab.snapshot().seed === 418203 && window.__assetLab.snapshot().fingerprint !== previous && !window.__assetLab.snapshot().busy, originalFingerprint);
const interaction = await desktop.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  intent: JSON.parse(document.querySelector('#intent-json').textContent),
  statLabels: [...document.querySelectorAll('.preview-meta p')].map(node => node.textContent),
}));
await desktop.locator('.preview-grid').screenshot({ path: path.join(evidenceDir, 'asset-lab-three-outputs.png') });

const exportResult = await desktop.evaluate(async () => {
  const bundle = await window.__assetLab.exportBundle({ download: false });
  return {
    fileCount: bundle.files.length + 1,
    pngs: bundle.files.map(file => ({ backend: file.record.backend, bytes: file.blob.size, width: file.record.width, height: file.record.height, shaLength: file.record.sha256.length })),
    manifestBytes: bundle.manifestBlob.size,
    manifest: {
      schemaVersion: bundle.manifest.schemaVersion,
      commit: bundle.manifest.source.commit,
      outputCount: bundle.manifest.outputs.length,
      runtimeModel: bundle.manifest.runtimeModel,
      fingerprint: bundle.manifest.fingerprint,
    },
  };
});

await desktop.fill('#seed', '0');
await desktop.locator('#intent-form button[type="submit"]').click();
await desktop.waitForFunction(() => !document.querySelector('#form-error').hidden);
const invalid = await desktop.evaluate(() => ({ message: document.querySelector('#form-error').textContent, currentSeed: window.__assetLab.snapshot().seed }));

await desktop.fill('#seed', '418204');
await desktop.locator('#intent-form button[type="submit"]').focus();
const focusOutline = await desktop.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
await desktop.keyboard.press('Enter');
await desktop.waitForFunction(() => window.__assetLab.snapshot().seed === 418204 && !window.__assetLab.snapshot().busy);
const keyboard = await desktop.evaluate(() => ({ seed: window.__assetLab.snapshot().seed, activeTag: document.activeElement.tagName }));
await desktopContext.close();

const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const { page: tablet } = await open(tabletContext, 'tablet');
const tabletState = await tablet.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector('.preview-grid')).gridTemplateColumns }));
await tablet.screenshot({ path: path.join(evidenceDir, 'asset-lab-tablet.png') });
await tabletContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const { page: mobile } = await open(mobileContext, 'mobile');
await mobile.locator('.preview-grid').scrollIntoViewIfNeeded();
const mobileState = await mobile.evaluate(() => ({
  viewport: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  columns: getComputedStyle(document.querySelector('.preview-grid')).gridTemplateColumns,
  canvasWidth: Math.round(document.querySelector('.canvas-host').getBoundingClientRect().width),
  exportVisible: Boolean(document.querySelector('#export-package')),
}));
await mobile.locator('.preview-grid').screenshot({ path: path.join(evidenceDir, 'asset-lab-mobile-outputs.png') });
await mobileContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const { page: reducedPage } = await open(reducedContext, 'reduced');
const reduced = await reducedPage.evaluate(() => ({ matched: matchMedia('(prefers-reduced-motion: reduce)').matches, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior }));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const { page: fallback } = await open(fallbackContext, 'fallback', '?render=off');
const fallbackState = await fallback.evaluate(() => ({ snapshot: window.__assetLab.snapshot(), recipes: document.querySelectorAll('.preview-card details pre').length, sourceLinks: document.querySelectorAll('#render-fallback a').length, exportDisabled: document.querySelector('#export-package').disabled }));
await fallback.screenshot({ path: path.join(evidenceDir, 'asset-lab-fallback.png') });
await fallbackContext.close();

const overviewContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const overviewPage = await overviewContext.newPage();
await overviewPage.goto('http://127.0.0.1:8882/docs/projects/kindergrimm.html', { waitUntil: 'networkidle' });
const overview = await overviewPage.evaluate(() => ({
  links: [...document.querySelectorAll('a[href*="/asset-lab/"]')].map(link => link.textContent.trim()),
  scrollWidth: document.documentElement.scrollWidth,
  viewport: innerWidth,
}));
await overviewContext.close();

await browser.close();

const report = {
  schemaVersion: 'kindergrimm-cross-backend-asset-lab-browser-review/1.0',
  canonicalUrl: url,
  capturedAt: new Date().toISOString(),
  loadMs,
  desktop: desktopState,
  interaction,
  exportResult,
  invalid,
  keyboard: { ...keyboard, outline: focusOutline },
  tablet: tabletState,
  mobile: mobileState,
  reduced,
  fallback: fallbackState,
  overview,
  consoleErrors,
  evidence: [
    'evidence/asset-lab-desktop.png',
    'evidence/asset-lab-three-outputs.png',
    'evidence/asset-lab-tablet.png',
    'evidence/asset-lab-mobile-outputs.png',
    'evidence/asset-lab-fallback.png',
  ],
};

await fs.writeFile(path.join(project, 'analysis', 'cross-backend-asset-lab-browser-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
