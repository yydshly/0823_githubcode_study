import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeAuthorPackage,
  directCreativeAuthorPackageSchema,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';

const flagshipBrief = '为手语演出季设计明亮的旗舰视觉网页。让手势轨迹形成吸引眼球的实时主视觉，并引导观众查看本周节目。';
const foldingLampBrief = '为一家使用再生纸纤维制作折叠灯具的工作室设计发布网页。开场是一盏完全折叠的纸灯；访客滚动、拖动或用方向键时，同一盏灯依次展开，纸纤维开始透光，桌面光影随结构变化。完全展开后显示结构与材料说明，最终行动是“预约看样”。画面像工业设计杂志与灯光舞台结合，明亮、安静、有视觉冲击力，不做参数工作台。所有结构与发光变化均为概念演示。';

describe('V2 direct creative author package', () => {
  it('keeps the contract, compact authoring input, initial run and package on one deterministic source', () => {
    const contract = createV2CreativeContract(flagshipBrief);
    const expectedRun = createDirectCreativeRunFromContractV3(contract);
    const first = createDirectCreativeAuthorPackage(contract);
    const repeated = createDirectCreativeAuthorPackage(createV2CreativeContract(flagshipBrief));

    expect(directCreativeAuthorPackageSchema.parse(first)).toEqual(first);
    expect(repeated).toEqual(first);
    expect(first).toMatchObject({
      contractId: contract.id,
      authoringInput: {
        contractId: contract.id,
        exactBrief: flagshipBrief
      },
      runSeed: {
        creativeProtocolVersion: 3,
        id: expectedRun.id,
        contractId: contract.id,
        directionId: expectedRun.selectedDirection.id,
        assetBatchId: expectedRun.assetPlan.batchId
      }
    });
    expect(first.authoringInput.mediumDecision).toEqual(expectedRun.mediumDecision);
    expect(first.runSeed.mediumDecisionFingerprint).toMatch(/^[a-z0-9]+$/);
    expect(first.packageId).toMatch(/^author-package-[a-z0-9]+$/);
  });

  it('invalidates all authoring identities when the brief changes', () => {
    const original = createDirectCreativeAuthorPackage(createV2CreativeContract(flagshipBrief));
    const changed = createDirectCreativeAuthorPackage(createV2CreativeContract(
      `${flagshipBrief} 最终行动改为预约周六晚场。`
    ));

    expect(changed.contractId).not.toBe(original.contractId);
    expect(changed.runSeed.id).not.toBe(original.runSeed.id);
    expect(changed.packageId).not.toBe(original.packageId);
    expect(changed.authoringInput.exactBrief).not.toBe(original.authoringInput.exactBrief);
  });

  it('rejects a run seed whose medium fingerprint no longer matches the author input', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(flagshipBrief)
    );
    const changed = {
      ...authorPackage,
      authoringInput: {
        ...authorPackage.authoringInput,
        mediumDecision: {
          ...authorPackage.authoringInput.mediumDecision,
          confidence: Math.max(0, authorPackage.authoringInput.mediumDecision.confidence - 0.1)
        }
      }
    };

    expect(directCreativeAuthorPackageSchema.safeParse(changed).success).toBe(false);
  });

  it('delivers compact visual ambition with one bounded direction, asset batch and build', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(flagshipBrief)
    );

    expect(authorPackage.authoringInput.visualAmbition).toMatchObject({
      intentLevel: 'flagship',
      hero: {
        withinSeconds: expect.any(Number),
        change: expect.anything()
      },
      rendering: {
        primary: expect.any(String),
        supporting: expect.any(Array)
      },
      depth: {
        mode: expect.any(String),
        cues: expect.any(Array)
      },
      motion: expect.any(Array)
    });
    expect(authorPackage.authoringInput.visualAmbition.hero.withinSeconds).toBeLessThanOrEqual(5);
    expect(authorPackage.authoringInput.visualAmbition.motion.length).toBeGreaterThan(0);
    expect(authorPackage.authoringInput.creativeDirection).toMatchObject({
      sourcePolicy: 'open-best-fit',
      noGlobalStyleRules: true,
      selectionRule: 'one-direction-lead-plus-purposeful-support'
    });
    expect(authorPackage.authoringInput.goal).toMatchObject({
      subject: expect.any(String),
      audience: expect.any(String),
      action: expect.any(String)
    });
    expect(authorPackage.authoringInput.direction).toMatchObject({
      visualRole: expect.any(String),
      renderer: {
        reason: expect.any(String),
        threeJustification: expect.any(String)
      },
      mechanisms: expect.any(Array),
      rejected: expect.any(Array)
    });
    expect(Array.isArray(authorPackage.authoringInput.assets)).toBe(true);
    expect(authorPackage.runSeed.attemptBudget.limits).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 2,
      visualRefinements: 1
    });
    expect(authorPackage.runSeed.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 0,
      builds: 0,
      deterministicRepairs: 0,
      visualRefinements: 0
    });
    expect(authorPackage.timing).toEqual({
      statusReportAfterMs: 60_000,
      deadlineAfterMs: 180_000,
      silentRetries: 0
    });
  });

  it('derives browser checkpoints from the promised interaction and requires WowGate for flagship work', () => {
    const flagship = createDirectCreativeAuthorPackage(createV2CreativeContract(flagshipBrief));
    const scroll = createDirectCreativeAuthorPackage(createV2CreativeContract(
      '为梦境记录产品设计网页。开场像刚醒来的模糊房间，滚动时穿过同一空间，记忆碎片逐渐清晰，最后记录今晚的梦。'
    ));
    const editorial = createDirectCreativeAuthorPackage(createV2CreativeContract(
      '为社区剧场设计一张演出季网页，让访客理解本周节目并完成购票。'
    ));

    expect(flagship.evidenceRequirements.wowGateRequired).toBe(true);
    expect(flagship.evidenceRequirements.profile.interactionMode).toBe(flagship.runSeed.interaction.mode);
    expect(flagship.evidenceRequirements.profile.requiredCheckpoints).toEqual(
      checkpointsFor(flagship.runSeed.interaction.mode, flagship.runSeed.interaction.audioApplicable)
    );
    expect(scroll.evidenceRequirements.profile).toMatchObject({
      interactionMode: 'scroll',
      requiredCheckpoints: ['opening', 'core', 'mobile', 'scroll']
    });
    expect(editorial.evidenceRequirements).toMatchObject({
      profile: {
        interactionMode: 'none',
        requiredCheckpoints: ['opening', 'core', 'mobile']
      },
      wowGateRequired: false,
      identityBinding: 'runId+bundleHash',
      macroStructureReview: 'content-fit-required',
      archivePolicy: 'best-result-only'
    });
  });

  it('keeps the exact multi-input state journey and the required sequence inside one batch', () => {
    const contract = createV2CreativeContract(foldingLampBrief);
    const run = createDirectCreativeRunFromContractV3(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);
    const primaryJourney = authorPackage.authoringInput.authoring as {
      primaryJourney: { operation: string; stateBinding: string };
    };

    expect(authorPackage.authoringInput.exactBrief).toBe(foldingLampBrief);
    expect(primaryJourney.primaryJourney).toMatchObject({
      operation: expect.stringMatching(/滚动.*拖动.*方向键.*同一盏灯/),
      stateBinding: 'single-causal-state'
    });
    expect(authorPackage.runSeed.interaction).toMatchObject({
      mode: 'mixed',
      rationale: expect.stringMatching(/滚动.*拖动.*方向键.*同一.*状态/)
    });
    expect(run.assetPlan).toMatchObject({
      batchId: authorPackage.runSeed.assetBatchId,
      strategy: 'generated',
      assets: [{ id: 'state-subject', source: 'generated', required: true }]
    });
    expect(authorPackage.runSeed.attemptBudget.limits.assetBatches).toBe(1);
    expect(serializeDirectCreativeAuthorPackage(authorPackage)).toContain(
      '连续状态属于同一素材职责与同一素材批次'
    );
    expect(serializeDirectCreativeAuthorPackage(authorPackage)).toContain(
      '主导媒介，不是唯一可用媒介'
    );
  });

  it('serializes one parseable bounded package without copying the persisted research contract', () => {
    const contract = createV2CreativeContract(flagshipBrief);
    const authorPackage = createDirectCreativeAuthorPackage(contract);
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);
    const marker = 'DIRECT_CREATIVE_AUTHOR_PACKAGE_JSON\n';
    const payload = serialized.slice(serialized.indexOf(marker) + marker.length);

    expect(serialized.indexOf(marker)).toBeGreaterThan(0);
    expect(directCreativeAuthorPackageSchema.parse(JSON.parse(payload))).toEqual(authorPackage);
    expect(serialized).not.toContain('sourceCaseIds');
    expect(serialized).not.toContain('sourceUrl');
    expect(serialized).not.toContain('evaluatedCapability');
    expect(serialized).not.toContain('referenceEvidence');
    expect(serialized).not.toContain('CODEX_EXECUTION_BRIEF_JSON');
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(20 * 1024);
    expect(serialized.length).toBeLessThan(JSON.stringify(contract).length * 1.25);
  });
});

function checkpointsFor(
  mode: 'none' | 'scroll' | 'direct' | 'mixed',
  audioApplicable: boolean
): string[] {
  const checkpoints = ['opening', 'core', 'mobile'];
  if (mode === 'scroll' || mode === 'mixed') checkpoints.push('scroll');
  if (mode === 'direct' || mode === 'mixed') checkpoints.push('interaction');
  if (audioApplicable) checkpoints.push('audio');
  return checkpoints;
}
