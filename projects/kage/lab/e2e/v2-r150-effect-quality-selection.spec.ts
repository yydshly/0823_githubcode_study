import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const evidence = path.resolve('docs/v2-research/evidence/r150-effect-quality-selection');

test.beforeAll(async () => mkdir(evidence, { recursive: true }));

test.describe('R150 effect quality selection gate', () => {
  test('desktop exposes goal-first comparison before bounded build', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/pages/v2/?revision=r150-effect-quality-selection');
    await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true');

    const card = page.locator('#effect-quality-selection');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#effect-selection-count')).toContainText('3 个真正不同的方向');
    await expect(page.locator('#effect-selection-axes')).toContainText('主题记忆');
    await expect(page.locator('#effect-selection-axes')).toContainText('行动收束');
    await expect(page.locator('#effect-selection-no-bonus')).toContainText('技术数量');
    await expect(page.locator('#effect-selection-stop')).toContainText('素材前停止');

    const snapshot = await page.evaluate(() => window.__kageV2?.snapshot());
    expect(snapshot).toMatchObject({
      effectSelectionPosition: 'before-resources-and-code',
      effectCandidateCount: 3,
      techniqueCountScored: false,
      stale: false
    });
    const authorPackage = await page.evaluate(() => window.__kageV2?.authorPackage());
    expect(authorPackage?.authoringInput.creativeDirection.effectFirst.openExploration.qualitySelection)
      .toEqual({
        rule: 'goal-fit-with-no-rejection',
        fail: 'stop-before-assets',
        proof: 'browser-final'
      });
    expect(errors).toEqual([]);
    await card.screenshot({ path: path.join(evidence, '01-desktop-selection-gate.png') });

    await page.locator('#brief-input').fill('为一座会随潮汐展开的纸艺海岸档案馆设计网页，最后保存一条潮线证词。');
    await expect(card).toHaveAttribute('data-state', 'stale');
    await page.locator('#plan-button').click();
    await expect(card).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#effect-selection-goal')).toContainText('潮');
  });

  test('390px keeps the selection explanation readable without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/v2/?revision=r150-effect-quality-selection-mobile');
    await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true');
    const card = page.locator('#effect-quality-selection');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card.locator('.effect-quality-grid > div')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await card.screenshot({ path: path.join(evidence, '02-mobile-selection-gate.png') });
  });
});
