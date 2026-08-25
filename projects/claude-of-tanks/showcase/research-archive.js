import {
  RESEARCH_PLATFORM_VERSION,
  auditRegistry,
  demos,
  layers,
  performanceBudgets,
  risks,
  subjectProfiles,
} from '/@cot-research/research-platform-registry.js';
import '/@cot-research/research-archive.css';

const ARCHIVE_VERSION = 2;
const ARCHIVE_DATE = '2026-08-26';
const root = document.getElementById('research-archive');
const startedAt = performance.now();
const audit = auditRegistry();
const demoIndex = new Map(demos.map((demo) => [demo.id, demo]));

const viewingOrder = [
  {
    step: '00',
    id: 'research-control',
    label: '研究控制面',
    status: 'stable',
    route: '/research',
    summary: '先看四层架构、正式演示、性能预算和风险，建立研究边界。',
    proof: ['场景与展台明确分层', '正式入口和 blocked 历史实验分开', '14 项预算与 5 类风险集中可见'],
    cost: '轻量 DOM · 不加载 Three.js',
  },
  {
    step: '01',
    id: 'programmatic-product-workbench',
    label: '产品工作台',
    status: 'stable',
    route: demoIndex.get('programmatic-product-workbench').route,
    summary: '最快理解可复用性：同一 world:none 舞台切换 Atlas 与 Nova。',
    proof: ['SubjectAdapter v1', '两类程序化主体', '热点、镜头、材质、分解和跨主体导演'],
    cost: 'ready 138ms · Atlas 116 calls · Nova 51 calls',
    recommended: true,
  },
  {
    step: '02',
    id: 'visual-layer-research',
    label: '七层视觉实验',
    status: 'research',
    route: demoIndex.get('visual-layer-research').route,
    summary: '逐层理解几何、材质、光影、环境、后期、镜头和特效如何形成最终画面。',
    proof: ['同镜头 A/B', '七层贡献拆解', '桌面与移动控制'],
    cost: '冷启动 55.0s · 超出 30s 研究预算',
  },
  {
    step: '03',
    id: 'desert-capability-scene',
    label: '沙漠综合能力场景',
    status: 'stable',
    route: demoIndex.get('desert-capability-scene').route,
    summary: '最后看完整世界：多载具、地形、植被、建筑、17 类效果和导演时间线共同运行。',
    proof: ['4 辆载具与 25 个实例', '17 类 Studio 效果', '6 镜头与 3 条车辆轨道'],
    cost: 'ready 22.9s · 综合场景偏重',
  },
];

const sectionIndex = [
  ['viewing-order', '页面'],
  ['capability-map', '能力'],
  ['meaning', '意义'],
  ['evidence-register', '证据'],
  ['archive-boundary', '边界'],
  ['research-directions', '方向'],
];
const capabilityRows = [
  ['渲染栈', 'proven', 'Three.js、WebGLRenderer、PBR、ACES、阴影、雾、天空、后处理与动态质量策略。'],
  ['实体与资产', 'proven', '122 个第一方程序化可玩模型；研究新增 Atlas 与 Nova 两个 L2 程序化产品主体。'],
  ['场景系统', 'partial', '20 张游戏地图与独立 world:none 中性舞台已证明；通用室内展厅未实现。'],
  ['运动系统', 'proven', '固定步长模拟、载具运动、局部动画、相机轨道、导演时间线和程序化变化。'],
  ['交互系统', 'proven', '键鼠、触控、Orbit、热点、材质切换、分解、图层 A/B、Studio 与 Gallery。'],
  ['视觉质量', 'proven', '模型比例、材质角色、灯光层次、接地阴影、环境密度、镜头构图和效果节奏。'],
  ['发布与验证', 'partial', '截图、WebM、Puppeteer、性能与设备门禁已存在；研究入口尚未独立生产部署。'],
];

const insights = [
  ['WHY IT LOOKS GOOD', '不是 Three.js 自动变漂亮', '效果来自程序化几何比例、材质参数、灯光层次、环境密度、镜头构图和动态节奏的共同设计。'],
  ['WHAT REUSES', '高价值是组合方法', 'Renderer、world:none 舞台、SubjectAdapter、热点、镜头、材质、分解、导演和性能验证已经形成复用证据。'],
  ['WHAT DOES NOT', '不是万能 3D 生成器', '程序化 L2 主体不能替代商业资产；任意 GLB、数字孪生、完整展厅和生产部署仍只是扩展研究方向。'],
];

const evidenceItems = [
  ['研究平台注册表', 'pass', 'v3：4 层、5 类主体、4 类展示、4 个演示、14 项预算、5 类风险。', 'evidence/research-platform/audit.json'],
  ['产品工作台', 'pass', '双主体验收 30 项通过，8 项工作台预算通过，0 控制台错误。', 'evidence/product-workbench/browser-report.json'],
  ['七层视觉实验', 'pass', '20/20 浏览器检查通过；冷启动 55.038s 仍明确标记超预算。', 'evidence/visual-layer-lab-final/report.json'],
  ['沙漠综合场景', 'pass', '4 辆载具、25 个实例、17 类效果与时间线通过真实浏览器验收。', 'evidence/capability-showcase/report.json'],
  ['历史工业展厅', 'blocked', '结构测试可通过，但截图证明沙漠 world 和 Studio 相机仍主导，因此不作为正式入口。', 'evidence/industrial-showroom-final/report.json'],
  ['移动完整战斗', 'over', '功能路线完成，但加载约 73.9s 且存在布局超预算，不能混用轻量工作台结论。', 'evidence/mobile-native-scorecard.json'],
];

const extensions = [
  ['外部 GLB/glTF', '验证真实模型的单位、轴向、材质、动画、许可和释放。', '出现真实产品资产时恢复'],
  ['虚拟展厅', '研究室内场景、空间叙事和多对象陈列，而不是继续复用沙漠。', '出现明确展厅需求时恢复'],
  ['数字孪生', '增加实时数据映射、状态同步、告警和业务语义。', '出现数据源和设备模型时恢复'],
  ['可视化编辑器', '把主体、镜头、热点和时间线从代码声明升级为编辑工作流。', '配置规模超过手写维护能力时恢复'],
  ['自动宣传演示', '基于导演状态生成镜头、字幕、录制和发布包。', '出现明确视频交付需求时恢复'],
  ['生产化与设备门禁', '独立 build/preview、包体预算、更多真实设备和 GPU 观测。', '准备对外交付时恢复'],
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function statusBadge(status) {
  return element('span', 'status ' + status, status);
}

function actionLink(label, href, primary, dataId) {
  const link = element('a', 'archive-action' + (primary ? ' primary' : ''), label);
  link.href = href;
  if (dataId) link.dataset.archiveRoute = dataId;
  return link;
}

function sectionHeader(label, title, note) {
  const head = element('div', 'section-head');
  const titleGroup = element('div');
  titleGroup.append(element('span', 'section-label', label), element('h2', '', title));
  head.append(titleGroup, element('p', '', note));
  return head;
}

function buildHeader(shell) {
  const header = element('header', 'archive-topbar');
  header.append(element('div', 'archive-brand', 'COT / PHASE 01 ARCHIVE'));
  const nav = element('nav', 'archive-nav');
  nav.setAttribute('aria-label', '归档页面入口');
  nav.append(
    actionLink('研究平台', '/research', false, 'research'),
    actionLink('产品工作台', '/workbench', false, 'workbench'),
    actionLink('工程文档', '/docs', false, 'docs'),
  );
  header.append(nav);
  shell.append(header);
}

function buildHero(shell) {
  const hero = element('section', 'archive-hero');
  hero.setAttribute('aria-labelledby', 'archive-title');
  const copy = element('div');
  copy.append(element('span', 'archive-stamp', 'PHASE 01 · ARCHIVED · ' + ARCHIVE_DATE));
  const title = element('h1', '', 'Three.js 能力探索 · 阶段归档');
  title.id = 'archive-title';
  copy.append(
    title,
    element('p', '', '本阶段已经回答“它能实现什么效果、为什么看起来不错、哪些能力可以复用、边界在哪里”。现在暂停扩张功能，保留可运行页面、证据和未来恢复条件。'),
  );
  const actions = element('div', 'hero-actions');
  actions.append(
    actionLink('按推荐顺序查看', '#viewing-order', true),
    actionLink('返回研究控制面', '/research', false, 'research-hero'),
  );
  copy.append(actions);

  const facts = element('div', 'archive-facts');
  const factData = [
    [String(layers.length), '架构能力层'],
    [String(demos.filter((demo) => demo.status !== 'blocked').length), '正式 3D 演示路线'],
    ['30', '产品工作台浏览器检查'],
    ['0', '研究工作台外部模型'],
  ];
  for (const [value, label] of factData) {
    const fact = element('div', 'archive-fact');
    fact.append(element('strong', '', value), element('span', '', label));
    facts.append(fact);
  }
  hero.append(copy, facts);
  shell.append(hero);
}

function buildSectionNav(shell) {
  const nav = element('nav', 'archive-section-nav');
  nav.setAttribute('aria-label', '本页章节');
  const intro = element('span', 'archive-section-nav-label', '本页');
  const links = element('div', 'archive-section-nav-links');
  for (const [id, label] of sectionIndex) {
    const link = element('a', '', label);
    link.href = '#' + id;
    link.dataset.archiveSectionLink = id;
    links.append(link);
  }
  nav.append(intro, links);
  shell.append(nav);
}

function buildViewingOrder(shell) {
  const section = element('section', 'archive-section');
  section.id = 'viewing-order';
  section.append(sectionHeader('Recommended viewing order', '现有页面怎么理解', '四个页面承担不同研究责任。先看轻量控制面和复用证明，再看视觉分层，最后进入完整综合世界。'));
  const grid = element('div', 'route-grid');
  for (const item of viewingOrder) {
    const card = element('article', 'route-card' + (item.recommended ? ' recommended' : ''));
    card.dataset.archiveDemo = item.id;
    const meta = element('div', 'route-meta');
    meta.append(element('span', 'route-step', item.step), statusBadge(item.status));
    card.append(meta, element('h3', '', item.label), element('p', '', item.summary));
    const proof = element('ul', 'route-proof');
    for (const entry of item.proof) proof.append(element('li', '', entry));
    card.append(proof);
    const footer = element('div', 'route-footer');
    footer.append(element('span', 'route-cost', item.cost), actionLink('打开页面', item.route, false, item.id));
    card.append(footer);
    grid.append(card);
  }
  section.append(grid);
  shell.append(section);
}

function buildCapabilities(shell) {
  const section = element('section', 'archive-section');
  section.id = 'capability-map';
  section.append(sectionHeader('Capability map', '这一阶段已经研究了什么', '结论来自源码、真实页面和浏览器证据；不是按效果名称罗列装饰。'));
  const panel = element('div', 'archive-panel');
  const table = element('table', 'capability-table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const label of ['能力组', '阶段状态', '已经证明的内容']) headRow.append(element('th', '', label));
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const [name, status, description] of capabilityRows) {
    const row = document.createElement('tr');
    row.append(element('td', '', name));
    const statusCell = document.createElement('td');
    statusCell.append(statusBadge(status));
    row.append(statusCell, element('td', '', description));
    body.append(row);
  }
  table.append(head, body);
  panel.append(table);
  section.append(panel);
  shell.append(section);
}

function buildCardGrid(shell, sectionId, label, title, note, gridClass, data, type) {
  const section = element('section', 'archive-section');
  section.id = sectionId;
  section.append(sectionHeader(label, title, note));
  const grid = element('div', gridClass);
  for (const item of data) {
    const card = element('article', type + '-card');
    if (type === 'insight') {
      card.append(element('span', 'card-kicker', item[0]), element('h3', '', item[1]), element('p', '', item[2]));
    } else if (type === 'evidence') {
      card.append(statusBadge(item[1]), element('h3', '', item[0]), element('p', '', item[2]), element('span', 'evidence-path', item[3]));
    } else {
      card.append(statusBadge('direction'), element('h3', '', item[0]), element('p', '', item[1]), element('span', 'evidence-path', '恢复条件：' + item[2]));
    }
    grid.append(card);
  }
  section.append(grid);
  shell.append(section);
}

function buildBoundary(shell) {
  const section = element('section', 'archive-section');
  section.id = 'archive-boundary';
  section.append(sectionHeader('Archive boundary', '为什么现在暂时归档', '能力发现阶段已经足够；继续堆模型和特效不会显著提高当前研究结论。'));
  const grid = element('div', 'boundary-grid');
  const columns = [
    ['FROZEN NOW', '本阶段停止扩张', ['不再增加无目标的程序化模型', '不再把更多效果塞进同一个大场景', '不把研究 Vite 路由包装成生产部署', '不宣称任意 GLB、数字孪生或商业资产已经完成']],
    ['PRESERVED', '保留可恢复研究链', ['研究首页和三条正式演示路线', 'v1–v3 分析文档与失败实验说明', '浏览器报告、性能预算和最终截图', 'SubjectAdapter、Product Stage v2 与程序化主体源码']],
  ];
  for (const [label, title, entries] of columns) {
    const panel = element('article', 'archive-panel');
    panel.append(element('span', 'section-label', label), element('h2', '', title));
    const list = element('ul', 'boundary-list');
    for (const text of entries) list.append(element('li', '', text));
    panel.append(list);
    grid.append(panel);
  }
  section.append(grid);
  shell.append(section);
}

function buildFooter(shell) {
  const footer = element('footer', 'archive-footer');
  footer.append(
    element('strong', '', 'Phase 01 暂时归档 · ' + ARCHIVE_DATE),
    document.createElement('br'),
    document.createTextNode('Registry v' + RESEARCH_PLATFORM_VERSION + ' · 审计 ' + (audit.pass ? 'PASS' : 'FAIL') + ' · 本页为轻量 DOM 归档控制面，不加载 Three.js。阶段包：archive/threejs-capability-research-phase-01-2026-08-26/'),
  );
  shell.append(footer);
}

let teardownSectionNavigation = () => {};

function initSectionNavigation() {
  const links = [...document.querySelectorAll('[data-archive-section-link]')];
  const sections = sectionIndex
    .map(([id]) => document.getElementById(id))
    .filter(Boolean);
  const clickHandlers = new Map();
  let activeId = '';
  let frame = 0;

  function setActive(id) {
    if (!id || id === activeId) return;
    activeId = id;
    root.dataset.activeSection = id;
    for (const link of links) {
      const isActive = link.dataset.archiveSectionLink === id;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function updateFromScroll() {
    frame = 0;
    const marker = Math.min(window.innerHeight * 0.28, 180);
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= marker) current = section;
      else break;
    }
    const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (atPageEnd) current = sections.at(-1);
    setActive(current?.id);
  }

  function queueUpdate() {
    if (!frame) frame = requestAnimationFrame(updateFromScroll);
  }

  function syncHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = sections.find((section) => section.id === id);
    if (!target) return queueUpdate();
    setActive(target.id);
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  for (const link of links) {
    const handler = () => setActive(link.dataset.archiveSectionLink);
    clickHandlers.set(link, handler);
    link.addEventListener('click', handler);
  }
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate);
  window.addEventListener('hashchange', syncHash);
  if (location.hash) syncHash();
  else updateFromScroll();

  return () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('scroll', queueUpdate);
    window.removeEventListener('resize', queueUpdate);
    window.removeEventListener('hashchange', syncHash);
    for (const [link, handler] of clickHandlers) link.removeEventListener('click', handler);
  };
}

function render() {
  const shell = element('div', 'archive-shell');
  buildHeader(shell);
  buildHero(shell);
  buildSectionNav(shell);
  buildViewingOrder(shell);
  buildCapabilities(shell);
  buildCardGrid(shell, 'meaning', 'Meaning', '这个项目对我们有什么意义', '阶段结论聚焦技术探索：展示能力、解释效果来源、判断复用价值，并保留扩展研究地图。', 'insight-grid', insights, 'insight');
  buildCardGrid(shell, 'evidence-register', 'Evidence register', '证据与仍然存在的风险', '通过与超预算可以同时存在。轻量工作台的成功不能覆盖完整游戏和历史失败实验。', 'evidence-grid', evidenceItems, 'evidence');
  buildBoundary(shell);
  buildCardGrid(shell, 'research-directions', 'Research directions', '未来可扩展研究方向', '这些方向只记录意义和恢复条件，不计入当前完成能力，也不在本阶段继续实现。', 'extension-grid', extensions, 'extension');
  buildFooter(shell);
  root.replaceChildren(shell);
  root.setAttribute('aria-busy', 'false');
  root.dataset.archiveReady = 'true';
  teardownSectionNavigation = initSectionNavigation();
}

render();
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

window.__COT_RESEARCH_ARCHIVE = {
  version: ARCHIVE_VERSION,
  archiveDate: ARCHIVE_DATE,
  registryVersion: RESEARCH_PLATFORM_VERSION,
  status: audit.pass ? 'ready' : 'error',
  audit,
  readyMs: Math.round(performance.now() - startedAt),
  routeCount: viewingOrder.length,
  sectionCount: sectionIndex.length,
  capabilityGroupCount: capabilityRows.length,
  evidenceCount: evidenceItems.length,
  extensionDirectionCount: extensions.length,
  sourceSubjectCount: subjectProfiles.length,
  sourceBudgetCount: performanceBudgets.length,
  sourceRiskCount: risks.length,
  threeRuntimeLoaded: Boolean(window.THREE || window.__GAME_READY || window.__STUDIO),
  dispose() {
    teardownSectionNavigation();
    teardownSectionNavigation = () => {};
    root.replaceChildren();
    delete window.__COT_RESEARCH_ARCHIVE;
  },
};
