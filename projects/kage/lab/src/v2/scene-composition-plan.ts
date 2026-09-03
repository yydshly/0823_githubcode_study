import { z } from 'zod';
import type { StateAssetStrategy } from './state-asset-strategy.ts';
import {
  classifyInteractionTaskShape,
  type InteractionTaskShape
} from './interaction-task-shape.ts';

export const sceneLayerRoleSchema = z.enum([
  'environment',
  'subject',
  'foreground',
  'depth-map',
  'state-mask',
  'shadow-mask',
  'spatial-model'
]);

export const sceneCompositionPlanSchema = z.object({
  schemaVersion: z.literal(1),
  route: z.enum(['single-image-hybrid', 'layered-2d', 'spatial-3d']),
  required: z.boolean(),
  requiredLayers: z.array(sceneLayerRoleSchema).min(1).max(7),
  minimumIndependentLayers: z.number().int().min(1).max(7),
  stateBinding: z.enum(['tint-and-camera', 'layer-transform', 'material-or-geometry']),
  failurePolicy: z.enum(['continue-with-declared-fallback', 'block-authoring']),
  fallbackRoute: z.enum(['dom-only', 'single-image-hybrid', 'block']),
  reason: z.string().min(8).max(360)
}).strict();

export type SceneCompositionPlan = z.infer<typeof sceneCompositionPlanSchema>;

/**
 * Backward-compatible default for contracts created before the scene router.
 * It is deliberately non-blocking so this V2 extension cannot change V1,
 * archived cases, or unrelated DOM/media routes.
 */
export const staticSceneCompositionPlan: SceneCompositionPlan = {
  schemaVersion: 1,
  route: 'single-image-hybrid',
  required: false,
  requiredLayers: ['environment'],
  minimumIndependentLayers: 1,
  stateBinding: 'tint-and-camera',
  failurePolicy: 'continue-with-declared-fallback',
  fallbackRoute: 'dom-only',
  reason: '旧合同或普通信息页面未要求独立空间层，继续使用原素材职责，不新增阻断条件。'
};

export interface SceneCompositionInput {
  brief: string;
  presentationStrategy: string;
  rendererRoute: string;
  stateAssetStrategy: StateAssetStrategy;
  experienceForm?: string;
  taskShape?: InteractionTaskShape;
}

export function selectSceneCompositionPlan(input: SceneCompositionInput): SceneCompositionPlan {
  const brief = input.brief.toLowerCase();
  const taskShape = input.taskShape ?? classifyInteractionTaskShape(input.brief);
  if (input.experienceForm === 'branching-confluence' || input.experienceForm === 'object-field') {
    return sceneCompositionPlanSchema.parse({
      ...staticSceneCompositionPlan,
      reason: '分支汇合或对象探索已经由共享 SVG/DOM 坐标与离散状态承担；不因路径、叶片或程序化对象词汇强制增加外部图片分层。'
    });
  }
  const inspectableModel = input.presentationStrategy === 'model-spatial'
    || input.stateAssetStrategy.route === 'inspectable-model';
  if (inspectableModel) {
    return sceneCompositionPlanSchema.parse({
      schemaVersion: 1,
      route: 'spatial-3d',
      required: true,
      requiredLayers: ['spatial-model'],
      minimumIndependentLayers: 1,
      stateBinding: 'material-or-geometry',
      failurePolicy: 'block-authoring',
      fallbackRoute: 'block',
      reason: '目标要求可环绕检查、拆解或真实部件关系；平面图和伪三维不能证明空间结构，必须先获得可检查模型。'
    });
  }

  // A grounded direct-manipulation workspace needs independent scene duties
  // even when an upstream content router selected a DOM/procedural strategy.
  // This branch intentionally precedes the procedural early return. The plan
  // requires composable visual evidence, not Three.js.
  if (taskShape.kind === 'grounded-physical-manipulation') {
    return groundedPhysicalPlan(taskShape);
  }

  if (input.presentationStrategy === 'procedural-field'
    || input.presentationStrategy === 'procedural-articulated') {
    if (hasStatefulEnvironmentalSubject(brief) && !hasInspectableSpecimenWorkspace(brief)) {
      return layeredPlan(true);
    }
    return sceneCompositionPlanSchema.parse({
      ...staticSceneCompositionPlan,
      reason: '当前合同已由程序化场景承担主体状态；场景构成路由不再追加外部图片分层，避免覆盖既有 Three.js 能力。'
    });
  }

  const explicitlyLayered = includesAny(brief, [
      '前景', '中景', '后景', '景深', '空间层次', '视差', '分层', '深度图',
      '穿过', '穿越', '推进', '靠近', '进入', '环绕',
      'foreground', 'midground', 'background', 'depth map', 'parallax', 'layered'
    ])
    || (hasStatefulEnvironmentalSubject(brief) && !hasInspectableSpecimenWorkspace(brief));
  if (explicitlyLayered) {
    const stateBound = input.stateAssetStrategy.required || hasStatefulEnvironmentalSubject(brief);
    return layeredPlan(stateBound);
  }

  return sceneCompositionPlanSchema.parse({
    ...staticSceneCompositionPlan,
    reason: input.rendererRoute === 'dom-only'
      ? '当前目标由信息、控件与行动承担价值，DOM 路线不应被迫增加图片分层或三维素材。'
      : '当前目标没有明确空间拆分或可检查结构要求；允许一张高质量主素材与克制的 DOM/WebGL 增强共同完成。'
  });
}

function groundedPhysicalPlan(taskShape: InteractionTaskShape): SceneCompositionPlan {
  const requiredLayers: SceneCompositionPlan['requiredLayers'] = ['environment', 'subject'];
  if (taskShape.requiresForeground) requiredLayers.push('foreground');
  if (taskShape.stateLayer !== 'none') requiredLayers.push(taskShape.stateLayer);

  return sceneCompositionPlanSchema.parse({
    schemaVersion: 1,
    route: 'layered-2d',
    required: true,
    requiredLayers,
    minimumIndependentLayers: requiredLayers.length,
    stateBinding: 'layer-transform',
    failurePolicy: 'block-authoring',
    fallbackRoute: 'block',
    reason: `${taskShape.reason} 当前只要求 ${requiredLayers.length} 项最小充分职责；使用 2.5D 合成并不要求 Three.js。`
  });
}

function layeredPlan(stateBound: boolean): SceneCompositionPlan {
  return sceneCompositionPlanSchema.parse({
    schemaVersion: 1,
    route: 'layered-2d',
    required: true,
    requiredLayers: ['environment', 'subject', 'foreground', 'depth-map'],
    minimumIndependentLayers: 4,
    stateBinding: 'layer-transform',
    failurePolicy: 'block-authoring',
    fallbackRoute: 'block',
    reason: stateBound
      ? '主题的主体、遮挡或覆盖范围需要随输入产生可辨变化；必须用独立主体、环境、前景与深度/状态遮罩构成同一空间。'
      : '目标明确依赖空间推进、前后景或视差；单张全幅图片只能提供氛围，不能证明可探索的空间关系。'
  });
}

function hasStatefulEnvironmentalSubject(brief: string): boolean {
  const subject = includesAny(brief, [
    '树冠', '树荫', '云层', '雾层', '光幕', '水面', '潮线', '冰层', '叶片',
    'canopy', 'tree shade', 'cloud layer', 'fog layer', 'water surface'
  ]);
  const change = includesAny(brief, [
    '变化', '改变', '扩张', '收缩', '覆盖', '移动', '生长', '消退', '随', '同步',
    '滚动', '拖动', '选择', '参数', '状态',
    'change', 'expand', 'contract', 'cover', 'grow', 'scroll', 'drag', 'parameter'
  ]);
  return subject && change;
}

function hasInspectableSpecimenWorkspace(brief: string): boolean {
  const specimen = includesAny(brief, [
    '植物标本', '植物观察', '标本桌', '桌面教具', '叶脉',
    'botanical specimen', 'plant observation', 'specimen table', 'leaf vein'
  ]);
  const inspection = includesAny(brief, [
    '放大镜', '选择标本', '观察任务', '局部结构',
    'magnifier', 'select specimen', 'observation task', 'local structure'
  ]);
  return specimen && inspection;
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
