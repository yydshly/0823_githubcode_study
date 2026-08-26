import { expect, test } from '@playwright/test';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { assertEffectSpec, compileCompatibilityEffectSpec } from '../src/generation/effect-spec';

const brief = { text: '为独立创作者设计清冷、克制但有未来感的智能声音产品发布网页。', seed: 17 };

test('shows the unavailable asset provider inside folded diagnostics without breaking the workbench', async ({ page }) => {
  await page.route('**/api/creative/providers', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ defaultProvider: 'auto', providers: [
    { id: 'codex', available: true, model: 'gpt-test', reason: null, capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'minimax', available: false, model: 'MiniMax-M3', reason: '缺少 MINIMAX_API_KEY', capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'openai', available: false, model: 'gpt-test', reason: '缺少 OPENAI_API_KEY', capabilities: [] },
    { id: 'local', available: true, model: 'baseline-keyword-v1', reason: null, capabilities: ['deterministic-analysis', 'registered-three-runtime', 'browser-preview'] }
  ] }) }));
  await page.goto('/workbench.html?provider=local');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().creatorStep === 4);
  const minimax = page.locator('#provider option[value="minimax"]');
  await expect(minimax).toHaveAttribute('disabled', '');
  await expect(minimax).toHaveAttribute('title', '缺少 MINIMAX_API_KEY');
  await page.locator('.wb-engineering-actions summary').click();
  await expect(page.getByRole('button', { name: '素材生成：无需调用' })).toBeDisabled();
  await expect(page.locator('.wb-candidate')).toHaveCount(3);
});

test('materializes an approved model asset from folded diagnostics and keeps the selected live preview', async ({ page }) => {
  const baseline = await new BaselineBriefInterpreter().interpret(brief);
  const directions = baseline.directions.map((direction) => ({ ...direction, scenePlugin: 'composed-world' as const }));
  const effectSpecs = directions.map((direction, index) => {
    const base = compileCompatibilityEffectSpec(brief, baseline, direction);
    if (index !== 0) return base;
    return assertEffectSpec({
      ...structuredClone(base),
      provenance: { source: 'model', providerId: 'codex:gpt-test', model: 'gpt-test', briefHash: 'e2e-brief' },
      assetRequirements: [{ id: 'hero-image', role: 'subject', modality: 'image', purpose: '承担智能声音产品的可信外观、材质和主构图。', required: true, minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'block' }],
      composition: { ...structuredClone(base.composition), layers: base.composition.layers.map((layer, layerIndex) => layerIndex === 1 ? { ...layer, assetRequirementIds: ['hero-image'] } : layer) }
    });
  });
  const interpretation = { ...baseline, providerId: 'codex:gpt-test', directions, effectSpecs, provenance: { requested: 'codex' as const, selected: 'codex' as const, model: 'gpt-test', mode: 'remote' as const, latencyMs: 42, fallbackReason: null, cacheStatus: 'miss' as const } };

  await page.route('**/api/creative/providers', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ defaultProvider: 'codex', providers: [
    { id: 'codex', available: true, model: 'gpt-test', reason: null, capabilities: ['creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'] },
    { id: 'minimax', available: true, model: 'MiniMax-M3', reason: null, capabilities: ['creative-analysis', 'code-synthesis', 'image-generation', 'texture-generation', 'registered-three-runtime', 'browser-preview'] },
    { id: 'openai', available: false, model: 'gpt-test', reason: 'missing', capabilities: [] },
    { id: 'local', available: true, model: 'baseline-keyword-v1', reason: null, capabilities: ['deterministic-analysis', 'registered-three-runtime', 'browser-preview'] }
  ] }) }));
  await page.route('**/api/creative/interpret', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ interpretation }) }));
  await page.route('**/api/creative/assets/generate', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ report: {
    schemaVersion: 1, id: 'production-e2e', provider: 'minimax', model: 'image-01', status: 'ready',
    assets: [{ requirementId: 'hero-image', modality: 'image', qualityLevel: 'L2-inspectable', source: 'model-generated', uri: '/assets/flagship/chatgpt-resonance-hero-v1.png', license: 'review required', payloadBytes: 1678858, publishable: false, evidence: ['浏览器测试模型素材已物化。'] }],
    unsupportedRequirementIds: [], cache: { hits: 0, misses: 1 }, messages: ['已物化 1 个模型素材；等待真实页面视觉评审。', '所有声明的图片类需求均已生成。']
  } }) }));

  await page.goto('/workbench.html?provider=codex');
  await page.waitForFunction(() => window.__creativeLab?.snapshot().state === 'ready' && window.__creativeLab?.snapshot().creatorStep === 3);
  await expect(page.locator('body')).toHaveAttribute('data-product-awaiting', 'true');
  await page.getByRole('button', { name: '用 Codex 生成' }).click();
  await page.waitForFunction(() => window.__creativeLab?.snapshot().provider === 'codex:gpt-test' && window.__creativeLab?.snapshot().creatorStep === 4);
  await page.locator('.wb-engineering-actions summary').click();
  const productionButton = page.getByRole('button', { name: '生成已论证的高收益素材' });
  await expect(productionButton).toBeEnabled();
  await productionButton.click();
  await page.waitForFunction(() => window.__creativeLab?.snapshot().assetProduction.state === 'ready');
  const snapshot = await page.evaluate(() => window.__creativeLab!.snapshot());
  expect(snapshot.assetProduction).toMatchObject({ state: 'ready', reportId: 'production-e2e', assets: 1, error: null });
  await page.getByRole('button', { name: '检查素材生产结果' }).click();
  await expect(page.locator('#manifest-json')).toContainText('L2-inspectable');
  await page.getByRole('button', { name: '关闭生成产物' }).click();
  const href = await page.getByRole('link', { name: '打开 Three.js 实际预览' }).getAttribute('href');
  expect(href).toContain('generated=');
});
