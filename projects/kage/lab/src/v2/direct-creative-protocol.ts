import type { V2CreativeContract } from './creative-contract.ts';
import { createCodexExecutionBrief } from './codex-execution-brief.ts';
import {
  createDirectCreativeRun,
  type DirectCreativeAssetPlan,
  type DirectCreativeRun
} from './direct-creative-run.ts';
import { stableHash } from '../generation/stable-hash.ts';
import { deriveLegacyVisualAmbitionContract } from './visual-ambition-planner.ts';
import type {
  CreativeMediumAssetResponsibility,
  CreativeMediumDecision
} from './creative-medium-decision.ts';
import type { ProductDeliveryPlan } from './product-delivery-readiness.ts';

export function createDirectCreativeRunFromContract(
  contract: V2CreativeContract,
  options: { creativeProtocolVersion?: 1 | 2 | 3 | 4 | 5 } = {}
): DirectCreativeRun {
  const execution = createCodexExecutionBrief(contract);
  const protocolVersion = options.creativeProtocolVersion ?? 1;
  const visualAmbition = protocolVersion >= 3
    ? execution.visualAmbition
    : deriveLegacyVisualAmbitionContract(contract);
  const assetPlan = protocolVersion >= 3
    ? compileAssetPlan(contract, execution.mediumDecision)
    : compileAssetPlan(contract);
  const structureDirection = contract.technical.styleDiversity.structureDirection;
  const legacyDirectInteraction = contract.experience.structure.mode === 'interactive-field'
    || contract.experience.structure.mode === 'branching-confluence'
    || contract.experience.structure.mode === 'spatial-inspection'
    || contract.technical.semanticInteraction.selected;
  const legacyScrollInteraction = contract.direction.interaction.primaryInput === 'scroll'
    && ['continuous-canvas', 'guided-sequence'].includes(contract.experience.structure.mode);
  const positiveBrief = positiveInteractionBrief(contract.brief);
  const explicitlyScrollDriven = includesAny(positiveBrief, [
    '滚动', '滑动', '推进', 'scrub', 'scroll', 'timeline'
  ]);
  const explicitlyDirectDriven = includesAny(positiveBrief, [
    '点击', '拖动', '指针', '鼠标', '触摸', '选择', '切换', '调节', '控制',
    'click', 'drag', 'pointer', 'mouse', 'touch', 'select', 'toggle', 'adjust'
  ]);
  const declaredDirectInteraction = ['direct-control', 'pointer', 'mixed']
    .includes(structureDirection.interactionStyle)
    && (!explicitlyScrollDriven || explicitlyDirectDriven);
  const directInteraction = structureDirection.controlVisibility === 'none'
    ? structureDirection.interactionStyle === 'pointer'
    : legacyDirectInteraction || declaredDirectInteraction;
  const scrollInteraction = legacyScrollInteraction || explicitlyScrollDriven;
  const mode = directInteraction && scrollInteraction
    ? 'mixed'
    : directInteraction
      ? 'direct'
      : scrollInteraction
        ? 'scroll'
        : 'none';

  return createDirectCreativeRun({
    creativeProtocolVersion: protocolVersion,
    goalPlayback: {
      originalBrief: contract.brief,
      subject: contract.intent.subject,
      audience: contract.intent.audience,
      desiredOutcome: contract.intent.narrativeChange,
      primaryAction: contract.intent.primaryAction,
      hardConstraints: execution.instructions.hard
        .filter((instruction) => instruction.source === 'user')
        .map((instruction) => clip(instruction.content, 300)),
      preferences: [
        contract.intent.desiredFeeling,
        ...execution.instructions.advisory
          .filter((instruction) => instruction.source === 'inference')
          .map((instruction) => clip(instruction.content, 300))
      ].slice(0, 12)
    },
    selectedDirection: {
      id: `direction-${stableHash(`${contract.id}|${contract.direction.decisionSummary}`)}`,
      title: `${contract.intent.subject} · 专属创意方向`,
      experienceForm: contract.technical.styleDiversity.structureDirection.experienceForm,
      rationale: clip(contract.direction.decisionSummary, 700)
    },
    referencePrinciples: execution.references.map((reference) => ({
      referenceId: reference.id,
      title: reference.title,
      principle: clip(reference.positiveBorrowPrinciples.join('；'), 500),
      relevance: clip(reference.relevanceReason, 500),
      ...(reference.source.uri.startsWith('http')
        ? { sourceUrl: reference.source.uri }
        : { sourceUri: reference.source.uri })
    })),
    assetPlan,
    ...(protocolVersion >= 3 ? { mediumDecision: execution.mediumDecision } : {}),
    ...(protocolVersion === 5 ? {
      productDeliveryPlan: compileProductDeliveryPlan(contract, execution.mediumDecision)
    } : {}),
    visualAmbition,
    interactionRationale: {
      mode,
      audioApplicable: contract.technical.productSemanticFeedback.selected,
      rationale: mode === 'none'
        ? '当前目标可由内容、构图与行动完成，不强加无意义互动。'
        : `以${structureDirection.interactionStyle}组织${structureDirection.surfaceArchetype}中的“${contract.direction.interaction.semanticAction}”，并让变化服务于主要行动。`
    }
  });
}

/**
 * Versioned R124 entry. Existing V1 cases keep using
 * createDirectCreativeRunFromContract without inheriting new archive gates.
 */
export function createDirectCreativeRunFromContractV2(
  contract: V2CreativeContract
): DirectCreativeRun {
  return createDirectCreativeRunFromContract(contract, { creativeProtocolVersion: 2 });
}

/**
 * R133 entry. V3 binds the authoritative medium decision to the run identity
 * while V1/V2 remain available for parsing and rebuilding frozen research.
 */
export function createDirectCreativeRunFromContractV3(
  contract: V2CreativeContract
): DirectCreativeRun {
  return createDirectCreativeRunFromContract(contract, { creativeProtocolVersion: 3 });
}

/**
 * R151 entry. V4 keeps the V3 medium and asset plan provisional until a
 * validated effect-selection receipt grants permission to consume them.
 */
export function createDirectCreativeRunFromContractV4(
  contract: V2CreativeContract
): DirectCreativeRun {
  return createDirectCreativeRunFromContract(contract, { creativeProtocolVersion: 4 });
}

/**
 * R161 entry. V5 keeps the bounded V4 selection workflow, then requires the
 * final page to prove a complete product journey before formal promotion.
 */
export function createDirectCreativeRunFromContractV5(
  contract: V2CreativeContract
): DirectCreativeRun {
  return createDirectCreativeRunFromContract(contract, { creativeProtocolVersion: 5 });
}

function compileProductDeliveryPlan(
  contract: V2CreativeContract,
  mediumDecision: CreativeMediumDecision
): ProductDeliveryPlan {
  const coreBeat = contract.experience.beats.find((beat) => (
    beat.purpose === 'develop' || beat.purpose === 'transform'
  )) || contract.experience.beats[0];
  const resultBeat = [...contract.experience.beats].reverse().find((beat) => (
    beat.purpose === 'resolve'
  )) || contract.experience.beats.at(-1)!;
  const sources = new Set(mediumDecision.assetResponsibilities.map((asset) => asset.source));
  const visualAssetPolicy: ProductDeliveryPlan['visualAssetPolicy'] = sources.size > 1
    ? 'hybrid'
    : mediumDecision.preferred === 'webgl-procedural' || mediumDecision.preferred === 'code-native'
      ? 'runtime-native-media'
      : 'formal-source-assets';

  return {
    schemaVersion: 1,
    productName: contract.intent.subject,
    targetUser: contract.intent.audience,
    userProblem: contract.intent.narrativeChange,
    valuePromise: contract.experience.thesis,
    primaryAction: contract.intent.primaryAction,
    completionResult: resultBeat.visibleState,
    continuation: `完成“${contract.intent.primaryAction}”后必须显示一个真实、可理解的结果，并提供继续、保存、分享、预约或返回产品的明确路径。`,
    journey: [
      {
        id: 'entry',
        phase: 'entry',
        userGoal: `快速理解${contract.intent.subject}是什么、为谁服务以及能带来什么价值。`,
        visibleOutcome: contract.experience.beats[0].visibleState
      },
      {
        id: 'use',
        phase: 'use',
        userGoal: coreBeat.userProgression,
        visibleOutcome: coreBeat.visibleState
      },
      {
        id: 'result',
        phase: 'result',
        userGoal: `通过“${contract.intent.primaryAction}”得到当前体验承诺的结果。`,
        visibleOutcome: resultBeat.visibleState
      },
      {
        id: 'continuation',
        phase: 'continuation',
        userGoal: '理解结果如何被保存、继续使用或进入下一步。',
        visibleOutcome: `页面在结果之后保留清晰后续路径，不以无效按钮或一次性演示状态结束。`
      }
    ],
    visualAssetPolicy,
    visualAssetRationale: visualAssetPolicy === 'runtime-native-media'
      ? `当前首选媒介为 ${mediumDecision.preferred}；只有当实时生成、数据变化或程序化现象本身就是产品价值时，代码视觉才可承担正式主视觉，否则必须改用正式素材。`
      : `当前首选媒介为 ${mediumDecision.preferred}；关键主体与环境应使用合适的生成、真实、授权或三维素材，代码负责布局、状态、动态与产品因果。`
  };
}

function positiveInteractionBrief(brief: string): string {
  const negativeMarker = /(?:^|[，,：:\s])(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应|不是|并非|不做成)/;
  return brief
    .split(/[。；;\n]/)
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim().toLowerCase();
    })
    .filter(Boolean)
    .join('。');
}

function includesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

function compileAssetPlan(
  contract: V2CreativeContract,
  mediumDecision?: CreativeMediumDecision
): DirectCreativeAssetPlan {
  if (mediumDecision) return compileDecisionAssetPlan(contract, mediumDecision);
  if (!contract.assets.length) {
    return {
      batchId: `assets-${stableHash(contract.id)}`,
      strategy: 'none',
      rationale: '当前方向不需要独立素材批次，由语义 DOM 与必要的程序化表达完成。',
      assets: []
    };
  }
  const assets = contract.assets.map((asset) => ({
    id: asset.id,
    role: asset.visualResponsibility,
    source: assetSource(asset),
    required: asset.required
  }));
  const sources = new Set(assets.map((asset) => asset.source));
  const onlySource = sources.size === 1 ? [...sources][0] : null;
  const strategy = onlySource === 'generated'
    ? 'generated'
    : onlySource === 'provided'
      ? 'provided'
      : onlySource === 'licensed'
        ? 'licensed'
        : onlySource === 'programmatic'
          ? 'programmatic'
          : 'mixed';
  return {
    batchId: `assets-${stableHash(contract.id)}`,
    strategy,
    rationale: '只允许这一批素材决策；关键素材必须在最终页面实际承担声明的视觉职责。',
    assets
  };
}

function compileDecisionAssetPlan(
  contract: V2CreativeContract,
  mediumDecision: CreativeMediumDecision
): DirectCreativeAssetPlan {
  const decisionAssets = mediumDecision.assetResponsibilities.map((responsibility) => ({
    id: responsibility.id,
    role: clip(`${responsibility.responsibility} 可见证明：${responsibility.visibleProof}`, 240),
    source: mediumResponsibilitySource(contract, responsibility),
    required: responsibility.required
  }));
  const authoritativeSources = new Set(decisionAssets.map((asset) => asset.source));
  const contractAssets = mediumDecision.preferred === 'code-native'
    ? []
    : contract.assets
      .filter((asset) => !decisionAssets.some((planned) => planned.id === asset.id))
      .filter((asset) => authoritativeSources.has(assetSource(asset)))
      .map((asset) => ({
        id: asset.id,
        role: asset.visualResponsibility,
        source: assetSource(asset),
        required: asset.required
      }));
  const assets = [...decisionAssets, ...contractAssets].slice(0, 8);
  if (!assets.length) {
    return {
      batchId: `assets-${stableHash(`${contract.id}|${JSON.stringify(mediumDecision)}`)}`,
      strategy: 'none',
      rationale: clip(`${mediumDecision.rationale} 当前首选不需要独立素材批次。`, 500),
      assets: []
    };
  }
  const sources = new Set(assets.map((asset) => asset.source));
  const onlySource = sources.size === 1 ? [...sources][0] : null;
  const strategy = onlySource === 'generated'
    ? 'generated'
    : onlySource === 'provided'
      ? 'provided'
      : onlySource === 'licensed'
        ? 'licensed'
        : onlySource === 'programmatic'
          ? 'programmatic'
          : 'mixed';
  return {
    batchId: `assets-${stableHash(`${contract.id}|${JSON.stringify(mediumDecision)}`)}`,
    strategy,
    rationale: clip(`本次唯一素材批次服从 ${mediumDecision.preferred}：${mediumDecision.rationale}`, 500),
    assets
  };
}

function mediumResponsibilitySource(
  contract: V2CreativeContract,
  responsibility: CreativeMediumAssetResponsibility
): 'generated' | 'provided' | 'licensed' | 'programmatic' {
  // The medium decision is authoritative for its required primary asset. A
  // matching contract slot may list user/curated sources first as generic
  // fallbacks, but that must not silently rewrite a generated or programmatic
  // primary route into a provided/licensed asset strategy.
  if (responsibility.source === 'generated-image') return 'generated';
  if (responsibility.source === 'programmatic') return 'programmatic';
  const matchingAsset = contract.assets.find((asset) => asset.id === responsibility.id);
  if (matchingAsset) return assetSource(matchingAsset);
  return 'licensed';
}

function assetSource(asset: V2CreativeContract['assets'][number]): 'generated' | 'provided' | 'licensed' | 'programmatic' {
  if (asset.modality === 'procedural' || asset.integration === 'native-procedural') return 'programmatic';
  const first = asset.sourcePriority[0];
  if (first === 'user-supplied') return 'provided';
  if (first === 'licensed' || first === 'curated-library') return 'licensed';
  return 'generated';
}

function clip(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(1, maximum - 1))}…`;
}
