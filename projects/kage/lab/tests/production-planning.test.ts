import { describe, expect, it } from 'vitest';
import { planAssets } from '../src/generation/asset-plan';
import { assertEffectSpec } from '../src/generation/effect-spec';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import {
  availableProductionCapabilities,
  createProductionCapabilityProfile
} from '../src/generation/production-capabilities';
import { planCreativeProduction } from '../src/generation/production-plan';
import { generateCreativeRun } from '../src/generation/orchestrator';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('capability-aware creative production planning', () => {
  it('reports only capabilities that are actually integrated for each provider', () => {
    const codex = createProductionCapabilityProfile('codex', 'gpt-5.4');
    expect(availableProductionCapabilities(codex)).toEqual([
      'creative-analysis', 'code-synthesis', 'registered-three-runtime', 'browser-preview'
    ]);
    expect(codex.capabilities.find((item) => item.id === 'model-3d-generation')).toMatchObject({
      available: false, adapter: null, reason: expect.stringContaining('GLB')
    });
    const local = createProductionCapabilityProfile('local', 'baseline-keyword-v1');
    expect(availableProductionCapabilities(local)).toEqual([
      'deterministic-analysis', 'registered-three-runtime', 'browser-preview'
    ]);
  });

  it('blocks a required true GLB instead of replacing it with decorative geometry', async () => {
    const run = await generateCreativeRun(
      { text: '构建真实产品拆解网页，必须使用可旋转、可检查材质和内部结构的真实 GLB 模型。' },
      new BaselineBriefInterpreter(),
      context
    );
    expect(run.candidates[0].productionPlan).toMatchObject({
      status: 'blocked',
      strategy: 'asset-dependent',
      missingCapabilities: expect.arrayContaining(['model-3d-generation', 'vision-evaluation']),
      tasks: expect.arrayContaining([
        expect.objectContaining({ requirementId: 'product-model', status: 'blocked', requiredCapability: 'model-3d-generation' })
      ])
    });
  });

  it('adapts a generative image need to a procedural effect when code synthesis is available', async () => {
    const run = await generateCreativeRun(
      { text: '用克制的光与空间表现信息从混乱变得清晰。' },
      new BaselineBriefInterpreter(),
      context
    );
    const effectSpec = structuredClone(run.candidates[0].effectSpec);
    effectSpec.assetRequirements = [{
      id: 'memory-field', role: 'environment', modality: 'image',
      purpose: '形成具有情绪方向的多层空间背景和视觉记忆点。',
      required: true, minimumQuality: 'L3-presentable', fidelity: 'suggestive', fallback: 'procedural'
    }];
    effectSpec.composition.layers[1].assetRequirementIds = ['memory-field'];
    const validated = assertEffectSpec(effectSpec);
    const assetPlan = planAssets(validated);
    const production = planCreativeProduction(validated, assetPlan, createProductionCapabilityProfile('codex', 'gpt-5.4'));
    expect(production).toMatchObject({
      status: 'adapted',
      missingCapabilities: expect.arrayContaining(['image-generation']),
      adaptations: expect.arrayContaining([
        expect.objectContaining({ requirementId: 'memory-field', from: 'image', to: 'procedural-three-effect' })
      ]),
      tasks: expect.arrayContaining([
        expect.objectContaining({ id: 'adapt-memory-field', kind: 'code-synthesis', status: 'adapted' })
      ])
    });
  });

  it('uses a media generator once its adapter is explicitly integrated', async () => {
    const run = await generateCreativeRun(
      { text: '用克制的光与空间表现信息从混乱变得清晰。' },
      new BaselineBriefInterpreter(),
      context
    );
    const effectSpec = structuredClone(run.candidates[0].effectSpec);
    effectSpec.assetRequirements = [{
      id: 'memory-field', role: 'environment', modality: 'image',
      purpose: '生成可被 Three.js 分层组合的空间背景图像。',
      required: true, minimumQuality: 'L3-presentable', fidelity: 'suggestive', fallback: 'procedural'
    }];
    effectSpec.composition.layers[1].assetRequirementIds = ['memory-field'];
    const validated = assertEffectSpec(effectSpec);
    const profile = createProductionCapabilityProfile('codex', 'gpt-5.4', { 'image-generation': 'minimax-image-01' });
    const production = planCreativeProduction(validated, planAssets(validated), profile);
    expect(profile.capabilities.find((item) => item.id === 'image-generation')).toMatchObject({
      available: true, adapter: 'minimax-image-01'
    });
    expect(production.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'generate-memory-field', status: 'planned', requiredCapability: 'image-generation' })
    ]));
    expect(production.missingCapabilities).not.toContain('image-generation');
  });
});
