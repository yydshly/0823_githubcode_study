import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function normalizeBase(value) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

const baseUrl = normalizeBase(readArg('--base-url', process.env.KINDERGRIMM_BASE_URL || 'https://yydshly.github.io/0823_githubcode_study/'));
const manifestPath = path.resolve(readArg('--manifest', path.join(projectDir, 'acceptance', 'routes.json')));
const reportPath = path.resolve(readArg('--report', path.join(projectDir, 'acceptance', 'report.json')));
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

if (manifest.pages.length !== manifest.expectedPageCount) {
  throw new Error(`Route manifest declares ${manifest.expectedPageCount} pages but contains ${manifest.pages.length}`);
}

function routeUrl(route) {
  return new URL(route.replace(/^\//, ''), baseUrl).href;
}

function compactErrors(values) {
  return [...new Set(values)].slice(0, 20);
}

async function withBrowser(run) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage']
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    return await run(page);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function inspectPage(entry) {
  const url = routeUrl(entry.path);
  try {
    return await withBrowser(async (page) => {
      const consoleErrors = [];
      const pageErrors = [];
      const failedResources = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', (request) => {
        const reason = request.failure()?.errorText || 'request failed';
        if (!reason.includes('ERR_ABORTED')) failedResources.push(`${reason} ${request.url()}`);
      });

      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(entry.settleMs ?? 900);
      await page.evaluate(() => {
        for (const image of document.images) image.loading = 'eager';
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(350);
      await page.evaluate(() => window.scrollTo(0, 0));

      const dom = await page.evaluate((requireKindergrimmLink) => ({
        title: document.title,
        bodyTextLength: document.body?.innerText.trim().length ?? 0,
        bodyHeight: document.body?.scrollHeight ?? 0,
        canvases: document.querySelectorAll('canvas').length,
        images: document.images.length,
        brokenImages: [...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
        kindergrimmLink: requireKindergrimmLink
          ? Boolean(document.querySelector('a[href*="kindergrimm"]'))
          : true
      }), Boolean(entry.requireKindergrimmLink));

      const status = response?.status() ?? 0;
      const errors = {
        console: compactErrors(consoleErrors),
        page: compactErrors(pageErrors),
        resources: compactErrors(failedResources)
      };
      const passed = status === 200
        && dom.title.length > 0
        && dom.bodyTextLength > 30
        && dom.bodyHeight > 100
        && dom.brokenImages.length === 0
        && dom.kindergrimmLink
        && errors.console.length === 0
        && errors.page.length === 0
        && errors.resources.length === 0;

      return { id: entry.id, kind: entry.kind, path: entry.path, url, status, passed, ...dom, errors };
    });
  } catch (error) {
    return {
      id: entry.id,
      kind: entry.kind,
      path: entry.path,
      url,
      status: 0,
      passed: false,
      fatalError: error.stack || error.message
    };
  }
}

async function inspectOverviewLink(entry) {
  const sourceUrl = routeUrl(entry.path);
  const targetUrl = routeUrl(entry.target);
  try {
    return await withBrowser(async (page) => {
      const pageErrors = [];
      const failedResources = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
      });

      await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(700);
      const links = page.locator('a');
      const linkIndex = await links.evaluateAll(
        (anchors, expected) => anchors.findIndex((anchor) => anchor.href === expected),
        targetUrl
      );
      if (linkIndex >= 0) {
        await Promise.all([
          page.waitForURL((url) => url.href === targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }),
          links.nth(linkIndex).click()
        ]);
      }
      const finalUrl = page.url();
      const title = await page.title();
      const errors = {
        page: compactErrors(pageErrors),
        resources: compactErrors(failedResources)
      };
      const passed = linkIndex >= 0
        && finalUrl === targetUrl
        && title.includes('Kindergrimm')
        && errors.page.length === 0
        && errors.resources.length === 0;
      return { id: entry.id, sourceUrl, targetUrl, finalUrl, linkIndex, title, passed, errors };
    });
  } catch (error) {
    return {
      id: entry.id,
      sourceUrl,
      targetUrl,
      passed: false,
      fatalError: error.stack || error.message
    };
  }
}

const pages = [];
for (const entry of manifest.pages) {
  const result = await inspectPage(entry);
  pages.push(result);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} page ${entry.id} status=${result.status}`);
}

const overviewLinks = [];
for (const entry of manifest.overviewLinks) {
  const result = await inspectOverviewLink(entry);
  overviewLinks.push(result);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} link ${entry.id}`);
}

const failures = [
  ...pages.filter((item) => !item.passed).map((item) => `page:${item.id}`),
  ...overviewLinks.filter((item) => !item.passed).map((item) => `link:${item.id}`)
];
const report = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  baseUrl: baseUrl.href,
  manifest: path.relative(projectDir, manifestPath).replaceAll('\\', '/'),
  summary: {
    pages: { total: pages.length, passed: pages.length - pages.filter((item) => !item.passed).length },
    overviewLinks: { total: overviewLinks.length, passed: overviewLinks.length - overviewLinks.filter((item) => !item.passed).length },
    checks: pages.length + overviewLinks.length,
    failures
  },
  pages,
  overviewLinks
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`KINDERGRIMM PAGES ${report.summary.pages.passed}/${report.summary.pages.total}`);
console.log(`KINDERGRIMM OVERVIEW LINKS ${report.summary.overviewLinks.passed}/${report.summary.overviewLinks.total}`);
console.log(`REPORT ${reportPath}`);
if (failures.length) process.exitCode = 1;