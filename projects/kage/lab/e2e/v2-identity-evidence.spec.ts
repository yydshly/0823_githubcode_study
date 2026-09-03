import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

type IdentitySnapshot = {
  activeIndex: number;
  activeId: 'source' | 'process' | 'performance';
  inputMode: 'scroll' | 'button' | 'keyboard' | 'api';
  assetMode: 'media' | 'fallback';
  reducedMotion: boolean;
  hasHorizontalOverflow: boolean;
};

declare global {
  interface Window {
    __identityEvidencePrototype?: {
      setState: (index: number, inputMode?: IdentitySnapshot['inputMode'], syncScroll?: boolean) => IdentitySnapshot;
      snapshot: () => IdentitySnapshot;
    };
  }
}

const screenshotDir = path.resolve(import.meta.dirname, '../.artifacts/v2-identity-evidence-r10');

async function waitForPrototype(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
}

test.beforeAll(async () => {
  await mkdir(screenshotDir, { recursive: true });
});

test('desktop state changes identity, evidence and keyboard focus together', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/identity-evidence/');
  await waitForPrototype(page);
  await page.waitForFunction(() => window.__identityEvidencePrototype?.snapshot().assetMode === 'media');

  const opening = await page.evaluate(() => window.__identityEvidencePrototype?.snapshot());
  expect(opening).toMatchObject({
    activeIndex: 0,
    activeId: 'source',
    inputMode: 'scroll',
    assetMode: 'media',
    hasHorizontalOverflow: false
  });
  await expect(page.getByRole('heading', { name: '身份从材料的来历开始。' })).toBeVisible();

  await page.getByRole('button', { name: /过程/ }).click();
  await page.waitForFunction(() => window.__identityEvidencePrototype?.snapshot().activeId === 'process');
  const processState = await page.evaluate(() => window.__identityEvidencePrototype?.snapshot());
  expect(processState).toMatchObject({ activeId: 'process', inputMode: 'button' });
  await expect(page.locator('[data-proof-value]')).toHaveText('生长 · 编织 · 固化');

  await page.keyboard.press('ArrowRight');
  const performanceState = await page.evaluate(() => window.__identityEvidencePrototype?.snapshot());
  expect(performanceState).toMatchObject({ activeId: 'performance', inputMode: 'keyboard' });
  await expect(page.locator('[data-state-index="2"]')).toBeFocused();
  await expect(page.locator('[data-proof-value]')).toContainText('连续表皮');
  await page.waitForTimeout(300);
  await expect(page.getByRole('heading', { name: '证明最终回到一个可辨认的主体。' })).toBeVisible();
  expect(await page.evaluate(() => window.__identityEvidencePrototype?.snapshot().activeId)).toBe('performance');

  await page.locator('.identity-stage').screenshot({
    path: path.join(screenshotDir, '01-desktop-performance.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 80
  });

  expect(errors).toEqual([]);
});

test('mobile preserves the evidence journey without horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/identity-evidence/');
  await waitForPrototype(page);
  const state = await page.evaluate(() => window.__identityEvidencePrototype?.setState(1, 'api', false));

  expect(state).toMatchObject({ activeId: 'process', hasHorizontalOverflow: false });
  await expect(page.locator('[data-state-index="1"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-summary]')).toBeVisible();
  await page.locator('.identity-stage').screenshot({
    path: path.join(screenshotDir, '02-mobile-process.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 80
  });

  expect(errors).toEqual([]);
  await context.close();
});

test('reduced motion and forced asset fallback keep all evidence readable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/identity-evidence/?assets=off');
  await waitForPrototype(page);
  const state = await page.evaluate(() => window.__identityEvidencePrototype?.setState(2, 'api', false));

  expect(state).toMatchObject({
    activeId: 'performance',
    assetMode: 'fallback',
    reducedMotion: true,
    hasHorizontalOverflow: false
  });
  await expect(page.locator('html')).toHaveAttribute('data-assets', 'fallback');
  await expect(page.getByRole('heading', { name: '证明最终回到一个可辨认的主体。' })).toBeVisible();
  await expect(page.locator('[data-proof-detail]')).toBeVisible();
  await page.locator('.identity-stage').screenshot({
    path: path.join(screenshotDir, '03-fallback.jpg'),
    animations: 'disabled',
    type: 'jpeg',
    quality: 80
  });

  expect(errors).toEqual([]);
  await context.close();
});
