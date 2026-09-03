import { describe, expect, it } from 'vitest';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter.ts';
import { assertEffectSpec } from '../src/generation/effect-spec.ts';
import { generateCreativeRun } from '../src/generation/orchestrator.ts';
import { planAssetResolution } from '../src/generation/asset-resolution.ts';
import { alignEffectSpecAssetsToV2Contract } from '../src/generation/v2-asset-boundary.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const context = { quality: 'high' as const, renderer: 'webgl' as const, motion: 'full' as const };

async function modelSuggestedGlb(brief: string) {
  const run = await generateCreativeRun({ text: brief }, new BaselineBriefInterpreter(), context);
  const value = structuredClone(run.candidates[0].effectSpec);
  value.composition.layers = value.composition.layers.map((layer) => ({ ...layer, assetRequirementIds: [] }));
  value.assetRequirements = [{
    id: 'model-suggested-object', role: 'subject', modality: 'model-3d',
    purpose: '模型自行建议的三维主体，不代表用户明确要求真实模型。', required: true,
    minimumQuality: 'L4-cinematic', fidelity: 'accurate', fallback: 'block'
  }];
  value.composition.layers[0].assetRequirementIds = ['model-suggested-object'];
  return assertEffectSpec(value);
}

describe('V2 asset boundary', () => {
  it('replaces a model-invented GLB dependency with the deterministic contract asset route', async () => {
    const brief = '为气味记忆产品设计网页，玻璃瓶中的记忆逐渐形成；画面像自然历史博物馆与香水实验室的结合。';
    const contract = createV2CreativeContract(brief);
    const aligned = alignEffectSpecAssetsToV2Contract(await modelSuggestedGlb(brief), contract);

    expect(contract.experience.pattern).toBe('environmental-memory');
    expect(aligned.assetRequirements).toHaveLength(1);
    expect(aligned.assetRequirements[0]).toMatchObject({
      id: 'continuity-environment', modality: 'environment', required: true,
      experience: { integration: 'full-bleed-environment' }
    });
    expect(planAssetResolution(aligned, [], true, brief)).toMatchObject({ route: 'generate' });
  });

  it('preserves a real GLB dependency when the user explicitly asks for model inspection', async () => {
    const brief = '为声学设备设计网页，必须使用真实 GLB 拆解内部结构并旋转检查。';
    const contract = createV2CreativeContract(brief);
    const aligned = alignEffectSpecAssetsToV2Contract(await modelSuggestedGlb(brief), contract);

    expect(aligned.assetRequirements[0]).toMatchObject({ modality: 'model-3d', fallback: 'block' });
    expect(planAssetResolution(aligned, [], true, brief)).toMatchObject({ route: 'blocked' });
  });
});
