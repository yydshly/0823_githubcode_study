import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  applyDedicatedRevision,
  allowsLocalCanvasOcclusionRepair,
  classifyDedicatedGenerationFailure,
  completeDedicatedAuthoringResponse,
  createCanvasOcclusionRepair,
  createCanvasVisualAnchorRepair,
  dedicatedAuthoringModel,
  dedicatedAuthoringModelResponseSchema,
  dedicatedCompactCodePrompt,
  dedicatedCodePrompt,
  dedicatedVisualRefinementModel,
  hasSavedDedicatedCandidate,
  readDedicatedRun,
  repairDedicatedCandidate,
  recoverAndMaterializeDedicatedBundle,
  validateAndMaterializeDedicatedBundle,
  type DedicatedCodeRequest,
  type DedicatedGenerationProgress,
} from '../server/dedicated-code-service';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';

const projectRoot = process.cwd();
const runsRoot = join(projectRoot, 'generated', 'runs-test-r18');
const candidatesRoot = join(projectRoot, '.artifacts', 'generation-candidates-test-r53');
const environment = { SIGNAL_PROJECT_ROOT: projectRoot, SIGNAL_GENERATED_RUNS_DIR: runsRoot, SIGNAL_GENERATION_CANDIDATES_DIR: candidatesRoot };

describe('dedicated Codex role routing', () => {
  it('uses Terra for first-pass authoring and reserves Sol for refinement', () => {
    expect(dedicatedAuthoringModel({})).toBe('gpt-5.6-terra');
    expect(dedicatedAuthoringModel({}, 'high')).toBe('gpt-5.6-terra');
    expect(dedicatedVisualRefinementModel({})).toBe('gpt-5.6-sol');
  });

  it('keeps explicit authoring and legacy bundle overrides deterministic', () => {
    expect(dedicatedAuthoringModel({ CODEX_AUTHORING_MODEL: 'gpt-5.6-luna', CODEX_BUNDLE_MODEL: 'legacy-model' })).toBe('gpt-5.6-luna');
    expect(dedicatedAuthoringModel({ CODEX_BUNDLE_MODEL: 'legacy-model' })).toBe('legacy-model');
    expect(dedicatedAuthoringModel({ CODEX_HIGH_QUALITY_AUTHORING_MODEL: 'quality-author' }, 'high')).toBe('quality-author');
    expect(dedicatedAuthoringModel({ CODEX_BALANCED_AUTHORING_MODEL: 'balanced-author' }, 'balanced')).toBe('balanced-author');
    expect(dedicatedVisualRefinementModel({ CODEX_VISUAL_REFINEMENT_MODEL: 'gpt-5.6-terra' })).toBe('gpt-5.6-terra');
  });
});

describe('dedicated deterministic quality repair', () => {
  it('adapts a generated HTMLElement mount parameter to the SDK mount context without another model call', () => {
    const candidate = {
      files: [{
        path: 'src/experience.ts',
        language: 'typescript',
        content: "startExperience(defineExperience({ mount(root: HTMLElement) { root.innerHTML = '<main></main>'; }, update() {}, resize() {}, dispose() {} }));",
      }],
    };
    const repaired = repairDedicatedCandidate(candidate, request, 'typescript');
    const content = (repaired.value as typeof candidate).files[0]?.content || '';
    expect(content).toContain('mount(sdkContext)');
    expect(content).toContain('const root = sdkContext.container;');
    expect(repaired.actions.join(' ')).toContain('GeneratedMountContext.container');
  });

  it('widens a generated low/high-only constructor to accept runtime balanced quality', () => {
    const candidate = {
      files: [{
        path: 'src/scene.ts',
        language: 'typescript',
        content: "class Scene { constructor(quality: 'low' | 'high') {} }",
      }],
    };
    const repaired = repairDedicatedCandidate(candidate, request, 'typescript');
    expect((repaired.value as typeof candidate).files[0]?.content).toContain("'low' | 'balanced' | 'high'");
    expect(repaired.actions.join(' ')).toContain('balanced');
  });

  it('normalizes a generated low/medium/high mount type to the SDK balanced quality', () => {
    const candidate = {
      files: [{
        path: 'src/experience.ts',
        language: 'typescript',
        content: "type Mount = { quality: 'low' | 'medium' | 'high' };",
      }],
    };
    const repaired = repairDedicatedCandidate(candidate, request, 'typescript');
    expect((repaired.value as typeof candidate).files[0]?.content).toContain("'low' | 'balanced' | 'high'");
    expect(repaired.actions.join(' ')).toContain('balanced');
  });

  it('downgrades a generated interval to a cancellable one-shot cue without another model call', () => {
    const candidate = {
      files: [{
        path: 'src/experience.ts',
        language: 'typescript',
        content: 'let timer=window.setInterval(()=>play(),120); const stop=()=>window.clearInterval(timer);',
      }],
    };
    const repaired = repairDedicatedCandidate(candidate, request, 'security');
    const content = (repaired.value as typeof candidate).files[0]?.content || '';
    expect(content).toContain('window.setTimeout(');
    expect(content).toContain('window.clearTimeout(');
    expect(content).not.toContain('setInterval');
    expect(repaired.actions.join(' ')).toContain('周期定时器');
  });

  it('narrows a generated button currentTarget before DOM mutation', () => {
    const candidate = {
      files: [{
        path: 'src/experience.ts',
        language: 'typescript',
        content: "node.addEventListener('click', (event) => { const button = event.currentTarget; button.setAttribute('aria-pressed', 'true'); button.textContent = '静音'; });",
      }],
    };
    const repaired = repairDedicatedCandidate(candidate, request, 'typescript');
    const content = (repaired.value as typeof candidate).files[0]?.content || '';
    expect(content).toContain('const button = event.currentTarget as HTMLButtonElement;');
    expect(repaired.actions.join(' ')).toContain('currentTarget');
  });

  it('connects a declared but unused seamless depth field without another model call', () => {
    const candidate = {
      files: [
        { path: 'src/experience.ts', language: 'typescript', content: 'document.body.dataset.ready = "true";' },
        { path: 'src/page.css', language: 'css', content: 'body{margin:0;background:#eee}' },
      ],
      assets: [{ id: 'depth', path: 'assets/depth.svg', kind: 'texture', source: 'generated', required: true }],
    };
    const depthRequest: DedicatedCodeRequest = {
      ...request,
      reference: {
        ...request.reference,
        assets: [{
          id: 'depth', uri: '/creative-assets/depth.svg', bundlePath: 'assets/depth.svg',
          kind: 'texture', source: 'model-generated', role: 'depth field', description: 'Aligned depth field.',
          payloadBytes: 1200, required: true,
          experience: {
            anchor: .5, function: 'persistent', visualState: 'Aligned scene depth field.',
            continuity: 'Shares the master plate coordinates.', integration: 'seamless-field'
          }
        }]
      }
    };

    const repaired = repairDedicatedCandidate(candidate, depthRequest, 'asset-contract');
    const css = (repaired.value as typeof candidate).files[1]?.content || '';
    expect(css).toContain("mask:url('/creative-assets/depth.svg')");
    expect(repaired.actions.join(' ')).toContain('深度/状态场');
  });
});

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
import { createGeneratedThreeRuntime, type GeneratedFrame, type GeneratedMountContext, type GeneratedThreeRuntime, type GeneratedViewport } from '@signal-lab/experience-sdk';
export interface SceneState { rotation: number; lift: number; }
export function createScene() {
  let runtime: GeneratedThreeRuntime | null = null;
  let mesh: THREE.Mesh | null = null;
  return {
    mount(context: GeneratedMountContext) {
      runtime = createGeneratedThreeRuntime(context.canvas, { quality: context.quality, camera: { fov: 45 }, clearColor: 0x071016 });
      mesh = new THREE.Mesh(runtime.geometry(new THREE.TorusKnotGeometry(1, .24, 96, 12)), runtime.material(new THREE.MeshStandardMaterial({ color: 0x9af0d0, roughness: .22, metalness: .45 })));
      runtime.scene.add(mesh, new THREE.HemisphereLight(0xffffff, 0x071016, 2)); runtime.camera.position.set(0, 0, 5);
    },
    update(frame: GeneratedFrame, state: SceneState) { if (!runtime || !mesh) return; mesh.rotation.y = state.rotation; mesh.position.y = state.lift + frame.pointer.y * .08; runtime.render(); },
    resize(viewport: GeneratedViewport) { runtime?.resize(viewport); },
    dispose() { runtime?.dispose(); runtime = null; mesh = null; }
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

afterEach(async () => {
  await rm(runsRoot, { recursive: true, force: true });
  await rm(candidatesRoot, { recursive: true, force: true });
});

describe('dedicated code materialization', () => {
  it('type-checks and materializes a dedicated bundle into an addressable run', async () => {
    const result = await validateAndMaterializeDedicatedBundle(request, bundle, environment);
    expect(result.receipt).toMatchObject({ status: 'compiled', files: 4, previewUrl: '/generated-runs/dedicated-test-r18/' });
    expect(await readDedicatedRun(bundle.id, environment)).toMatchObject({ title: bundle.id, entryUrl: '/generated/runs-test-r18/dedicated-test-r18/src/experience.ts' });
  });

  it('serializes duplicate materialization without deleting an in-flight build report', async () => {
    const [first, second] = await Promise.all([
      validateAndMaterializeDedicatedBundle(request, bundle, environment),
      validateAndMaterializeDedicatedBundle(request, bundle, environment),
    ]);

    expect(first.receipt.id).toBe(bundle.id);
    expect(second.receipt.id).toBe(bundle.id);
    expect(JSON.parse(await readFile(join(runsRoot, bundle.id, 'build-report.json'), 'utf8'))).toMatchObject({
      receipt: { id: bundle.id, status: 'compiled' },
    });
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

  it('rejects a valid-looking asset declaration when the request approved no assets', async () => {
    const invented = {
      ...bundle,
      id: 'dedicated-invented-asset-r53',
      assets: [{ id: 'invented-asset', path: 'assets/invented.png', kind: 'image', source: 'procedural', required: false }],
    };
    await expect(validateAndMaterializeDedicatedBundle(request, invented, environment)).rejects.toThrow('无素材任务');
  });

  it('saves the raw candidate and recovers two known failures without another model pass', async () => {
    expect(await hasSavedDedicatedCandidate(request, environment)).toBe(false);
    const faulty = {
      ...bundle,
      files: bundle.files.map((file) => file.path === 'src/scene.ts'
        ? {
            ...file,
            path: '/src/scene.ts',
            content: file.content.replace('runtime.render();', 'runtime.scene.background.set(0x123456); runtime.render();'),
          }
        : { ...file, path: `/${file.path}` }),
      assets: [{ id: 'invented-asset', path: '/assets/invented.png', kind: 'image', source: 'procedural', required: false }],
    };
    const progress: DedicatedGenerationProgress[] = [];
    const receipt = await recoverAndMaterializeDedicatedBundle(request, faulty, environment, 'test-r53', (entry) => { progress.push(entry); });
    expect(await hasSavedDedicatedCandidate(request, environment)).toBe(true);
    const artifactDirectory = join(candidatesRoot, request.runId, 'attempt-01');
    const raw = JSON.parse(await readFile(join(artifactDirectory, 'raw-bundle.json'), 'utf8')) as { assets: unknown[] };
    const report = JSON.parse(await readFile(join(artifactDirectory, 'recovery-report.json'), 'utf8')) as {
      status: string;
      repairRounds: Array<{ category: string; actions: string[] }>;
    };
    expect(receipt).toMatchObject({ status: 'compiled', attempts: 1 });
    expect(raw.assets).toHaveLength(1);
    expect(report.status).toBe('recovered');
    expect(report.repairRounds).toHaveLength(2);
    expect(report.repairRounds[0]).toMatchObject({ category: 'bundle-schema' });
    expect(report.repairRounds[1]).toMatchObject({ category: 'typescript' });
    expect(progress.map((entry) => entry.phase)).toEqual(['candidate-saved', 'local-repair', 'local-repair', 'local-recovered']);
    expect(progress.filter((entry) => entry.phase === 'local-repair').every((entry) => entry.maxLocalRepairs === 2)).toBe(true);
  });

  it('stops immediately for a security failure and keeps the diagnostic artifact', async () => {
    const unsafe = {
      ...bundle,
      files: bundle.files.map((file) => file.path === 'src/scene.ts'
        ? { ...file, content: `${file.content}\nfetch('/secret');` }
        : file),
    };
    await expect(recoverAndMaterializeDedicatedBundle(request, unsafe, environment, 'test-r53')).rejects.toThrow('没有安全的确定性修复动作');
    const report = JSON.parse(await readFile(join(candidatesRoot, request.runId, 'attempt-01', 'recovery-report.json'), 'utf8')) as {
      status: string;
      finalCategory: string;
      repairRounds: unknown[];
    };
    expect(report).toMatchObject({ status: 'failed', finalCategory: 'security', repairRounds: [] });
    expect(classifyDedicatedGenerationFailure(new Error('生成文件包含不允许的运行能力：fetch'))).toBe('security');
  });

  it('recovers the observed GeneratedPointer SDK alias error without calling a model', async () => {
    const aliasError = {
      ...bundle,
      files: bundle.files.map((file) => file.path === 'src/director.ts'
        ? {
            ...file,
            content: `import type { GeneratedPointer } from '@signal-lab/experience-sdk';\nexport function pointerX(pointer: GeneratedPointer): number { return pointer.x; }\n${file.content}`,
          }
        : file),
    };
    const receipt = await recoverAndMaterializeDedicatedBundle(request, aliasError, environment, 'test-r54');
    const repaired = await readFile(join(candidatesRoot, request.runId, 'attempt-01', 'repair-01-bundle.json'), 'utf8');
    const report = JSON.parse(await readFile(join(candidatesRoot, request.runId, 'attempt-01', 'recovery-report.json'), 'utf8')) as {
      status: string;
      repairRounds: Array<{ actions: string[] }>;
    };
    expect(receipt.status).toBe('compiled');
    expect(repaired).toContain("GeneratedFrame['pointer']");
    expect(repaired).not.toContain('GeneratedPointer');
    expect(report.status).toBe('recovered');
    expect(report.repairRounds[0]?.actions.join(' ')).toContain('GeneratedPointer');
  });

  it('materializes a lifecycle object returned from mount without source rewriting', async () => {
    const returnedLifecycle = {
      ...bundle,
      id: 'dedicated-returned-lifecycle-r92',
      files: bundle.files.map((file) => file.path === 'src/experience.ts'
        ? {
            ...file,
            content: `import { defineExperience, startExperience } from '@signal-lab/experience-sdk';
startExperience(defineExperience({
  mount(context) {
    const node = document.createElement('div');
    context.container.append(node);
    return {
      update(frame) { node.dataset.progress = String(frame.progress); },
      resize(viewport) { node.dataset.width = String(viewport.width); },
      dispose() { node.remove(); }
    };
  },
  update() {},
  resize() {},
  dispose() {}
}));`,
          }
        : file),
    };
    const result = await validateAndMaterializeDedicatedBundle(request, returnedLifecycle, environment, 'test-r92');
    expect(result.receipt).toMatchObject({ status: 'compiled', previewUrl: '/generated-runs/dedicated-returned-lifecycle-r92/' });
    expect(returnedLifecycle.files.find((file) => file.path === 'src/experience.ts')?.content).toContain('return {');
    expect(returnedLifecycle.files.find((file) => file.path === 'src/experience.ts')?.content).not.toContain('__signalReturnedLifecycle');
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

describe('dedicated visual preflight recovery', () => {
  it('creates one bounded CSS repair for a proven opaque canvas occluder', () => {
    const repair = createCanvasOcclusionRepair(bundle as never, {
      evidence: {
        frames: [{
          canvasOcclusionRisk: true,
          canvasOcclusionRatio: 1,
          canvasOccludingLayer: 'main.ferment-app.is-reduced',
        }],
      },
      assessment: {
        findings: [{ code: 'canvas-occluded', severity: 'blocking' }],
      },
    } as never);
    expect(repair?.path).toBe('src/page.css');
    expect(repair?.content).toContain('signal-local-repair:canvas-occlusion');
    expect(repair?.content).toContain('.ferment-app{background-color:transparent!important;background-image:none!important}');
  });

  it('does not change a candidate without blocking canvas evidence', () => {
    expect(createCanvasOcclusionRepair(bundle as never, {
      evidence: { frames: [] },
      assessment: { findings: [{ code: 'horizontal-overflow', severity: 'major' }] },
    } as never)).toBeNull();
  });

  it('never repairs or recaptures a candidate after the bounded causal probe fails', () => {
    expect(allowsLocalCanvasOcclusionRepair({
      schemaVersion: 1,
      verdict: 'revise',
      score: 72,
      summary: '主因果链没有通过。',
      findings: [{
        code: 'primary-journey-unverified',
        severity: 'major',
        frameId: 'beat-change',
        message: '主体没有随一次真实输入发生变化。'
      }],
      observations: []
    })).toBe(false);
  });

  it('allows one transparency repair when the causal failure is explained by the same blocking occlusion', () => {
    expect(allowsLocalCanvasOcclusionRepair({
      schemaVersion: 1,
      verdict: 'blocked',
      score: 0,
      summary: '主画布被页面根层覆盖。',
      findings: [{
        code: 'canvas-occluded',
        severity: 'blocking',
        frameId: 'opening',
        message: '画布被根层完全覆盖。'
      }, {
        code: 'primary-journey-unverified',
        severity: 'major',
        frameId: 'middle',
        message: '被遮挡的主体无法验证变化。'
      }],
      observations: []
    })).toBe(true);
  });

  it('moves a misplaced visual-anchor marker from an empty proxy onto the actual SDK canvas', () => {
    const anchorBundle = {
      ...bundle,
      files: bundle.files.map((file) => file.path === 'src/experience.ts' ? {
        ...file,
        content: "startExperience(defineExperience({ mount(context) { const root = document.createElement('main'); root.innerHTML = `<div data-signal-visual-anchor></div>`; context.canvas.width = 1; context.container.appendChild(root); }, update() {}, resize() {}, dispose() {} }));",
      } : file),
    };
    const repair = createCanvasVisualAnchorRepair(anchorBundle as never, {
      evidence: { frames: [{ canvasCount: 1, subjectCaptureAvailable: false }] },
      assessment: { findings: [{ code: 'primary-journey-unverified', severity: 'major' }] },
    } as never);
    expect(repair?.path).toBe('src/experience.ts');
    expect(repair?.content).toContain("context.canvas.setAttribute('data-signal-visual-anchor', 'true')");
    expect(repair?.content).not.toContain('<div data-signal-visual-anchor>');
  });

  it('does not run an unrelated canvas repair after a no-giant-heading contract fails', () => {
    expect(allowsLocalCanvasOcclusionRepair({
      schemaVersion: 1,
      verdict: 'revise',
      score: 76,
      summary: '标题违反明确约束。',
      findings: [{
        code: 'heading-dominance-forbidden',
        severity: 'major',
        frameId: 'opening',
        message: '合同明确禁止巨大标题。'
      }],
      observations: []
    })).toBe(false);
  });
});

describe('dedicated authoring contract', () => {
  it('uses a compact four-file response and lets the server supply deterministic bundle metadata', () => {
    const contract = createV2CreativeContract(
      '为社区菜市场设计明亮的当季食材编排台。拖动番茄和蘑菇到晚餐区域时，预算与采购顺序同步变化，最后生成采购单。不要暗色科技、固定三栏或巨型标题。'
    );
    const compactRequest: DedicatedCodeRequest = {
      ...request,
      brief: contract.brief,
      creativeContract: contract,
      reference: {
        ...request.reference,
        assets: [{
          id: 'market-subject',
          uri: '/api/creative/assets/asset-market-subject',
          bundlePath: 'assets/market-subject.png',
          kind: 'image',
          source: 'chatgpt-generated',
          qualityLevel: 'L3-presentable',
          role: '可拖拽当季食材主体',
          description: '番茄与蘑菇透明主体。',
          payloadBytes: 1200,
          features: { alpha: 'soft', depth: 'none' },
          required: true,
          experience: {
            anchor: 0.5, function: 'persistent', visualState: '番茄与蘑菇保持可辨认并能独立移动。',
            continuity: '同一俯视机位、比例和上午自然光。', integration: 'alpha-subject'
          }
        }]
      }
    };
    const prompt = dedicatedCompactCodePrompt(compactRequest, '');
    const responseJsonSchema = JSON.stringify(z.toJSONSchema(dedicatedAuthoringModelResponseSchema, { target: 'draft-7' }));
    expect(responseJsonSchema).not.toContain('oneOf');
    expect(Buffer.byteLength(prompt, 'utf8')).toBeLessThan(14 * 1024);
    expect(prompt).toContain('/api/creative/assets/asset-market-subject');
    expect(prompt).toContain('源码总量目标不超过 18KB');
    expect(prompt).toContain('data-signal-primary-result');
    expect(prompt).toContain('禁止在多个控件里重复铺开整张图集');
    expect(prompt).not.toContain('V2 Codex 执行包（唯一执行边界；完整研究合同只留档）');

    const completed = completeDedicatedAuthoringResponse(compactRequest, { files: bundle.files });
    expect(completed).toMatchObject({
      schemaVersion: 1,
      runId: compactRequest.runId,
      effectSpecId: compactRequest.selectedId,
      files: expect.arrayContaining([expect.objectContaining({ path: 'src/experience.ts' })]),
      assets: [expect.objectContaining({
        id: 'market-subject', path: 'assets/market-subject.png', source: 'generated', required: true
      })],
      contract: {
        sdkVersion: 1,
        imports: ['three', '@signal-lab/experience-sdk'],
        lifecycle: ['mount', 'update', 'resize', 'dispose'],
        network: 'disabled',
        deterministicTimeline: true,
      }
    });
  });

  it('requires URL-driven reduced motion to reach CSS layout state', () => {
    const prompt = dedicatedCodePrompt(request, '');
    expect(prompt).toContain('context.reducedMotion');
    expect(prompt).toContain('motion=reduce');
    expect(prompt).toContain('根节点 class');
  });

  it('requires a legible business loop and real scene changes from high-level controls', () => {
    const semanticContract = createV2CreativeContract(
      '为剧场灯光师设计明亮排练工作台，直接调整灯位和亮度时让舞台光束、照度结果和保存行动同步变化。'
    );
    const prompt = dedicatedCodePrompt({ ...request, creativeContract: semanticContract }, '');
    expect(prompt).toContain('对象→操作→结果闭环');
    expect(prompt).toContain('高层控件');
    expect(prompt).toContain('同步改变 Canvas/Three.js 主体');
    expect(prompt).toContain('data-signal-primary-control');
    expect(prompt).toContain('不能缩成图标');
    expect(prompt).toContain('参数极值');
    expect(prompt).toContain('390px 移动端必须沿纵向完成同一任务路径');
    expect(prompt).toContain('简化模型必须在界面标为“估算”');
    expect(prompt).toContain('首次人工输入后停止');
    expect(prompt).toContain('最终交付层禁止出现箭头、红框');
    expect(prompt).toContain('不得把不匹配的两张素材硬切成装配');
  });

  it('keeps the causal journey and stable subject framing in the real scroll authoring prompt', () => {
    const contract = createV2CreativeContract(
      '为一座城市公共钟表修复档案设计交互网页。开场是一张明亮的修复工作台总览；滚动或拖动时间轴时，同一枚机械钟表从锈蚀、拆解、校准到重新走时连续变化，文字同步解释修复证据，最后行动为预约开放工作日。真实、温暖、编辑档案感，不要暗色科技风、巨型标题或随机粒子。'
    );
    const prompt = dedicatedCodePrompt({ ...request, brief: contract.brief, creativeContract: contract }, '');

    expect(contract.technical.semanticInteraction.selected).toBe(false);
    expect(prompt).toContain('authoring.primaryJourney 是一条因果主线');
    expect(prompt).toContain('不是页面、章节、屏幕或固定 beat 数');
    expect(prompt).toContain('data-signal-visual-anchor');
    expect(prompt).toContain('data-signal-primary-control');
    expect(prompt).toContain('data-signal-primary-result');
    expect(prompt).toContain('data-signal-primary-action');
    expect(prompt).toContain('原生滚动是输入而不是伪造控件');
    expect(prompt).toContain('规范化主体框');
    expect(prompt).toContain('禁止每个状态分别 cover');
    expect(prompt).toContain('copy-only');
    expect(prompt).toContain('crop-jump');
  });

  it('turns a continuous canvas contract into one persistent subject field rather than opaque beat pages', () => {
    const contract = createV2CreativeContract(
      '展示同一张和纸从压痕、靛蓝墨层到朱红套色的连续变化，滚动观察工序，最后预约亲手套印。'
    );
    const prompt = dedicatedCodePrompt({ ...request, brief: contract.brief, creativeContract: contract }, '');

    expect(contract.experience.structure.mode).toBe('continuous-canvas');
    expect(prompt).toContain('opening、middle 与 final 必须持续显示同一个 data-signal-visual-anchor 主体');
    expect(prompt).toContain('禁止用多个不透明的 min-height/full-viewport hero、process、final 面板');
    expect(prompt).toContain('把 authoring.primaryJourney.businessResult 变成可见对象、排列、路径或状态证据');
    expect(prompt).toContain('纯色背景加标题、说明和 CTA');
  });

  it('prevents the two common procedural bundle compile failures', () => {
    const prompt = dedicatedCodePrompt(request, 'type error');
    expect(prompt).toContain('bundle.assets 必须为 []');
    expect(prompt).toContain('禁止直接对 scene.background 调用 set');
  });

  it('keeps a no-asset DOM-only contract free of contradictory Three.js duties', () => {
    const contract = createV2CreativeContract(
      '为社区公告设计一张安静的编辑式网页，阅读摘要后提交反馈。'
    );
    const prompt = dedicatedCodePrompt({ ...request, creativeContract: contract }, '');

    expect(contract.direction.renderer.route).toBe('dom-only');
    expect(prompt).toContain('合同路线为 dom-only');
    expect(prompt).toContain('受控的空增强模块');
    expect(prompt).not.toContain('当前没有获批素材：按合同使用程序化 Three.js 几何');
  });

  it('keeps low-fidelity primitive subjects out of media-led routes', () => {
    const contract = createV2CreativeContract(
      '为普通访客设计古建筑榫卯互动学习网页，使用一张真实木构件摄影照片建立连续空间，最终预约线上拆解课。'
    );
    const prompt = dedicatedCodePrompt({ ...request, creativeContract: contract }, '');

    expect(contract.direction.renderer.route).not.toBe('dom-three-hybrid');
    expect(prompt).toContain('不是 dom-three-hybrid');
    expect(prompt).toContain('禁止用 BoxGeometry');
    expect(prompt).toContain('宁可只使用媒体与 DOM');
  });

  it('requires an inspectable visual anchor for stateful physical changes', () => {
    const contract = createV2CreativeContract(
      '展示两块旧木榫卯从分离、对齐、半插入到完全咬合的连续装配过程。'
    );
    const prompt = dedicatedCodePrompt({ ...request, creativeContract: contract }, '');

    expect(contract.technical.stateAssetStrategy.required).toBe(true);
    expect(prompt).toContain('data-signal-visual-anchor');
    expect(prompt).toContain('只改变文案、箭头、裁切、整体缩放、模糊或镜头位置不能算作实体状态完成');
  });

  it('keeps the four-asset R104 authoring prompt bounded without losing integration duties', () => {
    const contract = createV2CreativeContract(
      '为经常短途出行的人设计“登机箱装箱桌”网页。主视觉是从斜上方拍摄、摊开在真实木桌上的软壳登机箱；衣物、相机、药盒和水杯可独立拖动，重量、安检提醒和装箱单同步更新。最终行动是“生成装箱单”。真实日光桌面摄影与旅行杂志式排版，不要暗色科技、孤立中央产品、巨型标题、随机粒子、固定三屏或仪表盘。'
    );
    const repeatedDescription = '这是只用于运行管理和人工审核的重复长描述，作者不需要它来理解素材职责。'.repeat(4);
    const assets: NonNullable<DedicatedCodeRequest['reference']['assets']> = [
      {
        id: 'r104-environment', uri: '/creative-assets/r104-environment.webp', bundlePath: 'assets/r104-environment.webp',
        kind: 'environment', source: 'chatgpt-generated', qualityLevel: 'L3-presentable', role: 'scene environment',
        description: repeatedDescription, payloadBytes: 8_400_000, features: { alpha: 'none', depth: 'estimated' }, required: true,
        experience: { anchor: 0, function: 'establish', visualState: 'Natural daylight wood packing table.', continuity: 'Same camera and daylight across all states.', integration: 'full-bleed-environment' },
      },
      {
        id: 'r104-suitcase', uri: '/creative-assets/r104-suitcase.png', bundlePath: 'assets/r104-suitcase.png',
        kind: 'image', source: 'chatgpt-generated', qualityLevel: 'L4-cinematic', role: 'open suitcase subject',
        description: repeatedDescription, payloadBytes: 7_100_000, features: { alpha: 'soft', depth: 'estimated' }, required: true,
        experience: { anchor: 0.2, function: 'persistent', visualState: 'Open soft-shell suitcase remains visible.', continuity: 'Same suitcase identity, camera and scale.', integration: 'alpha-subject' },
      },
      {
        id: 'r104-items', uri: '/creative-assets/r104-items.png', bundlePath: 'assets/r104-items.png',
        kind: 'image', source: 'chatgpt-generated', qualityLevel: 'L3-presentable', role: 'draggable packing items foreground',
        description: repeatedDescription, payloadBytes: 6_600_000, features: { alpha: 'soft', depth: 'none' }, required: true,
        experience: { anchor: 0.48, function: 'transform', visualState: 'Clothes, camera, medicine and bottle stay separable.', continuity: 'Objects share the suitcase camera and daylight.', integration: 'alpha-subject' },
      },
      {
        id: 'r104-depth', uri: '/creative-assets/r104-depth.webp', bundlePath: 'assets/r104-depth.webp',
        kind: 'texture', source: 'model-generated', qualityLevel: 'L2-inspectable', role: 'scene depth field',
        description: repeatedDescription, payloadBytes: 4_200_000, features: { alpha: 'none', depth: 'authored' }, required: true,
        experience: { anchor: 0.7, function: 'develop', visualState: 'Soft depth connects luggage and tabletop.', continuity: 'Aligned to the same master camera.', integration: 'seamless-field' },
      },
    ];
    const prompt = dedicatedCodePrompt({
      ...request,
      brief: contract.brief,
      quality: 'high',
      creativeContract: contract,
      reference: {
        ...request.reference,
        theme: { legacyDarkBackdrop: '#050509', legacyPurpleAccent: '#7b2cff' },
        assets,
      },
    }, '');

    expect(Buffer.byteLength(prompt, 'utf8')).toBeLessThan(27 * 1024);
    for (const asset of assets) {
      expect(prompt).toContain(asset.uri);
      expect(prompt).toContain(asset.bundlePath);
      expect(prompt).toContain(`"role":"${asset.role}"`);
      expect(prompt).toContain(`"integration":"${asset.experience?.integration}"`);
    }
    expect(prompt).toContain('"qualityLevel":"L4-cinematic"');
    expect(prompt).toContain('"features":{"alpha":"none","depth":"estimated"}');
    expect(prompt).not.toContain('"payloadBytes"');
    expect(prompt).not.toContain(repeatedDescription);
    expect(prompt).not.toContain('已有方向仅供理解、不得复制运行时');
    expect(prompt).not.toContain('legacyDarkBackdrop');
    expect(prompt).not.toContain('#050509');
  });
});
