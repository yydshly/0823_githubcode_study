import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const evidence = path.resolve('docs/v2-research/evidence/r151-selection-run-guard');

test.beforeAll(async () => mkdir(evidence, { recursive: true }));

test.describe('R151 selection receipt run guard', () => {
  test('desktop preserves the R151 selection guard inside the V5 product run', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/pages/v2/?revision=r151-selection-run-guard');
    await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true');

    const selection = page.locator('#effect-quality-selection');
    const guard = page.locator('#effect-selection-run-guard');
    await selection.scrollIntoViewIfNeeded();
    await expect(selection).toBeVisible();
    await expect(guard).toHaveAttribute('data-run-state', 'pending');
    await expect(page.locator('#effect-selection-run-state')).toContainText('ASSETS LOCKED');
    await expect(page.locator('#effect-selection-run-note')).toContainText('不能进入素材或构建');
    await expect(page.locator('#direct-package')).toHaveAttribute('data-protocol-version', '5');

    const state = await page.evaluate(() => ({
      snapshot: window.__kageV2?.snapshot(),
      authorPackage: window.__kageV2?.authorPackage(),
      serialized: window.__kageV2?.serializedPackage()
    }));
    expect(state.snapshot).toMatchObject({
      creativeProtocolVersion: 5,
      effectSelectionRunState: 'pending',
      effectSelectionResourcePermission: false,
      stale: false
    });
    expect(state.authorPackage?.runSeed).toMatchObject({
      creativeProtocolVersion: 5,
      effectSelectionReceipt: null,
      verdict: 'pending'
    });
    expect(state.serialized).toContain('绑定前严禁记录素材批次或构建');
    expect(errors).toEqual([]);
    await selection.screenshot({ path: path.join(evidence, '01-desktop-pending-guard.png') });

    await page.locator('#brief-input').fill('为一座会收集夜间露水的植物标本室设计网页。');
    await expect(selection).toHaveAttribute('data-state', 'stale');
    await expect(page.locator('#build-button')).toBeDisabled();
  });

  test('390px keeps the pending guard readable and the copy action reachable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/v2/?revision=r151-selection-run-guard-mobile');
    await page.waitForFunction(() => document.documentElement.dataset.v2Ready === 'true');
    const selection = page.locator('#effect-quality-selection');
    await selection.scrollIntoViewIfNeeded();
    await expect(selection).toBeVisible();
    await expect(page.locator('#effect-selection-run-guard')).toHaveAttribute('data-run-state', 'pending');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await page.locator('#copy-button').scrollIntoViewIfNeeded();
    await expect(page.locator('#copy-button')).toBeVisible();
    await expect(page.locator('#copy-button')).toBeEnabled();
    await selection.screenshot({ path: path.join(evidence, '02-mobile-pending-guard.png') });
  });
});
