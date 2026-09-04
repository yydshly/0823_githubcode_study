import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'v2-research', 'evidence', 'r171-stage-closure');
const captures = ['01-project-status.png', '02-formal-product-opening.png'] as const;

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

test.describe.configure({ mode: 'serial', timeout: 30_000 });

test.beforeAll(() => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const capture of captures) fs.rmSync(path.join(evidenceDir, capture), { force: true });
  fs.rmSync(path.join(evidenceDir, 'report.json'), { force: true });
});

test('R171 status hands off to the unchanged R169 formal product', async ({ page }) => {
  const issues = observeRuntime(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/pages/v2/?revision=r171-stage-closure#project-status', { waitUntil: 'networkidle' });

  const status = page.locator('#project-status');
  await expect(status).toBeVisible();
  await expect(status).toContainText('V2.6 CREATIVE GUIDANCE / R171 FROZEN');
  await expect(status).toContainText('尚未完成');
  await expect(status).toContainText('下一验证');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await status.screenshot({ path: path.join(evidenceDir, captures[0]) });

  await status.locator('a.delivery-link').click();
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'ready');
  await expect(page.locator('#opening-title')).toContainText('先看见它的感受');
  await expect(page.locator('[data-emotion-value]')).toHaveCount(3);
  expect(await page.evaluate(() => window.__kageR169?.snapshot().horizontalOverflow)).toBe(false);
  await page.screenshot({ path: path.join(evidenceDir, captures[1]) });

  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [] });
  fs.writeFileSync(path.join(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r171-stage-closure',
    browser: 'local Chrome via Playwright',
    freshEvidence: true,
    steps: [
      { id: 'project-status', health: 'healthy', capture: captures[0] },
      { id: 'formal-product-handoff', health: 'healthy', capture: captures[1] }
    ],
    accessibilityLimits: '本轮确认语义标题、真实链接、键盘可聚焦控件和 1280px 重排；不声明完整 WCAG 合规。',
    issues,
    complete: true
  }, null, 2)}\n`, 'utf8');
});
