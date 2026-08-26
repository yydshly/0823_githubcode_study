import { expect, test } from '@playwright/test';

test('composed world renders an EffectSpec recipe with quality-aware instancing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?experience=composed-world&quality=high&node=resolve&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await expect(page.locator('#resolve')).toBeInViewport();
  const high = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(high?.runtime?.scenePlugin.id).toBe('composed-world');
  expect(high?.runtime?.scenePlugin.metrics.heroForm).toBe('knot');
  expect(high?.runtime?.scenePlugin.metrics.fieldForm).toBe('stream');
  expect(high?.runtime?.scenePlugin.metrics.instances).toBe(88);
  expect(high?.runtime?.scenePlugin.metrics.omittedAssets).toBe(2);
  expect(high?.capabilityPlan.selected).toContain('scene:composed-world');
  expect(high?.capabilityPlan.missing).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/phase7-composed-world.png', fullPage: false });

  await page.goto('/?experience=composed-world&quality=low&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
  const low = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(Number(low?.runtime?.scenePlugin.metrics.instances)).toBeLessThan(Number(high?.runtime?.scenePlugin.metrics.instances));
  expect(errors).toEqual([]);
});

declare global {
  interface Window {
    __signalLab?: { snapshot: () => { capabilityPlan: { selected: readonly string[]; missing: readonly string[] }; runtime: { scenePlugin: { id: string; metrics: Readonly<Record<string, string | number>> } } | null } };
  }
}
