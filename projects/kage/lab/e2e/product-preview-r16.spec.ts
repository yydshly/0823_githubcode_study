import { expect, test } from '@playwright/test';

type PreviewWindow = Window & { __creativeLab?: { snapshot: () => { state: string; creatorStep: number } } };

async function waitForPreview(page: import('@playwright/test').Page) {
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => {
    const snapshot = (window as PreviewWindow).__creativeLab?.snapshot();
    return snapshot?.state === 'ready' && snapshot.creatorStep === 4 && document.querySelector('#creative-stage-frame')?.classList.contains('is-ready');
  });
}

test('fills the desktop stage, preserves the sticky-header offset, and removes nested lab controls', async ({ page }) => {
  await waitForPreview(page);
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.wb-topbar')!.getBoundingClientRect();
    const heading = document.querySelector('.wb-stage-heading')!.getBoundingClientRect();
    const frame = document.querySelector<HTMLIFrameElement>('#creative-stage-frame')!;
    const controls = frame.contentDocument!.querySelector<HTMLElement>('#lab-controls')!;
    const canvas = frame.contentDocument!.querySelector<HTMLCanvasElement>('#world-canvas')!;
    return {
      headerBottom: header.bottom,
      headingTop: heading.top,
      frameHeight: frame.getBoundingClientRect().height,
      innerHeight: frame.contentWindow!.innerHeight,
      canvasHeight: canvas.getBoundingClientRect().height,
      controlsDisplay: getComputedStyle(controls).display,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(layout.headingTop).toBeGreaterThanOrEqual(layout.headerBottom);
  expect(layout.frameHeight).toBeGreaterThan(450);
  expect(layout.innerHeight).toBeCloseTo(layout.frameHeight, 0);
  await expect.poll(async () => page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('#creative-stage-frame')!;
    const canvas = frame.contentDocument!.querySelector<HTMLCanvasElement>('#world-canvas')!;
    return Math.abs(canvas.getBoundingClientRect().height - frame.getBoundingClientRect().height);
  })).toBeLessThanOrEqual(1);
  await expect.poll(async () => page.evaluate(() => {
    const frame = document.querySelector<HTMLIFrameElement>('#creative-stage-frame')!;
    const controls = frame.contentDocument!.querySelector<HTMLElement>('#lab-controls')!;
    return getComputedStyle(controls).display;
  })).toBe('none');
  expect(layout.overflow).toBe(0);
  await expect(page.locator('.wb-generation-trace')).toBeVisible();
  await expect(page.locator('[data-trace-model]')).toHaveText('LOCAL BASELINE');
  await expect(page.locator('[data-trace-runtime]')).not.toHaveText('NONE');
});

test('keeps the filled preview and generation trace usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForPreview(page);
  const layout = await page.evaluate(() => ({
    frameHeight: document.querySelector('#creative-stage-frame')!.getBoundingClientRect().height,
    traceWidth: document.querySelector('.wb-generation-trace')!.getBoundingClientRect().width,
    viewportWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  expect(layout.frameHeight).toBeGreaterThan(400);
  expect(layout.traceWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.overflow).toBe(0);
  await expect(page.locator('.wb-sample-link')).toHaveCount(2);
});
