import { expect, test } from '@playwright/test';

const baseUrl = '/pages/v2/deliveries/sonic-pressing-room/?quality=high&motion=full&revision=r157-review';
const evidenceRoot = 'docs/v2-deliveries/evidence/r157-sonic-pressing-room';

test('R157 opens as a live transparent record and responds to real scroll', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.pressReady === 'true');

  const opening = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(opening).toMatchObject({ ready: true, state: 'silent', fallback: false, horizontalOverflow: 0 });
  expect(opening!.drawCalls).toBeGreaterThan(2);
  expect(opening!.triangles).toBeGreaterThan(1_000);
  expect(errors).toEqual([]);
  await expect(page.locator('#press-title')).toContainText('压进光里');
  await page.screenshot({ path: `${evidenceRoot}/01-desktop-opening.png` });

  await page.mouse.wheel(0, 1300);
  await expect.poll(async () => (await page.evaluate(() => window.__sonicPressingRoom?.snapshot().progress)) ?? 0).toBeGreaterThan(.08);
});

test('R157 couples analyser bands, material duties and completion to one state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.documentElement.dataset.pressReady === 'true');
  await page.evaluate(() => window.__sonicPressingRoom?.setProgress(.68));
  await page.locator('#audio-toggle').click();
  await expect.poll(async () => page.evaluate(() => window.__sonicPressingRoom?.snapshot().audioState)).toBe('playing');
  await expect.poll(async () => page.evaluate(() => window.__sonicPressingRoom?.snapshot().low ?? 0)).toBeGreaterThan(.04);

  const resonant = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(resonant).toMatchObject({ state: 'resonant', audioState: 'playing', audioContextState: 'running' });
  expect(resonant!.grooveDepth).toBeGreaterThan(.08);
  expect(resonant!.refraction).toBeGreaterThan(.12);
  expect(resonant!.edgeVibration).toBeGreaterThan(0);
  expect(new Set([resonant!.low, resonant!.mid, resonant!.high]).size).toBeGreaterThan(1);
  await page.screenshot({ path: `${evidenceRoot}/02-desktop-resonant.png` });

  await page.evaluate(() => window.__sonicPressingRoom?.setProgress(1));
  await page.locator('#save-imprint').click();
  await expect(page.locator('#save-status')).toContainText('已保存');
  const kept = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(kept).toMatchObject({ state: 'kept', saved: true, audioState: 'playing' });
  await page.screenshot({ path: `${evidenceRoot}/03-desktop-kept.png` });
});

test('R157 preserves the journey on mobile, reduced motion and both capability fallbacks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl.replace('motion=full', 'motion=reduce'));
  await page.waitForFunction(() => document.documentElement.dataset.pressReady === 'true');
  await page.evaluate(() => window.__sonicPressingRoom?.setProgress(.68));
  const mobile = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(mobile).toMatchObject({ state: 'resonant', reducedMotion: true, horizontalOverflow: 0 });
  await expect(page.locator('#audio-toggle')).toBeVisible();
  await expect(page.locator('[data-target="1"]')).toBeVisible();
  await page.screenshot({ path: `${evidenceRoot}/04-mobile-resonant.png` });

  await page.goto(`${baseUrl}&fallback=webgl`);
  await page.waitForFunction(() => document.documentElement.dataset.pressReady === 'true');
  await page.evaluate(() => window.__sonicPressingRoom?.setProgress(1));
  await page.locator('#save-imprint').click();
  const webglFallback = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(webglFallback).toMatchObject({ fallback: true, state: 'kept', saved: true, horizontalOverflow: 0 });
  await expect(page.locator('.disc-fallback')).toBeVisible();
  await page.screenshot({ path: `${evidenceRoot}/05-mobile-webgl-fallback.png` });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}&audio=unavailable`);
  await page.waitForFunction(() => document.documentElement.dataset.pressReady === 'true');
  await page.locator('#audio-toggle').click();
  await page.evaluate(() => window.__sonicPressingRoom?.setProgress(1));
  await page.locator('#save-imprint').click();
  const audioFallback = await page.evaluate(() => window.__sonicPressingRoom?.snapshot());
  expect(audioFallback).toMatchObject({ audioState: 'unavailable', state: 'kept', saved: true });
  await expect(page.locator('#spectrum-note')).toContainText('无法启动音频');
  await page.screenshot({ path: `${evidenceRoot}/06-desktop-audio-fallback.png` });
});
