import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const route = '/pages/v2/deliveries/eclipse-post-office/?quality=high&motion=full&revision=r149-final';
const evidence = path.resolve('docs/v2-research/evidence/r149-eclipse-post-office');
const sourceRoot = path.resolve('pages/v2/deliveries/eclipse-post-office');
const runId = 'direct-r149-eclipse-post-office';
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'asset-manifest.json',
  'assets/eclipse-post-office-salt-flat-v1.png',
];
const observations: Record<string, unknown> = {};

async function meanPixelDelta(before: Buffer, after: Buffer): Promise<number> {
  const options = { width: 240, height: 150, fit: 'fill' as const };
  const [beforePixels, afterPixels] = await Promise.all([
    sharp(before).resize(options).removeAlpha().raw().toBuffer(),
    sharp(after).resize(options).removeAlpha().raw().toBuffer(),
  ]);
  let difference = 0;
  for (let index = 0; index < beforePixels.length; index += 1) {
    difference += Math.abs(beforePixels[index]! - afterPixels[index]!);
  }
  return difference / beforePixels.length;
}

test.beforeAll(async () => mkdir(evidence, { recursive: true }));
test.afterAll(async () => {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(path.join(sourceRoot, file)));
  }
  const bundleHash = hash.digest('hex');
  await writeFile(path.join(evidence, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r149-eclipse-post-office-runtime-observations',
    identityBinding: 'runId+asset-bound-bundleHash',
    runId,
    bundleHash,
    bundleFiles,
    revision: 'r149-final',
    complete: Object.keys(observations).length === 3,
    observations,
  }, null, 2)}\n`, 'utf8');
});

test.describe('R149 日食邮局', () => {
  test('desktop proves generated environment, wheel/drag causality, totality and save', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto(route);
    await expect.poll(() => page.evaluate(() => window.__eclipsePostOffice?.snapshot().ready)).toBe(true);
    await page.waitForTimeout(350);
    const opening = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(opening).toMatchObject({
      state: 'waiting',
      alignment: 0,
      imageLoaded: true,
      fallback: false,
      assetFallback: false,
      horizontalOverflow: 0,
      revision: 'r149-final',
    });
    expect(opening.canvasFrames).toBeGreaterThan(0);
    const openingScene = await page.locator('.scene').screenshot();
    await page.screenshot({ path: path.join(evidence, '01-desktop-opening.png') });

    await page.mouse.wheel(0, 620);
    await expect.poll(() => page.evaluate(() => window.__eclipsePostOffice!.snapshot().alignment)).toBeGreaterThan(.14);
    const afterWheel = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(afterWheel.state).toBe('approach');

    await page.evaluate(() => window.__eclipsePostOffice!.setAlignment(0));
    await page.mouse.move(510, 280);
    await page.mouse.down();
    await page.mouse.move(1060, 280, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => page.evaluate(() => window.__eclipsePostOffice!.snapshot().alignment)).toBeGreaterThan(.9);
    await expect(page.locator('html')).toHaveAttribute('data-eclipse-state', 'totality');
    await page.waitForTimeout(450);
    const totality = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(totality.coronaStrength).toBeGreaterThan(.8);
    const totalityScene = await page.locator('.scene').screenshot();
    expect(await meanPixelDelta(openingScene, totalityScene)).toBeGreaterThan(8);
    await page.screenshot({ path: path.join(evidence, '02-desktop-totality.png') });

    await expect(page.locator('#save-postcard')).toBeEnabled();
    await page.locator('#save-postcard').click();
    await expect(page.locator('html')).toHaveAttribute('data-eclipse-state', 'saved');
    await expect(page.locator('#save-status')).toContainText('已保存在本次浏览状态中');
    const saved = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(saved.saved).toBe(true);
    await page.screenshot({ path: path.join(evidence, '03-desktop-saved.png') });
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    observations.desktop = {
      opening,
      afterWheel,
      totality,
      saved,
      meanPixelDelta: await meanPixelDelta(openingScene, totalityScene),
      pageErrors,
      consoleErrors,
    };
  });

  test('390px keeps the journey operable by keyboard without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect.poll(() => page.evaluate(() => window.__eclipsePostOffice?.snapshot().ready)).toBe(true);
    await page.locator('#alignment-control').focus();
    await page.keyboard.press('End');
    await expect(page.locator('html')).toHaveAttribute('data-eclipse-state', 'totality');
    await expect(page.locator('#save-postcard')).toBeVisible();
    await expect(page.locator('#save-postcard')).toBeEnabled();
    await page.locator('#save-postcard').click();
    const snapshot = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(snapshot).toMatchObject({ state: 'saved', saved: true, horizontalOverflow: 0 });
    await page.screenshot({ path: path.join(evidence, '04-mobile-saved.png') });
    observations.mobile = { viewport: { width: 390, height: 844 }, snapshot };
  });

  test('reduced motion and dual fallback preserve the semantic completion path', async ({ page }) => {
    await page.goto('/pages/v2/deliveries/eclipse-post-office/?fallback=1&assetFallback=1&motion=reduce&revision=r149-final');
    await expect.poll(() => page.evaluate(() => window.__eclipsePostOffice?.snapshot().ready)).toBe(true);
    await page.evaluate(() => window.__eclipsePostOffice!.setAlignment(1));
    await page.locator('#save-postcard').click();
    const snapshot = await page.evaluate(() => window.__eclipsePostOffice!.snapshot());
    expect(snapshot).toMatchObject({
      state: 'saved',
      alignment: 1,
      fallback: true,
      assetFallback: true,
      reducedMotion: true,
      saved: true,
      horizontalOverflow: 0,
    });
    await expect(page.locator('#save-status')).toContainText('已保存在本次浏览状态中');
    observations.fallback = { snapshot };
  });
});
