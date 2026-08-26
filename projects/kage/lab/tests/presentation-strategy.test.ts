import { describe, expect, it } from 'vitest';
import { planAssets } from '../src/generation/asset-plan';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { assertEffectSpec } from '../src/generation/effect-spec';
import { generateCreativeRun } from '../src/generation/orchestrator';
import { selectPresentationStrategy } from '../src/generation/presentation-strategy';

const high = { quality: 'high' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('asset-aware presentation strategy routing', () => {
  it('keeps a media-free concept on the procedural field route', async () => {
    const run = await generateCreativeRun(
      { text: '用克制的光与空间表现信息从混乱变得清晰。' },
      new BaselineBriefInterpreter(),
      high
    );
    expect(run.candidates[0].presentationStrategy).toMatchObject({
      preferred: 'procedural-field',
      active: 'procedural-field',
      status: 'ready'
    });
  });

  it('selects material refraction only for a gated soft-alpha image and matching intent', async () => {
    const run = await generateCreativeRun(
      { text: '为先锋时装品牌设计透明薄纱、液态折射与编辑感首屏。' },
      new BaselineBriefInterpreter(),
      high
    );
    const base = run.candidates[0].effectSpec;
    const effectSpec = assertEffectSpec({
      ...structuredClone(base),
      direction: {
        ...structuredClone(base.direction),
        spatialMetaphor: '透明薄纱与液态折射形成连续空间',
        visualGrammar: ['透明薄纱', '液态折射', '编辑构图']
      },
      composition: {
        ...structuredClone(base.composition),
        mode: 'hybrid-2.5d',
        layers: base.composition.layers.map((layer, index) => index === 1
          ? { ...layer, techniques: ['image-plane', 'shader'], assetRequirementIds: ['hero-image'] }
          : layer)
      },
      assetRequirements: [{
        id: 'hero-image', role: 'subject', modality: 'image',
        purpose: '承担透明服装主体、轮廓和材质折射。', required: true,
        minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'image-plane'
      }]
    });
    const assetPlan = planAssets(effectSpec, [{
      requirementId: 'hero-image', modality: 'image', qualityLevel: 'L3-presentable',
      source: 'model-generated', uri: '/creative-assets/hero.png', license: 'internal demo',
      payloadBytes: 2_000_000, publishable: true, features: { alpha: 'soft', depth: 'none' },
      evidence: ['透明 PNG 已通过浏览器检查。']
    }]);

    expect(selectPresentationStrategy(effectSpec, assetPlan, high)).toMatchObject({
      preferred: 'material-refraction', active: 'material-refraction', qualityGate: 'balanced-up'
    });
    expect(selectPresentationStrategy(effectSpec, assetPlan, { ...high, quality: 'low' })).toMatchObject({
      preferred: 'material-refraction', active: 'layered-depth', status: 'adapted'
    });
  });

  it('uses authored depth as 2.5D evidence without pretending the image is a GLB', async () => {
    const run = await generateCreativeRun(
      { text: '为文化展陈建立克制的空间层次和档案阅读路径。' },
      new BaselineBriefInterpreter(),
      high
    );
    const base = run.candidates[0].effectSpec;
    const effectSpec = assertEffectSpec({
      ...structuredClone(base),
      direction: { ...structuredClone(base.direction), spatialMetaphor: '档案图像形成前后景深度', visualGrammar: ['空间层次', '档案构图'] },
      composition: {
        ...structuredClone(base.composition), mode: 'hybrid-2.5d',
        layers: base.composition.layers.map((layer, index) => index === 1
          ? { ...layer, techniques: ['image-plane', 'particles'], assetRequirementIds: ['archive-image'] }
          : layer)
      },
      assetRequirements: [{
        id: 'archive-image', role: 'subject', modality: 'image', purpose: '作为档案主体和纵深采样来源。',
        required: true, minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'image-plane'
      }]
    });
    const plan = planAssets(effectSpec, [{
      requirementId: 'archive-image', modality: 'image', qualityLevel: 'L3-presentable', source: 'model-generated',
      uri: '/creative-assets/archive.png', license: 'internal demo', payloadBytes: 1_000_000, publishable: true,
      features: { alpha: 'none', depth: 'authored' }, evidence: ['深度图与彩色图对齐。']
    }]);
    expect(selectPresentationStrategy(effectSpec, plan, high).preferred).toBe('layered-depth');
  });

  it('blocks an accurate model route when the required GLB is missing', async () => {
    const run = await generateCreativeRun(
      { text: '构建真实产品拆解网页，必须使用可旋转、可检查材质和内部结构的真实 GLB 模型。' },
      new BaselineBriefInterpreter(),
      high
    );
    expect(run.candidates[0].presentationStrategy).toMatchObject({ preferred: 'model-spatial', status: 'blocked' });
  });
});
