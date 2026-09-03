import { expect, test, type Page, type Route } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const jobId = 'job-5757575757575757';
const brief = '为修复工坊生成一张可调节纸张含水率的明亮交互网页。';
const previewUrl = '/generated-runs/r57-interactive-proof/';

function job(preview = previewUrl) {
  const now = '2026-08-29T08:00:00.000Z';
  return {
    id: jobId,
    status: 'review-required',
    executionOwner: 'server',
    stage: 'review-required',
    message: '网页已生成，可在工作台内检查。',
    brief,
    sourceReceipt: null,
    bestReceipt: {
      id: 'r57-interactive-proof', provider: 'codex', model: 'gpt-5.6-sol', status: 'compiled',
      previewUrl: preview, files: 3, assets: 0, sourceBytes: 2400, hasShaders: false,
      compileMs: 120, attempts: 1
    },
    bestRunId: 'r57-interactive-proof',
    sourceScore: null,
    finalScore: null,
    deliveryQuality: {
      targetAssetQuality: 'L3-presentable', achievedAssetQuality: 'L2-inspectable',
      status: 'prototype-only', finalEligible: false, summary: '等待视觉确认。',
      experience: {
        status: 'pending', score: null, structureMode: 'interactive-field', expectedStateCount: 2,
        reviewedStateCount: 0, archiveEligible: false, summary: '等待内嵌交互检查。', issues: []
      }
    },
    error: null,
    retryableStage: 'reviewing',
    createdAt: now,
    updatedAt: now,
    finishedAt: now,
    history: [{ stage: 'review-required', at: now, message: '停在可运行结果。' }],
    assetGate: null
  };
}

async function routeJob(page: Page, preview = previewUrl): Promise<void> {
  await page.route(`**/api/creative/jobs/${jobId}`, (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ job: job(preview) })
  }));
}

test('renders and operates the real generated page inside the workbench on desktop and mobile', async ({ page }) => {
  await routeJob(page);
  await page.route(`**${previewUrl}**`, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: `<!doctype html>
      <html><head><meta charset="utf-8"><style>
        html,body{margin:0;min-height:100%;background:#f1eee5;color:#18211d;font-family:system-ui}
        #app{min-height:100vh;display:grid;place-content:center;gap:24px;padding:32px;box-sizing:border-box}
        output{font:700 52px/1 Georgia;color:#9b552f} input{width:min(72vw,560px)}
      </style></head><body data-signal-embed="true"><main id="app">
        <p>纸张修复工坊 · 含水率控制</p><output id="moisture">32%</output>
        <input aria-label="纸张含水率" type="range" min="10" max="80" value="32">
      </main><script>
        const input=document.querySelector('input'); const output=document.querySelector('output');
        input.addEventListener('input',()=>{output.textContent=input.value+'%';document.body.dataset.moisture=input.value});
      </script></body></html>`
  }));

  await page.goto(`/workbench.html?provider=codex&job=${jobId}&brief=${encodeURIComponent(brief)}`);
  const shell = page.locator('.wb-stage-shell');
  const iframe = page.locator('#creative-stage-frame');
  await expect(shell).toHaveAttribute('data-preview-state', 'ready');
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  const frame = page.frameLocator('#creative-stage-frame');
  await expect(frame.locator('#app')).toBeVisible();
  await expect(frame.locator('#moisture')).toHaveText('32%');
  await frame.locator('input[type="range"]').fill('61');
  await expect(frame.locator('#moisture')).toHaveText('61%');
  await expect(page.locator('#creative-stage-placeholder')).toHaveClass(/is-hidden/);
  await expect(page.locator('#creative-stage-open')).not.toHaveAttribute('aria-disabled', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-r57-embedded-preview-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(frame.locator('#app')).toBeVisible();
  await expect(frame.locator('#moisture')).toHaveText('61%');
  await page.locator('#creative-stage-open').focus();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('creative-stage-open');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-r57-embedded-preview-mobile.png'), fullPage: true });
});

test('replaces an invalid embedded result with an actionable full-page fallback', async ({ page }) => {
  const missing = '/generated-runs/r57-missing-preview/';
  await routeJob(page, missing);
  await page.route(`**${missing}**`, (route) => route.fulfill({
    status: 404,
    contentType: 'text/html',
    body: '<!doctype html><html><body><p>missing</p></body></html>'
  }));
  await page.goto(`/workbench.html?provider=codex&job=${jobId}&brief=${encodeURIComponent(brief)}`);
  await expect(page.locator('.wb-stage-shell')).toHaveAttribute('data-preview-state', 'failed');
  await expect(page.locator('#creative-stage-placeholder')).toBeVisible();
  await expect(page.locator('#creative-stage-placeholder strong')).toHaveText('工作台预览未显示');
  await expect(page.locator('#creative-stage-placeholder p')).toContainText('完整网页仍可单独打开');
  await expect(page.locator('#creative-stage-open')).not.toHaveAttribute('aria-disabled', 'true');
});
