import path from 'node:path';
import { expect, test } from '@playwright/test';

test('capture chromatic tide visual evidence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/?experience=chromatic-tide&quality=balanced&node=fold');
  await expect(page.locator('#fold')).toBeInViewport();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(import.meta.dirname, '../docs/screenshots/phase1-chromatic-tide.png'), animations: 'disabled' });
  expect(errors).toEqual([]);
});
