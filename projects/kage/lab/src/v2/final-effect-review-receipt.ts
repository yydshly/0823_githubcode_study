import { z } from 'zod';
import r162Evidence from '../../docs/v2-research/evidence/r162-kage-creative-director.final.json';
import r163Evidence from '../../docs/v2-research/evidence/r163-rainlight-walk-recorder.final.json';
import r169Evidence from '../../docs/v2-research/evidence/r169-kage-feeling-lens.final.json';
import r172Evidence from '../../docs/v2-research/evidence/r172-kage-opening-rehearsal.final.json';
import {
  V2_FORMAL_PRODUCT_ARCHIVE,
  type FormalProductArchiveEntry
} from './formal-product-archive.ts';

const qualityDimensionsSchema = z.object({
  goalClarity: z.number().int().min(0).max(100),
  creativeDistinctiveness: z.number().int().min(0).max(100),
  craftCohesion: z.number().int().min(0).max(100),
  assetIntegration: z.number().int().min(0).max(100),
  interactionValue: z.number().int().min(0).max(100),
  mobileReadiness: z.number().int().min(0).max(100)
}).strict();

const finalEvidenceSourceSchema = z.object({
  deliveryId: z.string(),
  identity: z.object({
    runId: z.string(),
    bundleHash: z.string()
  }).passthrough(),
  productDeliveryEvidence: z.object({
    evidenceNotes: z.array(z.string()).min(3)
  }).passthrough(),
  browserEvidence: z.object({
    browser: z.string(),
    testsPassed: z.number().int().nonnegative(),
    testsTotal: z.number().int().positive(),
    runtimeErrors: z.number().int().nonnegative(),
    consoleErrors: z.number().int().nonnegative(),
    mobile390JourneyPassed: z.boolean()
  }).passthrough(),
  qualityAssessment: qualityDimensionsSchema.extend({
    verdict: z.literal('pass'),
    summary: z.string().trim().min(12)
  }).strict(),
  truthBoundary: z.string().trim().min(12),
  verdict: z.literal('pass'),
  stopReason: z.string().trim().min(12)
}).passthrough();

export const finalEffectReviewReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2),
  status: z.literal('current-pass'),
  artifact: z.object({
    route: z.string().startsWith('/pages/v2/deliveries/'),
    previewUrl: z.string().startsWith('/creative-assets/v2-formal-products/'),
    runId: z.string().trim().min(4),
    bundleHash: z.string().regex(/^[a-f0-9]{64}$/)
  }).strict(),
  experience: z.object({
    verdict: z.literal('pass'),
    score: z.number().int().min(0).max(100),
    dimensions: qualityDimensionsSchema,
    summary: z.string().trim().min(12),
    strongestProofs: z.array(z.string().trim().min(4)).length(3)
  }).strict(),
  executableEvidence: z.object({
    browser: z.string().trim().min(4),
    testsPassed: z.number().int().positive(),
    testsTotal: z.number().int().positive(),
    runtimeErrors: z.literal(0),
    consoleErrors: z.literal(0),
    mobile390JourneyPassed: z.literal(true),
    captureCount: z.number().int().positive()
  }).strict(),
  reviewBoundary: z.object({
    truthBoundary: z.string().trim().min(12),
    stopReason: z.string().trim().min(12),
    authorship: z.literal('post-build-project-review'),
    independenceClaim: z.literal('not-independent-human-taste')
  }).strict()
}).strict().superRefine((receipt, context) => {
  if (receipt.executableEvidence.testsPassed !== receipt.executableEvidence.testsTotal) {
    context.addIssue({ code: 'custom', message: '正式回执必须绑定全部通过的浏览器验收。' });
  }
  const expectedScore = Math.round(
    Object.values(receipt.experience.dimensions).reduce((sum, score) => sum + score, 0) / 6
  );
  if (receipt.experience.score !== expectedScore) {
    context.addIssue({ code: 'custom', message: `回执总分必须由六项既有质量观察计算，当前应为 ${expectedScore}。` });
  }
});

export type FinalEffectReviewReceipt = z.infer<typeof finalEffectReviewReceiptSchema>;

const evidenceByDelivery = {
  'kage-creative-director': r162Evidence,
  'rainlight-walk-recorder': r163Evidence,
  'kage-feeling-lens': r169Evidence,
  'kage-opening-rehearsal': r172Evidence
} as const;

function captureCount(browserEvidence: Record<string, unknown>): number {
  return Object.values(browserEvidence).filter(
    (value) => typeof value === 'string' && value.endsWith('.png')
  ).length;
}

function createReceipt(
  archive: FormalProductArchiveEntry,
  evidenceInput: unknown
): FinalEffectReviewReceipt {
  const evidence = finalEvidenceSourceSchema.parse(evidenceInput);
  if (evidence.deliveryId !== archive.id) {
    throw new Error(`${archive.id} 的最终证据引用了其他产物。`);
  }
  if (
    evidence.identity.runId !== archive.runId
    || evidence.identity.bundleHash !== archive.bundleHash
  ) {
    throw new Error(`${archive.id} 的最终证据已经过期。`);
  }
  const dimensions = qualityDimensionsSchema.parse({
    goalClarity: evidence.qualityAssessment.goalClarity,
    creativeDistinctiveness: evidence.qualityAssessment.creativeDistinctiveness,
    craftCohesion: evidence.qualityAssessment.craftCohesion,
    assetIntegration: evidence.qualityAssessment.assetIntegration,
    interactionValue: evidence.qualityAssessment.interactionValue,
    mobileReadiness: evidence.qualityAssessment.mobileReadiness
  });
  const score = Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / 6);
  return finalEffectReviewReceiptSchema.parse({
    schemaVersion: 1,
    id: archive.id,
    title: archive.title,
    status: 'current-pass',
    artifact: {
      route: archive.route,
      previewUrl: archive.previewUrl,
      runId: archive.runId,
      bundleHash: archive.bundleHash
    },
    experience: {
      verdict: evidence.qualityAssessment.verdict,
      score,
      dimensions,
      summary: evidence.qualityAssessment.summary,
      strongestProofs: evidence.productDeliveryEvidence.evidenceNotes.slice(0, 3)
    },
    executableEvidence: {
      browser: evidence.browserEvidence.browser,
      testsPassed: evidence.browserEvidence.testsPassed,
      testsTotal: evidence.browserEvidence.testsTotal,
      runtimeErrors: evidence.browserEvidence.runtimeErrors,
      consoleErrors: evidence.browserEvidence.consoleErrors,
      mobile390JourneyPassed: evidence.browserEvidence.mobile390JourneyPassed,
      captureCount: captureCount(evidence.browserEvidence)
    },
    reviewBoundary: {
      truthBoundary: evidence.truthBoundary,
      stopReason: evidence.stopReason,
      authorship: 'post-build-project-review',
      independenceClaim: 'not-independent-human-taste'
    }
  });
}

export function receiptMatchesArtifact(
  receiptInput: unknown,
  artifact: Pick<FormalProductArchiveEntry, 'id' | 'runId' | 'bundleHash'>
): boolean {
  const receipt = finalEffectReviewReceiptSchema.safeParse(receiptInput);
  return receipt.success
    && receipt.data.id === artifact.id
    && receipt.data.artifact.runId === artifact.runId
    && receipt.data.artifact.bundleHash === artifact.bundleHash;
}

export function findFinalEffectReviewReceipts(query: string): readonly FinalEffectReviewReceipt[] {
  const normalized = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalized) return V2_FINAL_EFFECT_REVIEW_RECEIPTS;
  return V2_FINAL_EFFECT_REVIEW_RECEIPTS.filter((receipt) => [
    receipt.id,
    receipt.title,
    receipt.artifact.runId,
    receipt.artifact.bundleHash
  ].some((value) => value.toLocaleLowerCase('zh-CN').includes(normalized)));
}

export const V2_FINAL_EFFECT_REVIEW_RECEIPTS: readonly FinalEffectReviewReceipt[] =
  V2_FORMAL_PRODUCT_ARCHIVE.map((archive) => createReceipt(
    archive,
    evidenceByDelivery[archive.id as keyof typeof evidenceByDelivery]
  ));
