import { z } from 'zod';

/**
 * This policy protects the creative search space. It limits only authority,
 * truth, delivery safety, and execution cost; it never defines a visual style
 * or a technology whitelist.
 */
export const creativeFreedomPolicySchema = z.object({
  schemaVersion: z.literal(1),
  hardBoundaryPolicy: z.literal('user-truth-runtime-evidence-and-budget-only'),
  referencePolicy: z.literal('advisory-principles-never-templates'),
  inferencePolicy: z.literal('advisory-and-discardable'),
  methodSpace: z.literal('open-including-unlisted-and-invented'),
  techniqueQuota: z.literal('none'),
  staticExpressionPolicy: z.literal('allowed-when-it-best-delivers-the-promise'),
  dynamicExpressionPolicy: z.literal('required-only-when-the-selected-promise-depends-on-it'),
  assessmentBasis: z.literal('declared-experience-promise-not-technique-prestige')
}).strict();

export type CreativeFreedomPolicy = z.infer<typeof creativeFreedomPolicySchema>;

export const CREATIVE_FREEDOM_POLICY: CreativeFreedomPolicy = creativeFreedomPolicySchema.parse({
  schemaVersion: 1,
  hardBoundaryPolicy: 'user-truth-runtime-evidence-and-budget-only',
  referencePolicy: 'advisory-principles-never-templates',
  inferencePolicy: 'advisory-and-discardable',
  methodSpace: 'open-including-unlisted-and-invented',
  techniqueQuota: 'none',
  staticExpressionPolicy: 'allowed-when-it-best-delivers-the-promise',
  dynamicExpressionPolicy: 'required-only-when-the-selected-promise-depends-on-it',
  assessmentBasis: 'declared-experience-promise-not-technique-prestige'
});

export const creativePromiseRuntimeRoleSchema = z.enum([
  'essential',
  'supporting',
  'not-applicable'
]);

export const creativePromiseSchema = z.object({
  schemaVersion: z.literal(1),
  thesis: z.string().trim().min(8).max(700),
  signatureMoment: z.string().trim().min(8).max(700),
  expressionStrategy: z.string().trim().min(8).max(700),
  runtimeRole: creativePromiseRuntimeRoleSchema,
  chosenMethods: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  methodRationale: z.string().trim().min(8).max(700)
}).strict();

export type CreativePromise = z.infer<typeof creativePromiseSchema>;

export const creativePromiseObservationSchema = z.object({
  promiseVisible: z.boolean(),
  signatureMomentDelivered: z.boolean(),
  productActionConnected: z.boolean(),
  visualLanguageCohesive: z.boolean(),
  runtimeChangeObservable: z.boolean().nullable(),
  summary: z.string().trim().min(8).max(700)
}).strict();

export type CreativePromiseObservation = z.infer<typeof creativePromiseObservationSchema>;

export const creativePromiseAssessmentSchema = z.object({
  schemaVersion: z.literal(1),
  policy: creativeFreedomPolicySchema,
  promise: creativePromiseSchema,
  observation: creativePromiseObservationSchema,
  passed: z.boolean(),
  reasons: z.array(z.string().trim().min(4).max(400)).max(8)
}).strict().superRefine((assessment, context) => {
  const evaluated = evaluatePromiseValues(assessment.promise, assessment.observation);
  if (assessment.passed !== evaluated.passed
    || JSON.stringify(assessment.reasons) !== JSON.stringify(evaluated.reasons)) {
    context.addIssue({
      code: 'custom',
      message: '创意承诺结论必须由承诺与最终浏览器观察推导，不能按技术偏好手工改写。'
    });
  }
});

export type CreativePromiseAssessment = z.infer<typeof creativePromiseAssessmentSchema>;

export function assessCreativePromise(input: {
  promise: CreativePromise;
  observation: CreativePromiseObservation;
}): CreativePromiseAssessment {
  const promise = creativePromiseSchema.parse(input.promise);
  const observation = creativePromiseObservationSchema.parse(input.observation);
  const evaluation = evaluatePromiseValues(promise, observation);
  return creativePromiseAssessmentSchema.parse({
    schemaVersion: 1,
    policy: CREATIVE_FREEDOM_POLICY,
    promise,
    observation,
    ...evaluation
  });
}

function evaluatePromiseValues(
  promise: CreativePromise,
  observation: CreativePromiseObservation
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!observation.promiseVisible) reasons.push('最终页面没有清楚兑现本次创意主张。');
  if (!observation.signatureMomentDelivered) reasons.push('声明的核心记忆点没有在最终体验中出现。');
  if (!observation.productActionConnected) reasons.push('主要行动没有与创意结果形成因果连接。');
  if (!observation.visualLanguageCohesive) reasons.push('素材、排版与运行时表达没有形成统一语言。');
  if (promise.runtimeRole === 'essential' && observation.runtimeChangeObservable !== true) {
    reasons.push('本方向声明运行时变化是核心，但最终体验仍可被静态画面等价替代。');
  }
  return { passed: reasons.length === 0, reasons };
}
