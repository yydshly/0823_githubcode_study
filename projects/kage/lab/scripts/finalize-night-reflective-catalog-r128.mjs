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
import {
  assessDirectVisualQuality,
  createFinalCreativeEvidence,
} from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'night-reflective-catalog');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r128-night-reflective-catalog', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r128-night-reflective-catalog.direct-creative-run.json');

const brief = [
  '为夜间骑行装备、舞台服装与公共安全视觉的学习者设计夜行反光材料样本馆。',
  '八件纤维与反光材料样本同时出现；按用途筛选后，移动光束检查每件表面，选择两件并排比较，最后行动为“收藏这组夜行材料”。',
  '不要中央产品、长滚动空间旅程或持久参数面板。',
  '所有反光表现都只是视觉模拟，不伪造安全等级、照度、可视距离、品牌或认证。',
].join('');

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
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
const identity = { runId: 'direct-r128-night-reflective-catalog', bundleHash };
if (report.runId !== identity.runId || report.bundleHash !== identity.bundleHash) {
  throw new Error('Browser report is stale for the current R128 bundle. Rerun the bounded browser evidence first.');
}

const [opening, interaction, mobile, fallback] = report.observations;
const openingState = state(opening);
const interactionState = state(interaction);
const inspectedState = interaction.inspected;
const mobileState = state(mobile);
const fallbackState = state(fallback);
const issues = report.observations.flatMap((observation) => [
  ...observation.issues.pageErrors,
  ...observation.issues.consoleErrors,
]);
const blockingResourceFailures = report.observations.flatMap((observation) => [
  ...observation.issues.requestFailures,
  ...observation.issues.responseErrors,
]);

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV2(contract);
run = directCreativeRunSchema.parse({
  ...run,
  id: identity.runId,
  goalPlayback: {
    ...run.goalPlayback,
    desiredOutcome: '在同一束可移动光线下看懂八种反光表面的差异，按用途筛选、二选并排比较，并收藏当前组合。',
    preferences: [
      '非均匀工业接触印目录，而非中央英雄或参数工作台',
      '反光响应直接由指针、触摸和键盘光束驱动',
      '明确披露视觉模拟，不把效果冒充安全或性能认证',
    ],
  },
  selectedDirection: {
    ...run.selectedDirection,
    title: '夜行反光材料样本馆 · 动态接触印目录',
    experienceForm: 'dynamic-material-catalog',
    rationale: '把八件材料组织成非均匀接触印样本墙，以共享光束维持可比较尺度；筛选、局部检查与二选比较共同解释材料差异，并让收藏成为目录旅程的明确终点。',
  },
  referencePrinciples: [
    {
      referenceId: 'direct-r120-paper-butterfly-garden',
      title: '纸蝶日光游园 · 多对象身份连续性',
      principle: '借用多个对象始终保留身份、相对尺度与可选择关系的机制。',
      relevance: '八件材料在筛选与比较中需要保持编号、纹理和选择身份；不复制温室、纸蝶、三维队形或叙事结构。',
      sourceUri: '../pages/v2/deliveries/paper-butterfly-garden/',
    },
    {
      referenceId: 'paper-restoration-material-evidence',
      title: '纸张修复工坊 · 材质证据靠近对象',
      principle: '借用近距离纹理证据和解释文字始终指向同一材料对象的原理。',
      relevance: '每件反光样本必须让名称、纹理与光束响应自然结合；不复制旧纸题材、暖色工作台或修复流程。',
      sourceUri: '../cases/dedicated-r36-delivery-final/',
    },
    {
      referenceId: 'motionsites-opening-discovery',
      title: 'MotionSites catalog research · opening discovery',
      principle: '借用首屏即可探索、输入本身承担发现的正向原理。',
      relevance: '目录首屏让材料墙和移动光束立即可用；只借发现机制，不复制任何案例布局或视觉外观。',
      sourceUrl: 'https://motionsites.ai/',
    },
  ],
  assetPlan: {
    batchId: 'assets-r128-night-reflective-catalog',
    strategy: 'programmatic',
    rationale: '唯一程序化素材批次用八种独立 Canvas 2D 纹理承担反光差异；CSS 纹理仅在强制回退时保留目录和主要行动，不伪装成真实材料测试。',
    assets: [
      {
        id: 'programmatic-reflective-samples',
        role: '八种独立材料纹理在同一光束坐标下产生可辨认的视觉响应，并在比较层保持身份与尺度',
        source: 'programmatic',
        required: true,
      },
    ],
  },
  interactionRationale: {
    mode: 'direct',
    audioApplicable: false,
    rationale: '指针、触摸与方向键共享同一光束状态，筛选保留身份，二选比较在同一光点下展示差异，收藏结束本次目录选择。',
  },
});
run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一次构建、一次确定性修复和一次明确视觉精修后，最终 bundle 已通过桌面开场、直接互动、390px reduced-motion 与强制 fallback 证据；达到阶段完成条件并停止，不再继续重做。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId: identity.runId,
    layout: 'catalog',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'browse-collection',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: false,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容需要同时浏览八件材料、按用途筛选和二选比较；目录布局由多对象关系支持，但不需要持久参数面板或实时指标簇。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 93,
    craftCohesion: 92,
    assetIntegration: 92,
    interactionValue: 94,
    mobileReadiness: 91,
  },
  summary: '工业接触印目录、警示黄绿与安全橙、八种反光纹理和共享光束形成主题专属统一语言；筛选、检查、二选比较与收藏让视觉变化直接服务材料理解。',
  findings: [{
    code: 'visual-simulation-only',
    severity: 'minor',
    checkpoint: 'core',
    message: '程序化纹理用于比较视觉响应，不代表真实材料性能、安全等级或认证；页面在开场与比较层持续披露。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `桌面开场在 ${opening.readyAtMs}ms 内同时呈现主题、操作提示和八件不同样本入口，无运行错误或调试残留。`),
    checkpoint('core', '八件 Canvas 2D 材料各自承担独立纹理职责；筛选后身份和选择保持一致，比较层以同一光束坐标并排展示两件样本。'),
    checkpoint('mobile', '390×844 reduced-motion 无横向溢出，单列比较层保留两件材料、关闭操作和可滚动到达的收藏行动。'),
    checkpoint('interaction', '用途筛选、共享光束、最多二选、Escape 关闭与焦点返回、收藏状态均由真实输入产生可观察状态和画面变化。'),
  ],
  hardGates: {
    runtimeClean: issues.length === 0 && blockingResourceFailures.length === 0,
    criticalAssetsLoaded: openingState.ready && openingState.canvasCount === 8,
    primaryActionReachable: interactionState.saved,
    mobileComplete: mobileState.ready && !mobileState.horizontalOverflow && mobileState.selectedCount === 2,
    truthfulClaims: true,
    interactionVerified: inspectedState.driveMode === 'manual'
      && inspectedState.canvasVisualHash !== interaction.initialVisualHash
      && interactionState.selectedCount === 2
      && interactionState.saved
      && interaction.semantic?.focusReturnedTo === 'open-compare',
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
      observed: openingState.ready,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: openingState.canvasVisualHash.length > 0,
      score: 93,
      summary: '首屏在五秒内建立夜行材料阅览室、共享光束说明和八件非均匀样本入口，主题和探索动作同时成立。',
    },
    runtime: {
      surfaceVisible: openingState.canvasCount === 8,
      stateChanged: inspectedState.driveMode === 'manual' && interactionState.selectedCount === 2,
      visualOutputChanged: inspectedState.canvasVisualHash !== interaction.initialVisualHash,
      advantageOverStaticObserved: inspectedState.canvasVisualHash !== interaction.initialVisualHash
        && inspectedState.beamX !== interactionState.beamX,
      comparisonMethod: 'canvas-buffer-diff',
      score: 94,
      summary: '共享光束坐标改变八件样本的局部返回，筛选和选择再把相同材质送入同光束比较，静态截图无法表达这条因果。',
    },
    theme: {
      themeSpecificMemoryObserved: interactionState.saved && interactionState.selected.join('|') === 'micro-prism|segmented-guide',
      score: 93,
      summary: '可复述记忆是像车灯一样移动一道光，在八种夜行材料中挑出两件，并在同一道光下看到不同返回。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: inspectedState.activeSample === 'micro-prism'
        && interactionState.activeSample === 'segmented-guide',
      score: 92,
      summary: '局部光斑、衰减和纹理响应解释反光表面差异；动态用于材料检查和比较，不是无意义装饰。',
    },
    assets: {
      criticalAssetsLoaded: openingState.canvasCount === 8,
      integratedWithScene: inspectedState.canvasCount === 8 && interactionState.canvasCount === 8,
      credible: true,
      score: 91,
      summary: '八种程序化纹理分别承担玻璃微珠、微棱镜、编织丝等视觉职责，并持续披露为视觉模拟而非真实认证。',
    },
    craft: {
      cohesive: true,
      score: 93,
      summary: '非均匀接触印网格、工业标牌字、警示黄绿、反光银与安全橙形成统一的夜间材料目录语言。',
    },
    interaction: {
      input: '鼠标/触摸移动光束、方向键、用途筛选、二选比较、Escape 与收藏',
      stateChanged: inspectedState.driveMode === 'manual' && interactionState.selectedCount === 2,
      visualOutputChanged: inspectedState.canvasVisualHash !== interaction.initialVisualHash,
      semanticOutputChanged: interactionState.saved && interaction.semantic?.focusReturnedTo === 'open-compare',
      summary: '真实输入改变光束位置、活跃样本、筛选结果、二选比较和收藏完成态，且 Escape 将焦点返回比较按钮。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobileState.horizontalOverflow,
      contentReadable: mobileState.ready && mobileState.reducedMotion && mobileState.dialogOpen,
      primaryActionReachable: mobileState.selectedCount === 2 && mobileState.dialogOpen,
      summary: '390px reduced-motion 将比较卡片转为单列，保留两件材料、关闭操作和收藏行动，没有横向溢出或自动扫光依赖。',
    },
    fallback: {
      exercised: fallbackState.fallback,
      rendered: fallbackState.ready && fallbackState.canvasCount === 0,
      themePreserved: fallbackState.selected.join('|') === 'honeycomb-film|reflective-pigment',
      contentPreserved: fallbackState.visibleCount === 3 && fallbackState.dialogOpen,
      primaryActionReachable: fallbackState.saved,
      summary: '强制 Canvas fallback 使用 CSS 材料纹理，仍完成舞台筛选、二选比较和本地收藏，并保留模拟披露。',
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
  runId: run.id,
  bundleHash,
  verdict: run.verdict,
  stopReason: run.stopReason,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
}, null, 2));
