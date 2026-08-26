import { expect, test } from '@playwright/test';

test('single-node experience animates through an internal track', async ({ page }) => {
  await page.goto('/?experience=single-hero&motion=reduce&renderer=none&debug=1');
  await expect(page.locator('[data-node-id].chapter')).toHaveCount(1);
  const snapshot = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(snapshot?.experience).toBe('single-hero');
  expect(snapshot?.flowPlan.nodeIds).toEqual(['hero']);
});

test('long-form experience renders nine addressable nodes without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?experience=long-form&renderer=none&node=station-5&debug=1');
  await expect(page.locator('[data-node-id].chapter')).toHaveCount(9);
  const sizes = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: innerWidth }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
});

test('branch selection changes the flow plan without changing the runtime', async ({ page }) => {
  await page.goto('/?experience=branching-lore&choice=shadow&renderer=none&debug=1');
  await expect(page.locator('#shadow')).toHaveCount(1);
  await expect(page.locator('#luminous')).toHaveCount(0);
  const snapshot = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(snapshot?.flowPlan.nodeIds).toEqual(['threshold', 'crossroads', 'shadow', 'confluence']);
});
