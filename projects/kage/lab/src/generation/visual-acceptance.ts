import { z } from 'zod';
import { visualFrameIdSchema, visualReviewAssessmentSchema, type VisualReviewAssessment } from './visual-review.ts';

export const visualAcceptanceFindingSchema = z.object({
  code: z.enum([
    'asset-subordinate',
    'placeholder-dominant',
    'asset-edge-visible',
    'debug-artifact-visible',
    'subject-crop-unstable',
    'focal-hierarchy-weak',
    'copy-obstructed',
    'scroll-density-excessive',
    'final-composition-weak',
    'mobile-composition-weak',
    'product-intent-weak',
    'structure-mode-mismatch',
    'state-continuity-weak',
    'interaction-causality-weak',
    'generic-style-drift',
    'business-loop-unclear',
    'feedback-delta-weak',
    'pseudo-evidence'
  ]),
  severity: z.enum(['major', 'minor']),
  frameId: visualFrameIdSchema.nullable(),
  message: z.string().min(4).max(400)
}).strict();

export const visualAcceptanceDimensionsSchema = z.object({
  productIntent: z.number().int().min(0).max(100),
  structureFit: z.number().int().min(0).max(100),
  stateContinuity: z.number().int().min(0).max(100),
  visualCohesion: z.number().int().min(0).max(100),
  interactionCausality: z.number().int().min(0).max(100),
  mobileReadiness: z.number().int().min(0).max(100)
}).strict();

export const visualAcceptanceSchema = z.object({
  schemaVersion: z.literal(1),
  verdict: z.enum(['pass', 'revise']),
  score: z.number().int().min(0).max(100),
  assetRole: z.enum(['dominant', 'integrated', 'supporting', 'not-applicable']),
  dimensions: visualAcceptanceDimensionsSchema.optional(),
  summary: z.string().min(4).max(700),
  findings: z.array(visualAcceptanceFindingSchema).max(16)
}).strict();

// Stored V1/V2 reviews predate dimension scoring, so the persistence schema
// remains backward-compatible. New model output is deliberately stricter.
export const visualAcceptanceModelResponseSchema = visualAcceptanceSchema.extend({
  dimensions: visualAcceptanceDimensionsSchema
}).strict();

export type VisualAcceptance = z.infer<typeof visualAcceptanceSchema>;

export interface VisualRefinementOpportunity {
  decision: 'refine' | 'stop';
  summary: string;
}

const onePassStructuralFailures = new Set<VisualAcceptance['findings'][number]['code']>([
  'product-intent-weak',
  'structure-mode-mismatch',
  'business-loop-unclear',
  'generic-style-drift',
  'pseudo-evidence'
]);

export function assessVisualRefinementOpportunity(input: VisualAcceptance): VisualRefinementOpportunity {
  const acceptance = visualAcceptanceSchema.parse(input);
  if (acceptance.verdict === 'pass') {
    return { decision: 'stop', summary: '独立视觉判断已经通过，不需要调用视觉精修。' };
  }
  const majorFindings = acceptance.findings.filter((finding) => finding.severity === 'major');
  const structuralFailure = majorFindings.some((finding) => onePassStructuralFailures.has(finding.code));
  const dimensions = acceptance.dimensions;
  const foundationTooWeak = acceptance.score < 72
    || Boolean(dimensions && (dimensions.productIntent < 65 || dimensions.structureFit < 65));
  if (foundationTooWeak || structuralFailure || majorFindings.length > 3) {
    return {
      decision: 'stop',
      summary: `独立视觉判断为 ${acceptance.score} 分，问题超出一次有限精修的可靠范围；保留当前可运行版本为待评审结果。`
    };
  }
  return {
    decision: 'refine',
    summary: `独立视觉判断为 ${acceptance.score} 分，基础产品结构成立，允许使用唯一一次视觉精修机会。`
  };
}

export function isFinalVisualCandidateEligible(
  mechanical: VisualReviewAssessment,
  visual: VisualAcceptance
): boolean {
  const mechanicalResult = visualReviewAssessmentSchema.parse(mechanical);
  const visualResult = visualAcceptanceSchema.parse(visual);
  return mechanicalResult.verdict === 'pass'
    && visualResult.verdict === 'pass'
    && visualResult.score >= 88
    && (!visualResult.dimensions || (
      visualResult.dimensions.productIntent >= 80
      && visualResult.dimensions.structureFit >= 80
      && Object.values(visualResult.dimensions).every((value) => value >= 75)
    ))
    && !visualResult.findings.some((finding) => finding.severity === 'major');
}
