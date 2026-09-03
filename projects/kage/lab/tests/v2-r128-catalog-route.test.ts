import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

describe('R128 catalog structure routing', () => {
  it('routes the night reflective material library as a catalog before material and object-field fallbacks', () => {
    const contract = createV2CreativeContract(
      '为夜间骑行装备、舞台服装与公共安全视觉的学习者设计夜行反光材料样本馆。八件纤维与反光材料样本同时出现；按用途筛选后，移动光束检查每件表面，选择两件并排比较，最后行动为“收藏这组夜行材料”。不要中央产品、长滚动空间旅程或持久参数面板。'
    );

    expect(contract.experience).toMatchObject({
      pattern: 'editorial-field',
      structure: {
        mode: 'catalog',
        segmentPolicy: 'content-derived'
      }
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'catalog-overview',
      'catalog-filter',
      'catalog-inspect',
      'catalog-compare',
      'catalog-saved'
    ]);
    expect(contract.experience.structure.layoutRule).toMatch(/比较层按需出现.*不生成.*持久参数工作台/);
    expect(contract.experience.beats.some((beat) => beat.id.includes('workbench'))).toBe(false);
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden',
      controlVisibility: 'contextual',
      interactionStyle: 'pointer'
    });
    expect(summarizeV2CreativeContract(contract).structureMode).toBe('catalog');
  });

  it.each([
    '为材料设计一个产品目录，让访客浏览不同样品并收藏当前选择。',
    '为面料设计一座触感样本馆，逐件检查纹理后保存喜欢的组合。',
    '同时展示八件反光表面，按用途筛选，选择两件并排比较后收藏组合。'
  ])('recognizes explicit catalog evidence without requiring one fixed phrase: %s', (brief) => {
    expect(createV2CreativeContract(brief).experience.structure.mode).toBe('catalog');
  });

  it.each([
    '为青年雕塑家的新作品系列设计网页，让访客理解创作主题并预约参观。',
    '为社区年度艺术展览设计明亮网页，介绍策展主题、开放时间并完成预约。'
  ])('does not turn an ordinary series or exhibition into a catalog: %s', (brief) => {
    expect(createV2CreativeContract(brief).experience.structure.mode).not.toBe('catalog');
  });
});
