import path from 'node:path';
import { expect, test } from '@playwright/test';

type PrototypeSnapshot = {
  progress: number;
  activeScene: string;
  activeBeat: number;
  assetsLoaded: boolean[];
  viewport: { width: number; height: number };
  hasHorizontalOverflow: boolean;
};

declare global {
  interface Window {
    __scrollScrubPrototype?: {
      setProgress: (progress: number) => PrototypeSnapshot;
      snapshot: () => PrototypeSnapshot;
    };
  }
}

const screenshotDir = path.resolve(import.meta.dirname, '../docs/screenshots');

async function setProgress(page: import('@playwright/test').Page, progress: number) {
  return page.evaluate((nextProgress) => {
    const result = window.__scrollScrubPrototype?.setProgress(nextProgress);
    if (!result) throw new Error('Scroll prototype API is unavailable');
    return result;
  }, progress);
}

test('scroll-scrub media prototype renders a coherent desktop story and mobile state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/prototypes/scroll-scrub-media/');
  await page.waitForFunction(() => document.documentElement.dataset.prototypeReady === 'true');
  await expect(page.locator('.media-layer')).toHaveCount(3);
  await expect(page.locator('.story-beat')).toHaveCount(3);

  const initial = await page.evaluate(() => window.__scrollScrubPrototype?.snapshot());
  expect(initial?.assetsLoaded).toEqual([true, true, true]);
  expect(initial?.hasHorizontalOverflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight)).toBeGreaterThan(3);

  const opening = await setProgress(page, 0.02);
  expect(opening.activeScene).toBe('awakening');
  await page.screenshot({
    path: path.join(screenshotDir, 'v2-scroll-scrub-r01-opening.png'),
    animations: 'disabled',
  });

  const middle = await setProgress(page, 0.52);
  expect(middle.activeScene).toBe('fragments');
  await page.screenshot({
    path: path.join(screenshotDir, 'v2-scroll-scrub-r01-middle.png'),
    animations: 'disabled',
  });

  const ending = await setProgress(page, 0.96);
  expect(ending.activeScene).toBe('record');
  await expect(page.getByRole('link', { name: /记录今晚的梦/ })).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, 'v2-scroll-scrub-r01-ending.png'),
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.prototypeReady === 'true');
  const mobile = await setProgress(page, 0.52);
  expect(mobile.activeScene).toBe('fragments');
  expect(mobile.assetsLoaded).toEqual([true, true, true]);
  expect(mobile.hasHorizontalOverflow).toBe(false);
  await page.screenshot({
    path: path.join(screenshotDir, 'v2-scroll-scrub-r01-mobile.png'),
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
