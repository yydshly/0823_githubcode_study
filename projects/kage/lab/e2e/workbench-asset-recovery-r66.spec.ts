import { expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const jobId = 'job-6600000000000001';
const brief = '为一座雨水教育花园设计可探索网页，让访客看见雨滴从屋顶进入花园、被土壤吸收并重新滋养植物的过程。';
const now = new Date(Date.UTC(2026, 7, 29, 0, 0, 0)).toISOString();

const requests = [
  {
    requirementId: 'state-subject',
    role: '雨滴到花园的连续主视觉',
    modality: 'image-sequence',
    minimumQuality: 'L3-presentable',
    recommendedSource: 'chatgpt-imagegen',
    responsibility: '同一花园视角下，雨滴从屋檐落下、进入浅沟并被植物根系吸收的连续状态。',
    continuity: '镜位、花园结构和光线方向保持一致，只改变水的行进状态。',
    proof: '至少提供 4 个连续状态，并能在滚动过程中逐帧核对。',
    reason: '程序化粒子不能承担真实场所与水循环路径的主要叙事。'
  },
  {
    requirementId: 'garden-model',
    role: '雨水花园空间模型',
    modality: 'model-3d',
    minimumQuality: 'L4-production',
    recommendedSource: 'user-or-licensed',
    responsibility: '可辨认屋檐、浅沟、种植池与溢流口关系的真实空间模型。',
    continuity: '模型比例、材质命名与坐标原点稳定。',
    proof: 'GLB 可加载，关键节点可被相机和交互脚本引用。',
    reason: '空间关系属于业务证据，不能用任意几何体替代。'
  }
] as const;

function blockedJob() {
  return {
    id: jobId,
    provider: 'codex',
    selectedProvider: 'codex',
    status: 'blocked',
    executionOwner: 'server',
    stage: 'blocked',
    message: '关键主视觉与空间模型尚未达到目标质量，Codex 编码暂未开始。',
    model: 'gpt-5.6-sol',
    brief,
    assetRoute: 'blocked',
    assetCount: 0,
    assetGate: {
      decision: 'needs-codex-assets',
      summary: '需要补齐承担产品叙事和空间证据的真实素材。',
      requests
    },
    deliveryQuality: null,
    sourceReceipt: null,
    bestReceipt: null,
    bestRunId: null,
    bestPreviewUrl: null,
    sourceScore: null,
    finalScore: null,
    error: '需要补齐承担产品叙事和空间证据的真实素材。',
    retryableStage: 'assets',
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    history: [
      { stage: 'planning', at: now, message: '目标已解释。' },
      { stage: 'assets', at: now, message: '正在检查素材职责。' },
      { stage: 'blocked', at: now, message: '等待关键素材。' }
    ],
    v2ContractSummary: null,
    intentProvenance: null
  };
}

async function installAssetRecoveryFixture(page: Page) {
  let resumed = false;
  let importBody: Record<string, unknown> | null = null;
  let resumeBody: Record<string, unknown> | null = null;

  await page.route('**/api/creative/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ providers: [{ id: 'codex', available: true, reason: null }] })
    });
  });
  await page.route(`**/api/creative/jobs/${jobId}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const job = resumed
      ? { ...blockedJob(), status: 'running', stage: 'authoring', message: '素材已绑定到原任务，正在从 Codex 编码阶段继续。', assetGate: null, error: null }
      : blockedJob();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job }) });
  });
  await page.route('**/api/creative/assets/import', async (route) => {
    importBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        asset: {
          id: 'asset-6600000000000001',
          requirementId: 'uploaded-image',
          uri: '/api/creative/assets/asset-6600000000000001',
          bundlePath: 'assets/rain-garden-state.png',
          kind: 'image',
          modality: 'image',
          source: 'user-provided',
          role: requests[0].responsibility,
          description: 'PNG 图片 · L2 可检查资产 · 上传文件 rain-garden-state.png',
          payloadBytes: 68,
          qualityLevel: 'L2-inspectable',
          publishable: false,
          license: null,
          evidence: ['通过 PNG 文件签名检查', '等待最终视觉验收']
        }
      })
    });
  });
  await page.route(`**/api/creative/jobs/${jobId}/assets`, async (route) => {
    resumeBody = route.request().postDataJSON() as Record<string, unknown>;
    resumed = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job: { ...blockedJob(), status: 'running', stage: 'authoring', message: '素材已绑定到原任务，正在从 Codex 编码阶段继续。', assetGate: null, error: null }
      })
    });
  });

  return {
    imported: () => importBody,
    resumed: () => resumeBody
  };
}

test('copies an exact asset task, binds an uploaded file and resumes the same job', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const captured = await installAssetRecoveryFixture(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/workbench.html?provider=codex&quality=high&job=${jobId}&brief=${encodeURIComponent(brief)}`);

  await expect(page.locator('.wb-asset-gate')).toBeVisible();
  await expect(page.locator('.wb-asset-gate__item')).toHaveCount(2);
  await expect(page.locator('#candidate-grid')).not.toContainText('模型不可用');
  await expect(page.locator('.wb-asset-intake')).toBeVisible();
  const select = page.locator('.wb-asset-intake select');
  await expect(select.locator('option')).toHaveCount(2);

  await page.locator('.wb-asset-intake [data-copy-asset-task]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-asset-intake-result]')).toContainText('同一 Job 会继续');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(brief);
  expect(copied).toContain('state-subject');
  expect(copied).toContain('不要添加文字、箭头、红框');

  await select.selectOption('1');
  await expect(page.locator('.wb-asset-intake input[type="file"]')).toHaveAttribute('accept', '.glb,model/gltf-binary');
  await select.selectOption('0');
  await expect(page.locator('.wb-asset-intake input[type="file"]')).toHaveAttribute('accept', '.png,.jpg,.jpeg,image/png,image/jpeg');

  await page.locator('.wb-asset-intake input[type="file"]').setInputFiles({
    name: 'rain-garden-state.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Wl0sAAAAASUVORK5CYII=', 'base64')
  });
  await page.locator('.wb-asset-intake [data-import-asset]').focus();
  await page.keyboard.press('Enter');

  await expect(page.locator('#workbench-status')).toContainText('绑定到原任务');
  await expect(page.locator('.wb-asset-intake')).toBeHidden();
  await expect(page.locator('.wb-asset-gate')).toHaveCount(0);
  await expect(page.locator('#candidate-grid')).toContainText('正在继续构建专属网页');
  expect(captured.imported()).toMatchObject({ fileName: 'rain-garden-state.png', contentType: 'image/png' });
  expect(captured.resumed()).toEqual({ attachments: [{ assetId: 'asset-6600000000000001', requirementId: 'state-subject' }] });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-r66-asset-recovery-desktop.png'), fullPage: true });
});

test('keeps the asset recovery controls usable at 390px without horizontal overflow', async ({ page }) => {
  await installAssetRecoveryFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/workbench.html?provider=codex&quality=high&job=${jobId}&brief=${encodeURIComponent(brief)}`);

  await expect(page.locator('.wb-asset-intake')).toBeVisible();
  await expect(page.locator('.wb-asset-intake select')).toBeVisible();
  await expect(page.locator('.wb-asset-intake [data-copy-asset-task]')).toBeVisible();
  await expect(page.locator('.wb-asset-intake [data-import-asset]')).toBeVisible();
  await page.locator('.wb-asset-intake select').focus();
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('选择素材职责');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), 'kage-r66-asset-recovery-mobile.png'), fullPage: true });
});
