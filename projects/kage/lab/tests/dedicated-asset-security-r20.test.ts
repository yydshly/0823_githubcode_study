import { describe, expect, it } from 'vitest';
import { validateAndMaterializeDedicatedBundle, type DedicatedCodeRequest } from '../server/dedicated-code-service';

const request: DedicatedCodeRequest = {
  brief: '为先锋时装品牌构建使用获批主视觉的流体光幕网页',
  seed: 17,
  quality: 'balanced',
  runId: 'run-asset-r20',
  selectedId: 'candidate-asset-r20',
  reference: {
    title: '流体高定',
    summary: '从材料细节展开为空间光幕。',
    scenePlugin: 'chromatic-tide',
    productionStatus: 'ready',
    assets: [{
      id: 'fashion-fluid-couture-v1',
      uri: '/creative-assets/fashion-fluid-couture-v1.png',
      bundlePath: 'assets/fashion-fluid-couture-v1.png',
      kind: 'image',
      source: 'chatgpt-generated',
      role: 'hero material anchor',
      description: '透明液态高定主视觉',
      payloadBytes: 1_851_938
    }]
  }
};

const files = [
  { path: 'src/experience.ts', language: 'typescript' as const, content: "import { defineExperience, startExperience } from '@signal-lab/experience-sdk'; startExperience(defineExperience({ mount(){}, update(){}, resize(){}, dispose(){} }));" },
  { path: 'src/scene.ts', language: 'typescript' as const, content: "import * as THREE from 'three'; export const scene = new THREE.Scene();" },
  { path: 'src/director.ts', language: 'typescript' as const, content: 'export const progress = 0;' },
  { path: 'src/page.css', language: 'css' as const, content: 'body{margin:0;background:#080611}' }
];

function bundle(overrides: { scene?: string; assets?: Array<{ id: string; path: string; kind: 'image'; source: 'generated'; required: boolean }> } = {}) {
  return {
    schemaVersion: 1 as const,
    id: 'dedicated-asset-r20',
    runId: request.runId,
    effectSpecId: request.selectedId,
    kind: 'dedicated-module' as const,
    entry: 'src/experience.ts' as const,
    files: files.map((file) => file.path === 'src/scene.ts' && overrides.scene ? { ...file, content: overrides.scene } : file),
    assets: overrides.assets || [],
    contract: {
      sdkVersion: 1 as const,
      imports: ['three', '@signal-lab/experience-sdk'] as const,
      lifecycle: ['mount', 'update', 'resize', 'dispose'] as const,
      network: 'disabled' as const,
      deterministicTimeline: true
    }
  };
}

describe('dedicated asset security gate', () => {
  it('rejects a balanced result that ignores available approved assets', async () => {
    await expect(validateAndMaterializeDedicatedBundle(request, bundle())).rejects.toThrow('没有实际使用');
  });

  it('rejects an unapproved project-local runtime asset URI', async () => {
    const noAssets = { ...request, reference: { ...request.reference, assets: [] } };
    await expect(validateAndMaterializeDedicatedBundle(noAssets, bundle({ scene: "import * as THREE from 'three'; export const uri='/creative-assets/rogue.png'; export const scene=new THREE.Scene();" }))).rejects.toThrow('未获批');
  });

  it('requires the bundle to declare every approved runtime asset it uses', async () => {
    await expect(validateAndMaterializeDedicatedBundle(request, bundle({ scene: "import * as THREE from 'three'; export const uri='/creative-assets/fashion-fluid-couture-v1.png'; export const scene=new THREE.Scene();" }))).rejects.toThrow('未声明');
  });

  it('requires every bundle asset marked required to be referenced by runtime code', async () => {
    const secondAsset = {
      id: 'biomaterial-seed-pod-plate-v1',
      uri: '/creative-assets/biomaterial-seed-pod-plate-v1.png',
      bundlePath: 'assets/biomaterial-seed-pod-plate-v1.png',
      kind: 'image' as const,
      source: 'chatgpt-generated' as const,
      role: 'foreground subject',
      description: '滚动叙事中的发光纤维种荚主体',
      payloadBytes: 1_778_131
    };
    const twoAssetRequest = {
      ...request,
      reference: { ...request.reference, assets: [...(request.reference.assets || []), secondAsset] }
    };
    await expect(validateAndMaterializeDedicatedBundle(twoAssetRequest, bundle({
      scene: "import * as THREE from 'three'; export const uri='/creative-assets/fashion-fluid-couture-v1.png'; export const scene=new THREE.Scene();",
      assets: [
        { id: 'fashion-fluid-couture-v1', path: 'assets/fashion-fluid-couture-v1.png', kind: 'image', source: 'generated', required: true },
        { id: 'biomaterial-seed-pod-plate-v1', path: 'assets/biomaterial-seed-pod-plate-v1.png', kind: 'image', source: 'generated', required: true }
      ]
    }))).rejects.toThrow('没有实际使用必需素材');
  });

  it('requires every asset marked critical by the experience contract to be used and declared required', async () => {
    const contracted = {
      ...request,
      reference: {
        ...request.reference,
        assets: (request.reference.assets || []).map((asset) => ({
          ...asset,
          required: true,
          experience: {
            anchor: .2,
            function: 'establish' as const,
            visualState: '主视觉在首段形成页面唯一清晰焦点。',
            continuity: '主体材质和光色会延续到后续空间状态。',
            integration: 'alpha-subject' as const
          }
        }))
      }
    };
    await expect(validateAndMaterializeDedicatedBundle(contracted, bundle({
      scene: "import * as THREE from 'three'; export const uri='/creative-assets/fashion-fluid-couture-v1.png'; export const scene=new THREE.Scene();",
      assets: [{ id: 'fashion-fluid-couture-v1', path: 'assets/fashion-fluid-couture-v1.png', kind: 'image', source: 'generated', required: false }]
    }))).rejects.toThrow('没有把素材合同中的关键素材声明为 required');
  });
});
