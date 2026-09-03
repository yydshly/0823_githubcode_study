import { expect, test } from '@playwright/test';

const baseUrl = '/pages/v2/deliveries/sea-fiber-scope/?quality=high&motion=full&revision=r155-review';

test('R155 opens with a live 3D cable and real scroll progress', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.fiberReady === 'true');

  const opening = await page.evaluate(() => window.__seaFiberScope?.snapshot());
  expect(opening).toMatchObject({ ready: true, state: 'dormant', fallback: false, horizontalOverflow: 0 });
  expect(opening!.drawCalls).toBeGreaterThan(5);
  await expect(page.locator('#fiber-title')).toContainText('沉默的线路');
  await page.screenshot({ path: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/01-desktop-opening.png' });

  await page.mouse.wheel(0, 1200);
  await expect.poll(async () => (await page.evaluate(() => window.__seaFiberScope?.snapshot().progress)) ?? 0).toBeGreaterThan(.08);
});

test('R155 couples fracture, audio and completion to one state model', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.fiberReady === 'true');
  await page.evaluate(() => window.__seaFiberScope?.setProgress(.62));
  await expect.poll(async () => page.evaluate(() => window.__seaFiberScope?.snapshot().state)).toBe('fracture');
  const fracture = await page.evaluate(() => window.__seaFiberScope?.snapshot());
  expect(fracture!.strain).toBeGreaterThan(.6);
  expect(fracture!.pulseFrequency).toBeGreaterThan(140);
  await page.locator('#sound-toggle').click();
  await expect.poll(async () => page.evaluate(() => window.__seaFiberScope?.snapshot().audioActive)).toBe(true);
  await page.screenshot({ path: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/02-desktop-fracture.png' });

  await page.evaluate(() => window.__seaFiberScope?.setProgress(1));
  await expect.poll(async () => page.evaluate(() => window.__seaFiberScope?.snapshot().state)).toBe('restored');
  const restored = await page.evaluate(() => window.__seaFiberScope?.snapshot());
  expect(restored!.pulseFrequency).toBe(82);
  await page.locator('#save-scan').click();
  await expect(page.locator('#save-status')).toContainText('已保存');
  await expect.poll(async () => page.evaluate(() => window.__seaFiberScope?.snapshot().saved)).toBe(true);
  await page.screenshot({ path: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/03-desktop-restored.png' });
});

test('R155 remains operable on mobile, reduced motion and WebGL fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl.replace('motion=full', 'motion=reduce'));
  await page.waitForFunction(() => document.documentElement.dataset.fiberReady === 'true');
  await page.evaluate(() => window.__seaFiberScope?.setProgress(.62));
  const mobile = await page.evaluate(() => window.__seaFiberScope?.snapshot());
  expect(mobile).toMatchObject({ state: 'fracture', reducedMotion: true, horizontalOverflow: 0 });
  await expect(page.locator('#sound-toggle')).toBeVisible();
  await expect(page.locator('[data-target="1"]')).toBeVisible();
  await page.screenshot({ path: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/04-mobile-fracture.png' });

  await page.goto(`${baseUrl}&fallback=webgl`);
  await page.waitForFunction(() => document.documentElement.dataset.fiberReady === 'true');
  await page.evaluate(() => window.__seaFiberScope?.setProgress(1));
  await page.locator('#save-scan').click();
  const fallback = await page.evaluate(() => window.__seaFiberScope?.snapshot());
  expect(fallback).toMatchObject({ state: 'restored', fallback: true, saved: true, horizontalOverflow: 0 });
  await expect(page.locator('.fiber-fallback')).toBeVisible();
  await page.screenshot({ path: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/05-mobile-fallback.png' });
});

