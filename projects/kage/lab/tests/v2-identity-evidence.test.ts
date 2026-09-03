import { describe, expect, it } from 'vitest';
import {
  evaluateIdentityEvidenceBrief,
  identityEvidenceCapability
} from '../src/v2/identity-evidence-capability.ts';

describe('identity through evidence capability', () => {
  it('keeps a validated, readable three-state evidence contract', () => {
    expect(identityEvidenceCapability).toMatchObject({
      id: 'identity-through-evidence',
      evidenceLevel: 'E4',
      renderer: 'dom-media-hybrid'
    });
    expect(identityEvidenceCapability.inputs).toEqual(['scroll', 'button', 'keyboard']);
    expect(identityEvidenceCapability.states.map((state) => state.id)).toEqual([
      'source',
      'process',
      'performance'
    ]);
    expect(identityEvidenceCapability.baseInterface).toContain('图片失败时仍完整');
  });

  it('selects evidence-led brand briefs', () => {
    const decision = evaluateIdentityEvidenceBrief(
      '为一个生物材料品牌建立身份，展示材料来源、研究过程、证明证据与最终成果。'
    );

    expect(decision.selected).toBe(true);
    expect(decision.capabilityId).toBe('identity-through-evidence');
    expect(decision.score).toBeGreaterThanOrEqual(72);
    expect(decision.rejectedBy).toEqual([]);
    expect(decision.reason).toContain('身份');
  });

  it('rejects real GLB teardown and pure-atmosphere requests', () => {
    const teardown = evaluateIdentityEvidenceBrief('展示真实 glb 产品拆解结构、来源与自由旋转。');
    expect(teardown.selected).toBe(false);
    expect(teardown.capabilityId).toBeNull();
    expect(teardown.rejectedBy).toEqual(expect.arrayContaining(['真实 glb', '拆解结构', '自由旋转']));

    const atmosphere = evaluateIdentityEvidenceBrief('只做纯氛围和材料质感，无需内容。');
    expect(atmosphere.selected).toBe(false);
    expect(atmosphere.rejectedBy).toEqual(expect.arrayContaining(['纯氛围', '无需内容']));
  });
});
