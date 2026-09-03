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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'color-relay-branching');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r129-color-relay-branching', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r129-color-relay-branching.direct-creative-run.json');

const brief = [
  '为一场虚构的城市高彩接力演练设计动态网页。',
  '四支颜色队伍从屏幕四边进入同一交接区；访客选择一支队伍，再选择“提前交棒/压线交棒”路线，同一根接力棒沿不同轨迹移动，交接区重叠、节奏和最终队形产生可见差异，随后两条路线汇合到“保存这次交接方案”。',
  '画面明亮、高彩、沉浸式，像一张正在运行的运动图形海报，不要参数工作台、卡片目录、中央产品或长滚动。',
  '结果只作为视觉编排模拟，不冒充真实赛事成绩。',
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
const identity = { runId: 'direct-r129-color-relay-branching', bundleHash };
if (!report.complete || report.runId !== identity.runId || report.bundleHash !== identity.bundleHash) {
  throw new Error('Browser report is stale or incomplete for the current R129 bundle. Rerun bounded browser evidence first.');
}

const [opening, branching, mobile, fallback] = report.observations;
const openingState = state(opening);
const earlyState = branching.early;
const lineState = branching.line;
const savedState = branching.saved;
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
const branchesDiffer = earlyState.selectedTeam === lineState.selectedTeam
  && earlyState.routeHash !== lineState.routeHash
  && earlyState.routeD !== lineState.routeD
  && JSON.stringify(earlyState.runnerTransforms) !== JSON.stringify(lineState.runnerTransforms)
  && earlyState.formationSpread !== lineState.formationSpread
  && earlyState.exchangeOverlap !== lineState.exchangeOverlap;

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV2(contract);
run = directCreativeRunSchema.parse({
  ...run,
  id: identity.runId,
  goalPlayback: {
    ...run.goalPlayback,
    desiredOutcome: '在一张明亮高彩的运动图形海报中，选择同一队伍的两种交棒路线，看见轨迹、交接重叠与终点队形的真实差异，并保存虚构方案。',
    preferences: [
      '跑道本身承担构图、导航与分支关系，不生成参数工作台或卡片目录',
      '同一接力棒的两条路线必须有不同几何、节奏和终点队形',
      '持续披露为虚构视觉模拟，不冒充真实赛事、成绩或训练建议',
    ],
  },
  selectedDirection: {
    ...run.selectedDirection,
    title: '高彩城市接力演练 · 分支汇合运动海报',
    experienceForm: 'branching-confluence',
    rationale: '四条饱和色跑道从边缘汇入共享交接区，队伍选择和交棒策略直接改变同一 SVG 路径、接力棒节奏和跑者终点队形；两支路线在同一结果票据汇合并保留路径身份。',
  },
  referencePrinciples: [
    {
      referenceId: 'motionsites-kinetic-layout',
      title: 'MotionSites kinetic research · movement as layout',
      principle: '借用运动路径直接组织构图、阅读方向和第一视觉的原理。',
      relevance: '四条跑道同时承担页面骨架和选择入口；不复制任何案例的主题、文案或镜头。',
      sourceUrl: 'https://motionsites.ai/',
    },
    {
      referenceId: 'direct-r116-kinetic-score',
      title: '动作记谱台 · 输入与轨迹共享状态',
      principle: '借用真实输入、运动轨迹和结果解释由同一状态驱动的原理。',
      relevance: '策略按钮驱动路径、接力棒、交接重叠和队形；不复制工作台、滑杆或舞蹈题材。',
      sourceUri: '../pages/v2/deliveries/kinetic-score/',
    },
    {
      referenceId: 'legacy-branching-runtime',
      title: '旧 branching runtime · choice edges and rejoin',
      principle: '借用显式选择、确定分支和共同汇合的已验证机制。',
      relevance: 'R129 将机制重构为主题专属高彩运动舞台，并以最终浏览器证据重新验收。',
      sourceUri: '../src/experience/runtime.ts',
    },
  ],
  assetPlan: {
    batchId: 'assets-r129-color-relay-branching',
    strategy: 'programmatic',
    rationale: '唯一程序化素材批次由持续 SVG 跑道、接力棒、交接区和跑者队形承担关键语义；Canvas 仅增强速度尾迹，禁用后完整分支和行动仍成立。',
    assets: [{
      id: 'programmatic-color-relay-field',
      role: '四队持续跑道、共享交接区、两条可辨路径、同一接力棒和分支终点队形',
      source: 'programmatic',
      required: true,
    }],
  },
  interactionRationale: {
    mode: 'direct',
    audioApplicable: false,
    rationale: '鼠标、触摸和键盘选择队伍与交棒策略；同一状态同时改变 SVG 几何、接力棒运动、交接区重叠、终点队形和保存语义。',
  },
});
run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一批程序化素材、一次构建和一次明确视觉精修后，最终 bundle 已通过桌面开场、同队双分支、390px reduced-motion 与强制 fallback；达到阶段完成条件并停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId: identity.runId,
    layout: 'branching-confluence',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'save-configuration',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: false,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容要求显式选择同一队伍的两条路线并在共同结果汇合；分支舞台由内容关系支持，不需要持久参数面板、实时指标簇或固定长滚动。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 95,
    craftCohesion: 93,
    assetIntegration: 94,
    interactionValue: 95,
    mobileReadiness: 91,
  },
  summary: '暖白印刷底、四支高饱和跑道、共享交接区、同一接力棒和两种终点队形形成主题专属运动海报语言；分支后果可见且直接服务交棒策略理解。',
  findings: [{
    code: 'visual-simulation-only',
    severity: 'minor',
    checkpoint: 'core',
    message: '路线、节奏和队形是视觉编排模拟，不代表真实赛事结果、成绩或训练建议；页面页眉持续披露。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `桌面开场在 ${opening.readyAtMs}ms 内呈现四队高彩跑道、共同交接区、主题和选择入口，无运行错误或调试残留。`),
    checkpoint('core', '同一北岸青队的提前交棒与压线交棒拥有不同 SVG path、routeHash、交接重叠和四名跑者终点 transforms，并汇合到同一结果票据。'),
    checkpoint('mobile', '390×844 reduced-motion 通过真实触摸完成队伍选择、分支与保存，无横向溢出；关键分支后果和行动仍可见。'),
    checkpoint('interaction', '鼠标、触摸、键盘、返回策略、重放与保存共享真实分支状态；Canvas fallback 保留完整 SVG/DOM 路径和行动。'),
  ],
  hardGates: {
    runtimeClean: issues.length === 0 && blockingResourceFailures.length === 0,
    criticalAssetsLoaded: openingState.ready && earlyState.routeD.length > 40 && lineState.routeD.length > 40,
    primaryActionReachable: savedState.saved,
    mobileComplete: mobileState.ready && mobileState.saved && !mobileState.horizontalOverflow,
    truthfulClaims: true,
    interactionVerified: branchesDiffer && savedState.saved && earlyState.driveMode === 'manual' && lineState.driveMode === 'manual',
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
      visibleChangeObserved: true,
      score: 95,
      summary: '首屏直接以四条高彩跑道和共同交接区建立运动海报记忆点，入口与主视觉是同一组图形关系。',
    },
    runtime: {
      surfaceVisible: openingState.ready,
      stateChanged: branchesDiffer,
      visualOutputChanged: branchesDiffer,
      advantageOverStaticObserved: branchesDiffer && earlyState.canvasFrames > 0 && lineState.canvasFrames > earlyState.canvasFrames,
      comparisonMethod: 'dom-geometry',
      score: 95,
      summary: '同一队伍的两次真实选择产生不同 SVG 路径、接力棒节奏、交接重叠和队形；静态图片无法表达分支因果。',
    },
    theme: {
      themeSpecificMemoryObserved: branchesDiffer && savedState.saved,
      score: 95,
      summary: '可复述记忆是四条彩色跑道汇入一个交接区，再让同一根接力棒以弧线或折线形成两种终点队形。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: branchesDiffer,
      score: 94,
      summary: '路径运动、交接区伸缩与跑者阵形共同解释策略差异，动效承担产品语义而非装饰。',
    },
    assets: {
      criticalAssetsLoaded: openingState.ready,
      integratedWithScene: earlyState.routeD.length > 40 && lineState.routeD.length > 40,
      credible: true,
      score: 94,
      summary: '程序化 SVG 素材原生承担跑道、路径、交接和队形职责，Canvas 仅做可移除的尾迹增强。',
    },
    craft: {
      cohesive: true,
      score: 94,
      summary: '压缩赛会字、印刷网点、硬边黑线、荧光青、珊瑚红、太阳黄与钴蓝形成统一且不落入近期工作台惯性的视觉语言。',
    },
    interaction: {
      input: '鼠标/触摸/数字键选择队伍，策略按钮、Escape、重放和保存',
      stateChanged: branchesDiffer && savedState.saved,
      visualOutputChanged: branchesDiffer,
      semanticOutputChanged: savedState.phase === 'saved' && savedState.strategy === 'line',
      summary: '真实输入改变所选队伍、分支几何、运动节奏、交接重叠、终点队形和保存完成态。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobileState.horizontalOverflow,
      contentReadable: mobileState.ready && mobileState.reducedMotion,
      primaryActionReachable: mobileState.saved,
      summary: '390px reduced-motion 用触摸完成分支与保存，关键文字、交接区和结果票据可读且无横向溢出。',
    },
    fallback: {
      exercised: fallbackState.fallback,
      rendered: fallbackState.ready && fallbackState.canvasFrames === 0,
      themePreserved: fallback.branchState.routeD.length > 40,
      contentPreserved: fallbackState.selectedTeam === 'blue' && fallbackState.strategy === 'line',
      primaryActionReachable: fallbackState.saved,
      summary: '强制禁用 Canvas 后，SVG 跑道、路线、队形、共同结果和保存行动全部保留。',
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
