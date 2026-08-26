import { describe, expect, it } from 'vitest';
import { describeOutcomeRoute } from '../src/workbench-outcome-route';

describe('outcome-first workbench route', () => {
  it('states that curated assets skip the fallback generator', () => {
    const view = describeOutcomeRoute({ stage: 'assets', assetRoute: 'catalog', assetCount: 3 });
    expect(view.title).toContain('3 个高质量素材');
    expect(view.title).toContain('跳过 MiniMax');
    expect(view.steps[0]).toMatchObject({ label: '项目优选素材', state: 'active' });
  });

  it('labels MiniMax as a gated backup rather than the main product', () => {
    const view = describeOutcomeRoute({ stage: 'assets', assetRoute: 'generate' });
    expect(view.steps[0].label).toBe('MiniMax 备用素材');
    expect(view.steps[0].detail).toContain('仅在素材收益通过门禁时调用');
  });

  it('keeps every delivery step visible after visual acceptance', () => {
    const view = describeOutcomeRoute({ stage: 'complete', assetRoute: 'catalog', assetCount: 3, model: 'gpt-5.6-sol', score: 91 });
    expect(view.title).toBe('最终最佳网页已交付');
    expect(view.note).toContain('91 分');
    expect(view.steps.every((step) => step.state === 'complete')).toBe(true);
  });

  it('blocks unsupported assets without implying that code generation succeeded', () => {
    const view = describeOutcomeRoute({ stage: 'blocked', assetRoute: 'blocked', message: '缺少真实 GLB。' });
    expect(view.title).toContain('停止伪生成');
    expect(view.steps[0].state).toBe('blocked');
    expect(view.steps[1].state).toBe('waiting');
  });
});
