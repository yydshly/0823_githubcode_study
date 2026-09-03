import { expect, test, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type CallsignSnapshot = {
  ready: boolean;
  phase: 'waiting' | 'sounding' | 'decoding' | 'checked' | 'saved';
  audioState: 'locked' | 'ready' | 'playing' | 'muted' | 'unavailable';
  audioContextState: AudioContextState | 'not-created' | 'unavailable';
  audioFallback: boolean;
  playingScope: 'all' | number | null;
  revealedCount: number;
  checkStatus: 'idle' | 'incorrect' | 'correct';
  saved: boolean;
  restored: boolean;
  muted: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  canonicalSequenceId: string;
  expectedDurationMs: number;
  scheduledToneCount: number;
  completedPlaybackCount: number;
  revision: string;
};

declare global {
  interface Window {
    __callsignDecoder?: {
      snapshot: () => CallsignSnapshot;
      setAnswer: (value: string) => CallsignSnapshot;
      submit: () => CallsignSnapshot;
      save: () => CallsignSnapshot;
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
  readyAtMs?: number;
  state?: CallsignSnapshot;
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/ten-second-callsign-decode/';
const revision = 'r139-proof';
const runId = 'direct-r139-ten-second-callsign-decode';
const storageKey = 'kage-v2-r139-callsign-card-v1';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'ten-second-callsign-decode');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r139-ten-second-callsign-decode');
const observations: Observation[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-decoding.png',
  '03-desktop-saved.png',
  '04-mobile-reduced-saved.png',
  '05-audio-fallback-saved.png'
] as const;
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md'] as const;

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
    rm(resolve(evidenceDir, 'report.failed.json'), { force: true })
  ]);
});

test.afterAll(async () => {
  const existing = (await Promise.all(captures.map(async (file) => {
    try { await access(resolve(evidenceDir, file)); return file; } catch { return null; }
  }))).filter((file): file is typeof captures[number] => Boolean(file));
  const complete = observations.length === 5
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0))
    && existing.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r139-ten-second-callsign-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    bundleFiles,
    captures: existing,
    observations
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
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
    document.documentElement.dataset.callsignReady === 'true'
      && window.__callsignDecoder?.snapshot().ready === true
  ));
}

async function snap(page: Page): Promise<CallsignSnapshot> {
  return page.evaluate(() => window.__callsignDecoder!.snapshot());
}

function observe(page: Page, checkpoint: string, issues: Issues): Observation {
  const item: Observation = { checkpoint, viewport: page.viewportSize() ?? { width: 0, height: 0 }, issues };
  observations.push(item);
  return item;
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

async function expectInsideViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual((await locator.page().evaluate(() => innerWidth)) + 1);
}

async function playCompleteSequence(
  page: Page,
  evidence?: Record<string, unknown>
): Promise<CallsignSnapshot> {
  await page.locator('#play-all').click();
  await page.waitForFunction(() => {
    const current = window.__callsignDecoder?.snapshot();
    return current?.phase === 'sounding'
      && current.playingScope === 'all'
      && current.currentLetter >= 0
      && current.currentElement >= 0;
  });
  if (evidence) {
    evidence.soundingState = await snap(page);
    evidence.soundingSegments = await page.locator('[data-segment-state="sounding"]').count();
  }
  await page.waitForFunction(() => {
    const current = window.__callsignDecoder?.snapshot();
    return current?.phase === 'decoding' && current.revealedCount === 4 && current.completedPlaybackCount >= 1;
  }, null, { timeout: 14_000 });
  return snap(page);
}

async function decodeAndSave(page: Page): Promise<CallsignSnapshot> {
  await page.locator('#decode-input').fill('KAGE');
  await page.locator('#submit-decode').click();
  await expect(page.locator('#completion-card')).toBeVisible();
  await page.locator('#save-card').click();
  return snap(page);
}

test('opening is a bright, theme-specific typographic sonic field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const started = Date.now();
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-opening', issues);
  await ready(page);
  item.readyAtMs = Date.now() - started;
  item.state = await snap(page);
  item.semantic = {
    segments: await page.locator('[data-segment-index]').count(),
    images: await page.locator('img').count(),
    canvases: await page.locator('canvas').count(),
    answerTextInitiallyPresent: (await page.locator('body').innerText()).includes('KAGE')
  };
  expect(item.readyAtMs).toBeLessThan(4_000);
  expect(item.state).toMatchObject({
    ready: true,
    phase: 'waiting',
    audioState: 'locked',
    revealedCount: 0,
    checkStatus: 'idle',
    canonicalSequenceId: 'demo-kage-v1',
    expectedDurationMs: 10_000,
    horizontalOverflow: false
  });
  expect(item.semantic).toEqual({ segments: 4, images: 0, canvases: 0, answerTextInitiallyPresent: false });
  await expect(page.locator('#signal-strip')).toBeVisible();
  await expect(page.locator('#play-all')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('real user playback schedules nine tones and reveals the four letters from one sequence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-audio-decoding', issues);
  await ready(page);
  item.semantic = {};
  item.state = await playCompleteSequence(page, item.semantic);
  expect(item.state).toMatchObject({
    phase: 'decoding',
    revealedCount: 4,
    scheduledToneCount: 9,
    completedPlaybackCount: 1,
    audioFallback: false
  });
  expect(item.state!.audioContextState).toBe('running');
  await page.locator('#decode-input').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('wrong answer stays honest, correct answer saves and reload restores the final card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-checked-saved', issues);
  await ready(page);
  await playCompleteSequence(page);
  await page.locator('#decode-input').fill('KAGX');
  await page.locator('#submit-decode').click();
  const incorrectState = await snap(page);
  expect(incorrectState.checkStatus).toBe('incorrect');
  await expect(page.locator('#completion-card')).toBeHidden();
  item.semantic = {
    incorrectState,
    completionVisibleAfterIncorrect: await page.locator('#completion-card').isVisible()
  };
  item.state = await decodeAndSave(page);
  expect(item.state).toMatchObject({ phase: 'saved', checkStatus: 'correct', saved: true });
  item.semantic.storageBeforeReload = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  item.state = await snap(page);
  item.semantic.storageAfterReload = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(item.state).toMatchObject({ phase: 'saved', checkStatus: 'correct', saved: true, restored: true });
  await page.locator('#completion-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390px reduced-motion completes the same listen, decode and save journey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'mobile-reduced-saved', issues);
  await ready(page);
  await playCompleteSequence(page);
  item.state = await decodeAndSave(page);
  expect(item.state).toMatchObject({ phase: 'saved', saved: true, reducedMotion: true, horizontalOverflow: false });
  await page.locator('#completion-card').scrollIntoViewIfNeeded();
  await expectInsideViewport(page.locator('#save-card'));
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
});

test('forced audio fallback keeps the canonical visual timing and complete task', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?motion=reduce&fallback=audio&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'audio-fallback-saved', issues);
  await ready(page);
  await playCompleteSequence(page);
  item.state = await decodeAndSave(page);
  expect(item.state).toMatchObject({
    phase: 'saved',
    saved: true,
    audioState: 'unavailable',
    audioContextState: 'unavailable',
    audioFallback: true,
    scheduledToneCount: 0,
    revealedCount: 4,
    horizontalOverflow: false
  });
  await expect(page.locator('[data-audio-status]')).toContainText('暂时无法发声');
  await page.locator('#completion-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });
  expectClean(issues);
});
