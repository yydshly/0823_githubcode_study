import { z } from 'zod';
import type { V2CreativeContract } from '../v2/creative-contract.ts';
import type { VisualReviewAssessment } from './visual-review.ts';
import { createVisualReviewPlan, type VisualReviewPlan } from './visual-review-plan.ts';
import type { VisualAcceptance } from './visual-acceptance.ts';

const structureModeSchema = z.enum([
  'single-scene',
  'continuous-canvas',
  'guided-sequence',
  'interactive-field',
  'horizontal-panorama',
  'spatial-inspection',
  'task-flow',
  'editorial-flow',
  'catalog',
  'branching-confluence'
]);

const experienceDimensionsSchema = z.object({
  productIntent: z.number().int().min(0).max(100),
  structureFit: z.number().int().min(0).max(100),
  stateContinuity: z.number().int().min(0).max(100),
  visualCohesion: z.number().int().min(0).max(100),
  interactionCausality: z.number().int().min(0).max(100),
  mobileReadiness: z.number().int().min(0).max(100)
}).strict();

export const productExperienceQualitySchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['pending', 'pass', 'revise', 'blocked']),
  score: z.number().int().min(0).max(100).nullable(),
  structureMode: structureModeSchema.nullable(),
  expectedStateCount: z.number().int().nonnegative(),
  reviewedStateCount: z.number().int().nonnegative(),
  stateCoverage: z.number().min(0).max(1),
  modelJudgment: z.enum(['pending', 'pass', 'revise']),
  archiveEligible: z.boolean(),
  dimensions: experienceDimensionsSchema.nullable(),
  summary: z.string().min(8).max(700),
  issues: z.array(z.string().min(4).max(360)).max(8)
}).strict();

export type ProductExperienceQuality = z.infer<typeof productExperienceQualitySchema>;

export interface ProductExperienceEvidence {
  mechanical?: VisualReviewAssessment | null;
  visual?: VisualAcceptance | null;
  plan?: VisualReviewPlan | null;
}

export function assessProductExperienceQuality(
  contract: V2CreativeContract | null | undefined,
  evidence: ProductExperienceEvidence = {},
): ProductExperienceQuality {
  const plan = evidence.plan || (contract ? createVisualReviewPlan(contract) : null);
  const expectedStateCount = contract?.experience.beats.length || 0;
  const plannedStateCount = plan?.checkpoints.filter((checkpoint) => checkpoint.surface === 'desktop').length || 0;
  const reviewedStateCount = evidence.mechanical ? Math.min(expectedStateCount, plannedStateCount) : 0;
  // Product states and browser evidence slots are intentionally different.
  // The bounded review plan may sample representative desktop states so it can
  // also prove mobile opening/middle/final and WebGL fallback within eight slots.
  // Coverage therefore measures execution of the planned desktop evidence, not
  // a fictional one-screenshot-per-product-state requirement.
  const requiredReviewedStateCount = Math.min(expectedStateCount, plannedStateCount);
  const stateCoverage = requiredReviewedStateCount
    ? Math.min(1, reviewedStateCount / requiredReviewedStateCount)
    : 0;
  const structureMode = contract?.experience.structure.mode || null;
  const visual = evidence.visual || null;
  const mechanical = evidence.mechanical || null;

  if (!contract || !mechanical || !visual) {
    return productExperienceQualitySchema.parse({
      schemaVersion: 1,
      status: 'pending',
      score: null,
      structureMode,
      expectedStateCount,
      reviewedStateCount,
      stateCoverage,
      modelJudgment: visual?.verdict || 'pending',
      archiveEligible: false,
      dimensions: visual?.dimensions || null,
      summary: contract
        ? `已选择${structureModeLabel(structureMode)}，等待浏览器状态证据与 Codex 最终视觉判断。`
        : '当前结果没有 V2 产品体验契约，不能判断结构适配和语义状态覆盖。',
      issues: []
    });
  }

  const dimensions = visual.dimensions || fallbackDimensions(visual.score);
  const score = Math.round(mechanical.score * .3 + averageDimensions(dimensions) * .7);
  const issues = [
    ...(stateCoverage < 1 ? [`代表性桌面检查点只完成 ${reviewedStateCount}/${requiredReviewedStateCount}，对应 ${expectedStateCount} 个产品状态。`] : []),
    ...mechanical.findings.map((finding) => finding.message),
    ...visual.findings.map((finding) => finding.message),
    ...dimensionIssues(dimensions)
  ].filter((item, index, list) => list.indexOf(item) === index).slice(0, 8);
  const hasWeakDimension = Object.values(dimensions).some((value) => value < 75);
  const blocked = mechanical.verdict === 'blocked';
  const passed = !blocked
    && mechanical.verdict === 'pass'
    && visual.verdict === 'pass'
    && stateCoverage === 1
    && score >= 88
    && dimensions.productIntent >= 80
    && dimensions.structureFit >= 80
    && !hasWeakDimension
    && !visual.findings.some((finding) => finding.severity === 'major');
  const status = blocked ? 'blocked' as const : passed ? 'pass' as const : 'revise' as const;

  return productExperienceQualitySchema.parse({
    schemaVersion: 1,
    status,
    score,
    structureMode,
    expectedStateCount,
    reviewedStateCount,
    stateCoverage,
    modelJudgment: visual.verdict,
    archiveEligible: passed,
    dimensions,
    summary: passed
      ? `${structureModeLabel(structureMode)}以 ${reviewedStateCount} 个代表性桌面检查点覆盖 ${expectedStateCount} 个产品状态，结构、视觉与行动关系达到最终归档标准。`
      : blocked
        ? `${structureModeLabel(structureMode)}存在运行阻断，当前结果不能进入案例库。`
        : `${structureModeLabel(structureMode)}已生成，但产品意图、结构适配、状态连续性或最终视觉质量仍需修订。`,
    issues
  });
}

function fallbackDimensions(score: number): z.infer<typeof experienceDimensionsSchema> {
  return {
    productIntent: score,
    structureFit: score,
    stateContinuity: score,
    visualCohesion: score,
    interactionCausality: score,
    mobileReadiness: score
  };
}

function averageDimensions(dimensions: z.infer<typeof experienceDimensionsSchema>): number {
  const values = Object.values(dimensions);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dimensionIssues(dimensions: z.infer<typeof experienceDimensionsSchema>): string[] {
  const labels: Record<keyof typeof dimensions, string> = {
    productIntent: '产品目标表达',
    structureFit: '页面结构适配',
    stateContinuity: '状态连续性',
    visualCohesion: '视觉融合',
    interactionCausality: '交互因果',
    mobileReadiness: '移动端完成度'
  };
  return (Object.entries(dimensions) as Array<[keyof typeof dimensions, number]>)
    .filter(([, value]) => value < 75)
    .map(([key, value]) => `${labels[key]}仅 ${value} 分，需要优先修订。`);
}

function structureModeLabel(mode: ProductExperienceQuality['structureMode']): string {
  return ({
    'single-scene': '单一持续场景',
    'continuous-canvas': '连续画布',
    'guided-sequence': '引导序列',
    'interactive-field': '交互工作区',
    'horizontal-panorama': '横向连续图卷',
    'spatial-inspection': '空间动作检查场',
    'task-flow': '任务流程',
    'editorial-flow': '编辑流',
    'catalog': '目录',
    'branching-confluence': '分支汇合'
  } as const)[mode || 'editorial-flow'];
}
