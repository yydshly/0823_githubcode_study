import { describe, expect, it } from 'vitest';
import {
  cycleEvidenceIndex,
  interpolateCoastlineEvidence,
  resolveEvidenceIndexFromPosition,
  selectSemanticInteractionCapability,
  semanticInteractionCapability,
  semanticInteractionCapabilitySchema,
  semanticInteractionDecisionSchema
} from '../src/v2/semantic-interaction-capability.ts';

describe('semantic responsive interaction capability', () => {
  it('keeps the capability contract schema-valid and multi-input', () => {
    expect(() => semanticInteractionCapabilitySchema.parse(semanticInteractionCapability)).not.toThrow();
    expect(semanticInteractionCapability).toMatchObject({ evidenceLevel: 'E4', state: 'validated' });
    expect(semanticInteractionCapability.inputs).toEqual(['scroll', 'pointer', 'touch', 'keyboard']);
    expect(semanticInteractionCapability.evidence.map((item) => item.year)).toEqual([1984, 2004, 2026]);
  });

  it('maps normalized position to a bounded evidence state', () => {
    expect(resolveEvidenceIndexFromPosition(-1)).toBe(0);
    expect(resolveEvidenceIndexFromPosition(0.2)).toBe(0);
    expect(resolveEvidenceIndexFromPosition(0.5)).toBe(1);
    expect(resolveEvidenceIndexFromPosition(0.9)).toBe(2);
    expect(resolveEvidenceIndexFromPosition(4)).toBe(2);
  });

  it('interpolates every visible metric from the same continuous position', () => {
    const early = interpolateCoastlineEvidence(0.25);
    expect(early).toMatchObject({
      year: 1994,
      lossSquareKilometers: 1.6,
      retreatMeters: 93,
      relativeWaterCentimeters: 4,
      sceneMorph: 0.25
    });

    const late = interpolateCoastlineEvidence(0.75);
    expect(late.year).toBe(2015);
    expect(late.lossSquareKilometers).toBeCloseTo(5.95);
    expect(late.retreatMeters).toBeCloseTo(303.5);
    expect(late.relativeWaterCentimeters).toBeCloseTo(12.5);
    expect(late.sceneMorph).toBe(0.75);
  });

  it('cycles with explicit edges rather than hidden wrapping', () => {
    expect(cycleEvidenceIndex(0, -1)).toBe(0);
    expect(cycleEvidenceIndex(0, 1)).toBe(1);
    expect(cycleEvidenceIndex(1, 1)).toBe(2);
    expect(cycleEvidenceIndex(2, 1)).toBe(2);
  });

  it('changes both the scene meaning and numerical evidence across time', () => {
    const [baseline, , latest] = semanticInteractionCapability.evidence;
    expect(latest!.sceneMorph).toBeGreaterThan(baseline!.sceneMorph);
    expect(latest!.lossSquareKilometers).toBeGreaterThan(baseline!.lossSquareKilometers);
    expect(latest!.summary).not.toBe(baseline!.summary);
  });

  it('selects the capability when interaction changes evidence understanding', () => {
    const decision = selectSemanticInteractionCapability({
      brief: '为海洋档案设计可探索网页，比较不同年代的海岸变化，并选择证据路径。',
      pattern: 'spatial-exploration',
      primaryInput: 'direct-navigation',
      assetRoles: ['environment', 'information']
    });

    expect(() => semanticInteractionDecisionSchema.parse(decision)).not.toThrow();
    expect(decision.selected).toBe(true);
    expect(decision.capabilityId).toBe('semantic-responsive-interaction');
    expect(decision.matchedSignals).toEqual(expect.arrayContaining(['比较', '证据', '年代', '变化']));
  });

  it('selects semantic interaction when form choices must update data and a map', () => {
    const decision = selectSemanticInteractionCapability({
      brief: '用户选择楼层和时段后，同步查看采光、噪声与座位可用率，并在平面图中高亮对应区域。',
      pattern: 'editorial-field',
      primaryInput: 'scroll',
      assetRoles: []
    });

    expect(decision.selected).toBe(true);
    expect(decision.score).toBeGreaterThanOrEqual(60);
    expect(decision.matchedSignals).toEqual(expect.arrayContaining(['选择']));
  });

  it('rejects the capability for a static announcement with no information change', () => {
    const decision = selectSemanticInteractionCapability({
      brief: '为小型活动制作纯静态单页，只展示时间、地点和报名入口。',
      pattern: 'continuous-scroll',
      primaryInput: 'scroll',
      assetRoles: []
    });

    expect(decision.selected).toBe(false);
    expect(decision.capabilityId).toBeNull();
    expect(decision.blockers.join(' ')).toContain('纯静态');
  });
});
