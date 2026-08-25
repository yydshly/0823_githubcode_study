import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');
const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4176';
const outDir = resolve(projectRoot, 'evidence/research-platform');
mkdirSync(outDir, { recursive: true });

for (const filename of ['01-desktop-hub.png', '02-mobile-hub.png', 'failure.png', 'browser-report.json']) {
  const path = resolve(outDir, filename);
  if (existsSync(path)) rmSync(path, { force: true });
}

const report = {
  url: `${baseUrl}/research`,
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  gameRuntimeRequests: [],
  screenshots: [],
  checks: {},
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  report.consoleErrors.push({ type: 'console', text: message.text(), location: message.location() });
});
page.on('pageerror', (error) => report.consoleErrors.push({ type: 'pageerror', text: String(error) }));
page.on('request', (request) => {
  const url = request.url();
  if (/\/src\/main\.js|\/src\/game\/|\/node_modules\/\.vite\/deps\/three/i.test(url)) {
    report.gameRuntimeRequests.push(url);
  }
});

try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(
    () => window.__COT_RESEARCH_PLATFORM?.status === 'ready',
    { timeout: 10000, polling: 50 },
  );

  const desktop = await page.evaluate(() => {
    const runtime = window.__COT_RESEARCH_PLATFORM;
    const blocked = document.querySelector('[data-demo-id="industrial-showroom-experiment"]');
    const links = [...document.querySelectorAll('[data-demo-link]')].map((link) => ({
      id: link.dataset.demoLink,
      href: link.getAttribute('href'),
      origin: new URL(link.href).origin,
    }));
    return {
      status: runtime.status,
      audit: runtime.audit,
      hubReadyMs: runtime.hubReadyMs,
      timeOrigin: performance.timeOrigin,
      threeRuntimeLoaded: runtime.threeRuntimeLoaded,
      blockedDemoHasLink: runtime.blockedDemoHasLink,
      layerCards: document.querySelectorAll('[data-layer-id]').length,
      demoCards: document.querySelectorAll('[data-demo-id]').length,
      launchLinks: links,
      blockedAria: blocked?.querySelector('[aria-disabled="true"]')?.getAttribute('aria-disabled'),
      budgetOver: document.querySelectorAll('[data-budget-status="over"]').length,
      highRisks: document.querySelectorAll('.risk.high').length,
      headings: [...document.querySelectorAll('h1,h2')].map((node) => node.textContent.trim()),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  report.desktop = desktop;
  await page.screenshot({ path: resolve(outDir, '01-desktop-hub.png'), fullPage: true });
  report.screenshots.push('01-desktop-hub.png');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  const mobile = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('.topnav a, .action')];
    const targetSizes = targets.map((node) => {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    const sample = document.querySelector('.topnav a');
    return {
      timeOrigin: performance.timeOrigin,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionDuration: sample ? getComputedStyle(sample).transitionDuration : null,
      targetSizes,
      platformReady: document.getElementById('research-platform')?.dataset.platformReady,
    };
  });
  report.mobile = mobile;
  await page.screenshot({ path: resolve(outDir, '02-mobile-hub.png'), fullPage: true });
  report.screenshots.push('02-mobile-hub.png');

  report.checks = {
    hubRoute200: response?.status() === 200,
    registryContract: desktop.status === 'ready' && desktop.audit?.pass === true,
    fourLayerBoundary: desktop.layerCards === 4,
    fourDemoStates: desktop.demoCards === 4,
    exactlyThreeLaunchableDemos: desktop.launchLinks.length === 3,
    blockedExperimentNotLaunchable: desktop.blockedDemoHasLink === false && desktop.blockedAria === 'true',
    sameOriginDemoRoutes: desktop.launchLinks.every((link) => link.origin === new URL(baseUrl).origin),
    noThreeRuntimeOnHub: desktop.threeRuntimeLoaded === false && report.gameRuntimeRequests.length === 0,
    hubReadyBudget: desktop.hubReadyMs <= 1500,
    visiblePerformanceRisks: desktop.budgetOver >= 6 && desktop.highRisks >= 2,
    readableDomContent: desktop.headings.some((heading) => heading.includes('3D 能力研究')),
    mobileSingleDocument: desktop.timeOrigin === mobile.timeOrigin,
    mobileNoHorizontalOverflow: mobile.innerWidth === 390 && mobile.scrollWidth <= 390,
    mobileTouchTargets: mobile.targetSizes.length >= 3
      && mobile.targetSizes.every(({ width, height }) => width >= 44 && height >= 44),
    reducedMotion: mobile.reducedMotion === true && mobile.transitionDuration === '0s',
    evidenceBounded: report.screenshots.length === 2,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.result = Object.values(report.checks).every(Boolean) ? 'pass' : 'fail';
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  await page.screenshot({ path: resolve(outDir, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;

