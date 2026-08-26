import { expect, test } from '@playwright/test';

type WorkflowWindow = Window & { __creativeLab?: { snapshot: () => { state: string; creatorStep: number } }; __signalLab?: { snapshot: () => { segment: { phase: string }; runtime: { scenePlugin: { metrics: Record<string, string | number> } } | null } } };

test('flagship exposes establish, reveal, hold and semantic scene changes', async ({ page }) => {
  await page.goto('/?experience=resonance-flagship&quality=low&motion=full&embed=1&debug=1');
  await page.waitForFunction(() => (window as WorkflowWindow).__signalLab?.snapshot().runtime?.scenePlugin.metrics.assetState === 'ready');
  const setProgress = async (progress: number) => {
    await page.evaluate((value) => window.postMessage({ type: 'signal-lab:preview-progress', progress: value }, location.origin), progress);
    await page.waitForTimeout(800);
    return page.evaluate(() => (window as WorkflowWindow).__signalLab!.snapshot());
  };
  const establish = await setProgress(.01);
  const reveal = await setProgress(.1);
  const hold = await setProgress(.17);
  const secondChapter = await setProgress(.35);
  expect(establish.segment.phase).toBe('establish');
  expect(reveal.segment.phase).toBe('reveal');
  expect(hold.segment.phase).toBe('hold');
  expect(Number(hold.runtime?.scenePlugin.metrics.assembly)).toBeGreaterThan(Number(establish.runtime?.scenePlugin.metrics.assembly));
  expect(secondChapter.runtime?.scenePlugin.metrics.focus).toBe('depth');
});

test('workbench auto-selects the best result and keeps engineering controls folded', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => (window as WorkflowWindow).__creativeLab?.snapshot().creatorStep === 4);
  expect((await page.evaluate(() => (window as WorkflowWindow).__creativeLab!.snapshot())).creatorStep).toBe(4);
  await expect(page.locator('.wb-flow')).toBeHidden();
  await expect(page.locator('.wb-engineering-actions')).not.toHaveAttribute('open', '');
  await page.locator('#revision-instruction').fill('镜头更慢');
  await page.locator('#apply-revision-button').click();
  await expect(page.locator('#workbench-status')).toContainText('节奏');
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('#preview-link')?.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await page.locator('#preview-link').click();
  expect((await page.evaluate(() => (window as WorkflowWindow).__creativeLab!.snapshot())).creatorStep).toBe(5);
});

