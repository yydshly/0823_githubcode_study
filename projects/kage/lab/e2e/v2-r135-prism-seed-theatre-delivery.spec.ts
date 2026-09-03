import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type PrismState = 'sealed' | 'warming' | 'spectrum' | 'specimen';
type PrismSnapshot = {
  ready: boolean;
  state: PrismState;
  progress: number;
  pointerX: number;
  pointerY: number;
  lightAngle: number;
  refraction: number;
  spectralSpread: number;
  imageLoaded: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  assetFallback: boolean;
  reducedMotion: boolean;
  saved: boolean;
  horizontalOverflow: number;
  quality: string;
  revision: string;
};

declare global {
  interface Window {
    __prismSeedTheatre?: {
      snapshot: () => PrismSnapshot;
      setProgress: (value: number) => void;
      setPointer: (x: number, y: number) => void;
      saveSpecimen: () => void;
    };
  }
}

type Issues = { pageErrors: string[]; consoleErrors: string[]; requestFailures: string[]; responseErrors: string[] };
type Observation = { checkpoint: string; viewport: { width: number; height: number }; issues: Issues; state?: PrismSnapshot; readyAtMs?: number; before?: PrismSnapshot; after?: PrismSnapshot; actualScrollDelta?: number; canvasPixelHashes?: string[] };

const route = '/pages/v2/deliveries/prism-seed-theatre/';
const revision = 'r135-proof';
const runId = 'direct-r135-prism-seed-theatre';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'prism-seed-theatre');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r135-prism-seed-theatre');
const observations: Observation[] = [];
const captures = ['01-desktop-opening.png', '02-desktop-spectrum.png', '03-desktop-saved.png', '04-mobile-reduced.png', '05-dual-fallback-saved.png'] as const;

test.describe.configure({ mode: 'serial', timeout: 35_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/prism-seed-glasshouse-v1.png']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
  observations.length = 0;
  await Promise.all([...captures.map((file) => rm(resolve(evidenceDir, file), { force: true })), rm(resolve(evidenceDir, 'report.json'), { force: true }), rm(resolve(evidenceDir, 'report.failed.json'), { force: true })]);
});

test.afterAll(async () => {
  const existing = (await Promise.all(captures.map(async (file) => {
    try { await access(resolve(evidenceDir, file)); return file; } catch { return null; }
  }))).filter(Boolean);
  const complete = observations.length === 5
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0))
    && existing.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r135-prism-seed-theatre-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+asset-bound-bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    captures: existing,
    observations,
  };
  await writeFile(resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
});

function monitor(page: Page): Issues {
  const issues: Issues = { pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') issues.consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`); });
  return issues;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.prismReady === 'true' && window.__prismSeedTheatre?.snapshot().ready === true);
}

async function snap(page: Page): Promise<PrismSnapshot> {
  return page.evaluate(() => window.__prismSeedTheatre!.snapshot());
}

function observe(page: Page, checkpoint: string, issues: Issues): Observation {
  const item: Observation = { checkpoint, viewport: page.viewportSize() ?? { width: 0, height: 0 }, issues };
  observations.push(item);
  return item;
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function wheelTo(page: Page, target: number): Promise<void> {
  await page.mouse.move(1000, 280);
  for (let step = 0; step < 10; step += 1) {
    const current = (await snap(page)).progress;
    if (current >= target - .025) return;
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(55);
  }
}

test('opening is image-led, live and theme-specific', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const started = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-opening', issues);
  await ready(page);
  item.readyAtMs = Date.now() - started;
  await page.waitForFunction(() => (window.__prismSeedTheatre?.snapshot().frames ?? 0) > 1);
  item.state = await snap(page);
  expect(item.readyAtMs).toBeLessThan(5_500);
  expect(item.state).toMatchObject({ state: 'sealed', imageLoaded: true, fallback: false, assetFallback: false, saved: false });
  expect(item.state!.drawCalls).toBeGreaterThan(0);
  expect(item.state!.triangles).toBeGreaterThan(0);
  await expect(page.locator('#prism-source-image')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('wheel and pointer jointly change the non-DOM light field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-spectrum-interaction', issues);
  await ready(page);
  await page.mouse.move(260, 620);
  item.before = await snap(page);
  const beforeScroll = await page.evaluate(() => scrollY);
  const beforePixels = createHash('sha256').update(await page.locator('#prism-canvas').screenshot()).digest('hex');
  await page.mouse.move(1190, 245);
  await wheelTo(page, .62);
  const afterPixels = createHash('sha256').update(await page.locator('#prism-canvas').screenshot()).digest('hex');
  item.after = await snap(page);
  item.actualScrollDelta = (await page.evaluate(() => scrollY)) - beforeScroll;
  item.canvasPixelHashes = [beforePixels, afterPixels];
  expect(item.actualScrollDelta).toBeGreaterThan(0);
  expect(new Set(item.canvasPixelHashes).size).toBe(2);
  expect(item.after.progress).toBeGreaterThan(.52);
  expect(item.after.refraction).toBeGreaterThan(item.before.refraction + .003);
  expect(item.after.spectralSpread).toBeGreaterThan(item.before.spectralSpread + .3);
  expect(Math.abs(item.after.lightAngle - item.before.lightAngle)).toBeGreaterThan(20);
  expect(['spectrum', 'specimen']).toContain(item.after.state);
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('native wheel reaches a saveable completion state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-specimen-saved', issues);
  await ready(page);
  await wheelTo(page, .92);
  await expect(page.locator('#save-specimen')).toBeEnabled();
  await page.locator('#save-specimen').click();
  await page.waitForTimeout(260);
  item.state = await snap(page);
  expect(item.state).toMatchObject({ state: 'specimen', saved: true, imageLoaded: true, fallback: false });
  await expect(page.locator('#save-status')).toContainText('已保存在本次浏览状态中');
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390px reduced-motion journey remains complete and fitted', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'mobile-reduced', issues);
  await ready(page);
  await page.evaluate(() => window.__prismSeedTheatre!.setProgress(1));
  await page.locator('#save-specimen').click();
  await page.waitForTimeout(260);
  item.state = await snap(page);
  expect(item.state).toMatchObject({ state: 'specimen', reducedMotion: true, saved: true, horizontalOverflow: 0 });
  const cta = await page.locator('#save-specimen').boundingBox();
  expect(cta).not.toBeNull();
  expect(cta!.x).toBeGreaterThanOrEqual(0);
  expect(cta!.x + cta!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
});

test('combined image and WebGL fallback still completes the meaning', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&fallback=webgl&assetFallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'dual-fallback-saved', issues);
  await ready(page);
  await page.evaluate(() => window.__prismSeedTheatre!.setProgress(1));
  await page.locator('#save-specimen').click();
  await page.waitForTimeout(260);
  item.state = await snap(page);
  expect(item.state).toMatchObject({ state: 'specimen', fallback: true, assetFallback: true, frames: 0, saved: true });
  await expect(page.locator('#prism-canvas')).toBeHidden();
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});
