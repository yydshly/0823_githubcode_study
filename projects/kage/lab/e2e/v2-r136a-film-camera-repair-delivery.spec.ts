import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type RepairRoute = 'moving' | 'stuck' | null;
type RepairPhase = 'opening' | 'fork' | 'route' | 'confluence' | 'saved';
type RepairSnapshot = {
  ready: boolean;
  phase: RepairPhase | 'route-a' | 'route-b';
  route: RepairRoute;
  step: number;
  routeHistory: string[];
  saved: boolean;
  reducedMotion: boolean;
  enhancementOff: boolean;
  cameraGeometryHash: string;
  pathD: string;
  partTransforms: Record<string, string>;
  horizontalOverflow: boolean;
  revision: string;
};

declare global {
  interface Window {
    __filmCameraRepair?: {
      snapshot: () => RepairSnapshot;
      chooseRoute: (route: Exclude<RepairRoute, null>) => RepairSnapshot;
      advance: () => RepairSnapshot;
      returnToFork: () => RepairSnapshot;
      save: () => RepairSnapshot;
    };
  }
}

type Issues = { pageErrors: string[]; consoleErrors: string[]; requestFailures: string[]; responseErrors: string[] };
type Observation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: Issues;
  state?: RepairSnapshot;
  readyAtMs?: number;
  moving?: RepairSnapshot;
  stuck?: RepairSnapshot;
  svgHashes?: string[];
};

const route = '/pages/v2/deliveries/film-camera-repair-paths/';
const revision = 'r136a-proof';
const runId = 'direct-r136a-film-camera-repair-paths';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'film-camera-repair-paths');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136a-film-camera-repair-paths');
const observations: Observation[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-moving-route.png',
  '03-desktop-stuck-saved.png',
  '04-mobile-reduced.png',
  '05-enhancement-off-saved.png',
] as const;

test.describe.configure({ mode: 'serial', timeout: 35_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
  observations.length = 0;
  await Promise.all([
    ...captures.map((file) => rm(resolve(evidenceDir, file), { force: true })),
    rm(resolve(evidenceDir, 'report.json'), { force: true }),
    rm(resolve(evidenceDir, 'report.failed.json'), { force: true }),
  ]);
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
    stage: 'r136a-film-camera-repair-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
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
  await page.waitForFunction(() => (
    document.documentElement.dataset.cameraReady === 'true'
      && window.__filmCameraRepair?.snapshot().ready === true
  ));
}

async function snap(page: Page): Promise<RepairSnapshot> {
  return page.evaluate(() => window.__filmCameraRepair!.snapshot());
}

function observe(page: Page, checkpoint: string, issues: Issues): Observation {
  const item: Observation = { checkpoint, viewport: page.viewportSize() ?? { width: 0, height: 0 }, issues };
  observations.push(item);
  return item;
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function completeRoute(page: Page, routeId: 'moving' | 'stuck'): Promise<RepairSnapshot> {
  if (await page.locator('#opening-start').isVisible()) {
    await page.locator('#opening-start').click();
  }
  await page.locator(`[data-route="${routeId}"]`).click();
  await expect(page.locator('#advance-check')).toBeVisible();
  await page.locator('#advance-check').click();
  await page.locator('#advance-check').click();
  await expect(page.locator('#judgement-card')).toBeVisible();
  return snap(page);
}

test('opening presents a recognisable editorial camera diagram', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const started = Date.now();
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-opening', issues);
  await ready(page);
  item.readyAtMs = Date.now() - started;
  item.state = await snap(page);
  expect(item.readyAtMs).toBeLessThan(4_000);
  expect(item.state).toMatchObject({ phase: 'opening', route: null, saved: false, enhancementOff: false });
  await expect(page.locator('#camera-svg')).toBeVisible();
  await expect(page.locator('#camera-body,#lens,#advance-lever,#meter-window,#shutter-button,#battery-door')).toHaveCount(6);
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('moving-shutter route changes camera geometry and reaches a truthful result', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-moving-route', issues);
  await ready(page);
  const beforeHash = createHash('sha256').update(await page.locator('#camera-svg').screenshot()).digest('hex');
  item.moving = await completeRoute(page, 'moving');
  const afterHash = createHash('sha256').update(await page.locator('#camera-svg').screenshot()).digest('hex');
  item.svgHashes = [beforeHash, afterHash];
  expect(new Set(item.svgHashes).size).toBe(2);
  expect(item.moving).toMatchObject({ phase: 'confluence', route: 'moving', step: 2, saved: false });
  expect(item.moving!.cameraGeometryHash).not.toBe('camera-opening');
  expect(item.moving!.routeHistory).toContain('moving');
  await expect(page.locator('#judgement-card')).toContainText('清洁');
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('return, stuck route and common save preserve both decisions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-stuck-saved', issues);
  await ready(page);
  item.moving = await completeRoute(page, 'moving');
  const movingHash = item.moving.cameraGeometryHash;
  await page.locator('#compare-route').click();
  item.stuck = await completeRoute(page, 'stuck');
  expect(item.stuck.cameraGeometryHash).not.toBe(movingHash);
  expect(item.stuck.pathD).not.toBe(item.moving.pathD);
  expect(item.stuck.routeHistory).toEqual(expect.arrayContaining(['moving', 'stuck']));
  await page.locator('#save-card').click();
  item.state = await snap(page);
  expect(item.state).toMatchObject({ phase: 'saved', route: 'stuck', saved: true });
  await expect(page.locator('#save-status')).toContainText('已保存');
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390px reduced-motion keeps both routes, focus and save operable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'mobile-reduced', issues);
  await ready(page);
  await completeRoute(page, 'moving');
  await page.locator('#compare-route').click();
  await completeRoute(page, 'stuck');
  await page.locator('#save-card').click();
  item.state = await snap(page);
  expect(item.state).toMatchObject({ phase: 'saved', reducedMotion: true, saved: true, horizontalOverflow: false });
  expect(item.state!.routeHistory).toEqual(expect.arrayContaining(['moving', 'stuck']));
  const cta = await page.locator('#save-card').boundingBox();
  expect(cta).not.toBeNull();
  expect(cta!.x).toBeGreaterThanOrEqual(0);
  expect(cta!.x + cta!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
});

test('enhancement-off leaves the SVG and complete journey intact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&enhancement=off&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'enhancement-off-saved', issues);
  await ready(page);
  await completeRoute(page, 'stuck');
  await page.locator('#save-card').click();
  item.state = await snap(page);
  expect(item.state).toMatchObject({ phase: 'saved', enhancementOff: true, saved: true });
  await expect(page.locator('#camera-svg')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});
