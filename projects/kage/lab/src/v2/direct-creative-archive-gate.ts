import { z } from 'zod';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible,
  type DirectCreativeRun
} from './direct-creative-run.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const V25_DIRECT_CREATIVE_BASELINE = '2.5' as const;

export const v25VerifiedDeliveryRegistrationSchema = z.object({
  schemaVersion: z.literal(1),
  baselineVersion: z.literal(V25_DIRECT_CREATIVE_BASELINE),
  deliveryId: safeId,
  route: z.string().regex(/^\.\/deliveries\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/),
  evidencePath: z.string().regex(/^docs\/v2-research\/evidence\/.+\.direct-creative-run\.json$/),
  runId: z.string().regex(/^direct-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  bundleHash: sha256,
  macroStructure: z.string().trim().min(3).max(80)
}).strict();

export type V25VerifiedDeliveryRegistration = z.infer<
  typeof v25VerifiedDeliveryRegistrationSchema
>;

/**
 * Versioned archive boundary for deliveries created after the V2.5 freeze.
 * Legacy V1 cases keep their existing case-library gate and are not rewritten.
 */
export function assertV25DirectCreativeArchiveEligible(input: unknown): DirectCreativeRun {
  const run = directCreativeRunSchema.parse(input);
  if (run.creativeProtocolVersion !== 2) {
    throw new Error('V2.5 新精选只接受 DirectCreativeRun protocol v2。');
  }
  if (run.verdict !== 'pass') {
    throw new Error(`V2.5 新精选要求 pass，当前为 ${run.verdict}。`);
  }
  if (!run.finalCandidate || !run.adaptiveEvidence) {
    throw new Error('V2.5 新精选缺少最终候选或同一候选的浏览器证据。');
  }
  const structure = run.adaptiveEvidence.macroStructureReview;
  if (!structure || structure.verdict !== 'pass' || !structure.contentJustified) {
    throw new Error('V2.5 新精选缺少通过的内容结构依据。');
  }
  if (run.adaptiveEvidence.runId !== run.finalCandidate.runId
    || run.adaptiveEvidence.bundleHash !== run.finalCandidate.bundleHash) {
    throw new Error('V2.5 新精选的证据身份与最终 bundle 不一致。');
  }
  if (!isDirectCreativeRunArchiveEligible(run)) {
    throw new Error('V2.5 新精选未同时通过最终质量门、身份门和适用的 WowGate。');
  }
  return run;
}

export function createV25VerifiedDeliveryRegistration(input: {
  deliveryId: string;
  route: string;
  evidencePath: string;
  run: unknown;
}): V25VerifiedDeliveryRegistration {
  const run = assertV25DirectCreativeArchiveEligible(input.run);
  const identity = run.finalCandidate!;
  return v25VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    baselineVersion: V25_DIRECT_CREATIVE_BASELINE,
    deliveryId: input.deliveryId,
    route: input.route,
    evidencePath: input.evidencePath,
    runId: identity.runId,
    bundleHash: identity.bundleHash,
    macroStructure: run.adaptiveEvidence!.macroStructureReview!.candidate.layout
  });
}

export function assertV25RegistrationMatchesRun(
  registration: V25VerifiedDeliveryRegistration,
  input: unknown
): DirectCreativeRun {
  const parsedRegistration = v25VerifiedDeliveryRegistrationSchema.parse(registration);
  const run = assertV25DirectCreativeArchiveEligible(input);
  if (run.finalCandidate?.runId !== parsedRegistration.runId
    || run.finalCandidate.bundleHash !== parsedRegistration.bundleHash) {
    throw new Error('V2.5 精选登记与最终 DirectCreativeRun 身份不一致。');
  }
  if (run.adaptiveEvidence?.macroStructureReview?.candidate.layout
    !== parsedRegistration.macroStructure) {
    throw new Error('V2.5 精选登记的宏观结构与最终证据不一致。');
  }
  return run;
}
