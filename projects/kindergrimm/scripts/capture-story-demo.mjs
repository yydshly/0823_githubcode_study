import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightPath = path.resolve(project, '..', 'kage', 'lab', 'node_modules', 'playwright', 'index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath));
const url = 'http://127.0.0.1:8882/projects/kindergrimm/story-demo/';
const evidenceDir = path.join(project, 'evidence');
const consoleErrors = [];

async function openPage(context, label) {
  const page = await context.newPage();
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push({ label, message: message.text() }); });
  page.on('pageerror', error => consoleErrors.push({ label, message: error.message }));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__storyDemo));
  return page;
}

async function clickCommand(page, command) {
  await page.locator(`#action-list [data-command="${command}"]`).click();
}

const browser = await chromium.launch({ headless: true });

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const desktop = await openPage(desktopContext, 'desktop');
await desktop.screenshot({ path: path.join(evidenceDir, 'story-reply-desktop-opening.png'), fullPage: true });
await clickCommand(desktop, 'accept_letter');
await clickCommand(desktop, 'light_lantern');
await clickCommand(desktop, 'repair_waymark');
const trailState = await desktop.evaluate(() => window.__storyDemo.snapshot());
await desktop.screenshot({ path: path.join(evidenceDir, 'story-reply-trail-choice.png'), fullPage: true });
await clickCommand(desktop, 'guide_family');
await desktop.locator('[data-style-id="moonharbor-inkcut-props"]').click();
const stateAfterStyle = await desktop.evaluate(() => window.__storyDemo.snapshot());
await clickCommand(desktop, 'continue_gate');
await clickCommand(desktop, 'unseal_route');
await desktop.screenshot({ path: path.join(evidenceDir, 'story-reply-inkcut-final-choice.png'), fullPage: true });
await clickCommand(desktop, 'signal_public');
const community = await desktop.evaluate(() => ({
  snapshot: window.__storyDemo.snapshot(),
  width: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  canvasVisible: !document.querySelector('#story-scene').hidden,
  inventoryItems: document.querySelectorAll('.inventory-item').length,
  chapterComplete: document.querySelectorAll('.chapter-track .is-complete').length,
  actionLabel: document.querySelector('#action-list button strong')?.textContent
}));
await desktop.screenshot({ path: path.join(evidenceDir, 'story-reply-community-ending.png'), fullPage: true });
await desktopContext.close();

const councilContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const councilPage = await openPage(councilContext, 'council');
for (const command of ['accept_letter','light_lantern','repair_waymark','continue_gate','unseal_route','deliver_council']) await clickCommand(councilPage, command);
const council = await councilPage.evaluate(() => window.__storyDemo.snapshot());
await councilContext.close();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobilePage = await openPage(mobileContext, 'mobile');
for (const command of ['accept_letter','light_lantern','repair_waymark','guide_family']) await clickCommand(mobilePage, command);
const mobile = await mobilePage.evaluate(() => ({
  snapshot: window.__storyDemo.snapshot(),
  viewport: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  actionReachable: Boolean(document.querySelector('#action-list button')),
  canvasRect: document.querySelector('#scene-frame').getBoundingClientRect().toJSON()
}));
await mobilePage.screenshot({ path: path.join(evidenceDir, 'story-reply-mobile.png'), fullPage: true });
await mobileContext.close();

const keyboardContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const keyboardPage = await openPage(keyboardContext, 'keyboard');
for (const command of ['accept_letter','light_lantern','repair_waymark']) {
  const locator = keyboardPage.locator(`#action-list [data-command="${command}"]`);
  await locator.focus();
  await keyboardPage.keyboard.press('Enter');
}
const fastRoute = keyboardPage.locator('#action-list [data-command="continue_gate"]');
await fastRoute.focus(); await keyboardPage.keyboard.press('Enter');
for (const command of ['unseal_route','deliver_council']) {
  const locator = keyboardPage.locator(`#action-list [data-command="${command}"]`);
  await locator.focus(); await keyboardPage.keyboard.press('Enter');
}
const keyboard = await keyboardPage.evaluate(() => ({
  snapshot: window.__storyDemo.snapshot(),
  activeTag: document.activeElement?.tagName,
  outlineWidth: getComputedStyle(document.querySelector('#restart-top')).outlineWidth,
  focusVisibleRule: Array.from(document.styleSheets).some(sheet => {
    try { return Array.from(sheet.cssRules).some(rule => rule.selectorText === ':focus-visible'); } catch { return false; }
  })
}));
await keyboardContext.close();

const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
const reducedPage = await openPage(reducedContext, 'reduced');
const reducedMotion = await reducedPage.evaluate(() => ({
  matched: matchMedia('(prefers-reduced-motion: reduce)').matches,
  rainDuration: getComputedStyle(document.querySelector('.weather-layer')).animationDuration
}));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await fallbackContext.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = function () { return null; };
});
const fallbackPage = await openPage(fallbackContext, 'canvas-off');
for (const command of ['accept_letter','light_lantern','repair_waymark','continue_gate','unseal_route','deliver_council']) await clickCommand(fallbackPage, command);
const canvasOff = await fallbackPage.evaluate(() => ({
  snapshot: window.__storyDemo.snapshot(),
  fallbackVisible: !document.querySelector('#canvas-fallback').hidden,
  canvasHidden: document.querySelector('#story-scene').hidden,
  actionStillAvailable: Boolean(document.querySelector('#action-list [data-command="restart"]')),
  dialogue: document.querySelector('#dialogue-text').textContent
}));
await fallbackPage.screenshot({ path: path.join(evidenceDir, 'story-reply-canvas-off.png'), fullPage: true });
await fallbackContext.close();

await browser.close();

const report = {
  schemaVersion: 'kindergrimm-story-demo-browser-review/1.0',
  canonicalUrl: url,
  capturedAt: new Date().toISOString(),
  trailState,
  stateAfterStyle,
  community,
  council,
  mobile,
  keyboard,
  reducedMotion,
  canvasOff,
  consoleErrors,
  evidence: [
    'evidence/story-reply-desktop-opening.png',
    'evidence/story-reply-trail-choice.png',
    'evidence/story-reply-inkcut-final-choice.png',
    'evidence/story-reply-community-ending.png',
    'evidence/story-reply-mobile.png',
    'evidence/story-reply-canvas-off.png'
  ]
};

await fs.writeFile(path.join(project, 'analysis', 'story-demo-browser-review.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
