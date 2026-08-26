import { expect, test } from '@playwright/test';

const observatoryBrief = '为一座漂浮在云层中的未来天文观测站设计沉浸式网页。滚动时从云海接近观测站，进入透明穹顶，最终看到星图数据在空间中展开。画面安静、真实、具有电影感，不要常见的紫色科技风。';

test('shows the truthful asset to Codex to browser-acceptance route', async ({ page }) => {
  const errors: string[] = [];
  let buildRequest: { reference?: { assets?: Array<{ id?: string }> } } | null = null;
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/api/creative/providers', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ providers: [
      { id: 'local', available: true, reason: null, capabilities: [] },
      { id: 'codex', available: true, reason: null, capabilities: ['brief-interpretation', 'code-generation'] },
      { id: 'minimax', available: true, reason: null, capabilities: ['image-generation'] }
    ] })
  }));
  await page.route('**/api/creative/code/generate', async (route) => {
    buildRequest = route.request().postDataJSON() as typeof buildRequest;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ receipt: {
      id: 'dedicated-r39-browser-proof', provider: 'codex', model: 'gpt-5.6-sol', status: 'compiled',
      previewUrl: '/generated-runs/dedicated-r39-browser-proof/', files: 4, assets: 3, sourceBytes: 24000,
      hasShaders: true, compileMs: 420, attempts: 1
    } }) });
  });
  await page.route('**/api/creative/code/refine', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ result: {
      status: 'kept', parentId: 'dedicated-r39-browser-proof',
      receipt: { id: 'dedicated-r39-browser-proof', provider: 'codex', model: 'gpt-5.6-sol', status: 'compiled', previewUrl: '/generated-runs/dedicated-r39-browser-proof/', files: 4, assets: 3, sourceBytes: 24000, hasShaders: true, compileMs: 420, attempts: 1 },
      sourceAssessment: { verdict: 'pass', score: 91, findings: [] },
      finalAssessment: { verdict: 'pass', score: 91, findings: [] },
      visualAcceptance: { verdict: 'pass', score: 91, assetRole: 'integrated', findings: [] },
      summary: '四状态通过，保留原版本。', resolved: [], remaining: []
    } })
  }));
  await page.route('**/generated-runs/dedicated-r39-browser-proof/**', async (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html><body style="margin:0;background:#09141b;color:#eef8f3;display:grid;place-items:center;min-height:100vh"><h1>Cloud Observatory</h1></body></html>'
  }));
  await page.goto(`/workbench.html?provider=local&quality=high&seed=43&brief=${encodeURIComponent(observatoryBrief)}`);
  await expect(page.locator('#creative-stage-frame')).toHaveClass(/is-ready/);

  const preparation = await page.evaluate(async () => {
    return await (window as typeof window & {
      __creativeLab?: { prepareAssets: () => Promise<{ status: string; route: string; assets: number; message: string }> };
    }).__creativeLab?.prepareAssets();
  });

  expect(preparation).toMatchObject({ status: 'ready', route: 'catalog', assets: 3 });
  await expect(page.locator('#outcome-route-title')).toContainText('3 个高质量素材');
  await expect(page.locator('#outcome-route-title')).toContainText('跳过 MiniMax');
  await expect(page.locator('[data-outcome-step="assets"] strong')).toHaveText('项目优选素材');
  await expect(page.locator('[data-outcome-step="authoring"] strong')).toContainText('Codex 专属构建');
  await expect(page.locator('[data-outcome-step="reviewing"] strong')).toHaveText('真实页面验收');

  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#build-dedicated-experience')?.click());
  await expect(page.locator('#outcome-route-title')).toHaveText('最终最佳网页已交付');
  await expect(page.locator('#outcome-route-note')).toContainText('91 分');
  await expect(page.locator('#creative-stage-placeholder')).toHaveClass(/is-hidden/);
  await expect(page.locator('#creative-stage-frame').contentFrame().getByRole('heading', { name: 'Cloud Observatory' })).toBeVisible();
  expect(buildRequest?.reference?.assets).toHaveLength(3);
  expect(buildRequest?.reference?.assets?.map((asset) => asset.id)).toEqual([
    'observatory-cloud-approach-v1',
    'observatory-dome-interior-v1',
    'observatory-star-atlas-v1'
  ]);

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desktopOverflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'evidence/r39-workbench-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#generate')).toBeVisible();
  await expect(page.locator('#outcome-route')).toBeVisible();
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(mobileOverflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'evidence/r39-workbench-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});
