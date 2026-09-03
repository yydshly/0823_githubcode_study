import { describe, expect, it } from 'vitest';
import { positiveReferenceLibrary } from '../src/v2/reference-intelligence.ts';
import {
  externalCapabilitySourceProfileSchema,
  getThreeUiResearchBridgeSummary,
  mechanismPilotCandidateSchema,
  mechanismPilotResultSchema,
  observedReferenceStudySchema,
  threeUiMechanismPilotCandidates,
  threeUiMechanismPilotResults,
  threeUiObservedReferences,
  threeUiSourceProfile
} from '../src/v2/threeui-capability-research.ts';

describe('R166 ThreeUI capability research bridge', () => {
  it('records ThreeUI as a high-value research source without adding a runtime dependency', () => {
    expect(() => externalCapabilitySourceProfileSchema.parse(threeUiSourceProfile)).not.toThrow();
    expect(threeUiSourceProfile.referenceValue).toBe('high');
    expect(threeUiSourceProfile.directIntegrationValue).toBe('medium');
    expect(threeUiSourceProfile.runtimeDependencyPolicy).toBe('research-first-no-package-install');
    expect(threeUiSourceProfile.authoringPolicy).toBe('principles-only-not-style-rules');
    expect(threeUiSourceProfile.automaticPromotion).toBe(false);
  });

  it('keeps Anima as a video-observed inspiration rather than invented source evidence', () => {
    expect(threeUiObservedReferences).toHaveLength(1);
    const anima = threeUiObservedReferences[0];
    expect(() => observedReferenceStudySchema.parse(anima)).not.toThrow();
    expect(anima?.id).toBe('threeui-anima');
    expect(anima?.publicEvidence).toBe('video-preview');
    expect(anima?.sourceAvailability).toBe('pro-gated');
    expect(anima?.referenceEligibility).toBe('inspiration-only');
    expect(anima?.promotionDecision).toBe('hold');
  });

  it('bounds the next stage to three complementary source-verification pilots', () => {
    expect(threeUiMechanismPilotCandidates).toHaveLength(3);
    expect(new Set(threeUiMechanismPilotCandidates.map((candidate) => candidate.capabilityRole))).toEqual(new Set([
      'interactive-visual-field',
      'kinetic-typography',
      'complete-page-adapter'
    ]));
    for (const candidate of threeUiMechanismPilotCandidates) {
      expect(() => mechanismPilotCandidateSchema.parse(candidate)).not.toThrow();
      expect(candidate.status).toBe('candidate');
      expect(candidate.promotionGates.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('does not promote ThreeUI observations or visual shells into the authoring library', () => {
    const promotedIds = new Set(positiveReferenceLibrary.map((reference) => reference.id));
    expect(threeUiObservedReferences.some((reference) => promotedIds.has(reference.id))).toBe(false);
    expect(threeUiMechanismPilotCandidates.some((candidate) => promotedIds.has(candidate.id))).toBe(false);
    expect(threeUiMechanismPilotResults).toHaveLength(1);
    expect(() => mechanismPilotResultSchema.parse(threeUiMechanismPilotResults[0])).not.toThrow();
    expect(threeUiMechanismPilotResults[0]?.authoringEligibility).toBe('research-only-until-product-proof');
    expect(getThreeUiResearchBridgeSummary()).toEqual({
      sourceId: 'threeui-community',
      observedReferences: 1,
      mechanismPilotCandidates: 3,
      runtimeValidatedPilots: 1,
      promotedReferences: 0,
      runtimeDependenciesAdded: 0,
      status: 'first-mechanism-runtime-validated'
    });
  });
});
