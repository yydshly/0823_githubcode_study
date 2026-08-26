import { describe, expect, it } from 'vitest';
import { capabilityCatalog } from '../src/capabilities/catalog';
import { planCapabilities } from '../src/capabilities/planner';
import { tidalArchiveExperience } from '../src/experience/tidal-archive-experience';
import { inspectExperience } from '../src/experience/validator';

describe('tidal archive creative world', () => {
  it('is a valid asset-led experience with explicit color and depth provenance', () => {
    expect(inspectExperience(tidalArchiveExperience)).toEqual([]);
    const scene = tidalArchiveExperience.scenes.main;
    expect(scene.plugin).toBe('tidal-archive');
    expect(scene.assets).toEqual([
      expect.objectContaining({ role: 'hero-color', source: 'model-generated', qualityLevel: 'L3-presentable' }),
      expect.objectContaining({ role: 'hero-depth', source: 'model-generated', qualityLevel: 'L3-presentable' })
    ]);
    expect(Object.keys(tidalArchiveExperience.nodes)).toEqual(['descend', 'index', 'trace', 'surface']);
  });

  it('has registered high and constrained-device capability routes', () => {
    const high = planCapabilities(tidalArchiveExperience, capabilityCatalog, { quality: 'high', renderer: 'webgl', motion: 'full' });
    const low = planCapabilities(tidalArchiveExperience, capabilityCatalog, { quality: 'low', renderer: 'webgl', motion: 'reduce' });
    const fallback = planCapabilities(tidalArchiveExperience, capabilityCatalog, { quality: 'low', renderer: 'none', motion: 'reduce' });
    expect(high.status).toBe('fit');
    expect(low.status).toBe('fit');
    expect(low.decisions).toContain('减弱动效：轨道冻结到稳定构图，插件只渲染请求帧。');
    expect(fallback).toMatchObject({ status: 'fallback', fallback: 'semantic-dom' });
  });
});
