import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import {
  createDirectCreativeAuthorPackage,
  serializeDirectCreativeAuthorPackage
} from '../src/v2/direct-creative-author-package.ts';
import { effectResourceOrchestrationSchema } from '../src/v2/effect-resource-orchestration.ts';

describe('V2 effect-led open resource orchestration', () => {
  const brief = '为夜间候鸟迁徙观察计划设计一个具有空间感、声音与实时变化的网页，让公众从看见一条迁徙路线，到理解光污染如何改变飞行，最后认领一次熄灯行动。';

  it('keeps product capabilities, GitHub mechanisms, generated media and original code open after effect selection', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(brief));
    const plan = execution.creativeDirection.resourceOrchestration;

    expect(effectResourceOrchestrationSchema.parse(plan)).toEqual(plan);
    expect(plan.sources).toEqual([
      'existing-product-capability',
      'github-implementation',
      'model-generated-asset',
      'project-existing-capability',
      'direct-original-code'
    ]);
    expect(plan.selection).toMatchObject({
      sourceCountPolicy: 'minimum-sufficient',
      combinationAllowed: true,
      mandatorySource: 'none',
      vendorOrModelWhitelist: 'none',
      selectionRule: 'effect-first-quality-evidence-risk'
    });
    expect(plan.qualityGates).toContain('generated-final-quality');
    expect(plan.qualityGates).toContain('github-revision-license-fallback');
    expect(plan.qualityGates).toContain('browser-final-judge');
  });

  it('uses reviewed evidence first and preserves the bounded generation budget', () => {
    const authorPackage = createDirectCreativeAuthorPackage(createV2CreativeContract(brief));
    const serialized = serializeDirectCreativeAuthorPackage(authorPackage);

    expect(authorPackage.authoringInput.creativeDirection.resourceOrchestration.executionBounds).toEqual({
      researchPolicy: 'reviewed-evidence-first',
      generatedAssetBatches: 1,
      dependencyDecision: 'freeze-before-build',
      postBuildDependencyChange: 'deterministic-fix-only',
      silentAlternatives: 0
    });
    expect(authorPackage.runSeed.attemptBudget.limits).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 2,
      visualRefinements: 1
    });
    expect(serialized).toContain('产品能力、GitHub 机制、模型素材');
    expect(serialized).toContain('不强制来源或技术');
    expect(serialized).toContain('禁止静默换库、换模型或重复生成');
  });

  it('keeps an explicit user source restriction as a current-run hard constraint', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(
      `${brief} 不得调用外部地图服务，必须使用明确标记的演示路线数据。`
    ));

    expect(execution.creativeDirection.hardConstraints.join('。')).toContain('不得调用外部地图服务');
    expect(execution.creativeDirection.resourceOrchestration.selection.mandatorySource).toBe('none');
  });
});
