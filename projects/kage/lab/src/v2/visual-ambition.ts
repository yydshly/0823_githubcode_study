import { z } from 'zod';
import {
  finalCreativeIdentitySchema,
  type FinalCreativeIdentity
} from './final-creative-evidence.ts';

/**
 * A visual-ambition decision is deliberately separate from the general product
 * quality gate. It describes how much runtime expression a page needs; it does
 * not turn a particular renderer or visual style into a project-wide rule.
 */
export const visualAmbitionIntentLevelSchema = z.enum([
  'restrained',
  'expressive',
  'immersive',
  'flagship'
]);

export type VisualAmbitionIntentLevel = z.infer<typeof visualAmbitionIntentLevelSchema>;

export const visualRenderingMediumSchema = z.enum([
  'dom-css',
  'svg',
  'canvas-2d',
  'raster-image',
  'image-sequence',
  'video',
  'webgl-shader',
  'threejs-3d'
]);

export type VisualRenderingMedium = z.infer<typeof visualRenderingMediumSchema>;

export const visualHeroMomentSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(8).max(600),
  themeConnection: z.string().trim().min(8).max(500),
  appearsWithinSeconds: z.number().min(0).max(15),
  observableRuntimeChange: z.object({
    trigger: z.string().trim().min(2).max(180),
    from: z.string().trim().min(2).max(300),
    to: z.string().trim().min(2).max(300)
  }).strict().nullable()
}).strict();

export type VisualHeroMoment = z.infer<typeof visualHeroMomentSchema>;

export const visualRenderingPlanSchema = z.object({
  primary: visualRenderingMediumSchema,
  supporting: z.array(visualRenderingMediumSchema).max(4),
  rationale: z.string().trim().min(8).max(600)
}).strict().superRefine((plan, context) => {
  const allMedia = [plan.primary, ...plan.supporting];
  if (allMedia.length !== new Set(allMedia).size) {
    context.addIssue({ code: 'custom', message: '主渲染媒介与辅助媒介不能重复。' });
  }
});

export type VisualRenderingPlan = z.infer<typeof visualRenderingPlanSchema>;

export const visualDepthCueSchema = z.enum([
  'scale',
  'occlusion',
  'parallax',
  'focus',
  'lighting',
  'perspective',
  'volumetric',
  'camera-motion'
]);

export const visualSpatialDepthPlanSchema = z.object({
  mode: z.enum(['flat', 'layered-2d', 'parallax', 'volumetric', 'scene-3d']),
  purpose: z.string().trim().min(8).max(500),
  cues: z.array(visualDepthCueSchema).max(8)
}).strict().superRefine((plan, context) => {
  if (plan.cues.length !== new Set(plan.cues).size) {
    context.addIssue({ code: 'custom', message: '空间深度线索不能重复。' });
  }
  if (plan.mode === 'flat' && plan.cues.length > 0) {
    context.addIssue({ code: 'custom', message: '平面模式不应声明未实际使用的深度线索。' });
  }
  if (plan.mode !== 'flat' && plan.cues.length === 0) {
    context.addIssue({ code: 'custom', message: '非平面空间计划必须说明至少一种可观察深度线索。' });
  }
});

export type VisualSpatialDepthPlan = z.infer<typeof visualSpatialDepthPlanSchema>;

export const visualMotionDriverSchema = z.enum([
  'none',
  'time',
  'scroll',
  'pointer',
  'direct-input',
  'audio',
  'hybrid'
]);

export type VisualMotionDriver = z.infer<typeof visualMotionDriverSchema>;

export const visualMotionBeatSchema = z.object({
  phase: z.enum(['opening', 'exploration', 'resolution']),
  driver: visualMotionDriverSchema,
  visualState: z.string().trim().min(4).max(400),
  thematicPurpose: z.string().trim().min(4).max(400)
}).strict();

export const visualMotionArcSchema = z.object({
  beats: z.array(visualMotionBeatSchema).min(1).max(3),
  runtimeAdvantage: z.string().trim().min(4).max(600)
}).strict().superRefine((arc, context) => {
  const phases = arc.beats.map((beat) => beat.phase);
  if (phases.length !== new Set(phases).size) {
    context.addIssue({ code: 'custom', message: '动态弧线的阶段不能重复。' });
  }
});

export type VisualMotionArc = z.infer<typeof visualMotionArcSchema>;

export const interactionSceneMappingSchema = z.object({
  input: z.string().trim().min(2).max(180),
  sceneResponse: z.string().trim().min(4).max(400),
  productMeaning: z.string().trim().min(4).max(400)
}).strict();

export type InteractionSceneMapping = z.infer<typeof interactionSceneMappingSchema>;

export const visualAssetCredibilitySchema = z.object({
  level: z.enum([
    'conceptual-coherent',
    'editorial-credible',
    'product-faithful',
    'data-grounded'
  ]),
  strategy: z.string().trim().min(8).max(600),
  disclosure: z.string().trim().min(4).max(400)
}).strict();

export type VisualAssetCredibility = z.infer<typeof visualAssetCredibilitySchema>;

export const visualFallbackPerformanceBoundarySchema = z.object({
  targetFps: z.union([z.literal(30), z.literal(60)]),
  maxDevicePixelRatio: z.number().min(1).max(2.5),
  initialTransferBudgetMb: z.number().positive().max(25),
  mobileFallback: z.enum(['equivalent', 'simplified-scene', 'key-visual-with-content']),
  reducedMotionFallback: z.enum(['state-crossfade', 'key-states', 'static-complete-state']),
  rendererFailureFallback: z.enum(['dom-content', 'key-visual', 'alternate-media'])
}).strict();

export type VisualFallbackPerformanceBoundary = z.infer<
  typeof visualFallbackPerformanceBoundarySchema
>;

export const visualAmbitionContractSchema = z.object({
  schemaVersion: z.literal(1),
  intentLevel: visualAmbitionIntentLevelSchema,
  intentRationale: z.string().trim().min(8).max(600),
  heroMoment: visualHeroMomentSchema,
  rendering: visualRenderingPlanSchema,
  spatialDepth: visualSpatialDepthPlanSchema,
  motionArc: visualMotionArcSchema,
  interactionToScene: z.array(interactionSceneMappingSchema).max(6),
  assetCredibility: visualAssetCredibilitySchema,
  fallbackPerformance: visualFallbackPerformanceBoundarySchema
}).strict().superRefine((contract, context) => {
  const requiresRuntimeAttraction = isRuntimeAttractionRequired(contract.intentLevel);
  const activeMotion = contract.motionArc.beats.some((beat) => beat.driver !== 'none');

  if (requiresRuntimeAttraction && contract.heroMoment.appearsWithinSeconds > 5) {
    context.addIssue({
      code: 'custom',
      path: ['heroMoment', 'appearsWithinSeconds'],
      message: '沉浸或旗舰页面必须在前 5 秒形成主题专属 Hero Moment。'
    });
  }
  if (requiresRuntimeAttraction && contract.heroMoment.observableRuntimeChange === null) {
    context.addIssue({
      code: 'custom',
      path: ['heroMoment', 'observableRuntimeChange'],
      message: '沉浸或旗舰页面必须规划静态截图无法表达的运行时变化。'
    });
  }
  if (requiresRuntimeAttraction && !activeMotion) {
    context.addIssue({
      code: 'custom',
      path: ['motionArc'],
      message: '沉浸或旗舰页面必须具有与主题相关的动态弧线。'
    });
  }

  const mappingRequired = contract.motionArc.beats.some((beat) =>
    ['pointer', 'direct-input', 'audio', 'hybrid'].includes(beat.driver)
  );
  if (mappingRequired && contract.interactionToScene.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['interactionToScene'],
      message: '声明直接输入、指针、声音或混合驱动时，必须说明输入如何改变场景。'
    });
  }
});

export type VisualAmbitionContract = z.infer<typeof visualAmbitionContractSchema>;

export function createVisualAmbitionContract(input: unknown): VisualAmbitionContract {
  return visualAmbitionContractSchema.parse(input);
}

export function isRuntimeAttractionRequired(level: VisualAmbitionIntentLevel): boolean {
  return level === 'immersive' || level === 'flagship';
}

export const wowGateDimensionsSchema = z.object({
  fiveSecondImpact: z.number().int().min(0).max(100),
  runtimeAdvantage: z.number().int().min(0).max(100),
  themeMemorability: z.number().int().min(0).max(100),
  motionDepthMeaning: z.number().int().min(0).max(100),
  assetIntegrationCredibility: z.number().int().min(0).max(100),
  craftCohesion: z.number().int().min(0).max(100)
}).strict();

export type WowGateDimensions = z.infer<typeof wowGateDimensionsSchema>;

export const wowGateObservationSchema = z.object({
  heroMomentObserved: z.boolean(),
  runtimeAdvantageOverStaticObserved: z.boolean(),
  themeSpecificMemoryObserved: z.boolean(),
  meaningfulMotionOrDepthObserved: z.boolean(),
  credibleAssetIntegrationObserved: z.boolean(),
  summary: z.string().trim().min(8).max(700)
}).strict();

export type WowGateObservation = z.infer<typeof wowGateObservationSchema>;

export const wowGateFindingSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  severity: z.enum(['blocking', 'major', 'minor']),
  message: z.string().trim().min(4).max(500)
}).strict();

export type WowGateFinding = z.infer<typeof wowGateFindingSchema>;

export const wowGateAssessmentSchema = z.object({
  schemaVersion: z.literal(1),
  intentLevel: visualAmbitionIntentLevelSchema,
  required: z.boolean(),
  verdict: z.enum(['pass', 'revise', 'not-required']),
  score: z.number().int().min(0).max(100),
  dimensions: wowGateDimensionsSchema,
  observation: wowGateObservationSchema,
  findings: z.array(wowGateFindingSchema).max(12)
}).strict().superRefine((assessment, context) => {
  const required = isRuntimeAttractionRequired(assessment.intentLevel);
  const score = averageWowDimensions(assessment.dimensions);
  const verdict = deriveWowVerdict(
    assessment.intentLevel,
    assessment.dimensions,
    assessment.observation,
    assessment.findings,
    score
  );
  if (assessment.required !== required) {
    context.addIssue({ code: 'custom', message: `WowGate required 应为 ${required}。` });
  }
  if (assessment.score !== score) {
    context.addIssue({ code: 'custom', message: `吸引力总分必须由维度计算，当前应为 ${score} 分。` });
  }
  if (assessment.verdict !== verdict) {
    context.addIssue({ code: 'custom', message: `WowGate 结论与可观察证据不一致，应为 ${verdict}。` });
  }
});

export type WowGateAssessment = z.infer<typeof wowGateAssessmentSchema>;

export function assessWowAttraction(
  input: {
    dimensions: WowGateDimensions;
    observation: WowGateObservation;
    findings?: WowGateFinding[];
  },
  contract: VisualAmbitionContract
): WowGateAssessment {
  const parsedContract = visualAmbitionContractSchema.parse(contract);
  const dimensions = wowGateDimensionsSchema.parse(input.dimensions);
  const observation = wowGateObservationSchema.parse(input.observation);
  const findings = z.array(wowGateFindingSchema).max(12).parse(input.findings || []);
  const score = averageWowDimensions(dimensions);
  return wowGateAssessmentSchema.parse({
    schemaVersion: 1,
    intentLevel: parsedContract.intentLevel,
    required: isRuntimeAttractionRequired(parsedContract.intentLevel),
    verdict: deriveWowVerdict(
      parsedContract.intentLevel,
      dimensions,
      observation,
      findings,
      score
    ),
    score,
    dimensions,
    observation,
    findings
  });
}

/**
 * Wow evidence is tied to the exact built candidate. Reusing an assessment
 * after either the run id or bundle hash changes is therefore impossible.
 */
export const wowGateEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: finalCreativeIdentitySchema.shape.runId,
  bundleHash: finalCreativeIdentitySchema.shape.bundleHash,
  assessment: wowGateAssessmentSchema
}).strict();

export type WowGateEvidence = z.infer<typeof wowGateEvidenceSchema>;

export function createWowGateEvidence(input: {
  identity: FinalCreativeIdentity;
  assessment: WowGateAssessment;
}): WowGateEvidence {
  const identity = finalCreativeIdentitySchema.parse(input.identity);
  return wowGateEvidenceSchema.parse({
    schemaVersion: 1,
    ...identity,
    assessment: input.assessment
  });
}

export interface WowGateEvidenceVerdict {
  required: boolean;
  structureValid: boolean;
  identityValid: boolean;
  intentValid: boolean;
  passed: boolean;
  reasons: string[];
}

export function evaluateWowGateEvidence(
  input: unknown,
  expectedIdentity: FinalCreativeIdentity,
  contract: VisualAmbitionContract
): WowGateEvidenceVerdict {
  const identity = finalCreativeIdentitySchema.parse(expectedIdentity);
  const ambition = visualAmbitionContractSchema.parse(contract);
  const required = isRuntimeAttractionRequired(ambition.intentLevel);
  const parsed = wowGateEvidenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      required,
      structureValid: false,
      identityValid: false,
      intentValid: false,
      passed: false,
      reasons: ['WowGate 证据结构无效。']
    };
  }

  const evidence = parsed.data;
  const reasons: string[] = [];
  const identityValid = evidence.runId === identity.runId
    && evidence.bundleHash === identity.bundleHash;
  if (!identityValid) reasons.push('WowGate 证据不属于当前最终 bundle。');

  const intentValid = evidence.assessment.intentLevel === ambition.intentLevel;
  if (!intentValid) reasons.push('WowGate 证据的视觉野心等级与当前决策不一致。');

  const attractionPassed = !required || evidence.assessment.verdict === 'pass';
  if (!attractionPassed) reasons.push('沉浸或旗舰页面未通过独立吸引力质量门。');

  return {
    required,
    structureValid: true,
    identityValid,
    intentValid,
    passed: identityValid && intentValid && attractionPassed,
    reasons
  };
}

function averageWowDimensions(dimensions: WowGateDimensions): number {
  const values = Object.values(dimensions);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function deriveWowVerdict(
  intentLevel: VisualAmbitionIntentLevel,
  dimensions: WowGateDimensions,
  observation: WowGateObservation,
  findings: readonly WowGateFinding[],
  score: number
): WowGateAssessment['verdict'] {
  if (!isRuntimeAttractionRequired(intentLevel)) return 'not-required';

  const observationsPassed = observation.heroMomentObserved
    && observation.runtimeAdvantageOverStaticObserved
    && observation.themeSpecificMemoryObserved
    && observation.meaningfulMotionOrDepthObserved
    && observation.credibleAssetIntegrationObserved;
  const seriousFinding = findings.some((finding) => finding.severity !== 'minor');
  const applicable = Object.values(dimensions);
  const minimumScore = intentLevel === 'flagship' ? 88 : 84;
  const minimumDimension = intentLevel === 'flagship' ? 82 : 75;
  const criticalMinimum = intentLevel === 'flagship' ? 86 : 80;
  const critical = [
    dimensions.runtimeAdvantage,
    dimensions.themeMemorability,
    dimensions.motionDepthMeaning,
    dimensions.assetIntegrationCredibility
  ];

  return observationsPassed
    && !seriousFinding
    && score >= minimumScore
    && applicable.every((value) => value >= minimumDimension)
    && critical.every((value) => value >= criticalMinimum)
    ? 'pass'
    : 'revise';
}
