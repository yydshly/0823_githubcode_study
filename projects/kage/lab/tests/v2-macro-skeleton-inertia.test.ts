import { describe, expect, it } from 'vitest';
import {
  diagnoseMacroSkeletonInertia,
  reviewMacroStructureContentFit,
  type MacroSkeleton
} from '../src/v2/macro-skeleton-inertia.ts';

const instrument = (runId: string): MacroSkeleton => ({
  runId,
  layout: 'single-stage',
  persistentControlPanel: true,
  visibleParameterControls: true,
  realtimeMetricCluster: true,
  primaryAction: 'save-configuration'
});

describe('V2 macro-skeleton inertia diagnostics', () => {
  it('flags a fourth repeated workbench shell without turning the finding into a style ban', () => {
    const diagnostic = diagnoseMacroSkeletonInertia({
      candidate: instrument('direct-current'),
      recent: [instrument('direct-r115'), instrument('direct-r116'), instrument('direct-r118')]
    });

    expect(diagnostic).toMatchObject({
      mode: 'advisory-only',
      detected: true,
      mustChange: false,
      matchedRunIds: ['direct-r115', 'direct-r116', 'direct-r118']
    });
    expect(diagnostic.repeatedAxes).toContain('persistentControlPanel');
    expect(diagnostic.recommendation).toContain('不得为了差异而强制轮换');
  });

  it('does not flag a content-fit editorial flow as the same workbench shell', () => {
    const diagnostic = diagnoseMacroSkeletonInertia({
      candidate: {
        runId: 'direct-editorial',
        layout: 'editorial-flow',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'enter-experience'
      },
      recent: [instrument('direct-r115'), instrument('direct-r116'), instrument('direct-r118')]
    });

    expect(diagnostic.detected).toBe(false);
    expect(diagnostic.mustChange).toBe(false);
    expect(diagnostic.matchedRunIds).toEqual([]);
  });

  it('passes a non-workbench horizontal panorama when the structure fits the content', () => {
    const review = reviewMacroStructureContentFit({
      candidate: {
        runId: 'direct-horizontal-panorama',
        layout: 'horizontal-panorama',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'enter-experience'
      },
      recent: [instrument('direct-r115'), instrument('direct-r116'), instrument('direct-r118')],
      contentEvidence: {
        concurrentParameterCount: 0,
        realtimeFeedbackRequired: false,
        primaryActionDependsOnCurrentState: false,
        persistentControlsExplicitlyRequested: false,
        rationale: '连续全景由横向巡游和语义热点组织，不需要持久参数工作台。'
      }
    });

    expect(review).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      findingCode: null
    });
  });

  it('requires revision when a persistent workbench has no current content justification', () => {
    const review = reviewMacroStructureContentFit({
      candidate: instrument('direct-current'),
      recent: [instrument('direct-r115'), instrument('direct-r116'), instrument('direct-r118')],
      contentEvidence: {
        concurrentParameterCount: 1,
        realtimeFeedbackRequired: false,
        primaryActionDependsOnCurrentState: false,
        persistentControlsExplicitlyRequested: false,
        rationale: '当前只是浏览一个主题对象并进入详情，没有并发调节任务。'
      }
    });

    expect(review).toMatchObject({
      verdict: 'revise',
      contentJustified: false,
      findingCode: 'unjustified-persistent-workbench'
    });
    expect(review.inertia.detected).toBe(true);
  });

  it('allows the same shell when a real concurrent instrument requires persistent controls', () => {
    const review = reviewMacroStructureContentFit({
      candidate: instrument('direct-current'),
      recent: [instrument('direct-r115'), instrument('direct-r116'), instrument('direct-r118')],
      contentEvidence: {
        concurrentParameterCount: 3,
        realtimeFeedbackRequired: true,
        primaryActionDependsOnCurrentState: true,
        persistentControlsExplicitlyRequested: false,
        rationale: '三个配方参数必须同时可见，结果实时变化，保存行动依赖当前组合。'
      }
    });

    expect(review).toMatchObject({
      verdict: 'pass',
      contentJustified: true,
      findingCode: null
    });
    expect(review.inertia.detected).toBe(true);
    expect(review.summary).toContain('不为差异而强制改形');
  });
});
