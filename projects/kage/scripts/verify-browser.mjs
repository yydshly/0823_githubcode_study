import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const evidenceDir = path.join(projectRoot, 'evidence', 'screenshots');
const reportPath = path.join(projectRoot, 'evidence', 'runtime-report.json');
const baseUrl = process.argv[2] || 'http://127.0.0.1:8143/upstream/';
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH ||
  'C:\\Users\\yun68\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright';
const { chromium } = require(playwrightPath);

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
    // Try the next installed browser.
  }
}

if (!browserExecutable) {
  throw new Error('No Chrome or Edge executable found. Set BROWSER_EXECUTABLE_PATH.');
}

await fs.mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: browserExecutable,
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browserExecutable,
  scenarios: []
};

function urlWith(query) {
  const url = new URL(baseUrl);
  url.search = query;
  return url.toString();
}

async function sampleFrames(page, count = 90) {
  return page.evaluate((frameCount) => new Promise((resolve) => {
    let seen = 0;
    const started = performance.now();
    const tick = () => {
      seen += 1;
      if (seen >= frameCount) {
        const elapsedMs = performance.now() - started;
        resolve({ frames: seen, elapsedMs, fps: seen / (elapsedMs / 1000) });
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), count);
}

async function inspect(page) {
  return page.evaluate(() => {
    const api = window.__kage || {};
    const renderer = api.renderer;
    const canvas = document.querySelector('#gl');
    const rect = canvas?.getBoundingClientRect();
    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      fallback: Boolean(api.fallback || document.body.classList.contains('no-webgl')),
      locked: document.body.classList.contains('is-locked'),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      coarsePointer: matchMedia('(hover: none)').matches,
      scrollY,
      hash: location.hash,
      activeSection: api.RIG ? Math.round(api.RIG.smooth * 1000) / 1000 : null,
      camera: api.camera ? api.camera.position.toArray().map((value) => Math.round(value * 1000) / 1000) : null,
      canvas: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      webgl2: renderer?.capabilities?.isWebGL2 ?? null,
      renderInfo: renderer ? {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
        pixelRatio: renderer.getPixelRatio(),
        shadows: renderer.shadowMap.enabled
      } : null,
      postProcessing: Boolean(api.POST?.scene),
      rainEnabled: Boolean(api.WORLD?.rain),
      leafInstances: api.WORLD?.leaves?.mesh?.count ?? 0,
      clothCanvases: document.querySelectorAll('.cloth-out').length,
      clothActiveCards: document.querySelectorAll('.on-cloth').length,
      chapters: document.querySelectorAll('[data-cam]').length,
      navLinks: document.querySelectorAll('.nav-link').length,
      errorOverlay: Boolean(document.querySelector('.vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]'))
    };
  });
}

async function runScenario(name, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor || 1,
    hasTouch: Boolean(options.hasTouch),
    isMobile: Boolean(options.isMobile),
    reducedMotion: options.reducedMotion || 'no-preference'
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('requestfailed', (request) => failedRequests.push({
    url: request.url(),
    error: request.failure()?.errorText || 'unknown'
  }));

  const url = urlWith(options.query || '');
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForFunction(() => Boolean(window.__kage), null, { timeout: 45_000 });
  await page.waitForFunction(() => !document.body.classList.contains('is-locked'), null, { timeout: 45_000 });

  if (options.waitForCloth) {
    await page.waitForFunction(() => document.querySelectorAll('.cloth-out').length >= 3, null, { timeout: 15_000 });
    await page.locator('.cards .card').first().hover();
    await page.waitForTimeout(500);
  }

  if (options.navigationTarget) {
    await page.locator(`a[href="${options.navigationTarget}"]`).first().click();
    await page.waitForTimeout(1400);
  }

  const state = await inspect(page);
  const frameSample = state.fallback ? null : await sampleFrames(page, options.frameCount || 60);

  if (options.screenshot) {
    await page.screenshot({
      path: path.join(evidenceDir, options.screenshot),
      fullPage: false
    });
  }

  report.scenarios.push({
    name,
    url,
    viewport: options.viewport,
    status: response?.status() ?? null,
    state,
    frameSample,
    consoleErrors,
    pageErrors,
    failedRequests
  });

  await context.close();
}

try {
  await runScenario('desktop-hero', {
    query: 'shot=0',
    viewport: { width: 1440, height: 900 },
    screenshot: '01-desktop-hero.png',
    frameCount: 90
  });

  await runScenario('desktop-gardens-cloth', {
    query: 'shot=2',
    viewport: { width: 1440, height: 900 },
    waitForCloth: true,
    screenshot: '02-desktop-gardens-cloth.png',
    frameCount: 90
  });

  await runScenario('desktop-navigation', {
    query: '',
    viewport: { width: 1440, height: 900 },
    navigationTarget: '#lessons',
    screenshot: '03-desktop-navigation.png',
    frameCount: 60
  });

  await runScenario('mobile-low-quality', {
    query: 'shot=1&q=low',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    screenshot: '04-mobile-low-quality.png',
    frameCount: 60
  });

  await runScenario('reduced-motion', {
    query: 'shot=3',
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
    screenshot: '05-reduced-motion.png',
    frameCount: 30
  });

  await runScenario('no-webgl-fallback', {
    query: 'nogl=1',
    viewport: { width: 1280, height: 800 },
    screenshot: '06-no-webgl-fallback.png'
  });

  await runScenario('post-disabled', {
    query: 'shot=2&post=0',
    viewport: { width: 1280, height: 800 },
    frameCount: 30
  });
} finally {
  await browser.close();
}

report.summary = {
  passedHttp: report.scenarios.every((item) => item.status === 200),
  meaningfulContent: report.scenarios.every((item) => item.state.bodyTextLength > 100),
  noErrorOverlay: report.scenarios.every((item) => !item.state.errorOverlay),
  noConsoleErrors: report.scenarios.every((item) => item.consoleErrors.length === 0 && item.pageErrors.length === 0),
  noFailedRequests: report.scenarios.every((item) => item.failedRequests.length === 0)
};

await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report.summary));
console.log(reportPath);
