import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const route = '/pages/v2/deliveries/lighthouse-chart-reveal/?quality=high&motion=full&revision=r160-review';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-deliveries', 'evidence', 'r160-lighthouse-chart-reveal');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

async function revealAt(page: Page, x: number, y: number) {
  const shell = page.locator('#chart-shell');
  const box = await shell.boundingBox();
  if (!box) throw new Error('chart shell is not measurable');
  await page.mouse.click(box.x + box.width * (x / 1200), box.y + box.height * (y / 760));
}

test('R160 pointer reveal connects three real discoveries and saves the fictional route', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r160Ready === 'true');
  await expect(page.locator('html')).toHaveAttribute('data-medium-route', 'svg-mask-canvas-runtime');
  await expect(page.locator('html')).toHaveAttribute('data-asset-batch-count', '0');
  await expect(page.locator('#chart-shell')).toBeVisible();
  await expect(page.locator('#found-count')).toHaveText('0 / 3');
  await page.screenshot({ path: evidence('desktop-opening.png') });

  await revealAt(page, 265, 500);
  await expect(page.locator('#found-count')).toHaveText('1 / 3');
  await revealAt(page, 610, 335);
  await expect(page.locator('#found-count')).toHaveText('2 / 3');
  await page.screenshot({ path: evidence('desktop-revealing.png') });
  await revealAt(page, 930, 255);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'route-complete');
  await expect(page.locator('#completion')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#save-route')).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: evidence('desktop-complete.png') });

  await page.locator('#save-route').click();
  await expect(page.locator('html')).toHaveAttribute('data-state', 'saved');
  await expect(page.locator('#save-route')).toContainText('已保存');
  expect(errors).toEqual([]);
});

test('R160 remains operable at 390px and exposes keyboard motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r160Ready === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#chart-shell')).toBeVisible();
  await expect(page.locator('.discovery-panel')).toBeVisible();
  await page.locator('#chart-shell').focus();
  const before = Number(await page.locator('html').getAttribute('data-light-x'));
  await page.keyboard.press('ArrowRight');
  const after = Number(await page.locator('html').getAttribute('data-light-x'));
  expect(after).toBeGreaterThan(before);
  await page.screenshot({ path: evidence('mobile-opening.png') });
  await revealAt(page, 265, 500);
  await revealAt(page, 610, 335);
  await revealAt(page, 930, 255);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'route-complete');
  await page.waitForTimeout(700);
  await page.screenshot({ path: evidence('mobile-complete.png') });
});

test('R160 reduced-motion and Canvas fallback preserve the discovery journey', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${route}&canvas=off`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r160Ready === 'true');
  await expect(page.locator('html')).toHaveAttribute('data-canvas-fallback', 'true');
  await revealAt(page, 265, 500);
  await revealAt(page, 610, 335);
  await revealAt(page, 930, 255);
  await expect(page.locator('html')).toHaveAttribute('data-state', 'route-complete');
});
