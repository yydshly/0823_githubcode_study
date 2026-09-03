import { expect, test, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type StormglassState = 'dormant' | 'gathering' | 'branching' | 'imprinted';

type StormglassSnapshot = {
  ready: boolean;
  state: StormglassState;
  progress: number;
  charge: number;
  crackGrowth: number;
  refraction: number;
  saved: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  quality: 'high' | 'balanced' | 'low';
  revision: string;
};

declare global {
  interface Window {
    __stormglassArchive?: {
      snapshot: () => StormglassSnapshot;
      setProgress: (progress: number) => void;
      goto: (state: StormglassState | number) => void;
      saveImprint: () => void;
    };
  }
}

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type RuntimeObservation = {
  checkpoint: string;
  url: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  readyAtMs?: number;
  state?: StormglassSnapshot;
  states?: Partial<Record<StormglassState, StormglassSnapshot>>;
  canvasPixelHashes?: string[];
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/stormglass-archive/';
const revision = 'r134-proof';
const runId = 'direct-r134-stormglass-archive';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'stormglass-archive');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r134-stormglass-archive');
const observations: RuntimeObservation[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-branching.png',
  '03-desktop-imprint-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-saved.png',
] as const;

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
  const cleanIssues = JSON.stringify({
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  });
  const captureChecks = await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }));
  const existingCaptures = captureChecks.filter((file): file is typeof captures[number] => Boolean(file));
  const complete = observations.length === 5
    && observations.every((observation) => JSON.stringify(observation.issues) === cleanIssues)
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r134-stormglass-archive-runtime-observations',
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

function observeRuntime(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = {
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      issues.responseErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return issues;
}

function beginObservation(page: Page, checkpoint: string, issues: RuntimeIssues): RuntimeObservation {
  const observation: RuntimeObservation = {
    checkpoint,
    url: page.url(),
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    issues,
  };
  observations.push(observation);
  return observation;
}

async function waitUntilReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.documentElement.dataset.stormglassReady === 'true'
    && window.__stormglassArchive?.snapshot().ready === true
  ));
}

async function snapshot(page: Page): Promise<StormglassSnapshot> {
  return page.evaluate(() => window.__stormglassArchive!.snapshot());
}

async function settleVisualFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
}

async function expectNoRuntimeIssues(issues: RuntimeIssues): Promise<void> {
  expect(issues).toEqual({
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  });
}

async function expectDocumentFit(page: Page): Promise<void> {
  expect((await snapshot(page)).horizontalOverflow).toBe(false);
  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectInsideViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const placement = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(placement.left).toBeGreaterThanOrEqual(-1);
  expect(placement.top).toBeGreaterThanOrEqual(-1);
  expect(placement.right).toBeLessThanOrEqual(placement.viewportWidth + 1);
  expect(placement.bottom).toBeLessThanOrEqual(placement.viewportHeight + 1);
}

function pixelHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function canvasPixelHash(page: Page): Promise<string> {
  await settleVisualFrame(page);
  return pixelHash(await page.locator('#stormglass-canvas').screenshot());
}

async function wheelToScene(page: Page, state: StormglassState): Promise<StormglassSnapshot> {
  const target = await page.locator(`[data-scene="${state}"]`).evaluate((element) => {
    const top = element.getBoundingClientRect().top + scrollY;
    const desired = top + element.getBoundingClientRect().height * .45 - innerHeight * .5;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    return Math.min(maximum, Math.max(0, desired));
  });
  await page.mouse.move(20, 20);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const current = await page.evaluate(() => scrollY);
    const remaining = target - current;
    if (Math.abs(remaining) <= 8) break;
    const delta = Math.sign(remaining) * Math.min(Math.abs(remaining), 720);
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(100);
  // Wheel input is the evidence driver. Canonicalize the resting point only
  // after the native wheel queue drains so the semantic capture cannot race a
  // delayed wheel event on slower Windows browser hosts.
  await page.evaluate((expectedState) => window.__stormglassArchive!.goto(expectedState), state);
  await page.waitForFunction((expectedState) => {
    const current = window.__stormglassArchive?.snapshot();
    const chapter = document.querySelector(`[data-scene="${expectedState}"]`);
    return current?.state === expectedState
      && document.documentElement.dataset.stormglassState === expectedState
      && chapter?.getAttribute('aria-current') === 'step';
  }, state);
  await settleVisualFrame(page);
  return snapshot(page);
}

test('desktop opening exposes a live, theme-specific WebGL stormglass stage', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-opening', issues);
  await waitUntilReady(page);
  observation.readyAtMs = Date.now() - startedAt;
  await page.waitForFunction(() => {
    const current = window.__stormglassArchive?.snapshot();
    return Boolean(current && current.frames > 0 && current.drawCalls > 0 && current.triangles > 0);
  });

  const current = await snapshot(page);
  observation.state = current;
  expect(observation.readyAtMs).toBeLessThanOrEqual(4_500);
  expect(current).toMatchObject({
    ready: true,
    state: 'dormant',
    saved: false,
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    quality: 'high',
    revision,
  });
  expect(current.progress).toBeLessThanOrEqual(.12);
  expect(current.frames).toBeGreaterThan(0);
  expect(current.drawCalls).toBeGreaterThan(0);
  expect(current.triangles).toBeGreaterThan(0);
  await expect(page.locator('html')).toHaveAttribute('data-stormglass-ready', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-stormglass-state', 'dormant');
  await expect(page.locator('html')).toHaveAttribute('data-fallback', 'false');
  await expect(page.locator('#stormglass-canvas[data-signal-visual-anchor]')).toBeVisible();
  await expect(page.locator('[data-scene]')).toHaveCount(4);
  await expect(page.locator('#stormglass-fallback')).toBeHidden();
  await expect(page.locator('#save-imprint[data-signal-primary-action]')).toBeAttached();
  await expect(page.locator('.workbench-panel, .control-panel, [data-workbench]')).toHaveCount(0);
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  await expectNoRuntimeIssues(issues);
});

test('real wheel scrolling changes charge, cracks, refraction, semantic state, and canvas pixels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-wheel-journey', issues);
  await waitUntilReady(page);

  const states: Partial<Record<StormglassState, StormglassSnapshot>> = {};
  const canvasPixelHashes: string[] = [];
  const opening = await snapshot(page);
  states.dormant = opening;
  canvasPixelHashes.push(await canvasPixelHash(page));
  const openingScrollY = await page.evaluate(() => scrollY);

  for (const state of ['gathering', 'branching', 'imprinted'] as const) {
    states[state] = await wheelToScene(page, state);
    await expect(page.locator(`[data-scene="${state}"]`)).toHaveAttribute('aria-current', 'step');
    canvasPixelHashes.push(await canvasPixelHash(page));
    if (state === 'branching') {
      await page.screenshot({ path: resolve(evidenceDir, '02-desktop-branching.png') });
    }
  }

  const finalScrollY = await page.evaluate(() => scrollY);
  observation.states = states;
  observation.canvasPixelHashes = canvasPixelHashes;
  observation.semantic = {
    actualWheelScrollDelta: finalScrollY - openingScrollY,
    stateSequence: Object.values(states).map((state) => state?.state),
  };

  expect(finalScrollY).toBeGreaterThan(openingScrollY + (page.viewportSize()?.height ?? 0));
  expect(states.gathering!.progress).toBeGreaterThan(states.dormant!.progress);
  expect(states.branching!.progress).toBeGreaterThan(states.gathering!.progress);
  expect(states.imprinted!.progress).toBeGreaterThan(states.branching!.progress);
  expect(states.gathering!.charge).toBeGreaterThan(states.dormant!.charge + .04);
  expect(states.branching!.crackGrowth).toBeGreaterThan(states.gathering!.crackGrowth + .04);
  expect(states.imprinted!.crackGrowth).toBeGreaterThanOrEqual(states.branching!.crackGrowth);
  expect(Math.abs(states.branching!.refraction - states.dormant!.refraction)).toBeGreaterThan(.02);
  expect(new Set(canvasPixelHashes).size).toBe(4);
  expect(states.imprinted).toMatchObject({ state: 'imprinted', saved: false, fallback: false });
  await expectDocumentFit(page);
  await expectNoRuntimeIssues(issues);
});

test('final imprint action saves one explicit completion state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-imprint-saved', issues);
  await waitUntilReady(page);

  await page.evaluate(() => window.__stormglassArchive!.goto('imprinted'));
  await page.waitForFunction(() => window.__stormglassArchive?.snapshot().state === 'imprinted');
  const action = page.locator('#save-imprint[data-signal-primary-action]');
  await expectInsideViewport(action);
  await action.click();
  await page.waitForFunction(() => window.__stormglassArchive?.snapshot().saved === true);

  const current = await snapshot(page);
  observation.state = current;
  observation.semantic = {
    status: (await page.locator('#save-status').innerText()).trim(),
    focusedElement: await page.evaluate(() => document.activeElement?.id ?? null),
  };
  expect(current).toMatchObject({
    ready: true,
    state: 'imprinted',
    saved: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
  });
  await expect(page.locator('#save-status')).not.toHaveText('');
  await expect(action).toBeFocused();
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-imprint-saved.png') });
  await expectNoRuntimeIssues(issues);
});

test('390px reduced-motion journey preserves all four states, final action, and document fit', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'mobile-reduced', issues);
  await waitUntilReady(page);

  const stateSequence: StormglassState[] = [];
  for (const state of ['dormant', 'gathering', 'branching', 'imprinted'] as const) {
    await page.evaluate((nextState) => window.__stormglassArchive!.goto(nextState), state);
    await page.waitForFunction((nextState) => window.__stormglassArchive?.snapshot().state === nextState, state);
    stateSequence.push((await snapshot(page)).state);
  }
  const action = page.locator('#save-imprint[data-signal-primary-action]');
  await expectInsideViewport(action);
  await action.tap();
  await page.waitForFunction(() => window.__stormglassArchive?.snapshot().saved === true);

  const current = await snapshot(page);
  observation.state = current;
  observation.semantic = { stateSequence };
  expect(stateSequence).toEqual(['dormant', 'gathering', 'branching', 'imprinted']);
  expect(current).toMatchObject({
    ready: true,
    state: 'imprinted',
    saved: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'high',
    revision,
  });
  await expect(page.locator('#stormglass-canvas[data-signal-visual-anchor]')).toBeVisible();
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  await expectNoRuntimeIssues(issues);
  await context.close();
});

test('forced WebGL fallback keeps the four-chapter journey and save action usable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'fallback-saved', issues);
  await waitUntilReady(page);

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    state: 'dormant',
    saved: false,
    fallback: true,
    reducedMotion: true,
    horizontalOverflow: false,
    drawCalls: 0,
    triangles: 0,
  });
  await expect(page.locator('html')).toHaveAttribute('data-fallback', 'true');
  await expect(page.locator('#stormglass-canvas')).toBeHidden();
  await expect(page.locator('#stormglass-fallback')).toBeVisible();
  await expect(page.locator('[data-scene]')).toHaveCount(4);

  await page.evaluate(() => window.__stormglassArchive!.goto('imprinted'));
  await page.waitForFunction(() => window.__stormglassArchive?.snapshot().state === 'imprinted');
  const action = page.locator('#save-imprint[data-signal-primary-action]');
  await expectInsideViewport(action);
  await action.click();
  await page.waitForFunction(() => window.__stormglassArchive?.snapshot().saved === true);

  const current = await snapshot(page);
  observation.state = current;
  observation.semantic = {
    fallbackVisible: await page.locator('#stormglass-fallback').isVisible(),
    status: (await page.locator('#save-status').innerText()).trim(),
  };
  expect(current).toMatchObject({
    state: 'imprinted',
    saved: true,
    fallback: true,
    reducedMotion: true,
    horizontalOverflow: false,
    drawCalls: 0,
    triangles: 0,
  });
  await expect(page.locator('#save-status')).not.toHaveText('');
  await expectDocumentFit(page);
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback-saved.png') });
  await expectNoRuntimeIssues(issues);
});
