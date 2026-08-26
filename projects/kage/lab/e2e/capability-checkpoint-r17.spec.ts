import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/workbench.html?provider=local&quality=balanced');
  await page.evaluate(() => {
    Object.keys(localStorage).filter((key) => key.startsWith('signal-lab:checkpoint:v1:')).forEach((key) => localStorage.removeItem(key));
  });
  await page.reload();
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
});

test('saves the selected runnable capability and reopens it without a model call', async ({ page }) => {
  const save = page.locator('#save-capability-button');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.locator('#saved-capabilities-count')).toHaveText('1');
  await expect(page.locator('#workbench-status')).toContainText('当前能力已保存');

  await page.locator('#saved-capabilities-button').click();
  const dialog = page.locator('#saved-capabilities-dialog');
  await expect(dialog).toBeVisible();
  const resultLink = dialog.getByRole('link', { name: '打开保存结果' });
  await expect(resultLink).toHaveAttribute('href', /generated=/);
  await expect(dialog.getByRole('link', { name: '以此继续生成' })).toHaveAttribute('href', /brief=/);

  await dialog.getByRole('button', { name: '删除记录' }).click();
  await expect(dialog).toContainText('还没有保存的能力');
  await expect(page.locator('#saved-capabilities-count')).toHaveText('0');
});

test('keeps the saved capability dialog usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#save-capability-button').click();
  await page.locator('#saved-capabilities-button').click();
  const dialog = page.locator('#saved-capabilities-dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await expect(dialog.getByRole('link', { name: '打开保存结果' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '删除记录' })).toBeVisible();
});
