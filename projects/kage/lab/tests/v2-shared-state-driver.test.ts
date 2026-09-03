import { describe, expect, it } from 'vitest';
import { selectSharedStateDriverCapability } from '../src/v2/shared-state-driver-capability.ts';

describe('V2 shared-state interaction driver', () => {
  it('selects one canonical state when demo, wheel and manual controls are explicitly requested', () => {
    const decision = selectSharedStateDriverCapability({
      brief: '为候鸟风洞设计教学模拟网页，提供播放演示，鼠标滚轮与三个参数滑块驱动同一飞行状态，手动操作停止演示。',
      primaryInput: 'direct-navigation',
      semanticInteractionSelected: true
    });

    expect(decision).toMatchObject({
      selected: true,
      capabilityId: 'shared-state-interaction-driver',
      requestedModes: ['manual', 'scroll', 'demo'],
      authoringContract: {
        stateModel: 'single-canonical-state',
        demoControl: 'bounded-play-pause-reset',
        scrollMapping: 'real-scroll-range-to-shared-state',
        manualOverride: 'first-user-input-stops-demo',
        visualMapping: 'subject-scene-and-semantic-results'
      }
    });
  });

  it('does not inject auto-demo into an ordinary scroll story', () => {
    const decision = selectSharedStateDriverCapability({
      brief: '滚动时房间逐渐清晰，最后记录今晚的梦。',
      primaryInput: 'scroll',
      semanticInteractionSelected: false
    });

    expect(decision.selected).toBe(false);
    expect(decision.requestedModes).toEqual(['scroll']);
    expect(decision.authoringContract).toBeNull();
  });

  it('treats an explicitly handed-off control as a manual driver', () => {
    const decision = selectSharedStateDriverCapability({
      brief: '自动演示清晨到正午，鼠标滚轮驱动同一时间线，树冠密度和浇水量控件可随时接管并停止演示。',
      primaryInput: 'direct-navigation',
      semanticInteractionSelected: false
    });

    expect(decision.selected).toBe(true);
    expect(decision.requestedModes).toEqual(['manual', 'scroll', 'demo']);
  });

  it('does not inject scroll or demo into a direct parameter workspace', () => {
    const decision = selectSharedStateDriverCapability({
      brief: '用三个参数滑块调整釉色配方并保存结果。',
      primaryInput: 'direct-navigation',
      semanticInteractionSelected: true
    });

    expect(decision.selected).toBe(false);
    expect(decision.requestedModes).toEqual(['manual']);
    expect(decision.authoringContract).toBeNull();
  });
});
