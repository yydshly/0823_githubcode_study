import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';

export const distantDinnerBrief = '为一个让异地家人约定同一时刻吃饭的项目设计网页。访客要理解如何发起一次“同桌时刻”，看见双方留下的一道菜和一句话，并邀请另一张餐桌加入。页面应让相隔很远的两张桌子感觉正在靠近，温暖、克制，不煽情。最终行动是“发起今晚的同桌时刻”。人物、地点与故事均为概念演示。';

describe('R141 ordinary brief generalization probe', () => {
  it('selects a relevant panoramic principle and generated identity without medium or layout hints', () => {
    const contract = createV2CreativeContract(distantDinnerBrief);
    const execution = createCodexExecutionBrief(contract);
    const authorPackage = createDirectCreativeAuthorPackage(contract);

    expect(contract.intent).toMatchObject({
      subject: '让异地家人约定同一时刻吃饭的项目',
      desiredFeeling: '克制、温暖',
      primaryAction: '发起今晚的同桌时刻',
      negativeConstraints: [],
    });
    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: { mode: 'editorial-flow' },
    });
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'editorial-evidence',
      controlVisibility: 'none',
      interactionStyle: 'scroll',
    });
    expect(contract.referenceEvidence).toContainEqual(expect.objectContaining({
      referenceId: 'positive-moonlit-tidepool-panorama',
    }));
    expect(execution.mediumDecision).toMatchObject({
      preferred: 'generated-image',
      confidence: 0.84,
    });
    expect(execution.visualAmbition.rendering).toMatchObject({
      primary: 'raster-image',
    });
    expect(authorPackage.runSeed.interaction).toMatchObject({
      mode: 'none',
      audioApplicable: false,
    });

    expect(contract.instructions.every((instruction) => (
      instruction.strength === 'advisory'
      || instruction.source === 'user'
      || instruction.source === 'quality'
    ))).toBe(true);
    expect(contract.instructions.filter((instruction) => instruction.strength === 'hard')
      .every((instruction) => instruction.source === 'user' || instruction.source === 'quality'))
      .toBe(true);
  });
});
