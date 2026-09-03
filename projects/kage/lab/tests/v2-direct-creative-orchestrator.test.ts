import { describe, expect, it } from 'vitest';
import {
  directCreativePreparationSchema,
  prepareDirectCreativeRun,
  serializeDirectCreativePreparation
} from '../src/v2/direct-creative-orchestrator.ts';

const brief = '为城市夜间候车的人设计一个安静但有吸引力的雨棚灯光网页。让雨滴、灯光和到站信息形成同一段可感知的等待，最终行动是“保存回家路线”。可以使用最适合的图像、声音、视频、3D 或其他表达。';

describe('V2 direct creative orchestrator', () => {
  it('prepares one deterministic V5 source from a raw idea without side effects', () => {
    const first = prepareDirectCreativeRun(brief);
    const repeated = prepareDirectCreativeRun(brief);

    expect(directCreativePreparationSchema.parse(first)).toEqual(first);
    expect(repeated).toEqual(first);
    expect(first).toMatchObject({
      entry: 'kage-v2-codex-direct',
      state: 'prepared',
      contractId: first.contract.id,
      runId: first.authorPackage.runSeed.id,
      nextAction: 'compare-directions-and-bind-selection'
    });
    expect(first.authorPackage.runSeed.creativeProtocolVersion).toBe(5);
    expect(first.authorPackage.timing).toMatchObject({
      statusReportAfterMs: 60_000,
      silentRetries: 0
    });
  });

  it('makes emotion, understanding, memory, action and promise mandatory', () => {
    const preparation = prepareDirectCreativeRun(brief);

    expect(preparation.experienceIntent).toMatchObject({
      exactBrief: brief,
      intendedFeeling: expect.any(String),
      intendedUnderstanding: expect.any(String),
      themeSpecificMemory: expect.any(String),
      primaryAction: '保存回家路线'
    });
    expect(preparation.experiencePromise).toMatchObject({
      thesis: expect.any(String),
      signatureMoment: expect.any(String),
      expressionStrategy: expect.any(String),
      chosenMethods: expect.any(Array),
      methodRationale: expect.any(String)
    });
    expect(preparation.experiencePromise.chosenMethods.length).toBeGreaterThan(0);
  });

  it('keeps only user and universal quality instructions hard', () => {
    const preparation = prepareDirectCreativeRun(brief);
    const hard = preparation.contract.instructions.filter((instruction) => instruction.strength === 'hard');

    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every((instruction) => (
      instruction.source === 'user' || instruction.source === 'quality'
    ))).toBe(true);
    expect(preparation.authorPackage.authoringInput.creativeDirection).toMatchObject({
      sourcePolicy: 'open-best-fit',
      noGlobalStyleRules: true
    });
  });

  it('serializes the required experience promise before the bounded author package', () => {
    const serialized = serializeDirectCreativePreparation(prepareDirectCreativeRun(brief));

    expect(serialized).toContain('EXPERIENCE_INTENT_JSON');
    expect(serialized).toContain('EXPERIENCE_PROMISE_JSON');
    expect(serialized).toContain('DIRECT_CREATIVE_AUTHOR_PACKAGE_JSON');
    expect(serialized.indexOf('EXPERIENCE_PROMISE_JSON')).toBeLessThan(
      serialized.indexOf('DIRECT_CREATIVE_AUTHOR_PACKAGE_JSON')
    );
  });
});
