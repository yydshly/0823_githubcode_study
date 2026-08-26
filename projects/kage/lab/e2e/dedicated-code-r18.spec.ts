import { expect, test } from '@playwright/test';

const receipt = {
  id: 'dedicated-test-r18',
  provider: 'codex',
  model: 'gpt-5.4',
  status: 'compiled',
  previewUrl: '/generated-runs/dedicated-test-r18/',
  files: 4,
  assets: 0,
  sourceBytes: 12840,
  hasShaders: true,
  compileMs: 721,
  attempts: 1
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/creative/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        providers: [
          { id: 'local', available: true, reason: null },
          { id: 'codex', available: true, reason: null }
        ]
      })
    });
  });
  await page.route('**/api/creative/code/refine', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result: {
      status: 'kept', parentId: receipt.id, receipt,
      sourceAssessment: { verdict: 'pass', score: 92, findings: [] },
      finalAssessment: { verdict: 'pass', score: 92, findings: [] },
      visualAcceptance: { verdict: 'pass', score: 92, assetRole: 'not-applicable', findings: [] },
      summary: 'Browser states passed.', resolved: [], remaining: []
    } }) });
  });
});

test('builds and displays a compiled dedicated-code experience in a sandbox', async ({ page }) => {
  await page.route('**/api/creative/code/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ receipt }) });
  });
  await page.route('**/generated-runs/dedicated-test-r18/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><body style="background:#071014;color:white"><h1>Dedicated R18</h1></body></html>'
    });
  });

  await page.goto('/workbench.html?provider=local&quality=balanced');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  const build = page.locator('#build-dedicated-experience');
  await expect(build).toBeEnabled();
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#build-dedicated-experience')?.click());

  const frame = page.locator('#creative-stage-frame');
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
  await expect(frame).toHaveAttribute('src', /generated-runs\/dedicated-test-r18/);
  await expect(page.locator('.wb-direct-build-receipt')).toHaveAttribute('data-state', 'kept');
  await expect(page.locator('[data-direct-compile]')).toHaveText('BROWSER CHECKED');
  await expect(page.locator('[data-direct-security]')).toHaveText('ORIGINAL KEPT');
  await expect(page.locator('#creative-stage-title')).toContainText('专属代码版');
  await expect(frame.contentFrame().getByRole('heading', { name: 'Dedicated R18' })).toBeVisible();
});

test('keeps the current preview when dedicated code is rejected', async ({ page }) => {
  await page.route('**/api/creative/code/generate', async (route) => {
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'TypeScript compilation failed' })
    });
  });
  await page.goto('/workbench.html?provider=local&quality=balanced');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  const frame = page.locator('#creative-stage-frame');
  const original = await frame.getAttribute('src');

  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#build-dedicated-experience')?.click());

  await expect(page.locator('.wb-direct-build-receipt')).toHaveAttribute('data-state', 'failed');
  await expect(page.locator('[data-direct-compile]')).toHaveText('FAILED');
  await expect(frame).toHaveAttribute('src', original!);
  await expect(frame).not.toHaveAttribute('sandbox', 'allow-scripts');
  await expect(page.locator('#workbench-status')).toContainText('原预览保持不变');
});

test('keeps the dedicated build workflow inside a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/creative/code/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ receipt }) });
  });
  await page.route('**/generated-runs/dedicated-test-r18/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
  });
  await page.goto('/workbench.html?provider=local&quality=balanced');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('#build-dedicated-experience')?.click());
  await expect(page.locator('.wb-direct-build-receipt')).toHaveAttribute('data-state', 'kept');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('#generate')).toBeVisible();
});

declare global {
  interface Window {
    __creativeLab?: { snapshot: () => { state: string } };
  }
}
