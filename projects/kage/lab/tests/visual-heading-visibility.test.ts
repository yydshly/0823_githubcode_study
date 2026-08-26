import { describe, expect, it } from 'vitest';
import { assessVisualEvidence, type VisualReviewEvidence } from '../src/generation/visual-review';

function frame(id: VisualReviewEvidence['frames'][number]['id'], progress: number, scrollY: number) {
  return {
    id,
    viewport: id === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    quality: id === 'mobile' ? 'low' as const : 'high' as const,
    reducedMotion: id === 'mobile',
    ready: true,
    canvasCount: 1,
    progress,
    scrollY,
    scrollHeight: 4800,
    overflow: 0,
    heading: 'The primary story heading',
    headingVisible: true,
    visibleTextCount: 8,
    collisionCount: 0,
    maxOverlapRatio: 0,
    blockingCollisionCount: 0,
    editorialOverlapCount: 0,
    maxBlockingOverlapRatio: 0
  };
}

describe('opening heading visibility gate', () => {
  it('rejects a heading that exists in DOM but is outside the opening viewport', () => {
    const opening = { ...frame('opening', 0, 0), headingVisible: false, visibleTextCount: 1 };
    const evidence: VisualReviewEvidence = {
      schemaVersion: 1,
      runId: 'dedicated-heading-visibility',
      capturedAt: '2026-08-26T00:00:00.000Z',
      frames: [opening, frame('middle', 0.44, 1700), frame('final', 1, 3900), frame('mobile', 0, 0)],
      browserErrors: []
    };
    const result = assessVisualEvidence(evidence);
    expect(result.verdict).toBe('revise');
    expect(result.score).toBe(76);
    expect(result.findings.map((item) => item.code)).toContain('opening-heading-missing');
  });
});
