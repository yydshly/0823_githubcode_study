import { describe, expect, it } from 'vitest';
import {
  CREATIVE_CAPABILITY_REGISTRY,
  creativeCapabilityGuideSchema,
  serializeCompactCreativeCapabilityGuide,
  selectCreativeCapabilities
} from '../src/v2/creative-capability-registry.ts';
import { V2_EXPERIENCE_ARCHIVE } from '../src/v2/experience-archive.ts';
import { V25_VERIFIED_DELIVERIES } from '../src/v2/v25-verified-deliveries.ts';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';

describe('V2 creative capability registry', () => {
  it('keeps every reusable capability advisory, composable and backed by a known result', () => {
    const ids = CREATIVE_CAPABILITY_REGISTRY.map((capability) => capability.id);
    const knownCases = new Set([
      ...V2_EXPERIENCE_ARCHIVE.map((item) => item.id),
      ...V25_VERIFIED_DELIVERIES.map((item) => item.deliveryId),
      ...V3_VERIFIED_DELIVERIES.map((item) => item.deliveryId)
    ]);

    expect(CREATIVE_CAPABILITY_REGISTRY).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
    for (const capability of CREATIVE_CAPABILITY_REGISTRY) {
      expect(capability.authority).toBe('advisory');
      expect(capability.exclusive).toBe(false);
      expect(capability.proofCaseIds.every((caseId) => knownCases.has(caseId))).toBe(true);
    }
  });

  it('selects real audio causality for a sound-centered experience', () => {
    const guide = selectCreativeCapabilities({
      brief: '为四种声音设计一段可比较的和声，拖动时音色和画面结构同步变化。',
      leadMedium: 'sound',
      supportingMedia: ['procedural-webgl'],
      interactionMode: 'direct'
    });

    expect(guide.selections[0]?.capabilityId).toBe('audio-visual-causality');
    expect(guide.selections.map((item) => item.capabilityId)).toContain('semantic-interaction');
    expect(serializeCompactCreativeCapabilityGuide(guide)).toContain('audio-visual-causality');
  });

  it('routes a real city map toward grounded evidence instead of generic effects', () => {
    const guide = selectCreativeCapabilities({
      brief: '为城市公共饮水点制作真实地图，按地点展示步行路线、距离、状态和数据来源。',
      leadMedium: 'grounded-real-media',
      supportingMedia: ['data-visualization'],
      interactionMode: 'direct'
    });

    expect(guide.selections[0]?.capabilityId).toBe('grounded-data-place');
    expect(guide.selections.map((item) => item.capabilityId)).not.toContain('procedural-webgl');
  });

  it('recognizes spatial product inspection without making Three.js mandatory elsewhere', () => {
    const spatial = selectCreativeCapabilities({
      brief: '用 Three.js 展示模块化房间的三维结构，拖动观察部件和声场。',
      leadMedium: 'threejs-3d',
      supportingMedia: ['sound'],
      interactionMode: 'mixed'
    });
    const editorial = selectCreativeCapabilities({
      brief: '为诗歌出版物设计安静的编辑页面。',
      leadMedium: 'typography',
      supportingMedia: [],
      interactionMode: 'none'
    });

    expect(spatial.selections.map((item) => item.capabilityId)).toContain('spatial-threejs');
    expect(editorial.selections.map((item) => item.capabilityId)).not.toContain('spatial-threejs');
  });

  it('does not turn a user rejection into a positive capability match', () => {
    const guide = selectCreativeCapabilities({
      brief: '做一个明亮的社区公告页面。不要 3D、粒子或暗色科技风。',
      leadMedium: 'typography',
      supportingMedia: [],
      interactionMode: 'none'
    });

    expect(guide.selections.map((item) => item.capabilityId)).not.toContain('spatial-threejs');
    expect(guide.selections.map((item) => item.capabilityId)).not.toContain('procedural-webgl');
  });

  it('leaves the search space open when the catalog has no relevant answer', () => {
    const guide = selectCreativeCapabilities({
      brief: '创造一种项目从未见过的触觉式文字体验。',
      leadMedium: 'haptic-poetry',
      supportingMedia: [],
      interactionMode: 'none'
    });

    expect(creativeCapabilityGuideSchema.parse(guide)).toMatchObject({
      extensionPolicy: 'open-better-methods-allowed',
      catalogIsNotWhitelist: true,
      selections: [],
      noMatchAction: 'leave-search-space-open'
    });
  });
});
