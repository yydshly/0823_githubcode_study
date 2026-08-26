import { describe, expect, it } from 'vitest';
import type { FlowPlan } from '../src/experience/flow-plan';
import { experienceSegmentAtProgress } from '../src/runtime/cinematic-scroll-driver';
import { CinematicPointerController, dampingFactor } from '../src/runtime/experience-motion';

const plan: FlowPlan = {
  id: 'motion-test',
  nodeIds: ['listen', 'shape', 'direct', 'release'],
  nodes: [],
  flowIds: []
};

describe('cinematic motion', () => {
  it('uses frame-rate-independent damping and returns to center after release', () => {
    const pointer = new CinematicPointerController();
    pointer.setTarget(1, .5);
    const first = pointer.advance(16.67);
    expect(first.x).toBeGreaterThan(0);
    expect(first.x).toBeLessThan(1);
    for (let index = 0; index < 24; index += 1) pointer.advance(16.67);
    const settled = pointer.snapshot();
    expect(settled.x).toBeGreaterThan(.9);
    expect(settled.activity).toBeGreaterThan(.5);
    pointer.release();
    for (let index = 0; index < 70; index += 1) pointer.advance(16.67);
    expect(Math.abs(pointer.snapshot().x)).toBeLessThan(.01);
    expect(dampingFactor(8, 16.67)).toBeCloseTo(dampingFactor(8, 8.335) + (1 - dampingFactor(8, 8.335)) * dampingFactor(8, 8.335), 3);
  });

  it('plays a chapter camera track before transitioning to the next chapter', () => {
    const internal = experienceSegmentAtProgress(plan, .1);
    expect(internal.fromId).toBe('listen');
    expect(internal.toId).toBe('listen');
    expect(internal.t).toBeGreaterThan(0);

    const transition = experienceSegmentAtProgress(plan, .24);
    expect(transition.fromId).toBe('listen');
    expect(transition.toId).toBe('shape');
    expect(transition.t).toBeGreaterThan(0);

    const next = experienceSegmentAtProgress(plan, .27);
    expect(next.fromId).toBe('shape');
    expect(next.toId).toBe('shape');
  });
});
