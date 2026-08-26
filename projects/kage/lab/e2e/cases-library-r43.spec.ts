import { expect, test } from '@playwright/test';

test('案例库展示五个目标各自的素材和稳定归档入口', async ({ page }) => {
  await page.goto('/cases.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('五个完整作品');
  await expect(page.locator('#case-count')).toHaveText('2 个能力基准 + 3 个精选案例 + 2 个备用精修案例');

  const cards = page.locator('.case-card--model-final');
  await expect(cards).toHaveCount(5);
  const evidence = await cards.evaluateAll((elements) => elements.map((element) => {
    const article = element as HTMLElement;
    return {
      id: article.dataset.caseId,
      preview: article.style.getPropertyValue('--case-preview'),
      primary: article.querySelector<HTMLAnchorElement>('.case-actions a')?.getAttribute('href'),
      kind: article.dataset.previewKind,
    };
  }));

  expect(new Set(evidence.map((item) => item.preview)).size).toBe(5);
  expect(evidence.every((item) => item.preview.includes('/creative-assets/'))).toBe(true);
  expect(evidence.every((item) => item.primary === `/cases/${item.id}/`)).toBe(true);
  expect(evidence.every((item) => item.kind === 'subject' || item.kind === 'environment')).toBe(true);
});

test('手机尺寸下案例卡不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cases.html');
  await expect(page.locator('.case-card--model-final')).toHaveCount(5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
