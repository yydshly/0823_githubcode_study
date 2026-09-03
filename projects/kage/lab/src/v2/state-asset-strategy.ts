import { z } from 'zod';
import type { SpatialProductTopologyDecision } from './spatial-product-topology-capability.ts';

const assetModalitySchema = z.enum([
  'transparent-image', 'image-sequence', 'model-3d', 'texture', 'procedural'
]);

export const stateAssetStrategySchema = z.object({
  required: z.boolean(),
  changeKind: z.enum([
    'none', 'assembly', 'deconstruction', 'structural-deformation', 'material-transition', 'procedural-articulation'
  ]),
  route: z.enum([
    'static-sufficient', 'continuous-media-or-layered-subject', 'inspectable-model', 'procedural-state'
  ]),
  acceptedModalities: z.array(assetModalitySchema).min(1).max(4),
  minimumDistinctStates: z.number().int().min(1).max(8),
  minimumPartGroups: z.number().int().min(0).max(16),
  failurePolicy: z.enum(['continue', 'block-authoring']),
  reason: z.string().min(8).max(360)
}).strict();

export type StateAssetStrategy = z.infer<typeof stateAssetStrategySchema>;

export const staticStateAssetStrategy: StateAssetStrategy = stateAssetStrategySchema.parse({
  required: false,
  changeKind: 'none',
  route: 'static-sufficient',
  acceptedModalities: ['transparent-image', 'image-sequence', 'model-3d', 'procedural'],
  minimumDistinctStates: 1,
  minimumPartGroups: 0,
  failurePolicy: 'continue',
  reason: '旧合同未记录实体状态资产要求；继续使用原素材职责与视觉验收，后续新任务会在 authoring 前执行状态资产路由。'
});

export const stateAssetEvidenceSchema = z.object({
  mode: z.enum(['static', 'sequence', 'layered-subject', 'model-parts', 'procedural']),
  distinctStates: z.number().int().min(1).max(32),
  partGroups: z.number().int().min(0).max(128),
  continuityKey: z.string().min(2).max(120).optional(),
  proof: z.string().min(8).max(300)
}).strict();

export type StateAssetEvidence = z.infer<typeof stateAssetEvidenceSchema>;

export function selectStateAssetStrategy(input: {
  brief: string;
  articulatedSubjectSelected: boolean;
  spatialProductTopology?: SpatialProductTopologyDecision;
}): StateAssetStrategy {
  const brief = input.brief.toLocaleLowerCase();
  // “折叠地图/图册”描述的是编辑视觉语言，不是实体需要发生折叠。
  // 先移除这类明确的媒介搭配，避免把地点导览误路由为多状态主体。
  const structuralBrief = brief
    .replaceAll('折叠地图', '地图')
    .replaceAll('折叠图册', '图册');
  const explicitModel = hasExplicitInspectableModelAssetIntent(structuralBrief);
  const animatedModelClips = explicitModel
    && has(structuralBrief, [
      '动画', '动作剪辑', '动画剪辑', '命名 clip', '命名clip',
      'animation clip', 'animation cycle', 'named clip'
    ])
    && has(structuralBrief, [
      '选择', '切换', '播放', 'choose', 'select', 'switch', 'play'
    ]);
  const minimumAnimationStates = animatedModelClips
    ? declaredAnimationStateCount(structuralBrief)
    : 2;
  const deconstruction = has(structuralBrief, [
    '拆解', '拆开', '爆炸视图', '内部结构', '分解', '拆装'
  ]);
  const structuralExpansion = /(?:部件|结构|机构|构件|关节|翼片|灯罩|伞骨|骨架).{0,16}(?:展开|折叠|开合)|(?:展开|折叠|开合).{0,16}(?:部件|结构|机构|构件|关节|翼片|灯罩|伞骨|骨架)/i.test(structuralBrief);
  const assembly = has(structuralBrief, [
    '装配', '组装', '对齐', '咬合', '拼合', '接合', '插入', '榫卯'
  ]) || structuralExpansion;
  const deformation = has(structuralBrief, [
    '形变', '变形', '弯曲', '伸缩', '膨胀', '收缩', '扭转'
  ]);
  const materialTransition = has(structuralBrief, [
    '气泡密度', '表面张力', '体积变化', '颜色变化', '颜色同步变化', '材质变化', '光泽变化', '裂纹变化'
  ]) && has(structuralBrief, [
    '调整', '参数', '同步变化', '实时变化', '随之变化', '随着'
  ]);

  if (animatedModelClips) {
    return stateAssetStrategySchema.parse({
      required: true,
      changeKind: assembly ? 'assembly' : deconstruction ? 'deconstruction' : 'structural-deformation',
      route: 'inspectable-model',
      acceptedModalities: ['model-3d'],
      minimumDistinctStates: minimumAnimationStates,
      minimumPartGroups: 1,
      failurePolicy: 'block-authoring',
      reason: '目标明确要求在同一真实三维模型上选择动画状态；必须从模型 animations 中核验并播放实际命名剪辑，静态网格、速度缩放或程序化摆动不能冒充缺失动作。'
    });
  }

  const topologyContract = input.spatialProductTopology?.selected
    ? input.spatialProductTopology.authoringContract
    : null;
  if (topologyContract) {
    return stateAssetStrategySchema.parse({
      required: true,
      changeKind: 'assembly',
      route: 'inspectable-model',
      acceptedModalities: ['model-3d'],
      minimumDistinctStates: topologyContract.minimumDistinctPoses,
      minimumPartGroups: topologyContract.minimumNamedPartGroups,
      failurePolicy: 'block-authoring',
      reason: `空间产品拓扑要求同一具名装配树复用全部节点，仅用局部变换呈现至少 ${topologyContract.minimumDistinctPoses} 个姿态和 ${topologyContract.minimumNamedPartGroups} 个部件组；单张图、外观旋转或重建几何不能证明连接关系。`
    });
  }

  if (explicitModel) {
    return stateAssetStrategySchema.parse({
      required: true,
      changeKind: assembly ? 'assembly' : deconstruction ? 'deconstruction' : 'structural-deformation',
      route: 'inspectable-model',
      acceptedModalities: ['model-3d'],
      minimumDistinctStates: minimumAnimationStates,
      minimumPartGroups: 2,
      failurePolicy: 'block-authoring',
      reason: '目标明确要求可检查的真实三维状态；模型必须包含可辨部件或动画状态，单一不可动网格不能证明拆解、装配或结构变化。'
    });
  }

  if (input.articulatedSubjectSelected) {
    return stateAssetStrategySchema.parse({
      required: true,
      changeKind: 'procedural-articulation',
      route: 'procedural-state',
      acceptedModalities: ['procedural'],
      minimumDistinctStates: 3,
      minimumPartGroups: 3,
      failurePolicy: 'block-authoring',
      reason: '目标命中已验证的程序化关节主体；部件拓扑和错峰局部进度由运行时直接证明，不依赖外部静态素材。'
    });
  }

  if (deconstruction || assembly || deformation || materialTransition) {
    return stateAssetStrategySchema.parse({
      required: true,
      changeKind: assembly
        ? 'assembly'
        : deconstruction
          ? 'deconstruction'
          : materialTransition
            ? 'material-transition'
            : 'structural-deformation',
      route: 'continuous-media-or-layered-subject',
      acceptedModalities: materialTransition
        ? ['image-sequence', 'transparent-image', 'model-3d', 'procedural']
        : ['image-sequence', 'transparent-image', 'model-3d'],
      minimumDistinctStates: 3,
      minimumPartGroups: assembly || deconstruction ? 2 : 1,
      failurePolicy: 'block-authoring',
      reason: materialTransition
        ? '目标要求参数驱动同一实体的体积、气泡、颜色或表面材质发生可观察变化；需要多状态媒体、可分层主体、可检查模型或已验证的程序化状态证据，单张完成态图片不能证明交互结果。'
        : '目标要求同一实体产生可观察的结构变化；需要连续一致的多状态媒体、可分层主体或可检查模型，单张静态图只能承担环境和气氛。'
    });
  }

  return stateAssetStrategySchema.parse({
    ...staticStateAssetStrategy,
    reason: '目标没有要求实体装配、拆解或结构形变；现有素材质量与职责门禁足以决定是否进入构建。'
  });
}

export function hasExplicitInspectableModelAssetIntent(rawBrief: string): boolean {
  const brief = rawBrief.toLocaleLowerCase();
  return has(brief, [
    'glb', 'gltf', '真实 3d', '真实3d', '三维模型', '真实模型', '扫描模型',
    '可检查模型', '可追溯模型', 'real 3d', 'inspectable model', 'scanned model'
  ]);
}

function declaredAnimationStateCount(brief: string): number {
  const match = brief.match(
    /([2-8二两三四五六七八])\s*(?:套|个|种)?[^。；;\n]{0,12}(?:动画|动作|剪辑|clip|cycle)/i
  );
  const value = match?.[1];
  if (!value) return 2;
  const chinese = { 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 } as const;
  return value in chinese ? chinese[value as keyof typeof chinese] : Number(value);
}

function has(text: string, signals: readonly string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}
