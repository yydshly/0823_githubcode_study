import { expect, test, type Page } from '@playwright/test';

type PositionTuple = [number, number, number];

type ModularRoomSoundSnapshot = {
  ready: boolean;
  mode: 'horizontal' | 'split' | 'wall';
  fallback: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  saved: boolean;
  booked: boolean;
  horizontalOverflow: boolean;
  canvasVisualHash: string;
  partPositions: Record<string, PositionTuple>;
};

declare global {
  interface Window {
    __MODULAR_ROOM_SOUND__?: {
      snapshot(): ModularRoomSoundSnapshot;
    };
  }
}

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
};

const baseUrl = (process.env.R142_BASE_URL
  ?? 'http://127.0.0.1:8147/0823_githubcode_study/projects/kage').replace(/\/$/, '');
const deliveryPath = '/pages/v2/deliveries/modular-room-sound/';

test.describe.configure({ mode: 'serial', timeout: 30_000 });

function monitor(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = { pageErrors: [], consoleErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  return issues;
}

function distance(left: PositionTuple, right: PositionTuple): number {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  );
}

test('production preview keeps real Three.js assembly causality and the final CTA reachable', async ({ page }) => {
  const issues = monitor(page);
  const response = await page.goto(
    `${baseUrl}${deliveryPath}?quality=high&motion=full&revision=r142-production`,
    { waitUntil: 'domcontentloaded' },
  );
  expect(response?.status()).toBe(200);

  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__?.snapshot();
    return Boolean(
      state?.ready
      && state.fallback === false
      && state.frames > 2
      && state.drawCalls > 0
      && state.triangles > 0,
    );
  }, undefined, { timeout: 15_000 });

  const canvas = page.locator('[data-scene-canvas]');
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.width).toBeGreaterThan(700);
  expect(canvasBox?.height).toBeGreaterThan(500);

  const horizontal = await page.evaluate(() => window.__MODULAR_ROOM_SOUND__!.snapshot());
  expect(horizontal).toMatchObject({ ready: true, mode: 'horizontal', fallback: false });
  expect(horizontal.frames).toBeGreaterThan(2);
  expect(horizontal.drawCalls).toBeGreaterThan(0);
  expect(horizontal.triangles).toBeGreaterThan(0);
  expect(horizontal.canvasVisualHash).toMatch(/^[a-f0-9]{8}$/);
  const horizontalGap = distance(
    horizontal.partPositions.leftModule,
    horizontal.partPositions.rightModule,
  );

  await page.locator('[data-mode="split"]').click();
  await page.waitForFunction((initialGap) => {
    const state = window.__MODULAR_ROOM_SOUND__?.snapshot();
    if (!state || state.mode !== 'split') return false;
    const left = state.partPositions.leftModule;
    const right = state.partPositions.rightModule;
    const currentGap = Math.hypot(
      left[0] - right[0],
      left[1] - right[1],
      left[2] - right[2],
    );
    return currentGap > Number(initialGap) + 0.8;
  }, horizontalGap, { timeout: 8_000 });

  const split = await page.evaluate(() => window.__MODULAR_ROOM_SOUND__!.snapshot());
  expect(split.mode).toBe('split');
  expect(distance(split.partPositions.leftModule, split.partPositions.rightModule))
    .toBeGreaterThan(horizontalGap + 0.8);

  const save = page.locator('[data-save]');
  const book = page.locator('[data-book]');
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeVisible();
  await expect(book).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(book).toBeEnabled();
  await save.click();
  await book.click();
  await page.waitForFunction(() => {
    const state = window.__MODULAR_ROOM_SOUND__?.snapshot();
    return state?.saved === true && state.booked === true;
  });
  await expect(page.locator('[data-save-status]')).not.toContainText('尚未保存');
  await expect(page.locator('[data-book-status]')).not.toContainText('预约不会提交');

  const completed = await page.evaluate(() => window.__MODULAR_ROOM_SOUND__!.snapshot());
  expect(completed).toMatchObject({ saved: true, booked: true, fallback: false });
  expect(completed.horizontalOverflow).toBe(false);
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [] });
});
