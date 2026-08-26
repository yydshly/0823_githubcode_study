import path from 'node:path';
import { expect, test } from '@playwright/test';

test('capture phase-zero visual evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?experience=observatory&quality=balanced&node=resonate&debug=1');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  await expect(page.locator('#resonate')).toBeInViewport();
  await expect(page.locator('.vite-error-overlay')).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(import.meta.dirname, '../docs/screenshots/phase0-observatory.png'), animations: 'disabled' });
  expect((await page.locator('body').innerText()).trim().length).toBeGreaterThan(100);
  expect(errors).toEqual([]);

  await page.goto('/?experience=branching-lore&choice=shadow&quality=balanced&node=shadow');
  await expect(page.locator('#shadow')).toBeVisible();
  await expect(page.locator('#shadow')).toBeInViewport();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(import.meta.dirname, '../docs/screenshots/phase0-branching-shadow.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});
