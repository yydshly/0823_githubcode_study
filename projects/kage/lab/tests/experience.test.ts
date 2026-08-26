import { describe, expect, it } from 'vitest';
import { experienceRegistry, experiences } from '../src/experience/fixtures';
import { buildFlowPlan } from '../src/experience/flow-plan';
import type { ExperienceManifest } from '../src/experience/schema';
import { inspectExperience } from '../src/experience/validator';

describe('experience graph contract', () => {
  it('validates every fixture without assuming a node count', () => {
    experiences.forEach((experience) => expect(inspectExperience(experience)).toEqual([]));
    expect(new Set(experiences.map((experience) => Object.keys(experience.nodes).length)).size).toBeGreaterThanOrEqual(4);
    expect(experienceRegistry.get('composed-world')?.scenes.main.plugin).toBe('composed-world');
    expect(Object.keys(experienceRegistry.get('single-hero')!.nodes)).toHaveLength(1);
    expect(Object.keys(experienceRegistry.get('long-form')!.nodes)).toHaveLength(9);
  });

  it('builds deterministic plans for both branches and rejoins them', () => {
    const manifest = experienceRegistry.get('branching-lore')!;
    const luminous = buildFlowPlan(manifest, { choices: { crossroads: 'luminous' } });
    const shadow = buildFlowPlan(manifest, { choices: { crossroads: 'shadow' } });
    expect(luminous.nodeIds).toEqual(['threshold', 'crossroads', 'luminous', 'confluence']);
    expect(shadow.nodeIds).toEqual(['threshold', 'crossroads', 'shadow', 'confluence']);
  });

  it('rejects dangling references and unreachable nodes before rendering', () => {
    const source = experienceRegistry.get('observatory')!;
    const invalid = {
      ...source,
      nodes: {
        ...source.nodes,
        orphan: { ...source.nodes.receive, id: 'orphan', tracks: { camera: 'missing', scene: 'missing' } }
      }
    } satisfies ExperienceManifest;
    const codes = inspectExperience(invalid).map((issue) => issue.code);
    expect(codes).toContain('MISSING_TRACK');
    expect(codes).toContain('UNREACHABLE_NODE');
  });

  it('rejects ambiguous scroll branches instead of choosing by array order', () => {
    const source = experienceRegistry.get('observatory')!;
    const invalid = { ...source, flows: [...source.flows, { id: 'flow:receive:resonate', from: 'receive', to: 'resonate', trigger: { type: 'scroll-complete' as const } }] };
    expect(() => buildFlowPlan(invalid)).toThrow(/不明确/);
  });
});
