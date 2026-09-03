import type { V2CreativeContract } from './creative-contract.ts';
import {
  selectCreativeMediumDecision,
  type CreativeMediumDecision
} from './creative-medium-decision.ts';
import {
  createVisualAmbitionContract,
  type VisualAmbitionContract,
  type VisualAmbitionIntentLevel,
  type VisualMotionDriver,
  type VisualRenderingMedium
} from './visual-ambition.ts';

/**
 * Converts the content and runtime responsibilities already selected by the V2
 * contract into a visual-ambition decision. This is a positive plan, not a
 * style blacklist: historical case distance and inferred avoid-lists never
 * participate in the level decision.
 */
export function deriveVisualAmbitionContract(
  contract: V2CreativeContract,
  mediumDecision: CreativeMediumDecision = selectCreativeMediumDecision(contract)
): VisualAmbitionContract {
  return deriveVisualAmbition(contract, mediumDecision);
}

/**
 * Frozen V1/V2 reconstruction entry. New authoring must use
 * deriveVisualAmbitionContract so medium choice is evidence-led.
 */
export function deriveLegacyVisualAmbitionContract(
  contract: V2CreativeContract
): VisualAmbitionContract {
  return deriveVisualAmbition(contract, null);
}

function deriveVisualAmbition(
  contract: V2CreativeContract,
  mediumDecision: CreativeMediumDecision | null
): VisualAmbitionContract {
  const positiveBrief = positiveUserRequest(contract.brief);
  const intentLevel = selectIntentLevel(contract, positiveBrief);
  const primaryMedium = mediumDecision
    ? selectPrimaryMedium(contract, mediumDecision)
    : selectLegacyPrimaryMedium(contract, intentLevel);
  const motionDriver = selectMotionDriver(contract, intentLevel);
  const firstBeat = contract.experience.beats[0]!;
  const finalBeat = contract.experience.beats[contract.experience.beats.length - 1]!;
  const dynamic = intentLevel !== 'restrained';

  return createVisualAmbitionContract({
    schemaVersion: 1,
    intentLevel,
    intentRationale: intentRationale(contract, intentLevel, positiveBrief),
    heroMoment: {
      title: clip(`${contract.intent.subject} · ${contract.experience.finalMemoryPoint}`, 120),
      description: clip(
        `开场以“${firstBeat.visibleState}”建立主体，并让后续变化服务于“${contract.intent.narrativeChange}”。`,
        600
      ),
      themeConnection: clip(
        `${contract.visualAnchor.relationshipToBrief}；这一记忆点直接指向“${contract.intent.primaryAction}”。`,
        500
      ),
      appearsWithinSeconds: intentLevel === 'immersive' || intentLevel === 'flagship' ? 5 : 8,
      observableRuntimeChange: dynamic
        ? {
            trigger: motionTrigger(contract, motionDriver),
            from: clip(firstBeat.visibleState, 300),
            to: clip(finalBeat.visibleState, 300)
          }
        : null
    },
    rendering: {
      primary: primaryMedium,
      supporting: supportingMedia(contract, primaryMedium),
      rationale: mediumDecision
        ? renderingRationale(contract, primaryMedium, mediumDecision)
        : legacyRenderingRationale(contract, primaryMedium)
    },
    spatialDepth: spatialDepthPlan(contract, intentLevel, primaryMedium),
    motionArc: {
      beats: motionBeats(contract, intentLevel, motionDriver),
      runtimeAdvantage: runtimeAdvantage(contract, intentLevel)
    },
    interactionToScene: interactionMappings(contract, intentLevel, motionDriver),
    assetCredibility: mediumDecision
      ? assetCredibility(mediumDecision)
      : legacyAssetCredibility(contract),
    fallbackPerformance: fallbackPerformance(contract, intentLevel, primaryMedium)
  });
}

function selectIntentLevel(
  contract: V2CreativeContract,
  positiveBrief: string
): VisualAmbitionIntentLevel {
  const explicitFlagship = includesAny(positiveBrief, [
    '旗舰视觉', '旗舰级', '视觉冲击', '吸引眼球', '强视觉', '震撼', '电影级',
    'hero experience', 'flagship', 'showpiece', 'wow effect'
  ]);
  if (explicitFlagship) return 'flagship';

  const explicitImmersive = includesAny(positiveBrief, [
    '沉浸式', '沉浸体验', '空间穿越', '空间推进', '实时 3d', '实时3d', 'three.js',
    'threejs', 'webgl', '着色器', 'shader', '自由环绕', '自由旋转检查', '3d 拆解',
    '3d拆解', 'immersive'
  ]);
  const runtimeNeedsDepth = contract.direction.renderer.route === 'dom-three-hybrid'
    || contract.technical.sceneComposition.route === 'spatial-3d';
  const contentNeedsSpatialJourney = contract.technical.sceneComposition.required
    && contract.technical.sceneComposition.route === 'layered-2d'
    && ['environmental-memory', 'spatial-exploration', 'continuous-scroll']
      .includes(contract.experience.pattern);
  const experienceIsSpatialJourney = ['environmental-memory', 'spatial-exploration']
    .includes(contract.experience.pattern)
    && ['continuous-canvas', 'guided-sequence'].includes(contract.experience.structure.mode)
    && contract.direction.interaction.primaryInput === 'scroll';
  if (
    explicitImmersive
    || runtimeNeedsDepth
    || contentNeedsSpatialJourney
    || experienceIsSpatialJourney
  ) return 'immersive';

  const contentNeedsRuntimeExpression = contract.direction.renderer.route !== 'dom-only'
    || contract.technical.stateAssetStrategy.required
    || contract.technical.semanticInteraction.selected
    || contract.technical.productSemanticFeedback.selected
    || contract.experience.structure.mode === 'continuous-canvas'
    || contract.experience.structure.mode === 'interactive-field'
    || contract.experience.structure.mode === 'branching-confluence';
  return contentNeedsRuntimeExpression ? 'expressive' : 'restrained';
}

function selectPrimaryMedium(
  contract: V2CreativeContract,
  mediumDecision: CreativeMediumDecision
): VisualRenderingMedium {
  if (mediumDecision.preferred === 'generated-image'
    || mediumDecision.preferred === 'grounded-real-media') return 'raster-image';
  if (mediumDecision.preferred === 'threejs-spatial') return 'threejs-3d';
  if (mediumDecision.preferred === 'webgl-procedural') return 'webgl-shader';

  const positiveBrief = positiveUserRequest(contract.brief);
  if (includesAny(positiveBrief, ['canvas 2d', 'canvas2d', 'canvas-2d', '画布'])) {
    return 'canvas-2d';
  }
  if (
    contract.direction.visualRole === 'information'
    || contract.experience.structure.mode === 'branching-confluence'
    || contract.technical.styleDiversity.structureDirection.experienceForm === 'object-field'
    || includesAny(positiveBrief, ['关系图', '流程图', '图表', '精确路径', '拓扑图', 'svg'])
  ) return 'svg';
  return 'dom-css';
}

function selectLegacyPrimaryMedium(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel
): VisualRenderingMedium {
  const route = contract.direction.renderer.route;
  if (route === 'dom-three-hybrid') return 'threejs-3d';
  if (route === 'dom-canvas-hybrid') {
    return contract.direction.renderer.enhancement === 'canvas-shader'
      ? 'webgl-shader'
      : 'canvas-2d';
  }
  if (route === 'dom-media-hybrid') {
    return contract.assets.some((asset) => asset.modality === 'image-sequence')
      ? 'image-sequence'
      : 'dom-css';
  }
  if (
    contract.experience.structure.mode === 'branching-confluence'
    || contract.technical.styleDiversity.structureDirection.experienceForm === 'object-field'
  ) return 'svg';
  return intentLevel === 'immersive' || intentLevel === 'flagship' ? 'svg' : 'dom-css';
}

function supportingMedia(
  contract: V2CreativeContract,
  primary: VisualRenderingMedium
): VisualRenderingMedium[] {
  const supporting: VisualRenderingMedium[] = [];
  if (primary !== 'dom-css') supporting.push('dom-css');
  const runtimeEnhancement = primary === 'raster-image'
    ? explicitRasterRuntimeEnhancement(positiveUserRequest(contract.brief))
      ?? inferredRasterRuntimeEnhancement(contract)
    : null;
  if (runtimeEnhancement) supporting.push(runtimeEnhancement);
  if (
    primary !== 'image-sequence'
    && contract.assets.some((asset) => asset.modality === 'image-sequence')
  ) {
    supporting.push('image-sequence');
  }
  return supporting.slice(0, 4);
}

function inferredRasterRuntimeEnhancement(
  contract: V2CreativeContract
): Extract<VisualRenderingMedium, 'webgl-shader' | 'canvas-2d'> | null {
  if (hasUserRuntimeBan(contract)) return null;
  if (
    contract.direction.renderer.route === 'dom-canvas-hybrid'
    && contract.direction.renderer.enhancement === 'canvas-shader'
  ) return 'webgl-shader';
  return null;
}

function hasUserRuntimeBan(contract: V2CreativeContract): boolean {
  const userHard = contract.instructions
    .filter((instruction) => (
      instruction.source === 'user'
        && instruction.scope === 'current-run'
        && instruction.strength === 'hard'
    ))
    .map((instruction) => instruction.content)
    .join('。');
  return userHard.split(/[。；;\n]/).some((clause) => (
    /(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应)|\b(?:avoid|reject|forbid|without|do not|don't|no)\b/i.test(clause)
      && /(?:webgl|three\.?js|canvas|shader|着色器|程序化)/i.test(clause)
  ));
}

/**
 * A generated or grounded key visual can remain the authoritative visual
 * source while a deliberately requested runtime layer enhances it. Requiring
 * an explicit enhancement phrase keeps WebGL/Canvas advisory and prevents the
 * runtime from silently becoming a second primary medium.
 */
function explicitRasterRuntimeEnhancement(
  positiveBrief: string
): Extract<VisualRenderingMedium, 'webgl-shader' | 'canvas-2d'> | null {
  const explicitlyDynamic = includesAny(positiveBrief, [
    '动态增强', '交互增强', '实时增强', '动效增强', '运行时增强',
    '动态叠加', '交互叠加', '实时叠加', 'runtime enhancement',
    'dynamic enhancement', 'interactive enhancement', 'motion enhancement'
  ]);
  if (!explicitlyDynamic) return null;

  if (includesAny(positiveBrief, [
    'webgl', 'three.js', 'threejs', '着色器', 'shader'
  ])) return 'webgl-shader';
  if (includesAny(positiveBrief, [
    'canvas 2d', 'canvas2d', 'canvas-2d', 'canvas', '画布'
  ])) return 'canvas-2d';
  return null;
}

function spatialDepthPlan(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel,
  primary: VisualRenderingMedium
): VisualAmbitionContract['spatialDepth'] {
  if (contract.technical.sceneComposition.route === 'spatial-3d' || primary === 'threejs-3d') {
    return {
      mode: 'scene-3d',
      purpose: clip(`用可检查空间关系证明“${contract.experience.thesis}”，而不是把三维当作装饰。`, 500),
      cues: ['perspective', 'occlusion', 'lighting', 'camera-motion']
    };
  }
  if (contract.technical.sceneComposition.route === 'layered-2d') {
    return {
      mode: 'parallax',
      purpose: clip(`让独立场景层共同表达“${contract.experience.continuityRule}”，避免关键主体沦为贴图。`, 500),
      cues: ['scale', 'occlusion', 'parallax', 'focus']
    };
  }
  if (primary === 'webgl-shader') {
    return {
      mode: 'volumetric',
      purpose: clip(`以连续材质和光场变化表现“${contract.intent.narrativeChange}”，变化必须保持主题含义。`, 500),
      cues: ['lighting', 'focus', 'volumetric']
    };
  }
  if (primary === 'svg' && intentLevel !== 'restrained') {
    return {
      mode: 'layered-2d',
      purpose: clip(`以共享坐标、遮挡和有职责的图形层表达“${contract.intent.narrativeChange}”，不把二维运动误报为体积空间。`, 500),
      cues: ['scale', 'occlusion']
    };
  }
  if (intentLevel !== 'restrained') {
    return {
      mode: 'layered-2d',
      purpose: clip(`通过有职责的层级和遮挡强化“${contract.visualAnchor.subject}”，不为炫技增加虚假空间。`, 500),
      cues: ['scale', 'occlusion']
    };
  }
  return {
    mode: 'flat',
    purpose: clip(`保持信息层级直接可读，让“${contract.intent.primaryAction}”成为页面的明确收束。`, 500),
    cues: []
  };
}

function selectMotionDriver(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel
): VisualMotionDriver {
  if (intentLevel === 'restrained') return 'none';
  if (contract.technical.productSemanticFeedback.selected) return 'hybrid';
  if (contract.technical.semanticInteraction.selected) {
    return contract.direction.interaction.primaryInput === 'pointer' ? 'pointer' : 'direct-input';
  }
  if (contract.direction.interaction.primaryInput === 'scroll') return 'scroll';
  if (contract.direction.interaction.primaryInput === 'pointer') return 'pointer';
  if (contract.experience.structure.mode === 'interactive-field'
    || contract.experience.structure.mode === 'branching-confluence'
    || contract.experience.structure.mode === 'spatial-inspection') return 'direct-input';
  return 'time';
}

function motionBeats(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel,
  driver: VisualMotionDriver
): VisualAmbitionContract['motionArc']['beats'] {
  const beats = contract.experience.beats;
  const first = beats[0]!;
  const last = beats[beats.length - 1]!;
  if (intentLevel === 'restrained') {
    return [{
      phase: 'opening',
      driver: 'none',
      visualState: clip(first.visibleState, 400),
      thematicPurpose: clip(first.userProgression, 400)
    }];
  }

  const result: VisualAmbitionContract['motionArc']['beats'] = [{
    phase: 'opening',
    driver: 'time',
    visualState: clip(first.visibleState, 400),
    thematicPurpose: clip(first.userProgression, 400)
  }];
  if (beats.length > 2) {
    const middle = beats[Math.floor((beats.length - 1) / 2)]!;
    result.push({
      phase: 'exploration',
      driver,
      visualState: clip(middle.visibleState, 400),
      thematicPurpose: clip(middle.userProgression, 400)
    });
  }
  result.push({
    phase: 'resolution',
    driver,
    visualState: clip(last.visibleState, 400),
    thematicPurpose: clip(last.userProgression, 400)
  });
  return result;
}

function interactionMappings(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel,
  driver: VisualMotionDriver
): VisualAmbitionContract['interactionToScene'] {
  if (intentLevel === 'restrained' || driver === 'none' || driver === 'time') return [];
  return [{
    input: motionTrigger(contract, driver),
    sceneResponse: clip(contract.visualAnchor.interactionBinding, 400),
    productMeaning: clip(
      `可见变化必须帮助用户理解“${contract.intent.narrativeChange}”，并自然抵达“${contract.intent.primaryAction}”。`,
      400
    )
  }];
}

function assetCredibility(
  mediumDecision: CreativeMediumDecision
): VisualAmbitionContract['assetCredibility'] {
  if (mediumDecision.preferred === 'grounded-real-media') {
    return {
      level: 'data-grounded',
      strategy: clip(mediumDecision.rationale, 600),
      disclosure: clip(mediumDecision.truthBoundary, 400)
    };
  }
  if (mediumDecision.preferred === 'threejs-spatial') {
    return {
      level: 'product-faithful',
      strategy: clip(mediumDecision.rationale, 600),
      disclosure: clip(mediumDecision.truthBoundary, 400)
    };
  }
  if (mediumDecision.preferred === 'generated-image') {
    return {
      level: 'editorial-credible',
      strategy: clip(mediumDecision.rationale, 600),
      disclosure: clip(mediumDecision.truthBoundary, 400)
    };
  }
  return {
    level: 'conceptual-coherent',
    strategy: clip(mediumDecision.rationale, 600),
    disclosure: clip(mediumDecision.truthBoundary, 400)
  };
}

function legacyAssetCredibility(
  contract: V2CreativeContract
): VisualAmbitionContract['assetCredibility'] {
  if (contract.technical.placeGrounding.strategy === 'real-geography-evidence') {
    return {
      level: 'data-grounded',
      strategy: clip(contract.technical.placeGrounding.requirements.dataTruth, 600),
      disclosure: '地域、路线与数据只使用可追溯来源；模拟内容必须明确标为演示。'
    };
  }
  if (
    contract.assets.some((asset) => asset.modality === 'model-3d' || asset.sourcePriority[0] === 'user-supplied')
    || contract.experience.pattern === 'product-atmosphere'
  ) {
    return {
      level: 'product-faithful',
      strategy: legacyAssetStrategy(contract),
      disclosure: '关键产品身份由可核验素材承担；没有产品依据时不伪装为真实商品。'
    };
  }
  if (contract.assets.some((asset) => asset.modality !== 'procedural')) {
    return {
      level: 'editorial-credible',
      strategy: legacyAssetStrategy(contract),
      disclosure: '图片与媒体承担明确内容职责；生成内容不伪装为现场记录或事实证据。'
    };
  }
  return {
    level: 'conceptual-coherent',
    strategy: legacyAssetStrategy(contract),
    disclosure: '程序化或生成内容按概念表达使用，不伪装为真实测量、地点或商品。'
  };
}

function legacyAssetStrategy(contract: V2CreativeContract): string {
  if (contract.assets.length === 0) {
    return clip(`以语义 DOM 和必要的程序化表达承担“${contract.visualAnchor.subject}”，不制造无职责素材。`, 600);
  }
  return clip(
    `关键素材分别承担：${contract.assets.slice(0, 3).map((asset) => asset.visualResponsibility).join('；')}。`,
    600
  );
}

function fallbackPerformance(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel,
  primary: VisualRenderingMedium
): VisualAmbitionContract['fallbackPerformance'] {
  const runtimeHeavy = ['canvas-2d', 'webgl-shader', 'threejs-3d'].includes(primary);
  const mediaHeavy = ['raster-image', 'image-sequence', 'video'].includes(primary);
  const budgetMb = Math.min(25, Math.max(0.25,
    Math.round((contract.technical.maxInitialAssetBytes / 1024 / 1024) * 100) / 100
  ));
  return {
    targetFps: contract.technical.targetFrameTimeMs <= 20 ? 60 : 30,
    maxDevicePixelRatio: runtimeHeavy ? 2 : 2.5,
    initialTransferBudgetMb: budgetMb,
    mobileFallback: runtimeHeavy || intentLevel === 'immersive' || intentLevel === 'flagship'
      ? 'simplified-scene'
      : mediaHeavy
        ? 'key-visual-with-content'
        : 'equivalent',
    reducedMotionFallback: intentLevel === 'restrained' ? 'static-complete-state' : 'key-states',
    rendererFailureFallback: runtimeHeavy
      ? 'key-visual'
      : mediaHeavy
        ? 'alternate-media'
        : 'dom-content'
  };
}

function intentRationale(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel,
  positiveBrief: string
): string {
  const userExplicit = includesAny(positiveBrief, [
    '旗舰视觉', '旗舰级', '视觉冲击', '吸引眼球', '强视觉', '震撼', '电影级',
    '沉浸式', '沉浸体验', '实时 3d', '实时3d', 'three.js', 'threejs', 'webgl',
    'flagship', 'immersive'
  ]);
  const source = userExplicit ? '用户明确的体验要求' : '主题、叙事变化与运行时职责';
  return clip(
    `视觉野心等级 ${intentLevel} 来自${source}：${contract.experience.thesis}。它只决定本次内容需要的表达强度，不继承历史案例的布局、风格或渲染器禁令。`,
    600
  );
}

function renderingRationale(
  contract: V2CreativeContract,
  primary: VisualRenderingMedium,
  mediumDecision: CreativeMediumDecision
): string {
  return clip(
    `以 ${primary} 承担“${contract.visualAnchor.subject}”的主要可见职责；语义内容和行动仍由 DOM 保底。媒介依据：${mediumDecision.rationale}`,
    600
  );
}

function legacyRenderingRationale(
  contract: V2CreativeContract,
  primary: VisualRenderingMedium
): string {
  return clip(
    `以 ${primary} 承担“${contract.visualAnchor.subject}”的主要可见职责；语义内容和行动仍由 DOM 保底。选择依据是 ${contract.direction.renderer.reason}`,
    600
  );
}

function runtimeAdvantage(
  contract: V2CreativeContract,
  intentLevel: VisualAmbitionIntentLevel
): string {
  if (intentLevel === 'restrained') {
    return clip('本次内容以可读性和行动清晰度取胜，不为通过门槛强加静态截图之外的动态。', 600);
  }
  return clip(
    `运行时让用户从“${contract.experience.beats[0]!.visibleState}”抵达“${contract.experience.beats.at(-1)!.visibleState}”；这种状态变化服务于主题，不能由一张静态截图等价替代。`,
    600
  );
}

function motionTrigger(contract: V2CreativeContract, driver: VisualMotionDriver): string {
  if (driver === 'scroll') return '用户滚动推进体验';
  if (driver === 'pointer') return '用户用指针探索主体';
  if (driver === 'direct-input') return `用户执行“${clip(contract.direction.interaction.semanticAction, 120)}”`;
  if (driver === 'audio') return '用户播放或改变声音状态';
  if (driver === 'hybrid') return `用户执行“${clip(contract.direction.interaction.semanticAction, 110)}”并触发声音反馈`;
  if (driver === 'time') return '页面进入后按主题节奏展开';
  return '页面加载完成';
}

function positiveUserRequest(brief: string): string {
  const negativePrefix = /^(?:不要|避免|拒绝|禁止|不使用|无需|不需要)/i;
  return brief
    .split(/[。；;\n]/)
    .map((clause) => clause.trim())
    .filter(Boolean)
    .filter((clause) => !negativePrefix.test(clause))
    .map((clause) => clause.replace(
      /(?:，|,)?\s*(?:不要|避免|拒绝|禁止|不使用|无需|不需要)[^。；;\n]*$/i,
      ''
    ))
    .filter(Boolean)
    .join('。')
    .toLocaleLowerCase();
}

function includesAny(value: string, signals: readonly string[]): boolean {
  const normalized = value.toLocaleLowerCase();
  return signals.some((signal) => normalized.includes(signal.toLocaleLowerCase()));
}

function clip(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, Math.max(1, maximum - 1))}…`;
}
