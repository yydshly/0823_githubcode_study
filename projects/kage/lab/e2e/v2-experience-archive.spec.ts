import { expect, test } from '@playwright/test';

test.describe('V2 意境研究档案', () => {
  test('desktop shows eleven distinct verified entries with real previews and routes', async ({ page }) => {
    await page.goto('/cases.html');
    const archive = page.locator('#experience-archive-grid');
    const cards = archive.locator('.experience-card');

    await expect(page.locator('#experience-archive-title')).toBeVisible();
    await expect(page.locator('#experience-archive-count')).toHaveText('11 个已验证研究档案');
    await expect(cards).toHaveCount(11);
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().locator('h3')).toHaveText('经纬光场');

    const archiveState = await cards.evaluateAll((items) => items.map((item) => {
      const card = item as HTMLElement;
      const visual = item.querySelector<HTMLElement>('.experience-card__visual');
      const link = item.querySelector<HTMLAnchorElement>('.experience-card__body > a');
      return {
        id: card.dataset.archiveId,
        preview: card.style.getPropertyValue('--experience-preview'),
        link: link?.getAttribute('href'),
        height: visual?.getBoundingClientRect().height ?? 0
      };
    }));

    expect(new Set(archiveState.map((item) => item.preview)).size).toBe(11);
    expect(archiveState.every((item) => item.preview.includes(item.id || ''))).toBe(true);
    expect(archiveState.every((item) => item.link === `/pages/v2/deliveries/${item.id}/`)).toBe(true);
    expect(archiveState.every((item) => item.height >= 280)).toBe(true);
  });

  test('390px mobile keeps archive usable without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/cases.html');
    await page.locator('#experience-archive-title').scrollIntoViewIfNeeded();

    await expect(page.locator('.experience-card').first()).toBeVisible();
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(document.querySelector('#experience-archive-grid')!).gridTemplateColumns
    }));

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.columns.split(' ').length).toBe(1);
  });
});
