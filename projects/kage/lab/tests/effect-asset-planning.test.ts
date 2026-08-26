import { describe, expect, it } from 'vitest';
import { planAssets, type AssetCandidate } from '../src/generation/asset-plan';
import { assertEffectSpec } from '../src/generation/effect-spec';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { generateCreativeRun } from '../src/generation/orchestrator';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('goal-driven effect and asset planning contracts', () => {
  it('attaches a validated effect analysis to every generated candidate', async () => {
    const run = await generateCreativeRun(
      { text: '为独立创作者设计清冷、克制并具有未来感的智能声音产品发布网页。', seed: 23 },
      new BaselineBriefInterpreter(),
      context
    );
    expect(run.candidates).toHaveLength(3);
    run.candidates.forEach((candidate) => {
      expect(candidate.effectSpec).toMatchObject({
        schemaVersion: 1,
        route: 'immersive-page',
        provenance: { source: 'compatibility-compiler' }
      });
      expect(candidate.effectSpec.composition.layers.map((layer) => layer.role)).toEqual(['content', 'world', 'interaction']);
      expect(candidate.assetPlan).toMatchObject({ status: 'ready', items: [], metrics: { ready: 0, planned: 0, blocked: 0 } });
    });
  });

  it('keeps a required product model at L0 until a real candidate exists', async () => {
    const run = await generateCreativeRun(
      { text: '为真实硬件产品构建可拆解的 GLB 产品网页，需要真实 3D 模型和清晰材质。' },
      new BaselineBriefInterpreter(),
      context
    );
    const candidate = run.candidates[0];
    expect(candidate.effectSpec.assetRequirements).toEqual([
      expect.objectContaining({ id: 'product-model', modality: 'model-3d', required: true, minimumQuality: 'L3-presentable', fallback: 'block' })
    ]);
    expect(candidate.assetPlan).toMatchObject({
      status: 'needs-generation',
      items: [expect.objectContaining({
        requirementId: 'product-model', route: 'model-generation', status: 'planned',
        qualityLevel: 'L0-missing', candidateUri: null, source: 'none', publishable: false
      })]
    });
  });

  it('requires both target quality and publishable license before an asset is ready', async () => {
    const run = await generateCreativeRun(
      { text: '为真实硬件产品构建 GLB 产品展示，需要真实 3D 模型。' },
      new BaselineBriefInterpreter(),
      context
    );
    const effectSpec = run.candidates[0].effectSpec;
    const base: AssetCandidate = {
      requirementId: 'product-model', modality: 'model-3d', qualityLevel: 'L3-presentable',
      source: 'model-generated', uri: '/assets/product-model.glb', license: null,
      payloadBytes: 2_400_000, publishable: false, evidence: ['GLB loads in the browser.']
    };
    expect(planAssets(effectSpec, [base]).status).toBe('blocked');
    const accepted = planAssets(effectSpec, [{ ...base, license: 'user-owned', publishable: true }]);
    expect(accepted).toMatchObject({
      status: 'ready',
      items: [expect.objectContaining({ status: 'ready', qualityLevel: 'L3-presentable', publishable: true })],
      metrics: { ready: 1, planned: 0, blocked: 0, totalPayloadBytes: 2_400_000 }
    });
  });

  it('rejects effect layers that reference undeclared assets', async () => {
    const run = await generateCreativeRun(
      { text: '设计一个克制的技术产品页面，让信息逐步显现。' },
      new BaselineBriefInterpreter(),
      context
    );
    const invalid = structuredClone(run.candidates[0].effectSpec);
    invalid.composition.layers[0].assetRequirementIds = ['undeclared-asset'];
    expect(() => assertEffectSpec(invalid)).toThrow(/不存在的资产需求/);
  });
});
