import path from 'node:path';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const evidence = path.resolve('docs/v2-research/evidence/r145-aurora-radio-postcard');
const route = '/pages/v2/deliveries/aurora-radio-postcard/?quality=high&motion=full&revision=r145-final';

async function meanPixelDelta(before: Buffer, after: Buffer): Promise<number> {
  const options = { width: 240, height: 150, fit: 'fill' as const };
  const [beforePixels, afterPixels] = await Promise.all([
    sharp(before).resize(options).removeAlpha().raw().toBuffer(),
    sharp(after).resize(options).removeAlpha().raw().toBuffer()
  ]);
  let difference = 0;
  for (let index = 0; index < beforePixels.length; index += 1) {
    difference += Math.abs(beforePixels[index]! - afterPixels[index]!);
  }
  return difference / beforePixels.length;
}

test.describe('R145 极光无线电明信片', () => {
  test('desktop proves generated visual, wheel tuning, audio causality and final action', async ({ page }) => {
    await page.goto(route);
    await expect.poll(() => page.evaluate(() => window.__auroraRadioPostcard?.snapshot().ready)).toBe(true);

    const opening = await page.evaluate(() => window.__auroraRadioPostcard!.snapshot());
    expect(opening).toMatchObject({
      state: 'searching',
      tune: 0,
      imageLoaded: true,
      fallback: false,
      assetFallback: false,
      horizontalOverflow: 0,
      revision: 'r145-final'
    });
    expect(opening.frames).toBeGreaterThan(0);
    expect(opening.drawCalls).toBeGreaterThan(0);
    await page.waitForTimeout(450);
    const animatedOpening = await page.evaluate(() => window.__auroraRadioPostcard!.snapshot());
    expect(animatedOpening.frames - opening.frames).toBeGreaterThan(10);
    const openingCanvas = await page.locator('#aurora-canvas').screenshot();
    await page.screenshot({ path: path.join(evidence, '01-desktop-opening.png') });

    await page.mouse.move(720, 430);
    await page.mouse.wheel(0, 360);
    await expect.poll(() => page.evaluate(() => window.__auroraRadioPostcard!.snapshot().tune)).toBeGreaterThan(0);
    await page.evaluate(() => window.__auroraRadioPostcard!.setTune(.62));
    await expect(page.locator('html')).toHaveAttribute('data-aurora-state', 'resonance');
    await expect(page.locator('#frequency-value')).toHaveText('58.1');

    await page.locator('#audio-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-audio', 'on');
    const resonance = await page.evaluate(() => window.__auroraRadioPostcard!.snapshot());
    expect(resonance).toMatchObject({ state: 'resonance', audioEnabled: true, audioMuted: false });
    expect(resonance.audioFilterHz).toBeGreaterThan(opening.audioFilterHz);
    expect(resonance.visualEnergy).toBeGreaterThan(opening.visualEnergy);
    await page.waitForTimeout(650);
    const resonanceCanvas = await page.locator('#aurora-canvas').screenshot();
    expect(await meanPixelDelta(openingCanvas, resonanceCanvas)).toBeGreaterThan(5);
    await page.screenshot({ path: path.join(evidence, '02-desktop-resonance-audio.png') });

    await page.locator('#frequency-control').focus();
    await page.keyboard.press('End');
    await expect(page.locator('html')).toHaveAttribute('data-aurora-state', 'postcard');
    await expect(page.locator('#send-postcard')).toBeEnabled();
    await page.locator('#send-postcard').click();
    await expect(page.locator('html')).toHaveAttribute('data-sent', 'true');
    await expect(page.locator('#send-status')).toContainText('已保存在本次浏览状态中');
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(evidence, '03-desktop-postcard-sent.png') });
  });

  test('390px mobile keeps the tuning journey visible and operable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect.poll(() => page.evaluate(() => window.__auroraRadioPostcard?.snapshot().ready)).toBe(true);
    await page.evaluate(() => window.__auroraRadioPostcard!.setTune(.58));

    await expect(page.locator('#frequency-control')).toBeVisible();
    await expect(page.locator('#audio-toggle')).toBeVisible();
    const snapshot = await page.evaluate(() => window.__auroraRadioPostcard!.snapshot());
    expect(snapshot.horizontalOverflow).toBe(0);
    expect(snapshot.state).toBe('resonance');
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(evidence, '04-mobile-resonance.png') });
  });

  test('fallback and reduced motion preserve the full semantic journey', async ({ page }) => {
    await page.goto('/pages/v2/deliveries/aurora-radio-postcard/?fallback=1&assetFallback=1&motion=reduce&revision=r145-final');
    await expect.poll(() => page.evaluate(() => window.__auroraRadioPostcard?.snapshot().ready)).toBe(true);
    await page.evaluate(() => window.__auroraRadioPostcard!.setTune(1));
    const snapshot = await page.evaluate(() => window.__auroraRadioPostcard!.snapshot());

    expect(snapshot).toMatchObject({
      state: 'postcard',
      fallback: true,
      assetFallback: true,
      reducedMotion: true,
      horizontalOverflow: 0
    });
    await expect(page.locator('#send-postcard')).toBeEnabled();
  });
});
