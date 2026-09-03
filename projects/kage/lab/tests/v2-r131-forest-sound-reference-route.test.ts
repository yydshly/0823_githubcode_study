import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { selectPositiveReferenceEvidence } from '../src/v2/reference-intelligence.ts';

export const forestSoundBrief = [
  '为儿童自然博物馆设计“声音藏在哪里”互动网页；',
  '在明亮森林剖面中点击叶片、树洞、溪石或昆虫，播放对应自然声音，声源位置、波纹和观察提示同步出现；',
  '收集三个后形成聆听路线并保存。',
  '不要暗色科技、卡片目录或固定三屏。'
].join('');

describe('R131 forest sound positive reference route', () => {
  it('prefers the archived route proof, then preserves the two precursor mechanisms', () => {
    const selected = selectPositiveReferenceEvidence(forestSoundBrief, 'spatial-exploration');

    expect(selected.map((pack) => pack.id)).toEqual([
      'positive-forest-sound-route',
      'positive-sonic-editorial-feedback',
      'positive-paper-butterfly-object-field'
    ]);
    expect(new Set(selected.map((pack) => pack.macroStructureCategory))).toEqual(
      new Set(['single-stage', 'editorial-flow', 'object-field'])
    );
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it('passes positive principles into the bounded authoring brief without copying visual style', () => {
    const contract = createV2CreativeContract(forestSoundBrief);
    const execution = createCodexExecutionBrief(contract);

    expect(execution.references.map((reference) => reference.id)).toEqual([
      'positive-forest-sound-route',
      'positive-sonic-editorial-feedback',
      'positive-paper-butterfly-object-field'
    ]);
    expect(execution.references.flatMap((reference) => reference.positiveBorrowPrinciples).join('')).toContain('声音放回可辨认的空间来源');
    expect(execution.references.flatMap((reference) => reference.positiveBorrowPrinciples).join('')).toContain('同一个选择状态');
    expect(execution.references.flatMap((reference) => reference.positiveBorrowPrinciples).join('')).toContain('同一可探索空间');
    expect(execution.references.flatMap((reference) => reference.advisoryRisks).join('')).toContain('视觉验收仅为研究级');
  });

  it('does not inject either pack into an unrelated editorial brief', () => {
    expect(selectPositiveReferenceEvidence(
      '为社区图书交换日设计一张安静的报名说明页，展示日期、地点和报名入口。',
      'editorial-field'
    )).toEqual([]);
  });
});
