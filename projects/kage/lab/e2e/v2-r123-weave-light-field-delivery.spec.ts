import { expect, test, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type WeavePhase = 'opening' | 'weaving' | 'complete' | 'saved';

type WeaveSnapshot = {
  ready: boolean;
  phase: WeavePhase;
  step: number;
  row: number;
  wovenRows: number;
  maxRows: number;
  completed: boolean;
  saved: boolean;
  pattern: string;
  heroProgress: number;
  openingProgress: number;
  clothProgress: number;
  shuttlePosition: number;
  heddleOffsets: [number, number, number];
  warpCount: number;
  visibleWeftCords: number;
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
    __weaveLightField?: {
      snapshot: () => WeaveSnapshot;
      advance: () => void;
      save: () => void;
      reset: () => void;
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
  openingCompletedAtMs?: number;
  visualHashBefore?: string;
  visualHashAfter?: string;
  state?: WeaveSnapshot;
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/weave-light-field/';
const revision = 'r123-proof';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r123-weave-light-field');
const observations: RuntimeObservation[] = [];

test.describe.configure({ mode: 'serial', timeout: 45_000 });

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test.afterAll(async () => {
  await writeFile(resolve(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r123-weave-light-field-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'pending-source-freeze',
    route,
    revision,
    captures: [
      '01-desktop-opening.png',
      '02-desktop-progress.png',
      '03-desktop-saved.png',
      '04-mobile-reduced.png',
      '05-fallback-saved.png',
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
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const observation: RuntimeObservation = {
    checkpoint,
    url: page.url(),
    viewport,
    issues,
  };
  observations.push(observation);
  return observation;
}

async function waitUntilReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.documentElement.dataset.weaveReady === 'true'
    && window.__weaveLightField?.snapshot().ready === true
  ));
}

async function snapshot(page: Page): Promise<WeaveSnapshot> {
  return page.evaluate(() => window.__weaveLightField!.snapshot());
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
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(placement.left).toBeGreaterThanOrEqual(-1);
  expect(placement.top).toBeGreaterThanOrEqual(-1);
  expect(placement.right).toBeLessThanOrEqual(placement.width + 1);
  expect(placement.bottom).toBeLessThanOrEqual(placement.height + 1);
}

async function expectNoRuntimeIssues(issues: RuntimeIssues): Promise<void> {
  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors).toEqual([]);
  expect(issues.requestFailures).toEqual([]);
  expect(issues.responseErrors).toEqual([]);
}

function imageHash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function advanceToCompletion(page: Page): Promise<void> {
  const control = page.locator('[data-signal-primary-control]');
  while ((await snapshot(page)).step < 6) {
    await control.click();
    const expectedStep = (await snapshot(page)).step;
    await page.waitForFunction((step) => window.__weaveLightField?.snapshot().step === step, expectedStep);
  }
  await page.waitForFunction(() => {
    const state = window.__weaveLightField?.snapshot();
    return state?.completed === true && state.clothProgress >= .99;
  });
}

test('desktop opening settles into a bright, rendered loom within the bounded hero window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  const navigationStartedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-opening', issues);
  await waitUntilReady(page);
  await page.waitForFunction(() => {
    const state = window.__weaveLightField?.snapshot();
    return state?.phase === 'weaving' && state.openingProgress >= .99;
  });
  observation.openingCompletedAtMs = Date.now() - navigationStartedAt;

  const state = await snapshot(page);
  observation.state = state;
  expect(state).toMatchObject({
    ready: true,
    phase: 'weaving',
    step: 0,
    wovenRows: 0,
    maxRows: 6,
    completed: false,
    saved: false,
    pattern: '空纱架',
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    quality: 'high',
    revision,
  });
  expect(state.openingProgress).toBeGreaterThanOrEqual(.99);
  expect(state.frames).toBeGreaterThan(0);
  expect(state.drawCalls).toBeGreaterThan(0);
  expect(state.triangles).toBeGreaterThan(0);
  expect(observation.openingCompletedAtMs).toBeLessThanOrEqual(3_500);

  await expect(page.locator('[data-signal-visual-anchor]')).toBeVisible();
  await expect(page.locator('[data-signal-primary-control]')).toBeVisible();
  await expect(page.locator('[data-signal-result]')).toContainText('空纱架');
  await expect(page.locator('[data-signal-action]')).toBeDisabled();
  await expect(page.locator('.truth-label')).toContainText(/教学演示.*非真实织机参数/);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  await expectNoRuntimeIssues(issues);
});

test('real primary click, keyboard, and canvas drag causally change the same woven field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-causal-interaction', issues);
  await waitUntilReady(page);

  const visualAnchor = page.locator('[data-signal-visual-anchor]');
  const initial = await snapshot(page);
  observation.visualHashBefore = imageHash(await visualAnchor.screenshot());

  await page.locator('[data-signal-primary-control]').click();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().step === 1);
  const afterClick = await snapshot(page);
  expect(afterClick.pattern).toBe('晨光底纬');
  expect(afterClick.visibleWeftCords).toBeGreaterThan(initial.visibleWeftCords);
  expect(afterClick.heddleOffsets).not.toEqual(initial.heddleOffsets);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().step === 2);
  const afterKeyboard = await snapshot(page);
  expect(afterKeyboard.pattern).toBe('靛蓝翼根');
  expect(afterKeyboard.visibleWeftCords).toBeGreaterThan(afterClick.visibleWeftCords);

  const canvasBox = await visualAnchor.boundingBox();
  expect(canvasBox).not.toBeNull();
  await page.mouse.move(canvasBox!.x + canvasBox!.width * .2, canvasBox!.y + canvasBox!.height * .52);
  await page.mouse.down();
  await page.mouse.move(canvasBox!.x + canvasBox!.width * .78, canvasBox!.y + canvasBox!.height * .52, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().step === 3);
  const afterDrag = await snapshot(page);
  expect(afterDrag.pattern).toBe('朱砂鸟喙');
  expect(afterDrag.visibleWeftCords).toBeGreaterThan(afterKeyboard.visibleWeftCords);

  observation.visualHashAfter = imageHash(await visualAnchor.screenshot());
  observation.state = afterDrag;
  observation.semantic = {
    click: { step: afterClick.step, pattern: afterClick.pattern },
    keyboard: { step: afterKeyboard.step, pattern: afterKeyboard.pattern },
    drag: { step: afterDrag.step, pattern: afterDrag.pattern },
  };
  expect(observation.visualHashAfter).not.toBe(observation.visualHashBefore);
  await expect(page.locator('[data-row-count]')).toHaveText('03 / 06');
  await expect(page.locator('[data-step-pips] .is-woven')).toHaveCount(3);
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-progress.png') });
  await expectNoRuntimeIssues(issues);
});

test('six real throws form the morning bird and the final action saves that same result', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'desktop-complete-and-save', issues);
  await waitUntilReady(page);
  await advanceToCompletion(page);

  expect(await snapshot(page)).toMatchObject({
    phase: 'complete',
    step: 6,
    wovenRows: 6,
    completed: true,
    saved: false,
    pattern: '晨鸟纹完整',
  });
  await expect(page.locator('[data-signal-result]')).toContainText('晨鸟纹完整');
  await expect(page.locator('[data-signal-action]')).toBeEnabled();
  await page.locator('[data-signal-action]').click();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().saved === true);

  const saved = await snapshot(page);
  observation.state = saved;
  expect(saved).toMatchObject({ phase: 'saved', completed: true, saved: true, step: 6 });
  await expect(page.locator('[data-signal-action]')).toContainText('织纹已保存');
  await expect(page.locator('[data-live-status]')).toContainText(/教学演示.*不代表真实织机参数/);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-saved.png') });
  await expectNoRuntimeIssues(issues);
});

test('390px reduced-motion preserves the complete control-result-action path without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=low&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const observation = beginObservation(page, 'mobile-reduced', issues);
  await waitUntilReady(page);

  const state = await snapshot(page);
  observation.state = state;
  expect(state).toMatchObject({
    ready: true,
    phase: 'weaving',
    step: 0,
    fallback: false,
    reducedMotion: true,
    horizontalOverflow: false,
    quality: 'low',
    revision,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expectInsideViewport(page.locator('[data-signal-primary-control]'));
  await expectInsideViewport(page.locator('[data-signal-result]'));
  await expectInsideViewport(page.locator('[data-signal-action]'));
  await page.locator('[data-signal-primary-control]').click();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().step === 1);
  await expect(page.locator('[data-row-count]')).toHaveText('01 / 06');
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });

  await advanceToCompletion(page);
  await page.locator('[data-signal-action]').click();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().saved === true);
  await expectInsideViewport(page.locator('[data-signal-action]'));
  observation.semantic = { completedAndSaved: true };
  await expectNoRuntimeIssues(issues);
  await context.close();
});

test('forced fallback retains the loom, six causal throws, and the save action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observeRuntime(page);
  await page.goto(`${route}?quality=low&motion=reduce&fallback=1&revision=${revision}`, { waitUntil: 'domcontentloaded' });
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
  await expect(page.locator('.weave-canvas')).toBeHidden();
  await expect(page.locator('.fallback-loom')).toBeVisible();
  await expect(page.locator('[data-fallback-message]')).toBeVisible();
  await expect(page.locator('[data-fallback-message]')).toContainText(/六梭纹样.*保存行动仍然完整可用/);

  const revealBefore = Number(await page.locator('[data-fallback-reveal]').getAttribute('height'));
  await advanceToCompletion(page);
  const revealAfter = Number(await page.locator('[data-fallback-reveal]').getAttribute('height'));
  expect(revealAfter).toBeGreaterThan(revealBefore);
  expect(revealAfter).toBeGreaterThan(240);
  await page.locator('[data-signal-action]').click();
  await page.waitForFunction(() => window.__weaveLightField?.snapshot().saved === true);

  const state = await snapshot(page);
  observation.state = state;
  observation.semantic = { revealBefore, revealAfter };
  expect(state).toMatchObject({ phase: 'saved', step: 6, completed: true, saved: true, fallback: true });
  await expect(page.locator('[data-step-pips] .is-woven')).toHaveCount(6);
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback-saved.png') });
  await expectNoRuntimeIssues(issues);
});
