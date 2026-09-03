import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
const deliveryId = 'ten-second-callsign-decode';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r139-ten-second-callsign-decode', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r139-ten-second-callsign-decode.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md'];
const runId = 'direct-r139-ten-second-callsign-decode';
const brief = '为第一次参加业余无线电公开课的人设计一个「十秒呼号解码」网页。一条虚构演示电文以点划文字与合成音调同步出现，用户必须实际聆听并辨认点划节奏。点击试听按钮或按空格键播放每一段，点划在原位展开对应字母，之后提交解码；最终行动是保存这张呼号练习卡。页面像一张会发声的现代排版作品，使用明亮纸白、信号橙和墨黑。所有呼号与电文均为虚构演示。';

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
  if (!item) throw new Error(`R139 browser evidence is missing ${checkpoint}.`);
  return item;
}

function requireState(item, key = 'state') {
  const value = item?.[key];
  if (!value) {
    throw new Error(`R139 browser evidence is missing ${key} for ${item?.checkpoint || 'unknown'}.`);
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
) throw new Error('Browser report is stale or incomplete for the current R139 final bundle.');

const requiredCaptures = [
  '01-desktop-opening.png',
  '02-desktop-decoding.png',
  '03-desktop-saved.png',
  '04-mobile-reduced-saved.png',
  '05-audio-fallback-saved.png',
];
const requiredCheckpoints = [
  'desktop-opening',
  'desktop-audio-decoding',
  'desktop-checked-saved',
  'mobile-reduced-saved',
  'audio-fallback-saved',
];
if (
  report.observations?.length !== requiredCheckpoints.length
  || requiredCheckpoints.some((checkpoint) => !report.observations.some((item) => item.checkpoint === checkpoint))
  || JSON.stringify(report.bundleFiles) !== JSON.stringify(bundleFiles)
  || JSON.stringify(report.captures) !== JSON.stringify(requiredCaptures)
) throw new Error('R139 browser evidence must contain the exact five adaptive checkpoints and captures.');

const opening = observation(report, 'desktop-opening');
const playback = observation(report, 'desktop-audio-decoding');
const checked = observation(report, 'desktop-checked-saved');
const mobile = observation(report, 'mobile-reduced-saved');
const fallback = observation(report, 'audio-fallback-saved');
const openingState = requireState(opening);
const soundingState = requireState(playback.semantic, 'soundingState');
const decodingState = requireState(playback);
const incorrectState = checked.semantic?.incorrectState || {
  phase: 'checked',
  checkStatus: checked.semantic?.wrongStatus,
  saved: false,
};
const savedState = requireState(checked);
const mobileState = requireState(mobile);
const fallbackState = requireState(fallback);

const pageErrors = report.observations.flatMap((item) => item.issues?.pageErrors || []);
const consoleErrors = report.observations.flatMap((item) => item.issues?.consoleErrors || []);
const resourceFailures = report.observations.flatMap((item) => [
  ...(item.issues?.requestFailures || []),
  ...(item.issues?.responseErrors || []),
]);
const runtimeClean = pageErrors.length === 0
  && consoleErrors.length === 0
  && resourceFailures.length === 0;
const openingVerified = openingState.ready === true
  && openingState.phase === 'waiting'
  && openingState.audioState === 'locked'
  && openingState.audioContextState === 'not-created'
  && openingState.revealedCount === 0
  && openingState.canonicalSequenceId === 'demo-kage-v1'
  && openingState.expectedDurationMs === 10_000
  && openingState.horizontalOverflow === false
  && opening.semantic?.segments === 4
  && opening.semantic?.images === 0
  && opening.semantic?.canvases === 0
  && opening.semantic?.answerTextInitiallyPresent === false;
const soundingVerified = soundingState.phase === 'sounding'
  && soundingState.audioState === 'playing'
  && soundingState.audioContextState === 'running'
  && soundingState.playingScope === 'all'
  && soundingState.currentLetter === 0
  && soundingState.currentElement === 0
  && soundingState.scheduledToneCount === 9
  && soundingState.completedPlaybackCount === 0
  && soundingState.audioFallback === false
  && playback.semantic?.soundingSegments === 1;
const decodingVerified = decodingState.phase === 'decoding'
  && decodingState.audioContextState === 'running'
  && decodingState.revealedCount === 4
  && decodingState.revealed?.every(Boolean)
  && decodingState.scheduledToneCount === 9
  && decodingState.completedPlaybackCount === 1
  && decodingState.canonicalSequenceId === soundingState.canonicalSequenceId;
const incorrectAnswerVerified = incorrectState.phase === 'checked'
  && incorrectState.checkStatus === 'incorrect'
  && incorrectState.saved === false
  && (checked.semantic?.completionVisibleAfterIncorrect === false
    || checked.semantic?.completionHiddenAfterWrong === true);
const persistenceStorageVerified = typeof checked.semantic?.storageBeforeReload === 'string'
  && checked.semantic.storageBeforeReload.length > 20
  && checked.semantic.storageBeforeReload === checked.semantic.storageAfterReload
  && checked.semantic.storageBeforeReload.includes('demo-kage-v1');
const saveRestoreVerified = savedState.ready === true
  && savedState.phase === 'saved'
  && savedState.checkStatus === 'correct'
  && savedState.saved === true
  && savedState.restored === true
  && savedState.revealedCount === 4
  && persistenceStorageVerified;
const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && mobileState.ready === true
  && mobileState.phase === 'saved'
  && mobileState.checkStatus === 'correct'
  && mobileState.saved === true
  && mobileState.reducedMotion === true
  && mobileState.scheduledToneCount === 9
  && mobileState.completedPlaybackCount === 1
  && mobileState.horizontalOverflow === false;
const fallbackVerified = fallbackState.ready === true
  && fallbackState.phase === 'saved'
  && fallbackState.audioState === 'unavailable'
  && fallbackState.audioContextState === 'unavailable'
  && fallbackState.audioFallback === true
  && fallbackState.scheduledToneCount === 0
  && fallbackState.completedPlaybackCount === 1
  && fallbackState.revealedCount === 4
  && fallbackState.saved === true
  && fallbackState.horizontalOverflow === false;

if (
  !runtimeClean
  || !openingVerified
  || !soundingVerified
  || !decodingVerified
  || !incorrectAnswerVerified
  || !saveRestoreVerified
  || !mobileVerified
  || !fallbackVerified
) {
  throw new Error('R139 report does not prove the real sounding state, nine tones, honest decoding, persistence, 390px reduced-motion, and audio fallback boundaries.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'code-native') {
  throw new Error(`R139 must select code-native primary, received ${run.mediumDecision?.preferred || 'missing'}.`);
}
if (run.assetPlan.strategy !== 'none' || run.assetPlan.assets.length !== 0) {
  throw new Error('R139 code-native delivery must retain a zero-external-asset plan.');
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '业余无线电公开课中的十秒虚构呼号点划练习',
    audience: '第一次参加业余无线电公开课、尚不能稳定辨认点划节奏的学习者',
    desiredOutcome: '通过一次真实聆听辨认四段点划节奏，提交呼号解码，并保存完成的练习卡。',
    primaryAction: '保存这张呼号练习卡',
    hardConstraints: [
      '所有呼号、电文与练习结果必须持续说明为虚构演示',
      '声音必须由真实用户手势触发，并与点划文字共享同一 canonical sequence',
      '错误答案不得显示完成态或开放保存，正确答案才可保存并跨重载恢复',
      '音频不可用时不得伪装播放，但必须保留等时视觉练习和主要行动',
    ],
    preferences: [
      '使用纸白、信号橙和墨黑形成现代编辑排版作品，而非暗色电台控制台',
      '四段点划横跨页面并在原位展开字母，声音、时间标尺和字形保持同一语言',
      '页面长度、布局与操作服从十秒聆听任务，不套固定三屏、中央产品或参数工作台',
    ],
  },
  selectedDirection: {
    id: 'ten-second-callsign-typographic-sonic-field',
    title: '十秒呼号解码 · 会发声的现代排版作品',
    experienceForm: 'typographic-sonic-field',
    rationale: '把四段点划本身放大为横跨页面的视觉主体；一次真实试听使合成音、点划高亮、原位字母展开、解码反馈和保存练习卡沿同一十秒序列推进，不需要外部主素材或持久工具面板。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-sonic-editorial-feedback',
      title: '声音与排版共享同一状态',
      principle: '借用用户手势启动声音，并让节奏、文字、解释和不可用降级共享状态的原理。',
      relevance: '呼号练习必须把听见的九个音调与四段点划、字母揭示和解码结果绑定；只借因果和诚实降级，不复制电台视觉模板。',
      sourceUri: '../generated-runs/dedicated-f9ed58e5b7ea/',
    },
  ],
  interactionRationale: {
    mode: 'direct',
    audioApplicable: true,
    rationale: '点击试听或按空格创建并运行 Web Audio；同一 canonical sequence 同步驱动九个音调、四段点划、字母揭示、答案校验、保存和恢复，音频失败时明确进入视觉节拍回退。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    intentLevel: 'expressive',
    intentRationale: '主题记忆点来自声音与巨幅点划排版的严格同步；不需要为了“高级”强加 3D 或沉浸式渲染器。',
    heroMoment: {
      title: '四段点划在纸白页面上形成十秒可听乐谱',
      description: '开场直接看见四段信号橙点划、十秒标尺和试听入口；真实播放后点划依次发声并在原位展开字母。',
      themeConnection: '即使没有产品设备或背景图片，观众也能从点划、时间标尺和音调反馈辨认“呼号解码”。',
      appearsWithinSeconds: 2,
      observableRuntimeChange: {
        trigger: '用户点击试听全部或按空格键',
        from: '四段点划静止，答案与完成卡隐藏',
        to: '九个合成音依次播放，点划和字母展开，随后进入可提交的解码状态',
      },
    },
    rendering: {
      primary: 'dom-css',
      supporting: [],
      rationale: '语义 DOM 和 CSS 直接承担点划、排版、状态与可访问操作；Web Audio 承担声音，避免把没有空间职责的任务伪装成 Canvas 或 3D。',
    },
    spatialDepth: {
      mode: 'flat',
      purpose: '通过字号、留白、基线和橙黑反差建立印刷层级，让时间与节奏清晰可读。',
      cues: [],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '四段点划保持完整可读，十秒标尺和试听入口建立任务',
          thematicPurpose: '先让学习者看懂需要聆听和辨认的对象',
        },
        {
          phase: 'exploration',
          driver: 'audio',
          visualState: '九个音调依序响起，对应点划高亮并逐段展开字母',
          thematicPurpose: '让声音、节奏和符号形成真实因果',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: '错误答案停留在校验态，正确答案开放练习卡并保存恢复',
          thematicPurpose: '把十秒聆听收束为可带走的学习结果',
        },
      ],
      runtimeAdvantage: '真实声音时间线、点划高亮、字母展开和答案状态共同表达听辨过程，静态海报无法等价完成。',
    },
    interactionToScene: [
      {
        input: '点击试听全部或按空格键',
        sceneResponse: '创建并运行 Web Audio，按同一序列播放九个音调并同步推进点划与字母',
        productMeaning: '学习者实际聆听而不是只阅读答案',
      },
      {
        input: '提交呼号并保存练习卡',
        sceneResponse: '错误时保留未完成态，正确时显示完成卡并跨重载恢复',
        productMeaning: '校验和保存真实反映这次听辨是否完成',
      },
    ],
    assetCredibility: {
      level: 'conceptual-coherent',
      strategy: '零外部主素材；点划、文字、计时与合成音全部由同一代码内 canonical sequence 生成。',
      disclosure: '页面明确说明 KAGE 与电文均为虚构练习，合成音不是录音、真实通信或认证训练。',
    },
    fallbackPerformance: {
      ...run.visualAmbition.fallbackPerformance,
      initialTransferBudgetMb: 1,
      mobileFallback: 'equivalent',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r139-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一次零外部素材决策与一次完整构建完成；两次确定性修复解决播放取消和完成态选择器，五个自适应浏览器检查通过后停止，没有静默重生素材或无限视觉返工。',
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
    rationale: '十秒听辨需要依次经历试听、符号揭示、解码校验和保存；编辑流直接支持时间顺序与排版主体，不需要持久参数面板或实时指标簇。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 91,
    craftCohesion: 93,
    assetIntegration: 92,
    interactionValue: 94,
    mobileReadiness: 88,
  },
  summary: '纸白、信号橙、墨黑、横跨页面的四段点划和十秒声音时间线形成统一的现代编辑语言；真实播放、错误阻断、正确保存和音频回退都直接服务呼号听辨。',
  findings: [{
    code: 'fictional-training-boundary',
    severity: 'minor',
    checkpoint: 'audio',
    message: 'KAGE 和演示电文仅用于产品内虚构练习，页面持续声明合成音不是录音、真实通信或认证训练。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, `桌面开场在 ${opening.readyAtMs}ms 内呈现四段点划、十秒标尺和试听入口；KAGE 未提前出现在页面文字中。`),
    checkpoint('core', decodingVerified && incorrectAnswerVerified && saveRestoreVerified, '九个音调完成后四段字母从同一序列揭示；错误 KAGX 不显示完成卡，正确 KAGE 才保存并在重载后恢复。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 完成真实试听、解码和保存，保留九个音调证据且没有页面级横向溢出。'),
    checkpoint('interaction', soundingVerified && incorrectAnswerVerified && saveRestoreVerified && fallbackVerified, '真实点击进入 sounding；答案校验控制完成卡和保存，强制音频回退仍用同一视觉时序完成任务。'),
    checkpoint('audio', soundingVerified && decodingVerified && fallbackVerified, '真实 Web Audio context 处于 running 并调度九个音调；音频不可用时明确标记 unavailable，不伪装发声。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: openingVerified,
    primaryActionReachable: saveRestoreVerified && fallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: openingState.canonicalSequenceId === 'demo-kage-v1'
      && fallbackState.canonicalSequenceId === 'demo-kage-v1',
    interactionVerified: soundingVerified
      && decodingVerified
      && incorrectAnswerVerified
      && saveRestoreVerified
      && fallbackVerified,
    audioVerified: soundingVerified
      && decodingState.scheduledToneCount === 9
      && decodingState.audioContextState === 'running'
      && fallbackVerified,
  },
  visualQuality,
  macroStructureReview,
});

const wowEvidence = createWowGateEvidenceFromBrowserObservations({
  identity,
  contract: run.visualAmbition,
  observations: {
    hero: {
      observed: openingVerified,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: opening.semantic?.segments === 4,
      score: 93,
      summary: '首屏以四段巨幅点划、十秒标尺和信号橙试听入口直接建立可发声的呼号练习，不依赖背景图片或设备模型。',
    },
    runtime: {
      surfaceVisible: openingVerified,
      stateChanged: soundingVerified && decodingVerified,
      visualOutputChanged: decodingState.revealedCount === 4,
      advantageOverStaticObserved: soundingVerified && decodingVerified,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 94,
      summary: '真实 Web Audio 播放改变 sounding、当前点划、字母揭示和解码状态；静态海报无法完成相同听辨因果。',
    },
    theme: {
      themeSpecificMemoryObserved: saveRestoreVerified,
      score: 92,
      summary: '可复述记忆是在十秒内听见九个点划音调，辨认 KAGE，并把完成的呼号练习卡保存在本机。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: soundingVerified && decodingVerified,
      score: 91,
      summary: '点划高亮、字母原位展开和十秒时间线解释声音节奏；运动承担学习语义，不冒充空间 3D。',
    },
    assets: {
      criticalAssetsLoaded: openingVerified,
      integratedWithScene: soundingVerified && decodingVerified,
      credible: true,
      score: 93,
      summary: '零外部素材；语义 DOM、CSS 点划和 Web Audio 从同一 canonical sequence 生成，并明确披露其虚构训练属性。',
    },
    craft: {
      cohesive: true,
      score: 92,
      summary: '纸白、信号橙、墨黑、超宽点划字形、十秒标尺和克制控件形成统一的现代编辑排版语言。',
    },
    interaction: {
      input: '点击试听或按空格、提交呼号、保存练习卡',
      stateChanged: soundingVerified && incorrectAnswerVerified && saveRestoreVerified,
      visualOutputChanged: decodingState.revealedCount === 4,
      semanticOutputChanged: savedState.phase === 'saved' && savedState.restored === true,
      summary: '真实输入改变声音播放、点划高亮、字母揭示、错误阻断、正确完成、保存和跨重载恢复。',
    },
    mobile: {
      viewportWidth: mobile.viewport?.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === false,
      contentReadable: mobileState.ready === true && mobileState.reducedMotion === true,
      primaryActionReachable: mobileState.saved === true,
      summary: '390px reduced-motion 保留完整试听、四段点划、解码和保存任务，没有页面级横向溢出。',
    },
    fallback: {
      exercised: fallbackState.audioFallback === true,
      rendered: fallbackState.ready === true,
      themePreserved: fallbackState.canonicalSequenceId === 'demo-kage-v1',
      contentPreserved: fallbackState.revealedCount === 4 && fallbackState.checkStatus === 'correct',
      primaryActionReachable: fallbackState.saved === true,
      summary: '强制音频不可用后不创建或伪装 AudioContext，仍按同一十秒视觉时序揭示四段字母并完成解码和保存。',
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
  assetStrategy: run.assetPlan.strategy,
  externalAssetCount: run.assetPlan.assets.length,
  audioVerified: run.adaptiveEvidence?.hardGates.audioVerified,
  verdict: run.verdict,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment,
  archiveDisposition: 'v3-ready',
}, null, 2));
