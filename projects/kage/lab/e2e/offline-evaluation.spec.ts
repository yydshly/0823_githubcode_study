import { expect, test } from '@playwright/test';

async function waitForWorkbench(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as Window & { __creativeLab?: { snapshot: () => { state: string } } }).__creativeLab?.snapshot().state === 'ready');
}

test('creates honest offline evaluation and revision artifacts without an API', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-engineering-actions summary').click();

  await expect(page.getByRole('button', { name: '生成离线评审' })).toBeVisible();
  await page.getByRole('button', { name: '生成离线评审' }).click();
  const snapshot = await page.evaluate(() => (window as Window & {
    __creativeLab?: { snapshot: () => { evaluation: { state: string; reportId: string | null; status: string | null; revisionPlanId: string | null; manualChecks: number; blockingChecks: number } } }
  }).__creativeLab!.snapshot());

  expect(snapshot.evaluation).toMatchObject({ state: 'ready', status: 'needs-review', blockingChecks: 0 });
  expect(snapshot.evaluation.reportId).toMatch(/^evaluation-/);
  expect(snapshot.evaluation.revisionPlanId).toMatch(/^revision-/);
  expect(snapshot.evaluation.manualChecks).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole('status')).toContainText('未调用视觉模型');

  await page.getByRole('button', { name: '检查 EvaluationReport' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#manifest-title')).toHaveText('EvaluationReport v1');
  await expect(page.locator('#manifest-json')).toContainText('"visionUsed": false');
  await expect(page.locator('#manifest-json')).toContainText('manual-required');
  await expect(page.locator('#manifest-json')).toContainText('visual-composition');
  await page.getByRole('button', { name: '关闭生成产物' }).click();

  await page.getByRole('button', { name: '检查 RevisionPlan' }).click();
  await expect(page.locator('#manifest-title')).toHaveText('RevisionPlan v1');
  await expect(page.locator('#manifest-json')).toContainText('browser-evidence');
  await expect(page.locator('#manifest-json')).toContainText('"regeneration": "none"');
  await expect(page.locator('#manifest-json')).toContainText('保留核心记忆点');
  await page.getByRole('button', { name: '关闭生成产物' }).click();

  await expect(page.getByRole('link', { name: '打开 Three.js 实际预览' })).toBeVisible();
});

test('keeps the no-API quality gate usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-engineering-actions summary').click();
  await page.getByRole('button', { name: '生成离线评审' }).click();

  await expect(page.getByRole('button', { name: '检查 EvaluationReport' })).toBeVisible();
  await expect(page.getByRole('button', { name: '检查 RevisionPlan' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.screenshot({ path: 'docs/screenshots/phase9-offline-evaluation-mobile.png', fullPage: true });
});
