import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const exactBrief = '为对纺织工艺好奇的年轻访客设计一座明亮的「经纬光场」空间提花织机网页。开场让这台旗舰 Three.js 纤维构造装置从空纱架逐层展开经纱、综丝、梭子和卷布轴；点击、触摸、键盘或拉动梭子，每推进一梭，三组部件错峰升降，彩色纬纱累计织成可辨认的晨鸟纹样，织造行数、纹样说明与前后对比同步变化。最终行动为“保存我的织纹”。使用暖白日光、朱砂、靛蓝、姜黄与真实纤维质感；保持一个持续空间舞台，不使用滑杆工作台、固定三屏、暗色科技、随机粒子或只改文字不改织物。明确这是空间织造教学演示，不代表真实织机参数。';

describe('V2 R123 经纬光场 contract', () => {
  it('compiles the frozen brief into the articulated interactive Three.js route', () => {
    const contract = createV2CreativeContract(exactBrief);

    expect(contract.experience).toMatchObject({
      pattern: 'material-transformation',
      structure: { mode: 'interactive-field' }
    });
    expect(contract.technical.presentationStrategy).toBe('procedural-articulated');
    expect(contract.direction.renderer.route).toBe('dom-three-hybrid');
    expect(contract.technical.articulatedSubject.selected).toBe(true);
    expect(contract.technical.stateAssetStrategy.route).toBe('procedural-state');

    expect(contract.assets
      .filter((asset) => asset.required)
      .map((asset) => ({ id: asset.id, modality: asset.modality })))
      .toEqual([{ id: 'articulated-subject', modality: 'procedural' }]);

    expect(contract.referenceEvidence.map((reference) => reference.referenceId)).toEqual([
      'positive-night-greenhouse-continuity',
      'positive-semantic-direct-interaction',
      'positive-iris-articulated-reveal'
    ]);
  });

  it('keeps the frozen negative constraints local to this run instead of creating project style bans', () => {
    const contract = createV2CreativeContract(exactBrief);
    const requestedStyleConstraints = /滑杆工作台|固定三屏|暗色科技|随机粒子|只改文字不改织物/;
    const projectHardInstructions = contract.instructions.filter((instruction) => (
      instruction.scope === 'project-quality' && instruction.strength === 'hard'
    ));

    expect(contract.brief).toBe(exactBrief);
    expect(projectHardInstructions.map((instruction) => instruction.content).join(' '))
      .not.toMatch(requestedStyleConstraints);
  });
});
