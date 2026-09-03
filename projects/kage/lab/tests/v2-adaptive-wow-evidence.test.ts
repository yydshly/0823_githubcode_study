import { describe, expect, it } from 'vitest';
import {
  adaptiveBrowserWowObservationsSchema,
  createWowGateEvidenceFromBrowserObservations,
  isInteractionPromisedByAmbition,
  type AdaptiveBrowserWowObservations
} from '../src/v2/adaptive-wow-evidence.ts';
import {
  attachDirectCreativeWowEvidence,
  createDirectCreativeRun,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate
} from '../src/v2/direct-creative-run.ts';
import {
  createVisualAmbitionContract,
  evaluateWowGateEvidence,
  wowGateEvidenceSchema,
  type VisualAmbitionContract
} from '../src/v2/visual-ambition.ts';

const identity = {
  runId: 'direct-generalized-wow-r116',
  bundleHash: 'bundle-r116-final-9f834b'
};

describe('V2 adaptive browser Wow evidence adapter', () => {
  it('produces a passing identity-bound WowGateEvidence from causal browser facts', () => {
    const contract = flagshipContract(true);
    const evidence = createWowGateEvidenceFromBrowserObservations({
      identity,
      contract,
      observations: passingObservations()
    });

    expect(wowGateEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({
      runId: identity.runId,
      bundleHash: identity.bundleHash,
      assessment: {
        required: true,
        verdict: 'pass',
        dimensions: {
          fiveSecondImpact: 92,
          runtimeAdvantage: 93,
          themeMemorability: 91,
          motionDepthMeaning: 90,
          assetIntegrationCredibility: 89,
          craftCohesion: 91
        }
      }
    });
    expect(evaluateWowGateEvidence(evidence, identity, contract).passed).toBe(true);
    expect(evaluateWowGateEvidence(
      evidence,
      { ...identity, bundleHash: 'bundle-r116-rebuilt' },
      contract
    )).toMatchObject({ identityValid: false, passed: false });

    const started = createDirectCreativeRun({
      goalPlayback: {
        originalBrief: '创建可交互薄膜实验网页，让材料结构与光学结果形成清晰因果。',
        subject: '薄膜材料实验',
        audience: '材料学习者与创意技术访客',
        desiredOutcome: '理解厚度和张力如何改变薄膜显色',
        primaryAction: '保存当前材料状态',
        hardConstraints: [],
        preferences: ['主题专属材料动态']
      },
      selectedDirection: {
        id: 'thin-film-interference',
        title: '光在薄膜中展开',
        experienceForm: '实时材料实验台',
        rationale: '用连续材料变化解释产品机制，而不是复用通用视觉模板。'
      },
      referencePrinciples: [],
      assetPlan: {
        batchId: 'thin-film-r116-assets',
        strategy: 'programmatic',
        rationale: '可控薄膜表面与 DOM 实验信息共同承担最终表达。',
        assets: [{
          id: 'thin-film-surface',
          role: '承担主题结构色与参数响应',
          source: 'programmatic',
          required: true
        }]
      },
      interactionRationale: {
        mode: 'direct',
        audioApplicable: false,
        rationale: '参数输入直接驱动薄膜颜色、褶皱和说明变化。'
      },
      visualAmbition: contract
    });
    const built = recordDirectCreativeAttempt(
      recordDirectCreativeAttempt(started, 'asset-batch'),
      'build'
    );
    const attached = attachDirectCreativeWowEvidence(
      setDirectCreativeFinalCandidate(built, identity),
      evidence
    );
    expect(attached.wowEvidence).toEqual(evidence);
  });

  it('fails closed when a promised interaction lacks a causal browser response', () => {
    const contract = flagshipContract(true);
    const observations = passingObservations();
    observations.interaction = {
      input: '拖动薄膜张力控制器',
      stateChanged: true,
      visualOutputChanged: false,
      semanticOutputChanged: false,
      summary: '输入值改变，但最终画面和语义输出都没有变化。'
    };

    const evidence = createWowGateEvidenceFromBrowserObservations({
      identity,
      contract,
      observations
    });

    expect(evidence.assessment.verdict).toBe('revise');
    expect(evidence.assessment.observation.meaningfulMotionOrDepthObserved).toBe(false);
    expect(evidence.assessment.findings).toContainEqual(expect.objectContaining({
      code: 'promised-interaction-not-causal',
      severity: 'blocking'
    }));
  });

  it('does not invent an interaction requirement for a time-only flagship', () => {
    const contract = flagshipContract(false);
    const observations = passingObservations();
    observations.interaction = null;

    expect(isInteractionPromisedByAmbition(contract)).toBe(false);
    const evidence = createWowGateEvidenceFromBrowserObservations({
      identity,
      contract,
      observations
    });

    expect(evidence.assessment.verdict).toBe('pass');
    expect(evidence.assessment.findings.map((finding) => finding.code)).not.toContain(
      'promised-interaction-missing'
    );
  });

  it('uses the contract timing promise and runtime comparison instead of accepting labels', () => {
    const contract = flagshipContract(true);
    const observations = passingObservations();
    observations.hero.completedAtMs = 3_400;
    observations.runtime.advantageOverStaticObserved = false;

    const evidence = createWowGateEvidenceFromBrowserObservations({
      identity,
      contract,
      observations
    });

    expect(evidence.assessment.verdict).toBe('revise');
    expect(evidence.assessment.observation).toMatchObject({
      heroMomentObserved: false,
      runtimeAdvantageOverStaticObserved: false
    });
    expect(evidence.assessment.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['hero-late', 'runtime-static-equivalent'])
    );
  });

  it.each([
    {
      name: 'mobile overflow',
      mutate: (observations: AdaptiveBrowserWowObservations) => {
        observations.mobile.noHorizontalOverflow = false;
      },
      code: 'mobile-state-incomplete'
    },
    {
      name: 'theme-less fallback',
      mutate: (observations: AdaptiveBrowserWowObservations) => {
        observations.fallback.themePreserved = false;
      },
      code: 'fallback-state-incomplete'
    },
    {
      name: 'browser console error',
      mutate: (observations: AdaptiveBrowserWowObservations) => {
        observations.errors.consoleErrors.push('WebGL context lost');
      },
      code: 'console-errors-observed'
    }
  ])('blocks a visually strong candidate with $name', ({ mutate, code }) => {
    const observations = passingObservations();
    mutate(observations);

    const evidence = createWowGateEvidenceFromBrowserObservations({
      identity,
      contract: flagshipContract(true),
      observations
    });

    expect(evidence.assessment.verdict).toBe('revise');
    expect(evidence.assessment.findings).toContainEqual(expect.objectContaining({ code }));
  });

  it('rejects internally contradictory runtime and asset claims before evidence creation', () => {
    const observations = passingObservations();
    observations.runtime.visualOutputChanged = false;
    observations.assets.integratedWithScene = false;

    const parsed = adaptiveBrowserWowObservationsSchema.safeParse(observations);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.message).join(' ')).toContain(
        '非平凡视觉变化'
      );
      expect(parsed.error.issues.map((issue) => issue.message).join(' ')).toContain(
        '融入场景'
      );
    }
  });
});

function flagshipContract(interactive: boolean): VisualAmbitionContract {
  return createVisualAmbitionContract({
    schemaVersion: 1,
    intentLevel: 'flagship',
    intentRationale: '该体验需要主题专属的运行时变化在开场形成强记忆，而非依赖静态封面。',
    heroMoment: {
      title: '薄膜在光下显色',
      description: '透明薄膜从无色状态展开为随厚度与张力变化的连续干涉色。',
      themeConnection: '色彩变化直接解释薄膜实验中结构与光学结果的关系。',
      appearsWithinSeconds: 3,
      observableRuntimeChange: {
        trigger: interactive ? '进入页面并拖动实验参数' : '进入页面后的时间弧线',
        from: '接近无色的薄膜表面',
        to: '具有空间褶皱与连续干涉色的完整薄膜'
      }
    },
    rendering: {
      primary: 'webgl-shader',
      supporting: ['dom-css'],
      rationale: '着色器承担连续干涉色，DOM 保留实验参数、解释与行动。'
    },
    spatialDepth: {
      mode: 'volumetric',
      purpose: '高光、遮挡与视差共同解释薄膜厚度和张力的空间变化。',
      cues: ['lighting', 'occlusion', 'parallax']
    },
    motionArc: {
      beats: interactive
        ? [{
            phase: 'opening',
            driver: 'time',
            visualState: '薄膜从暗面逐渐显出结构色。',
            thematicPurpose: '建立材料正在响应光线的第一印象。'
          }, {
            phase: 'exploration',
            driver: 'direct-input',
            visualState: '厚度和张力同步改变色带、反射与褶皱。',
            thematicPurpose: '让实验参数与材料结果形成可理解因果。'
          }]
        : [{
            phase: 'opening',
            driver: 'time',
            visualState: '薄膜从暗面逐渐显出结构色并完成稳定构图。',
            thematicPurpose: '用材料随光线显色的过程建立主题记忆。'
          }],
      runtimeAdvantage: '薄膜的连续显色、空间高光和参数响应只有在运行中才能完整理解。'
    },
    interactionToScene: interactive
      ? [{
          input: '厚度与张力控制器',
          sceneResponse: '干涉色带、镜面高光与褶皱密度同步连续变化。',
          productMeaning: '用户直接看到实验参数如何改变材料的光学状态。'
        }]
      : [],
    assetCredibility: {
      level: 'conceptual-coherent',
      strategy: '薄膜、光场、实验参数与说明共享同一套材料语言并接受统一光照。',
      disclosure: '当前数据和材料响应明确标注为可交互概念模拟。'
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 2,
      initialTransferBudgetMb: 4,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'static-complete-state',
      rendererFailureFallback: 'key-visual'
    }
  });
}

function passingObservations(): AdaptiveBrowserWowObservations {
  return {
    hero: {
      observed: true,
      completedAtMs: 2_650,
      visibleChangeObserved: true,
      score: 92,
      summary: 'Hero 在 2650ms 完成，薄膜由无色变为完整干涉色。'
    },
    runtime: {
      surfaceVisible: true,
      stateChanged: true,
      visualOutputChanged: true,
      advantageOverStaticObserved: true,
      comparisonMethod: 'canvas-buffer-diff',
      score: 93,
      summary: '前后帧缓冲存在非平凡差异，运行状态不能被单张静态图替代。'
    },
    theme: {
      themeSpecificMemoryObserved: true,
      score: 91,
      summary: '可复述的记忆点是薄膜厚度直接展开为连续干涉色。'
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: true,
      score: 90,
      summary: '视差、高光和褶皱共同解释薄膜结构，不是装饰运动。'
    },
    assets: {
      criticalAssetsLoaded: true,
      integratedWithScene: true,
      credible: true,
      score: 89,
      summary: '薄膜、光场、标签和参数使用统一材质语言并自然融合。'
    },
    craft: {
      cohesive: true,
      score: 91,
      summary: '构图、排版、色彩、交互与实验主题形成统一语言。'
    },
    interaction: {
      input: '拖动厚度与张力控制器',
      stateChanged: true,
      visualOutputChanged: true,
      semanticOutputChanged: true,
      summary: '真实输入同时改变状态、薄膜视觉和可读参数说明。'
    },
    mobile: {
      viewportWidth: 390,
      noHorizontalOverflow: true,
      contentReadable: true,
      primaryActionReachable: true,
      summary: '390px 状态无横向溢出，内容和主要行动均可用。'
    },
    fallback: {
      exercised: true,
      rendered: true,
      themePreserved: true,
      contentPreserved: true,
      primaryActionReachable: true,
      summary: '强制回退后仍保留薄膜主题、实验说明和主要行动。'
    },
    errors: {
      pageErrors: [],
      consoleErrors: [],
      blockingResourceFailures: []
    }
  };
}
