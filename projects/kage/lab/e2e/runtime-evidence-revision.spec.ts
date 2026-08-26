import { expect, test } from '@playwright/test';

type LabSnapshot = {
  state: string;
  selectedId: string | null;
  evaluation: { state: string; status: string | null; manualChecks: number };
  runtimeEvidence: { state: string; bundleId: string | null; samples: string[]; error: string | null };
  localRevision: { state: string; resultId: string | null; revisedCandidateId: string | null; changedPaths: string[] };
};

async function snapshot(page: import('@playwright/test').Page): Promise<LabSnapshot> {
  return page.evaluate(() => (window as Window & { __creativeLab?: { snapshot: () => LabSnapshot } }).__creativeLab!.snapshot());
}

async function waitForWorkbench(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => (window as Window & { __creativeLab?: { snapshot: () => LabSnapshot } }).__creativeLab?.snapshot().state === 'ready');
}

test('attaches desktop, mobile and fallback runtime evidence to the evaluation report', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-engineering-actions summary').click();
  await page.getByRole('button', { name: '采集真实运行证据' }).click();
  await page.waitForFunction(() => (window as Window & { __creativeLab?: { snapshot: () => LabSnapshot } }).__creativeLab?.snapshot().runtimeEvidence.state === 'ready', null, { timeout: 45_000 });

  const collected = await snapshot(page);
  expect(collected.runtimeEvidence).toMatchObject({
    state: 'ready', samples: ['desktop-webgl', 'mobile-webgl', 'mobile-fallback'], error: null
  });
  expect(collected.runtimeEvidence.bundleId).toMatch(/^runtime-evidence-/);
  expect(collected.evaluation).toMatchObject({ state: 'ready', status: 'needs-review', manualChecks: 3 });
  await expect(page.getByRole('status')).toContainText('已附加真实运行证据');

  await page.getByRole('button', { name: '检查 RuntimeEvidence' }).click();
  await expect(page.locator('#manifest-title')).toHaveText('RuntimeEvidenceBundle v1');
  await expect(page.locator('#manifest-json')).toContainText('"screenshotVisionUsed": false');
  await expect(page.locator('#manifest-json')).toContainText('desktop-webgl');
  await expect(page.locator('#manifest-json')).toContainText('mobile-fallback');
  await expect(page.locator('#manifest-json')).toContainText('"horizontalOverflow": false');
  await page.getByRole('button', { name: '关闭生成产物' }).click();

  await page.getByRole('button', { name: '检查 EvaluationReport' }).click();
  await expect(page.locator('#manifest-json')).toContainText('runtime-evidence');
  await expect(page.locator('#manifest-json')).toContainText('"status": "pass"');
  await expect(page.locator('#manifest-json')).toContainText('desktop-webgl:running:1440x900');
  await page.getByRole('button', { name: '关闭生成产物' }).click();
});

test('applies one bounded natural-language revision and invalidates stale evidence', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  const before = await snapshot(page);
  await page.locator('#revision-instruction').fill('强调色改为 #8fdcff');
  await page.getByRole('button', { name: '执行局部修订' }).click();

  const revised = await snapshot(page);
  expect(revised.selectedId).not.toBe(before.selectedId);
  expect(revised.localRevision).toMatchObject({
    state: 'applied', revisedCandidateId: revised.selectedId,
    changedPaths: ['effectSpec.direction.palette.accent', 'direction.theme.accent', 'manifest.theme.accent', 'manifest.sceneTracks.*.keyframes.*.value.accent']
  });
  expect(revised.runtimeEvidence.state).toBe('idle');
  expect(revised.evaluation.state).toBe('idle');
  await expect(page.getByRole('status')).toContainText('旧运行证据已失效');

  await page.getByRole('button', { name: '检查修订差异' }).click();
  await expect(page.locator('#manifest-title')).toHaveText('LocalRevisionResult v1');
  await expect(page.locator('#manifest-json')).toContainText('"intent": "accent-color"');
  await expect(page.locator('#manifest-json')).toContainText('"unchanged": true');
  await expect(page.locator('#manifest-json')).toContainText('scene-plugin');
  await page.getByRole('button', { name: '关闭生成产物' }).click();

  const href = await page.getByRole('link', { name: '打开 Three.js 实际预览' }).getAttribute('href');
  await page.goto(href!);
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'running');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('#8fdcff');
});

test('keeps unsupported revision honest and usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  const before = await snapshot(page);
  await page.locator('#revision-instruction').fill('让它更高级更震撼');
  await page.getByRole('button', { name: '执行局部修订' }).click();
  const after = await snapshot(page);

  expect(after.selectedId).toBe(before.selectedId);
  expect(after.localRevision).toMatchObject({ state: 'unsupported', revisedCandidateId: null, changedPaths: [] });
  await expect(page.getByRole('status')).toContainText('没有猜测这条指令');
  await expect(page.getByRole('button', { name: '检查修订差异' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await page.screenshot({ path: 'docs/screenshots/phase10-runtime-revision-mobile.png', fullPage: true });
});

test('allows an in-progress evidence run to be cancelled without mutating the candidate', async ({ page }) => {
  await page.goto('/workbench.html?provider=local');
  await waitForWorkbench(page);
  await page.locator('.wb-engineering-actions summary').click();
  const before = await snapshot(page);
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('#collect-evidence-button');
    if (!button) throw new Error('Runtime evidence control is missing.');
    button.click();
    if (button.textContent === '取消运行证据采集') button.click();
  });
  await page.waitForFunction(() => (window as Window & { __creativeLab?: { snapshot: () => LabSnapshot } }).__creativeLab?.snapshot().runtimeEvidence.state === 'idle');

  const after = await snapshot(page);
  expect(after.selectedId).toBe(before.selectedId);
  expect(after.runtimeEvidence).toMatchObject({ state: 'idle', bundleId: null, samples: [], error: null });
  await expect(page.getByRole('status')).toContainText('运行证据采集已取消');
  await expect(page.locator('iframe[title^="runtime evidence"]')).toHaveCount(0);
});
