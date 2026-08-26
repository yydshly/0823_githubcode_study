import type { CameraShot, ExperienceManifest, ExperienceNode, SceneStateValue, TrackKeyframe } from './schema';
import { assertExperienceManifest } from './validator';

interface ArchiveNode {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ExperienceNode['layout'];
  type: ExperienceNode['type'];
  state: SceneStateValue;
  shots: readonly TrackKeyframe<CameraShot>[];
  overlay: NonNullable<ExperienceNode['content']['overlay']>;
}

const shot = (eye: CameraShot['eye'], look: CameraShot['look'], fov = 40): CameraShot => ({
  eye, look, fov,
  portrait: { eye: [eye[0] * 0.38, eye[1] + 0.28, eye[2] + 2.8], look: [1.4, look[1], look[2]], fov: 50 },
  transition: 'glide'
});

const specs: readonly ArchiveNode[] = [
  {
    id: 'descend', nav: '下潜', kicker: '01 / DESCEND', title: '有些记忆，只能在安静里被看见。',
    paragraphs: ['这是一个关于海洋记忆的数字档案入口。访问者不是翻阅列表，而是进入一片由证据、距离和微光构成的水下空间。', '模型生成承担氛围与材质的主视觉；语义内容仍由真实 DOM 保存。'],
    layout: 'left', type: 'hero',
    state: { assembly: 0.18, energy: 0.2, density: 0.34, fog: 0.66, accent: '#7bdce5', focus: 'descent' },
    shots: [{ at: 0, value: shot([-0.7, 0.3, 6.15], [0.7, 0.1, -4], 43) }, { at: 1, value: shot([-0.15, 0.12, 5.65], [1.05, 0.1, -4], 41), easing: 'smootherstep' }],
    overlay: { kind: 'quote', value: 'MEMORY HAS DEPTH', caption: 'Generated environment / semantic archive' }
  },
  {
    id: 'index', nav: '索引', kicker: '02 / INDEX', title: '每一块微光，都是一条可以追溯的证据。',
    paragraphs: ['玻璃档案片不模拟真实文物，而是表达记录之间的空间关系：远近代表时间，连线代表共同来源。', '指针只提供细微水流视差，滚动才负责改变观看位置。'],
    layout: 'right', type: 'showcase',
    state: { assembly: 0.5, energy: 0.48, density: 0.58, fog: 0.42, accent: '#a9eff0', focus: 'plates' },
    shots: [{ at: 0, value: shot([0.2, 0.16, 5.55], [1.2, 0.08, -4], 40) }, { at: 1, value: shot([1.05, 0.5, 5.08], [1.8, 0.2, -4], 37), easing: 'smootherstep' }],
    overlay: { kind: 'diagram', value: 'SOURCE / TIME / RELATION', caption: 'Evidence becomes spatial structure' }
  },
  {
    id: 'trace', nav: '追迹', kicker: '03 / TRACE', title: '沿着一条线，回到声音发生的地方。',
    paragraphs: ['薄线从远处汇聚到主体，场景中的能量与密度逐渐提高，但镜头保持克制，让关系本身成为记忆点。', '低画质会减少粒子、档案片和连线；减弱动效会停在稳定构图。'],
    layout: 'left', type: 'story',
    state: { assembly: 0.78, energy: 0.82, density: 0.84, fog: 0.24, accent: '#e8d2a6', focus: 'threads' },
    shots: [{ at: 0, value: shot([1.02, 0.48, 5.06], [1.78, 0.2, -4], 37) }, { at: 1, value: shot([0.24, -0.14, 4.72], [1.35, 0.02, -4], 38), easing: 'smootherstep' }],
    overlay: { kind: 'metric', value: '03', caption: 'Memory threads converge' }
  },
  {
    id: 'surface', nav: '浮现', kicker: '04 / SURFACE', title: '把沉入海底的记录，重新带回公共视野。',
    paragraphs: ['最终页面不是海洋题材模板，而是一次具体目标驱动的组合：生成环境、深度纹理、档案隐喻、滚动镜头和可访问内容。', '换一个想法，空间形式、素材路线和互动方式都应重新决定。'],
    layout: 'center', type: 'cta',
    state: { assembly: 1, energy: 0.94, density: 1, fog: 0.1, accent: '#d8fbf5', focus: 'surface' },
    shots: [{ at: 0, value: shot([0.22, -0.14, 4.72], [1.35, 0.02, -4], 38) }, { at: 1, value: shot([0.52, 0.42, 5.18], [1.55, 0.16, -4], 41), easing: 'smootherstep' }],
    overlay: { kind: 'quote', value: 'RETURN WHAT WAS ALMOST LOST', caption: 'A complete idea-specific webpage' }
  }
];

const nodes: Record<string, ExperienceNode> = {};
const cameraTracks: Record<string, ExperienceManifest['cameraTracks'][string]> = {};
const sceneTracks: Record<string, ExperienceManifest['sceneTracks'][string]> = {};

for (const spec of specs) {
  const cameraId = `camera:${spec.id}`;
  const sceneId = `scene:${spec.id}`;
  nodes[spec.id] = {
    id: spec.id, type: spec.type, layout: spec.layout,
    content: { navLabel: spec.nav, kicker: spec.kicker, title: spec.title, paragraphs: spec.paragraphs, overlay: spec.overlay },
    span: { mode: 'viewport', value: spec.type === 'cta' ? 132 : 150 },
    tracks: { camera: cameraId, scene: sceneId }, sceneId: 'main', effectIds: []
  };
  cameraTracks[cameraId] = { id: cameraId, keyframes: spec.shots };
  sceneTracks[sceneId] = { id: sceneId, keyframes: [{ at: 0, value: spec.state }] };
}

export const tidalArchiveExperience = assertExperienceManifest({
  schemaVersion: 2,
  id: 'tidal-archive',
  title: '潮汐记忆档案',
  summary: '让模型生成水下记忆世界，再由 Three.js 把深度、档案关系和微光运动变成可进入的叙事。',
  audience: 'OCEAN MEMORY ARCHIVE / IMMERSIVE EXHIBITION',
  entryNodeId: specs[0].id,
  theme: { deep: '#031219', surface: '#0b2830', text: '#eefbf8', muted: '#88aeb1', accent: '#7bdce5', accentSoft: '#e8d2a6' },
  presentation: {
    brandLabel: 'PELAGIC ARCHIVE / 02',
    footerLabel: 'DESCEND / INDEX / TRACE / RETURN',
    footerCopy: '生成素材负责不可替代的氛围和材质；Three.js 负责深度、关系、镜头与互动。'
  },
  nodes,
  flows: specs.slice(0, -1).map((spec, index) => ({ id: `flow:${spec.id}:${specs[index + 1].id}`, from: spec.id, to: specs[index + 1].id, trigger: { type: 'scroll-complete' as const }, transition: { type: 'glide' as const, duration: 1.25 } })),
  drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
  scenes: {
    main: {
      id: 'main', plugin: 'tidal-archive', preset: 'generated-ocean-memory', seed: 409, effectPlugins: [],
      assets: [
        { id: 'chatgpt-tidal-archive-hero-v1', role: 'hero-color', modality: 'image', uri: '/assets/tidal-archive/chatgpt-tidal-archive-hero-v1.png', source: 'model-generated', qualityLevel: 'L3-presentable', payloadBytes: 1894039 },
        { id: 'chatgpt-tidal-archive-depth-v1', role: 'hero-depth', modality: 'texture', uri: '/assets/tidal-archive/chatgpt-tidal-archive-depth-v1.png', source: 'model-generated', qualityLevel: 'L3-presentable', payloadBytes: 1261366 }
      ],
      postprocess: { type: 'bloom', strength: 0.42, radius: 0.3, threshold: 0.76 }
    }
  },
  cameraTracks,
  sceneTracks,
  accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
});
