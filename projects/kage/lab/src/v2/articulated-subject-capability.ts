import { z } from 'zod';
import type { ExperiencePattern } from './reference-intelligence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const articulatedSubjectCapabilitySchema = z.object({
  id: safeId,
  title: z.string().min(3),
  evidenceLevel: z.literal('runtime-verified'),
  sourceReferenceId: safeId,
  applicablePatterns: z.array(z.enum([
    'continuous-scroll',
    'product-atmosphere',
    'material-transformation',
    'editorial-field'
  ])).min(1),
  subjectSignals: z.array(z.string().min(1)).min(3),
  transformationSignals: z.array(z.string().min(1)).min(3),
  partSignals: z.array(z.string().min(1)).min(3),
  blockerSignals: z.array(z.string().min(1)).min(3),
  authoringContract: z.object({
    subjectMode: z.literal('procedural-articulated'),
    minimumPartGroups: z.number().int().min(2),
    maximumPartGroups: z.number().int().max(16),
    timeline: z.literal('global-progress-to-staggered-local-progress'),
    synchronization: z.array(z.enum(['parts', 'camera', 'material', 'lighting', 'post'])).min(4),
    rendererRoute: z.literal('dom-three-hybrid'),
    pointerRole: z.literal('secondary-observation'),
    reducedMotion: z.literal('stable-semantic-states'),
    fallback: z.literal('semantic-dom-with-final-subject-silhouette'),
    maximumPixelRatio: z.number().min(1).max(2),
    bloomOptional: z.boolean()
  }).strict()
}).strict();

export type ArticulatedSubjectCapability = z.infer<typeof articulatedSubjectCapabilitySchema>;

export const articulatedSubjectDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string().min(3)).min(1),
  blockers: z.array(z.string().min(3)),
  contract: articulatedSubjectCapabilitySchema.nullable()
}).strict();

export type ArticulatedSubjectDecision = z.infer<typeof articulatedSubjectDecisionSchema>;

export const articulatedSubjectCapability: ArticulatedSubjectCapability = articulatedSubjectCapabilitySchema.parse({
  id: 'procedural-articulated-subject',
  title: '程序化关节主体',
  evidenceLevel: 'runtime-verified',
  sourceReferenceId: 'threejs-iris-articulated-reveal',
  applicablePatterns: ['continuous-scroll', 'product-atmosphere', 'material-transformation', 'editorial-field'],
  subjectSignals: ['抽象', '装置', '机械', '生物结构', '构造体', '核心', '雕塑'],
  transformationSignals: ['展开', '绽放', '组装', '解构', '形成', '张开', '校准', '折叠'],
  partSignals: ['部件', '关节', '翼', '叶片', '环', '层', '骨架', '片'],
  blockerSignals: ['真实 glb', '真实产品', '精确还原', '商品型号', '人物', '建筑空间', '室内漫游'],
  authoringContract: {
    subjectMode: 'procedural-articulated',
    minimumPartGroups: 3,
    maximumPartGroups: 12,
    timeline: 'global-progress-to-staggered-local-progress',
    synchronization: ['parts', 'camera', 'material', 'lighting', 'post'],
    rendererRoute: 'dom-three-hybrid',
    pointerRole: 'secondary-observation',
    reducedMotion: 'stable-semantic-states',
    fallback: 'semantic-dom-with-final-subject-silhouette',
    maximumPixelRatio: 1.5,
    bloomOptional: true
  }
});

export function selectArticulatedSubjectCapability(input: {
  brief: string;
  pattern: ExperiencePattern;
}): ArticulatedSubjectDecision {
  const normalized = input.brief.toLowerCase();
  const subjects = articulatedSubjectCapability.subjectSignals.filter((signal) => normalized.includes(signal));
  const transformations = articulatedSubjectCapability.transformationSignals.filter((signal) => normalized.includes(signal));
  const parts = articulatedSubjectCapability.partSignals.filter((signal) => normalized.includes(signal));
  const blockers = articulatedSubjectCapability.blockerSignals.filter((signal) => normalized.includes(signal));
  const patternMatch = articulatedSubjectCapability.applicablePatterns.includes(input.pattern as ArticulatedSubjectCapability['applicablePatterns'][number]);
  const score = Math.min(100, Math.max(0,
    (subjects.length ? 32 : 0)
      + (transformations.length ? 28 : 0)
      + (parts.length ? 24 : 0)
      + (patternMatch ? 12 : 0)
      - (blockers.length ? 70 : 0)
  ));
  const blockingReasons = blockers.map((signal) => `目标包含“${signal}”，需要可信资产路线，不能用程序化主体冒充。`);
  const selected = score >= 75 && blockingReasons.length === 0;
  return articulatedSubjectDecisionSchema.parse({
    selected,
    capabilityId: selected ? articulatedSubjectCapability.id : null,
    score,
    reasons: [
      subjects.length ? `主体命中 ${subjects.join('、')}。` : '主体没有明确的抽象或程序化构造语义。',
      transformations.length ? `变化命中 ${transformations.join('、')}。` : '没有需要部件承担的结构变化。',
      parts.length ? `部件命中 ${parts.join('、')}。` : '没有可建立拓扑关系的部件描述。',
      patternMatch ? `体验模式 ${input.pattern} 支持单一主体连续变化。` : `体验模式 ${input.pattern} 不优先使用该能力。`
    ],
    blockers: blockingReasons,
    contract: selected ? articulatedSubjectCapability : null
  });
}
