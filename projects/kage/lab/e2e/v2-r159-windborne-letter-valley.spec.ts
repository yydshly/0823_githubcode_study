import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const route = '/pages/v2/deliveries/windborne-letter-valley/?quality=high&motion=full&revision=r159-review';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-deliveries', 'evidence', 'r159-windborne-letter-valley');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

test('R159 desktop journey binds generated environment, scroll, pointer and delivery', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r159Ready === 'true');
  await expect(page.locator('body')).toContainText('风把信');
  await expect(page.locator('.vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('#valley-image')).toHaveJSProperty('complete', true);
  expect(await page.locator('#valley-image').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(1600);
  await expect(page.locator('html')).toHaveAttribute('data-asset-batch-count', '1');
  await expect(page.locator('html')).toHaveAttribute('data-medium-route', 'generated-image-runtime');
  await expect(page.locator('#letter-flight')).toBeVisible();
  await page.screenshot({ path: evidence('desktop-opening.png') });

  await page.mouse.move(1320, 270);
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .55));
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--progress')) > .5);
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wind-bias')) > .3);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'crossing');
  await expect(page.locator('#stage-title')).toContainText('连续风路');
  await page.screenshot({ path: evidence('desktop-crossing.png') });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--progress')) > .93);
  await expect(page.locator('#deliver-button')).toBeEnabled();
  await page.locator('#deliver-button').click();
  await expect(page.locator('html')).toHaveAttribute('data-delivered', 'true');
  await expect(page.locator('#delivery-note')).toContainText('RIDGE 159');
  await page.screenshot({ path: evidence('desktop-delivered.png') });
  expect(runtimeErrors).toEqual([]);
});

test('R159 preserves the primary journey at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r159Ready === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#begin-button')).toBeVisible();
  await expect(page.locator('#letter-flight')).toBeVisible();
  await expect(page.locator('.route-status')).toBeVisible();
  await page.screenshot({ path: evidence('mobile-opening.png') });
});

test('R159 exposes reduced-motion and missing-image fallbacks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r159Ready === 'true');
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * .52));
  await page.waitForFunction(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--progress')) > .5);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'crossing');

  await page.locator('#valley-image').evaluate((image) => image.dispatchEvent(new Event('error')));
  await expect(page.locator('#scene')).toHaveClass(/asset-failed/);
  await expect(page.locator('.fallback-landscape')).toBeVisible();
  await expect(page.locator('#letter-flight')).toBeVisible();
});

