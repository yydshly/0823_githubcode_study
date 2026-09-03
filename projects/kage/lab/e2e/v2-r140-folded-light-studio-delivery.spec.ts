import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const route = '/pages/v2/deliveries/folded-light-studio/';
const revision = 'r140-proof';
const runId = 'direct-r140-folded-light-studio';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'folded-light-studio');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'assets/folded-paper-lamp-atlas-v1.png',
  'assets/state-01-folded.png',
  'assets/state-02-third.png',
  'assets/state-03-two-thirds.png',
  'assets/state-04-open.png'
] as const;
const observations: Record<string, unknown>[] = [];

test.describe.configure({ mode: 'serial', timeout: 35_000 });

async function ready(page: Page) {
  await page.waitForFunction(() => document.body.dataset.experience === 'ready');
  await expect(page.locator('body')).toHaveAttribute('data-asset-status', 'loaded');
}

async function hashBundle() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
  observations.length = 0;
});

test.afterAll(async () => {
  await writeFile(resolve(evidenceDir, 'report.json'), `${JSON.stringify({
    schemaVersion: 1,
    stage: 'r140-folded-light-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await hashBundle(),
    route,
    revision,
    bundleFiles,
    observations,
    complete: observations.length === 4
  }, null, 2)}\n`, 'utf8');
});

test('opening uses the transparent atlas as a local product subject, not a full-screen background', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  const evidence = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('.lamp-frame')!;
    const lamp = document.querySelector<HTMLElement>('.lamp-composition')!;
    const body = document.body;
    return {
      state: body.dataset.state,
      progress: body.dataset.progress,
      frameBackground: getComputedStyle(frame).backgroundImage,
      frameBackgroundSize: getComputedStyle(frame).backgroundSize,
      bodyBackgroundImage: getComputedStyle(body).backgroundImage,
      lampWidth: lamp.getBoundingClientRect().width,
      viewportWidth: innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  });
  expect(evidence).toMatchObject({ state: 'folded', horizontalOverflow: false });
  expect(evidence.frameBackground).toContain('state-01-folded');
  expect(evidence.frameBackgroundSize).toBe('contain');
  expect(evidence.bodyBackgroundImage).not.toContain('folded-paper-lamp-atlas-v1');
  expect(evidence.lampWidth).toBeLessThan(evidence.viewportWidth * .7);
  observations.push({ checkpoint: 'desktop-opening', ...evidence });
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png'), fullPage: false });
});

test('wheel, pointer drag and keyboard update the same lamp state before booking unlocks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  await page.mouse.wheel(0, 1150);
  await page.waitForFunction(() => Number(document.body.dataset.progress) > .2 && document.body.dataset.inputChannel === 'scroll');
  const afterWheel = Number(await page.locator('body').getAttribute('data-progress'));

  const dragBox = await page.locator('.drag-surface').boundingBox();
  expect(dragBox).not.toBeNull();
  await page.mouse.move(dragBox!.x + dragBox!.width * .43, dragBox!.y + dragBox!.height * .55);
  await page.mouse.down();
  await page.mouse.move(dragBox!.x + dragBox!.width * .67, dragBox!.y + dragBox!.height * .55, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => document.body.dataset.inputChannel === 'pointer-drag');
  const afterDrag = Number(await page.locator('body').getAttribute('data-progress'));
  expect(afterDrag).toBeGreaterThan(afterWheel);
  const midWeights = await page.locator('body').getAttribute('data-frame-weights');
  expect(midWeights).not.toBe('1.000,0.000,0.000,0.000');
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-mid-unfold.png'), fullPage: false });

  await page.keyboard.press('End');
  await page.waitForFunction(() => document.body.dataset.state === 'open' && Number(document.body.dataset.progress) >= .94);
  await expect(page.locator('.booking-button')).toBeEnabled();
  await page.locator('.booking-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-booking', 'confirmed');
  const finalWeights = await page.locator('body').getAttribute('data-frame-weights');
  expect(Number(finalWeights!.split(',')[3])).toBeGreaterThan(.8);
  await expect(page.locator('body')).toHaveAttribute('data-input-channel', 'keyboard');
  observations.push({
    checkpoint: 'desktop-causal-journey',
    afterWheel,
    afterDrag,
    midWeights,
    finalWeights,
    finalInput: await page.locator('body').getAttribute('data-input-channel'),
    booking: await page.locator('body').getAttribute('data-booking')
  });
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-open-booked.png'), fullPage: false });
});

test('390px reduced motion exposes four discrete states and completes the same action', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.locator('[data-progress-target="1"]').click();
  await page.waitForFunction(() => document.body.dataset.state === 'open');
  await expect(page.locator('.booking-button')).toBeEnabled();
  const mobile = await page.evaluate(() => ({
    progress: document.body.dataset.progress,
    state: document.body.dataset.state,
    input: document.body.dataset.inputChannel,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    trackButtons: document.querySelectorAll('[data-progress-target]').length
  }));
  expect(mobile).toMatchObject({ state: 'open', input: 'stage-navigation', horizontalOverflow: false, trackButtons: 4 });
  observations.push({ checkpoint: 'mobile-reduced-open', ...mobile });
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced-open.png'), fullPage: false });
});

test('forced asset failure discloses the gap and never pretends that the lamp opened', async ({ page }) => {
  await page.route('**/state-01-folded.png', (routeHandler) => routeHandler.abort('failed'));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.experience === 'fallback');
  await expect(page.locator('.asset-fallback')).toBeVisible();
  await expect(page.locator('.asset-fallback')).toContainText('不伪装展开效果');
  await expect(page.locator('.booking-button')).toBeEnabled();
  expect(await page.locator('body').getAttribute('data-state')).toBe('folded');
  observations.push({
    checkpoint: 'asset-fallback',
    state: await page.locator('body').getAttribute('data-state'),
    assetStatus: await page.locator('body').getAttribute('data-asset-status'),
    fallbackVisible: await page.locator('.asset-fallback').isVisible()
  });
  await page.screenshot({ path: resolve(evidenceDir, '05-asset-fallback.png'), fullPage: false });
});
