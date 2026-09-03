import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { creativeDirectionAtlas } from '../src/v2/creative-direction-atlas.ts';

describe('V2 creative direction atlas', () => {
  it('offers several bounded directions without presenting them as verified cases', () => {
    expect(creativeDirectionAtlas).toHaveLength(6);
    expect(new Set(creativeDirectionAtlas.map((item) => item.id)).size).toBe(6);
    expect(creativeDirectionAtlas.filter((item) => item.status === 'next-validation')).toHaveLength(1);
    expect(creativeDirectionAtlas.some((item) => item.status === 'asset-required')).toBe(true);
    expect(creativeDirectionAtlas.filter((item) => item.result?.state === 'mechanical-pass')).toHaveLength(1);
  });

  it('compiles every direction through the real V2 contract and keeps diversity diagnostic-only', () => {
    const contracts = creativeDirectionAtlas.map((direction) => createV2CreativeContract(direction.brief));
    expect(contracts.every((contract) => contract.technical.styleDiversity.nearestDistance >= 0)).toBe(true);
    expect(contracts.every((contract) => contract.technical.styleDiversity.rankingOnly)).toBe(true);
    expect(contracts.every((contract) => contract.technical.styleDiversity.mustDifferOn.length === 0)).toBe(true);
    expect(new Set(contracts.map((contract) => JSON.stringify(contract.technical.styleDiversity.fingerprint))).size)
      .toBeGreaterThanOrEqual(5);
    expect(new Set(contracts.map((contract) => contract.direction.renderer.route)).size)
      .toBeGreaterThanOrEqual(2);
  });

  it('routes the daylight civic atlas to place-linked map interaction without fake product assets', () => {
    const direction = creativeDirectionAtlas.find((item) => item.id === 'daylight-civic-atlas');
    expect(direction).toBeDefined();
    const contract = createV2CreativeContract(direction!.brief);

    expect(contract.experience.pattern).toBe('editorial-field');
    expect(contract.technical.semanticInteraction.selected).toBe(true);
    expect(contract.direction.renderer.route).toBe('dom-canvas-hybrid');
    expect(contract.assets.some((asset) => asset.id === 'hero-product')).toBe(false);
    expect(contract.assets.find((asset) => asset.id === 'map-evidence-field')).toMatchObject({
      modality: 'texture',
      sourcePriority: ['licensed', 'curated-library', 'procedural']
    });
    expect(contract.referenceEvidence.some((reference) => reference.referenceId === 'kage-smart-audio')).toBe(false);
    expect(direction!.requiredInput).toContain('真实地理底图');
    expect(direction!.requiredInput).toContain('演示站点');
    expect(direction!.avoid).toContain('随机线条');
    expect(direction!.avoid).toContain('真实设施事实');
    expect(direction!.result?.url).toContain('dedicated-c0514ddead80');
  });
});
