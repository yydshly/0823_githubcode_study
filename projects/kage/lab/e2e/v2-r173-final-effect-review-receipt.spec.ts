import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const route = '/pages/v2/?revision=r173-browser-proof#effect-review-receipts';
const evidenceDir = path.resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r173-final-effect-review-receipt');
const issues = { pageErrors: [] as string[], consoleErrors: [] as string[], requestFailures: [] as string[] };

function observeRuntime(page: Page) {
  page.on('pageerror', (error) => issues.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
}

test.describe.configure({ mode: 'serial', timeout: 35_000 });

test.beforeAll(() => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const name of ['01-desktop-r172-receipt.png', '02-mobile-r163-receipt.png', 'report.json']) {
    fs.rmSync(path.join(evidenceDir, name), { force: true });
  }
});

test.afterAll(() => {
  fs.writeFileSync(path.join(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r173-final-effect-review-receipt',
    route,
    browser: 'local Chrome via Playwright',
    checks: ['four-current-identities', 'title-run-hash-lookup', 'empty-recovery', 'desktop-receipt', 'mobile-390-receipt'],
    issues,
    complete: issues.pageErrors.length === 0 && issues.consoleErrors.length === 0 && issues.requestFailures.length === 0
  }, null, 2)}\n`, 'utf8');
});

test('R173 exposes a current R172 receipt and supports bounded artifact lookup', async ({ page }) => {
  observeRuntime(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.effectReviewReceiptReady === 'true');
  expect(await page.evaluate(() => window.__kageV2?.snapshot().effectReviewReceiptCount)).toBe(4);
  await expect(page.locator('#review-receipt-name')).toHaveText('KAGE 开场排练室');
  await expect(page.locator('#review-receipt-score')).toHaveText('93 / 100');
  await expect(page.locator('#review-receipt-open')).toHaveAttribute('data-run-id', 'direct-r172-kage-opening-rehearsal');
  await expect(page.locator('#review-receipt-open')).toHaveAttribute('data-bundle-hash', 'd5d93376479ef04505e20537cf2262315bac7f93bc0f3d1029b6b310211a9969');
  expect(await page.locator('#review-receipt-image').evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(1000);

  const query = page.locator('#review-receipt-query');
  await query.fill('direct-r169');
  await expect(page.locator('#review-receipt-name')).toHaveText('KAGE 感受取景器');
  await query.fill('不存在的产物');
  await expect(page.locator('.review-receipt-empty')).toBeVisible();
  await expect(page.locator('.review-receipt-detail')).toBeHidden();
  await query.fill('开场排练室');
  await expect(page.locator('#review-receipt-name')).toHaveText('KAGE 开场排练室');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#effect-review-receipts').screenshot({ path: path.join(evidenceDir, '01-desktop-r172-receipt.png') });
});

test('R173 remains readable and operable at 390px', async ({ page }) => {
  observeRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.effectReviewReceiptReady === 'true');
  await page.locator('#review-receipt-query').fill('雨光夜行');
  await expect(page.locator('#review-receipt-name')).toHaveText('雨光夜行记录器');
  await expect(page.locator('#review-receipt-open')).toBeVisible();
  await expect(page.locator('#review-receipt-mobile')).toHaveText('通过');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#effect-review-receipts').screenshot({ path: path.join(evidenceDir, '02-mobile-r163-receipt.png') });
});

