import { expect, test } from '@playwright/test';

const archiveUrl = process.env.KAGE_ARCHIVE_URL
  ?? 'http://127.0.0.1:8148/projects/kage/archive/';

test('KAGE independent research archive is complete and usable', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().startsWith(archiveUrl)) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(archiveUrl, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /归档/ })).toBeVisible();
  await expect(page.locator('[data-stat="researchDocs"]')).toHaveText('151');
  await expect(page.locator('[data-stat="deliveries"]')).toHaveText('35');
  await expect(page.locator('[data-stat="evidenceRuns"]')).toHaveText('33');
  await expect(page.locator('#case-catalog .case-row')).toHaveCount(35);
  await expect(page.locator('#document-list .document-row')).toHaveCount(151);
  await expect(page.locator('#featured-cases .featured-card')).toHaveCount(9);

  await page.locator('#featured-cases').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('#featured-cases img')).every((image) => (
    image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
  )));
  const unloaded = await page.locator('#featured-cases img').evaluateAll((images) => images.filter((image) => (
    !(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth === 0
  )).length);
  expect(unloaded).toBe(0);

  await page.locator('#case-filter').selectOption('formal');
  await expect(page.locator('#case-catalog .case-row')).toHaveCount(4);
  await page.locator('#case-filter').selectOption('all');
  await page.locator('#case-search').fill('声音');
  expect(await page.locator('#case-catalog .case-row').count()).toBeGreaterThan(2);
  await page.locator('#doc-search').fill('MOTIONSITES');
  expect(await page.locator('#document-list .document-row').count()).toBeGreaterThanOrEqual(5);
  expect(failures).toEqual([]);
});

test('KAGE research archive works at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(archiveUrl, { waitUntil: 'networkidle' });
  await expect(page.locator('#featured-cases .featured-card').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.locator('#case-search').fill('路线');
  expect(await page.locator('#case-catalog .case-row').count()).toBeGreaterThan(0);
});
