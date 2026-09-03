import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  evaluateEffectQualitySelection,
  effectQualitySelectionGateSchema,
  type EffectDirectionCandidate,
  type EffectQualitySelectionReceipt
} from '../src/v2/effect-quality-selection.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';

const brief = '为一间夜间开放的植物种子档案馆设计网页。访客从看见休眠种子，到用光唤醒内部结构，最后保存一份发芽观察卡。画面要安静、真实并具有意外的生命感。';

function candidate(
  id: string,
  score: number,
  rejectionSignals: EffectDirectionCandidate['rejectionSignals'] = []
): EffectDirectionCandidate {
  return {
    id,
    title: `方向 ${id}`,
    experienceForm: `${id} 的独立体验形态与观看角色`,
    firstFiveSeconds: `五秒内直接看见 ${id} 所属的种子档案空间与核心现象。`,
    signaturePhenomenon: `${id} 让种子内部的生命证据以不可替换的方式出现。`,
    themeMemory: `用户会记住 ${id} 如何让一枚休眠种子被光唤醒。`,
    perceptualJourney: `从不确定种子是否存活，到亲手观察 ${id} 的结构变化并理解生命迹象。`,
    runtimeCausality: `用户输入会实时改变 ${id} 的透光、内部结构和观察结论，而不只改变文字。`,
    staticEquivalentTest: `静态截图不能同时表达 ${id} 的唤醒过程、输入因果和保存结果。`,
    actionClosure: `${id} 的最终状态自然生成一张可保存的发芽观察卡。`,
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
    decisionRationale: '选择最能服务主题记忆、运行时因果和最终行动的方向；技术数量与来源不参与评价。'
  };
}

describe('V2 R150 effect quality selection gate', () => {
  it('places goal-relative comparison before resources and excludes technique prestige', () => {
    const direction = createCodexExecutionBrief(createV2CreativeContract(brief)).creativeDirection;
    const gate = direction.effectQualitySelection;

    expect(effectQualitySelectionGateSchema.parse(gate)).toEqual(gate);
    expect(gate.position).toBe('before-resources-and-code');
    expect(gate.candidateContract).toMatchObject({ count: 3 });
    expect(gate.evaluation).toMatchObject({
      scorePolicy: 'relative-ranking-not-final-quality-proof',
      techniqueCountScored: false,
      mediumPrestigeScored: false,
      sourcePrestigeScored: false,
      templateInertiaPolicy: 'advisory-never-disqualifying',
      browserEvidenceStillRequired: true
    });
    expect(gate.decision.noPassingCandidate).toBe('stop-before-assets');
    expect(new TextEncoder().encode(JSON.stringify(gate)).byteLength).toBeLessThan(1400);
  });

  it('allows only the highest goal-fit candidate without rejection signals to reach resources', () => {
    const result = evaluateEffectQualitySelection(receipt([
      candidate('living-section', 94),
      candidate('seed-constellation', 88),
      candidate('paper-cabinet', 82)
    ], 'living-section'));

    expect(result).toMatchObject({
      receiptValid: true,
      mayProceedToResources: true,
      selectedCandidateId: 'living-section',
      reasons: []
    });
  });

  it('stops before assets when every candidate is thematically invalid', () => {
    const result = evaluateEffectQualitySelection(receipt([
      candidate('generic-one', 90, ['theme-interchangeable']),
      candidate('generic-two', 88, ['static-equivalent']),
      candidate('generic-three', 86, ['action-disconnected'])
    ], null));

    expect(result).toMatchObject({
      receiptValid: true,
      mayProceedToResources: false,
      selectedCandidateId: null,
      reasons: []
    });
  });

  it('keeps template similarity advisory when it is still the best effect', () => {
    const result = evaluateEffectQualitySelection(receipt([
      candidate('familiar-but-strong', 96, ['template-inertia']),
      candidate('novel-but-weaker', 88),
      candidate('third-direction', 82)
    ], 'familiar-but-strong'));

    expect(result).toMatchObject({
      receiptValid: true,
      mayProceedToResources: true,
      selectedCandidateId: 'familiar-but-strong',
      advisorySignals: { 'familiar-but-strong': ['template-inertia'] },
      reasons: []
    });
  });

  it('rejects choosing a more technical but lower-fit or disqualified direction', () => {
    const result = evaluateEffectQualitySelection(receipt([
      candidate('quiet-seed', 94),
      candidate('threejs-spectacle', 99, ['runtime-decoration-only']),
      candidate('video-wall', 86)
    ], 'threejs-spectacle'));

    expect(result.receiptValid).toBe(false);
    expect(result.mayProceedToResources).toBe(false);
    expect(result.reasons.join(' ')).toContain('拒绝信号');
  });

  it('serializes the decision receipt and honest stop boundary into the Codex package', () => {
    const authorPackage = createDirectCreativeAuthorPackage(createV2CreativeContract(brief));
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage.authoringInput.creativeDirection.effectFirst.openExploration.qualitySelection).toEqual({
      rule: 'goal-fit-with-no-rejection',
      fail: 'stop-before-assets',
      proof: 'browser-final'
    });
    expect(serialized).toContain('技术数量、3D、声音、视频、模型或来源不计分');
    expect(serialized).toContain('template-inertia 只提示复核');
    expect(serialized).toContain('三个有效方向全被质量拒绝');
  });
});
