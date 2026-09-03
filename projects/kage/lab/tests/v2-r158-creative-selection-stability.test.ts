import { describe, expect, it } from 'vitest';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';

const cases = [
  {
    id: 'editorial',
    brief: '为一间社区印刷所设计年度作品网页，用大胆编辑排版展示海报、工艺与开放日，最后预约参观。',
    medium: 'code-native',
    source: null
  },
  {
    id: 'grounded-map',
    brief: '为杭州夜间急救站设计真实地图网页，必须使用可追溯地理坐标、开放时间和步行路线，最后找到最近站点。',
    medium: 'grounded-real-media',
    source: 'real-media'
  },
  {
    id: 'inspectable-model',
    brief: '为一台机械天文钟设计可检查网页，必须使用真实 GLB 拆解齿轮、擒纵器与表盘，允许旋转缩放，最后预约看样。',
    medium: 'threejs-spatial',
    source: 'model-3d'
  },
  {
    id: 'audio-material',
    brief: '为一间声纹压片室设计沉浸网页。播放时低频、中频和高频分别改变沟槽深度、表面折光与边缘振动，滚动让声音逐渐压进材质，最后保存声纹。',
    medium: 'webgl-procedural',
    source: 'programmatic'
  },
  {
    id: 'fictional-atmosphere',
    brief: '为虚构盐湖上的日蚀邮局设计沉浸网页，开场是一片真实摄影感的宽幅盐湖与黑日，滚动时信件路径逐渐显现，最后寄出日蚀明信片。',
    medium: 'generated-image',
    source: 'generated-image'
  }
] as const;

describe('V2 R158 responsibility-led creative selection stability', () => {
  it.each(cases)('routes $id by visible responsibility rather than style rotation', ({ brief, medium, source }) => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(brief));
    expect(execution.mediumDecision.preferred).toBe(medium);
    if (source) {
      expect(execution.mediumDecision.assetResponsibilities).toContainEqual(expect.objectContaining({
        source,
        required: true
      }));
    } else {
      expect(execution.mediumDecision.assetResponsibilities).toEqual([]);
    }
  });

  it('keeps reference relevance positive and bounded', () => {
    const editorial = createCodexExecutionBrief(createV2CreativeContract(cases[0].brief));
    const map = createCodexExecutionBrief(createV2CreativeContract(cases[1].brief));
    const audio = createCodexExecutionBrief(createV2CreativeContract(cases[3].brief));

    expect(editorial.references).toEqual([]);
    expect(map.references).toEqual([]);
    expect(audio.references.map((reference) => reference.id)).toContain('positive-audio-signal-continuity');
    expect(audio.references).toHaveLength(1);
    expect(audio.references[0].borrow.length).toBeGreaterThan(0);
  });

  it('does not invent global style bans for unconstrained ideas', () => {
    for (const scenario of cases) {
      const execution = createCodexExecutionBrief(createV2CreativeContract(scenario.brief));
      expect(execution.instructions.hard.every((instruction) => (
        instruction.source === 'user' || instruction.source === 'quality'
      ))).toBe(true);
      const hard = JSON.stringify(execution.instructions.hard);
      expect(hard).not.toMatch(/必须与历史案例|至少两个风格轴|自动旋转风格|全局暗色|固定三屏/);
    }
  });

  it('recognizes natural frequency language as a real audio duty without implementation jargon', () => {
    const execution = createCodexExecutionBrief(createV2CreativeContract(cases[3].brief));
    expect(execution.technical.selectedCapabilities).toContain('product-semantic-audio-feedback');
    expect(execution.mediumDecision).toMatchObject({ preferred: 'webgl-procedural' });
    expect(execution.mediumDecision.rationale).toMatch(/可听信号|真实音频分析/);
  });
});
