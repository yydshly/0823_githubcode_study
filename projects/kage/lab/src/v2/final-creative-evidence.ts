import { z } from 'zod';
import {
  macroStructureReviewSchema,
  type MacroStructureReview
} from './macro-skeleton-inertia.ts';
import {
  creativePromiseAssessmentSchema,
  type CreativePromiseAssessment
} from './creative-freedom-policy.ts';

export const creativeInteractionModeSchema = z.enum(['none', 'scroll', 'direct', 'mixed']);

export const creativeInteractionRationaleSchema = z.object({
  mode: creativeInteractionModeSchema,
  audioApplicable: z.boolean(),
  rationale: z.string().trim().min(4).max(500)
}).strict();

export type CreativeInteractionRationale = z.infer<typeof creativeInteractionRationaleSchema>;

export const adaptiveEvidenceCheckpointSchema = z.enum([
  'opening',
  'core',
  'mobile',
  'scroll',
  'interaction',
  'audio'
]);

export type AdaptiveEvidenceCheckpoint = z.infer<typeof adaptiveEvidenceCheckpointSchema>;

export const adaptiveEvidenceProfileSchema = z.object({
  schemaVersion: z.literal(1),
  interactionMode: creativeInteractionModeSchema,
  audioApplicable: z.boolean(),
  requiredCheckpoints: z.array(adaptiveEvidenceCheckpointSchema).min(3).max(6)
}).strict().superRefine((profile, context) => {
  const expected = expectedCheckpoints(profile.interactionMode, profile.audioApplicable);
  if (profile.requiredCheckpoints.length !== new Set(profile.requiredCheckpoints).size) {
    context.addIssue({ code: 'custom', message: '自适应证据检查点不能重复。' });
  }
  if (!sameOrderedValues(profile.requiredCheckpoints, expected)) {
    context.addIssue({
      code: 'custom',
      message: `证据配置必须与页面交互形态一致：${expected.join('、')}。`
    });
  }
});

export type AdaptiveEvidenceProfile = z.infer<typeof adaptiveEvidenceProfileSchema>;

export function createAdaptiveEvidenceProfile(
  interaction: CreativeInteractionRationale
): AdaptiveEvidenceProfile {
  const parsed = creativeInteractionRationaleSchema.parse(interaction);
  return adaptiveEvidenceProfileSchema.parse({
    schemaVersion: 1,
    interactionMode: parsed.mode,
    audioApplicable: parsed.audioApplicable,
    requiredCheckpoints: expectedCheckpoints(parsed.mode, parsed.audioApplicable)
  });
}

export const finalCreativeIdentitySchema = z.object({
  runId: z.string().trim().min(1).max(160),
  bundleHash: z.string().trim().min(4).max(160)
}).strict();

export type FinalCreativeIdentity = z.infer<typeof finalCreativeIdentitySchema>;

export const finalEvidenceCheckpointSchema = z.object({
  kind: adaptiveEvidenceCheckpointSchema,
  runId: finalCreativeIdentitySchema.shape.runId,
  bundleHash: finalCreativeIdentitySchema.shape.bundleHash,
  passed: z.boolean(),
  summary: z.string().trim().min(4).max(500)
}).strict();

export type FinalEvidenceCheckpoint = z.infer<typeof finalEvidenceCheckpointSchema>;

export const finalCreativeHardGatesSchema = z.object({
  runtimeClean: z.boolean(),
  criticalAssetsLoaded: z.boolean(),
  primaryActionReachable: z.boolean(),
  mobileComplete: z.boolean(),
  truthfulClaims: z.boolean(),
  interactionVerified: z.boolean().nullable(),
  audioVerified: z.boolean().nullable()
}).strict();

export type FinalCreativeHardGates = z.infer<typeof finalCreativeHardGatesSchema>;

export const directVisualQualityDimensionsSchema = z.object({
  goalClarity: z.number().int().min(0).max(100),
  creativeDistinctiveness: z.number().int().min(0).max(100),
  craftCohesion: z.number().int().min(0).max(100),
  assetIntegration: z.number().int().min(0).max(100),
  interactionValue: z.number().int().min(0).max(100).nullable(),
  mobileReadiness: z.number().int().min(0).max(100)
}).strict();

export type DirectVisualQualityDimensions = z.infer<typeof directVisualQualityDimensionsSchema>;

export const directVisualQualityFindingSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  severity: z.enum(['blocking', 'major', 'minor']),
  checkpoint: adaptiveEvidenceCheckpointSchema.nullable().default(null),
  message: z.string().trim().min(4).max(500)
}).strict();

export type DirectVisualQualityFinding = z.infer<typeof directVisualQualityFindingSchema>;

export const directVisualQualitySchema = z.object({
  schemaVersion: z.literal(1),
  verdict: z.enum(['pass', 'revise']),
  score: z.number().int().min(0).max(100),
  dimensions: directVisualQualityDimensionsSchema,
  summary: z.string().trim().min(4).max(700),
  findings: z.array(directVisualQualityFindingSchema).max(16)
}).strict().superRefine((quality, context) => {
  const expectedScore = averageApplicableDimensions(quality.dimensions);
  const expectedVerdict = qualityVerdict(quality.dimensions, quality.findings, expectedScore);
  if (quality.score !== expectedScore) {
    context.addIssue({ code: 'custom', message: `视觉总分必须由适用维度计算，当前应为 ${expectedScore} 分。` });
  }
  if (quality.verdict !== expectedVerdict) {
    context.addIssue({ code: 'custom', message: `视觉结论与维度和问题严重度不一致，应为 ${expectedVerdict}。` });
  }
});

export type DirectVisualQuality = z.infer<typeof directVisualQualitySchema>;

export function assessDirectVisualQuality(input: {
  dimensions: DirectVisualQualityDimensions;
  summary: string;
  findings?: DirectVisualQualityFinding[];
}, interaction: CreativeInteractionRationale): DirectVisualQuality {
  const parsedInteraction = creativeInteractionRationaleSchema.parse(interaction);
  const dimensions = directVisualQualityDimensionsSchema.parse(input.dimensions);
  ensureInteractionDimensionApplicability(dimensions, parsedInteraction.mode);
  const findings = z.array(directVisualQualityFindingSchema).max(16).parse(input.findings || []);
  const score = averageApplicableDimensions(dimensions);
  return directVisualQualitySchema.parse({
    schemaVersion: 1,
    verdict: qualityVerdict(dimensions, findings, score),
    score,
    dimensions,
    summary: input.summary,
    findings
  });
}

export const finalCreativeEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: finalCreativeIdentitySchema.shape.runId,
  bundleHash: finalCreativeIdentitySchema.shape.bundleHash,
  profile: adaptiveEvidenceProfileSchema,
  checkpoints: z.array(finalEvidenceCheckpointSchema).min(3).max(6),
  hardGates: finalCreativeHardGatesSchema,
  visualQuality: directVisualQualitySchema,
  creativePromise: creativePromiseAssessmentSchema.optional(),
  macroStructureReview: macroStructureReviewSchema.optional()
}).strict().superRefine((evidence, context) => {
  const expectedKinds = evidence.profile.requiredCheckpoints;
  const actualKinds = evidence.checkpoints.map((checkpoint) => checkpoint.kind);
  if (actualKinds.length !== new Set(actualKinds).size) {
    context.addIssue({ code: 'custom', message: '最终证据不能包含重复检查点。' });
  }
  if (!sameUnorderedValues(actualKinds, expectedKinds)) {
    context.addIssue({
      code: 'custom',
      message: `最终证据必须完整覆盖自适应检查点：${expectedKinds.join('、')}。`
    });
  }
  for (const checkpoint of evidence.checkpoints) {
    if (checkpoint.runId !== evidence.runId || checkpoint.bundleHash !== evidence.bundleHash) {
      context.addIssue({
        code: 'custom',
        message: `${checkpoint.kind} 检查点不属于当前最终 bundle。`
      });
    }
  }
  const interactionApplicable = evidence.profile.interactionMode !== 'none';
  if (interactionApplicable !== (evidence.hardGates.interactionVerified !== null)) {
    context.addIssue({
      code: 'custom',
      message: interactionApplicable
        ? '存在交互时必须记录交互验证结果。'
        : '非交互页面不应伪造交互验证门。'
    });
  }
  if (evidence.profile.audioApplicable !== (evidence.hardGates.audioVerified !== null)) {
    context.addIssue({
      code: 'custom',
      message: evidence.profile.audioApplicable
        ? '声音适用时必须记录声音验证结果。'
        : '声音不适用时不应伪造声音验证门。'
    });
  }
  const hasInteractionDimension = evidence.visualQuality.dimensions.interactionValue !== null;
  if (interactionApplicable !== hasInteractionDimension) {
    context.addIssue({
      code: 'custom',
      message: interactionApplicable
        ? '交互页面必须评价交互价值。'
        : '非交互编辑页的交互价值应为不适用。'
    });
  }
});

export type FinalCreativeEvidence = z.infer<typeof finalCreativeEvidenceSchema>;

export function createFinalCreativeEvidence(input: {
  identity: FinalCreativeIdentity;
  interaction: CreativeInteractionRationale;
  checkpoints: FinalEvidenceCheckpoint[];
  hardGates: FinalCreativeHardGates;
  visualQuality: DirectVisualQuality;
  creativePromise?: CreativePromiseAssessment;
  macroStructureReview?: MacroStructureReview;
}): FinalCreativeEvidence {
  const identity = finalCreativeIdentitySchema.parse(input.identity);
  return finalCreativeEvidenceSchema.parse({
    schemaVersion: 1,
    ...identity,
    profile: createAdaptiveEvidenceProfile(input.interaction),
    checkpoints: input.checkpoints,
    hardGates: input.hardGates,
    visualQuality: input.visualQuality,
    ...(input.creativePromise ? { creativePromise: input.creativePromise } : {}),
    ...(input.macroStructureReview ? { macroStructureReview: input.macroStructureReview } : {})
  });
}

export interface FinalCreativeEvidenceVerdict {
  identityValid: boolean;
  checkpointsPassed: boolean;
  hardGatesPassed: boolean;
  structurePassed: boolean;
  creativePromisePassed: boolean;
  qualityPassed: boolean;
  archiveEligible: boolean;
  reasons: string[];
}

export function evaluateFinalCreativeEvidence(
  input: unknown,
  expectedIdentity: FinalCreativeIdentity
): FinalCreativeEvidenceVerdict {
  const identity = finalCreativeIdentitySchema.parse(expectedIdentity);
  const parsed = finalCreativeEvidenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      identityValid: false,
      checkpointsPassed: false,
      hardGatesPassed: false,
      structurePassed: false,
      creativePromisePassed: false,
      qualityPassed: false,
      archiveEligible: false,
      reasons: ['最终证据结构无效或与自适应验收配置不一致。']
    };
  }

  const evidence = parsed.data;
  const reasons: string[] = [];
  const identityValid = evidence.runId === identity.runId && evidence.bundleHash === identity.bundleHash;
  if (!identityValid) reasons.push('最终 runId 或 bundleHash 已改变，旧证据立即失效。');

  const failedCheckpoints = evidence.checkpoints.filter((checkpoint) => !checkpoint.passed);
  const checkpointsPassed = failedCheckpoints.length === 0;
  if (!checkpointsPassed) reasons.push(`证据检查点未通过：${failedCheckpoints.map((item) => item.kind).join('、')}。`);

  const requiredHardGates = [
    ['运行时', evidence.hardGates.runtimeClean],
    ['关键素材', evidence.hardGates.criticalAssetsLoaded],
    ['主要行动', evidence.hardGates.primaryActionReachable],
    ['移动端', evidence.hardGates.mobileComplete],
    ['真实性', evidence.hardGates.truthfulClaims],
    ...(evidence.profile.interactionMode === 'none'
      ? []
      : [['交互', evidence.hardGates.interactionVerified === true] as const]),
    ...(evidence.profile.audioApplicable
      ? [['声音', evidence.hardGates.audioVerified === true] as const]
      : [])
  ] as const;
  const failedHardGates = requiredHardGates.filter(([, passed]) => !passed).map(([label]) => label);
  const hardGatesPassed = failedHardGates.length === 0;
  if (!hardGatesPassed) reasons.push(`硬门未通过：${failedHardGates.join('、')}。`);

  const structurePassed = evidence.macroStructureReview?.verdict !== 'revise';
  if (!structurePassed) {
    reasons.push(evidence.macroStructureReview?.summary || '当前宏观页面结构缺少产品内容依据。');
  }

  const creativePromisePassed = evidence.creativePromise?.passed !== false;
  if (!creativePromisePassed) {
    reasons.push(`创意承诺未兑现：${evidence.creativePromise?.reasons.join('、') || '缺少可观察结果'}。`);
  }

  const qualityPassed = evidence.visualQuality.verdict === 'pass'
    && structurePassed
    && creativePromisePassed;
  if (evidence.visualQuality.verdict !== 'pass') {
    reasons.push(`最终视觉质量仅 ${evidence.visualQuality.score} 分或仍有主要问题。`);
  }

  const archiveEligible = identityValid
    && checkpointsPassed
    && hardGatesPassed
    && structurePassed
    && creativePromisePassed
    && qualityPassed;
  return {
    identityValid,
    checkpointsPassed,
    hardGatesPassed,
    structurePassed,
    creativePromisePassed,
    qualityPassed,
    archiveEligible,
    reasons
  };
}

function expectedCheckpoints(
  mode: CreativeInteractionRationale['mode'],
  audioApplicable: boolean
): AdaptiveEvidenceCheckpoint[] {
  const required: AdaptiveEvidenceCheckpoint[] = ['opening', 'core', 'mobile'];
  if (mode === 'scroll' || mode === 'mixed') required.push('scroll');
  if (mode === 'direct' || mode === 'mixed') required.push('interaction');
  if (audioApplicable) required.push('audio');
  return required;
}

function ensureInteractionDimensionApplicability(
  dimensions: DirectVisualQualityDimensions,
  mode: CreativeInteractionRationale['mode']
): void {
  if (mode === 'none' && dimensions.interactionValue !== null) {
    throw new Error('非交互编辑页的 interactionValue 必须为 null。');
  }
  if (mode !== 'none' && dimensions.interactionValue === null) {
    throw new Error('交互页面必须评价 interactionValue。');
  }
}

function averageApplicableDimensions(dimensions: DirectVisualQualityDimensions): number {
  const values = [
    dimensions.goalClarity,
    dimensions.creativeDistinctiveness,
    dimensions.craftCohesion,
    dimensions.assetIntegration,
    dimensions.mobileReadiness,
    ...(dimensions.interactionValue === null ? [] : [dimensions.interactionValue])
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function qualityVerdict(
  dimensions: DirectVisualQualityDimensions,
  findings: readonly DirectVisualQualityFinding[],
  score: number
): DirectVisualQuality['verdict'] {
  const applicable = [
    dimensions.goalClarity,
    dimensions.creativeDistinctiveness,
    dimensions.craftCohesion,
    dimensions.assetIntegration,
    dimensions.mobileReadiness,
    ...(dimensions.interactionValue === null ? [] : [dimensions.interactionValue])
  ];
  const hasSeriousFinding = findings.some((finding) => finding.severity !== 'minor');
  return score >= 88
    && dimensions.goalClarity >= 80
    && dimensions.creativeDistinctiveness >= 80
    && applicable.every((value) => value >= 75)
    && !hasSeriousFinding
    ? 'pass'
    : 'revise';
}

function sameOrderedValues<T>(actual: readonly T[], expected: readonly T[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function sameUnorderedValues<T>(actual: readonly T[], expected: readonly T[]): boolean {
  return actual.length === expected.length && actual.every((value) => expected.includes(value));
}
