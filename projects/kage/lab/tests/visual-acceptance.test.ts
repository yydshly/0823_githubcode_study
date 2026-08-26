import { describe, expect, it } from 'vitest';
import { isFinalVisualCandidateEligible, visualAcceptanceSchema } from '../src/generation/visual-acceptance';
import type { VisualReviewAssessment } from '../src/generation/visual-review';

const mechanicalPass: VisualReviewAssessment = {
  schemaVersion: 1,
  verdict: 'pass',
  score: 100,
  summary: '结构与跨端门禁通过。',
  findings: [],
  observations: []
};

describe('final visual acceptance', () => {
  it('requires both mechanical and independent visual acceptance', () => {
    const visualPass = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'pass',
      score: 92,
      assetRole: 'dominant',
      summary: '素材、文字和 Three.js 增强形成统一构图。',
      findings: []
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, visualPass)).toBe(true);
    expect(isFinalVisualCandidateEligible({ ...mechanicalPass, verdict: 'revise' }, visualPass)).toBe(false);
  });

  it('rejects a structurally valid page when the asset is subordinate to a placeholder', () => {
    const visualRevise = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'revise',
      score: 58,
      assetRole: 'supporting',
      summary: '程序化占位体遮挡了模型素材，视觉主体错误。',
      findings: [{
        code: 'placeholder-dominant',
        severity: 'major',
        frameId: 'opening',
        message: '首屏首先看到占位几何体，而不是生成素材。'
      }]
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, visualRevise)).toBe(false);
  });

  it('does not select a nominal pass when a major finding is present', () => {
    const inconsistent = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'pass',
      score: 90,
      assetRole: 'integrated',
      summary: '错误的通过结论。',
      findings: [{ code: 'copy-obstructed', severity: 'major', frameId: 'final', message: '最终文案被遮挡。' }]
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, inconsistent)).toBe(false);
  });
});
