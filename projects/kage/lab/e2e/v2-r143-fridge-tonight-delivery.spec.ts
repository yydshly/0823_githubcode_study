import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type FridgeSnapshot = {
  ready: boolean;
  revision: string;
  selected: string[];
  selectedNames: string[];
  selectionCount: number;
  eligible: boolean;
  menuId: string;
  menuTitle: string;
  missingItems: string[];
  timelineMarks: number;
  saved: boolean;
  renderer: 'dom-css-inline-svg';
  reducedMotion: boolean;
  horizontalOverflow: boolean;
};

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type Observation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  state?: FridgeSnapshot | Record<string, unknown>;
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/fridge-tonight/';
const revision = 'r143-proof';
const runId = 'direct-r143-fridge-tonight';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'fridge-tonight');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r143-fridge-tonight');
const observations: Observation[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-causal-result.png',
  '03-desktop-saved.png',
  '04-mobile-reduced-result.png',
  '05-no-js-readable.png',
] as const;
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
] as const;

test.describe.configure({ mode: 'serial', timeout: 35_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function monitor(page: Page): RuntimeIssues {
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
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

function observe(page: Page, checkpoint: string, issues: RuntimeIssues): Observation {
  const item: Observation = {
    checkpoint,
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    issues,
  };
  observations.push(item);
  return item;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.documentElement.dataset.fridgeReady === 'true'
      && typeof window.__FRIDGE_TONIGHT__?.snapshot === 'function'
  ));
}

async function snapshot(page: Page): Promise<FridgeSnapshot> {
  return page.evaluate(() => {
    const api = window.__FRIDGE_TONIGHT__;
    if (!api) throw new Error('Fridge Tonight snapshot API is unavailable.');
    return api.snapshot();
  });
}

function expectClean(issues: RuntimeIssues): void {
  expect(issues).toEqual({
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  });
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
  const existing = (await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }))).filter((file): file is typeof captures[number] => Boolean(file));
  const complete = observations.length === 5
    && existing.length === captures.length
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0));
  const report = {
    schemaVersion: 1,
    stage: 'r143-fridge-tonight-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    bundleFiles,
    captures: existing,
    observations,
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
});

test('desktop opening is a bright editorial refrigerator rather than a Three.js template', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-opening', issues);
  await ready(page);
  item.state = await snapshot(page);
  item.semantic = await page.evaluate(() => ({
    ingredientButtons: document.querySelectorAll('[data-fridge-ingredient]').length,
    canvasCount: document.querySelectorAll('canvas').length,
    webglContext: Boolean(document.querySelector('canvas')?.getContext('webgl')),
    headline: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
    visualAnchorBackground: getComputedStyle(document.querySelector('[data-signal-visual-anchor]')!).backgroundImage,
  }));
  expect(item.state).toMatchObject({
    ready: true,
    selected: [],
    selectionCount: 0,
    eligible: false,
    menuId: 'none',
    timelineMarks: 0,
    saved: false,
    renderer: 'dom-css-inline-svg',
    horizontalOverflow: false,
  });
  expect(item.semantic).toMatchObject({ ingredientButtons: 6, canvasCount: 0, webglContext: false });
  expect(String(item.semantic.headline)).toContain('今晚');
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: true });
  expectClean(issues);
});

test('real selection and withdrawal synchronously change timeline, menu and missing items', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-causal-selection-and-withdrawal', issues);
  await ready(page);

  await page.locator('[data-fridge-ingredient="tomato"]').click();
  await page.locator('[data-fridge-ingredient="eggs"]').click();
  const first = await snapshot(page);
  expect(first).toMatchObject({
    selected: ['tomato', 'eggs'],
    selectionCount: 2,
    eligible: true,
    menuId: 'tomato-egg-rice',
    menuTitle: '番茄滑蛋盖饭',
    missingItems: ['米饭', '小葱'],
    timelineMarks: 2,
  });
  await expect(page.locator('[data-fridge-save]')).toBeEnabled();

  await page.locator('[data-fridge-ingredient="eggs"]').click();
  const withdrawn = await snapshot(page);
  expect(withdrawn).toMatchObject({
    selected: ['tomato'],
    selectionCount: 1,
    eligible: false,
    menuId: 'none',
    missingItems: [],
    timelineMarks: 1,
  });
  await expect(page.locator('[data-fridge-save]')).toBeDisabled();

  await page.locator('[data-fridge-ingredient="tofu"]').focus();
  await page.keyboard.press('Space');
  const second = await snapshot(page);
  expect(second).toMatchObject({
    selected: ['tomato', 'tofu'],
    selectionCount: 2,
    eligible: true,
    menuId: 'tomato-tofu-soup',
    menuTitle: '番茄豆腐暖汤',
    missingItems: ['生姜', '米饭'],
    timelineMarks: 2,
  });
  expect(second.menuId).not.toBe(first.menuId);
  expect(second.missingItems).not.toEqual(first.missingItems);
  await page.locator('[data-fridge-result]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  item.state = second;
  item.semantic = { first, withdrawn, second };
  expectClean(issues);
});

test('save persists the eligible plan and reset removes it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-save-restore-reset', issues);
  await ready(page);
  await page.locator('[data-fridge-ingredient="spinach"]').click();
  await page.locator('[data-fridge-ingredient="mushroom"]').click();
  await page.locator('[data-fridge-save]').click();
  await expect(page.locator('html')).toHaveAttribute('data-fridge-saved', 'true');
  const savedState = await snapshot(page);
  expect(savedState).toMatchObject({ saved: true, menuId: 'greens-mushroom-noodles' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(page);
  const restored = await snapshot(page);
  expect(restored).toMatchObject({
    selected: ['spinach', 'mushroom'],
    selectionCount: 2,
    eligible: true,
    menuId: 'greens-mushroom-noodles',
    saved: true,
  });
  await page.locator('[data-fridge-result]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  await page.locator('[data-fridge-reset]').click();
  const reset = await snapshot(page);
  expect(reset).toMatchObject({ selected: [], selectionCount: 0, eligible: false, menuId: 'none', saved: false });
  item.state = restored;
  item.semantic = { savedState, restored, reset };
  expectClean(issues);
});

test('390px reduced motion preserves the same causal task without overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'mobile-reduced-result', issues);
  await ready(page);
  await page.locator('[data-fridge-ingredient="tofu"]').click();
  await page.locator('[data-fridge-ingredient="mushroom"]').click();
  await page.locator('[data-fridge-result]').scrollIntoViewIfNeeded();
  const state = await snapshot(page);
  const firstButton = await page.locator('[data-fridge-ingredient]').first().boundingBox();
  item.state = state;
  item.semantic = { firstButton, innerWidth: await page.evaluate(() => innerWidth) };
  expect(state).toMatchObject({
    selected: ['tofu', 'mushroom'],
    eligible: true,
    menuId: 'mushroom-tofu',
    reducedMotion: true,
    horizontalOverflow: false,
  });
  expect(firstButton?.width).toBeGreaterThan(44);
  expect(firstButton?.height).toBeGreaterThan(44);
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: true });
  expectClean(issues);
});

test('the base document remains understandable when JavaScript is disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'no-js-readable', issues);
  await expect(page.locator('h1')).toContainText('今晚');
  await expect(page.locator('#no-script-title')).toContainText('番茄滑蛋盖饭');
  await expect(page.locator('.truth-footer')).toContainText('概念演示');
  await expect(page.locator('[data-fridge-ingredient]')).toHaveCount(6);
  await expect(page.locator('canvas')).toHaveCount(0);
  item.state = await page.evaluate(() => ({
    ready: document.documentElement.dataset.fridgeReady,
    buttons: document.querySelectorAll('[data-fridge-ingredient]').length,
    canvasCount: document.querySelectorAll('canvas').length,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  expect(item.state).toMatchObject({ ready: 'false', buttons: 6, canvasCount: 0, horizontalOverflow: false });
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: true });
  expectClean(issues);
  await context.close();
});
