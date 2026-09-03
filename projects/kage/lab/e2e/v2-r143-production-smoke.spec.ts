import { expect, test, type Page } from '@playwright/test';

type FridgeSnapshot = {
  selected: string[];
  selectionCount: number;
  eligible: boolean;
  menuId: string;
  timelineMarks: number;
  saved: boolean;
  renderer: string;
  horizontalOverflow: boolean;
};

const baseUrl = (process.env.R143_BASE_URL
  ?? 'http://127.0.0.1:8147/0823_githubcode_study/projects/kage').replace(/\/$/, '');
const deliveryPath = '/pages/v2/deliveries/fridge-tonight/';

test.describe.configure({ timeout: 30_000 });

function monitor(page: Page) {
  const issues = { pageErrors: [] as string[], consoleErrors: [] as string[] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  return issues;
}

test('production preview keeps the non-3D causal dinner task intact', async ({ page }) => {
  const issues = monitor(page);
  const response = await page.goto(
    `${baseUrl}${deliveryPath}?quality=high&motion=full&revision=r143-production`,
    { waitUntil: 'domcontentloaded' },
  );
  expect(response?.status()).toBe(200);
  await page.waitForFunction(() => (
    document.documentElement.dataset.fridgeReady === 'true'
      && typeof window.__FRIDGE_TONIGHT__?.snapshot === 'function'
  ));
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.locator('[data-fridge-ingredient="tomato"]').click();
  await page.locator('[data-fridge-ingredient="eggs"]').click();
  const state = await page.evaluate<FridgeSnapshot>(() => window.__FRIDGE_TONIGHT__!.snapshot());
  expect(state).toMatchObject({
    selected: ['tomato', 'eggs'],
    selectionCount: 2,
    eligible: true,
    menuId: 'tomato-egg-rice',
    timelineMarks: 2,
    renderer: 'dom-css-inline-svg',
    horizontalOverflow: false,
  });
  await page.locator('[data-fridge-save]').click();
  const saved = await page.evaluate<FridgeSnapshot>(() => window.__FRIDGE_TONIGHT__!.snapshot());
  expect(saved.saved).toBe(true);
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [] });
});
