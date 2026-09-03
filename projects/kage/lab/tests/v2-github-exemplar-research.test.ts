import { describe, expect, it } from 'vitest';
import { threejsIrisResearch } from '../src/v2/github-exemplar-research.ts';
import { referenceCardSchema, referenceLibrary, selectReferenceEvidence } from '../src/v2/reference-intelligence.ts';
import { v2ResearchProgram } from '../src/v2/research-program.ts';

describe('Threejs-3D-Webpage exemplar integration', () => {
  it('records source provenance, license and runtime evidence', () => {
    expect(threejsIrisResearch.repositoryUrl).toBe('https://github.com/iamtechartist/Threejs-3D-Webpage');
    expect(threejsIrisResearch.reviewedCommit).toHaveLength(40);
    expect(threejsIrisResearch.license).toBe('MIT');
    expect(threejsIrisResearch.evidenceLevel).toBe('E4');
  });

  it('registers a schema-valid generator reference with explicit boundaries', () => {
    const reference = referenceLibrary.find((item) => item.id === 'threejs-iris-articulated-reveal');
    expect(() => referenceCardSchema.parse(reference)).not.toThrow();
    expect(reference?.sourceKind).toBe('github-source');
    expect(reference?.assetLogic.join(' ')).toContain('真实商品仍需要可信资产');
    expect(reference?.avoid.join(' ')).toContain('不要复制花瓣外形');
  });

  it('selects the case for an articulated abstract subject without making it a universal template', () => {
    const matches = selectReferenceEvidence(
      '让一个抽象机械核心沿滚动逐层展开，关节结构像生物一样绽放。',
      'material-transformation',
      3
    );
    expect(matches[0]?.reference.id).toBe('threejs-iris-articulated-reveal');

    const unrelated = selectReferenceEvidence(
      '为梦境记录产品设计同一房间逐渐清晰的网页。',
      'environmental-memory',
      3
    );
    expect(unrelated[0]?.reference.id).not.toBe('threejs-iris-articulated-reveal');
  });

  it('adds the case to the real spatial object research track', () => {
    const track = v2ResearchProgram.tracks.find((item) => item.id === 'real-spatial-object');
    expect(track?.sources.some((source) => source.id === threejsIrisResearch.id)).toBe(true);
    expect(track?.stopConditions.join(' ')).toContain('程序化形态只是装饰');
  });
});
