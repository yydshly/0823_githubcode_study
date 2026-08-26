import { expect, test } from '@playwright/test';

type LiveWindow = Window & {
  __creativeLab?: {
    snapshot: () => {
      state: string;
      provider: string;
      requestedProvider: string;
      model: string | null;
      cacheStatus: string | null;
      selectedId: string | null;
      candidates: Array<{ id: string; effectSource: string; scenePlugin: string }>;
    };
  };
};

test('invokes the configured Codex provider and renders its model EffectSpec', async ({ page }) => {
  const brief = '为先锋时装品牌构建会呼吸的镜面织物剧场；银紫色薄膜随滚动折叠并露出系列叙事，最终聚焦预约看秀。R16 live provider acceptance.';
  await page.goto(`/workbench.html?provider=codex&brief=${encodeURIComponent(brief)}&quality=balanced&seed=29`);
  await page.waitForFunction(() => (window as LiveWindow).__creativeLab?.snapshot().state === 'ready');
  await expect(page.locator('body')).toHaveAttribute('data-product-awaiting', 'true');
  await page.getByRole('button', { name: '用 Codex 生成' }).click();
  await page.waitForFunction(() => {
    const snapshot = (window as LiveWindow).__creativeLab?.snapshot();
    return snapshot?.state === 'ready' && snapshot.provider.startsWith('codex:') && snapshot.candidates.length >= 2 && snapshot.candidates.every((candidate) => candidate.effectSource === 'model');
  }, undefined, { timeout: 220_000 });
  const snapshot = await page.evaluate(() => (window as LiveWindow).__creativeLab!.snapshot());
  expect(snapshot.requestedProvider).toBe('codex');
  expect(snapshot.provider).toMatch(/^codex:/);
  expect(snapshot.model).toBeTruthy();
  expect(snapshot.selectedId).toBeTruthy();
  expect(snapshot.candidates.every((candidate) => candidate.effectSource === 'model')).toBe(true);
  await expect(page.locator('.wb-generation-source')).toContainText('MODEL EFFECTSPEC');
  await expect(page.locator('.wb-generation-trace')).toBeVisible();
  await expect(page.locator('[data-trace-runtime]')).not.toHaveText('NONE');
  await expect(page.locator('#creative-stage-frame')).toHaveClass(/is-ready/);
});
