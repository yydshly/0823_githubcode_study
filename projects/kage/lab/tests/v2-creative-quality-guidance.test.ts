import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  createDirectCreativeAuthorPackageV5,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import {
  CREATIVE_QUALITY_CANON,
  createCreativeDirectorGuidance,
  createCreativeOutcomeFeedback,
  creativeOutcomeFeedbackSchema,
  serializeCompactCreativeDirectorGuidance
} from '../src/v2/creative-quality-guidance.ts';

const dreamBrief = '为一款帮助人记录梦境的产品设计网页。开场像刚醒来的同一间模糊房间，滚动时记忆逐渐形成可探索空间，最后记录今晚的梦。希望安静、真实。';

describe('V2 creative quality guidance', () => {
  it('teaches observable quality without turning taste into hard style rules', () => {
    const authorPackage = createDirectCreativeAuthorPackageV5(createV2CreativeContract(dreamBrief));
    const guidance = createCreativeDirectorGuidance(authorPackage);

    expect(guidance.authority).toEqual({
      hardBoundaries: 'user-truth-runtime-evidence-and-budget-only',
      tasteGuidance: 'positive-advisory-and-discardable',
      referencePolicy: 'borrow-principles-never-copy-pages',
      unlistedMethods: 'allowed-when-they-better-serve-the-experience'
    });
    expect(guidance.qualityCanon).toHaveLength(7);
    expect(guidance.qualityCanon.every((dimension) => dimension.authority === 'advisory')).toBe(true);
    expect(guidance.qualityCanon.map((dimension) => dimension.id)).toEqual(
      CREATIVE_QUALITY_CANON.map((dimension) => dimension.id)
    );
    expect(JSON.stringify(guidance)).not.toMatch(/必须暗色|固定三屏|必须使用 3D/);
  });

  it('explains why a selected reference works and only borrows relevant principles', () => {
    const authorPackage = createDirectCreativeAuthorPackageV5(createV2CreativeContract(dreamBrief));
    const guidance = createCreativeDirectorGuidance(authorPackage);
    const dreamReference = guidance.referenceLessons.find(
      (reference) => reference.referenceId === 'positive-dream-room-memory'
    );

    expect(dreamReference).toBeDefined();
    expect(dreamReference?.whyItWorks.join('')).toContain('同一房间');
    expect(dreamReference?.borrowForThisBrief.length).toBeGreaterThan(0);
    expect(dreamReference?.advisoryRisk).toBeTruthy();
  });

  it('does not force an unrelated case when the author package has no reference', () => {
    const authorPackage = createDirectCreativeAuthorPackageV5(createV2CreativeContract(
      '为一家社区早餐店设计明亮网页，让访客看见今日菜单并预订明早的座位。'
    ));
    authorPackage.authoringInput.references = [];
    const guidance = createCreativeDirectorGuidance(authorPackage);

    expect(guidance.referenceLessons).toEqual([]);
    expect(guidance.noReferenceFallback).toBe('do-not-force-a-case-when-relevance-is-weak');
  });

  it('puts qualitative evidence before scores and final browser output before code intent', () => {
    const authorPackage = createDirectCreativeAuthorPackageV5(createV2CreativeContract(dreamBrief));
    const guidance = createCreativeDirectorGuidance(authorPackage);
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(guidance.directionDecision.mode).toBe('qualitative-evidence-before-relative-score');
    expect(guidance.finalJudgment.evidenceBasis)
      .toBe('final-rendered-browser-experience-not-code-intent');
    expect(serialized).toContain('CREATIVE_DIRECTOR_GUIDANCE_JSON');
    expect(serialized).toContain('技术数量与技术声望不计分');
    expect(new TextEncoder().encode(serializeCompactCreativeDirectorGuidance(guidance)).byteLength)
      .toBeLessThan(4 * 1024);
  });

  it('stores explicit outcome feedback as scoped learning rather than a global ban', () => {
    const feedback = createCreativeOutcomeFeedback({
      runId: 'direct-r167-quality-guidance',
      bundleHash: 'a'.repeat(64),
      verdict: 'hold',
      observation: '画面可以运行，但第一眼仍然像通用静态海报，主题情绪没有被直接感知。',
      strengths: ['产品行动清楚'],
      gaps: ['核心素材缺少主题身份'],
      reusableLearning: ['后续同类任务应先验证主视觉是否能在没有标题时表达主题。']
    });

    expect(feedback.learningScope).toBe('current-run-and-reference-memory-only');
    expect(feedback.globalStyleRuleCreated).toBe(false);
    expect(() => creativeOutcomeFeedbackSchema.parse({
      ...feedback,
      globalStyleRuleCreated: true
    })).toThrow();
  });
});
