import { describe, expect, it } from 'vitest';
import { capabilityCatalog } from '../src/capabilities/catalog';
import { collectCapabilityUsage, planCapabilities } from '../src/capabilities/planner';
import { experienceRegistry } from '../src/experience/fixtures';

describe('capability planner', () => {
  it('derives capabilities from the manifest instead of fixture names', () => {
    const usage = collectCapabilityUsage(experienceRegistry.get('observatory')!);
    expect(usage.scenePlugins).toEqual(['scene:signal-world']);
    expect(usage.effectPlugins).toEqual(['effect:signal-field']);
    expect(usage.outputs).toEqual(['output:semantic-dom']);
  });

  it('makes renderer fallback an explicit plan', () => {
    const plan = planCapabilities(experienceRegistry.get('observatory')!, capabilityCatalog, { quality: 'balanced', renderer: 'none', motion: 'full' });
    expect(plan.status).toBe('fallback');
    expect(plan.fallback).toBe('semantic-dom');
  });

  it('reports unknown capabilities before runtime construction', () => {
    const source = experienceRegistry.get('observatory')!;
    const plan = planCapabilities({ ...source, scenes: { main: { ...source.scenes.main, plugin: 'unknown-world' } } }, capabilityCatalog, { quality: 'high', renderer: 'webgl', motion: 'full' });
    expect(plan.missing).toEqual(['scene:unknown-world']);
    expect(plan.status).toBe('fallback');
  });
});
