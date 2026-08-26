import { expect, test } from '@playwright/test';

type ShowcaseWindow = Window & { __creativeLab?: { snapshot: () => { state: string; creatorStep: number } }; __signalLab?: { snapshot: () => { experience: string; capabilityPlan: { status: string }; runtime: { scenePlugin: { id: string; metrics: Record<string, string | number> } } | null } } };

async function waitForWorkbench(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as ShowcaseWindow).__creativeLab?.snapshot().creatorStep === 4 && document.querySelector('#creative-stage-frame')?.classList.contains('is-ready'));
}

test('renders the generated tidal archive as a complete asset-led Three.js webpage', async ({ page }) => {
  await page.goto('/?experience=tidal-archive&quality=high&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-experience', 'tidal-archive');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await page.waitForFunction(() => (window as ShowcaseWindow).__signalLab?.snapshot().runtime?.scenePlugin.metrics.assetState === 'ready');
  const snapshot = await page.evaluate(() => (window as ShowcaseWindow).__signalLab!.snapshot());
  expect(snapshot.experience).toBe('tidal-archive');
  expect(snapshot.capabilityPlan.status).toBe('fit');
  expect(Number(snapshot.runtime?.scenePlugin.metrics.archivePlates)).toBeGreaterThanOrEqual(3);
  expect(snapshot.runtime?.scenePlugin.metrics.colorAsset).toContain('chatgpt-tidal-archive-hero-v1.png');
  await page.getByRole('link', { name: '追迹' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-node', 'trace');
});

test('keeps two runnable reference experiences visible without replacing the generated result', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  const frame = page.frameLocator('#creative-stage-frame');
  await expect(frame.locator('body')).toHaveAttribute('data-experience', /generated-/);
  await expect(page.locator('.wb-reference-library')).toHaveAttribute('open', '');
  const samples = page.locator('.wb-sample-link');
  await expect(samples).toHaveCount(2);
  await expect(page.getByRole('link', { name: '单独打开资产驱动产品电影样例' })).toHaveAttribute('href', /experience=resonance-flagship/);
  await expect(page.getByRole('link', { name: '单独打开潮汐记忆叙事空间样例' })).toHaveAttribute('href', /experience=tidal-archive/);
  await expect(samples.first()).toHaveAttribute('target', '_blank');
  await expect(frame.locator('body')).toHaveAttribute('data-experience', /generated-/);
});

test('keeps the generated stage and both samples visible at 390px and preserves semantic fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await expect(page.locator('.wb-reference-library')).toBeVisible();
  await expect(page.locator('.wb-sample-link')).toHaveCount(2);
  await expect(page.frameLocator('#creative-stage-frame').locator('body')).toHaveAttribute('data-experience', /generated-/);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.goto('/?experience=tidal-archive&renderer=none&quality=low');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await expect(page.getByRole('link', { name: '追迹' })).toBeVisible();
});
