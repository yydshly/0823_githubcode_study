import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';
import { styleDiversityDecisionSchema } from './style-diversity.ts';
import { sharedStateDriverAuthoringContractSchema } from './shared-state-driver-capability.ts';
import { sceneCompositionPlanSchema } from './scene-composition-plan.ts';
import { productSemanticFeedbackAuthoringContractSchema } from './product-semantic-feedback.ts';
import { spatialProductTopologyAuthoringContractSchema } from './spatial-product-topology-capability.ts';
import {
  referenceCapabilityCategorySchema,
  referenceEvidenceArtifactSchema,
  selectPositiveReferenceEvidence
} from './reference-intelligence.ts';
import {
  creativeInstructionSchema,
  createReferenceAdvisoryInstructions
} from './creative-instruction.ts';
import { visualAmbitionContractSchema } from './visual-ambition.ts';
import { deriveVisualAmbitionContract } from './visual-ambition-planner.ts';
import {
  creativeMediumDecisionSchema,
  selectCreativeMediumDecision
} from './creative-medium-decision.ts';
import {
  creativeDirectionSpecSchema,
  deriveCreativeDirectionSpec
} from './creative-direction-spec.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const codexExecutionBriefSchema = z.object({
  schemaVersion: z.literal(1),
  contractId: safeId,
  mediumDecision: creativeMediumDecisionSchema,
  visualAmbition: visualAmbitionContractSchema,
  creativeDirection: creativeDirectionSpecSchema,
  goal: z.object({
    subject: z.string(),
    audience: z.string(),
    feeling: z.string(),
    change: z.string(),
    action: z.string(),
    avoid: z.array(z.string())
  }).strict(),
  instructions: z.object({
    hard: z.array(creativeInstructionSchema).max(20),
    advisory: z.array(creativeInstructionSchema).max(20)
  }).strict(),
  authoring: z.object({
    primaryJourney: z.object({
      input: z.enum(['scroll', 'pointer', 'direct-navigation']),
      operation: z.string(),
      visualTarget: z.string(),
      visibleSubjectDelta: z.string(),
      businessResult: z.string(),
      finalAction: z.string(),
      stateBinding: z.enum(['single-causal-state', 'branching-confluence-state']),
      markers: z.object({
        visualAnchor: z.literal('data-signal-visual-anchor'),
        control: z.literal('data-signal-primary-control').nullable(),
        result: z.literal('data-signal-primary-result'),
        action: z.literal('data-signal-primary-action')
      }).strict()
    }).strict(),
    subjectContinuity: z.object({
      identityInvariant: z.string(),
      framingRule: z.string(),
      invariants: z.tuple([
        z.literal('identity'),
        z.literal('defining-features'),
        z.literal('focal-anchor'),
        z.literal('viewpoint'),
        z.literal('scale-band'),
        z.literal('crop-safe-area')
      ]),
      forbiddenSubstitutes: z.tuple([
        z.literal('copy-only'),
        z.literal('control-highlight-only'),
        z.literal('crop-jump'),
        z.literal('camera-cut'),
        z.literal('whole-subject-scale'),
        z.literal('opacity-or-blur-only')
      ])
    }).strict()
  }).strict(),
  story: z.object({
    pattern: z.string(),
    structure: z.object({
      mode: z.string(),
      segmentPolicy: z.literal('content-derived'),
      layoutRule: z.string()
    }).strict(),
    thesis: z.string(),
    focalSubject: z.string(),
    continuity: z.string(),
    typography: z.string(),
    pointer: z.string(),
    reducedMotion: z.string(),
    finalMemoryPoint: z.string(),
    visualAnchor: z.object({
      subject: z.string(),
      relationshipToBrief: z.string(),
      heroRole: z.string(),
      source: z.string(),
      interactionBinding: z.string(),
      fallback: z.string()
    }).strict(),
    beats: z.array(z.object({
      id: safeId,
      at: z.number().min(0).max(1),
      purpose: z.string(),
      state: z.string(),
      progression: z.string()
    }).strict()).min(2).max(6)
  }).strict(),
  references: z.array(z.object({
    id: safeId,
    title: z.string(),
    category: referenceCapabilityCategorySchema,
    evidence: z.string(),
    source: z.object({
      kind: z.enum(['local-runtime', 'local-prototype', 'github-source']),
      uri: z.string().min(1),
      evidenceLevel: z.enum(['runtime-verified', 'source-and-runtime-verified'])
    }).strict(),
    evidenceArtifacts: z.array(referenceEvidenceArtifactSchema).min(1).max(4),
    observedMechanism: z.array(z.string()),
    positiveBorrowPrinciples: z.array(z.string()),
    borrow: z.array(z.string()),
    relevanceReason: z.string(),
    confidence: z.number().min(0).max(1),
    advisoryRisks: z.array(z.string()),
    /** @deprecated Legacy input compatibility only; direct authoring never emits this field. */
    avoid: z.array(z.string()).optional()
  }).strict()).max(3),
  direction: z.object({
    visualRole: z.string(),
    renderer: z.object({
      route: z.string(),
      base: z.string(),
      enhancement: z.string(),
      reason: z.string(),
      threeJustification: z.string(),
      fallback: z.string()
    }).strict(),
    mechanisms: z.array(z.object({
      id: safeId,
      title: z.string(),
      job: z.string()
    }).strict()).max(3),
    interaction: z.object({
      primaryInput: z.string(),
      semanticAction: z.string(),
      pointerRole: z.string(),
      touchAlternative: z.string(),
      keyboardAlternative: z.string()
    }).strict(),
    rejected: z.array(z.object({ id: safeId, reason: z.string() }).strict()).max(3)
  }).strict(),
  assets: z.array(z.object({
    id: safeId,
    role: z.string(),
    modality: z.string(),
    required: z.boolean(),
    quality: z.string(),
    sourcePriority: z.array(z.string()),
    responsibility: z.string(),
    continuity: z.string(),
    integration: z.string(),
    proof: z.string(),
    fallback: z.string()
  }).strict()).max(5),
  technical: z.object({
    presentationStrategy: z.string(),
    selectedCapabilities: z.array(safeId),
    articulatedSubject: z.object({
      subjectMode: z.literal('procedural-articulated'),
      minimumPartGroups: z.number().int(),
      maximumPartGroups: z.number().int(),
      timeline: z.string(),
      synchronization: z.array(z.string()),
      rendererRoute: z.string(),
      pointerRole: z.string(),
      reducedMotion: z.string(),
      fallback: z.string(),
      maximumPixelRatio: z.number(),
      bloomOptional: z.boolean()
    }).strict().nullable(),
    spatialProductTopology: spatialProductTopologyAuthoringContractSchema.nullable(),
    stateAssetStrategy: z.object({
      required: z.boolean(),
      changeKind: z.string(),
      route: z.string(),
      acceptedModalities: z.array(z.string()),
      minimumDistinctStates: z.number().int(),
      minimumPartGroups: z.number().int(),
      failurePolicy: z.string(),
      reason: z.string()
    }).strict(),
    sceneComposition: sceneCompositionPlanSchema,
    interactionDriver: sharedStateDriverAuthoringContractSchema.nullable(),
    productSemanticFeedback: productSemanticFeedbackAuthoringContractSchema.nullable(),
    placeGrounding: z.object({
      strategy: z.enum(['real-geography-evidence', 'place-narrative', 'place-atmosphere']),
      geography: z.enum(['real-grounded', 'real-reinterpreted', 'inspired-only']),
      map: z.enum(['required', 'optional', 'avoid']),
      dataTruth: z.string(),
      creativeFreedom: z.string()
    }).strict().nullable(),
    styleDiversity: styleDiversityDecisionSchema,
    domResponsibilities: z.array(z.string()),
    webglResponsibilities: z.array(z.string()),
    targetFrameTimeMs: z.number(),
    maxInitialAssetBytes: z.number().int(),
    targetDevices: z.array(z.string())
  }).strict(),
  acceptance: z.array(z.object({
    id: safeId,
    priority: z.string(),
    assertion: z.string(),
    evidence: z.string()
  }).strict()).min(5).max(10),
  limits: z.object({
    authoringPasses: z.number().int(),
    assetBatches: z.number().int(),
    refinementPasses: z.number().int(),
    stopAfterMinutes: z.number().int(),
    archivePolicy: z.string()
  }).strict()
}).strict();

export type CodexExecutionBrief = z.infer<typeof codexExecutionBriefSchema>;

export function createCodexExecutionBrief(contract: V2CreativeContract): CodexExecutionBrief {
  const positiveReferences = selectPositiveReferenceEvidence(contract.brief, contract.experience.pattern, 3);
  const mediumDecision = selectCreativeMediumDecision(contract);
  const visualAmbition = deriveVisualAmbitionContract(contract, mediumDecision);
  const creativeDirection = deriveCreativeDirectionSpec({
    contract,
    mediumDecision,
    visualAmbition,
    references: positiveReferences
  });
  const instructions = [
    ...contract.instructions.filter((instruction) => instruction.source !== 'reference'),
    ...createReferenceAdvisoryInstructions(positiveReferences.map((reference) => ({
      referenceId: reference.id,
      title: reference.title,
      borrow: reference.positiveBorrowPrinciples,
      avoid: []
    })))
  ];
  const selectedCapabilities = [
    contract.technical.capabilitySelection,
    contract.technical.articulatedSubject,
    contract.technical.spatialProductTopology,
    contract.technical.semanticInteraction,
    contract.technical.interactionDriver,
    contract.technical.productSemanticFeedback,
    contract.technical.identityEvidence,
    contract.technical.placeGrounding
  ].flatMap((selection) => selection.selected && selection.capabilityId ? [selection.capabilityId] : []);

  return codexExecutionBriefSchema.parse({
    schemaVersion: 1,
    contractId: contract.id,
    mediumDecision,
    visualAmbition,
    creativeDirection,
    goal: {
      subject: contract.intent.subject,
      audience: contract.intent.audience,
      feeling: contract.intent.desiredFeeling,
      change: contract.intent.narrativeChange,
      action: contract.intent.primaryAction,
      avoid: contract.intent.negativeConstraints
    },
    instructions: {
      hard: instructions.filter((instruction) => instruction.strength === 'hard'),
      advisory: instructions.filter((instruction) => instruction.strength === 'advisory')
    },
    authoring: compileAuthoringContract(contract),
    story: {
      pattern: contract.experience.pattern,
      structure: contract.experience.structure,
      thesis: contract.experience.thesis,
      focalSubject: contract.experience.focalSubject,
      continuity: contract.experience.continuityRule,
      typography: contract.experience.typographyRole,
      pointer: contract.experience.pointerRole,
      reducedMotion: contract.experience.reducedMotion,
      finalMemoryPoint: contract.experience.finalMemoryPoint,
      visualAnchor: contract.visualAnchor,
      beats: contract.experience.beats.map((beat) => ({
        id: beat.id,
        at: beat.position,
        purpose: beat.purpose,
        state: beat.visibleState,
        progression: beat.userProgression
      }))
    },
    references: positiveReferences.map((reference) => ({
      id: reference.id,
      title: reference.title,
      category: reference.category,
      evidence: reference.source.evidenceLevel,
      source: reference.source,
      evidenceArtifacts: reference.evidence,
      observedMechanism: reference.observedMechanism,
      positiveBorrowPrinciples: reference.positiveBorrowPrinciples,
      borrow: reference.positiveBorrowPrinciples,
      relevanceReason: reference.relevanceReason,
      confidence: reference.confidence,
      advisoryRisks: reference.advisoryRisks
    })),
    direction: {
      visualRole: contract.direction.visualRole,
      renderer: {
        route: contract.direction.renderer.route,
        base: contract.direction.renderer.baseLayer,
        enhancement: contract.direction.renderer.enhancement,
        reason: contract.direction.renderer.reason,
        threeJustification: contract.direction.renderer.threeJustification,
        fallback: contract.direction.renderer.fallback
      },
      mechanisms: contract.direction.mechanisms.map((mechanism) => ({
        id: mechanism.id,
        title: mechanism.title,
        job: mechanism.job
      })),
      interaction: contract.direction.interaction,
      rejected: contract.direction.rejectedMechanisms
    },
    assets: contract.assets.map((asset) => ({
      id: asset.id,
      role: asset.role,
      modality: asset.modality,
      required: asset.required,
      quality: asset.minimumQuality,
      sourcePriority: asset.sourcePriority,
      responsibility: asset.visualResponsibility,
      continuity: asset.continuityRule,
      integration: asset.integration,
      proof: asset.visibleProof,
      fallback: asset.fallback
    })),
    technical: {
      presentationStrategy: contract.technical.presentationStrategy,
      selectedCapabilities,
      articulatedSubject: contract.technical.articulatedSubject.contract?.authoringContract ?? null,
      spatialProductTopology: contract.technical.spatialProductTopology.authoringContract,
      stateAssetStrategy: contract.technical.stateAssetStrategy,
      sceneComposition: contract.technical.sceneComposition,
      interactionDriver: contract.technical.interactionDriver.authoringContract,
      productSemanticFeedback: contract.technical.productSemanticFeedback.authoringContract,
      placeGrounding: contract.technical.placeGrounding.selected ? {
        strategy: contract.technical.placeGrounding.strategy,
        geography: contract.technical.placeGrounding.requirements.geography,
        map: contract.technical.placeGrounding.requirements.map,
        dataTruth: contract.technical.placeGrounding.requirements.dataTruth,
        creativeFreedom: contract.technical.placeGrounding.requirements.creativeFreedom
      } : null,
      styleDiversity: contract.technical.styleDiversity,
      domResponsibilities: contract.technical.domResponsibilities,
      webglResponsibilities: contract.technical.webglResponsibilities,
      targetFrameTimeMs: contract.technical.targetFrameTimeMs,
      maxInitialAssetBytes: contract.technical.maxInitialAssetBytes,
      targetDevices: contract.technical.targetDevices
    },
    acceptance: contract.acceptance,
    limits: contract.executionLimits
  });
}

export function serializeCodexExecutionBrief(contract: V2CreativeContract): string {
  return JSON.stringify(createCodexExecutionBrief(contract));
}

/**
 * Authoring needs the decisions that change code, not the complete research
 * evidence retained by the V2 contract. Keep the full execution brief for
 * persistence/review, while sending a smaller deterministic payload to the
 * one-shot bundle author.
 */
export function serializeCodexAuthoringBrief(contract: V2CreativeContract): string {
  const brief = createCodexExecutionBrief(contract);
  const {
    effectQualitySelection: _persistedEffectQualitySelection,
    ...compactCreativeDirection
  } = brief.creativeDirection;
  const selectedCapabilityContracts = {
    selectedCapabilities: brief.technical.selectedCapabilities,
    ...(brief.technical.articulatedSubject
      ? { articulatedSubject: brief.technical.articulatedSubject }
      : {}),
    ...(brief.technical.spatialProductTopology
      ? { spatialProductTopology: brief.technical.spatialProductTopology }
      : {}),
    ...(brief.technical.stateAssetStrategy.required
      ? { stateAssetStrategy: brief.technical.stateAssetStrategy }
      : {}),
    ...(brief.technical.interactionDriver
      ? { interactionDriver: brief.technical.interactionDriver }
      : {}),
    ...(brief.technical.productSemanticFeedback
      ? { productSemanticFeedback: brief.technical.productSemanticFeedback }
      : {}),
    ...(brief.technical.placeGrounding
      ? { placeGrounding: brief.technical.placeGrounding }
      : {})
  };

  return JSON.stringify({
    schemaVersion: brief.schemaVersion,
    contractId: brief.contractId,
    exactBrief: contract.brief,
    goal: brief.goal,
    mediumDecision: brief.mediumDecision,
    // The persisted execution brief keeps the complete rationale. The author
    // only needs the observable visual decisions; repeating every rationale
    // here can crowd out asset duties in multi-asset runs.
    visualAmbition: compactVisualAmbitionForAuthoring(brief.visualAmbition),
    // The complete six-axis selection gate stays in the persisted execution
    // brief and V2 UI. The one-shot author only needs its compact executable
    // rule, carried by effectFirst.openExploration.qualitySelection.
    creativeDirection: compactCreativeDirection,
    instructions: brief.instructions,
    authoring: brief.authoring,
    story: {
      structure: brief.story.structure,
      visualAnchor: brief.story.visualAnchor,
      beats: brief.story.beats
    },
    direction: {
      visualRole: brief.direction.visualRole,
      renderer: {
        route: brief.direction.renderer.route,
        base: brief.direction.renderer.base,
        enhancement: brief.direction.renderer.enhancement,
        reason: brief.direction.renderer.reason,
        threeJustification: brief.direction.renderer.threeJustification,
        fallback: brief.direction.renderer.fallback
      },
      mechanisms: brief.direction.mechanisms,
      interaction: brief.direction.interaction,
      rejected: brief.direction.rejected
    },
    assets: brief.assets,
    references: brief.references.map((reference) => ({
      id: reference.id,
      title: reference.title,
      positiveBorrowPrinciples: reference.positiveBorrowPrinciples,
      relevanceReason: reference.relevanceReason,
      confidence: reference.confidence,
      advisoryRisks: reference.advisoryRisks
    })),
    technical: {
      sceneComposition: brief.technical.sceneComposition,
      styleDiversity: {
        structureDirection: brief.technical.styleDiversity.structureDirection,
        mustDifferOn: brief.technical.styleDiversity.mustDifferOn
      },
      ...selectedCapabilityContracts
    },
    limits: brief.limits
  });
}

function compactVisualAmbitionForAuthoring(
  ambition: CodexExecutionBrief['visualAmbition']
) {
  return {
    intentLevel: ambition.intentLevel,
    hero: {
      title: ambition.heroMoment.title,
      withinSeconds: ambition.heroMoment.appearsWithinSeconds,
      change: ambition.heroMoment.observableRuntimeChange
    },
    rendering: {
      primary: ambition.rendering.primary,
      supporting: ambition.rendering.supporting
    },
    depth: {
      mode: ambition.spatialDepth.mode,
      cues: ambition.spatialDepth.cues
    },
    motion: ambition.motionArc.beats.map((beat) => ({
      phase: beat.phase,
      driver: beat.driver,
      state: beat.visualState
    })),
    interactions: ambition.interactionToScene.map((mapping) => ({
      input: mapping.input,
      response: mapping.sceneResponse
    })),
    asset: {
      level: ambition.assetCredibility.level,
      disclosure: ambition.assetCredibility.disclosure
    },
    fallback: {
      mobile: ambition.fallbackPerformance.mobileFallback,
      reducedMotion: ambition.fallbackPerformance.reducedMotionFallback,
      rendererFailure: ambition.fallbackPerformance.rendererFailureFallback
    }
  };
}

function compileAuthoringContract(contract: V2CreativeContract): CodexExecutionBrief['authoring'] {
  const sentences = contract.brief
    .split(/[。；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/(?:不要|避免|拒绝|禁止|不使用|无需|不需要)/.test(item));
  const clauses = sentences.flatMap((sentence) => sentence.split(/[，,]/).map((item) => item.trim()).filter(Boolean));
  const inputPattern = contract.direction.interaction.primaryInput === 'scroll'
    ? /滚动|滚轮|时间轴|scrub|scroll|拖动/
    : contract.direction.interaction.primaryInput === 'pointer'
      ? /鼠标|指针|悬停|拖动|点击|pointer|hover|drag|click/
      : /选择|切换|调整|输入|点击|拖动|select|switch|adjust|input|click|drag/;
  const operationClause = sentences.find((item) => inputPattern.test(item));
  const visibleDeltaClause = clauses.find((item) =>
    /(?:同步|逐渐|连续|直接|重新|随).*(?:变化|改变|更新|移动|展开|形成|恢复|走时|高亮|下垂)/.test(item)
    && /(?:同一|这件|主体|位置|形态|结构|材质|光照|阴影|覆盖|下垂|走时|颜色|轮廓)/.test(item)
  );
  const businessClauses = clauses.filter((item) =>
    /(?:预计|时间|顺序|提示|警告|风险|建议|距离|状态|评分|证据|结果|清单)/.test(item)
    && /(?:同步|更新|显示|变化|给出|生成|解释|确认|形成)/.test(item)
  ).slice(0, 2);
  const resultClause = clauses.find((item) => /同步(?:解释|更新|显示)|业务结果|可见结果|结果|证据|建议|确认/.test(item))
    || clauses.find((item) => /重新走时|恢复|形成/.test(item));
  const requiredSubject = contract.assets.find((asset) => asset.required && asset.role === 'subject');
  const transformBeat = contract.experience.beats.find((beat) => beat.purpose === 'transform');
  const resolveBeat = [...contract.experience.beats].reverse().find((beat) => beat.purpose === 'resolve');
  const stateful = contract.technical.stateAssetStrategy.required
    && contract.technical.stateAssetStrategy.changeKind !== 'none';
  const hasExplicitControl = contract.direction.interaction.primaryInput !== 'scroll'
    || /拖动|滑块|选择|切换|调整|输入|点击|drag|slider|select|switch|adjust|input|click/.test(contract.brief);

  return {
    primaryJourney: {
      input: contract.direction.interaction.primaryInput,
      operation: operationClause || contract.direction.interaction.semanticAction,
      visualTarget: requiredSubject?.visualResponsibility || contract.visualAnchor.subject,
      visibleSubjectDelta: visibleDeltaClause || requiredSubject?.visibleProof || transformBeat?.visibleState || contract.visualAnchor.interactionBinding,
      businessResult: businessClauses.join('；') || resultClause || resolveBeat?.visibleState || contract.intent.narrativeChange,
      finalAction: contract.intent.primaryAction,
      stateBinding: contract.experience.structure.mode === 'branching-confluence'
        ? 'branching-confluence-state'
        : 'single-causal-state',
      markers: {
        visualAnchor: 'data-signal-visual-anchor',
        control: hasExplicitControl ? 'data-signal-primary-control' : null,
        result: 'data-signal-primary-result',
        action: 'data-signal-primary-action'
      }
    },
    subjectContinuity: {
      identityInvariant: requiredSubject?.continuityRule || contract.experience.continuityRule,
      framingRule: stateful
        ? '所有派生状态使用同一主体身份锚点、同一规范化主体框、可比主尺度与观察关系，并保留安全裁切；禁止逐状态分别 cover、重新居中、无因果放大或切换为另一主体。'
        : `${contract.experience.continuityRule} 构图变化不得替换视觉锚点身份，也不得用裁切跳变或镜头切换冒充产品状态变化。`,
      invariants: ['identity', 'defining-features', 'focal-anchor', 'viewpoint', 'scale-band', 'crop-safe-area'],
      forbiddenSubstitutes: ['copy-only', 'control-highlight-only', 'crop-jump', 'camera-cut', 'whole-subject-scale', 'opacity-or-blur-only']
    }
  };
}
