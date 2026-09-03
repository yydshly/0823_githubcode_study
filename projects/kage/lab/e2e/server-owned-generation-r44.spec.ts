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
  v2ContractSummary: {
    schemaVersion: 1,
    contractId: 'contract-r44-server',
    pattern: 'product-atmosphere',
    structureMode: 'single-scene',
    layoutRule: '以单一产品主体为中心，信息和交互保持在清晰的辅助层。',
    rendererRoute: 'dom-three-hybrid',
    visualRole: 'subject',
    capabilityIds: [],
    capabilityLabels: [],
    referenceIds: ['sports-ai-subject-field'],
    referenceTitles: ['主体标本场'],
    referenceReasons: ['产品主体需要一个清晰、可验证的视觉锚点。'],
    capabilityReasons: ['以真实主体和克制空间反馈完成产品叙事。'],
    reviewModes: ['story-beats', 'mobile-reduced-motion'],
    styleSignature: '单一主体 · 日光中性 · 空间检查 · 功能无衬线',
    styleDifference: '与暗色粒子和通用电影长滚动案例保持明确差异。',
    decisionSummary: '用产品主体、真实素材与克制的空间反馈建立唯一视觉焦点。',
    preparedMs: 3.2,
    authoringPasses: 1,
    refinementPasses: 1,
    stopAfterMinutes: 15,
    storyBeatCount: 3,
    reviewCheckpointCount: 4,
  },
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
  await expect(page.locator('#v2-contract-summary')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#v2-contract-references')).toContainText('主体标本场');
  await expect(page.locator('#v2-contract-renderer')).toContainText('Three.js');
  await expect(page.locator('#v2-contract-limits')).toContainText('3 个产品状态 / 4 个自适应检查点');
  await expect(page.locator('[data-direct-state]')).toContainText('GPT-5.6-SOL');
  await expect(page.locator('#workbench-status')).toContainText('最终最佳网页');
  expect(clientBuildCalls).toBe(0);
  expect(clientRefineCalls).toBe(0);
});

test('keeps the V2 decision visible when the remote task fails', async ({ page }) => {
  const failedJob = {
    ...completeJob,
    status: 'failed',
    stage: 'failed',
    message: '服务端任务停在专属构建，可从该阶段恢复。',
    bestPreviewUrl: null,
    finalScore: null,
    error: 'Codex 构建在时间边界内没有返回可编译页面。',
  };
  await page.route('**/api/creative/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ defaultProvider: 'codex', providers: [{ id: 'codex', available: true, model: 'gpt-5.6-sol', reason: null, capabilities: ['code-synthesis'] }] }),
  }));
  await page.route('**/api/creative/jobs', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ job: { ...failedJob, status: 'running', stage: 'planning', error: null } }),
  }));
  await page.route('**/api/creative/jobs/job-aaaaaaaaaaaaaaaa', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ job: failedJob }),
  }));

  await page.goto('/workbench.html?provider=codex&quality=high');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await page.locator('#generate').click();

  await expect(page.locator('#workbench-error')).toContainText('时间边界');
  await expect(page.locator('#v2-contract-summary')).toHaveAttribute('data-state', 'failed');
  await expect(page.locator('#v2-contract-references')).toContainText('主体标本场');
  await expect(page.locator('#v2-contract-state')).toContainText('约束仍保留');
});

test('shows a compiled page as review-required when visual acceptance times out', async ({ page }) => {
  let createJobCalls = 0;
  const reviewRequiredJob = {
    ...completeJob,
    status: 'review-required',
    stage: 'review-required',
    message: '专属网页已经生成并可运行；自动视觉验收未完成，当前版本保留为待定稿结果。',
    finalScore: null,
    decision: null,
    error: '自动视觉验收超时。',
    retryableStage: 'reviewing',
  };
  await page.route('**/api/creative/providers', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ defaultProvider: 'codex', providers: [{ id: 'codex', available: true, model: 'gpt-5.6-sol', reason: null, capabilities: ['code-synthesis'] }] }),
  }));
  await page.route('**/api/creative/jobs', (route) => {
    createJobCalls += 1;
    return route.fulfill({ status: 500, body: 'restoring a terminal job must not create another job' });
  });
  await page.route('**/api/creative/jobs/job-aaaaaaaaaaaaaaaa', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ job: reviewRequiredJob }),
  }));
  await page.route('**/generated-runs/dedicated-server-r44/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body style="background:#f6f1de"><h1>城市饮水地图</h1></body></html>',
  }));

  await page.goto('/workbench.html?provider=codex&quality=high&job=job-aaaaaaaaaaaaaaaa&brief=城市公共饮水地图');

  await expect(page.locator('#creative-stage-frame')).toHaveAttribute('src', /dedicated-server-r44/);
  await expect(page.locator('#v2-contract-summary')).toHaveAttribute('data-state', 'review');
  await expect(page.locator('#v2-contract-state')).toContainText('待视觉定稿');
  await expect(page.locator('#workbench-error')).toBeHidden();
  await expect(page.locator('#workbench-status')).toContainText('待定稿');
  await expect(page.locator('#creative-stage-open')).not.toHaveAttribute('aria-disabled', 'true');
  expect(createJobCalls).toBe(0);
});

declare global {
  interface Window {
    __creativeLab?: { snapshot: () => { state: string } };
  }
}
