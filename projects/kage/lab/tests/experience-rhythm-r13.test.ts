import { describe, expect, it } from 'vitest';
import { resonanceFlagshipExperience } from '../src/experience/resonance-flagship-experience';
import { buildFlowPlan } from '../src/experience/flow-plan';
import { experienceSegmentAtProgress } from '../src/runtime/cinematic-scroll-driver';
import { mixExperienceSceneState } from '../src/runtime/experience-scene-state';

const plan = buildFlowPlan(resonanceFlagshipExperience);

describe('R13 cinematic chapter rhythm', () => {
  it('allocates stable establish and hold windows around the reveal', () => {
    expect(experienceSegmentAtProgress(plan, .01).phase).toBe('establish');
    expect(experienceSegmentAtProgress(plan, .1).phase).toBe('reveal');
    const hold = experienceSegmentAtProgress(plan, .17);
    expect(hold.phase).toBe('hold');
    expect(hold.t).toBe(1);
    expect(experienceSegmentAtProgress(plan, .24).phase).toBe('transition');
  });

  it('changes the flagship scene state inside a chapter instead of moving only the camera', () => {
    const entry = mixExperienceSceneState(resonanceFlagshipExperience, experienceSegmentAtProgress(plan, .01), false);
    const hold = mixExperienceSceneState(resonanceFlagshipExperience, experienceSegmentAtProgress(plan, .17), false);
    expect(hold.assembly).toBeGreaterThan(entry.assembly);
    expect(hold.density).toBeGreaterThan(entry.density);
    expect(hold.energy).toBeGreaterThan(entry.energy);
  });
});
