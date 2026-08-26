import { expect, test } from '@playwright/test';

type ProductWindow = Window & { __creativeLab?: { snapshot: () => { state: string; creatorStep: number; selectedId: string | null; candidates: Array<{ id: string }> } } };

async function waitForBestResult(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const snapshot = (window as ProductWindow).__creativeLab?.snapshot();
    const frame = document.querySelector<HTMLIFrameElement>('#creative-stage-frame');
    return snapshot?.state === 'ready' && snapshot.creatorStep === 4 && Boolean(snapshot.selectedId) && frame?.classList.contains('is-ready');
  });
  return page.evaluate(() => (window as ProductWindow).__creativeLab!.snapshot());
}

test('keeps one brief and one auto-selected live result as the primary journey', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  const snapshot = await waitForBestResult(page);
  expect(snapshot.candidates).toHaveLength(3);
  expect(snapshot.selectedId).toBeTruthy();
  await expect(page.getByRole('heading', { name: '说出你想看到的网页' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '本地草案已生成' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '当前最佳结果' })).toBeVisible();
  await expect(page.locator('#advanced-analysis')).not.toHaveAttribute('open', '');
  await expect(page.locator('#direction-analysis')).not.toHaveAttribute('open', '');
  await expect(page.locator('.wb-flow')).toBeHidden();
  await expect(page.locator('#creative-stage-frame')).toHaveClass(/is-ready/);
  await expect(page.getByRole('link', { name: '打开 Three.js 实际预览' })).toHaveAttribute('href', /generated=/);
});

test('preserves the primary journey and runnable samples without horizontal overflow on a 390px phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForBestResult(page);
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, referenceVisible: getComputedStyle(document.querySelector('.wb-reference-library')!).display !== 'none' }));
  expect(dimensions).toEqual({ viewport: 390, scrollWidth: 390, referenceVisible: true });
  await expect(page.locator('.wb-sample-link')).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: '你的想法' })).toBeVisible();
  await expect(page.locator('#creative-stage-frame')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '哪里还不对？' })).toBeVisible();
});

test('keeps the brief recoverable when generation fails', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForBestResult(page);
  const brief = page.getByRole('textbox', { name: '你的想法' });
  await brief.fill('太短');
  await page.getByRole('button', { name: '生成并构建最佳网页' }).click();
  await page.waitForFunction(() => (window as ProductWindow).__creativeLab?.snapshot().state === 'error');
  await expect(brief).toHaveValue('太短');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#creative-stage-placeholder strong')).toHaveText('这次没有构建完成');
});
