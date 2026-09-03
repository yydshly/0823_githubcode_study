import { expect, test } from '@playwright/test';
import { probePrimaryJourney } from '../server/dedicated-visual-review.ts';

const previewUrl = process.env.R102_PREVIEW_URL
  || '/generated-runs/dedicated-af8bb4f05b56/?quality=high&motion=full&revision=r102-botanical';

async function waitUntilReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
}

function collectRuntimeErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('WebSocket')) errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  return errors;
}

test('botanical observation links a real specimen control, evidence and keyboard lens movement', async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await waitUntilReady(page);

  await expect(page.locator('[data-signal-visual-anchor]')).toHaveCount(1);
  const primaryControl = page.locator('[data-signal-primary-control]');
  await expect(primaryControl).toHaveCount(1);
  await expect(primaryControl).toHaveJSProperty('tagName', 'BUTTON');
  await expect(page.locator('[data-signal-primary-result]')).toBeVisible();
  await expect(page.locator('[data-signal-primary-action]')).toBeEnabled();

  await page.evaluate(() => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({ top: maximum * .56, behavior: 'instant' });
  });
  const journey = await probePrimaryJourney(page, 'control');
  expect(journey).toMatchObject({
    inputObserved: true,
    anchorIdentityStable: true,
    anchorChanged: true,
    resultChanged: true,
    actionAvailable: true,
    substitute: 'none'
  });

  await page.getByRole('button', { name: '幼苗' }).click();
  await expect(page.getByRole('button', { name: '幼苗' })).toHaveClass(/active/);
  await expect(page.locator('.result')).toContainText('幼叶正在展开');
  await expect(page.locator('.water')).toHaveText('正在吸收');
  await expect(page.locator('.stage')).toHaveText('初生阶段');

  const lens = page.locator('.lens-handle');
  const beforeValue = Number(await lens.getAttribute('aria-valuenow'));
  const specimenCanvas = page.getByLabel('可拖动放大镜观察叶片');
  const beforeCanvas = await specimenCanvas.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
  await lens.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await lens.getAttribute('aria-valuenow'))).toBe(beforeValue + 7);
  await expect.poll(async () => specimenCanvas.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL())).not.toBe(beforeCanvas);

  await page.locator('[data-signal-primary-action]').scrollIntoViewIfNeeded();
  await page.locator('[data-signal-primary-action]').click();
  await expect(page.locator('.botanical')).toHaveClass(/observing/);
  await page.screenshot({ path: 'test-results/r102-botanical-desktop.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('botanical observation stays complete at 390x844 with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = collectRuntimeErrors(page);
  await waitUntilReady(page);

  await expect(page.locator('.botanical')).toHaveClass(/reduce-motion/);
  await page.locator('[data-signal-primary-control]').scrollIntoViewIfNeeded();
  await page.locator('[data-signal-primary-control]').click();
  await expect(page.locator('.result')).toContainText('细密侧脉');

  const lens = page.locator('.lens-handle');
  const beforeValue = Number(await lens.getAttribute('aria-valuenow'));
  await page.getByRole('button', { name: '放大镜向右' }).click();
  await expect.poll(async () => Number(await lens.getAttribute('aria-valuenow'))).toBe(beforeValue + 12);

  await page.locator('[data-signal-primary-action]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-signal-primary-action]')).toBeVisible();
  await page.locator('[data-signal-primary-action]').click();
  await expect(page.locator('.botanical')).toHaveClass(/observing/);

  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  }));
  expect(state).toEqual({ overflow: 0, reducedMotion: true });
  await page.screenshot({ path: 'test-results/r102-botanical-mobile.png', fullPage: false });
  expect(errors).toEqual([]);
  await context.close();
});
