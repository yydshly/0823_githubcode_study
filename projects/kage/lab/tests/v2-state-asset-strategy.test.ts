import { describe, expect, it } from 'vitest';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

const joineryBrief = '为普通访客设计古建筑榫卯互动学习网页，真实旧木构件逐步对齐并咬合，随后展示受力路径和修复档案，最后预约拆解课。';

describe('V2 state asset strategy', () => {
  it('routes a real joinery assembly through continuous, layered, or model state assets', () => {
    const contract = createV2CreativeContract(joineryBrief);

    expect(contract.technical.spatialProductTopology.selected).toBe(false);
    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      changeKind: 'assembly',
      route: 'continuous-media-or-layered-subject',
      minimumDistinctStates: 3,
      minimumPartGroups: 2,
      failurePolicy: 'block-authoring'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'state-subject', role: 'subject', modality: 'image-sequence', required: true, fallback: 'block'
    }));
    expect(contract.assets.find((asset) => asset.id === 'spatial-environment')?.required).toBe(false);
  });

  it('does not treat free orbit wording as an explicit model asset declaration', () => {
    const contract = createV2CreativeContract(
      '为一款耳机设计新品页，主图可以自由旋转检查外观、颜色和佩戴方向，最后加入购物车。'
    );

    expect(contract.technical.spatialProductTopology.selected).toBe(false);
    expect(contract.technical.stateAssetStrategy.route).not.toBe('inspectable-model');
    expect(contract.assets.some((asset) => asset.modality === 'model-3d')).toBe(false);
  });

  it('keeps the decision inside Codex authoring and the visible workbench summary', () => {
    const contract = createV2CreativeContract(joineryBrief);
    const execution = createCodexExecutionBrief(contract);
    const summary = summarizeV2CreativeContract(contract);

    expect(execution.technical.stateAssetStrategy.route).toBe('continuous-media-or-layered-subject');
    expect(summary.stateAssetRoute).toBe('continuous-media-or-layered-subject');
    expect(summary.stateAssetReason).toContain('单张静态图');
  });

  it('keeps an abstract articulated subject on its verified procedural state route', () => {
    const contract = createV2CreativeContract(
      '为一枚抽象机械罗盘设计网页。滚动时外环、翼片、核心与骨架逐层展开并完成校准，不要真实产品冒充。'
    );

    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      changeKind: 'procedural-articulation',
      route: 'procedural-state',
      minimumDistinctStates: 3
    });
  });

  it('blocks a parameter-driven material subject from using one completed-state image', () => {
    const contract = createV2CreativeContract(
      '为社区烘焙学习者设计明亮的发酵观察工作台。调整室温、含水率和发酵时间时，同一只透明发酵罐内的面团体积、气泡密度、表面张力与颜色同步变化，最后保存烘焙计划。'
    );

    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: true,
      changeKind: 'material-transition',
      route: 'continuous-media-or-layered-subject',
      minimumDistinctStates: 3,
      minimumPartGroups: 1,
      failurePolicy: 'block-authoring'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'state-subject', modality: 'image-sequence', required: true, fallback: 'block'
    }));
    expect(contract.technical.stateAssetStrategy.reason).toContain('单张完成态图片');
  });

  it('does not add a spatial environment to an ordinary editorial page without a state transition', () => {
    const contract = createV2CreativeContract(
      '为社区杂志设计明亮的编辑式网页，阅读本月人物故事后订阅下一期。'
    );

    expect(contract.technical.stateAssetStrategy.required).toBe(false);
    expect(contract.assets.find((asset) => asset.id === 'spatial-environment')).toBeUndefined();
  });
});
