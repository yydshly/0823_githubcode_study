import { describe, expect, it } from 'vitest';
import { planAssetResolution } from '../src/generation/asset-resolution';
import { assertEffectSpec } from '../src/generation/effect-spec';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { generateCreativeRun } from '../src/generation/orchestrator';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

async function imageSpec() {
  const run = await generateCreativeRun(
    { text: '为独立创作者设计清冷、克制并具有未来感的智能声音产品发布网页。' },
    new BaselineBriefInterpreter(),
    context
  );
  const value = structuredClone(run.candidates[0].effectSpec);
  value.assetRequirements = [{
    id: 'hero-image',
    role: 'subject',
    modality: 'image',
    purpose: '承担清晰可识别但不冒充具体真实商品的声音产品主体。',
    required: true,
    minimumQuality: 'L3-presentable',
    fidelity: 'recognizable',
    fallback: 'block'
  }];
  value.composition.layers[1].assetRequirementIds = ['hero-image'];
  return assertEffectSpec(value);
}

describe('dedicated asset resolution', () => {
  it('reuses a matching project asset before considering another generation call', async () => {
    expect(planAssetResolution(await imageSpec(), ['image'], false)).toMatchObject({ route: 'catalog' });
  });

  it('calls the connected generator only when the effect policy approves the asset', async () => {
    const value = await imageSpec();
    expect(planAssetResolution(value, [], true)).toMatchObject({ route: 'generate' });
  });

  it('blocks a required subject rather than replacing it with placeholder geometry', async () => {
    const value = await imageSpec();
    expect(planAssetResolution(value, [], false)).toMatchObject({
      route: 'blocked',
      message: expect.stringContaining('不能用程序化占位物冒充目标主体')
    });
  });

  it('blocks required GLB or avatar assets that an image generator cannot create', async () => {
    const run = await generateCreativeRun(
      { text: '为真实硬件产品构建可拆解的 GLB 产品网页，需要真实 3D 模型和清晰材质。' },
      new BaselineBriefInterpreter(),
      context
    );
    expect(planAssetResolution(
      run.candidates[0].effectSpec,
      [],
      true,
      '需要真实 GLB 产品拆解与清晰材质。'
    )).toMatchObject({
      route: 'blocked',
      message: expect.stringContaining('model-3d')
    });
  });

  it('adapts a model-suggested GLB route to a semantically matched image when the user did not require GLB', async () => {
    const value = structuredClone(await imageSpec());
    value.assetRequirements = [{
      id: 'model-suggested-object', role: 'subject', modality: 'model-3d',
      purpose: '模型建议的三维主体，但用户只要求最终网页效果。', required: true,
      minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'block'
    }];
    value.composition.layers[1].assetRequirementIds = ['model-suggested-object'];
    expect(planAssetResolution(assertEffectSpec(value), ['image'], true, '设计一个雨声记录产品网页。')).toMatchObject({
      route: 'catalog',
      message: expect.stringContaining('2.5D')
    });
  });

  it('does not let a matching image satisfy an explicitly requested GLB', async () => {
    expect(planAssetResolution(
      await imageSpec(),
      ['image'],
      true,
      '智能声音产品需要真实 GLB 产品拆解。'
    )).toMatchObject({ route: 'blocked' });
  });

  it('routes a required full-bleed fictional environment through the image generator', async () => {
    const value = structuredClone(await imageSpec());
    value.assetRequirements = [{
      id: 'cloud-observatory-world', role: 'environment', modality: 'environment',
      purpose: '提供虚构云海与未来观测站的连续电影化环境画面。', required: true,
      minimumQuality: 'L4-cinematic', fidelity: 'accurate', fallback: 'block',
      experience: {
        anchor: 0.34, function: 'develop', visualState: '观测站从云海中显露并形成主要空间。',
        continuity: '保持高空光照、云层高度与建筑方向连续。', integration: 'full-bleed-environment'
      }
    }];
    value.composition.layers[1].assetRequirementIds = ['cloud-observatory-world'];
    expect(planAssetResolution(assertEffectSpec(value), [], true)).toMatchObject({ route: 'generate' });
  });
});
