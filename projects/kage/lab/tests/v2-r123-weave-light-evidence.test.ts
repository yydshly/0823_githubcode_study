import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createWowGateEvidenceFromBrowserObservations,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContract } from '../src/v2/direct-creative-protocol.ts';
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
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

export const r123WeaveLightBrief = '为对纺织工艺好奇的年轻访客设计一座明亮的「经纬光场」空间提花织机网页。开场让这台旗舰 Three.js 纤维构造装置从空纱架逐层展开经纱、综丝、梭子和卷布轴；点击、触摸、键盘或拉动梭子，每推进一梭，三组部件错峰升降，彩色纬纱累计织成可辨认的晨鸟纹样，织造行数、纹样说明与前后对比同步变化。最终行动为“保存我的织纹”。使用暖白日光、朱砂、靛蓝、姜黄与真实纤维质感；保持一个持续空间舞台，不使用滑杆工作台、固定三屏、暗色科技、随机粒子或只改文字不改织物。明确这是空间织造教学演示，不代表真实织机参数。';

export const r123WeaveLightIdentity = {
  runId: 'direct-1uton5v',
  bundleHash: 'd399249270d7965666d19f9f6287593ce03324dce54e66206c7ad40940ce91d0'
} as const;

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type WeaveRuntimeState = {
  ready: boolean;
  phase: string;
  step: number;
  wovenRows: number;
  maxRows: number;
  completed: boolean;
  saved: boolean;
  pattern: string;
  clothProgress: number;
  warpCount: number;
  visibleWeftCords: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
};

type RuntimeObservation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  openingCompletedAtMs?: number;
  visualHashBefore?: string;
  visualHashAfter?: string;
  state: WeaveRuntimeState;
  semantic?: Record<string, unknown>;
};

type R123BrowserReport = {
  schemaVersion: number;
  capturedAt: string;
  identityBinding: string;
  runId: string;
  bundleHash: string;
  revision: string;
  captures: string[];
  observations: RuntimeObservation[];
};

const evidencePath = new URL(
  '../docs/v2-research/evidence/r123-weave-light-field.direct-creative-run.json',
  import.meta.url
);
const reportPath = new URL(
  '../docs/v2-research/evidence/r123-weave-light-field/report.json',
  import.meta.url
);
const sourceRoot = new URL('../pages/v2/deliveries/weave-light-field/', import.meta.url);

function readR123BrowserReport(): R123BrowserReport {
  return JSON.parse(readFileSync(reportPath, 'utf8')) as R123BrowserReport;
}

export function r123BrowserObservations(): AdaptiveBrowserWowObservations {
  const report = readR123BrowserReport();
  const [opening, interaction, saved, mobile, fallback] = report.observations;
  const pageErrors = report.observations.flatMap((observation) => observation.issues.pageErrors);
  const consoleErrors = report.observations.flatMap((observation) => observation.issues.consoleErrors);
  const blockingResourceFailures = report.observations.flatMap((observation) => [
    ...observation.issues.requestFailures,
    ...observation.issues.responseErrors
  ]);

  return {
    hero: {
      observed: opening.state.ready,
      completedAtMs: opening.openingCompletedAtMs ?? null,
      visibleChangeObserved: opening.state.ready && opening.state.pattern === '空纱架',
      score: 94,
      summary: '桌面高质量模式在 2489ms 内从空场逐层展开经纱、综丝、梭子与卷布轴，形成完整可辨认的明亮空间提花织机。'
    },
    runtime: {
      surfaceVisible: interaction.state.ready,
      stateChanged: interaction.state.step === 3,
      visualOutputChanged: interaction.visualHashBefore !== interaction.visualHashAfter,
      advantageOverStaticObserved: interaction.state.visibleWeftCords === 9,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 96,
      summary: '真实点击、键盘与画布梭子拖动依次推进三梭；织物像素哈希、纬纱数量、织造行数和晨鸟纹样同步改变。'
    },
    theme: {
      themeSpecificMemoryObserved: saved.state.pattern === '晨鸟纹完整',
      score: 95,
      summary: '可复述记忆是暖白日光中的提花织机逐梭把朱砂、靛蓝与姜黄纬纱织成完整晨鸟纹。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: interaction.state.clothProgress === 0.5,
      score: 94,
      summary: '梭子横穿、三组综丝错峰升降、经纬纱深度和卷布轴累计共同解释织造过程，而非装饰性运动。'
    },
    assets: {
      criticalAssetsLoaded: opening.state.warpCount === 54,
      integratedWithScene: saved.state.visibleWeftCords === 18,
      credible: true,
      score: 90,
      summary: '程序化关节织机完整承担经纱、综丝、梭子、纬纱和卷布轴的可见职责；页面如实标明这是空间教学演示而非真实参数。'
    },
    craft: {
      cohesive: true,
      score: 92,
      summary: '暖白舞台、纤维质感、朱砂靛蓝姜黄配色、编辑排版与织造状态形成统一且明亮的主题语言。'
    },
    interaction: {
      input: '点击、键盘与画布梭子拖动',
      stateChanged: interaction.state.step === 3,
      visualOutputChanged: interaction.visualHashBefore !== interaction.visualHashAfter,
      semanticOutputChanged: interaction.semantic !== undefined,
      summary: '点击推进晨光底纬，键盘推进靛蓝翼根，画布拖动推进朱砂鸟喙；三种输入都改变同一织物主体与语义状态。'
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobile.state.horizontalOverflow,
      contentReadable: mobile.state.ready,
      primaryActionReachable: mobile.semantic?.completedAndSaved === true,
      summary: '390×844 reduced-motion 低质量模式无横向溢出，织机、织造步骤与“保存我的织纹”行动完整可达并已验证保存。'
    },
    fallback: {
      exercised: fallback.state.fallback,
      rendered: fallback.state.ready,
      themePreserved: fallback.state.pattern === '晨鸟纹完整',
      contentPreserved: fallback.state.completed,
      primaryActionReachable: fallback.state.saved,
      summary: '强制渲染器 fallback 仍保留提花织机、完整晨鸟纹、逐行揭示内容和已保存的最终行动。'
    },
    errors: {
      pageErrors,
      consoleErrors,
      blockingResourceFailures
    }
  };
}

export function buildR123WeaveLightRun(): DirectCreativeRun {
  const contract = createV2CreativeContract(r123WeaveLightBrief);
  let run = createDirectCreativeRunFromContract(contract);
  run = recordDirectCreativeAttempt(run, 'asset-batch');
  run = recordDirectCreativeAttempt(run, 'build');
  run = recordDirectCreativeAttempt(run, 'deterministic-repair');
  run = setDirectCreativeFinalCandidate(run, r123WeaveLightIdentity);

  const visualQuality = assessDirectVisualQuality({
    dimensions: {
      goalClarity: 94,
      creativeDistinctiveness: 95,
      craftCohesion: 92,
      assetIntegration: 90,
      interactionValue: 96,
      mobileReadiness: 91
    },
    summary: '明亮空间提花织机、逐梭累积的晨鸟纹与三种同源输入形成主题专属因果；桌面、移动端、减弱动效和渲染回退均保留完整任务。',
    findings: [{
      code: 'conceptual-machine-fidelity',
      severity: 'minor',
      checkpoint: 'core',
      message: '织机是强调空间教学与晨鸟纹形成过程的程序化概念装置；页面明确不把它声明为真实织机参数或机械仿真。'
    }]
  }, run.interactionRationale);

  const checkpoint = (kind: 'opening' | 'core' | 'mobile' | 'interaction', summary: string) => ({
    kind,
    ...r123WeaveLightIdentity,
    passed: true,
    summary
  });
  const finalEvidence = createFinalCreativeEvidence({
    identity: r123WeaveLightIdentity,
    interaction: run.interactionRationale,
    checkpoints: [
      checkpoint('opening', '桌面高质量模式在 2489ms 内展开完整 Three.js 空间提花织机，暖白舞台和全部关键部件可见且无运行错误。'),
      checkpoint('core', '一个持续空间舞台承载经纱、综丝、梭子、卷布轴与逐梭形成的晨鸟纹，没有退化为滑杆工作台、固定三屏或纯文字切换。'),
      checkpoint('mobile', '390×844 reduced-motion 模式无横向溢出；低质量场景与强制 fallback 都保留完整织造、说明和保存旅程。'),
      checkpoint('interaction', '真实点击、键盘和画布梭子拖动依次推进同一织物，行数、纹样说明、前后对比和可见纬纱同步变化。')
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
    visualQuality
  });
  const wowEvidence = createWowGateEvidenceFromBrowserObservations({
    identity: r123WeaveLightIdentity,
    contract: run.visualAmbition!,
    observations: r123BrowserObservations()
  });

  run = attachDirectCreativeEvidence(run, finalEvidence);
  run = attachDirectCreativeWowEvidence(run, wowEvidence);
  return finalizeDirectCreativeRun(run);
}

describe('R123 weave-light-field final evidence', () => {
  it('persists the same bounded direct run that the contract and browser evidence rebuild', () => {
    const rebuilt = buildR123WeaveLightRun();
    const persisted = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(persisted).toEqual(rebuilt);
    expect(persisted.id).toBe(r123WeaveLightIdentity.runId);
    expect(r123WeaveLightIdentity.bundleHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.goalPlayback.originalBrief).toBe(r123WeaveLightBrief);
    expect(persisted.finalCandidate).toEqual(r123WeaveLightIdentity);
    expect(persisted.interactionRationale).toMatchObject({ mode: 'direct', audioApplicable: false });
    expect(persisted.visualAmbition?.intentLevel).toBe('immersive');
    expect(persisted.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 1,
      visualRefinements: 0
    });
    expect(persisted.assetPlan).toMatchObject({
      strategy: 'programmatic',
      assets: [{ id: 'articulated-subject', source: 'programmatic', required: true }]
    });
    expect(persisted.referencePrinciples.map((reference) => reference.referenceId)).toEqual([
      'positive-night-greenhouse-continuity',
      'positive-semantic-direct-interaction',
      'positive-iris-articulated-reveal'
    ]);
    expect(persisted.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'interaction'
    ]);
    expect(persisted.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 93 });
    expect(persisted.wowEvidence?.assessment).toMatchObject({ verdict: 'pass', score: 94 });

    const identityBindings = [
      persisted.finalCandidate,
      persisted.adaptiveEvidence,
      ...persisted.adaptiveEvidence!.checkpoints,
      persisted.wowEvidence
    ];
    for (const binding of identityBindings) {
      expect(binding).toMatchObject(r123WeaveLightIdentity);
    }
    expect(persisted.adaptiveEvidence?.visualQuality.findings)
      .not.toContainEqual(expect.objectContaining({ severity: expect.stringMatching(/major|blocking/) }));
    expect(persisted.wowEvidence?.assessment.findings)
      .not.toContainEqual(expect.objectContaining({ severity: expect.stringMatching(/major|blocking/) }));
    expect(evaluateFinalCreativeEvidence(
      persisted.adaptiveEvidence,
      r123WeaveLightIdentity
    )).toMatchObject({ identityValid: true, archiveEligible: true });
    expect(evaluateWowGateEvidence(
      persisted.wowEvidence,
      r123WeaveLightIdentity,
      persisted.visualAmbition!
    )).toMatchObject({ identityValid: true, intentValid: true, passed: true });
    expect(isDirectCreativeRunArchiveEligible(persisted)).toBe(true);
  });

  it('binds the regenerated five-scenario browser report to the same final identity', () => {
    const report = readR123BrowserReport();

    expect(report).toMatchObject({
      schemaVersion: 1,
      capturedAt: expect.any(String),
      identityBinding: 'runId+bundleHash',
      ...r123WeaveLightIdentity,
      revision: 'r123-proof',
      captures: [
        '01-desktop-opening.png',
        '02-desktop-progress.png',
        '03-desktop-saved.png',
        '04-mobile-reduced.png',
        '05-fallback-saved.png'
      ]
    });
    expect(report.observations.map((observation) => observation.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-causal-interaction',
      'desktop-complete-and-save',
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

    const [opening, interaction, saved, mobile, fallback] = report.observations;
    expect(opening.openingCompletedAtMs).toBeLessThanOrEqual(3_000);
    expect(interaction.visualHashAfter).not.toBe(interaction.visualHashBefore);
    expect(interaction.semantic).toEqual({
      click: { step: 1, pattern: '晨光底纬' },
      keyboard: { step: 2, pattern: '靛蓝翼根' },
      drag: { step: 3, pattern: '朱砂鸟喙' }
    });
    expect(saved.state).toMatchObject({ completed: true, saved: true, pattern: '晨鸟纹完整' });
    expect(mobile.state).toMatchObject({ reducedMotion: true, horizontalOverflow: false });
    expect(mobile.semantic).toMatchObject({ completedAndSaved: true });
    expect(fallback.state).toMatchObject({ fallback: true, completed: true, saved: true });
  });

  it('recomputes the final identity from the ordered frozen source bytes', () => {
    const hash = createHash('sha256');
    for (const fileName of ['index.html', 'style.css', 'main.ts']) {
      hash.update(fileName);
      hash.update(Buffer.from([0]));
      hash.update(readFileSync(new URL(fileName, sourceRoot)));
    }
    expect(hash.digest('hex')).toBe(r123WeaveLightIdentity.bundleHash);
  });
});
