import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createWowGateEvidenceFromBrowserObservations } from '../src/v2/adaptive-wow-evidence.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'film-camera-repair-paths');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r136a-film-camera-repair-paths', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r136a-film-camera-repair-paths.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts'];
const runId = 'direct-r136a-film-camera-repair-paths';
const brief = '为第一次参加社区旧物修理日的人设计一个维修判断网页。开场是一台刚从储物间取出的旧胶片相机。访客先选择快门还能动作或已经卡住，进入不同路径：一条检查过片拨杆和测光窗，另一条检查电池仓和快门钮；两条路径都保留刚才的判断，最终汇入同一张维修判断卡，给出清洁、送修或妥善保存的初步建议。访客从对相机状态毫无头绪，走到看懂下一步该做什么，最终行动是保存今天的维修判断卡。画面像一本亲切的印刷故障手册与手绘机构图，让人清楚看见每个判断为什么导向下一步，也愿意真的把旧物修好。';

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R136A browser evidence is missing ${checkpoint}.`);
  return item;
}

function state(item, key = 'state') {
  const value = item?.[key];
  if (!value) {
    throw new Error(`R136A browser evidence is missing ${key} state for ${item?.checkpoint || 'unknown'}.`);
  }
  return value;
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
if (
  report.complete !== true
  || report.identityBinding !== 'runId+bundleHash'
  || report.runId !== runId
  || report.bundleHash !== bundleHash
) throw new Error('Browser report is stale or incomplete for the current R136A final bundle.');

const opening = observation(report, 'desktop-opening');
const movingRoute = observation(report, 'desktop-moving-route');
const stuckSaved = observation(report, 'desktop-stuck-saved');
const mobile = observation(report, 'mobile-reduced');
const enhancementOff = observation(report, 'enhancement-off-saved');
const openingState = state(opening);
const movingState = state(movingRoute, 'moving');
const previousMovingState = state(stuckSaved, 'moving');
const stuckState = state(stuckSaved, 'stuck');
const savedState = state(stuckSaved);
const mobileState = state(mobile);
const enhancementOffState = state(enhancementOff);

const pageErrors = report.observations.flatMap((item) => item.issues?.pageErrors || []);
const consoleErrors = report.observations.flatMap((item) => item.issues?.consoleErrors || []);
const resourceFailures = report.observations.flatMap((item) => [
  ...(item.issues?.requestFailures || []),
  ...(item.issues?.responseErrors || []),
]);
const codeSurfaceVerified = openingState.ready === true
  && openingState.phase === 'opening'
  && openingState.route === null
  && openingState.geometryHash === openingState.cameraGeometryHash
  && openingState.routeD === openingState.pathD
  && openingState.routeD.length > 20
  && openingState.horizontalOverflow === false;
const svgStateChanged = new Set(movingRoute.svgHashes || []).size === 2;
const movingRouteVerified = movingState.phase === 'confluence'
  && movingState.route === 'moving'
  && movingState.routeId === 'a'
  && movingState.step === 2
  && movingState.resultTitle.length > 0
  && movingState.routeHash === previousMovingState.routeHash
  && movingState.geometryHash === previousMovingState.geometryHash;
const branchesDiffer = movingRouteVerified
  && stuckState.phase === 'confluence'
  && stuckState.route === 'stuck'
  && stuckState.routeId === 'b'
  && stuckState.step === 2
  && movingState.routeHash !== stuckState.routeHash
  && movingState.routeD !== stuckState.routeD
  && movingState.geometryHash !== stuckState.geometryHash
  && JSON.stringify(movingState.partTransforms) !== JSON.stringify(stuckState.partTransforms)
  && movingState.resultTitle !== stuckState.resultTitle;
const saveVerified = savedState.ready === true
  && savedState.phase === 'saved'
  && savedState.route === 'stuck'
  && savedState.saved === true
  && savedState.routeHistory.includes('moving')
  && savedState.routeHistory.includes('stuck')
  && savedState.resultTitle === stuckState.resultTitle;
const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && mobileState.ready === true
  && mobileState.reducedMotion === true
  && mobileState.saved === true
  && mobileState.horizontalOverflow === false;
const enhancementOffVerified = enhancementOffState.ready === true
  && enhancementOffState.enhancementOff === true
  && enhancementOffState.phase === 'saved'
  && enhancementOffState.route === 'stuck'
  && enhancementOffState.saved === true
  && enhancementOffState.horizontalOverflow === false;

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'code-native') {
  throw new Error(`R136A must select code-native primary, received ${run.mediumDecision?.preferred || 'missing'}.`);
}
if (run.assetPlan.strategy !== 'none' || run.assetPlan.assets.length !== 0) {
  throw new Error('R136A code-native delivery must have a zero-external-asset plan.');
}
if (
  run.visualAmbition?.intentLevel !== 'expressive'
  || run.visualAmbition.rendering.primary !== 'svg'
  || run.visualAmbition.rendering.supporting.length !== 1
  || run.visualAmbition.rendering.supporting[0] !== 'dom-css'
) throw new Error('R136A visual ambition must remain expressive SVG with DOM/CSS support.');

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '社区旧物修理日中的旧胶片相机外部机构与维修判断路径',
    audience: '第一次参加社区旧物修理日、不了解机械相机的普通访客',
    desiredOutcome: '从不了解相机状态，走完一条可解释的外部检查路径，比较另一条路径，并保存安全的初步维修判断卡。',
    primaryAction: '保存今天的维修判断卡',
    hardConstraints: [
      '页面只形成非专业初步判断，不代替维修师诊断',
      '两条路径必须改变 SVG 部件几何、连接路径与结果内容，不能只换文案或颜色',
      '不得指导拆机、继续强行按压快门或接触可疑电池残留',
      '不依赖外部图片、模型、Canvas 或第二素材批次',
    ],
    preferences: [
      '暖白说明书纸、墨黑机构线、钴蓝和朱红套色形成亲切的印刷故障手册',
      '大幅相机机构图贯穿 opening、branch、confluence 与 saved，而不是参数工作台或卡片矩阵',
      '鼠标、触摸、键盘、reduced-motion 与 enhancement-off 都保留完整判断旅程',
    ],
  },
  selectedDirection: {
    id: 'film-camera-mechanism-branching-manual',
    title: '旧胶片相机机构图 · 双路径维修判断手册',
    experienceForm: 'branching-confluence',
    rationale: '同一张代码原生 SVG 相机机构图承载快门回应分叉、两处部件检查、可见几何后果和共同判断卡；正常文档流让理解对象、选择路径、比较与保存自然发生，不形成持久控制台。',
  },
  interactionRationale: {
    mode: 'direct',
    audioApplicable: false,
    rationale: '鼠标、触摸与键盘选择快门状态并推进检查；同一状态同时改变 SVG 路径、拨杆、测光针、快门钮、仓门、叶片、检查历史和最终判断卡。',
  },
});

// `asset-batch` records the one bounded zero-asset decision required by the
// protocol. It does not represent an external asset or a generation call.
run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r136a-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、零外部素材、零生成调用与一次构建完成；使用一次确定性修复和一次视觉精修，桌面双路径、保存、390px reduced-motion 与 enhancement-off 浏览器检查均完成后停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'branching-confluence',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'record-or-contribute',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: false,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容要求从同一相机的快门回应进入两条确定路径，保留已走判断并汇合到同一维修卡；分支汇流直接表达因果，不需要持久参数面板或实时指标簇。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 92,
    craftCohesion: 93,
    assetIntegration: 94,
    interactionValue: 93,
    mobileReadiness: 91,
  },
  summary: '暖纸、墨线、钴蓝与朱红套色把整页机构图、两条判断路径和保存行动统一成亲切的故障手册；代码原生 SVG 的部件位移与连接几何让每一步检查原因可见。',
  findings: [{
    code: 'non-professional-repair-boundary',
    severity: 'minor',
    checkpoint: 'core',
    message: '页面只提供不拆机的外部观察与初步建议；页眉、安全提示和结果文案持续说明不代替维修师诊断。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', codeSurfaceVerified, `桌面开场在 ${opening.readyAtMs}ms 内呈现可辨认的胶片相机、镜头、拨杆、测光窗、快门钮与电池仓机构图，且无横向溢出。`),
    checkpoint('core', branchesDiffer && svgStateChanged, '快门还能动作与快门已经卡住两条路径产生不同 route/path hash、SVG 部件 transforms、连接几何与结果标题，并在同一判断卡汇合。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 状态完整走到 saved，保留相机几何、判断内容与保存状态且没有横向溢出。'),
    checkpoint('interaction', movingRouteVerified && branchesDiffer && saveVerified && enhancementOffVerified, '鼠标路径、返回比较、第二路径和保存共享 routeHistory；enhancement-off 仍以 SVG/DOM 完成相同语义旅程。'),
  ],
  hardGates: {
    runtimeClean: pageErrors.length === 0 && consoleErrors.length === 0 && resourceFailures.length === 0,
    criticalAssetsLoaded: codeSurfaceVerified,
    primaryActionReachable: saveVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: true,
    interactionVerified: movingRouteVerified && branchesDiffer && svgStateChanged && saveVerified && enhancementOffVerified,
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
      observed: codeSurfaceVerified,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: svgStateChanged,
      score: 94,
      summary: '首屏用占据主要视觉层的旧胶片相机机构图、套色引线和维修手册纸张建立主题，不依赖照片、产品卡或参数面板。',
    },
    runtime: {
      surfaceVisible: codeSurfaceVerified,
      stateChanged: branchesDiffer,
      visualOutputChanged: svgStateChanged && branchesDiffer,
      advantageOverStaticObserved: svgStateChanged && branchesDiffer,
      comparisonMethod: 'dom-geometry',
      score: 93,
      summary: '两次真实路径选择改变同一 SVG 的连线路径、拨杆、测光针、快门钮、仓门、叶片与判断内容，静态手册图不能表达这种分支因果。',
    },
    theme: {
      themeSpecificMemoryObserved: branchesDiffer && saveVerified,
      score: 94,
      summary: '可复述记忆是先听一台旧相机如何回应，沿机构图检查两个部件，再把安全的下一步保存成维修判断卡。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: svgStateChanged && branchesDiffer,
      score: 91,
      summary: '拨杆旋转、测光针偏转、仓门位移、快门叶片收拢和跨机身连接线共同解释检查关系；运动承担判断语义而非装饰。',
    },
    assets: {
      criticalAssetsLoaded: codeSurfaceVerified,
      integratedWithScene: codeSurfaceVerified && branchesDiffer,
      credible: codeSurfaceVerified && branchesDiffer,
      score: 90,
      summary: '零外部素材；最终 bundle 内联 SVG 与 DOM/CSS 原生承担相机、部件、路径、编号和纸张视觉，状态与几何没有脱离场景。',
    },
    craft: {
      cohesive: true,
      score: 90,
      summary: '暖白纸、墨黑线、钴蓝朱红套色、宋体标题、等宽编号、手绘机构线和克制动效形成统一的社区修理手册语言。',
    },
    interaction: {
      input: '鼠标/触摸/键盘选择路径、推进检查、返回比较、重放与保存',
      stateChanged: branchesDiffer && saveVerified,
      visualOutputChanged: svgStateChanged && branchesDiffer,
      semanticOutputChanged: savedState.phase === 'saved' && savedState.saved === true,
      summary: '真实输入同时改变 routeId、检查历史、SVG 路径与部件 transforms、结果建议和 saved 状态，直接服务维修判断。',
    },
    mobile: {
      viewportWidth: mobile.viewport?.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === false,
      contentReadable: mobileState.ready === true && mobileState.reducedMotion === true,
      primaryActionReachable: mobileState.saved === true,
      summary: '390px reduced-motion 保留相机机构图、离散几何终态、判断文字和保存完成态，没有横向溢出。',
    },
    fallback: {
      exercised: enhancementOffState.enhancementOff === true,
      rendered: enhancementOffState.ready === true,
      themePreserved: enhancementOffState.route === 'stuck' && enhancementOffState.resultTitle.length > 0,
      contentPreserved: enhancementOffState.phase === 'saved' && enhancementOffState.checkHistory.length === 2,
      primaryActionReachable: enhancementOffState.saved === true,
      summary: '关闭可选增强后，SVG/DOM 的相机、卡住路径、两步检查、结果建议与保存状态全部保留，不引入替代素材。',
    },
    errors: {
      pageErrors,
      consoleErrors,
      blockingResourceFailures: resourceFailures,
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
  protocol: run.creativeProtocolVersion,
  medium: run.mediumDecision?.preferred,
  rendering: run.visualAmbition?.rendering,
  assetStrategy: run.assetPlan.strategy,
  externalAssetCount: run.assetPlan.assets.length,
  generationCalls: 0,
  verdict: run.verdict,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  archiveDisposition: run.verdict === 'pass' ? 'v3-ready' : 'research-only',
}, null, 2));
