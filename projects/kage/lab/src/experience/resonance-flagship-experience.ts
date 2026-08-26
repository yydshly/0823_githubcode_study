import type { CameraShot, ExperienceManifest, ExperienceNode, SceneStateValue, TrackKeyframe } from './schema';
import { assertExperienceManifest } from './validator';

interface FlagshipNode {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ExperienceNode['layout'];
  state: SceneStateValue;
  shots: readonly TrackKeyframe<CameraShot>[];
  type: ExperienceNode['type'];
  overlay: NonNullable<ExperienceNode['content']['overlay']>;
}

const shot = (eye: CameraShot['eye'], look: CameraShot['look'], fov = 40): CameraShot => ({
  eye, look, fov,
  portrait: { eye: [eye[0] * .42, eye[1] + .2, eye[2] + 2.4], look: [1.5, look[1], look[2]], fov: 48 },
  transition: 'glide'
});

const blendState = (from: SceneStateValue, to: SceneStateValue, amount: number): SceneStateValue => ({
  assembly: from.assembly + (to.assembly - from.assembly) * amount,
  energy: from.energy + (to.energy - from.energy) * amount,
  density: from.density + (to.density - from.density) * amount,
  fog: from.fog + (to.fog - from.fog) * amount,
  accent: amount < 0.45 ? from.accent : to.accent,
  focus: to.focus
});

const openingState = (target: SceneStateValue): SceneStateValue => ({
  assembly: Math.max(0.08, target.assembly * 0.48),
  energy: Math.max(0.1, target.energy * 0.5),
  density: Math.max(0.16, target.density * 0.56),
  fog: Math.min(0.72, target.fog + 0.14),
  accent: target.accent,
  focus: target.focus
});

const restingState = (target: SceneStateValue): SceneStateValue => ({
  ...target,
  energy: target.focus === 'release' ? 0.78 : target.energy * 0.88,
  fog: Math.min(0.72, target.fog + 0.025)
});

const nodesSpec: readonly FlagshipNode[] = [
  {
    id: 'listen', nav: '聆听', kicker: '01 / LISTEN', title: '先说出一种感觉。',
    paragraphs: ['不是选择模板，也不是调整一组预设。你描述想让人听见、看见和记住的东西。', '系统先理解意图，再决定声音、画面、空间和节奏如何共同出现。'],
    layout: 'left', type: 'hero',
    state: { assembly: .22, energy: .24, density: .38, fog: .54, accent: '#7ddff2', focus: 'listening' },
    shots: [{ at: 0, value: shot([-.9, .22, 5.9], [.5, .1, -4], 42) }, { at: 1, value: shot([-.35, .08, 5.45], [.85, .08, -4], 40), easing: 'smootherstep' }],
    overlay: { kind: 'quote', value: 'INTENT → ATMOSPHERE', caption: 'Natural-language direction' }
  },
  {
    id: 'shape', nav: '塑形', kicker: '02 / SHAPE', title: '让声音拥有形状。',
    paragraphs: ['模型生成可承担画面质量的主视觉与深度信息，Three.js 把它重新变成可进入、可响应的空间。', '近处的玻璃、内部声纹和远处的共振场拥有不同位移，不再是一张静止背景图。'],
    layout: 'right', type: 'showcase',
    state: { assembly: .58, energy: .62, density: .68, fog: .3, accent: '#a8ecff', focus: 'depth' },
    shots: [{ at: 0, value: shot([.3, .16, 5.35], [1.25, .08, -4], 39) }, { at: 1, value: shot([1.05, .38, 4.95], [1.85, .18, -4], 37), easing: 'smootherstep' }],
    overlay: { kind: 'metric', value: 'COLOR + DEPTH', caption: 'Model-generated spatial asset pair' }
  },
  {
    id: 'direct', nav: '导演', kicker: '03 / DIRECT', title: '让每次运动都有理由。',
    paragraphs: ['滚动推进镜头，指针改变视差，能量只在叙事需要时增强。所有到达使用同一缓动族，切换前后的运动方向保持连续。', '低画质会减少顶点和粒子，减弱动效会冻结到稳定英雄构图。'],
    layout: 'left', type: 'story',
    state: { assembly: .82, energy: .86, density: .86, fog: .18, accent: '#f1bd76', focus: 'direction' },
    shots: [{ at: 0, value: shot([1.02, .38, 4.95], [1.82, .18, -4], 37) }, { at: 1, value: shot([.2, -.08, 4.72], [1.35, .02, -4], 38), easing: 'smootherstep' }],
    overlay: { kind: 'diagram', value: 'SCROLL / POINTER / HOLD', caption: 'One motion family' }
  },
  {
    id: 'release', nav: '呈现', kicker: '04 / RELEASE', title: '把想法，变成一种现场。',
    paragraphs: ['最终产物不是某个固定 Demo 的换色版本，而是目标、素材、代码和评审共同收敛出的网页体验。', '继续描述新的产品、新的情绪或新的世界，系统将重新选择资产和呈现方式。'],
    layout: 'center', type: 'cta',
    state: { assembly: 1, energy: .96, density: 1, fog: .08, accent: '#c9f7ff', focus: 'release' },
    shots: [{ at: 0, value: shot([.18, -.08, 4.72], [1.35, .02, -4], 38) }, { at: 1, value: shot([.55, .34, 5.12], [1.5, .15, -4], 40), easing: 'smootherstep' }],
    overlay: { kind: 'quote', value: 'DESCRIBE THE NEXT WORLD', caption: 'Natural language → flagship experience' }
  }
];

const nodes: Record<string, ExperienceNode> = {};
const cameraTracks: Record<string, ExperienceManifest['cameraTracks'][string]> = {};
const sceneTracks: Record<string, ExperienceManifest['sceneTracks'][string]> = {};

let previousRest: SceneStateValue | null = null;
for (const spec of nodesSpec) {
  const cameraId = `camera:${spec.id}`;
  const sceneId = `scene:${spec.id}`;
  const entry = previousRest ? blendState(previousRest, spec.state, 0.24) : openingState(spec.state);
  const rest = restingState(spec.state);
  nodes[spec.id] = {
    id: spec.id, type: spec.type, layout: spec.layout,
    content: { navLabel: spec.nav, kicker: spec.kicker, title: spec.title, paragraphs: spec.paragraphs, overlay: spec.overlay },
    span: { mode: 'viewport', value: spec.type === 'cta' ? 132 : 150 }, tracks: { camera: cameraId, scene: sceneId }, sceneId: 'main', effectIds: []
  };
  cameraTracks[cameraId] = { id: cameraId, keyframes: spec.shots };
  sceneTracks[sceneId] = { id: sceneId, keyframes: [
    { at: 0, value: entry },
    { at: 0.72, value: spec.state, easing: 'smootherstep' },
    { at: 1, value: rest, easing: 'smoothstep' }
  ] };
  previousRest = rest;
}

export const resonanceFlagshipExperience = assertExperienceManifest({
  schemaVersion: 2,
  id: 'resonance-flagship',
  title: '声之形',
  summary: '描述一种期望，让模型生成视觉资产，再由 Three.js 把它导演成可进入的产品现场。',
  audience: 'AI SOUND INSTRUMENT / FLAGSHIP EXPERIENCE',
  entryNodeId: nodesSpec[0].id,
  theme: { deep: '#05090d', surface: '#0d171d', text: '#edf7f8', muted: '#87979d', accent: '#7ddff2', accentSoft: '#e5b672' },
  presentation: {
    brandLabel: 'RESONANCE / 01',
    footerLabel: 'DESCRIBE / GENERATE / DIRECT / REVIEW',
    footerCopy: '模型负责生成承担视觉质量的素材；Three.js 负责空间、镜头、互动与最终现场。'
  },
  nodes,
  flows: nodesSpec.slice(0, -1).map((spec, index) => ({ id: `flow:${spec.id}:${nodesSpec[index + 1].id}`, from: spec.id, to: nodesSpec[index + 1].id, trigger: { type: 'scroll-complete' as const }, transition: { type: 'glide' as const, duration: 1.2 } })),
  drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
  scenes: {
    main: {
      id: 'main', plugin: 'resonance-flagship', preset: 'model-depth-cinematic', seed: 241, effectPlugins: [],
      assets: [
        { id: 'chatgpt-resonance-hero-v1', role: 'hero-color', modality: 'image', uri: '/assets/flagship/chatgpt-resonance-hero-v1.png', source: 'model-generated', qualityLevel: 'L3-presentable', payloadBytes: 1678858 },
        { id: 'chatgpt-resonance-depth-v1', role: 'hero-depth', modality: 'texture', uri: '/assets/flagship/chatgpt-resonance-depth-v1.png', source: 'model-generated', qualityLevel: 'L3-presentable', payloadBytes: 920201 }
      ],
      postprocess: { type: 'bloom', strength: .52, radius: .34, threshold: .72 }
    }
  },
  cameraTracks,
  sceneTracks,
  accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
});
