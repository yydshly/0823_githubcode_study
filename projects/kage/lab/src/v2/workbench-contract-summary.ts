import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';
import { createVisualReviewPlan } from '../generation/visual-review-plan.ts';
import { selectPositiveReferenceEvidence } from './reference-intelligence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const v2WorkbenchContractSummarySchema = z.object({
  schemaVersion: z.literal(1),
  contractId: safeId,
  pattern: z.enum([
    'continuous-scroll',
    'environmental-memory',
    'product-atmosphere',
    'material-transformation',
    'spatial-exploration',
    'editorial-field'
  ]),
  structureMode: z.enum(['single-scene', 'continuous-canvas', 'guided-sequence', 'interactive-field', 'horizontal-panorama', 'spatial-inspection', 'task-flow', 'editorial-flow', 'catalog', 'branching-confluence']),
  layoutRule: z.string().min(12).max(240),
  rendererRoute: z.enum(['dom-only', 'dom-media-hybrid', 'dom-canvas-hybrid', 'dom-three-hybrid']),
  stateAssetRoute: z.enum(['static-sufficient', 'continuous-media-or-layered-subject', 'inspectable-model', 'procedural-state']).default('static-sufficient'),
  stateAssetReason: z.string().min(8).max(360).default('旧任务未记录状态资产路线，继续使用原素材职责与视觉门禁。'),
  sceneCompositionRoute: z.enum(['single-image-hybrid', 'layered-2d', 'spatial-3d']).default('single-image-hybrid'),
  sceneCompositionRequired: z.boolean().default(false),
  sceneCompositionReason: z.string().min(8).max(360).default('旧任务未记录场景构成路线，不新增阻断条件。'),
  visualRole: z.enum(['environment', 'subject', 'information', 'spatial-object', 'procedural-field']),
  capabilityIds: z.array(safeId).max(4),
  capabilityLabels: z.array(z.string().min(2).max(40)).max(4),
  referenceIds: z.array(safeId).max(3),
  referenceTitles: z.array(z.string().min(2).max(80)).max(3),
  referenceReasons: z.array(z.string().min(3).max(300)).max(3).default([]),
  capabilityReasons: z.array(z.string().min(3).max(300)).max(3).default([]),
  reviewModes: z.array(z.enum(['story-beats', 'mobile-reduced-motion', 'primary-causality', 'semantic-interaction', 'shared-state-driver', 'webgl-fallback'])).min(2).max(6).default(['story-beats', 'mobile-reduced-motion']),
  styleSignature: z.string().min(8).max(240),
  styleDifference: z.string().min(8).max(360),
  decisionSummary: z.string().min(12).max(400),
  preparedMs: z.number().nonnegative().max(10_000),
  authoringPasses: z.number().int().min(1).max(2),
  refinementPasses: z.number().int().min(0).max(2),
  stopAfterMinutes: z.number().int().min(1).max(30),
  storyBeatCount: z.number().int().min(2).max(6).default(3),
  reviewCheckpointCount: z.number().int().min(3).max(8).default(4)
}).strict();

export type V2WorkbenchContractSummary = z.infer<typeof v2WorkbenchContractSummarySchema>;

export function summarizeV2CreativeContract(
  contract: V2CreativeContract,
  preparedMs = 0
): V2WorkbenchContractSummary {
  const references = selectPositiveReferenceEvidence(contract.brief, contract.experience.pattern, 3);
  const capabilities = [
    contract.technical.articulatedSubject.selected
      ? { id: contract.technical.articulatedSubject.capabilityId, label: '程序化关节主体' }
      : null,
    contract.technical.spatialProductTopology.selected
      ? { id: contract.technical.spatialProductTopology.capabilityId, label: '空间产品拓扑' }
      : null,
    contract.technical.capabilitySelection.selected
      ? { id: contract.technical.capabilitySelection.capabilityId, label: '连续媒体滚动叙事' }
      : null,
    contract.technical.semanticInteraction.selected
      ? { id: contract.technical.semanticInteraction.capabilityId, label: '语义响应交互' }
      : null,
    contract.technical.interactionDriver.selected
      ? { id: contract.technical.interactionDriver.capabilityId, label: '共享状态驱动' }
      : null,
    contract.technical.identityEvidence.selected
      ? { id: contract.technical.identityEvidence.capabilityId, label: '身份与证据叙事' }
      : null,
    contract.technical.placeGrounding.selected
      ? {
          id: contract.technical.placeGrounding.capabilityId,
          label: ({
            'none': '无地域职责',
            'real-geography-evidence': '真实地域证据',
            'place-narrative': '地域空间叙事',
            'place-atmosphere': '地域氛围转译'
          } as const)[contract.technical.placeGrounding.strategy]
        }
      : null
  ].filter((item): item is { id: string; label: string } => Boolean(item?.id)).slice(0, 4);
  const reviewPlan = createVisualReviewPlan(contract);
  const capabilityReasons = [
    contract.technical.articulatedSubject.selected ? contract.technical.articulatedSubject.reasons[0] : null,
    contract.technical.spatialProductTopology.selected ? contract.technical.spatialProductTopology.reasons[0] : null,
    contract.technical.capabilitySelection.selected ? contract.technical.capabilitySelection.reasons[0] : null,
    contract.technical.semanticInteraction.selected ? contract.technical.semanticInteraction.reasons[0] : null,
    contract.technical.interactionDriver.selected ? contract.technical.interactionDriver.reasons[0] : null,
    contract.technical.identityEvidence.selected ? contract.technical.identityEvidence.reason : null,
    contract.technical.placeGrounding.selected ? contract.technical.placeGrounding.reasons[1] : null
  ].filter((reason): reason is string => Boolean(reason)).slice(0, 3);
  const reviewModes = [
    'story-beats' as const,
    'mobile-reduced-motion' as const,
    reviewPlan.checkpoints.some((checkpoint) => Boolean(checkpoint.causalProbe)) ? 'primary-causality' as const : null,
    reviewPlan.checkpoints.some((checkpoint) => checkpoint.action === 'semantic-probe') ? 'semantic-interaction' as const : null,
    reviewPlan.checkpoints.some((checkpoint) => checkpoint.action === 'driver-probe') ? 'shared-state-driver' as const : null,
    reviewPlan.checkpoints.some((checkpoint) => checkpoint.action === 'webgl-fallback') ? 'webgl-fallback' as const : null
  ].filter((mode): mode is 'story-beats' | 'mobile-reduced-motion' | 'primary-causality' | 'semantic-interaction' | 'shared-state-driver' | 'webgl-fallback' => Boolean(mode));

  return v2WorkbenchContractSummarySchema.parse({
    schemaVersion: 1,
    contractId: contract.id,
    pattern: contract.experience.pattern,
    structureMode: contract.experience.structure.mode,
    layoutRule: contract.experience.structure.layoutRule,
    rendererRoute: contract.direction.renderer.route,
    stateAssetRoute: contract.technical.stateAssetStrategy.route,
    stateAssetReason: contract.technical.stateAssetStrategy.reason,
    sceneCompositionRoute: contract.technical.sceneComposition.route,
    sceneCompositionRequired: contract.technical.sceneComposition.required,
    sceneCompositionReason: contract.technical.sceneComposition.reason,
    visualRole: contract.direction.visualRole,
    capabilityIds: capabilities.map((item) => item.id),
    capabilityLabels: capabilities.map((item) => item.label),
    referenceIds: references.map((item) => item.id),
    referenceTitles: references.map((item) => item.title),
    referenceReasons: references.map((item) => item.relevanceReason),
    capabilityReasons: [
      ...(capabilityReasons.length ? capabilityReasons : [contract.direction.decisionSummary]),
      contract.technical.stateAssetStrategy.reason
    ].slice(0, 3),
    reviewModes,
    styleSignature: Object.values(contract.technical.styleDiversity.fingerprint).map(styleLabel).join(' · '),
    styleDifference: [
      `结构：${experienceFormLabel(contract.technical.styleDiversity.structureDirection.experienceForm)}`,
      `页面：${surfaceArchetypeLabel(contract.technical.styleDiversity.structureDirection.surfaceArchetype)}`,
      `控件：${controlVisibilityLabel(contract.technical.styleDiversity.structureDirection.controlVisibility)}`,
      workbenchPolicyLabel(contract.technical.styleDiversity.structureDirection.workbenchPolicy),
      `仅作候选排序：${contract.technical.styleDiversity.rationale}`
    ].join('；').slice(0, 360),
    decisionSummary: contract.direction.decisionSummary,
    preparedMs: Math.max(0, Math.round(preparedMs * 10) / 10),
    authoringPasses: contract.executionLimits.authoringPasses,
    refinementPasses: contract.executionLimits.refinementPasses,
    stopAfterMinutes: contract.executionLimits.stopAfterMinutes,
    storyBeatCount: contract.experience.beats.length,
    reviewCheckpointCount: reviewPlan.checkpoints.length
  });
}

function styleLabel(value: string): string {
  return ({
    'full-bleed-cinematic': '全屏电影', 'editorial-grid': '编辑网格', 'split-stage': '分屏过程',
    'spatial-map': '空间地图', 'object-catalog': '对象目录', 'typographic-canvas': '字体画布',
    'dark-luminous': '暗色发光', 'daylight-neutral': '日光中性', 'warm-material': '温暖材料',
    'high-key-monochrome': '高调单色', 'saturated-graphic': '饱和图形', 'earth-archive': '自然档案',
    'scroll-scrub': '滚动连续', 'direct-manipulation': '直接操控', 'state-switch': '状态选择',
    'horizontal-traverse': '横向穿行', 'spatial-inspection': '空间检查', 'microinteraction-only': '微交互为主',
    'single-hero': '单一主体', 'environment-journey': '环境旅程', 'modular-collection': '模块集合',
    'data-field': '数据场', 'foreground-background': '前后景', 'flat-editorial': '平面编辑',
    'editorial-serif': '编辑衬线', 'functional-sans': '功能无衬线', 'display-condensed': '窄体展示',
    'mono-instrument': '仪器等宽', 'quiet-small-scale': '安静小字号', 'image-led-minimal': '图像主导',
    'transparent-subject': '透明主体', 'image-sequence': '连续图像', 'real-3d': '真实 3D',
    'procedural-3d': '程序化 3D', 'canvas-2d': '2D Canvas', 'dom-led': 'DOM 主导'
  } as Record<string, string>)[value] ?? value;
}

function experienceFormLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['experienceForm']): string {
  return ({
    'continuous-stage': '连续叙事场',
    'direct-workbench': '直接操作工作台',
    'editorial-evidence': '编辑证据流',
    'spatial-atlas': '空间地图',
    'horizontal-panorama': '横向连续图卷',
    'object-field': '对象场',
    'branching-confluence': '分支汇合场',
    'typographic-sonic-field': '声音排版场',
    'spatial-inspection': '空间检查场'
  } as const)[value];
}

function workbenchPolicyLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['workbenchPolicy']): string {
  return ({ required: '业务可能需要工作台', allowed: '工作台可选', forbidden: '工作台不是当前首选' } as const)[value];
}

function surfaceArchetypeLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['surfaceArchetype']): string {
  return ({
    'editorial-narrative': '编辑叙事',
    'spatial-journey': '空间旅程',
    'direct-instrument': '直接工具',
    'playful-exploration': '趣味探索',
    'cinematic-product': '电影化产品',
    'civic-data': '公共数据'
  } as const)[value];
}

function controlVisibilityLabel(value: V2CreativeContract['technical']['styleDiversity']['structureDirection']['controlVisibility']): string {
  return ({ none: '无持久控件', contextual: '上下文控件', persistent: '持久控件' } as const)[value];
}
