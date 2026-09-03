import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const route = '/pages/v2/deliveries/rainlight-walk-recorder/?quality=high&motion=full&revision=r163-review';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-deliveries', 'evidence', 'r163-rainlight-walk-recorder');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

test('R163 desktop product journey connects writing, wheel progress, result, and save', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r163Ready === 'true');
  await expect(page.locator('html')).toHaveAttribute('data-asset', 'loaded');
  await expect(page.locator('html')).toHaveAttribute('data-canvas', 'available');
  await expect(page.locator('#hero-title')).toContainText('走成一封光的信');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('desktop-entry.png'), fullPage: false });

  await page.locator('#place-input').fill('银杏路口的旧书店');
  await page.locator('#note-input').fill('回家的路被雨洗亮以后，我终于听见了自己的脚步。');
  await page.locator('input[value="steady"]').check();
  await page.locator('#walk-form button[type="submit"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'walking');
  await page.mouse.wheel(0, 460);
  await page.waitForFunction(() => (window.__rainlightR163?.snapshot().progress ?? 0) > .35);
  const midSnapshot = await page.evaluate(() => window.__rainlightR163?.snapshot());
  expect(midSnapshot?.progress).toBeGreaterThan(.35);
  expect(midSnapshot?.progress).toBeLessThan(.8);
  await page.screenshot({ path: evidence('desktop-walking.png'), fullPage: false });

  await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => window.__rainlightR163?.snapshot().phase === 'complete');
  await expect(page.locator('#letter-note')).toContainText('听见了自己的脚步');
  await expect(page.locator('#letter-place')).toContainText('银杏路口的旧书店');
  await page.locator('#save-letter').click();
  await expect(page.locator('html')).toHaveAttribute('data-saved', 'true');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kage-r163-rainlight-letter') || '{}'));
  expect(stored).toMatchObject({ place: '银杏路口的旧书店', pace: 'steady' });
  await page.screenshot({ path: evidence('desktop-saved.png'), fullPage: false });
  expect(runtimeErrors).toEqual([]);
});

test('R163 preserves the complete journey at 390px with direct dragging', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r163Ready === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#walk-form')).toBeVisible();
  await page.screenshot({ path: evidence('mobile-entry.png'), fullPage: false });

  await page.locator('#place-input').fill('河堤尽头');
  await page.locator('#note-input').fill('今晚的雨让我慢下来。');
  await page.locator('#walk-form button[type="submit"]').click();
  const surface = await page.locator('#drag-surface').boundingBox();
  if (!surface) throw new Error('Drag surface is unavailable.');
  await page.mouse.move(surface.x + 20, surface.y + surface.height * .6);
  await page.mouse.down();
  await page.mouse.move(surface.x + surface.width - 1, surface.y + surface.height * .6, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__rainlightR163?.snapshot().phase === 'complete');
  await page.waitForTimeout(800);
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#save-letter')).toBeVisible();
  await expect(page.locator('#edit-letter')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('mobile-result.png'), fullPage: false });
});

test('R163 remains keyboard-operable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r163Ready === 'true');
  await page.locator('#place-input').fill('雨棚下面');
  await page.locator('#walk-form button[type="submit"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#drag-surface').focus();
  await page.keyboard.press('End');
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'complete');
  await page.locator('#save-letter').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'saved');
});

test('R163 keeps the product journey usable when the generated scene cannot load', async ({ page }) => {
  await page.route('**/rainlight-street-v1.png', (request) => request.abort());
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.r163Ready === 'true');
  await page.waitForFunction(() => window.__rainlightR163?.snapshot().assetFallback === true);
  await expect(page.locator('html')).toHaveAttribute('data-asset', 'fallback');
  await page.locator('#walk-form button[type="submit"]').click();
  await page.locator('#drag-surface').focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(800);
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#save-letter')).toBeVisible();
  await page.screenshot({ path: evidence('desktop-asset-fallback.png'), fullPage: false });
});
