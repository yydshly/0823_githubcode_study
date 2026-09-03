import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type SoundId = 'leaf' | 'hollow' | 'creek' | 'insect';

type ForestSoundSnapshot = {
  ready: boolean;
  phase: 'discover' | 'listening' | 'route-ready' | 'saved';
  activeSound: SoundId | null;
  collected: SoundId[];
  audioState: 'idle' | 'loading' | 'playing' | 'paused' | 'muted' | 'unavailable';
  audioSource: string | null;
  muted: boolean;
  volume: number;
  routeReady: boolean;
  saved: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  assetCount: number;
  visualRevision: string;
};

type SoundObservation = ForestSoundSnapshot & {
  routePath: string;
  hotspotPressed: boolean;
};

declare global {
  interface Window {
    __forestSoundRoute?: {
      snapshot: () => ForestSoundSnapshot;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/forest-sound-route/';
const revision = 'r131-proof';
const runId = 'direct-r131-forest-sound-route';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r131-forest-sound-route');
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'forest-sound-route');
const observations: Record<string, unknown>[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-first-sound.png',
  '03-desktop-route-saved.png',
  '04-mobile-reduced.png',
  '05-audio-unavailable.png',
];

test.describe.configure({ mode: 'serial', timeout: 40_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of [
    'index.html',
    'style.css',
    'main.ts',
    'assets/leaf-canopy.wav',
    'assets/tree-hollow.wav',
    'assets/creek-stone.wav',
    'assets/meadow-insect.wav',
  ]) {
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
  const complete = observations.length === 4
    && observations.every((observation) => JSON.stringify(observation.issues) === cleanIssues)
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r131-forest-sound-route-runtime-observations',
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
  await page.waitForFunction(() => document.body.dataset.experience === 'forest-sound-route'
    && window.__forestSoundRoute?.snapshot().ready === true);
}

async function snapshot(page: Page): Promise<ForestSoundSnapshot> {
  return page.evaluate(() => window.__forestSoundRoute!.snapshot());
}

async function expectNoOverflow(page: Page): Promise<void> {
  expect((await snapshot(page)).horizontalOverflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function activateSound(page: Page, id: SoundId): Promise<SoundObservation> {
  await page.locator(`[data-sound-id="${id}"]`).click();
  await page.waitForFunction((soundId) => {
    const current = window.__forestSoundRoute?.snapshot();
    return current?.activeSound === soundId && current.audioState === 'playing';
  }, id);
  const current = await snapshot(page);
  expect(current.audioSource).toContain('.wav');
  const routePath = await page.locator('#route-path').getAttribute('d') ?? '';
  const hotspotPressed = await page.locator(`[data-sound-id="${id}"]`).getAttribute('aria-pressed') === 'true';
  expect(hotspotPressed).toBe(true);
  return { ...current, routePath, hotspotPressed };
}

test('opening is a bright, immediately explorable forest field with four persistent sound sources', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const current = await snapshot(page);
  expect(Date.now() - startedAt).toBeLessThanOrEqual(8_000);
  expect(current).toMatchObject({
    ready: true,
    phase: 'discover',
    activeSound: null,
    collected: [],
    audioState: 'idle',
    routeReady: false,
    saved: false,
    reducedMotion: false,
    horizontalOverflow: false,
    assetCount: 4,
    visualRevision: revision,
  });
  await expect(page.locator('[data-sound-id]')).toHaveCount(4);
  await expect(page.locator('body[data-audio-state]')).toHaveAttribute('data-audio-state', 'idle');
  await expect(page.locator('body[data-route-ready]')).toHaveAttribute('data-route-ready', 'false');
  await expect(page.locator('[data-signal-primary-action]')).toBeDisabled();
  await expect(page.locator('.workbench-panel, .control-panel')).toHaveCount(0);
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  observations.push({ checkpoint: 'desktop-opening', readyAtMs: Date.now() - startedAt, issues, state: current });
  expectClean(issues);
});

test('three distinct sources produce audible and visible causal feedback, form one route and save', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const leaf = await activateSound(page, 'leaf');
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-first-sound.png') });
  const hollow = await activateSound(page, 'hollow');
  const creek = await activateSound(page, 'creek');
  const samples = [leaf, hollow, creek];
  expect(new Set(samples.map((item) => item.audioSource)).size).toBe(3);
  expect(new Set(samples.map((item) => `${item.activeSound}:${item.routePath}`)).size).toBe(3);
  expect(creek).toMatchObject({
    phase: 'route-ready',
    activeSound: 'creek',
    collected: ['leaf', 'hollow', 'creek'],
    routeReady: true,
    saved: false,
  });
  expect(creek.routePath.length).toBeGreaterThan(40);
  await expect(page.locator('body[data-route-ready]')).toHaveAttribute('data-route-ready', 'true');
  await expect(page.locator('[data-signal-primary-action]')).toBeEnabled();
  await page.locator('[data-signal-primary-action]').click();
  await page.waitForFunction(() => window.__forestSoundRoute?.snapshot().saved === true);
  const routePath = await page.locator('#route-path').getAttribute('d') ?? '';
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ phase: 'saved', routeReady: true, saved: true });
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-route-saved.png') });
  observations.push({
    checkpoint: 'desktop-interaction-audio',
    issues,
    samples,
    state: { ...saved, routePath },
    comparison: {
      distinctAudioSources: new Set(samples.map((item) => item.audioSource)).size === 3,
      distinctVisualStates: new Set(samples.map((item) => `${item.activeSound}:${item.routePath}`)).size === 3,
      audioActuallyPlaying: samples.every((item) => item.audioState === 'playing' && Boolean(item.audioSource)),
    },
  });
  expectClean(issues);
});

test('390px reduced-motion touch journey keeps listening, route formation and save reachable', async ({ browser }) => {
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
  for (const id of ['insect', 'leaf', 'creek'] as const) {
    await page.locator(`[data-sound-id="${id}"]`).tap();
    await page.waitForFunction((soundId) => {
      const current = window.__forestSoundRoute?.snapshot();
      return current?.activeSound === soundId && current.audioState === 'playing';
    }, id);
  }
  await page.waitForFunction(() => window.__forestSoundRoute?.snapshot().routeReady === true);
  await page.locator('[data-signal-primary-action]').tap();
  await page.waitForFunction(() => window.__forestSoundRoute?.snapshot().saved === true);
  const current = await snapshot(page);
  expect(current).toMatchObject({
    phase: 'saved',
    activeSound: 'creek',
    collected: ['insect', 'leaf', 'creek'],
    routeReady: true,
    saved: true,
    reducedMotion: true,
    horizontalOverflow: false,
  });
  expect(current.audioSource).toContain('creek-stone');
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  observations.push({ checkpoint: 'mobile-reduced', issues, state: current, viewport: { width: 390, height: 844 } });
  expectClean(issues);
  await context.close();
});

test('audio failure is explicit and non-blocking: visual collection, route and save remain usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Audio unavailable in bounded fallback probe', 'NotSupportedError')),
    });
  });
  const page = await context.newPage();
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  for (const id of ['leaf', 'hollow', 'insect'] as const) {
    await page.locator(`[data-sound-id="${id}"]`).click({ position: { x: 20, y: 20 } });
    await page.waitForFunction((soundId) => {
      const current = window.__forestSoundRoute?.snapshot();
      return current?.activeSound === soundId && current.audioState === 'unavailable';
    }, id);
  }
  await page.waitForFunction(() => window.__forestSoundRoute?.snapshot().routeReady === true);
  await expect(page.locator('body[data-audio-state]')).toHaveAttribute('data-audio-state', 'unavailable');
  await page.locator('[data-signal-primary-action]').click();
  await page.waitForFunction(() => window.__forestSoundRoute?.snapshot().saved === true);
  const routePath = await page.locator('#route-path').getAttribute('d') ?? '';
  const current = await snapshot(page);
  expect(current).toMatchObject({
    phase: 'saved',
    audioState: 'unavailable',
    routeReady: true,
    saved: true,
    reducedMotion: true,
    horizontalOverflow: false,
  });
  expect(routePath.length).toBeGreaterThan(40);
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '05-audio-unavailable.png') });
  observations.push({ checkpoint: 'audio-unavailable-fallback', issues, state: { ...current, routePath } });
  expectClean(issues);
  await context.close();
});
