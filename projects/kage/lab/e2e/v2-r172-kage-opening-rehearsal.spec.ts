import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const route = '/pages/v2/deliveries/kage-opening-rehearsal/?quality=high&motion=full&revision=r172-browser-proof';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r172-kage-opening-rehearsal');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

function runtimeErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test('R172 desktop keeps one formal scene across entry, use, sound, result and continuation', async ({ page }) => {
  const errors = runtimeErrors(page);
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR172?.snapshot().asset === 'ready');
  await expect(page.locator('#opening-title')).toContainText('先排练第一幕');
  expect(await page.locator('[data-hero-asset]').evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('01-desktop-opening.png') });

  await page.locator('[data-rhythm-value="strike"]').click();
  await page.evaluate(() => window.__kageR172?.setProgress(.62));
  await page.waitForFunction(() => window.__kageR172?.snapshot().phase === 'reveal');
  await expect(page.locator('html')).toHaveAttribute('data-rhythm', 'strike');
  await expect(page.locator('#phase-title')).toContainText('显影');
  await page.locator('#listen-button').click();
  await page.waitForFunction(() => ['played', 'unavailable'].includes(window.__kageR172?.snapshot().audio ?? ''), null, { timeout: 5000 });
  await page.screenshot({ path: evidence('02-desktop-rehearsal.png') });

  await page.locator('#idea-input').fill('为创作者设计一个产品，把不确定的想法排练成值得继续开发的网页第一幕。');
  await page.evaluate(() => window.__kageR172?.setProgress(.92));
  await page.locator('#save-button').click();
  await page.waitForFunction(() => window.__kageR172?.snapshot().saved === true);
  await expect(page.locator('#result-card')).toBeVisible();
  await expect(page.locator('#result-card')).toHaveCSS('opacity', '1');
  await expect(page.locator('#rehearsal-controls')).toHaveCSS('opacity', '0');
  await expect(page.locator('#continue-action')).toHaveAttribute('href', /workbench\.html\?/);
  await expect(page.locator('#continue-action')).toHaveAttribute('href', /opening=/);
  await page.screenshot({ path: evidence('03-desktop-saved.png') });
  expect(await page.evaluate(() => window.__kageR172?.snapshot())).toMatchObject({
    phase: 'saved',
    rhythm: 'strike',
    saved: true,
    asset: 'ready',
    horizontalOverflow: false
  });
  expect(errors).toEqual([]);
});

test('R172 primary journey remains complete at 390px', async ({ page }) => {
  const errors = runtimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR172?.snapshot().asset === 'ready');
  await page.locator('[data-rhythm-value="drift"]').click();
  await page.evaluate(() => { window.__kageR172?.setProgress(.9); window.__kageR172?.save(); });
  await page.waitForFunction(() => window.__kageR172?.snapshot().saved === true);
  await expect(page.locator('#result-title')).toBeVisible();
  await expect(page.locator('#result-card')).toHaveCSS('opacity', '1');
  await expect(page.locator('#rehearsal-controls')).toHaveCSS('opacity', '0');
  await expect(page.locator('#continue-action')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('04-mobile-saved.png') });
  expect(errors).toEqual([]);
});

test('R172 supports keyboard progress and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR172?.snapshot().asset === 'ready');
  await page.locator('body').click({ position: { x: 1100, y: 160 } });
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.__kageR172?.snapshot().phase === 'ready');
  expect(await page.evaluate(() => window.__kageR172?.snapshot())).toMatchObject({ reducedMotion: true, horizontalOverflow: false });
});

test('R172 preserves the product path when the generated stage asset is blocked', async ({ page }) => {
  await page.route('**/kage-opening-rehearsal-v1.png', (route) => route.abort());
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR172?.snapshot().asset === 'fallback');
  await expect(page.locator('#idea-input')).toBeVisible();
  await page.evaluate(() => { window.__kageR172?.setProgress(.9); window.__kageR172?.save(); });
  await expect(page.locator('#continue-action')).toBeVisible();
});

test('R172 is exposed as a formal product with the exact final identity', async ({ page }) => {
  await page.goto('/pages/v2/?revision=r172-formal-product#formal-products', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.formalProductArchiveReady === 'true');
  const product = page.locator('[data-formal-product-id="kage-opening-rehearsal"]');
  await expect(product).toHaveAttribute('data-run-id', 'direct-r172-kage-opening-rehearsal');
  await expect(product).toHaveAttribute('data-bundle-hash', 'd5d93376479ef04505e20537cf2262315bac7f93bc0f3d1029b6b310211a9969');
  await expect(product).toHaveAttribute('href', '/pages/v2/deliveries/kage-opening-rehearsal/');
  const cover = page.getByRole('img', { name: 'KAGE 开场排练室通过最终浏览器验收的桌面开场' });
  await expect(cover).toHaveJSProperty('complete', true);
  expect(await cover.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1000);
});
