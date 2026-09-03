import { z } from 'zod';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible,
  type DirectCreativeRun
} from './direct-creative-run.ts';
import {
  creativeMediumRouteSchema,
  type CreativeMediumRoute
} from './creative-medium-decision.ts';
import {
  evaluateWowGateEvidence,
  isRuntimeAttractionRequired,
  visualRenderingMediumSchema,
  type VisualRenderingMedium
} from './visual-ambition.ts';
import { evaluateFinalCreativeEvidence } from './final-creative-evidence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);

export const V3_DIRECT_CREATIVE_ARCHIVE_BASELINE = '3.0' as const;

export const v3VerifiedDeliveryRegistrationSchema = z.object({
  schemaVersion: z.literal(1),
  archiveGateVersion: z.literal(3),
  baselineVersion: z.literal(V3_DIRECT_CREATIVE_ARCHIVE_BASELINE),
  creativeProtocolVersion: z.literal(3),
  deliveryId: safeId,
  route: z.string().regex(/^\.\/deliveries\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/),
  evidencePath: z.string().regex(/^docs\/v2-research\/evidence\/.+\.direct-creative-run\.json$/),
  runId: z.string().regex(/^direct-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  bundleHash: sha256,
  macroStructure: z.string().trim().min(3).max(80),
  mediumRoute: creativeMediumRouteSchema,
  renderingMedium: visualRenderingMediumSchema
}).strict();

export type V3VerifiedDeliveryRegistration = z.infer<
  typeof v3VerifiedDeliveryRegistrationSchema
>;

export interface V3DirectCreativeArchiveEligibility {
  eligible: boolean;
  protocolValid: boolean;
  verdictPassed: boolean;
  identityValid: boolean;
  structurePassed: boolean;
  qualityPassed: boolean;
  wowPassed: boolean;
  mediumConsistent: boolean;
  reasons: string[];
}

/**
 * Independent V3 archive boundary. The existing V2.5 gate remains frozen and
 * continues to reject protocol 3 runs.
 */
export function evaluateV3DirectCreativeArchiveEligibility(
  input: unknown
): V3DirectCreativeArchiveEligibility {
  const parsed = directCreativeRunSchema.safeParse(input);
  if (!parsed.success) {
    return failedEligibility('V3 精选记录结构无效，或候选与证据身份已经过期。');
  }

  const run = parsed.data;
  const reasons: string[] = [];
  const protocolValid = run.creativeProtocolVersion === 3;
  if (!protocolValid) reasons.push('V3 精选只接受 DirectCreativeRun protocol v3。');

  const verdictPassed = run.verdict === 'pass';
  if (!verdictPassed) reasons.push(`V3 精选要求 pass，当前为 ${run.verdict}。`);

  const candidate = run.finalCandidate;
  const evidence = run.adaptiveEvidence;
  const identityValid = Boolean(candidate
    && evidence
    && candidate.runId === run.id
    && evidence.runId === candidate.runId
    && evidence.bundleHash === candidate.bundleHash);
  if (!identityValid) reasons.push('V3 精选的 run、最终候选与浏览器证据身份不一致。');

  const structure = evidence?.macroStructureReview;
  const structurePassed = Boolean(
    structure && structure.verdict === 'pass' && structure.contentJustified
  );
  if (!structurePassed) reasons.push('V3 精选缺少通过且内容有依据的宏观结构判断。');

  const finalEvaluation = candidate && evidence
    ? evaluateFinalCreativeEvidence(evidence, candidate)
    : null;
  const qualityPassed = Boolean(
    finalEvaluation?.archiveEligible && evidence?.visualQuality.verdict === 'pass'
  );
  if (!qualityPassed) reasons.push('V3 精选未通过最终质量门或同一 bundle 的自适应证据门。');

  const wowPassed = evaluateApplicableWowGate(run);
  if (!wowPassed) reasons.push('V3 精选未通过当前视觉野心等级适用的 WowGate。');

  const mediumReasons = mediumConsistencyReasons(run);
  const mediumConsistent = mediumReasons.length === 0;
  reasons.push(...mediumReasons);

  const generallyEligible = protocolValid && isDirectCreativeRunArchiveEligible(run);
  if (protocolValid && !generallyEligible && verdictPassed && qualityPassed && wowPassed) {
    reasons.push('V3 精选未通过 DirectCreativeRun 的通用归档边界。');
  }

  return {
    eligible: protocolValid
      && verdictPassed
      && identityValid
      && structurePassed
      && qualityPassed
      && wowPassed
      && mediumConsistent
      && generallyEligible,
    protocolValid,
    verdictPassed,
    identityValid,
    structurePassed,
    qualityPassed,
    wowPassed,
    mediumConsistent,
    reasons: [...new Set(reasons)]
  };
}

export function assertV3DirectCreativeArchiveEligible(input: unknown): DirectCreativeRun {
  const eligibility = evaluateV3DirectCreativeArchiveEligibility(input);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reasons.join(' '));
  }
  return directCreativeRunSchema.parse(input);
}

export function createV3VerifiedDeliveryRegistration(input: {
  deliveryId: string;
  route: string;
  evidencePath: string;
  run: unknown;
}): V3VerifiedDeliveryRegistration {
  const run = assertV3DirectCreativeArchiveEligible(input.run);
  const identity = run.finalCandidate!;
  return v3VerifiedDeliveryRegistrationSchema.parse({
    schemaVersion: 1,
    archiveGateVersion: 3,
    baselineVersion: V3_DIRECT_CREATIVE_ARCHIVE_BASELINE,
    creativeProtocolVersion: 3,
    deliveryId: input.deliveryId,
    route: input.route,
    evidencePath: input.evidencePath,
    runId: identity.runId,
    bundleHash: identity.bundleHash,
    macroStructure: run.adaptiveEvidence!.macroStructureReview!.candidate.layout,
    mediumRoute: run.mediumDecision!.preferred,
    renderingMedium: run.visualAmbition!.rendering.primary
  });
}

export function assertV3RegistrationMatchesRun(
  registration: V3VerifiedDeliveryRegistration,
  input: unknown
): DirectCreativeRun {
  const parsedRegistration = v3VerifiedDeliveryRegistrationSchema.parse(registration);
  const run = assertV3DirectCreativeArchiveEligible(input);
  const identity = run.finalCandidate!;
  const structure = run.adaptiveEvidence!.macroStructureReview!;
  if (identity.runId !== parsedRegistration.runId
    || identity.bundleHash !== parsedRegistration.bundleHash) {
    throw new Error('V3 精选登记与最终 DirectCreativeRun 身份不一致。');
  }
  if (structure.candidate.layout !== parsedRegistration.macroStructure) {
    throw new Error('V3 精选登记的宏观结构与最终证据不一致。');
  }
  if (run.mediumDecision!.preferred !== parsedRegistration.mediumRoute
    || run.visualAmbition!.rendering.primary !== parsedRegistration.renderingMedium) {
    throw new Error('V3 精选登记的主媒介与最终执行决策不一致。');
  }
  return run;
}

function evaluateApplicableWowGate(run: DirectCreativeRun): boolean {
  if (!run.visualAmbition || !run.finalCandidate) return false;
  const required = isRuntimeAttractionRequired(run.visualAmbition.intentLevel);
  if (!run.wowEvidence) return !required;
  return evaluateWowGateEvidence(
    run.wowEvidence,
    run.finalCandidate,
    run.visualAmbition
  ).passed;
}

function mediumConsistencyReasons(run: DirectCreativeRun): string[] {
  const decision = run.mediumDecision;
  const ambition = run.visualAmbition;
  const evidence = run.adaptiveEvidence;
  if (!decision) return ['V3 精选缺少 mediumDecision。'];
  if (!ambition) return ['V3 精选缺少与媒介决策绑定的视觉执行计划。'];
  if (!evidence) return ['V3 精选缺少可验证媒介执行结果的浏览器证据。'];

  const reasons: string[] = [];
  const allowedRendering = renderingForRoute(decision.preferred);
  if (!allowedRendering.includes(ambition.rendering.primary)) {
    reasons.push(
      `媒介漂移：${decision.preferred} 不应由 ${ambition.rendering.primary} 承担主渲染。`
    );
  }

  const allowedSources = assetSourcesForRoute(decision.preferred);
  if (!strategyMatchesRoute(run.assetPlan.strategy, decision.preferred)) {
    reasons.push(
      `媒介漂移：${decision.preferred} 与资产策略 ${run.assetPlan.strategy} 不一致。`
    );
  }
  if (run.assetPlan.assets.some((asset) => !allowedSources.includes(asset.source))) {
    reasons.push(`媒介漂移：资产批次包含 ${decision.preferred} 不允许的素材来源。`);
  }

  for (const responsibility of decision.assetResponsibilities.filter((asset) => asset.required)) {
    const planned = run.assetPlan.assets.find((asset) => asset.id === responsibility.id);
    const allowed = plannedSourcesForResponsibility(responsibility.source);
    if (!planned || !planned.required || !allowed.includes(planned.source)) {
      reasons.push(`媒介职责 ${responsibility.id} 未被最终资产批次以正确来源执行。`);
    }
  }

  if (!evidence.hardGates.criticalAssetsLoaded) {
    reasons.push('媒介执行证据未证明关键素材已真实加载。');
  }
  if (!evidence.checkpoints.some((checkpoint) => (
    checkpoint.kind === 'core' && checkpoint.passed
  ))) {
    reasons.push('媒介执行证据缺少通过的核心完成状态。');
  }
  if ((decision.preferred === 'webgl-procedural'
      || decision.preferred === 'threejs-spatial')
    && run.interactionRationale.mode !== 'none'
    && evidence.hardGates.interactionVerified !== true) {
    reasons.push('动态空间媒介缺少真实输入联动的通过证据。');
  }
  return reasons;
}

function renderingForRoute(route: CreativeMediumRoute): readonly VisualRenderingMedium[] {
  if (route === 'generated-image' || route === 'grounded-real-media') return ['raster-image'];
  if (route === 'threejs-spatial') return ['threejs-3d'];
  if (route === 'webgl-procedural') return ['webgl-shader'];
  return ['dom-css', 'svg', 'canvas-2d'];
}

type PlannedAssetSource = DirectCreativeRun['assetPlan']['assets'][number]['source'];

function assetSourcesForRoute(route: CreativeMediumRoute): readonly PlannedAssetSource[] {
  if (route === 'generated-image') return ['generated'];
  if (route === 'grounded-real-media') return ['provided', 'licensed'];
  if (route === 'threejs-spatial') return ['generated', 'provided', 'licensed'];
  if (route === 'webgl-procedural') return ['programmatic'];
  return [];
}

function plannedSourcesForResponsibility(
  source: NonNullable<DirectCreativeRun['mediumDecision']>['assetResponsibilities'][number]['source']
): readonly PlannedAssetSource[] {
  if (source === 'generated-image') return ['generated'];
  if (source === 'real-media') return ['provided', 'licensed'];
  if (source === 'model-3d') return ['generated', 'provided', 'licensed'];
  return ['programmatic'];
}

function strategyMatchesRoute(
  strategy: DirectCreativeRun['assetPlan']['strategy'],
  route: CreativeMediumRoute
): boolean {
  if (route === 'generated-image') return strategy === 'generated';
  if (route === 'grounded-real-media') {
    return strategy === 'provided' || strategy === 'licensed' || strategy === 'mixed';
  }
  if (route === 'threejs-spatial') {
    return strategy === 'generated'
      || strategy === 'provided'
      || strategy === 'licensed'
      || strategy === 'mixed';
  }
  if (route === 'webgl-procedural') return strategy === 'programmatic';
  return strategy === 'none';
}

function failedEligibility(reason: string): V3DirectCreativeArchiveEligibility {
  return {
    eligible: false,
    protocolValid: false,
    verdictPassed: false,
    identityValid: false,
    structurePassed: false,
    qualityPassed: false,
    wowPassed: false,
    mediumConsistent: false,
    reasons: [reason]
  };
}
