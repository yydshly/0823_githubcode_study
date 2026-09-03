import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * A creative medium route answers which medium should carry the page identity.
 * It deliberately does not name a provider and does not execute asset work.
 */
export const creativeMediumRouteSchema = z.enum([
  'generated-image',
  'grounded-real-media',
  'threejs-spatial',
  'webgl-procedural',
  'code-native'
]);

export type CreativeMediumRoute = z.infer<typeof creativeMediumRouteSchema>;

export const creativeMediumSignalSchema = z.object({
  source: z.enum(['user-hard', 'contract-evidence', 'truth-boundary']),
  evidence: z.string().trim().min(4).max(360)
}).strict();

export const creativeMediumAssetResponsibilitySchema = z.object({
  id: safeId,
  source: z.enum(['generated-image', 'real-media', 'model-3d', 'programmatic']),
  required: z.boolean(),
  responsibility: z.string().trim().min(8).max(500),
  visibleProof: z.string().trim().min(8).max(500)
}).strict();

export type CreativeMediumAssetResponsibility = z.infer<
  typeof creativeMediumAssetResponsibilitySchema
>;

export const creativeMediumAlternativeSchema = z.object({
  route: creativeMediumRouteSchema,
  trigger: z.string().trim().min(8).max(360),
  boundary: z.string().trim().min(8).max(500)
}).strict();

export const creativeMediumDecisionSchema = z.object({
  schemaVersion: z.literal(1),
  preferred: creativeMediumRouteSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().min(12).max(700),
  signals: z.array(creativeMediumSignalSchema).min(1).max(8),
  assetResponsibilities: z.array(creativeMediumAssetResponsibilitySchema).max(4),
  truthBoundary: z.string().trim().min(12).max(700),
  alternative: creativeMediumAlternativeSchema.nullable()
}).strict().superRefine((decision, context) => {
  const ids = decision.assetResponsibilities.map((asset) => asset.id);
  if (ids.length !== new Set(ids).size) {
    context.addIssue({
      code: 'custom',
      path: ['assetResponsibilities'],
      message: '媒介素材职责 ID 不能重复。'
    });
  }
  if (decision.alternative?.route === decision.preferred) {
    context.addIssue({
      code: 'custom',
      path: ['alternative', 'route'],
      message: '失败回退不能重复首选媒介路线。'
    });
  }

  const requiredSources: Partial<Record<CreativeMediumRoute, CreativeMediumAssetResponsibility['source']>> = {
    'generated-image': 'generated-image',
    'grounded-real-media': 'real-media',
    'threejs-spatial': 'model-3d',
    'webgl-procedural': 'programmatic'
  };
  const requiredSource = requiredSources[decision.preferred];
  if (requiredSource && !decision.assetResponsibilities.some((asset) => (
    asset.required && asset.source === requiredSource
  ))) {
    context.addIssue({
      code: 'custom',
      path: ['assetResponsibilities'],
      message: `首选媒介 ${decision.preferred} 必须声明一个 required ${requiredSource} 职责。`
    });
  }
});

export type CreativeMediumDecision = z.infer<typeof creativeMediumDecisionSchema>;

export function createCreativeMediumDecision(input: unknown): CreativeMediumDecision {
  return creativeMediumDecisionSchema.parse(input);
}

/**
 * Selects one primary identity medium from an already-built V2 contract.
 * Only current-run hard user instructions are treated as user constraints;
 * reference and inference instructions never participate in routing.
 */
export function selectCreativeMediumDecision(
  contract: V2CreativeContract
): CreativeMediumDecision {
  const userHard = contract.instructions.filter((instruction) => (
    instruction.source === 'user'
      && instruction.scope === 'current-run'
      && instruction.strength === 'hard'
  ));
  const hardText = userHard.map((instruction) => instruction.content).join('。').toLocaleLowerCase();
  const positiveBrief = positiveIntentText(contract.brief).toLocaleLowerCase();
  const positiveText = `${positiveBrief}。${positiveHardText(userHard.map((item) => item.content))}`;
  const hardSignals = userHard.map((instruction) => ({
    source: 'user-hard' as const,
    evidence: clip(instruction.content, 360)
  }));

  const generatedForbidden = hasNegatedMedium(hardText, generatedMediumPattern);
  const spatialForbidden = hasNegatedMedium(hardText, spatialMediumPattern);
  const proceduralForbidden = hasNegatedMedium(hardText, proceduralMediumPattern);
  const externalMediaForbidden = hasNegatedMedium(hardText, externalMediaPattern);

  const groundedGeography = contract.technical.placeGrounding.strategy === 'real-geography-evidence'
    || contract.technical.placeGrounding.requirements.geography === 'real-grounded';
  const factualMedia = groundedGeography || includesAny(positiveText, [
    '真实地图', '真实地理', '真实照片', '实拍素材', '授权素材', '事实数据',
    '可追溯来源', 'real map', 'real geography', 'real photo', 'licensed media', 'factual data'
  ]);

  if (factualMedia && !externalMediaForbidden) {
    return decision({
      preferred: 'grounded-real-media',
      confidence: groundedGeography ? 0.99 : 0.95,
      rationale: groundedGeography
        ? '地点、路线或业务决定依赖可核验地理关系，因此真实媒体和数据必须承担视觉底座；生成图只能作为非事实氛围层。'
        : '当前用户明确要求真实或可追溯素材，媒介选择必须保留来源真实性而不是用生成图替代事实。',
      signals: compactSignals([
        ...hardSignals,
        {
          source: 'truth-boundary',
          evidence: groundedGeography
            ? contract.technical.placeGrounding.requirements.dataTruth
            : '真实照片、授权素材和事实数据必须具有可核验来源。'
        }
      ]),
      assetResponsibilities: [assetResponsibility(
        preferredAssetId(contract, 'grounded-primary-media'),
        'real-media',
        groundedGeography
          ? '以可追溯底图、地点或路线证据承担主要空间事实。'
          : `以真实或授权媒体承担“${contract.intent.subject}”的主要视觉身份。`,
        groundedGeography
          ? '最终画面能指出真实区域、来源署名以及与同一数据源绑定的位置或路线。'
          : '最终画面能证明关键媒体真实加载，并保留来源与内容职责。'
      )],
      truthBoundary: groundedGeography
        ? contract.technical.placeGrounding.requirements.dataTruth
        : '不得用模型生成内容冒充实拍、授权来源、真实产品、业务事实或专业结论。',
      alternative: codeFallback('真实或授权素材未通过来源、许可、质量或加载门禁时')
    });
  }

  const inspectableModel = contract.technical.sceneComposition.route === 'spatial-3d'
    || contract.technical.stateAssetStrategy.route === 'inspectable-model'
    || contract.assets.some((asset) => asset.modality === 'model-3d');
  if (inspectableModel && !spatialForbidden) {
    const motionInspection = contract.experience.structure.mode === 'spatial-inspection';
    const productTopology = contract.technical.spatialProductTopology;
    const conceptTopology = productTopology.selected
      && productTopology.authoringContract?.assetPolicy === 'declared-concept-author-generated';
    return decision({
      preferred: 'threejs-spatial',
      confidence: 0.98,
      rationale: motionInspection
        ? '当前目标要求在同一可追溯模型上核验并切换真实命名动画剪辑；Three.js 负责模型、骨骼、剪辑、镜头和空间反馈，语义 DOM 继续承担选择、说明、披露和行动。'
        : productTopology.selected
          ? '当前目标同时要求同一实体产品、多姿态具名装配树、部件重定位和深度检查；Three.js 只负责证明这些空间关系，语义 DOM 继续承担控制、说明、真实性披露和行动。'
        : '当前目标要求可检查的真实深度、部件层级或空间拓扑；Three.js 负责证明这些关系，语义 DOM 继续承担内容和行动。',
      signals: compactSignals([
        ...hardSignals,
        {
          source: 'contract-evidence',
          evidence: productTopology.selected
            ? productTopology.reasons[0] ?? contract.technical.sceneComposition.reason
            : contract.technical.sceneComposition.reason
        }
      ]),
      assetResponsibilities: [assetResponsibility(
        preferredModelId(contract),
        'model-3d',
        motionInspection
          ? `以通过来源、许可、质量和剪辑门禁的动画模型承担“${contract.intent.subject}”的身份、骨骼、材质与真实命名动作。`
          : productTopology.selected
            ? `以同一具名装配树承担“${contract.intent.subject}”的身份、部件、连接关系和全部姿态；节点与几何只创建一次。`
          : `以可检查模型承担“${contract.intent.subject}”的几何、材质、部件和空间关系。`,
        motionInspection
          ? '最终浏览器能验证真实模型加载、声明的命名剪辑来自模型 animations，且同一选择状态同步驱动受控镜头与空间证据。'
          : productTopology.selected
            ? '最终浏览器能验证具名树、部件世界坐标、多个可区分姿态以及 orbit、剖视或背面检查中的连接与遮挡差异。'
          : '最终浏览器能验证真实模型加载、受控相机以及 brief 声明的部件或空间状态。'
      )],
      truthBoundary: motionInspection
        ? '动作只能演示模型中实际存在且通过核验的动画剪辑；不得用速度缩放、程序化摆动或换文案冒充缺失动作，也不得把模型演示标成野外测量、事实观测或专业数据。'
        : conceptTopology
          ? '当前产品拓扑是明确披露的概念设计演示；不得冒充现实品牌、真实产品参数、规格级工业模型、声学测量、性能认证或安装建议。'
          : productTopology.selected
            ? '真实产品拓扑必须来自可追溯且通过层级门禁的模型；不得用程序化盒子、球体、平面图或生成图片冒充真实商品结构。'
        : '没有通过门禁的模型时不得用球体、盒子、平面图或生成图片冒充真实三维检查、拆解和结构证据。',
      alternative: codeFallback('模型缺失、层级不可用、WebGL 失败或移动端无法维持可用体验时')
    });
  }

  const generatedExplicit = includesAny(positiveText, [
    '大模型生图', '模型生图', 'ai 生图', 'ai生图', '生成式主视觉', '生成式环境图',
    '调用生图', '生成主图', 'generated image', 'image generation', 'ai-generated image'
  ]);
  if (generatedExplicit && !generatedForbidden && !externalMediaForbidden) {
    return generatedDecision(contract, hardSignals, 0.97, '用户当前任务明确要求由生成图承担关键视觉身份。');
  }

  const typographicSonicField = contract.technical.styleDiversity.structureDirection.experienceForm
    === 'typographic-sonic-field'
    && contract.technical.productSemanticFeedback.selected;
  if (typographicSonicField) {
    return decision({
      preferred: 'code-native',
      confidence: 0.96,
      rationale: '当前体验的视觉身份来自可读文字、声音时值、播放状态与原位排版变化；语义 DOM、SVG 与 Web Audio 必须共享同一状态，生成图不能承担这项因果职责。',
      signals: compactSignals([
        ...hardSignals,
        {
          source: 'contract-evidence',
          evidence: `体验形态为 typographic-sonic-field，声音能力为 ${contract.technical.productSemanticFeedback.authoringContract?.route ?? 'selected'}。`
        }
      ]),
      assetResponsibilities: [],
      truthBoundary: '合成声音、虚构文本和练习结果必须明确标注为演示；不得把生成图、波形动画或视觉高亮冒充真实可听反馈。',
      alternative: null
    });
  }

  const preciseInformation = contract.direction.visualRole === 'information'
    || contract.technical.styleDiversity.fingerprint.media === 'canvas-2d'
    || ['object-field', 'branching-confluence'].includes(
      contract.technical.styleDiversity.structureDirection.experienceForm
    )
    || includesAny(positiveText, [
      '关系图', '流程图', '图表', '精确路径', '路径图', '拓扑图', '时间轴',
      'diagram', 'chart', 'graph', 'flowchart', 'precise path', 'topology', 'timeline'
    ]);
  if (preciseInformation) {
    return decision({
      preferred: 'code-native',
      confidence: 0.94,
      rationale: '图表、关系或精确路径需要可验证坐标、语义和状态绑定，DOM/SVG/Canvas 2D 比生成图或装饰性 shader 更可靠。',
      signals: compactSignals([
        ...hardSignals,
        {
          source: 'contract-evidence',
          evidence: `视觉职责为 ${contract.direction.visualRole}，媒介指纹为 ${contract.technical.styleDiversity.fingerprint.media}。`
        }
      ]),
      assetResponsibilities: [],
      truthBoundary: '程序化图表和路径只能表达合同中的数据或明确标注的演示数据，不得制造虚假精度、地理事实或专业结论。',
      alternative: null
    });
  }

  const codeExplicit = includesAny(positiveText, [
    '程序化 svg', '程序化svg', '内联 svg', '内联svg', '语义 dom', '代码视觉',
    '不用外部素材', '不依赖外部素材', 'svg', 'semantic dom', 'code-native'
  ]);
  if (codeExplicit || externalMediaForbidden) {
    return decision({
      preferred: 'code-native',
      confidence: codeExplicit ? 0.96 : 0.9,
      rationale: '当前用户要求以可控代码表达或不依赖外部素材，因此优先使用语义 DOM、SVG 与必要的 Canvas 2D。',
      signals: compactSignals(hardSignals.length ? hardSignals : [{
        source: 'contract-evidence',
        evidence: '当前 brief 明确要求程序化、SVG、语义 DOM 或不依赖外部媒体。'
      }]),
      assetResponsibilities: [],
      truthBoundary: '代码视觉必须保持主题可辨、数据诚实和可访问性；通用网格、随机粒子或无意义几何不能冒充关键主体。',
      alternative: null
    });
  }

  const audioDrivenVisualCausality = hasAudioDrivenVisualCausality(contract, positiveText);
  const causalRuntime = hasCausalRuntimeResponsibility(contract, positiveText)
    || audioDrivenVisualCausality;
  const generatedCandidate = hasGeneratedVisualResponsibility(contract)
    || isAtmosphereLed(contract, positiveText);
  const explicitProceduralRuntime = hasExplicitProceduralRuntimeRequest(positiveText);
  if (
    causalRuntime
    && generatedCandidate
    && !audioDrivenVisualCausality
    && !explicitProceduralRuntime
    && !generatedForbidden
    && !externalMediaForbidden
  ) {
    return generatedDecision(
      contract,
      hardSignals,
      0.88,
      '自然或虚构环境与高质感主体需要由连续关键图像建立身份；合同推断的光学或材质因果仅作为运行时增强，不升级为第二个主媒介。'
    );
  }
  if (causalRuntime && !proceduralForbidden && !spatialForbidden) {
    return decision({
      preferred: 'webgl-procedural',
      confidence: audioDrivenVisualCausality ? 0.96 : 0.91,
      rationale: audioDrivenVisualCausality
        ? '当前目标要求可听信号的频段或播放状态连续驱动同一主体的材质、折射、表面或几何；静态图像无法承担这一因果职责，程序化 WebGL 与真实音频分析必须共享状态。'
        : '同一主体的材质、光照或几何必须由用户输入产生可辨认的实时因果变化，程序化 WebGL 是最小充分的动态媒介。',
      signals: compactSignals([
        ...hardSignals,
        {
          source: 'contract-evidence',
          evidence: contract.technical.stateAssetStrategy.reason
        }
      ]),
      assetResponsibilities: [assetResponsibility(
        preferredProgrammaticId(contract),
        'programmatic',
        `在同一“${contract.intent.subject}”上实时表达与输入绑定的材质、光照或几何变化。`,
        '操作前后能在同一视觉主体上观察到非文案、非高亮、非整体缩放的结构或表面差异。'
      )],
      truthBoundary: '程序化结果是合同约束下的视觉表达或明确标注的模拟，不得冒充真实测量、认证数据、精确产品规格或真实素材。',
      alternative: codeFallback('WebGL、性能预算、减弱动效或移动端能力不足时')
    });
  }

  if (generatedCandidate && !generatedForbidden && !externalMediaForbidden) {
    return generatedDecision(
      contract,
      hardSignals,
      0.84,
      '主题依赖自然材质、虚构环境或氛围主视觉，而不承担真实产品、地点或数据证明；一张高质量生成图比通用代码图形更能建立视觉身份。'
    );
  }

  return decision({
    preferred: 'code-native',
    confidence: 0.68,
    rationale: '当前合同没有足够证据证明生成图、真实媒体、可检查三维或 WebGL 能比语义代码更好地承担主题，因此采用无外部资产要求的最小充分路线。',
    signals: compactSignals([
      ...hardSignals,
      {
        source: 'contract-evidence',
        evidence: '未发现事实媒体、真实模型、实时材质/光照/几何或高收益生成主视觉的必要职责。'
      }
    ]),
    assetResponsibilities: [],
    truthBoundary: '默认代码路线仍必须形成主题专属视觉锚点、清楚内容与行动；不得把“无需外部素材”误解为空白页面或通用模板。',
    alternative: null
  });
}

function hasExplicitProceduralRuntimeRequest(positiveText: string): boolean {
  return includesAny(positiveText, [
    'webgl', 'three.js', 'threejs', 'canvas', '着色器', 'shader',
    '程序化光场', '程序化材质', '程序化 webgl', '程序化webgl',
    '实时渲染', '实时 3d', '实时3d', 'procedural webgl',
    'procedural shader', 'real-time rendering'
  ]);
}

interface DecisionInput {
  preferred: CreativeMediumRoute;
  confidence: number;
  rationale: string;
  signals: z.infer<typeof creativeMediumSignalSchema>[];
  assetResponsibilities: CreativeMediumAssetResponsibility[];
  truthBoundary: string;
  alternative: z.infer<typeof creativeMediumAlternativeSchema> | null;
}

function decision(input: DecisionInput): CreativeMediumDecision {
  return creativeMediumDecisionSchema.parse({ schemaVersion: 1, ...input });
}

function generatedDecision(
  contract: V2CreativeContract,
  hardSignals: z.infer<typeof creativeMediumSignalSchema>[],
  confidence: number,
  rationale: string
): CreativeMediumDecision {
  const generatedAsset = generatedAssetDuty(contract);
  return decision({
    preferred: 'generated-image',
    confidence,
    rationale,
    signals: compactSignals([
      ...hardSignals,
      {
        source: 'contract-evidence',
        evidence: generatedAsset.signal
      }
    ]),
    assetResponsibilities: [assetResponsibility(
      generatedAsset.id,
      'generated-image',
      generatedAsset.responsibility,
      generatedAsset.visibleProof
    )],
    truthBoundary: '生成图只能承担概念、虚构环境或编辑视觉，不得冒充真实地点分布、事实数据、真实商品细节、品牌界面或专业结论。',
    alternative: codeFallback('生成图超时、质量不达标、整合失败或素材请求不可用时')
  });
}

function generatedAssetDuty(contract: V2CreativeContract): {
  id: string;
  responsibility: string;
  visibleProof: string;
  signal: string;
} {
  const stateStrategy = contract.technical.stateAssetStrategy;
  const requiredStateSequence = stateStrategy.required
    && stateStrategy.minimumDistinctStates >= 3
    ? contract.assets.find((asset) => (
        asset.id === 'state-subject'
          && asset.role === 'subject'
          && asset.modality === 'image-sequence'
          && asset.required
      ))
    : undefined;

  if (requiredStateSequence) {
    const minimumStates = stateStrategy.minimumDistinctStates;
    return {
      id: requiredStateSequence.id,
      responsibility: clip(
        `required “${requiredStateSequence.id}” 素材职责必须由同一主体至少 ${minimumStates} 个连续状态承担。${requiredStateSequence.visualResponsibility}全部状态必须在同一素材批次生成与整合，不得退化为单张环境图。`,
        500
      ),
      visibleProof: clip(
        `同一主体至少 ${minimumStates} 个连续状态（初始、变化中与完成）均真实加载、进入最终 bundleHash，并保持身份、尺度、观察关系与光线连续；${requiredStateSequence.visibleProof}`,
        500
      ),
      signal: clip(
        `required “${requiredStateSequence.id}” 要求至少 ${minimumStates} 个同一主体连续状态；生成媒介必须承担该状态职责，不能改绑环境图。`,
        360
      )
    };
  }

  return {
    id: preferredGeneratedAssetId(contract),
    responsibility: `以一批内的高质量生成主视觉承担“${contract.intent.subject}”的对象、环境、材质和构图身份。`,
    visibleProof: '关键图像真实加载、进入最终 bundleHash，并在隐藏标题后仍能辨认当前主题。',
    signal: `视觉锚点“${clip(contract.visualAnchor.subject, 220)}”需要由连续、主题专属的关键图像承担。`
  };
}

function assetResponsibility(
  id: string,
  source: CreativeMediumAssetResponsibility['source'],
  responsibility: string,
  visibleProof: string
): CreativeMediumAssetResponsibility {
  return creativeMediumAssetResponsibilitySchema.parse({
    id,
    source,
    required: true,
    responsibility,
    visibleProof
  });
}

function codeFallback(trigger: string): z.infer<typeof creativeMediumAlternativeSchema> {
  return creativeMediumAlternativeSchema.parse({
    route: 'code-native',
    trigger,
    boundary: '只在首选媒介明确失败后保留完整语义内容、主要行动和诚实的降级说明；不得把回退当作第二个并行创意方向。'
  });
}

function hasCausalRuntimeResponsibility(
  contract: V2CreativeContract,
  positiveText: string
): boolean {
  if (contract.technical.sceneComposition.route === 'spatial-3d'
    || contract.technical.stateAssetStrategy.route === 'inspectable-model') return false;
  const causalChange = contract.technical.stateAssetStrategy.changeKind === 'material-transition'
    || contract.technical.stateAssetStrategy.changeKind === 'procedural-articulation'
    || includesAny(positiveText, [
      '材质变化', '光照变化', '光束', '阴影', '几何变化', '结构变化', '形变',
      '实时改变', '同步改变', '实时 webgl', '程序化光场', '着色器', '折射',
      '裂隙亮度', 'material change', 'lighting change', 'geometry change',
      'deformation', 'real-time shader', 'procedural webgl', 'refraction'
    ]);
  const runtimeRoute = contract.direction.renderer.route === 'dom-three-hybrid'
    || contract.direction.renderer.route === 'dom-canvas-hybrid';
  const programmaticSubject = contract.assets.some((asset) => (
    asset.modality === 'procedural'
      && asset.required
      && (asset.role === 'subject' || asset.role === 'environment')
  ));
  return causalChange && (runtimeRoute || programmaticSubject);
}

function hasAudioDrivenVisualCausality(
  contract: V2CreativeContract,
  positiveText: string
): boolean {
  if (!contract.technical.productSemanticFeedback.selected) return false;
  const audioSignal = includesAny(positiveText, [
    '低频', '中频', '高频', '频段', '频谱', '声纹', '音频信号', '声音信号',
    '播放状态', '音量', '振幅', '节拍', '节奏', 'audio band', 'frequency band',
    'spectrum', 'waveform', 'amplitude', 'beat', 'rhythm'
  ]);
  const visibleResponse = includesAny(positiveText, [
    '改变沟槽', '沟槽深度', '材质变化', '改变材质', '表面折光', '折射',
    '边缘振动', '几何变化', '形变', '同步变化', '实时变化', '驱动材质',
    '驱动几何', 'material', 'refraction', 'edge vibration', 'deformation',
    'drive the material', 'drive geometry'
  ]);
  return audioSignal && visibleResponse;
}

function hasGeneratedVisualResponsibility(contract: V2CreativeContract): boolean {
  return contract.assets.some((asset) => (
    asset.required
      && asset.modality !== 'model-3d'
      && asset.modality !== 'procedural'
      && asset.sourcePriority.includes('primary-image-model')
      && (asset.role === 'subject' || asset.role === 'environment' || asset.role === 'atmosphere')
  ));
}

function isAtmosphereLed(contract: V2CreativeContract, positiveText: string): boolean {
  const atmosphericPattern = [
    'environmental-memory', 'product-atmosphere', 'material-transformation'
  ].includes(contract.experience.pattern);
  const explicitSceneIdentity = includesAny(positiveText, [
    '虚构', '梦境', '氛围', '自然环境', '电影感', '摄影感', '宽幅环境', '全景',
    'imaginary', 'dream', 'atmosphere', 'cinematic', 'photographic', 'panorama'
  ]);
  return explicitSceneIdentity
    && (atmosphericPattern || includesAny(positiveText, [
      '虚构', '梦境', '自然环境', '摄影感', '宽幅环境', '全景',
      'imaginary', 'dream', 'photographic', 'panorama'
    ]))
    && contract.technical.placeGrounding.strategy !== 'real-geography-evidence';
}

function preferredGeneratedAssetId(contract: V2CreativeContract): string {
  return contract.assets.find((asset) => (
    asset.sourcePriority.includes('primary-image-model')
      && asset.modality !== 'model-3d'
      && asset.modality !== 'procedural'
  ))?.id ?? 'generated-key-visual';
}

function preferredAssetId(contract: V2CreativeContract, fallback: string): string {
  return contract.assets.find((asset) => (
    asset.sourcePriority.includes('licensed')
      || asset.sourcePriority.includes('curated-library')
      || asset.sourcePriority.includes('user-supplied')
  ))?.id ?? fallback;
}

function preferredModelId(contract: V2CreativeContract): string {
  return contract.assets.find((asset) => asset.modality === 'model-3d')?.id
    ?? 'inspectable-spatial-model';
}

function preferredProgrammaticId(contract: V2CreativeContract): string {
  return contract.assets.find((asset) => (
    asset.modality === 'procedural'
      && asset.required
      && (asset.role === 'subject' || asset.role === 'environment')
  ))?.id ?? 'programmatic-runtime-visual';
}

function compactSignals(
  signals: z.infer<typeof creativeMediumSignalSchema>[]
): z.infer<typeof creativeMediumSignalSchema>[] {
  const unique = new Map<string, z.infer<typeof creativeMediumSignalSchema>>();
  for (const signal of signals) {
    const parsed = creativeMediumSignalSchema.parse({
      source: signal.source,
      evidence: clip(signal.evidence, 360)
    });
    unique.set(`${parsed.source}|${parsed.evidence}`, parsed);
  }
  return [...unique.values()].slice(0, 8);
}

function positiveHardText(values: readonly string[]): string {
  return values.map((value) => positiveIntentText(value)).filter(Boolean).join('。').toLocaleLowerCase();
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

const generatedMediumPattern = /(?:ai|大模型|模型|生成式)?\s*(?:生图|生成图|图片生成|图像生成|generated\s+image|image\s+generation)/i;
const spatialMediumPattern = /(?:three\.?js|webgl|3d|三维|glb|gltf|模型)/i;
const proceduralMediumPattern = /(?:webgl|shader|着色器|程序化|canvas|three\.?js)/i;
const externalMediaPattern = /(?:外部素材|外部图片|图片素材|照片素材|摄影素材|external\s+(?:asset|image|media))/i;

function hasNegatedMedium(text: string, medium: RegExp): boolean {
  const clauses = text.split(/[。；;\n]/).map((clause) => clause.trim()).filter(Boolean);
  return clauses.some((clause) => (
    /(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不要求|不支持|不提供|不能|不应)|\b(?:avoid|reject|forbid|without|do not|don't|no)\b/i.test(clause)
      && medium.test(clause)
  ));
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle.toLocaleLowerCase()));
}

function clip(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(1, maximum - 1))}…`;
}
