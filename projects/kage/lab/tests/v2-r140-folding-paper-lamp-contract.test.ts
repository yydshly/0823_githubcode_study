import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

export const foldingPaperLampBrief = '为一家使用再生纸纤维制作折叠灯具的工作室设计发布网页。开场是一盏完全折叠的纸灯；访客滚动、拖动或用方向键时，同一盏灯依次展开，纸纤维开始透光，桌面光影随结构变化。完全展开后显示结构与材料说明，最终行动是“预约看样”。画面像工业设计杂志与灯光舞台结合，明亮、安静、有视觉冲击力，不做参数工作台。所有结构与发光变化均为概念演示。';

describe('R140 folding paper lamp current-run constraints', () => {
  it('records the explicit no-workbench clause as a local hard user constraint', () => {
    const contract = createV2CreativeContract(foldingPaperLampBrief);

    expect(contract.intent.negativeConstraints).toContainEqual(
      expect.stringContaining('不做参数工作台'),
    );
    expect(contract.instructions).toContainEqual(expect.objectContaining({
      content: expect.stringContaining('不做参数工作台'),
      source: 'user',
      scope: 'current-run',
      strength: 'hard',
    }));
  });

  it('keeps the paper-lamp interaction while removing the rejected workbench shell', () => {
    const contract = createV2CreativeContract(foldingPaperLampBrief);
    const paperReference = contract.referenceEvidence.find(
      (reference) => reference.referenceId === 'positive-paper-restoration-evidence',
    );
    const referenceInstructions = contract.instructions.filter(
      (instruction) => instruction.source === 'reference',
    );

    expect(contract.experience.structure.mode).toBe('interactive-field');
    expect(contract.experience.beats.map((beat) => beat.id)).not.toContain('workbench-baseline');
    expect(contract.technical.styleDiversity.structureDirection.workbenchPolicy).toBe('forbidden');
    expect(paperReference).toBeDefined();
    expect(paperReference?.borrow.join('')).not.toContain('工作台');
    expect(referenceInstructions.map((instruction) => instruction.content).join('')).not.toContain('工作台');
  });

  it('does not turn the current-run clause into a global workbench ban', () => {
    const explicitWorkbench = createV2CreativeContract(
      '为投影安装设计校准工作台，同时调整距离、安装高度和偏角；画面尺寸、梯形与亮度实时同步更新，最后保存当前摆放方案。',
    );

    expect(explicitWorkbench.technical.styleDiversity.structureDirection).toMatchObject({
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      controlVisibility: 'persistent',
    });
    expect(explicitWorkbench.intent.negativeConstraints.join('')).not.toContain('参数工作台');
  });
});
