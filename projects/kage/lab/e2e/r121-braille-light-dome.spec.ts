import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const previewUrl = '/generated-runs/dedicated-braille-r121-repair/?quality=high&motion=full&revision=r121-proof';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r121-braille-light-dome');

test.describe.configure({ timeout: 40_000 });

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

function observeRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function waitUntilReady(page: Page): Promise<void> {
  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('body').getAttribute('data-generated-ready')).toBe('true');
}

async function raisedDots(page: Page): Promise<number[]> {
  return page.locator('[data-dot].raised').evaluateAll((elements) => (
    elements
      .map((element) => Number((element as HTMLElement).dataset.dot))
      .sort((left, right) => left - right)
  ));
}

async function expectPattern(page: Page, letter: 'A' | 'L' | 'T', raised: number[]): Promise<void> {
  await expect(page.getByRole('button', { name: letter, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#pattern-title')).toContainText(`${letter} ·`);
  await expect.poll(() => raisedDots(page)).toEqual(raised);
}

async function expectInsideViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const placement = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  expect(placement.left).toBeGreaterThanOrEqual(0);
  expect(placement.top).toBeGreaterThanOrEqual(0);
  expect(placement.right).toBeLessThanOrEqual(placement.viewportWidth + 1);
  expect(placement.bottom).toBeLessThanOrEqual(placement.viewportHeight + 1);
}

test('desktop proves A to L to keyboard T, standard Braille geometry, and save', async ({ page }) => {
  const runtimeErrors = observeRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitUntilReady(page);

  const domOrder = await page.locator('.dot-slot [data-dot]').evaluateAll((elements) => (
    elements.map((element) => Number((element as HTMLElement).dataset.dot))
  ));
  expect(domOrder, 'Braille cells must be ordered as rows 1/4, 2/5, 3/6').toEqual([1, 4, 2, 5, 3, 6]);

  const positions = await page.locator('.dot-slot').evaluateAll((slots) => Object.fromEntries(slots.map((slot) => {
    const dot = slot.querySelector<HTMLElement>('[data-dot]');
    const rect = slot.getBoundingClientRect();
    return [Number(dot?.dataset.dot), { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }];
  })));
  for (const column of [[1, 2, 3], [4, 5, 6]]) {
    expect(Math.max(...column.map((dot) => positions[dot].x)) - Math.min(...column.map((dot) => positions[dot].x))).toBeLessThan(1);
  }
  for (const row of [[1, 4], [2, 5], [3, 6]]) {
    expect(Math.max(...row.map((dot) => positions[dot].y)) - Math.min(...row.map((dot) => positions[dot].y))).toBeLessThan(1);
  }
  expect(positions[1].x).toBeLessThan(positions[4].x);
  expect(positions[1].y).toBeLessThan(positions[2].y);
  expect(positions[2].y).toBeLessThan(positions[3].y);

  await expectPattern(page, 'A', [1]);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-a-opening.png') });

  await page.getByRole('button', { name: 'L', exact: true }).click();
  await expectPattern(page, 'L', [1, 2, 3]);
  await expect(page.locator('#pattern-cue')).toHaveText('第 1、2、3 点升起');
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-l-click.png') });

  await page.keyboard.press('ArrowRight');
  await expectPattern(page, 'T', [2, 3, 4, 5]);
  await expect(page.getByRole('button', { name: 'T', exact: true })).toBeFocused();

  const save = page.locator('[data-signal-primary-action]');
  await save.click();
  await expect(page.locator('.saved')).toHaveText('已保存：字母 T 的六点练习。');
  await expect(page.locator('.closing')).toHaveClass(/is-saved/);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-t-keyboard-saved.png') });

  expect(runtimeErrors).toEqual([]);
});

test('390x844 reduced motion keeps the whole control-result-action path reachable and savable', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const runtimeErrors = observeRuntimeErrors(page);
  await waitUntilReady(page);

  const environment = await page.evaluate(() => ({
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    domeTransitionDuration: getComputedStyle(document.querySelector<HTMLElement>('.dome')!).transitionDuration,
  }));
  expect(environment).toEqual({
    reducedMotion: true,
    horizontalOverflow: 0,
    domeTransitionDuration: '0s',
  });

  await expectInsideViewport(page.locator('[data-signal-primary-control]'));
  await expectInsideViewport(page.locator('[data-signal-primary-result]'));
  await expectInsideViewport(page.locator('[data-signal-primary-action]'));
  await expectPattern(page, 'A', [1]);
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced-opening.png') });

  await page.getByRole('button', { name: 'L', exact: true }).click();
  await expectPattern(page, 'L', [1, 2, 3]);
  await page.locator('[data-signal-primary-action]').click();
  await expect(page.locator('.saved')).toHaveText('已保存：字母 L 的六点练习。');
  await expect(page.locator('.closing')).toHaveClass(/is-saved/);
  await expectInsideViewport(page.locator('.saved'));
  await page.screenshot({ path: resolve(evidenceDir, '05-mobile-reduced-l-saved.png') });

  expect(runtimeErrors).toEqual([]);
  await context.close();
});
