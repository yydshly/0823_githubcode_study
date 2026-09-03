import { expect, test } from '@playwright/test';

const baseUrl = '/pages/v2/deliveries/thunderhead-score/?quality=high&motion=full&revision=r152-final';

test('R152 desktop traverses the storm, bends wind, enables sound and saves a score', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');

  const opening = await page.evaluate(() => window.__thunderheadScore?.snapshot());
  expect(opening).toMatchObject({
    ready: true,
    phase: 'lift',
    imageLoaded: true,
    canvasFallback: false,
    assetFallback: false,
    horizontalOverflow: 0,
    revision: 'r152-final'
  });
  await expect(page.locator('#storm-title')).toContainText('雷暴不是突然发生');
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r152-thunderhead-score/01-desktop-opening.png',
    fullPage: false
  });

  await page.evaluate(() => {
    window.__thunderheadScore?.setProgress(.68);
    window.__thunderheadScore?.setShear(.72);
  });
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().phase))).toBe('charge');
  const charge = await page.evaluate(() => window.__thunderheadScore?.snapshot());
  expect(charge?.energy).toBeGreaterThan(.7);
  expect(charge?.shear).toBeGreaterThan(.7);
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r152-thunderhead-score/02-desktop-charge-shear.png',
    fullPage: false
  });

  await page.locator('#audio-toggle').click();
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().audioActive))).toBe(true);
  await expect(page.locator('#audio-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => window.__thunderheadScore?.setProgress(1));
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().phase))).toBe('release');
  await page.locator('#save-score').click();
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().saved))).toBe(true);
  await expect(page.locator('#save-status')).toContainText('四个乐章已写入');
  await expect(page.locator('#save-score')).toHaveAttribute('data-saved', 'true');
  expect(await page.locator('#save-score').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgb(25, 56, 73)');
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r152-thunderhead-score/03-desktop-saved-score.png',
    fullPage: false
  });
});

test('R152 390px remains operable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');
  await page.evaluate(() => {
    window.__thunderheadScore?.setProgress(.68);
    window.__thunderheadScore?.setShear(-.6);
  });

  const snapshot = await page.evaluate(() => window.__thunderheadScore?.snapshot());
  expect(snapshot).toMatchObject({ phase: 'charge', horizontalOverflow: 0 });
  await expect(page.locator('#audio-toggle')).toBeVisible();
  await expect(page.locator('[data-storm-target="1"]')).toBeVisible();
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r152-thunderhead-score/04-mobile-charge.png',
    fullPage: false
  });
});

test('R152 reduced motion and capability fallbacks preserve the journey', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/pages/v2/deliveries/thunderhead-score/?quality=balanced&motion=reduce&fallback=canvas&assetFallback=image&revision=r152-final');
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');

  const opening = await page.evaluate(() => window.__thunderheadScore?.snapshot());
  expect(opening).toMatchObject({
    reducedMotion: true,
    canvasFallback: true,
    assetFallback: true,
    horizontalOverflow: 0
  });
  await page.evaluate(() => window.__thunderheadScore?.setProgress(1));
  await page.locator('#save-score').click();
  await expect(page.locator('#save-status')).toContainText('四个乐章已写入');
});
