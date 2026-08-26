import { describe, expect, it } from 'vitest';
import { attachGeneratedAssets } from '../src/generation/asset-integration';
import { assertEffectSpec } from '../src/generation/effect-spec';
import { generateCreativeRun } from '../src/generation/orchestrator';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('generated asset manifest integration', () => {
  it('promotes an inspectable image into honest color-only flagship staging', async () => {
    const run = await generateCreativeRun(
      { text: '为独立创作者设计清冷、克制的智能声音产品发布网页。', seed: 17 },
      new BaselineBriefInterpreter(),
      context
    );
    const original = run.candidates[0];
    const effectSpec = assertEffectSpec({
      ...structuredClone(original.effectSpec),
      assetRequirements: [{
        id: 'hero-image', role: 'subject', modality: 'image',
        purpose: '承担产品外观、主构图与空间分层。', required: true,
        minimumQuality: 'L3-presentable', fidelity: 'recognizable', fallback: 'block',
        experience: {
          anchor: .08, function: 'establish', visualState: '声音产品首先成为唯一清晰主体。',
          continuity: '主体内部声纹会向后续空间扩散。', integration: 'alpha-subject'
        }
      }, {
        id: 'resonance-field', role: 'environment', modality: 'environment',
        purpose: '承担中段共振扩散后的全幅声音环境。', required: true,
        minimumQuality: 'L3-presentable', fidelity: 'suggestive', fallback: 'block',
        experience: {
          anchor: .66, function: 'transform', visualState: '声纹扩散为覆盖全屏的共振环境。',
          continuity: '继承主体的冰蓝声纹并为最终 CTA 留出稳定阅读区。', integration: 'full-bleed-environment'
        }
      }],
      composition: {
        ...structuredClone(original.effectSpec.composition),
        layers: original.effectSpec.composition.layers.map((layer, index) => index === 1 ? { ...layer, assetRequirementIds: ['hero-image', 'resonance-field'] } : layer)
      }
    });
    const manifest = attachGeneratedAssets(original.manifest, effectSpec, [{
      requirementId: 'hero-image', modality: 'image', qualityLevel: 'L2-inspectable',
      source: 'model-generated', uri: '/api/creative/assets/asset-test',
      license: 'review required', payloadBytes: 1234, publishable: false,
      evidence: ['模型结果已物化。']
    }, {
      requirementId: 'resonance-field', modality: 'environment', qualityLevel: 'L2-inspectable',
      source: 'model-generated', uri: '/api/creative/assets/asset-field',
      license: 'review required', payloadBytes: 2234, publishable: false,
      evidence: ['模型环境结果已物化。']
    }]);

    expect(manifest.scenes.main).toMatchObject({
      plugin: 'resonance-flagship', preset: 'generated-image-cinematic',
      assets: [
        expect.objectContaining({ role: '承担产品外观、主构图与空间分层。', uri: '/api/creative/assets/asset-test', required: true, experience: expect.objectContaining({ anchor: .08, integration: 'alpha-subject' }) }),
        expect.objectContaining({ role: '承担中段共振扩散后的全幅声音环境。', uri: '/api/creative/assets/asset-field', required: true, experience: expect.objectContaining({ anchor: .66, integration: 'full-bleed-environment' }) })
      ]
    });
    expect(manifest.scenes.main.assets).toHaveLength(2);
    expect(manifest.presentation?.footerCopy).toContain('仍需');
  });
});
