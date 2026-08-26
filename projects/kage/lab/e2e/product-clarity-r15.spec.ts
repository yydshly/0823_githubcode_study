import { expect, test } from '@playwright/test';

type ClarityWindow = Window & { __creativeLab?: { snapshot: () => { state: string; requestedProvider: string } } };

test('does not present the automatic bootstrap draft as a generated result', async ({ page }) => {
  await page.goto('/workbench.html?provider=auto');
  await page.waitForFunction(() => (window as ClarityWindow).__creativeLab?.snapshot().state === 'ready');
  await expect(page.locator('body')).toHaveAttribute('data-product-awaiting', 'true');
  await expect(page.locator('body')).toHaveAttribute('data-product-state', 'idle');
  await expect(page.getByRole('heading', { name: '先生成，再判断质量' })).toBeVisible();
  await expect(page.locator('.wb-generation-source')).toHaveText('WAITING / CLICK GENERATE');
  await expect(page.locator('#creative-stage-frame')).toHaveAttribute('src', 'about:blank');
  await expect(page.locator('#selection-detail')).toBeHidden();
  await expect(page.locator('.wb-sample-link')).toHaveCount(2);
});

test('reveals a result only after an explicit generation request', async ({ page }) => {
  await page.goto('/workbench.html?provider=auto');
  await page.waitForFunction(() => (window as ClarityWindow).__creativeLab?.snapshot().state === 'ready');
  await page.getByText('生成偏好', { exact: true }).click();
  await page.locator('#provider').selectOption('local');
  await page.getByRole('button', { name: '用本地基线生成' }).click();
  await page.waitForFunction(() => document.querySelector('#creative-stage-frame')?.classList.contains('is-ready'));
  await expect(page.locator('body')).toHaveAttribute('data-product-awaiting', 'false');
  await expect(page.locator('.wb-generation-source')).toHaveText('LOCAL DRAFT');
  await expect(page.getByRole('heading', { name: '本地草案已生成' })).toBeVisible();
  await expect(page.locator('#selection-detail')).toBeVisible();
  await expect(page.locator('#creative-stage-frame')).toHaveAttribute('src', /generated=/);
});
