import type { ChapterConfig, StoryConfig, Vec3 } from './schema';
import { assertStoryConfig } from './schema';

function chapter(
  id: string,
  navLabel: string,
  kicker: string,
  title: string,
  paragraphs: readonly string[],
  layout: ChapterConfig['layout'],
  eye: Vec3,
  look: Vec3,
  state: ChapterConfig['sceneState'],
  overlay: ChapterConfig['overlay']
): ChapterConfig {
  return {
    id,
    navLabel,
    kicker,
    title,
    paragraphs,
    layout,
    scrollSpanVh: layout === 'center' ? 118 : 138,
    shot: {
      eye,
      look,
      fov: layout === 'center' ? 48 : 42,
      portrait: {
        eye: [eye[0] * 0.7, eye[1] + 1.1, eye[2] + 4.2],
        look,
        fov: 54
      },
      transition: 'glide'
    },
    sceneState: state,
    overlay
  };
}

const observatory: StoryConfig = {
  version: 1,
  id: 'observatory',
  title: '信号观测站',
  summary: '把一次品牌发布拆成可导演、可验证的空间叙事。',
  audience: '品牌发布 / 产品叙事',
  theme: {
    deep: '#08131f',
    surface: '#102536',
    text: '#ecf8ef',
    muted: '#9ab3b5',
    accent: '#79e7c4',
    accentSoft: '#f0c88d'
  },
  world: { preset: 'signal-field', seed: 17 },
  chapters: [
    chapter('chapter-0', '噪声', '01 / RECEIVE', '先听见尚未成形的信号', [
      '复杂产品往往不是缺少信息，而是缺少一条能让人记住的观看路径。',
      '这里的正文先于三维场景存在；空间只负责建立节奏、尺度和注意力。'
    ], 'left', [-8, 4.5, 12], [0, 1.2, 0], { assembly: 0.16, energy: 0.2, density: 0.28, fog: 0.72, accent: '#79e7c4', focus: 'fragments' }, { kind: 'metric', value: '01', caption: '语义内容先落地' }),
    chapter('chapter-1', '校准', '02 / CALIBRATE', '把镜头、内容与状态放进同一份配置', [
      '每个章节声明相机位置、注视点、视野和场景状态，不再把导演意图散落在事件回调里。',
      '插入新章节时，引擎无需跟着改写。'
    ], 'right', [8.5, 3.2, 9], [0, 0.7, 0], { assembly: 0.42, energy: 0.44, density: 0.5, fog: 0.52, accent: '#f0c88d', focus: 'orbit' }, { kind: 'diagram', value: 'CONFIG → CAMERA → WORLD', caption: '单向导演数据流' }),
    chapter('chapter-2', '共振', '03 / RESONATE', '让视觉反馈服务于理解', [
      '滚动只提供进度，镜头曲线、四元数朝向和场景混合各自保持独立。',
      '质量档、减弱动效和无 WebGL 回退共享同一套章节内容。'
    ], 'left', [-6.5, 6.1, 5.5], [0, 1, -0.5], { assembly: 0.7, energy: 0.76, density: 0.74, fog: 0.32, accent: '#79e7c4', focus: 'core' }, { kind: 'metric', value: '3×', caption: '故事配置复用同一运行时' }),
    chapter('chapter-3', '释放', '04 / TRANSMIT', '把一次作品变成持续可扩展的系统', [
      '品牌样板验证叙事价值，导演台沉淀生产能力，随后才能可靠接入游戏、展陈和 AI 辅助。',
      '扩展从清晰的数据契约开始，而不是从复制一个成片开始。'
    ], 'center', [0, 8.5, 13], [0, 1, 0], { assembly: 1, energy: 1, density: 1, fog: 0.18, accent: '#f0c88d', focus: 'transmission' }, { kind: 'quote', value: 'STORY IS A SYSTEM', caption: '首个原创垂直切片' })
  ]
};

const archive: StoryConfig = {
  version: 1,
  id: 'archive',
  title: '漂移档案库',
  summary: '用同一运行时验证数字展陈与知识节点叙事。',
  audience: '数字展陈 / 文化教育',
  theme: {
    deep: '#11111b',
    surface: '#26243a',
    text: '#fff7e8',
    muted: '#bdb2c6',
    accent: '#f2b46d',
    accentSoft: '#a8c7ff'
  },
  world: { preset: 'archive-grid', seed: 31 },
  chapters: [
    chapter('chapter-0', '入口', 'A / ARRIVAL', '档案不是列表，而是一种抵达方式', ['访客先获得方位，再决定深入哪一个知识节点。', '所有说明文字保持为可选择、可搜索的真实 DOM。'], 'left', [-9, 5, 11], [0, 0, 0], { assembly: 0.2, energy: 0.18, density: 0.35, fog: 0.65, accent: '#f2b46d' }, { kind: 'metric', value: '00:00', caption: '进入可阅读状态' }),
    chapter('chapter-1', '索引', 'B / INDEX', '空间负责关系，卡片负责证据', ['节点之间的距离表达主题关系，章节卡片承载出处、年代与策展说明。', '真实项目还需多语言、无障碍、离线和内容审核流程。'], 'right', [8, 5.5, 10], [0, 0.5, 0], { assembly: 0.48, energy: 0.4, density: 0.62, fog: 0.45, accent: '#a8c7ff' }, { kind: 'diagram', value: 'NODE / SOURCE / CONTEXT', caption: '展陈内容最小单元' }),
    chapter('chapter-2', '聚焦', 'C / FOCUS', '镜头靠近，但不替代解释', ['聚焦是导演动作，不是隐藏其他信息的借口。', '关闭 WebGL 后，章节顺序、正文和导航完全保留。'], 'left', [-5, 3, 4.5], [0, 0.8, 0], { assembly: 0.76, energy: 0.62, density: 0.82, fog: 0.28, accent: '#f2b46d' }, { kind: 'quote', value: 'EVIDENCE BEFORE EFFECT', caption: '内容可信度优先' }),
    chapter('chapter-3', '回声', 'D / RETURN', '把一次参观留成可继续的路径', ['收藏、深链接与学习记录是展陈场景的下一层能力。', '它们属于业务系统，不应被硬编码进渲染循环。'], 'center', [0, 9, 14], [0, 0, 0], { assembly: 1, energy: 0.82, density: 1, fog: 0.16, accent: '#a8c7ff' }, { kind: 'metric', value: '4', caption: '共享运行时章节' })
  ]
};

const explainer: StoryConfig = {
  version: 1,
  id: 'explainer',
  title: '决策流形',
  summary: '将技术解释从长页面改造成可观察的因果路径。',
  audience: '技术教育 / 复杂方案说明',
  theme: {
    deep: '#07151c',
    surface: '#12313a',
    text: '#f3fbf7',
    muted: '#9ebcb7',
    accent: '#73d2ff',
    accentSoft: '#f5df72'
  },
  world: { preset: 'flow-map', seed: 53 },
  chapters: [
    chapter('chapter-0', '问题', 'I / INPUT', '先定义问题的边界', ['技术叙事不从功能清单开始，而从受众需要做出的决定开始。', '每个章节只承担一个因果变化。'], 'left', [-8, 3.5, 13], [0, 0, 0], { assembly: 0.12, energy: 0.24, density: 0.3, fog: 0.7, accent: '#73d2ff' }, { kind: 'metric', value: '1', caption: '每章一个认知变化' }),
    chapter('chapter-1', '结构', 'II / MODEL', '把复杂性变成可检查的结构', ['配置声明内容，导演器解释镜头，场景预设解释世界状态。', '三者之间通过有限的数据类型连接。'], 'right', [7, 4.5, 9], [0, 0.5, 0], { assembly: 0.45, energy: 0.5, density: 0.55, fog: 0.46, accent: '#f5df72' }, { kind: 'diagram', value: 'INPUT → MODEL → OUTPUT', caption: '可检查的转换链' }),
    chapter('chapter-2', '约束', 'III / GUARDRAIL', '让降级路径成为正式能力', ['移动性能、动态偏好和 WebGL 失败不是边角条件。', '它们是同一叙事在不同运行环境中的表达方式。'], 'left', [-5.5, 6, 5.5], [0, 1, 0], { assembly: 0.7, energy: 0.68, density: 0.74, fog: 0.28, accent: '#73d2ff' }, { kind: 'quote', value: 'FALLBACK IS A FORMAT', caption: '不是故障页面' }),
    chapter('chapter-3', '决策', 'IV / OUTPUT', '效果最终必须帮助行动', ['如果空间效果不能改善理解、记忆或转化，就应该删除。', '调试快照与浏览器证据让这个判断可以复现。'], 'center', [0, 8.5, 13.5], [0, 0.5, 0], { assembly: 1, energy: 1, density: 1, fog: 0.14, accent: '#f5df72' }, { kind: 'metric', value: '✓', caption: '可验证的叙事结果' })
  ]
};

export const stories = [observatory, archive, explainer].map(assertStoryConfig);
export const storyRegistry = new Map(stories.map((story) => [story.id, story]));
export const defaultStory = observatory;
