import { describe, expect, it } from 'vitest';
import { classifyInteractionTaskShape } from '../src/v2/interaction-task-shape.ts';

describe('V2 interaction task shape', () => {
  it('recognizes a physical manipulation task without depending on its theme name', () => {
    const shape = classifyInteractionTaskShape(
      '在自然光照亮的真实仓储工作区中，同一货架和多个包裹持续存在。拖动包裹改变位置时，货架载荷、遮挡和通道占用同步更新，最后生成摆放方案。'
    );

    expect(shape).toMatchObject({
      kind: 'grounded-physical-manipulation',
      directManipulation: true,
      persistentPhysicalScene: true,
      movablePhysicalSubjects: true,
      spatialCausality: true,
      requiresForeground: true,
      stateLayer: 'state-mask'
    });
  });

  it('distinguishes abstract collection reordering from a physical workspace', () => {
    const shape = classifyInteractionTaskShape(
      '在选书工作台拖动书卡、引文卡和标签进行排序，推荐清单同步更新，最后保存阅读清单。'
    );

    expect(shape).toMatchObject({
      kind: 'abstract-direct-manipulation',
      directManipulation: true,
      persistentPhysicalScene: false,
      movablePhysicalSubjects: false,
      spatialCausality: false,
      requiresForeground: false,
      stateLayer: 'none'
    });
  });

  it('does not infer a physical route from words inside negative constraints', () => {
    const shape = classifyInteractionTaskShape(
      '为阅读清单设计编辑页，拖动书卡后更新排序。不要真实房间、自然光桌面、物件遮挡或三维场景。'
    );

    expect(shape.kind).not.toBe('grounded-physical-manipulation');
  });
});
