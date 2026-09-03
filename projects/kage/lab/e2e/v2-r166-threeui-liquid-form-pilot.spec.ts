import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

type PilotSnapshot = {
  renderer: 'webgl' | 'fallback';
  preset: 'quiet' | 'signal' | 'charged';
  frameCount: number;
  inputCount: number;
  options: { morph: number; noiseScale: number; mouseAmount: number };
  reducedMotion: boolean;
  visible: boolean;
  hasHorizontalOverflow: boolean;
};

const route = '/pages/v2/prototypes/threeui-liquid-form/';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r166-threeui-liquid-form');

function monitor(page: Page) {
  const issues = { pageErrors: [] as string[], consoleErrors: [] as string[], requestFailures: [] as string[] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => issues.requestFailures.push(`${request.method()} ${request.url()}`));
  return issues;
}

async function ready(page: Page) {
  await page.waitForFunction(() => (
    document.documentElement.dataset.ready === 'true'
    && typeof (window as unknown as { __threeUiLiquidFormPilot?: { snapshot?: unknown } }).__threeUiLiquidFormPilot?.snapshot === 'function'
  ));
}

async function snapshot(page: Page): Promise<PilotSnapshot> {
  return page.evaluate(() => {
    const api = (window as unknown as { __threeUiLiquidFormPilot?: { snapshot: () => PilotSnapshot } }).__threeUiLiquidFormPilot;
    if (!api) throw new Error('ThreeUI Liquid Form pilot API is unavailable.');
    return api.snapshot();
  });
}

test.describe.configure({ mode: 'serial', timeout: 25_000 });

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
});

test('desktop WebGL field responds to preset and real pointer input', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const issues = monitor(page);
  await page.goto(`${route}?revision=r166-browser-proof`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const before = await snapshot(page);
  await page.waitForTimeout(250);
  const animated = await snapshot(page);
  expect(before.renderer).toBe('webgl');
  expect(animated.frameCount).toBeGreaterThan(before.frameCount);

  await page.locator('[data-preset-button="charged"]').click();
  const field = page.locator('[data-render-field]');
  const bounds = await field.boundingBox();
  if (!bounds) throw new Error('Liquid Form render field has no layout box.');
  await page.mouse.move(bounds.x + bounds.width * 0.68, bounds.y + bounds.height * 0.34);
  await page.waitForTimeout(120);
  const changed = await snapshot(page);
  expect(changed).toMatchObject({
    renderer: 'webgl',
    preset: 'charged',
    hasHorizontalOverflow: false
  });
  expect(changed.options.morph).toBe(1.55);
  expect(changed.inputCount).toBeGreaterThan(0);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-interactive.png'), fullPage: true });
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [] });
});

test('390px reduced-motion mode keeps content usable and stops continuous drawing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const issues = monitor(page);
  await page.goto(`${route}?revision=r166-mobile-proof`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const before = await snapshot(page);
  await page.waitForTimeout(260);
  const after = await snapshot(page);
  expect(before).toMatchObject({ renderer: 'webgl', reducedMotion: true, hasHorizontalOverflow: false });
  expect(after.frameCount - before.frameCount).toBeLessThanOrEqual(1);
  await expect(page.locator('h1')).toContainText('让材质');
  await expect(page.locator('[data-reset]')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, '02-mobile-reduced.png'), fullPage: true });
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [] });
});

test('forced WebGL failure retains the explanation and controls', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const issues = monitor(page);
  await page.goto(`${route}?webgl=off&revision=r166-fallback-proof`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  expect(await snapshot(page)).toMatchObject({ renderer: 'fallback', hasHorizontalOverflow: false });
  await expect(page.locator('[data-status-label]')).toHaveText('FORCED FALLBACK');
  await expect(page.locator('[data-reset]')).toBeEnabled();
  await page.screenshot({ path: resolve(evidenceDir, '03-webgl-fallback.png'), fullPage: true });
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [] });
});
