import { describe, expect, it } from 'vitest';
import { selectProductSemanticFeedback } from '../src/v2/product-semantic-feedback.ts';

describe('product semantic feedback capability', () => {
  it('requires audible causal feedback for a soundboard tuning task', () => {
    const decision = selectProductSemanticFeedback(
      '为制琴师设计音板调音台，调整厚度时同步更新频率、共振与敲击听感，并提供 A/B 声音对比。'
    );

    expect(decision).toMatchObject({
      selected: true,
      capabilityId: 'product-semantic-audio-feedback',
      authoringContract: {
        route: 'synthesized-web-audio',
        comparison: 'a-b-or-before-after',
        activation: 'explicit-user-gesture'
      }
    });
  });

  it('does not add audio to an unrelated product or against an explicit constraint', () => {
    expect(selectProductSemanticFeedback(
      '为社区花园开放日设计明亮网页，查看活动并完成报名。'
    ).selected).toBe(false);
    expect(selectProductSemanticFeedback(
      '为声学展览设计静态档案页，不需要声音，只展示历史文献。'
    )).toMatchObject({
      selected: false,
      blockers: [expect.stringContaining('不需要声音')]
    });
  });

  it('routes a recording experience to audio asset playback with an honest boundary', () => {
    const decision = selectProductSemanticFeedback(
      '为口述历史录音产品设计网页，让访客播放采访录音并查看对应档案。'
    );

    expect(decision.authoringContract).toMatchObject({
      route: 'audio-asset-playback',
      comparison: 'single-state-preview'
    });
    expect(decision.authoringContract?.honesty).toContain('音频来源');
  });

  it('recognizes natural spectrum language without requiring the user to say audio or Web Audio', () => {
    const result = selectProductSemanticFeedback(
      '播放时低频、中频和高频分别改变透明唱片的沟槽、折光与边缘振动，最后保存这一段声纹。'
    );

    expect(result).toMatchObject({
      selected: true,
      capabilityId: 'product-semantic-audio-feedback',
      authoringContract: {
        route: 'synthesized-web-audio',
        stateBinding: 'same-causal-state-as-visual-result'
      }
    });
    expect(result.matchedSignals).toEqual(expect.arrayContaining(['声纹', '播放', '低频', '中频', '高频']));
  });
});
