import path from 'node:path';
import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __kageV2Research?: {
      snapshot: () => {
        total: number;
        visible: number;
        selectedId: string | null;
        productionRecipes: number;
        researchTracks: number;
        activeTrackId: string | null;
        completedTracks: number;
        githubExemplars: number;
        externalProductStudies: number;
        externalImplementationStudies: number;
        externalReferenceReady: number;
      };
    };
  }
}

test('V2 research library exposes evidence, filters and bounded synthesis', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/pages/v2/research/');
  await page.waitForFunction(() => document.documentElement.dataset.v2ResearchReady === 'true');

  expect(await page.evaluate(() => window.__kageV2Research?.snapshot())).toEqual({
    total: 34,
    visible: 34,
    selectedId: 'scroll-landing',
    productionRecipes: 1,
    researchTracks: 4,
    activeTrackId: 'external-excellence-canon',
    completedTracks: 2,
    githubExemplars: 1,
    externalProductStudies: 6,
    externalImplementationStudies: 6,
    externalReferenceReady: 0
  });
  await expect(page.locator('#external-product-research')).toContainText('先观察体验转变');
  await expect(page.locator('.external-study-card')).toHaveCount(6);
  await expect(page.locator('.implementation-study-card')).toHaveCount(6);
  await expect(page.locator('.implementation-study-card[data-role="mechanism-only"]')).toHaveCount(2);
  await expect(page.locator('#external-ready-count')).toHaveText('0');
  await expect(page.locator('.research-track-card[data-status="active"]')).toHaveCount(1);
  await expect(page.locator('.research-track-card[data-status="active"]')).toContainText('外部优秀认知基线');
  const completedTracks = page.locator('.research-track-card[data-status="completed"]');
  await expect(completedTracks).toHaveCount(2);
  await expect(completedTracks.filter({ hasText: '交互即信息' })).toContainText('触摸和键盘');
  await expect(completedTracks.filter({ hasText: '交互即信息' }).locator('.track-stop')).toContainText('hover');
  await expect(completedTracks.filter({ hasText: '身份与证据' })).toContainText('Identity Through Evidence');
  await expect(page.locator('.next-step')).toContainText('尚未成为作者输入');
  await expect(page.locator('#case-detail')).not.toContainText('禁止从预览外观推断技术栈');
  await expect(page.locator('#case-detail')).toContainText('0.12 插值平滑');
  await expect(page.locator('.recipe-card[data-state="validated"]')).toHaveCount(1);
  await expect(page.locator('.principle-card[data-state="research-target"]')).toHaveCount(3);

  await page.locator('.historical-archive > summary').click();
  await page.locator('#cluster-filter').selectOption('pointer-field');
  const filtered = await page.evaluate(() => window.__kageV2Research?.snapshot());
  expect(filtered?.visible).toBeGreaterThan(0);
  expect(filtered?.visible).toBeLessThan(34);
  await expect(page.locator('#case-detail')).toContainText('当前没有足够实现证据');

  await page.screenshot({
    path: path.resolve(import.meta.dirname, '../docs/screenshots/v2-research-desktop.png'),
    fullPage: true,
    animations: 'disabled'
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.v2ResearchReady === 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await page.screenshot({
    path: path.resolve(import.meta.dirname, '../docs/screenshots/v2-research-mobile.png'),
    fullPage: true,
    animations: 'disabled'
  });

  expect(errors).toEqual([]);
});
