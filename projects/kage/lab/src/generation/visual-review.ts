import { z } from 'zod';

export const visualFrameIdSchema = z.enum(['opening', 'middle', 'final', 'mobile']);

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
  visibleTextCount: z.number().int().nonnegative(),
  collisionCount: z.number().int().nonnegative(),
  maxOverlapRatio: z.number().min(0).max(1),
  blockingCollisionCount: z.number().int().nonnegative().default(0),
  editorialOverlapCount: z.number().int().nonnegative().default(0),
  maxBlockingOverlapRatio: z.number().min(0).max(1).default(0)
}).strict();

export const visualReviewEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  capturedAt: z.string(),
  frames: z.array(visualFrameEvidenceSchema).length(4),
  browserErrors: z.array(z.string().max(600)).max(30)
}).strict();

export const visualReviewFindingSchema = z.object({
  code: z.enum(['runtime-not-ready', 'canvas-missing', 'browser-error', 'horizontal-overflow', 'text-collision', 'scroll-range-missing', 'timeline-static', 'mobile-content-missing', 'opening-heading-missing']),
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

export function assessVisualEvidence(input: VisualReviewEvidence): VisualReviewAssessment {
  const evidence = visualReviewEvidenceSchema.parse(input);
  const findings: z.infer<typeof visualReviewFindingSchema>[] = [];
  let score = 100;
  const observations: z.infer<typeof visualReviewObservationSchema>[] = [];

  for (const frame of evidence.frames) {
    if (!frame.ready) {
      findings.push({ code: 'runtime-not-ready', severity: 'blocking', frameId: frame.id, message: `${frame.id} 没有进入 generated-ready 状态。` });
      score -= 45;
    }
    if (frame.canvasCount < 1) {
      findings.push({ code: 'canvas-missing', severity: 'blocking', frameId: frame.id, message: `${frame.id} 没有可运行的增强画布。` });
      score -= 35;
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
    if (frame.id === 'mobile' && frame.visibleTextCount < 2) {
      findings.push({ code: 'mobile-content-missing', severity: 'major', frameId: frame.id, message: '移动端首屏缺少足够的可读语义内容。' });
      score -= 18;
    }
  }

  if (evidence.browserErrors.length) {
    findings.push({ code: 'browser-error', severity: 'blocking', frameId: null, message: `浏览器记录了 ${evidence.browserErrors.length} 个运行错误。` });
    score -= 40;
  }

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
