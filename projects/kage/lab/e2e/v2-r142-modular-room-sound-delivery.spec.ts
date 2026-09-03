import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type AssemblyMode = 'horizontal' | 'split' | 'wall';
type AudioState = 'idle' | 'playing' | 'stopped' | 'unavailable';
type PositionTuple = [number, number, number];

type ModularRoomSoundSnapshot = {
  ready: boolean;
  mode: AssemblyMode;
  progress: number;
  cutaway: boolean;
  playing: boolean;
  audioState: AudioState;
  saved: boolean;
  booked: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  quality: 'high' | 'balanced' | 'low';
  revision: string;
  frames: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
  camera: { position: PositionTuple; target: PositionTuple; distance: number };
  partPositions: Record<string, PositionTuple>;
  coverOffset: number;
  hooksVisible: boolean;
  routeVisible: boolean;
  canvasVisualHash: string;
  horizontalOverflow: boolean;
};

declare global {
  interface Window {
    __MODULAR_ROOM_SOUND__: {
      snapshot(): ModularRoomSoundSnapshot;
      goto(mode: AssemblyMode): ModularRoomSoundSnapshot;
      toggleCutaway(): ModularRoomSoundSnapshot;
      playPreview(): Promise<ModularRoomSoundSnapshot>;
      saveAndBook(): ModularRoomSoundSnapshot;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/modular-room-sound/';
const revision = 'r142-proof';
const runId = 'direct-r142-modular-room-sound';
const storageKey = 'r142-modular-room-sound';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'modular-room-sound');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r142-modular-room-sound');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md', 'asset-manifest.json'] as const;
const checkpointOrder = [
  'desktop-opening',
  'desktop-assembly-causality',
  'desktop-cutaway-audio-complete',
  'mobile-low-reduced',
  'webgl-fallback-complete',
  'audio-fallback-complete',
] as const;
const captures = [
  '01-desktop-opening.png',
  '02-desktop-assembly-causality.png',
  '03-desktop-cutaway-audio-complete.png',
  '04-mobile-low-reduced.png',
  '05-webgl-fallback-complete.png',
  '06-audio-fallback-complete.png',
] as const;

type Checkpoint = typeof checkpointOrder[number];
type Observation = {
  checkpoint: Checkpoint;
  viewport: { width: number; height: number };
  issues: Issues;
  [key: string]: unknown;
};

const observations: Observation[] = [];
const partNames = [
  'productRoot',
  'leftModule',
  'rightModule',
  'bridge',
  'drivers',
  'bassChamber',
  'leftContact',
  'rightContact',
  'contacts',
  'leftHook',
  'rightHook',
  'wallHooks',
  'frontCover',
  'soundRoute',
] as const;
const expectedModuleDistance: Record<AssemblyMode, number> = {
  horizontal: 1.92,
  split: 3.574,
  wall: 2.46,
};
const expectedModuleY: Record<AssemblyMode, readonly [number, number]> = {
  horizontal: [0.12, 0.12],
  split: [0.18, 0.28],
  wall: [0.78, 1.02],
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
    && observations.every(({ checkpoint }, index) => checkpoint === checkpointOrder[index])
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0))
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r142-modular-room-sound-runtime-observations',
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
  const target = complete ? 'report.json' : 'report.failed.json';
  const opposite = complete ? 'report.failed.json' : 'report.json';
  await rm(resolve(evidenceDir, opposite), { force: true });
  await writeFile(resolve(evidenceDir, target), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
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

function observe(page: Page, checkpoint: Checkpoint, issues: Issues): Observation {
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

async function clearPersistedState(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.removeItem(key), storageKey);
}

async function ready(page: Page, expectFallback = false): Promise<void> {
  await page.waitForFunction((fallbackExpected) => {
    const api = window.__MODULAR_ROOM_SOUND__;
    if (!api) return false;
    const state = api.snapshot();
    if (!state.ready || state.fallback !== fallbackExpected) return false;
    if (fallbackExpected) return state.frames === 0 && state.drawCalls === 0 && state.triangles === 0;
    return state.frames > 2 && state.drawCalls > 0 && state.triangles > 0;
  }, expectFallback, { timeout: 15_000 });
}

async function snap(page: Page): Promise<ModularRoomSoundSnapshot> {
  return page.evaluate(() => window.__MODULAR_ROOM_SOUND__.snapshot());
}

function distance(a: PositionTuple, b: PositionTuple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

async function expectMode(page: Page, mode: AssemblyMode): Promise<ModularRoomSoundSnapshot> {
  await page.waitForFunction(({ expectedMode, expectedDistance, expectedY }) => {
    const api = window.__MODULAR_ROOM_SOUND__;
    if (!api) return false;
    const state = api.snapshot();
    const left = state.partPositions.leftModule;
    const right = state.partPositions.rightModule;
    const moduleDistance = Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
    const active = document.querySelector(`[data-mode="${expectedMode}"][aria-pressed="true"]`);
    return state.mode === expectedMode
      && document.body.dataset.mode === expectedMode
      && Boolean(active)
      && Math.abs(moduleDistance - expectedDistance) < 0.075
      && Math.abs(left[1] - expectedY[0]) < 0.075
      && Math.abs(right[1] - expectedY[1]) < 0.075;
  }, {
    expectedMode: mode,
    expectedDistance: expectedModuleDistance[mode],
    expectedY: expectedModuleY[mode],
  }, { timeout: 10_000 });
  return snap(page);
}

async function canvasHash(page: Page): Promise<string> {
  return createHash('sha256').update(await page.locator('#scene-canvas').screenshot()).digest('hex');
}

async function exposedCanvasPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas');
    if (!canvas) throw new Error('Missing scene canvas.');
    for (let y = 132; y < innerHeight - 72; y += 44) {
      for (let x = 36; x < innerWidth - 36; x += 44) {
        if (document.elementFromPoint(x, y) === canvas) return { x, y };
      }
    }
    throw new Error('No exposed canvas point for real OrbitControls input.');
  });
}

test('desktop opening exposes the generated WebGL assembly and exact public snapshot surface', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearPersistedState(page);
  const issues = monitor(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  await Promise.all([
    expect(page.locator('#page-title')).toBeVisible({ timeout: 5_000 }),
    expect(page.locator('button[data-mode="horizontal"]')).toBeVisible({ timeout: 5_000 }),
  ]);
  const heroVisibleAtMs = Date.now() - startedAt;
  await ready(page);
  const item = observe(page, 'desktop-opening', issues);
  const state = await expectMode(page, 'horizontal');
  item.heroVisibleAtMs = heroVisibleAtMs;
  item.readyAtMs = Date.now() - startedAt;
  item.state = state;
  item.partNames = Object.keys(state.partPositions).sort();

  expect(heroVisibleAtMs).toBeLessThanOrEqual(5_000);
  expect(item.readyAtMs).toBeLessThanOrEqual(15_000);
  expect(state).toMatchObject({
    ready: true,
    mode: 'horizontal',
    cutaway: false,
    playing: false,
    audioState: 'idle',
    saved: false,
    booked: false,
    fallback: false,
    reducedMotion: false,
    quality: 'high',
    revision,
    hooksVisible: false,
    routeVisible: false,
    horizontalOverflow: false,
  });
  expect(state.frames).toBeGreaterThan(2);
  expect(state.drawCalls).toBeGreaterThan(0);
  expect(state.triangles).toBeGreaterThan(1_000);
  expect(state.pixelRatio).toBeGreaterThan(0);
  expect(state.pixelRatio).toBeLessThanOrEqual(1.9);
  expect(Object.keys(state.partPositions).sort()).toEqual([...partNames].sort());
  expect(state.canvasVisualHash).toMatch(/^[0-9a-f]{8}$/);
  await expect(page.locator('#scene-canvas')).toBeVisible();
  await expect(page.locator('#scene-fallback')).toBeHidden();
  await expect(page.locator('.opening-note')).toContainText('概念设计演示');
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('real buttons, keyboard, native scroll, drag and wheel prove one causal assembly tree', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearPersistedState(page);
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  await ready(page);
  const item = observe(page, 'desktop-assembly-causality', issues);
  const horizontal = await expectMode(page, 'horizontal');

  await page.locator('button[data-mode="split"]').click();
  const split = await expectMode(page, 'split');
  await page.keyboard.press('3');
  const wall = await expectMode(page, 'wall');

  const point = await exposedCanvasPoint(page);
  const beforeOrbitImage = await canvasHash(page);
  const beforeOrbit = await snap(page);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 170, point.y - 86, { steps: 18 });
  await page.mouse.up();
  await page.waitForTimeout(220);
  const afterOrbitImage = await canvasHash(page);
  const afterOrbit = await snap(page);

  const beforeWheelImage = afterOrbitImage;
  const beforeWheel = afterOrbit;
  await page.mouse.move(point.x, point.y);
  await page.mouse.wheel(0, -720);
  await page.waitForTimeout(220);
  const afterWheelImage = await canvasHash(page);
  const afterWheel = await snap(page);

  const wallCard = page.locator('#wall .chapter-copy');
  const wallBox = await wallCard.boundingBox();
  expect(wallBox).not.toBeNull();
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.move(wallBox!.x + 30, Math.min(850, wallBox!.y + 50));
  await page.mouse.wheel(0, 850);
  await page.waitForFunction((before) => scrollY > before + 80, scrollBefore);
  const scrollAfter = await page.evaluate(() => scrollY);

  expect(distance(horizontal.partPositions.leftModule, horizontal.partPositions.rightModule)).toBeCloseTo(1.92, 1);
  expect(distance(split.partPositions.leftModule, split.partPositions.rightModule)).toBeGreaterThan(3.45);
  expect(wall.partPositions.leftModule[1]).toBeGreaterThan(split.partPositions.leftModule[1] + 0.45);
  expect(wall.partPositions.rightModule[1]).toBeGreaterThan(split.partPositions.rightModule[1] + 0.55);
  expect(wall.hooksVisible).toBe(true);
  expect(Object.keys(horizontal.partPositions)).toEqual(Object.keys(split.partPositions));
  expect(Object.keys(split.partPositions)).toEqual(Object.keys(wall.partPositions));
  expect(new Set([horizontal.canvasVisualHash, split.canvasVisualHash, wall.canvasVisualHash]).size).toBe(3);
  expect(beforeOrbitImage).not.toBe(afterOrbitImage);
  expect(beforeOrbit.camera.position).not.toEqual(afterOrbit.camera.position);
  expect(beforeWheelImage).not.toBe(afterWheelImage);
  expect(beforeWheel.camera.distance).not.toBe(afterWheel.camera.distance);
  expect(scrollAfter).toBeGreaterThan(scrollBefore);

  item.assemblies = { horizontal, split, wall };
  item.orbit = {
    input: 'mouse-drag',
    canvasHashes: { before: beforeOrbitImage, after: afterOrbitImage },
    camera: { before: beforeOrbit.camera, after: afterOrbit.camera },
  };
  item.zoom = {
    input: 'mouse-wheel',
    canvasHashes: { before: beforeWheelImage, after: afterWheelImage },
    camera: { before: beforeWheel.camera, after: afterWheel.camera },
  };
  item.nativeScroll = { input: 'mouse-wheel-over-chapter', before: scrollBefore, after: scrollAfter };
  await page.keyboard.press('3');
  await page.locator('#wall .chapter-copy').scrollIntoViewIfNeeded();
  await expectMode(page, 'wall');
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('cutaway, user-gesture audio, save and booking complete the desktop concept flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearPersistedState(page);
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  await ready(page);
  const item = observe(page, 'desktop-cutaway-audio-complete', issues);
  const beforeAudio = await snap(page);

  await page.locator('button[data-cutaway]').click();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__.snapshot();
    return state.cutaway && state.coverOffset > 2 && state.routeVisible && state.hooksVisible;
  });
  const cutaway = await snap(page);
  await page.locator('#listen').scrollIntoViewIfNeeded();
  const listenMode = await expectMode(page, 'split');
  await page.locator('[data-listen]').click();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().audioState === 'playing');
  const audioStarted = await snap(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  await page.locator('[data-save]').click();
  await page.locator('[data-book]').click();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__.snapshot();
    return state.saved && state.booked;
  });
  const completed = await snap(page);

  expect(beforeAudio).toMatchObject({ audioState: 'idle', playing: false, cutaway: false });
  expect(cutaway.cutaway).toBe(true);
  expect(cutaway.coverOffset).toBeGreaterThan(2);
  expect(cutaway.routeVisible).toBe(true);
  expect(cutaway.hooksVisible).toBe(true);
  expect(audioStarted).toMatchObject({ audioState: 'playing', playing: true, routeVisible: true });
  expect(completed).toMatchObject({ saved: true, booked: true, fallback: false });
  await expect(page.locator('[data-save-status]')).toContainText('已保存');
  await expect(page.locator('[data-book-status]')).toContainText('预约意向');
  item.beforeAudio = beforeAudio;
  item.cutaway = cutaway;
  item.listenMode = listenMode;
  item.audioStarted = audioStarted;
  item.completed = completed;
  item.storage = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expectClean(issues);
});

test('390x844 low-quality reduced-motion mode keeps touch assembly, cutaway and CTA complete', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await clearPersistedState(page);
  const issues = monitor(page);
  await page.goto(`${route}?quality=low&motion=reduce&revision=${revision}`, { waitUntil: 'commit' });
  await ready(page);
  const item = observe(page, 'mobile-low-reduced', issues);

  await page.locator('button[data-mode="split"]').tap();
  const split = await expectMode(page, 'split');
  await page.locator('button[data-mode="wall"]').tap();
  const wall = await expectMode(page, 'wall');
  await page.locator('button[data-cutaway]').tap();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().cutaway);
  await page.locator('[data-save]').tap();
  await page.locator('[data-book]').tap();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__.snapshot();
    return state.saved && state.booked;
  });
  const state = await snap(page);
  const boxes = await page.locator('button[data-mode], button[data-cutaway], button[data-listen], button[data-save], button[data-book]')
    .evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width, height: box.height };
    }));

  expect(split).toMatchObject({ mode: 'split', reducedMotion: true, quality: 'low', fallback: false });
  expect(wall).toMatchObject({ mode: 'wall', hooksVisible: true, reducedMotion: true, quality: 'low' });
  expect(state).toMatchObject({
    ready: true,
    cutaway: true,
    saved: true,
    booked: true,
    reducedMotion: true,
    quality: 'low',
    fallback: false,
    horizontalOverflow: false,
  });
  expect(state.pixelRatio).toBeGreaterThan(0);
  expect(state.pixelRatio).toBeLessThanOrEqual(1);
  expect(boxes.every((box) => box.left >= -1 && box.right <= 391 && box.width >= 44 && box.height >= 44)).toBe(true);
  item.inputs = { split, wall };
  item.state = state;
  item.controlBoxes = boxes;
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
  await context.close();
});

test('forced WebGL fallback preserves assembly, cutaway, audio and both primary actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearPersistedState(page);
  const issues = monitor(page);
  await page.goto(`${route}?quality=low&motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page, true);
  const item = observe(page, 'webgl-fallback-complete', issues);

  await expect(page.locator('#scene-canvas')).toBeHidden();
  await expect(page.locator('#scene-fallback')).toBeVisible();
  await page.locator('button[data-mode="split"]').click();
  const split = await expectMode(page, 'split');
  await page.keyboard.press('3');
  const wall = await expectMode(page, 'wall');
  await page.locator('button[data-cutaway]').click();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().cutaway);
  const cutaway = await snap(page);
  await page.locator('#listen').scrollIntoViewIfNeeded();
  const listenMode = await expectMode(page, 'split');
  await page.locator('[data-listen]').click();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().audioState === 'playing');
  const audioStarted = await snap(page);
  await page.locator('[data-save]').click();
  await page.locator('[data-book]').click();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__.snapshot();
    return state.saved && state.booked;
  });
  const completed = await snap(page);

  expect(split).toMatchObject({ mode: 'split', fallback: true, frames: 0, drawCalls: 0, triangles: 0, pixelRatio: 0 });
  expect(wall).toMatchObject({ mode: 'wall', fallback: true, hooksVisible: true });
  expect(cutaway).toMatchObject({ cutaway: true, fallback: true, routeVisible: true, hooksVisible: true });
  expect(audioStarted).toMatchObject({ audioState: 'playing', playing: true, fallback: true });
  expect(completed).toMatchObject({ saved: true, booked: true, fallback: true, frames: 0, drawCalls: 0, triangles: 0, pixelRatio: 0 });
  item.inputs = { split, wall, listenMode };
  item.cutaway = cutaway;
  item.audioStarted = audioStarted;
  item.completed = completed;
  await page.locator('#inside .chapter-copy').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().cutaway);
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});

test('forced audio fallback stays independent from live WebGL and the complete semantic flow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await clearPersistedState(page);
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&audioFallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const item = observe(page, 'audio-fallback-complete', issues);
  const beforeInput = await snap(page);

  await page.locator('[data-listen]').click();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().audioState === 'unavailable');
  const unavailable = await snap(page);
  await page.locator('button[data-mode="split"]').click();
  const split = await expectMode(page, 'split');
  await page.keyboard.press('c');
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().cutaway);
  const cutaway = await snap(page);
  await page.locator('[data-save]').click();
  await page.locator('[data-book]').click();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__.snapshot();
    return state.saved && state.booked;
  });
  const completed = await snap(page);

  expect(beforeInput).toMatchObject({ fallback: false, audioState: 'unavailable', playing: false });
  expect(beforeInput.frames).toBeGreaterThan(2);
  expect(beforeInput.drawCalls).toBeGreaterThan(0);
  expect(beforeInput.triangles).toBeGreaterThan(1_000);
  expect(unavailable).toMatchObject({ fallback: false, audioState: 'unavailable', playing: false });
  expect(split).toMatchObject({ mode: 'split', fallback: false, audioState: 'unavailable' });
  expect(cutaway).toMatchObject({ cutaway: true, routeVisible: true, fallback: false, audioState: 'unavailable' });
  expect(completed).toMatchObject({ saved: true, booked: true, fallback: false, audioState: 'unavailable' });
  item.beforeInput = beforeInput;
  item.unavailable = unavailable;
  item.inputs = { split, cutaway };
  item.completed = completed;
  await page.locator('#listen .chapter-copy').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.__MODULAR_ROOM_SOUND__.snapshot().audioState === 'unavailable');
  await page.screenshot({ path: resolve(evidenceDir, captures[5]), fullPage: false });
  expectClean(issues);
});
