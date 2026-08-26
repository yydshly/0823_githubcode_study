import { expect, test } from '@playwright/test';

type VisualWindow = Window & { __creativeLab?: { snapshot: () => { state: string; creatorStep: number } }; __signalLab?: { snapshot: () => { runtime: { scenePlugin: { metrics: Record<string, string | number> } } | null } } };

test('captures the refined flagship chapter composition', async ({ page }) => {
  await page.goto('/?experience=resonance-flagship&quality=high&motion=full&debug=1');
  await page.waitForFunction(() => (window as VisualWindow).__signalLab?.snapshot().runtime?.scenePlugin.metrics.assetState === 'ready');
  await page.locator('section#shape').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  await expect(page.locator('body')).toHaveAttribute('data-node', 'shape');
  await page.locator('#debug-panel').evaluate((element) => { (element as HTMLElement).hidden = true; });
  await page.screenshot({ path: 'docs/screenshots/phase13-flagship-desktop.png', animations: 'disabled' });
});

test('captures the auto-selected creator workflow on desktop and mobile', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => (window as VisualWindow).__creativeLab?.snapshot().creatorStep === 4);
  await page.locator('#selection-detail').evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(450);
  await page.screenshot({ path: 'docs/screenshots/phase14-workbench-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#selection-detail').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.screenshot({ path: 'docs/screenshots/phase14-workbench-mobile.png', animations: 'disabled' });
});

