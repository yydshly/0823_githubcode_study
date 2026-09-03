import { describe, expect, it } from 'vitest';
import {
  assessVisualRefinementOpportunity,
  isFinalVisualCandidateEligible,
  visualAcceptanceModelResponseSchema,
  visualAcceptanceSchema
} from '../src/generation/visual-acceptance';
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
  it('keeps legacy reviews readable but requires dimensions from new model output', () => {
    const legacy = {
      schemaVersion: 1 as const,
      verdict: 'pass' as const,
      score: 90,
      assetRole: 'integrated' as const,
      summary: '旧版视觉验收记录仍然可以读取。',
      findings: []
    };
    expect(visualAcceptanceSchema.safeParse(legacy).success).toBe(true);
    expect(visualAcceptanceModelResponseSchema.safeParse(legacy).success).toBe(false);
  });

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

  it('does not select a visually polished result when its product structure is weak', () => {
    const weakStructure = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'pass',
      score: 91,
      assetRole: 'integrated',
      dimensions: {
        productIntent: 90,
        structureFit: 68,
        stateContinuity: 82,
        visualCohesion: 94,
        interactionCausality: 80,
        mobileReadiness: 84
      },
      summary: '画面精致，但页面结构与产品过程不匹配。',
      findings: []
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, weakStructure)).toBe(false);
  });

  it('accepts business-legibility findings and blocks them from final selection', () => {
    const unclear = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'revise',
      score: 74,
      assetRole: 'integrated',
      summary: '页面具有技术反馈，但非行业用户无法理解操作后的业务结果。',
      findings: [{
        code: 'business-loop-unclear',
        severity: 'major',
        frameId: 'opening',
        message: '首屏只有专业参数与抽象视觉，没有清楚的对象—操作—结果闭环。'
      }]
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, unclear)).toBe(false);
    expect(assessVisualRefinementOpportunity(unclear)).toMatchObject({ decision: 'stop' });
  });

  it('spends the one refinement pass only on a repairable visual gap', () => {
    const repairable = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'revise',
      score: 79,
      assetRole: 'integrated',
      dimensions: {
        productIntent: 82,
        structureFit: 84,
        stateContinuity: 76,
        visualCohesion: 68,
        interactionCausality: 78,
        mobileReadiness: 72
      },
      summary: '产品结构成立，但材质融合和移动构图仍需一次集中修订。',
      findings: [{
        code: 'mobile-composition-weak',
        severity: 'major',
        frameId: 'mobile',
        message: '移动端主体裁切偏重，但控制和业务闭环仍然完整。'
      }]
    });
    expect(assessVisualRefinementOpportunity(repairable)).toMatchObject({ decision: 'refine' });
  });

  it('recognizes leaked review annotations and unstable subject crops as final-effect failures', () => {
    const result = visualAcceptanceSchema.parse({
      schemaVersion: 1,
      verdict: 'revise',
      score: 76,
      assetRole: 'dominant',
      summary: '主体素材成立，但交付画面仍残留评审批注，连续状态的连接位置也发生跳变。',
      findings: [
        { code: 'debug-artifact-visible', severity: 'major', frameId: 'opening', message: '首屏仍能看到红色箭头和调试文字。' },
        { code: 'subject-crop-unstable', severity: 'major', frameId: 'final', message: '相邻状态中主体锚点与连接位置不一致。' }
      ]
    });
    expect(isFinalVisualCandidateEligible(mechanicalPass, result)).toBe(false);
    expect(assessVisualRefinementOpportunity(result)).toMatchObject({ decision: 'refine' });
  });
});
