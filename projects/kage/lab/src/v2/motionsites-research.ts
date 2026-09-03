import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const researchEvidenceSchema = z.enum(['E1', 'E2', 'E3', 'E4']);
export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;

export const researchSurfaceSchema = z.enum(['catalog', 'sections', 'academy', 'local-prototype']);
export type ResearchSurface = z.infer<typeof researchSurfaceSchema>;

export const researchClusterSchema = z.enum([
  'scroll-timeline',
  'spatial-3d',
  'pointer-field',
  'editorial-motion',
  'asset-led-story',
  'component-motion',
  'data-interface'
]);
export type ResearchCluster = z.infer<typeof researchClusterSchema>;

export const researchCaseSchema = z.object({
  id: safeId,
  title: z.string().min(2),
  sourceSurface: researchSurfaceSchema,
  sourceUrl: z.string().url(),
  category: z.string().min(2),
  pageType: z.enum(['hero', 'landing', 'section', 'lesson']),
  access: z.enum(['free', 'premium', 'public-lesson', 'project-owned']),
  preview: z.enum(['image', 'video', 'none']),
  evidenceLevel: researchEvidenceSchema,
  evidenceBasis: z.array(z.string().min(8)).min(1),
  clusters: z.array(researchClusterSchema).min(1),
  observedSignals: z.array(z.string().min(2)).min(2),
  implementationFacts: z.array(z.string().min(8)),
  researchQuestions: z.array(z.string().min(8)).min(1),
  status: z.enum(['inventory', 'deep-dive', 'prototyped', 'promoted'])
}).strict();

export type ResearchCase = z.infer<typeof researchCaseSchema>;

const catalogUrl = (id: string) => `https://motionsites.ai/?prompt=${id}`;
const sectionsUrl = (id: string) => `https://motionsites.ai/sections?prompt=${id}`;

type CaseSeed = Omit<ResearchCase, 'sourceUrl' | 'evidenceBasis' | 'implementationFacts' | 'researchQuestions'> & {
  sourceUrl?: string;
  evidenceBasis?: readonly string[];
  implementationFacts?: readonly string[];
  researchQuestions?: readonly string[];
};

function createCase(seed: CaseSeed): ResearchCase {
  const sourceUrl = seed.sourceUrl ?? (seed.sourceSurface === 'sections' ? sectionsUrl(seed.id) : catalogUrl(seed.id));
  return researchCaseSchema.parse({
    ...seed,
    sourceUrl,
    evidenceBasis: seed.evidenceBasis ?? ['MotionSites 公开目录返回的标题、分类、页面类型和访问状态。'],
    implementationFacts: seed.implementationFacts ?? [],
    researchQuestions: seed.researchQuestions ?? ['需要获取公开实现说明或运行证据，才能判断技术路线和可复用边界。']
  });
}

const catalogCases: readonly ResearchCase[] = [
  createCase({
    id: 'scroll-landing', title: 'Scroll Landing Page', sourceSurface: 'catalog', category: 'Interactive',
    pageType: 'hero', access: 'premium', preview: 'image', evidenceLevel: 'E3', status: 'deep-dive',
    clusters: ['scroll-timeline', 'asset-led-story', 'editorial-motion'],
    observedSignals: ['全屏媒体时间轴', '滚动驱动连续变化', '稀疏编辑内容'],
    sourceUrl: 'https://motionsites.ai/lesson/build-scroll-animated-website-with-ai',
    evidenceBasis: ['官方 Academy 公开完整构建提示词、媒体规格、算法参数和响应式要求。'],
    implementationFacts: [
      '固定全屏媒体位于语义 DOM 内容层后方，页面总进度映射媒体时间。',
      '目标进度使用 0.12 插值平滑，媒体提供海报、视频和帧缓存就绪层。',
      '公开规格包含移动端、减少动态效果、像素比和缓存上限等边界。'
    ],
    researchQuestions: ['远端网络下的视频 seek、帧缓存预算和低端移动设备降级仍需测量。']
  }),
  createCase({
    id: 'pulse-3d', title: 'Pulse 3D', sourceSurface: 'catalog', category: '3D Website',
    pageType: 'landing', access: 'premium', preview: 'image', evidenceLevel: 'E2', status: 'deep-dive',
    clusters: ['spatial-3d', 'scroll-timeline', 'asset-led-story'],
    observedSignals: ['3D 网站分类', '真实模型候选', '滚动空间展示'],
    evidenceBasis: ['公开目录确认案例分类；官方 Academy 另有通用 3D 滚动实现教程。'],
    implementationFacts: [
      '官方通用路线使用多视图参考生成 GLB，再由 Three.js 和滚动状态驱动展示。',
      '官方教程建议 1K–2K 纹理、色调映射和浏览器运行复核。'
    ],
    researchQuestions: ['Pulse 3D 自身的模型、相机轨迹、移动端回退和性能尚未取得运行证据。']
  }),
  createCase({
    id: 'interactive-discovery', title: 'Interactive Discovery', sourceSurface: 'catalog', category: 'Hero',
    pageType: 'hero', access: 'free', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['pointer-field', 'editorial-motion'],
    observedSignals: ['首屏探索', '交互即内容', '发现式入口'],
    researchQuestions: ['需要记录指针响应、触屏替代、信息层级和无障碍键盘路径。']
  }),
  createCase({
    id: 'immersive-studio', title: 'Immersive Studio', sourceSurface: 'catalog', category: 'Agency',
    pageType: 'hero', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['editorial-motion', 'asset-led-story'],
    observedSignals: ['机构身份', '沉浸式品牌世界', '作品证据'],
    researchQuestions: ['需要判断沉浸感来自内容结构、媒体、WebGL 还是它们的组合。']
  }),
  createCase({
    id: 'dreamcore-landing', title: 'Dreamcore Landing', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'landing', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['asset-led-story', 'editorial-motion', 'scroll-timeline'],
    observedSignals: ['梦境氛围', '环境连续性', '着陆页叙事'],
    researchQuestions: ['需要验证连续性由视频、图像序列、CSS 还是 WebGL 承担。']
  }),
  createCase({
    id: 'halo-sound', title: 'Halo Sound', sourceSurface: 'catalog', category: 'Ecommerce',
    pageType: 'hero', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['asset-led-story', 'scroll-timeline'],
    observedSignals: ['声音产品', '电商首屏', '单主体候选'],
    researchQuestions: ['需要检查产品是否持续存在，以及声学能力如何被可视化。']
  }),
  createCase({
    id: 'cursor-follow', title: 'Cursor Follow', sourceSurface: 'catalog', category: 'Hero',
    pageType: 'hero', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['pointer-field', 'component-motion'],
    observedSignals: ['指针跟随', '首屏响应', '局部动效'],
    researchQuestions: ['需要区分有信息意义的跟随与单纯装饰，并验证触屏回退。']
  }),
  createCase({
    id: 'portfolio-cosmic-hero', title: 'Portfolio Cosmic', sourceSurface: 'catalog', category: 'Portfolio',
    pageType: 'landing', access: 'free', preview: 'none', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['spatial-3d', 'editorial-motion'],
    observedSignals: ['作品集', '宇宙空间', '个人身份'],
    researchQuestions: ['需要检查空间视觉是否承担作品导航，还是只作为主题背景。']
  }),
  createCase({
    id: 'luxury-focus', title: 'Luxury Focus', sourceSurface: 'catalog', category: 'E-commerce',
    pageType: 'landing', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['asset-led-story', 'editorial-motion'],
    observedSignals: ['奢侈品聚焦', '商品视觉', '克制节奏'],
    researchQuestions: ['需要提取商品安全区、文字密度和镜头变化的实际边界。']
  }),
  createCase({
    id: 'organic-odyssey', title: 'Organic Odyssey', sourceSurface: 'catalog', category: 'Hero',
    pageType: 'hero', access: 'free', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['asset-led-story', 'spatial-3d'],
    observedSignals: ['有机形态', '旅程感', '动态主体'],
    researchQuestions: ['需要判断有机运动的素材来源、循环结构和文字可读性。']
  }),
  createCase({
    id: 'ai-workflow-agents', title: 'AI Workflow Agents', sourceSurface: 'catalog', category: 'SaaS',
    pageType: 'hero', access: 'free', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['data-interface', 'component-motion'],
    observedSignals: ['工作流说明', '代理关系', 'SaaS 信息'],
    researchQuestions: ['需要研究复杂能力如何用关系和状态表达，而不是堆叠卡片。']
  }),
  createCase({
    id: 'stellar-launch', title: 'Stellar Launch', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'landing', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['spatial-3d', 'scroll-timeline'],
    observedSignals: ['发射叙事', '空间尺度', '连续推进'],
    researchQuestions: ['需要确认镜头推进是否有清楚的开端、转折和终局。']
  }),
  createCase({
    id: '3d-story', title: '3D Story', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'hero', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['spatial-3d', 'scroll-timeline'],
    observedSignals: ['三维叙事', '着陆页', '空间状态'],
    researchQuestions: ['需要获得模型类型、相机状态数和内容层与场景的同步方式。']
  }),
  createCase({
    id: 'art-landing', title: 'Art Landing', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'landing', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['editorial-motion', 'asset-led-story'],
    observedSignals: ['艺术内容', '编辑布局', '媒体主导'],
    researchQuestions: ['需要提取版式秩序和艺术素材之间的主次关系。']
  }),
  createCase({
    id: 'bio-digital', title: 'Bio-Digital', sourceSurface: 'catalog', category: 'Hero',
    pageType: 'hero', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['spatial-3d', 'asset-led-story'],
    observedSignals: ['生物数字化', '材料表现', '抽象主体'],
    researchQuestions: ['需要确认材质、灯光和生物运动是否能转为可控制的运行时契约。']
  }),
  createCase({
    id: 'urban-jungle-hero', title: 'Urban Jungle', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'landing', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['asset-led-story', 'editorial-motion'],
    observedSignals: ['城市自然', '视觉对照', '环境首屏'],
    researchQuestions: ['需要研究两种语义如何在一个连续视觉场中融合而非拼贴。']
  }),
  createCase({
    id: 'form-study', title: 'Form Study', sourceSurface: 'catalog', category: 'Art',
    pageType: 'hero', access: 'premium', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['spatial-3d', 'editorial-motion'],
    observedSignals: ['形态研究', '雕塑主体', '极简编辑'],
    researchQuestions: ['需要提取物体尺度、留白和相机微动的有效范围。']
  }),
  createCase({
    id: 'synth-mode', title: 'Synth Mode', sourceSurface: 'catalog', category: 'Fashion',
    pageType: 'hero', access: 'free', preview: 'image', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['editorial-motion', 'pointer-field'],
    observedSignals: ['时装编辑', '合成视觉', '首屏交互'],
    researchQuestions: ['需要判断互动是否强化品牌态度，以及移动端如何保留体验。']
  }),
  createCase({
    id: 'neovision-landing', title: 'NeoVision', sourceSurface: 'catalog', category: 'Landing Page',
    pageType: 'landing', access: 'premium', preview: 'none', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['editorial-motion', 'scroll-timeline'],
    observedSignals: ['未来视觉', '长页结构', '发布叙事'],
    researchQuestions: ['需要识别视觉变化是否有业务意义，避免只复用科技风表面。']
  }),
  createCase({
    id: 'financialfocus', title: 'FinancialFocus', sourceSurface: 'catalog', category: 'Hero',
    pageType: 'hero', access: 'premium', preview: 'video', evidenceLevel: 'E1', status: 'inventory',
    clusters: ['data-interface', 'component-motion'],
    observedSignals: ['金融信息', '焦点引导', '界面状态'],
    researchQuestions: ['需要验证动态图形如何提高信息理解而不是制造噪声。']
  })
];

const sectionSeeds: readonly Omit<CaseSeed, 'sourceSurface' | 'pageType' | 'evidenceLevel' | 'status'>[] = [
  { id: 'scroll-marquee', title: 'Scroll Marquee', category: 'Marquee', access: 'premium', preview: 'video', clusters: ['scroll-timeline', 'component-motion'], observedSignals: ['滚动字幕', '速度映射'] },
  { id: 'liquid-glass-features', title: 'Liquid Glass Features', category: 'Features', access: 'premium', preview: 'video', clusters: ['component-motion', 'editorial-motion'], observedSignals: ['玻璃材质', '能力说明'] },
  { id: 'liquid-glass-cta', title: 'Liquid Glass CTA', category: 'CTA', access: 'free', preview: 'video', clusters: ['component-motion', 'pointer-field'], observedSignals: ['玻璃交互', '行动收束'] },
  { id: 'pixel-grid-hover', title: 'Pixel Grid Hover', category: 'Case Studies', access: 'free', preview: 'video', clusters: ['pointer-field', 'component-motion'], observedSignals: ['像素网格', '悬停揭示'] },
  { id: 'glassmorphic-feature-tabs', title: 'Glassmorphic Feature Tabs', category: 'Tabs', access: 'premium', preview: 'video', clusters: ['component-motion', 'data-interface'], observedSignals: ['标签切换', '玻璃层次'] },
  { id: 'feedback-slider', title: 'Feedback Slider', category: 'Slider', access: 'premium', preview: 'video', clusters: ['component-motion', 'editorial-motion'], observedSignals: ['反馈轮播', '内容节奏'] },
  { id: 'media-card-carousel', title: 'Media Card Carousel', category: 'Slider', access: 'premium', preview: 'video', clusters: ['component-motion', 'asset-led-story'], observedSignals: ['媒体卡片', '横向浏览'] },
  { id: 'nike-hover', title: 'Nike Hover', category: 'Features', access: 'free', preview: 'video', clusters: ['pointer-field', 'asset-led-story'], observedSignals: ['商品悬停', '品牌响应'] },
  { id: 'mouse-trail-cta', title: 'Mouse Trail CTA', category: 'CTA', access: 'premium', preview: 'video', clusters: ['pointer-field', 'component-motion'], observedSignals: ['鼠标轨迹', '行动区域'] },
  { id: 'technical-specifications', title: 'Technical Specifications', category: 'Tabs', access: 'premium', preview: 'video', clusters: ['data-interface', 'component-motion'], observedSignals: ['规格切换', '技术信息'] },
  { id: 'radial-diagram', title: 'Radial Diagram', category: 'Testimonials', access: 'free', preview: 'video', clusters: ['data-interface', 'component-motion'], observedSignals: ['径向关系', '证言结构'] },
  { id: 'animated-cards', title: 'Animated Cards', category: 'Component', access: 'free', preview: 'video', clusters: ['component-motion'], observedSignals: ['卡片状态', '组合动效'] },
  { id: 'editorial-collection-cta', title: 'Editorial Collection CTA', category: 'CTA', access: 'premium', preview: 'video', clusters: ['editorial-motion', 'asset-led-story'], observedSignals: ['编辑式收束', '系列入口'] },
  { id: 'bento-grid-stats', title: 'Bento Grid Stats', category: 'Bento', access: 'premium', preview: 'video', clusters: ['data-interface', 'component-motion'], observedSignals: ['数据网格', '统计层次'] }
];

const sectionCases = sectionSeeds.map((seed) => createCase({
  ...seed,
  sourceSurface: 'sections',
  pageType: 'section',
  evidenceLevel: 'E1',
  status: 'inventory',
  researchQuestions: ['需要检查局部动效的触发、停止、触屏回退和整页组合成本。']
}));

export const motionsitesResearchCases: readonly ResearchCase[] = [
  ...catalogCases,
  ...sectionCases
];

export const principleAtomSchema = z.object({
  id: safeId,
  title: z.string().min(3),
  layer: z.enum(['composition', 'asset', 'motion', 'interaction', 'runtime', 'responsive', 'workflow']),
  evidenceLevel: researchEvidenceSchema,
  state: z.enum(['research-target', 'candidate', 'validated']),
  derivedFrom: z.array(z.string().min(1)).min(1),
  statement: z.string().min(16),
  applicability: z.array(z.string().min(8)).min(1),
  incompatibleWith: z.array(safeId),
  acceptance: z.array(z.string().min(8)).min(1)
}).strict();

export type PrincipleAtom = z.infer<typeof principleAtomSchema>;

export const motionsitesPrinciples: readonly PrincipleAtom[] = [
  {
    id: 'fixed-full-bleed-media', title: '全屏连续媒体场', layer: 'composition', evidenceLevel: 'E4', state: 'validated',
    derivedFrom: ['scroll-landing', 'kage-scroll-scrub-prototype'],
    statement: '让一个连续媒体场贯穿视口，把昂贵视觉工作集中到同一条时间线上。',
    applicability: ['连续环境、产品状态或情绪变化可以由一组可追踪媒体表达。'],
    incompatibleWith: ['free-pointer-navigation'],
    acceptance: ['媒体延伸至视口边缘，主体不出现矩形海报边界。']
  },
  {
    id: 'semantic-dom-overlay', title: '语义内容独立层', layer: 'composition', evidenceLevel: 'E4', state: 'validated',
    derivedFrom: ['scroll-landing', 'kage-scroll-scrub-prototype'],
    statement: '视觉素材只承担空间和氛围，标题、说明与行动保持为可访问的 DOM。',
    applicability: ['需要兼顾沉浸画面、搜索语义、可读性和行动入口。'],
    incompatibleWith: [],
    acceptance: ['关闭媒体后仍能读取标题、正文和主要行动。']
  },
  {
    id: 'global-scroll-timeline', title: '全局滚动时间轴', layer: 'motion', evidenceLevel: 'E4', state: 'validated',
    derivedFrom: ['scroll-landing', 'kage-scroll-scrub-prototype'],
    statement: '把页面总进度映射为单一连续时间轴，避免每个区块拥有互不相关的动画。',
    applicability: ['用户需要感知开端、形成、转折和收束之间的因果关系。'],
    incompatibleWith: ['free-pointer-navigation'],
    acceptance: ['opening、middle、ending 三个位置均有稳定且可复现的视觉状态。']
  },
  {
    id: 'stable-reduced-motion-states', title: '减少动态的稳定状态', layer: 'responsive', evidenceLevel: 'E4', state: 'validated',
    derivedFrom: ['scroll-landing', 'kage-scroll-scrub-prototype'],
    statement: '减少动态模式保留关键叙事状态和内容顺序，不仅仅是把动画时长改为零。',
    applicability: ['所有依赖连续运动表达意义的滚动体验。'],
    incompatibleWith: [],
    acceptance: ['prefers-reduced-motion 下仍可理解开端、结果和主要行动。']
  },
  {
    id: 'media-readiness-layers', title: '媒体就绪分层', layer: 'runtime', evidenceLevel: 'E3', state: 'candidate',
    derivedFrom: ['scroll-landing'],
    statement: '使用海报、解码视频和可选帧缓存逐步接管画面，降低首屏空白和 seek 不稳定。',
    applicability: ['远端视频或帧序列需要兼顾首屏、连续性和设备性能。'],
    incompatibleWith: [],
    acceptance: ['任何媒体就绪阶段都不出现透明空帧或突然闪黑。']
  },
  {
    id: 'editorial-safe-zone', title: '编辑式主体安全区', layer: 'composition', evidenceLevel: 'E3', state: 'candidate',
    derivedFrom: ['scroll-landing'],
    statement: '先为视觉主体划定持续安全区，再让文本在不同阶段围绕它移动和换位。',
    applicability: ['主体轮廓和动作需要在长页中持续被看见。'],
    incompatibleWith: [],
    acceptance: ['关键标题与行动不会遮挡主体识别区域。']
  },
  {
    id: 'focused-refinement', title: '局部缺陷精修', layer: 'workflow', evidenceLevel: 'E3', state: 'candidate',
    derivedFrom: ['scroll-landing'],
    statement: '生成后只修复明确的构图、对比度、排版或运动缺陷，避免无边界重写。',
    applicability: ['首轮页面结构已经成立，需要快速提高最终完成度。'],
    incompatibleWith: [],
    acceptance: ['每轮精修都必须命名缺陷、修改范围和可见验收状态。']
  },
  {
    id: 'pinned-glb-scroll', title: '固定视口 GLB 滚动', layer: 'motion', evidenceLevel: 'E2', state: 'candidate',
    derivedFrom: ['pulse-3d', 'motionsites-3d-scroll-academy'],
    statement: '把真实 GLB 保持在固定视口中，由滚动驱动相机或模型的有限关键状态。',
    applicability: ['同一真实对象需要展示空间、背面、内部关系或材质变化。'],
    incompatibleWith: ['free-pointer-navigation'],
    acceptance: ['至少三个滚动位置具有可复现的相机、物体和内容状态。']
  },
  {
    id: 'multi-view-glb-gate', title: '多视图 GLB 资产门槛', layer: 'asset', evidenceLevel: 'E2', state: 'candidate',
    derivedFrom: ['motionsites-3d-scroll-academy'],
    statement: '先用多视图参考和浏览器资产检查获得可用 GLB，再允许页面选择真实 3D 路线。',
    applicability: ['产品或物体准确性高于抽象氛围，且需要近距离展示。'],
    incompatibleWith: [],
    acceptance: ['模型轮廓、材质、纹理、尺度和载荷达到目标镜头距离的门槛。']
  },
  {
    id: 'tone-mapped-product-lighting', title: '色调映射产品灯光', layer: 'runtime', evidenceLevel: 'E2', state: 'candidate',
    derivedFrom: ['motionsites-3d-scroll-academy'],
    statement: '灯光和色调映射属于产品可信度契约，而不是生成后随意补上的装饰。',
    applicability: ['GLB 的材质层次和轮廓需要在浏览器中保持稳定可读。'],
    incompatibleWith: [],
    acceptance: ['开场、中段和结尾均没有黑死材质、过曝轮廓或突变色温。']
  },
  {
    id: 'interaction-as-message', title: '交互即信息', layer: 'interaction', evidenceLevel: 'E1', state: 'research-target',
    derivedFrom: ['interactive-discovery', 'pixel-grid-hover', 'nike-hover'],
    statement: '指针或悬停只有在揭示关系、选择或内容差异时才值得进入体验。',
    applicability: ['用户动作本身能解释品牌、内容关系或探索路径。'],
    incompatibleWith: [],
    acceptance: ['必须获得运行观察和触屏替代后，才能升级为候选能力。']
  },
  {
    id: 'section-scale-response', title: '局部响应组件', layer: 'interaction', evidenceLevel: 'E1', state: 'research-target',
    derivedFrom: ['animated-cards', 'technical-specifications', 'radial-diagram'],
    statement: '整页体验应能按需组合局部动效，而不是让每个组件争夺同等视觉注意力。',
    applicability: ['需要在沉浸主叙事中加入规格、证据、轮播或行动组件。'],
    incompatibleWith: [],
    acceptance: ['需要验证触发、停止、键盘、触屏和多组件同页时的节奏。']
  },
  {
    id: 'free-pointer-navigation', title: '自由指针导航', layer: 'interaction', evidenceLevel: 'E1', state: 'research-target',
    derivedFrom: ['interactive-discovery', 'cursor-follow'],
    statement: '由指针位置决定探索方向的自由导航，只适合非线性内容且必须提供触屏替代。',
    applicability: ['内容允许用户自行发现顺序，且不存在必须按序理解的叙事。'],
    incompatibleWith: ['fixed-full-bleed-media', 'global-scroll-timeline', 'pinned-glb-scroll'],
    acceptance: ['需要取得桌面、键盘和触屏三类运行证据后再进入能力目录。']
  }
].map((principle) => principleAtomSchema.parse(principle));

export const synthesisRecipeSchema = z.object({
  id: safeId,
  title: z.string().min(3),
  principleIds: z.array(safeId).min(2),
  evidenceLevel: researchEvidenceSchema,
  state: z.enum(['research-target', 'candidate', 'validated']),
  intentSignals: z.array(z.string().min(2)).min(2),
  compatibilityRationale: z.string().min(20),
  guardrails: z.array(z.string().min(10)).min(2),
  resultingCapability: z.string().min(8)
}).strict();

export type SynthesisRecipe = z.infer<typeof synthesisRecipeSchema>;

export const motionsitesSynthesisRecipes: readonly SynthesisRecipe[] = [
  {
    id: 'editorial-memory-field', title: '编辑式记忆场',
    principleIds: ['fixed-full-bleed-media', 'semantic-dom-overlay', 'global-scroll-timeline', 'stable-reduced-motion-states'],
    evidenceLevel: 'E4', state: 'validated', intentSignals: ['记忆', '梦境', '环境变化', '安静产品'],
    compatibilityRationale: '媒体承担连续空间，DOM 承担信息，滚动承担因果，减少动态保留稳定叙事；四者职责不重叠。',
    guardrails: ['要求连续素材共享场所、机位和光向。', '不把该组合固化为固定版式或固定章节数量。'],
    resultingCapability: '可直接进入 V2 选择器的连续媒体滚动叙事。'
  },
  {
    id: 'asset-led-launch-sequence', title: '资产主导的发布序列',
    principleIds: ['fixed-full-bleed-media', 'semantic-dom-overlay', 'media-readiness-layers', 'editorial-safe-zone', 'focused-refinement'],
    evidenceLevel: 'E3', state: 'candidate', intentSignals: ['发布', '时装', '艺术', '单主体产品'],
    compatibilityRationale: '全屏资产持续建立身份，安全区保护主体，就绪分层保证交付，局部精修限制生成后的探索范围。',
    guardrails: ['只有素材真正承担主体识别时才选择本组合。', '不得用视频假冒实时 Three.js 或产品检查能力。'],
    resultingCapability: '待远端媒体运行验证后可晋升的高完成度发布路线。'
  },
  {
    id: 'product-spatial-reveal', title: '产品空间揭示',
    principleIds: ['pinned-glb-scroll', 'multi-view-glb-gate', 'tone-mapped-product-lighting', 'semantic-dom-overlay'],
    evidenceLevel: 'E2', state: 'candidate', intentSignals: ['真实产品', '拆解', '空间关系', '材质检查'],
    compatibilityRationale: '资产门槛先保证模型可信，固定滚动限制相机自由度，灯光保障材质，DOM 保留可读的产品解释。',
    guardrails: ['没有通过门槛的 GLB 时必须拒绝该路线。', '不把自由旋转配置器伪装成有限滚动叙事。'],
    resultingCapability: '需要一个 L3+ GLB 本地原型后才可进入生产选择器。'
  },
  {
    id: 'interactive-editorial-discovery', title: '编辑式交互发现',
    principleIds: ['interaction-as-message', 'section-scale-response', 'semantic-dom-overlay'],
    evidenceLevel: 'E1', state: 'research-target', intentSignals: ['探索', '作品集', '关系发现', '选择路径'],
    compatibilityRationale: '交互负责揭示关系，局部组件承载可操作状态，语义内容层防止体验退化为只有鼠标效果的画面。',
    guardrails: ['当前只是一组研究假设，不允许直接进入生成选择器。', '必须补齐键盘、触屏和减少动态效果的运行证据。'],
    resultingCapability: '下一批案例深挖的候选组合，不是已实现能力。'
  }
].map((recipe) => synthesisRecipeSchema.parse(recipe));

const evidenceRank: Readonly<Record<ResearchEvidence, number>> = { E1: 1, E2: 2, E3: 3, E4: 4 };

export interface CombinationEvaluation {
  compatible: boolean;
  minimumEvidence: ResearchEvidence;
  conflicts: readonly string[];
  reasons: readonly string[];
}

export function evaluatePrincipleCombination(principleIds: readonly string[]): CombinationEvaluation {
  const principles = principleIds.map((id) => motionsitesPrinciples.find((item) => item.id === id)).filter(Boolean) as PrincipleAtom[];
  const missing = principleIds.filter((id) => !principles.some((item) => item.id === id));
  const conflicts = principles.flatMap((principle) => principle.incompatibleWith
    .filter((id) => principleIds.includes(id))
    .map((id) => [principle.id, id].sort().join(' ↔ ')));
  const uniqueConflicts = [...new Set(conflicts)];
  const minimum = principles.reduce<ResearchEvidence>((lowest, principle) =>
    evidenceRank[principle.evidenceLevel] < evidenceRank[lowest] ? principle.evidenceLevel : lowest, 'E4');
  return {
    compatible: missing.length === 0 && uniqueConflicts.length === 0,
    minimumEvidence: minimum,
    conflicts: uniqueConflicts,
    reasons: [
      ...(missing.length ? [`缺少原理：${missing.join('、')}`] : []),
      ...(uniqueConflicts.length ? [`存在冲突：${uniqueConflicts.join('；')}`] : []),
      ...(!missing.length && !uniqueConflicts.length ? [`组合可用，证据上限由最低的 ${minimum} 决定。`] : [])
    ]
  };
}

export function getProductionReadyRecipes(): readonly SynthesisRecipe[] {
  return motionsitesSynthesisRecipes.filter((recipe) => {
    const evaluation = evaluatePrincipleCombination(recipe.principleIds);
    return recipe.state === 'validated' && recipe.evidenceLevel === 'E4' && evaluation.compatible;
  });
}

export const motionsitesCoverage = Object.freeze({
  publicCatalogTotal: 462,
  firstBatchCount: motionsitesResearchCases.length,
  capturedAt: '2026-08-27',
  statement: '首批结构化研究样本，不代表 MotionSites 全站研究完成。'
});
