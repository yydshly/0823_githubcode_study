import { expect, test } from '@playwright/test';

const receipt = {
  id: 'dedicated-server-r44',
  provider: 'codex',
  model: 'gpt-5.6-sol',
  status: 'compiled',
  previewUrl: '/generated-runs/dedicated-server-r44/',
  generatedAt: '2026-08-26T15:00:00.000Z',
  files: 5,
  assets: 1,
  sourceBytes: 18000,
  hasShaders: true,
  compileMs: 320,
  attempts: 1,
  directory: 'generated/runs/dedicated-server-r44',
};

const completeJob = {
  schemaVersion: 1,
  id: 'job-aaaaaaaaaaaaaaaa',
  fingerprint: 'a'.repeat(24),
  brief: '为一枚收集雨声的声学器物构建网页。',
  provider: 'codex',
  executionOwner: 'server',
  selectedProvider: 'codex',
  quality: 'high',
  seed: 68,
  status: 'complete',
  stage: 'complete',
  message: '服务端已经选出最终最佳网页。',
  model: 'gpt-5.6-sol',
  runId: 'run-server-r44',
  selectedId: 'candidate-server-r44',
  assetRoute: 'catalog',
  assetCount: 1,
  sourceRunId: receipt.id,
  bestRunId: receipt.id,
  bestPreviewUrl: receipt.previewUrl,
  sourceReceipt: receipt,
  bestReceipt: receipt,
  decision: 'kept',
  sourceScore: 92,
  finalScore: 94,
  error: null,
  retryableStage: null,
  createdAt: '2026-08-26T15:00:00.000Z',
  updatedAt: '2026-08-26T15:03:00.000Z',
  finishedAt: '2026-08-26T15:03:00.000Z',
  history: [],
};

test('remote generation is server-owned and the workbench only restores the final result', async ({ page }) => {
  let clientBuildCalls = 0;
  let clientRefineCalls = 0;

  await page.route('**/api/creative/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      defaultProvider: 'codex',
      providers: [
        { id: 'codex', available: true, model: 'gpt-5.6-sol', reason: null, capabilities: ['creative-analysis', 'code-synthesis'] },
        { id: 'local', available: true, model: 'baseline-keyword-v1', reason: null, capabilities: ['deterministic-analysis'] },
      ],
    }),
  }));
  await page.route('**/api/creative/jobs', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ job: { ...completeJob, status: 'running', stage: 'planning' } }) });
  });
  await page.route('**/api/creative/jobs/job-aaaaaaaaaaaaaaaa', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ job: completeJob }),
  }));
  await page.route('**/api/creative/code/generate', (route) => {
    clientBuildCalls += 1;
    return route.fulfill({ status: 500, body: 'client build must not run' });
  });
  await page.route('**/api/creative/code/refine', (route) => {
    clientRefineCalls += 1;
    return route.fulfill({ status: 500, body: 'client refine must not run' });
  });
  await page.route('**/generated-runs/dedicated-server-r44/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body style="background:#edf0e9"><h1>晨雨，留在这里。</h1></body></html>',
  }));

  await page.goto('/workbench.html?provider=codex&quality=high');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await page.locator('#generate').click();

  await expect(page.locator('#creative-stage-frame')).toHaveAttribute('src', /dedicated-server-r44/);
  await expect(page.locator('[data-direct-state]')).toContainText('GPT-5.6-SOL');
  await expect(page.locator('#workbench-status')).toContainText('最终最佳网页');
  expect(clientBuildCalls).toBe(0);
  expect(clientRefineCalls).toBe(0);
});

declare global {
  interface Window {
    __creativeLab?: { snapshot: () => { state: string } };
  }
}
