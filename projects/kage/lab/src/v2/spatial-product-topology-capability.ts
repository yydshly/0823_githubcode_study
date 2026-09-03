import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const spatialProductInspectionModeSchema = z.enum([
  'orbit', 'cutaway', 'exploded-view', 'rear-inspection'
]);

export const spatialProductTopologyEvidenceSchema = z.object({
  physicalProduct: z.boolean(),
  persistentIdentity: z.boolean(),
  poseLabels: z.array(z.string().min(1).max(40)).max(8),
  distinctPoseCount: z.number().int().min(0).max(8),
  namedPartGroups: z.array(z.string().min(1).max(40)).max(16),
  topologyRepositioning: z.boolean(),
  inspectionModes: z.array(spatialProductInspectionModeSchema).max(4)
}).strict();

export type SpatialProductTopologyEvidence = z.infer<typeof spatialProductTopologyEvidenceSchema>;

export const spatialProductTopologyAuthoringContractSchema = z.object({
  stateModel: z.literal('single-persistent-assembly-tree'),
  minimumDistinctPoses: z.number().int().min(2).max(8),
  minimumNamedPartGroups: z.number().int().min(2).max(16),
  transitionPolicy: z.literal('reuse-nodes-transform-only'),
  inspectionModes: z.array(spatialProductInspectionModeSchema).min(1).max(4),
  rendererRoute: z.literal('dom-three-hybrid'),
  reducedMotion: z.literal('discrete-semantic-poses'),
  fallback: z.literal('semantic-same-state-diagram'),
  assetPolicy: z.enum([
    'declared-concept-author-generated',
    'traceable-model-required'
  ]),
  runtimeProof: z.tuple([
    z.literal('named-tree'),
    z.literal('part-world-transforms'),
    z.literal('pose-distinctness'),
    z.literal('inspection-visibility')
  ])
}).strict();

export type SpatialProductTopologyAuthoringContract = z.infer<
  typeof spatialProductTopologyAuthoringContractSchema
>;

export const spatialProductTopologyCapabilitySchema = z.object({
  id: safeId,
  evidenceLevel: z.literal('E4'),
  state: z.literal('validated'),
  sourceCaseId: safeId,
  problem: z.string().min(20),
  meaning: z.string().min(20),
  rejectionRules: z.array(z.string().min(12)).min(3).max(6)
}).strict();

export const spatialProductTopologyCapability = spatialProductTopologyCapabilitySchema.parse({
  id: 'spatial-product-topology',
  evidenceLevel: 'E4',
  state: 'validated',
  sourceCaseId: 'direct-r142-modular-room-sound',
  problem: '普通产品 brief 中的“拆解、内部结构、旋转”容易被当成 Three.js 指令，即使平面说明或连续媒体已经足够。',
  meaning: '只有同一实体产品的具名装配树必须在多个姿态间重排，并需要深度检查来证明连接、遮挡或内部关系时，才选择空间产品拓扑。',
  rejectionRules: [
    '单独出现拆解、内部结构、爆炸视图或自由旋转等词汇时不得选择。',
    '只有外观旋转而没有部件拓扑变化时不得选择。',
    '不同商品、图片或 SKU 的并列比较不能冒充同一装配树。',
    '没有深度检查责任的装配过程应继续使用连续媒体或可分层主体。',
    '信息拓扑、网络关系和供应链图应继续使用 DOM、SVG 或 Canvas。',
    '用户明确禁止 Three.js、WebGL 或三维时必须拒绝该能力。'
  ]
});

export const spatialProductTopologyDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  evidence: spatialProductTopologyEvidenceSchema,
  reasons: z.array(z.string().min(3).max(300)).min(1).max(6),
  blockers: z.array(z.string().min(3).max(240)).max(4),
  authoringContract: spatialProductTopologyAuthoringContractSchema.nullable()
}).strict().superRefine((decision, context) => {
  if (decision.selected && (!decision.capabilityId || !decision.authoringContract)) {
    context.addIssue({
      code: 'custom',
      path: ['selected'],
      message: '空间产品拓扑被选中时必须携带 capabilityId 与 authoringContract。'
    });
  }
  if (!decision.selected && (decision.capabilityId || decision.authoringContract)) {
    context.addIssue({
      code: 'custom',
      path: ['selected'],
      message: '空间产品拓扑未选中时不得携带能力合同。'
    });
  }
});

export type SpatialProductTopologyDecision = z.infer<typeof spatialProductTopologyDecisionSchema>;

const emptyEvidence: SpatialProductTopologyEvidence = {
  physicalProduct: false,
  persistentIdentity: false,
  poseLabels: [],
  distinctPoseCount: 0,
  namedPartGroups: [],
  topologyRepositioning: false,
  inspectionModes: []
};

export const staticSpatialProductTopologyDecision: SpatialProductTopologyDecision =
  spatialProductTopologyDecisionSchema.parse({
    selected: false,
    capabilityId: null,
    score: 0,
    evidence: emptyEvidence,
    reasons: ['旧合同未评估空间产品拓扑；继续使用原有素材、场景和媒介路线。'],
    blockers: [],
    authoringContract: null
  });

const physicalProductSignals = [
  '产品', '设备', '硬件', '音响', '扬声器', '耳机', '家电', '灯具', '家具', '器材',
  '机器', '仪器', '商品', 'product', 'device', 'hardware', 'speaker', 'headphone',
  'appliance', 'furniture', 'fixture', 'machine', 'instrument'
] as const;

const partDefinitions = [
  { label: '连接触点', signals: ['连接触点', '电气触点', '触点', 'contact'] },
  { label: '扬声单元', signals: ['扬声单元', '驱动单元', '发声单元', 'driver unit'] },
  { label: '低音腔', signals: ['低音腔', '声学腔', '腔体', 'chamber'] },
  { label: '前盖', signals: ['前盖', '面盖', 'front cover'] },
  { label: '后盖', signals: ['后盖', 'back cover'] },
  { label: '箱体', signals: ['箱体', '壳体', '外壳', 'housing', 'shell'] },
  { label: '挂扣', signals: ['挂扣', '挂钩', 'hook'] },
  { label: '铰链', signals: ['铰链', 'hinge'] },
  { label: '连接桥', signals: ['连接桥', '桥接件', 'bridge'] },
  { label: '支架', signals: ['支架', '托架', 'bracket'] },
  { label: '接口', signals: ['接口', 'connector', 'port'] },
  { label: '卡扣', signals: ['卡扣', '扣件', 'latch', 'clip'] },
  { label: '底座', signals: ['底座', 'base'] },
  { label: '面板', signals: ['面板', 'panel'] },
  { label: '骨架', signals: ['骨架', 'frame'] },
  { label: '模块', signals: ['模块', 'module'] },
  { label: '部件', signals: ['部件', '组件', '构件', '零件', 'part', 'component'] }
] as const;

const fallbackPoseDefinitions = [
  { label: '横置', signals: ['横置', 'horizontal'] },
  { label: '左右分体', signals: ['左右分体', '分体', 'split'] },
  { label: '壁挂', signals: ['壁挂', 'wall-mounted', 'wall mount'] },
  { label: '合体', signals: ['合体', '合并', 'docked'] },
  { label: '折叠', signals: ['折叠', 'folded'] },
  { label: '展开', signals: ['展开', 'unfolded', 'expanded'] },
  { label: '闭合', signals: ['闭合', 'closed'] },
  { label: '开启', signals: ['开启', 'open'] }
] as const;

export function selectSpatialProductTopologyCapability(rawBrief: string): SpatialProductTopologyDecision {
  const positiveBrief = positiveIntentText(rawBrief).toLocaleLowerCase();
  const normalizedRaw = rawBrief.toLocaleLowerCase();
  const matchedProductSignals = physicalProductSignals.filter((signal) => positiveBrief.includes(signal));
  const physicalProduct = matchedProductSignals.length > 0;
  const persistentIdentity = /同一(?:个|件|台|套|款|组|部|只|枚)?[^。；;\n]{0,16}(?:产品|设备|硬件|音响|扬声器|耳机|家具|灯具|器材|装置|主体|装配树|模型)|(?:产品|设备|硬件|装置|主体|装配树|模型)[^。；;\n]{0,16}(?:保持同一|身份不变|持续复用)|(?:single|same|persistent)\s+(?:product|device|assembly|model)/i
    .test(positiveBrief);
  const poseLabels = extractPoseLabels(positiveBrief);
  const distinctPoseCount = Math.min(8, Math.max(poseLabels.length, declaredPoseCount(positiveBrief)));
  const namedPartGroups = partDefinitions
    .filter((definition) => definition.signals.some((signal) => positiveBrief.includes(signal)))
    .map((definition) => definition.label);
  const topologyRepositioning = hasTopologyRepositioning(positiveBrief);
  const inspectionModes = detectInspectionModes(positiveBrief);
  const blockers = detectBlockers(normalizedRaw);
  const axes = [
    physicalProduct,
    persistentIdentity,
    distinctPoseCount >= 2,
    namedPartGroups.length >= 2,
    topologyRepositioning,
    inspectionModes.length >= 1
  ];
  const score = Math.round((axes.filter(Boolean).length / axes.length) * 100);
  // Selection is deliberately conjunctive. Score is diagnostic only and can
  // never compensate for a missing responsibility axis or an explicit ban.
  const selected = axes.every(Boolean) && blockers.length === 0;
  const conceptDeclared = includesAny(positiveBrief, [
    '概念设计演示', '概念产品', '虚构产品', '概念模型',
    'concept design', 'concept product', 'fictional product', 'concept model'
  ]);
  const evidence: SpatialProductTopologyEvidence = {
    physicalProduct,
    persistentIdentity,
    poseLabels,
    distinctPoseCount,
    namedPartGroups,
    topologyRepositioning,
    inspectionModes
  };
  const authoringContract: SpatialProductTopologyAuthoringContract | null = selected ? {
    stateModel: 'single-persistent-assembly-tree',
    minimumDistinctPoses: Math.max(2, distinctPoseCount),
    minimumNamedPartGroups: Math.max(2, namedPartGroups.length),
    transitionPolicy: 'reuse-nodes-transform-only',
    inspectionModes,
    rendererRoute: 'dom-three-hybrid',
    reducedMotion: 'discrete-semantic-poses',
    fallback: 'semantic-same-state-diagram',
    assetPolicy: conceptDeclared
      ? 'declared-concept-author-generated'
      : 'traceable-model-required',
    runtimeProof: [
      'named-tree',
      'part-world-transforms',
      'pose-distinctness',
      'inspection-visibility'
    ]
  } : null;

  return spatialProductTopologyDecisionSchema.parse({
    selected,
    capabilityId: selected ? spatialProductTopologyCapability.id : null,
    score,
    evidence,
    reasons: [
      physicalProduct && persistentIdentity
        ? `目标描述同一实体产品；身份连续性可作为装配树根节点。`
        : '目标没有同时证明实体产品与同一身份，不能建立持续装配树。',
      distinctPoseCount >= 2
        ? `目标声明 ${distinctPoseCount} 个可切换空间姿态${poseLabels.length ? `：${poseLabels.join('、')}` : ''}。`
        : '目标没有声明至少两个可区分的空间姿态。',
      namedPartGroups.length >= 2 && topologyRepositioning
        ? `具名部件 ${namedPartGroups.join('、')} 必须按装配或连接关系重新就位。`
        : '目标没有同时声明两个具名部件组及其装配关系重定位。',
      inspectionModes.length
        ? `深度检查责任包括 ${inspectionModes.join('、')}，平面外观切换不足以证明关系。`
        : '目标没有 orbit、交互剖视、爆炸视图或背面检查等深度证据责任。'
    ],
    blockers,
    authoringContract
  });
}

function positiveIntentText(value: string): string {
  const negativeMarker = /(?:^|[，,：:\s])(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不要求|不支持|不提供|不能|不应|不是|并非|不做成)|(?:^|[,;:\s])(?:avoid|reject|forbid|without|do not|don't|no)\b/i;
  return value
    .split(/[。；;\n]/)
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim();
    })
    .filter(Boolean)
    .join('。');
}

function extractPoseLabels(brief: string): string[] {
  const labels = new Set<string>();
  const listPatterns = [
    /(?:在|从)\s*([^。；;\n]{2,80}?)\s*(?:之间|间)\s*(?:切换|转换|改变)/gi,
    /(?:切换|转换)(?:为|到)\s*([^。；;\n]{2,80}?)(?:等)?(?:姿态|配置|布局|形态|模式|状态)/gi
  ];
  for (const pattern of listPatterns) {
    for (const match of brief.matchAll(pattern)) {
      splitPoseList(match[1] ?? '').forEach((label) => labels.add(label));
    }
  }
  if (labels.size < 2 && /(?:切换|转换|姿态|配置|布局|形态|模式)/i.test(brief)) {
    for (const definition of fallbackPoseDefinitions) {
      if (definition.signals.some((signal) => brief.includes(signal))) labels.add(definition.label);
    }
  }
  return [...labels].slice(0, 8);
}

function splitPoseList(value: string): string[] {
  return value
    .split(/(?:、|，|,|\/|\s+(?:and|or)\s+|和|与|及)/i)
    .map((label) => label
      .replace(/^(?:可|可以|能够|分别|依次|并)/, '')
      .replace(/(?:三种|多种|各个|各自)$/, '')
      .trim())
    .filter((label) => label.length >= 1 && label.length <= 40);
}

function declaredPoseCount(brief: string): number {
  const match = brief.match(
    /([2-8二两三四五六七八])\s*(?:种|个|套)?(?:装配)?(?:姿态|配置|布局|形态|模式|状态)/i
  );
  const value = match?.[1];
  if (!value) return 0;
  const chinese = { 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 } as const;
  return value in chinese ? chinese[value as keyof typeof chinese] : Number(value);
}

function hasTopologyRepositioning(brief: string): boolean {
  const relationship = /(?:装配|连接|接合|挂接|咬合|卡扣|触点|接口|相对位置|空间位置|拓扑)(?:关系|顺序|位置|状态)?/i
    .test(brief);
  const repositioning = /(?:重新就位|重新定位|重新连接|重新挂接|重新装配|重排|复位|对齐|咬合|拼合|接合|插入|脱离|分离|挂接|按[^。；;\n]{0,20}关系[^。；;\n]{0,20}(?:变化|改变|切换|就位))/i
    .test(brief);
  return relationship && repositioning;
}

function detectInspectionModes(brief: string): SpatialProductTopologyEvidence['inspectionModes'] {
  const modes: SpatialProductTopologyEvidence['inspectionModes'] = [];
  if (/(?:自由|受限)?(?:旋转|环绕)[^。；;\n]{0,12}(?:检查|观察|查看)|(?:检查|观察|查看)[^。；;\n]{0,12}(?:旋转|环绕)|orbit\s+(?:inspection|view|control)/i.test(brief)) {
    modes.push('orbit');
  }
  if (/(?:开启|切换|进入|交互)[^。；;\n]{0,8}剖视|剖视(?:后|模式|检查|查看)|移开[^。；;\n]{0,12}(?:前盖|后盖|外壳|壳体)|cutaway/i.test(brief)) {
    modes.push('cutaway');
  }
  if (/爆炸视图|爆炸图|exploded\s+view/i.test(brief)) modes.push('exploded-view');
  if (/(?:查看|观察|检查)[^。；;\n]{0,12}(?:背面|后部|后侧)|(?:背面|后部|后侧)[^。；;\n]{0,12}(?:查看|观察|检查)|rear\s+(?:inspection|view)/i.test(brief)) {
    modes.push('rear-inspection');
  }
  return [...new Set(modes)];
}

function detectBlockers(rawBrief: string): string[] {
  const blockers: string[] = [];
  if (/(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不要求|不支持|不提供|不能|不应)[^。；;\n]{0,28}(?:three\.?js|webgl|3d|三维|三维模型|空间模型|模型查看器)/i.test(rawBrief)) {
    blockers.push('目标明确禁止 Three.js、WebGL 或三维模型，不能选择空间产品拓扑。');
  }
  if (/(?:只用|仅用|只需|仅需|必须使用)[^。；;\n]{0,24}(?:svg|2d|二维|平面图|静态图|剖面图)/i.test(rawBrief)) {
    blockers.push('目标明确限定为 SVG、二维或静态图，不得升级为 Three.js。');
  }
  return blockers;
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}
