import { z } from 'zod';
import {
  experiencePatternSchema,
  selectPositiveReferenceEvidence,
  type ExperiencePattern
} from './reference-intelligence.ts';
import { capabilitySelectionSchema, selectPresentationCapability } from './presentation-capabilities.ts';
import { directExperience, experienceDecisionSchema } from './experience-director.ts';
import {
  selectSemanticInteractionCapability,
  semanticInteractionDecisionSchema
} from './semantic-interaction-capability.ts';
import {
  evaluateIdentityEvidenceBrief,
  identityEvidenceDecisionSchema
} from './identity-evidence-capability.ts';
import {
  articulatedSubjectDecisionSchema,
  selectArticulatedSubjectCapability
} from './articulated-subject-capability.ts';
import { stableHash } from '../generation/stable-hash.ts';
import { serializeCodexExecutionBrief } from './codex-execution-brief.ts';
import {
  hasExplicitNoParameterWorkbenchConstraint,
  hasExplicitHorizontalPanoramaIntent,
  hasExplicitSpatialInspectionIntent,
  selectStyleDiversity,
  styleDiversityDecisionSchema
} from './style-diversity.ts';
import {
  placeGroundingDecisionSchema,
  selectPlaceGroundingCapability
} from './place-grounding-capability.ts';
import {
  hasExplicitInspectableModelAssetIntent,
  selectStateAssetStrategy,
  stateAssetStrategySchema,
  staticStateAssetStrategy
} from './state-asset-strategy.ts';
import {
  selectSpatialProductTopologyCapability,
  spatialProductTopologyDecisionSchema,
  staticSpatialProductTopologyDecision,
  type SpatialProductTopologyDecision
} from './spatial-product-topology-capability.ts';
import {
  sceneCompositionPlanSchema,
  selectSceneCompositionPlan,
  staticSceneCompositionPlan,
  type SceneCompositionPlan
} from './scene-composition-plan.ts';
import {
  selectSharedStateDriverCapability,
  sharedStateDriverDecisionSchema
} from './shared-state-driver-capability.ts';
import {
  productSemanticFeedbackDecisionSchema,
  selectProductSemanticFeedback
} from './product-semantic-feedback.ts';
import { classifyInteractionTaskShape } from './interaction-task-shape.ts';
import {
  creativeInstructionSchema,
  createInferenceAdvisoryInstruction,
  createReferenceAdvisoryInstructions,
  createUniversalQualityInstructions,
  createUserConstraintInstructions
} from './creative-instruction.ts';
import { hasExplicitBranchingConfluenceIntent } from './branching-confluence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const referenceEvidenceSchema = z.object({
  referenceId: safeId,
  title: z.string().min(2),
  sourceUrl: z.string().min(1),
  evidenceLevel: z.enum(['runtime-verified', 'catalog-metadata']),
  relevance: z.string().min(8),
  borrow: z.array(z.string().min(8)).min(1).max(3),
  avoid: z.array(z.string().min(8)).max(2)
}).strict();

const experienceBeatSchema = z.object({
  id: safeId,
  position: z.number().min(0).max(1),
  purpose: z.enum(['establish', 'develop', 'transform', 'resolve']),
  visibleState: z.string().min(8),
  userProgression: z.string().min(8)
}).strict();

const experienceStructureSchema = z.object({
  mode: z.enum([
    'single-scene',
    'continuous-canvas',
    'guided-sequence',
    'interactive-field',
    'horizontal-panorama',
    'spatial-inspection',
    'task-flow',
    'editorial-flow',
    'catalog',
    'branching-confluence'
  ]),
  segmentPolicy: z.literal('content-derived'),
  layoutRule: z.string().min(12)
}).strict();

export const visualAnchorSpecSchema = z.object({
  subject: z.string().min(4),
  relationshipToBrief: z.string().min(12),
  heroRole: z.enum(['primary-subject', 'spatial-context', 'evidence-field', 'material-system']),
  source: z.enum(['generated-asset', 'sourced-asset', 'grounded-data', 'procedural', 'hybrid']),
  interactionBinding: z.string().min(12),
  fallback: z.string().min(12)
}).strict();

export type VisualAnchorSpec = z.infer<typeof visualAnchorSpecSchema>;

const assetResponsibilitySchema = z.object({
  id: safeId,
  role: z.enum(['subject', 'environment', 'atmosphere', 'information']),
  modality: z.enum(['transparent-image', 'image-sequence', 'model-3d', 'texture', 'procedural']),
  required: z.boolean(),
  minimumQuality: z.enum(['L2-inspectable', 'L3-presentable', 'L4-cinematic']),
  sourcePriority: z.array(z.enum([
    'user-supplied', 'curated-library', 'licensed', 'primary-image-model', 'minimax-fallback', 'procedural',
    'author-generated'
  ])).min(1),
  visualResponsibility: z.string().min(8),
  continuityRule: z.string().min(8),
  integration: z.enum(['alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-procedural']),
  visibleProof: z.string().min(8),
  fallback: z.enum(['procedural-atmosphere', 'static-image', 'dom-only', 'block'])
}).strict();

const acceptanceCheckSchema = z.object({
  id: safeId,
  priority: z.enum(['blocker', 'high', 'normal']),
  assertion: z.string().min(8),
  evidence: z.enum(['dom', 'runtime', 'asset-request', 'screenshot-opening', 'screenshot-beat', 'screenshot-ending', 'screenshot-mobile'])
}).strict();

export const v2CreativeContractSchema = z.object({
  schemaVersion: z.literal(2),
  id: safeId,
  brief: z.string().min(8),
  intent: z.object({
    subject: z.string().min(2),
    audience: z.string().min(2),
    desiredFeeling: z.string().min(2),
    narrativeChange: z.string().min(8),
    primaryAction: z.string().min(2),
    negativeConstraints: z.array(z.string().min(2)).max(8)
  }).strict(),
  instructions: z.array(creativeInstructionSchema).default([]),
  /** @deprecated Use CodexExecutionBrief.references for direct authoring. */
  referenceEvidence: z.array(referenceEvidenceSchema).max(3),
  experience: z.object({
    pattern: experiencePatternSchema,
    structure: experienceStructureSchema,
    thesis: z.string().min(8),
    focalSubject: z.string().min(2),
    continuityRule: z.string().min(8),
    typographyRole: z.string().min(8),
    beats: z.array(experienceBeatSchema).min(2).max(6),
    pointerRole: z.string().min(8),
    reducedMotion: z.string().min(8),
    finalMemoryPoint: z.string().min(4)
  }).strict(),
  visualAnchor: visualAnchorSpecSchema,
  assets: z.array(assetResponsibilitySchema).max(5),
  direction: experienceDecisionSchema,
  technical: z.object({
    presentationStrategy: z.enum([
      'full-bleed-environment', 'layered-depth', 'model-spatial',
      'material-refraction', 'procedural-field', 'dom-led', 'media-scroll-scrub'
      , 'procedural-articulated'
    ]),
    capabilitySelection: capabilitySelectionSchema,
    articulatedSubject: articulatedSubjectDecisionSchema,
    spatialProductTopology: spatialProductTopologyDecisionSchema.default(staticSpatialProductTopologyDecision),
    stateAssetStrategy: stateAssetStrategySchema.default(staticStateAssetStrategy),
    sceneComposition: sceneCompositionPlanSchema.default(staticSceneCompositionPlan),
    semanticInteraction: semanticInteractionDecisionSchema,
    interactionDriver: sharedStateDriverDecisionSchema,
    productSemanticFeedback: productSemanticFeedbackDecisionSchema,
    identityEvidence: identityEvidenceDecisionSchema,
    placeGrounding: placeGroundingDecisionSchema,
    styleDiversity: styleDiversityDecisionSchema,
    domResponsibilities: z.array(z.string().min(4)).min(2),
    webglResponsibilities: z.array(z.string().min(4)).min(2),
    targetFrameTimeMs: z.number().positive().max(50),
    maxInitialAssetBytes: z.number().int().positive(),
    targetDevices: z.array(z.enum(['desktop', 'mobile'])).min(1)
  }).strict(),
  acceptance: z.array(acceptanceCheckSchema).min(5).max(10),
  executionLimits: z.object({
    authoringPasses: z.literal(1),
    assetBatches: z.literal(1),
    refinementPasses: z.number().int().min(0).max(2),
    stopAfterMinutes: z.number().int().min(1).max(30),
    archivePolicy: z.literal('best-result-only')
  }).strict()
}).strict().superRefine((contract, context) => {
  const positions = contract.experience.beats.map((beat) => beat.position);
  if (!positions.every((position, index) => index === 0 || position > positions[index - 1])) {
    context.addIssue({ code: 'custom', path: ['experience', 'beats'], message: '体验节点位置必须严格递增。' });
  }
  const ids = new Set<string>();
  contract.assets.forEach((asset, index) => {
    if (ids.has(asset.id)) context.addIssue({ code: 'custom', path: ['assets', index, 'id'], message: `素材职责 ID 重复：${asset.id}` });
    ids.add(asset.id);
  });
});

export type V2CreativeContract = z.infer<typeof v2CreativeContractSchema>;

interface PatternPlan {
  pattern: ExperiencePattern;
  structure: z.infer<typeof experienceStructureSchema>;
  thesis: string;
  continuityRule: string;
  typographyRole: string;
  pointerRole: string;
  reducedMotion: string;
  finalMemoryPoint: string;
  presentationStrategy: V2CreativeContract['technical']['presentationStrategy'];
  beats: V2CreativeContract['experience']['beats'];
  assets: V2CreativeContract['assets'];
}

export function createV2CreativeContract(rawBrief: string): V2CreativeContract {
  const brief = rawBrief.trim();
  if (brief.length < 8) throw new Error('请至少描述主体、期望感受或希望发生的变化。');
  const positiveBrief = positiveBriefForRouting(brief);
  const botanicalObservation = isBotanicalObservationBrief(positiveBrief.toLowerCase());
  const spatialInspection = hasExplicitSpatialInspectionIntent(positiveBrief);
  const subject = botanicalObservation
    ? '植物观察标本桌'
    : spatialInspection
      ? spatialInspectionSubjectFrom(positiveBrief, subjectFrom(brief))
      : subjectFrom(brief);
  const audience = audienceFrom(brief);
  const desiredFeeling = feelingFrom(positiveBrief);
  const primaryAction = actionFrom(brief);
  const negativeConstraints = negativeConstraintsFrom(brief);
  const noParameterWorkbench = hasExplicitNoParameterWorkbenchConstraint(brief);
  const routedPlan = planPattern(brief, subject, primaryAction);
  const inferredStyleDiversity = selectStyleDiversity({ brief, pattern: routedPlan.pattern });
  const plan = reconcilePlanWithExplicitInteraction(
    routedPlan,
    subject,
    primaryAction,
    positiveBrief,
    noParameterWorkbench,
  );
  const styleDiversity = alignStyleDiversityWithPlan(inferredStyleDiversity, plan);
  // Capability routing must read the requested experience, not phrases inside
  // negative constraints (for example "不要真实产品冒充"). The latter still
  // remain in intent.negativeConstraints and the authoring prompt.
  const articulatedSubject = selectArticulatedSubjectCapability({ brief: positiveBrief, pattern: plan.pattern });
  const spatialProductTopology = selectSpatialProductTopologyCapability(brief);
  const stateAssetStrategy = selectStateAssetStrategy({
    brief: positiveBrief,
    articulatedSubjectSelected: articulatedSubject.selected,
    spatialProductTopology
  });
  const proceduralMaterialSubject = shouldUseProceduralMaterialSubject(positiveBrief, plan.pattern);
  const baseAssets = spatialProductTopology.selected
    ? applySpatialProductTopologyAssets(plan.assets, spatialProductTopology, subject)
    : articulatedSubject.selected
      ? [proceduralArticulatedAsset(subject)]
      : proceduralMaterialSubject
        ? proceduralMaterialAssets(subject, positiveBrief)
        : plan.assets;
  const stateAssets = applyStateAssetStrategy(baseAssets, stateAssetStrategy, stateSubjectFrom(positiveBrief, subject));
  const baseDirection = directExperience({
    brief,
    pattern: plan.pattern,
    assets: stateAssets,
    beatCount: plan.beats.length,
    experienceForm: styleDiversity.structureDirection.experienceForm
  });
  const initialDirection = articulatedSubject.selected
    ? experienceDecisionSchema.parse({
        ...baseDirection,
        visualRole: 'subject',
        renderer: {
          baseLayer: 'semantic-dom',
          route: 'dom-three-hybrid',
          enhancement: 'three-webgl',
          reason: '部件拓扑、错峰展开和相机关系需要真实三维层级；DOM 继续承担内容与行动。',
          threeJustification: 'Three.js 只构建与主题直接相关的程序化部件及其连续结构状态。',
          fallback: '减少动态效果时显示稳定关键状态；WebGL 不可用时保留最终主体剪影、正文和行动。'
        },
        decisionSummary: `以程序化关节主体承担主要视觉，用${baseDirection.mechanisms.map((item) => item.title).join('、')}组织变化；滚动统一驱动部件、相机、材质、灯光和后期。`
      })
    : baseDirection;
  const capabilitySelection = selectPresentationCapability({
    brief,
    pattern: plan.pattern,
    assetModalities: stateAssets.map((asset) => asset.modality)
  });
  const presentationStrategy: V2CreativeContract['technical']['presentationStrategy'] = spatialProductTopology.selected
    ? 'model-spatial'
    : articulatedSubject.selected
      ? 'procedural-articulated'
      : capabilitySelection.selected ? 'media-scroll-scrub' : plan.presentationStrategy;
  const sceneComposition = selectSceneCompositionPlan({
    brief: positiveBrief,
    presentationStrategy,
    rendererRoute: initialDirection.renderer.route,
    stateAssetStrategy,
    experienceForm: styleDiversity.structureDirection.experienceForm
  });
  const assets = applySceneCompositionAssets(stateAssets, sceneComposition, subject, brief);
  const direction = applySceneCompositionDirection(initialDirection, sceneComposition, spatialProductTopology);
  const semanticInteraction = selectSemanticInteractionCapability({
    brief,
    pattern: plan.pattern,
    primaryInput: direction.interaction.primaryInput,
    assetRoles: assets.map((asset) => asset.role)
  });
  const interactionDriver = selectSharedStateDriverCapability({
    brief: positiveBrief,
    primaryInput: direction.interaction.primaryInput,
    semanticInteractionSelected: semanticInteraction.selected
  });
  const productSemanticFeedback = selectProductSemanticFeedback(brief);
  const identityEvidence = evaluateIdentityEvidenceBrief(positiveBrief);
  const placeGrounding = selectPlaceGroundingCapability(brief);
  const visualAnchor = createVisualAnchorSpec({
    brief,
    subject,
    plan,
    assets,
    semanticInteractionSelected: semanticInteraction.selected,
    placeGroundingSelected: placeGrounding.selected,
    articulatedSubjectSelected: articulatedSubject.selected
  });
  const positiveReferenceEvidence = selectPositiveReferenceEvidence(positiveBrief, plan.pattern, 3);
  const constrainedPositiveReferences = positiveReferenceEvidence
    .map((reference) => ({
      reference,
      borrow: reference.positiveBorrowPrinciples.filter((principle) => (
        !noParameterWorkbench || !principle.includes('工作台')
      )),
    }))
    .filter(({ borrow }) => borrow.length > 0);
  const referenceEvidence: V2CreativeContract['referenceEvidence'] = constrainedPositiveReferences.map(({ reference, borrow }) => ({
    referenceId: reference.id,
    title: reference.title,
    sourceUrl: reference.source.uri,
    evidenceLevel: 'runtime-verified',
    relevance: reference.relevanceReason,
    borrow: borrow.slice(0, 3),
    avoid: reference.advisoryRisks.slice(0, 2)
  }));
  const instructions = [
    ...createUserConstraintInstructions(explicitUserRequirementsFrom(brief)),
    ...createUniversalQualityInstructions(),
    ...createReferenceAdvisoryInstructions(constrainedPositiveReferences.map(({ reference, borrow }) => ({
      referenceId: reference.id,
      title: reference.title,
      borrow,
      avoid: []
    }))),
    createInferenceAdvisoryInstruction({
      experienceForm: styleDiversity.structureDirection.experienceForm,
      fingerprint: styleDiversity.fingerprint,
      rationale: styleDiversity.rationale
    })
  ];

  return v2CreativeContractSchema.parse({
    schemaVersion: 2,
    id: `contract-${stableHash(brief)}`,
    brief,
    intent: {
      subject,
      audience,
      desiredFeeling,
      narrativeChange: narrativeChangeFrom(brief, plan.pattern),
      primaryAction,
      negativeConstraints
    },
    instructions,
    referenceEvidence,
    experience: {
      pattern: plan.pattern,
      structure: plan.structure,
      thesis: plan.thesis,
      focalSubject: subject,
      continuityRule: plan.continuityRule,
      typographyRole: plan.typographyRole,
      beats: plan.beats,
      pointerRole: plan.pointerRole,
      reducedMotion: plan.reducedMotion,
      finalMemoryPoint: plan.finalMemoryPoint
    },
    visualAnchor,
    assets,
    direction,
    technical: {
      presentationStrategy,
      capabilitySelection,
      articulatedSubject,
      spatialProductTopology,
      stateAssetStrategy,
      sceneComposition,
      semanticInteraction,
      interactionDriver,
      productSemanticFeedback,
      identityEvidence,
      placeGrounding,
      styleDiversity,
      domResponsibilities: plan.structure.mode === 'spatial-inspection'
        ? [
            '承载可聚焦的动作选择、当前剪辑名称、观察说明、真实性披露和最终行动。',
            '在模型、WebGL 或移动端增强不可用时保留完整语义顺序、明确缺口与可完成行动。'
          ]
        : spatialProductTopology.selected
          ? [
              '承载可聚焦的姿态、检查与剖视控制、当前状态说明、概念或来源披露以及最终行动。',
              'WebGL 不可用时以同状态语义图保留全部姿态、检查结论与行动，不用平面替身冒充三维检查。'
            ]
          : ['承载可阅读内容、导航和最终行动。', '在 WebGL 不可用时保留完整语义顺序。'],
      webglResponsibilities: spatialProductTopology.selected
        ? [
            '只创建一次具名产品装配树；全部姿态复用节点与几何，只更新部件局部变换。',
            '用部件世界坐标、姿态差异以及 orbit、剖视或背面可见性证明连接、遮挡和空间拓扑。'
          ]
        : articulatedSubject.selected
          ? ['构建具有明确拓扑关系的程序化部件层级。', '把全局进度映射为错峰局部进度，并同步相机、材质、灯光和后期。']
          : plan.structure.mode === 'spatial-inspection'
          ? [
              '加载通过来源、许可与质量门禁的真实动画模型，并只播放模型中实际存在的命名剪辑。',
              '让同一动作状态同步驱动剪辑、受控镜头与空间反馈，不用速度缩放或程序化摆动伪造缺失动作。'
            ]
          : ['承载空间记忆、镜头关系和连续状态变化。', '让素材融入环境并提供克制的交互反馈。'],
      targetFrameTimeMs: 16.7,
      maxInitialAssetBytes: 8_000_000,
      targetDevices: ['desktop', 'mobile']
    },
    acceptance: acceptanceChecks(
      assets.some((asset) => asset.required && asset.modality !== 'procedural'),
      articulatedSubject.selected,
      interactionDriver.selected,
      productSemanticFeedback.selected,
      plan.structure.mode === 'branching-confluence',
      spatialProductTopology.selected,
      plan.structure.mode === 'spatial-inspection'
        ? declaredAnimationClipNamesFrom(positiveBrief)
        : null
    ),
    executionLimits: {
      authoringPasses: 1,
      assetBatches: 1,
      refinementPasses: 1,
      stopAfterMinutes: 3,
      archivePolicy: 'best-result-only'
    }
  });
}

export function buildV2AuthoringPrompt(contract: V2CreativeContract): string {
  const payload = serializeCodexExecutionBrief(v2CreativeContractSchema.parse(contract));
  return [
    '为 Kage V2 构建一个独立、可运行的沉浸式网页。按契约选择渲染能力；Three.js 只在确实承担空间、材质或实时状态职责时使用。',
    '以下 Codex Execution Brief 是从完整研究合同编译出的唯一执行边界；完整合同仅用于留档和追溯。',
    'technical.selectedCapabilities 是基于当前 brief 的实现建议，不是风格禁令；优先复用已验证能力，也可在更能实现用户目标且仍满足质量门时采用其他现有能力。',
    'direction 是编码前的视觉导演决策：按 visualRole 分配焦点，组合 mechanisms 的职责，遵守 interaction 的输入含义，并使用 renderer 中的最小充分技术路线。',
    'story.visualAnchor 是首屏与主要状态的阻断级约束：必须让主题专属对象、空间或证据承担主视觉，并把交互变化绑定到它。纯色、通用网格、无主题依据的渐变、随机粒子或无关几何不能单独充当视觉锚点。',
    'authoring.primaryJourney 是一条“主要输入 → 同一视觉主体的可见变化 → 业务结果 → 最终行动”因果链，不是四个页面、章节或固定屏。所有环节必须由同一目标状态派生；不得只更新文案、数字、active class、整体缩放、透明度或镜头裁切。',
    '按 authoring.primaryJourney.markers 标记视觉锚点、真实控件（存在时）、结果和行动。原生滚动本身不是 DOM 控件，不得为满足标记伪造滑块；brief 中确有拖动、选择或调整控件时必须标记真实控件。',
    'authoring.subjectContinuity 对全部内容派生状态生效：保持同一身份、定义性特征、焦点锚点、观察关系、可比尺度和安全裁切；禁止逐状态独立 cover、重新居中、无因果放大或切换成另一主体。',
    '当 technical.semanticInteraction.selected=true 时，把承担主要可见变化且不包含标题、说明卡或 CTA 的最小主体/场景根节点标记为 data-signal-visual-anchor；主要控件变化后，该节点必须产生无需依赖数字和说明文字也能辨认的差异。',
    'technical.interactionDriver 是按需能力：只有 selected=true 时才把演示、真实滚轮进度和直接控件接入同一个规范化状态，并提供播放/暂停/重置；第一次滚轮、指针、触摸或键盘输入必须停止自动演示并让用户接管。使用合同指定的 data-signal-shared-driver、data-signal-demo-control 和 data-signal-driver-progress 标记可验证入口，并在共享根节点持续更新 data-drive-mode=demo|scroll|manual|paused。selected=false 时禁止自行加入自动演示、滚轮劫持或伪造长页面。',
    'technical.productSemanticFeedback 是按产品语义选择的声音反馈：selected=true 时，声音是主要体验的必需结果而不是装饰。必须由与视觉主体和业务结果相同的因果状态驱动，通过用户手势激活，提供播放/触发、静音、音量、可辨认的 A/B 或前后对比（合同要求时）、真实性说明和失败降级，并使用合同 markers；波形动画、频率数字和图片不能替代真实可听反馈。selected=false 时不得为了展示能力强行加入声音。',
    'technical.spatialProductTopology 是按空间责任选择的产品装配能力：selected=true 时，只创建一次具名装配树，全部姿态复用节点和几何并仅更新局部变换；用部件世界坐标、连接/遮挡差异和合同声明的检查模式证明拓扑。selected=false 时，拆解、内部结构、爆炸视图或自由旋转等孤立词汇不得触发 Three.js。概念模型必须披露，真实产品模型必须可追溯。',
    '交互工作区中的核心对象或主要可变场必须是最大、最清晰的视觉焦点，不能缩成图标或淹没在大面积通用背景中；控件、数字和说明不得比被操作的主体更抢眼。',
    '交互型页面还要分别用 data-signal-primary-control、data-signal-primary-result、data-signal-primary-action 标记核心控件、结果和最终行动。390px 移动端必须通过纵向阅读完成同一任务，不得只显示横向桌面工作台的裁切局部。',
    'direction.rejected 是当前推断下的不推荐方案，不是全局禁令；只有在能说明其更好服务当前 brief 和最终效果时才采用。',
    'technical.styleDiversity 只提供风格诊断、案例距离与候选方向，不能覆盖用户 brief，也不能强制改变风格轴。可借鉴案例原理，但不得把任何案例特定禁令继承为当前任务的硬约束。',
    '当 story.structure.mode=branching-confluence 时，页面必须实现“上下文选择 → 两条可独立重放且具有主题专属可见后果的路线 → 保留路径身份的共同汇合行动”。选择只在决策时出现；不得退化为文案、高亮或颜色切换，也不得扩展为参数工作台、目录或线性长滚动。',
    '当 story.structure.mode=spatial-inspection 时，页面必须让同一可追溯动画模型始终占据空间主舞台；从模型 animations 中核验并切换真实命名剪辑，同一选择状态同步驱动镜头、空间证据、语义说明与最终结果。缺失模型或剪辑时阻断，不得用静态替身、速度变化、程序化摆动或换文案冒充动作。',
    '若使用 SDK 提供的 .generated-canvas：它是 #app 的直接子节点并位于语义内容下方；内容根节点必须保持透明，网格、底色或纹理背景应放在 body，禁止用不透明根背景遮住 Canvas。',
    'story.structure 是基于 brief 的组织建议；story.beats 是语义状态与时间锚点，不要求机械对应 DOM 页面数量。最终章节、屏数和工作区形式由内容、互动与最佳画面共同决定，三屏或其他常见结构在确实适合目标时可以采用。',
    '生成素材必须承担声明的 responsibility，并在由 story.beats 派生的验收状态中提供 proof。',
    '模型生成素材、项目已有素材和程序化 Three.js 都只是实现候选，不能预先禁止其中任何一种；应选择最能达到最终画面质量且符合来源约束的组合。实现偏好不能降低 L3 主体质量门。',
    '当核心对象是茶杯、器物、设备、家具等可辨认实体时，必须先守住定义性轮廓、比例、连接关系、厚度与落地/受光逻辑。圆柱、蛋形、球体或圆环拼接只能作为草模，不能作为最终主体；有参考素材时必须用于校正形体或承担可见主体。',
    'technical.stateAssetStrategy 是状态资产硬边界：当 required=true 时，素材必须在 authoring 前证明最少状态数和可分部件；单张静态图、裁切、箭头或说明文字不能替代装配、拆解、咬合和结构形变。',
    'technical.sceneComposition 是独立且有界的场景构成路线：single-image-hybrid 允许单张高质量主素材；layered-2d 必须让环境、主体、前景与深度/状态层独立承担职责；spatial-3d 必须使用可检查空间模型。required=true 时不得用一张背景图、整体缩放或颜色滤镜冒充分层和结构变化；required=false 时禁止为了使用能力而强行扩展。',
    '只生成一个主候选；浏览器证据显示未达标时，最多针对最高优先级缺陷进行一次局部修复。',
    '不得伪造不存在的 GLB、素材或业务证据；构图、文字、粒子、色彩与技术选择都必须服务当前目标和最终画面质量。',
    '',
    'CODEX_EXECUTION_BRIEF_JSON',
    payload,
    '',
    '交付物：独立页面源码、素材清单、构建报告，以及按 story.beats 派生的关键状态、移动端与降级验收证据；验收数量不固定。'
  ].join('\n');
}

function planPattern(brief: string, subject: string, primaryAction: string): PatternPlan {
  const normalized = positiveBriefForRouting(brief).toLowerCase();
  // A complete choice -> multiple paths -> shared confluence promise defines
  // the page graph and therefore outranks broad subject domains such as
  // repair/diagnostics. A diagnostic without all three signals still keeps
  // the ordinary task-flow route below.
  if (hasExplicitBranchingConfluenceIntent(normalized)) {
    return branchingConfluencePlan(subject, primaryAction);
  }
  if (includesAny(normalized, ['维修', '诊断', '故障', '检查顺序', '装配图', '工作坊', 'repair', 'diagnostic', 'troubleshoot'])) {
    return utilityDiagnosticPlan(subject, primaryAction);
  }
  if (hasExplicitHorizontalPanoramaIntent(normalized)) {
    return horizontalPanoramaMapPlan(subject, primaryAction);
  }
  if (isInformationMapBrief(normalized)) {
    return informationMapPlan(subject, primaryAction);
  }
  if (hasExplicitSpatialInspectionIntent(normalized)) {
    return spatialInspectionPlan(subject, primaryAction);
  }
  // Highly specific subject routes must win before broad editorial keywords
  // such as "evidence"; otherwise a botanical evidence brief silently loses
  // its specimen asset and observation interaction.
  if (isBotanicalObservationBrief(normalized)) {
    return botanicalObservationPlan(subject, primaryAction);
  }
  // A declared catalog is a page-scale relationship between several stable
  // items. Route it before broad material, archive and object-field signals so
  // words such as "材料", "馆藏" or "选择" cannot collapse it into a single
  // transforming subject, a scroll archive or a spatial object stage.
  if (isCatalogBrief(normalized)) {
    return catalogPlan(subject, primaryAction);
  }
  if (includesAny(normalized, ['展陈', '探索路径', '空间关系', '观测站', 'ocean'])) {
    return spatialExplorationPlan(subject, primaryAction);
  }
  if (includesAny(normalized, [
    '档案', '证据', '年代', '票根', '杂志', '出版', '馆藏',
    'archive', 'evidence', 'editorial', 'magazine'
  ])) {
    return editorialExplorationPlan(subject, primaryAction);
  }
  if (includesAny(normalized, ['梦', '记忆', '醒来', '睡眠', '房间', 'dream', 'memory'])) {
    return environmentalMemoryPlan(subject, primaryAction);
  }
  if (isStageLightingWorkspaceBrief(normalized)) {
    return stageLightingWorkspacePlan(subject, primaryAction);
  }
  if (isSpatialSetupWorkspaceBrief(normalized)) {
    return spatialSetupWorkspacePlan(subject, primaryAction);
  }
  if (isMaterialExperimentBrief(normalized)) {
    return materialExperimentPlan(subject, primaryAction);
  }
  if (isCausalSimulationBrief(normalized)) {
    return causalSimulationPlan(subject, primaryAction);
  }
  // A callsign/Morse listening exercise is a finite decode task, not the
  // generic "voices emerge / night composes" sonic editorial narrative.
  // Keep this narrow so ordinary oral-history and audio-editorial briefs retain
  // their established plan.
  if (isCallsignDecoderBrief(normalized)) {
    return callsignDecoderPlan(subject, primaryAction);
  }
  if (isSonicEditorialBrief(normalized)) {
    return sonicEditorialPlan(subject, primaryAction);
  }
  if (isEditorialCurationBrief(normalized)) {
    return editorialExplorationPlan(subject, primaryAction);
  }
  if (includesAny(normalized, ['时装', '薄纱', '液态', '材质', '生长', '纤维', '表皮', '和纸', '木版', '版画', '墨层', '套印', '压印', '印刷', 'fashion', 'material', 'fluid'])) {
    return materialTransformationPlan(brief, subject, primaryAction);
  }
  if (isObjectFieldBrief(normalized)) {
    return objectFieldPlan(normalized, subject, primaryAction);
  }
  if (includesAny(normalized, ['产品', '设备', '硬件', '声音', '声学', '记录器', 'product', 'device', 'audio', 'sound'])) {
    return productAtmospherePlan(brief, subject, primaryAction);
  }
  if (includesAny(normalized, ['滚动', '逐渐', '形成', '穿越', '进入', '推进', '时间线', 'scroll', 'scrub', 'timeline'])) {
    return continuousScrollPlan(subject, primaryAction);
  }
  return editorialExplorationPlan(subject, primaryAction);
}

function isInformationMapBrief(normalized: string): boolean {
  const explicitMap = includesAny(normalized, [
    '地图', '经纬度', '坐标', '导航', 'map', 'atlas', 'navigation', 'coordinate'
  ]);
  if (explicitMap) return true;

  const serviceSubject = includesAny(normalized, [
    '公共服务', '公共设施', '饮水点', '补水点', '门店', '站点', '水质', '开放状态',
    'public service', 'facility', 'station', 'water quality', 'opening status'
  ]);
  const serviceDecision = includesAny(normalized, [
    '路线', '距离', '步行', '最近', '到达', '配送', '地址', '位置',
    'route', 'distance', 'walking', 'nearest', 'arrival', 'delivery', 'address', 'location'
  ]);
  if (serviceSubject && serviceDecision) return true;

  const hasBroadPlace = includesAny(normalized, [
    '街区', '城市', '区域', 'district', 'city', 'area'
  ]);
  const hasDecisionSignal = includesAny(normalized, [
    '地点', '位置选择', '距离', '步行', '最近', '公共设施', '地理',
    'place', 'location', 'distance', 'walking', 'nearest', 'geographic'
  ]);
  return hasBroadPlace && hasDecisionSignal;
}

function isObjectFieldBrief(normalized: string): boolean {
  const archiveTask = includesAny(normalized, [
    '档案', '证据', '年代', '修复记录', '研究过程', 'archive', 'evidence', 'timeline'
  ]);
  if (archiveTask) return false;

  const collectionTask = includesAny(normalized, [
    '对象系列', '作品系列', '展品系列', '标本目录', '馆藏目录', '收藏集', '目录', '馆藏',
    '声源', '声音来源', '寻找声音', '找出声音', '收集三个', '收集3个',
    'catalog', 'object series', 'exhibit series'
  ]) || (includesAny(normalized, ['系列', 'collection']) && includesAny(normalized, [
    '对象', '作品', '展品', '装置', '藏品', '多个', '多件', '六只',
    'object', 'artwork', 'exhibit', 'installation', 'multiple', 'six',
    '选择', '探索', 'select', 'explore'
  ]));
  const culturalActivity = includesAny(normalized, [
    '文化活动', '展览', '游园', '巡游', '展会', 'festival', 'exhibition', 'parade'
  ]);
  const multipleObjects = includesAny(normalized, [
    '对象', '展品', '作品', '装置', '纸蝶', '藏品', '多个', '多件', '六只',
    '声源', '叶片', '树洞', '溪石', '昆虫', '热点',
    'object', 'exhibit', 'artwork', 'installation', 'multiple', 'six'
  ]);
  const exploratorySelection = includesAny(normalized, [
    '选择', '探索', '指针', '触摸', '点击', '悬停', '加入',
    'select', 'explore', 'pointer', 'touch', 'click', 'hover', 'join'
  ]);
  const namedHotspotCollection = multipleObjects
    && exploratorySelection
    && includesAny(normalized, ['收集', '寻找', '找出', '形成路线', 'collection', 'find']);
  return collectionTask
    || namedHotspotCollection
    || (culturalActivity && multipleObjects && exploratorySelection);
}

function isCatalogBrief(normalized: string): boolean {
  const catalogIntent = normalized.replace(
    /(?:不是|并非|不做成|不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应)[^。；;\n]{0,48}(?:目录|catalog)/gi,
    ''
  );
  const explicitlyNamedCatalog = includesAny(catalogIntent, [
    '样本馆', '样品馆', '标本馆', '样本库', '样品库',
    '样本目录', '样品目录', '标本目录', '材料目录', '产品目录', '作品目录',
    '展品目录', '藏品目录', '馆藏目录', '对象目录',
    'catalog', 'sample library', 'specimen library', 'material library',
    'sample gallery', 'specimen gallery'
  ]);
  if (explicitlyNamedCatalog) return true;

  const directoryOfItems = catalogIntent.includes('目录') && includesAny(catalogIntent, [
    '样本', '样品', '标本', '材料', '产品', '商品', '作品', '展品', '藏品', '馆藏',
    '对象', '条目', '多件', '多个', '多种', '系列'
  ]);
  if (directoryOfItems) return true;

  const multipleItems = includesAny(catalogIntent, [
    '多件', '多个', '多种', '一组', '两件', '二选', 'multiple items', 'multiple samples'
  ]) || /(?:[两二三四五六七八九十]|\d+)(?:件|个|种|款|份|枚|只)(?:样本|样品|标本|材料|对象|作品|展品|藏品)?/.test(catalogIntent);
  const filtering = includesAny(catalogIntent, [
    '筛选', '过滤', '分类浏览', '按类别', '按用途', '类别筛选',
    'filter', 'filtering', 'browse by', 'category'
  ]);
  const comparison = includesAny(catalogIntent, [
    '比较', '对比', '并排', '二选比较', '两件比较', 'compare', 'comparison', 'side by side'
  ]);
  return multipleItems && filtering && comparison;
}

function alignStyleDiversityWithPlan(
  styleDiversity: z.infer<typeof styleDiversityDecisionSchema>,
  plan: PatternPlan
): z.infer<typeof styleDiversityDecisionSchema> {
  if (plan.structure.mode === 'branching-confluence') {
    return styleDiversityDecisionSchema.parse({
      ...styleDiversity,
      structureDirection: {
        experienceForm: 'branching-confluence',
        workbenchPolicy: 'forbidden',
        surfaceArchetype: 'playful-exploration',
        controlVisibility: 'contextual',
        interactionStyle: 'direct-control',
        compositionRule: '让共享视觉主体、选择节点、两条可重放路线及汇合结果形成一个选择驱动的动态构图，而不是线性章节。',
        informationRule: '选择只在决策时出现；当前路线、可见后果、路径历史与最终行动必须来自同一分支状态。',
        antiTemplateRule: '不得把分支退化为文案切换、两张卡片、持久参数工作台、目录筛选或伪造长滚动。',
        strength: 'advisory'
      }
    });
  }
  if (plan.structure.mode === 'single-scene') {
    return styleDiversityDecisionSchema.parse({
      ...styleDiversity,
      structureDirection: {
        experienceForm: 'object-field',
        workbenchPolicy: 'forbidden',
        surfaceArchetype: 'playful-exploration',
        controlVisibility: 'contextual',
        interactionStyle: 'pointer',
        compositionRule: '让全部可探索对象共享一个持续视觉场；选择只改变就近焦点、可见反馈、声音或上下文结果。',
        informationRule: '对象身份、当前选择、已收集状态、反馈与最终行动必须来自同一对象场状态。',
        antiTemplateRule: '不得把对象探索退化为卡片目录、中央产品、持久参数工作台或固定三屏长页。',
        strength: 'advisory'
      }
    });
  }
  if (plan.structure.mode === 'spatial-inspection') {
    return styleDiversityDecisionSchema.parse({
      ...styleDiversity,
      structureDirection: {
        experienceForm: 'spatial-inspection',
        workbenchPolicy: 'forbidden',
        surfaceArchetype: 'spatial-journey',
        controlVisibility: 'contextual',
        interactionStyle: 'mixed',
        compositionRule: '让同一可追溯动画模型持续成为空间主舞台；动作选择、受控镜头和空间证据围绕主体形成一体化观察构图。',
        informationRule: '动作名称、观察解释、真实性披露和最终结果由同一选择状态驱动，并贴近模型而不遮挡定义性轮廓。',
        antiTemplateRule: '不得把动作检查退化为持久参数面板、指标仪表盘、静态模型转台、卡片目录或彼此断开的动画片段。',
        strength: 'advisory'
      }
    });
  }
  if (plan.structure.mode !== 'catalog') return styleDiversity;
  return styleDiversityDecisionSchema.parse({
    ...styleDiversity,
    structureDirection: {
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'playful-exploration',
      controlVisibility: 'contextual',
      interactionStyle: 'pointer',
      compositionRule: '让多件可筛选条目共同形成目录主表面，检查与比较在条目附近或按需比较层中发生。',
      informationRule: '保留条目身份、类别、选择和可比尺度；筛选、局部证据与最终行动必须共享同一目录状态。',
      antiTemplateRule: '目录由条目差异和比较任务决定，不生成中央单英雄、持久参数工作台或伪造长滚动章节。',
      strength: 'advisory'
    }
  });
}

function reconcilePlanWithExplicitInteraction(
  plan: PatternPlan,
  subject: string,
  action: string,
  positiveBrief: string,
  noParameterWorkbench: boolean,
): PatternPlan {
  const interactionShape = classifyInteractionTaskShape(positiveBrief);
  const explicitDirectInteraction = interactionShape.directManipulation
    && plan.structure.mode !== 'interactive-field'
    && plan.structure.mode !== 'horizontal-panorama'
    && plan.structure.mode !== 'spatial-inspection'
    && plan.structure.mode !== 'catalog'
    && plan.structure.mode !== 'branching-confluence';
  if (!explicitDirectInteraction) {
    return plan;
  }

  return {
    ...plan,
    structure: structure(
      'interactive-field',
      noParameterWorkbench
        ? '同一可操作主体、真实控制、可见变化、业务结果和最终行动保持在持续主题场；控件按需出现，不生成参数工作台或固定屏。'
        : '同一可操作主体、真实控制、可见变化、业务结果和最终行动保持在持续工作区；状态不分页，也不按固定屏数展开。'
    ),
    thesis: `把${subject}组织为可直接操作的持续工作区；每次输入都必须在同一主体或关系场中产生可理解的因果结果。`,
    pointerRole: '指针、触摸和键盘直接操作同一主体或对象关系；输入必须同步改变可见状态、业务结果与行动准备状态，禁止装饰性跟随。',
    reducedMotion: '直接切换或短暂插值到离散操作状态，停止自动镜头和持续漂移，但保留全部控制、结果和最终行动。',
    beats: [
      beat(
        noParameterWorkbench ? 'interaction-baseline' : 'workbench-baseline',
        0,
        'establish',
        noParameterWorkbench
          ? '同一可操作主体、初始关系与按需控制建立清晰主题场。'
          : '同一可操作主体、初始关系、控制与结果建立清晰工作区。',
        '确认对象和初始状态，开始第一次直接操作。',
      ),
      beat('causal-response', .56, 'transform', '直接输入同步改变同一主体或对象关系、可见反馈与业务结果。', '拖动、选择或调整对象，并核对画面与结果是否一致。'),
      beat('result-ready', 1, 'resolve', `当前状态、结果摘要与“${action}”保持可见，最终行动已准备。`, '核对当前结果后完成最终行动。')
    ]
  };
}

function isBotanicalObservationBrief(normalized: string): boolean {
  const hasSpecimenSubject = includesAny(normalized, [
    '植物标本', '植物观察', '叶片', '叶脉', '种子', '根系',
    'botanical specimen', 'plant observation', 'leaf vein', 'seed', 'root system'
  ]);
  const hasObservationTool = includesAny(normalized, [
    '放大镜', '标本', '桌面教具', '观察任务', '观察桌',
    'magnifier', 'specimen', 'observation task', 'observation table'
  ]);
  const hasEvidenceChange = includesAny(normalized, [
    '选择', '拖动', '触摸', '叶脉结构', '含水量', '生长阶段', '同步变化',
    'select', 'drag', 'touch', 'hydration', 'growth stage', 'updates'
  ]);
  return hasSpecimenSubject && hasObservationTool && hasEvidenceChange;
}

function isStageLightingWorkspaceBrief(normalized: string): boolean {
  const hasStage = includesAny(normalized, ['舞台', '剧场', '黑盒剧场', '排练厅', 'stage', 'theatre', 'theater']);
  const hasLightingControl = includesAny(normalized, [
    '灯光', '灯具', '光束', '照度', '亮度', '色片', '灯位', 'cue', 'spotlight', 'lighting'
  ]);
  const hasOperation = includesAny(normalized, ['调整', '选择', '切换', '排练', '保存', 'adjust', 'select', 'switch', 'rehearsal', 'save']);
  return hasStage && hasLightingControl && hasOperation;
}

function isMaterialExperimentBrief(normalized: string): boolean {
  const hasMaterialSubject = includesAny(normalized, [
    '陶瓷', '陶艺', '陶土', '瓷器', '釉色', '釉料', '灰釉', '烧成', '窑烧',
    'ceramic', 'pottery', 'glaze', 'kiln'
  ]);
  const hasParameterCause = includesAny(normalized, [
    '调整', '比例', '配方', '温度', '参数', '混合', '烧成温度',
    'adjust', 'ratio', 'formula', 'temperature', 'parameter', 'mix'
  ]);
  return hasMaterialSubject && hasParameterCause;
}

function isSpatialSetupWorkspaceBrief(normalized: string): boolean {
  const hasPhysicalSubject = includesAny(normalized, [
    '投影仪', '投影机', '幕布', '墙面画面', '摆放助手', '安装助手',
    'projector', 'projection screen', 'placement assistant', 'installation assistant'
  ]);
  const hasSpatialParameters = includesAny(normalized, [
    '距离', '安装高度', '高度', '偏角', '角度', '位置', '摆放',
    'distance', 'height', 'offset', 'angle', 'position', 'placement'
  ]);
  const hasVisibleResult = includesAny(normalized, [
    '画面尺寸', '梯形', '亮度', '投射', '推荐提示', '推荐摆放',
    'screen size', 'keystone', 'brightness', 'projection', 'recommendation'
  ]);
  const hasOperation = includesAny(normalized, [
    '调整', '移动', '切换', '保存', 'adjust', 'move', 'switch', 'save'
  ]);
  return hasPhysicalSubject && hasSpatialParameters && hasVisibleResult && hasOperation;
}

function isCausalSimulationBrief(normalized: string): boolean {
  const hasWorkspace = includesAny(normalized, [
    '实验', '模拟', '助手', '工作台', '观察台', '控制台',
    'experiment', 'simulation', 'assistant', 'workbench'
  ]);
  const hasDirectControl = includesAny(normalized, [
    '调整', '拖动', '选择', '切换', '比较', '输入',
    'adjust', 'drag', 'select', 'switch', 'compare', 'input'
  ]);
  const hasVisibleResult = includesAny(normalized, [
    '同步变化', '同步更新', '方向', '长度', '落点', '结果', '解释', '建议',
    'updates', 'direction', 'length', 'result', 'explanation', 'recommendation'
  ]);
  return hasWorkspace && hasDirectControl && hasVisibleResult;
}

function isSonicEditorialBrief(normalized: string): boolean {
  const hasSound = includesAny(normalized, [
    '声音', '音频', '聆听', '试听', '耳语', '声部', '电台', '播客',
    'audio', 'sound', 'listen', 'voice', 'radio', 'podcast'
  ]);
  const hasEditorialFrame = includesAny(normalized, [
    '声音为主', '文字和声音', '排版', '台词', '短篇小说', '章节', '口述史',
    'typography', 'editorial', 'transcript', 'story', 'chapter', 'oral history'
  ]);
  return hasSound && hasEditorialFrame;
}

function isCallsignDecoderBrief(normalized: string): boolean {
  const radioIdentity = includesAny(normalized, [
    '呼号', '摩尔斯', '点划', '电文', '业余无线电',
    'callsign', 'call sign', 'morse', 'dot dash', 'radiogram'
  ]);
  const listeningDecode = includesAny(normalized, [
    '解码', '辨认', '听辨', '提交解码', 'decode', 'identify'
  ]) && includesAny(normalized, [
    '播放', '试听', '聆听', '音调', '听见', 'play', 'listen', 'tone'
  ]);
  return radioIdentity && listeningDecode;
}

function isEditorialCurationBrief(normalized: string): boolean {
  const hasCuratedObjects = includesAny(normalized, [
    '选书', '书封', '引文卡', '阅读清单', '选书单', '图书收藏',
    'book cover', 'quote card', 'reading list', 'book collection', 'curation'
  ]);
  const hasCurationInteraction = includesAny(normalized, [
    '拖动', '选择', '重排', '筛选', '排序', '推荐',
    'drag', 'select', 'reorder', 'filter', 'sort', 'recommend'
  ]);
  const hasVisibleOutcome = includesAny(normalized, [
    '清单', '路径', '推荐', '收藏', '结果',
    'list', 'path', 'recommendation', 'collection', 'result'
  ]);
  return hasCuratedObjects && hasCurationInteraction && hasVisibleOutcome;
}

function objectFieldPlan(brief: string, subject: string, action: string): PatternPlan {
  const procedural3d = includesAny(brief, [
    '程序化 3d', '程序化3d', '主题专属 3d', '主题专属3d', 'three.js', 'threejs',
    '不同深度', '空间队形'
  ]);
  return {
    pattern: 'spatial-exploration',
    structure: structure(
      'single-scene',
      '多个对象始终位于同一持续空间舞台；探索、选择、上下文信息和最终行动只改变共享对象场状态，不制造长滚动章节或持久参数工作台。'
    ),
    thesis: `把${subject}组织为一个可立即探索的对象场：访客先看见完整关系，再选择对象、理解差异并完成“${action}”。`,
    continuityRule: '环境坐标、对象身份、相对尺度与选中关系始终保持连续；队形、焦点、局部反馈和上下文信息必须来自同一选择状态。',
    typographyRole: 'DOM 只承担最小导航、对象名称、就近详情与最终行动；未选择时保持空间舞台主导，不生成卡片墙、参数侧栏或等高章节。',
    pointerRole: '指针、触摸和键盘用于探索与选择同一对象场；输入可以改变队形、焦点和局部材质反馈，但不能退化为无语义跟随。',
    reducedMotion: '保留同一稳定对象场、全部可聚焦对象、离散选择状态、上下文信息和最终行动；停止持续漂移、自动编队与惯性相机。',
    finalMemoryPoint: action,
    presentationStrategy: procedural3d ? 'procedural-field' : 'dom-led',
    beats: [
      beat('object-field-opening', 0, 'establish', '完整对象集合在同一空间中形成非均匀关系、清晰层级和可辨身份。', '先理解对象之间的整体关系，再开始探索。'),
      beat('object-field-exploration', .38, 'develop', '指针、触摸或键盘改变对象焦点、局部反馈和队形关系，完整舞台保持可见。', '在对象之间移动焦点，并发现可选择目标。'),
      beat('object-field-selection', .72, 'transform', '当前对象在原空间附近获得明确焦点，材料、差异或故事按需出现，其余对象仍保留关系。', '选择一个对象并理解它与集合的差异。'),
      beat('object-field-action', 1, 'resolve', `当前选择、对象关系和上下文信息保持稳定，并给出“${action}”。`, '核对当前对象后完成最终行动。')
    ],
    assets: [{
      id: 'object-field-subjects', role: 'subject', modality: 'procedural', required: true,
      minimumQuality: 'L3-presentable', sourcePriority: ['procedural'],
      visualResponsibility: `构建无需标题即可辨认的${subject}对象集合，并在同一空间中提供主题专属的深度、队形、焦点和局部材质反馈。`,
      continuityRule: '所有对象在 opening、exploration、selected 和 final 状态中保持身份、相对尺度与共享空间坐标；不以通用粒子、图标或换图冒充对象变化。',
      integration: 'native-procedural',
      visibleProof: '首屏可辨多个主题对象；指针、触摸或键盘选择后，同一对象场的焦点、队形、就近信息和行动状态同步变化。',
      fallback: 'dom-only'
    }]
  };
}

function branchingConfluencePlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure(
      'branching-confluence',
      '共享视觉场先建立选择，再只展开当前路线的主题专属后果；两条路线可独立重放并汇合到同一最终行动，不生成持久参数工作台、卡片目录或长滚动章节。'
    ),
    thesis: `把${subject}组织为一次可选择、可重放并能汇合的动态编排：访客先确定参与对象，再选择路线，看见同一主体产生不同后果，最终完成“${action}”。`,
    continuityRule: '入口、两条路线与汇合状态始终共享同一主体身份、空间坐标和观察关系；选择只能改变有因果依据的轨迹、关系、节奏与队形，不能替换主体或另开无关页面。',
    typographyRole: 'DOM 承担上下文选择、当前路线、结果说明和最终行动；选择控件只在决策时出现，不形成常驻参数侧栏、目录卡片或线性章节导航。',
    pointerRole: '指针、触摸和键盘依次完成对象选择与路线选择；两条路线都必须可返回、可重放，并驱动同一视觉锚点、结果与最终行动。',
    reducedMotion: '直接切换入口、选择、路线后果和汇合关键状态；保留两条路线的可见差异、返回重选、键盘路径和最终行动，停止自动循环与持续漂移。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('confluence-field', 0, 'establish', '全部参与对象从不同方向进入同一共享视觉场，核心主体、交接关系和最终行动目标建立清晰身份。', '理解共享场与核心主体，再进入第一次选择。'),
      beat('branch-subject-choice', .22, 'develop', '当前选择在共享场中获得明确身份与焦点，其余对象保留上下文，但不出现持久参数面板。', '用指针、触摸或键盘选择一个参与对象。'),
      beat('branch-route-choice', .44, 'develop', '两条内容明确的路线作为上下文决策出现；选择状态与核心主体、结果区域和返回入口共享同一数据源。', '选择其中一条路线，并可返回重选另一条。'),
      beat('branch-visible-consequence', .72, 'transform', '当前路线使同一主体的轨迹、关系、节奏和最终构图产生无需依赖文案即可辨认的差异；另一条路线可独立重放。', '检查当前路线的可见后果，再切换路线验证差异。'),
      beat('branch-confluence-action', 1, 'resolve', `两条路线汇合到同一结果与“${action}”，同时保留当前对象、所选路线及其可见后果。`, '确认路径历史和最终构图后完成行动。')
    ],
    assets: [{
      id: 'branching-confluence-field',
      role: 'subject',
      modality: 'procedural',
      required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['procedural'],
      visualResponsibility: `在同一动态构图中持续表现“${subject}”的参与对象、核心主体、两条路线、关系变化与汇合队形。`,
      continuityRule: '入口、路线 A、路线 B 与汇合状态共享同一主体身份、坐标、尺度和视觉语法；路线只改变由选择造成的轨迹、重叠、节奏与队形。',
      integration: 'native-procedural',
      visibleProof: '不阅读说明文字也能分辨两条路线造成的主体轨迹、关系或最终构图差异；返回重选后可复现，两条路线最终进入同一行动。',
      fallback: 'dom-only'
    }]
  };
}

function catalogPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure(
      'catalog',
      '多件条目以可筛选、可检查且可比较的目录关系共同出现；筛选保持对象身份，比较层按需出现，不生成中央单英雄或持久参数工作台。'
    ),
    thesis: `把${subject}组织为可直接浏览的多对象目录：先看见集合与差异，再筛选、检查、比较并完成“${action}”。`,
    continuityRule: '全部条目在总览、筛选、检查和比较中保持稳定身份、编号、相对尺度与选中关系；隐藏条目不得导致已选对象被静默替换。',
    typographyRole: 'DOM 承担目录语义、轻量筛选、条目名称、就近证据、按需比较和最终行动；不得生成持久参数侧栏或把集合压成单一英雄。',
    pointerRole: '指针、触摸和键盘用于检查、筛选与选择条目；同一选择状态必须驱动条目反馈、二选比较与最终行动，不能只改变高亮。',
    reducedMotion: '停止自动扫光、漂移或惯性过渡，保留完整目录、离散筛选、逐件检查、二选比较和最终行动；移动端转为纵向条目流。',
    finalMemoryPoint: action,
    presentationStrategy: 'dom-led',
    beats: [
      beat('catalog-overview', 0, 'establish', '完整条目集合同时建立可辨身份、编号、类别与可比较尺度。', '先浏览完整集合并理解可筛选、可检查和可比较的关系。'),
      beat('catalog-filter', .24, 'develop', '轻量筛选改变当前可见集合，但保留条目身份、已选状态与稳定阅读顺序。', '按类别或用途缩小范围，同时保留已经选择的条目。'),
      beat('catalog-inspect', .5, 'develop', '当前条目在原目录关系附近显示主题专属反馈与就近证据，其余条目仍保持上下文。', '用指针、触摸或键盘逐件检查差异。'),
      beat('catalog-compare', .76, 'transform', '最多两件已选条目以同一尺度和同一检查基线并排比较，差异与选择状态同步。', '选择两件条目并核对可见差异。'),
      beat('catalog-saved', 1, 'resolve', `当前筛选、二选组合与“${action}”保持一致，最终行动已准备。`, '确认当前组合并完成最终行动。')
    ],
    assets: []
  };
}

function editorialExplorationPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('editorial-flow', '按信息密度组织连续编辑版面；不为满足固定屏数制造空章节。'),
    thesis: `先把${subject}组织为清晰可读的编辑场，再按目标加入最小充分的视觉增强。`,
    continuityRule: '内容结构、视觉锚点和行动保持稳定；只有用户能够理解的选择或状态变化才改变画面。',
    typographyRole: 'DOM 承担完整信息层级、导航和行动；Canvas 或 Three.js 只补充主题所需的空间、材质或反馈。',
    pointerRole: '指针优先服务选择、检查和轻量反馈；没有明确语义时不创建跟随动画。',
    reducedMotion: '直接展示稳定主构图与离散状态，保留全部内容和行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'dom-led',
    beats: [
      beat('editorial-context', 0, 'establish', '建立主题、核心信息与唯一视觉锚点。', '浏览内容或选择明确入口。'),
      beat('editorial-action', 1, 'resolve', `证据和行动关系稳定，并给出“${action}”。`, '完成页面的主要行动。')
    ],
    assets: []
  };
}

function sonicEditorialPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('editorial-flow', '文字节奏、声音触发与章节状态共同组成一个连续排版场；声部数量来自内容，不制造参数侧栏或固定卡片章节。'),
    thesis: `让${subject}通过可读排版与可听状态共同显现，阅读、滚动和聆听属于同一叙事。`,
    continuityRule: '台词、声部、章节情绪、试听状态和最终行动必须来自同一目标状态；声音变化不能脱离文字与画面另行播放。',
    typographyRole: 'DOM 文字本身承担主视觉、阅读顺序与状态变化；Canvas 只补充声纹、纸面、光线或停顿节奏，不能创建中央产品或仪表盘。',
    pointerRole: '滚动、键盘或明确的声部按钮推进同一叙事状态；指针没有语义时不创建跟随动画。',
    reducedMotion: '390px 与 reduced-motion 首屏至少同时看见可辨认主标题、试听入口和第一个声部选择；其后按单列顺序抵达静音、音量、当前结果与保存行动。取消连续位移与自动演示，不允许横向裁切。',
    finalMemoryPoint: action,
    presentationStrategy: 'dom-led',
    beats: [
      beat('unfinished-line', 0, 'establish', '首屏主标题、未读完的台词、停顿、试听入口和第一个声部同时建立可阅读、可聆听的任务入口。', '阅读开场并由用户明确启动试听。'),
      beat('voices-emerge', .42, 'develop', '声部切换同步改变字距、标点、声纹线、章节情绪和可听结果。', '滚动、键盘或按钮比较至少两个声音状态。'),
      beat('night-composes', .74, 'transform', '文字、停顿和声音差异在同一排版场中形成完整章节关系。', '确认当前声部与视觉状态来自同一叙事状态。'),
      beat('quiet-save', 1, 'resolve', `声音停止争抢注意力，文字与行动稳定收束到“${action}”。`, '检查真实性说明后完成最终行动。')
    ],
    assets: []
  };
}

function callsignDecoderPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('editorial-flow', '点划时值、播放、原位译码、核对与保存组成一条连续排字谱；不制造设备 Hero、波形仪表盘或固定屏数。'),
    thesis: `让${subject}成为一张真正可听、可读、可输入的十秒排字谱，声音时值与字母揭示来自同一序列。`,
    continuityRule: '点划符号、合成音调、当前段、已揭示字母、解码输入、核对结果和保存卡必须由同一 canonical sequence 与有限状态驱动。',
    typographyRole: '语义 DOM 文字和 SVG 点划谱共同承担主视觉、播放时值、阅读顺序与答案揭示；不另建波形、参数面板或中央设备。',
    pointerRole: '试听、分段重播、提交与保存是有明确语义的直接操作；滚动只承担自然阅读，不能替代声音任务。',
    reducedMotion: '取消符号位移与连续伸展，保留播放状态、离散当前段、原位字母揭示、完整输入和保存行动；390px 以语义顺序折行且不横向裁切。',
    finalMemoryPoint: action,
    presentationStrategy: 'dom-led',
    beats: [
      beat('callsign-waiting', 0, 'establish', '明亮点划排字谱、虚构演示披露和唯一试听入口同时建立十秒任务。', '阅读任务并用试听按钮或输入框外空格键主动开始。'),
      beat('callsign-sounding', .22, 'develop', '当前点或划按真实时值发声并在原位获得可辨认状态，其余符号保持完整上下文。', '聆听完整呼号或选择一段重播。'),
      beat('callsign-decoding', .5, 'transform', '已播放段在原位置展开对应字母，但未提前暴露尚未聆听的答案。', '根据声音与已揭示证据输入完整呼号。'),
      beat('callsign-checked', .78, 'transform', '提交后在同一排字谱上显示正确或需重试的结果，并保留可重播入口。', '核对结果，必要时重播并再次提交。'),
      beat('callsign-saved', 1, 'resolve', `十秒排字谱收束为可恢复的练习记录，并给出“${action}”。`, '保存练习卡并确认当前会话结果。')
    ],
    assets: []
  };
}

function botanicalObservationPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('interactive-field', '完整植物标本、观察工具、当前任务、结构证据和最终行动保持在同一持续观察桌；标本状态不是分页，也不按固定屏数展开。'),
    thesis: `把${subject}变成可以动手检查的自然学习工具：选择与放大动作必须在同一标本上揭示可理解的植物证据。`,
    continuityRule: '完整叶片、种子、根系、放大镜和观察坐标始终属于同一张标本桌；选择只改变当前标本、局部结构证据、任务和结果。',
    typographyRole: 'DOM 承担标本名称、观察任务、教学说明和最终行动；SVG 或 Canvas 承担完整标本、放大镜与局部结构证据。',
    pointerRole: '指针或触摸直接移动放大镜；标本按钮与键盘提供等价选择，禁止无语义跟随和自动长滚动。',
    reducedMotion: '直接切换稳定标本与离散放大状态，取消持续漂移；390px 仍保留完整标本、选择、证据和行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('specimen-table', 0, 'establish', '完整叶片、种子、根系与放大镜建立明亮、可辨认的桌面观察坐标。', '选择一个标本或用键盘进入第一个观察任务。'),
      beat('lens-evidence', .56, 'transform', '放大镜在同一标本上揭示叶脉结构、含水量和生长阶段证据，任务与结果同步更新。', '拖动、触摸或使用键盘检查局部结构并比较标本。'),
      beat('observation-ready', 1, 'resolve', `当前标本、观察证据和任务摘要保持可见，并给出“${action}”。`, '核对观察结果后完成最终行动。')
    ],
    assets: [{
      id: 'botanical-specimen-field', role: 'subject', modality: 'procedural', required: true,
      minimumQuality: 'L3-presentable', sourcePriority: ['procedural'],
      visualResponsibility: '构建无需标题即可辨认的完整叶片标本、种子、根系、可移动放大镜和主题专属局部结构证据。',
      continuityRule: '所有状态共享同一标本桌、完整叶片轮廓、放大镜和观察坐标；不得用换图、纯换色、文字或通用图形冒充观察变化。',
      integration: 'native-procedural',
      visibleProof: '选择标本或移动放大镜后，同一标本上的叶脉、含水量和生长阶段证据与任务结果同步变化；390px 可完成同一任务。',
      fallback: 'dom-only'
    }]
  };
}

function causalSimulationPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('interactive-field', '同一主体、参数控制、可见结果、解释和最终行动保持在一个持续实验工作区；参数状态不是分页，也不按固定屏数展开。'),
    thesis: `把${subject}变成可操作、可观察且诚实标注的模拟实验；每次输入都必须在同一主体或场景中形成可归因结果。`,
    continuityRule: '始终保持同一主体、观察坐标与环境基线；只允许合同声明的参数、可见结果、解释和比较状态同步变化。',
    typographyRole: 'DOM 承担参数、结果、模拟说明和最终行动；Canvas 或 Three.js 承担同一主体、空间关系和可见因果反馈。',
    pointerRole: '指针、触摸和键盘直接调整参数或比较状态；所有输入必须同步改变主体/场景、结果和解释，禁止装饰性跟随。',
    reducedMotion: '参数变化直接切换或短暂插值到目标状态，停止自动相机与持续漂移，但保留完整控制、结果、解释和行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('simulation-baseline', 0, 'establish', '同一主体、环境基线和初始参数建立可辨认的实验坐标。', '确认对象和初始状态，开始调整主要参数。'),
      beat('causal-response', .56, 'transform', '主要参数同步改变同一主体或场景、可见结果与解释，变化无需依赖数字也能辨认。', '调整或比较状态，并核对画面与结果是否一致。'),
      beat('observation-saved', 1, 'resolve', `当前模拟保持最终状态、结果摘要和诚实说明，并给出“${action}”。`, '核对模拟结果后完成最终行动。')
    ],
    assets: [{
      id: 'causal-simulation-field', role: 'subject', modality: 'procedural', required: true,
      minimumQuality: 'L3-presentable', sourcePriority: ['procedural'],
      visualResponsibility: `构建无需标题即可辨认的${subject}，并让主要参数在同一主体或场景中形成明确可见结果。`,
      continuityRule: '所有状态共享同一主体、观察坐标和环境基线；不得用换图、文案、箭头或随机装饰冒充状态变化。',
      integration: 'native-procedural',
      visibleProof: '操作主要参数后，显式视觉锚点、结果值和解释同时变化；移动端可完成同一任务。',
      fallback: 'procedural-atmosphere'
    }]
  };
}

function utilityDiagnosticPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('task-flow', '以任务完成所需的选择、检查、验证和行动组织界面；状态可在同一工作区切换。'),
    thesis: `把${subject}组织为可选择、可检查、能据此行动的明亮工具页。`,
    continuityRule: '同一对象与部件关系保持稳定；用户选择只改变故障证据、检查顺序、安全提示和当前工作阶段。',
    typographyRole: 'DOM 承担可读步骤、状态、警告和行动；程序化示意只解释部件关系，不替代文本证据。',
    pointerRole: '指针、触摸与键盘用于选择语义状态；不得退化为装饰性跟随。',
    reducedMotion: '直接切换诊断、拆解和测试关键状态，停止惯性与持续旋转，但保留所有操作和结果。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('diagnose', 0, 'establish', '建立对象、症状选项和当前检查对象。', '选择最接近的故障症状。'),
      beat('inspect', .55, 'transform', '同一对象展开必要部件，并同步更新步骤、安全与难度。', '查看或切换工作阶段。'),
      beat('act', 1, 'resolve', `对象回到可理解状态，并给出“${action}”。`, '确认结果并完成最终行动。')
    ],
    assets: []
  };
}

function positiveBriefForRouting(brief: string) {
  const clauses = brief.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean);
  const negativeMarker = /(?:^|[，,：:\s])(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不要求|不支持|不提供|不能|不应|不是|并非|不做成|不做(?=\s*参数工作台))/;
  const positive = clauses
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return marker ? clause.slice(0, marker.index).trim() : clause;
    })
    .filter(Boolean);
  return positive.length ? positive.join('。') : brief;
}

function informationMapPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'editorial-field',
    structure: structure('interactive-field', '地图与证据面板保持为同一持续工作区；站点选择改变状态，不制造一站一页。'),
    thesis: `把${subject}组织为可浏览、可选择、能用证据做决定的信息地图。`,
    continuityRule: '地点决策型主题优先使用真实地理底图；底图投影、站点经纬度、证据数据和选中路线必须共享同一数据源并保持一一对应。演示站点必须明确标注，不得伪装成真实公共设施。',
    typographyRole: '文字承担地点名称、证据数值和行动；地图与图册排版共同建立浏览方向。',
    pointerRole: '指针或触摸用于选择站点并同步更新证据，不承担装饰性跟随动画。',
    reducedMotion: '保留横向浏览和站点离散切换，取消惯性漂移与大幅视差。',
    finalMemoryPoint: action,
    presentationStrategy: 'dom-led',
    beats: [
      beat('map-overview', 0, 'establish', '明亮地图建立街区、站点分布和当前选区。', '横向浏览街区或直接选择站点。'),
      beat('station-evidence', .55, 'transform', '当前站点的证据、距离和状态与地图标记同步更新。', '比较信息后确认最合适的站点。'),
      beat('nearest-action', 1, 'resolve', `地图收束到最优站点，并给出“${action}”。`, '打开路线或完成最终行动。')
    ],
    assets: [{
      id: 'map-evidence-field', role: 'information', modality: 'texture', required: false,
      minimumQuality: 'L2-inspectable', sourcePriority: ['licensed', 'curated-library', 'procedural'],
      visualResponsibility: '地点决策型主题优先使用带授权与署名的真实地理底图，并叠加真实地标、站点编码、当前位置和选中路线；若只能使用程序化回退，必须标注为示意地图并保留道路层级、街区或水系。随机线条或抽象曲线不能替代地图结构。',
      continuityRule: '底图投影、Canvas 标记和路线与 DOM 站点 ID、经纬度、距离、状态和证据字段必须共享同一数据源与同一坐标变换；演示数据必须显式披露。',
      integration: 'seamless-field',
      visibleProof: '首屏无需说明即可识别真实区域与地标并看见地图署名；选择任一站点后，站点编码、高亮路线与水质、距离、开放状态同步变化。',
      fallback: 'dom-only'
    }]
  };
}

function horizontalPanoramaMapPlan(subject: string, action: string): PatternPlan {
  const mapPlan = informationMapPlan(subject, action);
  return {
    ...mapPlan,
    structure: structure(
      'horizontal-panorama',
      '真实地图、地标热点与当前地点结果保持在一张可横向穿行的连续图卷中；所有输入共享同一横向位置，不拆成地标分页或持久工作台。'
    ),
    thesis: `把${subject}组织为一张基于真实地理关系、可连续横向穿行并能完成“${action}”的地图或图卷。`,
    continuityRule: '带署名且可追溯的真实地图、地标坐标、热点、地点事实和当前结果必须共享同一坐标变换；横向穿行只改变同一图卷的位置，不得换成彼此断开的地图。缺少事实来源的建议与路线必须明确披露。',
    typographyRole: '文字贴近当前地标承担名称、地点事实、来源与演示披露；真实地图和定位关系始终保持第一记忆点。',
    pointerRole: 'brief 指定的横向输入只改变同一个规范化横向位置；地标选择同步更新真实热点、地点事实与当前结果。',
    reducedMotion: '取消惯性与连续漂移，保留离散地标跳转、完整真实地图关系、地点状态更新与最终行动。',
    beats: [
      beat('panorama-opening', 0, 'establish', '带署名且可追溯的真实地图与 brief 指定地标在同一张横向图卷中建立完整地域关系。', '确认真实地图、地标与来源披露，开始横向穿行。'),
      beat('panorama-traverse', .36, 'develop', 'brief 指定的横向输入共同改变同一个规范化位置，真实地图与地标坐标保持连续。', '沿连续真实地图前往下一个地标。'),
      beat('panorama-landmark', .72, 'transform', '当前真实热点、地标事实与地点结果在对应位置附近同步更新。', '选择并确认符合当前目标的地标。'),
      beat('panorama-action', 1, 'resolve', `同一图卷保留已选地标、事实来源与必要披露，并给出“${action}”。`, '核对当前地点结果后完成最终行动。')
    ],
    assets: mapPlan.assets.map((asset) => ({
      ...asset,
      required: true,
      sourcePriority: ['curated-library', 'licensed'],
      visualResponsibility: '使用 brief 要求的带署名且可追溯的真实地图作为连续底图，并以可信坐标承载指定地标；不得用抽象线条、虚构街区或彼此断开的地图切片替代。',
      continuityRule: '真实地图、热点、横向位置、地标 ID、地点事实与当前结果共享同一数据源和同一坐标变换；缺少事实来源的建议与路线必须显式披露。',
      visibleProof: '首屏无需说明即可识别真实地图、指定地标与来源署名；横向穿行和选择地标后，热点、地点事实与当前结果同步变化。',
      fallback: 'block'
    }))
  };
}

function spatialInspectionPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'spatial-exploration',
    structure: structure(
      'spatial-inspection',
      '同一可追溯动画模型持续占据空间主舞台；离散动作选择只切换模型实际包含的命名剪辑，并让镜头、空间证据、说明与最终结果共享同一状态。'
    ),
    thesis: `把${subject}组织为一次可验证的动作观察：访客检查同一模型的真实剪辑差异，并据此完成“${action}”。`,
    continuityRule: '全部动作状态必须共享同一模型文件、骨骼、材质、比例、落地点与观察坐标；只允许实际命名剪辑、受控镜头和由同一状态派生的空间证据发生变化。',
    typographyRole: '语义 DOM 承担可聚焦的动作选择、当前剪辑名称、观察说明、真实性披露与最终行动；文字不得遮挡模型定义性轮廓。',
    pointerRole: '指针、触摸与键盘用于选择命名动作或克制调整观察角；不得用 hover、任意速度变化或无语义自动旋转冒充动作差异。',
    reducedMotion: '默认停止自动镜头与循环播放，以离散动作静帧、可选的用户触发播放和完整语义说明保留同一观察任务；移动端不得只裁切桌面画布。',
    finalMemoryPoint: action,
    presentationStrategy: 'model-spatial',
    beats: [
      beat('inspection-opening', 0, 'establish', '通过来源与质量门禁的动画模型在清楚环境中建立完整轮廓、落地点和观察尺度。', '确认模型来源、动作范围与演示边界，进入动作选择。'),
      beat('inspection-choice', .3, 'develop', '语义控件列出模型实际包含且通过核验的命名动作剪辑，当前选择清楚可见。', '用指针、触摸或键盘选择一个真实命名动作。'),
      beat('inspection-evidence', .7, 'transform', '同一模型播放当前真实剪辑，受控镜头、空间证据和动作说明由同一选择状态同步更新。', '比较动作节奏与空间证据，并切换另一动作复核差异。'),
      beat('inspection-action', 1, 'resolve', `同一模型、已选动作、观察摘要和真实性披露保持可见，并给出“${action}”。`, '核对当前观察结果后完成最终行动。')
    ],
    assets: [{
      id: 'animated-spatial-model',
      role: 'subject',
      modality: 'model-3d',
      required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['licensed', 'user-supplied', 'curated-library'],
      visualResponsibility: `以来源、许可和字节均可追溯的动画 GLB/glTF 承担“${subject}”的完整身份、骨骼、材质和真实命名动作剪辑。`,
      continuityRule: '所有动作共享同一模型、骨骼、材质、比例、落地点和观察坐标；切换必须激活模型 animations 中实际存在的命名剪辑，不得伪造缺失动作。',
      integration: 'spatial-object',
      visibleProof: '最终浏览器能证明真实模型成功加载、实际剪辑名通过核验，且每个声明动作会在同一主体上播放对应剪辑并同步更新观察证据。',
      fallback: 'block'
    }]
  };
}

function environmentalMemoryPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'environmental-memory',
    structure: structure('continuous-canvas', '让同一空间承担朦胧、聚合、可探索与行动状态；DOM 区块不必与状态一一对应。'),
    thesis: `让${subject}从朦胧环境中逐步形成可理解、可停留的记忆空间。`,
    continuityRule: '所有关键状态必须保持同一地点、主体、光向和可追踪空间坐标。',
    typographyRole: '文字以低密度注释和最终行动出现，不切断环境连续性。',
    pointerRole: '指针只产生轻微视差和局部清晰度变化，不改变叙事方向。',
    reducedMotion: '使用同一空间的若干稳定清晰度状态和交叉淡化，取消连续位移。',
    finalMemoryPoint: action,
    presentationStrategy: 'full-bleed-environment',
    beats: [
      beat('waking-haze', 0, 'establish', '同一环境处于刚醒来的低对比和浅景深状态。', '滚动开始恢复空间坐标。'),
      beat('memory-fragments', .34, 'develop', '可辨认碎片在同一空间中出现，并保留可追踪的位置关系。', '继续滚动确认哪些碎片属于同一段记忆。'),
      beat('memory-forms', .68, 'transform', '碎片形成可探索的空间，主体关系逐渐明确。', '在同一空间中停留或检查关键记忆。'),
      beat('quiet-record', 1, 'resolve', `环境安静稳定，视觉焦点收束到“${action}”。`, '停止主要运动并留下清晰行动。')
    ],
    assets: [{
      id: 'continuity-environment', role: 'environment', modality: 'image-sequence', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: '提供同一真实空间从朦胧到清晰的连续环境证据。',
      continuityRule: '序列必须共享地点、机位、主体位置、光向和时间感。',
      integration: 'full-bleed-environment',
      visibleProof: '所有合同派生的关键状态均能识别为同一空间的连续变化。',
      fallback: 'static-image'
    }]
  };
}

function spatialExplorationPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'spatial-exploration',
    structure: structure('guided-sequence', '按真实空间关系组织入口、阈值、证据与结论；每个节点长度由探索任务决定。'),
    thesis: `把${subject}组织成一次有坐标、有证据、有终点的空间探索。`,
    continuityRule: '入口、内部与终点必须能从镜头方向和共享地标判断为空间连续关系。',
    typographyRole: 'DOM 负责位置说明、证据和选择；不覆盖空间主路径。',
    pointerRole: '指针只用于近距离检查、热点提示或轻微观察角变化。',
    reducedMotion: '保持入口、证据和终点三张稳定空间构图，通过导航直接切换。',
    finalMemoryPoint: action,
    presentationStrategy: 'layered-depth',
    beats: [
      beat('spatial-coordinate', 0, 'establish', '远景建立地点、尺度和入口方向。', '滚动使镜头接近清晰地标。'),
      beat('threshold', .3, 'develop', '穿过入口或边界，确认空间关系正在发生变化。', '继续推进到核心证据区域。'),
      beat('evidence-field', .68, 'transform', '档案、数据或主题证据在空间中形成可选择关系。', '浏览或选择一条理解路径。'),
      beat('shared-conclusion', 1, 'resolve', `空间在共同结论处稳定，并给出“${action}”。`, '从探索返回明确行动。')
    ],
    assets: [{
      id: 'spatial-environment', role: 'environment', modality: 'image-sequence', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: '建立入口、内部证据区和终点之间可辨认的空间连续性。',
      continuityRule: '关键地标、光线、尺度和观察方向必须在所有状态中保持一致。',
      integration: 'full-bleed-environment',
      visibleProof: '三段截图能指出共享地标，并能解释镜头从哪里移动到哪里。',
      fallback: 'static-image'
    }, {
      id: 'evidence-layer', role: 'information', modality: 'transparent-image', required: false,
      minimumQuality: 'L2-inspectable',
      sourcePriority: ['user-supplied', 'curated-library', 'procedural'],
      visualResponsibility: '提供档案、数据或路线的真实内容证据，而非装饰符号。',
      continuityRule: '证据层必须锚定在明确空间位置，并与 DOM 说明保持一一对应。',
      integration: 'alpha-subject',
      visibleProof: 'middle 截图中至少一个证据节点可读且不遮挡空间主线。',
      fallback: 'dom-only'
    }]
  };
}

function materialTransformationPlan(brief: string, subject: string, action: string): PatternPlan {
  const isLayeredPrint = includesAny(brief.toLowerCase(), ['木版', '版画', '套印', '墨层', '压印', '印刷', 'woodblock', 'printmaking']);
  const beats: PatternPlan['beats'] = isLayeredPrint
    ? [
        beat('paper-ready', 0, 'establish', '同一张未落墨的纸与工作台建立材质、尺度和光线。', '靠近纸面并确认纤维与留白。'),
        beat('pressure-trace', .2, 'develop', '木版压力在同一张纸上留下压痕和纤维变化。', '继续推进第一次真实接触。'),
        beat('indigo-layer', .46, 'develop', '靛蓝墨层沿同一套印坐标压入纸面。', '观察墨色与纸纤维的吸收关系。'),
        beat('vermilion-register', .72, 'transform', '朱红套色落下并保留轻微错版证据。', '比较两层墨色和套准关系。'),
        beat('finished-imprint', 1, 'resolve', `完整作品稳定显现，并收束到“${action}”。`, '停止主要运动，观察成品并完成行动。')
      ]
    : [
        beat('material-seed', 0, 'establish', '主体以克制轮廓和初始材质进入全屏场域。', '滚动开始揭示内部结构。'),
        beat('material-change', .48, 'transform', '材质、纤维或液态层次在同一主体上连续转化。', '继续滚动观察结构如何形成。'),
        beat('hero-form', 1, 'resolve', `最终形态稳定为完整英雄构图，并收束到“${action}”。`, '运动减弱，允许观察和行动。')
      ];
  return {
    pattern: 'material-transformation',
    structure: structure('continuous-canvas', '同一主体在持续画布中经历由材料工序决定的状态；状态数量不等于页面数量。'),
    thesis: `让${subject}通过材质和形态的连续变化显现，而不是更换无关联画面。`,
    continuityRule: '主体轮廓、材质血缘和光色关系必须跨状态保持可识别。',
    typographyRole: '文字承担编辑节奏和少量语义锚点，始终给主体留出呼吸区域。',
    pointerRole: '指针只影响折射、表面光泽或微小形变，不能拖着主体追逐鼠标。',
    reducedMotion: '固定最终英雄构图，只保留低频材质呼吸和内容切换。',
    finalMemoryPoint: action,
    presentationStrategy: 'material-refraction',
    beats,
    assets: [{
      id: 'material-subject', role: 'subject', modality: 'transparent-image', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: '承担主体轮廓、材质细节和最终英雄识别。',
      continuityRule: '透明边缘必须自然，主体不能带棋盘格、矩形底或不一致光源。',
      integration: 'alpha-subject',
      visibleProof: 'opening 与 ending 均能识别同一主体，且画面中没有可见矩形边界。',
      fallback: 'static-image'
    }]
  };
}

function materialExperimentPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'material-transformation',
    structure: structure('interactive-field', '同一只器物、配方控制、结果解释和保存行动保持在一个持续实验工作区；配方状态不是分页，也不按固定屏数展开。'),
    thesis: `把${subject}变成可操作的材料实验：每次配方与温度变化都必须在同一器物表面留下可解释的结果。`,
    continuityRule: '始终保持同一只陶瓷器物、同一观察角和同一日光方向；只允许釉色、光泽、细裂纹、流釉边界和烧成结果随参数发生有因果的变化。',
    typographyRole: 'DOM 承担配方数值、温度、材料解释和保存行动；三维器物承担颜色、光泽、裂纹与流釉边界的可见结果。',
    pointerRole: '指针、触摸和键盘直接调整配方与温度；所有输入都必须同步改变器物表面、数值和结果解释，禁止装饰性跟随。',
    reducedMotion: '参数变化直接切换或短暂插值到目标材质状态，停止自动旋转和持续漂移，但保留完整控制、结果解释和保存行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'material-refraction',
    beats: [
      beat('raw-clay', 0, 'establish', '同一只未烧制器物与日光材料实验桌建立形体、尺度和初始表面。', '确认器物与基础配方，开始调整材料比例。'),
      beat('mixture-response', .36, 'develop', '氧化铁、长石和灰釉比例同步改变同一器物的色相、透明度与流动倾向。', '调整任一比例并对照数值、器物表面和结果解释。'),
      beat('kiln-result', .72, 'transform', '烧成温度进一步改变光泽、细裂纹密度和流釉边界，形成可比较的结果。', '选择温度并检查材料变化是否符合预期。'),
      beat('saved-formula', 1, 'resolve', `当前器物保持最终釉色，配方摘要稳定并给出“${action}”。`, '核对配方与结果后保存本次实验。')
    ],
    assets: []
  };
}

function stageLightingWorkspacePlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'product-atmosphere',
    structure: structure('interactive-field', '同一黑盒舞台、灯位、光束控制、cue 与保存行动保持在一个持续排练工作区；状态不是分页，也不按固定屏数展开。'),
    thesis: `把${subject}变成可操作的舞台灯光排练：每次灯位与 cue 变化都必须在同一舞台上形成可验证的光照结果。`,
    continuityRule: '始终保持同一舞台坐标、灯具编号和表演区；只允许光束方向、锥角、颜色、阴影、亮度与 cue 状态随控制发生有因果的变化。',
    typographyRole: 'DOM 承担灯具选择、角度、亮度、色片、cue、照度证据和保存行动；三维舞台承担光束、落点、阴影与空间关系。',
    pointerRole: '指针、触摸和键盘直接操作灯具与 cue；所有输入必须同步改变舞台光照、可见读数和结果说明，禁止装饰性跟随。',
    reducedMotion: '直接切换到目标灯位与 cue，停止自动相机和持续扫光，但保留光束落点、读数、控制和保存行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('stage-rig', 0, 'establish', '同一黑盒舞台、表演区与三盏灯建立清晰灯位和工作灯基线。', '选择一盏灯，开始调整它在同一舞台上的照明关系。'),
      beat('focus-response', .38, 'develop', '俯仰、方位、光束角、亮度与色片同步改变光束、落点、阴影和照度。', '调整任一灯光参数，并对照舞台结果与可见读数。'),
      beat('cue-rehearsal', .72, 'transform', '排练 cue 在同一灯位拓扑上切换组合状态，并明确当前场景意图。', '切换 cue，检查多灯组合是否形成预期舞台焦点。'),
      beat('lighting-saved', 1, 'resolve', `当前舞台保持最终 cue，灯位摘要稳定并给出“${action}”。`, '核对灯位、照度和 cue 后保存第一幕方案。')
    ],
    assets: [{
      id: 'stage-lighting-field', role: 'environment', modality: 'procedural', required: true,
      minimumQuality: 'L3-presentable', sourcePriority: ['procedural'],
      visualResponsibility: '构建可辨认的黑盒舞台、表演区、三盏灯、体积光束、落点和阴影关系。',
      continuityRule: '所有状态共享同一舞台坐标、灯具编号和表演区，参数只改变对应灯具的真实光照结果。',
      integration: 'native-procedural',
      visibleProof: '无需说明即可识别舞台与三盏灯；调整参数后光束方向、宽度、颜色、落点与阴影同步变化。',
      fallback: 'procedural-atmosphere'
    }, {
      id: 'lighting-evidence', role: 'information', modality: 'procedural', required: false,
      minimumQuality: 'L2-inspectable', sourcePriority: ['procedural'],
      visualResponsibility: '提供与灯具和 cue 同源的角度、亮度、色片与照度读数。',
      continuityRule: '每个可见读数必须与对应控制值及舞台结果共享同一状态，不伪装为真实测光数据。',
      integration: 'native-procedural',
      visibleProof: '操作灯具或 cue 后，控件值、照度读数、状态说明和舞台光照同时更新。',
      fallback: 'dom-only'
    }]
  };
}

function spatialSetupWorkspacePlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'product-atmosphere',
    structure: structure('interactive-field', '同一真实空间、待摆放设备、目标平面、参数控制、结果解释与保存行动保持在一个持续校准工作区；不按固定屏数分页。'),
    thesis: `把${subject}变成可操作的空间摆放助手：每次位置参数和环境模式变化都必须在同一空间中形成可验证结果。`,
    continuityRule: '始终保持同一房间坐标、设备、目标墙面和观察方向；只允许设备位置、投射几何、环境光、可读结果与推荐状态随控制发生有因果的变化。',
    typographyRole: 'DOM 承担距离、高度、偏角、环境模式、估算说明、推荐结果和保存行动；三维场景承担设备—投射锥体—目标平面的空间关系。',
    pointerRole: '指针、触摸和键盘直接调整空间参数与环境模式；所有输入必须同步改变场景、数值与推荐，禁止装饰性跟随或隐式自动循环。',
    reducedMotion: '参数变化直接切换或短暂插值到目标空间状态，停止自动相机与持续漂移，但保留完整控制、场景关系、结果和保存行动。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('room-baseline', 0, 'establish', '同一真实房间、设备、目标墙面和初始投射关系建立清晰空间坐标。', '先看懂设备、距离和目标画面的关系。'),
      beat('placement-response', .45, 'transform', '距离、高度和偏角同步改变设备位置、投射锥体、目标画面几何与可读估算。', '调整任一空间参数并核对场景与指标变化。'),
      beat('environment-check', .72, 'develop', '环境模式改变同一房间的环境光和投影可读性，并更新推荐解释。', '切换真实使用环境，比较当前摆放是否合适。'),
      beat('placement-saved', 1, 'resolve', `当前空间保持最终参数和推荐状态，并给出“${action}”。`, '核对关系和建议后保存推荐位置。')
    ],
    assets: [{
      id: 'spatial-setup-field', role: 'environment', modality: 'procedural', required: true,
      minimumQuality: 'L3-presentable', sourcePriority: ['procedural'],
      visualResponsibility: '构建可辨认的真实房间、待摆放设备、目标墙面、投射锥体与目标画面，直接解释空间摆放关系。',
      continuityRule: '所有状态共享同一房间坐标、设备、目标平面和观察方向；参数只改变对应的真实几何、光照与推荐结果。',
      integration: 'native-procedural',
      visibleProof: '无需标题即可辨认设备与目标平面；调整距离、高度或偏角后，设备位置、投射关系、目标画面和指标同步变化。',
      fallback: 'procedural-atmosphere'
    }, {
      id: 'placement-evidence', role: 'information', modality: 'procedural', required: false,
      minimumQuality: 'L2-inspectable', sourcePriority: ['procedural'],
      visualResponsibility: '提供与空间状态同源的距离、偏移、目标画面、亮度或可用性估算，并明确标注演示估算。',
      continuityRule: '每个读数与对应控制、场景几何和推荐状态共享同一数据源，不伪装成真实测量或产品规格。',
      integration: 'native-procedural',
      visibleProof: '操作空间参数或环境模式后，控件值、场景、估算说明和推荐状态同时更新。',
      fallback: 'dom-only'
    }]
  };
}

function productAtmospherePlan(brief: string, subject: string, action: string): PatternPlan {
  const positiveBrief = positiveBriefForRouting(brief).toLowerCase();
  const needsModel = hasExplicitInspectableModelAssetIntent(positiveBrief);
  const authorGeneratedModel = needsModel && includesAny(positiveBrief, [
    '概念设计演示', '概念产品', '虚构产品', 'concept design', 'fictional product'
  ]);
  return {
    pattern: 'product-atmosphere',
    structure: structure('guided-sequence', '围绕产品的使用情境、可见能力和行动组织非均匀节点；不把每项卖点拆成整屏。'),
    thesis: `先建立${subject}的使用情绪，再用可见状态解释能力，最终留下明确行动。`,
    continuityRule: '同一产品必须贯穿全部关键状态，比例、材质和环境光不能突然改变。',
    typographyRole: '文字负责产品价值和行动，不承担本应由产品状态表达的视觉变化。',
    pointerRole: '指针用于克制的材质反馈或观察角变化，不允许无目标追随。',
    reducedMotion: '使用产品的开场、能力和完成三个稳定状态，取消持续旋转和大幅视差。',
    finalMemoryPoint: action,
    presentationStrategy: needsModel ? 'model-spatial' : 'layered-depth',
    beats: [
      beat('product-context', 0, 'establish', '产品在真实使用环境中成为唯一明确主体。', '滚动开始靠近产品及其使用情境。'),
      beat('product-anchor', .3, 'develop', '产品轮廓、材质和操作关系变得清晰。', '继续滚动进入核心能力。'),
      beat('capability-visible', .68, 'transform', '声场、光线、内部结构或状态变化解释核心能力。', '观察能力造成的可见后果。'),
      beat('product-resolve', 1, 'resolve', `产品回到稳定英雄状态，并明确“${action}”。`, '主要运动停止，完成行动。')
    ],
    assets: [{
      id: 'hero-product', role: 'subject', modality: needsModel ? 'model-3d' : 'transparent-image', required: true,
      minimumQuality: needsModel && !authorGeneratedModel ? 'L4-cinematic' : 'L3-presentable',
      sourcePriority: needsModel
        ? authorGeneratedModel
          ? ['author-generated', 'user-supplied', 'curated-library']
          : ['user-supplied', 'curated-library']
        : ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: '承担产品识别、比例、主要材质和最终英雄构图。',
      continuityRule: '所有状态必须是同一产品，不更换轮廓、不拆成无关零件。',
      integration: needsModel ? 'spatial-object' : 'alpha-subject',
      visibleProof: 'opening、middle、ending 均能识别同一产品，且 middle 显示真实能力状态。',
      fallback: needsModel ? 'block' : 'static-image'
    }, {
      id: 'product-atmosphere', role: 'atmosphere', modality: 'procedural', required: false,
      minimumQuality: 'L2-inspectable', sourcePriority: ['procedural'],
      visualResponsibility: '把声音、能量、雨、空气或光等不可见能力转成克制的空间反馈。',
      continuityRule: '氛围必须从产品位置或使用情境产生，不能成为独立装饰层。',
      integration: 'native-procedural',
      visibleProof: 'middle 截图能说明氛围变化与产品能力之间的因果关系。',
      fallback: 'dom-only'
    }]
  };
}

function continuousScrollPlan(subject: string, action: string): PatternPlan {
  return {
    pattern: 'continuous-scroll',
    structure: structure('continuous-canvas', '以一个连续时间轴驱动主题状态；语义节点只是时间锚点，不是三个页面。'),
    thesis: `用一次连续状态变化建立${subject}的情绪、证据和行动。`,
    continuityRule: '核心主体和空间坐标保持连续，只改变理解所需的状态。',
    typographyRole: 'DOM 负责阅读与行动，避免文字和 WebGL 同时争夺焦点。',
    pointerRole: '指针只提供轻微空间反馈，主要叙事由滚动进度驱动。',
    reducedMotion: '把连续时间轴压缩为最少且足够的静态关键状态。',
    finalMemoryPoint: action,
    presentationStrategy: 'procedural-field',
    beats: [
      beat('baseline', 0, 'establish', '建立主体、环境和情绪基线。', '滚动进入核心变化。'),
      beat('evidence', .58, 'transform', '一个可观察的状态变化解释核心价值。', '继续滚动确认变化结果。'),
      beat('conclusion', 1, 'resolve', `画面形成更强的最终状态，并给出“${action}”。`, '主要运动停止并允许行动。')
    ],
    assets: []
  };
}

function acceptanceChecks(
  hasRequestedAssets: boolean,
  hasArticulatedSubject = false,
  hasSharedStateDriver = false,
  hasProductSemanticFeedback = false,
  hasBranchingConfluence = false,
  hasSpatialProductTopology = false,
  spatialInspectionClipNames: readonly string[] | null = null
): V2CreativeContract['acceptance'] {
  const spatialClipExpectation = spatialInspectionClipNames?.length
    ? `声明的 ${spatialInspectionClipNames.join('、')}`
    : '用户声明的每个真实命名剪辑';
  return [
    { id: 'intent-visible', priority: 'blocker', assertion: '首屏和终点能够对应原始主体、情绪变化和最终行动；不了解行业背景的用户也能在约 10 秒内识别核心对象、可执行操作和操作后的业务结果。', evidence: 'screenshot-ending' },
    { id: 'visual-anchor-specific', priority: 'blocker', assertion: '首屏存在与 brief 直接相关且无需依赖标题即可辨认的视觉锚点；纯色、通用网格、无主题依据的渐变、随机粒子或无关几何不能单独充当主视觉。', evidence: 'screenshot-opening' },
    ...(hasRequestedAssets ? [{
      id: 'asset-visible', priority: 'blocker' as const,
      assertion: '所有 required 素材都已成功请求，并在声明状态承担可辨认的视觉职责。', evidence: 'asset-request' as const
    }] : []),
    ...(hasArticulatedSubject ? [{
      id: 'articulated-causality', priority: 'blocker' as const,
      assertion: '至少一个过程状态中有三个部件组呈现可辨认的错峰关系，结构变化能够解释主题而不是只做装饰。', evidence: 'screenshot-beat' as const
    }] : []),
    { id: 'opening-composed', priority: 'high', assertion: '首屏存在明确主体和空间坐标，没有空黑屏、文字裁切或主体被遮挡。', evidence: 'screenshot-opening' },
    { id: 'process-causal', priority: 'blocker', assertion: '主要输入、主要参数或高层操作必须通过同一目标状态依次驱动 data-signal-visual-anchor 中同一主体的可见变化、data-signal-primary-result 的业务结果与 data-signal-primary-action 的最终行动；真实滑杆、按钮或选择器还必须标记 data-signal-primary-control。文案、数字、active class、裁切跳变、镜头切换、整体缩放、透明度或模糊不能冒充因果变化。', evidence: 'screenshot-beat' },
    {
      id: spatialInspectionClipNames
        ? 'spatial-animation-evidence'
        : hasSpatialProductTopology
          ? 'spatial-topology-evidence'
          : 'semantic-state-consistent',
      priority: spatialInspectionClipNames || hasSpatialProductTopology ? 'blocker' : 'high',
      assertion: spatialInspectionClipNames
        ? `必须从 GLB/glTF animations 核验${spatialClipExpectation}，每个可聚焦动作按钮一对一激活对应 clip，并由同一选择状态同步模型、镜头、空间证据、动作说明和最终结果；界面同时披露这是模型动作演示而非野外测量或事实观测数据。缺失任一声明 clip 时阻断验收。`
        : hasSpatialProductTopology
          ? '必须只创建一次同一具名产品装配树；至少两个姿态通过复用节点的局部变换产生可验证的部件世界坐标、连接距离或可见性差异，orbit、剖视或背面检查能证明遮挡与内部关系。切换姿态不得重建几何；概念模型必须明确披露且 WebGL 失败时保留同状态语义图。'
        : hasSharedStateDriver
        ? '演示、滚轮和直接控件必须写入同一规范化状态，主体、场景、可见数值和结果解释从该状态派生；播放、暂停、重置与首次人工接管均可验证，不能形成并行时间线。'
        : hasProductSemanticFeedback
          ? '声音产品的可听结果、视觉主体、参数、可见数值和结果解释必须来自同一目标状态；需验证用户手势激活、播放或触发、静音、音量、可辨认对比、真实性标注与音频失败降级。'
          : hasBranchingConfluence
            ? '对象选择、路线选择、当前路径、同一视觉主体、可见后果与最终行动必须来自同一分支状态；两条路线都可返回重放、产生无需文案即可辨认的差异，并汇合到同一行动且保留路径身份。'
            : '交互控件、可见数值、汇总值、结果解释和主体状态必须来自同一目标状态；专业指标或简化估算必须诚实标注并保持声明约束，不能作为虚假真实性装饰。',
      evidence: 'runtime'
    },
    { id: 'borderless-integration', priority: 'high', assertion: '主体和环境没有棋盘格、矩形图片边界或不自然的发光方框。', evidence: 'screenshot-beat' },
    { id: 'mobile-readable', priority: 'blocker', assertion: '390px 移动端无横向溢出；主体、正文和行动可见，并能沿纵向完成与桌面等价的主要控件→结果→最终行动路径，不能只保留桌面工作区的裁切局部。', evidence: 'screenshot-mobile' },
    { id: 'semantic-fallback', priority: 'normal', assertion: '关闭 WebGL 或减少运动后仍保留完整内容顺序和行动。', evidence: 'dom' },
    { id: 'runtime-clean', priority: 'blocker', assertion: '页面无阻断脚本错误，关键素材请求成功，滚动和指针输入可用。', evidence: 'runtime' }
  ];
}

function createVisualAnchorSpec(input: {
  brief: string;
  subject: string;
  plan: PatternPlan;
  assets: V2CreativeContract['assets'];
  semanticInteractionSelected: boolean;
  placeGroundingSelected: boolean;
  articulatedSubjectSelected: boolean;
}): VisualAnchorSpec {
  const externalAssets = input.assets.filter((asset) => asset.modality !== 'procedural');
  const proceduralAssets = input.assets.filter((asset) => asset.modality === 'procedural');
  const anchorAsset = externalAssets.find((asset) => asset.required && asset.role === 'subject')
    || externalAssets.find((asset) => asset.required)
    || externalAssets[0];
  const leadingExternalSource = anchorAsset?.sourcePriority.find((candidate) => candidate !== 'procedural');
  const sourcedExternalAsset = leadingExternalSource === 'user-supplied'
    || leadingExternalSource === 'curated-library'
    || leadingExternalSource === 'licensed';
  const heroRole: VisualAnchorSpec['heroRole'] = input.placeGroundingSelected || input.semanticInteractionSelected
    ? 'evidence-field'
    : input.articulatedSubjectSelected || input.assets.some((asset) => asset.role === 'subject')
      ? 'primary-subject'
      : input.plan.pattern === 'material-transformation'
        ? 'material-system'
        : 'spatial-context';
  const source: VisualAnchorSpec['source'] = input.placeGroundingSelected
    ? 'grounded-data'
    : externalAssets.length && proceduralAssets.length
      ? 'hybrid'
      : externalAssets.length
        ? sourcedExternalAsset
          ? 'sourced-asset'
          : 'generated-asset'
        : 'procedural';
  const declaredResponsibility = input.assets.find((asset) => asset.required && asset.role === 'subject')?.visualResponsibility
    || input.assets.find((asset) => asset.required)?.visualResponsibility;
  const sonicEditorial = isSonicEditorialBrief(positiveBriefForRouting(input.brief).toLowerCase());
  const botanicalObservation = isBotanicalObservationBrief(positiveBriefForRouting(input.brief).toLowerCase());

  if (sonicEditorial) {
    return visualAnchorSpecSchema.parse({
      subject: `围绕“${input.subject}”构建主题专属声音编辑锚点：未完台词、可定位声部与实际可听声景一致的节奏或包络证据必须形成同一主体。`,
      relationshipToBrief: `隐藏标题后，仍能从台词断点、声部来源和有因果的节奏结构辨认“${input.subject}”。通用网格、等距圆环、装饰性线条或与实际声景无关的波形不能单独冒充声音主体。`,
      heroRole,
      source,
      interactionBinding: '切换耳语、雨点或远钟时，同一视觉锚点内的节奏密度、包络、空间位置与标点关系必须形成无需说明文案也可分辨的结构差异，并同步真实可听结果；不能只改文案、颜色或高亮。',
      fallback: `音频或增强层不可用时，保留同一“${input.subject}”的未完台词、声部选择、静态但主题专属的节奏证据和保存行动；不得回退为通用网格、圆环或线条占位。`
    });
  }

  if (botanicalObservation) {
    return visualAnchorSpecSchema.parse({
      subject: '以完整叶片标本与可移动放大镜组成主题专属观察主体；种子、根系和局部结构证据围绕同一标本桌建立可比关系。',
      relationshipToBrief: `隐藏标题后，仍能从完整叶片轮廓、放大镜和叶脉局部观察关系辨认“${input.subject}”。通用网格、圆环、随机线条或卡通装饰不能单独冒充植物观察。`,
      heroRole,
      source,
      interactionBinding: '选择标本或移动放大镜时，同一视觉锚点中的完整标本、叶脉结构、含水量、生长阶段证据与观察任务必须同步变化；不能只改文案、数字、颜色或高亮。',
      fallback: 'Canvas 或增强层不可用时，保留同一完整植物标本的语义 SVG/DOM 表示、标本选择、静态放大证据、任务和“开始一次观察”；不得回退为空背景或通用图形。'
    });
  }

  return visualAnchorSpecSchema.parse({
    subject: declaredResponsibility || `围绕“${input.subject}”构建可辨认的主题专属对象、空间或证据场。`,
    relationshipToBrief: `视觉锚点必须直接证明“${input.subject}”和“${input.plan.thesis}”；即使隐藏标题，也能从对象、空间或数据关系辨认主题。`,
    heroRole,
    source,
    interactionBinding: input.semanticInteractionSelected
      ? '用户选择或输入时，视觉锚点、可见证据与语义数值必须同步变化，不能只改变边框、颜色或说明文字。'
      : `视觉锚点沿体验节点连续承担建立、变化与“${input.plan.finalMemoryPoint}”收束，不得在中段被无关装饰替换。`,
    fallback: `增强层不可用时，保留同一“${input.subject}”的静态主题表示、完整语义内容和主要行动；不得回退为通用网格或空背景。`
  });
}

function applySpatialProductTopologyAssets(
  assets: V2CreativeContract['assets'],
  decision: SpatialProductTopologyDecision,
  subject: string
): V2CreativeContract['assets'] {
  const authoring = decision.authoringContract;
  if (!decision.selected || !authoring) return assets;
  const existingSubject = assets.find((asset) => asset.role === 'subject');
  const conceptModel = authoring.assetPolicy === 'declared-concept-author-generated';
  const topologyAsset: V2CreativeContract['assets'][number] = {
    ...(existingSubject ?? {}),
    id: existingSubject?.id ?? 'hero-product',
    role: 'subject',
    modality: 'model-3d',
    required: true,
    minimumQuality: conceptModel ? 'L3-presentable' : 'L4-cinematic',
    sourcePriority: conceptModel
      ? ['author-generated', 'user-supplied', 'curated-library']
      : ['user-supplied', 'curated-library', 'licensed'],
    visualResponsibility: `以同一具名装配树表现“${subject}”，让 ${authoring.minimumDistinctPoses} 个姿态中的部件连接、遮挡和内部关系可被检查。`,
    continuityRule: `至少 ${authoring.minimumNamedPartGroups} 个部件组在全部姿态复用同一节点与几何，只允许局部变换和已声明的检查可见性变化。`,
    integration: 'spatial-object',
    visibleProof: `运行时能够读取具名树、部件世界坐标和至少 ${authoring.minimumDistinctPoses} 个可区分姿态；${authoring.inspectionModes.join('、')} 必须揭示平面外观无法证明的关系。`,
    fallback: 'block'
  };
  return [topologyAsset, ...assets.filter((asset) => asset !== existingSubject)].slice(0, 5);
}

function proceduralArticulatedAsset(subject: string): V2CreativeContract['assets'][number] {
  return {
    id: 'articulated-subject',
    role: 'subject',
    modality: 'procedural',
    required: true,
    minimumQuality: 'L3-presentable',
    sourcePriority: ['procedural'],
    visualResponsibility: `以可辨认部件关系构建“${subject}”的唯一英雄主体。`,
    continuityRule: '首屏、中段和终点必须保持同一主体拓扑，只改变部件局部进度、相机和视觉状态。',
    integration: 'native-procedural',
    visibleProof: '中段能看见至少三个部件组错峰变化，终点形成稳定完整主体。',
    fallback: 'static-image'
  };
}

function applyStateAssetStrategy(
  assets: V2CreativeContract['assets'],
  strategy: V2CreativeContract['technical']['stateAssetStrategy'],
  subject: string
): V2CreativeContract['assets'] {
  if (!strategy.required || strategy.route !== 'continuous-media-or-layered-subject') return assets;
  const supporting = assets.map((asset) => asset.required && asset.role !== 'information'
    ? { ...asset, required: false }
    : asset);
  const environment: V2CreativeContract['assets'] = supporting.some((asset) => asset.role === 'environment')
    ? []
    : [{
        id: 'spatial-environment',
        role: 'environment',
        modality: 'texture',
        required: false,
        minimumQuality: 'L2-inspectable',
        sourcePriority: ['user-supplied', 'curated-library', 'licensed', 'primary-image-model'],
        visualResponsibility: `为“${subject}”提供可信环境与尺度，不承担状态变化证据。`,
        continuityRule: '环境只作连续背景，不能通过裁切或替换伪装主体状态变化。',
        integration: 'full-bleed-environment',
        visibleProof: '环境与主体光线和观察关系一致，但关键状态仍由 state-subject 独立证明。',
        fallback: 'static-image'
      }];
  return [...supporting, ...environment, {
    id: 'state-subject',
    role: 'subject',
    modality: 'image-sequence',
    required: true,
    minimumQuality: 'L3-presentable',
    sourcePriority: ['user-supplied', 'curated-library', 'licensed', 'primary-image-model', 'minimax-fallback'],
    visualResponsibility: `持续表现同一“${subject}”从初始状态到结构变化完成的可辨认过程。`,
    continuityRule: `至少 ${strategy.minimumDistinctStates} 个状态必须共享同一对象身份、尺度、观察关系与光线；可分部件不少于 ${strategy.minimumPartGroups} 组。`,
    integration: 'full-bleed-environment',
    visibleProof: `关键截图能够直接指出同一主体的初始、变化中和完成状态，不能只依赖裁切、箭头或说明文字。`,
    fallback: 'block'
  }];
}

function applySceneCompositionAssets(
  assets: V2CreativeContract['assets'],
  composition: SceneCompositionPlan,
  subject: string,
  brief = ''
): V2CreativeContract['assets'] {
  if (!composition.required || composition.route !== 'layered-2d') return assets;
  const visualSubject = physicalSceneSubjectFrom(brief, subject);
  const required = composition.requiredLayers.map((layer) => layeredSceneAssetFor(
    layer,
    assets,
    visualSubject,
    composition.requiredLayers
  ));

  const requiredIds = new Set(required.map((asset) => asset.id));
  const retained = assets.filter((asset) => !requiredIds.has(asset.id) && (asset.modality === 'procedural' || asset.role === 'information'));
  return [...required, ...retained].slice(0, 5);
}

function layeredSceneAssetFor(
  layer: SceneCompositionPlan['requiredLayers'][number],
  assets: V2CreativeContract['assets'],
  subject: string,
  allLayers: SceneCompositionPlan['requiredLayers']
): V2CreativeContract['assets'][number] {
  if (layer === 'environment') {
    const existing = assets.find((asset) => asset.role === 'environment' && asset.modality !== 'procedural');
    return existing ? {
      ...existing,
      required: true,
      fallback: 'block',
      continuityRule: `${existing.continuityRule} 还必须与其他独立层共享机位、光向与尺度。`
    } : {
      id: 'scene-environment', role: 'environment', modality: 'texture', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'licensed', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: `提供“${subject}”发生操作的无边界全幅环境，不包含必须独立移动的物件。`,
      continuityRule: `与 ${allLayers.filter((item) => item !== 'environment').join('、')} 共享同一机位、光向、透视与尺度。`,
      integration: 'full-bleed-environment',
      visibleProof: '环境覆盖完整工作区，并在物件移动和状态变化时持续保持同一空间坐标。',
      fallback: 'block'
    };
  }
  if (layer === 'subject') {
    const existing = assets.find((asset) => asset.role === 'subject' && asset.modality !== 'procedural');
    return existing ? {
      ...existing,
      required: true,
      fallback: 'block',
      integration: existing.modality === 'model-3d' ? 'spatial-object' : existing.integration
    } : {
      id: 'scene-subject', role: 'subject', modality: 'transparent-image', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'licensed', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: `以可分离、可辨认的完整轮廓表现“${subject}”中的主要物件，使其能在同一环境中独立移动并改变空间结果。`,
      continuityRule: '物件身份、比例、受光和观察角必须与环境一致；多物件必须保留可独立定位的轮廓和安全区。',
      integration: 'alpha-subject',
      visibleProof: '隐藏标题后仍能辨认真实空间和主要物件，并能看到物件相对环境产生独立位移。',
      fallback: 'block'
    };
  }
  if (layer === 'foreground') {
    const existing = assets.find((asset) => asset.role === 'atmosphere' && asset.integration === 'alpha-subject');
    return existing ? { ...existing, required: true, fallback: 'block' } : {
      id: 'scene-foreground', role: 'atmosphere', modality: 'transparent-image', required: true,
      minimumQuality: 'L3-presentable',
      sourcePriority: ['user-supplied', 'curated-library', 'licensed', 'primary-image-model', 'minimax-fallback'],
      visualResponsibility: '提供与工作区直接相关的栏杆、檐口或近景遮挡，建立可信的前后层次而不是装饰贴片。',
      continuityRule: '前景必须匹配环境的光向、色温和镜位，并与物件移动范围保持安全边界。',
      integration: 'alpha-subject',
      visibleProof: '主要物件移动时，近景产生正确遮挡关系且构图边缘保持连续。',
      fallback: 'block'
    };
  }
  const maskId = layer === 'shadow-mask'
    ? 'scene-shadow-mask'
    : layer === 'state-mask' ? 'scene-state-mask' : 'scene-depth-field';
  const existing = assets.find((asset) => asset.id === maskId);
  const responsibility = layer === 'shadow-mask'
    ? '为同一构图提供与时间、物件位置一致的光照与阴影遮罩。'
    : layer === 'state-mask'
      ? '为同一构图提供与载荷、覆盖或局部状态一致的可验证状态遮罩。'
      : '为同一构图提供可验证深度，约束遮挡、景深和分层位移。';
  return existing ? { ...existing, required: true, fallback: 'block' } : {
    id: maskId, role: 'atmosphere', modality: 'texture', required: true,
    minimumQuality: 'L2-inspectable',
    sourcePriority: ['primary-image-model', 'curated-library', 'user-supplied', 'minimax-fallback', 'procedural'],
    visualResponsibility: responsibility,
    continuityRule: '遮罩必须与环境和主体像素坐标对齐；不能使用无关噪声或统一渐变冒充状态证据。',
    integration: 'seamless-field',
    visibleProof: layer === 'shadow-mask'
      ? '切换时间或移动物件后，阴影与日照覆盖在同一空间中同步变化。'
      : '状态变化与主体边缘、遮挡或局部结果保持像素级对应。',
    fallback: 'block'
  };
}

function physicalSceneSubjectFrom(brief: string, fallback: string): string {
  const workspace = brief.match(/(?:主工作区|持续工作区|工作区|主场景|核心空间)(?:是|为)([^：:。；;]{2,72})/)?.[1]
    ?.replace(/^一(?:个|座|处|张|片)/, '')
    .trim();
  const movableGroup = brief.match(/((?:一组|[一二三四五六七八九十]+件)[^。；;]{2,96}?)(?:持续存在|保持可见)/)?.[1]
    ?.replace(/——$/, '')
    .trim();
  if (workspace && movableGroup) return `${workspace}与${movableGroup}`;
  return workspace || movableGroup || fallback;
}

function applySceneCompositionDirection(
  direction: V2CreativeContract['direction'],
  composition: SceneCompositionPlan,
  spatialProductTopology: SpatialProductTopologyDecision
): V2CreativeContract['direction'] {
  if (!composition.required || composition.route === 'single-image-hybrid') return direction;
  if (composition.route === 'layered-2d') {
    if (direction.renderer.route === 'dom-canvas-hybrid' || direction.renderer.route === 'dom-three-hybrid') {
      return direction;
    }
    return experienceDecisionSchema.parse({
      ...direction,
      renderer: {
        baseLayer: 'semantic-dom',
        route: 'dom-canvas-hybrid',
        enhancement: 'canvas-shader',
        reason: '独立环境、主体、前景与深度/状态层需要统一的遮挡、视差、景深和融合导演；DOM 继续承担内容和行动。',
        threeJustification: '当前没有可检查三维模型职责，2.5D 合成已是最小充分路线，不应强行增加 Three.js 几何。',
        fallback: 'Canvas 不可用时保留一张最强环境图、完整 DOM 内容和行动，并明确停止空间交互。'
      },
      decisionSummary: `${direction.decisionSummary} 场景构成门禁要求 2.5D 独立分层，因此使用 DOM + Canvas/Shader 统一合成，不用单张背景图冒充空间。`
    });
  }
  if (spatialProductTopology.selected) {
    const conceptModel = spatialProductTopology.authoringContract?.assetPolicy
      === 'declared-concept-author-generated';
    return experienceDecisionSchema.parse({
      ...direction,
      visualRole: 'spatial-object',
      renderer: {
        baseLayer: 'semantic-dom',
        route: 'dom-three-hybrid',
        enhancement: 'three-webgl',
        reason: '同一具名产品装配树必须在多个姿态间复用节点，并通过部件世界坐标、连接距离、遮挡和检查可见性证明空间拓扑；DOM 继续承载说明、控制、披露和行动。',
        threeJustification: 'Three.js 只承担产品装配树、局部变换、受限相机和内部关系证据，不由拆解、内部结构或旋转等孤立词汇触发。',
        fallback: conceptModel
          ? 'WebGL 不可用时保留同姿态语义图、概念模型披露和完整行动，不用平面图冒充三维检查。'
          : '模型或 WebGL 不可用时保留素材缺口、同姿态语义图和完整行动，不用程序化几何冒充真实产品。'
      },
      decisionSummary: `${direction.decisionSummary} 空间产品拓扑门禁已证明同一装配树、多姿态重定位和深度检查职责，因此使用 DOM + Three.js。`
    });
  }
  return experienceDecisionSchema.parse({
    ...direction,
    visualRole: 'spatial-object',
    renderer: {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '可环绕检查、拆解与部件空间关系必须由真实模型层级承担；DOM 继续承载说明、导航和行动。',
      threeJustification: '合同已经要求可检查空间模型，Three.js 在此承担真实空间、部件层级、材质和相机职责。',
      fallback: '模型或 WebGL 不可用时保留审核通过的主体预览、完整 DOM 内容和行动，不伪造交互。'
    },
    decisionSummary: `${direction.decisionSummary} 场景构成门禁要求真实空间模型，因此使用 DOM + Three.js，不接受平面伪三维。`
  });
}

function proceduralMaterialAssets(subject: string, brief = ''): V2CreativeContract['assets'] {
  const procedural = proceduralMaterialAsset(subject, brief);
  if (!isMaterialExperimentBrief(brief.toLowerCase())) return [procedural];
  return [procedural, materialSubjectReferenceAsset(subject)];
}

function proceduralMaterialAsset(subject: string, brief = ''): V2CreativeContract['assets'][number] {
  const glazeExperiment = isMaterialExperimentBrief(brief.toLowerCase());
  return {
    id: 'procedural-material-subject',
    role: 'subject',
    modality: 'procedural',
    required: true,
    minimumQuality: 'L3-presentable',
    sourcePriority: ['procedural'],
    visualResponsibility: glazeExperiment
      ? `以可辨认的三维陶瓷器物表现“${subject}”，让配方和烧成温度程序化改变釉色、光泽、细裂纹与流釉边界。`
      : `在同一“${subject}”上程序化构建纹理、压痕、墨层或纤维变化。`,
    continuityRule: glazeExperiment
      ? '全部配方状态共享同一器物几何、观察角和日光方向；材料参数只改变有因果关系的表面属性，不得更换主体或随机重绘。'
      : '全部状态共享同一主体坐标、轮廓和光向，只改变与过程有关的材质层和局部形变。',
    integration: 'native-procedural',
    visibleProof: glazeExperiment
      ? '调整任一材料比例或温度后，同一器物、对应数值和结果解释同步变化；可辨认颜色、光泽、裂纹或流釉边界中的至少两项差异。'
      : '合同派生的关键状态能辨认为同一主体，且过程变化具有明确工艺因果。',
    fallback: 'static-image'
  };
}

function materialSubjectReferenceAsset(subject: string): V2CreativeContract['assets'][number] {
  return {
    id: 'material-subject-reference',
    role: 'subject',
    modality: 'transparent-image',
    required: false,
    minimumQuality: 'L2-inspectable',
    sourcePriority: ['primary-image-model', 'curated-library', 'user-supplied', 'minimax-fallback'],
    visualResponsibility: `为“${subject}”提供形体、比例、杯口厚度、把手连接、足部和真实受光参考；质量足够时也可作为融合主体。`,
    continuityRule: '参考素材只校正同一器物的定义性形体与材质，不得引入第二只不一致器物，也不得覆盖配方交互结果。',
    integration: 'alpha-subject',
    visibleProof: '即使隐藏文字，用户也能立即辨认器物类别；杯体、杯口、把手连接或足部不存在明显占位拼接。',
    fallback: 'dom-only'
  };
}

function shouldUseProceduralMaterialSubject(brief: string, pattern: ExperiencePattern): boolean {
  if (pattern !== 'material-transformation') return false;
  const proceduralBrief = brief
    .replace(/印刷(?:采购单|单据|票据|清单|风格|质感)/g, '')
    .replace(/(?:采购单|单据|票据|清单)印刷/g, '');
  const proceduralSignals = [
    '纸', '和纸', '木版', '版画', '墨层', '墨迹', '套印', '压印', '印刷', '纤维', '纹理', '压痕',
    '陶瓷', '陶艺', '陶土', '瓷器', '釉色', '釉料', '灰釉', '烧成', '窑烧',
    'ceramic', 'pottery', 'glaze', 'kiln'
  ];
  const externalEvidenceSignals = ['实拍', '摄影照片', '上传图片', '指定图片', '扫描件', '真实人物', '品牌商品', '现有素材'];
  return includesAny(proceduralBrief, proceduralSignals) && !includesAny(proceduralBrief, externalEvidenceSignals);
}

function beat(
  id: string,
  position: number,
  purpose: V2CreativeContract['experience']['beats'][number]['purpose'],
  visibleState: string,
  userProgression: string
): V2CreativeContract['experience']['beats'][number] {
  return { id, position, purpose, visibleState, userProgression };
}

function structure(
  mode: z.infer<typeof experienceStructureSchema>['mode'],
  layoutRule: string
): z.infer<typeof experienceStructureSchema> {
  return { mode, segmentPolicy: 'content-derived', layoutRule };
}

function subjectFrom(brief: string): string {
  const quotedDesignedSubject = brief.match(/(?:设计|构建|制作)(?:一(?:个|枚|款|座|套))?[“"]([^”"]{2,30})[”"]/);
  if (quotedDesignedSubject?.[1]) return quotedDesignedSubject[1].trim();
  const classifiedPageSubject = brief.match(/(?:设计|构建|制作)一(?:个|枚|款|座|套|张|台|页|幅)([^，。；;]{2,40}?)(?:网页|页面|网站|体验)(?:[，。；;]|$)/);
  if (classifiedPageSubject?.[1]) return classifiedPageSubject[1].trim();
  const continuousSubject = brief.match(/同一(?:个|枚|只|台|件|座|套)?([^，。；;、]{2,30}?)(?:从|由|逐渐|依次|开始)(?=[^，。；;]{2,48})/);
  if (continuousSubject?.[1]) return continuousSubject[1].trim();
  const openingSubject = brief.match(/(?:开场|首屏)(?:是|为|像)([^，。；;]{2,48})/);
  if (openingSubject?.[1]) {
    const normalized = openingSubject[1]
      .replace(/^一(?:个|枚|款|座|套|张|片|页|幅)/, '')
      .trim();
    if (normalized) return normalized;
  }
  const visualAnchorSubject = brief.match(/主视觉(?:是|为)([^，。；;]{2,48})/);
  if (visualAnchorSubject?.[1]) {
    const normalized = visualAnchorSubject[1]
      .replace(/^(?:一(?:个|枚|款|座|套))?/, '')
      .replace(/^不对应真实(?:商品|产品)的/, '')
      .trim();
    if (normalized) return normalized;
  }
  const designTarget = brief.match(/(?:为|给)([^，。；;]{2,34})(?:设计|构建|制作)/);
  if (designTarget?.[1] && !looksLikeAudienceTarget(designTarget[1])) {
    const normalized = designTarget[1]
      .replace(/^一(?:个|枚|款|座|套|张|片|页|幅|台)/, '')
      .trim();
    if (normalized) return normalized;
  }
  const designedProduct = brief.match(/(?:设计|构建|制作)(?:一(?:个|枚|款|座|套|张|台))([^，。；;]{2,34})/);
  if (designedProduct?.[1]) {
    const normalized = designedProduct[1].replace(/(?:网页|页面|网站|体验)$/, '').trim();
    if (!/^(?:网页|页面|网站|体验)$/.test(normalized)) return normalized;
  }
  const subjectAfterAudience = brief.match(/(?:为|给)[^，。；;]{2,30}(?:设计|构建|制作)(?:一(?:个|枚|款|座|套|张|台))?([^，。；;]{2,40})/);
  if (subjectAfterAudience?.[1]) {
    const normalized = subjectAfterAudience[1].replace(/(?:网页|页面|网站|体验)$/, '').trim();
    if (normalized && !/^(?:网页|页面|网站|体验)$/.test(normalized)) return normalized;
  }
  const cleaned = brief.split(/[，。；;]/)[0]?.replace(/^(请|希望|需要)/, '').trim();
  return cleaned && cleaned.length <= 36 ? cleaned : `${brief.slice(0, 32)}…`;
}

function spatialInspectionSubjectFrom(brief: string, fallback: string): string {
  const explicitModel = brief.match(
    /([^，。；;]{2,48}?(?:glb|gltf))(?=[^，。；;]{0,20}(?:始终|保持)[^，。；;]{0,12}(?:空间主体|视觉主体|主体))/i
  )?.[1]?.trim();
  if (explicitModel) return explicitModel;
  const animatedSubject = brief.match(
    /(?:同一|一(?:个|只|台|件))([^，。；;]{2,36}?)(?=(?:选择|切换|播放|动作|动画))/i
  )?.[1]?.trim();
  return animatedSubject || fallback;
}

function looksLikeAudienceTarget(value: string): boolean {
  const normalized = value.trim();
  return /(?:人|的人|者|用户|访客|观众|学生|消费者|住户|居民|旅客|儿童|家长|家庭|公众|人群|团队|工作人员)$/.test(normalized)
    || /(?:住在|准备|正在|需要|只有|希望|学习|购买)/.test(normalized);
}

function stateSubjectFrom(brief: string, fallback: string): string {
  const match = brief.match(/([^，。；;]{2,36}?)(?:逐步|依次|开始)?(?:对齐|咬合|拼合|接合|插入|装配|组装|拆解|拆开|分解|展开|折叠|开合|形变|变形|弯曲|伸缩|膨胀|收缩|扭转)/);
  if (!match?.[1]) return fallback;
  const normalized = match[1]
    .replace(/^(?:并|随后|同时|让|使|展示|观察)/, '')
    .replace(/^(?:一组|一对|两个|三组)/, '')
    .trim();
  return normalized || fallback;
}

function audienceFrom(brief: string): string {
  const match = brief.match(/(?:面向|针对)([^，。；;]{2,30})/);
  if (match?.[1]) return match[1].trim();
  const designedFor = brief.match(/(?:为|给)([^，。；;]{2,24})(?:设计|构建|制作)/);
  const candidate = designedFor?.[1]?.trim();
  return candidate
    && !/^(?:一|这|该)(?:个|款|座|套|张|台)/.test(candidate)
    && looksLikeAudienceTarget(candidate)
    ? candidate
    : '需要快速理解并感受该想法的网页访客';
}

function feelingFrom(brief: string): string {
  const terms = ['安静', '真实', '克制', '清冷', '温暖', '梦幻', '有张力', '电影感', '自然', '高级', '活力'];
  const matched = terms.filter((term) => brief.includes(term));
  return matched.length ? matched.slice(0, 4).join('、') : '清晰、可信并具有独特记忆点';
}

function actionFrom(brief: string): string {
  const explicit = brief.match(/(?:最后|最终)(?:行动|操作)?(?:是|为|：|:)[“"]?([^”"。；;]{2,30})/);
  if (explicit?.[1]) return explicit[1].trim();
  const verbWithNamedResult = brief.match(
    /(?:最后|最终)(保存|提交|导出|生成|记录|下载|预约)(一(?:张|份|个|枚|套|条))?[“"]([^”"]{2,30})[”"]/
  );
  if (verbWithNamedResult?.[1] && verbWithNamedResult[3]) {
    return `${verbWithNamedResult[1]}${verbWithNamedResult[2] ?? ''}${verbWithNamedResult[3].trim()}`;
  }
  const quoted = [...brief.matchAll(/[“"]([^”"]{2,30})[”"]/g)]
    .filter((match) => /最后|最终|行动|收束|汇合/.test(brief.slice(Math.max(0, (match.index ?? 0) - 18), match.index)));
  if (quoted.length) return quoted[quoted.length - 1]?.[1] || '进入下一步';
  if (brief.includes('保存')) return '保存当前结果';
  if (brief.includes('预约')) return '预约体验';
  if (brief.includes('记录')) return '开始记录';
  if (brief.includes('探索')) return '开始探索';
  if (brief.includes('购买')) return '了解并购买';
  return '进入下一步';
}

function declaredAnimationClipNamesFrom(brief: string): string[] {
  const names = new Set<string>();
  const groups = brief.matchAll(
    /([A-Za-z][A-Za-z0-9_.-]*(?:\s*(?:[、/，,]|\band\b)\s*[A-Za-z][A-Za-z0-9_.-]*){1,7})\s*(?:[2-8二两三四五六七八]\s*(?:套|个|种))?(?:真实)?(?:命名)?(?:动作)?(?:动画|剪辑|clips?|cycles?)/gi
  );
  for (const group of groups) {
    for (const name of (group[1] ?? '').split(/\s*(?:[、/，,]|\band\b)\s*/i)) {
      if (name) names.add(name);
    }
  }
  return [...names];
}

function negativeConstraintsFrom(brief: string): string[] {
  const clauses = brief.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean);
  return clauses.filter((item) => (
    /不要|避免|不能|不应|不是|并非|不做成/.test(item)
    || hasExplicitNoParameterWorkbenchConstraint(item)
  )).slice(0, 8);
}

function explicitUserRequirementsFrom(brief: string): string[] {
  const clauses = brief
    .split(/[。；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return clauses.filter((item) => (
    /不要|避免|不能|不应|不是|并非|不做成|必须|需要|应当|应该|开场|滚动时|滚动中|最后|最终|行动(?:是|为|：|:)/.test(item)
    || hasExplicitNoParameterWorkbenchConstraint(item)
  )).slice(0, 12);
}

function narrativeChangeFrom(brief: string, pattern: ExperiencePattern): string {
  const explicit = brief.match(/(?:滚动时|滚动中|随后|然后)([^。；;]{6,90})/);
  if (explicit?.[1]) return explicit[1].trim();
  const defaults: Record<ExperiencePattern, string> = {
    'continuous-scroll': '从情绪基线进入可观察变化，最后形成明确行动。',
    'environmental-memory': '从朦胧环境恢复空间坐标，让碎片形成可停留的记忆。',
    'product-atmosphere': '从使用情绪进入产品能力显现，最后回到稳定产品英雄状态。',
    'material-transformation': '从初始材质逐步形成完整主体，并在最终形态稳定停留。',
    'spatial-exploration': '从入口建立坐标，进入证据空间，再汇合到共同结论。',
    'editorial-field': '从编辑式留白进入主体显现，最后形成有张力的整体构图。'
  };
  return defaults[pattern];
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}
