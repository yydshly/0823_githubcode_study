import './styles-cases.css';
import { casePresentation } from './case-presentations';

interface CaseEntry {
  id: string; title: string; brief: string; model: string;
  stage: 'baseline' | 'exploration' | 'refined' | 'featured';
  parentId?: string; note?: string; tags: string[]; generatedAt: string; previewUrl: string;
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
  }
];

const grid = required<HTMLElement>('#case-grid');
const count = required<HTMLElement>('#case-count');

void loadCases();

async function loadCases(): Promise<void> {
  try {
    const response = await fetch('/api/creative/cases', { headers: { Accept: 'application/json' } });
    const body = await response.json() as { cases?: CaseEntry[]; error?: string };
    if (!response.ok || !body.cases) throw new Error(body.error || `案例接口返回 ${response.status}`);
    const modelCases = body.cases.filter((item) => item.stage === 'featured' || item.stage === 'refined');
    const featured = modelCases.filter((item) => item.stage === 'featured').length;
    const refined = modelCases.filter((item) => item.stage === 'refined').length;
    count.textContent = `2 个能力基准 + ${featured} 个精选案例 + ${refined} 个备用精修案例`;
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
  article.className = `case-card case-card--${item.stage}${isModelFinal ? ' case-card--model-final' : ''}`;
  article.dataset.caseId = item.id;
  const presentation = isModelFinal ? casePresentation(item.id) : null;
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
  stage.textContent = isCapability ? '能力基准' : item.stage === 'featured' ? '精选最终案例' : '备用精修案例';
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
