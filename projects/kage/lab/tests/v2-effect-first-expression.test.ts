import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { effectFirstExpressionDirectiveSchema } from '../src/v2/effect-first-expression.ts';

describe('V2 effect-first open expression', () => {
  const brief = '为社区花园开放日设计一个让居民愿意停留和参与的网页。用户从陌生旁观逐渐感到自己正在让花园苏醒，最后报名共同种下一块花圃。画面温暖、意外、有生命感。';

  it('places an open-world effect decision above the provisional medium route', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(brief));
    const direction = execution.creativeDirection;

    expect(effectFirstExpressionDirectiveSchema.parse(direction.effectFirst)).toEqual(direction.effectFirst);
    expect(direction.effectFirst).toMatchObject({
      priority: 'final-experience-over-known-techniques',
      openExploration: {
        candidateCount: 3,
        commitPolicy: 'compare-before-assets-then-build-one'
      },
      methodPolicy: {
        knownTechniquesAreExamplesOnly: true,
        unlistedTechniquesAllowed: true,
        inventionAllowed: true,
        techniqueQuota: 'none',
        selectionRule: 'choose-methods-only-after-selecting-the-effect'
      }
    });
    expect(direction.leadMedium.planningRole).toBe('resource-anchor-not-creative-boundary');
    expect(direction.effectFirst.effectProof.signaturePhenomenon).toContain('花园');
  });

  it('allows an unlisted future technique without changing the bounded build budget', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(brief)
    );
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(serialized).toContain('内部比较三个大胆且真正不同的效果命题');
    expect(serialized).toContain('可以采用未列出的技术、合成方式或交互语法');
    expect(serialized).toContain('不是创意边界，也不是技术白名单');
    expect(authorPackage.runSeed.attemptBudget.limits).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 2,
      visualRefinements: 1
    });
  });

  it('keeps user hard boundaries while leaving expression methods open', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(
      `${brief} 不要自动播放声音，必须提供减少动态模式。`
    ));

    expect(execution.creativeDirection.hardConstraints.join('。')).toMatch(/不要自动播放声音|减少动态/);
    expect(execution.creativeDirection.effectFirst.methodPolicy.unlistedTechniquesAllowed).toBe(true);
    expect(execution.creativeDirection.effectFirst.authoringInstruction).toContain('用户硬要求');
  });
});
