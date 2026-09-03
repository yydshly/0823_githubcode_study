import { describe, expect, it } from 'vitest';
import {
  assessDirectVisualQuality,
  createAdaptiveEvidenceProfile,
  createFinalCreativeEvidence,
  evaluateFinalCreativeEvidence,
  type CreativeInteractionRationale,
  type DirectVisualQuality,
  type FinalCreativeHardGates,
  type FinalCreativeIdentity,
  type FinalEvidenceCheckpoint
} from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';
import { assessCreativePromise } from '../src/v2/creative-freedom-policy.ts';

const identity: FinalCreativeIdentity = {
  runId: 'dedicated-direct-final',
  bundleHash: 'bundle-a1b2c3'
};

const editorial: CreativeInteractionRationale = {
  mode: 'none',
  audioApplicable: false,
  rationale: '该页面是短篇编辑叙事，不依赖交互也能完成目标。'
};

const passingHardGates: FinalCreativeHardGates = {
  runtimeClean: true,
  criticalAssetsLoaded: true,
  primaryActionReachable: true,
  mobileComplete: true,
  truthfulClaims: true,
  interactionVerified: null,
  audioVerified: null
};

describe('V2 adaptive final creative evidence', () => {
  it('always requires opening, core and mobile, then adds only applicable evidence', () => {
    expect(createAdaptiveEvidenceProfile(editorial).requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile'
    ]);
    expect(createAdaptiveEvidenceProfile({
      mode: 'mixed',
      audioApplicable: true,
      rationale: '滚动建立进度，直接控件与声音共同解释结果。'
    }).requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'scroll', 'interaction', 'audio'
    ]);
  });

  it('allows a strong non-interactive editorial page to pass without invented interaction value', () => {
    const quality = passingQuality(editorial);
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction: editorial,
      checkpoints: checkpoints(['opening', 'core', 'mobile']),
      hardGates: passingHardGates,
      visualQuality: quality
    });
    const verdict = evaluateFinalCreativeEvidence(evidence, identity);

    expect(quality.dimensions.interactionValue).toBeNull();
    expect(quality.verdict).toBe('pass');
    expect(verdict).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      qualityPassed: true,
      archiveEligible: true
    });
  });

  it('requires interaction quality and evidence only when interaction is part of the product', () => {
    const interaction: CreativeInteractionRationale = {
      mode: 'direct',
      audioApplicable: false,
      rationale: '拖动配方控件会改变同一产品结果。'
    };

    expect(() => passingQuality(interaction, null)).toThrow(/interactionValue/);

    const quality = passingQuality(interaction, 90);
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction,
      checkpoints: checkpoints(['opening', 'core', 'mobile', 'interaction']),
      hardGates: { ...passingHardGates, interactionVerified: true },
      visualQuality: quality
    });

    expect(evaluateFinalCreativeEvidence(evidence, identity).archiveEligible).toBe(true);
  });

  it('invalidates otherwise passing evidence when the final run or bundle changes', () => {
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction: editorial,
      checkpoints: checkpoints(['opening', 'core', 'mobile']),
      hardGates: passingHardGates,
      visualQuality: passingQuality(editorial)
    });

    const verdict = evaluateFinalCreativeEvidence(evidence, {
      runId: identity.runId,
      bundleHash: 'bundle-new999'
    });

    expect(verdict.identityValid).toBe(false);
    expect(verdict.archiveEligible).toBe(false);
    expect(verdict.reasons.join(' ')).toContain('旧证据立即失效');
  });

  it('rejects mixed-bundle checkpoint evidence instead of treating screenshots as reusable', () => {
    const mixed = checkpoints(['opening', 'core', 'mobile']);
    mixed[1] = { ...mixed[1]!, bundleHash: 'bundle-other' };

    expect(() => createFinalCreativeEvidence({
      identity,
      interaction: editorial,
      checkpoints: mixed,
      hardGates: passingHardGates,
      visualQuality: passingQuality(editorial)
    })).toThrow(/不属于当前最终 bundle/);
  });

  it('keeps archive eligibility false when any hard gate fails despite a passing visual score', () => {
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction: editorial,
      checkpoints: checkpoints(['opening', 'core', 'mobile']),
      hardGates: { ...passingHardGates, primaryActionReachable: false },
      visualQuality: passingQuality(editorial)
    });
    const verdict = evaluateFinalCreativeEvidence(evidence, identity);

    expect(verdict.qualityPassed).toBe(true);
    expect(verdict.hardGatesPassed).toBe(false);
    expect(verdict.archiveEligible).toBe(false);
  });

  it('does not archive a visually polished but unjustified persistent workbench', () => {
    const workbench = {
      runId: identity.runId,
      layout: 'single-stage' as const,
      persistentControlPanel: true,
      visibleParameterControls: true,
      realtimeMetricCluster: true,
      primaryAction: 'enter-experience' as const
    };
    const macroStructureReview = reviewMacroStructureContentFit({
      candidate: workbench,
      recent: [
        { ...workbench, runId: 'direct-recent-one' },
        { ...workbench, runId: 'direct-recent-two' },
        { ...workbench, runId: 'direct-recent-three' }
      ],
      contentEvidence: {
        concurrentParameterCount: 0,
        realtimeFeedbackRequired: false,
        primaryActionDependsOnCurrentState: false,
        persistentControlsExplicitlyRequested: false,
        rationale: '当前目标只是讲述主题并进入内容，没有必须同时可见的参数任务。'
      }
    });
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction: editorial,
      checkpoints: checkpoints(['opening', 'core', 'mobile']),
      hardGates: passingHardGates,
      visualQuality: passingQuality(editorial),
      macroStructureReview
    });
    const verdict = evaluateFinalCreativeEvidence(evidence, identity);

    expect(verdict).toMatchObject({
      structurePassed: false,
      qualityPassed: false,
      archiveEligible: false
    });
    expect(verdict.reasons.join(' ')).toContain('没有并发参数');
  });

  it('rejects a polished page when its own essential runtime promise is not delivered', () => {
    const interaction: CreativeInteractionRationale = {
      mode: 'direct',
      audioApplicable: false,
      rationale: '用户操作被声明为核心空间变化。'
    };
    const creativePromise = assessCreativePromise({
      promise: {
        schemaVersion: 1,
        thesis: '让用户亲手穿过一个会发生结构变化的空间。',
        signatureMoment: '一次操作让核心空间从封闭结构真实展开。',
        expressionStrategy: '运行时空间变化承担主要创意，不可由单张图片替代。',
        runtimeRole: 'essential',
        chosenMethods: ['unlisted-spatial-fold'],
        methodRationale: '结构变化直接解释产品价值，而不是装饰动画。'
      },
      observation: {
        promiseVisible: true,
        signatureMomentDelivered: false,
        productActionConnected: true,
        visualLanguageCohesive: true,
        runtimeChangeObservable: false,
        summary: '最终只显示一张静态场景，操作没有改变核心空间。'
      }
    });
    const evidence = createFinalCreativeEvidence({
      identity,
      interaction,
      checkpoints: checkpoints(['opening', 'core', 'mobile', 'interaction']),
      hardGates: { ...passingHardGates, interactionVerified: true },
      visualQuality: passingQuality(interaction, 90),
      creativePromise
    });
    const verdict = evaluateFinalCreativeEvidence(evidence, identity);

    expect(creativePromise.passed).toBe(false);
    expect(verdict).toMatchObject({
      creativePromisePassed: false,
      qualityPassed: false,
      archiveEligible: false
    });
    expect(verdict.reasons.join(' ')).toContain('运行时变化是核心');
  });
});

function passingQuality(
  interaction: CreativeInteractionRationale,
  interactionValue: number | null = interaction.mode === 'none' ? null : 90
): DirectVisualQuality {
  return assessDirectVisualQuality({
    dimensions: {
      goalClarity: 94,
      creativeDistinctiveness: 91,
      craftCohesion: 89,
      assetIntegration: 90,
      interactionValue,
      mobileReadiness: 88
    },
    summary: '目标、创意、工艺、素材与移动端形成一致的最终效果。'
  }, interaction);
}

function checkpoints(kinds: FinalEvidenceCheckpoint['kind'][]): FinalEvidenceCheckpoint[] {
  return kinds.map((kind) => ({
    kind,
    ...identity,
    passed: true,
    summary: `${kind} 已在最终 bundle 中验证。`
  }));
}
