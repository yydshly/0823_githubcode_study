import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type GaitId = 'survey' | 'walk' | 'run';

type FoxSnapshot = {
  activeGait: GaitId;
  clip: 'Survey' | 'Walk' | 'Run';
  modelLoaded: boolean;
  sceneReady: boolean;
  fallback: boolean;
  saved: boolean;
  reducedMotion: boolean;
  horizontalOverflow: number;
  canvasVisible: boolean;
  activeButton: GaitId | null;
  title: string;
  description: string;
  trailRhythm: string;
  status: string;
};

declare global {
  interface Window {
    __FOX_OBSERVATORY__?: {
      readonly activeGait: GaitId;
      readonly modelLoaded: boolean;
      readonly fallback: boolean;
      readonly clip: 'Survey' | 'Walk' | 'Run';
      readonly saved: boolean;
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
  checkpoint: typeof checkpointOrder[number];
  viewport: { width: number; height: number };
  issues: Issues;
  [key: string]: unknown;
};

const route = '/pages/v2/deliveries/fox-gait-observatory/';
const revision = 'r137-proof';
const runId = 'direct-r137-fox-gait-observatory';
const storageKey = 'r137-fox-gait-observation-card';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'fox-gait-observatory');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r137-fox-gait-observatory');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'asset-manifest.json',
  'MODEL-CREDITS.md',
  'CONTRACT.md',
  'assets/Fox.glb',
] as const;
const checkpointOrder = [
  'desktop-opening',
  'desktop-gait-inputs',
  'desktop-orbit-saved',
  'mobile-reduced',
  'fallback-complete',
] as const;
const captures = [
  '01-desktop-opening.png',
  '02-desktop-gait-inputs.png',
  '03-desktop-orbit-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
] as const;
const observations: Observation[] = [];

const gaitEvidence: Record<GaitId, {
  clip: FoxSnapshot['clip'];
  title: string;
  rhythm: string;
}> = {
  survey: { clip: 'Survey', title: '先让耳朵抵达。', rhythm: '短距 · 停驻' },
  walk: { clip: 'Walk', title: '让路径变得可读。', rhythm: '等距 · 交替' },
  run: { clip: 'Run', title: '把身体交给前方。', rhythm: '长距 · 伸展' },
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
    stage: 'r137-fox-gait-observatory-runtime-observations',
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

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
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

async function ready(page: Page, fallback = false): Promise<void> {
  await page.waitForFunction((expectFallback) => {
    const debug = window.__FOX_OBSERVATORY__;
    if (!debug) return false;
    if (expectFallback) {
      return document.body.dataset.fallback === 'true'
        && document.body.dataset.sceneReady === 'false'
        && debug.fallback === true;
    }
    return document.body.dataset.modelLoaded === 'true'
      && document.body.dataset.sceneReady === 'true'
      && debug.modelLoaded === true
      && debug.fallback === false;
  }, fallback, { timeout: 10_000 });
}

async function waitForHeroShell(page: Page, startedAt: number): Promise<number> {
  await Promise.all([
    expect(page.locator('.hero-copy')).toBeVisible({ timeout: 5_000 }),
    expect(page.locator('#page-title')).toBeVisible({ timeout: 5_000 }),
    expect(page.locator('#gait-controls')).toBeVisible({ timeout: 5_000 }),
  ]);
  const heroVisibleAtMs = Date.now() - startedAt;
  expect(heroVisibleAtMs).toBeLessThanOrEqual(5_000);
  return heroVisibleAtMs;
}

async function snap(page: Page): Promise<FoxSnapshot> {
  return page.evaluate(() => {
    const debug = window.__FOX_OBSERVATORY__!;
    const activeButton = document.querySelector<HTMLButtonElement>('[data-gait][aria-pressed="true"]');
    const canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas')!;
    return {
      activeGait: debug.activeGait,
      clip: debug.clip,
      modelLoaded: debug.modelLoaded,
      sceneReady: document.body.dataset.sceneReady === 'true',
      fallback: debug.fallback,
      saved: debug.saved,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvasVisible: getComputedStyle(canvas).display !== 'none' && canvas.getBoundingClientRect().width > 0,
      activeButton: (activeButton?.dataset.gait as GaitId | undefined) ?? null,
      title: document.querySelector<HTMLElement>('#gait-title')!.textContent!.trim(),
      description: document.querySelector<HTMLElement>('#gait-description')!.textContent!.trim(),
      trailRhythm: document.querySelector<HTMLElement>('#trail-rhythm')!.textContent!.trim(),
      status: document.querySelector<HTMLElement>('#scene-status')!.textContent!.trim(),
    };
  });
}

async function expectGait(page: Page, gait: GaitId): Promise<FoxSnapshot> {
  await page.waitForFunction((expected) => {
    const debug = window.__FOX_OBSERVATORY__;
    const button = document.querySelector<HTMLButtonElement>(`[data-gait="${expected}"]`);
    return debug?.activeGait === expected
      && document.body.dataset.activeGait === expected
      && debug.clip.toLowerCase() === expected
      && document.body.dataset.clipName?.toLowerCase() === expected
      && button?.getAttribute('aria-pressed') === 'true';
  }, gait);
  const state = await snap(page);
  expect(state).toMatchObject({
    activeGait: gait,
    activeButton: gait,
    clip: gaitEvidence[gait].clip,
    title: gaitEvidence[gait].title,
    trailRhythm: gaitEvidence[gait].rhythm,
  });
  expect(state.description.length).toBeGreaterThan(20);
  return state;
}

test('desktop opening loads the traceable Fox GLB as the live spatial subject', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const modelResponses: Array<{ url: string; status: number; bytes: number | null }> = [];
  page.on('response', async (response) => {
    if (!response.url().endsWith('/assets/Fox.glb')) return;
    modelResponses.push({
      url: response.url(),
      status: response.status(),
      bytes: Number(response.headers()['content-length']) || null,
    });
  });
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  const heroVisibleAtMs = await waitForHeroShell(page, startedAt);
  await ready(page);
  const item = observe(page, 'desktop-opening', issues);
  item.heroVisibleAtMs = heroVisibleAtMs;
  item.readyAtMs = Date.now() - startedAt;
  item.state = await snap(page);
  item.modelResponses = modelResponses;

  expect(item.readyAtMs).toBeLessThanOrEqual(15_000);
  expect(item.state).toMatchObject({
    activeGait: 'survey',
    clip: 'Survey',
    modelLoaded: true,
    sceneReady: true,
    fallback: false,
    saved: false,
    reducedMotion: false,
    horizontalOverflow: 0,
    canvasVisible: true,
    activeButton: 'survey',
  });
  expect(modelResponses).toHaveLength(1);
  expect(modelResponses[0]).toMatchObject({ status: 200 });
  expect(modelResponses[0].url).toContain('/fox-gait-observatory/assets/Fox.glb');
  const canvas = await page.locator('#scene-canvas').boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.width).toBe(1440);
  expect(canvas!.height).toBe(900);
  await expect(page.locator('.model-truth')).toContainText('Khronos Fox GLB');
  await expect(page.locator('.truth-boundary')).toContainText('不是野外测量数据');
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('buttons and keyboard select all three real model clips through one controller', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  const heroVisibleAtMs = await waitForHeroShell(page, startedAt);
  await ready(page);
  const item = observe(page, 'desktop-gait-inputs', issues);
  item.heroVisibleAtMs = heroVisibleAtMs;

  const survey = await expectGait(page, 'survey');
  await page.locator('[data-gait="walk"]').click();
  const walk = await expectGait(page, 'walk');
  await page.keyboard.press('3');
  const run = await expectGait(page, 'run');
  await page.keyboard.press('ArrowLeft');
  const arrowWalk = await expectGait(page, 'walk');
  await page.keyboard.press('1');
  const keyboardSurvey = await expectGait(page, 'survey');

  item.gaits = { survey, walk, run, arrowWalk, keyboardSurvey };
  item.state = await snap(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('OrbitControls changes the frozen spatial view and the saved choice persists through reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const issues = monitor(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'commit' });
  const heroVisibleAtMs = await waitForHeroShell(page, startedAt);
  await ready(page);
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  const reloadStartedAt = Date.now();
  await page.reload({ waitUntil: 'commit' });
  const reloadHeroVisibleAtMs = await waitForHeroShell(page, reloadStartedAt);
  await ready(page);
  const item = observe(page, 'desktop-orbit-saved', issues);
  item.heroVisibleAtMs = heroVisibleAtMs;
  item.reloadHeroVisibleAtMs = reloadHeroVisibleAtMs;

  const canvas = page.locator('#scene-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.locator('#reset-view').click();
  const beforeOrbit = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  await page.mouse.move(box!.x + box!.width * 0.58, box!.y + box!.height * 0.46);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.73, box!.y + box!.height * 0.39, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  const afterOrbit = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  expect(new Set([beforeOrbit, afterOrbit]).size).toBe(2);

  const beforeWheel = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  await page.mouse.move(box!.x + box!.width * 0.62, box!.y + box!.height * 0.48);
  await page.mouse.wheel(0, -850);
  await page.waitForTimeout(180);
  const afterWheel = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  expect(new Set([beforeWheel, afterWheel]).size).toBe(2);

  await page.locator('[data-gait="run"]').click();
  await expectGait(page, 'run');
  await page.locator('#save-card').click();
  await page.waitForFunction((key) => (
    localStorage.getItem(key) === 'run'
      && document.body.dataset.saved === 'true'
      && window.__FOX_OBSERVATORY__?.saved === true
  ), storageKey);
  const beforeReload = await snap(page);
  const valueBeforeReload = await page.evaluate((key) => localStorage.getItem(key), storageKey);

  await page.reload({ waitUntil: 'commit' });
  await ready(page);
  const afterReload = await expectGait(page, 'run');
  const valueAfterReload = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(beforeReload).toMatchObject({ activeGait: 'run', clip: 'Run', saved: true });
  expect(afterReload).toMatchObject({ activeGait: 'run', clip: 'Run', saved: true });
  expect(valueBeforeReload).toBe('run');
  expect(valueAfterReload).toBe('run');
  await expect(page.locator('#save-card')).toHaveAttribute('data-saved', 'true');
  await expect(page.locator('#save-card')).toContainText('已保存 · 奔跑');

  item.orbitCanvasHashes = { before: beforeOrbit, after: afterOrbit };
  item.wheelCanvasHashes = { before: beforeWheel, after: afterWheel };
  item.persistence = { storageKey, valueBeforeReload, valueAfterReload, beforeReload, afterReload };
  item.state = afterReload;
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390x844 reduced-motion mode stays fitted and keeps meaningful gait controls', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const issues = monitor(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'commit' });
  const heroVisibleAtMs = await waitForHeroShell(page, startedAt);
  await ready(page);
  const item = observe(page, 'mobile-reduced', issues);
  item.heroVisibleAtMs = heroVisibleAtMs;

  await page.locator('[data-gait="walk"]').tap();
  const walk = await expectGait(page, 'walk');
  await page.locator('[data-gait="run"]').tap();
  const run = await expectGait(page, 'run');
  const buttonBoxes = await page.locator('[data-gait]').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  const state = await snap(page);

  expect(state).toMatchObject({
    activeGait: 'run',
    clip: 'Run',
    modelLoaded: true,
    sceneReady: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: 0,
    canvasVisible: true,
  });
  expect(buttonBoxes.every(({ left, right, top, bottom }) => left >= 0 && right <= 390 && top >= 0 && bottom <= 844)).toBe(true);
  item.inputs = { walk, run };
  item.buttonBoxes = buttonBoxes;
  item.state = state;
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
  await context.close();
});

test('fallback=1 is honest, avoids the GLB and preserves semantic selection and save', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const modelRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/assets/Fox.glb')) modelRequests.push(request.url());
  });
  await page.goto(`${route}?quality=high&motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page, true);
  const item = observe(page, 'fallback-complete', issues);

  await expect(page.locator('#fallback-card')).toBeVisible();
  await expect(page.locator('#fallback-card')).toContainText('三维模型暂不可用');
  await expect(page.locator('#fallback-card')).toContainText('不代表野外测量结果');
  await expect(page.locator('#scene-canvas')).toBeHidden();
  await page.locator('[data-gait="walk"]').click();
  const walk = await expectGait(page, 'walk');
  await page.keyboard.press('3');
  const run = await expectGait(page, 'run');
  await page.locator('#save-card').click();
  await page.waitForFunction((key) => localStorage.getItem(key) === 'run' && document.body.dataset.saved === 'true', storageKey);
  const state = await snap(page);

  expect(state).toMatchObject({
    activeGait: 'run',
    clip: 'Run',
    modelLoaded: false,
    sceneReady: false,
    fallback: true,
    saved: true,
    canvasVisible: false,
    horizontalOverflow: 0,
  });
  expect(modelRequests).toEqual([]);
  item.inputs = { walk, run };
  item.modelRequests = modelRequests;
  item.state = state;
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});
