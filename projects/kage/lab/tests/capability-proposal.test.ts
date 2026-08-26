import { describe, expect, it } from 'vitest';
import { capabilityCatalog } from '../src/capabilities/catalog';
import { detectBaselineCapabilityGaps, planCapabilityProposals } from '../src/capabilities/proposal';

describe('capability proposal boundary', () => {
  it('turns explicit unsupported needs into reviewable proposals', () => {
    const gaps = detectBaselineCapabilityGaps('真实 GLB 产品拆解，随音乐响应，并导出 MP4 自动成片。');
    expect(gaps.map((gap) => gap.suggestedId)).toEqual(['product-model', 'audio-reactive', 'film-export']);
    const proposals = planCapabilityProposals(gaps, capabilityCatalog);
    expect(proposals).toHaveLength(3);
    expect(proposals[0]).toMatchObject({ status: 'review-required', targetCapabilityId: 'asset:product-model', risk: 'high' });
    expect(proposals.every((proposal) => proposal.qualityGates.includes('真实浏览器视觉评审'))).toBe(true);
  });

  it('does not invent a gap for ordinary briefs covered by the catalog', () => {
    expect(detectBaselineCapabilityGaps('清冷、克制的技术品牌滚动网页。')).toEqual([]);
  });
});
