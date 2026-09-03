import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type SampleId =
  | 'glass-bead'
  | 'micro-prism'
  | 'reflective-thread'
  | 'honeycomb-film'
  | 'perforated-silver'
  | 'reflective-pigment'
  | 'segmented-guide'
  | 'frosted-return';

type CatalogSnapshot = {
  ready: boolean;
  filter: string;
  visibleCount: number;
  selected: SampleId[];
  selectedCount: number;
  beamX: number;
  beamY: number;
  activeSample: SampleId | null;
  driveMode: 'demo' | 'manual' | 'paused';
  dialogOpen: boolean;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  frames: number;
  canvasCount: number;
  canvasVisualHash: string;
  horizontalOverflow: boolean;
  revision: string;
};

declare global {
  interface Window {
    __nightReflectiveCatalog?: {
      snapshot: () => CatalogSnapshot;
      setFilter: (filter: string) => CatalogSnapshot;
      selectSample: (id: SampleId) => CatalogSnapshot;
      setBeam: (x: number, y: number, id?: SampleId) => CatalogSnapshot;
      openCompare: () => CatalogSnapshot;
      closeCompare: () => CatalogSnapshot;
      save: () => CatalogSnapshot;
      reset: () => CatalogSnapshot;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/night-reflective-catalog/';
const revision = 'r128-proof';
const runId = 'direct-r128-night-reflective-catalog';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r128-night-reflective-catalog');
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'night-reflective-catalog');
const observations: Record<string, unknown>[] = [];
const captures = ['01-desktop-overview.png', '02-desktop-compare.png', '03-mobile-reduced.png', '04-fallback.png'];

test.describe.configure({ mode: 'serial', timeout: 40_000 });

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
    rm(resolve(evidenceDir, 'report.failed.json'), { force: true })
  ]);
});

test.afterAll(async () => {
  const cleanIssues = JSON.stringify({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
  const capturesExist = (await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return true;
    } catch {
      return false;
    }
  }))).every(Boolean);
  const complete = observations.length === 4
    && observations.every((observation) => JSON.stringify(observation.issues) === cleanIssues)
    && capturesExist;
  const report = {
    schemaVersion: 1,
    stage: 'r128-night-reflective-catalog-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    captures: complete ? captures : captures.filter((_, index) => index < observations.length),
    observations,
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
});

function observe(page: Page): Issues {
  const issues: Issues = { pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => {
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.r128Ready === 'true'
    && window.__nightReflectiveCatalog?.snapshot().ready === true);
}

async function snapshot(page: Page): Promise<CatalogSnapshot> {
  return page.evaluate(() => window.__nightReflectiveCatalog!.snapshot());
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

test('desktop opening is a live multi-object catalog rather than a central hero or workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  const startedAt = Date.now();
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.waitForFunction(() => (window.__nightReflectiveCatalog?.snapshot().frames ?? 0) > 1);
  const current = await snapshot(page);
  expect(Date.now() - startedAt).toBeLessThanOrEqual(8_000);
  expect(current).toMatchObject({ ready: true, filter: 'all', visibleCount: 8, selectedCount: 0, driveMode: 'demo', fallback: false, reducedMotion: false, canvasCount: 8, horizontalOverflow: false, revision });
  await expect(page.locator('.sample-card')).toHaveCount(8);
  await expect(page.locator('.sample-card:visible')).toHaveCount(8);
  await expect(page.locator('.sample-canvas:visible')).toHaveCount(8);
  await expect(page.locator('input[type="range"], .control-panel, [data-scene-link]')).toHaveCount(0);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-overview.png') });
  observations.push({ checkpoint: 'desktop-overview', readyAtMs: Date.now() - startedAt, issues, state: current });
  expectClean(issues);
});

test('filter, shared beam, two-item compare, keyboard dismissal and save share one truthful state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const initialHash = (await snapshot(page)).canvasVisualHash;
  await page.locator('[data-filter="route"]').click();
  expect((await snapshot(page)).visibleCount).toBe(4);
  const prismCard = page.locator('[data-sample-id="micro-prism"]');
  await prismCard.scrollIntoViewIfNeeded();
  const prismCanvas = prismCard.locator('.sample-canvas');
  const initialPixels = await prismCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const prismBounds = await prismCard.boundingBox();
  if (!prismBounds) throw new Error('Micro-prism card is not measurable.');
  await page.mouse.move(prismBounds.x + prismBounds.width * .18, prismBounds.y + prismBounds.height * .72);
  const inspected = await snapshot(page);
  expect(inspected).toMatchObject({ driveMode: 'manual', activeSample: 'micro-prism', beamX: .18, beamY: .72 });
  expect(inspected.canvasVisualHash).not.toBe(initialHash);
  expect(await prismCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(initialPixels);

  await prismCard.focus();
  const beforeKeyboard = await snapshot(page);
  await page.keyboard.press('ArrowRight');
  expect((await snapshot(page)).beamX).toBeGreaterThan(beforeKeyboard.beamX);
  await prismCard.locator('.sample-select').click();
  await page.locator('[data-sample-id="segmented-guide"] .sample-select').click();
  await page.locator('#open-compare').click();
  await expect(page.locator('#compare-dialog')).toBeVisible();
  await expect(page.locator('.compare-item')).toHaveCount(2);
  expect(await page.locator('#compare-dialog').evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.locator('#save-selection').click();
  await page.waitForFunction(() => window.__nightReflectiveCatalog?.snapshot().saved === true);
  await expect(page.locator('#save-status')).toContainText('已收藏');
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-compare.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('#compare-dialog')).toBeHidden();
  await expect(page.locator('#open-compare')).toBeFocused();
  const finalState = await snapshot(page);
  expect(finalState).toMatchObject({ filter: 'route', visibleCount: 4, selectedCount: 2, dialogOpen: false, saved: true, driveMode: 'manual' });
  observations.push({ checkpoint: 'desktop-interaction', issues, initialVisualHash: initialHash, inspected, state: finalState, semantic: { closeMethod: 'Escape', focusReturnedTo: 'open-compare' } });
  expectClean(issues);
});

test('390px reduced motion preserves filtering, comparison and collection without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const issues = observe(page);
  await page.goto(`${route}?motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.locator('[data-filter="wear"]').tap();
  await page.locator('[data-sample-id="glass-bead"] .sample-select').tap();
  await page.locator('[data-sample-id="reflective-thread"] .sample-select').tap();
  await page.locator('#open-compare').tap();
  await expect(page.locator('#compare-dialog')).toBeVisible();
  const current = await snapshot(page);
  expect(current).toMatchObject({ filter: 'wear', visibleCount: 4, selectedCount: 2, dialogOpen: true, reducedMotion: true, driveMode: 'manual', horizontalOverflow: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.screenshot({ path: resolve(evidenceDir, '03-mobile-reduced.png') });
  observations.push({ checkpoint: 'mobile-reduced', issues, state: current, viewport: { width: 390, height: 844 } });
  expectClean(issues);
  await context.close();
});

test('forced Canvas fallback still filters, compares and saves the same sample identities', async ({ page }) => {
  const issues = observe(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${route}?fallback=1&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  expect(await snapshot(page)).toMatchObject({ fallback: true, reducedMotion: true, frames: 0, canvasCount: 0, visibleCount: 8 });
  await expect(page.locator('.sample-canvas').first()).toBeHidden();
  await page.locator('[data-filter="stage"]').click();
  await page.locator('[data-sample-id="honeycomb-film"] .sample-select').click();
  await page.locator('[data-sample-id="reflective-pigment"] .sample-select').click();
  await page.locator('#open-compare').click();
  await page.locator('#save-selection').click();
  await expect(page.locator('#compare-grid canvas')).toHaveCount(0);
  const current = await snapshot(page);
  expect(current).toMatchObject({ filter: 'stage', visibleCount: 3, selectedCount: 2, dialogOpen: true, saved: true, fallback: true, canvasCount: 0 });
  await page.screenshot({ path: resolve(evidenceDir, '04-fallback.png') });
  observations.push({ checkpoint: 'forced-fallback', issues, state: current });
  expectClean(issues);
});
