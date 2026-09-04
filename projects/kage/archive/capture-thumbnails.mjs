import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const archiveRoot = dirname(fileURLToPath(import.meta.url));
const labRoot = resolve(archiveRoot, '../lab');
const requireFromLab = createRequire(join(labRoot, 'package.json'));
const { chromium } = requireFromLab('@playwright/test');

const baseUrl = process.env.KAGE_ARCHIVE_CAPTURE_URL
  ?? 'http://127.0.0.1:8149/0823_githubcode_study/projects/kage/archive/';
const outputRoot = join(archiveRoot, 'assets/cases');
const manifest = JSON.parse(readFileSync(join(archiveRoot, 'research-manifest.json'), 'utf8'));
const executablePath = process.env.BROWSER_EXECUTABLE_PATH
  ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const concurrency = Math.max(1, Number(process.env.KAGE_CAPTURE_WORKERS ?? 4));

mkdirSync(outputRoot, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist']
});

let cursor = 0;
const results = [];

async function capture(item) {
  const page = await browser.newPage({
    viewport: { width: 720, height: 450 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const url = new URL(item.viewUrl, baseUrl).href;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForFunction(() => !document.querySelector('.generated-loading'), null, { timeout: 8_000 }).catch(() => {});
    await page.waitForTimeout(1_200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: join(outputRoot, `${item.id}.jpg`),
      type: 'jpeg',
      quality: 72,
      animations: 'disabled'
    });
    results.push({ id: item.id, status: 'captured', pageErrors });
  } catch (error) {
    results.push({ id: item.id, status: 'failed', error: error.message, pageErrors });
  } finally {
    await page.close();
  }
}

async function worker() {
  while (cursor < manifest.cases.length) {
    const item = manifest.cases[cursor];
    cursor += 1;
    await capture(item);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, manifest.cases.length) }, worker));
await browser.close();

const failed = results.filter((item) => item.status === 'failed');
console.log(JSON.stringify({ total: results.length, captured: results.length - failed.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
