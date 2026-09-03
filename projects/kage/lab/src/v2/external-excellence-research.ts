import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const externalExcellenceFamilySchema = z.enum([
  'editorial-participation',
  'embodied-multimodal-story',
  'shared-state-data-tool',
  'material-product-causality',
  'audio-visual-instrument',
  'playful-spatial-world'
]);

export type ExternalExcellenceFamily = z.infer<typeof externalExcellenceFamilySchema>;

export const externalEvidenceSourceSchema = z.object({
  id: safeId,
  kind: z.enum(['live-product', 'official-case-study', 'official-docs', 'github-source']),
  relationship: z.enum(['product-evidence', 'implementation-evidence', 'production-evidence']),
  title: z.string().min(3),
  uri: z.string().url(),
  authority: z.string().min(3),
  evidenceLevel: z.enum(['E2', 'E3', 'E4']),
  license: z.string().min(2).optional(),
  claim: z.string().min(12)
}).strict();

export type ExternalEvidenceSource = z.infer<typeof externalEvidenceSourceSchema>;

export const mediaResponsibilitySchema = z.object({
  medium: z.string().min(2),
  responsibility: z.string().min(8),
  necessity: z.enum(['core', 'supporting'])
}).strict();

export const externalExcellenceStudySchema = z.object({
  id: safeId,
  family: externalExcellenceFamilySchema,
  title: z.string().min(3),
  status: z.literal('source-reviewed'),
  referenceEligibility: z.literal('research-only'),
  experiencePromise: z.string().min(12),
  firstFrameMemory: z.string().min(12),
  perceivedTransformation: z.object({
    from: z.string().min(6),
    to: z.string().min(6),
    trigger: z.string().min(4),
    meaning: z.string().min(8)
  }).strict(),
  interactionVerbs: z.array(z.string().min(2)).min(1).max(5),
  mediaResponsibilities: z.array(mediaResponsibilitySchema).min(1).max(6),
  confirmedMechanisms: z.array(z.string().min(12)).min(1).max(6),
  implementationHypotheses: z.array(z.string().min(12)).max(4),
  borrowPrinciples: z.array(z.string().min(12)).min(2).max(5),
  nonApplicableWhen: z.array(z.string().min(12)).min(1).max(4),
  promotionGates: z.array(z.string().min(12)).min(3).max(6),
  sources: z.array(externalEvidenceSourceSchema).min(2).max(4),
  confidence: z.number().min(0).max(1),
  reviewedAt: z.string().date()
}).strict();

export type ExternalExcellenceStudy = z.infer<typeof externalExcellenceStudySchema>;

export const externalImplementationStudySchema = z.object({
  id: safeId,
  title: z.string().min(3),
  classification: z.enum(['complete-experience', 'focused-visual-experiment', 'mechanism-infrastructure']),
  referenceRole: z.enum(['direct-experience', 'principle-only', 'mechanism-only']),
  repositoryUri: z.string().url(),
  liveUri: z.string().url(),
  reviewedRevision: z.string().regex(/^[a-f0-9]{40}$/),
  license: z.string().min(2),
  evidenceLevel: z.literal('E3'),
  coreMechanisms: z.array(z.string().min(12)).min(2).max(6),
  borrowPrinciples: z.array(z.string().min(12)).min(1).max(4),
  advisoryRisks: z.array(z.string().min(12)).min(1).max(4),
  applicableProducts: z.array(z.string().min(2)).min(1).max(6),
  confidence: z.number().min(0).max(1),
  reviewedAt: z.string().date()
}).strict();

export type ExternalImplementationStudy = z.infer<typeof externalImplementationStudySchema>;

/**
 * A deliberately small first research batch. These studies are not authoring
 * templates and are not eligible for automatic injection yet. Promotion into
 * ReferenceEvidencePack requires local runtime evidence and an explicit
 * mapping from the observed effect to an applicable product goal.
 */
export const externalExcellenceStudies: readonly ExternalExcellenceStudy[] = [
  {
    id: 'one-shared-house-participation',
    family: 'editorial-participation',
    title: 'One Shared House 2030 · 排版即参与式研究界面',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '让抽象的未来居住议题变成一次具有个人立场、群体对照和结果反馈的参与过程。',
    firstFrameMemory: '高饱和色场、几何形与超大问题排版共同形成一张会回应用户的现代主义海报。',
    perceivedTransformation: {
      from: '阅读一个未来居住命题',
      to: '看见自己的选择如何位于全球参与者之中',
      trigger: '逐题作答与查看结果',
      meaning: '个人输入使抽象议题获得可比较的社会位置'
    },
    interactionVerbs: ['选择', '推进', '比较', '筛选'],
    mediaResponsibilities: [
      { medium: '编辑排版', responsibility: '建立项目身份并把每个问题变成视觉事件', necessity: 'core' },
      { medium: '聚合数据', responsibility: '将个人答案转化为可见的群体关系', necessity: 'core' },
      { medium: '几何动效', responsibility: '解释问卷状态与章节推进而非单纯装饰', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      '源作品明确包含 survey、results、about 与 resources，并把项目界定为匿名的 playful research。',
      '结果体验允许把个人答案与总体参与结果进行比较，视觉系统持续服务同一研究命题。'
    ],
    implementationHypotheses: [
      '页面状态可能主要由 DOM、CSS transform 与客户端问卷状态共同驱动；在源码审阅前不得作为实现事实。'
    ],
    borrowPrinciples: [
      '当产品要求用户表达立场时，让输入立即改变同一个视觉世界，并给出个人与群体的可比较结果。',
      '排版可以承担品牌世界、章节节奏与交互反馈，不必为了“高级感”额外添加 3D 主体。'
    ],
    nonApplicableWhen: [
      '没有真实结果或可信聚合数据时，不应伪造群体比较，也不应把几何皮肤冒充研究价值。'
    ],
    promotionGates: [
      '保存开场、作答中和结果对照三个真实运行状态。',
      '核对匿名数据声明、交互路径与可访问性，不把 playful research 写成科学结论。',
      '提炼的原则必须能脱离粉色、圆形和具体排版外壳成立。'
    ],
    sources: [
      {
        id: 'one-shared-house-live',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'One Shared House 2030',
        uri: 'https://onesharedhouse2030.com/intro/',
        authority: 'Anton & Irene + SPACE10',
        evidenceLevel: 'E3',
        claim: '源作品确认研究命题、问卷入口、结果入口、匿名声明和参与式产品结构。'
      },
      {
        id: 'one-shared-house-space10',
        kind: 'official-case-study',
        relationship: 'production-evidence',
        title: 'SPACE10 · One Shared House 2030',
        uri: 'https://space10.com/projects/one-shared-house-2030',
        authority: 'SPACE10',
        evidenceLevel: 'E3',
        claim: '项目发起方资料提供研究目标、参与方式与设计背景的生产证据。'
      }
    ],
    confidence: 0.84,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'the-boat-embodied-story',
    family: 'embodied-multimodal-story',
    title: 'The Boat · 让运动扮演叙事中的物理力量',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '把图像小说、历史档案、声音和滚动组合成一次具有身体感的海上逃亡阅读。',
    firstFrameMemory: '黑白水墨、少量红色与处于倾斜船体中的文字共同建立风浪中的不稳定感。',
    perceivedTransformation: {
      from: '阅读一篇图像小说',
      to: '身体感受到风浪、拥挤和历史现实的压力',
      trigger: '滚动、自动推进与声音播放',
      meaning: '画面运动不是展示技术，而是在扮演故事中的海浪与失衡'
    },
    interactionVerbs: ['滚动', '停留', '聆听', '展开'],
    mediaResponsibilities: [
      { medium: '手绘插画', responsibility: '承载人物、场景与统一的情绪世界', necessity: 'core' },
      { medium: '滚动动画', responsibility: '把阅读速度转化为船体运动和叙事节奏', necessity: 'core' },
      { medium: '声音', responsibility: '建立空间压力与风浪的身体感', necessity: 'core' },
      { medium: '档案照片与视频', responsibility: '把艺术叙事重新锚定到历史证据', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      '官方发布资料确认这是 SBS 的互动图像小说，而非静态文章或独立视频。',
      '制作资料确认作品组合 HTML、JavaScript、GLSL、WebGL、动态媒体流与自适应自动滚动。'
    ],
    implementationHypotheses: [],
    borrowPrinciples: [
      '只有当运动能扮演主题中的物理力量、情绪压力或时间变化时，才让强动效成为核心。',
      '图像、文字、声音和档案素材必须分担不同叙事职责，并在同一体验转变上汇合。'
    ],
    nonApplicableWhen: [
      '主题没有身体性压力或历史证据时，强震动、倾斜与长滚动会变成操控情绪的空壳。'
    ],
    promotionGates: [
      '保存开场、风浪中段和档案锚定状态，并记录真实滚动和声音输入。',
      '评估眩晕、音频解锁、减少动态效果和媒体载荷风险。',
      '只提炼“媒介职责与主题物理性”，不得复制水墨、红黑色或难读倾斜文字。'
    ],
    sources: [
      {
        id: 'the-boat-live',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'The Boat',
        uri: 'https://www.sbs.com.au/theboat/',
        authority: 'SBS',
        evidenceLevel: 'E3',
        claim: '源作品确认互动图像小说入口及最终公开体验。'
      },
      {
        id: 'the-boat-sbs-release',
        kind: 'official-case-study',
        relationship: 'production-evidence',
        title: 'SBS · The Boat release',
        uri: 'https://www.sbs.com.au/aboutus/2015/04/29/sbs-online-releases-first-ever-interactive-graphic-novel/',
        authority: 'SBS',
        evidenceLevel: 'E3',
        claim: '发布方资料确认互动图像小说定位、作者合作与历史题材边界。'
      },
      {
        id: 'the-boat-author',
        kind: 'official-case-study',
        relationship: 'production-evidence',
        title: 'Matt Huynh · The Boat',
        uri: 'https://www.matthuynh.com/stories/theboat-9rw43',
        authority: 'Matt Huynh',
        evidenceLevel: 'E3',
        claim: '作者项目档案提供插画、叙事与制作语境的第一方证据。'
      }
    ],
    confidence: 0.9,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'windy-shared-state-tool',
    family: 'shared-state-data-tool',
    title: 'Windy · 一个真实数据世界承载全部工具状态',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '让不可见的全球气象系统变成可感知、可定位、可切换时间与模型的行动工具。',
    firstFrameMemory: '整屏地图、连续风场与气象色阶共同成为产品本身，控件只改变这一共享世界。',
    perceivedTransformation: {
      from: '感知全球天气的大尺度流动',
      to: '得到地点、时间和模型明确的局部判断',
      trigger: '拖拽缩放、图层选择与时间轴播放',
      meaning: '复杂工具通过同一个真实对象维持空间、数据和操作的一致性'
    },
    interactionVerbs: ['定位', '缩放', '切换', '播放', '比较'],
    mediaResponsibilities: [
      { medium: '真实地图', responsibility: '提供地理身份、尺度与地点事实边界', necessity: 'core' },
      { medium: '气象图层', responsibility: '把不同变量映射到可读色阶与等值关系', necessity: 'core' },
      { medium: '粒子场', responsibility: '表达风向、速度与连续流动而非装饰背景', necessity: 'core' },
      { medium: '图表与数值', responsibility: '在地点选择后提供精确读数与时间证据', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      '源产品把地图、地点、气象图层、时间和预报信息组织在同一个可交互空间中。',
      '官方开发文档公开 Map、LeafletGL 与地图模块接口，确认 WebGL 地图层是产品架构的一部分。'
    ],
    implementationHypotheses: [
      '风场粒子的 GPU 推进与场采样属于合理技术推断，但进入 ReferenceEvidencePack 前仍需源码或运行测量证实。'
    ],
    borrowPrinciples: [
      '工具页面应尽量让不同控件改变同一个可信对象，而不是把状态拆成互不相关的仪表卡。',
      '粒子、颜色和动画只有在编码真实变量、方向或速度时才具有信息价值。'
    ],
    nonApplicableWhen: [
      '没有真实地理数据、来源和时效说明时，不得用随机地图或生成点位冒充公共服务事实。'
    ],
    promotionGates: [
      '记录地点选择、图层切换和时间变化前后的真实运行证据。',
      '核对数据来源、地图许可、更新时间和演示数据标识。',
      '把共享状态原则与 Windy 的具体色阶、粒子皮肤和控件布局分离。'
    ],
    sources: [
      {
        id: 'windy-live',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'Windy',
        uri: 'https://www.windy.com/',
        authority: 'Windy.com',
        evidenceLevel: 'E3',
        claim: '源产品提供真实地图、地点、气象图层、时间轴与预报状态的公开运行入口。'
      },
      {
        id: 'windy-map-docs',
        kind: 'official-docs',
        relationship: 'implementation-evidence',
        title: 'Windy Map API',
        uri: 'https://docs.windy-plugins.com/api/modules/map.html',
        authority: 'Windy.com',
        evidenceLevel: 'E3',
        claim: '官方插件文档确认地图模块、LeafletGL 与可扩展图层接口。'
      }
    ],
    confidence: 0.88,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'bang-olufsen-material-causality',
    family: 'material-product-causality',
    title: 'B&O Atelier Composer · 3D 为材质选择承担证据职责',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '让用户从欣赏既定产品，转向验证材质与部件组合并形成属于自己的版本。',
    firstFrameMemory: '高保真产品与工艺影像先建立材料可信度，配置器随后让选择留在同一个对象上。',
    perceivedTransformation: {
      from: '观看品牌定义的产品',
      to: '验证并拥有自己选择的材质组合',
      trigger: '旋转观察与切换颜色、木材、织物和金属',
      meaning: '3D 的价值来自可检查的表面与组合因果，而不是中央转台本身'
    },
    interactionVerbs: ['旋转', '选择', '替换', '比较', '确认'],
    mediaResponsibilities: [
      { medium: '高保真 3D 产品', responsibility: '保持同一对象并呈现角度、部件和表面变化', necessity: 'core' },
      { medium: 'PBR 材质与色板', responsibility: '让每次选择产生可比较的光泽、纹理和颜色结果', necessity: 'core' },
      { medium: '工艺摄影与视频', responsibility: '补足屏幕材质无法证明的真实制作和触感语境', necessity: 'supporting' },
      { medium: '配置 UI', responsibility: '约束有效组合并把探索收束到咨询或购买行动', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      'B&O 官方页面把 Atelier 描述为可从多种颜色与材质中构建个性化产品的数字 Composer。',
      '公开 Composer 链接由 Threedium 域承载，供应方公开声明其浏览器实时 3D 配置能力。'
    ],
    implementationHypotheses: [
      '产品很可能使用优化数字孪生、PBR 材质贴图和变体矩阵；在获取源码前不得写成已确认实现。'
    ],
    borrowPrinciples: [
      '只有当用户需要检查角度、表面、部件或组合时，3D 才应成为产品页核心媒介。',
      '材质选择必须在同一产品上即时留下可比较的视觉证据，并用真实工艺素材补足屏幕局限。'
    ],
    nonApplicableWhen: [
      '对象不可配置、没有可信模型或材质资产时，中央 3D 转台不会自动产生产品价值。'
    ],
    promotionGates: [
      '保存同一角度下至少两种材质状态及旋转检查状态。',
      '记录模型、纹理、材质变体、载荷与移动端回退的资产责任。',
      '不得把屏幕颜色或生成材质描述为真实样品的精确替代。'
    ],
    sources: [
      {
        id: 'bang-olufsen-composer',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'Bang & Olufsen Atelier Composer',
        uri: 'https://www.bang-olufsen.com/en/gb/composer',
        authority: 'Bang & Olufsen',
        evidenceLevel: 'E3',
        claim: '品牌官方入口确认实时产品配置器及其 Atelier 产品定制语境。'
      },
      {
        id: 'bang-olufsen-atelier',
        kind: 'official-case-study',
        relationship: 'product-evidence',
        title: 'Bang & Olufsen Atelier',
        uri: 'https://www.bang-olufsen.com/en/gb/story/atelier',
        authority: 'Bang & Olufsen',
        evidenceLevel: 'E3',
        claim: '品牌官方故事页提供材质、工艺、个性化范围和线下确认边界。'
      },
      {
        id: 'threedium-platform',
        kind: 'official-docs',
        relationship: 'implementation-evidence',
        title: 'Threedium',
        uri: 'https://threedium.io/',
        authority: 'Threedium',
        evidenceLevel: 'E2',
        claim: '配置器供应方公开说明浏览器实时 3D、产品配置和数字孪生能力。'
      }
    ],
    confidence: 0.86,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'patatap-audio-visual-causality',
    family: 'audio-visual-instrument',
    title: 'Patatap · 同一输入同时生成声音与视觉事件',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '让一个近乎空白的页面在用户第一次按键后立即变成可以演奏的视听乐器。',
    firstFrameMemory: '纯色空白画布只留下 Press any key，第一次输入同时打破安静与静止。',
    perceivedTransformation: {
      from: '面对安静的空白画布',
      to: '用自己的节奏连续制造声音与动态图形',
      trigger: '键盘、触摸或 MIDI 输入',
      meaning: '产品价值由用户动作直接产生，而不是由页面说明或自动播放替代'
    },
    interactionVerbs: ['按下', '触摸', '演奏', '切换'],
    mediaResponsibilities: [
      { medium: '声音样本', responsibility: '让每个输入形成可辨识的节奏与音色反馈', necessity: 'core' },
      { medium: '二维动态图形', responsibility: '把同一个声音事件转化为即时、具有差异的视觉反馈', necessity: 'core' },
      { medium: '色板与声景组', responsibility: '通过一次切换改变整套演奏语境', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      '源作品明确把自己定义为 portable animation and sound kit，并提示闪烁风险。',
      '官方 GitHub 源码确认 Two.js、Tween.js、键盘、触摸、MIDI 与 Web Audio AudioContext 的组合。'
    ],
    implementationHypotheses: [],
    borrowPrinciples: [
      '声音产品的核心输入应在同一时刻产生可听与可见结果，二者共享状态而不是各自播放。',
      '一个主题专属动词可以撑起完整体验；页面结构可以服从这个动词，而非默认长滚动或工作台。'
    ],
    nonApplicableWhen: [
      '声音不是产品价值、输入不能产生差异或没有音频授权时，不应强行加入背景音乐和频谱动画。'
    ],
    promotionGates: [
      '保存音频解锁前、首次输入后和连续演奏三个真实运行状态。',
      '验证键盘、触摸、音量、静音、闪烁警告和减少动态效果。',
      '源码 revision 与许可必须进入最终 ReferenceEvidencePack。'
    ],
    sources: [
      {
        id: 'patatap-live',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'Patatap',
        uri: 'https://patatap.com/',
        authority: 'Jono Brandel + Lullatone',
        evidenceLevel: 'E3',
        claim: '源作品确认视听乐器定位、触摸输入、声音职责与闪烁风险。'
      },
      {
        id: 'patatap-source',
        kind: 'github-source',
        relationship: 'implementation-evidence',
        title: 'jonobr1/Patatap',
        uri: 'https://github.com/jonobr1/Patatap',
        authority: 'Jono Brandel',
        evidenceLevel: 'E3',
        license: 'MIT',
        claim: '官方源码提供键盘、触摸、MIDI、Two.js、Tween.js 与 Web Audio 的实现证据。'
      }
    ],
    confidence: 0.94,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'bruno-simon-playable-portfolio',
    family: 'playful-spatial-world',
    title: 'Bruno Simon Folio 2025 · 内容节点组成可驾驶世界',
    status: 'source-reviewed',
    referenceEligibility: 'research-only',
    experiencePromise: '让浏览作品集从点击页面目录转变为驾驶、发现、互动和停留在一个持续存在的个人世界。',
    firstFrameMemory: '可驾驶小车、低多边形世界、可碰撞物体与清晰操作提示共同声明这是一个可玩的作品集。',
    perceivedTransformation: {
      from: '浏览一组个人信息与项目链接',
      to: '在具有天气、时间、声音和秘密的世界中主动发现作者',
      trigger: '驾驶、碰撞、跳跃、地图与节点互动',
      meaning: '世界规则与作者身份一致，空间不是把普通卡片摆进 3D 场景'
    },
    interactionVerbs: ['驾驶', '探索', '碰撞', '发现', '互动'],
    mediaResponsibilities: [
      { medium: '持续 3D 世界', responsibility: '把身份、项目、地点和路径组织成可记忆空间', necessity: 'core' },
      { medium: '物理与车辆控制', responsibility: '让探索、意外和发现成为真实输入结果', necessity: 'core' },
      { medium: '空间声音与音乐', responsibility: '强化区域、物体和情绪的空间归属', necessity: 'supporting' },
      { medium: 'DOM 说明与选项', responsibility: '提供可读内容、操作帮助、质量与无障碍控制', necessity: 'supporting' }
    ],
    confirmedMechanisms: [
      '源作品公开键鼠、触摸、手柄、音频、质量、WebGPU/WebGL、地图、重置和交互控制。',
      'MIT 源码公开 Three.js、Rapier、音频、天气、日夜、对象、区域、渲染顺序和资产压缩流程。'
    ],
    implementationHypotheses: [],
    borrowPrinciples: [
      '空间网站必须先定义身份、世界规则、内容节点和发现路径，再决定模型、物理和镜头。',
      '3D、声音、物理和天气只有在共同建立一个可理解世界时才应叠加；否则只是技术陈列。'
    ],
    nonApplicableWhen: [
      '内容很少、用户只需快速完成任务或移动端预算不足时，不应强迫用户驾驶才能获取关键信息。'
    ],
    promotionGates: [
      '保存初始操作、内容节点发现和移动端控制三个运行状态。',
      '审阅源码 revision、MIT 许可、输入同构、质量切换与资产预算。',
      '只提炼“内容节点组成世界”的原则，不复制小车、低多边形外观或游戏化奖励。'
    ],
    sources: [
      {
        id: 'bruno-simon-live',
        kind: 'live-product',
        relationship: 'product-evidence',
        title: 'Bruno Simon Folio 2025',
        uri: 'https://bruno-simon.com/',
        authority: 'Bruno Simon',
        evidenceLevel: 'E3',
        claim: '源作品确认可驾驶作品集、跨输入控制、音频、质量切换与探索式内容结构。'
      },
      {
        id: 'bruno-simon-source',
        kind: 'github-source',
        relationship: 'implementation-evidence',
        title: 'brunosimon/folio-2025',
        uri: 'https://github.com/brunosimon/folio-2025',
        authority: 'Bruno Simon',
        evidenceLevel: 'E3',
        license: 'MIT',
        claim: '官方源码公开游戏循环、Three.js、Rapier、音频、天气、交互节点与资产压缩结构。'
      }
    ],
    confidence: 0.96,
    reviewedAt: '2026-09-02'
  }
].map((study) => externalExcellenceStudySchema.parse(study));

/**
 * Source-level implementation evidence paired with the product studies above.
 * A mechanism library answers "how can this be implemented reliably"; it must
 * never be presented to the authoring model as proof of a good visual outcome.
 */
export const externalImplementationStudies: readonly ExternalImplementationStudy[] = [
  {
    id: 'folio-2025-spatial-content-nodes',
    title: 'Bruno Simon Folio 2025 · 空间内容节点与统一输入循环',
    classification: 'complete-experience',
    referenceRole: 'direct-experience',
    repositoryUri: 'https://github.com/brunosimon/folio-2025',
    liveUri: 'https://bruno-simon.com/',
    reviewedRevision: '41046b57eeed8d156d9c3fd7fa259900baef7816',
    license: 'MIT（package metadata 标记 ISC，晋级前需保留不一致说明）',
    evidenceLevel: 'E3',
    coreMechanisms: [
      '按阶段排序输入、玩家、物理、世界、音频与渲染，避免分散计时器破坏因果。',
      'Zones 与 InteractivePoints 将空间距离转为交互时机，DOM/modal 继续承担可读正文。',
      '键鼠、触摸与手柄共享输入语义，移动端使用独立质量路线。'
    ],
    borrowPrinciples: [
      '先把内容拓扑映射为空间节点，再选择模型、物理与镜头；距离只决定何时互动。'
    ],
    advisoryRisks: [
      '车辆、岛屿与低多边形身份不可复制；自由漫游、Rapier 与大资产会提高学习和性能成本。'
    ],
    applicableProducts: ['创意作品集', '数字博物馆', '品牌世界', '地点探索'],
    confidence: 0.96,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'r3f-scroll-rig-progressive-layer',
    title: 'r3f-scroll-rig · DOM 为真相、WebGL 为渐进增强',
    classification: 'mechanism-infrastructure',
    referenceRole: 'mechanism-only',
    repositoryUri: 'https://github.com/14islands/r3f-scroll-rig',
    liveUri: 'https://github.com/14islands/r3f-scroll-rig',
    reviewedRevision: '123663599e4b31af56f1845a19132d17e6a9b81f',
    license: 'MIT（package metadata 标记 ISC，晋级前需保留不一致说明）',
    evidenceLevel: 'E3',
    coreMechanisms: [
      '一个固定 GlobalCanvas 服务全站，以 DOM 代理元素的边界和滚动状态同步 WebGL 对象。',
      'IntersectionObserver、ResizeObserver 与滚动 delta 共同维护位置、可见性和按需渲染。',
      'Canvas 不可用时保留完整 DOM 内容，WebGL 层不拥有页面语义。'
    ],
    borrowPrinciples: [
      '需要 DOM 与 WebGL 混合时，坚持单一全局画布、DOM 布局真相和完整无 Canvas 回退。'
    ],
    advisoryRisks: [
      '这是基础设施而非视觉案例；会引入滚动同步、CLS、z-fighting 与框架绑定复杂度。'
    ],
    applicableProducts: ['产品叙事', '编辑滚动故事', '图库', '案例页'],
    confidence: 0.95,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'codrops-noise-surface-transition',
    title: 'Codrops Noise Transition · 同一进度驱动主体与环境的材质事件',
    classification: 'focused-visual-experiment',
    referenceRole: 'principle-only',
    repositoryUri: 'https://github.com/mohAmineBrs/codrops-noise-transition',
    liveUri: 'https://tympanus.net/Development/TextureTransition/',
    reviewedRevision: '0face2aaa637780bb2862c807efce1aabfecc9ea',
    license: 'README 声明 MIT，但仓库缺少根 LICENSE；模型为 CC-BY-4.0',
    evidenceLevel: 'E3',
    coreMechanisms: [
      '通过 onBeforeCompile 注入统一 u_progress，让模型表面状态沿同一时间轴转换。',
      '4D 噪声、parabola 与 smoothstep 负责不规则边界，背景径向波纹响应同一进度。'
    ],
    borrowPrinciples: [
      '一个语义状态使用一个进度源；噪声只塑造边界，环境回声必须服从主体变化。'
    ],
    advisoryRisks: [
      '许可和模型归属尚未满足复用门；原例缺少键盘、减少动态效果和加载失败回退。'
    ],
    applicableProducts: ['包装', '化妆品', '材料配置', '款式切换'],
    confidence: 0.88,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'butterchurn-audio-reactivity',
    title: 'Butterchurn · 频段、时间尺度与连续反馈的音频反应机制',
    classification: 'mechanism-infrastructure',
    referenceRole: 'mechanism-only',
    repositoryUri: 'https://github.com/jberg/butterchurn',
    liveUri: 'https://butterchurnviz.com/',
    reviewedRevision: 'fbac2f6bab62fd9c6a50ebbeb29359c5eb05903e',
    license: 'MIT（preset、纹理与作者权利需分别核对）',
    evidenceLevel: 'E3',
    coreMechanisms: [
      'Web Audio Analyser 与双声道 FFT 将 bass、mid、treble 映射为独立可用的信号。',
      '即时、平均与长期基线使用帧率校正平滑，ping-pong framebuffer 保持视觉连续性。',
      'Puppeteer 与合成音频可支持确定性的视觉回归。'
    ],
    borrowPrinciples: [
      '声音驱动页面应显式分频、归一化和设置 attack/release；静音时必须保持稳定状态。'
    ],
    advisoryRisks: [
      '它不是最终视觉方案；随机 preset 会吞没品牌，并带来 WebGL2、闪烁与音频手势风险。'
    ],
    applicableProducts: ['音乐发布', '音频工具', '节庆体验', '听觉档案'],
    confidence: 0.96,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'imweb-media-signal-graph',
    title: 'ImWeb · 有边界的实时媒体信号图',
    classification: 'complete-experience',
    referenceRole: 'principle-only',
    repositoryUri: 'https://github.com/imweb-project/ImWeb',
    liveUri: 'https://imweb.image-ine.org/',
    reviewedRevision: '9eb0161988d859bf8cc558ba2c8ab588751d3215',
    license: 'AGPL-3.0-or-later（仅研究原则，禁止直接复制进闭源交付）',
    evidenceLevel: 'E3',
    coreMechanisms: [
      '相机、视频、静帧、噪声、3D 与粒子先进入有限 mix bus，再经过固定顺序的效果 pass。',
      '每个 pass 是显式 ShaderMaterial 与 WebGLRenderTarget，非活跃 pass 可跳过。',
      'Live GLSL 编译失败保留 last-good shader，UI、输出与 WebM 导出共享同一状态。'
    ],
    borrowPrinciples: [
      '视频应作为可编排、可响应的体验媒介；先限定来源与效果顺序，再让输出和导出共享状态。'
    ],
    advisoryRisks: [
      'AGPL 不适合直接进入闭源产品；完整 VJ 管线远超普通落地页并带来权限、CORS、录制和移动端风险。'
    ],
    applicableProducts: ['媒体艺术', '现场演出', '电影展览', '媒体档案'],
    confidence: 0.92,
    reviewedAt: '2026-09-02'
  },
  {
    id: 'kinetic-type-state-handoff',
    title: 'Kinetic Type Page Transition · 排版承担页面状态交接',
    classification: 'focused-visual-experiment',
    referenceRole: 'principle-only',
    repositoryUri: 'https://github.com/codrops/KineticTypePageTransition',
    liveUri: 'https://tympanus.net/Development/KineticTypePageTransition/',
    reviewedRevision: 'ebe926e2f1de42950c36ff8a678321155280c1af',
    license: 'MIT（演示字体与图片需单独核对）',
    evidenceLevel: 'E3',
    coreMechanisms: [
      '一个带 labels 的 GSAP timeline 统一协调列表退出、全屏文字、正文进入和图片位移。',
      'isAnimating 阻止状态重入；装饰文字 aria-hidden，真实内容继续保留在语义 HTML。'
    ],
    borrowPrinciples: [
      '转场词汇应来自内容或品牌，并由单一时间线负责状态交接；视觉复制层不得取代真实页面语义。'
    ],
    advisoryRisks: [
      '原例缺少键盘焦点与 reduced-motion；长转场不适合高频功能产品，字体、图片和构图不可复制。'
    ],
    applicableProducts: ['文化编辑', '时尚', '创意作品集', '案例图库'],
    confidence: 0.94,
    reviewedAt: '2026-09-02'
  }
].map((study) => externalImplementationStudySchema.parse(study));

/**
 * R156 promotes only three mechanism studies whose source review is paired
 * with a verified local delivery of the transferable principle. Promotion
 * never copies the source product's visual identity or implementation.
 */
export const promotedExternalReferenceStudyIds = [
  'r3f-scroll-rig-progressive-layer',
  'codrops-noise-surface-transition',
  'butterchurn-audio-reactivity'
] as const;

export function getExternalExcellenceResearchSummary() {
  return {
    totalStudies: externalExcellenceStudies.length,
    familyCount: new Set(externalExcellenceStudies.map((study) => study.family)).size,
    sourceCount: externalExcellenceStudies.reduce((total, study) => total + study.sources.length, 0),
    implementationStudies: externalImplementationStudies.length,
    mechanismOnlyStudies: externalImplementationStudies.filter((study) => (
      study.referenceRole === 'mechanism-only'
    )).length,
    referenceReadyCount: promotedExternalReferenceStudyIds.length,
    status: 'bounded-reference-promotion'
  } as const;
}
