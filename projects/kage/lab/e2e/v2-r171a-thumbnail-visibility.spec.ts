import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'v2-research', 'evidence', 'r171a-thumbnail-visibility');
const captures = ['01-desktop-archive.png', '02-mobile-archive.png'] as const;

function observeRuntime(page: Page) {
  const issues = { pageErrors: [] as string[], consoleErrors: [] as string[], requestFailures: [] as string[] };
  page.on('pageerror', (error) => issues.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
  return issues;
}

async function expectVisibleArchiveHealthy(page: Page) {
  const hiddenCards = page.locator('.verified-example-card[hidden]');
  expect(await hiddenCards.count()).toBeGreaterThan(0);
  expect(await hiddenCards.evaluateAll((cards) => cards.every((card) => getComputedStyle(card).display === 'none'))).toBe(true);

  const visibleCards = page.locator('.verified-example-card:not([hidden])');
  const visibleImages = visibleCards.locator('img');
  await expect(visibleCards).toHaveCount(12);
  await visibleImages.evaluateAll((images) => {
    images.forEach((image) => {
      if (image instanceof HTMLImageElement) image.loading = 'eager';
    });
  });
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>('.verified-example-card:not([hidden]) img'))
    .every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 12_000 });
  expect(await visibleImages.evaluateAll((images) => images.every((image) => {
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.describe.configure({ mode: 'serial', timeout: 45_000 });

test.beforeAll(() => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const capture of captures) fs.rmSync(path.join(evidenceDir, capture), { force: true });
  fs.rmSync(path.join(evidenceDir, 'report.json'), { force: true });
});

test('R171A hides retired cards and renders only the bounded archive', async ({ page }) => {
  const issues = observeRuntime(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pages/v2/?revision=r171a-thumbnail-visibility#verified-examples', { waitUntil: 'networkidle' });
  await expectVisibleArchiveHealthy(page);
  await page.locator('#verified-examples').screenshot({ path: path.join(evidenceDir, captures[0]) });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#verified-examples').scrollIntoViewIfNeeded();
  await expectVisibleArchiveHealthy(page);
  await page.screenshot({ path: path.join(evidenceDir, captures[1]) });

  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [] });
  fs.writeFileSync(path.join(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r171a-thumbnail-visibility',
    browser: 'local Chrome via Playwright',
    freshEvidence: true,
    steps: [
      { id: 'desktop-bounded-archive', health: 'healthy', capture: captures[0] },
      { id: 'mobile-bounded-archive', health: 'healthy', capture: captures[1] }
    ],
    assertions: {
      retiredCardsAreHidden: true,
      visibleArchiveCount: 12,
      visibleImagesDecoded: true,
      horizontalOverflow: false
    },
    issues,
    complete: true
  }, null, 2)}\n`, 'utf8');
});
