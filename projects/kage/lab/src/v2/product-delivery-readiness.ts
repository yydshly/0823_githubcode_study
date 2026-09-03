import { z } from 'zod';
import { finalCreativeIdentitySchema, type FinalCreativeIdentity } from './final-creative-evidence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const productJourneyStepSchema = z.object({
  id: safeId,
  phase: z.enum(['entry', 'use', 'result', 'continuation']),
  userGoal: z.string().trim().min(4).max(300),
  visibleOutcome: z.string().trim().min(4).max(400)
}).strict();

export const productDeliveryPlanSchema = z.object({
  schemaVersion: z.literal(1),
  productName: z.string().trim().min(2).max(160),
  targetUser: z.string().trim().min(2).max(300),
  userProblem: z.string().trim().min(4).max(500),
  valuePromise: z.string().trim().min(4).max(500),
  primaryAction: z.string().trim().min(2).max(200),
  completionResult: z.string().trim().min(4).max(400),
  continuation: z.string().trim().min(4).max(400),
  journey: z.array(productJourneyStepSchema).length(4),
  visualAssetPolicy: z.enum([
    'formal-source-assets',
    'runtime-native-media',
    'hybrid'
  ]),
  visualAssetRationale: z.string().trim().min(8).max(700)
}).strict().superRefine((plan, context) => {
  const phases = plan.journey.map((step) => step.phase);
  const expected = ['entry', 'use', 'result', 'continuation'];
  if (!expected.every((phase, index) => phases[index] === phase)) {
    context.addIssue({
      code: 'custom',
      path: ['journey'],
      message: '产品旅程必须按进入、使用、结果、后续四个阶段记录。'
    });
  }
});

export type ProductDeliveryPlan = z.infer<typeof productDeliveryPlanSchema>;

export const productDeliveryChecksSchema = z.object({
  productIdentityClear: z.boolean(),
  audienceAndValueClear: z.boolean(),
  entryStateComplete: z.boolean(),
  coreUseStateComplete: z.boolean(),
  resultStateComplete: z.boolean(),
  continuationStateComplete: z.boolean(),
  primaryActionProducesMeaningfulResult: z.boolean(),
  visualAssetsAreFormalOrRuntimeNativeIsJustified: z.boolean(),
  interactionServesProduct: z.boolean(),
  mobileJourneyComplete: z.boolean(),
  truthfulClaims: z.boolean()
}).strict();

export type ProductDeliveryChecks = z.infer<typeof productDeliveryChecksSchema>;

export const productDeliveryEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: finalCreativeIdentitySchema.shape.runId,
  bundleHash: finalCreativeIdentitySchema.shape.bundleHash,
  checks: productDeliveryChecksSchema,
  summary: z.string().trim().min(8).max(700),
  evidenceNotes: z.array(z.string().trim().min(4).max(400)).min(4).max(12)
}).strict();

export type ProductDeliveryEvidence = z.infer<typeof productDeliveryEvidenceSchema>;

export interface ProductDeliveryReadinessVerdict {
  identityValid: boolean;
  journeyPassed: boolean;
  productEligible: boolean;
  failedChecks: Array<keyof ProductDeliveryChecks>;
  reasons: string[];
}

const checkLabels: Record<keyof ProductDeliveryChecks, string> = {
  productIdentityClear: '产品身份',
  audienceAndValueClear: '受众与价值',
  entryStateComplete: '进入状态',
  coreUseStateComplete: '核心使用状态',
  resultStateComplete: '结果状态',
  continuationStateComplete: '后续路径',
  primaryActionProducesMeaningfulResult: '主要行动的真实结果',
  visualAssetsAreFormalOrRuntimeNativeIsJustified: '正式素材或运行时原生媒介依据',
  interactionServesProduct: '交互对产品的作用',
  mobileJourneyComplete: '移动端完整旅程',
  truthfulClaims: '真实性边界'
};

export function evaluateProductDeliveryReadiness(
  planInput: unknown,
  evidenceInput: unknown,
  expectedIdentity: FinalCreativeIdentity
): ProductDeliveryReadinessVerdict {
  const plan = productDeliveryPlanSchema.safeParse(planInput);
  const evidence = productDeliveryEvidenceSchema.safeParse(evidenceInput);
  const identity = finalCreativeIdentitySchema.parse(expectedIdentity);
  if (!plan.success || !evidence.success) {
    return {
      identityValid: false,
      journeyPassed: false,
      productEligible: false,
      failedChecks: [],
      reasons: ['产品交付计划或最终产品证据结构无效。']
    };
  }

  const identityValid = evidence.data.runId === identity.runId
    && evidence.data.bundleHash === identity.bundleHash;
  const failedChecks = (Object.entries(evidence.data.checks) as Array<[
    keyof ProductDeliveryChecks,
    boolean
  ]>)
    .filter(([, passed]) => !passed)
    .map(([check]) => check);
  const journeyPassed = failedChecks.length === 0;
  const reasons = [
    ...(!identityValid ? ['产品证据不属于当前最终 bundle，旧结论已经失效。'] : []),
    ...(failedChecks.length
      ? [`产品交付门未通过：${failedChecks.map((check) => checkLabels[check]).join('、')}。`]
      : [])
  ];
  return {
    identityValid,
    journeyPassed,
    productEligible: identityValid && journeyPassed,
    failedChecks,
    reasons
  };
}

