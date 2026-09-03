import { describe, expect, it } from 'vitest';
import {
  getActiveResearchTrack,
  getResearchProgramSummary,
  researchProgramSchema,
  researchTrackSchema,
  v2ResearchProgram
} from '../src/v2/research-program.ts';

describe('V2 goal-driven research program', () => {
  it('keeps the complete program and every track schema-valid', () => {
    expect(() => researchProgramSchema.parse(v2ResearchProgram)).not.toThrow();
    v2ResearchProgram.tracks.forEach((track) => {
      expect(() => researchTrackSchema.parse(track)).not.toThrow();
    });
  });

  it('keeps one bounded external excellence research direction active', () => {
    const activeTracks = v2ResearchProgram.tracks.filter((track) => track.status === 'active');
    const completedTracks = v2ResearchProgram.tracks.filter((track) => track.status === 'completed');
    expect(activeTracks).toHaveLength(1);
    expect(activeTracks[0]?.id).toBe('external-excellence-canon');
    expect(completedTracks.map((track) => track.id)).toContain('interaction-as-information');
    expect(completedTracks.map((track) => track.id)).toContain('identity-and-proof');
    expect(v2ResearchProgram.tracks.every((track) => track.sources.length <= 5)).toBe(true);
    expect(v2ResearchProgram.tracks.every((track) => track.timeboxDays <= 3)).toBe(true);
  });

  it('connects every research direction to generation value and an E4 gate', () => {
    v2ResearchProgram.tracks.forEach((track) => {
      expect(track.modelDecisionGap.length).toBeGreaterThan(20);
      expect(track.generationValue.length).toBeGreaterThan(20);
      expect(track.targetEvidence).toBe('E4');
      expect(track.promotionGates.length).toBeGreaterThanOrEqual(4);
      expect(track.stopConditions.length).toBeGreaterThanOrEqual(2);
      expect(new Set(track.sources.map((source) => source.family)).size).toBeGreaterThanOrEqual(2);
    });
  });

  it('does not promote spatial 3D without a trustworthy asset path', () => {
    const spatialTrack = v2ResearchProgram.tracks.find((track) => track.id === 'real-spatial-object');
    expect(spatialTrack?.status).toBe('queued');
    expect(spatialTrack?.promotionGates.join(' ')).toContain('L3');
    expect(spatialTrack?.stopConditions.join(' ')).toContain('禁止用基础几何体伪装最终产品');
  });

  it('provides a stable summary for the research UI and generator handoff', () => {
    expect(getActiveResearchTrack()?.id).toBe('external-excellence-canon');
    expect(getResearchProgramSummary()).toEqual({
      totalTracks: 4,
      activeTrackId: 'external-excellence-canon',
      activeTargetCapabilityId: 'effect-first-reference-synthesis',
      completedTrackIds: ['interaction-as-information', 'identity-and-proof'],
      sourceFamilies: 5,
      maxRepresentativeSources: 5
    });
  });
});
