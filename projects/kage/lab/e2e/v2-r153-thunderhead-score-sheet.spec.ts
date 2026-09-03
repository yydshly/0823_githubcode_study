import { expect, test } from '@playwright/test';

const baseUrl = '/pages/v2/deliveries/thunderhead-score/?quality=high&motion=full&revision=r153-score-sheet';

test('R153 opens as a light score sheet rather than a full-bleed photo poster', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');

  const geometry = await page.evaluate(() => {
    const field = document.querySelector<HTMLElement>('.weather-field')!.getBoundingClientRect();
    return {
      fieldWidthRatio: field.width / innerWidth,
      fieldLeftRatio: field.left / innerWidth,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      trackDirection: getComputedStyle(document.querySelector('.movement-track')!).flexDirection,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(geometry.fieldWidthRatio).toBeLessThan(.7);
  expect(geometry.fieldLeftRatio).toBeGreaterThan(.25);
  expect(geometry.bodyBackground).toBe('rgb(238, 240, 232)');
  expect(geometry.trackDirection).toBe('column');
  expect(geometry.overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('#storm-title')).toContainText('雷暴不是');
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/01-desktop-opening.png',
    fullPage: false,
  });
});

test('R153 preserves scroll, shear, sound and save causality', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');
  await page.evaluate(() => {
    window.__thunderheadScore?.setProgress(.68);
    window.__thunderheadScore?.setShear(.74);
  });

  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().phase))).toBe('charge');
  await page.locator('#audio-toggle').click();
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().audioActive))).toBe(true);
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/02-desktop-charge.png',
    fullPage: false,
  });

  await page.evaluate(() => window.__thunderheadScore?.setProgress(1));
  await page.locator('#save-score').click();
  await expect(page.locator('#save-status')).toContainText('四个乐章已写入');
  await expect.poll(async () => (await page.evaluate(() => window.__thunderheadScore?.snapshot().saved))).toBe(true);
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/03-desktop-saved.png',
    fullPage: false,
  });
});

test('R153 remains operable at 390px and under both fallbacks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');
  await page.evaluate(() => window.__thunderheadScore?.setProgress(.68));
  await expect(page.locator('#storm-environment')).toBeVisible();
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/04-mobile-charge.png',
    fullPage: false,
  });

  await page.goto(`${baseUrl.replace('motion=full', 'motion=reduce')}&fallback=canvas&assetFallback=image`);
  await page.waitForFunction(() => document.documentElement.dataset.stormReady === 'true');
  await page.evaluate(() => window.__thunderheadScore?.setProgress(.68));

  const snapshot = await page.evaluate(() => window.__thunderheadScore?.snapshot());
  expect(snapshot).toMatchObject({
    phase: 'charge',
    canvasFallback: true,
    assetFallback: true,
    reducedMotion: true,
    horizontalOverflow: 0,
  });
  await expect(page.locator('#audio-toggle')).toBeVisible();
  await expect(page.locator('[data-storm-target="1"]')).toBeVisible();
  await page.screenshot({
    path: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/05-mobile-fallback.png',
    fullPage: false,
  });
});
