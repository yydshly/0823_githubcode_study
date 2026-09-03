import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const route = '/pages/v2/deliveries/kage-creative-director/?quality=high&motion=full&revision=r162-review';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-deliveries', 'evidence', 'r162-kage-creative-director');

function evidence(name: string) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

test('R162 desktop journey moves from product entry to a real reference result and continuation', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r162Ready === 'true');
  await expect(page.locator('html')).toHaveAttribute('data-asset-policy', 'formal-source-assets');
  await expect(page.locator('html')).toHaveAttribute('data-product-journey', 'entry-use-result-continuation');
  await expect(page.locator('#hero-title')).toContainText('成为一个世界');
  await expect(page.locator('#idea-input')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const image of await page.locator('img').all()) {
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(800);
  }
  await page.screenshot({ path: evidence('desktop-opening.png'), fullPage: false });

  await page.locator('#idea-input').fill('为独立音乐人设计一个能听见作品层次变化的发布网页。');
  await page.locator('#idea-form button[type="submit"]').click();
  await page.waitForFunction(() => window.__kageR162?.snapshot().selectedDirection === 'sound');
  await expect(page.locator('[data-direction="sound"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stage-medium')).toContainText('真实声音');
  await expect(page.locator('#result-status')).toContainText('优先推荐方向 02');
  await page.screenshot({ path: evidence('desktop-use.png'), fullPage: false });

  await page.locator('[data-direction="place"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__kageR162?.snapshot().selectedDirection === 'place');
  await expect(page.locator('html')).toHaveAttribute('data-phase', 'result');
  await expect(page.locator('#result-title')).toContainText('给出一条路');
  await expect(page.locator('#result-image')).toHaveAttribute('src', /west-bund-meeting-points\.png/);
  await expect(page.locator('#case-link')).toHaveAttribute('href', '../west-bund-meeting-points/');
  const continuation = await page.locator('#continue-link').getAttribute('href');
  expect(continuation).toContain('workbench.html');
  expect(continuation).toContain('source=r162-product-direction');
  expect(continuation).toContain('brief=');
  await page.waitForFunction(() => Math.abs(document.querySelector('#result')?.getBoundingClientRect().top ?? 999) < 4);
  await page.screenshot({ path: evidence('desktop-result.png'), fullPage: false });

  const snapshot = await page.evaluate(() => window.__kageR162?.snapshot());
  expect(snapshot).toMatchObject({
    phase: 'result',
    selectedDirection: 'place',
    assetErrors: 0,
    continuationReady: true
  });
  expect(runtimeErrors).toEqual([]);
});

test('R162 preserves the complete product path at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r162Ready === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('#hero-title')).toBeVisible();
  await page.screenshot({ path: evidence('mobile-opening.png'), fullPage: false });

  await page.locator('#idea-input').fill('为城市文化地点设计一张真实地图和行动路线网页。');
  await page.locator('#idea-form button[type="submit"]').click();
  await page.waitForFunction(() => window.__kageR162?.snapshot().selectedDirection === 'place');
  await page.locator('[data-direction="place"]').click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#result')?.getBoundingClientRect().top ?? 999) < 4);
  await expect(page.locator('#result-title')).toBeVisible();
  await expect(page.locator('#case-link')).toBeVisible();
  await expect(page.locator('#continue-link')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: evidence('mobile-result.png'), fullPage: false });
});

test('R162 keeps the product journey operable with reduced motion and keyboard input', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.r162Ready === 'true');
  await page.locator('#idea-input').focus();
  await page.locator('#idea-input').fill('为一件会展开的手工产品设计网页。');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.dataset.phase !== 'entry');
  await page.locator('[data-direction="light"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__kageR162?.snapshot().selectedDirection === 'light');
  await expect(page.locator('#case-link')).toBeVisible();
  await expect(page.locator('#continue-link')).toBeVisible();
});

test('V2 homepage exposes R162 in the formal product archive, separate from research references', async ({ page }) => {
  await page.goto('/pages/v2/?revision=r162-formal-product', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.formalProductArchiveReady === 'true');
  expect(Number(await page.locator('html').getAttribute('data-formal-product-archive-count'))).toBeGreaterThanOrEqual(2);
  const product = page.locator('[data-formal-product-id="kage-creative-director"]');
  await expect(product).toHaveAttribute('data-run-id', 'direct-r162-kage-creative-director');
  await expect(product).toHaveAttribute('data-bundle-hash', 'cca916f2df90b7d6d2d069efac826649399faaa31f9be34aaa338bcd7ea672bd');
  await expect(product).toHaveAttribute('href', '/pages/v2/deliveries/kage-creative-director/');
  const cover = page.getByRole('img', { name: 'KAGE 创意导演通过最终浏览器验收的桌面开场' });
  await cover.scrollIntoViewIfNeeded();
  await expect(cover).toHaveJSProperty('complete', true);
  expect(await cover.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1000);

  const rainlight = page.locator('[data-formal-product-id="rainlight-walk-recorder"]');
  await expect(rainlight).toHaveAttribute('data-run-id', 'direct-r163-rainlight-walk-recorder');
  await expect(rainlight).toHaveAttribute('href', '/pages/v2/deliveries/rainlight-walk-recorder/');
  const rainlightCover = page.getByRole('img', { name: '雨光夜行记录器通过最终浏览器验收的桌面开场' });
  await rainlightCover.scrollIntoViewIfNeeded();
  await expect(rainlightCover).toHaveJSProperty('complete', true);
  expect(await rainlightCover.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1000);
});
