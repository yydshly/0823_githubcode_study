export const RESEARCH_PLATFORM_VERSION = 3;

export const platformGoal = Object.freeze({
  title: 'Three.js 3D 能力研究与演示基座',
  statement: '分离渲染内核、场景逻辑、内容主体与展示逻辑，用运行时证据判断哪些能力可复用。',
  nonGoals: [
    '不把 Claude of Tanks 宣称为通用 3D 引擎',
    '不把程序化占位资产宣称为生产级产品模型',
    '不把局部对象成功挂载等同于完整场景复用',
  ],
});

export const layers = Object.freeze([
  {
    id: 'render-core',
    order: 1,
    label: '渲染内核',
    description: 'Renderer、相机、PBR 灯光、阴影、后期、截图与录制。',
    reusable: 'high',
    status: 'proven',
  },
  {
    id: 'scene',
    order: 2,
    label: '场景逻辑',
    description: '沙漠 world 仍与 Studio 耦合；独立中性工作台已实现 world:none。',
    reusable: 'medium',
    status: 'partial',
  },
  {
    id: 'subject',
    order: 3,
    label: '内容主体',
    description: 'Atlas 与 Nova 已通过统一 SubjectAdapter 接入；外部 GLB/glTF 仍未验证。',
    reusable: 'medium',
    status: 'partial',
  },
  {
    id: 'presentation',
    order: 4,
    label: '展示逻辑',
    description: '展台、热点、材质变体、镜头预设、分层比较与导演时间线。',
    reusable: 'high',
    status: 'proven',
  },
]);

export const sceneProfiles = Object.freeze([
  {
    id: 'desert-world',
    label: '沙漠世界',
    kind: 'scene',
    status: 'proven',
    capabilities: ['terrain', 'vegetation', 'structures', 'sky', 'fog', 'world-lighting'],
    runtime: 'upstream',
  },
  {
    id: 'neutral-inspection',
    label: '中性检查空间',
    kind: 'scene',
    status: 'proven',
    capabilities: ['world-none', 'neutral-grid', 'inspection-lighting', 'contact-platform'],
    runtime: 'research',
    evidence: '/workbench 独立启动，不请求游戏主入口、地形、植被或战斗模块。',
  },
  {
    id: 'showroom-world',
    label: '独立展厅世界',
    kind: 'scene',
    status: 'missing',
    capabilities: ['indoor-background', 'product-light-rig', 'grounding'],
    runtime: 'planned',
  },
]);

export const subjectProfiles = Object.freeze([
  {
    id: 'capability-fleet',
    label: '四车能力编队',
    kind: 'subject',
    status: 'proven',
    assetLevel: 'L3-presentable-medium-shot',
    origin: 'procedural-first-party',
  },
  {
    id: 't90m-inspection',
    label: 'T-90M 检查主体',
    kind: 'subject',
    status: 'proven',
    assetLevel: 'L3-presentable-medium-shot',
    origin: 'procedural-first-party',
  },
  {
    id: 'atlas-rover-prototype',
    label: 'Atlas 巡检车原型',
    kind: 'subject',
    status: 'proven',
    assetLevel: 'L2-inspectable',
    origin: 'procedural-research',
    limitation: '通过 SubjectAdapter v1 接入；仍不是商业级工业资产。',
  },
  {
    id: 'nova-field-node',
    label: 'Nova 能源节点原型',
    kind: 'subject',
    status: 'proven',
    assetLevel: 'L2-inspectable',
    origin: 'procedural-research',
    capabilities: ['instancing', 'local-animation', 'material-variants', 'hotspot-sockets'],
    limitation: '第二种非载具轮廓证明程序化主体可替换；仍未覆盖外部 GLB。',
  },
  {
    id: 'external-glb',
    label: '外部 GLB/glTF 主体',
    kind: 'subject',
    status: 'missing',
    assetLevel: 'L0-missing',
    origin: 'external',
  },
]);

export const presentationProfiles = Object.freeze([
  {
    id: 'studio-director',
    label: 'Studio 导演时间线',
    kind: 'presentation',
    status: 'proven',
    capabilities: ['timeline', 'camera-shots', 'actor-tracks', 'fx-sequencing'],
  },
  {
    id: 'visual-layer-inspector',
    label: '七层视觉检查器',
    kind: 'presentation',
    status: 'proven',
    capabilities: ['layer-switching', 'ab-compare', 'camera-lock', 'mobile-sheet'],
  },
  {
    id: 'product-stage',
    label: '产品展台逻辑 v2',
    kind: 'presentation',
    status: 'proven',
    capabilities: ['subject-switch', 'normalized-mount', 'shadow-budget', 'material-variants', 'hotspots', 'camera-presets', 'turntable', 'exploded-view', 'director-timeline'],
    evidence: '/workbench 复用同一 world:none 场景与 Product Stage，在 Atlas 和 Nova 之间切换。',
  },
  {
    id: 'none',
    label: '无额外展示层',
    kind: 'presentation',
    status: 'proven',
    capabilities: [],
  },
]);

export const demos = Object.freeze([
  {
    id: 'desert-capability-scene',
    label: '沙漠综合能力场景',
    status: 'stable',
    scene: 'desert-world',
    subject: 'capability-fleet',
    presentation: 'studio-director',
    route: '/studio?map=desert&showcase=capabilities&nogate=1',
    proves: ['沙漠世界', '多载具', '17 类效果', '导演时间线'],
    doesNotProve: ['场景可替换', '外部模型接入'],
  },
  {
    id: 'visual-layer-research',
    label: '七层视觉能力实验',
    status: 'research',
    scene: 'neutral-inspection',
    subject: 't90m-inspection',
    presentation: 'visual-layer-inspector',
    route: '/studio?map=desert&showcase=capabilities&lab=layers&nogate=1',
    proves: ['视觉层贡献', '同镜头 A/B', '移动端控制'],
    doesNotProve: ['轻量无地形启动', '通用对象适配'],
  },
  {
    id: 'programmatic-product-workbench',
    label: '程序化产品工作台',
    status: 'stable',
    scene: 'neutral-inspection',
    subject: 'atlas-rover-prototype',
    alternateSubjects: ['nova-field-node'],
    presentation: 'product-stage',
    route: '/workbench',
    proves: ['真正 world:none', 'SubjectAdapter 主体替换', '两种程序化产品', '热点与镜头', '材质变体', '结构分解', '跨主体导演', '动态性能采样'],
    doesNotProve: ['商业级产品资产', '任意 GLB 自动接入', '主游戏 Studio 已摆脱 world'],
  },
  {
    id: 'industrial-showroom-experiment',
    label: '历史：工业展厅失败实验',
    status: 'blocked',
    scene: 'desert-world',
    expectedScene: 'showroom-world',
    subject: 'atlas-rover-prototype',
    presentation: 'product-stage',
    route: null,
    proves: ['普通 Object3D 挂载', '热点与材质状态契约'],
    doesNotProve: ['独立展厅', '视觉构图正确', '场景替换成功'],
    blocker: '仍由沙漠 world 和 Studio 相机主导，主体没有形成可用的产品画面。',
  },
]);

export const performanceBudgets = Object.freeze([
  {
    id: 'desktop-full-ready',
    label: '桌面综合场景 ready',
    value: 22_861,
    unit: 'ms',
    target: 30_000,
    direction: 'max',
    evidence: 'evidence/capability-showcase/report.json',
  },
  {
    id: 'visual-lab-ready',
    label: '视觉实验冷启动 ready',
    value: 55_038,
    unit: 'ms',
    target: 30_000,
    direction: 'max',
    evidence: 'evidence/visual-layer-lab-final/report.json',
  },
  {
    id: 'research-hub-ready',
    label: '研究控制面 ready',
    value: 167,
    unit: 'ms',
    target: 1_000,
    direction: 'max',
    evidence: 'evidence/research-platform/browser-report.json',
  },
  {
    id: 'mobile-combat-ready',
    label: '移动端战斗加载',
    value: 73_900,
    unit: 'ms',
    target: 45_000,
    direction: 'max',
    evidence: 'README.md#本机验证结果',
  },
  {
    id: 'runtime-geometries',
    label: '整页 Geometry 数',
    value: 331,
    unit: 'count',
    target: 300,
    direction: 'max',
    evidence: 'evidence/industrial-showroom-final/runtime-metrics.json',
  },
  {
    id: 'runtime-textures',
    label: '整页 Texture 数',
    value: 109,
    unit: 'count',
    target: 96,
    direction: 'max',
    evidence: 'evidence/industrial-showroom-final/runtime-metrics.json',
  },
  {
    id: 'stable-raf-p95',
    label: '静止页面 rAF p95',
    value: 4.3,
    unit: 'ms',
    target: 16.7,
    direction: 'max',
    evidence: 'evidence/industrial-showroom-final/runtime-metrics.json',
    caveat: '静止且默认不重绘，不等同于 GPU 帧耗时。',
  },
  {
    id: 'main-chunk-gzip',
    label: '主入口 gzip',
    value: 638,
    unit: 'KB',
    target: 500,
    direction: 'max',
    evidence: 'README.md#已发现的工程边界',
  },
  {
    id: 'vehicle-chunk-gzip',
    label: '车辆工厂 gzip',
    value: 683,
    unit: 'KB',
    target: 500,
    direction: 'max',
    evidence: 'README.md#已发现的工程边界',
  },
  {
    id: 'workbench-ready',
    label: '产品工作台 ready',
    value: 138,
    unit: 'ms',
    target: 5_000,
    direction: 'max',
    evidence: 'evidence/product-workbench/browser-report.json',
    caveat: '本机 Vite 热缓存；冷启动首轮曾测得 2.5s，仍在 5s 预算内。',
  },
  {
    id: 'workbench-dynamic-p95',
    label: '工作台动态帧 p95',
    value: 12.4,
    unit: 'ms',
    target: 33.4,
    direction: 'max',
    evidence: 'evidence/product-workbench/browser-report.json',
  },
  {
    id: 'workbench-atlas-calls',
    label: 'Atlas 高质量 Draw Calls',
    value: 116,
    unit: 'count',
    target: 120,
    direction: 'max',
    evidence: 'evidence/product-workbench/browser-report.json',
    caveat: '通过主要轮廓阴影预算从 151 降至 116，降低 23.2%。',
  },
  {
    id: 'workbench-nova-calls',
    label: 'Nova 高质量 Draw Calls',
    value: 51,
    unit: 'count',
    target: 60,
    direction: 'max',
    evidence: 'evidence/product-workbench/browser-report.json',
    caveat: '移除低收益 transmission 预通道后，从 84 降至 51。',
  },
  {
    id: 'workbench-mobile-nova-calls',
    label: 'Nova 移动轻质量 Calls',
    value: 37,
    unit: 'count',
    target: 70,
    direction: 'max',
    evidence: 'evidence/product-workbench/browser-report.json',
    caveat: '关闭主体阴影和装饰轮廓；同主体桌面高质量为 51 calls。',
  },
]);

export const risks = Object.freeze([
  {
    id: 'scene-world-coupling',
    severity: 'high',
    label: '主游戏 Studio 仍与 world 耦合',
    detail: '独立工作台已证明 world:none，但上游 Studio 入口仍会创建完整地图；两条渲染路径尚未共用统一 SceneProfile 生命周期。',
    mitigation: '以工作台为轻量模板，后续再把 SceneProfile 生命周期下沉到共享渲染核心。',
  },
  {
    id: 'mobile-load',
    severity: 'high',
    label: '移动端加载超预算',
    detail: '真实移动 QA 的战斗加载约 73.9 秒，且多个布局站点超预算。',
    mitigation: '拆分入口、延迟加载非当前场景资产、降低弱设备默认质量。',
  },
  {
    id: 'asset-adapter',
    severity: 'medium',
    label: '外部资产适配仍未验证',
    detail: 'SubjectAdapter v1 已覆盖两个程序化对象的比例、接地、热点、镜头、材质、质量档和释放，但尚未加载真实 GLB/glTF。',
    mitigation: '在现有适配器上增加异步 GLB 加载、轴向修正、动画映射、许可记录与模型质量/预算门。',
  },
  {
    id: 'gpu-observability',
    severity: 'medium',
    label: 'GPU 指标证据不足',
    detail: 'renderer.info autoReset 让最后一次调用不能代表完整主题预算，静止 rAF 也不是 GPU 时间。',
    mitigation: '增加确定性动态镜头基准，采集稳定区间 draw calls、triangles 和 GPU timer（可用时）。',
  },
  {
    id: 'bundle-size',
    severity: 'medium',
    label: '入口包体偏大',
    detail: '主入口与车辆工厂 gzip 都高于研究目标 500KB。',
    mitigation: '按 Gallery、Studio、战斗和研究工具拆分动态入口。',
  },
]);

export function profileIndex(items) {
  return new Map(items.map((item) => [item.id, item]));
}

export function budgetStatus(metric) {
  const passes = metric.direction === 'min'
    ? metric.value >= metric.target
    : metric.value <= metric.target;
  return passes ? 'pass' : 'over';
}

export function auditRegistry() {
  const issues = [];
  const sceneIndex = profileIndex(sceneProfiles);
  const subjectIndex = profileIndex(subjectProfiles);
  const presentationIndex = profileIndex(presentationProfiles);
  const allCollections = [layers, sceneProfiles, subjectProfiles, presentationProfiles, demos, performanceBudgets, risks];

  for (const collection of allCollections) {
    const ids = collection.map((item) => item.id);
    if (new Set(ids).size !== ids.length) issues.push(`duplicate ids: ${ids.join(', ')}`);
  }

  for (const demo of demos) {
    if (!sceneIndex.has(demo.scene)) issues.push(`${demo.id}: missing scene ${demo.scene}`);
    if (!subjectIndex.has(demo.subject)) issues.push(`${demo.id}: missing subject ${demo.subject}`);
    for (const alternateSubject of demo.alternateSubjects || []) {
      if (!subjectIndex.has(alternateSubject)) issues.push(demo.id + ': missing alternate subject ' + alternateSubject);
    }
    if (!presentationIndex.has(demo.presentation)) issues.push(`${demo.id}: missing presentation ${demo.presentation}`);
    if (demo.status === 'blocked' && demo.route) issues.push(`${demo.id}: blocked demo must not expose a route`);
    if (demo.status !== 'blocked' && !demo.route) issues.push(`${demo.id}: launchable demo is missing a route`);
  }

  return {
    version: RESEARCH_PLATFORM_VERSION,
    pass: issues.length === 0,
    issues,
    counts: {
      layers: layers.length,
      scenes: sceneProfiles.length,
      subjects: subjectProfiles.length,
      presentations: presentationProfiles.length,
      demos: demos.length,
      risks: risks.length,
      budgets: performanceBudgets.length,
      budgetsOver: performanceBudgets.filter((metric) => budgetStatus(metric) === 'over').length,
    },
  };
}
