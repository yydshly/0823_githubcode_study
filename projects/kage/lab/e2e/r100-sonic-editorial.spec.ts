import { expect, test } from '@playwright/test';
import { probePrimaryJourney } from '../server/dedicated-visual-review.ts';

const previewUrl = process.env.R100_PREVIEW_URL
  || '/generated-runs/dedicated-f9ed58e5b7ea/?quality=high&motion=full&revision=r100-sonic-editorial';

async function waitUntilReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
}

test('sonic editorial desktop journey links headline, voices, audio and save action', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('WebSocket')) errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await waitUntilReady(page);
  await page.screenshot({ path: 'test-results/r100-sonic-editorial-opening.png', fullPage: false });

  const headline = page.locator('h1').first();
  const headlineBox = await headline.boundingBox();
  expect(headlineBox, 'primary headline must be rendered').not.toBeNull();
  expect(headlineBox!.y, 'primary headline must be in the opening viewport').toBeLessThan(900);

  const audioRoot = page.locator('[data-signal-audio-feedback]');
  await expect(audioRoot).toHaveCount(1);
  expect(await page.locator('[data-signal-audio-control]').count()).toBeGreaterThanOrEqual(3);

  const journey = await probePrimaryJourney(page, 'control');
  expect(journey).toMatchObject({
    inputObserved: true,
    anchorIdentityStable: true,
    anchorChanged: true,
    resultChanged: true,
    actionAvailable: true,
    substitute: 'none'
  });

  const root = page.locator('.night-radio');
  const initialVoice = await root.getAttribute('data-voice');
  await page.keyboard.press('ArrowDown');
  await expect(root).not.toHaveAttribute('data-voice', initialVoice || 'whisper');
  await page.screenshot({ path: 'test-results/r100-sonic-editorial-voice.png', fullPage: false });

  await page.locator('.play').click();
  await expect(audioRoot).toHaveAttribute('data-audio-state', 'playing');
  await page.locator('.mute').click();
  await expect(page.locator('.mute')).toHaveAttribute('aria-pressed', 'true');
  await expect(audioRoot).toHaveAttribute('data-audio-state', 'muted');
  await page.locator('.volume').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '0.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('.volume')).toHaveValue('0.25');

  await page.locator('[data-signal-primary-action]').scrollIntoViewIfNeeded();
  await page.locator('[data-signal-primary-action]').click();
  await expect(page.locator('.saved')).toContainText('已保存');
  expect(errors).toEqual([]);
});

test('sonic editorial remains usable at 390x844 with reduced motion', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await waitUntilReady(page);
  await expect(page.locator('[data-signal-audio-feedback]')).toBeVisible();
  await page.screenshot({ path: 'test-results/r100-sonic-editorial-mobile-opening.png', fullPage: false });
  await page.locator('[data-signal-primary-action]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-signal-primary-action]')).toBeVisible();
  await page.screenshot({ path: 'test-results/r100-sonic-editorial-mobile-final.png', fullPage: false });
  const state = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  }));
  expect(state).toEqual({ overflow: 0, reducedMotion: true });
  await context.close();
});

test('sonic editorial exposes an honest audio fallback without blocking reading or save', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  });
  await waitUntilReady(page);
  await page.locator('.play').click();
  await expect(page.locator('[data-signal-audio-feedback]')).toHaveAttribute('data-audio-state', 'unavailable');
  await expect(page.locator('[data-audio-fallback]')).toContainText('声音暂不可用');
  await expect(page.locator('[data-signal-primary-action]')).toBeEnabled();
  expect(errors).toEqual([]);
});
