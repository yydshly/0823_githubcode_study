import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import {
  positiveReferenceLibrary,
  selectPositiveReferenceEvidence
} from '../src/v2/reference-intelligence.ts';

const expectedBackfill = {
  'positive-night-reflective-catalog': 'catalog',
  'positive-color-relay-branching': 'branching-confluence',
  'positive-forest-sound-route': 'single-stage',
  'positive-moonlit-tidepool-panorama': 'horizontal-panorama',
  'positive-stormglass-programmatic-field': 'spatial-journey',
  'positive-prism-seed-hybrid': 'spatial-journey'
} as const;

describe('R136 verified reference backfill', () => {
  it('binds every recent capability pack to existing final evidence', () => {
    for (const [id, macroStructureCategory] of Object.entries(expectedBackfill)) {
      const pack = positiveReferenceLibrary.find((candidate) => candidate.id === id);

      expect(pack, id).toBeTruthy();
      expect(pack?.macroStructureCategory).toBe(macroStructureCategory);
      expect(pack?.source.evidenceLevel).toBe('runtime-verified');
      expect(pack?.confidence).toBeGreaterThanOrEqual(.99);
      expect(pack?.positiveBorrowPrinciples.length).toBeGreaterThanOrEqual(2);
      expect(pack?.advisoryRisks.join('')).not.toMatch(/不要|禁止|必须采用|必须使用/);
      for (const artifact of pack?.evidence ?? []) {
        expect(artifact.verified).toBe(true);
        expect(existsSync(resolve(process.cwd(), artifact.uri)), artifact.uri).toBe(true);
      }
    }
  });

  it.each([
    [
      '目录',
      '为材料样本馆设计网页，支持筛选样本、移动光束检查和二选比较。',
      'editorial-field',
      'positive-night-reflective-catalog'
    ],
    [
      '分支',
      '设计城市接力网页，两种策略分别提前交棒与压线交棒，最终让分支汇合。',
      'spatial-exploration',
      'positive-color-relay-branching'
    ],
    [
      '声音',
      '为儿童自然博物馆设计森林声音探索，用声源热点收集并形成聆听路线。',
      'spatial-exploration',
      'positive-forest-sound-route'
    ],
    [
      '横向全景',
      '用一张宽幅主视觉设计横向巡游，让访客沿连续全景检查三个站点。',
      'spatial-exploration',
      'positive-moonlit-tidepool-panorama'
    ],
    [
      '程序化光场',
      '用实时 WebGL 程序化光场表现风暴玻璃，滚动改变电荷裂隙与玻璃折射。',
      'material-transformation',
      'positive-stormglass-programmatic-field'
    ],
    [
      '生成主视觉与增强',
      '采用生成主视觉承担环境，再用动态增强表现半透明种荚形成彩色光谱。',
      'material-transformation',
      'positive-prism-seed-hybrid'
    ]
  ] as const)('selects the %s proof only from explicit semantic matches', (_label, brief, pattern, expectedId) => {
    const selected = selectPositiveReferenceEvidence(brief, pattern, 3);

    expect(selected[0]?.id).toBe(expectedId);
    expect(selected.some((pack) => pack.id === expectedId)).toBe(true);
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it('passes the hybrid asset/runtime division into the first Codex execution brief', () => {
    const contract = createV2CreativeContract(
      '为植物温室设计网页，用生成主视觉承担环境，再用动态增强表现半透明种荚形成彩色光谱。'
    );
    const execution = createCodexExecutionBrief(contract);
    const hybrid = execution.references.find((reference) => reference.id === 'positive-prism-seed-hybrid');

    expect(hybrid?.positiveBorrowPrinciples.join('')).toContain('高质量素材承担主题身份');
    expect(hybrid?.positiveBorrowPrinciples.join('')).toContain('可见职责');
    expect(hybrid).not.toHaveProperty('avoid');
  });
});
