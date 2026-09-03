import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  positiveReferenceLibrary,
  selectPositiveReferenceEvidence
} from '../src/v2/reference-intelligence.ts';

const promotedIds = [
  'positive-scroll-rig-progressive-layer',
  'positive-noise-surface-causality',
  'positive-audio-signal-continuity'
] as const;

describe('R156 external mechanism promotion', () => {
  it('keeps exactly three promoted packs with source and local runtime evidence', () => {
    const promoted = positiveReferenceLibrary.filter((pack) => promotedIds.includes(pack.id as typeof promotedIds[number]));
    expect(promoted).toHaveLength(3);
    for (const pack of promoted) {
      expect(pack.source.kind).toBe('github-source');
      expect(pack.source.evidenceLevel).toBe('source-and-runtime-verified');
      expect(pack.evidence.some((item) => item.kind === 'source-review')).toBe(true);
      expect(pack.evidence.some((item) => item.kind === 'screenshot')).toBe(true);
    }
  });

  it('selects each promoted principle only for an explicit semantic match', () => {
    expect(selectPositiveReferenceEvidence(
      '制作 DOM 与 WebGL 同步滚动的 3D 叙事，并保留 WebGL 回退。',
      'continuous-scroll'
    ).map((pack) => pack.id)).toContain('positive-scroll-rig-progressive-layer');

    expect(selectPositiveReferenceEvidence(
      '让包装表面通过噪声溶解完成一次材质转场。',
      'material-transformation'
    ).map((pack) => pack.id)).toContain('positive-noise-surface-causality');

    expect(selectPositiveReferenceEvidence(
      '为音乐发行设计低频、中频和高频分别驱动的音频反应网页。',
      'product-atmosphere'
    ).map((pack) => pack.id)).toContain('positive-audio-signal-continuity');
  });

  it('injects a matching positive principle into the authoring contract but leaves unrelated briefs empty', () => {
    const contract = createV2CreativeContract(
      '为一张音乐专辑设计声音驱动网页，让低频、中频和高频产生不同的实时视觉反馈。'
    );
    const execution = createCodexExecutionBrief(contract);
    expect(execution.references.map((reference) => reference.id)).toContain('positive-audio-signal-continuity');

    expect(selectPositiveReferenceEvidence(
      '为社区花园开放日制作报名网页，展示日期和报名入口。',
      'editorial-field'
    )).toEqual([]);
  });
});
