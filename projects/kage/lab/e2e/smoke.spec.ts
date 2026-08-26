import { expect, test } from '@playwright/test';

test('desktop WebGL story exposes deterministic debug state', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?story=observatory&quality=balanced&chapter=2&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await expect(page.locator('.chapter.is-active')).toHaveCount(1);
  const snapshot = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(snapshot?.story).toBe('observatory');
  expect(snapshot?.runtime?.quality).toBe('balanced');
  expect(snapshot?.runtime?.drawCalls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('configuration swaps story without changing the runtime contract', async ({ page }) => {
  await page.goto('/?story=archive&quality=low&debug=1');
  await expect(page.locator('h1')).toHaveText('漂移档案库');
  const snapshot = await page.evaluate(() => window.__signalLab?.snapshot());
  expect(snapshot?.story).toBe('archive');
  expect(snapshot?.qualityEffective).toBe('low');
});

test('semantic fallback keeps every chapter and navigation link', async ({ page }) => {
  await page.goto('/?renderer=none&story=explainer&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.chapter')).toHaveCount(4);
  await expect(page.locator('.chapter-nav-link')).toHaveCount(4);
  await expect(page.locator('#world-canvas')).toHaveCSS('opacity', '0');
});

test('reduced motion is deterministic and does not continuously animate', async ({ page }) => {
  await page.goto('/?motion=reduce&debug=1');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  const first = await page.evaluate(() => window.__signalLab?.snapshot().runtime);
  await page.waitForTimeout(500);
  const second = await page.evaluate(() => window.__signalLab?.snapshot().runtime);
  expect(first?.framesRendered).toBe(second?.framesRendered);
});

test('mobile low quality has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?quality=low&chapter=1&debug=1');
  const sizes = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: innerWidth }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
  await expect(page.locator('body')).toHaveAttribute('data-quality', 'low');
});
