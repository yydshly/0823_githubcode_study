import type { CameraShot, ExperienceManifest, ExperienceNode, SceneStateValue } from './schema';
import { assertExperienceManifest } from './validator';

interface TideNodeSpec {
  id: string;
  nav: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ExperienceNode['layout'];
  eye: CameraShot['eye'];
  look: CameraShot['look'];
  state: SceneStateValue;
  overlay: NonNullable<ExperienceNode['content']['overlay']>;
  type: ExperienceNode['type'];
}

const specs: readonly TideNodeSpec[] = [
  {
    id: 'hush', nav: '静默', kicker: '01 / HUSH', title: '先让色彩保持距离',
    paragraphs: ['这条视觉路线不建立物体陈列，而是用低密度光幕形成一段尚未命名的情绪。', 'DOM 仍负责说明，Shader 只负责空间记忆与气氛。'],
    layout: 'left', eye: [-6.8, 2.4, 11.5], look: [0, .4, -1.2],
    state: { assembly: .08, energy: .14, density: .22, fog: .66, accent: '#8ad8ff', focus: 'veil' },
    overlay: { kind: 'metric', value: '08%', caption: '低显现度' }, type: 'hero'
  },
  {
    id: 'bloom', nav: '显色', kicker: '02 / BLOOM', title: '让光幕在滚动中显现',
    paragraphs: ['顶点着色器改变光幕形态，片元着色器叠加冷暖色层。', '相机、显现度、密度与能量仍然由同一套时间轨道解释。'],
    layout: 'right', eye: [6.4, 3.6, 8.5], look: [.4, .6, -1.4],
    state: { assembly: .46, energy: .5, density: .55, fog: .38, accent: '#ff88d6', focus: 'ribbons' },
    overlay: { kind: 'diagram', value: 'VERTEX → WAVE → COLOR', caption: 'Shader 视觉链' }, type: 'showcase'
  },
  {
    id: 'fold', nav: '折光', kicker: '03 / FOLD', title: '空间不必总像一个展厅',
    paragraphs: ['多层半透明平面产生前后关系，但观感更接近平面设计、时装影像和数字材质。', '这证明场景插件可以改变视觉语法，而不只是切换 preset。'],
    layout: 'left', eye: [-3.8, 5.2, 5.8], look: [.5, .8, -1.2],
    state: { assembly: .78, energy: .82, density: .76, fog: .22, accent: '#b89cff', focus: 'prism' },
    overlay: { kind: 'quote', value: 'SPACE CAN FEEL GRAPHIC', caption: '第二种视觉语法' }, type: 'comparison'
  },
  {
    id: 'afterglow', nav: '余辉', kicker: '04 / AFTERGLOW', title: '以稳定构图留下最终印象',
    paragraphs: ['最后阶段收束运动、强化核心与色彩关系，让视觉变化服务于一个可记忆的结尾。', '后续生成器可以根据“梦幻、编辑感、流体、时装”等意图选择这类能力。'],
    layout: 'center', eye: [0, 6.4, 10.8], look: [.4, .8, -1.4],
    state: { assembly: 1, energy: .92, density: .94, fog: .12, accent: '#ffd1f1', focus: 'afterglow' },
    overlay: { kind: 'metric', value: 'GPU', caption: '质量感知 Shader 世界' }, type: 'cta'
  }
];

const nodes: Record<string, ExperienceNode> = {};
const cameraTracks: ExperienceManifest['cameraTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};
const sceneTracks: ExperienceManifest['sceneTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};

for (const spec of specs) {
  const cameraId = `camera:${spec.id}`;
  const sceneId = `scene:${spec.id}`;
  nodes[spec.id] = {
    id: spec.id, type: spec.type, layout: spec.layout,
    content: { navLabel: spec.nav, kicker: spec.kicker, title: spec.title, paragraphs: spec.paragraphs, overlay: spec.overlay },
    span: { mode: 'viewport', value: spec.layout === 'center' ? 126 : 142 },
    tracks: { camera: cameraId, scene: sceneId }, sceneId: 'main', effectIds: []
  };
  cameraTracks[cameraId] = {
    id: cameraId,
    keyframes: [{ at: 0, value: { eye: spec.eye, look: spec.look, fov: spec.layout === 'center' ? 48 : 43, portrait: { eye: [spec.eye[0] * .55, spec.eye[1] + .9, spec.eye[2] + 4.4], look: spec.look, fov: 55 }, transition: 'glide' } }]
  };
  sceneTracks[sceneId] = { id: sceneId, keyframes: [{ at: 0, value: spec.state }] };
}

export const chromaticExperience = assertExperienceManifest({
  schemaVersion: 2,
  id: 'chromatic-tide',
  title: '色潮织境',
  summary: '用 Shader 光幕验证与空间信号场本质不同的创意方向。',
  audience: '时装发布 / 数字艺术 / 情绪化产品首发',
  entryNodeId: 'hush',
  theme: { deep: '#0b0918', surface: '#221a38', text: '#fff5ff', muted: '#baaeca', accent: '#8ad8ff', accentSoft: '#ff9ddd' },
  nodes,
  flows: specs.slice(0, -1).map((spec, index) => ({ id: `flow:${spec.id}:${specs[index + 1].id}`, from: spec.id, to: specs[index + 1].id, trigger: { type: 'scroll-complete' as const }, transition: { type: 'glide' as const, duration: 1 } })),
  drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
  scenes: { main: { id: 'main', plugin: 'chromatic-tide', preset: 'silk-current', seed: 131, effectPlugins: [] } },
  cameraTracks,
  sceneTracks,
  accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
});
