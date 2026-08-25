const ROOT = '../upstream/';
const THUMBS = location.hostname.endsWith('github.io')
  ? '../../../assets/kindergrimm/'
  : '../../../docs/assets/kindergrimm/';

const capabilities = [
  { id: 'editor', title: '手绘角色编辑器', label: 'Drawn 2D', category: '2d', route: 'editor.html', image: 'editor.jpg', output: '可复现的手绘纸片角色', rendering: '2D CanvasTexture + Three.js', proof: '20 部件、7 姿势、5 表情和锁定重掷已实测', note: '编辑完整 recipe，组合物种、媒介、部件、姿势与表情。' },
  { id: 'crowd', title: '35 人手绘群像', label: 'Drawn Crowd', category: '2d', route: 'crowd.html', image: 'crowd.jpg', output: '大规模风格统一的 NPC 群体', rendering: 'CanvasTexture planes + WebGL', proof: '35 个独立角色、眨眼与呼吸已运行验证', note: '观察同一视觉语法在大量随机角色上的覆盖范围。' },
  { id: 'items', title: '程序化物品商店', label: 'Item System', category: '2d', route: 'items.html', image: 'items.jpg', output: '物品图、名称、品阶和数值', rendering: 'Canvas 2D', proof: '13 物品族 × 4 品阶，属性与外观同源', note: '同一参数同时驱动物品外观、命名和游戏属性。' },
  { id: 'how', title: '生成原理教学', label: 'Live Explainer', category: '2d', route: 'how.html', image: 'how.jpg', output: '可解释的生成步骤', rendering: 'DOM + Canvas 2D', proof: '11 个步骤使用真实生成器实时绘制', note: '从笔触、形状和媒介，一路解释到部件、表情与 Seed。' },
  { id: 'voxel', title: 'Voxel 角色实验室', label: 'Voxel 3D', category: '3d', route: 'voxel.html', image: 'voxel.jpg', output: '可环绕的体素角色网格', rendering: 'Three.js BufferGeometry', proof: '样例 5,198 voxels / 5,108 tris，审计无异常', note: '体素雕刻、配色、部件编辑和角色动画。' },
  { id: 'voxelcrowd', title: 'Voxel 月夜群像', label: 'Voxel Crowd', category: '3d', route: 'voxelcrowd.html', image: 'voxelcrowd.jpg', output: '20 个程序化体素角色', rendering: 'Three.js meshes + lights', proof: '完整构建约 81K–83K triangles', note: '验证体素角色在群组、灯光和舞台中的表现。' },
  { id: 'gloss', title: 'Gloss 角色实验室', label: 'Gloss 3D', category: '3d', route: 'gloss.html', image: 'gloss.jpg', output: '玩具感实体 Q 版角色', rendering: 'Catmull-Clark + PBR', proof: '9 profiles、14 palettes、11 materials', note: '代码生成控制笼、平滑曲面、材质与面部状态。' },
  { id: 'glosscrowd', title: 'Gloss 35 人群像', label: 'Gloss Crowd', category: '3d', route: 'glosscrowd.html', image: 'glosscrowd.jpg', output: '高覆盖率 3D 角色群体', rendering: 'High-density Three.js geometry', proof: '约 6.35M–6.68M vertices，生产前需优化', note: '用于检验轮廓、物种、材质与表情覆盖，也暴露性能边界。' },
  { id: 'objects', title: '程序化植物对象', label: 'Object 3D', category: '3d', route: 'objects.html', image: 'objects.jpg', output: '草、植物、树和花的 3D 对象', rendering: 'Procedural Three.js geometry', proof: '4 类对象、6 palettes、3 finishes', note: '共享 mound、stem、leaves、bloom 部件配方。' },
  { id: 'photo', title: '班级摄影棚', label: 'Composition', category: 'hybrid', route: 'photo.html', image: 'photo.jpg', output: '由一个 Seed 编排的完整合影', rendering: 'Gloss 3D + plants + AO', proof: '角色、花园、灯光和构图同时由 Seed 驱动', note: '展示生成资产如何被场景、灯光与后期共同消费。' },
  { id: 'pipes', title: '活管线示意图', label: '3D Experiment', category: 'hybrid', route: 'pipes.html', image: 'pipes.jpg', output: '自动绘制和巡游的空间示意图', rendering: 'Three.js curves + flat materials', proof: '三层管线、活动角色和八个观察角度', note: '真正 3D 的曲线与网格，被设计成平面插画观感。' },
  { id: 'orla', title: 'Class Photo 评分游戏', label: 'Game 01', category: 'game', route: 'orla.html', image: 'orla.jpg', output: '组合识别与评分玩法', rendering: '2D assets + Three.js stage', proof: '五人选择与 110 × 4 = 440 评分闭环已完成', note: '证明生成角色的视觉属性可以直接进入组合规则。' },
  { id: 'game', title: 'Kindergrimm 小队游戏', label: 'Game 02', category: 'game', route: 'game.html', image: 'game.jpg', output: '可战斗、成长的程序化小队', rendering: '2.5D Three.js game', proof: '移动、战斗和五选一装备奖励已实测', note: '将手绘角色、物品数值、暗场和自动战斗连接成玩法闭环。' },
  { id: 'marbles', title: 'Marbles 弹珠战斗', label: 'Game 03', category: 'game', route: 'marbles.html', image: 'marbles.jpg', output: '拖拽发射和自动战斗游戏', rendering: 'Three.js 3D game', proof: '移动端横屏、拖拽发射与自动战斗已实测', note: '包含物理感运动、敌群、波次、升级、Boss 与生成式声音。' }
];

const extensions = [
  {
    id: 'style-pack', title: '生产新的视觉内容包', label: '最快形成自有能力', capability: 'editor',
    summary: 'v0.6 已跑通 12 个确定性 Canvas 部件与五组覆盖；下一步替换完整媒介绘制、核心主体形状与配色。',
    input: '视觉规范、角色比例、部件清单、颜色/线条/材质规则',
    touch: 'runtime/content-packs.js + mosslight-kit.js + visual-pipeline.js 已完成；下一步 media.js、species.js、parts/、poses/、expressions.js',
    build: '苔光旅站十二部件 visual kit 已完成；下一版增加 1 种完整新媒介 × 12 个核心主体部件',
    accept: 'Recipe / Visual fingerprint、Manifest、ZIP 和跨页消费可复验；完整新内容需通过 50 个样本的一致性审查'
  },
  {
    id: 'export', title: '建设正式资产导出管线', label: '从运行时变成生产工具', capability: 'voxel',
    summary: '2D 资产交付链已跑通；下一步把同样的来源、校验与消费合同扩展到 3D。',
    input: '目标格式、透明背景、尺寸、动画帧率、坐标与材质约定',
    touch: '已完成 Canvas capture、sprite sheet packer、ZIP writer、manifest validator；待接 GLTFExporter',
    build: '已支持 PNG、Recipe JSON、Sprite Sheet、ZIP Bundle 与 Manifest 消费；下一版研究 Voxel/Gloss glTF',
    accept: 'ZIP 条目与 CRC 可验证；导入逐 fingerprint 校验；无效文件不破坏场景；3D 仍需目标引擎闭环'
  },
  {
    id: 'sdk', title: '封装稳定 Generator SDK', label: '从实验仓库变成平台内核', capability: 'how',
    summary: '把页面级代码拆成无界面生成核心、渲染后端、编辑器组件和内容包。',
    input: '公共 API、Recipe 版本、错误模型、浏览器与 Node 支持边界',
    touch: 'TypeScript package、schema validation、backend adapters、tests',
    build: '定义 createRecipe / buildAsset / animate / dispose 四组稳定接口',
    accept: '同一测试向量跨版本结果稳定；四后端有自动化构建与释放测试'
  },
  {
    id: 'ai-recipe', title: 'AI 意图转换为 Recipe', label: '自然语言控制而非直接画图', capability: 'editor',
    summary: '让 AI 只负责把用户语义映射到受约束参数，最终画面仍由确定性生成器执行。',
    input: '受支持词汇、属性映射、冲突规则、默认值和拒绝策略',
    touch: 'JSON Schema、structured output、validator、repair loop',
    build: '先覆盖物种、性格、颜色、媒介、装备和姿势六类意图',
    accept: '非法参数不能进入生成器；相同结构化 Recipe 可重复得到相同结果'
  },
  {
    id: 'scale', title: '规模化与运行时优化', label: '把群像能力带入产品', capability: 'glosscrowd',
    summary: '针对高密度角色减少构建 CPU、顶点量、纹理内存和 draw calls。',
    input: '目标设备、角色数量、可见距离、帧率与内存预算',
    touch: 'LOD、实例化、纹理图集、Worker、缓存、按需表情',
    build: '建立 1 / 10 / 35 / 100 角色基准，再针对瓶颈逐项优化',
    accept: '目标设备达到约定帧率；质量降级可解释；离屏角色不持续消耗'
  }
];

const scenarios = [
  {
    id: 'npc-factory', title: '游戏 NPC 工厂', audience: '独立游戏 / Roguelike',
    value: '用稳定 Recipe 生成大量不同但风格统一的 NPC，并把外观参数连接到行为和装备。',
    boundary: '2D ZIP 与 Manifest 消费已完成；仍需存档 Schema、缓存层和目标引擎导出。',
    steps: [
      { capability: 'editor', title: '定义角色身份', note: '用 Seed、物种、媒介和锁定部件得到可复现 NPC。' },
      { capability: 'crowd', title: '检查群体覆盖', note: '批量观察轮廓重复、颜色分布和表情多样性。' },
      { capability: 'game', title: '进入真实玩法', note: '让角色移动、战斗并由程序化物品改变能力。' }
    ]
  },
  {
    id: 'ip-studio', title: 'IP 内容工作室', audience: '品牌 / 绘本 / 社交内容',
    value: '把同一视觉语言扩展成角色、群像、合影和空间海报，持续产出一致内容。',
    boundary: '需要品牌内容包、构图模板和 PNG/视频导出。',
    steps: [
      { capability: 'gloss', title: '建立角色母体', note: '确定体型、材质、色板、五官和身份轮廓。' },
      { capability: 'photo', title: '生成主题合影', note: '一个 Seed 编排角色、植物、灯光和完整构图。' },
      { capability: 'pipes', title: '形成动态视觉叙事', note: '把角色放入可巡游、可讲解的品牌空间图。' }
    ]
  },
  {
    id: 'item-economy', title: '卡牌与装备生态', audience: '卡牌 / RPG / 运营活动',
    value: '让外形、命名、品阶和数值来自同一参数，减少美术与策划数据脱节。',
    boundary: '需要平衡表、稀有度分布、版本迁移和后台资产登记。',
    steps: [
      { capability: 'items', title: '生成物品族', note: '审查 13 类物品在四个品阶下的视觉与命名。' },
      { capability: 'game', title: '验证装备作用', note: '在奖励 draft 和战斗中观察物品参数进入规则。' },
      { capability: 'marbles', title: '扩展到局内成长', note: '验证波次、升级、招募和 Boss 形成可重复游戏循环。' }
    ]
  },
  {
    id: 'asset-lab', title: '程序化 3D 资产实验室', audience: 'Web 游戏 / 交互展厅',
    value: '用同一 Recipe 思想生产不同几何语言的角色与环境对象。',
    boundary: '当前为原型资产质量；需要 glTF 导出、LOD、压缩和目标设备预算。',
    steps: [
      { capability: 'voxel', title: '低成本体素资产', note: '用体素表面网格快速形成可编辑、易识别的角色。' },
      { capability: 'gloss', title: '高表现角色资产', note: '用细分曲面与 PBR 材质形成玩具级近景角色。' },
      { capability: 'objects', title: '补齐环境对象', note: '用共享部件生成植物、树木和花朵，构成世界内容。' }
    ]
  }
];

const filters = [
  { id: 'all', label: '全部' },
  { id: '2d', label: '2D' },
  { id: 'hybrid', label: '混合场景' },
  { id: '3d', label: '真 3D' },
  { id: 'game', label: '游戏' }
];

const dom = {
  tabs: [...document.querySelectorAll('[role="tab"]')],
  panels: [...document.querySelectorAll('[role="tabpanel"]')],
  capabilityFilters: document.querySelector('#capability-filters'),
  capabilityList: document.querySelector('#capability-list'),
  capabilityCount: document.querySelector('#capability-count'),
  extensionList: document.querySelector('#extension-list'),
  extensionDetail: document.querySelector('#extension-detail'),
  scenarioList: document.querySelector('#scenario-list'),
  scenarioBrief: document.querySelector('#scenario-brief'),
  scenarioSteps: document.querySelector('#scenario-steps'),
  frame: document.querySelector('#demo-frame'),
  loading: document.querySelector('#stage-loading'),
  title: document.querySelector('#stage-title'),
  kicker: document.querySelector('#stage-kicker'),
  route: document.querySelector('#stage-route'),
  state: document.querySelector('#stage-state'),
  output: document.querySelector('#stage-output'),
  rendering: document.querySelector('#stage-rendering'),
  proof: document.querySelector('#stage-proof'),
  reload: document.querySelector('#reload-demo'),
  open: document.querySelector('#open-demo')
};

const state = {
  mode: 'capabilities',
  filter: 'all',
  capability: 'editor',
  extension: extensions[0].id,
  scenario: scenarios[0].id,
  scenarioStep: 0
};

function capabilityById(id) {
  return capabilities.find(item => item.id === id) || capabilities[0];
}

function setQuery() {
  const params = new URLSearchParams({ view: state.mode });
  if (state.mode === 'capabilities') params.set('item', state.capability);
  if (state.mode === 'extensions') params.set('item', state.extension);
  if (state.mode === 'scenarios') {
    params.set('item', state.scenario);
    params.set('step', String(state.scenarioStep + 1));
  }
  history.replaceState(null, '', `${location.pathname}?${params}`);
}

function loadCapability(id, context = {}) {
  const item = capabilityById(id);
  state.capability = item.id;
  dom.loading.setAttribute('aria-hidden', 'false');
  dom.state.textContent = 'LOADING';
  dom.frame.src = ROOT + item.route;
  dom.frame.title = `Kindergrimm ${item.title}实时演示`;
  dom.title.textContent = context.title || item.title;
  dom.kicker.textContent = context.kicker || 'LIVE LOCAL DEMO';
  dom.route.textContent = `/${item.route}`;
  dom.open.href = ROOT + item.route;
  dom.output.textContent = context.output || item.output;
  dom.rendering.textContent = item.rendering;
  dom.proof.textContent = context.proof || item.proof;
  renderCapabilityList();
  setQuery();
}

function renderFilters() {
  dom.capabilityFilters.innerHTML = filters.map(filter => `
    <button type="button" data-filter="${filter.id}" aria-pressed="${filter.id === state.filter}">${filter.label}</button>
  `).join('');
  dom.capabilityFilters.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      renderFilters();
      renderCapabilityList();
    });
  });
}

function renderCapabilityList() {
  const visible = state.filter === 'all' ? capabilities : capabilities.filter(item => item.category === state.filter);
  dom.capabilityCount.textContent = `${visible.length} / 14`;
  dom.capabilityList.innerHTML = visible.map(item => `
    <button class="select-card" type="button" data-capability="${item.id}" aria-pressed="${item.id === state.capability}">
      <img src="${THUMBS + item.image}" alt="" loading="lazy">
      <span class="select-card-copy">
        <small>${item.label}</small>
        <strong>${item.title}</strong>
        <p>${item.note}</p>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  `).join('');
  dom.capabilityList.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => loadCapability(button.dataset.capability));
  });
}

function renderExtensions() {
  dom.extensionList.innerHTML = extensions.map(item => `
    <button class="select-card" type="button" data-extension="${item.id}" aria-pressed="${item.id === state.extension}">
      <img src="${THUMBS + capabilityById(item.capability).image}" alt="" loading="lazy">
      <span class="select-card-copy">
        <small>${item.label}</small>
        <strong>${item.title}</strong>
        <p>${item.summary}</p>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  `).join('');
  const item = extensions.find(entry => entry.id === state.extension) || extensions[0];
  dom.extensionDetail.innerHTML = `
    <h3>${item.title}</h3>
    <p>${item.summary}</p>
    <div class="detail-grid">
      <div><small>需要输入</small><span>${item.input}</span></div>
      <div><small>代码落点</small><span>${item.touch}</span></div>
      <div><small>下一建设</small><span>${item.build}</span></div>
      <div><small>验收标准</small><span>${item.accept}</span></div>
    </div>
  `;
  dom.extensionList.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      state.extension = button.dataset.extension;
      const selected = extensions.find(entry => entry.id === state.extension);
      renderExtensions();
      loadCapability(selected.capability, {
        kicker: 'SOURCE EVIDENCE FOR EXTENSION',
        title: `证据：${capabilityById(selected.capability).title}`,
        output: `支撑路线：${selected.title}`,
        proof: selected.accept
      });
    });
  });
}

function renderScenarios() {
  dom.scenarioList.innerHTML = scenarios.map((item, index) => `
    <button type="button" data-scenario="${item.id}" aria-pressed="${item.id === state.scenario}">
      <small>SCENE ${String(index + 1).padStart(2, '0')} · ${item.audience}</small>
      <strong>${item.title}</strong>
    </button>
  `).join('');
  const scenario = scenarios.find(item => item.id === state.scenario) || scenarios[0];
  dom.scenarioBrief.innerHTML = `
    <h3>${scenario.title}</h3>
    <p><strong>应用价值：</strong>${scenario.value}<br><strong>生产边界：</strong>${scenario.boundary}</p>
  `;
  dom.scenarioSteps.innerHTML = scenario.steps.map((step, index) => `
    <li><button class="scenario-step" type="button" data-step="${index}" aria-pressed="${index === state.scenarioStep}">
      <span><strong>${step.title}</strong><span>${step.note}</span></span>
    </button></li>
  `).join('');
  dom.scenarioList.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      state.scenario = button.dataset.scenario;
      state.scenarioStep = 0;
      renderScenarios();
      loadScenarioStep();
    });
  });
  dom.scenarioSteps.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      state.scenarioStep = Number(button.dataset.step);
      renderScenarios();
      loadScenarioStep();
    });
  });
}

function loadScenarioStep() {
  const scenario = scenarios.find(item => item.id === state.scenario) || scenarios[0];
  const step = scenario.steps[state.scenarioStep] || scenario.steps[0];
  loadCapability(step.capability, {
    kicker: `${scenario.title} · STEP ${state.scenarioStep + 1}/${scenario.steps.length}`,
    title: step.title,
    output: step.note,
    proof: `场景边界：${scenario.boundary}`
  });
}

function setMode(mode, { load = true } = {}) {
  state.mode = ['capabilities', 'extensions', 'scenarios'].includes(mode) ? mode : 'capabilities';
  dom.tabs.forEach(tab => {
    const selected = tab.dataset.mode === state.mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  dom.panels.forEach(panel => {
    panel.hidden = panel.id !== `panel-${state.mode}`;
  });
  if (load) {
    if (state.mode === 'capabilities') loadCapability(state.capability);
    if (state.mode === 'extensions') {
      const item = extensions.find(entry => entry.id === state.extension) || extensions[0];
      loadCapability(item.capability, { kicker: 'SOURCE EVIDENCE FOR EXTENSION', title: `证据：${capabilityById(item.capability).title}`, output: `支撑路线：${item.title}`, proof: item.accept });
    }
    if (state.mode === 'scenarios') loadScenarioStep();
  }
  setQuery();
}

dom.tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + dom.tabs.length) % dom.tabs.length;
    if (event.key === 'ArrowRight') next = (index + 1) % dom.tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = dom.tabs.length - 1;
    dom.tabs[next].focus();
    setMode(dom.tabs[next].dataset.mode);
  });
});

dom.frame.addEventListener('load', () => {
  dom.loading.setAttribute('aria-hidden', 'true');
  dom.state.textContent = 'READY';
});

dom.reload.addEventListener('click', () => {
  dom.loading.setAttribute('aria-hidden', 'false');
  dom.state.textContent = 'RELOADING';
  dom.frame.src = dom.frame.src;
});

function restoreQuery() {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  const item = params.get('item');
  if (['capabilities', 'extensions', 'scenarios'].includes(view)) state.mode = view;
  if (state.mode === 'capabilities' && capabilities.some(entry => entry.id === item)) state.capability = item;
  if (state.mode === 'extensions' && extensions.some(entry => entry.id === item)) state.extension = item;
  if (state.mode === 'scenarios' && scenarios.some(entry => entry.id === item)) {
    state.scenario = item;
    const scenario = scenarios.find(entry => entry.id === item);
    const step = Math.max(0, Number(params.get('step') || 1) - 1);
    state.scenarioStep = Math.min(step, scenario.steps.length - 1);
  }
}

restoreQuery();
renderFilters();
renderCapabilityList();
renderExtensions();
renderScenarios();
setMode(state.mode);
