import { expect, test } from '@playwright/test';

test('passes a matching ChatGPT project asset into the dedicated GPT-5.6 build request', async ({ page }) => {
  let requestBody: Record<string, unknown> | null = null;
  const receipt = {
    id: 'dedicated-asset-r20', provider: 'codex', model: 'gpt-5.6-sol', status: 'compiled',
    previewUrl: '/generated-runs/dedicated-asset-r20/', files: 4, assets: 2, sourceBytes: 16000,
    hasShaders: true, compileMs: 500, attempts: 1
  };
  await page.route('**/api/creative/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ providers: [{ id: 'local', available: true, reason: null }, { id: 'codex', available: true, reason: null }] })
    });
  });
  await page.route('**/api/creative/code/generate', async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ receipt })
    });
  });
  await page.route('**/api/creative/code/refine', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: {
      status: 'kept', parentId: receipt.id, receipt,
      sourceAssessment: { verdict: 'pass', score: 90, findings: [] },
      finalAssessment: { verdict: 'pass', score: 90, findings: [] },
      visualAcceptance: { verdict: 'pass', score: 90, assetRole: 'integrated', findings: [] },
      summary: 'Asset-aware version kept.', resolved: [], remaining: []
    } }) });
  });
  await page.route('**/generated-runs/dedicated-asset-r20/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body><h1>Asset aware</h1></body></html>' });
  });

  const brief = '为一个先锋时装品牌设计梦幻流体光幕、柔和但有张力的编辑感沉浸式网页，面向年轻创意人群。';
  await page.goto(`/workbench.html?provider=local&quality=balanced&brief=${encodeURIComponent(brief)}`);
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#build-dedicated-experience')?.click());
  await expect(page.locator('.wb-direct-build-receipt')).toHaveAttribute('data-state', 'kept');
  const reference = (requestBody as { reference?: { assets?: unknown[] } } | null)?.reference;
  expect(reference?.assets).toEqual([
    expect.objectContaining({
      id: 'fashion-fluid-couture-cutout-v2',
      uri: '/creative-assets/fashion-fluid-couture-cutout-v2.png',
      source: 'chatgpt-generated'
    }),
    expect.objectContaining({
      id: 'fashion-fluid-couture-v1',
      uri: '/creative-assets/fashion-fluid-couture-v1.png',
      source: 'chatgpt-generated'
    })
  ]);
  await expect(page.locator('#outcome-route-title')).toHaveText('最终最佳网页已交付');
});

declare global {
  interface Window { __creativeLab?: { snapshot: () => { state: string } }; }
}
