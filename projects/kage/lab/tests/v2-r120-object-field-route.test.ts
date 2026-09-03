import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContract } from '../src/v2/direct-creative-protocol.ts';
import { selectStateAssetStrategy } from '../src/v2/state-asset-strategy.ts';

const r120Brief = [
  '为希望探索文化活动、展览和对象系列的访客设计一座明亮、会呼吸的纸蝶日光空间游园。',
  '六只纸蝶在同一空间中形成不同深度与队形，使用主题专属 3D 纸蝶和 Three.js。',
  '指针或触摸改变队形与局部反光；点击、键盘或触摸选择对象。',
  '每只纸蝶的颜色、纸材和巡游故事只在选择后于对象附近展开，未选择时保持场景主导。',
  '最终行动为“选择一只加入巡游”。',
  '页面不是工作台、卡片目录或长滚动文章；不要持久侧栏、滑杆或指标簇。'
].join('');

describe('V2 R120 content-adaptive object-field route', () => {
  it('compiles the exact intent into one playful spatial stage with contextual pointer controls', () => {
    const contract = createV2CreativeContract(r120Brief);
    const run = createDirectCreativeRunFromContract(contract);

    expect(contract.experience).toMatchObject({
      pattern: 'spatial-exploration',
      structure: { mode: 'single-scene', segmentPolicy: 'content-derived' }
    });
    expect(contract.experience.beats.map((beat) => beat.id)).toEqual([
      'object-field-opening',
      'object-field-exploration',
      'object-field-selection',
      'object-field-action'
    ]);
    expect(contract.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'playful-exploration',
      controlVisibility: 'contextual',
      interactionStyle: 'pointer',
      strength: 'advisory'
    });
    expect(contract.direction.interaction).toMatchObject({
      primaryInput: 'pointer',
      pointerRole: 'primary'
    });
    expect(contract.direction.interaction.semanticAction).toMatch(/对象场.*队形.*就近信息/);
    expect(contract.direction.renderer).toMatchObject({
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl'
    });
    expect(contract.technical.presentationStrategy).toBe('procedural-field');
    expect(contract.technical.stateAssetStrategy).toMatchObject({
      required: false,
      changeKind: 'none',
      route: 'static-sufficient'
    });
    expect(contract.assets).toContainEqual(expect.objectContaining({
      id: 'object-field-subjects',
      role: 'subject',
      modality: 'procedural',
      required: true
    }));
    expect(run.interactionRationale).toMatchObject({
      mode: 'direct',
      audioApplicable: false
    });
  });

  it('does not mistake contextual information opening near an object for physical assembly', () => {
    const strategy = selectStateAssetStrategy({
      brief: '选择每件展品后，材料与故事只在对象附近展开；指针移动只改变焦点与队形。',
      articulatedSubjectSelected: false
    });

    expect(strategy).toMatchObject({
      required: false,
      changeKind: 'none',
      route: 'static-sufficient',
      failurePolicy: 'continue'
    });
  });

  it('routes a cultural multi-object exploration without making object-field a global style rule', () => {
    const objectField = createV2CreativeContract(
      '为社区文化节设计日光展览网页，六件纸艺装置留在同一空间，访客用指针探索并选择一件加入巡游。'
    );
    const causalWorkbench = createV2CreativeContract(
      '为陶艺学习者设计釉色实验网页，调整配方与温度时同步改变器物表面和结果，最后保存方案。'
    );

    expect(objectField.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden'
    });
    expect(causalWorkbench.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed'
    });
  });
});
