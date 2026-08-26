import { expect, test } from '@playwright/test';

type WorkbenchWindow = Window & {
  __creativeLab?: { snapshot: () => { state: string; provider: string; cacheStatus: string | null; seed: number; runId: string | null; selectedId: string | null; creatorStep: number; candidates: Array<{ id: string; structure: string; scenePlugin: string; planStatus: string; effectSource: string; productionStatus: string; productionMissing: string[]; productionAdaptations: number }>; capabilityProposals: Array<{ id: string; kind: string; targetCapabilityId: string; status: string }>; synthesisWorkspaces: Array<{ id: string; status: string; targetCapabilityId: string; fileCount: number; blockingChecks: number }> } };
  __signalLab?: { snapshot: () => { lifecycle: string; experience: string; flowPlan: { nodeIds: readonly string[] }; capabilityPlan: { status: string }; runtime: { scenePlugin: { id: string } } | null } };
};

async function waitForWorkbench(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as WorkbenchWindow).__creativeLab?.snapshot().creatorStep === 4);
  return page.evaluate(() => (window as WorkbenchWindow).__creativeLab!.snapshot());
}

test('generates three directions internally and auto-selects a real preview', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  const snapshot = await waitForWorkbench(page);
  expect(snapshot.provider).toBe('baseline-keyword-v1');
  expect(snapshot.cacheStatus).toBe('bypass');
  expect(snapshot.candidates).toHaveLength(3);
  expect(new Set(snapshot.candidates.map((item) => item.structure))).toEqual(new Set(['focus', 'journey', 'branching']));
  expect(snapshot.selectedId).toBeTruthy();
  await expect(page.locator('#direction-analysis')).not.toHaveAttribute('open', '');
  const initialRunId = snapshot.runId;
  await page.getByRole('button', { name: '换一个方向' }).click();
  await page.waitForFunction(() => (window as WorkbenchWindow).__creativeLab?.snapshot().seed === 18 && (window as WorkbenchWindow).__creativeLab?.snapshot().creatorStep === 4);
  expect((await page.evaluate(() => (window as WorkbenchWindow).__creativeLab!.snapshot())).runId).not.toBe(initialRunId);

  await page.locator('#direction-analysis summary').click();
  await page.locator('.wb-candidate').nth(2).getByRole('button').click();
  const selected = await page.evaluate(() => (window as WorkbenchWindow).__creativeLab!.snapshot());
  await expect(page.getByRole('link', { name: '打开 Three.js 实际预览' })).toHaveAttribute('href', new RegExp(`generated=${selected.selectedId}`));
  await page.locator('.wb-engineering-actions summary').click();
  await page.getByRole('button', { name: '检查 Manifest' }).click();
  await expect(page.locator('#manifest-json')).toContainText('"schemaVersion": 2');
  await page.getByRole('button', { name: '关闭生成产物' }).click();
});

test('shows an explicit error and preserves an underspecified brief', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('#brief').fill('太短');
  await page.getByRole('button', { name: '生成并构建最佳网页' }).click();
  await page.waitForFunction(() => (window as WorkbenchWindow).__creativeLab?.snapshot().state === 'error');
  await expect(page.getByRole('alert')).toContainText('至少');
  await expect(page.locator('#brief')).toHaveValue('太短');
});

test('keeps example prompts optional and supports keyboard activation', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-prompt-help summary').click();
  await page.getByRole('button', { name: '时装色场' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '生成并构建最佳网页' }).click();
  await page.waitForFunction(() => (window as WorkbenchWindow).__creativeLab?.snapshot().creatorStep === 4 && (window as WorkbenchWindow).__creativeLab?.snapshot().candidates[0]?.scenePlugin === 'chromatic-tide');
  await expect(page.locator('#creative-stage-frame')).toHaveClass(/is-ready/);
});

test('keeps unsupported needs reviewable behind goal explanations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-prompt-help summary').click();
  await page.getByRole('button', { name: '真实资产实验' }).click();
  await page.getByRole('button', { name: '生成并构建最佳网页' }).click();
  await page.waitForFunction(() => (window as WorkbenchWindow).__creativeLab?.snapshot().capabilityProposals.length === 3);
  const snapshot = await page.evaluate(() => (window as WorkbenchWindow).__creativeLab!.snapshot());
  expect(snapshot.capabilityProposals.map((proposal) => proposal.targetCapabilityId)).toEqual(['asset:product-model', 'driver:audio-reactive', 'output:film-export']);
  await page.locator('#advanced-analysis summary').click();
  await expect(page.locator('.wb-proposal')).toHaveCount(3);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.locator('.wb-proposal').first().getByRole('button', { name: '生成隔离草案' }).click();
  await expect(page.locator('#manifest-json')).toContainText('"execution": "never"');
});

test('allows explicit internal-direction inspection without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.locator('#direction-analysis summary').click();
  await page.locator('.wb-candidate').nth(1).getByRole('button').click();
  await expect(page.getByRole('link', { name: '打开 Three.js 实际预览' })).toBeVisible();
});
