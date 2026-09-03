import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { selectCreativeMediumDecision } from '../src/v2/creative-medium-decision.ts';
import { deriveVisualAmbitionContract } from '../src/v2/visual-ambition-planner.ts';

export const prismSeedBrief = '为一座收藏阳光折射标本的植物温室设计网页。访客进入时看见一枚尚未展开的半透明种荚；随着探索，日光穿过种荚，在地面留下不断生长的彩色光谱，最终把这一刻保存成“今日折光标本”。画面明亮、宁静、真实，又有第一次看见自然奇迹的惊喜；不要像参数工作台。';

describe('R135 ordinary brief chooses an image-led hybrid composition', () => {
  it('keeps the generated visual primary and runtime optics supporting without a technology hint', () => {
    const contract = createV2CreativeContract(prismSeedBrief);
    const medium = selectCreativeMediumDecision(contract);
    const ambition = deriveVisualAmbitionContract(contract, medium);

    expect(prismSeedBrief.toLocaleLowerCase()).not.toMatch(/webgl|three\.js|shader|canvas|生图|生成图/);
    expect(medium).toMatchObject({
      preferred: 'generated-image',
      assetResponsibilities: [expect.objectContaining({ source: 'generated-image' })]
    });
    expect(ambition.rendering).toMatchObject({
      primary: 'raster-image',
      supporting: expect.arrayContaining(['dom-css', 'webgl-shader'])
    });
  });

  it('carries the medium choice and bounded attempt policy into protocol V3', () => {
    const authorPackage = createDirectCreativeAuthorPackage(createV2CreativeContract(prismSeedBrief));

    expect(authorPackage.authoringInput.mediumDecision.preferred).toBe('generated-image');
    expect(authorPackage.authoringInput.visualAmbition.rendering).toMatchObject({
      primary: 'raster-image',
      supporting: expect.arrayContaining(['webgl-shader'])
    });
    expect(authorPackage.runSeed).toMatchObject({
      creativeProtocolVersion: 3,
      assetStrategy: 'generated',
      verdict: 'pending'
    });
    expect(authorPackage.runSeed.attemptBudget).toMatchObject({
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
});
