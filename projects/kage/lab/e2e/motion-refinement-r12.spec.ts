import path from 'node:path';
import { expect, test } from '@playwright/test';

const screenshot = path.resolve(import.meta.dirname, '../docs/screenshots/phase12-motion-desktop.png');

async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.__signalLab!.snapshot());
}

test('pointer settles, releases, and scroll plays the current chapter camera track', async ({ page }) => {
  await page.goto('/?experience=resonance-flagship&quality=high&motion=full&debug=1');
  await page.waitForFunction(() => window.__signalLab?.snapshot().runtime?.scenePlugin.metrics.assetState === 'ready');
  const initial = await snapshot(page);

  await page.mouse.move(1240, 260);
  await page.waitForTimeout(360);
  const followed = await snapshot(page);
  expect(followed.motionFrame.pointer.targetX).toBeGreaterThan(.6);
  expect(followed.motionFrame.pointer.x).toBeGreaterThan(.35);
  expect(followed.runtime?.motion.pointerActivity).toBeGreaterThan(.15);

  await page.mouse.wheel(0, 920);
  await page.waitForTimeout(650);
  const scrolled = await snapshot(page);
  expect(scrolled.segment.progress).toBeGreaterThan(initial.segment.progress);
  expect(scrolled.segment.fromId).toBe(scrolled.segment.toId);
  expect(scrolled.segment.t).toBeGreaterThan(.03);

  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerleave')));
  await page.waitForTimeout(720);
  const released = await snapshot(page);
  expect(released.motionFrame.pointer.targetX).toBe(0);
  expect(Math.abs(released.motionFrame.pointer.x)).toBeLessThan(Math.abs(followed.motionFrame.pointer.x));
  await page.locator('#debug-panel').evaluate((element) => { element.hidden = true; });
  await page.screenshot({ path: screenshot, animations: 'disabled' });
});

test('workbench wheel input crosses the iframe boundary and scrubs the live stage', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  const frame = page.frameLocator('#creative-stage-frame');
  await expect(frame.locator('body')).toHaveAttribute('data-embed', 'true');
  const beforeScroll = await page.evaluate(() => scrollY);
  const beforeNode = await frame.locator('body').getAttribute('data-node');
  const bounds = await page.locator('#creative-stage-frame').boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * .56, bounds!.y + bounds!.height * .44);
  await page.mouse.wheel(0, 460);
  await page.waitForTimeout(240);
  await page.mouse.wheel(0, 460);
  await page.waitForTimeout(760);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(beforeScroll);
  await expect(page.locator('#creative-stage-status')).toContainText('SHOT');
  await expect(page.locator('#creative-stage-status')).not.toContainText('SHOT 01');
  await expect.poll(() => frame.locator('body').getAttribute('data-node')).not.toBe(beforeNode);
});

declare global {
  interface Window {
    __creativeLab?: { snapshot: () => { state: string } };
    __signalLab?: { snapshot: () => {
      segment: { fromId: string; toId: string; t: number; progress: number };
      motionFrame: { pointer: { x: number; targetX: number }; scrollVelocity: number; preview: boolean };
      runtime: { motion: { pointerActivity: number }; scenePlugin: { metrics: Record<string, string | number> } } | null;
    } };
  }
}
