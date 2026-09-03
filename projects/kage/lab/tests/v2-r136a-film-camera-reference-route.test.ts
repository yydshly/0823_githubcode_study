import { describe, expect, it } from 'vitest';
import { createDirectCreativeAuthorPackage } from '../src/v2/direct-creative-author-package.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { selectPositiveReferenceEvidence } from '../src/v2/reference-intelligence.ts';

export const filmCameraRepairBrief = '为第一次参加社区旧物修理日的人设计一个维修判断网页。开场是一台刚从储物间取出的旧胶片相机。访客先选择快门还能动作或已经卡住，进入不同路径：一条检查过片拨杆和测光窗，另一条检查电池仓和快门钮；两条路径都保留刚才的判断，最终汇入同一张维修判断卡，给出清洁、送修或妥善保存的初步建议。访客从对相机状态毫无头绪，走到看懂下一步该做什么，最终行动是保存今天的维修判断卡。画面像一本亲切的印刷故障手册与手绘机构图，让人清楚看见每个判断为什么导向下一步，也愿意真的把旧物修好。';

describe('R136A film camera repair positive reference route', () => {
  it('selects the repair diagnostic and generic branching proofs from the exact brief', () => {
    const selected = selectPositiveReferenceEvidence(filmCameraRepairBrief, 'editorial-field');

    expect(selected.map((pack) => pack.id)).toEqual([
      'positive-community-repair-diagnostic',
      'positive-color-relay-branching'
    ]);
    expect(selected.map((pack) => pack.macroStructureCategory)).toEqual([
      'editorial-flow',
      'branching-confluence'
    ]);
    expect(selected.every((pack) => pack.relevanceReason.includes('命中'))).toBe(true);
  });

  it('passes both reusable principles into the V3 author package as advisory evidence', () => {
    const authorPackage = createDirectCreativeAuthorPackage(
      createV2CreativeContract(filmCameraRepairBrief)
    );
    const references = authorPackage.authoringInput.references;
    const serialized = JSON.stringify(references);

    expect(references.map((reference) => reference.id)).toEqual([
      'positive-community-repair-diagnostic',
      'positive-color-relay-branching'
    ]);
    expect(serialized).toContain('具体部件');
    expect(serialized).toContain('安全说明');
    expect(serialized).toContain('结构后果');
    expect(serialized).toContain('共同汇合');
    expect(references.every((reference) => reference.relevanceReason.includes('命中'))).toBe(true);
  });

  it('does not infer either proof from a generic community event page', () => {
    expect(selectPositiveReferenceEvidence(
      '为社区旧物交换日设计报名页，展示日期、地点和报名入口。',
      'editorial-field'
    )).toEqual([]);
  });
});
