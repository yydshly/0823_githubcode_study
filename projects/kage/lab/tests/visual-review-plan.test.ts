import { describe, expect, it } from 'vitest';
import { createVisualReviewPlan, visualReviewPlanSchema } from '../src/generation/visual-review-plan';

const beat = (id: string, position: number) => ({
  id,
  position,
  visibleState: `${id} visible state`
});

describe('adaptive visual review plan', () => {
  it('keeps the compatibility fallback for requests without a V2 contract', () => {
    const plan = createVisualReviewPlan();
    expect(plan.source).toBe('compatibility-fallback');
    expect(plan.journeyMode).toBe('scroll-timeline');
    expect(plan.minimumSubjectDelta).toBe(.018);
    expect(plan.minimumCausalAnchorDelta).toBe(.018);
    expect(plan.visualConstraints.forbidGiantHeading).toBe(false);
    expect(plan.checkpoints.map((item) => item.id)).toEqual(['opening', 'beat-middle', 'final', 'mobile']);
  });

  it('loads stored V2 plans created before journey modes were introduced', () => {
    const legacy = visualReviewPlanSchema.parse({
      schemaVersion: 1,
      source: 'compatibility-fallback',
      checkpoints: createVisualReviewPlan().checkpoints
    });
    expect(legacy.journeyMode).toBe('scroll-timeline');
  });

  it('uses every affordable desktop beat and covers the scroll journey across mobile opening, middle and final', () => {
    const plan = createVisualReviewPlan({
      experience: {
        beats: [
          beat('arrival', 0),
          beat('threshold', 0.28),
          beat('evidence', 0.66),
          beat('resolve', 1)
        ]
      },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } }
    });
    expect(plan.source).toBe('creative-contract');
    expect(plan.journeyMode).toBe('scroll-timeline');
    expect(plan.checkpoints).toHaveLength(7);
    expect(plan.checkpoints.map((item) => item.id)).toEqual([
      'opening',
      'beat-threshold',
      'beat-evidence',
      'final',
      'mobile',
      'mobile-middle',
      'mobile-final'
    ]);
    expect(plan.checkpoints.map((item) => item.progress)).toEqual([0, 0.28, 0.66, 1, 0, 0.66, 1]);
    expect(plan.checkpoints.filter((item) => item.surface === 'mobile')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'mobile', reducedMotion: true }),
      expect.objectContaining({ id: 'mobile-middle', reducedMotion: true }),
      expect.objectContaining({ id: 'mobile-final', reducedMotion: true })
    ]));
  });

  it('reuses one representative checkpoint for a blocker-level native-scroll causal probe', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('change', .48), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    });

    expect(plan.checkpoints).toHaveLength(6);
    expect(plan.checkpoints.filter((item) => item.causalProbe)).toEqual([
      expect.objectContaining({ id: 'beat-change', causalProbe: 'wheel', surface: 'desktop' })
    ]);
  });

  it('requires a real marked control for pointer or direct-navigation causal probes', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('compare', .5), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { semanticInteraction: { selected: true } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    });

    expect(plan.checkpoints.find((item) => item.id === 'beat-compare')).toMatchObject({
      action: 'semantic-probe',
      causalProbe: 'control'
    });
  });

  it('does not retroactively add a causal probe to compatibility or pre-R90 contracts', () => {
    const compatibility = createVisualReviewPlan();
    const preR90 = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      acceptance: [{ id: 'process-causal', priority: 'high' }]
    });

    expect(compatibility.checkpoints.every((item) => !item.causalProbe)).toBe(true);
    expect(preR90.checkpoints.every((item) => !item.causalProbe)).toBe(true);
  });

  it('scales from two to six story beats within the bounded browser budget', () => {
    const minimum = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('end', 1)] }
    });
    const maximum = createVisualReviewPlan({
      experience: {
        beats: [
          beat('a', 0),
          beat('b', 0.16),
          beat('c', 0.34),
          beat('d', 0.58),
          beat('e', 0.82),
          beat('f', 1)
        ]
      }
    });
    expect(minimum.checkpoints).toHaveLength(3);
    expect(maximum.checkpoints).toHaveLength(7);
  });

  it('caps a six-beat WebGL scroll contract at eight checkpoints', () => {
    const plan = createVisualReviewPlan({
      experience: {
        beats: [
          beat('a', 0),
          beat('b', 0.16),
          beat('c', 0.34),
          beat('d', 0.58),
          beat('e', 0.82),
          beat('f', 1)
        ]
      },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-three-hybrid' } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    });

    expect(plan.checkpoints).toHaveLength(8);
    expect(plan.checkpoints.filter((item) => item.surface === 'desktop')).toHaveLength(4);
    expect(plan.checkpoints.filter((item) => item.surface === 'mobile').map((item) => item.id)).toEqual([
      'mobile', 'mobile-middle', 'mobile-final'
    ]);
    expect(plan.checkpoints.filter((item) => item.causalProbe)).toHaveLength(1);
    expect(plan.checkpoints.at(-1)?.id).toBe('fallback');
  });

  it('reuses the nearest story beat for semantic interaction evidence', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('compare', .46), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'pointer' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });
    expect(plan.checkpoints).toHaveLength(4);
    expect(plan.checkpoints.find((item) => item.id === 'beat-compare')?.action).toBe('semantic-probe');
    expect(plan.checkpoints.find((item) => item.id === 'beat-compare')?.expectSubjectChange).toBe(true);
    expect(plan.checkpoints.find((item) => item.id === 'mobile')).toMatchObject({
      action: 'semantic-probe',
      expectMobileTaskPath: true
    });
    expect(plan.journeyMode).toBe('direct-state');
    expect(plan.checkpoints.filter((item) => item.surface === 'mobile').map((item) => item.id)).toEqual(['mobile']);
    expect(plan.checkpoints.some((item) => item.id === 'fallback')).toBe(false);
  });

  it('adds one fallback checkpoint only for canvas or Three.js routes', () => {
    const three = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-three-hybrid' } }
    });
    const media = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } }
    });
    expect(three.checkpoints.map((item) => item.id)).toEqual([
      'opening', 'final', 'mobile', 'mobile-middle', 'mobile-final', 'fallback'
    ]);
    expect(three.checkpoints.at(-1)).toMatchObject({ surface: 'fallback', action: 'webgl-fallback' });
    expect(media.checkpoints.map((item) => item.id)).toEqual([
      'opening', 'final', 'mobile', 'mobile-middle', 'mobile-final'
    ]);
  });

  it('adds a bounded interaction checkpoint when the story has no middle beat', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('end', 1)] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-three-hybrid' } },
      technical: { semanticInteraction: { selected: true } }
    });
    expect(plan.checkpoints.map((item) => item.id)).toEqual(['opening', 'interaction', 'final', 'mobile', 'fallback']);
    expect(plan.checkpoints).toHaveLength(5);
  });

  it('reuses one middle checkpoint for the bounded shared-state driver probe', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('start', 0), beat('flight-state', .5), beat('saved', 1)] },
      direction: { interaction: { primaryInput: 'direct-navigation' }, renderer: { route: 'dom-three-hybrid' } },
      technical: {
        semanticInteraction: { selected: true },
        interactionDriver: { selected: true }
      }
    });

    expect(plan.checkpoints.find((item) => item.id === 'beat-flight-state')).toMatchObject({
      action: 'driver-probe',
      expectSceneChange: true
    });
    expect(plan.checkpoints.filter((item) => item.action === 'driver-probe')).toHaveLength(1);
    expect(plan.checkpoints).toHaveLength(5);
  });

  it('requires subject deltas at every later beat for a stateful physical target', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('separate', 0), beat('align', .36), beat('engage', .7), beat('locked', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { stateAssetStrategy: { required: true, changeKind: 'assembly' } }
    });

    expect(plan.checkpoints.filter((item) => item.surface === 'desktop').map((item) => item.expectSubjectChange)).toEqual([
      false, true, true, true
    ]);
    expect(plan.checkpoints.find((item) => item.id === 'mobile')?.expectSubjectChange).toBe(false);
    expect(plan.minimumSubjectDelta).toBe(.018);
    expect(plan.minimumCausalAnchorDelta).toBe(.018);
  });

  it('raises only structural-deformation visibility thresholds', () => {
    const plan = createVisualReviewPlan({
      experience: { beats: [beat('baseline', 0), beat('deformed', .5), beat('saved', 1)] },
      direction: { interaction: { primaryInput: 'scroll' }, renderer: { route: 'dom-media-hybrid' } },
      technical: { stateAssetStrategy: { required: true, changeKind: 'structural-deformation' } },
      acceptance: [{ id: 'process-causal', priority: 'blocker' }]
    });

    expect(plan.minimumSubjectDelta).toBe(.045);
    expect(plan.minimumCausalAnchorDelta).toBe(.065);
  });

  it.each([
    '不要暗色科技风、巨大标题或随机粒子。',
    'Avoid giant title and generic particles.'
  ])('preserves an explicit no-giant-heading constraint in the browser plan: %s', (constraint) => {
    const plan = createVisualReviewPlan({
      intent: { negativeConstraints: [constraint] },
      experience: { beats: [beat('opening', 0), beat('final', 1)] }
    });

    expect(plan.visualConstraints.forbidGiantHeading).toBe(true);
  });
});
