import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(projectRoot, '..', '..');
const docsRoot = resolve(repositoryRoot, 'docs');
const workbenchRoot = resolve(projectRoot, '.pages-dist/workbench');
const outDir = resolve(projectRoot, 'evidence/pages-release');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');

mkdirSync(outDir, { recursive: true });
for (const filename of ['01-overview-desktop.png', '02-archive-desktop.png', '03-workbench-desktop.png', '04-archive-mobile.png', '05-workbench-mobile.png', 'failure.png', 'browser-report.json']) {
  const target = resolve(outDir, filename);
  if (existsSync(target)) rmSync(target, { force: true });
}

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
]);

function safeFile(root, relativePath) {
  const target = resolve(root, relativePath);
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return target === root || target.startsWith(rootPrefix) ? target : null;
}

function sendFile(res, file) {
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', contentTypes.get(extname(file).toLowerCase()) || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(readFileSync(file));
}

function createLocalPagesServer() {
  return createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://pages.local').pathname);
    const workbenchPrefix = '/projects/claude-of-tanks/workbench/';
    if (pathname === workbenchPrefix) {
      sendFile(res, safeFile(workbenchRoot, 'product-workbench-pages.html'));
      return;
    }
    if (pathname.startsWith(workbenchPrefix)) {
      sendFile(res, safeFile(workbenchRoot, pathname.slice(workbenchPrefix.length)));
      return;
    }
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    sendFile(res, safeFile(docsRoot, relativePath));
  });
}

const suppliedBase = process.argv.find((arg) => /^https?:\/\//.test(arg));
let server;
let baseUrl;
if (suppliedBase) {
  baseUrl = suppliedBase.endsWith('/') ? suppliedBase : `${suppliedBase}/`;
} else {
  server = createLocalPagesServer();
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/`;
}

const urlFor = (path) => new URL(path, baseUrl).href;
const report = {
  baseUrl,
  mode: suppliedBase ? 'remote' : 'local-production-build',
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  externalModelRequests: [],
  checks: {},
  screenshots: [],
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (message) => {
  if (message.type() === 'error') report.consoleErrors.push({ type: 'console', text: message.text(), location: message.location() });
});
page.on('pageerror', (error) => report.consoleErrors.push({ type: 'pageerror', text: String(error) }));
page.on('request', (request) => {
  if (/\.(?:glb|gltf|fbx|obj)(?:\?|$)/i.test(request.url())) report.externalModelRequests.push(request.url());
});

async function capture(filename) {
  await page.screenshot({ path: resolve(outDir, filename), fullPage: true });
  report.screenshots.push(filename);
}

async function open(path, options = {}) {
  const response = await page.goto(urlFor(path), { waitUntil: 'networkidle0', timeout: options.timeout || 30_000 });
  return response?.status();
}

try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const overviewStatus = await open('projects/claude-of-tanks.html');
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((resolveWait) => setTimeout(resolveWait, 350));
  });
  report.overview = await page.evaluate(() => ({
    title: document.title,
    archiveHref: document.querySelector('a[href="./claude-of-tanks-archive.html"]')?.href,
    workbenchHref: document.querySelector('a[href="./claude-of-tanks/workbench/"]')?.href,
    localLinks: [...document.querySelectorAll('a[href]')].map((node) => node.getAttribute('href')).filter((href) => /localhost|127\.0\.0\.1/.test(href || '')),
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await capture('01-overview-desktop.png');

  const archiveStatus = await open('projects/claude-of-tanks-archive.html');
  report.archiveDesktop = await page.evaluate(() => ({
    title: document.title,
    archived: document.body.textContent.includes('暂时归档'),
    sections: document.querySelectorAll('.cot-section-nav a').length,
    evidenceImages: document.querySelectorAll('.cot-archive-shots img').length,
    localLinks: [...document.querySelectorAll('a[href]')].map((node) => node.getAttribute('href')).filter((href) => /localhost|127\.0\.0\.1/.test(href || '')),
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await capture('02-archive-desktop.png');

  const workbenchStatus = await open('projects/claude-of-tanks/workbench/', { timeout: 40_000 });
  await page.waitForFunction(() => window.__COT_PRODUCT_WORKBENCH?.status === 'ready', { timeout: 15_000, polling: 50 });
  await page.click('[data-subject="nova-field-node"]');
  await page.waitForFunction(() => window.__COT_PRODUCT_WORKBENCH?.snapshot?.activeSubjectId === 'nova-field-node', { timeout: 5_000, polling: 50 });
  await page.click('[data-action="explode"]');
  report.workbenchDesktop = await page.evaluate(() => ({
    snapshot: window.__COT_PRODUCT_WORKBENCH.snapshot,
    subjects: document.querySelectorAll('[data-subject]').length,
    canvas: (() => {
      const box = document.querySelector('canvas').getBoundingClientRect();
      return { width: box.width, height: box.height };
    })(),
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await capture('03-workbench-desktop.png');

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open('projects/claude-of-tanks-archive.html');
  report.archiveMobile = await page.evaluate(() => ({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    navTargets: [...document.querySelectorAll('.cot-section-nav a')].map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  }));
  await capture('04-archive-mobile.png');

  await open('projects/claude-of-tanks/workbench/', { timeout: 40_000 });
  await page.waitForFunction(() => window.__COT_PRODUCT_WORKBENCH?.status === 'ready', { timeout: 15_000, polling: 50 });
  report.workbenchMobile = await page.evaluate(() => ({
    snapshot: window.__COT_PRODUCT_WORKBENCH.snapshot,
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    visibleControls: [...document.querySelectorAll('.inspection-panel button, .primary-actions button')]
      .filter((node) => getComputedStyle(node).display !== 'none')
      .map((node) => {
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
  }));
  await capture('05-workbench-mobile.png');

  report.checks = {
    overview200: overviewStatus === 200,
    overviewArchived: /能力研究总览/.test(report.overview.title),
    overviewLinksPublishedRoutes: Boolean(report.overview.archiveHref && report.overview.workbenchHref),
    overviewNoLocalhostLinks: report.overview.localLinks.length === 0,
    overviewImagesLoad: report.overview.brokenImages.length === 0,
    overviewNoHorizontalOverflow: report.overview.scrollWidth <= report.overview.innerWidth,
    archive200: archiveStatus === 200,
    archiveIdentity: report.archiveDesktop.archived,
    archiveSixSections: report.archiveDesktop.sections === 6,
    archiveThreeEvidenceImages: report.archiveDesktop.evidenceImages === 3,
    archiveNoLocalhostLinks: report.archiveDesktop.localLinks.length === 0,
    archiveDesktopNoHorizontalOverflow: report.archiveDesktop.scrollWidth <= report.archiveDesktop.innerWidth,
    workbench200: workbenchStatus === 200,
    workbenchReady: report.workbenchDesktop.snapshot.status === 'ready',
    workbenchWorldNone: report.workbenchDesktop.snapshot.architecture.world === 'none',
    workbenchTwoSubjects: report.workbenchDesktop.subjects === 2,
    workbenchInteraction: report.workbenchDesktop.snapshot.activeSubjectId === 'nova-field-node' && report.workbenchDesktop.snapshot.exploded === true,
    workbenchCanvasVisible: report.workbenchDesktop.canvas.width > 1000 && report.workbenchDesktop.canvas.height > 600,
    noExternalModelRequests: report.externalModelRequests.length === 0,
    archiveMobileNoHorizontalOverflow: report.archiveMobile.scrollWidth <= report.archiveMobile.innerWidth,
    archiveMobileTouchTargets: report.archiveMobile.navTargets.length === 6 && report.archiveMobile.navTargets.every(({ height }) => height >= 44),
    reducedMotionRecognized: report.archiveMobile.reducedMotion === true && report.workbenchMobile.snapshot.reducedMotion === true,
    workbenchMobileNoHorizontalOverflow: report.workbenchMobile.scrollWidth <= report.workbenchMobile.innerWidth,
    workbenchMobileTouchTargets: report.workbenchMobile.visibleControls.length >= 9 && report.workbenchMobile.visibleControls.every(({ width, height }) => width >= 44 && height >= 44),
    fiveScreenshots: report.screenshots.length === 5,
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
  if (server) await new Promise((resolveClose) => server.close(resolveClose));
}

console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
