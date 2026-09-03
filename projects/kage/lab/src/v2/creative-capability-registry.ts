import { z } from 'zod';
import type { DirectCreativeAuthorPackage } from './direct-creative-author-package.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const creativeCapabilityIdSchema = z.enum([
  'asset-led-environment',
  'editorial-composition',
  'continuous-state-story',
  'spatial-threejs',
  'procedural-webgl',
  'semantic-interaction',
  'audio-visual-causality',
  'grounded-data-place'
]);

export type CreativeCapabilityId = z.infer<typeof creativeCapabilityIdSchema>;

export const creativeCapabilityDefinitionSchema = z.object({
  id: creativeCapabilityIdSchema,
  title: z.string().trim().min(2),
  experienceResponsibility: z.string().trim().min(8),
  positiveSignals: z.array(z.string().trim().min(1)).min(3),
  compatibleMedia: z.array(z.string().trim().min(2)).min(1),
  interactionModes: z.array(z.enum(['none', 'scroll', 'direct', 'mixed'])).min(1),
  proofCaseIds: z.array(safeId).min(2),
  borrowPrinciples: z.array(z.string().trim().min(8)).min(2),
  risks: z.array(z.string().trim().min(8)).max(3),
  authority: z.literal('advisory'),
  exclusive: z.literal(false)
}).strict();

export type CreativeCapabilityDefinition = z.infer<typeof creativeCapabilityDefinitionSchema>;

const definitions: CreativeCapabilityDefinition[] = [
  {
    id: 'asset-led-environment',
    title: '高质量素材主导的环境与身份',
    experienceResponsibility: '用正式图片、生成视觉或视频建立主题专属的地点、材质、主体身份和第一情绪。',
    positiveSignals: ['环境', '意境', '真实', '电影', '空间', '旅程', '产品', '材质', '场景', '风景'],
    compatibleMedia: ['generated-image', 'grounded-real-media', 'video'],
    interactionModes: ['none', 'scroll', 'direct', 'mixed'],
    proofCaseIds: ['ice-core-letters', 'moonlit-tidepool-panorama', 'windborne-letter-valley', 'prism-seed-theatre'],
    borrowPrinciples: [
      '先用主题专属素材建立地点、尺度与情绪，再让排版和运行时效果进入同一视觉空间。',
      '关键素材必须承担可说明的视觉职责，代码增强主体变化，不能把正式素材留成无关背景。'
    ],
    risks: ['避免用泛化氛围图替代产品主体或事实证据。', '避免素材光线、尺度和页面构图互不相容。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'editorial-composition',
    title: '编辑构图与蒙版叙事',
    experienceResponsibility: '用排版、留白、局部窗口、蒙版与阅读节奏形成清晰而有记忆点的信息舞台。',
    positiveSignals: ['编辑', '档案', '目录', '杂志', '海报', '文字', '阅读', '信件', '显影', '蒙版'],
    compatibleMedia: ['typography', 'motion', 'generated-image', 'grounded-real-media'],
    interactionModes: ['none', 'scroll', 'direct', 'mixed'],
    proofCaseIds: ['lighthouse-chart-reveal', 'ice-core-letters', 'thunderhead-score', 'ten-second-callsign-decode'],
    borrowPrinciples: [
      '信息层次、图片窗口和文字关系由主题决定，页面不必把所有内容压进同一种工作台布局。',
      '蒙版、裁切和显影应揭示同一对象的隐藏信息，形成主题因果而不是装饰转场。'
    ],
    risks: ['避免巨大标题和说明卡遮挡真正主体。', '避免只改变文案却没有内容状态或视觉证据变化。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'continuous-state-story',
    title: '连续状态与旅程叙事',
    experienceResponsibility: '让滚动、时间或直接输入推进同一主体的连续状态，形成可感知的开始、变化与完成。',
    positiveSignals: ['滚动', '过程', '逐渐', '形成', '穿过', '展开', '变化', '路线', '抵达', '连续'],
    compatibleMedia: ['video', 'generated-image', 'motion', 'threejs-3d', 'procedural-webgl'],
    interactionModes: ['scroll', 'direct', 'mixed'],
    proofCaseIds: ['folded-light-studio', 'windborne-letter-valley', 'ice-core-letters', 'roof-water-route'],
    borrowPrinciples: [
      '状态变化必须保持主体连续性，并让每个阶段推进用户对产品或故事的理解。',
      '输入、视觉状态和结果共用一个规范化进度，滚轮不能只负责翻屏或切换文案。'
    ],
    risks: ['避免为了满足固定屏数拆出无意义段落。', '避免多张不相关素材冒充同一主体的连续变化。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'spatial-threejs',
    title: '可检查的 Three.js 空间主体',
    experienceResponsibility: '用三维对象、镜头、遮挡、部件与空间路径解释二维画面难以表达的产品结构或体验。',
    positiveSignals: ['3d', 'three.js', '三维', '立体', '空间', '部件', '拆解', '镜头', '模型', '观察'],
    compatibleMedia: ['threejs-3d'],
    interactionModes: ['scroll', 'direct', 'mixed'],
    proofCaseIds: ['weave-light-field', 'fox-gait-observatory', 'modular-room-sound', 'sea-fiber-scope'],
    borrowPrinciples: [
      '三维必须证明结构、距离、动作或材质关系，不能只把一个物体放进可旋转画布。',
      '镜头、对象状态、说明和结果应共享同一产品状态并提供触控与键盘替代。'
    ],
    risks: ['避免用低精度程序几何冒充关键产品模型。', '避免三维成为昂贵但与核心行动无关的背景。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'procedural-webgl',
    title: '程序化 WebGL 材质与光场',
    experienceResponsibility: '在实时材质、光线、粒子或形变本身承载主题变化时，提供静态素材无法替代的动态现象。',
    positiveSignals: ['webgl', 'shader', '着色器', '实时', '光场', '折射', '流体', '波纹', '形变', '粒子'],
    compatibleMedia: ['procedural-webgl'],
    interactionModes: ['scroll', 'direct', 'mixed'],
    proofCaseIds: ['stormglass-archive', 'prism-seed-theatre', 'sonic-pressing-room', 'sea-fiber-scope'],
    borrowPrinciples: [
      '程序化变化要成为主题可理解的状态证据，并明确静态图无法承担的运行时职责。',
      '实时效果围绕一个视觉锚点收束，在低性能或能力缺失时提供诚实降级。'
    ],
    risks: ['避免把随机粒子、噪声和泛用流体当成创意本身。', '避免因技术声望选择 WebGL。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'semantic-interaction',
    title: '语义因果互动',
    experienceResponsibility: '让用户输入改变主题主体、业务状态与结果理解，而不是只改变装饰、高亮或数字。',
    positiveSignals: ['探索', '选择', '调整', '拖动', '操作', '实验', '修复', '组合', '比较', '互动'],
    compatibleMedia: ['motion', 'data-visualization', 'threejs-3d', 'procedural-webgl', 'typography'],
    interactionModes: ['direct', 'mixed'],
    proofCaseIds: ['film-camera-repair-paths', 'color-relay-branching', 'lighthouse-chart-reveal', 'folded-light-studio'],
    borrowPrinciples: [
      '每个输入都应产生主题专属、可见且可解释的变化，并最终汇聚到产品行动。',
      '鼠标、触控和键盘写入同一状态；输入方式不同，但语义结果保持一致。'
    ],
    risks: ['避免用参数面板代替产品本身。', '避免虚构精确模拟、测量或业务结果。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'audio-visual-causality',
    title: '声音与视觉共享因果',
    experienceResponsibility: '让可听差异、视觉状态与产品语义同步变化，使声音成为核心体验证据而非同一段循环配乐。',
    positiveSignals: ['声音', '音频', '声场', '音乐', '和声', '频率', '听', '声纹', '音色', '节奏'],
    compatibleMedia: ['sound'],
    interactionModes: ['scroll', 'direct', 'mixed'],
    proofCaseIds: ['forest-sound-route', 'sonic-pressing-room', 'sea-fiber-scope', 'thunderhead-score'],
    borrowPrinciples: [
      '声音状态必须真实可辨，并与画面、位置、输入或业务结果共享同一状态。',
      '自动播放受限时提供明确启动动作，静音和听觉不可用状态必须可理解。'
    ],
    risks: ['避免多选项实际播放相同声音。', '避免把背景音乐标记成产品核心交互已完成。'],
    authority: 'advisory',
    exclusive: false
  },
  {
    id: 'grounded-data-place',
    title: '真实地点、数据与来源证据',
    experienceResponsibility: '在地图、路线、公共服务、数据与真实产品主题中建立可追溯的地点和事实基础。',
    positiveSignals: ['地图', '地点', '地址', '城市', '路线', '数据', '证据', '站点', '距离', '来源'],
    compatibleMedia: ['grounded-real-media', 'data-visualization'],
    interactionModes: ['none', 'scroll', 'direct', 'mixed'],
    proofCaseIds: ['west-bund-meeting-points', 'roof-water-route', 'night-reflective-catalog'],
    borrowPrinciples: [
      '地图和地点体验先确定真实地域、坐标和来源，再设计路线、筛选与叙事。',
      '演示数据必须明确标记为模拟；没有真实证据时不得伪装成实时结果。'
    ],
    risks: ['避免用随机线条冒充地图或真实路线。', '避免视觉真实性掩盖数据来源缺失。'],
    authority: 'advisory',
    exclusive: false
  }
];

export const CREATIVE_CAPABILITY_REGISTRY: readonly CreativeCapabilityDefinition[] =
  definitions.map((definition) => creativeCapabilityDefinitionSchema.parse(definition));

export const creativeCapabilitySelectionInputSchema = z.object({
  brief: z.string().trim().min(2),
  leadMedium: z.string().trim().min(2),
  supportingMedia: z.array(z.string().trim().min(2)).max(8),
  interactionMode: z.enum(['none', 'scroll', 'direct', 'mixed']),
  limit: z.number().int().min(1).max(4).default(3)
}).strict();

export type CreativeCapabilitySelectionInput = z.input<typeof creativeCapabilitySelectionInputSchema>;

export const creativeCapabilityMatchSchema = z.object({
  capabilityId: creativeCapabilityIdSchema,
  title: z.string().trim().min(2),
  relevance: z.number().int().min(0).max(100),
  why: z.string().trim().min(8),
  matchedSignals: z.array(z.string().trim().min(1)),
  borrow: z.array(z.string().trim().min(8)).min(1).max(2),
  proofCaseIds: z.array(safeId).min(2),
  authority: z.literal('advisory')
}).strict();

export const creativeCapabilityGuideSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.literal('positive-capability-composition'),
  extensionPolicy: z.literal('open-better-methods-allowed'),
  catalogIsNotWhitelist: z.literal(true),
  selections: z.array(creativeCapabilityMatchSchema).max(4),
  noMatchAction: z.literal('leave-search-space-open')
}).strict();

export type CreativeCapabilityGuide = z.infer<typeof creativeCapabilityGuideSchema>;

export function selectCreativeCapabilities(
  input: CreativeCapabilitySelectionInput
): CreativeCapabilityGuide {
  const parsed = creativeCapabilitySelectionInputSchema.parse(input);
  const positiveBrief = positiveIntentClauses(parsed.brief).join(' ').toLocaleLowerCase();
  const media = new Set([parsed.leadMedium, ...parsed.supportingMedia]);

  const matches = CREATIVE_CAPABILITY_REGISTRY.map((capability) => {
    const matchedSignals = capability.positiveSignals.filter((signal) => (
      positiveBrief.includes(signal.toLocaleLowerCase())
    ));
    const leadMatch = capability.compatibleMedia.includes(parsed.leadMedium);
    const supportMatches = capability.compatibleMedia.filter((medium) => (
      parsed.supportingMedia.includes(medium)
    ));
    const interactionMatch = capability.interactionModes.includes(parsed.interactionMode);
    const mediaMatch = capability.compatibleMedia.some((medium) => media.has(medium));
    const relevance = Math.min(100,
      matchedSignals.length * 12
        + (leadMatch ? 32 : 0)
        + supportMatches.length * 28
        + (interactionMatch && parsed.interactionMode !== 'none' ? 12 : 0)
    );

    if (relevance < 28 || (!mediaMatch && matchedSignals.length < 3)) return null;

    const reasons = [
      matchedSignals.length > 0 ? `想法出现“${matchedSignals.slice(0, 3).join(' / ')}”等正向信号。` : '',
      leadMatch ? `它能承担当前主导媒介 ${parsed.leadMedium} 的体验职责。` : '',
      supportMatches.length > 0 ? `它能让 ${supportMatches.join(' / ')} 成为有目的的辅助表达。` : '',
      interactionMatch && parsed.interactionMode !== 'none'
        ? `它已有与 ${parsed.interactionMode} 输入相符的因果互动经验。`
        : ''
    ].filter(Boolean);

    return creativeCapabilityMatchSchema.parse({
      capabilityId: capability.id,
      title: capability.title,
      relevance,
      why: reasons.join(''),
      matchedSignals,
      borrow: capability.borrowPrinciples.slice(0, 2),
      proofCaseIds: capability.proofCaseIds,
      authority: 'advisory'
    });
  }).filter((match): match is z.infer<typeof creativeCapabilityMatchSchema> => match !== null)
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, parsed.limit);

  return creativeCapabilityGuideSchema.parse({
    schemaVersion: 1,
    mode: 'positive-capability-composition',
    extensionPolicy: 'open-better-methods-allowed',
    catalogIsNotWhitelist: true,
    selections: matches,
    noMatchAction: 'leave-search-space-open'
  });
}

export function createCreativeCapabilityGuide(
  authorPackage: DirectCreativeAuthorPackage
): CreativeCapabilityGuide {
  return selectCreativeCapabilities({
    brief: authorPackage.authoringInput.exactBrief,
    leadMedium: authorPackage.authoringInput.creativeDirection.leadMedium.medium,
    supportingMedia: authorPackage.authoringInput.creativeDirection.supportingMedia
      .map((item) => item.medium),
    interactionMode: authorPackage.runSeed.interaction.mode
  });
}

export function serializeCompactCreativeCapabilityGuide(
  input: CreativeCapabilityGuide
): string {
  const guide = creativeCapabilityGuideSchema.parse(input);
  return JSON.stringify({
    open: guide.catalogIsNotWhitelist,
    use: guide.selections.map((selection) => selection.capabilityId)
  });
}

function positiveIntentClauses(text: string): string[] {
  const negativeStart = /^(?:不|不要|避免|禁止|无须|无需|别|拒绝|排除|without\b|avoid\b|no\b|not\b)/i;
  return text
    .split(/[。；;!！?？\n]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0 && !negativeStart.test(clause));
}
