import { z } from 'zod';
import type { DirectCreativeAuthorPackage } from './direct-creative-author-package.ts';
import { positiveReferenceLibrary } from './reference-intelligence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const creativeQualityDimensionIdSchema = z.enum([
  'emotional-arrival',
  'theme-specific-identity',
  'memorable-phenomenon',
  'visual-coherence',
  'media-responsibility',
  'meaningful-causality',
  'product-completion'
]);

export type CreativeQualityDimensionId = z.infer<typeof creativeQualityDimensionIdSchema>;

export const creativeQualityDimensionSchema = z.object({
  id: creativeQualityDimensionIdSchema,
  question: z.string().trim().min(8).max(240),
  positiveEvidence: z.string().trim().min(8).max(320),
  weakSignal: z.string().trim().min(8).max(320),
  authority: z.literal('advisory')
}).strict();

export type CreativeQualityDimension = z.infer<typeof creativeQualityDimensionSchema>;

/**
 * A compact taste canon, expressed as questions and observable evidence rather
 * than style prescriptions. It helps an author judge a direction without
 * turning previous examples into templates or global bans.
 */
export const CREATIVE_QUALITY_CANON: readonly CreativeQualityDimension[] = [
  {
    id: 'emotional-arrival',
    question: '用户进入前五秒，是否已经感受到 brief 要求的情绪，而不是只看到一种技术风格？',
    positiveEvidence: '开场的尺度、光线、节奏、声音或留白共同建立明确感受，并为后续体验留下期待。',
    weakSignal: '只有渐变、网格、粒子、泛化背景或说明文字，用户无法从画面感知目标情绪。',
    authority: 'advisory'
  },
  {
    id: 'theme-specific-identity',
    question: '核心画面、对象和动作是否只属于当前主题，换成另一产品后还会成立吗？',
    positiveEvidence: '主体身份、素材细节、信息关系和主要行动都指向当前产品，不依赖标题解释主题。',
    weakSignal: '替换标题后页面仍然成立，主体只是通用球体、卡片、工作台或抽象科技装饰。',
    authority: 'advisory'
  },
  {
    id: 'memorable-phenomenon',
    question: '用户离开页面后，能否复述一个与产品价值直接相关的画面、变化或操作？',
    positiveEvidence: '存在一个清楚、可描述、不可与主题分离的核心时刻，并且它推动用户继续体验。',
    weakSignal: '效果数量很多但没有主次，或记忆点只来自技术炫技而不是产品含义。',
    authority: 'advisory'
  },
  {
    id: 'visual-coherence',
    question: '构图、排版、色彩、材质、运动和声音是否像同一个世界，而不是后期拼接？',
    positiveEvidence: '素材共享可信的尺度、光向、色彩和空间关系，文字服从主体安全区并参与整体节奏。',
    weakSignal: '主图像贴图，文字遮挡主体，不同段落使用互不相关的素材或特效语言。',
    authority: 'advisory'
  },
  {
    id: 'media-responsibility',
    question: '图片、视频、3D、声音、WebGL 或排版分别承担了什么不可替代的体验职责？',
    positiveEvidence: '主媒介建立身份或情绪，辅助媒介只强化同一主张；去掉任一手段都能说明损失了什么。',
    weakSignal: '因为技术可用而堆叠媒介，关键产品素材反而被低质量程序化图形替代。',
    authority: 'advisory'
  },
  {
    id: 'meaningful-causality',
    question: '如果存在互动，用户输入是否清楚改变主体、理解、状态或结果？',
    positiveEvidence: '滚动、指针、声音或直接操作与一个可观察状态绑定，反馈同时影响画面和产品含义。',
    weakSignal: '互动只改变高亮、数字、视差或装饰粒子，操作前后对产品的理解没有变化。',
    authority: 'advisory'
  },
  {
    id: 'product-completion',
    question: '页面是否完成进入、理解或使用、得到结果和继续行动，而不是停留在漂亮首屏？',
    positiveEvidence: '用户能理解产品身份与价值，完成主要行为，看见结果，并知道下一步能做什么。',
    weakSignal: '体验只有一个视觉镜头、机制演示或概念说明，没有结果、行动和后续路径。',
    authority: 'advisory'
  }
].map((dimension) => creativeQualityDimensionSchema.parse(dimension));

export const referenceTasteLessonSchema = z.object({
  referenceId: safeId,
  title: z.string().trim().min(2).max(200),
  evidenceLevel: z.enum(['runtime-verified', 'source-and-runtime-verified']),
  whyItWorks: z.array(z.string().trim().min(8).max(500)).min(1).max(2),
  borrowForThisBrief: z.array(z.string().trim().min(8).max(500)).min(1).max(2),
  relevanceReason: z.string().trim().min(8).max(500),
  confidence: z.number().min(0).max(1),
  advisoryRisk: z.string().trim().min(8).max(500).nullable()
}).strict();

export const creativeDirectorGuidanceSchema = z.object({
  schemaVersion: z.literal(1),
  purpose: z.literal('teach-what-good-means-for-this-brief'),
  authority: z.object({
    hardBoundaries: z.literal('user-truth-runtime-evidence-and-budget-only'),
    tasteGuidance: z.literal('positive-advisory-and-discardable'),
    referencePolicy: z.literal('borrow-principles-never-copy-pages'),
    unlistedMethods: z.literal('allowed-when-they-better-serve-the-experience')
  }).strict(),
  northStar: z.object({
    subject: z.string().trim().min(2).max(200),
    audience: z.string().trim().min(2).max(300),
    feeling: z.string().trim().min(2).max(300),
    transformation: z.string().trim().min(4).max(500),
    action: z.string().trim().min(2).max(220)
  }).strict(),
  referenceLessons: z.array(referenceTasteLessonSchema).max(3),
  noReferenceFallback: z.literal('do-not-force-a-case-when-relevance-is-weak'),
  qualityCanon: z.array(creativeQualityDimensionSchema).length(7),
  directionDecision: z.object({
    mode: z.literal('qualitative-evidence-before-relative-score'),
    instruction: z.string().trim().min(12).max(700),
    techniquePolicy: z.literal('technique-count-and-prestige-do-not-score'),
    selectionEvidence: z.tuple([
      z.literal('felt-experience-fit'),
      z.literal('theme-specific-visible-proof'),
      z.literal('product-action-connection')
    ])
  }).strict(),
  finalJudgment: z.object({
    evidenceBasis: z.literal('final-rendered-browser-experience-not-code-intent'),
    passRule: z.string().trim().min(12).max(700),
    maximumVisualRefinements: z.literal(1),
    feedbackScope: z.literal('run-and-reference-memory-never-global-style-ban')
  }).strict()
}).strict();

export type CreativeDirectorGuidance = z.infer<typeof creativeDirectorGuidanceSchema>;

export function createCreativeDirectorGuidance(
  authorPackage: DirectCreativeAuthorPackage
): CreativeDirectorGuidance {
  const input = authorPackage.authoringInput;
  const references = input.references.flatMap((selected) => {
    const evidence = positiveReferenceLibrary.find((candidate) => candidate.id === selected.id);
    if (!evidence) return [];
    return [{
      referenceId: evidence.id,
      title: evidence.title,
      evidenceLevel: evidence.source.evidenceLevel,
      whyItWorks: evidence.observedMechanism.slice(0, 2),
      borrowForThisBrief: selected.positiveBorrowPrinciples.slice(0, 2),
      relevanceReason: selected.relevanceReason,
      confidence: selected.confidence,
      advisoryRisk: evidence.advisoryRisks[0] ?? null
    }];
  });

  return creativeDirectorGuidanceSchema.parse({
    schemaVersion: 1,
    purpose: 'teach-what-good-means-for-this-brief',
    authority: {
      hardBoundaries: 'user-truth-runtime-evidence-and-budget-only',
      tasteGuidance: 'positive-advisory-and-discardable',
      referencePolicy: 'borrow-principles-never-copy-pages',
      unlistedMethods: 'allowed-when-they-better-serve-the-experience'
    },
    northStar: {
      subject: input.goal.subject,
      audience: input.goal.audience,
      feeling: input.goal.feeling,
      transformation: input.goal.change,
      action: input.goal.action
    },
    referenceLessons: references,
    noReferenceFallback: 'do-not-force-a-case-when-relevance-is-weak',
    qualityCanon: CREATIVE_QUALITY_CANON,
    directionDecision: {
      mode: 'qualitative-evidence-before-relative-score',
      instruction: '先说明每个候选会让用户感到什么、看见什么主题专属证据、如何连接产品行动；相对分数只能在这些可见理由成立后用于排序，不能用技术数量替代审美判断。',
      techniquePolicy: 'technique-count-and-prestige-do-not-score',
      selectionEvidence: [
        'felt-experience-fit',
        'theme-specific-visible-proof',
        'product-action-connection'
      ]
    },
    finalJudgment: {
      evidenceBasis: 'final-rendered-browser-experience-not-code-intent',
      passRule: '硬质量门全部通过后，只有目标情绪可感知、主题身份可辨认、核心记忆点兑现、媒介形成统一语言且产品行动自然收束，才可作为优秀候选；否则最多进行一次针对明确视觉缺口的精修。',
      maximumVisualRefinements: 1,
      feedbackScope: 'run-and-reference-memory-never-global-style-ban'
    }
  });
}

/**
 * Keeps the direct Codex prompt small. The complete canon remains available to
 * project tools, while the author receives the selected case reason and seven
 * short review questions instead of a duplicate copy of every explanation.
 */
export function serializeCompactCreativeDirectorGuidance(
  input: CreativeDirectorGuidance
): string {
  const guidance = creativeDirectorGuidanceSchema.parse(input);
  return JSON.stringify({
    why: guidance.referenceLessons.map((reference) => [
      reference.referenceId,
      reference.whyItWorks[0]
    ]),
    judge: '五秒情绪/主题专属/核心记忆点/视觉统一/媒介职责/互动因果/完整产品',
    choose: '感受+可见证据+产品行动；技术数量与技术声望不计分'
  });
}

export const creativeOutcomeFeedbackSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string().trim().min(4).max(200),
  bundleHash: z.string().regex(/^[a-f0-9]{64}$/),
  verdict: z.enum(['accept', 'hold', 'reject']),
  observation: z.string().trim().min(8).max(900),
  strengths: z.array(z.string().trim().min(4).max(400)).max(5),
  gaps: z.array(z.string().trim().min(4).max(400)).max(5),
  reusableLearning: z.array(z.string().trim().min(8).max(500)).max(4),
  learningScope: z.literal('current-run-and-reference-memory-only'),
  globalStyleRuleCreated: z.literal(false)
}).strict();

export type CreativeOutcomeFeedback = z.infer<typeof creativeOutcomeFeedbackSchema>;

export function createCreativeOutcomeFeedback(
  input: Omit<CreativeOutcomeFeedback, 'schemaVersion' | 'learningScope' | 'globalStyleRuleCreated'>
): CreativeOutcomeFeedback {
  return creativeOutcomeFeedbackSchema.parse({
    schemaVersion: 1,
    ...input,
    learningScope: 'current-run-and-reference-memory-only',
    globalStyleRuleCreated: false
  });
}
