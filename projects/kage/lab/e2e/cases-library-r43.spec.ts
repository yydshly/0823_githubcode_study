import { expect, test } from '@playwright/test';

test('案例库展示每个目标各自的素材和稳定归档入口', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/cases.html');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('当前最优作品');
  const catalog = await page.evaluate(async () => {
    const response = await fetch('/api/creative/cases');
    return response.json() as Promise<{ cases: Array<{ stage: string }> }>;
  });
  const curatedCount = catalog.cases.filter((item) => item.stage === 'featured' || item.stage === 'refined').length;

  const cards = page.locator('.case-card--model-final');
  await expect(cards).toHaveCount(curatedCount);
  const evidence = await cards.evaluateAll((elements) => elements.map((element) => {
    const article = element as HTMLElement;
    return {
      id: article.dataset.caseId,
      preview: article.style.getPropertyValue('--case-preview'),
      primary: article.querySelector<HTMLAnchorElement>('.case-actions a')?.getAttribute('href'),
      kind: article.dataset.previewKind,
    };
  }));

  expect(new Set(evidence.map((item) => item.preview)).size).toBe(curatedCount);
  expect(evidence.every((item) => item.preview.includes('/creative-assets/'))).toBe(true);
  expect(evidence.every((item) => item.primary === `/cases/${item.id}/`)).toBe(true);
  expect(evidence.every((item) => item.kind === 'subject' || item.kind === 'environment')).toBe(true);
  expect(evidence.find((item) => item.id === 'dedicated-7d00f0096507')?.preview)
    .toContain('/creative-assets/r27-library-seat-observatory-cover-v2.png');
  for (const item of evidence) {
    const assetUrl = item.preview.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    expect(assetUrl, `${item.id} should expose a usable preview URL`).toBeTruthy();
    const response = await page.request.get(assetUrl!);
    expect(response.ok(), `${item.id}/${assetUrl} should return HTTP 200`).toBe(true);
    expect((await response.body()).byteLength, `${item.id}/${assetUrl} should not be a placeholder`).toBeGreaterThan(1024);
  }
  expect(pageErrors).toEqual([]);

  const coastlineCapability = page.locator('[data-case-id="capability-coastline-evidence"]');
  await expect(coastlineCapability).toBeVisible();
  await expect(coastlineCapability.getByRole('heading')).toContainText('潮线证词');
  await expect(coastlineCapability.getByRole('link', { name: '打开能力基准 ↗' }))
    .toHaveAttribute('href', '/pages/v2/prototypes/semantic-interaction/?demo=1');
  const coastlinePreview = await coastlineCapability.evaluate((element) =>
    (element as HTMLElement).style.getPropertyValue('--case-preview')
  );
  expect(coastlinePreview).toContain('/creative-assets/capability-coastline-evidence.jpg');
  expect((await page.request.get('/creative-assets/capability-coastline-evidence.jpg')).ok()).toBe(true);
});

test('手机尺寸下案例卡不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/cases.html');
  const catalog = await page.evaluate(async () => {
    const response = await fetch('/api/creative/cases');
    return response.json() as Promise<{ cases: Array<{ stage: string }> }>;
  });
  const curatedCount = catalog.cases.filter((item) => item.stage === 'featured' || item.stage === 'refined').length;
  await expect(page.locator('.case-card--model-final')).toHaveCount(curatedCount);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
