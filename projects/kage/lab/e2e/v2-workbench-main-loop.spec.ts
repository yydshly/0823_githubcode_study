import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dreamBrief = '为一款帮助人记录梦境的产品设计网页。开场像刚醒来的模糊房间，滚动时记忆碎片逐渐形成可探索空间，最后收束为记录今晚的梦。';

test('shows the V2 generation boundary before authoring and remains operable on mobile keyboard flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workbench.html?provider=local&quality=balanced&brief=${encodeURIComponent(dreamBrief)}`);
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');

  await expect(page.locator('#v2-contract-summary')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#v2-contract-capabilities')).toContainText('连续媒体滚动叙事');
  await expect(page.locator('#v2-contract-renderer')).toContainText('连续媒体');
  await expect(page.locator('#v2-contract-reference-reasons')).not.toHaveText('等待目标后解释');
  await expect(page.locator('#v2-contract-capability-reasons')).not.toHaveText('等待目标后解释');
  await expect(page.locator('#v2-contract-review-modes')).toContainText('叙事节拍');
  await expect(page.locator('#experience-quality')).toBeVisible();
  await expect(page.locator('#experience-quality-verdict')).toHaveText('方向已确定 · 等待生成');
  await expect(page.locator('#experience-quality-coverage')).toHaveText('0 / 4 个状态');
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.locator('#generate').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready');
  await expect(page.locator('#v2-contract-state')).toContainText('本地约束');
  await page.screenshot({ path: join(tmpdir(), 'kage-v2-workbench-transparency-mobile.png'), fullPage: true });
});

test('renders persisted phase durations and the actual bottleneck without starting a model run', async ({ page }) => {
  const jobId = 'job-1234567890abcdef';
  const at = (seconds: number) => new Date(Date.UTC(2026, 7, 27, 0, 0, seconds)).toISOString();
  await page.route(`**/api/creative/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: {
          id: jobId,
          status: 'complete',
          executionOwner: 'server',
          stage: 'complete',
          message: '浏览器验收完成，原版本就是当前最佳网页。',
          brief: dreamBrief,
          sourceReceipt: null,
          bestReceipt: null,
          bestRunId: null,
          sourceScore: 88,
          finalScore: 94,
          deliveryQuality: {
            renderQuality: 'high',
            targetAssetQuality: 'L3-presentable',
            achievedAssetQuality: 'L3-presentable',
            status: 'final-eligible',
            finalEligible: true,
            summary: '素材、产品结构和视觉验收均已通过。',
            experience: {
              status: 'pass',
              score: 93,
              structureMode: 'continuous-canvas',
              expectedStateCount: 4,
              reviewedStateCount: 4,
              stateCoverage: 1,
              modelJudgment: 'pass',
              archiveEligible: true,
              summary: '连续画布覆盖 4/4 个产品状态，达到最终归档标准。',
              issues: []
            }
          },
          error: null,
          retryableStage: null,
          createdAt: at(0),
          updatedAt: at(54),
          finishedAt: at(54),
          history: [
            { stage: 'planning', at: at(0), message: '规划' },
            { stage: 'assets', at: at(4), message: '素材' },
            { stage: 'authoring', at: at(10), message: '构建' },
            { stage: 'reviewing', at: at(38), message: '验收' },
            { stage: 'refining', at: at(46), message: '精修' },
            { stage: 'complete', at: at(54), message: '完成' }
          ],
          assetGate: null
        }
      })
    });
  });
  await page.goto(`/workbench.html?provider=codex&job=${jobId}&brief=${encodeURIComponent(dreamBrief)}`);
  await expect(page.locator('#execution-trace')).toBeVisible();
  await expect(page.locator('[data-execution-state]')).toContainText('总耗时 54s');
  await expect(page.locator('[data-execution-phase="authoring"] [data-execution-duration]')).toHaveText('28s');
  await expect(page.locator('[data-execution-note]')).toContainText('当前耗时最多：Codex 构建 28s');
  await expect(page.locator('#experience-quality')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#experience-quality-structure')).toHaveText('已通过');
  await expect(page.locator('#experience-quality-coverage')).toHaveText('4 / 4');
  await expect(page.locator('#experience-quality-score')).toHaveText('94 / 100');
  await expect(page.locator('#experience-quality-archive')).toHaveText('已定稿 · 可入精选');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-v2-workbench-transparency-desktop.png'), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#execution-trace')).toBeVisible();
  await expect(page.locator('[data-execution-state]')).toContainText('总耗时 54s');
  await expect(page.locator('[data-execution-phase="authoring"] [data-execution-duration]')).toHaveText('28s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-v2-workbench-telemetry-mobile.png'), fullPage: true });
});

test('puts a review-required result, stop reason and runnable page link before internal telemetry', async ({ page }) => {
  const jobId = 'job-a25c897814be550b';
  const now = new Date().toISOString();
  await page.route(`**/api/creative/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: {
          id: jobId, provider: 'codex', selectedProvider: 'codex', status: 'review-required', stage: 'review-required',
          message: '专属网页已经生成并可运行；自动视觉验收未完成。', model: 'gpt-5.6-sol', brief: dreamBrief,
          assetRoute: 'procedural', assetCount: 0, assetGate: null,
          deliveryQuality: {
            renderQuality: 'high', targetAssetQuality: 'L3-presentable', achievedAssetQuality: 'L2-inspectable',
            status: 'prototype-only', finalEligible: false, summary: '当前为待定稿结果。',
            experience: {
              status: 'pending', score: null, structureMode: 'interactive-field', expectedStateCount: 4,
              reviewedStateCount: 0, stateCoverage: 0, modelJudgment: 'pending', archiveEligible: false,
              summary: '等待浏览器状态证据与最终视觉判断。', issues: []
            }
          },
          sourceReceipt: null,
          bestReceipt: { id: 'dedicated-example', provider: 'codex', model: 'gpt-5.6-sol', status: 'compiled', previewUrl: '/generated-runs/dedicated-example/', files: 4, assets: 0, sourceBytes: 1000, hasShaders: false, compileMs: 200, attempts: 1 },
          bestRunId: 'dedicated-example', bestPreviewUrl: '/generated-runs/dedicated-example/', sourceScore: null, finalScore: null,
          error: '专属代码模型调用超过 90 秒。', retryableStage: 'reviewing', createdAt: now, updatedAt: now, finishedAt: now,
          history: [{ stage: 'planning', at: now, message: '规划' }, { stage: 'review-required', at: now, message: '停止' }],
          v2ContractSummary: null
        }
      })
    });
  });
  await page.goto(`/workbench.html?provider=codex&job=${jobId}&brief=${encodeURIComponent(dreamBrief)}`);

  const result = page.locator('#experience-quality');
  await expect(result).toHaveAttribute('data-state', 'review');
  await expect(page.locator('#experience-quality-verdict')).toHaveText('网页已生成 · 待视觉定稿');
  await expect(page.locator('[data-result-page]')).toHaveText('已生成，可查看');
  await expect(page.locator('[data-result-refinement]')).toHaveText('达到上限，已停止');
  await expect(page.locator('[data-result-stop-reason]')).toContainText('当前网页仍可查看');
  await expect(page.locator('[data-result-link]')).toHaveAttribute('href', '/generated-runs/dedicated-example/');
  const resultTop = await result.evaluate((node) => node.getBoundingClientRect().top);
  const contractTop = await page.locator('#v2-contract-summary').evaluate((node) => node.getBoundingClientRect().top);
  expect(resultTop).toBeLessThan(contractTop);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(result).toBeVisible();
  await expect(page.locator('[data-result-link]')).toBeVisible();
  await page.locator('[data-result-link]').focus();
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-result-link'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-r56-review-required-mobile.png'), fullPage: true });
});

test('shows bounded local recovery in the existing workbench without starting a model run', async ({ page }) => {
  const jobId = 'job-fedcba0987654321';
  const now = new Date().toISOString();
  const message = '本地确定性修复 1/2：为 1 处 scene.background.set 增加 THREE.Color 类型保护。不会重新调用模型。';
  await page.route(`**/api/creative/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: {
          id: jobId,
          provider: 'codex',
          selectedProvider: 'codex',
          status: 'running',
          executionOwner: 'server',
          stage: 'authoring',
          message,
          model: 'gpt-5.6-sol',
          brief: dreamBrief,
          assetRoute: 'procedural',
          assetCount: 0,
          assetGate: null,
          deliveryQuality: null,
          sourceReceipt: null,
          bestReceipt: null,
          bestRunId: null,
          bestPreviewUrl: null,
          sourceScore: null,
          finalScore: null,
          error: null,
          retryableStage: null,
          createdAt: now,
          updatedAt: now,
          finishedAt: null,
          history: [
            { stage: 'planning', at: now, message: '规划' },
            { stage: 'authoring', at: now, message: '模型候选已保存到 .artifacts/generation-candidates/run/attempt-01。' },
            { stage: 'authoring', at: now, message }
          ]
        }
      })
    });
  });
  await page.goto(`/workbench.html?provider=codex&job=${jobId}&brief=${encodeURIComponent(dreamBrief)}`);
  await expect(page.locator('#workbench-status')).toContainText('本地确定性修复 1/2');
  await expect(page.locator('#workbench-status')).toContainText('不会重新调用模型');
  await expect(page.locator('#run-id')).toContainText('authoring');
  await expect(page.locator('[data-execution-phase="authoring"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-v2-bounded-recovery-r53.png'), fullPage: true });
});

declare global {
  interface Window {
    __creativeLab?: { snapshot: () => { state: string } };
  }
}
