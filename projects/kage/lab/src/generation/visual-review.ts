import { z } from 'zod';
import type { VisualReviewPlan } from './visual-review-plan.ts';

export const visualFrameIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const causalJourneyStateSchema = z.object({
  input: z.enum(['wheel', 'control']),
  markers: z.object({
    anchorCount: z.number().int().nonnegative(),
    controlCount: z.number().int().nonnegative(),
    resultCount: z.number().int().nonnegative(),
    actionCount: z.number().int().nonnegative()
  }).strict(),
  inputObserved: z.boolean(),
  anchorIdentityStable: z.boolean(),
  anchorChanged: z.boolean().nullable(),
  anchorDelta: z.number().min(0).max(1),
  resultChanged: z.boolean(),
  actionAvailable: z.boolean(),
  substitute: z.enum([
    'none',
    'copy-or-highlight-only',
    'opacity-or-blur-only',
    'whole-scale-only',
    'framing-only',
    'continuity-unverified'
  ]),
  initialProgress: z.number().min(0).max(1),
  finalProgress: z.number().min(0).max(1)
}).strict();

export type CausalJourneyState = z.infer<typeof causalJourneyStateSchema>;

export const visualFrameEvidenceSchema = z.object({
  id: visualFrameIdSchema,
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  quality: z.enum(['high', 'balanced', 'low']),
  reducedMotion: z.boolean(),
  ready: z.boolean(),
  canvasCount: z.number().int().nonnegative(),
  progress: z.number().min(0).max(1),
  scrollY: z.number().nonnegative(),
  scrollHeight: z.number().positive(),
  overflow: z.number(),
  heading: z.string().max(240),
  headingVisible: z.boolean().default(false),
  headingFontSizePx: z.number().nonnegative().optional(),
  headingViewportHeightRatio: z.number().min(0).max(1).optional(),
  headingViewportAreaRatio: z.number().min(0).max(1).optional(),
  visibleTextCount: z.number().int().nonnegative(),
  collisionCount: z.number().int().nonnegative(),
  maxOverlapRatio: z.number().min(0).max(1),
  blockingCollisionCount: z.number().int().nonnegative().default(0),
  editorialOverlapCount: z.number().int().nonnegative().default(0),
  maxBlockingOverlapRatio: z.number().min(0).max(1).default(0),
  canvasOcclusionRisk: z.boolean().optional(),
  canvasOcclusionRatio: z.number().min(0).max(1).optional(),
  canvasOccludingLayer: z.string().max(160).optional(),
  subjectCaptureAvailable: z.boolean().optional(),
  subjectChangeExpected: z.boolean().optional(),
  subjectChanged: z.boolean().nullable().optional(),
  subjectDelta: z.number().min(0).max(1).optional(),
  subjectSelector: z.string().max(160).optional(),
  action: z.enum(['none', 'semantic-probe', 'driver-probe', 'webgl-fallback']).optional(),
  interactionTargetCount: z.number().int().nonnegative().optional(),
  interactionInputObserved: z.boolean().optional(),
  mobileTaskPath: z.object({
    controlCount: z.number().int().nonnegative(),
    resultCount: z.number().int().nonnegative(),
    actionCount: z.number().int().nonnegative(),
    reachableControlCount: z.number().int().nonnegative(),
    reachableResultCount: z.number().int().nonnegative(),
    reachableActionCount: z.number().int().nonnegative()
  }).strict().optional(),
  webglAvailable: z.boolean().optional(),
  fallbackActive: z.boolean().optional(),
  semanticState: z.object({
    inputChanged: z.boolean(),
    outputChanged: z.boolean(),
    parameterActionObserved: z.boolean().optional(),
    highLevelActionObserved: z.boolean().optional(),
    sceneChanged: z.boolean().nullable().optional(),
    highLevelSceneChanged: z.boolean().nullable().optional(),
    sceneDelta: z.number().min(0).max(1).optional(),
    highLevelSceneDelta: z.number().min(0).max(1).optional(),
    mismatchedValueCount: z.number().int().nonnegative(),
    aggregateInvariantValid: z.boolean().nullable(),
    issues: z.array(z.string().min(3).max(240)).max(12)
  }).strict().optional(),
  causalState: causalJourneyStateSchema.optional(),
  driverState: z.object({
    rootFound: z.boolean(),
    demoControlFound: z.boolean(),
    progressMarkerFound: z.boolean(),
    manualControlFound: z.boolean(),
    demoProgressChanged: z.boolean(),
    wheelProgressChanged: z.boolean(),
    manualOverrideObserved: z.boolean(),
    demoSceneChanged: z.boolean().nullable(),
    wheelSceneChanged: z.boolean().nullable(),
    manualSceneChanged: z.boolean().nullable(),
    demoSceneDelta: z.number().min(0).max(1),
    wheelSceneDelta: z.number().min(0).max(1),
    manualSceneDelta: z.number().min(0).max(1),
    initialProgress: z.number().min(0).max(1).nullable(),
    afterDemoProgress: z.number().min(0).max(1).nullable(),
    afterWheelProgress: z.number().min(0).max(1).nullable(),
    afterManualProgress: z.number().min(0).max(1).nullable(),
    modes: z.array(z.string().max(32)).length(3)
  }).strict().optional()
}).strict();

export const visualReviewEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  capturedAt: z.string(),
  frames: z.array(visualFrameEvidenceSchema).min(3).max(8),
  browserErrors: z.array(z.string().max(600)).max(30)
}).strict().superRefine((evidence, context) => {
  const ids = evidence.frames.map((frame) => frame.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['frames'], message: '视觉证据帧 ID 不能重复。' });
  }
  for (const required of ['opening', 'final', 'mobile']) {
    if (!ids.includes(required)) {
      context.addIssue({ code: 'custom', path: ['frames'], message: `视觉证据缺少 ${required} 状态。` });
    }
  }
});

export const visualReviewFindingSchema = z.object({
  code: z.enum(['runtime-not-ready', 'canvas-missing', 'canvas-occluded', 'browser-error', 'horizontal-overflow', 'text-collision', 'scroll-range-missing', 'timeline-static', 'mobile-content-missing', 'mobile-task-path-unverified', 'mobile-task-path-incomplete', 'opening-heading-missing', 'heading-dominance-forbidden', 'semantic-interaction-unverified', 'semantic-state-inconsistent', 'semantic-scene-static', 'interaction-driver-unverified', 'interaction-driver-static', 'interaction-driver-handoff-failed', 'primary-journey-unverified', 'subject-state-unverified', 'subject-state-static', 'fallback-not-exercised', 'fallback-content-missing', 'semantic-state-missing']),
  severity: z.enum(['blocking', 'major', 'minor']),
  frameId: visualFrameIdSchema.nullable(),
  message: z.string().min(4).max(400)
}).strict();

export const visualReviewObservationSchema = z.object({
  code: z.literal('editorial-overlap'),
  frameId: visualFrameIdSchema,
  message: z.string().min(4).max(400)
}).strict();

export const visualReviewAssessmentSchema = z.object({
  schemaVersion: z.literal(1),
  verdict: z.enum(['pass', 'revise', 'blocked']),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(4).max(500),
  findings: z.array(visualReviewFindingSchema).max(30),
  observations: z.array(visualReviewObservationSchema).max(30).default([])
}).strict();

export type VisualReviewEvidence = z.infer<typeof visualReviewEvidenceSchema>;
export type VisualReviewAssessment = z.infer<typeof visualReviewAssessmentSchema>;

export const visualQualityPreflightSchema = z.object({
  schemaVersion: z.literal(1),
  decision: z.enum(['eligible', 'stop']),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(4).max(500),
  blockingCodes: z.array(visualReviewFindingSchema.shape.code).max(30)
}).strict();

export type VisualQualityPreflight = z.infer<typeof visualQualityPreflightSchema>;

export function assessVisualQualityPreflight(input: VisualReviewAssessment): VisualQualityPreflight {
  const assessment = visualReviewAssessmentSchema.parse(input);
  const blockingCodes = assessment.findings
    .filter((finding) => finding.severity === 'blocking' || finding.severity === 'major')
    .map((finding) => finding.code);
  const eligible = assessment.verdict === 'pass' && blockingCodes.length === 0;
  return visualQualityPreflightSchema.parse({
    schemaVersion: 1,
    decision: eligible ? 'eligible' : 'stop',
    score: assessment.score,
    summary: eligible
      ? `快速结构预检通过（${assessment.score} 分）；允许进入一次独立视觉判断，但不代表最终质量通过。`
      : `快速结构预检停止（${assessment.score} 分）：${assessment.summary} 不调用视觉精修模型。`,
    blockingCodes
  });
}

export function assessVisualEvidence(input: VisualReviewEvidence, requestedPlan?: VisualReviewPlan | null): VisualReviewAssessment {
  const evidence = visualReviewEvidenceSchema.parse(input);
  const findings: z.infer<typeof visualReviewFindingSchema>[] = [];
  let score = 100;
  const observations: z.infer<typeof visualReviewObservationSchema>[] = [];
  const rendererRoute = requestedPlan?.rendererRoute;
  const canvasRequired = rendererRoute === undefined || rendererRoute === 'dom-canvas-hybrid' || rendererRoute === 'dom-three-hybrid';

  if (requestedPlan) {
    const observedIds = new Set(evidence.frames.map((frame) => frame.id));
    for (const checkpoint of requestedPlan.checkpoints) {
      if (observedIds.has(checkpoint.id)) continue;
      findings.push({
        code: 'semantic-state-missing',
        severity: 'major',
        frameId: null,
        message: `产品状态“${checkpoint.label}”缺少浏览器证据，不能把部分截图视为完整体验。`
      });
      score -= 18;
    }
  }

  for (const frame of evidence.frames) {
    const checkpoint = requestedPlan?.checkpoints.find((item) => item.id === frame.id);
    if (!frame.ready) {
      findings.push({ code: 'runtime-not-ready', severity: 'blocking', frameId: frame.id, message: `${frame.id} 没有进入 generated-ready 状态。` });
      score -= 45;
    }
    if (canvasRequired && frame.id !== 'fallback' && frame.canvasCount < 1) {
      findings.push({ code: 'canvas-missing', severity: 'blocking', frameId: frame.id, message: `${frame.id} 没有可运行的增强画布。` });
      score -= 35;
    }
    if (canvasRequired && frame.id !== 'fallback' && frame.canvasCount > 0 && frame.canvasOcclusionRisk) {
      findings.push({
        code: 'canvas-occluded',
        severity: 'blocking',
        frameId: frame.id,
        message: `${frame.id} 的增强画布被上层不透明内容覆盖约 ${Math.round((frame.canvasOcclusionRatio ?? 0) * 100)}%（${frame.canvasOccludingLayer || '未知层'}）；画布存在不等于用户能够看到主体。`
      });
      score -= 40;
    }
    if (frame.overflow > 1) {
      findings.push({ code: 'horizontal-overflow', severity: 'major', frameId: frame.id, message: `${frame.id} 存在 ${frame.overflow}px 横向溢出。` });
      score -= 12;
    }
    if (frame.blockingCollisionCount > 0 && frame.maxBlockingOverlapRatio >= 0.12) {
      findings.push({ code: 'text-collision', severity: frame.maxBlockingOverlapRatio >= 0.3 ? 'major' : 'minor', frameId: frame.id, message: `${frame.id} 检测到 ${frame.blockingCollisionCount} 组会阻碍阅读或交互的文字碰撞，最大重叠比例 ${frame.maxBlockingOverlapRatio.toFixed(2)}。` });
      score -= frame.maxBlockingOverlapRatio >= 0.3 ? 14 : 6;
    }
    if (frame.editorialOverlapCount > 0) {
      observations.push({ code: 'editorial-overlap', frameId: frame.id, message: `${frame.id} 检测到 ${frame.editorialOverlapCount} 组标题式创意叠层；机械门禁不扣分，需结合截图判断阅读顺序与构图意图。` });
    }
    if (frame.id === 'opening' && !frame.headingVisible) {
      findings.push({ code: 'opening-heading-missing', severity: 'major', frameId: frame.id, message: '桌面首屏主标题不在可见视口内；不能把 DOM 中存在但被画布或文档流推离首屏的标题视为有效内容。' });
      score -= 24;
    }
    if (requestedPlan?.visualConstraints.forbidGiantHeading && frame.headingVisible) {
      const fontLimit = frame.viewport.width <= 600 ? 64 : 96;
      const headingFontSizePx = frame.headingFontSizePx ?? 0;
      const headingViewportHeightRatio = frame.headingViewportHeightRatio ?? 0;
      const headingViewportAreaRatio = frame.headingViewportAreaRatio ?? 0;
      const dominant = headingViewportHeightRatio > .32
        || headingViewportAreaRatio > .20
        || headingFontSizePx > fontLimit;
      if (dominant) {
        findings.push({
          code: 'heading-dominance-forbidden',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 的可见标题占视口高度 ${(headingViewportHeightRatio * 100).toFixed(1)}%、面积 ${(headingViewportAreaRatio * 100).toFixed(1)}%，字号 ${headingFontSizePx.toFixed(1)}px；合同已明确禁止巨大标题。`
        });
        score -= 24;
      }
    }
    if (frame.id === 'mobile' && frame.visibleTextCount < 2) {
      findings.push({ code: 'mobile-content-missing', severity: 'major', frameId: frame.id, message: '移动端首屏缺少足够的可读语义内容。' });
      score -= 18;
    }
    if (checkpoint?.expectMobileTaskPath) {
      const task = frame.mobileTaskPath;
      if (!task || task.controlCount < 1 || task.resultCount < 1 || task.actionCount < 1) {
        findings.push({
          code: 'mobile-task-path-unverified',
          severity: 'major',
          frameId: frame.id,
          message: '移动端没有提供可验证的主要控件→结果→最终行动路径；请用 data-signal-primary-control/result/action 标记真实任务节点。'
        });
        score -= 22;
      } else if (task.reachableControlCount < 1 || task.reachableResultCount < 1 || task.reachableActionCount < 1) {
        findings.push({
          code: 'mobile-task-path-incomplete',
          severity: 'major',
          frameId: frame.id,
          message: '移动端虽然存在核心任务节点，但至少一类节点被横向裁切、隐藏或无法沿纵向到达，不能完成与桌面等价的任务。'
        });
        score -= 24;
      }
    }
    if (checkpoint?.expectSubjectChange && !checkpoint.causalProbe) {
      if (frame.subjectCaptureAvailable !== true
        || frame.subjectChanged == null
        || frame.subjectSelector !== '[data-signal-visual-anchor]') {
        findings.push({
          code: 'subject-state-unverified',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 要求主体发生可见变化，但没有从显式 data-signal-visual-anchor 取得独立于文案层的主体证据；普通图片、画布或场景容器不能自动代替主体边界。`
        });
        score -= 18;
      } else if (!frame.subjectChanged || (frame.subjectDelta ?? 0) < (requestedPlan?.minimumSubjectDelta ?? .018)) {
        findings.push({
          code: 'subject-state-static',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 的主体层与上一关键状态差异仅 ${((frame.subjectDelta ?? 0) * 100).toFixed(1)}%，低于合同要求的 ${((requestedPlan?.minimumSubjectDelta ?? .018) * 100).toFixed(1)}%；文字、标注或按钮变化不能替代装配、拆解或结构形变。`
        });
        score -= 24;
      }
    }
    if (checkpoint?.causalProbe) {
      const causalFailure = primaryJourneyFailure(
        frame,
        checkpoint.causalProbe,
        requestedPlan?.minimumCausalAnchorDelta ?? .018,
      );
      if (causalFailure) {
        findings.push({
          code: 'primary-journey-unverified',
          severity: 'major',
          frameId: frame.id,
          message: causalFailure
        });
        score -= 28;
      }
    }
    const primaryJourneyOwnsInteractionEvidence = Boolean(checkpoint?.causalProbe || checkpoint?.expectMobileTaskPath);
    if (!primaryJourneyOwnsInteractionEvidence && frame.action === 'semantic-probe' && (frame.interactionTargetCount ?? 0) < 1) {
      findings.push({ code: 'semantic-interaction-unverified', severity: 'major', frameId: frame.id, message: `${frame.id} 的合同要求语义交互，但没有可见、可聚焦的 DOM 交互入口。` });
      score -= 18;
    } else if (!primaryJourneyOwnsInteractionEvidence && frame.action === 'semantic-probe'
      && frame.interactionInputObserved !== true
      && frame.semanticState?.parameterActionObserved !== true
      && frame.semanticState?.highLevelActionObserved !== true) {
      findings.push({ code: 'semantic-interaction-unverified', severity: 'major', frameId: frame.id, message: `${frame.id} 没有观察到指针或键盘输入进入生成运行时。` });
      score -= 14;
    }
    if (!primaryJourneyOwnsInteractionEvidence && frame.action === 'semantic-probe' && frame.semanticState) {
      if (!frame.semanticState.inputChanged) {
        findings.push({ code: 'semantic-interaction-unverified', severity: 'major', frameId: frame.id, message: `${frame.id} 虽然存在控件，但自动操作后控件值没有发生变化。` });
        score -= 16;
      }
      if (!frame.semanticState.outputChanged) {
        findings.push({ code: 'semantic-state-inconsistent', severity: 'major', frameId: frame.id, message: `${frame.id} 的控件改变后，可见数值、结果解释或状态反馈没有同步变化。` });
        score -= 18;
      }
      if (frame.semanticState.mismatchedValueCount > 0 || frame.semanticState.aggregateInvariantValid === false) {
        findings.push({
          code: 'semantic-state-inconsistent',
          severity: 'major',
          frameId: frame.id,
          message: frame.semanticState.issues.join('；') || `${frame.id} 的控件值、显示值或汇总约束互相矛盾。`
        });
        score -= 22;
      }
      if (checkpoint?.expectSceneChange && frame.semanticState.parameterActionObserved && frame.semanticState.sceneChanged !== true) {
        findings.push({
          code: 'semantic-scene-static',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 的参数控件改变了 DOM 状态，但 Canvas/场景没有形成足够可辨认的视觉变化。`
        });
        score -= 22;
      }
      if (checkpoint?.expectSceneChange && frame.semanticState.highLevelActionObserved && frame.semanticState.highLevelSceneChanged !== true) {
        findings.push({
          code: 'semantic-scene-static',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 的模式、Cue 或预设按钮只改变了控件/说明，Canvas/场景没有同步改变。`
        });
        score -= 26;
      }
    }
    if (frame.action === 'driver-probe') {
      const driver = frame.driverState;
      if (!driver || !driver.rootFound || !driver.demoControlFound || !driver.progressMarkerFound) {
        findings.push({
          code: 'interaction-driver-unverified',
          severity: 'major',
          frameId: frame.id,
          message: `${frame.id} 缺少共享状态根节点、演示按钮或进度标记，无法验证多源驱动。`
        });
        score -= 24;
      } else {
        if (!driver.demoProgressChanged || !driver.wheelProgressChanged) {
          findings.push({
            code: 'interaction-driver-static',
            severity: 'major',
            frameId: frame.id,
            message: `${frame.id} 的播放或滚轮没有改变同一个可观测进度。`
          });
          score -= 22;
        }
        if (!driver.manualControlFound || !driver.manualOverrideObserved) {
          findings.push({
            code: 'interaction-driver-handoff-failed',
            severity: 'major',
            frameId: frame.id,
            message: `${frame.id} 的第一次人工输入没有停止自动演示并稳定接管状态。`
          });
          score -= 24;
        }
        if (checkpoint?.expectSceneChange
          && (driver.demoSceneChanged !== true || driver.wheelSceneChanged !== true || driver.manualSceneChanged !== true)) {
          findings.push({
            code: 'interaction-driver-static',
            severity: 'major',
            frameId: frame.id,
            message: `${frame.id} 虽然进度发生变化，但演示、滚轮或人工控件至少一项没有同步改变 Canvas/场景。`
          });
          score -= 24;
        }
      }
    }
    if (frame.id === 'fallback' && (frame.webglAvailable !== false || frame.fallbackActive !== true)) {
      findings.push({ code: 'fallback-not-exercised', severity: 'blocking', frameId: frame.id, message: '回退检查点没有真正关闭 WebGL，不能把普通页面截图当作降级证据。' });
      score -= 35;
    }
    if (frame.id === 'fallback' && frame.visibleTextCount < 2) {
      findings.push({ code: 'fallback-content-missing', severity: 'major', frameId: frame.id, message: '关闭 WebGL 后没有保留足够的可读语义内容。' });
      score -= 22;
    }
  }

  if (evidence.browserErrors.length) {
    findings.push({ code: 'browser-error', severity: 'blocking', frameId: null, message: `浏览器记录了 ${evidence.browserErrors.length} 个运行错误。` });
    score -= 40;
  }

  if (!requestedPlan || requestedPlan.journeyMode === 'scroll-timeline') {
    const opening = evidence.frames.find((frame) => frame.id === 'opening');
    const final = evidence.frames.find((frame) => frame.id === 'final');
    if (opening && opening.scrollHeight - opening.viewport.height < opening.viewport.height * .8) {
      findings.push({
        code: 'scroll-range-missing',
        severity: 'major',
        frameId: null,
        message: `桌面只有 ${Math.max(0, opening.scrollHeight - opening.viewport.height)}px 有效滚动行程；至少需要约 ${Math.round(opening.viewport.height * .8)}px 才能让状态变化具有可用体感。保留固定 canvas，但不要锁死纵向文档流。`
      });
      score -= 20;
    }
    if (!opening || !final || final.progress - opening.progress < 0.7 || final.scrollY <= opening.scrollY) {
      findings.push({ code: 'timeline-static', severity: 'major', frameId: null, message: '滚动没有形成足够清晰的时间线变化。' });
      score -= 20;
    }
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = findings.some((item) => item.severity === 'blocking') ? 'blocked' : findings.some((item) => item.severity === 'major' || item.severity === 'minor') ? 'revise' : 'pass';
  const summary = verdict === 'pass'
    ? observations.length
      ? '结构质量门通过；检测到创意叠层，需由截图视觉判断确认阅读顺序与构图意图。'
      : '结构质量门通过；仍需结合截图判断构图、材质、层级与创意完成度。'
    : verdict === 'blocked'
      ? '运行或增强层存在阻断问题，不能直接采用当前版本。'
      : '页面可运行，但存在需要视觉修订的跨状态问题。';
  return visualReviewAssessmentSchema.parse({ schemaVersion: 1, verdict, score: boundedScore, summary, findings, observations });
}

function primaryJourneyFailure(
  frame: VisualReviewEvidence['frames'][number],
  expectedInput: 'wheel' | 'control',
  minimumAnchorDelta: number,
): string | null {
  const state = frame.causalState;
  if (!state) return `${frame.id} 缺少一次真实输入前后的主因果链证据；已停止，不自动重试或精修。`;
  const missing = [
    state.markers.anchorCount !== 1 ? 'visual-anchor' : null,
    expectedInput === 'control' && state.markers.controlCount < 1 ? 'primary-control' : null,
    state.markers.resultCount < 1 ? 'primary-result' : null,
    state.markers.actionCount < 1 ? 'primary-action' : null
  ].filter((item): item is string => Boolean(item));
  if (missing.length) return `${frame.id} 缺少或无法唯一定位 ${missing.join('、')} 标记；不能验证输入→主体→结果→行动。`;
  if (state.input !== expectedInput || !state.inputObserved) {
    return `${frame.id} 没有观察到合同要求的真实${expectedInput === 'wheel' ? '滚轮' : '控件'}输入；不会用程序化跳转冒充用户操作。`;
  }
  if (!state.anchorIdentityStable) return `${frame.id} 操作前后未保持同一个 visual-anchor DOM 身份，无法证明是同一主体持续变化。`;
  if (state.substitute !== 'none' && state.substitute !== 'copy-or-highlight-only') {
    const label = ({
      'opacity-or-blur-only': '透明度或模糊',
      'whole-scale-only': '整体缩放',
      'framing-only': '裁切或取景跳变',
      'continuity-unverified': '无法归因的连续性跳变'
    } as const)[state.substitute];
    return `${frame.id} 的可见差异主要来自${label}，不能替代同一主体的真实状态变化。`;
  }
  if (state.anchorChanged !== true || state.anchorDelta < minimumAnchorDelta) {
    return state.substitute === 'copy-or-highlight-only'
      ? `${frame.id} 只改变了文案、数值或高亮，主体视觉锚点没有发生可辨认变化。`
      : `${frame.id} 的主体视觉锚点差异仅 ${(state.anchorDelta * 100).toFixed(1)}%，低于合同要求的 ${(minimumAnchorDelta * 100).toFixed(1)}%，不足以证明操作产生了可见效果。`;
  }
  if (!state.resultChanged) return `${frame.id} 的主体已变化，但 primary-result 没有同步更新业务结果。`;
  if (!state.actionAvailable) return `${frame.id} 的最终行动在操作后缺失、禁用或被横向裁切。`;
  return null;
}
