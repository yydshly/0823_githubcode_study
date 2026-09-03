import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const route = '/pages/v2/deliveries/kage-feeling-lens/?quality=high&motion=full&revision=r169-browser-proof';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-deliveries', 'evidence', 'r169-kage-feeling-lens');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

function captureRuntimeErrors(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('R169 desktop product journey links feeling, scene, result and continuation', async ({ page }) => {
  const errors = captureRuntimeErrors(page);
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'ready');
  await expect(page.locator('#opening-title')).toContainText('先看见它的感受');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.locator('[data-hero-asset]').evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1600);
  await page.screenshot({ path: evidence('01-desktop-opening.png') });

  await page.locator('#idea-input').fill('为一款帮助人保存灵感瞬间的产品设计网页，希望像一束光逐渐找到方向。');
  await page.locator('[data-emotion-value="awake"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-emotion', 'awake');
  await expect(page.locator('#scene-response')).toContainText('冷暖折射');
  await page.evaluate(() => window.__kageR169?.setProgress(0.46));
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'feeling');
  await page.screenshot({ path: evidence('02-desktop-feeling.png') });

  await page.locator('#form-direction').click();
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'formed');
  await page.waitForFunction(() => {
    const box = document.querySelector('#formation-title')?.getBoundingClientRect();
    return Boolean(box && box.top >= 0 && box.bottom <= innerHeight);
  });
  await expect(page.locator('#formation-title')).toContainText('产品的回应');
  await expect(page.locator('#continue-action')).toHaveAttribute('href', /workbench\.html\?/);
  await expect(page.locator('#continue-action')).toHaveAttribute('href', /direction=/);
  await page.screenshot({ path: evidence('03-desktop-formed.png') });
  expect(await page.evaluate(() => window.__kageR169?.snapshot())).toMatchObject({
    phase: 'formed',
    emotion: 'awake',
    asset: 'ready',
    horizontalOverflow: false
  });
  expect(errors).toEqual([]);
});

test('R169 keeps its product journey usable at 390px', async ({ page }) => {
  const errors = captureRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'ready');
  await expect(page.locator('#opening-title')).toBeVisible();
  await page.screenshot({ path: evidence('04-mobile-opening.png') });
  await page.evaluate(() => window.__kageR169?.setProgress(0.4));
  await page.locator('[data-emotion-value="open"]').click();
  await page.locator('#form-direction').click();
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'formed');
  await page.waitForFunction(() => {
    const box = document.querySelector('#formation-title')?.getBoundingClientRect();
    return Boolean(box && box.top >= 0 && box.bottom <= innerHeight);
  });
  await expect(page.locator('#continue-action')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('05-mobile-formed.png') });
  expect(errors).toEqual([]);
});

test('R169 supports keyboard progress and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'ready');
  await page.locator('[data-emotion-value="near"]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'formed');
  const snapshot = await page.evaluate(() => window.__kageR169?.snapshot());
  expect(snapshot).toMatchObject({ phase: 'formed', reducedMotion: true, horizontalOverflow: false });
});

test('R169 keeps the product path readable when the formal asset is blocked', async ({ page }) => {
  await page.route('**/kage-paper-light-world-v1.png', (route) => route.abort());
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'fallback');
  await expect(page.locator('#opening-title')).toBeVisible();
  await page.locator('#form-direction').click();
  await expect(page.locator('#continue-action')).toBeVisible();
});

test('R169 is exposed by the V2 formal product archive with its final identity', async ({ page }) => {
  await page.goto('/pages/v2/?revision=r169-formal-product', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.formalProductArchiveReady === 'true');
  const product = page.locator('[data-formal-product-id="kage-feeling-lens"]');
  await expect(product).toHaveAttribute('data-run-id', 'direct-r169-kage-feeling-lens');
  await expect(product).toHaveAttribute('data-bundle-hash', '08472f8b9d36229381e9a71af98f636a9236f56b541f7af3753f03886e9b7550');
  await expect(product).toHaveAttribute('href', '/pages/v2/deliveries/kage-feeling-lens/');
  const cover = page.getByRole('img', { name: 'KAGE 感受取景器通过最终浏览器验收的桌面开场' });
  await cover.scrollIntoViewIfNeeded();
  await expect(cover).toHaveJSProperty('complete', true);
  expect(await cover.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1000);
});
