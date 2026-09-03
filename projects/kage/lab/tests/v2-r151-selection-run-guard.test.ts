import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeAuthorPackage,
  createDirectCreativeAuthorPackageV4,
  createDirectCreativeAuthorPackageV5,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import {
  createDirectCreativeRunFromContractV3,
  createDirectCreativeRunFromContractV4,
  createDirectCreativeRunFromContractV5
} from '../src/v2/direct-creative-protocol.ts';
import {
  bindDirectCreativeEffectSelection,
  directCreativeRunSchema,
  recordDirectCreativeAttempt
} from '../src/v2/direct-creative-run.ts';
import type {
  EffectDirectionCandidate,
  EffectQualitySelectionReceipt
} from '../src/v2/effect-quality-selection.ts';

const brief = '为一座保存雨后城市气味的档案馆设计网页。访客从辨认潮湿街道，到触发不同地点的气味记忆，最后保存一张雨后气味卡。';

describe('V2 R151 effect-selection run guard', () => {
  it('creates a V4 run with an explicit pending receipt and blocks resources', () => {
    const run = createDirectCreativeRunFromContractV4(createV2CreativeContract(brief));

    expect(directCreativeRunSchema.parse(run)).toEqual(run);
    expect(run).toMatchObject({
      creativeProtocolVersion: 4,
      effectSelectionReceipt: null,
      verdict: 'pending',
      attemptBudget: { used: { assetBatches: 0, builds: 0 } }
    });
    expect(() => recordDirectCreativeAttempt(run, 'asset-batch'))
      .toThrow(/先绑定有效效果选择回执/);
  });

  it('allows exactly the valid highest goal-fit winner to unlock assets and build', () => {
    const run = createDirectCreativeRunFromContractV4(createV2CreativeContract(brief));
    const selected = bindDirectCreativeEffectSelection(run, receipt([
      candidate('scent-negative', 96, ['template-inertia']),
      candidate('rain-map', 86),
      candidate('memory-cabinet', 80)
    ], 'scent-negative'));
    const withAssets = recordDirectCreativeAttempt(selected, 'asset-batch');
    const built = recordDirectCreativeAttempt(withAssets, 'build');

    expect(selected).toMatchObject({
      selectedDirection: { id: 'scent-negative', title: '气味负片' },
      verdict: 'pending'
    });
    expect(selected.effectSelectionReceipt?.selectedCandidateId).toBe('scent-negative');
    expect(built.attemptBudget.used).toMatchObject({ assetBatches: 1, builds: 1 });
    expect(() => bindDirectCreativeEffectSelection(selected, receipt([
      candidate('other-one', 95),
      candidate('other-two', 85),
      candidate('other-three', 75)
    ], 'other-one'))).toThrow(/已经绑定/);
  });

  it('stops before assets when all three directions are rejected', () => {
    const run = createDirectCreativeRunFromContractV4(createV2CreativeContract(brief));
    const stopped = bindDirectCreativeEffectSelection(run, receipt([
      candidate('generic-rain', 94, ['theme-interchangeable']),
      candidate('static-poster', 90, ['static-equivalent']),
      candidate('particle-room', 88, ['action-disconnected'])
    ], null));

    expect(stopped).toMatchObject({
      verdict: 'stopped',
      stopReason: { code: 'hard-gate-failed', stage: 'effect-selection' },
      attemptBudget: { used: { assetBatches: 0, builds: 0 } }
    });
    expect(() => recordDirectCreativeAttempt(stopped, 'asset-batch'))
      .toThrow(/不得静默重试/);
  });

  it('stops invalid selection evidence instead of silently choosing another candidate', () => {
    const run = createDirectCreativeRunFromContractV4(createV2CreativeContract(brief));
    const stopped = bindDirectCreativeEffectSelection(run, receipt([
      candidate('best-fit', 96),
      candidate('lower-fit', 78),
      candidate('third-fit', 72)
    ], 'lower-fit'));

    expect(stopped).toMatchObject({
      verdict: 'stopped',
      stopReason: { code: 'invalid-evidence', stage: 'effect-selection' }
    });
    expect(stopped.stopReason?.message).toContain('最高相对目标适配');
  });

  it('keeps V3 reconstruction unchanged and exposes a separate V4 author entry', () => {
    const contract = createV2CreativeContract(brief);
    const legacy = createDirectCreativeRunFromContractV3(contract);
    const legacyWithAssets = recordDirectCreativeAttempt(legacy, 'asset-batch');
    const v3Package = createDirectCreativeAuthorPackage(contract);
    const v4Package = createDirectCreativeAuthorPackageV4(contract);

    expect(legacyWithAssets.creativeProtocolVersion).toBe(3);
    expect(legacyWithAssets).not.toHaveProperty('effectSelectionReceipt');
    expect(v3Package.runSeed).toMatchObject({ creativeProtocolVersion: 3 });
    expect(v3Package.runSeed).not.toHaveProperty('effectSelectionReceipt');
    expect(v4Package.runSeed).toMatchObject({
      creativeProtocolVersion: 4,
      effectSelectionReceipt: null,
      verdict: 'pending'
    });
    expect(serializeDirectCreativeAuthorPackage(v4Package)).toContain(
      '绑定前严禁记录素材批次或构建'
    );
  });

  it('keeps the V4 selection guard operable when V5 adds the product journey gate', () => {
    const contract = createV2CreativeContract(brief);
    const run = createDirectCreativeRunFromContractV5(contract);
    const selected = bindDirectCreativeEffectSelection(run, receipt([
      candidate('scent-negative', 96),
      candidate('rain-map', 86),
      candidate('memory-cabinet', 80)
    ], 'scent-negative'));
    const withAssets = recordDirectCreativeAttempt(selected, 'asset-batch');
    const built = recordDirectCreativeAttempt(withAssets, 'build');
    const authorPackage = createDirectCreativeAuthorPackageV5(contract);

    expect(run.creativeProtocolVersion).toBe(5);
    expect(run.productDeliveryPlan?.journey.map((step) => step.phase))
      .toEqual(['entry', 'use', 'result', 'continuation']);
    expect(selected.selectedDirection.id).toBe('scent-negative');
    expect(built.attemptBudget.used).toMatchObject({ assetBatches: 1, builds: 1 });
    expect(authorPackage.runSeed).toMatchObject({
      creativeProtocolVersion: 5,
      effectSelectionReceipt: null
    });
  });
});

function candidate(
  id: string,
  score: number,
  rejectionSignals: EffectDirectionCandidate['rejectionSignals'] = []
): EffectDirectionCandidate {
  const titles: Record<string, string> = {
    'scent-negative': '气味负片',
    'rain-map': '雨痕地图',
    'memory-cabinet': '记忆抽屉'
  };
  return {
    id,
    title: titles[id] ?? `方向 ${id}`,
    experienceForm: `${id} 的独立体验形态与用户观看角色`,
    firstFiveSeconds: `五秒内看见 ${id} 如何捕获雨后城市气味。`,
    signaturePhenomenon: `${id} 让不可见的潮湿气味形成主题专属的可感知变化。`,
    themeMemory: `用户会记住 ${id} 如何保存一段雨后地点记忆。`,
    perceptualJourney: `从无法辨认气味来源，到通过 ${id} 理解地点、湿度与记忆的关系。`,
    runtimeCausality: `用户输入实时改变 ${id} 的地点证据、气味层次和保存结果。`,
    staticEquivalentTest: `静态截图不能同时表达 ${id} 的地点选择、气味变化与保存因果。`,
    actionClosure: `${id} 的完成状态自然生成一张可保存的雨后气味卡。`,
    axisScores: {
      'theme-specific-memory': score,
      'sensory-impact': score,
      'surprise-without-confusion': score,
      'runtime-meaning': score,
      'craft-potential': score,
      'action-closure': score
    },
    rejectionSignals
  };
}

function receipt(
  candidates: [EffectDirectionCandidate, EffectDirectionCandidate, EffectDirectionCandidate],
  selectedCandidateId: string | null
): EffectQualitySelectionReceipt {
  return {
    schemaVersion: 1,
    assessmentKind: 'relative-self-assessment-not-final-evidence',
    candidates,
    selectedCandidateId,
    decisionRationale: '按主题专属性、感官影响、运行时意义和行动收束选择唯一方向，不按技术数量评分。'
  };
}
