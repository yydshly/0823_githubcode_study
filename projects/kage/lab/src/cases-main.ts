import './styles-cases.css';
import { casePresentation, type CasePresentation } from './case-presentations';
import {
  V2_EXPERIENCE_ARCHIVE,
  type ExperienceArchiveEntry
} from './v2/experience-archive.ts';

interface CaseEntry {
  id: string; title: string; brief: string; model: string;
  stage: 'baseline' | 'exploration' | 'refined' | 'featured';
  parentId?: string; note?: string; tags: string[]; generatedAt: string; previewUrl: string;
  presentation?: CasePresentation;
}

const capabilityCases: CaseEntry[] = [
  {
    id: 'capability-resonance-flagship',
    title: '资产驱动产品电影',
    brief: '真实主视觉、深度图、滚动镜头与克制辉光，验证素材进入 Three.js 后的电影化导演能力。',
    model: '项目能力基准',
    stage: 'baseline',
    note: '用于说明资产、景深和滚动导演的基础能力；它不是本次自然语言生成结果。',
    tags: ['asset-driven', 'depth', 'scroll-director'],
    generatedAt: '2026-08-25T00:00:00.000Z',
    previewUrl: '/?experience=resonance-flagship&quality=high&motion=full'
  },
  {
    id: 'capability-tidal-archive',
    title: '潮汐记忆叙事空间',
    brief: '生成环境、档案关系、空间路径与水体微光，验证 Three.js 承载叙事空间和探索节奏的能力。',
    model: '项目能力基准',
    stage: 'baseline',
    note: '用于说明环境生成、信息关系和空间叙事能力；它不是本次自然语言生成结果。',
    tags: ['environment', 'narrative', 'spatial'],
    generatedAt: '2026-08-25T00:00:00.000Z',
    previewUrl: '/?experience=tidal-archive&quality=high&motion=full'
  },
  {
    id: 'capability-coastline-evidence',
    title: '潮线证词 · 1984—2026 海岸证据',
    brief: '同一时间参数同步改变海岸形态、年份、消失面积、岸线后退和水位证据，支持播放、拖动、触摸、键盘与无 WebGL 回退。',
    model: 'V2 E4 运行证据',
    stage: 'baseline',
    note: '这是已验证的“交互改变理解”能力原型，不是模型生成成品；它为后续档案、数据比较与时间证据类网页提供可复用机制。',
    tags: ['semantic-interaction', 'coastline', 'timeline-evidence'],
    generatedAt: '2026-08-27T00:00:00.000Z',
    previewUrl: '/pages/v2/prototypes/semantic-interaction/?demo=1',
    presentation: {
      assetUrl: '/creative-assets/capability-coastline-evidence.jpg',
      kind: 'environment',
      fit: 'cover',
      position: '50% 50%',
      opacity: .86,
      tone: 'linear-gradient(135deg, #16211d 0%, #23382f 52%, #080e0c 100%)'
    }
  }
];

const grid = required<HTMLElement>('#case-grid');
const count = required<HTMLElement>('#case-count');
const experienceGrid = required<HTMLElement>('#experience-archive-grid');
const experienceCount = required<HTMLElement>('#experience-archive-count');

renderExperienceArchive();
void loadCases();

function renderExperienceArchive(): void {
  experienceCount.textContent = `${V2_EXPERIENCE_ARCHIVE.length} 个已验证研究档案`;
  experienceGrid.replaceChildren(...V2_EXPERIENCE_ARCHIVE.map(experienceArchiveCard));
}

function experienceArchiveCard(item: ExperienceArchiveEntry, index: number): HTMLElement {
  const article = document.createElement('article');
  article.className = 'experience-card';
  article.dataset.archiveId = item.id;
  article.style.setProperty('--experience-preview', `url("${item.previewUrl}")`);

  const visual = document.createElement('a');
  visual.className = 'experience-card__visual';
  visual.href = item.route;
  visual.target = '_blank';
  visual.setAttribute('aria-label', `打开研究档案：${item.title}`);
  const indexElement = document.createElement('span');
  indexElement.textContent = String(index + 1).padStart(2, '0');
  const status = document.createElement('span');
  status.textContent = '研究参考';
  visual.append(indexElement, status);

  const body = document.createElement('div');
  body.className = 'experience-card__body';
  const capability = document.createElement('p');
  capability.className = 'experience-card__capability';
  capability.textContent = item.leadCapability;
  const title = document.createElement('h3');
  title.textContent = item.title;
  const summary = document.createElement('p');
  summary.textContent = item.summary;
  const tags = document.createElement('div');
  tags.className = 'experience-card__tags';
  tags.append(...item.supportingCapabilities.map((value) => {
    const tag = document.createElement('span');
    tag.textContent = value;
    return tag;
  }));
  const lesson = document.createElement('p');
  lesson.className = 'experience-card__lesson';
  lesson.textContent = item.reusableLesson;
  const open = document.createElement('a');
  open.href = item.route;
  open.target = '_blank';
  open.textContent = '回看完整体验 ↗';
  body.append(capability, title, summary, tags, lesson, open);
  article.append(visual, body);
  return article;
}

async function loadCases(): Promise<void> {
  try {
    const response = await fetch('/api/creative/cases', { headers: { Accept: 'application/json' } });
    const body = await response.json() as { cases?: CaseEntry[]; error?: string };
    if (!response.ok || !body.cases) throw new Error(body.error || `案例接口返回 ${response.status}`);
    const modelCases = body.cases.filter((item) => item.stage === 'featured' || item.stage === 'refined');
    const featured = modelCases.filter((item) => item.stage === 'featured').length;
    const refined = modelCases.filter((item) => item.stage === 'refined').length;
    count.textContent = `${capabilityCases.length} 个能力基准 + ${featured} 个精选案例 + ${refined} 个研究案例`;
    grid.replaceChildren(...[...modelCases, ...capabilityCases].map(caseCard));
  } catch (error) {
    count.textContent = '案例读取失败';
    grid.textContent = error instanceof Error ? error.message : String(error);
  }
}

function caseCard(item: CaseEntry, index: number): HTMLElement {
  const article = document.createElement('article');
  const isCapability = item.id.startsWith('capability-');
  const isModelFinal = !isCapability && (item.stage === 'featured' || item.stage === 'refined');
  const presentation = isModelFinal ? casePresentation(item) : item.presentation ?? null;
  article.className = `case-card case-card--${item.stage}${isModelFinal ? ' case-card--model-final' : ''}${presentation ? ' case-card--visual' : ''}`;
  article.dataset.caseId = item.id;
  if (presentation) {
    article.dataset.previewKind = presentation.kind;
    article.style.setProperty('--case-preview', `url("${presentation.assetUrl}")`);
    article.style.setProperty('--case-preview-fit', presentation.fit);
    article.style.setProperty('--case-preview-position', presentation.position);
    article.style.setProperty('--case-preview-opacity', String(presentation.opacity));
    article.style.setProperty('--case-tone', presentation.tone);
  }
  const head = document.createElement('div');
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  const stage = document.createElement('span');
  stage.textContent = isCapability ? '能力基准' : item.stage === 'featured' ? '精选最终案例' : '研究案例';
  head.append(number, stage);
  const title = document.createElement('h2'); title.textContent = item.title;
  const brief = document.createElement('p'); brief.textContent = item.brief;
  const meta = document.createElement('div');
  meta.className = 'case-meta';
  meta.append(
    metaItem(isCapability ? 'TYPE' : 'MODEL', item.model),
    metaItem(isCapability ? 'ROLE' : 'METHOD', isCapability ? '技术边界验证' : item.tags.slice(0, 3).join(' · '))
  );
  if (item.parentId) meta.append(metaItem('PARENT', item.parentId.replace('dedicated-', '')));
  const note = document.createElement('p'); note.className = 'case-note'; note.textContent = item.note || '独立生成 bundle，可直接运行和对照。';
  const refinement = isModelFinal ? refinementList(item) : null;
  const actions = document.createElement('div'); actions.className = 'case-actions';
  const open = document.createElement('a');
  open.href = item.previewUrl;
  open.textContent = isModelFinal ? '打开稳定归档 ↗' : '打开能力基准 ↗';
  open.target = '_blank';
  actions.append(open);
  if (!isCapability) {
    const source = document.createElement('a');
    source.href = `/generated-runs/${item.id}/?quality=high&motion=full`;
    source.textContent = '生成记录';
    source.target = '_blank';
    actions.append(source);
  }
  article.append(head, title, brief, meta, note);
  if (refinement) article.append(refinement);
  article.append(actions);
  return article;
}

function refinementList(entry: CaseEntry): HTMLElement {
  const section = document.createElement('section');
  section.className = 'case-refinement';
  const title = document.createElement('h3');
  title.textContent = '从生成素材到最终场景';
  const list = document.createElement('ol');
  const stepsByCase: Record<string, string[][]> = {
    'dedicated-ba4e9d10caaa-depth-field': [
      ['01', '生成材质主体', '从先锋时装目标生成透明流体服装主体，先建立可用的视觉焦点。'],
      ['02', '消除图片边界', '以透明分层、柔和遮罩和全屏环境场，让产品与背景成为同一空间。'],
      ['03', '建立 2.5D 景深', '从主体亮度与纤维相位生成粒子深度，滚动和指针共同驱动释放与回收。'],
      ['04', '只保留最终版', '经过多轮边界、构图与移动端精修后，案例库只保留当前最优结果。']
    ],
    'dedicated-r36-delivery-final': [
      ['01', '生成三段生长资产', '围绕种子、萌发与成熟温室生成连续素材，保持同一材质语言。'],
      ['02', '建立材质连续性', '以菌丝、薄膜与暖光连接三个状态，避免三张图片各自为政。'],
      ['03', 'Three.js 串联转化', '滚动控制镜头、环境粒子和主体转化，使叙事从一枚种子自然长成空间。'],
      ['04', '双重视觉验收', '通过机械检查与独立视觉验收后归档，标题“夜生表皮”与主叙事指向同一案例。']
    ],
    'dedicated-896cfb7e6657': [
      ['01', '锁定连续空间', '将云海、观测站与穹顶定义为同一地点的三个视距，而非三个模板章节。'],
      ['02', '构建空间路径', '滚动从远景接近建筑、进入穹顶，再让星图数据在空间中展开。'],
      ['03', '融合 WebGL 光场', '程序化云层、微尘和空间光只承担氛围与深度，不遮挡主体资产。'],
      ['04', '修正运行问题', '保留已验证的稳定归档，并把未达精选门槛的版本标为备用精修案例。']
    ],
    'dedicated-1edb98865f4c': [
      ['01', '明确产品表达', '先确定声学产品的材质、尺度、受众与发布节奏，避免抽象几何代替产品。'],
      ['02', '生成专属主体', '生成冷银半透明声学设备素材，并为网页合成保留干净轮廓和层次。'],
      ['03', 'Codex 构建体验', '模型生成独立页面结构、Three.js 声场、滚动导演与响应式行为。'],
      ['04', '按证据精修', '通过多状态截图找出遮挡和取景问题，让真实素材成为唯一产品焦点。']
    ],
    'dedicated-1b9f0b05107b': [
      ['01', '锁定真实产品', '生成带透明轮廓的同一台雨声记录器，保留陶瓷底座、凝露声学膜、旋钮和记录灯。'],
      ['02', '生成完整环境', '补充全屏清晨雨窗与桌面空间，让产品拥有可信尺度、落点和自然光。'],
      ['03', 'Three.js 组织声场', '滚动驱动产品左右换位、雨滴、膜片共振、同心声波与内部暖光，而不是切换海报。'],
      ['04', '按浏览器证据收尾', '修复 Canvas 遮挡、方形辉光、末段文案碰撞和手机取景后，只归档当前最终版本。']
    ],
    'dedicated-8574ee46ab16': [
      ['01', '锁定同一房间', '生成刚醒来的真实房间与台灯状态，为梦境叙事建立可识别的现实锚点。'],
      ['02', '设计醒来状态', '从模糊房间起步，让光线与清晰度随滚动逐步恢复。'],
      ['03', '形成记忆空间', '记忆碎片通过景深、漂移和空间层次逐渐变成可探索场景。'],
      ['04', '收束真实行动', '最后回到“记录今晚的梦”，让体验完成从情绪到产品行为的闭环。']
    ],
    'dedicated-7c944e0c386f': [
      ['01', '锁定同一页文献', '以同一张旧纸页的破损态和修复态建立连续证据，避免多张无关素材拼接。'],
      ['02', '淘汰错误候选', 'MiniMax 候选因主体连续性不足被拒绝，改用经过确认的 ChatGPT 连续素材。'],
      ['03', '组织修复过程', '滚动串联理纤、补纸和墨迹复读，Three.js 只承担纤维与裂缝反馈。'],
      ['04', '按浏览器证据归档', '消除图片框、突兀几何体和移动端溢出后，只保留当前精选最终版。']
    ],
    'dedicated-ef118f0f4962': [
      ['01', '锁定标本室语境', '真实环境素材建立自然历史博物馆与香水实验室的共同空间，不用抽象粒子冒充气味。'],
      ['02', '建立三层气味证据', '雨后泥土、旧书纸张和晒过棉布各自拥有可辨认材质，同时保持同一记忆瓶为视觉锚点。'],
      ['03', '让输入改变含义', '指针或触摸直接改变混合比例、画面权重和记忆文字，而不是只做无意义视差。'],
      ['04', '收束为保存动作', '三层重新汇成可保存标本，并在桌面、触摸与移动端证据通过后归档。']
    ],
    'dedicated-191bc3ce2125': [
      ['01', '拒绝错误素材', '移除与目标无关的温室候选，生成并锁定同一张夜间窗边风谱仪专属环境。'],
      ['02', '恢复原任务检查点', '保留已经完成的创意合同与导演决策，从素材门之后继续 Codex 构建，避免重复理解目标。'],
      ['03', '让素材与响应分工', '真实图像承担房间尺度和材质语境，Three.js 仪器、纤维弯曲与读数承担风的可见证据。'],
      ['04', '按四屏证据收尾', '修复画布占据文档流的问题，验证桌面开场、中段、CTA 与移动端后，只归档这一版。']
    ],
    'dedicated-c0514ddead80': [
      ['01', '拒绝伪地图', '首版只有随机街区块、线条和点位，虽能运行却无法建立公共服务主题需要的地点可信度。'],
      ['02', '接入真实地域', '使用带署名的徐汇滨江真实地理底图，并把西岸美术馆、油罐艺术中心、龙美术馆与星美术馆作为地域锚点。'],
      ['03', '统一空间证据', '真实经纬度、站点、路线和右侧证据共享同一投影；水质、距离与开放状态明确标记为演示数据。'],
      ['04', '沉淀生成边界', '地点决策优先使用真实地理，地域叙事允许创意重构，地域氛围拒绝强套地图；同一目标只保留本版。']
    ],
    'dedicated-76102bb2158c': [
      ['01', '修正方向路由', '识别“不要地图”为否定约束，并把城市档案从空间地图改为白天编辑档案与年代状态选择。'],
      ['02', '生成连续素材', '为同一座虚构社区影院生成同一机位的跨年代连续街景，不用互不相关的年代图片拼接。'],
      ['03', '恢复原任务构建', '素材写入项目目录后恢复同一个任务，Codex 使用 DOM、Canvas 与 Three.js 构建年代比对和保存行动。'],
      ['04', '真实浏览器验收', '验证桌面首屏、1986 年代切换、结尾保存、手机布局和真实性披露后，只归档当前版本。']
    ],
    'dedicated-5694e0a3a022': [
      ['01', '先锁定新风格象限', '在调用 Codex 前把目标固定为分屏过程、日光中性、状态选择和程序化装配，拒绝暗色电影海报。'],
      ['02', '一次构建专属页面', '不等待外部图片素材，由 gpt-5.6-sol 生成明亮说明书布局、程序化风扇和故障诊断状态。'],
      ['03', '暴露并修复真实缺陷', '浏览器截图发现不透明根背景遮住 SDK Canvas；随后修正层级、主体尺度和移动端取景。'],
      ['04', '按语义交互归档', '验证三种故障会同步改变部件、步骤、安全与难度，拆解阶段和预约反馈通过后只归档本版。']
    ],
    'dedicated-woodblock-adaptive-r46': [
      ['01', '从产品工序定结构', '把套印拆成和纸就位、压痕、靛蓝、朱红和完成五个语义状态，而不是固定成三张页面。'],
      ['02', '锁定同一张和纸', '高质量纸张素材、纤维轮廓和画面坐标全程保持一致，只逐步显露工序变化。'],
      ['03', '连续驱动材质形成', '同一画布把滚动映射到压痕、吸墨、套准和成品状态，DOM 只承担解释与预约行动。'],
      ['04', '按实际状态验收', '验证五个桌面关键状态和移动端结果后，将可公开精修版作为研究案例归档。']
    ]
  };
  const steps = stepsByCase[entry.id] ?? [
    ['01', '解析目标', '从自然语言识别对象、受众、情绪和希望发生的变化。'],
    ['02', '生成素材', '按最终构图需要生成主体或环境素材。'],
    ['03', '构建场景', '由 Three.js、DOM 与滚动导演组成可运行体验。'],
    ['04', '视觉验收', '根据真实浏览器证据精修并归档最优结果。']
  ];
  steps.forEach(([number, label, description]) => {
    const item = document.createElement('li');
    const numberElement = document.createElement('span'); numberElement.textContent = number;
    const labelElement = document.createElement('strong'); labelElement.textContent = label;
    const descriptionElement = document.createElement('p'); descriptionElement.textContent = description;
    item.append(numberElement, labelElement, descriptionElement);
    list.append(item);
  });
  section.append(title, list);
  return section;
}

function metaItem(label: string, value: string): HTMLElement {
  const span = document.createElement('span');
  const small = document.createElement('small'); small.textContent = label;
  const strong = document.createElement('strong'); strong.textContent = value;
  span.append(small, strong); return span;
}


function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`缺少案例页面元素：${selector}`);
  return element;
}
