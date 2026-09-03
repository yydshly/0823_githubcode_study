import { describe, expect, it } from 'vitest';
import {
  attachDirectCreativeEvidence,
  attachDirectCreativeWowEvidence,
  createDirectCreativeRun,
  finalizeDirectCreativeRun,
  isDirectCreativeRunArchiveEligible,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate,
  type DirectCreativeRun
} from '../src/v2/direct-creative-run.ts';
import {
  assessDirectVisualQuality,
  createFinalCreativeEvidence,
  type FinalCreativeIdentity
} from '../src/v2/final-creative-evidence.ts';
import {
  assessWowAttraction,
  createVisualAmbitionContract,
  createWowGateEvidence,
  type VisualAmbitionContract
} from '../src/v2/visual-ambition.ts';

const identity: FinalCreativeIdentity = {
  runId: 'dedicated-flagship-final',
  bundleHash: 'bundle-wow123'
};

describe('V2 DirectCreativeRun WowGate integration', () => {
  it('keeps an existing run without a visual ambition decision backward compatible', () => {
    const completed = finalizeDirectCreativeRun(withGeneralEvidence(candidate(builtRun(false))));

    expect(completed.visualAmbition).toBeUndefined();
    expect(completed.wowEvidence).toBeUndefined();
    expect(completed.verdict).toBe('pass');
    expect(isDirectCreativeRunArchiveEligible(completed)).toBe(true);
  });

  it('fails closed when an immersive or flagship run has no bound WowGate evidence', () => {
    const completed = finalizeDirectCreativeRun(withGeneralEvidence(candidate(builtRun(true))));

    expect(completed).toMatchObject({
      verdict: 'fail',
      stopReason: { code: 'invalid-evidence', stage: 'wow-gate' }
    });
    expect(isDirectCreativeRunArchiveEligible(completed)).toBe(false);
  });

  it('does not pass or archive a flagship whose WowGate verdict is revise', () => {
    const run = withGeneralEvidence(candidate(builtRun(true)));
    const assessment = assessWowAttraction({
      dimensions: wowDimensions(),
      observation: {
        ...wowObservation(),
        runtimeAdvantageOverStaticObserved: false,
        summary: '页面工艺完整，但动态结果与静态截图相比没有明确优势。'
      }
    }, run.visualAmbition as VisualAmbitionContract);
    const completed = finalizeDirectCreativeRun(attachDirectCreativeWowEvidence(
      run,
      createWowGateEvidence({ identity, assessment })
    ));

    expect(assessment.verdict).toBe('revise');
    expect(completed).toMatchObject({
      verdict: 'fail',
      stopReason: { code: 'quality-failed', stage: 'wow-gate' }
    });
  });

  it('passes and archives a flagship only when general evidence and bound WowGate both pass', () => {
    const run = withGeneralEvidence(candidate(builtRun(true)));
    const assessment = assessWowAttraction({
      dimensions: wowDimensions(),
      observation: wowObservation()
    }, run.visualAmbition as VisualAmbitionContract);
    const completed = finalizeDirectCreativeRun(attachDirectCreativeWowEvidence(
      run,
      createWowGateEvidence({ identity, assessment })
    ));

    expect(completed.verdict).toBe('pass');
    expect(isDirectCreativeRunArchiveEligible(completed)).toBe(true);
  });

  it('clears both general and WowGate evidence when the final identity changes', () => {
    const run = withGeneralEvidence(candidate(builtRun(true)));
    const assessment = assessWowAttraction({
      dimensions: wowDimensions(),
      observation: wowObservation()
    }, run.visualAmbition as VisualAmbitionContract);
    const withBoth = attachDirectCreativeWowEvidence(
      run,
      createWowGateEvidence({ identity, assessment })
    );
    const changed = setDirectCreativeFinalCandidate(withBoth, {
      runId: identity.runId,
      bundleHash: 'bundle-wow456'
    });

    expect(withBoth.adaptiveEvidence).not.toBeNull();
    expect(withBoth.wowEvidence).toBeDefined();
    expect(changed.adaptiveEvidence).toBeNull();
    expect(changed.wowEvidence).toBeUndefined();
  });

  it('rejects a WowGate assessment captured from another final bundle', () => {
    const run = withGeneralEvidence(candidate(builtRun(true)));
    const assessment = assessWowAttraction({
      dimensions: wowDimensions(),
      observation: wowObservation()
    }, run.visualAmbition as VisualAmbitionContract);
    const wrong = createWowGateEvidence({
      identity: { runId: identity.runId, bundleHash: 'bundle-somewhere-else' },
      assessment
    });

    expect(() => attachDirectCreativeWowEvidence(run, wrong)).toThrow(/runId 或 bundleHash/);
  });
});

function builtRun(withAmbition: boolean): DirectCreativeRun {
  const run = createDirectCreativeRun({
    goalPlayback: {
      originalBrief: '为动作语言演出季设计具有空间动态与明确购票行动的旗舰网页。',
      subject: '动作语言演出季',
      audience: '对当代剧场和手语表演感兴趣的访客',
      desiredOutcome: '通过空间动作理解演出主题并查看场次',
      primaryAction: '查看场次',
      hardConstraints: [],
      preferences: ['主题专属动态', '明亮舞台光']
    },
    selectedDirection: {
      id: 'gesture-in-space',
      title: '动作写入空间',
      experienceForm: '滚动与时间驱动的旗舰视觉短篇',
      rationale: '让动作轨迹成为空间语言，而不是附加通用粒子。'
    },
    referencePrinciples: [],
    assetPlan: {
      batchId: 'gesture-assets',
      strategy: 'programmatic',
      rationale: 'SVG 人物、路径和排版组成同一套可控视觉语言。',
      assets: [{
        id: 'gesture-scene',
        role: '承担人物、动作轨迹与空间层次',
        source: 'programmatic',
        required: true
      }]
    },
    interactionRationale: {
      mode: 'scroll',
      audioApplicable: false,
      rationale: '滚动让动作轨迹逐层展开并最终收束为场次行动。'
    },
    ...(withAmbition ? { visualAmbition: flagshipAmbition() } : {})
  });
  return recordDirectCreativeAttempt(recordDirectCreativeAttempt(run, 'asset-batch'), 'build');
}

function candidate(run: DirectCreativeRun): DirectCreativeRun {
  return setDirectCreativeFinalCandidate(run, identity);
}

function withGeneralEvidence(run: DirectCreativeRun): DirectCreativeRun {
  const visualQuality = assessDirectVisualQuality({
    dimensions: {
      goalClarity: 94,
      creativeDistinctiveness: 92,
      craftCohesion: 91,
      assetIntegration: 90,
      interactionValue: 90,
      mobileReadiness: 89
    },
    summary: '目标、视觉语言、资产、滚动联动和移动状态均达到一般最终质量门。'
  }, run.interactionRationale);
  return attachDirectCreativeEvidence(run, createFinalCreativeEvidence({
    identity,
    interaction: run.interactionRationale,
    checkpoints: ['opening', 'core', 'mobile', 'scroll'].map((kind) => ({
      kind: kind as 'opening' | 'core' | 'mobile' | 'scroll',
      ...identity,
      passed: true,
      summary: `${kind} 已在同一最终 bundle 中验证。`
    })),
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
  }));
}

function flagshipAmbition(): VisualAmbitionContract {
  return createVisualAmbitionContract({
    schemaVersion: 1,
    intentLevel: 'flagship',
    intentRationale: '主题需要动作、空间与时间共同形成普通静态编辑页无法提供的记忆。',
    heroMoment: {
      title: '动作点亮空间',
      description: '一个手势轨迹在舞台中展开为具有景深的完整语句。',
      themeConnection: '空间书写直接对应动作语言这一演出季核心主题。',
      appearsWithinSeconds: 3,
      observableRuntimeChange: {
        trigger: '页面进入与首段滚动',
        from: '手掌旁收束的单个符号',
        to: '跨越舞台前后的完整动作语句'
      }
    },
    rendering: {
      primary: 'svg',
      supporting: ['dom-css'],
      rationale: '路径动画表达动作书写，DOM 保留信息和行动的可访问性。'
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '人物、轨迹和字幕通过视差与遮挡建立舞台空间。',
      cues: ['parallax', 'occlusion', 'scale']
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '轨迹沿人物手势逐笔显现。',
          thematicPurpose: '建立动作正在成为语言的第一记忆。'
        },
        {
          phase: 'resolution',
          driver: 'scroll',
          visualState: '空间轨迹收束为演出季标题与场次入口。',
          thematicPurpose: '把动态体验收束到真实产品行动。'
        }
      ],
      runtimeAdvantage: '书写过程、景深变化和收束只能在运行时被完整感知。'
    },
    interactionToScene: [],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '人物、路径、灯光与字形使用同一套舞台色彩和边缘语言。',
      disclosure: '演出名称与场次均标明为概念验证信息。'
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 2,
      initialTransferBudgetMb: 3,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content'
    }
  });
}

function wowDimensions() {
  return {
    fiveSecondImpact: 92,
    runtimeAdvantage: 93,
    themeMemorability: 91,
    motionDepthMeaning: 90,
    assetIntegrationCredibility: 89,
    craftCohesion: 91
  };
}

function wowObservation() {
  return {
    heroMomentObserved: true,
    runtimeAdvantageOverStaticObserved: true,
    themeSpecificMemoryObserved: true,
    meaningfulMotionOrDepthObserved: true,
    credibleAssetIntegrationObserved: true,
    summary: '主题动作、空间变化和素材融合在真实运行中形成静态图无法代替的记忆。'
  };
}
