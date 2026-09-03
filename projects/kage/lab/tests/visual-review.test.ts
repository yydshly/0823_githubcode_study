import { describe, expect, it } from 'vitest';
import { SEMANTIC_FEEDBACK_SELECTOR } from '../server/dedicated-visual-review.ts';
import { assessVisualEvidence, assessVisualQualityPreflight, type VisualReviewEvidence } from '../src/generation/visual-review';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';

it('observes the primary result marker required by generated interaction contracts', () => {
  expect(SEMANTIC_FEEDBACK_SELECTOR).toContain('[data-signal-primary-result]');
});

function evidence(overrides: Partial<VisualReviewEvidence> = {}): VisualReviewEvidence {
  const frame = (
    id: VisualReviewEvidence['frames'][number]['id'],
    progress: number,
    scrollY: number,
    width = 1440,
    height = 900
  ): VisualReviewEvidence['frames'][number] => ({
    id,
    viewport: { width, height },
    quality: id === 'mobile' ? 'low' : 'high',
    reducedMotion: id === 'mobile',
    ready: true,
    canvasCount: 1,
    progress,
    scrollY,
    scrollHeight: 4800,
    overflow: 0,
    heading: 'A distinct product story',
    headingVisible: true,
    headingFontSizePx: 48,
    headingViewportHeightRatio: .16,
    headingViewportAreaRatio: .12,
    visibleTextCount: 8,
    collisionCount: 0,
    maxOverlapRatio: 0,
    blockingCollisionCount: 0,
    editorialOverlapCount: 0,
    maxBlockingOverlapRatio: 0,
    canvasOcclusionRisk: false,
    canvasOcclusionRatio: 0,
    canvasOccludingLayer: ''
  });
  return {
    schemaVersion: 1,
    runId: 'dedicated-review-fixture',
    capturedAt: '2026-08-26T00:00:00.000Z',
    frames: [
      frame('opening', 0, 0),
      frame('middle', 0.44, 1700),
      frame('final', 1, 3900),
      frame('mobile', 0, 0, 390, 844)
    ],
    browserErrors: [],
    ...overrides
  };
}

function causalPlan() {
  return createVisualReviewPlan({
    experience: { beats: [
      { id: 'start', position: 0 },
      { id: 'middle', position: .5 },
      { id: 'end', position: 1 }
    ] },
    direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
    acceptance: [{ id: 'process-causal', priority: 'blocker' }]
  });
}

function causalState(overrides: Partial<NonNullable<VisualReviewEvidence['frames'][number]['causalState']>> = {}) {
  return {
    input: 'control' as const,
    markers: { anchorCount: 1, controlCount: 1, resultCount: 1, actionCount: 1 },
    inputObserved: true,
    anchorIdentityStable: true,
    anchorChanged: true,
    anchorDelta: .12,
    resultChanged: true,
    actionAvailable: true,
    substitute: 'none' as const,
    initialProgress: .5,
    finalProgress: .5,
    ...overrides
  };
}

describe('visual review gate', () => {
  it('passes a runnable, responsive and changing timeline', () => {
    const result = assessVisualEvidence(evidence());
    expect(result.verdict).toBe('pass');
    expect(result.score).toBe(100);
    expect(assessVisualQualityPreflight(result)).toMatchObject({ decision: 'eligible', score: 100 });
  });

  it('accepts one verified primary input → subject → result → action chain', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-middle',
      causalState: causalState()
    };
    const result = assessVisualEvidence(fixture, causalPlan());

    expect(result.verdict).toBe('pass');
    expect(result.findings).toHaveLength(0);
  });

  it('does not reinterpret a passing causal button journey as a failed numeric semantic probe', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-middle',
      action: 'semantic-probe',
      interactionTargetCount: 1,
      interactionInputObserved: true,
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: false,
      subjectDelta: .001,
      subjectSelector: '[data-signal-visual-anchor]',
      causalState: causalState(),
      semanticState: {
        inputChanged: false,
        outputChanged: false,
        parameterActionObserved: false,
        highLevelActionObserved: false,
        sceneChanged: false,
        highLevelSceneChanged: false,
        sceneDelta: 0,
        highLevelSceneDelta: 0,
        mismatchedValueCount: 0,
        aggregateInvariantValid: null,
        issues: []
      }
    };
    fixture.frames[3] = {
      ...fixture.frames[3],
      interactionTargetCount: 1,
      interactionInputObserved: true,
      mobileTaskPath: {
        controlCount: 1,
        resultCount: 1,
        actionCount: 1,
        reachableControlCount: 1,
        reachableResultCount: 1,
        reachableActionCount: 1
      }
    };

    const result = assessVisualEvidence(fixture, createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'middle', position: .5 },
        { id: 'end', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { semanticInteraction: { selected: true } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    }));
    expect(result.verdict).toBe('pass');
    expect(result.findings.map((item) => item.code)).not.toContain('semantic-interaction-unverified');
    expect(result.findings.map((item) => item.code)).not.toContain('semantic-state-inconsistent');
    expect(result.findings.map((item) => item.code)).not.toContain('subject-state-static');
  });

  it('stops before model review when an explicitly forbidden giant heading dominates the viewport', () => {
    const fixture = evidence();
    fixture.frames[0] = {
      ...fixture.frames[0],
      headingFontSizePx: 76,
      headingViewportHeightRatio: .3424,
      headingViewportAreaRatio: .0683,
    };
    const plan = createVisualReviewPlan({
      intent: { negativeConstraints: ['不要巨大标题。'] },
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'middle', position: .44 },
        { id: 'end', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } }
    });
    const result = assessVisualEvidence(fixture, plan);

    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'heading-dominance-forbidden', frameId: 'opening' }));
    expect(assessVisualQualityPreflight(result).decision).toBe('stop');
  });

  it('keeps heading dominance thresholds opt-in and boundary values inclusive', () => {
    const fixture = evidence();
    fixture.frames[0] = {
      ...fixture.frames[0],
      headingFontSizePx: 96,
      headingViewportHeightRatio: .32,
      headingViewportAreaRatio: .20,
    };
    const unconstrained = assessVisualEvidence(fixture);
    const constrainedPlan = createVisualReviewPlan({
      intent: { negativeConstraints: ['Avoid oversized headline.'] },
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'middle', position: .44 },
        { id: 'end', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } }
    });
    const constrained = assessVisualEvidence(fixture, constrainedPlan);

    expect(unconstrained.findings.map((finding) => finding.code)).not.toContain('heading-dominance-forbidden');
    expect(constrained.findings.map((finding) => finding.code)).not.toContain('heading-dominance-forbidden');
  });

  it('enforces stronger subject and causal deltas for structural deformation', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-middle',
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .0338,
      subjectSelector: '[data-signal-visual-anchor]',
      causalState: causalState({ anchorDelta: .0573 })
    };
    fixture.frames[2] = {
      ...fixture.frames[2],
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .0566,
      subjectSelector: '[data-signal-visual-anchor]'
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'middle', position: .44 },
        { id: 'end', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { stateAssetStrategy: { required: true, changeKind: 'structural-deformation' } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    });
    const result = assessVisualEvidence(fixture, plan);

    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'primary-journey-unverified', frameId: 'beat-middle' }));
    expect(result.findings.map((item) => item.code)).not.toContain('subject-state-static');
    expect(assessVisualQualityPreflight(result).decision).toBe('stop');
  });

  it.each([
    ['markers missing', { markers: { anchorCount: 0, controlCount: 1, resultCount: 1, actionCount: 1 } }],
    ['real input unobserved', { inputObserved: false }],
    ['copy only', { anchorChanged: false, anchorDelta: .002, substitute: 'copy-or-highlight-only' as const }],
    ['opacity only', { substitute: 'opacity-or-blur-only' as const }],
    ['result static', { resultChanged: false }],
    ['action unavailable', { actionAvailable: false }]
  ])('stops once when the primary journey is %s', (_label, override) => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-middle',
      causalState: causalState(override)
    };
    const result = assessVisualEvidence(fixture, causalPlan());
    const causalFindings = result.findings.filter((finding) => finding.code === 'primary-journey-unverified');

    expect(result.verdict).toBe('revise');
    expect(causalFindings).toHaveLength(1);
    expect(assessVisualQualityPreflight(result).decision).toBe('stop');
  });

  it('blocks an existing canvas that is hidden behind an opaque full-viewport content layer', () => {
    const fixture = evidence();
    fixture.frames[0] = {
      ...fixture.frames[0],
      canvasOcclusionRisk: true,
      canvasOcclusionRatio: .97,
      canvasOccludingLayer: 'main.repair-page'
    };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('blocked');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'canvas-occluded', frameId: 'opening' }));
  });

  it('does not treat an intentionally hidden SDK canvas as a blocker for a DOM media route', () => {
    const fixture = evidence();
    fixture.frames = fixture.frames.map((frame) => ({
      ...frame,
      canvasOcclusionRisk: true,
      canvasOcclusionRatio: 1,
      canvasOccludingLayer: 'div.mortise-app',
    }));
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'evidence', position: .68 },
        { id: 'end', position: 1 },
      ] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
    });
    const result = assessVisualEvidence(fixture, plan);

    expect(plan.rendererRoute).toBe('dom-media-hybrid');
    expect(result.findings.map((finding) => finding.code)).not.toContain('canvas-occluded');
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'semantic-state-missing' }));
  });

  it('accepts additional contract-derived narrative checkpoints', () => {
    const fixture = evidence();
    fixture.frames.splice(2, 0, {
      ...fixture.frames[1],
      id: 'beat-evidence-field',
      progress: 0.72,
      scrollY: 2850
    });
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('pass');
    expect(fixture.frames).toHaveLength(5);
  });

  it('rejects partial evidence when a product-derived semantic state is missing', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0, visibleState: 'start' },
        { id: 'material', position: .5, visibleState: 'material change' },
        { id: 'end', position: 1, visibleState: 'end' }
      ] }
    });
    const result = assessVisualEvidence(evidence(), plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'semantic-state-missing' }));
  });

  it('accepts verified semantic input on a contract-selected story beat', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      action: 'semantic-probe',
      interactionTargetCount: 2,
      interactionInputObserved: true,
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        mismatchedValueCount: 0,
        aggregateInvariantValid: true,
        issues: []
      }
    };
    expect(assessVisualEvidence(fixture).verdict).toBe('pass');
  });

  it('accepts a bounded driver probe only when demo, wheel and manual handoff share visible state', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-flight-state',
      action: 'driver-probe',
      driverState: {
        rootFound: true,
        demoControlFound: true,
        progressMarkerFound: true,
        manualControlFound: true,
        demoProgressChanged: true,
        wheelProgressChanged: true,
        manualOverrideObserved: true,
        demoSceneChanged: true,
        wheelSceneChanged: true,
        manualSceneChanged: true,
        demoSceneDelta: .08,
        wheelSceneDelta: .12,
        manualSceneDelta: .19,
        initialProgress: .5,
        afterDemoProgress: .62,
        afterWheelProgress: .9,
        afterManualProgress: 0,
        modes: ['demo', 'scroll', 'manual']
      }
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'flight-state', position: .5 },
        { id: 'saved', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { interactionDriver: { selected: true } }
    });

    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('pass');
    expect(result.findings).toHaveLength(0);
  });

  it('rejects a driver whose manual input does not stop the demo', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-flight-state',
      action: 'driver-probe',
      driverState: {
        rootFound: true,
        demoControlFound: true,
        progressMarkerFound: true,
        manualControlFound: true,
        demoProgressChanged: true,
        wheelProgressChanged: true,
        manualOverrideObserved: false,
        demoSceneChanged: true,
        wheelSceneChanged: true,
        manualSceneChanged: true,
        demoSceneDelta: .08,
        wheelSceneDelta: .12,
        manualSceneDelta: .19,
        initialProgress: .5,
        afterDemoProgress: .62,
        afterWheelProgress: .9,
        afterManualProgress: .91,
        modes: ['demo', 'scroll', 'demo']
      }
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'flight-state', position: .5 },
        { id: 'saved', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { interactionDriver: { selected: true } }
    });

    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'interaction-driver-handoff-failed' }));
  });

  it('accepts a parameter action as direct interaction evidence even when focus has returned to the page', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      action: 'semantic-probe',
      interactionTargetCount: 4,
      interactionInputObserved: false,
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        parameterActionObserved: true,
        highLevelActionObserved: false,
        sceneChanged: false,
        highLevelSceneChanged: false,
        sceneDelta: 0,
        highLevelSceneDelta: 0,
        mismatchedValueCount: 0,
        aggregateInvariantValid: null,
        issues: []
      }
    };
    expect(assessVisualEvidence(fixture).verdict).toBe('pass');
    expect(assessVisualEvidence(fixture).findings.map((item) => item.code)).not.toContain('semantic-interaction-unverified');
  });

  it('rejects a spatial workspace whose controls change text but not the scene', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-mix',
      action: 'semantic-probe',
      interactionTargetCount: 6,
      interactionInputObserved: true,
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        parameterActionObserved: true,
        highLevelActionObserved: true,
        sceneChanged: true,
        highLevelSceneChanged: false,
        sceneDelta: .042,
        highLevelSceneDelta: .001,
        mismatchedValueCount: 0,
        aggregateInvariantValid: null,
        issues: []
      }
    };
    fixture.frames.push({
      ...fixture.frames[3],
      id: 'fallback',
      canvasCount: 0,
      action: 'webgl-fallback',
      webglAvailable: false,
      fallbackActive: true
    });
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'mix', position: .5 },
        { id: 'saved', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-three-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });
    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'semantic-scene-static', frameId: 'beat-mix' }));
  });

  it('accepts a direct-state page only when the subject changes and mobile keeps a complete task path', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-mix',
      action: 'semantic-probe',
      interactionTargetCount: 3,
      interactionInputObserved: true,
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .14,
      subjectSelector: '[data-signal-visual-anchor]',
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        parameterActionObserved: true,
        highLevelActionObserved: false,
        sceneChanged: true,
        highLevelSceneChanged: null,
        sceneDelta: .14,
        highLevelSceneDelta: 0,
        mismatchedValueCount: 0,
        aggregateInvariantValid: true,
        issues: []
      }
    };
    fixture.frames[3] = {
      ...fixture.frames[3],
      action: 'semantic-probe',
      interactionTargetCount: 2,
      interactionInputObserved: true,
      mobileTaskPath: {
        controlCount: 1,
        resultCount: 1,
        actionCount: 1,
        reachableControlCount: 1,
        reachableResultCount: 1,
        reachableActionCount: 1
      },
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        parameterActionObserved: true,
        highLevelActionObserved: false,
        sceneChanged: null,
        highLevelSceneChanged: null,
        sceneDelta: 0,
        highLevelSceneDelta: 0,
        mismatchedValueCount: 0,
        aggregateInvariantValid: true,
        issues: []
      }
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'mix', position: .5 },
        { id: 'saved', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });

    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('pass');
    expect(result.findings).toHaveLength(0);
  });

  it('stops before visual-model review when the mobile task path is absent or horizontally clipped', () => {
    const fixture = evidence();
    const plan = createVisualReviewPlan({
      experience: { beats: [{ id: 'start', position: 0 }, { id: 'saved', position: 1 }] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });
    fixture.frames.splice(1, 0, {
      ...fixture.frames[1],
      id: 'interaction',
      action: 'semantic-probe',
      interactionTargetCount: 2,
      interactionInputObserved: true,
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .12,
      subjectSelector: '[data-signal-visual-anchor]'
    });
    fixture.frames[4] = {
      ...fixture.frames[4],
      action: 'semantic-probe',
      interactionTargetCount: 2,
      interactionInputObserved: true,
      mobileTaskPath: {
        controlCount: 1,
        resultCount: 1,
        actionCount: 1,
        reachableControlCount: 1,
        reachableResultCount: 0,
        reachableActionCount: 1
      }
    };

    const clipped = assessVisualEvidence(fixture, plan);
    expect(clipped.findings).toContainEqual(expect.objectContaining({ code: 'mobile-task-path-incomplete', frameId: 'mobile' }));
    expect(assessVisualQualityPreflight(clipped).decision).toBe('stop');

    delete fixture.frames[4].mobileTaskPath;
    const unmarked = assessVisualEvidence(fixture, plan);
    expect(unmarked.findings).toContainEqual(expect.objectContaining({ code: 'mobile-task-path-unverified', frameId: 'mobile' }));
  });

  it('rejects a direct-state interaction whose displayed percentage total violates its invariant', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      action: 'semantic-probe',
      interactionTargetCount: 3,
      interactionInputObserved: true,
      semanticState: {
        inputChanged: true,
        outputChanged: true,
        mismatchedValueCount: 0,
        aggregateInvariantValid: false,
        issues: ['声明为百分比的合计值是 113%，应保持 100%']
      }
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'start', position: 0 },
        { id: 'mix', position: .5 },
        { id: 'saved', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-three-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });
    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'semantic-state-inconsistent' }));
    expect(result.findings.map((item) => item.code)).not.toContain('scroll-range-missing');
    expect(result.findings.map((item) => item.code)).not.toContain('timeline-static');
  });

  it('requests revision when selected semantic interaction has no usable DOM entry', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      action: 'semantic-probe',
      interactionTargetCount: 0,
      interactionInputObserved: true
    };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('revise');
    expect(result.findings.map((item) => item.code)).toContain('semantic-interaction-unverified');
  });

  it('accepts a readable WebGL-disabled fallback without requiring an enhancement canvas', () => {
    const fixture = evidence();
    fixture.frames.push({
      ...fixture.frames[3],
      id: 'fallback',
      canvasCount: 0,
      action: 'webgl-fallback',
      webglAvailable: false,
      fallbackActive: true,
      visibleTextCount: 5
    });
    expect(assessVisualEvidence(fixture).verdict).toBe('pass');
  });

  it('blocks a fallback screenshot that did not actually disable WebGL', () => {
    const fixture = evidence();
    fixture.frames.push({
      ...fixture.frames[3],
      id: 'fallback',
      action: 'webgl-fallback',
      webglAvailable: true,
      fallbackActive: false
    });
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('blocked');
    expect(result.findings.map((item) => item.code)).toContain('fallback-not-exercised');
  });

  it('requests revision for layout and timeline defects', () => {
    const fixture = evidence();
    fixture.frames[1] = { ...fixture.frames[1], overflow: 26, collisionCount: 2, maxOverlapRatio: 0.34, blockingCollisionCount: 2, maxBlockingOverlapRatio: 0.34 };
    fixture.frames[2] = { ...fixture.frames[2], progress: 0.5, scrollY: 900 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('revise');
    expect(result.findings.map((item) => item.code)).toEqual(expect.arrayContaining(['horizontal-overflow', 'text-collision', 'timeline-static']));
    expect(assessVisualQualityPreflight(result)).toMatchObject({ decision: 'stop' });
  });

  it('rejects a nominal 0-to-1 timeline that is compressed into a few pixels of scroll', () => {
    const fixture = evidence();
    fixture.frames = fixture.frames.map((frame) => frame.id === 'mobile' ? frame : {
      ...frame,
      scrollHeight: 920,
      scrollY: frame.id === 'opening' ? 0 : frame.id === 'middle' ? 9 : 20
    });
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('revise');
    expect(result.findings.map((item) => item.code)).toContain('scroll-range-missing');
    expect(result.findings.map((item) => item.code)).not.toContain('timeline-static');
  });

  it('records editorial headline overlap without mechanically rejecting a creative composition', () => {
    const fixture = evidence();
    fixture.frames[1] = { ...fixture.frames[1], collisionCount: 2, maxOverlapRatio: 1, editorialOverlapCount: 2 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('pass');
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.observations.map((item) => item.code)).toContain('editorial-overlap');
  });

  it('still requests revision when text obstructs an interactive control', () => {
    const fixture = evidence();
    fixture.frames[0] = { ...fixture.frames[0], collisionCount: 1, maxOverlapRatio: 0.42, blockingCollisionCount: 1, maxBlockingOverlapRatio: 0.42 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('revise');
    expect(result.findings.map((item) => item.code)).toContain('text-collision');
  });

  it('rejects a stateful physical journey when the final subject frame stays static', () => {
    const fixture = evidence();
    fixture.frames[1] = {
      ...fixture.frames[1],
      id: 'beat-align',
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .11,
      subjectSelector: '[data-signal-visual-anchor]'
    };
    fixture.frames[2] = {
      ...fixture.frames[2],
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: false,
      subjectDelta: .004,
      subjectSelector: '[data-signal-visual-anchor]'
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'separate', position: 0 },
        { id: 'align', position: .44 },
        { id: 'locked', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { stateAssetStrategy: { required: true, changeKind: 'assembly' } }
    });

    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'subject-state-static', frameId: 'final' }));
  });

  it('does not accept a generic image fallback as physical subject evidence', () => {
    const fixture = evidence();
    fixture.frames[2] = {
      ...fixture.frames[2],
      subjectCaptureAvailable: true,
      subjectChangeExpected: true,
      subjectChanged: true,
      subjectDelta: .24,
      subjectSelector: 'img'
    };
    const plan = createVisualReviewPlan({
      experience: { beats: [
        { id: 'separate', position: 0 },
        { id: 'locked', position: 1 }
      ] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { stateAssetStrategy: { required: true, changeKind: 'assembly' } }
    });

    const result = assessVisualEvidence(fixture, plan);
    expect(result.verdict).toBe('revise');
    expect(result.findings).toContainEqual(expect.objectContaining({ code: 'subject-state-unverified', frameId: 'final' }));
  });

  it('blocks a revision when runtime evidence is invalid', () => {
    const fixture = evidence({ browserErrors: ['pageerror: WebGL context failed'] });
    fixture.frames[0] = { ...fixture.frames[0], ready: false, canvasCount: 0 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('blocked');
    expect(result.findings.filter((item) => item.severity === 'blocking')).toHaveLength(3);
    expect(result.score).toBe(0);
  });
});
