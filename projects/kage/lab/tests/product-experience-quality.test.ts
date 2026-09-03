import { describe, expect, it } from 'vitest';
import { assessProductExperienceQuality } from '../src/generation/product-experience-quality.ts';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const brief = '为一间木版套印工坊设计网页，滚动时同一张和纸逐步落下压痕、靛蓝墨层与朱红套色，最后预约亲手套印。';
const mechanical = {
  schemaVersion: 1 as const,
  verdict: 'pass' as const,
  score: 100,
  summary: '全部语义状态、移动端与回退检查通过。',
  findings: [],
  observations: []
};

describe('product experience quality', () => {
  it('judges a product-derived five-state experience instead of a fixed three-page shape', () => {
    const contract = createV2CreativeContract(brief);
    const result = assessProductExperienceQuality(contract, {
      mechanical,
      plan: createVisualReviewPlan(contract),
      visual: {
        schemaVersion: 1,
        verdict: 'pass',
        score: 94,
        assetRole: 'integrated',
        dimensions: {
          productIntent: 95,
          structureFit: 94,
          stateContinuity: 92,
          visualCohesion: 93,
          interactionCausality: 90,
          mobileReadiness: 89
        },
        summary: '同一张纸在连续画布中完成真实套印过程。',
        findings: []
      }
    });

    expect(result.structureMode).toBe('continuous-canvas');
    expect(result.expectedStateCount).toBe(5);
    expect(result.reviewedStateCount).toBe(4);
    expect(result.stateCoverage).toBe(1);
    expect(result.status).toBe('pass');
    expect(result.archiveEligible).toBe(true);
    expect(result.summary).toContain('4 个代表性桌面检查点覆盖 5 个产品状态');
  });

  it('requires revision when the model reports a structure mismatch', () => {
    const contract = createV2CreativeContract(brief);
    const result = assessProductExperienceQuality(contract, {
      mechanical,
      plan: createVisualReviewPlan(contract),
      visual: {
        schemaVersion: 1,
        verdict: 'revise',
        score: 72,
        assetRole: 'integrated',
        dimensions: {
          productIntent: 86,
          structureFit: 58,
          stateContinuity: 63,
          visualCohesion: 82,
          interactionCausality: 68,
          mobileReadiness: 80
        },
        summary: '内容仍被机械拆成互不关联的整屏章节。',
        findings: [{
          code: 'structure-mode-mismatch',
          severity: 'major',
          frameId: 'beat-indigo-layer',
          message: '连续套印过程被拆成固定章节，主体连续性不足。'
        }]
      }
    });

    expect(result.status).toBe('revise');
    expect(result.archiveEligible).toBe(false);
    expect(result.issues.join(' ')).toContain('页面结构适配');
  });
});
