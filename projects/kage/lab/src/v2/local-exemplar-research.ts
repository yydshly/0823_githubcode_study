export type LocalExemplarStatus = 'promote' | 'hold' | 'exclude'
export type LocalExemplarRole = 'presentation' | 'component' | 'technical-lab'
export type EvidenceLevel = 'E3-source' | 'E4-runtime'

export interface LocalExemplarCase {
  id: string
  fileName: string
  title: string
  role: LocalExemplarRole
  status: LocalExemplarStatus
  evidence: EvidenceLevel
  archetype: string
  mechanism: readonly string[]
  strengths: readonly string[]
  limits: readonly string[]
  reusablePrinciples: readonly string[]
}

export const localExemplarCases: readonly LocalExemplarCase[] = [
  {
    id: 'plety-media-storyboard',
    fileName: 'gemini-code-1785085812851.html',
    title: 'Plety — 媒体驱动的完整产品叙事',
    role: 'presentation',
    status: 'promote',
    evidence: 'E4-runtime',
    archetype: 'asset-led-editorial-flow',
    mechanism: ['全屏视频首屏', '交替双栏功能段落', '固定导航', 'IntersectionObserver 渐入', '末段媒体回响'],
    strengths: ['素材承担主要情绪与产品解释', '页面节奏完整而非单一 Hero', '文案与媒体始终保持明确主次'],
    limits: ['依赖四个外部视频', '没有 poster 与 reduced-motion 回退', '功能段落结构存在重复感'],
    reusablePrinciples: ['先确定媒体叙事节拍，再决定页面章节', '同一核心素材可在首尾形成视觉回环', '功能解释应切换构图而不是只更换文案'],
  },
  {
    id: 'airlines-environmental-aperture',
    fileName: 'gemini-code-1785086266144.html',
    title: 'Airlines — 环境窗口式全屏首屏',
    role: 'presentation',
    status: 'promote',
    evidence: 'E4-runtime',
    archetype: 'full-bleed-environmental-aperture',
    mechanism: ['全屏 object-cover 视频', '极少量中心文案', '高对比导航', '单一明确行动'],
    strengths: ['用户第一眼进入环境而不是看到组件', '飞机舷窗素材与出行主题天然一致', '视觉信息密度克制'],
    limits: ['只有一个屏幕，无法证明完整产品叙事', '关键体验完全依赖远程视频', '缺少静态和低动效回退'],
    reusablePrinciples: ['当素材本身就是空间入口时，让媒体占满视口', '首屏只保留一个信息层级和一个行动', '文字必须服从素材安全区而非固定居中'],
  },
  {
    id: 'sports-ai-subject-field',
    fileName: 'gemini-code-1785086534757.html',
    title: 'Sports AI — 主体安全区与媒体标本场',
    role: 'presentation',
    status: 'promote',
    evidence: 'E4-runtime',
    archetype: 'centered-subject-safe-zone',
    mechanism: ['居中方形视频', '主体外围大面积留白', '文字与行动覆盖在媒体安全区', '轻量入场关键帧'],
    strengths: ['中心动态主体具有产品标本感', '浅色场域区别于常见暗色科技风', 'DOM 文案和媒体主体的空间关系清楚'],
    limits: ['仍然只是首屏', '媒体比例与主体位置需要专门生成', '没有滚动后的叙事证明'],
    reusablePrinciples: ['生成素材时必须同时生成可排版的安全区', '独立主体适合标本场而非强行铺满背景', '素材构图约束应进入生成提示而不是事后裁切'],
  },
  {
    id: 'harvest-masked-statistics',
    fileName: 'gemini-code-1785146858646.html',
    title: 'Harvest Stats — 蒙版媒体与数据编辑构图',
    role: 'component',
    status: 'promote',
    evidence: 'E4-runtime',
    archetype: 'masked-editorial-data',
    mechanism: ['字母形媒体蒙版', '衬线与无衬线混排', '计数动效', '双栏编辑布局'],
    strengths: ['蒙版本身参与品牌表达', '数据、标题和动态素材形成同一构图', '适合能力证明或成果段落'],
    limits: ['是单个章节而不是完整页面', '复杂蒙版在移动端需要降级', '视频仍来自外部地址'],
    reusablePrinciples: ['蒙版应承载语义而非只做装饰', '数据动效只强化已理解的信息', '可将品牌字形转成媒体容器'],
  },
  {
    id: 'nike-pointer-spotlight',
    fileName: 'gemini-code-1785146968079.html',
    title: 'Nike Spotlight — 鼠标聚光与交互即信息',
    role: 'component',
    status: 'hold',
    evidence: 'E4-runtime',
    archetype: 'pointer-reveal-field',
    mechanism: ['鼠标/触摸位置驱动', 'GSAP 与 requestAnimationFrame', '分层产品对象', '局部聚光或揭示'],
    strengths: ['交互动作与发现产品的含义一致', '对象、统计卡和标题形成编辑式空间', '没有把鼠标跟随降格为装饰光点'],
    limits: ['一个关键视频地址被浏览器 ORB 阻止', '无指针设备需要独立叙事替代', '尚未提供 reduced-motion 分支'],
    reusablePrinciples: ['输入行为必须改变用户理解而不仅是改变坐标', '交互层应建立在静态构图已经成立之后', '触摸与键盘替代路径必须在设计阶段定义'],
  },
  {
    id: 'fabrica-sticky-stack',
    fileName: 'gemini-code-1785213262826.html',
    title: 'Fabrica Vanilla — 滚动堆叠式作品档案',
    role: 'presentation',
    status: 'promote',
    evidence: 'E4-runtime',
    archetype: 'sticky-stacking-gallery',
    mechanism: ['长滚动轨道', 'sticky 卡片堆叠', 'IntersectionObserver', '指针细节响应', '大图主导'],
    strengths: ['每次滚动只引入一个新视觉对象', '连续堆叠提供清楚的前后关系', '适合作品、档案和系列产品浏览'],
    limits: ['四张图片是外部 Unsplash 资源', '长轨道对内容较少的页面会显得拖沓', '需要重新评估移动端高度与触摸节奏'],
    reusablePrinciples: ['滚动长度应由叙事状态数决定', '堆叠结构适合并列对象而不适合因果故事', '每个状态必须有独立的信息收束点'],
  },
  {
    id: 'aether-product-microfilm',
    fileName: 'aether_gesture_product_demo.html',
    title: 'Aether — 手势驱动的产品微电影',
    role: 'technical-lab',
    status: 'hold',
    evidence: 'E3-source',
    archetype: 'product-microfilm',
    mechanism: ['紧凑单场景产品演出', '手势触发', '镜头式阶段切换', '可重播状态'],
    strengths: ['用短时间证明产品外观和交互概念', '适合进入完整页面前验证一个英雄时刻'],
    limits: ['还未完成响应式与完整页面验证', '更像可交互镜头而非完整网站'],
    reusablePrinciples: ['先用微电影验证英雄时刻，再扩展成页面', '复杂体验需要明确的重播与复位状态'],
  },
  {
    id: 'polar-three-capability-lab',
    fileName: '3d (3).html',
    title: '极地 3D 实验室 — Three.js 能力验证台',
    role: 'technical-lab',
    status: 'hold',
    evidence: 'E4-runtime',
    archetype: 'three-capability-lab',
    mechanism: ['Three.js 程序化对象', '阶段时间线', '参数控制', '场景控制台'],
    strengths: ['适合隔离验证材质、相机和阶段状态', '技术状态可观察'],
    limits: ['工具界面强于品牌表达', '不能直接作为最终网站视觉案例'],
    reusablePrinciples: ['复杂 Three.js 效果先在能力实验台通过，再进入产品页面', '技术原型和展示案例必须分开评价'],
  },
  {
    id: 'sandbox-chronicle-lab',
    fileName: 'code_artifact (1).html',
    title: '沙盘编年史 — 交互 3D 沙盘工具',
    role: 'technical-lab',
    status: 'hold',
    evidence: 'E4-runtime',
    archetype: 'interactive-three-sandbox',
    mechanism: ['Three.js 沙盘', '时间线', '侧栏参数', '场景反馈'],
    strengths: ['适合验证复杂状态和调试信息组织', '证明 3D 与产品 UI 可以协同'],
    limits: ['更接近内部工具而非情绪型产品页面', '信息密度不适合作为默认生成结果'],
    reusablePrinciples: ['调试控制应留在研究模式', '最终页面只暴露与用户目标相关的交互'],
  },
  {
    id: 'fabrica-react-broken',
    fileName: 'gemini-code-1785213206711.html',
    title: 'Fabrica React — 损坏版本',
    role: 'presentation',
    status: 'exclude',
    evidence: 'E4-runtime',
    archetype: 'broken-runtime',
    mechanism: ['React', 'Framer Motion'],
    strengths: [],
    limits: ['运行时读取未定义的 motion，页面为空', '不能作为视觉或交付范例'],
    reusablePrinciples: ['截图或源代码看起来完整不等于运行结果可用', '运行错误应阻止案例晋级'],
  },
  {
    id: 'strategic-ai-duplicate',
    fileName: 'strategic_ai_landing_page.html',
    title: 'Strategic AI — 重复早期版本',
    role: 'presentation',
    status: 'exclude',
    evidence: 'E3-source',
    archetype: 'duplicate-hero',
    mechanism: ['媒体首屏', '中心标题'],
    strengths: [],
    limits: ['与 Sports AI 方向重复且完成度更低'],
    reusablePrinciples: ['同一方向只保留证据最完整的代表案例'],
  },
  {
    id: 'mcp-generic-tech',
    fileName: 'gemini-code-1784716627552.html',
    title: 'MCP 2099 — 通用科技风首屏',
    role: 'presentation',
    status: 'exclude',
    evidence: 'E4-runtime',
    archetype: 'generic-tech-hero',
    mechanism: ['巨大标题', '青色 3D 圆角方块', '暗色背景'],
    strengths: [],
    limits: ['视觉语法泛化，缺乏对象特异性', '3D 对象与产品信息联系弱'],
    reusablePrinciples: ['不能因为使用 3D 就自动视为高质量案例', '对象、动作与产品含义必须建立对应关系'],
  },
] as const

export const localExemplarPrinciples = [
  {
    id: 'asset-dramaturgy-first',
    title: '素材戏剧性先于渲染技术',
    rule: '先定义核心视觉对象、状态变化和构图安全区，再选择视频、DOM、Canvas、Three.js 或混合渲染。',
  },
  {
    id: 'interaction-is-message',
    title: '交互本身必须传达含义',
    rule: '滚动、指针和手势必须对应接近、揭示、拆解、比较或收束等叙事动作；纯装饰性跟随不得成为主效果。',
  },
  {
    id: 'media-determines-layout',
    title: '版式服从素材的主体和安全区',
    rule: '模型生成素材时同时输出主体位置、留白区、裁切边界和移动端替代构图，页面不在事后强行套模板。',
  },
  {
    id: 'states-determine-scroll',
    title: '叙事状态决定滚动长度',
    rule: '先列出用户应感受到的状态变化，再分配滚动距离；不以固定章节数或固定页面高度驱动。',
  },
  {
    id: 'progressive-renderer-choice',
    title: '按效果需要逐级选择渲染器',
    rule: '静态排版优先 DOM，连续影像优先视频，需要局部像素处理时用 Canvas/Shader，只有真实深度、相机或三维状态变化带来价值时才使用 Three.js。',
  },
  {
    id: 'delivery-is-part-of-quality',
    title: '交付可靠性也是视觉质量',
    rule: '晋级案例必须考虑 poster、素材本地化、失败回退、reduced-motion、触摸与移动端安全区，不能只评价一次成功截图。',
  },
] as const

export const localExemplarCombinations = [
  '环境窗口式首屏 + 交替媒体故事板：适合目的地、空间与情绪型产品。',
  '主体标本场 + 指针揭示：适合产品材质、服装、艺术品与新型设备。',
  '品牌蒙版媒体 + 数据证明：适合成果、可信度和能力说明段落。',
  '滚动堆叠 + 产品微电影：适合系列作品浏览，并为其中一个对象提供英雄时刻。',
  'DOM 编辑排版 + 局部 Three.js 深度场：适合需要空间感但不应把整页交给 WebGL 的产品页面。',
] as const
