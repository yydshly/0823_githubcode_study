import { describe, expect, it } from 'vitest';
import {
  attachDirectCreativeEvidence,
  createDirectCreativeRun,
  finalizeDirectCreativeRun,
  isDirectCreativeRunArchiveEligible,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate,
  stopDirectCreativeRunForTimeout,
  type DirectCreativeRun
} from '../src/v2/direct-creative-run.ts';
import {
  assessDirectVisualQuality,
  createFinalCreativeEvidence,
  type FinalCreativeEvidence,
  type FinalCreativeIdentity
} from '../src/v2/final-creative-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';

const finalIdentity: FinalCreativeIdentity = {
  runId: 'dedicated-bounded-final',
  bundleHash: 'bundle-abc123'
};

describe('V2 bounded direct creative run', () => {
  it('records one selected direction, one-to-three principles and an explicit bounded budget', () => {
    const run = newRun();

    expect(run.selectedDirection.id).toBe('living-paper-workshop');
    expect(run.referencePrinciples).toHaveLength(2);
    expect(run.attemptBudget).toEqual({
      limits: {
        directionSelections: 1,
        assetBatches: 1,
        builds: 1,
        deterministicRepairs: 2,
        visualRefinements: 1
      },
      used: {
        directionSelections: 1,
        assetBatches: 0,
        builds: 0,
        deterministicRepairs: 0,
        visualRefinements: 0
      }
    });
  });

  it('allows zero references when no evidence pack is relevant', () => {
    const baseline = newRun();
    const run = createDirectCreativeRun({
      goalPlayback: baseline.goalPlayback,
      selectedDirection: baseline.selectedDirection,
      referencePrinciples: [],
      assetPlan: baseline.assetPlan,
      interactionRationale: baseline.interactionRationale
    });

    expect(run.referencePrinciples).toEqual([]);
  });

  it('enforces the single asset batch and build instead of silently starting another pass', () => {
    const afterAsset = recordDirectCreativeAttempt(newRun(), 'asset-batch');
    const stoppedAsset = recordDirectCreativeAttempt(afterAsset, 'asset-batch');
    expect(stoppedAsset).toMatchObject({
      verdict: 'stopped',
      stopReason: { code: 'budget-exhausted', stage: 'asset-batch' }
    });

    const afterBuild = recordDirectCreativeAttempt(afterAsset, 'build');
    const stoppedBuild = recordDirectCreativeAttempt(afterBuild, 'build');
    expect(stoppedBuild).toMatchObject({
      verdict: 'stopped',
      stopReason: { code: 'budget-exhausted', stage: 'build' }
    });
  });

  it('allows at most two deterministic repairs and one visual refinement', () => {
    const built = builtRun();
    const repairedOnce = recordDirectCreativeAttempt(built, 'deterministic-repair');
    const repairedTwice = recordDirectCreativeAttempt(repairedOnce, 'deterministic-repair');
    const stoppedRepair = recordDirectCreativeAttempt(repairedTwice, 'deterministic-repair');
    expect(stoppedRepair.attemptBudget.used.deterministicRepairs).toBe(2);
    expect(stoppedRepair.stopReason?.code).toBe('budget-exhausted');

    const refined = recordDirectCreativeAttempt(built, 'visual-refinement');
    const stoppedRefinement = recordDirectCreativeAttempt(refined, 'visual-refinement');
    expect(stoppedRefinement.attemptBudget.used.visualRefinements).toBe(1);
    expect(stoppedRefinement.stopReason?.code).toBe('budget-exhausted');
  });

  it('stops explicitly on timeout and forbids any later silent retry', () => {
    const stopped = stopDirectCreativeRunForTimeout(newRun(), 'asset-generation');

    expect(stopped).toMatchObject({ verdict: 'stopped', stopReason: { code: 'timeout' } });
    expect(() => recordDirectCreativeAttempt(stopped, 'asset-batch')).toThrow(/不得静默重试/);
  });

  it('clears old evidence as soon as final runId or bundleHash changes', () => {
    const withEvidence = attachEvidence(setDirectCreativeFinalCandidate(builtRun(), finalIdentity));
    const changed = setDirectCreativeFinalCandidate(withEvidence, {
      runId: finalIdentity.runId,
      bundleHash: 'bundle-rebuilt999'
    });

    expect(withEvidence.adaptiveEvidence).not.toBeNull();
    expect(changed.adaptiveEvidence).toBeNull();
    expect(changed.verdict).toBe('pending');
  });

  it('passes and becomes archive eligible only after hard gates and final quality pass', () => {
    const completed = finalizeDirectCreativeRun(
      attachEvidence(setDirectCreativeFinalCandidate(builtRun(), finalIdentity))
    );

    expect(completed.verdict).toBe('pass');
    expect(completed.stopReason).toBeNull();
    expect(isDirectCreativeRunArchiveEligible(completed)).toBe(true);
  });

  it('fails closed when the final bundle has a hard-gate failure', () => {
    const candidate = setDirectCreativeFinalCandidate(builtRun(), finalIdentity);
    const evidence = finalEvidence({ runtimeClean: false });
    const completed = finalizeDirectCreativeRun(attachDirectCreativeEvidence(candidate, evidence));

    expect(completed).toMatchObject({
      verdict: 'fail',
      stopReason: { code: 'hard-gate-failed' }
    });
    expect(isDirectCreativeRunArchiveEligible(completed)).toBe(false);
  });

  it('rejects evidence captured from a different run before it reaches finalization', () => {
    const candidate = setDirectCreativeFinalCandidate(builtRun(), finalIdentity);
    const otherEvidence = createFinalCreativeEvidence({
      identity: { runId: 'dedicated-other', bundleHash: 'bundle-other1' },
      interaction: candidate.interactionRationale,
      checkpoints: ['opening', 'core', 'mobile'].map((kind) => ({
        kind: kind as 'opening' | 'core' | 'mobile',
        runId: 'dedicated-other',
        bundleHash: 'bundle-other1',
        passed: true,
        summary: `${kind} 已验证。`
      })),
      hardGates: {
        runtimeClean: true,
        criticalAssetsLoaded: true,
        primaryActionReachable: true,
        mobileComplete: true,
        truthfulClaims: true,
        interactionVerified: null,
        audioVerified: null
      },
      visualQuality: passingQuality()
    });

    expect(() => attachDirectCreativeEvidence(candidate, otherEvidence)).toThrow(/runId 或 bundleHash/);
  });

  it('requires a content-fit macro structure review for protocol version two', () => {
    const baseline = newRun();
    const versionTwo = createDirectCreativeRun({
      creativeProtocolVersion: 2,
      goalPlayback: baseline.goalPlayback,
      selectedDirection: baseline.selectedDirection,
      referencePrinciples: baseline.referencePrinciples,
      assetPlan: baseline.assetPlan,
      interactionRationale: baseline.interactionRationale
    });
    const built = recordDirectCreativeAttempt(
      recordDirectCreativeAttempt(versionTwo, 'asset-batch'),
      'build'
    );
    const candidate = setDirectCreativeFinalCandidate(built, finalIdentity);

    expect(() => attachDirectCreativeEvidence(candidate, finalEvidence()))
      .toThrow(/缺少内容适配的宏观结构判断/);
  });

  it('requires a medium decision for protocol three while legacy runs remain valid', () => {
    const baseline = newRun();

    expect(() => createDirectCreativeRun({
      creativeProtocolVersion: 3,
      goalPlayback: baseline.goalPlayback,
      selectedDirection: baseline.selectedDirection,
      referencePrinciples: baseline.referencePrinciples,
      assetPlan: baseline.assetPlan,
      interactionRationale: baseline.interactionRationale
    })).toThrow(/媒介决策/);
    expect(baseline.creativeProtocolVersion).toBe(1);
    expect(baseline).not.toHaveProperty('mediumDecision');
  });

  it('does not attach an old final candidate identity to a V3 medium decision', () => {
    const versionThree = createDirectCreativeRunFromContractV3(createV2CreativeContract(
      '为虚构潮池夜巡设计网页。必须调用大模型生图作为宽幅主视觉，滚动探索后保存路线。'
    ));
    const built = recordDirectCreativeAttempt(
      recordDirectCreativeAttempt(versionThree, 'asset-batch'),
      'build'
    );

    expect(() => setDirectCreativeFinalCandidate(built, finalIdentity))
      .toThrow(/绑定当前媒介决策运行/);
  });
});

function newRun(): DirectCreativeRun {
  return createDirectCreativeRun({
    goalPlayback: {
      originalBrief: '为纸张修复工坊设计明亮、触感真实的编辑型网页，最后预约开放工作日。',
      subject: '纸张修复工坊',
      audience: '关心纸本文献与修复过程的普通访客',
      desiredOutcome: '理解纸张如何被修复并愿意预约参观',
      primaryAction: '预约开放工作日',
      hardConstraints: ['不得伪造修复数据'],
      preferences: ['自然日光', '编辑档案感']
    },
    selectedDirection: {
      id: 'living-paper-workshop',
      title: '会呼吸的纸张工作台',
      experienceForm: '非交互编辑短篇',
      rationale: '通过纤维、工具和修复证据形成主题，而不是套用暗色科技模板。'
    },
    referencePrinciples: [
      {
        referenceId: 'ref-editorial-layering',
        title: '编辑层级',
        principle: '以尺度、留白和证据形成清楚阅读顺序。',
        relevance: '适合解释修复过程而不依赖复杂交互。'
      },
      {
        referenceId: 'ref-material-continuity',
        title: '材质连续性',
        principle: '素材边界与页面底色、光线和排版共同融合。',
        relevance: '避免中间图片像贴片。'
      }
    ],
    assetPlan: {
      batchId: 'paper-assets-01',
      strategy: 'generated',
      rationale: '唯一一批素材承担纸张纤维、修复工具和完成态。',
      assets: [{ id: 'paper-workbench', role: '主视觉与过程连续素材', source: 'generated', required: true }]
    },
    interactionRationale: {
      mode: 'none',
      audioApplicable: false,
      rationale: '编辑短篇本身足以完成理解和行动，不强加无意义互动。'
    }
  });
}

function builtRun(): DirectCreativeRun {
  return recordDirectCreativeAttempt(
    recordDirectCreativeAttempt(newRun(), 'asset-batch'),
    'build'
  );
}

function attachEvidence(run: DirectCreativeRun): DirectCreativeRun {
  return attachDirectCreativeEvidence(run, finalEvidence());
}

function finalEvidence(overrides: { runtimeClean?: boolean } = {}): FinalCreativeEvidence {
  return createFinalCreativeEvidence({
    identity: finalIdentity,
    interaction: {
      mode: 'none',
      audioApplicable: false,
      rationale: '编辑短篇本身足以完成理解和行动，不强加无意义互动。'
    },
    checkpoints: ['opening', 'core', 'mobile'].map((kind) => ({
      kind: kind as 'opening' | 'core' | 'mobile',
      ...finalIdentity,
      passed: true,
      summary: `${kind} 已在最终 bundle 验证。`
    })),
    hardGates: {
      runtimeClean: overrides.runtimeClean ?? true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: null,
      audioVerified: null
    },
    visualQuality: passingQuality()
  });
}

function passingQuality() {
  return assessDirectVisualQuality({
    dimensions: {
      goalClarity: 95,
      creativeDistinctiveness: 91,
      craftCohesion: 90,
      assetIntegration: 89,
      interactionValue: null,
      mobileReadiness: 88
    },
    summary: '最终页面目标清楚、创意独特、素材融合且移动端完整。'
  }, {
    mode: 'none',
    audioApplicable: false,
    rationale: '编辑短篇不依赖交互完成产品目标。'
  });
}
