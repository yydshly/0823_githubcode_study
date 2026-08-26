import path from 'node:path';
import { expect, test } from '@playwright/test';

test('capture workbench desktop and mobile visual evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await expect(page.locator('.wb-candidate')).toHaveCount(3);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(import.meta.dirname, '../docs/screenshots/phase2-workbench-desktop.png'), animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await page.locator('.wb-results-heading').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.resolve(import.meta.dirname, '../docs/screenshots/phase2-workbench-mobile.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});

declare global {
  interface Window { __creativeLab?: { snapshot: () => { state: string } } }
}
