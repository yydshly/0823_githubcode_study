import { describe, expect, it } from 'vitest';
import { assertFeaturedCaseReview } from '../server/case-library';
import { assessDeliveryQuality } from '../src/generation/delivery-quality.ts';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

function review(mechanical: 'pass' | 'revise' | 'blocked', visual: 'pass' | 'revise') {
  return {
    assessment: {
      schemaVersion: 1 as const,
      verdict: mechanical,
      score: mechanical === 'pass' ? 100 : mechanical === 'revise' ? 82 : 0,
      summary: mechanical === 'pass' ? '最终浏览器机械评审通过。' : '仍有结构问题。',
      findings: [],
      observations: []
    },
    visualAcceptance: {
      schemaVersion: 1 as const,
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

  it('rejects a nominal visual pass below the featured score threshold', () => {
    const belowThreshold = review('pass', 'pass');
    belowThreshold.visualAcceptance.score = 87;

    expect(() => assertFeaturedCaseReview('featured', belowThreshold)).toThrow();
  });

  it('requires strong visual proof for a zero-external-asset material route while preserving excellent procedural work', () => {
    const contract = createV2CreativeContract(
      '为一间日光木版套印工坊设计沉浸式网页；同一张和纸依次显现纤维、压痕、靛蓝墨层与朱红套色，最后预约亲手套印。'
    );
    const mechanical = review('pass', 'pass').assessment;
    const plan = createVisualReviewPlan(contract);
    const evidence = {
      mechanical,
      plan
    };
    const weakCanvas = assessDeliveryQuality('high', contract, [], {
      schemaVersion: 1,
      verdict: 'pass',
      score: 89,
      assetRole: 'dominant',
      dimensions: {
        productIntent: 89,
        structureFit: 89,
        stateContinuity: 89,
        visualCohesion: 89,
        interactionCausality: 89,
        mobileReadiness: 89
      },
      summary: '程序化画布可运行，但材质细节仍低于最终精选标准。',
      findings: []
    }, evidence);
    const provenProcedural = assessDeliveryQuality('high', contract, [], {
      schemaVersion: 1,
      verdict: 'pass',
      score: 93,
      assetRole: 'dominant',
      dimensions: {
        productIntent: 93,
        structureFit: 92,
        stateContinuity: 92,
        visualCohesion: 94,
        interactionCausality: 91,
        mobileReadiness: 90
      },
      summary: '纯程序化纸墨系统具有可辨纤维、压痕和连续套色因果，达到最终作品质量。',
      findings: []
    }, evidence);

    expect(weakCanvas).toMatchObject({
      assetMode: 'procedural',
      achievedAssetQuality: 'L2-inspectable',
      finalEligible: false
    });
    expect(provenProcedural).toMatchObject({
      assetMode: 'procedural',
      achievedAssetQuality: 'L3-presentable',
      finalEligible: true
    });
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
