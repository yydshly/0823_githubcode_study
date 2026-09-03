import { z } from 'zod';
import type { ExperiencePattern } from './reference-intelligence.ts';
import type { StyleDiversityDecision } from './style-diversity.ts';
import { classifyInteractionTaskShape } from './interaction-task-shape.ts';
import { hasExplicitBranchingConfluenceIntent } from './branching-confluence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const visualRoleSchema = z.enum([
  'environment',
  'subject',
  'information',
  'spatial-object',
  'procedural-field'
]);

export const visualMechanismIdSchema = z.enum([
  'environmental-aperture',
  'state-storyboard',
  'subject-specimen-field',
  'branded-media-mask',
  'sticky-archive-stack',
  'pointer-reveal',
  'product-microfilm',
  'articulated-subject-reveal',
  'cinematic-3d-deconstruction'
]);

const mechanismSelectionSchema = z.object({
  id: visualMechanismIdSchema,
  title: z.string().min(3),
  evidenceLevel: z.enum(['E3', 'E4']),
  job: z.string().min(8),
  reason: z.string().min(8),
  sourceCaseIds: z.array(safeId).min(1)
}).strict();

const interactionDirectiveSchema = z.object({
  primaryInput: z.enum(['scroll', 'pointer', 'direct-navigation']),
  semanticAction: z.string().min(8),
  pointerRole: z.enum(['none', 'secondary', 'primary']),
  touchAlternative: z.string().min(8),
  keyboardAlternative: z.string().min(8)
}).strict();

const rendererDecisionSchema = z.object({
  baseLayer: z.literal('semantic-dom'),
  route: z.enum(['dom-only', 'dom-media-hybrid', 'dom-canvas-hybrid', 'dom-three-hybrid']),
  enhancement: z.enum(['none', 'media', 'canvas-shader', 'three-webgl']),
  reason: z.string().min(8),
  threeJustification: z.string().min(8),
  fallback: z.string().min(8)
}).strict();

export const experienceDecisionSchema = z.object({
  visualRole: visualRoleSchema,
  mechanisms: z.array(mechanismSelectionSchema).min(1).max(3),
  interaction: interactionDirectiveSchema,
  renderer: rendererDecisionSchema,
  rejectedMechanisms: z.array(z.object({
    id: visualMechanismIdSchema,
    reason: z.string().min(8)
  }).strict()).max(3),
  decisionSummary: z.string().min(12)
}).strict().superRefine((decision, context) => {
  const ids = decision.mechanisms.map((mechanism) => mechanism.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['mechanisms'], message: '视觉机制不能重复。' });
  }
  if (decision.renderer.enhancement === 'three-webgl' && decision.renderer.route !== 'dom-three-hybrid') {
    context.addIssue({ code: 'custom', path: ['renderer'], message: 'Three.js 增强必须使用 DOM + Three.js 混合路线。' });
  }
});

export type ExperienceDecision = z.infer<typeof experienceDecisionSchema>;
export type VisualRole = z.infer<typeof visualRoleSchema>;

interface AssetSignal {
  role: 'subject' | 'environment' | 'atmosphere' | 'information';
  modality: 'transparent-image' | 'image-sequence' | 'model-3d' | 'texture' | 'procedural';
  required: boolean;
}

export interface ExperienceDecisionInput {
  brief: string;
  pattern: ExperiencePattern;
  assets: readonly AssetSignal[];
  beatCount: number;
  experienceForm?: StyleDiversityDecision['structureDirection']['experienceForm'];
}

interface MechanismDefinition {
  id: z.infer<typeof visualMechanismIdSchema>;
  title: string;
  evidenceLevel: 'E3' | 'E4';
  roles: readonly VisualRole[];
  patterns: readonly ExperiencePattern[];
  signals: readonly string[];
  job: string;
  sourceCaseIds: readonly string[];
  requiresModel?: boolean;
  requiresExplicitInteraction?: boolean;
  requiresExplicitSignal?: boolean;
}

const mechanismCatalog: readonly MechanismDefinition[] = [
  {
    id: 'environmental-aperture',
    title: '环境窗口',
    evidenceLevel: 'E4',
    roles: ['environment'],
    patterns: ['environmental-memory', 'spatial-exploration', 'continuous-scroll'],
    signals: ['空间', '房间', '进入', '旅行', '云', '海洋', '环境', '梦', '记忆'],
    job: '让核心环境直接成为视口，而不是被装进一个装饰性图片框。',
    sourceCaseIds: ['airlines-environmental-aperture']
  },
  {
    id: 'state-storyboard',
    title: '状态故事板',
    evidenceLevel: 'E4',
    roles: ['environment', 'subject', 'spatial-object', 'procedural-field'],
    patterns: ['continuous-scroll', 'environmental-memory', 'product-atmosphere', 'material-transformation', 'spatial-exploration'],
    signals: ['滚动', '逐渐', '形成', '变化', '最后', '然后', '进入', '拆解', '生长'],
    job: '用连续的视觉状态分配页面节奏，每个状态只承担一个叙事动词。',
    sourceCaseIds: ['plety-media-storyboard', 'igloo-cinematic-deconstruction']
  },
  {
    id: 'subject-specimen-field',
    title: '主体标本场',
    evidenceLevel: 'E4',
    roles: ['subject', 'spatial-object'],
    patterns: ['product-atmosphere', 'material-transformation', 'editorial-field'],
    signals: ['产品', '设备', '服装', '材质', '艺术', '主体', '时装', '硬件'],
    job: '围绕独立主体和安全区组织排版，让对象始终保持识别和呼吸空间。',
    sourceCaseIds: ['sports-ai-subject-field']
  },
  {
    id: 'branded-media-mask',
    title: '品牌蒙版',
    evidenceLevel: 'E4',
    roles: ['subject', 'information'],
    patterns: ['editorial-field', 'material-transformation', 'product-atmosphere'],
    signals: ['数据', '成果', '统计', '字形', '标志', '蒙版'],
    job: '让品牌字形或有语义的轮廓成为媒体容器，并与证据内容共同构图。',
    sourceCaseIds: ['harvest-masked-statistics'],
    requiresExplicitSignal: true
  },
  {
    id: 'sticky-archive-stack',
    title: '滚动堆叠档案',
    evidenceLevel: 'E4',
    roles: ['information'],
    patterns: ['spatial-exploration', 'editorial-field'],
    signals: ['档案', '系列', '作品', '展陈', '案例', '选择路径', '集合'],
    job: '把并列对象组织成可追踪的层级，让每次滚动只引入一个新证据。',
    sourceCaseIds: ['fabrica-sticky-stack']
  },
  {
    id: 'pointer-reveal',
    title: '指针揭示',
    evidenceLevel: 'E3',
    roles: ['subject', 'information', 'spatial-object'],
    patterns: ['spatial-exploration', 'editorial-field', 'material-transformation', 'product-atmosphere'],
    signals: ['探索', '发现', '检查', '选择', '悬停', '鼠标', '指针', '聚光'],
    job: '让输入行为承担发现、比较或检查含义，而不是只让装饰跟随坐标。',
    sourceCaseIds: ['nike-pointer-spotlight'],
    requiresExplicitInteraction: true
  },
  {
    id: 'product-microfilm',
    title: '产品微电影',
    evidenceLevel: 'E3',
    roles: ['subject', 'spatial-object'],
    patterns: ['product-atmosphere', 'material-transformation'],
    signals: ['发布', '演示', '亮起', '启动', '手势', '英雄镜头', '产品'],
    job: '用一个短而可重播的英雄镜头证明产品状态和关键交互。',
    sourceCaseIds: ['aether-product-microfilm']
  },
  {
    id: 'articulated-subject-reveal',
    title: '关节主体揭示',
    evidenceLevel: 'E4',
    roles: ['subject', 'procedural-field'],
    patterns: ['continuous-scroll', 'product-atmosphere', 'material-transformation', 'editorial-field'],
    signals: ['展开', '绽放', '组装', '解构', '关节', '翼', '叶片', '核心', '骨架'],
    job: '把全局滚动拆成部件错峰进度，让单一抽象主体通过结构变化解释主题。',
    sourceCaseIds: ['threejs-iris-articulated-reveal'],
    requiresExplicitSignal: true
  },
  {
    id: 'cinematic-3d-deconstruction',
    title: '电影式 3D 拆解',
    evidenceLevel: 'E4',
    roles: ['spatial-object'],
    patterns: ['product-atmosphere', 'spatial-exploration'],
    signals: ['glb', 'gltf', '拆解', '内部结构', '模型', '旋转检查', '爆炸视图'],
    job: '把真实三维对象拆成可寻址、可复位、可测试的镜头状态。',
    sourceCaseIds: ['igloo-cinematic-deconstruction'],
    requiresModel: true
  }
];

export function directExperience(input: ExperienceDecisionInput): ExperienceDecision {
  const normalized = input.brief.toLowerCase();
  const hasModel = input.assets.some((asset) => asset.modality === 'model-3d');
  const role = resolveVisualRole(input.assets);
  const scored = mechanismCatalog
    .filter((mechanism) => !mechanism.requiresModel || hasModel)
    .filter((mechanism) => !mechanism.requiresExplicitInteraction || mechanism.signals.some((signal) => normalized.includes(signal)))
    .filter((mechanism) => !mechanism.requiresExplicitSignal || mechanism.signals.some((signal) => normalized.includes(signal)))
    .map((mechanism) => {
      const signalMatches = mechanism.signals.filter((signal) => normalized.includes(signal));
      const roleMatch = mechanism.roles.includes(role);
      const patternMatch = mechanism.patterns.includes(input.pattern);
      const score = (roleMatch ? 32 : 0)
        + (patternMatch ? 24 : 0)
        + Math.min(24, signalMatches.length * 8)
        + (mechanism.evidenceLevel === 'E4' ? 10 : 5)
        + (mechanism.id === 'state-storyboard' && input.beatCount >= 3 ? 8 : 0);
      return { mechanism, score, signalMatches, roleMatch, patternMatch };
    })
    .filter((entry) => entry.score >= 42)
    .sort((left, right) => right.score - left.score || left.mechanism.id.localeCompare(right.mechanism.id));

  const chosen = ensureMechanismCoverage(scored.map((entry) => entry.mechanism), role, hasModel).slice(0, 3);
  const mechanisms = chosen.map((mechanism) => {
    const signalMatches = mechanism.signals.filter((signal) => normalized.includes(signal));
    return {
      id: mechanism.id,
      title: mechanism.title,
      evidenceLevel: mechanism.evidenceLevel,
      job: mechanism.job,
      reason: mechanismReason(mechanism, role, input.pattern, signalMatches),
      sourceCaseIds: [...mechanism.sourceCaseIds]
    };
  });
  const interaction = interactionFor(input, role);
  const renderer = rendererFor(input.assets, input.pattern, input.brief, input.experienceForm);
  const rejectedMechanisms = rejectedFor(role, hasModel, interaction.pointerRole);

  return experienceDecisionSchema.parse({
    visualRole: role,
    mechanisms,
    interaction,
    renderer,
    rejectedMechanisms,
    decisionSummary: `以${visualRoleLabel(role)}承担主要视觉，用${mechanisms.map((item) => item.title).join('、')}组织变化；${renderer.reason}`
  });
}

function resolveVisualRole(assets: readonly AssetSignal[]): VisualRole {
  if (assets.some((asset) => asset.modality === 'model-3d')) return 'spatial-object';
  const required = assets.filter((asset) => asset.required);
  if (required.some((asset) => asset.role === 'environment')) return 'environment';
  if (required.some((asset) => asset.role === 'subject')) return 'subject';
  if (assets.some((asset) => asset.role === 'information')) return 'information';
  return 'procedural-field';
}

function ensureMechanismCoverage(
  mechanisms: readonly MechanismDefinition[],
  role: VisualRole,
  hasModel: boolean
): readonly MechanismDefinition[] {
  const preferredIds: Record<VisualRole, readonly MechanismDefinition['id'][]> = {
    environment: ['environmental-aperture', 'state-storyboard'],
    subject: ['subject-specimen-field', 'state-storyboard'],
    information: ['sticky-archive-stack', 'branded-media-mask'],
    'spatial-object': ['cinematic-3d-deconstruction', 'subject-specimen-field', 'state-storyboard'],
    'procedural-field': ['state-storyboard']
  };
  const ordered = [...preferredIds[role], ...mechanisms.map((mechanism) => mechanism.id)];
  const selected: MechanismDefinition[] = [];
  for (const id of ordered) {
    const mechanism = mechanismCatalog.find((item) => item.id === id);
    if (!mechanism || selected.some((item) => item.id === id)) continue;
    if (mechanism.requiresModel && !hasModel) continue;
    if (mechanism.requiresExplicitInteraction && !mechanisms.some((item) => item.id === id)) continue;
    selected.push(mechanism);
  }
  return selected;
}

function mechanismReason(
  mechanism: MechanismDefinition,
  role: VisualRole,
  pattern: ExperiencePattern,
  signalMatches: readonly string[]
): string {
  const reasons = [
    mechanism.roles.includes(role) ? `匹配${visualRoleLabel(role)}的主要视觉职责。` : '',
    mechanism.patterns.includes(pattern) ? `支持 ${pattern} 体验。` : '',
    signalMatches.length ? `命中“${signalMatches.join('、')}”。` : ''
  ].filter(Boolean);
  return reasons.join(' ') || '作为当前机制组合的补充叙事职责。';
}

function interactionFor(input: ExperienceDecisionInput, role: VisualRole): ExperienceDecision['interaction'] {
  const normalized = input.brief.toLowerCase();
  const directManipulation = classifyInteractionTaskShape(input.brief).kind === 'grounded-physical-manipulation'
    || (input.experienceForm === 'direct-workbench' && /(?:拖动|拖拽|拖到|drag)/i.test(normalized));
  const stateSelection = /(?:选择|切换|调整|填写|选中).{0,36}(?:后|时|并|会|同步).{0,48}(?:更新|改变|显示|查看|高亮|切换|联动|同步)|(?:select|choose|change).{0,48}(?:update|highlight|sync|show)/i.test(normalized);
  const parameterDriven = /(?:调整|选择|改变|混合|切换|移动).{0,40}(?:比例|配方|温度|参数|角度|亮度|光束|色片|灯具|cue|距离|高度|偏角|位置|模式)|(?:ratio|formula|temperature|parameter|angle|brightness|beam|gel|cue|distance|height|offset|position|mode).{0,40}(?:adjust|change|mix|select|switch|move)/i.test(normalized);
  const direct = stateSelection
    || /(?:控件|控制器|滑块).{0,12}(?:接管|控制|调节|调整)/i.test(normalized)
    || includesAny(normalized, ['自由旋转', '旋转检查', '选择路径', '探索路径', '可以选择', '可选择', '点击选择', '直接选择']);
  const pointer = includesAny(normalized, ['鼠标', '指针', '悬停', '聚光', '检查', '发现']);
  const explicitSonicPlayback = input.experienceForm === 'typographic-sonic-field'
    && includesAny(normalized, ['播放', '试听', '聆听', '听辨', '按空格', 'play', 'listen', 'space']);
  if (explicitSonicPlayback) {
    return {
      primaryInput: 'direct-navigation',
      semanticAction: '用试听按钮或输入框外空格键播放声音段；同一声音序列同步驱动当前文字、时值、揭示、结果与最终行动。',
      pointerRole: 'primary',
      touchAlternative: '触摸设备使用就近试听、分段重播、提交和保存按钮完成同一任务，不依赖 hover 或横向拖动。',
      keyboardAlternative: '试听与分段按钮按语义顺序进入焦点，Enter 激活；输入框外空格键播放或停止，输入控件内保留原生空格行为。'
    };
  }
  if (input.experienceForm === 'branching-confluence'
    && hasExplicitBranchingConfluenceIntent(input.brief)) {
    return {
      primaryInput: 'direct-navigation',
      semanticAction: '先选择参与对象，再从两条明确路线中选择其一；同一视觉主体、路线后果、路径历史与共同汇合行动由同一分支状态驱动。',
      pointerRole: 'primary',
      touchAlternative: '触摸设备以清晰的上下文按钮完成两次选择，并可返回重放另一条路线，不依赖 hover 或横向拖动。',
      keyboardAlternative: '每个选择按语义顺序进入焦点，Enter 激活，Escape 或明确返回操作回到上一个选择；两条路线均可完整到达共同行动。'
    };
  }
  if (input.experienceForm === 'object-field') {
    return {
      primaryInput: 'pointer',
      semanticAction: '通过指针、触摸或键盘探索并选择同一对象场中的对象，让队形、焦点、就近信息和最终行动共享当前选择状态。',
      pointerRole: 'primary',
      touchAlternative: '触摸设备通过点击对象完成探索与选择；再次点击或使用明确返回操作复位，不依赖 hover。',
      keyboardAlternative: '对象按语义顺序进入焦点，方向键移动焦点，Enter 选择或确认，Escape 返回完整对象场。'
    };
  }
  if (input.experienceForm === 'spatial-inspection') {
    return {
      primaryInput: 'direct-navigation',
      semanticAction: '直接选择模型中通过核验的真实命名动作剪辑，让同一动画主体、受控镜头、空间证据、动作说明与最终结果共享当前选择状态。',
      pointerRole: 'primary',
      touchAlternative: '触摸设备使用清楚的语义按钮切换动作，并提供适合小屏的固定观察角或克制拖拽；不依赖 hover、自动环绕或桌面画布裁切。',
      keyboardAlternative: '动作按钮按语义顺序进入焦点，方向键移动选择，Enter 播放当前真实剪辑，Escape 或明确重置操作回到稳定观察状态。'
    };
  }
  if (directManipulation) {
    const containerOperation = includesAny(normalized, ['放入', '取出', '装箱', '收纳', '容器', '箱内']);
    return {
      primaryInput: 'pointer',
      semanticAction: '通过指针或触摸直接拖动物件（direct-manipulation），让同一工作区中的位置、占用关系与业务结果同步变化。',
      pointerRole: 'primary',
      touchAlternative: containerOperation
        ? '触摸设备直接拖动物件；同时提供可聚焦的移动、放入和取出操作。'
        : '触摸设备直接拖动物件；同时提供可聚焦的选择、移动与确认目标操作。',
      keyboardAlternative: containerOperation
        ? '聚焦物件后可用方向键移动，并用 Enter 完成放入、取出或确认，Escape 取消当前操作。'
        : '聚焦物件后可用方向键移动或调整，Enter 选择目标或确认，Escape 取消当前操作。'
    };
  }
  if (direct) {
    return {
      primaryInput: 'direct-navigation',
      semanticAction: parameterDriven
        ? '直接调整参数并让同一主体的可见状态、数值与结果解释同步变化。'
        : role === 'spatial-object' ? '直接选择镜头或观察角，检查真实对象结构。' : '直接选择一条探索路径并保持位置反馈。',
      pointerRole: 'primary',
      touchAlternative: '提供等价的点击热点、拖拽或分段导航，不依赖 hover。',
      keyboardAlternative: '所有镜头、热点或路径都可通过顺序焦点和 Enter 激活。'
    };
  }
  if (pointer) {
    return {
      primaryInput: 'pointer',
      semanticAction: '指针只用于揭示、比较或检查当前视觉对象的局部关系。',
      pointerRole: 'primary',
      touchAlternative: '触摸设备通过点击选择和再次点击复位获得同一信息。',
      keyboardAlternative: '可发现区域进入焦点后显示相同内容，并支持 Enter 切换。'
    };
  }
  return {
    primaryInput: 'scroll',
    semanticAction: semanticScrollAction(input.pattern),
    pointerRole: 'secondary',
    touchAlternative: '触摸滚动保持同一状态顺序；取消只依赖悬停的内容。',
    keyboardAlternative: '提供跳转到关键状态的语义锚点，并保持自然文档阅读顺序。'
  };
}

function rendererFor(
  assets: readonly AssetSignal[],
  pattern: ExperiencePattern,
  brief: string,
  experienceForm?: StyleDiversityDecision['structureDirection']['experienceForm']
): ExperienceDecision['renderer'] {
  if (assets.some((asset) => asset.modality === 'model-3d')) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '真实模型、相机关系或结构变化需要三维空间，DOM 继续承担可读内容和行动。',
      threeJustification: 'Three.js 用于可检查的深度、材质和镜头状态，不用于装饰性背景。',
      fallback: '模型不可用时阻止伪造拆解，并保留产品说明、素材缺口和恢复路径。'
    };
  }
  if (assets.some((asset) => asset.modality === 'procedural' && asset.role === 'subject')
    && /(?:程序化\s*3d|主题专属\s*3d|three\.?js|threejs|三维对象|不同深度|空间队形)/i.test(brief)) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '多个主题对象需要在同一空间中保持可选择的深度、队形、反光与焦点关系；DOM 继续承担对象名称、上下文信息和最终行动。',
      threeJustification: 'Three.js 只构建 brief 明确要求的主题对象场和输入反馈，不把通用粒子或无关几何作为主视觉。',
      fallback: 'WebGL 不可用时保留完整环境、全部语义对象按钮、当前对象详情和最终行动。'
    };
  }
  if (experienceForm === 'branching-confluence') {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-only',
      enhancement: 'none',
      reason: '分支路径、参与对象、汇合关系与最终队形优先由语义 DOM 和内联 SVG 统一表达；Canvas 2D 只可作为可关闭的运动增强，不自动升级为 Shader。',
      threeJustification: '目标没有要求可检查三维几何、真实体积光或自由相机，SVG 已能保持路径身份、可重放差异和无障碍回退。',
      fallback: '关闭可选 Canvas 后仍保留完整 SVG 路径、对象选择、两条分支、汇合结果和最终行动。'
    };
  }
  if (experienceForm === 'object-field') {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-only',
      enhancement: 'none',
      reason: '非三维对象场优先由语义 DOM 与内联 SVG 建立可点击对象、共享坐标、局部反馈和收集状态；不因“程序化”一词自动引入 Shader。',
      threeJustification: '目标没有明确的真实深度、几何检查或自由相机职责；SVG/CSS 已是最小充分的空间对象表达。',
      fallback: 'SVG 不增强时仍保留全部语义对象按钮、当前对象反馈、收集进度和最终行动。'
    };
  }
  if (assets.some((asset) => asset.modality === 'image-sequence')) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-media-hybrid',
      enhancement: 'media',
      reason: '连续媒体已能承担环境或状态变化，不额外引入完整 Three.js 场景。',
      threeJustification: '没有必须由真实三维深度、相机或模型状态解决的职责。',
      fallback: '使用稳定关键帧和交叉淡化保留相同叙事顺序。'
    };
  }
  if (/(?:舞台|剧场|黑盒剧场|排练厅|stage|theatre|theater)/i.test(brief)
    && /(?:灯光|灯具|光束|照度|亮度|色片|灯位|cue|spotlight|lighting)/i.test(brief)) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '同一舞台上的灯位、体积光束、落点、阴影与多灯 cue 需要真实三维空间和光照关系；DOM 继续承担控制、读数与保存行动。',
      threeJustification: 'Three.js 只构建可辨认的舞台、灯具与光照结果，并把灯光参数映射到同一坐标系中的方向、锥角、颜色、亮度和阴影。',
      fallback: 'WebGL 不可用时保留舞台灯位图、全部灯具与 cue 参数、结果说明和保存行动。'
    };
  }
  if (/(?:投影仪|投影机|幕布|墙面画面|摆放助手|安装助手|projector|projection screen|placement assistant|installation assistant)/i.test(brief)
    && /(?:距离|安装高度|高度|偏角|角度|位置|摆放|distance|height|offset|angle|position|placement)/i.test(brief)) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '设备位置、投射锥体、目标平面、梯形和环境光需要共享真实三维坐标；DOM 继续承担控制、估算解释、推荐与保存行动。',
      threeJustification: 'Three.js 只构建可辨认的房间、设备、投射关系和目标画面，并把距离、高度、偏角与环境模式映射到同一坐标系中的几何和光照。',
      fallback: 'WebGL 不可用时保留同一空间关系的语义示意、全部参数、演示估算、推荐状态和保存行动。'
    };
  }
  if (/(?:街道|道路|树冠|树荫|地表|路面|剖面|绿地|street|road|canopy|ground|terrain|section)/i.test(brief)
    && /(?:覆盖范围|阴影|温度|浇水|蒸腾|热量|降温|日照|shade|temperature|watering|evapotranspiration|cooling|sunlight)/i.test(brief)) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '环境主体、树荫覆盖、日照和地表结果需要在同一空间坐标中形成可见因果关系；DOM 继续承担参数、估算说明和保存行动。',
      threeJustification: 'Three.js 只构建可辨认的环境剖面、主体尺度、阴影与状态变化，并让参数结果与同一场景坐标对应。',
      fallback: 'WebGL 不可用时保留同一环境的语义剖面、全部参数、估算结果和保存行动。'
    };
  }
  if (/(?:平面图|示意图|关系图|图表|可视化|floor\s*plan|diagram|chart)/i.test(brief)) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-canvas-hybrid',
      enhancement: 'canvas-shader',
      reason: '目标明确要求平面图或信息可视化，程序化画布负责空间高亮，DOM 保留选择、数值和行动。',
      threeJustification: '当前职责是可验证的信息图与区域状态，不需要自由相机或伪造三维模型。',
      fallback: '关闭 Canvas 后仍显示等价的区域按钮、数值、推荐状态和最终行动。'
    };
  }
  if (
    assets.some((asset) => asset.modality === 'procedural' && asset.role === 'subject')
    && /(?:陶瓷|陶艺|陶土|瓷器|釉色|釉料|灰釉|烧成|窑烧|ceramic|pottery|glaze|kiln)/i.test(brief)
  ) {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-three-hybrid',
      enhancement: 'three-webgl',
      reason: '同一陶瓷器物的曲面、日光响应、釉面光泽、裂纹和流釉边界需要真实三维几何与材质状态；DOM 继续承担配方、解释和行动。',
      threeJustification: 'Three.js 只构建一只可辨认的程序化器物，并把材料比例和烧成温度映射到其材质、光泽、裂纹与流动边界。',
      fallback: 'WebGL 不可用时显示同一器物的稳定静态表示，并保留全部配方控制、结果解释和保存行动。'
    };
  }
  if (assets.some((asset) => ['transparent-image', 'texture', 'procedural'].includes(asset.modality)) || pattern === 'material-transformation') {
    return {
      baseLayer: 'semantic-dom',
      route: 'dom-canvas-hybrid',
      enhancement: 'canvas-shader',
      reason: '局部材质融合、遮罩或程序化氛围可由 Canvas/Shader 完成，页面结构保留在 DOM。',
      threeJustification: '当前职责不要求可检查的三维几何或自由相机。',
      fallback: '关闭 Canvas 后显示同一主体静态构图和完整内容行动。'
    };
  }
  return {
    baseLayer: 'semantic-dom',
    route: 'dom-only',
    enhancement: 'none',
    reason: '当前目标可以由语义内容、编辑式排版和离散状态完成。',
    threeJustification: '没有证据表明 WebGL 能增加必要理解。',
    fallback: 'DOM 本身就是完整可用路径。'
  };
}

function rejectedFor(
  role: VisualRole,
  hasModel: boolean,
  pointerRole: ExperienceDecision['interaction']['pointerRole']
): ExperienceDecision['rejectedMechanisms'] {
  const rejected: ExperienceDecision['rejectedMechanisms'] = [];
  if (!hasModel) rejected.push({ id: 'cinematic-3d-deconstruction', reason: '缺少真实可检查模型，不能伪造三维拆解。' });
  if (pointerRole !== 'primary') rejected.push({ id: 'pointer-reveal', reason: '目标没有要求通过指针发现信息，鼠标仅保留轻量反馈。' });
  if (role !== 'information') rejected.push({ id: 'sticky-archive-stack', reason: '当前核心不是一组并列档案，不使用长堆叠拖慢叙事。' });
  return rejected.slice(0, 3);
}

function semanticScrollAction(pattern: ExperiencePattern): string {
  const actions: Record<ExperiencePattern, string> = {
    'continuous-scroll': '滚动推进一次连续的建立、变化和收束。',
    'environmental-memory': '滚动让同一环境从朦胧恢复到可停留的记忆。',
    'product-atmosphere': '滚动从使用情绪进入产品能力，再回到稳定英雄状态。',
    'material-transformation': '滚动让同一主体的材质和形态连续形成。',
    'spatial-exploration': '滚动建立入口、证据区域和终点之间的空间关系。',
    'editorial-field': '滚动调整主体、证据和文字的编辑式焦点。'
  };
  return actions[pattern];
}

function visualRoleLabel(role: VisualRole): string {
  return ({
    environment: '环境',
    subject: '独立主体',
    information: '信息证据',
    'spatial-object': '真实空间对象',
    'procedural-field': '程序化状态场'
  } satisfies Record<VisualRole, string>)[role];
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}
