import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createWowGateEvidenceFromBrowserObservations,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV2 } from '../src/v2/direct-creative-protocol.ts';
import {
  attachDirectCreativeEvidence,
  attachDirectCreativeWowEvidence,
  directCreativeRunSchema,
  finalizeDirectCreativeRun,
  isDirectCreativeRunArchiveEligible,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate,
  type DirectCreativeRun
} from '../src/v2/direct-creative-run.ts';
import {
  assessDirectVisualQuality,
  createFinalCreativeEvidence,
  evaluateFinalCreativeEvidence
} from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

export const r125IceCoreBrief = [
  '为对气候记忆好奇的普通访客设计一封可以走进冰层的“冰芯来信”网页。',
  '开场看见峡谷中的透明冰芯，向下滚动依次穿过气泡、火山灰与花粉层，让同一环境和同一冰芯逐层显出时间痕迹，最后写一封给未来的信。',
  '使用真实感冰川环境图与程序化 Three.js 冰芯形成有深度的空间旅程，不做持久参数工作台。',
  '最终行动为“把这张纸夹进时间里”。',
  '页面明确说明这是一种冰芯阅读的概念演示，不把可见层位伪装成真实科学测量结果。'
].join('');

export const r125IceCoreIdentity = {
  runId: 'direct-r125-ice-core-letters',
  bundleHash: 'de2fe28ea88ca9d6c238947c634ccbe92f11793422c31f448c2c310d0a94f031'
} as const;

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type IceCoreState = {
  ready: boolean;
  state: string;
  activeState: string;
  phase: string;
  activeLayer: string;
  activeIndex: number;
  progress: number;
  canvasVisualHash: string;
  dialogOpen: boolean;
  sealed: boolean;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  environmentLoaded: boolean;
  horizontalOverflow: boolean;
};

type ReportObservation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  readyAtMs?: number;
  state?: IceCoreState;
  states?: Record<string, IceCoreState>;
  canvasVisualHashes?: string[];
  visibleScreenshotHashes?: string[];
  semantic?: Record<string, unknown>;
};

type R125BrowserReport = {
  schemaVersion: number;
  stage: string;
  capturedAt: string;
  identityBinding: string;
  runId: string;
  bundleHash: string;
  route: string;
  revision: string;
  captures: string[];
  observations: ReportObservation[];
};

const evidencePath = new URL(
  '../docs/v2-research/evidence/r125-ice-core-letters.direct-creative-run.json',
  import.meta.url
);
const reportPath = new URL(
  '../docs/v2-research/evidence/r125-ice-core-letters/report.json',
  import.meta.url
);
const sourceRoot = new URL('../pages/v2/deliveries/ice-core-letters/', import.meta.url);

function readR125BrowserReport(): R125BrowserReport {
  return JSON.parse(readFileSync(reportPath, 'utf8')) as R125BrowserReport;
}

function state(observation: ReportObservation): IceCoreState {
  if (!observation.state) throw new Error(`Missing state for ${observation.checkpoint}`);
  return observation.state;
}

export function r125BrowserObservations(): AdaptiveBrowserWowObservations {
  const report = readR125BrowserReport();
  const [opening, journey, letter, mobile, fallback] = report.observations;
  const openingState = state(opening);
  const letterState = state(letter);
  const mobileState = state(mobile);
  const fallbackState = state(fallback);
  const journeyStates = Object.values(journey.states || {});
  const allIssues = report.observations.flatMap((observation) => observation.issues.pageErrors);
  const consoleErrors = report.observations.flatMap((observation) => observation.issues.consoleErrors);
  const blockingResourceFailures = report.observations.flatMap((observation) => [
    ...observation.issues.requestFailures,
    ...observation.issues.responseErrors
  ]);

  return {
    hero: {
      observed: openingState.ready,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: openingState.environmentLoaded && openingState.canvasVisualHash.length > 0,
      score: 92,
      summary: '桌面开场在 1919ms 内同时呈现完整冰川峡谷与透明 Three.js 冰芯，主题、尺度和向下阅读方向立即可辨。'
    },
    runtime: {
      surfaceVisible: journeyStates.every((item) => item.ready),
      stateChanged: journeyStates.map((item) => item.activeState).join('|') === 'air-bubbles|ash-band|pollen-summer',
      visualOutputChanged: new Set(journey.canvasVisualHashes || []).size === 3,
      advantageOverStaticObserved: new Set(journey.visibleScreenshotHashes || []).size === 3,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 91,
      summary: '浏览器按顺序抵达气泡、火山灰和花粉层；状态、画布哈希与可见截图哈希均同步变化，证明滚动不是静态背景替换。'
    },
    theme: {
      themeSpecificMemoryObserved: letterState.activeState === 'letter-ready' && letterState.sealed,
      score: 92,
      summary: '可复述记忆是沿一根透明冰芯下潜阅读三种自然痕迹，并把写给未来的话封存在当前层位。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: journeyStates.length === 3
        && journeyStates.every((item, index) => item.activeIndex === index + 1),
      score: 91,
      summary: '滚动持续改变冰芯内部层位、相机深度和证据高亮，空间纵深直接解释时间向下累积。'
    },
    assets: {
      criticalAssetsLoaded: openingState.environmentLoaded,
      integratedWithScene: openingState.ready && journeyStates.every((item) => item.environmentLoaded),
      credible: true,
      score: 89,
      summary: '生成的冰川峡谷承担真实环境尺度，程序化冰芯承担层位与动态职责；页面明确披露概念演示边界。'
    },
    craft: {
      cohesive: true,
      score: 90,
      summary: '低饱和冰蓝环境、半透明冰芯、档案纸张与克制排版形成统一的“自然档案”语言。'
    },
    interaction: {
      input: '鼠标滚轮、触控滚动与键盘段落导航',
      stateChanged: journeyStates.length === 3,
      visualOutputChanged: new Set(journey.canvasVisualHashes || []).size === 3,
      semanticOutputChanged: journeyStates.map((item) => item.activeLayer).join('|') === 'air-bubbles|ash-band|pollen-summer',
      summary: '滚动和键盘改变同一空间路线中的激活层位、冰芯材质与证据说明，并最终抵达写信行动。'
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobileState.horizontalOverflow,
      contentReadable: mobileState.ready && mobileState.reducedMotion,
      primaryActionReachable: mobile.semantic?.endKeyReached === 'letter-ready',
      summary: '390×844 reduced-motion 状态无横向溢出，End 键可抵达写信段落，主体、证据卡与主要行动保持可读。'
    },
    fallback: {
      exercised: fallbackState.fallback,
      rendered: fallbackState.ready,
      themePreserved: fallbackState.activeState === 'letter-ready' && fallbackState.environmentLoaded,
      contentPreserved: fallbackState.sealed,
      primaryActionReachable: fallbackState.saved,
      summary: '强制 WebGL fallback 仍保留冰川环境、层位旅程、写信与本地封存结果。'
    },
    errors: {
      pageErrors: allIssues,
      consoleErrors,
      blockingResourceFailures
    }
  };
}

export function buildR125IceCoreRun(): DirectCreativeRun {
  const contract = createV2CreativeContract(r125IceCoreBrief);
  let run = createDirectCreativeRunFromContractV2(contract);
  run = directCreativeRunSchema.parse({
    ...run,
    id: r125IceCoreIdentity.runId,
    goalPlayback: {
      ...run.goalPlayback,
      desiredOutcome: '沿同一冰芯从表层进入气泡、火山灰与花粉层，理解自然痕迹如何成为时间记忆，并以一封给未来的信收束。',
      preferences: [
        '真实、安静、自然冰材质',
        '纵向空间旅程与内容自适应长度',
        '不使用持久参数面板，不虚构科学测量数据'
      ]
    },
    selectedDirection: {
      ...run.selectedDirection,
      experienceForm: 'scroll-journey',
      rationale: '以同一冰川环境和同一冰芯构成向下的空间时间轴；滚动逐层显出气泡、火山灰与花粉，最后从观察自然痕迹收束到写给未来的行动。'
    },
    referencePrinciples: [
      {
        referenceId: 'positive-dream-room-memory',
        title: '梦境记录 · 同一环境逐渐形成',
        principle: '借用“同一环境的可见状态变化承载记忆形成”的原理，让冰川地点、观察关系和冰芯身份在整个旅程中保持连续。',
        relevance: '冰芯同样是通过同一环境中的层位变化阅读记忆；只借连续环境与最终记录行动的因果，不复制梦境题材或房间布局。',
        sourceUri: '../cases/dedicated-8574ee46ab16/'
      },
      {
        referenceId: 'positive-cloud-observatory-journey',
        title: '云上观测站 · 可定位的空间旅程',
        principle: '只借“开场定位、沿明确路线穿越、在可辨认终点停留”的空间路线机制，使滚动具有接近与抵达感。',
        relevance: '冰芯页面需要从峡谷开场沿垂直路线进入不同层位；不借观测站题材、建筑视觉或科技风格。',
        sourceUri: '../cases/dedicated-896cfb7e6657/'
      }
    ],
    assetPlan: {
      batchId: 'assets-r125-ice-core-letters',
      strategy: 'mixed',
      rationale: '唯一素材批次同时产出自然冰川环境图与程序化 Three.js 冰芯；环境承担地点和光线，冰芯承担层位、深度与滚动变化。',
      assets: [
        {
          id: 'glacier-crevasse-environment-v1',
          role: '提供可连续延展的冰川峡谷、自然光线与真实空间尺度',
          source: 'generated',
          required: true
        },
        {
          id: 'programmatic-ice-core',
          role: '以透明 Three.js 冰芯承载气泡、火山灰、花粉层与滚动驱动的相机深度',
          source: 'programmatic',
          required: true
        }
      ]
    },
    interactionRationale: {
      mode: 'scroll',
      audioApplicable: false,
      rationale: '滚动沿同一冰芯的垂直层位推进相机、材质和证据说明，最后抵达写信与封存行动。'
    }
  });
  run = recordDirectCreativeAttempt(run, 'asset-batch');
  run = recordDirectCreativeAttempt(run, 'build');
  run = recordDirectCreativeAttempt(run, 'visual-refinement');
  run = setDirectCreativeFinalCandidate(run, r125IceCoreIdentity);

  const macroStructureReview = reviewMacroStructureContentFit({
    candidate: {
      runId: r125IceCoreIdentity.runId,
      layout: 'spatial-journey',
      persistentControlPanel: false,
      visibleParameterControls: false,
      realtimeMetricCluster: false,
      primaryAction: 'record-or-contribute'
    },
    recent: [],
    contentEvidence: {
      concurrentParameterCount: 0,
      realtimeFeedbackRequired: false,
      primaryActionDependsOnCurrentState: false,
      persistentControlsExplicitlyRequested: false,
      rationale: '内容需要连续下潜阅读自然层位并在终点记录一封信，不需要常驻参数控件或实时指标簇。'
    }
  });

  const visualQuality = assessDirectVisualQuality({
    dimensions: {
      goalClarity: 93,
      creativeDistinctiveness: 92,
      craftCohesion: 90,
      assetIntegration: 89,
      interactionValue: 91,
      mobileReadiness: 90
    },
    summary: '真实感冰川环境、透明冰芯与档案纸张形成主题专属空间旅程；滚动把自然层位与写信行动连接起来，移动端和回退保留完整路径。',
    findings: [{
      code: 'conceptual-ice-core-fidelity',
      severity: 'minor',
      checkpoint: 'core',
      message: '可见冰芯是用于解释层位阅读的概念模型，不是具有真实年代、温度或化学数据的科学测量模型；页面已明确披露。'
    }]
  }, run.interactionRationale);

  const checkpoint = (kind: 'opening' | 'core' | 'mobile' | 'scroll', summary: string) => ({
    kind,
    ...r125IceCoreIdentity,
    passed: true,
    summary
  });
  const finalEvidence = createFinalCreativeEvidence({
    identity: r125IceCoreIdentity,
    interaction: run.interactionRationale,
    checkpoints: [
      checkpoint('opening', '桌面高质量开场在 1919ms 内加载冰川峡谷和透明冰芯，无页面、控制台、请求或响应错误。'),
      checkpoint('core', '同一冰芯在同一环境中连续承担气泡、火山灰与花粉层位，关键生成素材与程序化主体都实际可见。'),
      checkpoint('mobile', '390×844 reduced-motion 无横向溢出，语义内容和“把这张纸夹进时间里”行动可达。'),
      checkpoint('scroll', '滚动和段落导航真实改变激活层位、相机深度、材质状态与可见截图哈希，并在终点打开和封存信件。')
    ],
    hardGates: {
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null
    },
    visualQuality,
    macroStructureReview
  });
  const wowEvidence = createWowGateEvidenceFromBrowserObservations({
    identity: r125IceCoreIdentity,
    contract: run.visualAmbition!,
    observations: r125BrowserObservations()
  });

  run = attachDirectCreativeEvidence(run, finalEvidence);
  run = attachDirectCreativeWowEvidence(run, wowEvidence);
  return finalizeDirectCreativeRun(run);
}

describe('R125 ice-core-letters final evidence', () => {
  it('persists the same bounded V2 direct run rebuilt from the contract and browser evidence', () => {
    const rebuilt = buildR125IceCoreRun();
    const persisted = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(persisted).toEqual(rebuilt);
    expect(persisted).toMatchObject({
      id: r125IceCoreIdentity.runId,
      creativeProtocolVersion: 2,
      finalCandidate: r125IceCoreIdentity,
      verdict: 'pass',
      stopReason: null
    });
    expect(persisted.goalPlayback.originalBrief).toBe(r125IceCoreBrief);
    expect(persisted.interactionRationale).toMatchObject({ mode: 'scroll', audioApplicable: false });
    expect(persisted.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 0,
      visualRefinements: 1
    });
    expect(persisted.assetPlan).toMatchObject({
      strategy: 'mixed',
      assets: [
        { id: 'glacier-crevasse-environment-v1', source: 'generated', required: true },
        { id: 'programmatic-ice-core', source: 'programmatic', required: true }
      ]
    });
    expect(persisted.referencePrinciples.map((reference) => reference.referenceId)).toEqual([
      'positive-dream-room-memory',
      'positive-cloud-observatory-journey'
    ]);
    expect(persisted.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'scroll'
    ]);
    expect(persisted.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'spatial-journey',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'record-or-contribute'
      }
    });
    expect(persisted.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 91 });
    expect(persisted.wowEvidence?.assessment).toMatchObject({ verdict: 'pass', score: 91 });

    expect(evaluateFinalCreativeEvidence(
      persisted.adaptiveEvidence,
      r125IceCoreIdentity
    )).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      structurePassed: true,
      qualityPassed: true,
      archiveEligible: true
    });
    expect(evaluateWowGateEvidence(
      persisted.wowEvidence,
      r125IceCoreIdentity,
      persisted.visualAmbition!
    )).toMatchObject({ identityValid: true, intentValid: true, passed: true });
    expect(isDirectCreativeRunArchiveEligible(persisted)).toBe(true);
  });

  it('binds all five browser scenarios and clean observations to the frozen identity', () => {
    const report = readR125BrowserReport();

    expect(report).toMatchObject({
      schemaVersion: 1,
      capturedAt: expect.any(String),
      identityBinding: 'runId+bundleHash',
      ...r125IceCoreIdentity,
      route: '/pages/v2/deliveries/ice-core-letters/',
      revision: 'r125-proof',
      captures: [
        '01-desktop-opening.png',
        '02-desktop-mid-scroll.png',
        '03-desktop-letter.png',
        '04-mobile-reduced.png',
        '05-fallback.png'
      ]
    });
    expect(report.observations.map((observation) => observation.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-api-state-journey',
      'desktop-letter',
      'mobile-reduced',
      'forced-fallback'
    ]);
    for (const observation of report.observations) {
      expect(observation.issues).toEqual({
        pageErrors: [],
        consoleErrors: [],
        requestFailures: [],
        responseErrors: []
      });
    }

    const [opening, journey, letter, mobile, fallback] = report.observations;
    expect(opening.readyAtMs).toBeLessThanOrEqual(3_000);
    expect(new Set(journey.canvasVisualHashes).size).toBe(3);
    expect(new Set(journey.visibleScreenshotHashes).size).toBe(3);
    expect(Object.values(journey.states || {}).map((item) => item.activeState)).toEqual([
      'air-bubbles', 'ash-band', 'pollen-summer'
    ]);
    expect(state(letter)).toMatchObject({ activeState: 'letter-ready', dialogOpen: true, sealed: true, saved: true });
    expect(letter.semantic).toEqual({ closeMethod: 'Escape', focusReturnedTo: 'open-letter' });
    expect(state(mobile)).toMatchObject({ reducedMotion: true, horizontalOverflow: false, activeState: 'letter-ready' });
    expect(state(fallback)).toMatchObject({ fallback: true, sealed: true, saved: true });
  });

  it('recomputes the final bundle hash from the ordered frozen source bytes', () => {
    const hash = createHash('sha256');
    for (const fileName of ['index.html', 'style.css', 'main.ts']) {
      hash.update(fileName);
      hash.update(Buffer.from([0]));
      hash.update(readFileSync(new URL(fileName, sourceRoot)));
    }
    expect(hash.digest('hex')).toBe(r125IceCoreIdentity.bundleHash);
  });
});
