import { z } from 'zod';
import { stableHash } from '../generation/stable-hash.ts';
import {
  creativeInteractionRationaleSchema,
  evaluateFinalCreativeEvidence,
  finalCreativeEvidenceSchema,
  finalCreativeIdentitySchema,
  type CreativeInteractionRationale,
  type FinalCreativeEvidence,
  type FinalCreativeIdentity
} from './final-creative-evidence.ts';
import {
  evaluateWowGateEvidence,
  isRuntimeAttractionRequired,
  visualAmbitionContractSchema,
  wowGateEvidenceSchema,
  type VisualAmbitionContract,
  type WowGateEvidence
} from './visual-ambition.ts';
import {
  creativeMediumDecisionSchema,
  type CreativeMediumDecision
} from './creative-medium-decision.ts';
import {
  effectQualitySelectionReceiptSchema,
  evaluateEffectQualitySelection,
  type EffectQualitySelectionReceipt
} from './effect-quality-selection.ts';
import {
  evaluateProductDeliveryReadiness,
  productDeliveryEvidenceSchema,
  productDeliveryPlanSchema,
  type ProductDeliveryEvidence,
  type ProductDeliveryPlan
} from './product-delivery-readiness.ts';

export const directCreativeGoalPlaybackSchema = z.object({
  originalBrief: z.string().trim().min(8).max(4000),
  subject: z.string().trim().min(2).max(200),
  audience: z.string().trim().min(2).max(300),
  desiredOutcome: z.string().trim().min(4).max(500),
  primaryAction: z.string().trim().min(2).max(200),
  hardConstraints: z.array(z.string().trim().min(2).max(300)).max(12),
  preferences: z.array(z.string().trim().min(2).max(300)).max(12)
}).strict();

export type DirectCreativeGoalPlayback = z.infer<typeof directCreativeGoalPlaybackSchema>;

export const directCreativeDirectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  experienceForm: z.string().trim().min(2).max(160),
  rationale: z.string().trim().min(4).max(700)
}).strict();

export type DirectCreativeDirection = z.infer<typeof directCreativeDirectionSchema>;

export const directCreativeReferencePrincipleSchema = z.object({
  referenceId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(2).max(200),
  principle: z.string().trim().min(4).max(500),
  relevance: z.string().trim().min(4).max(500),
  sourceUrl: z.url().optional(),
  sourceUri: z.string().trim().min(1).max(500).optional()
}).strict();

export type DirectCreativeReferencePrinciple = z.infer<typeof directCreativeReferencePrincipleSchema>;

export const directCreativeAssetPlanItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  role: z.string().trim().min(2).max(240),
  source: z.enum(['generated', 'provided', 'licensed', 'programmatic', 'none']),
  required: z.boolean()
}).strict();

export const directCreativeAssetPlanSchema = z.object({
  batchId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  strategy: z.enum(['generated', 'provided', 'licensed', 'programmatic', 'mixed', 'none']),
  rationale: z.string().trim().min(4).max(500),
  assets: z.array(directCreativeAssetPlanItemSchema).max(8)
}).strict().superRefine((plan, context) => {
  if (plan.strategy === 'none' && plan.assets.length > 0) {
    context.addIssue({ code: 'custom', message: '无素材策略不应包含素材条目。' });
  }
  if (plan.strategy !== 'none' && plan.assets.length === 0) {
    context.addIssue({ code: 'custom', message: '素材策略必须说明至少一个素材责任。' });
  }
});

export type DirectCreativeAssetPlan = z.infer<typeof directCreativeAssetPlanSchema>;

export const directCreativeAttemptLimitsSchema = z.object({
  directionSelections: z.literal(1),
  assetBatches: z.literal(1),
  builds: z.literal(1),
  deterministicRepairs: z.literal(2),
  visualRefinements: z.literal(1)
}).strict();

export const DIRECT_CREATIVE_ATTEMPT_LIMITS = directCreativeAttemptLimitsSchema.parse({
  directionSelections: 1,
  assetBatches: 1,
  builds: 1,
  deterministicRepairs: 2,
  visualRefinements: 1
});

export const directCreativeAttemptUsageSchema = z.object({
  directionSelections: z.literal(1),
  assetBatches: z.number().int().min(0).max(1),
  builds: z.number().int().min(0).max(1),
  deterministicRepairs: z.number().int().min(0).max(2),
  visualRefinements: z.number().int().min(0).max(1)
}).strict();

export const directCreativeAttemptBudgetSchema = z.object({
  limits: directCreativeAttemptLimitsSchema,
  used: directCreativeAttemptUsageSchema
}).strict();

export type DirectCreativeAttemptBudget = z.infer<typeof directCreativeAttemptBudgetSchema>;

export const directCreativeStopReasonSchema = z.object({
  code: z.enum([
    'timeout',
    'budget-exhausted',
    'hard-gate-failed',
    'quality-failed',
    'invalid-evidence',
    'manual'
  ]),
  stage: z.string().trim().min(2).max(100),
  message: z.string().trim().min(4).max(700)
}).strict();

export type DirectCreativeStopReason = z.infer<typeof directCreativeStopReasonSchema>;

export const DIRECT_CREATIVE_STATUS_REPORT_AFTER_MS = 60_000;

export const directCreativeStageReportSchema = z.object({
  stage: z.string().trim().min(2).max(100),
  elapsedMs: z.number().int().nonnegative(),
  status: z.enum(['progress', 'completed']),
  summary: z.string().trim().min(4).max(700)
}).strict();

export type DirectCreativeStageReport = z.infer<typeof directCreativeStageReportSchema>;

export const directCreativeRunSchema = z.object({
  schemaVersion: z.literal(1),
  creativeProtocolVersion: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5)
  ]).default(1),
  id: z.string().regex(/^direct-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  goalPlayback: directCreativeGoalPlaybackSchema,
  selectedDirection: directCreativeDirectionSchema,
  referencePrinciples: z.array(directCreativeReferencePrincipleSchema).max(3),
  assetPlan: directCreativeAssetPlanSchema,
  interactionRationale: creativeInteractionRationaleSchema,
  mediumDecision: creativeMediumDecisionSchema.optional(),
  visualAmbition: visualAmbitionContractSchema.optional(),
  effectSelectionReceipt: effectQualitySelectionReceiptSchema.nullable().optional(),
  productDeliveryPlan: productDeliveryPlanSchema.optional(),
  productDeliveryEvidence: productDeliveryEvidenceSchema.nullable().optional(),
  attemptBudget: directCreativeAttemptBudgetSchema,
  stageReports: z.array(directCreativeStageReportSchema).max(24),
  finalCandidate: finalCreativeIdentitySchema.nullable(),
  adaptiveEvidence: finalCreativeEvidenceSchema.nullable(),
  wowEvidence: wowGateEvidenceSchema.optional(),
  verdict: z.enum(['pending', 'pass', 'fail', 'stopped']),
  stopReason: directCreativeStopReasonSchema.nullable()
}).strict().superRefine((run, context) => {
  if (run.creativeProtocolVersion >= 3 && !run.mediumDecision) {
    context.addIssue({ code: 'custom', message: 'V3+ 直接创作协议必须携带媒介决策。' });
  }
  if (run.creativeProtocolVersion >= 4) {
    const hasAttemptedResources = run.attemptBudget.used.assetBatches > 0
      || run.attemptBudget.used.builds > 0
      || run.attemptBudget.used.deterministicRepairs > 0
      || run.attemptBudget.used.visualRefinements > 0
      || Boolean(run.finalCandidate)
      || Boolean(run.adaptiveEvidence);
    if (run.effectSelectionReceipt === undefined) {
      context.addIssue({ code: 'custom', message: 'V4 直接创作协议必须显式记录效果选择回执状态。' });
    } else if (run.effectSelectionReceipt === null) {
      if (hasAttemptedResources) {
        context.addIssue({ code: 'custom', message: '效果选择回执未绑定前不能进入素材或构建。' });
      }
    } else {
      const selection = evaluateEffectQualitySelection(run.effectSelectionReceipt);
      if (selection.mayProceedToResources) {
        if (run.selectedDirection.id !== selection.selectedCandidateId) {
          context.addIssue({ code: 'custom', message: 'V4 运行方向必须与选择回执中的获胜候选一致。' });
        }
      } else if (run.verdict !== 'stopped' || run.stopReason?.stage !== 'effect-selection') {
        context.addIssue({ code: 'custom', message: '无效或无合格候选的 V4 运行必须在效果选择阶段显式停止。' });
      }
    }
  }
  if (run.creativeProtocolVersion === 5) {
    if (!run.productDeliveryPlan) {
      context.addIssue({ code: 'custom', message: 'V5 产品创作协议必须先定义完整产品旅程。' });
    }
    if (run.productDeliveryEvidence) {
      if (!run.finalCandidate) {
        context.addIssue({ code: 'custom', message: '没有最终候选时不能附加产品交付证据。' });
      } else {
        const productVerdict = evaluateProductDeliveryReadiness(
          run.productDeliveryPlan,
          run.productDeliveryEvidence,
          run.finalCandidate
        );
        if (!productVerdict.identityValid) {
          context.addIssue({ code: 'custom', message: productVerdict.reasons.join(' ') });
        }
      }
    }
  }
  if (run.finalCandidate && run.attemptBudget.used.builds !== 1) {
    context.addIssue({ code: 'custom', message: '最终候选必须来自唯一一次构建。' });
  }
  if (run.adaptiveEvidence) {
    if (!run.finalCandidate
      || run.adaptiveEvidence.runId !== run.finalCandidate.runId
      || run.adaptiveEvidence.bundleHash !== run.finalCandidate.bundleHash) {
      context.addIssue({ code: 'custom', message: '最终证据不属于当前候选 bundle。' });
    }
  }
  if (run.wowEvidence) {
    if (!run.visualAmbition) {
      context.addIssue({ code: 'custom', message: '没有视觉野心决策时不能附加 WowGate 证据。' });
    } else if (!run.finalCandidate) {
      context.addIssue({ code: 'custom', message: '没有最终候选时不能附加 WowGate 证据。' });
    } else {
      const wowVerdict = evaluateWowGateEvidence(run.wowEvidence, run.finalCandidate, run.visualAmbition);
      if (!wowVerdict.identityValid || !wowVerdict.intentValid) {
        context.addIssue({ code: 'custom', message: wowVerdict.reasons.join(' ') });
      }
    }
  }
  if (run.verdict === 'pending' && run.stopReason !== null) {
    context.addIssue({ code: 'custom', message: '执行中的任务不能带有停止原因。' });
  }
  if (run.verdict === 'pass') {
    if (!run.finalCandidate || !run.adaptiveEvidence || run.stopReason !== null) {
      context.addIssue({ code: 'custom', message: '通过结论必须具有同一最终候选的完整证据且没有停止原因。' });
    } else if (!evaluateFinalCreativeEvidence(run.adaptiveEvidence, run.finalCandidate).archiveEligible) {
      context.addIssue({ code: 'custom', message: '硬门和最终视觉质量未同时通过，不能标记为 pass。' });
    }
    if (run.creativeProtocolVersion >= 2 && !run.adaptiveEvidence?.macroStructureReview) {
      context.addIssue({ code: 'custom', message: 'V2+ 直接创作协议必须记录内容适配的宏观结构判断。' });
    }
    if (run.visualAmbition && isRuntimeAttractionRequired(run.visualAmbition.intentLevel)) {
      if (!run.wowEvidence) {
        context.addIssue({ code: 'custom', message: '沉浸或旗舰页面缺少同一最终 bundle 的 WowGate 证据。' });
      } else if (run.finalCandidate
        && !evaluateWowGateEvidence(run.wowEvidence, run.finalCandidate, run.visualAmbition).passed) {
        context.addIssue({ code: 'custom', message: '沉浸或旗舰页面未通过独立吸引力质量门。' });
      }
    }
    if (run.creativeProtocolVersion === 5) {
      if (!run.productDeliveryPlan || !run.productDeliveryEvidence || !run.finalCandidate) {
        context.addIssue({ code: 'custom', message: 'V5 通过结论缺少同一最终 bundle 的产品交付证据。' });
      } else if (!evaluateProductDeliveryReadiness(
        run.productDeliveryPlan,
        run.productDeliveryEvidence,
        run.finalCandidate
      ).productEligible) {
        context.addIssue({ code: 'custom', message: '页面只通过技术与视觉门，尚未形成完整产品交付。' });
      }
    }
  }
  if ((run.verdict === 'fail' || run.verdict === 'stopped') && run.stopReason === null) {
    context.addIssue({ code: 'custom', message: '失败或停止的任务必须给出明确原因。' });
  }
});

export type DirectCreativeRun = z.infer<typeof directCreativeRunSchema>;

export function createDirectCreativeRun(input: {
  id?: string;
  goalPlayback: DirectCreativeGoalPlayback;
  selectedDirection: DirectCreativeDirection;
  referencePrinciples: DirectCreativeReferencePrinciple[];
  assetPlan: DirectCreativeAssetPlan;
  interactionRationale: CreativeInteractionRationale;
  mediumDecision?: CreativeMediumDecision;
  visualAmbition?: VisualAmbitionContract;
  productDeliveryPlan?: ProductDeliveryPlan;
  creativeProtocolVersion?: 1 | 2 | 3 | 4 | 5;
}): DirectCreativeRun {
  const creativeProtocolVersion = input.creativeProtocolVersion ?? 1;
  if (creativeProtocolVersion >= 3 && !input.mediumDecision) {
    throw new Error('V3+ 直接创作协议必须携带媒介决策。');
  }
  const legacyIdentity = {
    brief: input.goalPlayback.originalBrief,
    direction: input.selectedDirection.id,
    references: input.referencePrinciples.map((item) => item.referenceId)
  };
  const identitySource = creativeProtocolVersion === 3
    ? JSON.stringify({
        protocol: 3,
        legacy: legacyIdentity,
        mediumDecision: creativeMediumDecisionSchema.parse(input.mediumDecision),
        assetPlan: directCreativeAssetPlanSchema.parse(input.assetPlan)
      })
    : creativeProtocolVersion === 4
      ? JSON.stringify({
          protocol: 4,
          legacy: legacyIdentity,
          mediumDecision: creativeMediumDecisionSchema.parse(input.mediumDecision),
          assetPlan: directCreativeAssetPlanSchema.parse(input.assetPlan),
          selectionGate: 'goal-fit-with-no-rejection'
        })
      : creativeProtocolVersion === 5
        ? JSON.stringify({
            protocol: 5,
            legacy: legacyIdentity,
            mediumDecision: creativeMediumDecisionSchema.parse(input.mediumDecision),
            assetPlan: directCreativeAssetPlanSchema.parse(input.assetPlan),
            productDeliveryPlan: productDeliveryPlanSchema.parse(input.productDeliveryPlan),
            selectionGate: 'goal-fit-with-no-rejection',
            productGate: 'entry-use-result-continuation'
          })
        : JSON.stringify(legacyIdentity);
  return directCreativeRunSchema.parse({
    schemaVersion: 1,
    creativeProtocolVersion,
    id: input.id || `direct-${stableHash(identitySource)}`,
    goalPlayback: input.goalPlayback,
    selectedDirection: input.selectedDirection,
    referencePrinciples: input.referencePrinciples,
    assetPlan: input.assetPlan,
    interactionRationale: input.interactionRationale,
    ...(input.mediumDecision ? { mediumDecision: input.mediumDecision } : {}),
    ...(input.visualAmbition ? { visualAmbition: input.visualAmbition } : {}),
    ...(creativeProtocolVersion >= 4 ? { effectSelectionReceipt: null } : {}),
    ...(input.productDeliveryPlan ? {
      productDeliveryPlan: input.productDeliveryPlan,
      productDeliveryEvidence: null
    } : {}),
    attemptBudget: {
      limits: DIRECT_CREATIVE_ATTEMPT_LIMITS,
      used: {
        directionSelections: 1,
        assetBatches: 0,
        builds: 0,
        deterministicRepairs: 0,
        visualRefinements: 0
      }
    },
    stageReports: [],
    finalCandidate: null,
    adaptiveEvidence: null,
    verdict: 'pending',
    stopReason: null
  });
}

export function recordDirectCreativeStageReport(
  input: DirectCreativeRun,
  report: DirectCreativeStageReport
): DirectCreativeRun {
  const run = requirePendingRun(input);
  const parsed = directCreativeStageReportSchema.parse(report);
  return directCreativeRunSchema.parse({
    ...run,
    stageReports: [...run.stageReports, parsed]
  });
}

export function directCreativeStageNeedsStatusReport(elapsedMs: number): boolean {
  return elapsedMs >= DIRECT_CREATIVE_STATUS_REPORT_AFTER_MS;
}

export const directCreativeAttemptKindSchema = z.enum([
  'asset-batch',
  'build',
  'deterministic-repair',
  'visual-refinement'
]);

export type DirectCreativeAttemptKind = z.infer<typeof directCreativeAttemptKindSchema>;

export function recordDirectCreativeAttempt(
  input: DirectCreativeRun,
  kind: DirectCreativeAttemptKind
): DirectCreativeRun {
  const run = requirePendingRun(input);
  const parsedKind = directCreativeAttemptKindSchema.parse(kind);
  requireEffectSelectionClearance(run);
  if (parsedKind === 'build' && run.attemptBudget.used.assetBatches !== 1) {
    throw new Error('构建前必须先完成唯一一次素材批次决策。');
  }
  if ((parsedKind === 'deterministic-repair' || parsedKind === 'visual-refinement')
    && run.attemptBudget.used.builds !== 1) {
    throw new Error('修复与视觉精修只能作用于已构建候选。');
  }

  const key = attemptUsageKey(parsedKind);
  const limit = run.attemptBudget.limits[key];
  const used = run.attemptBudget.used[key];
  if (used >= limit) {
    return stopRun(run, {
      code: 'budget-exhausted',
      stage: parsedKind,
      message: `${parsedKind} 已达到有界次数 ${limit}，停止继续消耗。`
    });
  }

  return directCreativeRunSchema.parse({
    ...run,
    attemptBudget: {
      ...run.attemptBudget,
      used: { ...run.attemptBudget.used, [key]: used + 1 }
    }
  });
}

export function bindDirectCreativeEffectSelection(
  input: DirectCreativeRun,
  receiptInput: EffectQualitySelectionReceipt
): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (run.creativeProtocolVersion < 4) {
    throw new Error('效果选择回执只属于 V4+ 直接创作协议。');
  }
  if (run.effectSelectionReceipt !== null) {
    throw new Error('效果选择回执已经绑定；不得静默替换方向或重新选择。');
  }
  const receipt = effectQualitySelectionReceiptSchema.parse(receiptInput);
  const selection = evaluateEffectQualitySelection(receipt);
  const withReceipt = { ...run, effectSelectionReceipt: receipt };
  if (!selection.receiptValid) {
    return stopRun(withReceipt, {
      code: 'invalid-evidence',
      stage: 'effect-selection',
      message: selection.reasons.join(' ') || '效果选择回执无效，已在素材前停止。'
    });
  }
  if (!selection.mayProceedToResources || !selection.selectedCandidateId) {
    return stopRun(withReceipt, {
      code: 'hard-gate-failed',
      stage: 'effect-selection',
      message: '三个效果候选均不合格，已在素材前停止；不会选择“最不差”方向继续消耗。'
    });
  }
  const winner = receipt.candidates.find((candidate) => candidate.id === selection.selectedCandidateId)!;
  return directCreativeRunSchema.parse({
    ...withReceipt,
    selectedDirection: {
      id: winner.id,
      title: winner.title,
      experienceForm: clipRunText(winner.experienceForm, 160),
      rationale: clipRunText(`${receipt.decisionRationale} ${winner.signaturePhenomenon}`, 700)
    }
  });
}

export function stopDirectCreativeRunForTimeout(
  input: DirectCreativeRun,
  stage: string,
  message = '阶段达到时间上限，任务已显式停止；不会在后台静默重试。'
): DirectCreativeRun {
  const run = requirePendingRun(input);
  return stopRun(run, { code: 'timeout', stage, message });
}

export function setDirectCreativeFinalCandidate(
  input: DirectCreativeRun,
  candidate: FinalCreativeIdentity
): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (run.attemptBudget.used.builds !== 1) throw new Error('必须先记录唯一一次构建，才能登记最终候选。');
  const identity = finalCreativeIdentitySchema.parse(candidate);
  if (run.creativeProtocolVersion >= 3 && identity.runId !== run.id) {
    throw new Error('V3+ 最终候选 runId 必须绑定当前媒介决策运行。');
  }
  const candidateChanged = Boolean(run.finalCandidate
    && (run.finalCandidate.runId !== identity.runId || run.finalCandidate.bundleHash !== identity.bundleHash));
  return directCreativeRunSchema.parse({
    ...run,
    finalCandidate: identity,
    adaptiveEvidence: candidateChanged ? null : run.adaptiveEvidence,
    ...(candidateChanged ? {
      wowEvidence: undefined,
      ...(run.creativeProtocolVersion === 5 ? { productDeliveryEvidence: null } : {})
    } : {})
  });
}

export function attachDirectCreativeEvidence(
  input: DirectCreativeRun,
  evidence: FinalCreativeEvidence
): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (!run.finalCandidate) throw new Error('没有最终候选，不能附加证据。');
  const parsedEvidence = finalCreativeEvidenceSchema.parse(evidence);
  if (parsedEvidence.runId !== run.finalCandidate.runId
    || parsedEvidence.bundleHash !== run.finalCandidate.bundleHash) {
    throw new Error('证据的 runId 或 bundleHash 与最终候选不一致。');
  }
  if (run.creativeProtocolVersion >= 2 && !parsedEvidence.macroStructureReview) {
    throw new Error('V2+ 直接创作协议缺少内容适配的宏观结构判断。');
  }
  return directCreativeRunSchema.parse({ ...run, adaptiveEvidence: parsedEvidence });
}

export function attachDirectCreativeWowEvidence(
  input: DirectCreativeRun,
  evidence: WowGateEvidence
): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (!run.visualAmbition) throw new Error('没有视觉野心决策，不能附加 WowGate 证据。');
  if (!run.finalCandidate) throw new Error('没有最终候选，不能附加 WowGate 证据。');
  const parsedEvidence = wowGateEvidenceSchema.parse(evidence);
  const verdict = evaluateWowGateEvidence(parsedEvidence, run.finalCandidate, run.visualAmbition);
  if (!verdict.identityValid) throw new Error('WowGate 证据的 runId 或 bundleHash 与最终候选不一致。');
  if (!verdict.intentValid) throw new Error('WowGate 证据的视觉野心等级与当前决策不一致。');
  return directCreativeRunSchema.parse({ ...run, wowEvidence: parsedEvidence });
}

export function attachProductDeliveryEvidence(
  input: DirectCreativeRun,
  evidence: ProductDeliveryEvidence
): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (run.creativeProtocolVersion !== 5 || !run.productDeliveryPlan) {
    throw new Error('产品交付证据只属于带完整产品旅程的 V5 直接创作运行。');
  }
  if (!run.finalCandidate) throw new Error('没有最终候选，不能附加产品交付证据。');
  const parsed = productDeliveryEvidenceSchema.parse(evidence);
  const verdict = evaluateProductDeliveryReadiness(
    run.productDeliveryPlan,
    parsed,
    run.finalCandidate
  );
  if (!verdict.identityValid) throw new Error(verdict.reasons.join(' '));
  return directCreativeRunSchema.parse({ ...run, productDeliveryEvidence: parsed });
}

export function finalizeDirectCreativeRun(input: DirectCreativeRun): DirectCreativeRun {
  const run = requirePendingRun(input);
  if (run.attemptBudget.used.assetBatches !== 1 || run.attemptBudget.used.builds !== 1) {
    return failRun(run, {
      code: 'invalid-evidence',
      stage: 'bounded-workflow',
      message: '唯一方向、素材批次和构建尚未形成完整闭环。'
    });
  }
  if (!run.finalCandidate || !run.adaptiveEvidence) {
    return failRun(run, {
      code: 'invalid-evidence',
      stage: 'final-evidence',
      message: '缺少同一最终 bundle 的完整自适应证据。'
    });
  }
  if (run.creativeProtocolVersion >= 2 && !run.adaptiveEvidence.macroStructureReview) {
    return failRun(run, {
      code: 'invalid-evidence',
      stage: 'macro-structure',
      message: 'V2+ 直接创作协议缺少内容适配的宏观结构判断；不会把未说明结构依据的页面归档。'
    });
  }

  const evaluation = evaluateFinalCreativeEvidence(run.adaptiveEvidence, run.finalCandidate);
  const wowRequired = Boolean(run.visualAmbition
    && isRuntimeAttractionRequired(run.visualAmbition.intentLevel));
  const wowEvaluation = run.visualAmbition && run.wowEvidence
    ? evaluateWowGateEvidence(run.wowEvidence, run.finalCandidate, run.visualAmbition)
    : null;
  if (wowRequired && !run.wowEvidence) {
    return failRun(run, {
      code: 'invalid-evidence',
      stage: 'wow-gate',
      message: '沉浸或旗舰页面缺少同一最终 bundle 的 WowGate 证据。'
    });
  }
  if (wowRequired && !wowEvaluation?.passed) {
    return failRun(run, {
      code: 'quality-failed',
      stage: 'wow-gate',
      message: wowEvaluation?.reasons.join(' ') || '沉浸或旗舰页面未通过独立吸引力质量门。'
    });
  }
  if (run.creativeProtocolVersion === 5) {
    if (!run.productDeliveryPlan || !run.productDeliveryEvidence) {
      return failRun(run, {
        code: 'invalid-evidence',
        stage: 'product-delivery',
        message: '缺少进入、使用、结果与后续路径的产品交付证据；技术演示不能进入正式产品库。'
      });
    }
    const productVerdict = evaluateProductDeliveryReadiness(
      run.productDeliveryPlan,
      run.productDeliveryEvidence,
      run.finalCandidate
    );
    if (!productVerdict.productEligible) {
      return failRun(run, {
        code: productVerdict.identityValid ? 'quality-failed' : 'invalid-evidence',
        stage: 'product-delivery',
        message: productVerdict.reasons.join(' ') || '页面尚未形成完整产品交付。'
      });
    }
  }
  if (evaluation.archiveEligible) {
    return directCreativeRunSchema.parse({ ...run, verdict: 'pass', stopReason: null });
  }
  const qualityOnlyFailure = evaluation.identityValid
    && evaluation.checkpointsPassed
    && evaluation.hardGatesPassed
    && !evaluation.qualityPassed;
  const reason: DirectCreativeStopReason = qualityOnlyFailure
    ? {
      code: 'quality-failed',
      stage: 'final-quality',
      message: evaluation.reasons.join(' ') || '最终视觉质量未达到归档标准。'
    }
    : {
      code: evaluation.identityValid ? 'hard-gate-failed' : 'invalid-evidence',
      stage: 'final-evidence',
      message: evaluation.reasons.join(' ') || '最终硬门或证据身份未通过。'
    };
  return failRun(run, reason);
}

export function isDirectCreativeRunArchiveEligible(input: DirectCreativeRun): boolean {
  const run = directCreativeRunSchema.parse(input);
  const wowPassed = !run.visualAmbition
    || !isRuntimeAttractionRequired(run.visualAmbition.intentLevel)
    || Boolean(run.finalCandidate
      && run.wowEvidence
      && evaluateWowGateEvidence(run.wowEvidence, run.finalCandidate, run.visualAmbition).passed);
  return run.verdict === 'pass'
    && Boolean(run.finalCandidate)
    && Boolean(run.adaptiveEvidence)
    && (run.creativeProtocolVersion === 1 || Boolean(run.adaptiveEvidence?.macroStructureReview))
    && evaluateFinalCreativeEvidence(run.adaptiveEvidence, run.finalCandidate as FinalCreativeIdentity).archiveEligible
    && wowPassed;
}

export function isDirectCreativeRunProductEligible(input: DirectCreativeRun): boolean {
  const run = directCreativeRunSchema.parse(input);
  return run.creativeProtocolVersion === 5
    && isDirectCreativeRunArchiveEligible(run)
    && Boolean(run.productDeliveryPlan)
    && Boolean(run.productDeliveryEvidence)
    && Boolean(run.finalCandidate)
    && evaluateProductDeliveryReadiness(
      run.productDeliveryPlan,
      run.productDeliveryEvidence,
      run.finalCandidate as FinalCreativeIdentity
    ).productEligible;
}

function requirePendingRun(input: DirectCreativeRun): DirectCreativeRun {
  const run = directCreativeRunSchema.parse(input);
  if (run.verdict !== 'pending') {
    throw new Error(`任务已处于 ${run.verdict}，不得静默重试或继续增加尝试。`);
  }
  return run;
}

function requireEffectSelectionClearance(run: DirectCreativeRun): void {
  if (run.creativeProtocolVersion < 4) return;
  if (!run.effectSelectionReceipt) {
    throw new Error('V4+ 必须先绑定有效效果选择回执，才能进入素材或构建。');
  }
  const selection = evaluateEffectQualitySelection(run.effectSelectionReceipt);
  if (!selection.receiptValid || !selection.mayProceedToResources) {
    throw new Error('当前效果选择回执没有获得素材执行许可。');
  }
}

function attemptUsageKey(kind: DirectCreativeAttemptKind): keyof Omit<DirectCreativeAttemptBudget['used'], 'directionSelections'> {
  return ({
    'asset-batch': 'assetBatches',
    build: 'builds',
    'deterministic-repair': 'deterministicRepairs',
    'visual-refinement': 'visualRefinements'
  } as const)[kind];
}

function stopRun(run: DirectCreativeRun, reason: DirectCreativeStopReason): DirectCreativeRun {
  return directCreativeRunSchema.parse({ ...run, verdict: 'stopped', stopReason: reason });
}

function failRun(run: DirectCreativeRun, reason: DirectCreativeStopReason): DirectCreativeRun {
  return directCreativeRunSchema.parse({ ...run, verdict: 'fail', stopReason: reason });
}

function clipRunText(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(1, maximum - 1))}…`;
}
