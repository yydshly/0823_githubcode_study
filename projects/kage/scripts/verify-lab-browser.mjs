import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const evidenceDir = path.join(projectRoot, 'evidence', 'lab-screenshots');
const reportPath = path.join(projectRoot, 'evidence', 'lab-runtime-report.json');
const baseUrl = process.argv[2] || 'http://127.0.0.1:8143/lab/dist/';
const { chromium } = require(path.join(projectRoot, 'lab', 'node_modules', 'playwright'));

const browserCandidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

let browserExecutable = null;
for (const candidate of browserCandidates) {
  try {
    await fs.access(candidate);
    browserExecutable = candidate;
    break;
  } catch {
    // Try the next browser.
  }
}
if (!browserExecutable) throw new Error('Chrome or Edge is required.');

await fs.mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});

const report = { generatedAt: new Date().toISOString(), baseUrl, browserExecutable, scenarios: [] };

async function run(name, query, viewport, screenshot, contextOptions = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...contextOptions });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

  const url = new URL(baseUrl);
  url.search = query;
  const response = await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForFunction(() => document.body.dataset.renderer !== 'boot', null, { timeout: 30_000 });
  await page.waitForFunction(() => Boolean(window.__signalLab), null, { timeout: 10_000 });
  if (await page.getAttribute('body', 'data-renderer') === 'running') {
    await page.waitForFunction(() => (window.__signalLab?.snapshot().runtime?.drawCalls || 0) > 0, null, { timeout: 15_000 });
  }
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => ({
    title: document.title,
    bodyTextLength: document.body.innerText.trim().length,
    renderer: document.body.dataset.renderer,
    quality: document.body.dataset.quality,
    motion: document.documentElement.dataset.motion,
    chapters: document.querySelectorAll('.chapter').length,
    navLinks: document.querySelectorAll('.chapter-nav-link').length,
    activeChapters: document.querySelectorAll('.chapter.is-active').length,
    horizontalOverflow: Math.max(0, document.body.scrollWidth - innerWidth),
    canvasOpacity: getComputedStyle(document.querySelector('#world-canvas')).opacity,
    fallbackOpacity: getComputedStyle(document.querySelector('#fallback-plate')).opacity,
    debug: window.__signalLab?.snapshot() || null
  }));
  await page.locator('#debug-panel').evaluate((node) => { node.hidden = true; });
  await page.screenshot({ path: path.join(evidenceDir, screenshot), fullPage: false });
  report.scenarios.push({ name, url: url.toString(), viewport, status: response?.status() ?? null, state, consoleErrors, pageErrors, failedRequests });
  await context.close();
}

try {
  await run('observatory-hero', 'story=observatory&quality=balanced&chapter=0&debug=1', { width: 1440, height: 900 }, '01-observatory-hero.png');
  await run('observatory-system', 'story=observatory&quality=high&chapter=2&debug=1', { width: 1440, height: 900 }, '02-observatory-system.png');
  await run('archive-configuration', 'story=archive&quality=balanced&chapter=1&debug=1', { width: 1365, height: 768 }, '03-archive-configuration.png');
  await run('mobile-low-quality', 'story=explainer&quality=low&chapter=1&debug=1', { width: 390, height: 844 }, '04-mobile-low-quality.png', { hasTouch: true, isMobile: true });
  await run('reduced-motion', 'story=observatory&motion=reduce&chapter=3&debug=1', { width: 1280, height: 800 }, '05-reduced-motion.png', { reducedMotion: 'reduce' });
  await run('semantic-fallback', 'story=archive&renderer=none&chapter=2&debug=1', { width: 1280, height: 800 }, '06-semantic-fallback.png');
} finally {
  await browser.close();
}

report.summary = {
  passedHttp: report.scenarios.every((item) => item.status === 200),
  meaningfulContent: report.scenarios.every((item) => item.state.bodyTextLength > 200),
  oneActiveChapter: report.scenarios.every((item) => item.state.activeChapters === 1),
  noHorizontalOverflow: report.scenarios.every((item) => item.state.horizontalOverflow === 0),
  noConsoleErrors: report.scenarios.every((item) => item.consoleErrors.length === 0 && item.pageErrors.length === 0),
  noFailedRequests: report.scenarios.every((item) => item.failedRequests.length === 0)
};

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));
console.log(reportPath);
