import { describe, expect, it } from 'vitest';
import { planAssets } from '../src/generation/asset-plan';
import { producibleImageRequirements } from '../src/generation/asset-production';
import { decideImageAssetUse } from '../src/generation/asset-use-policy';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { assertEffectSpec, type AssetRequirement } from '../src/generation/effect-spec';
import { generateCreativeRun } from '../src/generation/orchestrator';
import { createProductionCapabilityProfile } from '../src/generation/production-capabilities';
import { planCreativeProduction } from '../src/generation/production-plan';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

async function effectWith(requirement: AssetRequirement) {
  const run = await generateCreativeRun(
    { text: '为独立创作者设计清冷克制的智能声音产品发布网页。', seed: 41 },
    new BaselineBriefInterpreter(),
    context
  );
  const draft = structuredClone(run.candidates[0].effectSpec);
  draft.assetRequirements = [requirement];
  draft.composition.layers[1].assetRequirementIds = [requirement.id];
  return assertEffectSpec(draft);
}

describe('goal-benefit asset use policy', () => {
  it('requires a real source for accurate product evidence even when an image generator is configured', async () => {
    const effectSpec = await effectWith({
      id: 'real-product-hero', role: 'subject', modality: 'image',
      purpose: '展示准确产品外观、结构比例和真实材料证据。', required: true,
      minimumQuality: 'L3-presentable', fidelity: 'accurate', fallback: 'block'
    });
    const policy = decideImageAssetUse(effectSpec);
    expect(policy).toMatchObject({ decision: 'source-required', approvedRequirementIds: [] });
    expect(policy.items[0]).toMatchObject({ action: 'require-source', score: 0 });
    expect(producibleImageRequirements(effectSpec)).toEqual([]);

    const profile = createProductionCapabilityProfile('codex', 'gpt-5.4', { 'image-generation': 'minimax-image-01' });
    const production = planCreativeProduction(effectSpec, planAssets(effectSpec), profile);
    expect(production.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'source-real-product-hero', status: 'blocked', requiredCapability: null })
    ]));
    expect(production.tasks).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'generate-real-product-hero' })
    ]));
  });

  it('approves a suggestive environment texture only when it changes a declared visible layer', async () => {
    const effectSpec = await effectWith({
      id: 'crystal-surface', role: 'environment', modality: 'texture',
      purpose: '增强声波结晶环境的折射层次和最终记忆点。', required: false,
      minimumQuality: 'L3-presentable', fidelity: 'suggestive', fallback: 'procedural'
    });
    const policy = decideImageAssetUse(effectSpec);
    expect(policy).toMatchObject({ decision: 'approved', approvedRequirementIds: ['crystal-surface'] });
    expect(producibleImageRequirements(effectSpec).map((item) => item.id)).toEqual(['crystal-surface']);

    const profile = createProductionCapabilityProfile('codex', 'gpt-5.4', { 'texture-generation': 'minimax-image-01' });
    const production = planCreativeProduction(effectSpec, planAssets(effectSpec), profile);
    expect(production.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'generate-crystal-surface', status: 'planned', requiredCapability: 'texture-generation' })
    ]));
  });

  it('skips optional decorative atmosphere instead of calling a provider for its own sake', async () => {
    const effectSpec = await effectWith({
      id: 'extra-haze', role: 'atmosphere', modality: 'image',
      purpose: '增加一层可选雾气装饰，但不改变主体和信息理解。', required: false,
      minimumQuality: 'L2-inspectable', fidelity: 'suggestive', fallback: 'procedural'
    });
    const policy = decideImageAssetUse(effectSpec);
    expect(policy).toMatchObject({ decision: 'not-needed', approvedRequirementIds: [] });
    expect(policy.items[0]).toMatchObject({ action: 'skip' });
    expect(producibleImageRequirements(effectSpec)).toEqual([]);
  });

  it('does not call an L2-only adapter for a required cinematic environment', async () => {
    const effectSpec = await effectWith({
      id: 'cloud-observatory-world', role: 'environment', modality: 'environment',
      purpose: '提供虚构云海与未来观测站的连续电影化环境画面。', required: true,
      minimumQuality: 'L4-cinematic', fidelity: 'accurate', fallback: 'block',
      experience: {
        anchor: 0.34, function: 'develop', visualState: '观测站从云海中显露并形成主要空间。',
        continuity: '保持高空光照、云层高度与建筑方向连续。', integration: 'full-bleed-environment'
      }
    });
    expect(decideImageAssetUse(effectSpec)).toMatchObject({
      decision: 'source-required', approvedRequirementIds: []
    });
    expect(decideImageAssetUse(effectSpec).items[0]).toMatchObject({ action: 'require-source' });
    expect(decideImageAssetUse(effectSpec).items[0]?.reason).toContain('注定被门禁拒绝');
    expect(producibleImageRequirements(effectSpec)).toEqual([]);
    expect(decideImageAssetUse(effectSpec, 'L4-cinematic')).toMatchObject({
      decision: 'approved', approvedRequirementIds: ['cloud-observatory-world']
    });
  });
});
