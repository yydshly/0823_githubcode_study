import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';

type SemanticSnapshot = {
  stage: number;
  stageId: 'observe' | 'compare' | 'consequence';
  selectedIndex: number;
  selectedYear: number;
  lossSquareKilometers: number;
  retreatMeters: number;
  relativeWaterCentimeters: number;
  timelinePosition: number;
  dragging: boolean;
  renderer: 'webgl' | 'fallback';
  reducedMotion: boolean;
  inputMode: 'scroll' | 'pointer' | 'touch' | 'keyboard' | 'button' | 'api';
  hasHorizontalOverflow: boolean;
  canvasDrawn: boolean;
};

declare global {
  interface Window {
    __semanticInteractionPrototype?: {
      setStage: (stage: number, syncScroll?: boolean) => SemanticSnapshot;
      setYear: (index: number, inputMode?: SemanticSnapshot['inputMode']) => SemanticSnapshot;
      setTimelinePosition: (position: number, inputMode?: SemanticSnapshot['inputMode']) => SemanticSnapshot;
      snapshot: () => SemanticSnapshot;
    };
  }
}

const screenshotDir = path.resolve(import.meta.dirname, '../.artifacts/v2-semantic-interaction-r02');

async function waitForPrototype(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.prototypeReady === 'true');
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test('semantic interaction changes scene meaning, evidence and keyboard selection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/semantic-interaction/');
  await waitForPrototype(page);
  await page.reload();
  await waitForPrototype(page);

  const opening = await page.evaluate(() => window.__semanticInteractionPrototype?.snapshot());
  expect(opening).toMatchObject({
    stage: 0,
    stageId: 'observe',
    selectedYear: 1984,
    lossSquareKilometers: 0,
    renderer: 'webgl',
    hasHorizontalOverflow: false,
    canvasDrawn: true
  });
  await expect(page.locator('.fallback-coast')).toBeVisible();
  await expect(page.getByRole('heading', { name: /一条岸线/ })).toBeVisible();
  const demoTrigger = page.getByRole('button', { name: /播放岸线变化/ });
  await expect(demoTrigger).toBeVisible();
  await demoTrigger.click();
  await page.waitForFunction(() => {
    const snapshot = window.__semanticInteractionPrototype?.snapshot();
    return snapshot?.inputMode === 'demo' && snapshot.timelinePosition > 0.04;
  });
  const demo = await page.evaluate(() => window.__semanticInteractionPrototype?.snapshot());
  expect(demo).toMatchObject({ stage: 1, stageId: 'compare', inputMode: 'demo' });
  expect(demo?.timelinePosition).toBeGreaterThan(0.04);
  await demoTrigger.click();

  const compare = await page.evaluate(() => {
    window.__semanticInteractionPrototype?.setStage(1, false);
    return window.__semanticInteractionPrototype?.setYear(2, 'api');
  });
  expect(compare).toMatchObject({ stage: 1, stageId: 'compare', selectedYear: 2026, lossSquareKilometers: 8.7 });
  await expect(page.locator('[data-loss]')).toHaveText('8.7');
  await expect(page.locator('[data-summary]')).toContainText('连续岸线已经断裂');
  await expect(page.locator('.narrative-beat[data-beat="0"]')).toHaveCSS('opacity', '0');
  await expect(page.locator('.narrative-beat[data-beat="1"]')).toHaveCSS('opacity', '1');
  const track = page.locator('[data-era-track]');
  const bounds = await track.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * 0.96, bounds!.y + 16);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.25, bounds!.y + 16, { steps: 8 });
  const continuous = await page.evaluate(() => window.__semanticInteractionPrototype?.snapshot());
  expect(continuous).toMatchObject({
    selectedYear: 1994,
    lossSquareKilometers: 1.6,
    retreatMeters: 93,
    relativeWaterCentimeters: 4,
    timelinePosition: 0.25,
    dragging: true
  });
  await expect(page.locator('strong[data-year]')).toHaveText('1994');
  await expect(page.locator('[data-loss]')).toHaveText('1.6');
  await page.locator('.archive-stage').screenshot({
    path: path.join(screenshotDir, '01-desktop-continuous-drag.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 78
  });
  await page.mouse.up();
  await expect(page.locator('strong[data-year]')).toHaveText('2004');

  await page.evaluate(() => window.__semanticInteractionPrototype?.setYear(2, 'api'));
  await page.mouse.move(760, 430);
  await expect(page.locator('html')).toHaveAttribute('data-lens-active', 'true');
  await expect(page.locator('[data-local-retreat]')).toContainText('m');
  await page.locator('.archive-stage').screenshot({
    path: path.join(screenshotDir, '02-desktop-local-evidence.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 78
  });

  await page.keyboard.press('ArrowRight');
  const keyboard = await page.evaluate(() => window.__semanticInteractionPrototype?.snapshot());
  expect(keyboard).toMatchObject({ selectedYear: 2026, inputMode: 'keyboard' });
  await expect(page.locator('[data-era-index="2"]')).toBeFocused();

  expect(errors).toEqual([]);
});

test('mobile touch path preserves the comparison and layout', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/semantic-interaction/');
  await waitForPrototype(page);
  await page.evaluate(() => window.__semanticInteractionPrototype?.setStage(1, false));

  const latestButton = page.locator('[data-era-index="2"]');
  const bounds = await latestButton.boundingBox();
  expect(bounds).not.toBeNull();
  await page.touchscreen.tap(bounds!.x + bounds!.width / 2, bounds!.y + 20);

  const snapshot = await page.evaluate(() => window.__semanticInteractionPrototype?.snapshot());
  expect(snapshot?.selectedYear).toBe(2026);
  expect(snapshot?.hasHorizontalOverflow).toBe(false);
  await expect(latestButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.narrative-beat[data-beat="0"]')).toHaveCSS('opacity', '0');
  await expect(page.locator('.narrative-beat[data-beat="1"]')).toHaveCSS('opacity', '1');
  await page.locator('.archive-stage').screenshot({
    path: path.join(screenshotDir, '03-mobile-evidence.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 78
  });

  expect(errors).toEqual([]);
  await context.close();
});

test('reduced motion and forced WebGL fallback retain the complete task', async ({ browser }: { browser: Browser }) => {
  const reducedContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto('/pages/v2/prototypes/semantic-interaction/');
  await waitForPrototype(reducedPage);
  const reduced = await reducedPage.evaluate(() => window.__semanticInteractionPrototype?.setYear(1, 'keyboard'));
  expect(reduced).toMatchObject({ selectedYear: 2004, reducedMotion: true });
  await reducedContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fallbackPage = await fallbackContext.newPage();
  const errors: string[] = [];
  fallbackPage.on('pageerror', (error) => errors.push(String(error)));
  await fallbackPage.goto('/pages/v2/prototypes/semantic-interaction/?fallback=1');
  await waitForPrototype(fallbackPage);
  const fallback = await fallbackPage.evaluate(() => {
    window.__semanticInteractionPrototype?.setStage(2, false);
    return window.__semanticInteractionPrototype?.setYear(2, 'api');
  });
  expect(fallback).toMatchObject({
    stage: 2,
    selectedYear: 2026,
    lossSquareKilometers: 8.7,
    renderer: 'fallback',
    canvasDrawn: true,
    hasHorizontalOverflow: false
  });
  await expect(fallbackPage.locator('.fallback-note')).toBeVisible();
  await expect(fallbackPage.locator('[data-summary]')).toContainText('连续岸线已经断裂');
  await fallbackPage.locator('.archive-stage').screenshot({
    path: path.join(screenshotDir, '04-fallback-evidence.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 78
  });
  expect(errors).toEqual([]);
  await fallbackContext.close();
});
