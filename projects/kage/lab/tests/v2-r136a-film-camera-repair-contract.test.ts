import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { selectCreativeMediumDecision } from '../src/v2/creative-medium-decision.ts';
import { deriveVisualAmbitionContract } from '../src/v2/visual-ambition-planner.ts';

export const filmCameraRepairBrief = '为第一次参加社区旧物修理日的人设计一个维修判断网页。开场是一台刚从储物间取出的旧胶片相机。访客先选择快门还能动作或已经卡住，进入不同路径：一条检查过片拨杆和测光窗，另一条检查电池仓和快门钮；两条路径都保留刚才的判断，最终汇入同一张维修判断卡，给出清洁、送修或妥善保存的初步建议。访客从对相机状态毫无头绪，走到看懂下一步该做什么，最终行动是保存今天的维修判断卡。画面像一本亲切的印刷故障手册与手绘机构图，让人清楚看见每个判断为什么导向下一步，也愿意真的把旧物修好。';

describe('R136A ordinary repair brief selects a code-native branching diagram', () => {
  it('lets the complete branch graph outrank the broad repair task route', () => {
    const contract = createV2CreativeContract(filmCameraRepairBrief);
    const medium = selectCreativeMediumDecision(contract);
    const ambition = deriveVisualAmbitionContract(contract, medium);

    expect(contract.experience.structure.mode).toBe('branching-confluence');
    expect(contract.technical.styleDiversity.structureDirection.experienceForm)
      .toBe('branching-confluence');
    expect(medium).toMatchObject({
      preferred: 'code-native',
      assetResponsibilities: []
    });
    expect(ambition.rendering).toMatchObject({
      primary: 'svg',
      supporting: ['dom-css']
    });
  });

  it('carries the SVG branching decision into the bounded V3 author package', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(filmCameraRepairBrief)
    );

    expect(authorPackage.authoringInput).toMatchObject({
      story: { structure: { mode: 'branching-confluence' } },
      mediumDecision: { preferred: 'code-native' },
      visualAmbition: { rendering: { primary: 'svg' } }
    });
    expect(authorPackage.runSeed).toMatchObject({
      creativeProtocolVersion: 3,
      assetStrategy: 'none',
      verdict: 'pending'
    });
  });

  it('keeps a repair brief without a shared branch graph on the diagnostic task flow', () => {
    const contract = createV2CreativeContract(
      '为社区旧物修理日设计维修判断网页。按顺序检查旧胶片相机的快门和过片拨杆，最后保存初步维修建议。'
    );

    expect(contract.experience.structure.mode).toBe('task-flow');
  });
});
