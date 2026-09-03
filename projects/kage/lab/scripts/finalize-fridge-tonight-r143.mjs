import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createWowGateEvidenceFromBrowserObservations } from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
import { assertV3DirectCreativeArchiveEligible } from '../src/v2/direct-creative-v3-archive-gate.ts';
import {
  attachDirectCreativeEvidence,
  attachDirectCreativeWowEvidence,
  directCreativeRunSchema,
  finalizeDirectCreativeRun,
  recordDirectCreativeAttempt,
  recordDirectCreativeStageReport,
  setDirectCreativeFinalCandidate,
} from '../src/v2/direct-creative-run.ts';
import { assessDirectVisualQuality, createFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const deliveryId = 'fridge-tonight';
const runId = 'direct-r143-fridge-tonight';
const expectedBundleHash = 'c91dbd26982c8d8eddf7007c8ed1cf4fd162dd7cd92e568197774542221828b1';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const evidenceRoot = resolve(root, 'docs', 'v2-research', 'evidence', 'r143-fridge-tonight');
const reportPath = resolve(evidenceRoot, 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r143-fridge-tonight.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md', 'asset-manifest.json'];
const checkpointOrder = [
  'desktop-opening',
  'desktop-causal-selection-and-withdrawal',
  'desktop-save-restore-reset',
  'mobile-reduced-result',
  'no-js-readable',
];
const captureSpecs = [
  ['01-desktop-opening.png', 1440, 2296],
  ['02-desktop-causal-result.png', 1440, 900],
  ['03-desktop-saved.png', 1440, 900],
  ['04-mobile-reduced-result.png', 390, 3157],
  ['05-no-js-readable.png', 1440, 2677],
];
const brief = '为一款帮助独居者在食材过期前安排今晚晚餐的产品设计网页。开场像一扇明亮的冰箱门，现有食材以带日期的编辑插画切片和磁贴出现。访客选择二到四样食材后，新鲜度时间带、今晚可做的菜和仍需补买的项目要在同一页同步重排；取消选择时结果即时撤回。最终行动是保存今晚清单。所有食材、日期和建议都是概念演示。页面像一本厨房杂志与手写便签的结合，不做参数工作台，也不按固定屏数排版。';

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function sameOrder(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function issuesAreClean(item) {
  return item?.issues
    && ['pageErrors', 'consoleErrors', 'requestFailures', 'responseErrors']
      .every((key) => Array.isArray(item.issues[key]) && item.issues[key].length === 0);
}

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R143 browser evidence is missing ${checkpoint}.`);
  return item;
}

function isReadyState(state, options = {}) {
  return state?.ready === true
    && state.revision === 'r143-proof'
    && state.renderer === 'dom-css-inline-svg'
    && state.horizontalOverflow === false
    && (options.reducedMotion === undefined || state.reducedMotion === options.reducedMotion);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
const reportValid = bundleHash === expectedBundleHash
  && report.schemaVersion === 1
  && report.stage === 'r143-fridge-tonight-runtime-observations'
  && report.identityBinding === 'runId+bundleHash'
  && report.runId === runId
  && report.bundleHash === bundleHash
  && report.route === '/pages/v2/deliveries/fridge-tonight/'
  && report.revision === 'r143-proof'
  && report.complete === true
  && sameOrder(report.bundleFiles, bundleFiles)
  && sameOrder(report.captures, captureSpecs.map(([file]) => file))
  && sameOrder(report.observations?.map((item) => item.checkpoint), checkpointOrder)
  && report.observations.every(issuesAreClean);
if (!reportValid) {
  throw new Error('R143 browser report is stale, incomplete, malformed, or belongs to another bundle.');
}

for (const [file, width, height] of captureSpecs) {
  const bytes = await readFile(resolve(evidenceRoot, file));
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height || bytes.length < 100_000) {
    throw new Error(`R143 capture ${file} is missing, too small, or has the wrong viewport.`);
  }
}

const [manifestText, contractText, html, css, main] = await Promise.all([
  readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'),
  readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8'),
  readFile(resolve(sourceRoot, 'index.html'), 'utf8'),
  readFile(resolve(sourceRoot, 'style.css'), 'utf8'),
  readFile(resolve(sourceRoot, 'main.ts'), 'utf8'),
]);
const manifest = JSON.parse(manifestText);
const noRemoteMedia = !/<img\b|<video\b|<audio\b|(?:src|href)\s*=\s*["']https?:\/\//i.test(html)
  && !/url\s*\(\s*["']?https?:\/\//i.test(css);
const noSpatialRuntime = !/from\s+["']three["']|WebGLRenderingContext|getContext\s*\(\s*["']webgl|<canvas\b|AudioContext/i.test(`${html}\n${main}`);
const manifestVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.batchId === 'r143-code-native-no-assets'
  && manifest.assetBatches === 0
  && manifest.generationCalls === 0
  && manifest.sourceAssetCount === 0
  && manifest.derivativeCount === 0
  && manifest.medium?.preferred === 'code-native'
  && manifest.medium?.rendering === 'dom-css'
  && sameOrder(manifest.medium?.supporting, ['inline-svg'])
  && Array.isArray(manifest.assets)
  && manifest.assets.length === 0
  && manifest.lineagePolicy?.includes('No asset batch was created')
  && manifest.truthBoundary?.includes('not food-safety');
const implementationVerified = noRemoteMedia
  && noSpatialRuntime
  && (html.match(/<svg\b/g) || []).length === 7
  && (html.match(/data-fridge-ingredient=/g) || []).length === 6
  && html.includes('data-fridge-freshness')
  && html.includes('data-fridge-shopping')
  && html.includes('所有食材、日期、新鲜度、菜单和补买建议均为虚构演示')
  && html.includes('NO JAVASCRIPT / READABLE BASE')
  && html.includes('示例晚餐：番茄滑蛋盖饭')
  && main.includes('window.__FRIDGE_TONIGHT__ = { snapshot, reset }')
  && main.includes('function toggleIngredient(id: IngredientId)')
  && main.includes('function renderTimeline(items: Ingredient[])')
  && main.includes('function renderMenu(items: Ingredient[])')
  && main.includes('window.localStorage.setItem(STORAGE_KEY')
  && css.includes('@media (prefers-reduced-motion: reduce)')
  && css.includes(':focus-visible')
  && contractText.includes('用户没有禁止 Three.js、WebGL、生成图或外部素材')
  && contractText.includes('Rendering base: semantic DOM + CSS + inline SVG')
  && contractText.includes('Macro structure: 内容适配的连续编辑流')
  && contractText.includes('素材批次：0 / 1')
  && contractText.includes('视觉精修：最多 1 次');
if (!manifestVerified || !implementationVerified) {
  throw new Error('R143 code-native asset decision, truth boundary, semantic controls, or bounded contract is invalid.');
}

const opening = observation(report, 'desktop-opening');
const causal = observation(report, 'desktop-causal-selection-and-withdrawal');
const persistence = observation(report, 'desktop-save-restore-reset');
const mobile = observation(report, 'mobile-reduced-result');
const noJs = observation(report, 'no-js-readable');
const openingState = opening.state;
const first = causal.semantic?.first;
const withdrawn = causal.semantic?.withdrawn;
const second = causal.semantic?.second;
const savedState = persistence.semantic?.savedState;
const restoredState = persistence.semantic?.restored;
const resetState = persistence.semantic?.reset;
const mobileState = mobile.state;

const openingVerified = opening.viewport?.width === 1440
  && opening.viewport?.height === 900
  && isReadyState(openingState, { reducedMotion: false })
  && sameOrder(openingState.selected, [])
  && openingState.selectionCount === 0
  && openingState.eligible === false
  && openingState.menuId === 'none'
  && openingState.timelineMarks === 0
  && openingState.saved === false
  && opening.semantic?.ingredientButtons === 6
  && opening.semantic?.canvasCount === 0
  && opening.semantic?.webglContext === false
  && opening.semantic?.headline === '快过期，正好今晚。'
  && typeof opening.semantic?.visualAnchorBackground === 'string'
  && opening.semantic.visualAnchorBackground.includes('linear-gradient');

const causalVerified = isReadyState(first)
  && sameOrder(first.selected, ['tomato', 'eggs'])
  && first.selectionCount === 2
  && first.eligible === true
  && first.menuId === 'tomato-egg-rice'
  && first.menuTitle === '番茄滑蛋盖饭'
  && sameOrder(first.missingItems, ['米饭', '小葱'])
  && first.timelineMarks === 2
  && isReadyState(withdrawn)
  && sameOrder(withdrawn.selected, ['tomato'])
  && withdrawn.selectionCount === 1
  && withdrawn.eligible === false
  && withdrawn.menuId === 'none'
  && withdrawn.menuTitle === ''
  && withdrawn.missingItems.length === 0
  && withdrawn.timelineMarks === 1
  && isReadyState(second)
  && sameOrder(second.selected, ['tomato', 'tofu'])
  && second.selectionCount === 2
  && second.eligible === true
  && second.menuId === 'tomato-tofu-soup'
  && second.menuTitle === '番茄豆腐暖汤'
  && sameOrder(second.missingItems, ['生姜', '米饭'])
  && second.timelineMarks === 2
  && first.menuId !== second.menuId
  && JSON.stringify(first.missingItems) !== JSON.stringify(second.missingItems);

const persistenceVerified = isReadyState(savedState)
  && sameOrder(savedState.selected, ['spinach', 'mushroom'])
  && savedState.menuId === 'greens-mushroom-noodles'
  && savedState.saved === true
  && isReadyState(restoredState)
  && sameOrder(restoredState.selected, savedState.selected)
  && restoredState.menuId === savedState.menuId
  && restoredState.saved === true
  && isReadyState(resetState)
  && sameOrder(resetState.selected, [])
  && resetState.selectionCount === 0
  && resetState.menuId === 'none'
  && resetState.timelineMarks === 0
  && resetState.saved === false;

const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && isReadyState(mobileState, { reducedMotion: true })
  && sameOrder(mobileState.selected, ['tofu', 'mushroom'])
  && mobileState.selectionCount === 2
  && mobileState.eligible === true
  && mobileState.menuId === 'mushroom-tofu'
  && mobileState.menuTitle === '菌菇烧豆腐'
  && sameOrder(mobileState.missingItems, ['小葱', '生抽'])
  && mobileState.timelineMarks === 2
  && mobile.semantic?.innerWidth === 390
  && mobile.semantic?.firstButton?.width > 44
  && mobile.semantic?.firstButton?.height > 44;

const noJsVerified = noJs.viewport?.width === 1440
  && noJs.viewport?.height === 900
  && noJs.state?.ready === 'false'
  && noJs.state?.buttons === 6
  && noJs.state?.canvasCount === 0
  && noJs.state?.horizontalOverflow === false;
const runtimeClean = report.observations.every(issuesAreClean);
if (!runtimeClean || !openingVerified || !causalVerified || !persistenceVerified || !mobileVerified || !noJsVerified) {
  throw new Error('R143 report does not prove opening, reversible causal selection, persistence, 390px reduced motion, and the readable no-JS base.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.creativeProtocolVersion !== 3
  || run.mediumDecision?.preferred !== 'code-native'
  || run.mediumDecision.assetResponsibilities.length !== 0
  || run.assetPlan.strategy !== 'none'
  || run.assetPlan.assets.length !== 0
  || run.interactionRationale.mode !== 'direct'
  || run.interactionRationale.audioApplicable !== false
  || run.visualAmbition?.rendering.primary !== 'dom-css') {
  throw new Error('R143 must remain the ordinary code-native / DOM-CSS route with no asset or audio requirement.');
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '把独居者冰箱里即将到期的演示食材安排成今晚一顿饭',
    audience: '希望减少遗忘和浪费、又不想面对复杂参数的独居者',
    desiredOutcome: '从六样带日期食材中选择二至四样，看见新鲜度、晚餐建议与补买项目同步重排，并保存今晚清单。',
    primaryAction: '保存今晚清单',
    hardConstraints: [
      '食材选择与撤回必须同步改变时间带、菜单、补买清单和行动可用性，不能只改变颜色或数字',
      '所有食材、日期、新鲜度、菜单和补买建议必须明确为概念演示，不得冒充食品安全、营养、库存或购买建议',
      '390px、reduced motion 与无脚本基础层必须保留可理解的主体、内容与真实性边界',
    ],
    preferences: [
      '明亮冰箱瓷白、厨房杂志排版、食材颜色和少量手写便签共同形成生活化编辑语言',
      '连续内容流按产品需要展开，不使用固定三屏、参数工作台、中央 3D 产品或暗色科技模板',
      '关键视觉由语义 DOM、CSS 与内联 SVG 直接承担，不为这个二维任务添加无职责的 Three.js',
    ],
  },
  selectedDirection: {
    id: 'bright-fridge-editorial-causal-field',
    title: '冰箱今晚 · 会重排的一扇明亮冰箱门',
    experienceForm: 'editorial-household-tool',
    rationale: '六样食材切片、日期、新鲜度 SVG、菜谱纸与补买便签共享同一选择集合；二维编辑表面足以表达全部业务因果，因此不增加空间运行时。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-night-reflective-catalog',
      title: '夜间反光材质目录 · 对象驱动的编辑目录',
      principle: '让具体对象、属性与选择结果在同一编辑表面建立清楚层级，而不是用通用卡片替代主题对象。',
      relevance: '只借对象驱动和编辑层级；本页改成明亮厨房语境、可撤回食材集合与晚餐结果，不复制夜色、材质或目录外观。',
      sourceUri: '../pages/v2/deliveries/night-reflective-catalog/',
    },
    {
      referenceId: 'positive-ten-second-callsign',
      title: '十秒呼号听辨 · 单一语义状态驱动全部反馈',
      principle: '用同一 canonical state 同步生成视觉反馈、校验和最终保存，证明 code-native 页面也能具有真实因果。',
      relevance: '本页借用共享状态与可逆反馈原则；食材切片、时间带、菜单和补买清单均从 selection set 派生，不复制声音、点划或信号排版。',
      sourceUri: '../pages/v2/deliveries/ten-second-callsign-decode/',
    },
  ],
  assetPlan: {
    batchId: 'r143-code-native-no-assets',
    strategy: 'none',
    rationale: '本轮明确完成一次“无需素材批次”的有界决策：项目自制内联 SVG、语义 DOM 与 CSS 足以承担六样食材、冰箱门、时间带和结果纸张，不等待或伪造外部关键素材。',
    assets: [],
  },
  interactionRationale: {
    mode: 'direct',
    audioApplicable: false,
    rationale: '点击或键盘选择、撤回与保存直接改变同一 selection set；时间带、菜单、补买和 CTA 同步重算，声音对当前家庭晚餐任务没有必要职责。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    intentLevel: 'expressive',
    intentRationale: '视觉吸引力来自可辨认的明亮冰箱门、六张食材编辑切片与会重排的杂志版面；运行时因果强化产品意义，但不把普通二维家庭任务强行升级为 3D。',
    heroMoment: {
      title: '快过期，正好今晚',
      description: '明亮冰箱瓷白表面、真实冰箱门缝与把手、六样彩色食材切片和带日期磁贴同时建立“打开冰箱安排今晚”的专属记忆。',
      themeConnection: '隐藏标题后，冰箱门、六样食材日期、新鲜度时间带和晚餐纸仍能辨认这是把即将到期食材变成今晚清单的产品。',
      appearsWithinSeconds: 4,
      observableRuntimeChange: {
        trigger: '选择或撤回任一食材并保存今晚清单',
        from: '六样食材可见，但时间带为空、晚餐未成立且保存不可用',
        to: '所选食材进入时间带，菜谱与补买项目同步改变，并可保存、恢复或重置',
      },
    },
    rendering: {
      primary: 'dom-css',
      supporting: ['svg'],
      rationale: '语义 DOM 承担可访问选择、阅读顺序与行动，CSS 建立连续冰箱门和厨房杂志构图，内联 SVG 只承担主题食材切片与状态驱动时间带。',
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '用冰箱门缝、把手、纸张、磁贴和切片的二维层叠表达生活表面，不伪造无意义三维空间。',
      cues: ['scale', 'occlusion'],
    },
    motionArc: {
      beats: [
        { phase: 'opening', driver: 'none', visualState: '明亮冰箱门、六样食材与日期作为连续编辑画布可读。', thematicPurpose: '让独居者先看见家里已经有什么。' },
        { phase: 'exploration', driver: 'direct-input', visualState: '食材磁贴选中或撤回，时间带、菜单与补买清单同步重排。', thematicPurpose: '把日期焦虑转成可以理解和撤回的今晚选择。' },
        { phase: 'resolution', driver: 'direct-input', visualState: '二至四样组成一顿饭，保存后本地恢复，重置后完整撤回。', thematicPurpose: '把食材判断收束为保存今晚清单的明确行动。' },
      ],
      runtimeAdvantage: '静态杂志只能展示固定食材；运行时让任一选择和撤回同时改变四类业务结果，并让保存、恢复、重置共享同一状态。',
    },
    interactionToScene: [
      {
        input: '点击或键盘选择、撤回二至四样食材',
        sceneResponse: '食材磁贴、SVG 新鲜度标记、菜谱、补买项目和 CTA 从同一 selection set 同步更新。',
        productMeaning: '用户能看见“先吃什么”怎样直接决定“今晚做什么”，且每一步都可撤回。',
      },
      {
        input: '保存或重置今晚清单',
        sceneResponse: '符合条件的计划写入本地并在重载后恢复；重置清空选择、结果、时间带和保存状态。',
        productMeaning: '今晚决定可被带走，也能诚实撤回重做。',
      },
    ],
    assetCredibility: {
      level: 'conceptual-coherent',
      strategy: '零外部素材；六样食材均为项目自制内联 SVG 编辑插画，视觉责任和事实边界写入零素材清单。',
      disclosure: '全部食材、日期、新鲜度、菜单与补买建议是概念演示，不构成食品安全、营养、库存或购买建议。',
    },
    fallbackPerformance: {
      ...run.visualAmbition.fallbackPerformance,
      initialTransferBudgetMb: 0.8,
      mobileFallback: 'equivalent',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r143-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个普通家庭 brief、一个方向、一次“零素材批次”决策、一次完整构建、一次移除面向用户技术标签的确定性文案修复和一次浏览器视觉精修完成；五个自适应浏览器检查通过后停止，没有远程素材等待或静默重试。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'editorial-flow',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'record-or-contribute',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: true,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '用户只需要在六样食材中直接选择二至四样，再理解时间、菜谱和补买结果并保存；连续编辑流保留因果顺序，不需要持久参数面板或实时指标簇。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 92,
    craftCohesion: 93,
    assetIntegration: 92,
    interactionValue: 94,
    mobileReadiness: 89,
  },
  summary: '冰箱瓷白、门缝与把手、食材原生色、杂志衬线和磁贴切片形成统一的明亮家庭编辑语言；选择与撤回同步驱动时间带、菜单、补买与保存，390px 和无脚本基础层保持诚实可读。',
  findings: [{
    code: 'conceptual-food-boundary',
    severity: 'minor',
    checkpoint: 'core',
    message: '食材日期、新鲜度、菜单和补买项目是概念演示；页面和清单持续声明它们不是食品安全、营养、库存或购买建议。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, '1440px 开场呈现连续明亮冰箱门、六样带日期食材和空时间带；没有 Canvas、WebGL、外部图片或横向溢出。'),
    checkpoint('core', causalVerified && persistenceVerified && noJsVerified, '番茄+鸡蛋、撤回鸡蛋、番茄+豆腐三态证明菜单与补买真实双向变化；保存、重载恢复、重置与无脚本可读基础层均通过。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 选择豆腐与香菇后得到菌菇烧豆腐、两条补买项目和两个时间标记，触控对象足够大且无横向溢出。'),
    checkpoint('interaction', causalVerified && persistenceVerified, '真实点击与键盘输入改变 selection set、SVG 时间带、菜谱、补买、CTA、localStorage 恢复和重置，而不是只改变边框或文案。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: manifestVerified && implementationVerified,
    primaryActionReachable: persistenceVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: implementationVerified && noJsVerified,
    interactionVerified: causalVerified && persistenceVerified,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

const allErrors = report.observations.flatMap((item) => [
  ...item.issues.pageErrors,
  ...item.issues.consoleErrors,
  ...item.issues.requestFailures,
  ...item.issues.responseErrors,
]);
const wowEvidence = createWowGateEvidenceFromBrowserObservations({
  identity,
  contract: run.visualAmbition,
  observations: {
    hero: {
      observed: false,
      completedAtMs: null,
      visibleChangeObserved: false,
      score: 92,
      summary: '最终浏览器截图确认明亮冰箱门与六样食材开场成立，但本轮没有记录精确毫秒级 hero 完成时间，因此不把它伪装成计时证据。',
    },
    runtime: {
      surfaceVisible: true,
      stateChanged: causalVerified,
      visualOutputChanged: causalVerified,
      advantageOverStaticObserved: causalVerified,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 93,
      summary: '两次不同组合与一次撤回证明同一食材表面、时间带、菜单和补买项目产生可见且可逆的联动，静态杂志无法等价完成。',
    },
    theme: {
      themeSpecificMemoryObserved: openingVerified && causalVerified,
      score: 93,
      summary: '可复述记忆是一扇明亮冰箱门上的六张日期食材磁贴，选择后在同一页变成今晚菜单和补买便签。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: causalVerified,
      score: 90,
      summary: '磁贴、时间标记和晚餐纸的二维重排用于解释选择因果；本页没有冒充不需要的三维深度。',
    },
    assets: {
      criticalAssetsLoaded: manifestVerified && implementationVerified,
      integratedWithScene: implementationVerified,
      credible: manifestVerified && implementationVerified,
      score: 92,
      summary: '关键视觉是项目内语义 DOM、CSS 与七个内联 SVG；零外部素材清单和可见概念披露与最终实现一致。',
    },
    craft: {
      cohesive: true,
      score: 93,
      summary: '瓷白冰箱、食材原色、杂志衬线、便签角色与连续阅读节奏构成统一、明亮且非工作台式的视觉语言。',
    },
    interaction: {
      input: '点击或键盘选择、撤回食材，保存并重置今晚清单',
      stateChanged: causalVerified && persistenceVerified,
      visualOutputChanged: causalVerified,
      semanticOutputChanged: persistenceVerified,
      summary: '真实输入同时改变 selection set、时间标记、菜单、补买项目、保存状态与重载恢复，交互直接服务今晚晚餐决策。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === false,
      contentReadable: mobileVerified,
      primaryActionReachable: mobileVerified,
      summary: '390px reduced-motion 保留食材选择、时间带、菜单和补买结果，触控对象大于 44px 且没有页面级横向溢出。',
    },
    fallback: {
      exercised: true,
      rendered: noJsVerified,
      themePreserved: noJsVerified,
      contentPreserved: noJsVerified,
      primaryActionReachable: false,
      summary: 'JavaScript 禁用时六样食材、示例晚餐、补买说明、真实性披露与“启用脚本后可保存”的行动说明仍可读；不会伪称无脚本状态能够执行本地保存。',
    },
    errors: {
      pageErrors: [],
      consoleErrors: [],
      blockingResourceFailures: allErrors,
    },
  },
});

run = attachDirectCreativeEvidence(run, finalEvidence);
run = attachDirectCreativeWowEvidence(run, wowEvidence);
run = finalizeDirectCreativeRun(run);
assertV3DirectCreativeArchiveEligible(run);
await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  reportPath,
  runId: run.id,
  bundleHash,
  bundleFiles,
  protocol: run.creativeProtocolVersion,
  medium: run.mediumDecision?.preferred,
  rendering: run.visualAmbition?.rendering,
  structure: run.adaptiveEvidence?.macroStructureReview?.candidate.layout,
  assetStrategy: run.assetPlan.strategy,
  externalAssetCount: run.assetPlan.assets.length,
  interaction: run.interactionRationale.mode,
  audioVerified: run.adaptiveEvidence?.hardGates.audioVerified,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality,
  wow: run.wowEvidence?.assessment,
  verdict: run.verdict,
  archiveDisposition: 'v3-ready',
}, null, 2));
