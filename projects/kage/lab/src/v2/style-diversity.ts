import { z } from 'zod';
import type { ExperiencePattern } from './reference-intelligence.ts';
import { hasExplicitBranchingConfluenceIntent } from './branching-confluence.ts';

const compositionSchema = z.enum([
  'full-bleed-cinematic', 'editorial-grid', 'split-stage',
  'spatial-map', 'object-catalog', 'typographic-canvas'
]);
const paletteSchema = z.enum([
  'dark-luminous', 'daylight-neutral', 'warm-material',
  'high-key-monochrome', 'saturated-graphic', 'earth-archive'
]);
const motionSchema = z.enum([
  'scroll-scrub', 'direct-manipulation', 'state-switch',
  'horizontal-traverse', 'spatial-inspection', 'microinteraction-only'
]);
const spatialSchema = z.enum([
  'single-hero', 'environment-journey', 'modular-collection',
  'data-field', 'foreground-background', 'flat-editorial'
]);
const typographySchema = z.enum([
  'editorial-serif', 'functional-sans', 'display-condensed',
  'mono-instrument', 'quiet-small-scale', 'image-led-minimal'
]);
const mediaSchema = z.enum([
  'transparent-subject', 'image-sequence', 'real-3d',
  'procedural-3d', 'canvas-2d', 'dom-led'
]);

export const styleFingerprintSchema = z.object({
  composition: compositionSchema,
  palette: paletteSchema,
  motion: motionSchema,
  spatial: spatialSchema,
  typography: typographySchema,
  media: mediaSchema
}).strict();

export type StyleFingerprint = z.infer<typeof styleFingerprintSchema>;
export type StyleAxis = keyof StyleFingerprint;

export const experienceFormSchema = z.enum([
  'continuous-stage',
  'direct-workbench',
  'editorial-evidence',
  'spatial-atlas',
  'horizontal-panorama',
  'object-field',
  'branching-confluence',
  'typographic-sonic-field',
  'spatial-inspection'
]);

export const surfaceArchetypeSchema = z.enum([
  'editorial-narrative',
  'spatial-journey',
  'direct-instrument',
  'playful-exploration',
  'cinematic-product',
  'civic-data'
]);

export const controlVisibilitySchema = z.enum(['none', 'contextual', 'persistent']);
export const interactionStyleSchema = z.enum(['ambient', 'scroll', 'pointer', 'direct-control', 'mixed']);

const structureDirectionSchema = z.object({
  experienceForm: experienceFormSchema,
  workbenchPolicy: z.enum(['required', 'allowed', 'forbidden']),
  surfaceArchetype: surfaceArchetypeSchema.default('editorial-narrative'),
  controlVisibility: controlVisibilitySchema.default('contextual'),
  interactionStyle: interactionStyleSchema.default('mixed'),
  compositionRule: z.string().min(20),
  informationRule: z.string().min(20),
  antiTemplateRule: z.string().min(20),
  strength: z.literal('advisory').default('advisory')
}).strict();

export const styleDiversityDecisionSchema = z.object({
  fingerprint: styleFingerprintSchema,
  structureDirection: structureDirectionSchema,
  nearestCaseId: z.string().nullable(),
  nearestDistance: z.number().int().min(0).max(6),
  minimumDifferentAxes: z.number().int().min(0).max(6).default(0),
  mustDifferOn: z.array(z.enum([
    'composition', 'palette', 'motion', 'spatial', 'typography', 'media'
  ])).max(4).default([]),
  avoidRepeating: z.array(z.string().min(8)).max(4).default([]),
  rankingOnly: z.literal(true).default(true),
  rationale: z.string().min(12)
}).strict();

export type StyleDiversityDecision = z.infer<typeof styleDiversityDecisionSchema>;

interface StyleProfile {
  id: string;
  fingerprint: StyleFingerprint;
}

const archivedProfiles: readonly StyleProfile[] = [
  profile('dedicated-ba4e9d10caaa-depth-field', 'full-bleed-cinematic', 'dark-luminous', 'scroll-scrub', 'single-hero', 'editorial-serif', 'transparent-subject'),
  profile('dedicated-r36-delivery-final', 'full-bleed-cinematic', 'earth-archive', 'scroll-scrub', 'environment-journey', 'editorial-serif', 'image-sequence'),
  profile('dedicated-896cfb7e6657', 'full-bleed-cinematic', 'daylight-neutral', 'scroll-scrub', 'environment-journey', 'functional-sans', 'image-sequence'),
  profile('dedicated-1edb98865f4c', 'full-bleed-cinematic', 'dark-luminous', 'scroll-scrub', 'single-hero', 'functional-sans', 'transparent-subject'),
  profile('dedicated-8574ee46ab16', 'full-bleed-cinematic', 'warm-material', 'scroll-scrub', 'environment-journey', 'editorial-serif', 'image-sequence'),
  profile('dedicated-7c944e0c386f', 'split-stage', 'warm-material', 'scroll-scrub', 'foreground-background', 'functional-sans', 'image-sequence'),
  profile('dedicated-ef118f0f4962', 'full-bleed-cinematic', 'warm-material', 'direct-manipulation', 'environment-journey', 'editorial-serif', 'image-sequence'),
  profile('dedicated-1b9f0b05107b', 'full-bleed-cinematic', 'daylight-neutral', 'scroll-scrub', 'single-hero', 'functional-sans', 'transparent-subject'),
  profile('dedicated-191bc3ce2125', 'full-bleed-cinematic', 'earth-archive', 'scroll-scrub', 'single-hero', 'functional-sans', 'image-sequence'),
  profile('dedicated-53ab257bae4f', 'split-stage', 'warm-material', 'direct-manipulation', 'single-hero', 'mono-instrument', 'image-sequence'),
  profile('dedicated-tree-canopy-final-r82', 'split-stage', 'daylight-neutral', 'direct-manipulation', 'environment-journey', 'functional-sans', 'image-sequence'),
  profile('dedicated-beed36a85788', 'full-bleed-cinematic', 'daylight-neutral', 'direct-manipulation', 'foreground-background', 'quiet-small-scale', 'image-sequence'),
  profile('dedicated-b4d381a24320', 'split-stage', 'warm-material', 'direct-manipulation', 'single-hero', 'mono-instrument', 'transparent-subject')
];

const axes: readonly StyleAxis[] = ['composition', 'palette', 'motion', 'spatial', 'typography', 'media'];

export function selectStyleDiversity(input: {
  brief: string;
  pattern: ExperiencePattern;
}): StyleDiversityDecision {
  const normalized = positiveIntentText(input.brief);
  const seed = hash(input.brief);
  const structureDirection = applyExplicitNoParameterWorkbenchConstraint(
    selectStructureDirection(
      normalized,
      input.pattern,
      hasPersistentWorkbenchTaskEvidence(input.brief),
    ),
    hasExplicitNoParameterWorkbenchConstraint(input.brief),
  );
  const fingerprint: StyleFingerprint = {
    composition: selectComposition(normalized, seed),
    palette: selectPalette(normalized, seed),
    motion: selectMotion(normalized, seed),
    spatial: selectSpatial(normalized, input.pattern, seed),
    typography: selectTypography(normalized, seed),
    media: selectMedia(normalized, input.pattern)
  };

  const nearest = nearestProfile(fingerprint);
  return styleDiversityDecisionSchema.parse({
    fingerprint,
    structureDirection,
    nearestCaseId: nearest.profile?.id ?? null,
    nearestDistance: nearest.distance,
    minimumDifferentAxes: 0,
    mustDifferOn: [],
    avoidRepeating: [
      nearest.profile
        ? `可借鉴最相近案例 ${nearest.profile.id} 的已验证原理，但应由当前目标决定是否采用其构图和运动语法。`
        : '案例库只提供创意启发，不要求复制任何完整页面的视觉外壳。'
    ],
    rankingOnly: true,
    rationale: nearest.profile
      ? `系统建议从 ${structureDirection.experienceForm} 出发；与案例 ${nearest.profile.id} 的六轴距离为 ${nearest.distance}，该距离只用于参考排序和诊断，不是生成门禁。`
      : `系统建议从 ${structureDirection.experienceForm} 出发；案例库暂无相近方向，仍由当前 brief 和最终效果决定实现。`
  });
}

const controlledParameterGroups = [
  ['比例', '配方', '混合比例', 'ratio', 'recipe', 'formula', 'mix'],
  ['温度', '色温', 'temperature', 'color temperature'],
  ['厚度', 'thickness'],
  ['角度', '偏角', '朝向', 'angle', 'offset', 'orientation'],
  ['距离', 'distance'],
  ['高度', '安装高度', 'height'],
  ['位置', '灯位', 'position', 'placement'],
  ['风速', '速度', 'wind speed', 'speed'],
  ['亮度', '照度', 'brightness', 'illuminance'],
  ['压力', 'pressure'],
  ['时长', '时间', 'duration', 'timing'],
  ['数量', '密度', 'count', 'density']
] as const;

/**
 * A persistent workbench is a content-fit decision, not a synonym for an
 * interactive surface. Require either an explicit always-visible-controls
 * request or a grounded multi-parameter loop with live feedback and a final
 * action that depends on the current state.
 */
export function hasPersistentWorkbenchTaskEvidence(brief: string): boolean {
  if (hasExplicitNoParameterWorkbenchConstraint(brief)) return false;
  const rejectedPersistentControls = /(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应)[^。；;\n]{0,36}(?:持久|常驻|始终可见|持续可见|参数侧栏|参数面板)|(?:avoid|reject|forbid|without|do not|don't|no)[^.;\n]{0,36}(?:persistent|always-visible|parameter panel|parameter sidebar)/i.test(brief);
  if (rejectedPersistentControls) return false;

  const text = positiveIntentText(brief);
  const explicitlyPersistent = /(?:持久|常驻|始终可见|持续可见)[^。；;\n]{0,16}(?:控件|控制|参数)|(?:控件|控制|参数)[^。；;\n]{0,16}(?:持久|常驻|始终可见|持续可见)|(?:persistent|always-visible)[^.;\n]{0,24}(?:controls?|parameters?)|(?:controls?|parameters?)[^.;\n]{0,24}(?:remain visible|stay visible)/i.test(text);
  if (explicitlyPersistent) return true;

  const controlledParameterCount = countControlledParameters(text);
  const realtimeFeedback = has(text, [
    '同步变化', '同步更新', '实时更新', '即时更新', '立即更新', '随之变化', '重新计算',
    'real-time', 'realtime', 'live update', 'updates in real time', 'recalculate'
  ]);
  const stateDependentAction = /(?:保存|应用|确认|提交|导出)(?:当前|这组|本次|调校|校准|摆放|配方|参数|配置|方案|设置|结果|记录|状态)|(?:save|apply|confirm|submit|export)[^.;\n]{0,28}(?:current|configuration|setup|settings|parameters?|results?|state|plan|recipe)/i.test(text);

  return controlledParameterCount >= 2 && realtimeFeedback && stateDependentAction;
}

/** A brief-local rejection; it must not become a project-wide style rule. */
export function hasExplicitNoParameterWorkbenchConstraint(brief: string): boolean {
  return /不做\s*参数工作台/.test(brief);
}

function applyExplicitNoParameterWorkbenchConstraint(
  direction: z.infer<typeof structureDirectionSchema>,
  rejected: boolean,
): z.infer<typeof structureDirectionSchema> {
  if (!rejected) return direction;
  return structureDirectionSchema.parse({
    ...direction,
    workbenchPolicy: 'forbidden',
    controlVisibility: direction.controlVisibility === 'persistent'
      ? 'contextual'
      : direction.controlVisibility,
    antiTemplateRule: `${direction.antiTemplateRule} 当前 brief 明确不做参数工作台；控件若存在，只能按需服务主题主体、可见变化与最终行动。`,
  });
}

function selectStructureDirection(
  text: string,
  pattern: ExperiencePattern,
  persistentWorkbenchTaskEvidence: boolean,
): z.infer<typeof structureDirectionSchema> {
  if (hasExplicitBranchingConfluenceIntent(text)) {
    return {
      experienceForm: 'branching-confluence',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'playful-exploration',
      controlVisibility: 'contextual',
      interactionStyle: 'direct-control',
      compositionRule: '让共享视觉主体、显式选择、两条可重放路线与共同汇合结果形成一个选择驱动的动态构图。',
      informationRule: '选择只在决策时出现；当前路线、可见后果、路径历史和最终行动必须来自同一分支状态。',
      antiTemplateRule: '不得把分支退化为文案切换、持久参数工作台、卡片目录、空间路线图或线性长滚动。',
      strength: 'advisory'
    };
  }
  if (hasExplicitHorizontalPanoramaIntent(text)) {
    return {
      experienceForm: 'horizontal-panorama',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'civic-data',
      controlVisibility: 'contextual',
      interactionStyle: 'mixed',
      compositionRule: '让带署名且可追溯的真实地图成为一张连续横向主表面，brief 指定的地标沿同一坐标变换展开。',
      informationRule: '地标事实、真实热点和当前地点结果贴近对应位置出现，并由同一个横向位置与选中地标状态驱动。',
      antiTemplateRule: '不得把连续图卷退化为站点分页、卡片目录、持久参数工作台或彼此断开的多张地图。',
      strength: 'advisory'
    };
  }
  const parameterTask = has(text, [
    '调整', '调节', '参数', '比例', '温度', '厚度', '风速', '角度', '距离', '配方',
    'slider', 'parameter', 'ratio', 'temperature', 'thickness', 'angle'
  ]) && has(text, [
    '同步变化', '同步更新', '结果', '模拟', '预计', '风险', '保存方案', '保存记录',
    'update', 'result', 'simulation', 'save'
  ]);
  const curationTask = has(text, [
    '选书', '书封', '引文卡', '选书单', '阅读清单', 'book cover', 'quote card', 'reading list', 'curation'
  ]) && has(text, [
    '拖动', '选择', '重排', '筛选', '排序', '推荐', 'drag', 'select', 'reorder', 'filter', 'sort', 'recommend'
  ]) && has(text, [
    '清单', '路径', '结果', '推荐', '收藏', 'list', 'path', 'result', 'recommendation', 'collection'
  ]);
  const causalManipulationTask = has(text, [
    '拖动', '移动', '放入', '移位', '取出', '挂到', '摆放', '重排',
    'drag', 'move', 'place', 'remove', 'reorder'
  ]) && has(text, [
    '同步变化', '同步更新', '直接改变', '预计', '结果', '占用关系', '下垂', '超载',
    'update', 'result', 'occupancy', 'overload'
  ]) && has(text, [
    '生成', '保存', '完成', '顺序', '清单', '方案', '提醒',
    'generate', 'save', 'complete', 'order', 'list', 'plan'
  ]);
  const persistentParameterWorkbench = parameterTask && persistentWorkbenchTaskEvidence;
  if (parameterTask || curationTask || causalManipulationTask) {
    return {
      experienceForm: 'direct-workbench',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'direct-instrument',
      controlVisibility: persistentParameterWorkbench ? 'persistent' : 'contextual',
      interactionStyle: 'direct-control',
      compositionRule: '让同一可操作主体或可变场成为最大工作区，参数、结果与行动围绕它形成一条短路径。',
      informationRule: '控件按因果关系分组，结果紧邻对应主体变化；不得把每个参数拆成独立章节或宣传卡片。',
      antiTemplateRule: '建议让工作台由当前对象的真实操作关系决定；如采用常见三栏，也应证明它最适合当前任务。',
      strength: 'advisory'
    };
  }
  const spatialDataTask = has(text, ['地图', '路线', '站点', '坐标', '地理', 'map', 'route', 'station'])
    || (has(text, ['街区', '城市', '区域', 'district', 'city', 'area'])
      && has(text, ['地点选择', '位置选择', '距离', '导航', '定位', 'location', 'distance', 'navigation']));
  if (spatialDataTask) {
    return {
      experienceForm: 'spatial-atlas',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'civic-data',
      controlVisibility: 'contextual',
      interactionStyle: 'mixed',
      compositionRule: '让真实或诚实标注的空间关系成为主表面，选择、路线与地点证据直接叠合在同一地图或图册结构中。',
      informationRule: '地点名称、距离、状态和证据围绕空间位置组织，不另建通用仪表盘承载主要理解。',
      antiTemplateRule: '优先让地图、路线或地点选择承担主要理解；其他构图可在确实增强目标时使用。',
      strength: 'advisory'
    };
  }
  const sonicTypography = has(text, [
    '声音', '音频', '聆听', '试听', '声部', '口述史', '文字和声音', '声音为主',
    'audio', 'sound', 'listen', 'voice', 'oral history'
  ]) && has(text, [
    '短句', '文字', '排版', '宣言', '诗', '台词', '章节',
    'typography', 'editorial', 'transcript', 'chapter'
  ]);
  if (sonicTypography) {
    return {
      experienceForm: 'typographic-sonic-field',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'editorial-narrative',
      controlVisibility: 'contextual',
      interactionStyle: 'mixed',
      compositionRule: '让文字节奏、声音触发与证据关系共同形成主画面，阅读和聆听本身就是空间推进方式。',
      informationRule: '说话者、时间、地点或声音状态在触发内容附近展开，保持语义 DOM 和清晰阅读顺序。',
      antiTemplateRule: '优先保持文字与声音的主导关系；3D、参数或波形只有在增强该关系时才建议加入。',
      strength: 'advisory'
    };
  }
  const archiveTask = has(text, [
    '档案', '证据', '年代', '修复记录', '研究过程', 'archive', 'evidence', 'timeline'
  ]);
  const collectionTask = has(text, [
    '对象系列', '作品系列', '展品系列', '标本目录', '馆藏目录', '收藏集', '目录', '馆藏',
    'catalog', 'object series', 'exhibit series'
  ]) || (has(text, ['系列', 'collection']) && has(text, [
    '对象', '作品', '展品', '装置', '藏品', '多个', '多件', '六只',
    'object', 'artwork', 'exhibit', 'installation', 'multiple', 'six',
    '选择', '探索', 'select', 'explore'
  ]));
  const culturalObjectExploration = has(text, [
    '文化活动', '展览', '游园', '巡游', '展会', 'festival', 'exhibition', 'parade'
  ]) && has(text, [
    '对象', '展品', '作品', '装置', '纸蝶', '藏品', '多个', '多件', '六只',
    'object', 'exhibit', 'artwork', 'installation', 'multiple', 'six'
  ]) && has(text, [
    '选择', '探索', '指针', '触摸', '点击', '悬停', '加入',
    'select', 'explore', 'pointer', 'touch', 'click', 'hover', 'join'
  ]);
  if ((collectionTask || culturalObjectExploration) && !archiveTask) {
    return {
      experienceForm: 'object-field',
      workbenchPolicy: 'forbidden',
      surfaceArchetype: 'playful-exploration',
      controlVisibility: 'contextual',
      interactionStyle: 'pointer',
      compositionRule: '让多个可选择对象以目录、标本场或非均匀集合存在，选择后在对象附近展开差异和证据。',
      informationRule: '保留对象之间的比较尺度与浏览关系，详情按需展开，不把所有对象压入同一个中央英雄位。',
      antiTemplateRule: '优先保留对象之间的比较关系；单主体、长滚动或工作台形式可在更符合当前目标时采用。',
      strength: 'advisory'
    };
  }
  if (archiveTask) {
    return {
      experienceForm: 'editorial-evidence',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'editorial-narrative',
      controlVisibility: 'none',
      interactionStyle: 'scroll',
      compositionRule: '以档案、证据和时间关系建立编辑式阅读场，重要材料在阅读路径中承担主视觉而不是装饰缩略图。',
      informationRule: '来源、时间、变化与结论按证据关系组织，允许非均匀段落和局部对照，不拆成等高功能卡。',
      antiTemplateRule: '优先让档案关系与材料阅读决定结构；中央主体、卡片或分屏可在有明确内容理由时使用。',
      strength: 'advisory'
    };
  }
  if (hasExplicitSpatialInspectionIntent(text)
    || pattern === 'spatial-exploration'
    || has(text, ['glb', '拆解', '自由旋转', '空间检查', '进入空间'])) {
    return {
      experienceForm: 'spatial-inspection',
      workbenchPolicy: 'allowed',
      surfaceArchetype: 'spatial-journey',
      controlVisibility: 'contextual',
      interactionStyle: 'mixed',
      compositionRule: '让可检查空间或真实对象持续占据主舞台，导航和证据作为克制前景层服务观察任务。',
      informationRule: '控件只承担视角、选择和检查，详情不得遮挡对象定义性结构或破坏空间连续性。',
      antiTemplateRule: '建议让可检查空间或对象承担主要体验；其他信息层应证明其不会削弱观察任务。',
      strength: 'advisory'
    };
  }
  const surfaceArchetype = pattern === 'editorial-field'
    ? 'editorial-narrative'
    : pattern === 'product-atmosphere' || pattern === 'material-transformation'
      ? 'cinematic-product'
      : 'spatial-journey';
  return {
    experienceForm: pattern === 'editorial-field' ? 'editorial-evidence' : 'continuous-stage',
    workbenchPolicy: 'allowed',
    surfaceArchetype,
    controlVisibility: surfaceArchetype === 'editorial-narrative' ? 'none' : 'contextual',
    interactionStyle: 'scroll',
    compositionRule: pattern === 'editorial-field'
      ? '使用有主次的编辑流组织主题、变化和行动，让内容密度与阅读节奏由当前业务决定。'
      : '用一个持续视觉场承载建立、变化和收束，节点是状态锚点而不是等高页面章节。',
    informationRule: '信息贴近其解释的对象或状态出现，保持单一阅读主线，不把卖点机械拆成仪表卡和固定屏。',
    antiTemplateRule: '结构应由当前内容和行动决定；工作台、面板或分栏都只是可选方案，不是默认答案。',
    strength: 'advisory'
  };
}

/**
 * A spatial motion inspection is a product relationship, not an animal theme:
 * one animated model exposes real named clips and a visitor chooses among
 * those clips while the camera and explanatory evidence follow the same
 * state. Requiring all four signals keeps static model viewers and generic
 * nature education pages on their existing routes.
 */
export function hasExplicitSpatialInspectionIntent(brief: string): boolean {
  const text = positiveIntentText(brief);
  const animatedModel = has(text, [
    '动画 glb', '动画glb', '动画 gltf', '动画gltf', 'animated glb', 'animated gltf',
    '带动画模型', '动画模型', 'rigged model', 'skinned model'
  ]) || (
    has(text, ['glb', 'gltf', '真实模型', '可追溯模型', 'real model'])
    && has(text, ['动画', '动作剪辑', '动画剪辑', 'animation clip', 'animation cycle'])
  );
  const namedClipStates = has(text, [
    '动作剪辑', '动画剪辑', '命名 clip', '命名clip', '三套动画', '动画状态',
    'animation clip', 'animation cycle', 'named clip'
  ]) || /(?:survey|walk|run)[^。；;\n]{0,64}(?:survey|walk|run)/i.test(text);
  const visitorChoosesState = has(text, [
    '选择', '切换', '选中', 'choose', 'select', 'switch', 'toggle'
  ]);
  const synchronizedInspection = has(text, [
    '镜头', '观察角', '观察信息', '动作说明', '足迹', '节距',
    'camera', 'view', 'description', 'footprint', 'stride'
  ]) && has(text, [
    '同步变化', '同步更新', '同步改变', '联动', '随之变化', 'sync', 'update together'
  ]);
  return animatedModel && namedClipStates && visitorChoosesState && synchronizedInspection;
}

/**
 * A horizontal panorama is a relationship between navigation, one continuous
 * map surface and grounded geography. All three signals are required so a
 * normal map or an unrelated horizontal list keeps its existing route.
 */
export function hasExplicitHorizontalPanoramaIntent(brief: string): boolean {
  const text = positiveIntentText(brief);
  const explicitHorizontalNavigation = has(text, [
    '横向穿行', '横向浏览', '横向移动', '横向位置', '左右拖动', '左右滑动',
    'horizontal traverse', 'horizontal browsing', 'horizontal navigation', 'horizontal position',
    'drag left', 'drag right', 'swipe left', 'swipe right'
  ]);
  const continuousSingleMap = has(text, [
    '连续图卷', '连续长卷', '连续地图', '同一张地图', '同一地图', '同一底图', '单一地图',
    'continuous map', 'continuous atlas', 'single map', 'single atlas'
  ]) || /(?:同一|单一|一张)[^。；;\n]{0,24}(?:地图|底图|图卷|长卷)/.test(text);
  const mapSurface = has(text, ['地图', '底图', '图卷', 'map', 'atlas']);
  const groundedMapEvidence = mapSurface && (
    has(text, [
      '真实地图', '真实底图', '真实地理', '真实区域', '带署名',
      '可追溯地标坐标', '可追溯坐标', '地标坐标',
      'openstreetmap', 'attributed map', 'traceable coordinates', 'real map'
    ])
    || /真实[^。；;\n]{0,24}(?:地图|底图)/.test(text)
  );
  return explicitHorizontalNavigation && continuousSingleMap && groundedMapEvidence;
}

export function styleDistance(a: StyleFingerprint, b: StyleFingerprint): number {
  return axes.reduce((count, axis) => count + Number(a[axis] !== b[axis]), 0);
}

function nearestProfile(fingerprint: StyleFingerprint): { profile: StyleProfile | null; distance: number } {
  const ranked = archivedProfiles
    .map((profile) => ({ profile, distance: styleDistance(fingerprint, profile.fingerprint) }))
    .sort((a, b) => a.distance - b.distance || a.profile.id.localeCompare(b.profile.id));
  return ranked[0] ?? { profile: null, distance: 6 };
}

function selectComposition(text: string, seed: number): StyleFingerprint['composition'] {
  if (has(text, ['运动图形海报', '动态海报', '海报', 'motion graphic', 'motion poster'])) return 'typographic-canvas';
  if (has(text, ['编辑', '杂志', '时装', '作品集', 'editorial'])) return 'editorial-grid';
  if (has(text, ['地图', '路线', '坐标', '空间关系', '地理数据'])) return 'spatial-map';
  if (has(text, ['档案', '票根', '年代', '旧址', '馆藏'])) return 'editorial-grid';
  if (has(text, ['系列', '目录', '收藏', '标本', 'collection'])) return 'object-catalog';
  if (has(text, ['对比', '修复', '维修', '诊断', '拆解', '装配', '说明书', '前后', '两种', 'compare'])) return 'split-stage';
  if (has(text, ['诗', '文字', '宣言', '出版', 'type'])) return 'typographic-canvas';
  return pick(['editorial-grid', 'split-stage', 'spatial-map', 'object-catalog', 'typographic-canvas', 'full-bleed-cinematic'], seed);
}

function selectPalette(text: string, seed: number): StyleFingerprint['palette'] {
  if (has(text, ['白色', '纯白', '极简', '高调'])) return 'high-key-monochrome';
  if (has(text, ['清晨', '白天', '日光', '明亮', '自然光', '天空蓝', '亚麻白', '清爽'])) return 'daylight-neutral';
  if (has(text, ['纸', '木', '手工', '温暖', '陶'])) return 'warm-material';
  if (has(text, ['自然', '档案', '博物馆', '土壤', '植物'])) return 'earth-archive';
  if (has(text, ['海报', '大胆', '年轻', '色块', '鲜艳'])) return 'saturated-graphic';
  if (has(text, ['夜', '暗', '黑', '星'])) return 'dark-luminous';
  return pick(['daylight-neutral', 'warm-material', 'high-key-monochrome', 'saturated-graphic', 'earth-archive', 'dark-luminous'], seed + 1);
}

function selectMotion(text: string, seed: number): StyleFingerprint['motion'] {
  if (hasExplicitSpatialInspectionIntent(text)) return 'spatial-inspection';
  if (has(text, ['拖动', '指针', '触摸', '混合比例', '拨动'])) return 'direct-manipulation';
  if (has(text, ['选择', '切换', '比较', '分支'])) return 'state-switch';
  if (has(text, ['横向', '水平', '横移'])) return 'horizontal-traverse';
  if (has(text, ['旋转', '检查', '观察', '拆解'])) return 'spatial-inspection';
  if (has(text, ['安静', '静止', '克制', '阅读'])) return 'microinteraction-only';
  if (has(text, ['滚动', '逐渐', '形成', '进入'])) return 'scroll-scrub';
  return pick(['direct-manipulation', 'state-switch', 'horizontal-traverse', 'spatial-inspection', 'microinteraction-only', 'scroll-scrub'], seed + 2);
}

function selectSpatial(text: string, pattern: ExperiencePattern, seed: number): StyleFingerprint['spatial'] {
  if (has(text, ['档案', '数据', '证据', '坐标'])) return 'data-field';
  if (has(text, ['系列', '目录', '多个', '集合'])) return 'modular-collection';
  if (has(text, ['前景', '背景', '层叠', '景深'])) return 'foreground-background';
  if (pattern === 'spatial-exploration' || pattern === 'environmental-memory') return 'environment-journey';
  if (pattern === 'editorial-field') return 'flat-editorial';
  if (pattern === 'product-atmosphere' || pattern === 'material-transformation') return 'single-hero';
  return pick(['modular-collection', 'data-field', 'foreground-background', 'flat-editorial', 'single-hero', 'environment-journey'], seed + 3);
}

function selectTypography(text: string, seed: number): StyleFingerprint['typography'] {
  if (has(text, ['数据', '仪器', '实验', '工程'])) return 'mono-instrument';
  if (has(text, ['时装', '杂志', '文化', '出版'])) return 'editorial-serif';
  if (has(text, ['海报', '大胆', '运动', '节奏'])) return 'display-condensed';
  if (has(text, ['安静', '克制', '真实', '自然'])) return 'quiet-small-scale';
  if (has(text, ['摄影', '作品', '画廊', '图片'])) return 'image-led-minimal';
  return pick(['quiet-small-scale', 'image-led-minimal', 'mono-instrument', 'display-condensed', 'functional-sans', 'editorial-serif'], seed + 4);
}

function selectMedia(text: string, pattern: ExperiencePattern): StyleFingerprint['media'] {
  if (has(text, ['glb', '真实模型', '扫描模型'])) return 'real-3d';
  if (has(text, ['程序化 3d', '程序化3d', '主题专属 3d', '主题专属3d', 'three.js', 'threejs'])) return 'procedural-3d';
  if (has(text, ['程序化', '机械', '组装', '关节', '生成结构'])) return 'procedural-3d';
  if (has(text, ['数据', '曲线', '地图', '图谱'])) return 'canvas-2d';
  if (pattern === 'editorial-field') return 'dom-led';
  if (pattern === 'product-atmosphere' || pattern === 'material-transformation') return 'transparent-subject';
  return 'image-sequence';
}

function profile(
  id: string,
  composition: StyleFingerprint['composition'], palette: StyleFingerprint['palette'],
  motion: StyleFingerprint['motion'], spatial: StyleFingerprint['spatial'],
  typography: StyleFingerprint['typography'], media: StyleFingerprint['media']
): StyleProfile {
  return { id, fingerprint: { composition, palette, motion, spatial, typography, media } };
}

function pick<T>(values: readonly T[], seed: number): T {
  return values[Math.abs(seed) % values.length] as T;
}

function has(text: string, words: readonly string[]): boolean {
  return words.some((word) => text.includes(word));
}

function countControlledParameters(text: string): number {
  const controlPhrasePattern = /(?:(?:同时)?(?:调整|调节|设置|控制|输入|改变)|\b(?:adjust|tune|set|control|input)\b)\s*([^。；;\n]{1,120})/gi;
  let highestCount = 0;

  for (const match of text.matchAll(controlPhrasePattern)) {
    const phrase = (match[1] ?? '').split(
      /(?:时|后|会|将|则|并?(?:实时|同步)(?:变化|更新)?|实时(?:变化|更新)?|同步(?:变化|更新)?|updates?|changes?|recalculates?)/i,
      1,
    )[0] ?? '';
    const count = controlledParameterGroups.reduce(
      (total, group) => total + Number(group.some((term) => phrase.includes(term))),
      0,
    );
    highestCount = Math.max(highestCount, count);
  }

  return highestCount;
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function positiveIntentText(brief: string): string {
  const clauses = brief.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean);
  const negativeMarker = /(?:不要|避免|拒绝|禁止|不使用|无需|不需要|不能|不应|不是|并非|不做成|不做(?=\s*参数工作台))|\b(?:do not|don't|avoid|reject|forbid|without|no)\b/i;
  const positive = clauses
    .map((clause) => {
      const marker = negativeMarker.exec(clause);
      return (marker ? clause.slice(0, marker.index) : clause).trim();
    })
    .filter(Boolean);
  return (positive.length > 0 ? positive.join('。') : brief).toLowerCase();
}
