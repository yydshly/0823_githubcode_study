import { describe, expect, it } from 'vitest';
import { buildFlowPlan } from '../src/experience/flow-plan';
import { inspectExperience } from '../src/experience/validator';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter';
import { generateCreativeRun } from '../src/generation/orchestrator';

const context = { quality: 'balanced' as const, renderer: 'webgl' as const, motion: 'full' as const };

describe('creative brief generation pipeline', () => {
  it('is deterministic and produces structurally different valid candidates', async () => {
    const provider = new BaselineBriefInterpreter();
    const brief = { text: '为一款面向独立创作者的智能声音产品，设计清冷、克制但有未来感的发布网页。', seed: 17 };
    const first = await generateCreativeRun(brief, provider, context);
    const second = await generateCreativeRun(brief, provider, context);
    expect(second).toEqual(first);
    expect(first.candidates).toHaveLength(3);
    expect(new Set(first.candidates.map((candidate) => candidate.direction.structure))).toEqual(new Set(['focus', 'journey', 'branching']));
    expect(new Set(first.candidates.map((candidate) => candidate.direction.scenePlugin)).size).toBe(2);
    first.candidates.forEach((candidate) => {
      expect(inspectExperience(candidate.manifest)).toEqual([]);
      expect(candidate.capabilityPlan.missing).toEqual([]);
    });
  });

  it('routes explicit dream/editorial language toward the shader capability', async () => {
    const run = await generateCreativeRun({ text: '为时装品牌设计梦幻流体光幕、柔和编辑感的沉浸式首屏。' }, new BaselineBriefInterpreter(), context);
    expect(run.candidates[0].direction.scenePlugin).toBe('chromatic-tide');
    expect(run.interpretation.evidence.find((item) => item.field === 'visual')?.source).toBe('explicit');
  });

  it('creates two deterministic branch routes that rejoin', async () => {
    const run = await generateCreativeRun({ text: '面向学生解释复杂技术系统，并允许从证据或体验两条路线理解。' }, new BaselineBriefInterpreter(), context);
    const manifest = run.candidates.find((candidate) => candidate.direction.structure === 'branching')!.manifest;
    expect(buildFlowPlan(manifest, { choices: { choice: 'evidence' } }).nodeIds).toEqual(['threshold', 'choice', 'evidence-path', 'confluence']);
    expect(buildFlowPlan(manifest, { choices: { choice: 'emotion' } }).nodeIds).toEqual(['threshold', 'choice', 'emotion-path', 'confluence']);
  });

  it('rejects an underspecified brief instead of fabricating a result', async () => {
    await expect(generateCreativeRun({ text: '做网页' }, new BaselineBriefInterpreter(), context)).rejects.toThrow(/至少描述/);
  });
});
