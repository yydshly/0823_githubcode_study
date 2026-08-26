import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyDedicatedRevision, readDedicatedRun, validateAndMaterializeDedicatedBundle, type DedicatedCodeRequest } from '../server/dedicated-code-service';

const projectRoot = process.cwd();
const runsRoot = join(projectRoot, 'generated', 'runs-test-r18');
const environment = { SIGNAL_PROJECT_ROOT: projectRoot, SIGNAL_GENERATED_RUNS_DIR: runsRoot };

const request: DedicatedCodeRequest = {
  brief: '为先锋时装构建会随滚动展开的流体光幕网页',
  seed: 17,
  quality: 'balanced',
  runId: 'run-test-r18',
  selectedId: 'candidate-test-r18',
  reference: {
    title: '流体衣褶',
    summary: '从暗场逐步展开为具有结构张力的光幕。',
    scenePlugin: 'chromatic-tide',
    productionStatus: 'ready'
  }
};

const bundle = {
  schemaVersion: 1 as const,
  id: 'dedicated-test-r18',
  runId: request.runId,
  effectSpecId: request.selectedId,
  kind: 'dedicated-module' as const,
  entry: 'src/experience.ts' as const,
  files: [
    {
      path: 'src/experience.ts',
      language: 'typescript' as const,
      content: `import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
import { createScene } from './scene';
import { createDirector } from './director';
const scene = createScene();
const director = createDirector();
startExperience(defineExperience({
  mount(context) { scene.mount(context); const copy = document.createElement('section'); copy.className = 'copy'; copy.innerHTML = '<h1>流体衣褶</h1><p>随滚动展开空间结构。</p>'; context.container.append(copy); },
  update(frame) { scene.update(frame, director.update(frame)); },
  resize(viewport) { scene.resize(viewport); },
  dispose() { scene.dispose(); }
}));`
    },
    {
      path: 'src/scene.ts',
      language: 'typescript' as const,
      content: `import * as THREE from 'three';
import type { GeneratedFrame, GeneratedMountContext, GeneratedViewport } from '@signal-lab/experience-sdk';
export interface SceneState { rotation: number; lift: number; }
export function createScene() {
  let renderer: THREE.WebGLRenderer | null = null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  const geometry = new THREE.TorusKnotGeometry(1, .24, 96, 12);
  const material = new THREE.MeshStandardMaterial({ color: 0x9af0d0, roughness: .22, metalness: .45 });
  const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x071016, 2)); camera.position.set(0, 0, 5);
  return {
    mount(context: GeneratedMountContext) { renderer = new THREE.WebGLRenderer({ canvas: context.canvas, antialias: context.quality !== 'low', alpha: true }); },
    update(frame: GeneratedFrame, state: SceneState) { if (!renderer) return; mesh.rotation.y = state.rotation; mesh.position.y = state.lift + frame.pointer.y * .08; renderer.render(scene, camera); },
    resize(viewport: GeneratedViewport) { if (!renderer) return; renderer.setPixelRatio(viewport.dpr); renderer.setSize(viewport.width, viewport.height, false); camera.aspect = viewport.width / viewport.height; camera.updateProjectionMatrix(); },
    dispose() { geometry.dispose(); material.dispose(); renderer?.dispose(); renderer = null; }
  };
}`
    },
    {
      path: 'src/director.ts',
      language: 'typescript' as const,
      content: `import type { GeneratedFrame } from '@signal-lab/experience-sdk';
import type { SceneState } from './scene';
export function createDirector() { return { update(frame: GeneratedFrame): SceneState { return { rotation: frame.progress * Math.PI * 1.5, lift: Math.sin(frame.progress * Math.PI) * .35 }; } }; }`
    },
    { path: 'src/page.css', language: 'css' as const, content: 'html,body{margin:0;min-height:320vh;background:#071016;color:white}.generated-canvas{position:fixed;inset:0;width:100%;height:100%}.copy{position:relative;padding:12vh 8vw}' }
  ],
  assets: [],
  contract: {
    sdkVersion: 1 as const,
    imports: ['three', '@signal-lab/experience-sdk'] as const,
    lifecycle: ['mount', 'update', 'resize', 'dispose'] as const,
    network: 'disabled' as const,
    deterministicTimeline: true
  }
};

afterEach(async () => { await rm(runsRoot, { recursive: true, force: true }); });

describe('dedicated code materialization', () => {
  it('type-checks and materializes a dedicated bundle into an addressable run', async () => {
    const result = await validateAndMaterializeDedicatedBundle(request, bundle, environment);
    expect(result.receipt).toMatchObject({ status: 'compiled', files: 4, previewUrl: '/generated-runs/dedicated-test-r18/' });
    expect(await readDedicatedRun(bundle.id, environment)).toMatchObject({ title: bundle.id, entryUrl: '/generated/runs-test-r18/dedicated-test-r18/src/experience.ts' });
  });

  it('rejects code that does not type-check and leaves no addressable run', async () => {
    const broken = {
      ...bundle,
      id: 'dedicated-broken-r18',
      files: bundle.files.map((file) => file.path === 'src/director.ts' ? { ...file, content: 'export const broken: number = "not a number";' } : file)
    };
    await expect(validateAndMaterializeDedicatedBundle(request, broken, environment)).rejects.toThrow('TypeScript 编译失败');
    expect(await readDedicatedRun(broken.id, environment)).toBeNull();
  });
});
describe('dedicated natural-language revision merge', () => {
  const revisionBundle = bundle as unknown as Parameters<typeof applyDedicatedRevision>[0];
  it('changes only requested existing files and produces a new immutable id', () => {
    const revised = applyDedicatedRevision(revisionBundle, [{ path: 'src/page.css', content: bundle.files[3].content + '\n.copy{max-width:52rem}' }], request);
    expect(revised.id).not.toBe(bundle.id);
    expect(revised.files[3].content).toContain('max-width:52rem');
    expect(revised.files.slice(0, 3)).toEqual(bundle.files.slice(0, 3));
  });

  it('rejects new paths and duplicate file changes', () => {
    expect(() => applyDedicatedRevision(revisionBundle, [{ path: 'src/new.ts', content: 'export {}' }], request)).toThrow('只能修改现有文件');
    expect(() => applyDedicatedRevision(revisionBundle, [
      { path: 'src/page.css', content: 'a{}' },
      { path: 'src/page.css', content: 'b{}' }
    ], request)).toThrow('重复修改文件');
  });

  it('rejects a response that makes no actual code change', () => {
    expect(() => applyDedicatedRevision(revisionBundle, [{ path: 'src/page.css', content: bundle.files[3].content }], request)).toThrow('没有形成实际代码变化');
  });
});
