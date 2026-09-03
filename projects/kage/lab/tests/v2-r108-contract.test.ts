import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { classifyInteractionTaskShape } from '../src/v2/interaction-task-shape.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

const brief = '为社区菜市场设计一张明亮的“本周当季食材编排台”。主工作区像上午自然光下的摊位与印刷采购单，持续展示番茄、青豆、蘑菇、南瓜和香草。用户把食材拖到工作日晚餐或周末慢炖区域，食材位置、季节性、预计保存天数、预算小计和建议采购顺序在同一桌面同步变化；切换一人 / 三人份会重新计算数量。最后行动为“生成本周采购单”。不要暗色科技、中央孤立产品、巨型标题、随机粒子、固定三栏或三屏长滚动。素材来源不限，以食材可信、关系清晰、操作有反馈和最终视觉质量为准。';

describe('R108 bounded market workbench contract', () => {
  it('routes the new idea into a bounded physical workspace before creating a job', () => {
    const contract = createV2CreativeContract(brief);
    const summary = summarizeV2CreativeContract(contract, 0);
    const task = classifyInteractionTaskShape(brief);

    expect(task).toMatchObject({
      kind: 'grounded-physical-manipulation',
      directManipulation: true,
      persistentPhysicalScene: true,
      movablePhysicalSubjects: true,
      spatialCausality: true
    });
    expect(summary.structureMode).toBe('interactive-field');
    expect(summary.rendererRoute).toBe('dom-canvas-hybrid');
    expect(summary.sceneCompositionRoute).toBe('layered-2d');
    expect(contract.technical.sceneComposition.requiredLayers.length).toBeLessThanOrEqual(4);
    expect(contract.technical.sceneComposition.requiredLayers).toEqual(expect.arrayContaining(['environment', 'subject']));
    expect(contract.assets.some((asset) => asset.integration === 'native-procedural')).toBe(false);
    expect(contract.technical.interactionDriver).toMatchObject({
      selected: false,
      requestedModes: ['manual']
    });
    expect(contract.executionLimits).toMatchObject({ authoringPasses: 1, assetBatches: 1, refinementPasses: 1, stopAfterMinutes: 3 });
    expect(contract.intent.primaryAction).toContain('生成本周采购单');
  });
});
