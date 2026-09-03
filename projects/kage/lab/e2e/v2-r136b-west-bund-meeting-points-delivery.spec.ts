import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type LandmarkId = 'west-bund-museum' | 'tank-shanghai' | 'long-museum' | 'start-museum';

type WestBundSnapshot = {
  ready: boolean;
  activeLandmark: LandmarkId;
  activeName: string;
  activeAddress: string;
  coordinates: string;
  positionIndex: number;
  position: number;
  scrollLeft: number;
  savedId: LandmarkId | null;
  imageLoaded: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  assetUrl: string;
  routeIsProductDemo: boolean;
  revision: string;
};

declare global {
  interface Window {
    __westBundMeetingPoints?: {
      snapshot: () => WestBundSnapshot;
      selectLandmark: (id: LandmarkId) => void;
      setFallback: (next: boolean) => void;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type Observation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: Issues;
  [key: string]: unknown;
};

type PositionState = {
  domScrollLeft: number;
  runtimeScrollLeft: number;
  activeLandmark: LandmarkId;
  activePin: LandmarkId | null;
  activeRailIndex: number;
};

const route = '/pages/v2/deliveries/west-bund-meeting-points/';
const revision = 'r136b-proof';
const runId = 'direct-r136b-west-bund-meeting-points';
const storageKey = 'r136b-west-bund-saved-meeting-point';
const asset = 'assets/xuhui-west-bund-osm-map-v1.jpg';
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'CONTRACT.md', asset] as const;
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'west-bund-meeting-points');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136b-west-bund-meeting-points');
const checkpointOrder = [
  'desktop-opening',
  'desktop-inputs',
  'desktop-selection-saved',
  'mobile-reduced',
  'fallback-complete',
] as const;
const captures = [
  '01-desktop-opening.png',
  '02-desktop-inputs.png',
  '03-desktop-selection-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
] as const;
const observations: Observation[] = [];

const landmarkFacts: Record<LandmarkId, {
  index: number;
  name: string;
  address: string;
  coordinates: string;
  route: string;
}> = {
  'west-bund-museum': {
    index: 0,
    name: '西岸美术馆',
    address: '龙腾大道 2600 号',
    coordinates: '121.4593301, 31.1695893',
    route: '47.541,79.822 48.816,81.595 49.963,86.598',
  },
  'tank-shanghai': {
    index: 1,
    name: '油罐艺术中心',
    address: '龙腾大道 2380 号',
    coordinates: '121.4593761, 31.1665647',
    route: '47.541,79.822 48.998,87.623 50.046,97.322',
  },
  'long-museum': {
    index: 2,
    name: '龙美术馆',
    address: '龙腾大道 3398 号',
    coordinates: '121.4601929, 31.1859164',
    route: '47.541,79.822 49.362,66.702 49.908,44.360 51.533,28.697',
  },
  'start-museum': {
    index: 3,
    name: '星美术馆',
    address: '瑞宁路 111 号',
    coordinates: '121.4657116, 31.1897166',
    route: '47.541,79.822 49.362,66.702 49.908,44.360 51.546,26.627 57.008,18.825 61.580,15.219',
  },
};

test.describe.configure({ mode: 'serial', timeout: 45_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
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
  const existingCaptures = (await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }))).filter((file): file is typeof captures[number] => file !== null);
  const complete = observations.length === checkpointOrder.length
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0))
    && observations.every(({ checkpoint }, index) => checkpoint === checkpointOrder[index])
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r136b-west-bund-meeting-points-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    bundleFiles,
    route,
    revision,
    complete,
    captures: existingCaptures,
    observations,
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
});

function monitor(page: Page): Issues {
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
  await page.waitForFunction(() => {
    const state = window.__westBundMeetingPoints?.snapshot();
    return document.documentElement.dataset.ready === 'true'
      && state?.ready === true
      && (state.imageLoaded || state.fallback);
  });
}

async function snap(page: Page): Promise<WestBundSnapshot> {
  return page.evaluate(() => window.__westBundMeetingPoints!.snapshot());
}

function observe(page: Page, checkpoint: typeof checkpointOrder[number], issues: Issues): Observation {
  const item: Observation = {
    checkpoint,
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    issues,
  };
  observations.push(item);
  return item;
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function documentMetrics(page: Page): Promise<{ clientWidth: number; scrollWidth: number; overflow: number }> {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
}

async function expectDocumentFit(page: Page): Promise<ReturnType<typeof documentMetrics> extends Promise<infer T> ? T : never> {
  const metrics = await documentMetrics(page);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
  expect((await snap(page)).horizontalOverflow).toBe(false);
  return metrics;
}

async function panoramaMetrics(page: Page): Promise<{ clientWidth: number; scrollWidth: number; maximum: number; scrollLeft: number }> {
  return page.locator('#panorama-viewport').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    maximum: element.scrollWidth - element.clientWidth,
    scrollLeft: element.scrollLeft,
  }));
}

async function expectPanoramaScrollable(page: Page): Promise<Awaited<ReturnType<typeof panoramaMetrics>>> {
  const metrics = await panoramaMetrics(page);
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 100);
  expect(metrics.maximum).toBeGreaterThan(100);
  return metrics;
}

async function positionState(page: Page): Promise<PositionState> {
  return page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>('#panorama-viewport')!;
    const state = window.__westBundMeetingPoints!.snapshot();
    return {
      domScrollLeft: viewport.scrollLeft,
      runtimeScrollLeft: state.scrollLeft,
      activeLandmark: state.activeLandmark,
      activePin: document.querySelector<HTMLButtonElement>('[data-landmark-id][aria-pressed="true"]')?.dataset.landmarkId as LandmarkId | undefined ?? null,
      activeRailIndex: Number(document.querySelector<HTMLElement>('[data-rail-index][data-active="true"]')?.dataset.railIndex ?? -1),
    };
  });
}

async function waitForLandmarkSettled(page: Page, id: LandmarkId): Promise<PositionState> {
  const index = landmarkFacts[id].index;
  await page.waitForFunction(({ landmarkId, landmarkIndex }) => {
    const viewport = document.querySelector<HTMLElement>('#panorama-viewport');
    const state = window.__westBundMeetingPoints?.snapshot();
    if (!viewport || !state) return false;
    const maximum = viewport.scrollWidth - viewport.clientWidth;
    const target = maximum * landmarkIndex / 3;
    return state.activeLandmark === landmarkId
      && Math.abs(viewport.scrollLeft - target) <= 2
      && Math.abs(state.scrollLeft - Math.round(viewport.scrollLeft)) <= 1;
  }, { landmarkId: id, landmarkIndex: index }, { timeout: 8_000 });
  const current = await positionState(page);
  expect(Math.abs(current.domScrollLeft - current.runtimeScrollLeft)).toBeLessThanOrEqual(1);
  expect(current.activeLandmark).toBe(id);
  expect(current.activePin).toBe(id);
  expect(current.activeRailIndex).toBe(index);
  return current;
}

async function selectByHotspotAndSettle(page: Page, id: LandmarkId): Promise<PositionState> {
  await page.locator(`[data-landmark-id="${id}"]`).click();
  return waitForLandmarkSettled(page, id);
}

test('desktop opening loads the traceable map and keeps scrolling inside the panorama', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const startedAt = Date.now();
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'desktop-opening', issues);
  item.readyAtMs = Date.now() - startedAt;
  item.state = await snap(page);

  expect(item.readyAtMs).toBeLessThanOrEqual(8_000);
  expect(item.state).toMatchObject({
    ready: true,
    activeLandmark: 'west-bund-museum',
    activeName: '西岸美术馆',
    activeAddress: '龙腾大道 2600 号',
    coordinates: '121.4593301, 31.1695893',
    positionIndex: 0,
    scrollLeft: 0,
    savedId: null,
    imageLoaded: true,
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    routeIsProductDemo: true,
    revision,
  });
  expect((item.state as WestBundSnapshot).assetUrl).toContain('xuhui-west-bund-osm-map-v1.jpg');

  const image = await page.locator('#map-image').evaluate((element: HTMLImageElement) => ({
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    currentSrc: element.currentSrc,
  }));
  expect(image).toMatchObject({ complete: true, naturalWidth: 960, naturalHeight: 576 });
  expect(image.currentSrc).toContain('xuhui-west-bund-osm-map-v1.jpg');
  item.image = image;

  await expect(page.locator('[data-landmark-id]')).toHaveCount(4);
  const facts = await page.locator('[data-landmark-id]').evaluateAll((buttons) => buttons.map((button) => ({
    id: (button as HTMLElement).dataset.landmarkId,
    label: button.getAttribute('aria-label'),
  })));
  expect(facts.map(({ id }) => id)).toEqual(Object.keys(landmarkFacts));
  for (const fact of Object.values(landmarkFacts)) {
    expect(facts.some(({ label }) => label?.includes(fact.name) && label.includes(fact.address))).toBe(true);
  }
  item.landmarks = facts;

  const attribution = page.locator('figcaption a[href="https://www.openstreetmap.org/copyright"]');
  await expect(attribution).toBeVisible();
  await expect(attribution).toHaveText('© OpenStreetMap contributors');
  item.attribution = { text: await attribution.innerText(), href: await attribution.getAttribute('href') };
  item.panorama = await expectPanoramaScrollable(page);
  item.document = await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('wheel, drag, ArrowRight, previous and next all drive the same scroll and active state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'desktop-inputs', issues);
  const viewport = page.locator('#panorama-viewport');
  await expectPanoramaScrollable(page);

  const wheelBefore = await selectByHotspotAndSettle(page, 'west-bund-museum');
  await page.locator('#map-sheet').hover();
  await page.mouse.wheel(0, 1_000);
  const wheelAfter = await waitForLandmarkSettled(page, 'tank-shanghai');
  expect(wheelAfter.domScrollLeft).toBeGreaterThan(wheelBefore.domScrollLeft + 8);

  const dragBefore = await selectByHotspotAndSettle(page, 'west-bund-museum');
  const box = await viewport.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .72, box!.y + box!.height * .5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .35, box!.y + box!.height * .5, { steps: 14 });
  await page.mouse.up();
  const dragAfter = await waitForLandmarkSettled(page, 'tank-shanghai');
  expect(dragAfter.domScrollLeft).toBeGreaterThan(dragBefore.domScrollLeft + 8);

  const arrowBefore = await selectByHotspotAndSettle(page, 'west-bund-museum');
  await viewport.focus();
  await page.keyboard.press('ArrowRight');
  const arrowAfter = await waitForLandmarkSettled(page, 'tank-shanghai');
  expect(arrowAfter.domScrollLeft).toBeGreaterThan(arrowBefore.domScrollLeft + 8);

  const nextBefore = await selectByHotspotAndSettle(page, 'tank-shanghai');
  await page.locator('#next-landmark').click();
  const nextAfter = await waitForLandmarkSettled(page, 'long-museum');
  expect(nextAfter.domScrollLeft).toBeGreaterThan(nextBefore.domScrollLeft + 8);
  await page.locator('#prev-landmark').click();
  const previousAfter = await waitForLandmarkSettled(page, 'tank-shanghai');
  expect(previousAfter.domScrollLeft).toBeLessThan(nextAfter.domScrollLeft - 8);

  item.inputs = {
    wheel: { before: wheelBefore, after: wheelAfter },
    drag: { before: dragBefore, after: dragAfter },
    arrowRight: { before: arrowBefore, after: arrowAfter },
    next: { before: nextBefore, after: nextAfter },
    previous: { before: nextAfter, after: previousAfter },
  };
  item.sameController = [wheelAfter, dragAfter, arrowAfter, nextAfter, previousAfter].every((state) => (
    Math.abs(state.domScrollLeft - state.runtimeScrollLeft) <= 1
      && state.activePin === state.activeLandmark
      && state.activeRailIndex === landmarkFacts[state.activeLandmark].index
  ));
  expect(item.sameController).toBe(true);
  item.state = await snap(page);
  item.document = await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('a real hotspot updates every meeting fact and route, then localStorage preserves the saved card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'desktop-selection-saved', issues);
  const target: LandmarkId = 'long-museum';
  const fact = landmarkFacts[target];
  const routeBefore = await page.locator('#demo-route').getAttribute('points');

  await selectByHotspotAndSettle(page, target);
  const selected = await snap(page);
  const routeAfter = await page.locator('#demo-route').getAttribute('points');
  expect(selected).toMatchObject({
    activeLandmark: target,
    activeName: fact.name,
    activeAddress: fact.address,
    coordinates: fact.coordinates,
    positionIndex: fact.index,
    savedId: null,
    routeIsProductDemo: true,
  });
  await expect(page.locator('#card-name')).toHaveText(fact.name);
  await expect(page.locator('#card-address')).toHaveText(fact.address);
  await expect(page.locator('#card-coordinates')).toHaveText(fact.coordinates);
  await expect(page.locator('#callout-name')).toHaveText(fact.name);
  await expect(page.locator('#callout-address')).toHaveText(fact.address);
  expect(routeAfter).toBe(fact.route);
  expect(routeAfter).not.toBe(routeBefore);
  await expect(page.locator(`[data-landmark-id="${target}"]`)).toHaveAttribute('aria-current', 'location');

  await page.locator('#save-meeting-card').click();
  await page.waitForFunction(({ key, id }) => (
    window.localStorage.getItem(key) === id
      && window.__westBundMeetingPoints?.snapshot().savedId === id
  ), { key: storageKey, id: target });
  const savedBeforeReload = await snap(page);
  const storageBeforeReload = await page.evaluate((key) => window.localStorage.getItem(key), storageKey);
  expect(savedBeforeReload.savedId).toBe(target);
  expect(storageBeforeReload).toBe(target);
  await expect(page.locator('#save-meeting-card')).toHaveAttribute('data-saved', 'true');
  await expect(page.locator('#save-status')).toContainText(`已在本浏览器保存：${fact.name}集合点卡`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  expect((await snap(page)).savedId).toBe(target);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBe(target);
  await selectByHotspotAndSettle(page, target);
  const savedAfterReload = await snap(page);
  await expect(page.locator('#save-meeting-card')).toHaveAttribute('data-saved', 'true');
  await expect(page.locator('#save-status')).toContainText(`已在本浏览器保存：${fact.name}集合点卡`);

  item.selection = {
    before: { route: routeBefore },
    after: {
      state: selected,
      card: { name: fact.name, address: fact.address, coordinates: fact.coordinates },
      route: routeAfter,
    },
  };
  item.persistence = {
    storageKey,
    valueBeforeReload: storageBeforeReload,
    valueAfterReload: await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
    stateAfterReload: savedAfterReload,
  };
  item.document = await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390x844 reduced-motion touch buttons select and save without document overflow', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'mobile-reduced', issues);
  const before = await positionState(page);

  await page.locator('#next-landmark').tap();
  const after = await waitForLandmarkSettled(page, 'tank-shanghai');
  expect(after.domScrollLeft).toBeGreaterThan(before.domScrollLeft + 8);
  await page.locator('#save-meeting-card').tap();
  await page.waitForFunction(({ key, id }) => (
    window.localStorage.getItem(key) === id
      && window.__westBundMeetingPoints?.snapshot().savedId === id
  ), { key: storageKey, id: 'tank-shanghai' });

  const current = await snap(page);
  expect(current).toMatchObject({
    activeLandmark: 'tank-shanghai',
    activeName: '油罐艺术中心',
    activeAddress: '龙腾大道 2380 号',
    coordinates: '121.4593761, 31.1665647',
    savedId: 'tank-shanghai',
    imageLoaded: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
  });
  item.input = { kind: 'touch-tap-next-button', before, after };
  item.storage = { key: storageKey, value: await page.evaluate((key) => window.localStorage.getItem(key), storageKey) };
  item.state = current;
  item.panorama = await expectPanoramaScrollable(page);
  item.document = await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
  await context.close();
});

test('fallback=1 keeps the honest landmark list selectable and savable without a fake map', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'fallback-complete', issues);
  expect(await snap(page)).toMatchObject({
    ready: true,
    savedId: null,
    imageLoaded: false,
    fallback: true,
    reducedMotion: true,
    routeIsProductDemo: true,
  });

  const fallback = page.locator('#map-fallback');
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('地图图片暂不可用');
  await expect(fallback).toContainText('没有用示意图替代真实地理');
  await expect(page.locator('[data-fallback-id]')).toHaveCount(4);
  for (const [id, fact] of Object.entries(landmarkFacts) as [LandmarkId, typeof landmarkFacts[LandmarkId]][]) {
    const button = page.locator(`[data-fallback-id="${id}"]`);
    await expect(button).toContainText(fact.name);
    await expect(button).toContainText(fact.address);
    await expect(button).toContainText(fact.coordinates);
  }
  await expect(page.locator('figcaption a[href="https://www.openstreetmap.org/copyright"]')).toHaveText('© OpenStreetMap contributors');
  await expect(page.locator('#map-image')).toBeHidden();
  await expect(page.locator('.route-overlay')).toBeHidden();
  await expect(page.locator('.route-origin')).toBeHidden();
  await expect(page.locator('[data-landmark-id]').first()).toBeHidden();
  await expect(page.locator('#map-callout')).toBeHidden();
  await expect(page.locator('canvas')).toHaveCount(0);
  const renderedMap = await page.locator('#map-media').evaluate((element) => ({
    backgroundImage: getComputedStyle(element).backgroundImage,
    visibleImages: Array.from(element.querySelectorAll('img')).filter((image) => getComputedStyle(image).display !== 'none').length,
    visibleSvgs: Array.from(element.querySelectorAll('svg')).filter((svg) => getComputedStyle(svg).display !== 'none').length,
  }));
  expect(renderedMap).toEqual({ backgroundImage: 'none', visibleImages: 0, visibleSvgs: 0 });

  const target: LandmarkId = 'start-museum';
  const fact = landmarkFacts[target];
  await page.locator(`[data-fallback-id="${target}"]`).click();
  await waitForLandmarkSettled(page, target);
  await expect(page.locator(`[data-fallback-id="${target}"]`)).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('#card-name')).toHaveText(fact.name);
  await expect(page.locator('#card-address')).toHaveText(fact.address);
  await expect(page.locator('#card-coordinates')).toHaveText(fact.coordinates);
  await page.locator('#save-meeting-card').click();
  await page.waitForFunction(({ key, id }) => (
    window.localStorage.getItem(key) === id
      && window.__westBundMeetingPoints?.snapshot().savedId === id
  ), { key: storageKey, id: target });
  const current = await snap(page);
  expect(current).toMatchObject({
    activeLandmark: target,
    activeName: fact.name,
    activeAddress: fact.address,
    coordinates: fact.coordinates,
    savedId: target,
    imageLoaded: false,
    fallback: true,
  });
  await expect(page.locator('#save-status')).toContainText(`已在本浏览器保存：${fact.name}集合点卡`);
  item.honestFallback = {
    landmarkCount: await page.locator('[data-fallback-id]').count(),
    attribution: await page.locator('figcaption a').innerText(),
    renderedMap,
  };
  item.state = current;
  item.storage = { key: storageKey, value: await page.evaluate((key) => window.localStorage.getItem(key), storageKey) };
  item.document = await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});
