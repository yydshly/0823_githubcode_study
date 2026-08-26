import { z } from 'zod';
import { visualFrameIdSchema, visualReviewAssessmentSchema, type VisualReviewAssessment } from './visual-review.ts';

export const visualAcceptanceFindingSchema = z.object({
  code: z.enum([
    'asset-subordinate',
    'placeholder-dominant',
    'asset-edge-visible',
    'focal-hierarchy-weak',
    'copy-obstructed',
    'scroll-density-excessive',
    'final-composition-weak',
    'mobile-composition-weak'
  ]),
  severity: z.enum(['major', 'minor']),
  frameId: visualFrameIdSchema.nullable(),
  message: z.string().min(4).max(400)
}).strict();

export const visualAcceptanceSchema = z.object({
  schemaVersion: z.literal(1),
  verdict: z.enum(['pass', 'revise']),
  score: z.number().int().min(0).max(100),
  assetRole: z.enum(['dominant', 'integrated', 'supporting', 'not-applicable']),
  summary: z.string().min(4).max(700),
  findings: z.array(visualAcceptanceFindingSchema).max(16)
}).strict();

export type VisualAcceptance = z.infer<typeof visualAcceptanceSchema>;

export function isFinalVisualCandidateEligible(
  mechanical: VisualReviewAssessment,
  visual: VisualAcceptance
): boolean {
  const mechanicalResult = visualReviewAssessmentSchema.parse(mechanical);
  const visualResult = visualAcceptanceSchema.parse(visual);
  return mechanicalResult.verdict === 'pass'
    && visualResult.verdict === 'pass'
    && !visualResult.findings.some((finding) => finding.severity === 'major');
}

