import { describe, expect, it } from 'vitest';
import { assessVisualEvidence, type VisualReviewEvidence } from '../src/generation/visual-review';

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
    visibleTextCount: 8,
    collisionCount: 0,
    maxOverlapRatio: 0,
    blockingCollisionCount: 0,
    editorialOverlapCount: 0,
    maxBlockingOverlapRatio: 0
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

describe('visual review gate', () => {
  it('passes a runnable, responsive and changing timeline', () => {
    const result = assessVisualEvidence(evidence());
    expect(result.verdict).toBe('pass');
    expect(result.score).toBe(100);
  });

  it('requests revision for layout and timeline defects', () => {
    const fixture = evidence();
    fixture.frames[1] = { ...fixture.frames[1], overflow: 26, collisionCount: 2, maxOverlapRatio: 0.34, blockingCollisionCount: 2, maxBlockingOverlapRatio: 0.34 };
    fixture.frames[2] = { ...fixture.frames[2], progress: 0.5, scrollY: 900 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('revise');
    expect(result.findings.map((item) => item.code)).toEqual(expect.arrayContaining(['horizontal-overflow', 'text-collision', 'timeline-static']));
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

  it('blocks a revision when runtime evidence is invalid', () => {
    const fixture = evidence({ browserErrors: ['pageerror: WebGL context failed'] });
    fixture.frames[0] = { ...fixture.frames[0], ready: false, canvasCount: 0 };
    const result = assessVisualEvidence(fixture);
    expect(result.verdict).toBe('blocked');
    expect(result.findings.filter((item) => item.severity === 'blocking')).toHaveLength(3);
    expect(result.score).toBe(0);
  });
});
