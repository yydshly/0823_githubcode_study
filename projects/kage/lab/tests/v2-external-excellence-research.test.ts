import { describe, expect, it } from 'vitest';
import {
  externalExcellenceStudies,
  externalExcellenceStudySchema,
  externalImplementationStudies,
  externalImplementationStudySchema,
  getExternalExcellenceResearchSummary,
  promotedExternalReferenceStudyIds
} from '../src/v2/external-excellence-research.ts';
import { positiveReferenceLibrary } from '../src/v2/reference-intelligence.ts';

describe('V2 external excellence research', () => {
  it('keeps one source-reviewed product study for each first-batch family', () => {
    expect(externalExcellenceStudies).toHaveLength(6);
    expect(new Set(externalExcellenceStudies.map((study) => study.family)).size).toBe(6);
    for (const study of externalExcellenceStudies) {
      expect(() => externalExcellenceStudySchema.parse(study)).not.toThrow();
      expect(study.status).toBe('source-reviewed');
      expect(study.referenceEligibility).toBe('research-only');
      expect(study.sources.length).toBeGreaterThanOrEqual(2);
      expect(study.borrowPrinciples.length).toBeGreaterThanOrEqual(2);
      expect(study.promotionGates.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('separates excellent experiences, narrow experiments and mechanism libraries', () => {
    expect(externalImplementationStudies).toHaveLength(6);
    for (const study of externalImplementationStudies) {
      expect(() => externalImplementationStudySchema.parse(study)).not.toThrow();
      expect(study.reviewedRevision).toMatch(/^[a-f0-9]{40}$/);
      expect(study.evidenceLevel).toBe('E3');
    }
    expect(externalImplementationStudies.filter((study) => (
      study.referenceRole === 'mechanism-only'
    )).map((study) => study.id)).toEqual([
      'r3f-scroll-rig-progressive-layer',
      'butterchurn-audio-reactivity'
    ]);
  });

  it('promotes only the bounded source-plus-runtime mechanism subset', () => {
    const authoringReferenceIds = new Set(positiveReferenceLibrary.map((pack) => pack.id));
    expect(externalExcellenceStudies.some((study) => authoringReferenceIds.has(study.id))).toBe(false);
    expect(externalImplementationStudies.some((study) => authoringReferenceIds.has(study.id))).toBe(false);
    expect(promotedExternalReferenceStudyIds).toEqual([
      'r3f-scroll-rig-progressive-layer',
      'codrops-noise-surface-transition',
      'butterchurn-audio-reactivity'
    ]);
    expect(getExternalExcellenceResearchSummary()).toEqual({
      totalStudies: 6,
      familyCount: 6,
      sourceCount: 14,
      implementationStudies: 6,
      mechanismOnlyStudies: 2,
      referenceReadyCount: 3,
      status: 'bounded-reference-promotion'
    });
  });
});
