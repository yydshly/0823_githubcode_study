import { z } from 'zod';
import {
  finalCreativeIdentitySchema,
  type FinalCreativeIdentity
} from './final-creative-evidence.ts';
import {
  assessWowAttraction,
  createWowGateEvidence,
  visualAmbitionContractSchema,
  type VisualAmbitionContract,
  type WowGateEvidence,
  type WowGateFinding
} from './visual-ambition.ts';

const observationSummarySchema = z.string().trim().min(4).max(500);
const observationScoreSchema = z.number().int().min(0).max(100);

export const adaptiveBrowserHeroObservationSchema = z.object({
  observed: z.boolean(),
  completedAtMs: z.number().finite().nonnegative().max(60_000).nullable(),
  visibleChangeObserved: z.boolean(),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict().superRefine((hero, context) => {
  if (hero.observed !== (hero.completedAtMs !== null)) {
    context.addIssue({
      code: 'custom',
      message: 'Hero 的 observed 与 completedAtMs 必须描述同一次可观察完成状态。'
    });
  }
});

export const adaptiveBrowserRuntimeObservationSchema = z.object({
  surfaceVisible: z.boolean(),
  stateChanged: z.boolean(),
  visualOutputChanged: z.boolean(),
  advantageOverStaticObserved: z.boolean(),
  comparisonMethod: z.enum([
    'pixel-diff',
    'canvas-buffer-diff',
    'media-time',
    'dom-geometry',
    'semantic-state-plus-visual'
  ]),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict().superRefine((runtime, context) => {
  if (
    runtime.advantageOverStaticObserved
    && (!runtime.surfaceVisible || !runtime.stateChanged || !runtime.visualOutputChanged)
  ) {
    context.addIssue({
      code: 'custom',
      message: '运行时优势必须同时具有可见表面、状态变化和非平凡视觉变化。'
    });
  }
});

export const adaptiveBrowserThemeObservationSchema = z.object({
  themeSpecificMemoryObserved: z.boolean(),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserMotionDepthObservationSchema = z.object({
  meaningfulMotionOrDepthObserved: z.boolean(),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserAssetObservationSchema = z.object({
  criticalAssetsLoaded: z.boolean(),
  integratedWithScene: z.boolean(),
  credible: z.boolean(),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict().superRefine((assets, context) => {
  if (assets.credible && (!assets.criticalAssetsLoaded || !assets.integratedWithScene)) {
    context.addIssue({
      code: 'custom',
      message: '素材只有在关键资源已加载且融入场景时才能标记为可信。'
    });
  }
});

export const adaptiveBrowserCraftObservationSchema = z.object({
  cohesive: z.boolean(),
  score: observationScoreSchema,
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserInteractionObservationSchema = z.object({
  input: z.string().trim().min(2).max(180),
  stateChanged: z.boolean(),
  visualOutputChanged: z.boolean(),
  semanticOutputChanged: z.boolean(),
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserMobileObservationSchema = z.object({
  viewportWidth: z.number().int().min(240).max(600),
  noHorizontalOverflow: z.boolean(),
  contentReadable: z.boolean(),
  primaryActionReachable: z.boolean(),
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserFallbackObservationSchema = z.object({
  exercised: z.boolean(),
  rendered: z.boolean(),
  themePreserved: z.boolean(),
  contentPreserved: z.boolean(),
  primaryActionReachable: z.boolean(),
  summary: observationSummarySchema
}).strict();

export const adaptiveBrowserErrorObservationSchema = z.object({
  pageErrors: z.array(z.string().trim().min(1).max(500)).max(20),
  consoleErrors: z.array(z.string().trim().min(1).max(500)).max(20),
  blockingResourceFailures: z.array(z.string().trim().min(1).max(500)).max(20)
}).strict();

/**
 * Browser observations are deliberately renderer-neutral. A DOM editorial
 * composition, SVG scene, video, Canvas or WebGL page can all supply the same
 * causal facts without turning one implementation technique into a hard rule.
 */
export const adaptiveBrowserWowObservationsSchema = z.object({
  hero: adaptiveBrowserHeroObservationSchema,
  runtime: adaptiveBrowserRuntimeObservationSchema,
  theme: adaptiveBrowserThemeObservationSchema,
  motionDepth: adaptiveBrowserMotionDepthObservationSchema,
  assets: adaptiveBrowserAssetObservationSchema,
  craft: adaptiveBrowserCraftObservationSchema,
  interaction: adaptiveBrowserInteractionObservationSchema.nullable(),
  mobile: adaptiveBrowserMobileObservationSchema,
  fallback: adaptiveBrowserFallbackObservationSchema,
  errors: adaptiveBrowserErrorObservationSchema
}).strict();

export type AdaptiveBrowserWowObservations = z.infer<
  typeof adaptiveBrowserWowObservationsSchema
>;

export const adaptiveWowEvidenceInputSchema = z.object({
  identity: finalCreativeIdentitySchema,
  contract: visualAmbitionContractSchema,
  observations: adaptiveBrowserWowObservationsSchema
}).strict();

export type AdaptiveWowEvidenceInput = z.infer<typeof adaptiveWowEvidenceInputSchema>;

/**
 * Converts bounded, adaptive browser observations into the existing
 * identity-bound WowGateEvidence consumed by DirectCreativeRun.
 *
 * This adapter does not invent a second pass threshold. It normalizes the
 * browser facts and delegates scoring/verdict consistency to WowGate itself.
 */
export function createWowGateEvidenceFromBrowserObservations(
  input: AdaptiveWowEvidenceInput
): WowGateEvidence {
  const parsed = adaptiveWowEvidenceInputSchema.parse(input);
  const { identity, contract, observations } = parsed;
  const interactionPromised = isInteractionPromisedByAmbition(contract);
  const interactionPassed = !interactionPromised || isCausalInteraction(observations.interaction);
  const heroTargetMs = contract.heroMoment.appearsWithinSeconds * 1000;
  const heroOnTime = observations.hero.completedAtMs !== null
    && observations.hero.completedAtMs <= heroTargetMs;
  const heroObserved = observations.hero.observed
    && observations.hero.visibleChangeObserved
    && heroOnTime;
  const runtimeObserved = observations.runtime.surfaceVisible
    && observations.runtime.stateChanged
    && observations.runtime.visualOutputChanged
    && observations.runtime.advantageOverStaticObserved;
  const assetsObserved = observations.assets.criticalAssetsLoaded
    && observations.assets.integratedWithScene
    && observations.assets.credible;
  const meaningfulMotionObserved = observations.motionDepth.meaningfulMotionOrDepthObserved
    && interactionPassed;
  const findings = collectFindings({
    observations,
    heroTargetMs,
    heroObserved,
    runtimeObserved,
    assetsObserved,
    interactionPromised,
    interactionPassed
  });

  const assessment = assessWowAttraction({
    dimensions: {
      fiveSecondImpact: observations.hero.score,
      runtimeAdvantage: observations.runtime.score,
      themeMemorability: observations.theme.score,
      motionDepthMeaning: observations.motionDepth.score,
      assetIntegrationCredibility: observations.assets.score,
      craftCohesion: observations.craft.score
    },
    observation: {
      heroMomentObserved: heroObserved,
      runtimeAdvantageOverStaticObserved: runtimeObserved,
      themeSpecificMemoryObserved: observations.theme.themeSpecificMemoryObserved,
      meaningfulMotionOrDepthObserved: meaningfulMotionObserved,
      credibleAssetIntegrationObserved: assetsObserved,
      summary: buildObservationSummary(observations, interactionPromised)
    },
    findings
  }, contract);

  return createWowGateEvidence({ identity, assessment });
}

/**
 * The contract, rather than the evidence author, decides whether causal input
 * verification is applicable. Time-only experiences therefore are not
 * penalized for omitting a fabricated interaction.
 */
export function isInteractionPromisedByAmbition(
  contract: VisualAmbitionContract
): boolean {
  const parsed = visualAmbitionContractSchema.parse(contract);
  return parsed.interactionToScene.length > 0 || parsed.motionArc.beats.some((beat) =>
    ['scroll', 'pointer', 'direct-input', 'audio', 'hybrid'].includes(beat.driver)
  );
}

interface FindingContext {
  observations: AdaptiveBrowserWowObservations;
  heroTargetMs: number;
  heroObserved: boolean;
  runtimeObserved: boolean;
  assetsObserved: boolean;
  interactionPromised: boolean;
  interactionPassed: boolean;
}

function collectFindings(context: FindingContext): WowGateFinding[] {
  const {
    observations,
    heroTargetMs,
    heroObserved,
    runtimeObserved,
    assetsObserved,
    interactionPromised,
    interactionPassed
  } = context;
  const findings: WowGateFinding[] = [];
  const add = (finding: WowGateFinding): void => {
    if (findings.length < 12) findings.push(finding);
  };

  if (!heroObserved) {
    const late = observations.hero.completedAtMs !== null
      && observations.hero.completedAtMs > heroTargetMs;
    add({
      code: late ? 'hero-late' : 'hero-not-observed',
      severity: 'major',
      message: late
        ? `Hero 在 ${observations.hero.completedAtMs}ms 完成，晚于承诺的 ${heroTargetMs}ms。`
        : '浏览器没有观察到按承诺完成且可见变化的 Hero Moment。'
    });
  }
  if (!runtimeObserved) {
    add({
      code: 'runtime-static-equivalent',
      severity: 'major',
      message: `未通过 ${observations.runtime.comparisonMethod} 证明运行结果优于静态截图。`
    });
  }
  if (!observations.theme.themeSpecificMemoryObserved) {
    add({
      code: 'theme-memory-generic',
      severity: 'major',
      message: '浏览器观察未形成主题专属、可复述的视觉记忆。'
    });
  }
  if (!observations.motionDepth.meaningfulMotionOrDepthObserved) {
    add({
      code: 'motion-depth-not-meaningful',
      severity: 'major',
      message: '已观察的运动或空间深度没有强化主题或产品含义。'
    });
  }
  if (!assetsObserved) {
    add({
      code: observations.assets.criticalAssetsLoaded
        ? 'asset-integration-not-credible'
        : 'critical-assets-missing',
      severity: observations.assets.criticalAssetsLoaded ? 'major' : 'blocking',
      message: observations.assets.criticalAssetsLoaded
        ? '关键素材已经加载，但没有自然融入场景或可信表达。'
        : '关键素材没有在最终浏览器状态中真实加载。'
    });
  }
  if (!observations.craft.cohesive) {
    add({
      code: 'craft-not-cohesive',
      severity: 'major',
      message: '构图、排版、色彩、素材与动态尚未形成统一视觉语言。'
    });
  }
  if (interactionPromised && !interactionPassed) {
    add({
      code: observations.interaction === null
        ? 'promised-interaction-missing'
        : 'promised-interaction-not-causal',
      severity: 'blocking',
      message: observations.interaction === null
        ? '视觉野心合同承诺了真实输入，但没有提供浏览器交互观察。'
        : '真实输入没有同时引起状态变化以及可见或语义输出变化。'
    });
  }
  if (
    !observations.mobile.noHorizontalOverflow
    || !observations.mobile.contentReadable
    || !observations.mobile.primaryActionReachable
  ) {
    add({
      code: 'mobile-state-incomplete',
      severity: 'major',
      message: `${observations.mobile.viewportWidth}px 状态存在溢出、不可读内容或不可达主要行动。`
    });
  }
  if (
    !observations.fallback.exercised
    || !observations.fallback.rendered
    || !observations.fallback.themePreserved
    || !observations.fallback.contentPreserved
    || !observations.fallback.primaryActionReachable
  ) {
    add({
      code: 'fallback-state-incomplete',
      severity: 'major',
      message: '回退状态未被真实触发，或没有保留主题、内容与主要行动。'
    });
  }
  if (observations.errors.pageErrors.length > 0) {
    add({
      code: 'page-errors-observed',
      severity: 'blocking',
      message: `最终浏览器状态出现 ${observations.errors.pageErrors.length} 个 pageerror。`
    });
  }
  if (observations.errors.consoleErrors.length > 0) {
    add({
      code: 'console-errors-observed',
      severity: 'blocking',
      message: `最终浏览器状态出现 ${observations.errors.consoleErrors.length} 个 console error。`
    });
  }
  if (observations.errors.blockingResourceFailures.length > 0) {
    add({
      code: 'resource-failures-observed',
      severity: 'blocking',
      message: `最终浏览器状态出现 ${observations.errors.blockingResourceFailures.length} 个阻断资源失败。`
    });
  }

  return findings;
}

function isCausalInteraction(
  interaction: AdaptiveBrowserWowObservations['interaction']
): boolean {
  return interaction !== null
    && interaction.stateChanged
    && (interaction.visualOutputChanged || interaction.semanticOutputChanged);
}

function buildObservationSummary(
  observations: AdaptiveBrowserWowObservations,
  interactionPromised: boolean
): string {
  const interaction = interactionPromised
    ? observations.interaction?.summary || '承诺交互未观察。'
    : '当前创意没有承诺直接输入，交互证据不适用。';
  return truncate([
    observations.hero.summary,
    observations.runtime.summary,
    observations.theme.summary,
    observations.motionDepth.summary,
    observations.assets.summary,
    observations.craft.summary,
    interaction,
    observations.mobile.summary,
    observations.fallback.summary
  ].join(' '), 700);
}

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

export type { FinalCreativeIdentity };
