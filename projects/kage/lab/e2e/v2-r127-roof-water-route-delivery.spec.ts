import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type RoofState = 'opening' | 'rainfall' | 'gutter-flow' | 'cistern' | 'garden-release';

type RoofSnapshot = {
  ready: boolean;
  state: RoofState;
  activeIndex: number;
  progress: number;
  rainLevel: number;
  waterTravel: number;
  tankFill: number;
  plantGrowth: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  canvasVisualHash: string;
  dialogOpen: boolean;
  saved: boolean;
  noteLength: number;
  fallback: boolean;
  reducedMotion: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  horizontalOverflow: boolean;
  quality: 'high' | 'balanced' | 'low';
  revision: string;
};

declare global {
  interface Window {
    __roofWaterRoute?: {
      snapshot: () => RoofSnapshot;
      goto: (state: RoofState | number) => void;
      setState: (state: RoofState | number) => void;
      setProgress: (value: number) => void;
      openPlan: () => void;
      closePlan: () => void;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/roof-water-route/';
const revision = 'r127-proof';
const runId = 'direct-r127-roof-water-route';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r127-roof-water-route');
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'roof-water-route');
const observations: Record<string, unknown>[] = [];

test.describe.configure({ mode: 'serial', timeout: 45_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }));

test.afterAll(async () => {
  const finalBundleHash = await bundleHash();
  await writeFile(resolve(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r127-roof-water-route-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: finalBundleHash,
    route,
    revision,
    captures: [
      '01-desktop-opening.png',
      '02-desktop-water-route.png',
      '03-desktop-plan.png',
      '04-mobile-reduced.png',
      '05-fallback.png',
    ],
    observations,
  }, null, 2)}\n`, 'utf8');
});

function observe(page: Page): Issues {
  const issues: Issues = { pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) response.request().method();
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.documentElement.dataset.roofWaterReady === 'true'
    && window.__roofWaterRoute?.snapshot().ready === true
  ));
}

async function snapshot(page: Page): Promise<RoofSnapshot> {
  return page.evaluate(() => window.__roofWaterRoute!.snapshot());
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

test('desktop opening establishes a live daylight building section within five seconds', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.waitForFunction(() => {
    const current = window.__roofWaterRoute?.snapshot();
    return Boolean(current && current.frames > 0 && current.drawCalls > 0 && current.triangles > 0);
  });
  const current = await snapshot(page);
  observations.push({ checkpoint: 'desktop-opening', readyAtMs: Date.now() - startedAt, issues, state: current });
  expect(Date.now() - startedAt).toBeLessThanOrEqual(5_000);
  expect(current).toMatchObject({ ready: true, state: 'opening', activeIndex: 0, fallback: false, reducedMotion: false, quality: 'high', revision });
  expect(current.frames).toBeGreaterThan(0);
  expect(current.drawCalls).toBeGreaterThan(0);
  expect(current.triangles).toBeGreaterThan(0);
  expect(current.horizontalOverflow).toBe(false);
  await expect(page.locator('[data-roof-canvas]')).toBeVisible();
  await expect(page.locator('#opening')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  expectClean(issues);
});

test('one progress driver changes all five semantic and rendered states in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const states: Record<string, RoofSnapshot> = {};
  const canvasHashes: string[] = [];
  const visualHashes: string[] = [];
  const visual = page.locator('[data-signal-visual-anchor], [data-roof-stage]').first();
  for (const stateName of ['rainfall', 'gutter-flow', 'cistern', 'garden-release'] as const) {
    await page.evaluate((state) => window.__roofWaterRoute!.goto(state), stateName);
    await page.waitForFunction((state) => window.__roofWaterRoute?.snapshot().state === state, stateName);
    await settle(page);
    const current = await snapshot(page);
    states[stateName] = current;
    canvasHashes.push(current.canvasVisualHash);
    const bytes = await visual.screenshot();
    visualHashes.push(createHash('sha256').update(bytes).digest('hex'));
    await expect(page.locator(`[data-scene="${stateName}"]`)).toHaveAttribute('aria-current', 'step');
  }
  expect(new Set(canvasHashes).size).toBe(4);
  expect(new Set(visualHashes).size).toBe(4);
  expect(states.rainfall.rainLevel).toBeGreaterThan(0);
  expect(states['gutter-flow'].waterTravel).toBeGreaterThan(states.rainfall.waterTravel);
  expect(states.cistern.tankFill).toBeGreaterThan(states['gutter-flow'].tankFill);
  expect(states['garden-release'].plantGrowth).toBeGreaterThan(states.cistern.plantGrowth);

  await page.evaluate(() => window.__roofWaterRoute!.goto('rainfall'));
  await page.waitForFunction(() => window.__roofWaterRoute?.snapshot().state === 'rainfall');
  expect((await snapshot(page)).activeIndex).toBe(1);
  observations.push({ checkpoint: 'desktop-route', issues, states, canvasVisualHashes: canvasHashes, visibleScreenshotHashes: visualHashes, reverseState: await snapshot(page) });
  await page.evaluate(() => window.__roofWaterRoute!.goto('garden-release'));
  await settle(page);
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-water-route.png') });
  expectClean(issues);
});

test('the final planning action saves a truthful concept note and returns focus after Escape', async ({ page }) => {
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate(() => window.__roofWaterRoute!.goto('garden-release'));
  await page.evaluate(() => window.__roofWaterRoute!.openPlan());
  const dialog = page.locator('[data-plan-dialog]');
  const note = page.locator('[data-plan-note]');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await note.fill('先记录屋檐、落水管、蓄水位置和花园之间的实际距离。');
  await page.locator('#save-plan').click();
  await page.waitForFunction(() => window.__roofWaterRoute?.snapshot().saved === true);
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ state: 'garden-release', dialogOpen: true, saved: true });
  expect(saved.noteLength).toBeGreaterThan(0);
  await expect(page.locator('[data-plan-status]')).toContainText('保存');
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-plan.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-open-plan]')).toBeFocused();
  observations.push({ checkpoint: 'desktop-plan', issues, state: await snapshot(page), semantic: { closeMethod: 'Escape', focusReturnedTo: 'open-plan' } });
  expectClean(issues);
});

test('390px reduced motion keeps the complete route, CTA and zero horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const issues = observe(page);
  await page.goto(`${route}?quality=low&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.evaluate(() => window.__roofWaterRoute!.goto('garden-release'));
  await page.waitForFunction(() => window.__roofWaterRoute?.snapshot().state === 'garden-release');
  const current = await snapshot(page);
  expect(current).toMatchObject({ reducedMotion: true, fallback: false, state: 'garden-release', horizontalOverflow: false, quality: 'low' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expect(page.locator('[data-open-plan]')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  observations.push({ checkpoint: 'mobile-reduced', issues, state: current, viewport: { width: 390, height: 844 } });
  expectClean(issues);
  await context.close();
});

test('forced fallback preserves the five-state meaning and final action without render stats', async ({ page }) => {
  const issues = observe(page);
  await page.goto(`${route}?quality=low&motion=reduce&forceFallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  expect(await snapshot(page)).toMatchObject({ fallback: true, frames: 0, drawCalls: 0, triangles: 0 });
  await expect(page.locator('[data-roof-canvas]')).toBeHidden();
  await expect(page.locator('#fallback-scene[data-fallback]')).toBeVisible();
  await page.evaluate(() => window.__roofWaterRoute!.goto('garden-release'));
  await page.locator('[data-open-plan]').click();
  await page.locator('[data-plan-note]').fill('回退视图仍可保存概念路线。');
  await page.locator('#save-plan').click();
  await page.waitForFunction(() => window.__roofWaterRoute?.snapshot().saved === true);
  await page.keyboard.press('Escape');
  const current = await snapshot(page);
  expect(current).toMatchObject({ state: 'garden-release', fallback: true, saved: true, dialogOpen: false, frames: 0, drawCalls: 0, triangles: 0 });
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback.png') });
  observations.push({ checkpoint: 'forced-fallback', issues, state: current });
  expectClean(issues);
});
