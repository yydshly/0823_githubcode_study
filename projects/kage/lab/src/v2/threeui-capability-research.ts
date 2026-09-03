import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const externalCapabilitySourceProfileSchema = z.object({
  id: safeId,
  title: z.string().min(3),
  status: z.literal('source-reviewed'),
  referenceEligibility: z.literal('research-only'),
  catalogUri: z.string().url(),
  repositoryUri: z.string().url(),
  mcpUri: z.string().url(),
  reviewedRevision: z.string().regex(/^[a-f0-9]{40}$/),
  packageName: z.string().min(3),
  packageVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  evidenceLevel: z.literal('E3'),
  referenceValue: z.literal('high'),
  directIntegrationValue: z.literal('medium'),
  authoringPolicy: z.literal('principles-only-not-style-rules'),
  runtimeDependencyPolicy: z.literal('research-first-no-package-install'),
  automaticPromotion: z.literal(false),
  capabilityRoles: z.array(z.string().min(8)).min(3).max(8),
  licenseBoundary: z.array(z.string().min(12)).min(3).max(6),
  advisoryRisks: z.array(z.string().min(12)).min(2).max(6),
  reviewedAt: z.string().date()
}).strict();

export type ExternalCapabilitySourceProfile = z.infer<typeof externalCapabilitySourceProfileSchema>;

export const observedReferenceStudySchema = z.object({
  id: safeId,
  sourceId: safeId,
  title: z.string().min(3),
  status: z.literal('runtime-observed'),
  referenceEligibility: z.literal('inspiration-only'),
  evidenceLevel: z.literal('E2'),
  publicEvidence: z.enum(['live-interaction', 'video-preview']),
  sourceAvailability: z.enum(['community-source', 'pro-gated', 'unavailable']),
  promotionDecision: z.enum(['hold', 'reject']),
  experiencePromise: z.string().min(12),
  confirmedObservations: z.array(z.string().min(12)).min(2).max(6),
  borrowPrinciples: z.array(z.string().min(12)).min(2).max(6),
  caseSpecificShell: z.array(z.string().min(2)).min(1).max(8),
  unknowns: z.array(z.string().min(8)).min(2).max(6),
  promotionGates: z.array(z.string().min(12)).min(3).max(6),
  uri: z.string().url(),
  confidence: z.number().min(0).max(1),
  reviewedAt: z.string().date()
}).strict();

export type ObservedReferenceStudy = z.infer<typeof observedReferenceStudySchema>;

export const mechanismPilotCandidateSchema = z.object({
  id: safeId,
  sourceId: safeId,
  title: z.string().min(3),
  status: z.literal('candidate'),
  evidenceLevel: z.literal('E3'),
  runtime: z.string().min(3),
  capabilityRole: z.enum([
    'interactive-visual-field',
    'kinetic-typography',
    'complete-page-adapter'
  ]),
  selectionReason: z.string().min(12),
  transferablePrinciple: z.string().min(12),
  sourceFiles: z.array(z.string().min(4)).min(1).max(8),
  promotionGates: z.array(z.string().min(12)).min(4).max(6)
}).strict();

export type MechanismPilotCandidate = z.infer<typeof mechanismPilotCandidateSchema>;

export const threeUiSourceProfile: ExternalCapabilitySourceProfile = externalCapabilitySourceProfileSchema.parse({
  id: 'threeui-community',
  title: 'ThreeUI Community · 可追溯互动效果与完整页面目录',
  status: 'source-reviewed',
  referenceEligibility: 'research-only',
  catalogUri: 'https://threeui.com/',
  repositoryUri: 'https://github.com/MengTo/threeui',
  mcpUri: 'https://threeui.com/api/mcp',
  reviewedRevision: '68802d5428071ada5c20db8094b1649e6bb770ed',
  packageName: '@designcodeio/threeui',
  packageVersion: '1.2.0',
  evidenceLevel: 'E3',
  referenceValue: 'high',
  directIntegrationValue: 'medium',
  authoringPolicy: 'principles-only-not-style-rules',
  runtimeDependencyPolicy: 'research-first-no-package-install',
  automaticPromotion: false,
  capabilityRoles: [
    '按 runtime、interaction、asset、controls 与 variants 检索视觉机制',
    '提供 Community Shader、Three.js、Canvas、DOM/CSS 与声音实现证据',
    '提供可观察预览、源码清单、实现提示与完整页面适配示例',
    '提供 resize、DPR、可见性暂停、reduced motion 与资源释放样本'
  ],
  licenseBoundary: [
    'Community package 代码和 ThreeUI 自有 Community 素材按仓库 MIT 条款审阅。',
    '随仓库提供的字体使用 SIL OFL，复用时仍需保留对应授权与版权说明。',
    '远程缩略图和预览视频不随 Community 仓库许可证授权，不得归档为项目资产。',
    'Pro 与 Beta 源码及专属素材未包含在 Community 仓库中，不得从预览反向重建。'
  ],
  advisoryRisks: [
    '目录包含大量 Hero、背景与局部效果，直接拼接不能替代完整产品结构与用户行动。',
    '包以 React 组件为主要入口，直接安装会给当前 KAGE 运行边界增加框架、Three 版本和资源路径耦合。',
    '完整页面 iframe 与原生可组合组件具有不同语义、性能和降级边界，必须分别验证。'
  ],
  reviewedAt: '2026-09-03'
});

export const threeUiObservedReferences: readonly ObservedReferenceStudy[] = [
  {
    id: 'threeui-anima',
    sourceId: 'threeui-community',
    title: 'Anima · 语义主体、信号聚合与局部指针场',
    status: 'runtime-observed',
    referenceEligibility: 'inspiration-only',
    evidenceLevel: 'E2',
    publicEvidence: 'video-preview',
    sourceAvailability: 'pro-gated',
    promotionDecision: 'hold',
    experiencePromise: '把抽象的感知与信号命题变成一个从模糊噪声中逐渐显现、并会响应指针的可识别人物主体。',
    confirmedObservations: [
      '官方说明明确包含程序化点云人物半身像、耳机、dust、haze、stars 与 bloom 的层次组合。',
      '官方说明明确描述入场从模糊走向聚焦，并让界面元素逐项变得清晰。',
      '官方说明明确描述局部 pointer field 会让核心信号围绕指针分开。',
      '公开详情页实际展示成品视频，不提供可操作 Canvas、参数控制或 Community 源码。'
    ],
    borrowPrinciples: [
      '优先选择能表达产品命题的可识别主体，而不是默认使用无语义的随机几何。',
      '围绕同一产品隐喻建立一个签名动态现象，使入场、环境层和互动共享视觉语言。',
      '让指针或滚动直接改变核心主体状态，避免把互动退化成装饰性光标或旁路动画。',
      '用主体、近景粒子、空气层与界面清晰度形成连续空间，而不是把素材贴在背景上。'
    ],
    caseSpecificShell: ['黑白暗色', '中央人物', '点云', 'bloom', '超大标题', '耳机与星尘'],
    unknowns: [
      '公开证据不能确认几何生成、点云采样、后期处理和交互场的具体实现。',
      '公开证据不能确认移动端、reduced motion、WebGL 降级、资源预算和销毁行为。'
    ],
    promotionGates: [
      '获得合法可审阅源码或选择 Community 中机制等价但身份不同的候选。',
      '完成真实浏览器中的交互前后、移动端、reduced motion 与失败降级证据。',
      '证明借用的是语义主体与签名现象原则，而不是复刻黑白点云人物外壳。',
      '证明该原则能提升一次 KAGE 产品创作决策，而不只是制造更花哨的 Hero。'
    ],
    uri: 'https://threeui.com/hero/anima',
    confidence: 0.72,
    reviewedAt: '2026-09-03'
  }
].map((study) => observedReferenceStudySchema.parse(study));

export const threeUiMechanismPilotCandidates: readonly MechanismPilotCandidate[] = [
  {
    id: 'threeui-liquid-form-pilot',
    sourceId: 'threeui-community',
    title: 'Liquid Form · 主题化交互 Shader 与完整 WebGL 生命周期',
    status: 'candidate',
    evidenceLevel: 'E3',
    runtime: 'Raw WebGL',
    capabilityRole: 'interactive-visual-field',
    selectionReason: '验证一个强视觉主体如何响应指针，同时保持 DPR、可见性暂停、缩放和资源释放边界。',
    transferablePrinciple: '由一个主题化视觉现象承担记忆点，并让输入改变现象本身；运行生命周期必须与视觉质量同等完整。',
    sourceFiles: ['src/shaders/liquid-form/LiquidFormBackground.tsx'],
    promotionGates: [
      '固定源码 revision，并在隔离页面复现默认状态与真实指针状态。',
      '验证桌面、390px、reduced motion、页面隐藏与 ResizeObserver 路径。',
      '验证 WebGL 初始化失败时核心产品内容和行动仍可使用。',
      '确认 teardown 删除动画帧、观察器、buffer、shader 与 program。',
      '只沉淀交互场与生命周期原则，不沉淀银色液态外观。'
    ]
  },
  {
    id: 'threeui-article-headings-pilot',
    sourceId: 'threeui-community',
    title: 'Article Headings · 动态排版承担状态与节奏',
    status: 'candidate',
    evidenceLevel: 'E3',
    runtime: 'DOM/CSS + Canvas 2D',
    capabilityRole: 'kinetic-typography',
    selectionReason: '补足不依赖中央 3D 主体的吸睛方式，并验证排版动画能否承担产品状态交接而非纯装饰。',
    transferablePrinciple: '让可读语义文本保持内容真相，视觉复制层只负责节奏、反馈和状态转变。',
    sourceFiles: [
      'src/shaders/article-headings/TextAnimationCollection.tsx',
      'src/shaders/article-headings/articleHeadingDecode.ts'
    ],
    promotionGates: [
      '验证真实标题在动画前后均保留语义、选择与可访问性。',
      '验证键盘、reduced motion、字体加载失败和窄屏换行状态。',
      '证明动效解释一次产品状态变化，而不只是循环播放。',
      '记录性能与销毁行为，并避免动画副本进入可访问性树。',
      '只沉淀排版状态交接原则，不复制字库、文案或原始构图。'
    ]
  },
  {
    id: 'threeui-kage-page-adapter-pilot',
    sourceId: 'threeui-community',
    title: 'Kage Landing Page · 完整页面与视觉运行时的隔离适配',
    status: 'candidate',
    evidenceLevel: 'E3',
    runtime: 'Full HTML + DOM/CSS + Three.js in sandboxed iframe',
    capabilityRole: 'complete-page-adapter',
    selectionReason: '验证完整视觉世界如何保留导航、滚动、内容和降级边界，避免把 KAGE 产品退化成单一 Hero 效果。',
    transferablePrinciple: '当源体验是完整文档时保持其运行边界与资产关系；宿主负责进入、退出、尺寸、权限和失败回退。',
    sourceFiles: [
      'src/shaders/landing-pages/LandingPages.tsx',
      'public/landing-pages/kage.html'
    ],
    promotionGates: [
      '核对完整页面源码、所有本地资产、来源与许可，不依赖远程预览媒体。',
      '验证 sandbox 权限、页面加载失败、浏览历史、焦点和滚动接管行为。',
      '验证桌面、390px、reduced motion、WebGL 失败和销毁后的资源状态。',
      '证明适配器能承载完整产品路径，而不是把第三方页面包装成自己的交付。',
      '只沉淀完整文档隔离策略，不复制页面身份、品牌、场景和内容。'
    ]
  }
].map((candidate) => mechanismPilotCandidateSchema.parse(candidate));

export function getThreeUiResearchBridgeSummary() {
  return {
    sourceId: threeUiSourceProfile.id,
    observedReferences: threeUiObservedReferences.length,
    mechanismPilotCandidates: threeUiMechanismPilotCandidates.length,
    promotedReferences: 0,
    runtimeDependenciesAdded: 0,
    status: 'research-bridge-ready'
  } as const;
}
