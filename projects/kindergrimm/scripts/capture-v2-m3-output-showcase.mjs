import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightPath = path.resolve(project, '..', 'kage', 'lab', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath));
const url = 'http://127.0.0.1:8882/projects/kindergrimm/asset-catalog/';
const evidence = path.join(project, 'evidence');
const errors = [];

async function readyPage(context, suffix = '') {
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ suffix, message: message.text() });
  });
  await page.goto(url + suffix, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__materialCatalog?.state().showcase?.length === 3);
  return page;
}

const browser = await chromium.launch({ headless: true });

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const desktop = await readyPage(desktopContext);
const desktopBefore = await desktop.evaluate(() => {
  const stage = document.querySelector('#result-stage').getBoundingClientRect();
  const images = Array.from(document.querySelectorAll('.result-visual img'));
  const state = window.__materialCatalog.state();
  return {
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    stageTop: Math.round(stage.top),
    stageBottom: Math.round(stage.bottom),
    imagesReady: images.every(image => image.complete && image.naturalWidth === 1200 && image.naturalHeight === 600),
    fallbackHidden: images.every(image => getComputedStyle(image.nextElementSibling).display === 'none'),
    recipes: state.recipes,
    recipeUnique: state.recipeUnique,
    propVisuals: state.visuals,
    propVisualUnique: state.visualUnique,
    sceneRecipes: state.sceneRecipes,
    sceneRecipeUnique: state.sceneRecipeUnique,
    sceneVisuals: state.sceneVisuals,
    sceneVisualUnique: state.sceneVisualUnique,
    styles: state.styles,
    showcase: state.showcase,
    outputFingerprints: Object.fromEntries(Object.entries(state.outputs).map(([id, output]) => [id, output.fingerprint])),
    buildMs: state.buildMs
  };
});
await desktop.screenshot({ path: path.join(evidence, 'v2-m3-output-showcase-desktop.png') });
await desktop.locator('.result-card').nth(1).click();
const mouseResult = await desktop.evaluate(() => ({
  selectedStyle: window.__materialCatalog.state().selected.styleId,
  pressed: Array.from(document.querySelectorAll('.result-card')).map(button => button.getAttribute('aria-pressed')),
  outputFingerprints: Object.fromEntries(Object.entries(window.__materialCatalog.state().outputs).map(([id, output]) => [id, output.fingerprint])),
  manifestStyles: window.__materialCatalog.manifest().styles.map(style => style.id)
}));
const currentBundle = await desktop.evaluate(async () => window.__materialCatalog.inspectBundle());
await desktop.screenshot({ path: path.join(evidence, 'v2-m3-inkcut-selected-output.png') });
await desktop.locator('.result-card').nth(0).focus();
await desktop.keyboard.press('Enter');
const keyboardResult = await desktop.evaluate(() => {
  const active = document.activeElement;
  const style = getComputedStyle(active);
  return {
    selectedStyle: window.__materialCatalog.state().selected.styleId,
    activeStyle: active.dataset.showcaseStyle,
    outlineWidth: style.outlineWidth,
    outlineStyle: style.outlineStyle
  };
});
await desktopContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobile = await readyPage(mobileContext);
const mobileResult = await mobile.evaluate(() => {
  const stage = document.querySelector('#result-stage');
  return {
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    gridColumns: getComputedStyle(stage.querySelector('.result-stage-grid')).gridTemplateColumns,
    imagesReady: Array.from(stage.querySelectorAll('img')).every(image => image.complete && image.naturalWidth > 0),
    outputs: Object.keys(window.__materialCatalog.state().outputs).length
  };
});
await mobile.locator('#result-stage').scrollIntoViewIfNeeded();
await mobile.screenshot({ path: path.join(evidence, 'v2-m3-output-showcase-mobile.png') });
await mobileContext.close();

const reducedContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce'
});
const reduced = await readyPage(reducedContext);
const reducedResult = await reduced.evaluate(() => ({
  matched: matchMedia('(prefers-reduced-motion: reduce)').matches,
  showcaseRendered: window.__materialCatalog.state().showcase.every(item => item.rendered)
}));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const fallback = await readyPage(fallbackContext, '?canvas=off');
const fallbackResult = await fallback.evaluate(() => {
  const stage = document.querySelector('#result-stage');
  return {
    canvas: window.__materialCatalog.state().canvas,
    showcase: window.__materialCatalog.state().showcase,
    imageSources: Array.from(stage.querySelectorAll('img')).map(image => image.hasAttribute('src')),
    fallbacksVisible: Array.from(stage.querySelectorAll('.result-visual > span')).every(item => getComputedStyle(item).display !== 'none'),
    manifestEnabled: !document.querySelector('#download-manifest').disabled,
    bundleDisabled: document.querySelector('#download-bundle').disabled
  };
});
await fallback.screenshot({ path: path.join(evidence, 'v2-m3-output-showcase-canvas-off.png') });
await fallbackContext.close();

await browser.close();

const report = {
  schemaVersion: 'kindergrimm-v2-m3-output-showcase-review/0.1',
  canonicalUrl: url,
  capturedAt: new Date().toISOString(),
  desktop: {
    ...desktopBefore,
    mouseResult,
    currentBundle,
    keyboardResult
  },
  mobile: mobileResult,
  reducedMotion: reducedResult,
  canvasOff: fallbackResult,
  consoleErrors: errors,
  evidence: [
    'evidence/v2-m3-output-showcase-desktop.png',
    'evidence/v2-m3-inkcut-selected-output.png',
    'evidence/v2-m3-output-showcase-mobile.png',
    'evidence/v2-m3-output-showcase-canvas-off.png'
  ]
};

await fs.writeFile(
  path.join(project, 'analysis', 'v2-m3-output-showcase-review.json'),
  JSON.stringify(report, null, 2) + '\n',
  'utf8'
);
console.log(JSON.stringify(report, null, 2));