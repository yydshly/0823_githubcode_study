import { describe, expect, it } from 'vitest';
import { generatedExperienceBundleSchema } from '../src/generation/generated-experience-bundle.ts';
import { assessMediaDominance, assertMediaDominance } from '../src/generation/media-dominance-gate.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const brief = '为普通访客设计古建筑榫卯互动学习网页，使用真实木构件摄影建立连续空间，最终预约线上拆解课。';
const creativeContract = createV2CreativeContract(brief);
const asset = {
  id: 'mortise-tenon-museum-environment-v1',
  kind: 'environment' as const,
  qualityLevel: 'L3-presentable' as const,
  required: true,
};

function bundleWithScene(scene: string) {
  return generatedExperienceBundleSchema.parse({
    schemaVersion: 1,
    id: 'dedicated-media-dominance-test',
    runId: 'run-media-dominance-test',
    effectSpecId: 'effect-media-dominance-test',
    kind: 'dedicated-module',
    entry: 'src/experience.ts',
    files: [
      { path: 'src/experience.ts', language: 'typescript', content: 'export const experience = true;' },
      { path: 'src/scene.ts', language: 'typescript', content: scene },
      { path: 'src/director.ts', language: 'typescript', content: 'export const director = true;' },
      { path: 'src/page.css', language: 'css', content: 'body{margin:0}' },
    ],
    assets: [{ id: asset.id, path: 'assets/mortise.png', kind: 'environment', source: 'generated', required: true }],
    contract: {
      sdkVersion: 1,
      imports: ['three'],
      lifecycle: ['mount', 'update', 'resize', 'dispose'],
      network: 'disabled',
      deterministicTimeline: true,
    },
  });
}

describe('media dominance gate', () => {
  it('blocks the observed failure pattern that rebuilds an approved subject from repeated boxes', () => {
    const bundle = bundleWithScene(`
      import * as THREE from 'three';
      const body = new THREE.BoxGeometry(3.25, .72, .78);
      const tongue = new THREE.BoxGeometry(1.18, .34, .48);
      const upper = new THREE.BoxGeometry(1.35, 1.75, 1.08);
      const force = new THREE.CylinderGeometry(.045, .045, 1, 12);
    `);
    const assessment = assessMediaDominance({ creativeContract, assets: [asset], bundle });

    expect(creativeContract.direction.renderer.route).not.toBe('dom-three-hybrid');
    expect(assessment).toMatchObject({ decision: 'blocked', subjectPrimitiveCount: 4 });
    expect(assessment.summary).toContain('媒体主导权门禁拒绝');
    expect(() => assertMediaDominance({ creativeContract, assets: [asset], bundle })).toThrow('L3/L4 主素材');
  });

  it('allows a media-led scene to use a background plane and one lightweight force marker', () => {
    const bundle = bundleWithScene(`
      import * as THREE from 'three';
      const background = new THREE.PlaneGeometry(2, 2);
      const force = new THREE.CylinderGeometry(.02, .02, 1, 8);
    `);
    const assessment = assessMediaDominance({ creativeContract, assets: [asset], bundle });

    expect(assessment).toMatchObject({ decision: 'ready', subjectPrimitiveCount: 1, subjectPrimitiveScore: 1 });
  });

  it('does not apply the media rule to an explicitly Three-led route', () => {
    const bundle = bundleWithScene(`
      import * as THREE from 'three';
      const body = new THREE.BoxGeometry(1, 1, 1);
      const joint = new THREE.BoxGeometry(1, 1, 1);
    `);
    const threeContract = {
      ...creativeContract,
      direction: {
        ...creativeContract.direction,
        renderer: { ...creativeContract.direction.renderer, route: 'dom-three-hybrid' as const },
      },
    };

    expect(assessMediaDominance({ creativeContract: threeContract, assets: [asset], bundle }).decision).toBe('ready');
  });
});
