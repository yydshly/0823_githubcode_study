import { describe, expect, it } from 'vitest';
import { assertFeaturedCaseReview } from '../server/case-library';

function review(mechanical: 'pass' | 'revise' | 'blocked', visual: 'pass' | 'revise') {
  return {
    assessment: {
      schemaVersion: 1,
      verdict: mechanical,
      score: mechanical === 'pass' ? 100 : mechanical === 'revise' ? 82 : 0,
      summary: mechanical === 'pass' ? '最终浏览器机械评审通过。' : '仍有结构问题。',
      findings: [],
      observations: []
    },
    visualAcceptance: {
      schemaVersion: 1,
      verdict: visual,
      score: visual === 'pass' ? 92 : 58,
      assetRole: 'integrated',
      summary: visual === 'pass' ? '最终视觉验收通过。' : '素材仍被占位物压制。',
      findings: visual === 'pass' ? [] : [{ code: 'placeholder-dominant', severity: 'major', frameId: 'opening', message: '占位几何体成为错误主体。' }]
    }
  };
}

describe('featured case quality gate', () => {
  it('accepts only when mechanical and independent visual reviews both pass', () => {
    expect(() => assertFeaturedCaseReview('featured', review('pass', 'pass'))).not.toThrow();
    expect(() => assertFeaturedCaseReview('featured', review('revise', 'pass'))).toThrow('机械评审未通过');
    expect(() => assertFeaturedCaseReview('featured', review('pass', 'revise'))).toThrow('独立视觉验收未通过');
  });

  it('rejects a nominal visual pass when it still contains a major finding', () => {
    const inconsistent = review('pass', 'revise');
    inconsistent.visualAcceptance.verdict = 'pass';
    expect(() => assertFeaturedCaseReview('featured', inconsistent)).toThrow('仍包含重大缺陷');
  });

  it('rejects a featured case when independent acceptance is missing', () => {
    const missing = review('pass', 'pass') as { visualAcceptance?: unknown };
    delete missing.visualAcceptance;
    expect(() => assertFeaturedCaseReview('featured', missing)).toThrow('缺少有效的机械评审或独立视觉验收');
  });

  it('does not impose the featured gate on internal exploration records', () => {
    expect(() => assertFeaturedCaseReview('exploration', null)).not.toThrow();
  });
});