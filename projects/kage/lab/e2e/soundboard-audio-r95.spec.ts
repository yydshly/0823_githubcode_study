import { expect, test } from '@playwright/test';

const caseUrl = '/cases/dedicated-b4d381a24320/?quality=high&motion=full&revision=r95-audio';

test('soundboard tuning exposes bounded A/B audio feedback and a usable fallback', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('WebSocket')) errors.push(message.text());
  });

  await page.goto(caseUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
  const root = page.locator('.soundboard-page');
  await expect(page.locator('[data-signal-audio-feedback]')).toBeVisible();

  await page.locator('.audio-reference').click();
  await expect(root).toHaveAttribute('data-audio-state', 'playing');
  await expect(page.locator('.audio-state')).toContainText('基准音板');
  await expect(page.locator('.audio-reference')).toHaveClass(/is-playing/);

  await page.locator('.audio-current').click();
  await expect(page.locator('.audio-current')).toHaveClass(/is-playing/);
  await expect(page.locator('.audio-state')).toContainText('当前音板');

  await page.locator('.audio-compare').click();
  await expect(page.locator('.audio-state')).toContainText('A · 基准音板');
  await expect(page.locator('.audio-reference')).toHaveClass(/is-playing/);
  await expect(page.locator('.audio-state')).toContainText('B · 当前音板', { timeout: 2_500 });
  await expect(page.locator('.audio-current')).toHaveClass(/is-playing/);

  await page.locator('#thickness').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '2.70';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(root).toHaveAttribute('data-drive-mode', 'manual');
  await expect(root).toHaveAttribute('data-audio-state', 'playing');
  await expect(page.locator('.audio-current-value')).toContainText('2.70 mm');
  await expect(page.locator('.audio-contrast')).toContainText(/半音更低.*余振更长.*泛音更亮/);

  const mute = page.locator('.audio-mute');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  await expect(root).toHaveAttribute('data-audio-state', 'muted');
  await page.locator('.audio-current').click();
  await expect(root).toHaveAttribute('data-audio-state', 'muted');
  await mute.click();
  await expect(mute).toHaveAttribute('aria-pressed', 'false');
  await expect(root).toHaveAttribute('data-audio-state', 'ready');
  await page.locator('.audio-lab').screenshot({ path: 'test-results/r95-soundboard-audio-desktop.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
  await expect(page.locator('[data-signal-audio-feedback]')).toBeVisible();
  await page.locator('.audio-lab').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/r95-soundboard-audio-mobile.png', fullPage: false });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('soundboard remains operable when Web Audio is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { configurable: true, value: undefined });
  });
  await page.goto(caseUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
  const root = page.locator('.soundboard-page');
  await page.locator('.audio-reference').click();
  await expect(root).toHaveAttribute('data-audio-state', 'unsupported');
  await expect(page.locator('.audio-state')).toContainText('视觉与数值比较仍可使用');
  await expect(page.locator('#thickness')).toBeEnabled();
  await expect(page.locator('.save')).toBeEnabled();
});
