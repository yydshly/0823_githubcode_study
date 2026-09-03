import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const macroSkeletonSchema = z.object({
  runId: safeId,
  layout: z.enum(['single-stage', 'editorial-flow', 'spatial-journey', 'spatial-inspection', 'horizontal-panorama', 'catalog', 'sequence', 'branching-confluence']),
  persistentControlPanel: z.boolean(),
  visibleParameterControls: z.boolean(),
  realtimeMetricCluster: z.boolean(),
  primaryAction: z.enum([
    'save-configuration',
    'enter-experience',
    'browse-collection',
    'purchase-or-book',
    'record-or-contribute',
    'other'
  ])
}).strict();

export type MacroSkeleton = z.infer<typeof macroSkeletonSchema>;

export const macroSkeletonInertiaSchema = z.object({
  mode: z.literal('advisory-only'),
  detected: z.boolean(),
  matchedRunIds: z.array(safeId),
  repeatedAxes: z.array(z.enum([
    'layout',
    'persistentControlPanel',
    'visibleParameterControls',
    'realtimeMetricCluster',
    'primaryAction'
  ])),
  mustChange: z.literal(false),
  recommendation: z.string().min(12)
}).strict();

export type MacroSkeletonInertia = z.infer<typeof macroSkeletonInertiaSchema>;

export const macroStructureContentEvidenceSchema = z.object({
  concurrentParameterCount: z.number().int().min(0).max(24),
  realtimeFeedbackRequired: z.boolean(),
  primaryActionDependsOnCurrentState: z.boolean(),
  persistentControlsExplicitlyRequested: z.boolean().default(false),
  rationale: z.string().trim().min(8).max(700)
}).strict();

export type MacroStructureContentEvidence = z.infer<typeof macroStructureContentEvidenceSchema>;

export const macroStructureReviewSchema = z.object({
  mode: z.literal('content-fit-gate'),
  candidate: macroSkeletonSchema,
  inertia: macroSkeletonInertiaSchema,
  persistentWorkbench: z.boolean(),
  contentJustified: z.boolean(),
  verdict: z.enum(['pass', 'revise']),
  findingCode: z.literal('unjustified-persistent-workbench').nullable(),
  summary: z.string().trim().min(12).max(700)
}).strict().superRefine((review, context) => {
  const expectedVerdict = review.contentJustified ? 'pass' : 'revise';
  if (review.verdict !== expectedVerdict) {
    context.addIssue({ code: 'custom', message: `宏观结构结论应为 ${expectedVerdict}。` });
  }
  const expectedFinding = review.contentJustified ? null : 'unjustified-persistent-workbench';
  if (review.findingCode !== expectedFinding) {
    context.addIssue({ code: 'custom', message: '宏观结构问题码与内容依据不一致。' });
  }
});

export type MacroStructureReview = z.infer<typeof macroStructureReviewSchema>;

const axes = [
  'layout',
  'persistentControlPanel',
  'visibleParameterControls',
  'realtimeMetricCluster',
  'primaryAction'
] as const;

/**
 * Detects repeated page shells without changing the selected creative form.
 * Content fit remains authoritative: a real instrument may repeat an effective
 * workbench, while an editorial brief must not be rotated into one for novelty.
 */
export function diagnoseMacroSkeletonInertia(input: {
  candidate: MacroSkeleton;
  recent: readonly MacroSkeleton[];
}): MacroSkeletonInertia {
  const candidate = macroSkeletonSchema.parse(input.candidate);
  const recent = input.recent.slice(0, 12).map((item) => macroSkeletonSchema.parse(item));
  const matched = recent.filter((item) => similarity(candidate, item) >= 4);
  const repeatedAxes = axes.filter((axis) => (
    matched.length >= 3 && matched.every((item) => item[axis] === candidate[axis])
  ));
  const detected = matched.length >= 3 && repeatedAxes.length >= 4;

  return macroSkeletonInertiaSchema.parse({
    mode: 'advisory-only',
    detected,
    matchedRunIds: matched.map((item) => item.runId),
    repeatedAxes,
    mustChange: false,
    recommendation: detected
      ? '近期页面宏观骨架高度重复；重新核对当前内容适配的页面形态、控件可见度与行动类型，但不得为了差异而强制轮换风格。'
      : '未发现足以影响当前方向的宏观骨架惯性；继续由内容适配和最终效果决定页面形态。'
  });
}

/**
 * Reviews whether a persistent single-stage workbench is required by the
 * current product task. Repetition is evidence to re-check the decision, not
 * a novelty mandate: a real concurrent instrument can still pass unchanged.
 */
export function reviewMacroStructureContentFit(input: {
  candidate: MacroSkeleton;
  recent: readonly MacroSkeleton[];
  contentEvidence: MacroStructureContentEvidence;
}): MacroStructureReview {
  const candidate = macroSkeletonSchema.parse(input.candidate);
  const evidence = macroStructureContentEvidenceSchema.parse(input.contentEvidence);
  const inertia = diagnoseMacroSkeletonInertia({ candidate, recent: input.recent });
  const persistentWorkbench = candidate.layout === 'single-stage'
    && candidate.persistentControlPanel
    && candidate.visibleParameterControls;
  const groundedConcurrentInstrument = evidence.concurrentParameterCount >= 2
    && evidence.realtimeFeedbackRequired
    && evidence.primaryActionDependsOnCurrentState;
  const contentJustified = !persistentWorkbench
    || evidence.persistentControlsExplicitlyRequested
    || groundedConcurrentInstrument;

  const summary = contentJustified
    ? persistentWorkbench
      ? `当前任务具有 ${evidence.concurrentParameterCount} 个并发参数、实时结果与状态相关行动，持久工作台由内容需要支持；即使近期骨架重复也不为差异而强制改形。`
      : '当前候选不是持久参数工作台，无需为了近期案例差异而改变内容适配的宏观结构。'
    : inertia.detected
      ? '近期已重复使用相同单舞台参数工作台，而当前任务没有并发参数、实时结果与状态行动的完整依据；应在构建前改为更适合内容的页面结构。'
      : '当前任务没有并发参数、实时结果与状态行动的完整依据，不应使用持久单舞台参数工作台。';

  return macroStructureReviewSchema.parse({
    mode: 'content-fit-gate',
    candidate,
    inertia,
    persistentWorkbench,
    contentJustified,
    verdict: contentJustified ? 'pass' : 'revise',
    findingCode: contentJustified ? null : 'unjustified-persistent-workbench',
    summary
  });
}

function similarity(left: MacroSkeleton, right: MacroSkeleton): number {
  return axes.reduce((score, axis) => score + Number(left[axis] === right[axis]), 0);
}
