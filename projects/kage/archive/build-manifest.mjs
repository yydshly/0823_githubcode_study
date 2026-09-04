import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const archiveRoot = resolve(import.meta.dirname);
const repoRoot = resolve(archiveRoot, '../../..');
const labRoot = join(repoRoot, 'projects/kage/lab');
const deliveryRoot = join(labRoot, 'pages/v2/deliveries');
const researchRoot = join(labRoot, 'docs/v2-research');
const evidenceRoot = join(researchRoot, 'evidence');
const caseCatalogPath = join(labRoot, 'cases/catalog.json');
const caseRunsRoot = join(labRoot, 'cases/runs');
const generatedRunsRoot = join(labRoot, 'generated/runs');
const branch = 'codex/kage-v2-baseline-r165';
const sourceBase = `https://github.com/yydshly/0823_githubcode_study/blob/${branch}/projects/kage/lab`;
const treeBase = `https://github.com/yydshly/0823_githubcode_study/tree/${branch}/projects/kage/lab`;

const formalIds = new Set(['kage-opening-rehearsal', 'kage-creative-director', 'rainlight-walk-recorder', 'kage-feeling-lens']);
const experienceIds = new Set(['weave-light-field', 'ice-core-letters', 'forest-sound-route', 'moonlit-tidepool-panorama', 'stormglass-archive', 'prism-seed-theatre', 'sonic-pressing-room', 'lighthouse-chart-reveal', 'folded-light-studio', 'windborne-letter-valley', 'sea-fiber-scope', 'thunderhead-score']);
const v3Ids = new Set(['film-camera-repair-paths', 'west-bund-meeting-points', 'fox-gait-observatory', 'ten-second-callsign-decode', 'same-table-tonight', 'modular-room-sound', 'fridge-tonight', 'eclipse-post-office']);
const capabilityCases = [
  {
    id: 'capability-resonance-flagship',
    title: '资产驱动产品电影',
    promise: '真实主视觉、深度图、滚动镜头与克制辉光组成的能力基准。',
    medium: '图像 / Three.js / 滚动',
    viewUrl: './snapshot/?experience=resonance-flagship&quality=high&motion=full'
  },
  {
    id: 'capability-tidal-archive',
    title: '潮汐记忆叙事空间',
    promise: '环境、档案关系、空间路径与水体微光组成的叙事空间基准。',
    medium: 'Three.js / 空间叙事',
    viewUrl: './snapshot/?experience=tidal-archive&quality=high&motion=full'
  },
  {
    id: 'capability-coastline-evidence',
    title: '潮线证词 · 1984—2026 海岸证据',
    promise: '同一时间参数联动海岸形态、年份与证据的语义互动原型。',
    medium: 'Canvas / 数据 / 互动',
    viewUrl: './snapshot/pages/v2/prototypes/semantic-interaction/?demo=1'
  }
];

const imageById = {
  'kage-opening-rehearsal': 'kage-opening-rehearsal.png',
  'dream-record': 'dream-record.jpg',
  'paper-butterfly-garden': 'paper-butterfly-garden.jpg',
  'folded-light-studio': 'folded-light-studio.png',
  'forest-sound-route': 'forest-sound-route.png',
  'fox-gait-observatory': 'fox-gait-observatory.png',
  'night-reflective-catalog': 'night-reflective-catalog.png',
  'stormglass-archive': 'stormglass-archive.png',
  'ten-second-callsign-decode': 'ten-second-callsign-decode.png'
};

const mediumById = {
  'after-rain-archive': '图像 / 气味档案', 'aurora-radio-postcard': '图像 / 声音', 'color-relay-branching': 'DOM / 分支互动',
  'dream-record': '生成图像 / 滚动', 'eclipse-post-office': '生成图像 / 状态', 'film-camera-repair-paths': 'SVG / 路径判断',
  'folded-light-studio': '生成图像 / 连续状态', 'forest-sound-route': '图像 / 空间声音', 'fox-gait-observatory': 'Three.js / 3D',
  'fridge-tonight': 'DOM / 工具', 'ice-core-letters': '生成图像 / 滚动叙事', 'kage-creative-director': '正式素材 / 产品流程',
  'kage-feeling-lens': '正式素材 / 情绪交互', 'kage-opening-rehearsal': '正式素材 / 声音 / 连续场景', 'kinetic-score': 'Canvas / 动作',
  'lighthouse-chart-reveal': 'SVG 蒙版 / Canvas', 'modular-room-sound': 'Three.js / 声音', 'moonlit-tidepool-panorama': '宽幅图像 / 横向导航',
  'night-reflective-catalog': '图像 / 比较工具', 'paper-butterfly-garden': '图像 / 趣味空间', 'prism-seed-theatre': '生成图像 / WebGL',
  'rainlight-walk-recorder': '正式素材 / 路径记录', 'roof-water-route': 'SVG / 数据路线', 'same-table-tonight': '生成图像 / 共同状态',
  'sea-fiber-scope': 'Three.js / 声音 / 数据', 'sign-language-season': '编辑排版 / 手势', 'sonic-pressing-room': 'WebGL / 音频频谱',
  'stormglass-archive': 'Shader / 分支状态', 'ten-second-callsign-decode': 'Web Audio / 工具', 'thin-film-lab': 'Three.js / 材质',
  'thunderhead-score': '图像 / 编辑 / 声音', 'weave-light-field': 'Three.js / 结构生成', 'west-bund-meeting-points': '真实地点 / 横向全景',
  'wind-kite-lab': 'Canvas / 风场工具', 'windborne-letter-valley': '生成图像 / 运行时旅程'
};

function listFilesRecursive(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? listFilesRecursive(path) : [path];
  });
}

function titleAndPromise(id) {
  const html = readFileSync(join(deliveryRoot, id, 'index.html'), 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() ?? id;
  const promise = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
  return { title: title.split('·')[0].split('｜')[0].trim(), promise };
}

function tierFor(id) {
  if (formalIds.has(id)) return ['formal', '正式产品回执'];
  if (experienceIds.has(id)) return ['experience', '体验能力参考'];
  if (v3Ids.has(id)) return ['protocol', '协议验证交付'];
  return ['study', '阶段研究案例'];
}

function documentFamily(name) {
  if (name.includes('MOTIONSITES')) return 'MotionSites';
  if (name.includes('LOCAL-EXEMPLARS')) return '本地案例';
  if (name.includes('THREEUI') || name.includes('THREEJS')) return '3D / 外部库';
  if (name.includes('EXTERNAL') || name.includes('REFERENCE')) return '外部参考';
  if (name.includes('QUALITY') || name.includes('VISUAL')) return '质量判断';
  if (name.includes('PROGRAM-STATUS') || name.includes('CURRENT-STATE') || name.includes('RECOVERY')) return '状态与恢复';
  if (name.includes('AUDIO') || name.includes('SOUND') || name.includes('SONIC')) return '声音与媒体';
  if (name.includes('INTERACTION') || name.includes('CAUSAL')) return '互动因果';
  return '协议与交付';
}

const deliveryIds = readdirSync(deliveryRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const cases = deliveryIds.map((id) => {
  const [tier, tierLabel] = tierFor(id);
  return {
    id,
    ...titleAndPromise(id),
    tier,
    tierLabel,
    medium: mediumById[id] ?? '混合媒介',
    image: imageById[id] ?? null,
    caseKind: 'v2-delivery',
    viewUrl: `./snapshot/pages/v2/deliveries/${id}/`,
    sourceUrl: `${treeBase}/pages/v2/deliveries/${id}`
  };
});

const caseCatalog = JSON.parse(readFileSync(caseCatalogPath, 'utf8'));
const legacyCases = caseCatalog.cases.map((item) => ({
  id: item.id,
  title: item.title,
  promise: item.brief,
  tier: item.stage === 'featured' ? 'legacy-featured' : 'legacy-refined',
  tierLabel: item.stage === 'featured' ? 'V1 精选案例' : 'V1 研究案例',
  medium: (item.tags || []).slice(0, 4).join(' / ') || 'V1 混合媒介',
  image: null,
  caseKind: 'v1-archive',
  viewUrl: `./snapshot/pages/v1/case.html?id=${encodeURIComponent(item.id)}&quality=high&motion=full`,
  sourceUrl: `${treeBase}/cases/runs/${item.id}`
}));

const capabilityEntries = capabilityCases.map((item) => ({
  ...item,
  tier: 'baseline',
  tierLabel: '能力基准',
  image: null,
  caseKind: 'capability-demo',
  sourceUrl: `${sourceBase}/src/cases-main.ts`
}));

const allCases = [...cases, ...legacyCases, ...capabilityEntries];

const generatedRunIds = readdirSync(generatedRunsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const archivedPackageIds = new Set(readdirSync(caseRunsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name));
const catalogCaseIds = new Set(caseCatalog.cases.map((item) => item.id));

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

const generatedHistory = generatedRunIds.map((id) => {
  const root = join(generatedRunsRoot, id);
  const report = readJson(join(root, 'build-report.json'));
  const selectedId = report?.refinement?.selectedId;
  const brief = report?.request?.brief || '';
  return {
    id,
    title: report?.request?.reference?.title || brief.slice(0, 72) || '未完成的生成记录',
    state: catalogCaseIds.has(id) ? 'catalogued' : typeof selectedId === 'string' && selectedId !== id ? 'superseded' : 'history',
    stateLabel: catalogCaseIds.has(id) ? '已进入 V1 案例' : typeof selectedId === 'string' && selectedId !== id ? '已被后续版本替代' : '历史生成记录',
    archivedPackage: archivedPackageIds.has(id),
    hasBundle: existsSync(join(root, 'bundle.json')),
    hasReview: existsSync(join(root, 'visual-review.json')),
    sourceUrl: `${treeBase}/generated/runs/${id}`
  };
});

const researchDocuments = readdirSync(researchRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => ({ name: entry.name, family: documentFamily(entry.name), url: `${sourceBase}/docs/v2-research/${encodeURIComponent(entry.name)}` }))
  .sort((left, right) => left.name.localeCompare(right.name));

const evidenceFiles = listFilesRecursive(evidenceRoot);
const evidenceRuns = evidenceFiles.filter((path) => /(direct-creative-run|final)\.json$/i.test(path));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();

const manifest = {
  schemaVersion: 2,
  archiveDate: '2026-09-04',
  sourceBranch: branch,
  sourceCommit,
  stats: {
    researchDocs: researchDocuments.length,
    runnableCases: allCases.length,
    deliveries: cases.length,
    archivedCases: legacyCases.length,
    capabilityDemos: capabilityEntries.length,
    historyRuns: generatedHistory.length,
    archivedPackages: archivedPackageIds.size,
    evidenceRuns: evidenceRuns.length,
    capabilities: 8,
    formalProducts: formalIds.size
  },
  phases: [
    { range: 'R01–R13', title: '参考与原理', summary: '研究 MotionSites、本地 52 个 HTML、Threejs-3D-Webpage 与早期案例，将视觉外壳拆成滚动、空间、排版、素材和互动原理。' },
    { range: 'R17–R70', title: '生成与防护', summary: '扩展生成、素材路由、Three.js 运行时、真实性、移动端、超时、修复和证据绑定；同时开始出现规则膨胀。' },
    { range: 'R72–R143', title: '大量场景验证', summary: '跨声音、地图、产品、3D、档案、儿童互动和情绪叙事形成案例；证明媒介广度，也暴露模板惯性与自评偏差。' },
    { range: 'R144–R166', title: '效果优先与外部研究', summary: '重新开放图像、3D、视频、声音、Shader 与外部库；研究优秀产品和 ThreeUI，强调手段服从感受。' },
    { range: 'R167–R173', title: '能力指导与正式产品', summary: '形成 8 类开放能力、4 个正式产品回执与最终效果复核；确认实现闭环存在，但独立优秀判断仍未成立。' },
    { range: 'ARCHIVE', title: '停止扩张', summary: '冻结当前源码、文档、证据和案例；不再以更多规则和样例掩盖核心判断问题。' }
  ],
  capabilities: [
    { title: '素材主导的环境与身份', lesson: '高质量图像、视频或真实素材建立地点、主体和第一情绪，代码负责增强而不是替代。', media: ['图像', '视频', '真实素材'] },
    { title: '编辑构图与蒙版叙事', lesson: '排版、留白、窗口、裁切和显影服务阅读与揭示，不固定成巨型标题或工作台。', media: ['排版', '蒙版', 'SVG'] },
    { title: '连续状态与旅程', lesson: '滚动或输入推进同一主体的可理解变化，页面长度和阶段数量由内容决定。', media: ['滚动', '状态', '叙事'] },
    { title: '可检查的 Three.js 空间', lesson: '3D 用于解释结构、距离、材质和动作，不作为与产品无关的昂贵背景。', media: ['Three.js', '3D', '镜头'] },
    { title: '程序化 WebGL 现象', lesson: 'Shader、光场与形变只在实时变化本身承载主题时使用，并提供诚实回退。', media: ['WebGL', 'Shader', 'Canvas'] },
    { title: '语义因果互动', lesson: '输入必须改变主题主体、业务状态和结果理解，而不仅是高亮、数字或装饰。', media: ['触控', '键盘', '指针'] },
    { title: '声音与视觉共享因果', lesson: '声音要真实可辨并与画面和状态同步，不能让多个选项播放相同循环。', media: ['Web Audio', '频谱', '声场'] },
    { title: '真实地点、数据与来源', lesson: '地图、路线和数据必须先有可追溯事实基础；模拟内容需明确标记。', media: ['地图', '数据', '来源'] }
  ],
  sourceFamilies: [
    { title: 'MotionSites', finding: '公开目录 462 条；完成首批抽样与机制拆解，但没有逐条深挖，也没有复制付费提示词或素材。' },
    { title: '本地优秀页面', finding: '扫描 Downloads 中 52 个 HTML；重点研究视频环境、标本构图、品牌蒙版、聚光揭示与 sticky 档案。' },
    { title: '外部产品', finding: '整理 6 个产品体验家族与 14 个一手来源，全部保持 research-only，不伪装成已复用能力。' },
    { title: '开源实现', finding: '研究 Threejs-3D-Webpage、ThreeUI 与 6 个固定 revision 机制；许可和运行证据与视觉质量分开记录。' }
  ],
  cases: allCases,
  generatedHistory,
  researchDocuments
};

writeFileSync(join(archiveRoot, 'research-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${manifest.stats.researchDocs} docs, ${manifest.stats.runnableCases} runnable cases, ${manifest.stats.historyRuns} history runs, ${manifest.stats.evidenceRuns} evidence runs`);
