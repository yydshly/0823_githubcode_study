import { expect, test, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type IceState = 'opening' | 'air-bubbles' | 'ash-band' | 'pollen-summer' | 'letter-ready';

type IceCoreSnapshot = {
  ready: boolean;
  state: IceState;
  activeState: IceState;
  phase: IceState;
  activeLayer: IceState;
  activeIndex: number;
  depthIndex: number;
  progress: number;
  depth: number;
  cameraDepth: number;
  coreRotation: number;
  bubbleOpacity: number;
  ashOpacity: number;
  pollenOpacity: number;
  canvasVisualHash: string;
  dialogOpen: boolean;
  sealed: boolean;
  saved: boolean;
  draftLength: number;
  fallback: boolean;
  reducedMotion: boolean;
  environmentLoaded: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  horizontalOverflow: boolean;
  quality: 'high' | 'balanced' | 'low';
  revision: string;
};

declare global {
  interface Window {
    __iceCoreLetters?: {
      snapshot: () => IceCoreSnapshot;
      goto: (state: IceState | number) => void;
      setState: (state: IceState | number) => void;
      setProgress: (progress: number) => void;
      complete: () => void;
      openLetter: () => void;
      closeLetter: () => void;
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
  state?: IceCoreSnapshot;
  states?: Partial<Record<IceState, IceCoreSnapshot>>;
  canvasVisualHashes?: string[];
  visibleScreenshotHashes?: string[];
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/ice-core-letters/';
const revision = 'r125-proof';
const finalIdentity = {
  runId: 'direct-r125-ice-core-letters',
  bundleHash: 'de2fe28ea88ca9d6c238947c634ccbe92f11793422c31f448c2c310d0a94f031',
} as const;
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r125-ice-core-letters');
const observations: RuntimeObservation[] = [];

test.describe.configure({ mode: 'serial', timeout: 45_000 });

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test.afterAll(async () => {
  await writeFile(resolve(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r125-ice-core-letters-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    ...finalIdentity,
    route,
    revision,
    captures: [
      '01-desktop-opening.png',
      '02-desktop-mid-scroll.png',
      '03-desktop-letter.png',
      '04-mobile-reduced.png',
      '05-fallback.png',
    ],
    observations,
  }, null, 2)}\n`, 'utf8');
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
    document.documentElement.dataset.iceCoreReady === 'true'
    && window.__iceCoreLetters?.snapshot().ready === true
  ));
}

async function snapshot(page: Page): Promise<IceCoreSnapshot> {
  return page.evaluate(() => window.__iceCoreLetters!.snapshot());
}

async function expectNoRuntimeIssues(issues: RuntimeIssues): Promise<void> {
  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.requestFailures).toEqual([]);
  expect(issues.responseErrors).toEqual([]);
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

function imageHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function settleVisualFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
}

test('desktop opening is ready within 3.5 seconds with a loaded environment and live Three scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  const navigationStartedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-opening', issues);
  await waitUntilReady(page);
  observation.readyAtMs = Date.now() - navigationStartedAt;

  await page.waitForFunction(() => {
    const state = window.__iceCoreLetters?.snapshot();
    return Boolean(state && state.frames > 0 && state.drawCalls > 0 && state.triangles > 0);
  });
  const state = await snapshot(page);
  observation.state = state;

  expect(observation.readyAtMs).toBeLessThanOrEqual(3_500);
  expect(state).toMatchObject({
    ready: true,
    state: 'opening',
    activeIndex: 0,
    fallback: false,
    reducedMotion: false,
    environmentLoaded: true,
    horizontalOverflow: false,
    quality: 'high',
    revision,
  });
  expect(state.frames).toBeGreaterThan(0);
  expect(state.drawCalls).toBeGreaterThan(0);
  expect(state.triangles).toBeGreaterThan(0);

  await expect(page.locator('.environment-plate')).toBeVisible();
  const environmentImage = await page.locator('.environment-plate').evaluate((image: HTMLImageElement) => ({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    currentSrc: image.currentSrc,
  }));
  expect(environmentImage.complete).toBe(true);
  expect(environmentImage.naturalWidth).toBeGreaterThan(0);
  expect(environmentImage.currentSrc).toContain('/assets/glacier-crevasse-v1.png');
  await expect(page.locator('.ice-canvas')).toBeVisible();
  await expect(page.locator('#opening-title')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  await expectNoRuntimeIssues(issues);
});

test('goto API changes semantic state, canvas hash, and the visible rendered scene', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-api-state-journey', issues);
  await waitUntilReady(page);

  const visualAnchor = page.locator('[data-signal-visual-anchor]');
  await expect(visualAnchor).toBeVisible();
  const states: Partial<Record<IceState, IceCoreSnapshot>> = {};
  const canvasVisualHashes: string[] = [];
  const visibleScreenshotHashes: string[] = [];
  for (const stateName of ['air-bubbles', 'ash-band', 'pollen-summer'] as const) {
    await page.evaluate((state) => window.__iceCoreLetters!.goto(state), stateName);
    await page.waitForFunction((state) => window.__iceCoreLetters?.snapshot().state === state, stateName);
    await settleVisualFrame(page);
    const current = await snapshot(page);
    states[stateName] = current;
    canvasVisualHashes.push(current.canvasVisualHash);
    visibleScreenshotHashes.push(imageHash(await visualAnchor.screenshot()));
    expect(current).toMatchObject({ state: stateName, activeState: stateName, activeLayer: stateName });
    await expect(page.locator(`[data-scene="${stateName}"]`)).toHaveAttribute('aria-current', 'step');
  }

  observation.states = states;
  observation.canvasVisualHashes = canvasVisualHashes;
  observation.visibleScreenshotHashes = visibleScreenshotHashes;
  expect(new Set(canvasVisualHashes).size).toBe(3);
  expect(new Set(visibleScreenshotHashes).size).toBe(3);
  expect(states['air-bubbles']!.bubbleOpacity).toBeGreaterThan(states['ash-band']!.bubbleOpacity);
  expect(states['ash-band']!.ashOpacity).toBeGreaterThan(states['pollen-summer']!.ashOpacity);
  expect(states['pollen-summer']!.pollenOpacity).toBeGreaterThan(states['ash-band']!.pollenOpacity);

  await page.evaluate(() => window.__iceCoreLetters!.goto('ash-band'));
  await settleVisualFrame(page);
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-mid-scroll.png') });
  await expectNoRuntimeIssues(issues);
});

test('complete and letter APIs preserve draft submission, sealing, saving, and focus return', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-letter', issues);
  await waitUntilReady(page);

  await page.evaluate(() => window.__iceCoreLetters!.complete());
  await page.waitForFunction(() => window.__iceCoreLetters?.snapshot().state === 'letter-ready');
  await page.evaluate(() => window.__iceCoreLetters!.openLetter());
  const dialog = page.locator('[data-letter-dialog]');
  const draft = page.locator('[data-letter-draft]');
  await expect(dialog).toBeVisible();
  await expect(draft).toBeFocused();
  await draft.fill('愿未来的人仍能听见冰层、河流与季节留下的声音。');
  await page.locator('#seal-letter').click();
  await page.waitForFunction(() => {
    const state = window.__iceCoreLetters?.snapshot();
    return state?.sealed === true && state.saved === true;
  });

  const sealed = await snapshot(page);
  observation.state = sealed;
  expect(sealed).toMatchObject({
    state: 'letter-ready',
    dialogOpen: true,
    sealed: true,
    saved: true,
  });
  expect(sealed.draftLength).toBeGreaterThan(0);
  await expect(page.locator('[data-letter-status]')).toContainText('封存');
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-letter.png') });

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('[data-open-letter]')).toBeFocused();
  observation.semantic = { closeMethod: 'Escape', focusReturnedTo: 'open-letter' };
  await expectNoRuntimeIssues(issues);
});

test('390px reduced motion has no horizontal overflow and End reaches the letter action', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=low&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'mobile-reduced', issues);
  await waitUntilReady(page);

  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  expect(await snapshot(page)).toMatchObject({
    ready: true,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'low',
    revision,
  });

  await page.keyboard.press('End');
  await page.waitForFunction(() => window.__iceCoreLetters?.snapshot().state === 'letter-ready');
  const state = await snapshot(page);
  observation.state = state;
  observation.semantic = { endKeyReached: state.state, scrollY: await page.evaluate(() => scrollY) };
  expect(state.state).toBe('letter-ready');
  expect(state.activeIndex).toBe(4);
  expect(state.horizontalOverflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expectInsideViewport(page.locator('[data-open-letter]'));
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  await expectNoRuntimeIssues(issues);
  await context.close();
});

test('forced fallback hides canvas, keeps zero render stats, and preserves the usable letter CTA', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=low&motion=reduce&forceFallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'forced-fallback', issues);
  await waitUntilReady(page);

  expect(await snapshot(page)).toMatchObject({
    ready: true,
    fallback: true,
    reducedMotion: true,
    frames: 0,
    drawCalls: 0,
    triangles: 0,
    horizontalOverflow: false,
  });
  await expect(page.locator('.ice-canvas')).toBeHidden();
  await expect(page.locator('#fallback-scene')).toBeVisible();

  await page.evaluate(() => window.__iceCoreLetters!.complete());
  await page.waitForFunction(() => window.__iceCoreLetters?.snapshot().state === 'letter-ready');
  const openLetter = page.locator('[data-open-letter]');
  await expect(openLetter).toBeVisible();
  await expect(openLetter).toBeEnabled();
  await openLetter.click();
  await page.locator('[data-letter-draft]').fill('这封信在基础冰芯视图中也能完成。');
  await page.locator('#seal-letter').click();
  await page.waitForFunction(() => window.__iceCoreLetters?.snapshot().saved === true);
  await page.keyboard.press('Escape');
  await expect(openLetter).toBeFocused();

  const state = await snapshot(page);
  observation.state = state;
  expect(state).toMatchObject({
    state: 'letter-ready',
    dialogOpen: false,
    sealed: true,
    saved: true,
    fallback: true,
    frames: 0,
    drawCalls: 0,
    triangles: 0,
  });
  await expect(page.locator('#fallback-scene')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback.png') });
  await expectNoRuntimeIssues(issues);
});
