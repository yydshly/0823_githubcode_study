import { z } from 'zod';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const experiencePatternSchema = z.enum([
  'continuous-scroll',
  'environmental-memory',
  'product-atmosphere',
  'material-transformation',
  'spatial-exploration',
  'editorial-field'
]);

export type ExperiencePattern = z.infer<typeof experiencePatternSchema>;

export const referenceCardSchema = z.object({
  id: safeId,
  title: z.string().min(2),
  sourceKind: z.enum(['local-runtime', 'github-source', 'external-catalog']),
  evidenceLevel: z.enum(['runtime-verified', 'catalog-metadata']),
  sourceUrl: z.string().min(1),
  confidence: z.number().min(0).max(1),
  signals: z.array(z.string().min(1)).min(3),
  patterns: z.array(experiencePatternSchema).min(1),
  composition: z.array(z.string().min(8)).min(1),
  motion: z.array(z.string().min(8)).min(1),
  assetLogic: z.array(z.string().min(8)).min(1),
  transferable: z.array(z.string().min(8)).min(1),
  avoid: z.array(z.string().min(8)).min(1)
}).strict();

export type ReferenceCard = z.infer<typeof referenceCardSchema>;

export interface ReferenceMatch {
  reference: ReferenceCard;
  score: number;
  matchedSignals: readonly string[];
  rationale: readonly string[];
}

const cards: readonly ReferenceCard[] = [
  {
    id: 'kage-fashion-depth-field',
    title: '先锋时装 · 全屏材质场',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-ba4e9d10caaa-depth-field/',
    confidence: .96,
    signals: ['时装', '服装', '编辑', '薄纱', '液态', '透明', 'fashion', 'editorial', 'fluid'],
    patterns: ['material-transformation', 'editorial-field'],
    composition: ['透明主体位于全屏材质场中，文字、主体和背景共同构成一个连续画面。'],
    motion: ['滚动改变材质、景深和主体显现程度，避免把主体当成独立海报移动。'],
    assetLogic: ['透明主体素材承担识别与材质细节，Three.js 只增强融合、景深和连续运动。'],
    transferable: ['适合时装、珠宝、香氛和抽象材料发布页的全屏主体融合。'],
    avoid: ['不要恢复矩形主图边框，也不要用巨型文字遮挡主体的识别区域。']
  },
  {
    id: 'kage-night-greenhouse',
    title: '夜生表皮温室 · 资产叙事',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-r36-delivery-final/',
    confidence: .98,
    signals: ['生物', '种子', '生长', '建筑', '材料', '温室', '纤维', 'organic', 'growth'],
    patterns: ['material-transformation', 'continuous-scroll'],
    composition: ['同一生物材料从种荚、纤维到建筑表皮持续转化，阶段不同但视觉血缘一致。'],
    motion: ['变化由滚动推进并保持单向因果关系，最终稳定为可理解的建筑空间。'],
    assetLogic: ['多个模型素材分别承担关键状态，必须以共同材质、光向和轮廓维持连续性。'],
    transferable: ['适合成长、制造、材料转化和过程型品牌叙事。'],
    avoid: ['不要使用互不相关的漂亮图片，也不要让粒子装饰替代真正的状态变化。']
  },
  {
    id: 'kage-cloud-observatory',
    title: '云上观测站 · 连续空间旅程',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-896cfb7e6657/',
    confidence: .96,
    signals: ['空间', '建筑', '云', '观测', '天文', '进入', '旅程', '星图', 'journey', 'space'],
    patterns: ['spatial-exploration', 'continuous-scroll'],
    composition: ['外景、入口与内部终点形成连续空间坐标，镜头推进负责解释位置关系。'],
    motion: ['滚动完成接近、穿越和展开，远景、中景与终局停留具有明确职责。'],
    assetLogic: ['连续环境素材必须共享地点、机位逻辑、天气和色彩，不能只是三个独立概念图。'],
    transferable: ['适合建筑、文化空间、目的地和带有进入感的未来场景。'],
    avoid: ['不要用持续前推代替空间叙事，也不要让每一屏更换无关联场所。']
  },
  {
    id: 'kage-smart-audio',
    title: '智能声音产品 · 主体锚定',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-1edb98865f4c/',
    confidence: .95,
    signals: ['声音', '音频', '声学', '设备', '硬件', '产品', 'audio', 'sound', 'device'],
    patterns: ['product-atmosphere', 'continuous-scroll'],
    composition: ['产品始终是画面锚点，氛围建立、能力解释和行动收束围绕同一主体完成。'],
    motion: ['镜头和声波反馈解释产品状态，不用无目的旋转或鼠标晃动制造虚假互动。'],
    assetLogic: ['可信产品素材承担轮廓和材质，程序化声场承担不可见能力的可视化。'],
    transferable: ['适合声音、创作工具、可穿戴设备和小型硬件发布页。'],
    avoid: ['没有可信模型时不要伪造可拆解产品，也不要让抽象粒子抢走产品焦点。']
  },
  {
    id: 'kage-dream-room',
    title: '梦境记录 · 同一房间的记忆形成',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-8574ee46ab16/',
    confidence: .98,
    signals: ['梦', '梦境', '记忆', '醒来', '房间', '模糊', '安静', 'dream', 'memory'],
    patterns: ['environmental-memory', 'continuous-scroll'],
    composition: ['始终保持同一房间、机位与晨光，让模糊到清晰成为可信的记忆变化。'],
    motion: ['滚动控制环境清晰度、碎片聚合和空间深度，最终把注意力收束到记录行动。'],
    assetLogic: ['连续环境素材承担真实空间，Three.js 只添加记忆回声、景深和过渡，不遮盖空间证据。'],
    transferable: ['适合记忆、睡眠、心理、档案回想和安静的情绪产品。'],
    avoid: ['不要生成三个无关联梦境画面，也不要把安静主题变成霓虹科技界面。']
  },
  {
    id: 'kage-rain-recorder',
    title: '雨声记录器 · 单主体连续状态',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-1b9f0b05107b/',
    confidence: .97,
    signals: ['雨', '清晨', '记录器', '窗边', '共振', '声音', '桌面产品', 'rain', 'recorder'],
    patterns: ['product-atmosphere', 'material-transformation'],
    composition: ['同一台产品贯穿开场、能力显现和终点，环境只为主体提供真实尺度和情绪。'],
    motion: ['雨滴、膜片振动、声波与记录灯形成可读因果链，终点主动安静下来。'],
    assetLogic: ['透明产品主体和全屏环境分别承担产品识别与空间可信度，两者需共用光向和色温。'],
    transferable: ['适合单一实体产品、感官设备和功能随时间显现的发布叙事。'],
    avoid: ['不要拆成无关零件展示，也不要让辉光、波纹或文案遮住最终产品状态。']
  },
  {
    id: 'kage-paper-restoration',
    title: '纸张修复工坊 · 证据驱动的同一对象变化',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-7c944e0c386f/',
    confidence: .97,
    signals: ['纸张', '文献', '修复', '纤维', '档案', '手工', 'paper', 'restoration'],
    patterns: ['material-transformation', 'editorial-field'],
    composition: ['同一页文献在近距离纤维、补纸与复读证据之间变化，过程证据比抽象氛围更重要。'],
    motion: ['滚动推进修复步骤，但每一步都必须能指出同一对象上的具体变化。'],
    assetLogic: ['破损态与修复态素材共享纸页形状、光线和工作台坐标，Three.js 只解释纤维与裂缝。'],
    transferable: ['适合修复、制造、工艺、教育和需要前后证据的过程叙事。'],
    avoid: ['不要用互不相关的旧纸图片，也不要让暖色氛围替代可读的修复证据。']
  },
  {
    id: 'kage-xuhui-place-evidence',
    title: '徐汇滨江饮水图册 · 真实地域证据',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-c0514ddead80/',
    confidence: .96,
    signals: ['地图', '地域', '地理', '公共服务', '公共设施', '饮水点', '站点', '路线', '距离', '导航', 'map', 'place'],
    patterns: ['editorial-field', 'spatial-exploration'],
    composition: ['真实街道、水系和地标形成全屏信息场，DOM 图册与 Three.js 标记共享同一地理坐标。'],
    motion: ['站点选择改变路线、高亮和证据内容，指针与滚动只解释空间关系，不制造装饰性漂移。'],
    assetLogic: ['带授权和署名的真实地理底图承担地点可信度；业务点与数值缺少真实来源时必须明确标为演示。'],
    transferable: ['适合公共设施、地域导览、城市档案和地点会影响用户判断的网页。'],
    avoid: ['不要用随机街区、抽象曲线或粒子冒充地图，也不要把演示点位包装成真实设施。']
  },
  {
    id: 'kage-cinema-memory-archive',
    title: '最后亮着的老招牌 · 同址年代档案',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-76102bb2158c/',
    confidence: .97,
    signals: ['电影院', '影院', '票根', '老招牌', '城市记忆', '城市档案', '年代', '同一地点', '放映', 'cinema', 'archive'],
    patterns: ['editorial-field', 'environmental-memory'],
    composition: ['白天街区影像与编辑档案层共享同一画面，年代证据通过同一机位对齐，不使用标准地图或章节卡片。'],
    motion: ['年代选择同步改变立面、票根、放映声和画面时间状态；滚动只负责从街景进入比对并收束到保存行动。'],
    assetLogic: ['一张同一建筑与同一机位的跨年代连续素材承担身份稳定性；无真实来源时必须明确标注为虚构场景的艺术化演绎。'],
    transferable: ['适合城市记忆、建筑变迁、地方文化、口述史和同一地点跨时间比较的网页。'],
    avoid: ['不要把档案自动做成空间地图，也不要用互不相关的年代图片伪装同址变化。']
  },
  {
    id: 'kage-scent-memory',
    title: '气味标本室 · 语义比例交互',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-ef118f0f4962/',
    confidence: .96,
    signals: ['气味', '香味', '标本', '混合', '比例', '记忆', 'scent', 'perfume'],
    patterns: ['environmental-memory', 'spatial-exploration'],
    composition: ['三种气味证据共享同一标本室语境，信息、材质和容器围绕混合关系组织。'],
    motion: ['指针或触摸真正改变混合比例、画面权重和文字结果，而不是只产生视差。'],
    assetLogic: ['真实环境素材承担博物馆与实验室语境，程序化层只把不可见比例转成可读状态。'],
    transferable: ['适合香氛、配方、声音混合、饮品和多因素比较类体验。'],
    avoid: ['不要用无意义粒子代表气味，也不要把三种成分拆成互不影响的海报章节。']
  },
  {
    id: 'kage-community-repair-diagnostic',
    title: '先听它怎么说 · 街坊风扇诊断台',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-5694e0a3a022/',
    confidence: .97,
    signals: ['维修', '诊断', '故障', '拆解', '装配图', '检查顺序', '安全提示', '工作坊', 'repair', 'diagnostic'],
    patterns: ['editorial-field', 'material-transformation'],
    composition: ['明亮说明书网格、程序化对象和诊断卡共享同一工作台；对象不是中央海报，而是选择与步骤的可视证据。'],
    motion: ['症状选择同步改变高亮部件、检查顺序、安全提示与难度；阶段进度只负责诊断、拆解和测试。'],
    assetLogic: ['不对应真实商业型号时可用程序化装配示意；SDK Canvas 位于语义根节点下方，因此内容根必须透明，背景放在 body。'],
    transferable: ['适合维修、装配、教学、故障排查、实验步骤和其他明亮实用工具页。'],
    avoid: ['不要把工具页重新做成暗色产品海报，也不要让不透明根背景遮住程序化 Canvas。']
  },
  {
    id: 'kage-night-wind-instrument',
    title: '读取今夜的风 · 物理响应装置',
    sourceKind: 'local-runtime',
    evidenceLevel: 'runtime-verified',
    sourceUrl: '../cases/dedicated-191bc3ce2125/',
    confidence: .97,
    signals: ['风速', '气象', '窗边', '纤维带', '温湿度', '风向', '气流', 'wind', 'weather'],
    patterns: ['product-atmosphere', 'continuous-scroll'],
    composition: ['窗边装置、真实房间和可读气象证据保持同一尺度，主体不被界面仪表包围。'],
    motion: ['纤维弯曲、读数和气流轨迹共享同一个风速变量，建立可验证的物理因果。'],
    assetLogic: ['环境图像承担材质与尺度，Three.js 只生成装置响应和沿气流出现的信息证据。'],
    transferable: ['适合天气、环境传感器、健康设备和以物理变化解释数据的产品。'],
    avoid: ['不要把数据做成玻璃仪表盘，也不要以随机粒子冒充有方向和速度的真实气流。']
  },
  {
    id: 'threejs-iris-articulated-reveal',
    title: 'IRIS · 程序化关节主体展开',
    sourceKind: 'github-source',
    evidenceLevel: 'runtime-verified',
    sourceUrl: 'https://iamtechartist.github.io/Threejs-3D-Webpage/',
    confidence: .94,
    signals: ['展开', '绽放', '组装', '机械', '关节', '结构', '核心', '程序化', 'iris', 'articulated', 'reveal'],
    patterns: ['material-transformation', 'product-atmosphere', 'continuous-scroll'],
    composition: ['单一程序化主体与固定画布贯穿全程，DOM 内容围绕结构展开而不是逐屏更换背景。'],
    motion: ['全局滚动被映射为各部件错峰局部进度，并同步相机、材质、灯光、雾和后期。'],
    assetLogic: ['只在抽象机械、生物结构或构造过程就是主题时使用程序化可动主体；真实商品仍需要可信资产。'],
    transferable: ['适合抽象装置、材料结构、机械花、生物构造和组装或解构型叙事。'],
    avoid: ['不要复制花瓣外形或黑金风格，也不要用程序化几何伪装真实产品、人物或建筑。']
  },
  {
    id: 'motionsites-interactive-discovery',
    title: 'MotionSites · Interactive Discovery',
    sourceKind: 'external-catalog',
    evidenceLevel: 'catalog-metadata',
    sourceUrl: 'https://motionsites.ai/?prompt=interactive-discovery',
    confidence: .46,
    signals: ['探索', '发现', '交互', '选择', '路径', '互动', 'interactive', 'discovery'],
    patterns: ['spatial-exploration', 'editorial-field'],
    composition: ['目录证据表明它属于交互式 Hero，可作为“首屏即发生探索”的方向索引。'],
    motion: ['只借鉴交互发现的节奏命题；未取得完整提示词前不推断具体动画实现。'],
    assetLogic: ['外部目录只提供方向信号，具体素材策略必须由当前 brief 和本地运行证据决定。'],
    transferable: ['适合作为探索型首屏和非线性入口的弱证据补充。'],
    avoid: ['不要把目录缩略图或未知提示词当成已经验证的 Three.js 实现。']
  },
  {
    id: 'motionsites-scroll-landing',
    title: 'MotionSites · Scroll Landing Page',
    sourceKind: 'external-catalog',
    evidenceLevel: 'catalog-metadata',
    sourceUrl: 'https://motionsites.ai/?prompt=scroll-landing',
    confidence: .46,
    signals: ['滚动', '长页', '发布页', '叙事', 'scroll', 'landing', 'timeline'],
    patterns: ['continuous-scroll', 'product-atmosphere'],
    composition: ['目录将其标记为 Interactive，可作为滚动承担连续变化的方向索引。'],
    motion: ['参考滚动作为统一时间轴，而不是为每个区块堆叠互不相关的入场动画。'],
    assetLogic: ['素材必须绑定滚动状态和视觉职责，不能只作为区块背景轮播。'],
    transferable: ['适合产品发布、品牌长页和状态逐步形成的体验。'],
    avoid: ['不要复制固定区块数量，也不要把普通淡入误认为沉浸式叙事。']
  },
  {
    id: 'motionsites-immersive-studio',
    title: 'MotionSites · Immersive Studio',
    sourceKind: 'external-catalog',
    evidenceLevel: 'catalog-metadata',
    sourceUrl: 'https://motionsites.ai/?prompt=immersive-studio',
    confidence: .44,
    signals: ['工作室', '创意', '作品集', '品牌', '沉浸', 'studio', 'creative', 'portfolio'],
    patterns: ['editorial-field', 'spatial-exploration'],
    composition: ['目录把它归入沉浸式工作室方向，可用于提醒页面需要品牌世界而非通用科技背景。'],
    motion: ['运动应服务身份、作品证据和最终记忆点，不能只是连续悬浮。'],
    assetLogic: ['真实作品、品牌字体和内容证据优先于额外的抽象三维装饰。'],
    transferable: ['适合创意机构、作品集和身份驱动的网站方向。'],
    avoid: ['不要在缺少品牌证据时用随机 3D 物体冒充创意身份。']
  }
].map((card) => referenceCardSchema.parse(card));

export const referenceLibrary: readonly ReferenceCard[] = cards;

export function selectReferenceEvidence(
  brief: string,
  pattern: ExperiencePattern,
  limit = 3
): readonly ReferenceMatch[] {
  const normalized = brief.toLowerCase();
  const scored = referenceLibrary.map((reference) => {
    const matchedSignals = reference.signals.filter((signal) => normalized.includes(signal.toLowerCase()));
    const patternMatch = reference.patterns.includes(pattern);
    const evidenceBoost = reference.evidenceLevel === 'runtime-verified' ? 3 : 1;
    const score = matchedSignals.length * 5 + (patternMatch ? 4 : 0) + evidenceBoost + reference.confidence;
    const rationale = [
      ...(matchedSignals.length ? [`命中 ${matchedSignals.join('、')}。`] : []),
      ...(patternMatch ? [`支持 ${pattern} 体验模式。`] : []),
      reference.evidenceLevel === 'runtime-verified'
        ? '来自已归档并经过浏览器验证的本地最终案例。'
        : '只作为外部目录方向信号，不当作实现已验证。'
    ];
    return { reference, score, matchedSignals, rationale };
  }).sort((a, b) => b.score - a.score || a.reference.id.localeCompare(b.reference.id));

  const selected: ReferenceMatch[] = [];
  const verifiedMatches = scored.filter((match) => match.reference.sourceKind !== 'external-catalog');
  const externalMatches = scored.filter((match) => match.reference.sourceKind === 'external-catalog');
  if (verifiedMatches[0]) selected.push(verifiedMatches[0]);
  const secondVerified = verifiedMatches.find((match) => match.reference.id !== selected[0]?.reference.id && (match.matchedSignals.length > 0 || match.reference.patterns.includes(pattern)));
  if (secondVerified) selected.push(secondVerified);
  const external = externalMatches.find((match) => match.matchedSignals.length > 0 || match.reference.patterns.includes(pattern));
  if (external && selected.length < limit) selected.push(external);
  for (const match of scored) {
    if (selected.length >= Math.max(1, Math.min(3, limit))) break;
    if (!selected.some((item) => item.reference.id === match.reference.id)) selected.push(match);
  }
  return selected.slice(0, Math.max(1, Math.min(3, limit)));
}

/**
 * Positive references are a separate, evidence-bearing layer for the direct
 * Codex authoring pass. The legacy cards above remain available to the V2
 * research contract, while this layer refuses to inject a reference when the
 * user's brief has no semantic match.
 */
export const referenceCapabilityCategorySchema = z.enum([
  'continuous-asset-story',
  'spatial-environment-journey',
  'anchored-product-causality',
  'evidence-led-editorial',
  'semantic-direct-interaction',
  'articulated-spatial-reveal'
]);

export type ReferenceCapabilityCategory = z.infer<typeof referenceCapabilityCategorySchema>;

/**
 * Describes the page-scale composition of a reference independently from the
 * capability it proves. Keeping this axis separate lets selection avoid
 * returning several references that all imply the same macro skeleton.
 */
export const referenceMacroStructureCategorySchema = z.enum([
  'fixed-single-subject-overlay-workbench',
  'editorial-flow',
  'spatial-journey',
  'spatial-inspection',
  'object-field',
  'single-stage',
  'horizontal-panorama',
  'sequence',
  'catalog',
  'branching-confluence'
]);

export type ReferenceMacroStructureCategory = z.infer<typeof referenceMacroStructureCategorySchema>;

export const referenceEvidenceArtifactSchema = z.object({
  kind: z.enum(['screenshot', 'runtime', 'source-review']),
  uri: z.string().min(1),
  claim: z.string().min(8),
  verified: z.literal(true)
}).strict();

export type ReferenceEvidenceArtifact = z.infer<typeof referenceEvidenceArtifactSchema>;

export const referenceEvidencePackSchema = z.object({
  id: safeId,
  category: referenceCapabilityCategorySchema,
  // Default keeps previously persisted packs parseable. Curated packs below
  // set this explicitly so they do not silently collapse to one structure.
  macroStructureCategory: referenceMacroStructureCategorySchema.default('sequence'),
  title: z.string().min(2),
  source: z.object({
    kind: z.enum(['local-runtime', 'local-prototype', 'github-source']),
    uri: z.string().min(1),
    evidenceLevel: z.enum(['runtime-verified', 'source-and-runtime-verified'])
  }).strict(),
  evidence: z.array(referenceEvidenceArtifactSchema).min(1).max(4),
  signals: z.array(z.string().min(2)).min(3),
  patterns: z.array(experiencePatternSchema).min(1),
  observedMechanism: z.array(z.string().min(8)).min(1).max(4),
  positiveBorrowPrinciples: z.array(z.string().min(8)).min(1).max(4),
  relevanceReason: z.string().min(8),
  confidence: z.number().min(0).max(1),
  advisoryRisks: z.array(z.string().min(8)).max(3)
}).strict();

export type ReferenceEvidencePack = z.infer<typeof referenceEvidencePackSchema>;

const positiveReferencePacks: readonly ReferenceEvidencePack[] = [
  {
    id: 'positive-night-greenhouse-continuity',
    category: 'continuous-asset-story',
    macroStructureCategory: 'sequence',
    title: '夜生表皮温室 · 同源状态连续转化',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-r36-delivery-final/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'evidence/r36-final-opening.png',
        claim: '已保存的开场截图显示种荚状态与暗场空间的统一视觉血缘。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'evidence/r36-final-ending.png',
        claim: '已保存的结尾截图显示同源材料收束为可理解的建筑表皮。',
        verified: true
      }
    ],
    signals: ['种子', '种荚', '生长', '温室', '纤维', '生物材料', '表皮', 'growth'],
    patterns: ['material-transformation', 'continuous-scroll'],
    observedMechanism: [
      '多个关键状态共享材质、光向与轮廓，滚动只推进同一对象的连续转化。',
      '开场与结尾承担可比较的起点和结果，中间状态负责解释形成过程。'
    ],
    positiveBorrowPrinciples: [
      '为同一主体规划少量可比较的关键状态，并保持身份、尺度和光照连续。',
      '让每次滚动变化都解释主体如何形成，而不是轮播互不相关的漂亮画面。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中生长、种子、材料转化或温室语义时使用。',
    confidence: .98,
    advisoryRisks: [
      '阶段素材若缺少共同身份特征，连续叙事会被感知为图片轮播。',
      '装饰性粒子若承担主要变化，过程因果与最终结果会变得不可读。'
    ]
  },
  {
    id: 'positive-dream-room-memory',
    category: 'continuous-asset-story',
    macroStructureCategory: 'sequence',
    title: '梦境记录 · 同一房间逐渐形成',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-8574ee46ab16/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'evidence/r41-dream-journal-live/exact-state-final/desktop-opening.png',
        claim: '已保存的开场截图显示同一房间在刚醒来时的模糊环境状态。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'evidence/r41-dream-journal-live/exact-state-final/desktop-ending.png',
        claim: '已保存的结尾截图显示同一空间逐渐清晰并收束到记录行动。',
        verified: true
      }
    ],
    signals: ['梦境', '做梦', '醒来', '记忆逐渐形成', '记忆碎片', '房间', '睡眠', '梦日记', 'dream'],
    patterns: ['environmental-memory', 'continuous-scroll'],
    observedMechanism: [
      '同一房间、机位和晨光保持稳定，模糊度、碎片与空间深度承载记忆形成。',
      '环境从不可辨认到可探索，再把注意力收束到明确的记录行动。'
    ],
    positiveBorrowPrinciples: [
      '用同一环境的可见状态变化表达记忆形成，保持地点与观察关系稳定。',
      '把视觉变化与最终记录行为建立因果联系，使情绪服务于产品行动。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中梦境、醒来、记忆或同一房间语义时使用。',
    confidence: .98,
    advisoryRisks: [
      '空间身份若在阶段间变化，用户会把过程理解成互不相关的梦境拼贴。',
      '强烈霓虹或通用科技装饰会削弱安静、真实的记忆质感。'
    ]
  },
  {
    id: 'positive-cloud-observatory-journey',
    category: 'spatial-environment-journey',
    macroStructureCategory: 'spatial-journey',
    title: '云上观测站 · 可定位的空间旅程',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-896cfb7e6657/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'evidence/r38-observatory-opening.png',
        claim: '已保存的开场截图显示观测站外景与接近路线的空间定位。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'evidence/r38-observatory-ending.png',
        claim: '已保存的结尾截图显示进入内部后星图展开的空间终点。',
        verified: true
      }
    ],
    signals: ['观测站', '天文', '星图', '云海', '穹顶', '穿越空间', '进入建筑', 'observatory'],
    patterns: ['spatial-exploration', 'continuous-scroll'],
    observedMechanism: [
      '外景、入口与内部终点共享地点坐标，远中近景分别解释接近、穿越和到达。',
      '镜头位移由滚动控制，同时保留可定位的建筑线索与明确停留点。'
    ],
    positiveBorrowPrinciples: [
      '先定义一条可理解的空间路线，再让镜头、遮挡和尺度变化服务于路线。',
      '让每个阶段保留上一阶段的地点证据，使用户能判断自己从哪里来到哪里。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中观测站、天文、穹顶或进入建筑的空间旅程语义时使用。',
    confidence: .96,
    advisoryRisks: [
      '连续前推若缺少入口与地标，空间叙事会退化为无目的镜头运动。',
      '环境素材若来自不同地点或天气，穿越关系会失去可信度。'
    ]
  },
  {
    id: 'positive-smart-audio-anchor',
    category: 'anchored-product-causality',
    macroStructureCategory: 'fixed-single-subject-overlay-workbench',
    title: '智能声音产品 · 主体与能力因果绑定',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-1edb98865f4c/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'evidence/r40-smart-audio-live/desktop-opening.png',
        claim: '已保存的开场截图显示同一声音产品作为页面持续视觉锚点。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'evidence/r40-smart-audio-live/desktop-middle.png',
        claim: '已保存的中段截图显示产品状态与声场能力在同一构图内联动。',
        verified: true
      }
    ],
    signals: ['声音产品', '音频设备', '声学设备', '扬声器', '耳机', '录音设备', '调音', 'audio'],
    patterns: ['product-atmosphere', 'continuous-scroll'],
    observedMechanism: [
      '实体产品持续作为视觉锚点，程序化声场只解释不可见的声音能力。',
      '氛围、能力说明与最终行动围绕同一主体和同一状态变量展开。'
    ],
    positiveBorrowPrinciples: [
      '让可信产品主体贯穿体验，并把抽象反馈绑定到具体功能状态。',
      '用声音、波形或空间响应补充产品特性，同时保持主体轮廓和操作结果可读。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中声音产品、音频设备、录音或调音语义时使用。',
    confidence: .95,
    advisoryRisks: [
      '抽象声场若脱离产品状态，交互会显得装饰化且无法解释功能。',
      '产品资产若缺少可信轮廓与材质，氛围强化反而会放大识别问题。'
    ]
  },
  {
    id: 'positive-paper-restoration-evidence',
    category: 'evidence-led-editorial',
    macroStructureCategory: 'editorial-flow',
    title: '纸张修复工坊 · 同一对象的过程证据',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-7c944e0c386f/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'pages/v2/assets/verified-examples/paper-restoration.jpg',
        claim: 'V2 已验证示例截图显示纸页、修复工具与编辑证据在同一工作台中组织。',
        verified: true
      }
    ],
    signals: ['纸张修复', '文献修复', '古籍', '纸纤维', '补纸', '档案修复', '修复证据', 'restoration'],
    patterns: ['material-transformation', 'editorial-field'],
    observedMechanism: [
      '同一页文献保持位置与尺度可比，破损、补纸和复读证据逐步出现。',
      '编辑排版负责解释证据，近距离材质负责证明对象真的发生变化。'
    ],
    positiveBorrowPrinciples: [
      '围绕同一对象组织前后证据，让过程文本指向画面中的具体变化。',
      '把排版、工具与材质细节组合成可检查的工作台，而不是纯氛围海报。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中纸张、文献、古籍或修复证据语义时使用。',
    confidence: .97,
    advisoryRisks: [
      '对象位置或形状若无法前后对齐，修复结果会缺少可验证性。',
      '暖色与旧纸质感若取代具体证据，页面会只剩复古氛围。'
    ]
  },
  {
    id: 'positive-semantic-direct-interaction',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'object-field',
    title: '潮线证词 · 输入、画面与结果共享状态',
    source: {
      kind: 'local-prototype',
      uri: '../pages/v2/prototypes/semantic-interaction/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'pages/v2/assets/verified-examples/semantic-interaction.jpg',
        claim: 'V2 已验证原型截图显示直接控制、画面变化与数值结果位于同一任务界面。',
        verified: true
      }
    ],
    signals: ['配方', '混合比例', '参数联动', '参数滑块', '调节比例', '模拟结果', '前后对比', 'slider'],
    patterns: ['spatial-exploration', 'editorial-field', 'material-transformation'],
    observedMechanism: [
      '直接控制、滚动与演示共享一个有限状态，输入同步改变主体、数值和结论。',
      '人工输入接管自动演示，结果区持续解释当前状态的业务意义。'
    ],
    positiveBorrowPrinciples: [
      '让一个因果状态同时驱动画面、数值与结果文案，避免三套互不相干的反馈。',
      '提供可见的演示入口和人工接管，使用户能先理解效果再主动探索。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中配方、混合比例、参数滑块或模拟结果语义时使用。',
    confidence: .96,
    advisoryRisks: [
      '控制器若只改变标签或高亮，交互不会被理解为真实能力。',
      '自动演示若无法被人工输入接管，页面会产生失控与等待感。'
    ]
  },
  {
    id: 'positive-paper-butterfly-object-field',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'object-field',
    title: '纸蝶日光游园 · 同一对象场中的探索与收集',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/paper-butterfly-garden/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'pages/v2/assets/verified-examples/paper-butterfly-garden.jpg',
        claim: 'V2 已验证截图显示完整对象集合、当前选择与行动说明共享同一个明亮空间。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R120-PLAYFUL-SPATIAL-PROOF.md',
        claim: 'R120 研究记录验证指针、触摸、键盘、对象焦点与收集状态使用同一因果状态。',
        verified: true
      }
    ],
    signals: ['纸蝶', '蝴蝶', '对象场', '对象集合', '对象探索', '选择对象', '收集', '游园', '标本', '昆虫'],
    patterns: ['spatial-exploration'],
    observedMechanism: [
      '完整对象集合持续留在同一空间，选择只改变对象附近的焦点、说明与队形关系。',
      '指针、触摸和键盘共享选择状态，并让当前对象、收集进度与最终行动同步变化。'
    ],
    positiveBorrowPrinciples: [
      '让主题专属对象在同一可探索空间中保持位置关系，避免把对象拆成卡片目录。',
      '让一次选择同时驱动视觉焦点、局部说明、收集状态和最终行动。',
      '在移动端和增强能力降级时保留同一对象选择旅程。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中对象集合、选择对象、收集、昆虫或趣味探索语义时使用。',
    confidence: .98,
    advisoryRisks: [
      '对象场结构与 Three.js 没有必然关系，渲染方式应由当前主题和素材职责决定。',
      '通用圆点或图标会削弱主题身份，应让对象本身承担可辨识的视觉职责。'
    ]
  },
  {
    id: 'positive-sonic-editorial-feedback',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'editorial-flow',
    title: '午夜电台 · 声音、画面与说明共享状态',
    source: {
      kind: 'local-runtime',
      uri: '../generated-runs/dedicated-f9ed58e5b7ea/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R100-SONIC-EDITORIAL-DELIVERY.md',
        claim: 'R100 研究记录验证声音需显式启动，并与文字、可见状态、静音和音量控制共享因果状态。',
        verified: true
      },
      {
        kind: 'runtime',
        uri: 'cases/runs/dedicated-f9ed58e5b7ea/',
        claim: '本地运行案例提供三种可区分声音、键盘与按钮选择、播放控制和不可用降级。',
        verified: true
      }
    ],
    signals: ['自然声音', '环境声音', '声源', '聆听', '试听', '声景', '耳语', '雨点', '钟声', 'field recording', 'soundscape'],
    patterns: ['editorial-field'],
    observedMechanism: [
      '一个选择状态同时驱动可听声音、可见反馈、解释文字与最终结果。',
      '音频由用户手势启动，并提供播放、静音、音量和失败时的非阻断降级。'
    ],
    positiveBorrowPrinciples: [
      '让声音、声源位置、可见反馈和解释文字绑定到同一个选择状态。',
      '只在用户明确操作后播放，并提供停止、静音、音量与诚实的不可用提示。',
      '明确声音是现场录音、授权素材还是程序化预览，避免伪造来源。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中自然声音、环境声音、声源、聆听或声景语义时使用。',
    confidence: .95,
    advisoryRisks: [
      '该案例的视觉验收仅为研究级，网格、圆环与文字构图不作为视觉参考。',
      '程序化声音只能标注为模拟预览，不能暗示为现场录音或真实自然档案。'
    ]
  },
  {
    id: 'positive-community-repair-diagnostic',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'editorial-flow',
    title: '社区风扇诊断台 · 同一对象上的检查判断',
    source: {
      kind: 'local-runtime',
      uri: '../cases/dedicated-5694e0a3a022/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'public/creative-assets/r25-community-repair-workshop-cover-v1.jpg',
        claim: '最终封面证据显示同一维修对象、部件示意与说明书式判断信息共享画面。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-BRIGHT-UTILITY-VALIDATION-R25.md',
        claim: 'R25 研究记录验证故障选择同步改变部件、检查顺序、安全提示与行动结果。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-PRODUCTION-GUARDRAILS-R26.md',
        claim: 'R26 研究记录补充主体可见性、真实浏览器回归与有界精修证据。',
        verified: true
      }
    ],
    signals: ['维修判断', '维修诊断', '旧物修理', '故障手册', '故障检查', '检查顺序', '安全说明', '部件检查', '下一步该做什么'],
    patterns: ['editorial-field', 'material-transformation', 'spatial-exploration'],
    observedMechanism: [
      '同一对象的部件高亮、检查顺序、安全说明和难度由同一个故障判断状态驱动。',
      '编辑说明指向对象上的具体部件，流程结束后给出边界清楚的下一步行动。'
    ],
    positiveBorrowPrinciples: [
      '把检查步骤绑定到同一对象上的具体部件，让用户能看见每个判断为什么导向下一步。',
      '让部件状态、检查顺序、安全说明和结果建议共享一个有限判断状态。',
      '将结论标为初步判断，并把高风险操作留给专业人员或线下服务。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中维修判断、旧物修理、部件检查或安全说明语义时使用。',
    confidence: .98,
    advisoryRisks: [
      '部件示意若无法对应同一对象，检查流程会退化为普通步骤列表。',
      '建议若越过初步判断边界，页面可能被误解为专业诊断或拆机指导。'
    ]
  },
  {
    id: 'positive-night-reflective-catalog',
    category: 'evidence-led-editorial',
    macroStructureCategory: 'catalog',
    title: '夜行反光材料样本馆 · 可比较的动态目录',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/night-reflective-catalog/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r128-night-reflective-catalog/02-desktop-compare.png',
        claim: '最终桌面证据显示多件材料保留身份，并在同一光束条件下完成二选比较。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R128-NIGHT-REFLECTIVE-CATALOG.md',
        claim: 'R128 研究记录绑定目录结构、真实输入、移动端、回退和最终运行身份。',
        verified: true
      }
    ],
    signals: ['材料样本馆', '样本目录', '多对象比较', '二选比较', '筛选样本', '反光材料', '材料阅览室'],
    patterns: ['editorial-field', 'spatial-exploration', 'material-transformation'],
    observedMechanism: [
      '多个对象在筛选、检查与比较时保留编号、材质和相对尺度，目录关系不会退化成独立卡片。',
      '同一个人工光束状态同时驱动对象表面响应、比较画面和解释文字。'
    ],
    positiveBorrowPrinciples: [
      '当任务需要浏览集合时，让对象身份和可比较关系成为首屏构图，而不是先建立单一英雄主体。',
      '把筛选、检查和比较绑定到同一对象状态，并让增强渲染只承担可观察的材料差异。',
      '为动态目录保留无需增强画布也能完成选择与比较的语义回退。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中样本目录、多对象材料比较或筛选检查语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '对象若只换名称或颜色，目录会显得像普通卡片墙而不是可比较集合。',
      '模拟响应需明确真实性边界，视觉差异不能被包装成认证或实测性能。'
    ]
  },
  {
    id: 'positive-color-relay-branching',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'branching-confluence',
    title: '高彩城市接力 · 分支后果与共同汇合',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/color-relay-branching/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r129-color-relay-branching/02-desktop-early.png',
        claim: '最终分支证据显示提前交棒产生专属轨迹、交接关系与结果队形。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R129-COLOR-RELAY-BRANCHING.md',
        claim: 'R129 研究记录验证两条路径、返回重放、共同汇合、回退和最终身份。',
        verified: true
      }
    ],
    signals: [
      '城市接力',
      '接力交棒',
      '提前交棒',
      '压线交棒',
      '分支汇合',
      '分支路径',
      '两种策略',
      '不同路径',
      '两条路径',
      '共同汇入',
      '最终汇入',
      '返回重放'
    ],
    patterns: ['spatial-exploration', 'editorial-field', 'continuous-scroll'],
    observedMechanism: [
      '一次明确选择改变同一主体的轨迹几何、交接重叠、运动节奏和最终队形。',
      '不同路径在共同结果表面汇合，同时保留用户选择过的路径身份与可重放性。'
    ],
    positiveBorrowPrinciples: [
      '让分支选择产生可见的结构后果，而不是只切换文案、颜色或激活状态。',
      '为每条路径提供返回、重放与共同汇合，使选择既可比较又不会割裂主旅程。',
      '用主题本身的路径、对象或空间关系组织分支构图，避免额外参数面板。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中接力交棒、两种策略、分支路径或共同汇合语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '分支若只改变说明文字，用户无法理解选择真正影响了什么。',
      '路径数量过多会稀释主要后果，首稿应先保留少量可辨认的选择。'
    ]
  },
  {
    id: 'positive-forest-sound-route',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'single-stage',
    title: '森林声音路线 · 空间声源与收集因果',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/forest-sound-route/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r131-forest-sound-route/02-desktop-first-sound.png',
        claim: '最终交互证据显示声源位置、可见波纹、说明和收集状态同步变化。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R131-FOREST-SOUND-ROUTE.md',
        claim: 'R131 研究记录验证四种可区分声音、显式播放、路线收集和不可用降级。',
        verified: true
      }
    ],
    signals: ['森林声音', '声音藏在哪里', '自然博物馆', '声源热点', '聆听路线', '树洞声音', '自然声音探索'],
    patterns: ['spatial-exploration', 'editorial-field'],
    observedMechanism: [
      '空间中的主题对象既是可见热点也是声源位置，选择同时驱动音频、波纹、说明和收集进度。',
      '声音由用户手势显式启动，一次只播放一个声源，失败时仍保留视觉探索与保存旅程。'
    ],
    positiveBorrowPrinciples: [
      '把声音放回可辨认的空间来源，并让听见、看见和文字解释共享同一选择状态。',
      '让音频承担主题能力而非背景装饰，同时提供停止、切换和诚实降级。',
      '若体验包含收集，让已听声源自然形成路线、组合或最终行动。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中森林声音、自然博物馆、空间声源或聆听路线语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '声源之间若听感和空间位置不可区分，收集动作会失去内容意义。',
      '自动播放会违反浏览器约束并削弱用户对声音状态的控制感。'
    ]
  },
  {
    id: 'positive-moonlit-tidepool-panorama',
    category: 'spatial-environment-journey',
    macroStructureCategory: 'horizontal-panorama',
    title: '月光潮池夜巡 · 单一主图中的横向全景',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/moonlit-tidepool-panorama/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r132-moonlit-tidepool-panorama/02-desktop-navigation.png',
        claim: '最终桌面证据显示同一宽幅环境承载横向位置、真实站点与检查状态。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R132-MOONLIT-TIDEPOOL-PANORAMA.md',
        claim: 'R132 研究记录验证单批次主图、多输入横向导航、移动端和素材回退。',
        verified: true
      }
    ],
    signals: [
      '横向全景', '横向巡游', '全景图卷', '宽幅主视觉', '潮池夜巡', '横向穿行', '连续全景',
      '异地', '相隔很远'
    ],
    patterns: ['spatial-exploration', 'environmental-memory', 'editorial-field'],
    observedMechanism: [
      '一张连续宽幅主图承担地点、光线与对象身份，代码只驱动横向位置、热点和完成状态。',
      '滚轮、拖拽、触摸、方向键和按钮共享同一横向坐标，同时避免劫持整页滚动。'
    ],
    positiveBorrowPrinciples: [
      '当内容天然沿一条地平线、时间带或连续场所展开时，可让单一主图成为横向空间。',
      '将热点建立在主素材中真实可见的对象上，并让全部输入方式改变同一位置状态。',
      '为触摸、键盘和素材失败保留等价旅程，避免把横向效果建立在单一输入上。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中横向全景、宽幅巡游、连续图卷或横向穿行语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '主图若不是连续空间，横向移动会被感知为一组无关图片的拼接。',
      '无按钮与键盘替代的滚轮劫持会降低可达性并让移动端旅程失效。'
    ]
  },
  {
    id: 'positive-xuhui-grounded-atlas',
    category: 'evidence-led-editorial',
    macroStructureCategory: 'editorial-flow',
    title: '徐汇滨江饮水图册 · 可追溯地图与演示边界',
    source: {
      kind: 'local-runtime',
      uri: 'cases/runs/dedicated-c0514ddead80/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'runtime',
        uri: 'cases/runs/dedicated-c0514ddead80/',
        claim: '本地运行案例保留真实徐汇滨江底图、常显 OSM 署名、同投影热点与失败降级。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'cases/runs/dedicated-c0514ddead80/src/scene.ts',
        claim: '运行源码验证底图、真实地标、热点和示意路线共享同一经纬度投影函数。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-CASE-ARCHIVE-R23.md',
        claim: '归档记录验证地图署名、事实与演示数据披露，以及无 WebGL 时的完整语义回退。',
        verified: true
      }
    ],
    signals: [
      '西岸集合点图卷',
      '真实徐汇滨江地图',
      'OpenStreetMap',
      '可追溯地标坐标',
      '同一真实底图',
      '同一坐标变换',
      '真实热点',
      '徐汇滨江真实地理底图'
    ],
    patterns: ['editorial-field', 'spatial-exploration'],
    observedMechanism: [
      '项目缓存的真实 OSM 底图承担地域事实，地标、热点和示意路线通过同一经纬度投影保持空间一致。',
      '地图署名持续可见，真实区域与地标事实和演示站点、数值及路线在内容层明确分开。',
      '增强层或地图素材失败时保留语义内容、选择行动和诚实说明，不生成替代图形冒充地图。'
    ],
    positiveBorrowPrinciples: [
      '让可追溯真实地图承担地点判断的第一视觉职责，并让热点与路线复用底图的同一投影。',
      '让来源署名持续可见，逐项区分有来源的地理事实与产品演示数据。',
      '为地图或增强能力失败准备完整语义旅程和明确不可用状态，避免用随机街区、曲线或粒子伪造地理证据。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中徐汇滨江真实地图、OSM 署名、同投影热点或可追溯地标坐标语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '底图许可、缓存版本或署名位置不清会削弱 grounded real media 的可追溯性。',
      '热点与底图若使用不同坐标变换，视觉对齐会制造虚假的地点精度。',
      '事实字段与演示字段若没有逐项披露，用户可能把集合建议误解为实时公共信息。'
    ]
  },
  {
    id: 'positive-stormglass-programmatic-field',
    category: 'articulated-spatial-reveal',
    macroStructureCategory: 'spatial-journey',
    title: '雷雨余光档案馆 · 程序化光场承担主叙事',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/stormglass-archive/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r134-stormglass-archive/02-desktop-branching.png',
        claim: '最终中段证据显示滚动状态真实改变玻璃电荷、裂隙亮度与折射画面。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R134-STORMGLASS-ARCHIVE.md',
        claim: 'R134 研究记录绑定 WebGL 媒介决策、像素差异、移动端、回退和最终身份。',
        verified: true
      }
    ],
    signals: ['风暴玻璃', '闪电拓片', '电荷裂隙', '实时 WebGL 程序化光场', '玻璃折射', '雷雨余光'],
    patterns: ['material-transformation', 'continuous-scroll', 'spatial-exploration'],
    observedMechanism: [
      '同一 WebGL 主体贯穿全程，滚动阶段同时改变电荷、裂隙、折射与语义状态。',
      '程序化渲染承担输入相关的主要视觉含义，DOM 只解释章节与最终行动。'
    ],
    positiveBorrowPrinciples: [
      '仅当实时材质、光照或几何变化就是主题含义时，才让程序化光场承担主媒介。',
      '用少量共享状态同步场景变量与语义结果，并以像素或结构证据验证真实变化。',
      '为 WebGL 失败保留主题专属的静态状态与主要行动，而不是退化为空白或通用网格。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中风暴玻璃、电荷裂隙、闪电拓片或明确实时程序化光场语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '程序化渲染若与主题因果无关，会增加性能成本却只形成通用视觉装饰。',
      '过多同步变量会削弱阶段可读性，核心变化需保持少量且可辨认。'
    ]
  },
  {
    id: 'positive-prism-seed-hybrid',
    category: 'continuous-asset-story',
    macroStructureCategory: 'spatial-journey',
    title: '棱镜种子剧场 · 生成主视觉与动态增强分工',
    source: {
      kind: 'local-runtime',
      uri: '../pages/v2/deliveries/prism-seed-theatre/',
      evidenceLevel: 'runtime-verified'
    },
    evidence: [
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r135-prism-seed-theatre/02-desktop-spectrum.png',
        claim: '最终中段证据显示生成环境保持视觉身份，动态层只增强折射与光谱因果。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'docs/v2-research/V2-R135-PRISM-SEED-THEATRE.md',
        claim: 'R135 研究记录绑定唯一生成素材、运行时增强、双重回退和 V3 最终身份。',
        verified: true
      }
    ],
    signals: ['生成主视觉', '动态增强', '高质量主图', '主图承担环境', '折光标本', '半透明种荚', '彩色光谱'],
    patterns: ['material-transformation', 'spatial-exploration', 'product-atmosphere'],
    observedMechanism: [
      '唯一高质量生成图承担环境、主体、材质和第一记忆点，运行时只增强光学与输入因果。',
      '素材真实进入最终哈希，指针与滚动改变局部折射、光谱和光线角度而不替代主体。'
    ],
    positiveBorrowPrinciples: [
      '先让最合适的高质量素材承担主题身份，再选择只强化产品特点的运行时动态。',
      '为主素材和增强层分别写清可见职责，避免低质量程序化图形冒充关键对象。',
      '将素材加载与增强能力分开降级，使任一失败时仍保留可理解的主体、行动与诚实状态。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中生成主视觉、主图动态增强、折光标本或半透明种荚语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '生成素材若主题或构图不匹配，后期动态无法弥补主体身份问题。',
      '全屏统一后期若覆盖主图细节，素材会重新呈现为贴图或廉价特效。'
    ]
  },
  {
    id: 'positive-khronos-fox-animation-clips',
    category: 'anchored-product-causality',
    macroStructureCategory: 'spatial-inspection',
    title: 'Khronos Fox · 可追溯 GLB 与真实动画剪辑',
    source: {
      kind: 'github-source',
      uri: 'https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Fox/README.md',
      evidenceLevel: 'source-and-runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/Fox/README.md',
        claim: 'Khronos 资产说明记录 Fox GLB 的来源与许可，并明确列出 Survey、Walk、Run 三个共享同一骨骼的动画周期。',
        verified: true
      },
      {
        kind: 'runtime',
        uri: 'https://github.khronos.org/glTF-Sample-Viewer-Release/?model=https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
        claim: 'Khronos 官方 Sample Viewer 运行入口绑定同一 Fox GLB，并暴露该资产的模型与动画控制界面。',
        verified: true
      },
      {
        kind: 'source-review',
        uri: 'https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc',
        claim: 'glTF 2.0 规范说明动画存储于 animations 数组，客户端从资产实际提供的自包含动作中选择播放。',
        verified: true
      }
    ],
    signals: [
      '动画 Fox GLB',
      'Survey、Walk、Run',
      'Survey / Walk / Run',
      '模型真实切换 Survey',
      '真实命名动作剪辑',
      '可追溯动画 GLB',
      'traceable animated glb',
      'named animation clips'
    ],
    patterns: ['spatial-exploration', 'product-atmosphere'],
    observedMechanism: [
      '一个可追溯 GLB 同时承载模型身份、骨骼、材质与多个真实命名动画周期，动作状态不需要替换主体。',
      '共享同一骨骼的动作周期在任一时刻只激活一个，客户端从资产 animations 中读取并切换实际剪辑。',
      '模型与动画留在三维运行层，选择、说明、许可披露和失败状态由可访问的页面界面承担。'
    ],
    positiveBorrowPrinciples: [
      '只借可追溯真实 GLB 作为持续空间主体，并在构建前核验来源、逐项许可、字节、模型层级与 L3 质量；不继承示例的物种主题、布局或视觉风格。',
      '只从 glTF animations 读取并验证真实命名 clip，再以同一动画混合器在互斥动作间切换；缺少 clip 时阻断，不用速度缩放或程序化摆动冒充新动作。',
      '用语义 DOM 按钮、当前动作说明、真实性披露和保存行动承载产品任务；Canvas 只承担模型、受控镜头与空间反馈。',
      '移动端、减少运动或 WebGL 失败时保留可触达的动作选择、静态预览或明确素材缺口、完整说明与最终行动；不把桌面画布裁切当作 fallback。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中可追溯动画 GLB、真实命名剪辑或明确的模型动作切换语义时使用。',
    confidence: .99,
    advisoryRisks: [
      '样例资产能证明动画与来源机制，但视觉质量仍需按当前任务单独执行 L3 门禁。',
      '剪辑名、骨骼与许可若未在实际文件中复核，界面标签可能制造不存在的动作证据。',
      '移动降级若只冻结画布而移除选择、说明或行动，主要观察任务仍然不可完成。'
    ]
  },
  {
    id: 'positive-iris-articulated-reveal',
    category: 'articulated-spatial-reveal',
    macroStructureCategory: 'fixed-single-subject-overlay-workbench',
    title: 'IRIS · 程序化关节主体展开',
    source: {
      kind: 'github-source',
      uri: 'https://iamtechartist.github.io/Threejs-3D-Webpage/',
      evidenceLevel: 'source-and-runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'docs/v2-research/THREEJS-3D-WEBPAGE-R11.md',
        claim: '本地研究记录已核对来源、滚动映射、部件错峰展开与运行边界。',
        verified: true
      },
      {
        kind: 'runtime',
        uri: 'https://iamtechartist.github.io/Threejs-3D-Webpage/',
        claim: '研究记录确认公开运行页用于验证程序化关节主体的连续展开。',
        verified: true
      }
    ],
    signals: ['关节展开', '逐层展开', '机械花', '机械罗盘', '程序化主体', '部件组装', '部件解构', '结构绽放', 'articulated', 'iris'],
    patterns: ['material-transformation', 'product-atmosphere', 'continuous-scroll'],
    observedMechanism: [
      '固定画布中的单一关节主体贯穿全程，全局滚动映射为各部件错峰局部进度。',
      '部件、相机、材质、灯光和雾共享同一时间轴，形成可读的展开因果。'
    ],
    positiveBorrowPrinciples: [
      '当构造过程本身就是主题时，用少量部件组和统一时间轴表达组装或解构。',
      '让相机与材质变化辅助结构阅读，并为低性能设备保留静态可理解状态。'
    ],
    relevanceReason: '候选参考；仅在 brief 命中关节展开、机械花、部件组装或结构解构语义时使用。',
    confidence: .94,
    advisoryRisks: [
      '程序化结构若被用于需要真实商品身份的主题，可信度会低于可靠资产。',
      '部件、相机与后期若没有统一时间轴，展开会变成同时发生的视觉噪声。'
    ]
  },
  {
    id: 'positive-scroll-rig-progressive-layer',
    category: 'spatial-environment-journey',
    macroStructureCategory: 'spatial-journey',
    title: 'r3f-scroll-rig · DOM 真相与 WebGL 渐进层',
    source: {
      kind: 'github-source',
      uri: 'https://github.com/14islands/r3f-scroll-rig/tree/123663599e4b31af56f1845a19132d17e6a9b81f',
      evidenceLevel: 'source-and-runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'https://github.com/14islands/r3f-scroll-rig/tree/123663599e4b31af56f1845a19132d17e6a9b81f',
        claim: '固定 revision 的源码研究确认单一全局 Canvas、DOM 边界同步与渐进增强职责。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r125-ice-core-letters/01-desktop-opening.png',
        claim: '本地冰芯旅程验证持久三维场景与语义 DOM 在同一滚动坐标中协作。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r125-ice-core-letters/05-fallback.png',
        claim: '同一交付的浏览器证据验证 WebGL 失败后，正文、阶段和主要行动仍然可用。',
        verified: true
      }
    ],
    signals: ['dom 与 webgl', 'dom webgl', '渐进增强', '滚动同步', 'webgl 回退', '无 canvas 回退', '3d 叙事', '全局 canvas'],
    patterns: ['continuous-scroll', 'spatial-exploration', 'editorial-field'],
    observedMechanism: [
      'DOM 保留布局与语义真相，固定 WebGL 层只增强对应区域的空间和动态。',
      '滚动位置、可见性和渲染状态共享一个坐标来源，失败时不会丢失正文与行动。'
    ],
    positiveBorrowPrinciples: [
      '需要 DOM 与 WebGL 混合时，让 DOM 决定阅读结构与语义，让一个持续渲染层服从同一滚动坐标。',
      '先完成无 Canvas 也能理解和操作的产品路径，再把 3D、着色器或深度作为可验证增强。'
    ],
    relevanceReason: '候选参考；仅在 brief 明确命中 DOM/WebGL 协作、滚动同步或渐进回退语义时使用。',
    confidence: .96,
    advisoryRisks: [
      '全局画布会增加同步、层级和布局漂移复杂度，简单编辑页面可能没有收益。',
      'DOM 与三维层若各自维护进度，会出现视觉状态和正文状态不一致。'
    ]
  },
  {
    id: 'positive-noise-surface-causality',
    category: 'anchored-product-causality',
    macroStructureCategory: 'single-stage',
    title: 'Noise Surface Transition · 单一进度的材质事件',
    source: {
      kind: 'github-source',
      uri: 'https://github.com/mohAmineBrs/codrops-noise-transition/tree/0face2aaa637780bb2862c807efce1aabfecc9ea',
      evidenceLevel: 'source-and-runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'https://github.com/mohAmineBrs/codrops-noise-transition/tree/0face2aaa637780bb2862c807efce1aabfecc9ea',
        claim: '固定 revision 的源码研究确认统一进度、噪声边界与环境回声共同构成表面转场。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r134-stormglass-archive/02-desktop-branching.png',
        claim: '本地风暴玻璃验证一个滚动进度同时驱动主体裂隙、亮度、折射和环境电荷。',
        verified: true
      }
    ],
    signals: ['材质转场', '表面转化', '噪声溶解', '噪声边界', '产品变形', '包装切换', '薄膜变化', '材质变化'],
    patterns: ['material-transformation', 'product-atmosphere', 'continuous-scroll'],
    observedMechanism: [
      '一个语义进度同时进入主体材质与环境反馈，噪声只塑造变化边界。',
      '主体变化先建立含义，背景波纹或粒子只作为同一状态的回声。'
    ],
    positiveBorrowPrinciples: [
      '为一次材质或状态变化保留唯一语义进度，并让主体、光照与环境反馈从同一数值派生。',
      '让噪声负责边界的有机性，而不是用随机扰动替代可理解的起点、过程和结果。'
    ],
    relevanceReason: '候选参考；仅在 brief 明确命中材质转场、表面转化、噪声溶解或同一产品状态变化时使用。',
    confidence: .91,
    advisoryRisks: [
      '源仓库的模型许可与根许可证不完整，因此只迁移机制原则。',
      '随机边界强度过高会遮住产品身份，使转场退化为通用特效。'
    ]
  },
  {
    id: 'positive-audio-signal-continuity',
    category: 'semantic-direct-interaction',
    macroStructureCategory: 'single-stage',
    title: 'Butterchurn · 可解释音频信号与连续反馈',
    source: {
      kind: 'github-source',
      uri: 'https://github.com/jberg/butterchurn/tree/fbac2f6bab62fd9c6a50ebbeb29359c5eb05903e',
      evidenceLevel: 'source-and-runtime-verified'
    },
    evidence: [
      {
        kind: 'source-review',
        uri: 'https://github.com/jberg/butterchurn/tree/fbac2f6bab62fd9c6a50ebbeb29359c5eb05903e',
        claim: '固定 revision 的源码研究确认分频、时间平滑与连续帧反馈属于独立信号职责。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'docs/v2-research/evidence/r131-forest-sound-route/02-desktop-first-sound.png',
        claim: '本地森林声音路线验证声音、声源位置、波纹和说明共享同一选择状态。',
        verified: true
      },
      {
        kind: 'screenshot',
        uri: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/02-desktop-fracture.png',
        claim: '本地光缆听诊验证阶段频率、三维形变、脉冲和读数由同一故障状态驱动。',
        verified: true
      }
    ],
    signals: ['频谱', '声音驱动', '音频反应', '低频', '中频', '高频', '实时声音', '音乐可视化', '声场反馈'],
    patterns: ['product-atmosphere', 'editorial-field', 'spatial-exploration'],
    observedMechanism: [
      '声音先被分成可解释信号和时间尺度，再映射到位置、形态、亮度或连续反馈。',
      '音频启动、静音和不可用状态与可见界面共享状态，不让画面假装正在响应。'
    ],
    positiveBorrowPrinciples: [
      '声音驱动体验先定义低频、中频、高频或语义阶段分别表达什么，再选择对应视觉参数。',
      '对音频信号进行归一化和 attack/release 平滑，并为静音、未授权与不可用状态保留稳定画面。'
    ],
    relevanceReason: '候选参考；仅在 brief 明确命中频谱、声音驱动、音频反应或音乐可视化语义时使用。',
    confidence: .95,
    advisoryRisks: [
      '随机 preset 与全频段同幅度映射容易吞没产品身份并造成闪烁。',
      '浏览器音频需要用户手势，静音和权限失败状态需要独立反馈。'
    ]
  }
].map((pack) => referenceEvidencePackSchema.parse(pack));

export const positiveReferenceLibrary: readonly ReferenceEvidencePack[] = positiveReferencePacks;

/**
 * Returns zero to three evidence packs. A matching experience pattern can
 * improve ranking, but never selects a pack by itself: at least one explicit
 * semantic signal from the user's brief is required.
 */
export function selectPositiveReferenceEvidence(
  brief: string,
  pattern: ExperiencePattern,
  limit = 3
): readonly ReferenceEvidencePack[] {
  const boundedLimit = Math.max(0, Math.min(3, Math.trunc(limit)));
  if (boundedLimit === 0) return [];

  const normalized = brief
    .split(/[。；;\n]/)
    .map((clause) => {
      const marker = /(?:^|[，,：:\s])(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应|不是|并非|不做成)/.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim().toLowerCase();
    })
    .filter(Boolean)
    .join('。');
  const ranked = positiveReferenceLibrary
    .flatMap((pack) => {
      const matchedSignals = pack.signals.filter((signal) => normalized.includes(signal.toLowerCase()));
      if (matchedSignals.length === 0) return [];
      const patternMatch = pack.patterns.includes(pattern);
      const score = matchedSignals.length * 10 + (patternMatch ? 2.5 : 0) + pack.confidence;
      const relevanceReason = patternMatch
        ? `用户 brief 命中“${matchedSignals.join('、')}”，并与 ${pattern} 体验模式一致。`
        : `用户 brief 命中“${matchedSignals.join('、')}”；参考只用于对应能力，不改变当前 ${pattern} 体验模式。`;
      return [{
        pack: referenceEvidencePackSchema.parse({ ...pack, relevanceReason }),
        score
      }];
    })
    .sort((a, b) => b.score - a.score || b.pack.confidence - a.pack.confidence || a.pack.id.localeCompare(b.pack.id));

  if (ranked.length === 0) return [];

  const selected: typeof ranked = [];
  const fixedStructure = 'fixed-single-subject-overlay-workbench';
  const canSelect = (candidate: (typeof ranked)[number]) => (
    candidate.pack.macroStructureCategory !== fixedStructure
    || !selected.some(({ pack }) => pack.macroStructureCategory === fixedStructure)
  );
  const select = (candidate: (typeof ranked)[number] | undefined) => {
    if (!candidate || selected.includes(candidate) || !canSelect(candidate)) return;
    selected.push(candidate);
  };

  // Preserve the strongest semantic match as Top 1. When another explicitly
  // matched structure exists, reserve Top 2 for it before filling the rest in
  // relevance order. No pattern-only or otherwise unmatched pack enters here.
  select(ranked[0]);
  if (boundedLimit > 1) {
    select(ranked.find((candidate) => (
      canSelect(candidate)
      && candidate.pack.macroStructureCategory !== selected[0]?.pack.macroStructureCategory
    )));
  }
  for (const candidate of ranked) {
    if (selected.length >= boundedLimit) break;
    select(candidate);
  }

  return selected.slice(0, boundedLimit).map(({ pack }) => pack);
}
