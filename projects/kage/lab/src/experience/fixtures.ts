import type {
  CameraShot,
  ExperienceFlow,
  ExperienceManifest,
  ExperienceNode,
  SceneStateValue,
  ThemeTokens,
  TrackKeyframe
} from './schema';
import { assertExperienceManifest } from './validator';
import { chromaticExperience } from './chromatic-experience';
import { composedExperience } from './composed-experience';
import { tidalArchiveExperience } from './tidal-archive-experience';
import { resonanceFlagshipExperience } from './resonance-flagship-experience';

interface NodeSpec {
  id: string;
  navLabel: string;
  kicker: string;
  title: string;
  paragraphs: readonly string[];
  layout: ExperienceNode['layout'];
  eye: CameraShot['eye'];
  look: CameraShot['look'];
  state: SceneStateValue;
  overlay: NonNullable<ExperienceNode['content']['overlay']>;
  type?: ExperienceNode['type'];
  span?: number;
  cameraKeyframes?: readonly TrackKeyframe<CameraShot>[];
  sceneKeyframes?: readonly TrackKeyframe<SceneStateValue>[];
}

interface ExperienceSpec {
  id: string;
  title: string;
  summary: string;
  audience: string;
  theme: ThemeTokens;
  preset: string;
  seed: number;
}

const shot = (node: NodeSpec): CameraShot => ({
  eye: node.eye,
  look: node.look,
  fov: node.layout === 'center' ? 48 : 42,
  portrait: {
    eye: [node.eye[0] * 0.7, node.eye[1] + 1.1, node.eye[2] + 4.2],
    look: node.look,
    fov: 54
  },
  transition: 'glide'
});

function buildExperience(
  meta: ExperienceSpec,
  specs: readonly NodeSpec[],
  flows?: readonly ExperienceFlow[]
): ExperienceManifest {
  const nodes: Record<string, ExperienceNode> = {};
  const cameraTracks: ExperienceManifest['cameraTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};
  const sceneTracks: ExperienceManifest['sceneTracks'] extends Readonly<Record<string, infer T>> ? Record<string, T> : never = {};

  for (const item of specs) {
    const cameraTrackId = `camera:${item.id}`;
    const sceneTrackId = `scene:${item.id}`;
    nodes[item.id] = {
      id: item.id,
      type: item.type ?? 'story',
      content: {
        navLabel: item.navLabel,
        kicker: item.kicker,
        title: item.title,
        paragraphs: item.paragraphs,
        overlay: item.overlay
      },
      layout: item.layout,
      span: { mode: 'viewport', value: item.span ?? (item.layout === 'center' ? 118 : 138) },
      tracks: { camera: cameraTrackId, scene: sceneTrackId },
      sceneId: 'main',
      effectIds: ['signal-field']
    };
    cameraTracks[cameraTrackId] = { id: cameraTrackId, keyframes: item.cameraKeyframes ?? [{ at: 0, value: shot(item) }] };
    sceneTracks[sceneTrackId] = { id: sceneTrackId, keyframes: item.sceneKeyframes ?? [{ at: 0, value: item.state }] };
  }

  const linearFlows = specs.slice(0, -1).map((item, index): ExperienceFlow => ({
    id: `flow:${item.id}:${specs[index + 1].id}`,
    from: item.id,
    to: specs[index + 1].id,
    trigger: { type: 'scroll-complete' },
    transition: { type: 'glide', duration: 1 }
  }));

  return assertExperienceManifest({
    schemaVersion: 2,
    id: meta.id,
    title: meta.title,
    summary: meta.summary,
    audience: meta.audience,
    entryNodeId: specs[0].id,
    theme: meta.theme,
    nodes,
    flows: flows ?? linearFlows,
    drivers: [{ id: 'scroll', type: 'scroll', primary: true }],
    scenes: {
      main: { id: 'main', plugin: 'signal-world', preset: meta.preset, seed: meta.seed, effectPlugins: ['signal-field'] }
    },
    cameraTracks,
    sceneTracks,
    accessibility: { fallbackMode: 'semantic-dom', reducedMotion: 'static-shot' }
  });
}

const observatory = buildExperience({
  id: 'observatory', title: '信号观测站', summary: '把一次品牌发布拆成可导演、可验证的空间叙事。', audience: '品牌发布 / 产品叙事',
  theme: { deep: '#08131f', surface: '#102536', text: '#ecf8ef', muted: '#9ab3b5', accent: '#79e7c4', accentSoft: '#f0c88d' },
  preset: 'signal-field', seed: 17
}, [
  { id: 'receive', navLabel: '噪声', kicker: '01 / RECEIVE', title: '先听见尚未成形的信号', paragraphs: ['复杂产品往往不是缺少信息，而是缺少一条能让人记住的观看路径。', '这里的正文先于三维场景存在；空间只负责建立节奏、尺度和注意力。'], layout: 'left', eye: [-8, 4.5, 12], look: [0, 1.2, 0], state: { assembly: .16, energy: .2, density: .28, fog: .72, accent: '#79e7c4', focus: 'fragments' }, overlay: { kind: 'metric', value: '01', caption: '语义内容先落地' }, type: 'hero' },
  { id: 'calibrate', navLabel: '校准', kicker: '02 / CALIBRATE', title: '把镜头、内容与状态放进同一份配置', paragraphs: ['每个节点只引用相机轨道和场景轨道，导演意图不再散落在事件回调里。', '插入新节点时，引擎无需跟着改写。'], layout: 'right', eye: [8.5, 3.2, 9], look: [0, .7, 0], state: { assembly: .42, energy: .44, density: .5, fog: .52, accent: '#f0c88d', focus: 'orbit' }, overlay: { kind: 'diagram', value: 'GRAPH → TRACKS → WORLD', caption: '可组合导演数据流' } },
  { id: 'resonate', navLabel: '共振', kicker: '03 / RESONATE', title: '让视觉反馈服务于理解', paragraphs: ['滚动只提供进度，镜头曲线和场景混合保持独立。', '质量档、减弱动效和无 WebGL 回退共享同一份节点内容。'], layout: 'left', eye: [-6.5, 6.1, 5.5], look: [0, 1, -.5], state: { assembly: .7, energy: .76, density: .74, fog: .32, accent: '#79e7c4', focus: 'core' }, overlay: { kind: 'metric', value: '3×', caption: '多种体验复用同一运行时' } },
  { id: 'transmit', navLabel: '释放', kicker: '04 / TRANSMIT', title: '把一次作品变成持续可扩展的系统', paragraphs: ['品牌样板验证叙事价值，导演台沉淀生产能力，随后才能可靠接入游戏、展陈和 AI 辅助。', '扩展从清晰的数据契约开始，而不是从复制一个成片开始。'], layout: 'center', eye: [0, 8.5, 13], look: [0, 1, 0], state: { assembly: 1, energy: 1, density: 1, fog: .18, accent: '#f0c88d', focus: 'transmission' }, overlay: { kind: 'quote', value: 'STORY IS A SYSTEM', caption: '首个原创垂直切片' }, type: 'cta' }
]);

const archive = buildExperience({
  id: 'archive', title: '漂移档案库', summary: '用同一运行时验证数字展陈与知识节点叙事。', audience: '数字展陈 / 文化教育',
  theme: { deep: '#11111b', surface: '#26243a', text: '#fff7e8', muted: '#bdb2c6', accent: '#f2b46d', accentSoft: '#a8c7ff' },
  preset: 'archive-grid', seed: 31
}, [
  { id: 'arrival', navLabel: '入口', kicker: 'A / ARRIVAL', title: '档案不是列表，而是一种抵达方式', paragraphs: ['访客先获得方位，再决定深入哪一个知识节点。', '所有说明文字保持为可选择、可搜索的真实 DOM。'], layout: 'left', eye: [-9, 5, 11], look: [0, 0, 0], state: { assembly: .2, energy: .18, density: .35, fog: .65, accent: '#f2b46d' }, overlay: { kind: 'metric', value: '00:00', caption: '进入可阅读状态' }, type: 'hero' },
  { id: 'index', navLabel: '索引', kicker: 'B / INDEX', title: '空间负责关系，卡片负责证据', paragraphs: ['节点之间的距离表达主题关系，节点卡片承载出处、年代与策展说明。', '真实项目还需多语言、无障碍、离线和内容审核流程。'], layout: 'right', eye: [8, 5.5, 10], look: [0, .5, 0], state: { assembly: .48, energy: .4, density: .62, fog: .45, accent: '#a8c7ff' }, overlay: { kind: 'diagram', value: 'NODE / SOURCE / CONTEXT', caption: '展陈内容最小单元' } },
  { id: 'focus', navLabel: '聚焦', kicker: 'C / FOCUS', title: '镜头靠近，但不替代解释', paragraphs: ['聚焦是导演动作，不是隐藏其他信息的借口。', '关闭 WebGL 后，节点顺序、正文和导航完全保留。'], layout: 'left', eye: [-5, 3, 4.5], look: [0, .8, 0], state: { assembly: .76, energy: .62, density: .82, fog: .28, accent: '#f2b46d' }, overlay: { kind: 'quote', value: 'EVIDENCE BEFORE EFFECT', caption: '内容可信度优先' } },
  { id: 'return', navLabel: '回声', kicker: 'D / RETURN', title: '把一次参观留成可继续的路径', paragraphs: ['收藏、深链接与学习记录是展陈场景的下一层能力。', '它们属于业务系统，不应被硬编码进渲染循环。'], layout: 'center', eye: [0, 9, 14], look: [0, 0, 0], state: { assembly: 1, energy: .82, density: 1, fog: .16, accent: '#a8c7ff' }, overlay: { kind: 'metric', value: '4', caption: '共享运行时节点' }, type: 'cta' }
]);

const explainer = buildExperience({
  id: 'explainer', title: '决策流形', summary: '将技术解释从长页面改造成可观察的因果路径。', audience: '技术教育 / 复杂方案说明',
  theme: { deep: '#07151c', surface: '#12313a', text: '#f3fbf7', muted: '#9ebcb7', accent: '#73d2ff', accentSoft: '#f5df72' },
  preset: 'flow-map', seed: 53
}, [
  { id: 'input', navLabel: '问题', kicker: 'I / INPUT', title: '先定义问题的边界', paragraphs: ['技术叙事不从功能清单开始，而从受众需要做出的决定开始。', '每个节点只承担一个因果变化。'], layout: 'left', eye: [-8, 3.5, 13], look: [0, 0, 0], state: { assembly: .12, energy: .24, density: .3, fog: .7, accent: '#73d2ff' }, overlay: { kind: 'metric', value: '1', caption: '每个节点一个认知变化' }, type: 'hero' },
  { id: 'model', navLabel: '结构', kicker: 'II / MODEL', title: '把复杂性变成可检查的结构', paragraphs: ['体验图声明内容，轨道导演镜头，插件解释世界状态。', '三者之间通过有限的数据类型连接。'], layout: 'right', eye: [7, 4.5, 9], look: [0, .5, 0], state: { assembly: .45, energy: .5, density: .55, fog: .46, accent: '#f5df72' }, overlay: { kind: 'diagram', value: 'INTENT → GRAPH → RUNTIME', caption: '可检查的转换链' } },
  { id: 'guardrail', navLabel: '约束', kicker: 'III / GUARDRAIL', title: '让降级路径成为正式能力', paragraphs: ['移动性能、动态偏好和 WebGL 失败不是边角条件。', '它们是同一叙事在不同运行环境中的表达方式。'], layout: 'left', eye: [-5.5, 6, 5.5], look: [0, 1, 0], state: { assembly: .7, energy: .68, density: .74, fog: .28, accent: '#73d2ff' }, overlay: { kind: 'quote', value: 'FALLBACK IS A FORMAT', caption: '不是故障页面' } },
  { id: 'output', navLabel: '决策', kicker: 'IV / OUTPUT', title: '效果最终必须帮助行动', paragraphs: ['如果空间效果不能改善理解、记忆或转化，就应该删除。', '调试快照与浏览器证据让这个判断可以复现。'], layout: 'center', eye: [0, 8.5, 13.5], look: [0, .5, 0], state: { assembly: 1, energy: 1, density: 1, fog: .14, accent: '#f5df72' }, overlay: { kind: 'metric', value: '✓', caption: '可验证的叙事结果' }, type: 'cta' }
]);

const singleHeroSpec: NodeSpec = {
  id: 'hero', navLabel: '单镜', kicker: 'ONE / CONTINUOUS', title: '一个节点也能完成完整的空间变化',
  paragraphs: ['节点数量不是运行时假设。这里通过节点内部的关键帧，让一次连续滚动完成靠近、显现和释放。', '这也是产品首屏、互动海报和单镜头发布页的最小形态。'],
  layout: 'center', span: 220, eye: [0, 3, 15], look: [0, 1, 0], state: { assembly: .18, energy: .18, density: .3, fog: .65, accent: '#8fe8ff' },
  overlay: { kind: 'quote', value: 'ONE NODE ≠ ONE FRAME', caption: '节点内仍有时间轨道' }, type: 'showcase'
};
singleHeroSpec.cameraKeyframes = [
  { at: 0, value: shot(singleHeroSpec) },
  { at: .52, value: { ...shot(singleHeroSpec), eye: [-4, 5, 8], fov: 44 }, easing: 'smoothstep' },
  { at: 1, value: { ...shot(singleHeroSpec), eye: [0, 8, 12], fov: 48 }, easing: 'smootherstep' }
];
singleHeroSpec.sceneKeyframes = [
  { at: 0, value: singleHeroSpec.state },
  { at: .5, value: { assembly: .62, energy: .72, density: .72, fog: .32, accent: '#ffd58f', focus: 'core' }, easing: 'smoothstep' },
  { at: 1, value: { assembly: 1, energy: 1, density: 1, fog: .14, accent: '#8fe8ff', focus: 'transmission' }, easing: 'smootherstep' }
];
const singleHero = buildExperience({ id: 'single-hero', title: '单镜信号', summary: '一个节点、三段关键帧的连续体验。', audience: '产品首屏 / 互动海报', theme: { deep: '#08131f', surface: '#102536', text: '#ecf8ef', muted: '#9ab3b5', accent: '#8fe8ff', accentSoft: '#ffd58f' }, preset: 'signal-field', seed: 71 }, [singleHeroSpec]);

const longForm = buildExperience({ id: 'long-form', title: '九站远征', summary: '用九个节点验证长叙事、导航和任意节点数量。', audience: '长篇品牌故事 / 调研报告', theme: { deep: '#0c101c', surface: '#1a2635', text: '#eff8ff', muted: '#9eb0c3', accent: '#8fd8ff', accentSoft: '#ffc985' }, preset: 'flow-map', seed: 89 }, Array.from({ length: 9 }, (_, index): NodeSpec => {
  const n = index + 1;
  const progress = index / 8;
  return { id: `station-${n}`, navLabel: `${n}`, kicker: `STATION / 0${n}`, title: ['接收未知', '辨认轮廓', '建立坐标', '寻找证据', '穿越噪声', '比较路径', '形成模型', '验证选择', '发送结论'][index], paragraphs: [`这是长叙事的第 ${n} 个可寻址节点。`, '运行时只消费流程计划和轨道，不知道故事应该有多少段。'], layout: index === 8 ? 'center' : index % 2 ? 'right' : 'left', eye: [index % 2 ? 7 - progress * 2 : -8 + progress * 2, 3 + progress * 5, 13 - progress * 3], look: [0, progress, 0], state: { assembly: .12 + progress * .88, energy: .2 + progress * .8, density: .28 + progress * .72, fog: .7 - progress * .54, accent: index % 2 ? '#ffc985' : '#8fd8ff', focus: `station-${n}` }, overlay: { kind: 'metric', value: `${n}/9`, caption: '可变长度流程' }, type: index === 0 ? 'hero' : index === 8 ? 'cta' : 'story' };
}));

const branchSpecs: NodeSpec[] = [
  { id: 'threshold', navLabel: '入口', kicker: '00 / THRESHOLD', title: '同一个入口，可以抵达不同的叙事', paragraphs: ['流程图允许选择，而不要求复制整个页面。', 'URL 中的 choice 参数可以稳定重放一条路径。'], layout: 'left', eye: [-8, 4, 12], look: [0, 0, 0], state: { assembly: .2, energy: .22, density: .3, fog: .68, accent: '#8fe8ff' }, overlay: { kind: 'diagram', value: 'ENTRY → CHOICE', caption: '可寻址分支' }, type: 'hero' },
  { id: 'crossroads', navLabel: '岔路', kicker: '01 / CHOOSE', title: '选择明线，或进入暗线', paragraphs: ['这不是固定章节的条件隐藏，而是两条真实的流程边。', '模型生成阶段可以提出候选结构，人仍然可以编辑与审核。'], layout: 'right', eye: [8, 4, 9], look: [0, .5, 0], state: { assembly: .44, energy: .48, density: .52, fog: .48, accent: '#ffd08c' }, overlay: { kind: 'quote', value: 'LUMINOUS / SHADOW', caption: '分支意图' }, type: 'choice' },
  { id: 'luminous', navLabel: '明线', kicker: '02A / LUMINOUS', title: '让结构逐渐显露', paragraphs: ['明线用更高能量与更低雾度表达确认。', '它与暗线共享同一个运行时和汇合节点。'], layout: 'left', eye: [-5, 6, 6], look: [0, 1, 0], state: { assembly: .76, energy: .86, density: .78, fog: .24, accent: '#8fe8ff' }, overlay: { kind: 'metric', value: 'A', caption: '默认路径' } },
  { id: 'shadow', navLabel: '暗线', kicker: '02B / SHADOW', title: '让不确定性继续存在', paragraphs: ['暗线降低密度并保留雾，让悬念成为可配置的场景状态。', '分支并不意味着另一套硬编码页面。'], layout: 'right', eye: [5, 2, 7], look: [0, .4, 0], state: { assembly: .58, energy: .42, density: .46, fog: .62, accent: '#c29cff' }, overlay: { kind: 'metric', value: 'B', caption: '可选择路径' } },
  { id: 'confluence', navLabel: '汇合', kicker: '03 / CONFLUENCE', title: '不同路径可以共享一个结论', paragraphs: ['图结构让分叉、汇合、跳转都成为数据，而不是组件特例。', '这为自然语言生成结构提供了比模板章节更可靠的中间层。'], layout: 'center', eye: [0, 9, 13], look: [0, 1, 0], state: { assembly: 1, energy: 1, density: 1, fog: .16, accent: '#ffd08c' }, overlay: { kind: 'quote', value: 'PATHS CAN REJOIN', caption: '流程图而非数组' }, type: 'cta' }
];
const branching = buildExperience({ id: 'branching-lore', title: '双径档案', summary: '选择一条路线并在结尾汇合的分支体验。', audience: '互动叙事 / 个性化展示', theme: { deep: '#0e0b1c', surface: '#221d36', text: '#f7f1ff', muted: '#b8abc9', accent: '#8fe8ff', accentSoft: '#c29cff' }, preset: 'archive-grid', seed: 107 }, branchSpecs, [
  { id: 'flow:threshold:crossroads', from: 'threshold', to: 'crossroads', trigger: { type: 'scroll-complete' } },
  { id: 'flow:crossroads:luminous', from: 'crossroads', to: 'luminous', trigger: { type: 'choice', value: 'luminous', isDefault: true } },
  { id: 'flow:crossroads:shadow', from: 'crossroads', to: 'shadow', trigger: { type: 'choice', value: 'shadow' } },
  { id: 'flow:luminous:confluence', from: 'luminous', to: 'confluence', trigger: { type: 'scroll-complete' } },
  { id: 'flow:shadow:confluence', from: 'shadow', to: 'confluence', trigger: { type: 'scroll-complete' } }
]);

export const experiences = [resonanceFlagshipExperience, tidalArchiveExperience, observatory, archive, explainer, singleHero, longForm, branching, chromaticExperience, composedExperience] as const;
export const experienceRegistry = new Map<string, ExperienceManifest>(experiences.map((experience) => [experience.id, experience]));
export const defaultExperience: ExperienceManifest = resonanceFlagshipExperience;
