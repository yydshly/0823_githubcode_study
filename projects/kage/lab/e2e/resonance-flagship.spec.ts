import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshot = (name: string) => path.resolve(import.meta.dirname, `../docs/screenshots/${name}`);

async function waitForFlagship(page: import('@playwright/test').Page) {
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await page.waitForFunction(() => window.__signalLab?.snapshot().runtime?.scenePlugin.metrics.assetState === 'ready');
  return page.evaluate(() => window.__signalLab!.snapshot());
}

test('default route is the asset-led flagship and renders its model asset pair', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?quality=high&debug=1');
  const snapshot = await waitForFlagship(page);

  expect(snapshot.experience).toBe('resonance-flagship');
  expect(snapshot.runtime?.scenePlugin.id).toBe('resonance-flagship');
  expect(snapshot.runtime?.scenePlugin.metrics.colorAsset).toContain('chatgpt-resonance-hero-v1.png');
  expect(snapshot.runtime?.scenePlugin.metrics.depthAsset).toContain('chatgpt-resonance-depth-v1.png');
  expect(snapshot.runtime?.scenePlugin.metrics.assetQuality).toBe('L3-presentable');
  expect(snapshot.runtime?.postprocessing).toBe('bloom');
  expect(snapshot.capabilityPlan.selected).toContain('scene:resonance-flagship');
  expect(snapshot.capabilityPlan.missing).toEqual([]);
  await expect(page.locator('h1')).toHaveText('声之形');
  await expect(page.locator('.brand')).toContainText('RESONANCE / 01');
  await page.locator('#debug-panel').evaluate((element) => { element.hidden = true; });
  await page.screenshot({ path: screenshot('flagship-desktop-hero.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('scroll, pointer, controls and keyboard stay usable over the persistent scene', async ({ page }) => {
  await page.goto('/?quality=balanced&debug=1');
  await waitForFlagship(page);
  await page.mouse.move(1120, 360);
  await page.locator('#shape').scrollIntoViewIfNeeded();
  await expect(page.locator('#shape')).toBeInViewport();
  await expect(page.locator('#shape')).toHaveClass(/is-active/);
  await page.locator('#debug-panel').evaluate((element) => { element.hidden = true; });
  await page.screenshot({ path: screenshot('flagship-desktop-depth-state.png'), animations: 'disabled' });

  await page.getByRole('button', { name: '导演参数' }).click();
  await expect(page.locator('#lab-controls')).toHaveClass(/is-open/);
  await expect(page.locator('#lab-controls')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
});

test('mobile, reduced motion and semantic fallback preserve the experience boundary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?quality=low&motion=reduce&debug=1');
  const low = await waitForFlagship(page);
  expect(low.runtime?.postprocessing).toBe('none');
  expect(low.runtime?.scenePlugin.metrics.depthParallax).toBe('limited');
  const firstFrames = low.runtime?.framesRendered;
  await page.waitForTimeout(350);
  const secondFrames = (await page.evaluate(() => window.__signalLab!.snapshot())).runtime?.framesRendered;
  expect(firstFrames).toBe(secondFrames);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  const mobileNav = await page.locator('#chapter-nav').boundingBox();
  expect(mobileNav).not.toBeNull();
  expect(mobileNav!.y).toBeGreaterThan(760);
  await page.locator('#debug-panel').evaluate((element) => { element.hidden = true; });
  await page.screenshot({ path: screenshot('flagship-mobile-low.png'), animations: 'disabled' });

  await page.goto('/?renderer=none&motion=reduce');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await expect(page.locator('.chapter-nav-link')).toHaveCount(4);
  await expect(page.locator('#fallback-plate')).toHaveCSS('background-image', /chatgpt-resonance-hero-v1/);
});

declare global {
  interface Window {
    __signalLab?: {
      snapshot: () => {
        experience: string;
        capabilityPlan: { selected: readonly string[]; missing: readonly string[] };
        runtime: {
          framesRendered: number;
          postprocessing: string;
          scenePlugin: { id: string; metrics: Readonly<Record<string, string | number>> };
        } | null;
      };
    };
  }
}
