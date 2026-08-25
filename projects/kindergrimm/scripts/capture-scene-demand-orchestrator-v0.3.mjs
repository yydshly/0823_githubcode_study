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
  if (suffix.includes('mode=scene')) await page.waitForFunction(() => Boolean(window.__assetLab.snapshot().sceneFingerprint), null, { timeout: 30000 });
  return page;
}

const browser = await chromium.launch({ headless: true });
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await open(desktopContext, 'desktop', '?mode=scene');
const baseline = await page.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  tabCount: document.querySelectorAll('[data-mode]').length,
  presetOptions: document.querySelector('#scene-preset').options.length,
  plan: window.__assetLab.currentScenePlan,
  previewSources: [...document.querySelectorAll('#scene-mode img')].map(img => ({ id: img.id, hasSource: img.src.startsWith('data:image/png'), sourceLength: img.src.length })),
  styleFrame: document.querySelector('#scene-style-frame').getAttribute('src'),
  exportDisabled: document.querySelector('#scene-export').disabled,
  viewport: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
}));
await page.locator('.scene-orchestrator').screenshot({ path: path.join(evidenceDir, 'asset-lab-v03-scene-default.png') });

const originalFingerprint = baseline.snapshot.sceneFingerprint;
await page.evaluate(async () => { await window.__assetLab.generateScenePlan(); });
const deterministic = await page.evaluate(original => ({ samePlan: window.__assetLab.snapshot().sceneFingerprint === original, fingerprint: window.__assetLab.snapshot().sceneFingerprint, itemFingerprint: window.__assetLab.snapshot().itemFingerprint, environmentRecipeSeed: window.__assetLab.currentScenePlan.selections.environment.seed }), originalFingerprint);

await page.fill('#scene-title', '雾中遗迹的灯光线索');
await page.fill('#scene-purpose', '梦魇目击者在遗迹里发现一盏可以揭示隐藏路径的灯。');
await page.fill('#scene-seed', '123456');
await page.selectOption('#scene-type', 'mystery');
await page.selectOption('#scene-mood', 'uncanny');
await page.selectOption('#scene-biome', 'ruin');
await page.selectOption('#scene-interaction', 'discover');
await page.selectOption('#scene-actor', 'nightmare');
await page.click('#scene-form button[type="submit"]');
await page.waitForFunction(previous => window.__assetLab.snapshot().sceneFingerprint && window.__assetLab.snapshot().sceneFingerprint !== previous && !window.__assetLab.snapshot().busy, originalFingerprint);
const custom = await page.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(), plan: window.__assetLab.currentScenePlan,
  title: document.querySelector('#scene-output-title').textContent,
  itemLabel: document.querySelector('#scene-item-label').textContent,
  environmentLabel: document.querySelector('#scene-environment-label').textContent,
  styleLabel: document.querySelector('#scene-style-label').textContent,
  explanationRows: document.querySelectorAll('.scene-explanation-row').length,
  previewCount: document.querySelectorAll('#scene-mode img[src^="data:image/png"]').length,
  styleSrc: document.querySelector('#scene-style-frame').getAttribute('src'),
  scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
}));
await page.locator('#scene-mode').screenshot({ path: path.join(evidenceDir, 'asset-lab-v03-scene-custom.png') });

const exportResult = await page.evaluate(async () => {
  const output = await window.__assetLab.exportScenePackage({ download: false });
  return {
    fileCount: output.files.length,
    totalBytes: output.totalBytes,
    files: output.files.map(file => ({ filename: file.filename, bytes: file.blob.size, type: file.blob.type })),
    manifest: { schemaVersion: output.manifest.schemaVersion, assetCount: output.manifest.assets.length, runtimeModel: output.manifest.source.runtimeModel, fingerprint: output.manifest.selections ? window.__assetLab.snapshot().sceneFingerprint : null, assemblyBoundary: output.manifest.assemblyBoundary },
    assets: output.manifest.assets.map(asset => ({ id: asset.id, width: asset.width, height: asset.height, bytes: asset.bytes, shaLength: asset.sha256.length, representation: asset.representation })),
  };
});

const validBeforeInvalid = await page.evaluate(() => window.__assetLab.snapshot().sceneFingerprint);
await page.fill('#scene-seed', '0');
await page.click('#scene-form button[type="submit"]');
await page.waitForFunction(() => !document.querySelector('#scene-error').hidden);
const invalid = await page.evaluate(previous => ({ message: document.querySelector('#scene-error').textContent, preserved: window.__assetLab.snapshot().sceneFingerprint === previous, exportDisabled: document.querySelector('#scene-export').disabled }), validBeforeInvalid);

await page.focus('[data-mode="scene"]');
const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
await page.keyboard.press('ArrowLeft');
const keyboard = await page.evaluate(focusOutline => ({ activeMode: window.__assetLab.snapshot().activeMode, focusMode: document.activeElement.dataset.mode, outline: focusOutline }), outline);
await page.screenshot({ path: path.join(evidenceDir, 'asset-lab-v03-keyboard.png') });
await desktopContext.close();

const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 900 } });
const tabletPage = await open(tabletContext, 'tablet', '?mode=scene');
const tablet = await tabletPage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, orchestratorColumns: getComputedStyle(document.querySelector('.scene-orchestrator')).gridTemplateColumns, previewCount: window.__assetLab.snapshot().scenePreviewCount }));
await tabletContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobilePage = await open(mobileContext, 'mobile', '?mode=scene');
const mobile = await mobilePage.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, activeMode: window.__assetLab.snapshot().activeMode, orchestratorColumns: getComputedStyle(document.querySelector('.scene-orchestrator')).gridTemplateColumns, characterColumns: getComputedStyle(document.querySelector('.scene-character-strip')).gridTemplateColumns, previewCount: window.__assetLab.snapshot().scenePreviewCount }));
await mobilePage.locator('.scene-orchestrator').screenshot({ path: path.join(evidenceDir, 'asset-lab-v03-mobile.png') });
await mobileContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const fallbackPage = await open(fallbackContext, 'fallback', '?render=off&mode=scene');
const fallback = await fallbackPage.evaluate(() => ({
  snapshot: window.__assetLab.snapshot(),
  exportDisabled: document.querySelector('#scene-export').disabled,
  unavailableFrames: document.querySelectorAll('#scene-mode [data-unavailable]').length,
  itemPreview: document.querySelector('#scene-item-preview').src.startsWith('data:image/png'),
  styleFrame: document.querySelector('#scene-style-frame').getAttribute('src').includes('/upstream/styles.html'),
  recipeManifest: document.querySelector('#scene-manifest').textContent.includes('runtimeModel'),
  status: document.querySelector('#scene-status').textContent,
}));
await fallbackPage.locator('.scene-orchestrator').screenshot({ path: path.join(evidenceDir, 'asset-lab-v03-fallback.png') });
await fallbackContext.close();
await browser.close();

const report = {
  schemaVersion: 'kindergrimm-scene-demand-orchestrator-browser-review/0.3', canonicalUrl: url, capturedAt: new Date().toISOString(),
  baseline, deterministic, custom, exportResult, invalid, keyboard, tablet, mobile, fallback, consoleErrors,
  evidence: ['evidence/asset-lab-v03-scene-default.png','evidence/asset-lab-v03-scene-custom.png','evidence/asset-lab-v03-keyboard.png','evidence/asset-lab-v03-mobile.png','evidence/asset-lab-v03-fallback.png'],
};
await fs.writeFile(path.join(project, 'analysis', 'scene-demand-orchestrator-v0.3-browser-review.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

