import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type StationId = 'rock' | 'anemone' | 'crab';

type TidepoolSnapshot = {
  ready: boolean;
  activeStation: StationId | null;
  visited: StationId[];
  routeReady: boolean;
  saved: boolean;
  progress: number;
  scrollLeft: number;
  imageLoaded: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  assetUrl: string | null;
  quality: 'high' | 'balanced' | 'low';
  revision: string;
};

declare global {
  interface Window {
    __moonlitTidepool?: {
      snapshot: () => TidepoolSnapshot;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/moonlit-tidepool-panorama/';
const revision = 'r132-proof';
const runId = 'direct-r132-moonlit-tidepool-panorama';
const panoramaAsset = 'assets/moonlit-tidepool-panorama-v1.png';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r132-moonlit-tidepool-panorama');
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'moonlit-tidepool-panorama');
const observations: Record<string, unknown>[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-navigation.png',
  '03-desktop-route-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
];

test.describe.configure({ mode: 'serial', timeout: 45_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts', panoramaAsset]) {
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
  const cleanIssues = JSON.stringify({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
  const captureChecks = await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }));
  const existingCaptures = captureChecks.filter((file): file is string => Boolean(file));
  const complete = observations.length === 5
    && observations.every((observation) => JSON.stringify(observation.issues) === cleanIssues)
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r132-moonlit-tidepool-panorama-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    captures: complete ? captures : existingCaptures,
    observations,
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
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
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.body.dataset.experience === 'moonlit-tidepool-panorama'
    && window.__moonlitTidepool?.snapshot().ready === true);
}

async function snapshot(page: Page): Promise<TidepoolSnapshot> {
  return page.evaluate(() => window.__moonlitTidepool!.snapshot());
}

async function viewportScrollLeft(page: Page): Promise<number> {
  return page.locator('#panorama-viewport').evaluate((element) => element.scrollLeft);
}

async function resetViewport(page: Page): Promise<void> {
  await page.locator('#panorama-viewport').evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page.waitForFunction(() => Math.abs(document.querySelector<HTMLElement>('#panorama-viewport')!.scrollLeft) <= 1);
}

async function waitForScrollDelta(page: Page, before: number, minimum = 8): Promise<number> {
  await page.waitForFunction(({ previous, delta }) => {
    const viewport = document.querySelector<HTMLElement>('#panorama-viewport');
    return Boolean(viewport && Math.abs(viewport.scrollLeft - previous) >= delta);
  }, { previous: before, delta: minimum });
  return viewportScrollLeft(page);
}

async function expectDocumentFit(page: Page): Promise<void> {
  expect((await snapshot(page)).horizontalOverflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function expectPanoramaScrollable(page: Page): Promise<void> {
  const dimensions = await page.locator('#panorama-viewport').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth + 100);
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function visitStation(page: Page, id: StationId): Promise<TidepoolSnapshot> {
  const hotspot = page.locator(`button[data-station-id="${id}"]`);
  await hotspot.click();
  const minimumProgress: Record<StationId, number> = { rock: 0, anemone: .45, crab: .99 };
  await page.waitForFunction(({ stationId, minimum }) => {
    const current = window.__moonlitTidepool?.snapshot();
    const positionReached = stationId === 'rock' ? (current?.progress ?? 1) <= .05 : (current?.progress ?? 0) >= minimum;
    return current?.activeStation === stationId
      && current.visited.includes(stationId as StationId)
      && positionReached;
  }, { stationId: id, minimum: minimumProgress[id] });
  await expect(hotspot).toHaveAttribute('aria-pressed', 'true');
  expect((await hotspot.innerText()).trim().length).toBeGreaterThan(0);
  return snapshot(page);
}

test('1440px opening loads the project panorama as one full-bleed explorable stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const current = await snapshot(page);
  expect(Date.now() - startedAt).toBeLessThanOrEqual(8_000);
  expect(current).toMatchObject({
    ready: true,
    activeStation: 'rock',
    visited: [],
    routeReady: false,
    saved: false,
    imageLoaded: true,
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    quality: 'high',
    revision,
  });
  expect(current.assetUrl).toContain('moonlit-tidepool-panorama-v1.png');
  await expect(page.locator('#panorama-stage')).toBeVisible();
  await expect(page.locator('#panorama-viewport')).toBeVisible();
  await expect(page.locator('button[data-station-id]')).toHaveCount(3);
  await expect(page.locator('#save-route')).toBeDisabled();
  await expect(page.locator('#panorama-fallback')).toBeHidden();
  const image = await page.locator('#panorama-image').evaluate((element: HTMLImageElement) => ({
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    currentSrc: element.currentSrc,
  }));
  expect(image).toMatchObject({ complete: true, naturalWidth: 1915, naturalHeight: 821 });
  expect(image.currentSrc).toContain('moonlit-tidepool-panorama-v1.png');
  await expectPanoramaScrollable(page);
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  observations.push({ checkpoint: 'desktop-opening', readyAtMs: Date.now() - startedAt, issues, state: current, image });
  expectClean(issues);
});

test('wheel, pointer drag, ArrowRight and previous/next controls all move the same horizontal panorama', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const viewport = page.locator('#panorama-viewport');
  await expectPanoramaScrollable(page);

  await resetViewport(page);
  const wheelBefore = await viewportScrollLeft(page);
  await viewport.hover();
  await page.mouse.wheel(0, 620);
  const wheelAfter = await waitForScrollDelta(page, wheelBefore);

  await resetViewport(page);
  const dragBefore = await viewportScrollLeft(page);
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .60, box!.y + box!.height * .36);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .25, box!.y + box!.height * .36, { steps: 12 });
  await page.mouse.up();
  const dragAfter = await waitForScrollDelta(page, dragBefore);

  await resetViewport(page);
  const arrowBefore = await viewportScrollLeft(page);
  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  const arrowAfter = await waitForScrollDelta(page, arrowBefore);

  await resetViewport(page);
  const nextBefore = await viewportScrollLeft(page);
  const stationBeforeNext = (await snapshot(page)).activeStation;
  await page.locator('#next-station').click();
  await page.waitForFunction((previousStation) => {
    const current = window.__moonlitTidepool?.snapshot();
    return current?.activeStation !== previousStation && current?.activeStation === 'anemone' && current.scrollLeft > 8;
  }, stationBeforeNext);
  const nextAfter = await viewportScrollLeft(page);
  const stationAfterNext = (await snapshot(page)).activeStation;
  await page.locator('#prev-station').click();
  await page.waitForFunction((previousStation) => {
    const current = window.__moonlitTidepool?.snapshot();
    return current?.activeStation !== previousStation && current?.activeStation === 'rock';
  }, stationAfterNext);
  await page.waitForFunction((previousScroll) => {
    const panorama = document.querySelector<HTMLElement>('#panorama-viewport');
    return Boolean(panorama && panorama.scrollLeft < previousScroll - 8);
  }, nextAfter);
  const previousState = await page.evaluate(() => {
    const panorama = document.querySelector<HTMLElement>('#panorama-viewport');
    return {
      domScrollLeft: panorama?.scrollLeft ?? 0,
      snapshot: window.__moonlitTidepool?.snapshot() ?? null,
    };
  });
  const prevAfter = previousState.domScrollLeft;

  expect(wheelAfter).toBeGreaterThan(wheelBefore + 8);
  expect(dragAfter).toBeGreaterThan(dragBefore + 8);
  expect(arrowAfter).toBeGreaterThan(arrowBefore + 8);
  expect(nextAfter).toBeGreaterThan(nextBefore + 8);
  expect(prevAfter).toBeLessThan(nextAfter);
  expect(previousState.snapshot).not.toBeNull();
  expect(previousState.snapshot?.scrollLeft).toBeCloseTo(prevAfter, 0);
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-navigation.png') });
  observations.push({
    checkpoint: 'desktop-panorama-navigation',
    issues,
    state: await snapshot(page),
    comparison: {
      wheelMoved: wheelAfter > wheelBefore + 8,
      dragMoved: dragAfter > dragBefore + 8,
      arrowMoved: arrowAfter > arrowBefore + 8,
      nextMoved: nextAfter > nextBefore + 8,
      previousMovedBack: prevAfter < nextAfter,
    },
    positions: { wheelBefore, wheelAfter, dragBefore, dragAfter, arrowBefore, arrowAfter, nextBefore, nextAfter, prevAfter },
  });
  expectClean(issues);
});

test('three tidepool stations reveal their identity, advance progress and unlock one saved route', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await expect(page.locator('#save-route')).toBeDisabled();

  const rock = await visitStation(page, 'rock');
  const anemone = await visitStation(page, 'anemone');
  const crab = await visitStation(page, 'crab');
  expect(rock.progress).toBeLessThanOrEqual(.05);
  expect(anemone.progress).toBeGreaterThan(rock.progress);
  expect(crab.progress).toBeGreaterThan(anemone.progress);
  expect(crab.progress).toBeGreaterThanOrEqual(.99);
  expect(crab).toMatchObject({
    activeStation: 'crab',
    visited: ['rock', 'anemone', 'crab'],
    routeReady: true,
    saved: false,
  });
  await expect(page.locator('#save-route')).toBeEnabled();
  await page.locator('#save-route').click();
  await page.waitForFunction(() => window.__moonlitTidepool?.snapshot().saved === true);
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ routeReady: true, saved: true, visited: ['rock', 'anemone', 'crab'] });
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-route-saved.png') });
  observations.push({
    checkpoint: 'desktop-stations-save',
    issues,
    states: { rock, anemone, crab, saved },
    comparison: {
      progressAdvanced: rock.progress < anemone.progress && anemone.progress < crab.progress,
      allStationsVisited: saved.visited.length === 3,
      routeSaved: saved.routeReady && saved.saved,
    },
  });
  expectClean(issues);
});

test('390px reduced-motion touch journey keeps the panorama, all stations and save reachable', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  for (const id of ['rock', 'anemone', 'crab'] as const) {
    await page.locator(`button[data-station-id="${id}"]`).tap();
    await page.waitForFunction((stationId) => window.__moonlitTidepool?.snapshot().visited.includes(stationId as StationId), id);
  }
  await page.locator('#save-route').tap();
  await page.waitForFunction(() => window.__moonlitTidepool?.snapshot().saved === true);
  const current = await snapshot(page);
  expect(current).toMatchObject({
    activeStation: 'crab',
    visited: ['rock', 'anemone', 'crab'],
    routeReady: true,
    saved: true,
    imageLoaded: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
  });
  await expectPanoramaScrollable(page);
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  observations.push({ checkpoint: 'mobile-reduced', viewport: { width: 390, height: 844 }, issues, state: current });
  expectClean(issues);
  await context.close();
});

test('fallback=1 preserves station exploration, route completion and save without the PNG stage', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  expect(await snapshot(page)).toMatchObject({
    ready: true,
    imageLoaded: false,
    fallback: true,
    reducedMotion: true,
    routeReady: false,
    saved: false,
  });
  await expect(page.locator('#panorama-fallback')).toBeVisible();
  await expect(page.locator('#panorama-image')).toBeHidden();
  for (const id of ['rock', 'anemone', 'crab'] as const) await visitStation(page, id);
  await expect(page.locator('#save-route')).toBeEnabled();
  await page.locator('#save-route').click();
  await page.waitForFunction(() => window.__moonlitTidepool?.snapshot().saved === true);
  const current = await snapshot(page);
  expect(current).toMatchObject({
    activeStation: 'crab',
    visited: ['rock', 'anemone', 'crab'],
    routeReady: true,
    saved: true,
    imageLoaded: false,
    fallback: true,
    horizontalOverflow: false,
  });
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback-complete.png') });
  observations.push({ checkpoint: 'fallback-complete', issues, state: current });
  expectClean(issues);
});
