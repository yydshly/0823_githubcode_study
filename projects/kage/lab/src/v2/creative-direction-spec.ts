import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';
import type { CreativeMediumDecision } from './creative-medium-decision.ts';
import type { ReferenceEvidencePack } from './reference-intelligence.ts';
import type {
  VisualAmbitionContract,
  VisualRenderingMedium
} from './visual-ambition.ts';
import {
  deriveEffectFirstExpressionDirective,
  effectFirstExpressionDirectiveSchema
} from './effect-first-expression.ts';
import {
  deriveEffectResourceOrchestration,
  effectResourceOrchestrationSchema
} from './effect-resource-orchestration.ts';
import {
  deriveEffectQualitySelectionGate,
  effectQualitySelectionGateSchema
} from './effect-quality-selection.ts';
import {
  CREATIVE_FREEDOM_POLICY,
  creativeFreedomPolicySchema
} from './creative-freedom-policy.ts';

export const knownCreativeDirectionMediumSchema = z.enum([
  'generated-image',
  'grounded-real-media',
  'threejs-3d',
  'procedural-webgl',
  'video',
  'sound',
  'motion',
  'typography',
  'data-visualization'
]);

// The catalog is useful for planning, but the author may name and use a new
// medium or hybrid technique when it better serves the selected promise.
export const creativeDirectionMediumSchema = z.string().trim().min(2).max(120);

export type CreativeDirectionMedium = z.infer<typeof creativeDirectionMediumSchema>;

export const creativeDirectionSpecSchema = z.object({
  schemaVersion: z.literal(1),
  effectFirst: effectFirstExpressionDirectiveSchema,
  effectQualitySelection: effectQualitySelectionGateSchema,
  resourceOrchestration: effectResourceOrchestrationSchema,
  creativeFreedom: creativeFreedomPolicySchema,
  coreMetaphor: z.string().trim().min(4).max(500),
  desiredFirstImpression: z.string().trim().min(4).max(500),
  signatureMoment: z.object({
    title: z.string().trim().min(2).max(120),
    themeConnection: z.string().trim().min(8).max(500),
    visibleProof: z.string().trim().min(8).max(500)
  }).strict(),
  leadMedium: z.object({
    medium: creativeDirectionMediumSchema,
    responsibility: z.string().trim().min(8).max(600),
    rationale: z.string().trim().min(8).max(600),
    planningRole: z.literal('resource-anchor-not-creative-boundary')
  }).strict(),
  supportingMedia: z.array(z.object({
    medium: creativeDirectionMediumSchema,
    responsibility: z.string().trim().min(8).max(600),
    relationshipToLead: z.string().trim().min(8).max(500),
    planningRole: z.literal('optional-effect-support')
  }).strict()).max(3),
  referenceSynthesis: z.array(z.object({
    referenceId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    role: z.enum(['visual-language', 'interaction-mechanism', 'information-structure']),
    borrow: z.string().trim().min(8).max(600)
  }).strict()).max(3),
  qualityStrategy: z.object({
    exceptionalAxis: z.enum([
      'visual-craft',
      'concept-originality',
      'spatial-novelty',
      'multisensory-coherence',
      'interaction-meaning',
      'thematic-authenticity'
    ]),
    qualityFloor: z.tuple([
      z.literal('主题在五秒内可辨认'),
      z.literal('素材与页面形成统一视觉语言'),
      z.literal('运行时变化强化主题而非装饰'),
      z.literal('主要行动与体验自然收束')
    ]),
    cohesionRule: z.string().trim().min(8).max(600),
    failureSignals: z.array(z.string().trim().min(4).max(300)).min(2).max(6)
  }).strict(),
  sourcePolicy: z.literal('open-best-fit'),
  hardConstraints: z.array(z.string().trim().min(2).max(500)).max(12),
  noGlobalStyleRules: z.literal(true),
  selectionRule: z.literal('one-direction-lead-plus-purposeful-support')
}).strict().superRefine((spec, context) => {
  const media = spec.supportingMedia.map((item) => item.medium);
  if (media.includes(spec.leadMedium.medium)) {
    context.addIssue({
      code: 'custom',
      path: ['supportingMedia'],
      message: '辅助媒介不得重复主导媒介。'
    });
  }
  if (media.length !== new Set(media).size) {
    context.addIssue({
      code: 'custom',
      path: ['supportingMedia'],
      message: '辅助媒介不得重复。'
    });
  }
});

export type CreativeDirectionSpec = z.infer<typeof creativeDirectionSpecSchema>;

export function deriveCreativeDirectionSpec(input: {
  contract: V2CreativeContract;
  mediumDecision: CreativeMediumDecision;
  visualAmbition: VisualAmbitionContract;
  references: readonly ReferenceEvidencePack[];
}): CreativeDirectionSpec {
  const { contract, mediumDecision, visualAmbition, references } = input;
  const leadMedium = leadMediumFor(mediumDecision.preferred);
  const candidates: CreativeDirectionMedium[] = visualAmbition.rendering.supporting
    .map(supportingMediumFor);

  if (contract.technical.productSemanticFeedback.selected) candidates.unshift('sound');
  if (visualAmbition.motionArc.beats.some((beat) => beat.driver !== 'none')) candidates.push('motion');
  if (
    leadMedium === 'typography'
    && contract.visualAnchor.source !== 'procedural'
    && contract.technical.placeGrounding.strategy !== 'real-geography-evidence'
  ) {
    candidates.unshift('generated-image');
  }

  const supportingMedia = unique(candidates)
    .filter((medium) => medium !== leadMedium)
    .slice(0, 3)
    .map((medium) => ({
      medium,
      responsibility: supportingResponsibility(medium, contract, visualAmbition),
      relationshipToLead: `只强化“${visualAmbition.heroMoment.title}”的空间、感官或信息证据，不建立第二套视觉主题。`,
      planningRole: 'optional-effect-support' as const
    }));

  const exceptionalAxis = selectExceptionalAxis(leadMedium, supportingMedia.map((item) => item.medium));
  const hardConstraints = contract.instructions
    .filter((instruction) => (
      instruction.source === 'user'
      && instruction.scope === 'current-run'
      && instruction.strength === 'hard'
    ))
    .map((instruction) => instruction.content);

  return creativeDirectionSpecSchema.parse({
    schemaVersion: 1,
    effectFirst: deriveEffectFirstExpressionDirective(contract),
    effectQualitySelection: deriveEffectQualitySelectionGate(contract),
    resourceOrchestration: deriveEffectResourceOrchestration(contract),
    creativeFreedom: CREATIVE_FREEDOM_POLICY,
    coreMetaphor: `${contract.experience.thesis}；让“${contract.intent.subject}”本身成为页面的结构与记忆。`,
    desiredFirstImpression: `${contract.intent.desiredFeeling}，并在五秒内看见与主题不可互换的视觉锚点。`,
    signatureMoment: {
      title: visualAmbition.heroMoment.title,
      themeConnection: visualAmbition.heroMoment.themeConnection,
      visibleProof: visualAmbition.heroMoment.observableRuntimeChange
        ? `${visualAmbition.heroMoment.observableRuntimeChange.trigger}：从“${visualAmbition.heroMoment.observableRuntimeChange.from}”转变为“${visualAmbition.heroMoment.observableRuntimeChange.to}”。`
        : `首屏直接呈现“${contract.visualAnchor.subject}”，并让它承担主要价值与行动的视觉证据。`
    },
    leadMedium: {
      medium: leadMedium,
      responsibility: leadResponsibility(leadMedium, contract),
      rationale: mediumDecision.rationale,
      planningRole: 'resource-anchor-not-creative-boundary'
    },
    supportingMedia,
    referenceSynthesis: references.slice(0, 3).map((reference, index) => ({
      referenceId: reference.id,
      role: (['visual-language', 'interaction-mechanism', 'information-structure'] as const)[index],
      borrow: reference.positiveBorrowPrinciples[0]
    })),
    qualityStrategy: {
      exceptionalAxis,
      qualityFloor: [
        '主题在五秒内可辨认',
        '素材与页面形成统一视觉语言',
        '运行时变化强化主题而非装饰',
        '主要行动与体验自然收束'
      ],
      cohesionRule: `所有表达手段必须围绕“${contract.visualAnchor.subject}”与同一因果状态协作；没有明确体验职责的手段不得加入，但不得因为它尚未出现在项目能力目录中而排除。`,
      failureSignals: [
        '仅靠通用渐变、网格或随机粒子建立首屏',
        '素材像贴图而没有统一光线、尺度或空间关系',
        '互动只改变高亮、数字或文案而不改变主题理解',
        '页面结构明显复用工作台、三段长滚动或中央主体模板'
      ]
    },
    sourcePolicy: 'open-best-fit',
    hardConstraints,
    noGlobalStyleRules: true,
    selectionRule: 'one-direction-lead-plus-purposeful-support'
  });
}

function leadMediumFor(route: CreativeMediumDecision['preferred']): CreativeDirectionMedium {
  return ({
    'generated-image': 'generated-image',
    'grounded-real-media': 'grounded-real-media',
    'threejs-spatial': 'threejs-3d',
    'webgl-procedural': 'procedural-webgl',
    'code-native': 'typography'
  } as const)[route];
}

function supportingMediumFor(medium: VisualRenderingMedium): CreativeDirectionMedium {
  return ({
    'dom-css': 'typography',
    svg: 'motion',
    'canvas-2d': 'data-visualization',
    'raster-image': 'generated-image',
    'image-sequence': 'generated-image',
    video: 'video',
    'webgl-shader': 'procedural-webgl',
    'threejs-3d': 'threejs-3d'
  } as const)[medium];
}

function leadResponsibility(medium: CreativeDirectionMedium, contract: V2CreativeContract): string {
  const responsibilities: Record<string, string> = {
    'generated-image': `用高质量、主题专属的生成视觉建立“${contract.intent.subject}”的身份、材质和意境。`,
    'grounded-real-media': `用可追溯真实媒体建立“${contract.intent.subject}”的事实、地点或产品可信度。`,
    'threejs-3d': `用可检查的三维空间、对象关系和镜头变化证明“${contract.intent.subject}”的核心体验。`,
    'procedural-webgl': `用实时材质、光场或几何变化让“${contract.intent.subject}”获得静态画面无法表达的因果变化。`,
    video: `用时间连续影像承担“${contract.intent.subject}”的主要叙事与情绪变化。`,
    sound: `用真实可听、可比较的声音状态承担“${contract.intent.subject}”的主要价值。`,
    motion: `用主题专属的运动规律组织“${contract.intent.subject}”的理解节奏。`,
    typography: `用主题专属的编辑结构、排版与语义状态清楚表达“${contract.intent.subject}”。`,
    'data-visualization': `用可验证的信息关系与状态变化说明“${contract.intent.subject}”。`
  };
  return responsibilities[medium]
    ?? `用“${medium}”承担“${contract.intent.subject}”的主题专属核心表达，并以最终浏览器体验证明其必要性。`;
}

function supportingResponsibility(
  medium: CreativeDirectionMedium,
  contract: V2CreativeContract,
  ambition: VisualAmbitionContract
): string {
  const subject = contract.visualAnchor.subject;
  const values: Record<string, string> = {
    'generated-image': `补充“${subject}”所需的高质量环境、材质或连续状态，不替代真实事实。`,
    'grounded-real-media': `为“${subject}”补充可追溯的地点、产品或数据证据。`,
    'threejs-3d': `为“${subject}”增加可感知的深度、遮挡、镜头或部件关系。`,
    'procedural-webgl': `为“${subject}”增加与输入绑定的实时光、材质或形变。`,
    video: `用连续影像补充“${subject}”的时间变化与情绪转折。`,
    sound: `让可听结果与“${subject}”的视觉和业务状态同步变化。`,
    motion: `用 ${ambition.motionArc.beats.map((beat) => beat.driver).join(' / ')} 驱动叙事节奏和可见状态。`,
    typography: `用排版、说明与行动帮助用户理解“${subject}”，不遮挡视觉主体。`,
    'data-visualization': `把“${subject}”相关的关系、状态或证据转成可核验视觉。`
  };
  return values[medium]
    ?? `用“${medium}”强化“${subject}”的同一创意承诺，不建立第二套无关效果。`;
}

function selectExceptionalAxis(
  lead: CreativeDirectionMedium,
  supporting: readonly CreativeDirectionMedium[]
): CreativeDirectionSpec['qualityStrategy']['exceptionalAxis'] {
  const all = [lead, ...supporting];
  if (all.includes('sound') && all.some((medium) => medium !== 'sound')) return 'multisensory-coherence';
  if (all.includes('threejs-3d') || all.includes('procedural-webgl')) return 'spatial-novelty';
  if (all.includes('generated-image') || all.includes('video')) return 'visual-craft';
  if (all.includes('data-visualization')) return 'interaction-meaning';
  return 'concept-originality';
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}
