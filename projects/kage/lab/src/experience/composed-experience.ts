import type { CameraShot, ExperienceManifest, ExperienceNode, SceneStateValue } from './schema';
import { assertExperienceManifest } from './validator';

interface ComposedNode {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ExperienceNode['layout'];
  eye: CameraShot['eye'];
  look: CameraShot['look'];
  state: SceneStateValue;
  type: ExperienceNode['type'];
}

const specs: readonly ComposedNode[] = [
  {
    id: 'origin', nav: '建立', kicker: '01 / ORIGIN', title: '一句想法先形成空间骨架',
    paragraphs: ['这不是固定页面模板，而是 EffectSpec 编译出的主体、场域、氛围和运动参数。', '此演示使用程序化主体验证运行时，真实素材仍由生产计划单独追踪。'],
    layout: 'left', eye: [-7.5, 3.1, 12.8], look: [0, 1.2, 0],
    state: { assembly: .14, energy: .2, density: .28, fog: .72, accent: '#77e7ff', focus: 'origin' }, type: 'hero'
  },
  {
    id: 'compose', nav: '组合', kicker: '02 / COMPOSE', title: '场景语法随效果目标改变',
    paragraphs: ['主体形态、材质、实例场、地面、光环和运动强度都来自同一份结构化效果规格。', '质量档位只改变预算，不改变创意意图和可读内容。'],
    layout: 'right', eye: [6.2, 4.8, 8.4], look: [0, 1.4, 0],
    state: { assembly: .66, energy: .72, density: .74, fog: .32, accent: '#f4c782', focus: 'composition' }, type: 'showcase'
  },
  {
    id: 'resolve', nav: '收束', kicker: '03 / RESOLVE', title: '最终画面留下可解释的记忆点',
    paragraphs: ['模型决定效果目标，编译器提供可验证的运行边界，Three.js 负责实时呈现。', '尚未生产的图片、模型或声音会继续显示为缺口，而不是被默认几何体掩盖。'],
    layout: 'center', eye: [0, 7.2, 11.6], look: [0, 1.5, 0],
    state: { assembly: 1, energy: .94, density: 1, fog: .12, accent: '#9fffd7', focus: 'resolve' }, type: 'cta'
  }
];

const nodes: Record<string, ExperienceNode> = {};
const cameraTracks: Record<string, ExperienceManifest['cameraTracks'][string]> = {};
const sceneTracks: Record<string, ExperienceManifest['sceneTracks'][string]> = {};

for (const spec of specs) {
  const cameraId = `camera:${spec.id}`;
  const sceneId = `scene:${spec.id}`;
  const shot: CameraShot = { eye: spec.eye, look: spec.look, fov: spec.layout === 'center' ? 48 : 43, portrait: { eye: [spec.eye[0] * .58, spec.eye[1] + .8, spec.eye[2] + 4.2], look: spec.look, fov: 55 }, transition: 'glide' };
  nodes[spec.id] = {
    id: spec.id, type: spec.type, layout: spec.layout,
    content: { navLabel: spec.nav, kicker: spec.kicker, title: spec.title, paragraphs: spec.paragraphs, overlay: { kind: spec.type === 'cta' ? 'quote' : 'metric', value: spec.id === 'origin' ? 'IDEA' : spec.id === 'compose' ? 'RECIPE' : 'RUNTIME', caption: 'EffectSpec → Three.js' } },
    span: { mode: 'viewport', value: spec.layout === 'center' ? 126 : 144 }, tracks: { camera: cameraId, scene: sceneId }, sceneId: 'main', effectIds: []
  };
  cameraTracks[cameraId] = { id: cameraId, keyframes: [{ at: 0, value: shot }] };
  sceneTracks[sceneId] = { id: sceneId, keyframes: [{ at: 0, value: spec.state }] };
}

export const composedExperience = assertExperienceManifest({
  schemaVersion: 2,
  id: 'composed-world',
  title: '组合声场',
  summary: '验证 EffectSpec 驱动的主体、实例场、氛围与运动组合场景。',
  audience: '创意生成系统 / 沉浸网页原型',
  entryNodeId: specs[0].id,
  theme: { deep: '#071018', surface: '#10262e', text: '#effff9', muted: '#98b9b7', accent: '#77e7ff', accentSoft: '#f4c782' },
  nodes,
  flows: specs.slice(0, -1).map((spec, index) => ({ id: `flow:${spec.id}:${specs[index + 1].id}`, from: spec.id, to: specs[index + 1].id, trigger: { type: 'scroll-complete' as const }, transition: { type: 'glide' as const, duration: 1 } })),
  drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
  scenes: {
    main: {
      id: 'main', plugin: 'composed-world', preset: 'effect-spec-demo', seed: 173, effectPlugins: [],
      recipe: {
        version: 1, sourceEffectSpecId: 'fixture-composed-audio',
        hero: { form: 'knot', material: 'emissive', scale: 1.72 },
        field: { form: 'stream', count: 88, radius: 7.2 },
        atmosphere: { floor: true, halo: true, fogScale: .82 },
        motion: { rotation: .34, pulse: .62, drift: .42, pointer: .68 },
        omittedAssetRequirements: 2
      }
    }
  },
  cameraTracks,
  sceneTracks,
  accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
});
