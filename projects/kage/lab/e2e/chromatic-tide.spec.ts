import { expect, test } from '@playwright/test';

test('chromatic tide uses a distinct shader plugin and quality budget', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?experience=chromatic-tide&quality=high&node=fold&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await expect(page.locator('#fold')).toBeInViewport();
  const high = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(high?.runtime?.scenePlugin.id).toBe('chromatic-tide');
  expect(high?.runtime?.scenePlugin.metrics.shaderLayers).toBe(5);
  expect(Number(high?.runtime?.scenePlugin.metrics.vertices)).toBeGreaterThan(10_000);
  expect(high?.capabilityPlan.selected).toContain('scene:chromatic-tide');
  expect(high?.capabilityPlan.missing).toEqual([]);

  await page.goto('/?experience=chromatic-tide&quality=low&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  const low = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(low?.runtime?.scenePlugin.metrics.shaderLayers).toBe(3);
  expect(Number(low?.runtime?.scenePlugin.metrics.vertices)).toBeLessThan(Number(high?.runtime?.scenePlugin.metrics.vertices));
  expect(errors).toEqual([]);
});
