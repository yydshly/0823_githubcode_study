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
  await page.goto(url + suffix, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__assetLab?.current) && !window.__assetLab.snapshot().busy, null, { timeout: 30000 });
  return page;
}

const browser = await chromium.launch({ headless: true });
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await open(desktopContext, 'desktop');
const preserved = await page.evaluate(() => ({ snapshot: window.__assetLab.snapshot(), cards: document.querySelectorAll('.preview-card').length, packageButton: Boolean(document.querySelector('#export-package')) }));

await page.click('[data-mode="style"]');
await page.waitForFunction(() => window.__assetLab.snapshot().activeMode === 'style' && document.querySelector('#style-frame').hasAttribute('src'));
await page.selectOption('#style-capability', 'cubism');
await page.fill('#style-seed', '515151');
await page.selectOption('#style-count', '9');
await page.click('#style-form button[type="submit"]');
await page.waitForFunction(() => document.querySelector('#style-frame').getAttribute('src').includes('cubism') && document.querySelector('#style-frame').getAttribute('src').includes('515151'));
const frame = page.frames().find(candidate => candidate.url().includes('/upstream/styles.html'));
await frame?.waitForFunction(() => Boolean(window.__ready) || document.querySelectorAll('canvas').length > 0, null, { timeout: 30000 }).catch(() => {});
const style = await page.evaluate(() => ({ snapshot: window.__assetLab.snapshot(), registry: document.querySelectorAll('.style-token').length, media: document.querySelectorAll('.style-token [class]').length, frameSrc: document.querySelector('#style-frame').getAttribute('src'), selected: document.querySelectorAll('.style-token.is-active').length, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
await page.locator('#style-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v02-style.png') });

await page.click('[data-mode="item"]');
await page.selectOption('#item-family', 'wand');
await page.selectOption('#item-rank', 'nightmare');
await page.fill('#item-seed', '515151');
await page.click('#item-form button[type="submit"]');
await page.waitForFunction(() => window.__assetLab.snapshot().itemFingerprint);
const firstItemFingerprint = await page.evaluate(() => window.__assetLab.snapshot().itemFingerprint);
await page.click('#item-form button[type="submit"]');
const itemExport = await page.evaluate(async () => {
  const output = await window.__assetLab.exportItem({ download: false });
  return { bytes: output.blob.size, shaLength: output.manifest.output.sha256.length, width: output.manifest.output.width, height: output.manifest.output.height, representation: output.manifest.output.representation, family: output.manifest.identity.family, rank: output.manifest.identity.rank, hosts: output.manifest.hosts.length };
});
const item = await page.evaluate(first => ({ snapshot: window.__assetLab.snapshot(), deterministic: window.__assetLab.snapshot().itemFingerprint === first, canvasWidth: document.querySelector('#item-stage canvas').width, familyOptions: document.querySelector('#item-family').options.length, rankOptions: document.querySelector('#item-rank').options.length, hostChips: document.querySelectorAll('#item-hosts span').length, name: document.querySelector('#item-name').textContent }), firstItemFingerprint);
await page.locator('#item-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v02-item.png') });

await page.click('[data-mode="environment"]');
await page.selectOption('#environment-species', 'tree');
await page.selectOption('#environment-palette', 'bloom');
await page.selectOption('#environment-finish', 'glaze');
await page.fill('#environment-seed', '515151');
await page.click('#environment-form button[type="submit"]');
await page.waitForFunction(() => window.__assetLab.snapshot().environmentFingerprint);
const environmentExport = await page.evaluate(async () => {
  const output = await window.__assetLab.exportEnvironment({ download: false });
  return { bytes: output.blob.size, width: output.width, height: output.height, shaLength: output.manifest.output.sha256.length, representation: output.manifest.representation, proxy: output.manifest.output.representation, verts: output.manifest.stats.verts, meshes: output.manifest.stats.meshes };
});
const environment = await page.evaluate(() => ({ snapshot: window.__assetLab.snapshot(), speciesOptions: document.querySelector('#environment-species').options.length, paletteOptions: document.querySelector('#environment-palette').options.length, finishOptions: document.querySelector('#environment-finish').options.length, canvases: document.querySelectorAll('#environment-stage canvas').length, stats: document.querySelector('#environment-stats').textContent, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
await page.locator('#environment-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v02-environment.png') });

await page.focus('[data-mode="environment"]');
await page.keyboard.press('ArrowLeft');
const keyboard = await page.evaluate(() => ({ activeMode: window.__assetLab.snapshot().activeMode, focusMode: document.activeElement.dataset.mode }));
await desktopContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await open(mobileContext, 'mobile', '?mode=item');
await mobilePage.waitForFunction(() => window.__assetLab.snapshot().activeMode === 'item' && window.__assetLab.snapshot().itemFingerprint);
const mobile = await mobilePage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, activeMode: window.__assetLab.snapshot().activeMode, columns: getComputedStyle(document.querySelector('.capability-switcher')).gridTemplateColumns, outputColumns: getComputedStyle(document.querySelector('.generated-output')).gridTemplateColumns }));
await mobilePage.locator('#item-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v02-mobile-item.png') });
await mobileContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const fallbackPage = await open(fallbackContext, 'fallback', '?render=off&mode=environment');
await fallbackPage.waitForFunction(() => window.__assetLab.snapshot().activeMode === 'environment' && window.__assetLab.snapshot().environmentFingerprint);
const fallback = await fallbackPage.evaluate(() => ({ snapshot: window.__assetLab.snapshot(), environmentCanvas: document.querySelectorAll('#environment-stage canvas').length, environmentExportDisabled: document.querySelector('#environment-export').disabled, recipeVisible: document.querySelector('#environment-manifest').textContent.includes('buildPlant'), itemExportDisabled: document.querySelector('#item-export').disabled }));
await fallbackPage.locator('#environment-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v02-fallback.png') });
await fallbackContext.close();
await browser.close();

const report = { schemaVersion: 'kindergrimm-source-capability-matrix-browser-review/0.2', canonicalUrl: url, capturedAt: new Date().toISOString(), preserved, style, item, itemExport, environment, environmentExport, keyboard, mobile, fallback, consoleErrors, evidence: ['evidence/asset-lab-v02-style.png','evidence/asset-lab-v02-item.png','evidence/asset-lab-v02-environment.png','evidence/asset-lab-v02-mobile-item.png','evidence/asset-lab-v02-fallback.png'] };
await fs.writeFile(path.join(project, 'analysis', 'source-capability-matrix-v0.2-browser-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

