import { describe, expect, it } from 'vitest';
import { generationJobPatchForRefinement } from '../server/generation-job-refinement-status.ts';

describe('generation job refinement status', () => {
  it('keeps a rejected visual candidate in review-required instead of marking it complete', () => {
    const patch = generationJobPatchForRefinement({
      status: 'rejected',
      summary: '单张静态素材无法可靠表达真实咬合变化。',
      sourceAssessment: { score: 100 },
      visualAcceptance: { verdict: 'revise', score: 82 },
    });

    expect(patch).toMatchObject({
      stage: 'review-required',
      sourceScore: 100,
      finalScore: 82,
      retryableStage: 'reviewing',
    });
    expect(patch.message).toContain('不进入案例库');
  });

  it('fails closed when visual acceptance passes without a delivery-quality decision', () => {
    const patch = generationJobPatchForRefinement({
      status: 'kept',
      summary: '当前版本通过。',
      sourceAssessment: { score: 100 },
      visualAcceptance: { verdict: 'pass', score: 93 },
    });

    expect(patch).toMatchObject({
      stage: 'review-required',
      finalScore: 93,
      error: expect.stringContaining('缺少交付质量结论'),
      retryableStage: 'reviewing',
    });
  });

  it('does not mark a visually passed candidate complete when delivery quality is not final eligible', () => {
    const patch = generationJobPatchForRefinement({
      status: 'refined',
      summary: '视觉检查已通过。',
      sourceAssessment: { score: 91 },
      visualAcceptance: { verdict: 'pass', score: 92 },
    }, {
      finalEligible: false,
      summary: '主视觉素材仍只有 L2 证据。',
    });

    expect(patch).toMatchObject({
      stage: 'review-required',
      finalScore: 92,
      error: '主视觉素材仍只有 L2 证据。',
      retryableStage: 'reviewing',
    });
    expect(patch.message).toContain('交付质量尚未达到最终作品门');
  });

  it('marks a visually passed candidate complete only when delivery quality is final eligible', () => {
    expect(generationJobPatchForRefinement({
      status: 'kept',
      summary: '当前版本通过。',
      sourceAssessment: { score: 94 },
      visualAcceptance: { verdict: 'pass', score: 94 },
    }, {
      finalEligible: true,
      summary: '视觉、素材和产品闭环均达到最终门。',
    })).toMatchObject({ stage: 'complete', error: null, retryableStage: null });
  });
});
