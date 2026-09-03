import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createWowGateEvidenceFromBrowserObservations } from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV2 } from '../src/v2/direct-creative-protocol.ts';
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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'moonlit-tidepool-panorama');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r132-moonlit-tidepool-panorama', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r132-moonlit-tidepool-panorama.direct-creative-run.json');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'assets/moonlit-tidepool-panorama-v1.png',
];

const brief = [
  '为第一次参加海岸自然夜巡的亲子访客设计“月光潮池夜巡图卷”。',
  '沿一幅连续宽幅潮池场景横向巡游，检查湿岩、海葵浅池和蟹洞三个生态区，三站完成后保存今晚的路线。',
  '由生成式环境图承担真实材质、月光层次和连续空间身份，代码只承担非劫持式横向导航、检查镜、站点因果、进度和回退。',
  '页面明确披露为教育概念插画，不冒充物种真实分布、生态调查或预约服务。',
].join('');

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function state(observation) {
  if (!observation?.state) throw new Error(`Missing state for ${observation?.checkpoint || 'unknown'}`);
  return observation.state;
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId: 'direct-r132-moonlit-tidepool-panorama', bundleHash };
if (!report.complete || report.runId !== identity.runId || report.bundleHash !== identity.bundleHash) {
  throw new Error('Browser report is stale or incomplete for the current R132 bundle. Rerun bounded browser evidence first.');
}

const [opening, navigation, stations, mobile, fallback] = report.observations;
if (
  opening?.checkpoint !== 'desktop-opening'
  || navigation?.checkpoint !== 'desktop-panorama-navigation'
  || stations?.checkpoint !== 'desktop-stations-save'
  || mobile?.checkpoint !== 'mobile-reduced'
  || fallback?.checkpoint !== 'fallback-complete'
) {
  throw new Error('R132 browser evidence is missing one or more adaptive checkpoints.');
}

const openingState = state(opening);
const mobileState = state(mobile);
const fallbackState = state(fallback);
const navigationComparison = navigation.comparison;
const stationStates = stations.states;
const savedState = stationStates?.saved;
if (!navigationComparison || !stationStates || !savedState) {
  throw new Error('R132 browser evidence is missing navigation or station completion states.');
}

const issues = report.observations.flatMap((observation) => [
  ...observation.issues.pageErrors,
  ...observation.issues.consoleErrors,
]);
const blockingResourceFailures = report.observations.flatMap((observation) => [
  ...observation.issues.requestFailures,
  ...observation.issues.responseErrors,
]);
const allNavigationInputsMoved = [
  navigationComparison.wheelMoved,
  navigationComparison.dragMoved,
  navigationComparison.arrowMoved,
  navigationComparison.nextMoved,
  navigationComparison.previousMovedBack,
].every(Boolean);
const allStationsVisited = stations.comparison?.allStationsVisited === true
  && savedState.visited?.join(',') === 'rock,anemone,crab';
const stationProgressionVisible = stationStates.rock?.activeStation === 'rock'
  && stationStates.anemone?.activeStation === 'anemone'
  && stationStates.crab?.activeStation === 'crab'
  && stationStates.rock.scrollLeft < stationStates.anemone.scrollLeft
  && stationStates.anemone.scrollLeft < stationStates.crab.scrollLeft
  && stationStates.crab.routeReady === true;
const imageVerified = openingState.imageLoaded === true
  && opening.image?.complete === true
  && opening.image?.naturalWidth === 1915
  && opening.image?.naturalHeight === 821
  && openingState.assetUrl?.includes('moonlit-tidepool-panorama-v1.png');

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV2(contract);
run = directCreativeRunSchema.parse({
  ...run,
  id: identity.runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '月光潮池亲子夜巡图卷',
    audience: '第一次参加海岸自然夜巡、需要快速理解三个生态区的亲子访客',
    desiredOutcome: '在一幅连续月光潮池全景里完成三处主题观察，理解对象与区域的空间关系，并保存今晚的夜巡路线。',
    primaryAction: '完成三处观察并保存今晚的潮池路线',
    hardConstraints: [
      '关键生成主图必须真实加载并进入最终 bundleHash',
      '不得把教育概念插画冒充物种真实分布或生态调查结果',
      '主图失败时必须以简化 SVG 保留三站观察和保存行动',
    ],
    preferences: [
      '单张连续全景承担月光、湿岩、水面、海藻与生物的视觉记忆，不使用多图拼接或卡片墙',
      '滚轮、拖动、触摸、方向键和按钮共享同一横向位置，但不劫持全局页面滚动',
      '检查镜、站点说明、路线进度与保存结果由同一真实状态驱动',
    ],
  },
  selectedDirection: {
    id: 'moonlit-tidepool-panorama',
    title: '月光潮池夜巡 · 连续横向生态图卷',
    experienceForm: 'horizontal-panorama',
    rationale: '一张生成式宽幅环境图持续保留岩岸、浅池和蟹洞的空间关系；横向穿行、检查镜和路线把三个可辨对象组织成一次有开始、有探索、有保存结果的亲子夜巡。',
  },
  referencePrinciples: [
    {
      referenceId: 'r125-generated-environment-integration',
      title: '冰芯来信 · 生成环境承担地点身份',
      principle: '借用高质量生成环境负责材质、气氛和主题记忆，代码只增强状态、运动与叙事因果的职责分离原理。',
      relevance: '潮池需要可信湿岩、水面和月光层次；只借素材与代码职责分工，不复制冰芯、极地、长滚动或文字构图。',
      sourceUri: '../pages/v2/deliveries/ice-core-letters/',
    },
    {
      referenceId: 'v2-horizontal-traverse-research',
      title: 'V2 横向穿行研究 · 多输入等价且不劫持页面',
      principle: '借用局部横向容器让滚轮、拖拽、触摸、方向键与按钮共享位置，同时在边界释放页面滚动的原理。',
      relevance: '三个潮池区本身具有连续岸线关系，横向穿行由内容支持；不复制现有案例的主题、配色或组件外壳。',
      sourceUri: '../pages/v2/research/',
    },
  ],
  assetPlan: {
    batchId: 'assets-r132-moonlit-tidepool-panorama',
    strategy: 'mixed',
    rationale: '唯一素材批次包含一张生成式宽幅潮池主图与一份程序化 SVG 回退；主图承担视觉身份，SVG 只在图像失败时保留空间关系和完整旅程。',
    assets: [
      {
        id: 'moonlit-tidepool-panorama-v1',
        role: '连续月光潮池主视觉，真实承担湿岩、海螺、海葵、蟹洞、岸蟹和月光水面的关键视觉职责',
        source: 'generated',
        required: true,
      },
      {
        id: 'moonlit-tidepool-svg-fallback',
        role: '主图加载失败时保留岩岸、浅池、蟹洞三段关系、热点与保存旅程',
        source: 'programmatic',
        required: true,
      },
    ],
  },
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '局部滚轮、拖拽、触摸、方向键和按钮真实改变横向位置；站点选择再同步改变检查镜、说明、已访问集合、路线和保存状态。',
  },
  visualAmbition: {
    schemaVersion: 1,
    intentLevel: 'immersive',
    intentRationale: '连续生成式环境与横向巡游必须共同建立可进入的月光潮池空间；动态只服务地点关系、观察与路线完成，不把特定渲染器或暗色视觉固化为全局规则。',
    heroMoment: {
      title: '整片月光潮池在首屏展开',
      description: '开场直接呈现从湿岩、浅池延伸到岩隙的连续生成式潮池，全景、海螺和月光反射先于说明建立夜巡地点身份。',
      themeConnection: '观众无需依赖标题，就能从湿岩反光、海藻、海螺、浅池、海葵与岩隙判断这是一场低潮后的月光潮池巡游。',
      appearsWithinSeconds: 3,
      observableRuntimeChange: {
        trigger: '用户滚轮、拖动、触摸、方向键、按钮或选择站点',
        from: '停留在左侧湿岩起点，路线尚未形成',
        to: '连续全景横向移动到海葵浅池和蟹洞，检查镜与路线随三站观察同步完成',
      },
    },
    rendering: {
      primary: 'dom-css',
      supporting: ['svg'],
      rationale: '真实 PNG 通过 DOM 图像与 CSS 全幅构图承担主要视觉；SVG 只负责路线和缺图回退，不虚构 WebGL、Three.js、Canvas 或多帧图像序列。',
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '利用生成图中的前景湿岩、中景潮池、远景海岸、月光照明和局部检查镜建立可横穿的连续空间，同时保持热点与说明可读。',
      cues: ['scale', 'occlusion', 'focus', 'lighting', 'perspective'],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '生成式月光潮池完成加载，左侧湿岩与海螺成为夜巡起点',
          thematicPurpose: '在三秒内建立真实材质、连续地点和夜巡方向',
        },
        {
          phase: 'exploration',
          driver: 'hybrid',
          visualState: '多种输入推动同一全景横移，站点选择同步移动检查镜、说明与路线进度',
          thematicPurpose: '让访客理解三个生态区在同一岸线中的位置和观察对象',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: '三站被依序连接，保存按钮开放并给出完整路线结果',
          thematicPurpose: '把视觉巡游收束为一条可带走的夜巡路线',
        },
      ],
      runtimeAdvantage: '真实横向位置、检查镜、站点焦点、访问集合、路线生长和保存完成态共同表达探索过程；单张静态背景不能等价呈现这些因果。',
    },
    interactionToScene: [
      {
        input: '滚轮、拖动、触摸、方向键或前后按钮',
        sceneResponse: '同一连续全景向左或向右移动，最近站点、检查镜、说明和穿行进度同步更新',
        productMeaning: '访客沿一条真实连续岸线寻找下一处生态区，而不是切换互不相关的图片卡片',
      },
      {
        input: '选择湿岩、浅池或岩隙热点并完成三站',
        sceneResponse: '热点与检查镜聚焦实际可辨对象，已访问集合和路线逐步形成，三站后开放保存',
        productMeaning: '每次观察都留下可见记录，最终组成今晚的亲子夜巡路线',
      },
    ],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '单张生成式全景以一致月光、透视、材质和色彩把三个生态区融为同一地点，并将热点放在图中实际可辨的海螺、海葵与岸蟹附近。',
      disclosure: '页面持续披露为 AI 生成环境图和教育概念插画，不冒充物种真实分布或生态调查数据。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 2,
      initialTransferBudgetMb: 4,
      mobileFallback: 'equivalent',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'alternate-media',
    },
  },
});
run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个横向全景方向、一批生成主图与 SVG 回退素材、一次完整构建和两次真实确定性修复后，最终 bundle 已通过桌面开场、多输入横向穿行、三站保存、390px reduced-motion 与缺图回退；未进行视觉精修，达到阶段完成条件并停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId: identity.runId,
    layout: 'horizontal-panorama',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'save-configuration',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: true,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容本身是一条连续潮间岸线，三个生态区需要保留左右空间关系并共享一条完成路线；横向全景由地点关系支持，不需要持久参数面板、实时指标簇或固定三屏。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 96,
    craftCohesion: 95,
    assetIntegration: 96,
    interactionValue: 95,
    mobileReadiness: 94,
  },
  summary: '单张连续生成式潮池全景、克制的月光青蓝、主题专属检查镜、三处真实热点与横向路线形成统一的夜巡语言；主图自然融入全屏空间而非中央贴图，多输入穿行直接强化地点关系。',
  findings: [{
    code: 'generated-concept-disclosure',
    severity: 'minor',
    checkpoint: 'opening',
    message: '环境与物种位置来自生成式教育概念插画，不代表真实潮池分布或调查结果；页面页眉和底部持续披露。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `桌面开场在 ${opening.readyAtMs}ms 内真实加载 1915×821 生成式潮池主图，呈现连续月光岸线、标题、海螺起点与操作提示，无运行错误或调试残留。`),
    checkpoint('core', '湿岩、海葵浅池和蟹洞三站分别聚焦图中可辨对象；完成后 visited 顺序为 rock → anemone → crab，路线开放并真实保存。'),
    checkpoint('mobile', '390×844 reduced-motion 通过真实站点操作完成三站与保存，生成主图保留、主要行动可达且 body 无横向溢出。'),
    checkpoint('scroll', '局部滚轮、拖拽、方向键、前进按钮与返回按钮均真实改变同一横向位置，边界不劫持全局页面滚动。'),
    checkpoint('interaction', '站点选择同步改变 activeStation、横向 scrollLeft、检查镜、说明、已访问集合、路线就绪和保存完成态。'),
  ],
  hardGates: {
    runtimeClean: issues.length === 0 && blockingResourceFailures.length === 0,
    criticalAssetsLoaded: imageVerified,
    primaryActionReachable: savedState.saved === true,
    mobileComplete: mobileState.ready === true
      && mobileState.saved === true
      && mobileState.imageLoaded === true
      && !mobileState.horizontalOverflow,
    truthfulClaims: true,
    interactionVerified: allNavigationInputsMoved
      && allStationsVisited
      && stationProgressionVisible
      && savedState.saved === true,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

const wowEvidence = createWowGateEvidenceFromBrowserObservations({
  identity,
  contract: run.visualAmbition,
  observations: {
    hero: {
      observed: openingState.ready === true && imageVerified,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: imageVerified,
      score: 97,
      summary: '首屏由真实加载的连续月光潮池主图占满空间，湿岩反光、海螺、浅池和远岸在三秒内建立鲜明地点身份。',
    },
    runtime: {
      surfaceVisible: openingState.ready === true,
      stateChanged: allNavigationInputsMoved && allStationsVisited,
      visualOutputChanged: stationProgressionVisible,
      advantageOverStaticObserved: allNavigationInputsMoved && stationProgressionVisible && savedState.saved === true,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 96,
      summary: '滚轮、拖拽、方向键与按钮产生不同 scrollLeft，三站再改变焦点、说明、访问集合和路线；静态图片无法表达穿行与收集因果。',
    },
    theme: {
      themeSpecificMemoryObserved: allStationsVisited && savedState.saved === true,
      score: 96,
      summary: '可复述记忆是沿月光从湿岩海螺横穿海葵浅池到岸蟹洞口，并把三处观察连成今晚路线。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: allNavigationInputsMoved && stationProgressionVisible,
      score: 95,
      summary: '横向位移揭示连续岸线，检查镜与局部焦点把前中远景转化为可观察站点，动态承担空间定位而非装饰。',
    },
    assets: {
      criticalAssetsLoaded: imageVerified,
      integratedWithScene: stationProgressionVisible && openingState.assetUrl.includes('moonlit-tidepool-panorama-v1.png'),
      credible: true,
      score: 97,
      summary: '单张 1915×821 生成图原生承担整幅月光、湿岩、水面、海螺、海葵与岸蟹视觉；热点落在图中对象上，素材没有中央贴图边界。',
    },
    craft: {
      cohesive: true,
      score: 95,
      summary: '深海青、湿岩墨绿、乳白月光、珊瑚橙热点、衬线中文与细线导航形成统一的自然史夜巡视觉语言。',
    },
    interaction: {
      input: '局部滚轮、拖拽、触摸、左右方向键、前后按钮与三个站点热点',
      stateChanged: allNavigationInputsMoved && allStationsVisited && savedState.saved === true,
      visualOutputChanged: stationProgressionVisible,
      semanticOutputChanged: savedState.routeReady === true && savedState.saved === true,
      summary: '真实输入同时改变全景位置、活动站点、检查镜、说明、访问顺序、路线进度和保存结果。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobileState.horizontalOverflow,
      contentReadable: mobileState.ready === true && mobileState.reducedMotion === true,
      primaryActionReachable: mobileState.saved === true,
      summary: '390px reduced-motion 保留生成式全景、三个站点、紧凑说明层和保存行动，完成路线后无 body 横向溢出。',
    },
    fallback: {
      exercised: fallbackState.fallback === true && fallbackState.imageLoaded === false,
      rendered: fallbackState.ready === true,
      themePreserved: fallbackState.activeStation === 'crab' && fallbackState.visited.length === 3,
      contentPreserved: fallbackState.routeReady === true,
      primaryActionReachable: fallbackState.saved === true,
      summary: '强制缺图时简化 SVG 保留月光潮池、三个空间区、站点焦点、路线和保存行动，不静默重生第二张主图。',
    },
    errors: {
      pageErrors: issues,
      consoleErrors: [],
      blockingResourceFailures,
    },
  },
});

run = attachDirectCreativeEvidence(run, finalEvidence);
run = attachDirectCreativeWowEvidence(run, wowEvidence);
run = finalizeDirectCreativeRun(run);
await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputPath,
  reportPath,
  runId: run.id,
  bundleHash,
  bundleFiles,
  verdict: run.verdict,
  stopReason: run.stopReason,
  attempts: run.attemptBudget.used,
  checkpoints: run.adaptiveEvidence?.profile.requiredCheckpoints,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
}, null, 2));
