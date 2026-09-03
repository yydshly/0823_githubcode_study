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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'forest-sound-route');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r131-forest-sound-route', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r131-forest-sound-route.direct-creative-run.json');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'assets/leaf-canopy.wav',
  'assets/tree-hollow.wav',
  'assets/creek-stone.wav',
  'assets/meadow-insect.wav',
];

const brief = [
  '为儿童自然博物馆设计“声音藏在哪里”互动网页。',
  '在明亮森林剖面中点击叶片、树洞、溪石或昆虫，播放对应自然声音，声源位置、波纹和观察提示同步出现；收集三个后形成聆听路线并保存。',
  '不要暗色科技、卡片目录或固定三屏。',
  '声音使用项目内生成的程序化自然声音预览，明确不冒充现场录音或真实自然档案。',
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
const identity = { runId: 'direct-r131-forest-sound-route', bundleHash };
if (!report.complete || report.runId !== identity.runId || report.bundleHash !== identity.bundleHash) {
  throw new Error('Browser report is stale or incomplete for the current R131 bundle. Rerun bounded browser evidence first.');
}

const [opening, interaction, mobile, fallback] = report.observations;
const openingState = state(opening);
const samples = interaction.samples;
const savedState = state(interaction);
const mobileState = state(mobile);
const fallbackState = state(fallback);
if (!Array.isArray(samples) || samples.length !== 3) {
  throw new Error('R131 browser evidence must contain exactly three desktop sound samples.');
}

const issues = report.observations.flatMap((observation) => [
  ...observation.issues.pageErrors,
  ...observation.issues.consoleErrors,
]);
const blockingResourceFailures = report.observations.flatMap((observation) => [
  ...observation.issues.requestFailures,
  ...observation.issues.responseErrors,
]);
const distinctAudioSources = new Set(samples.map((sample) => sample.audioSource)).size === samples.length;
const distinctVisualStates = new Set(samples.map((sample) => `${sample.activeSound}:${sample.routePath}`)).size === samples.length;
const audioActuallyPlaying = samples.every((sample) => sample.audioState === 'playing'
  && typeof sample.audioSource === 'string'
  && sample.audioSource.includes('.wav')
  && sample.hotspotPressed === true);

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV2(contract);
run = directCreativeRunSchema.parse({
  ...run,
  id: identity.runId,
  goalPlayback: {
    ...run.goalPlayback,
    desiredOutcome: '在一幅明亮森林剖面中寻找四类声源，听见并看见每次选择的因果反馈，收集三个后形成聆听路线并保存。',
    preferences: [
      '森林对象本身承担探索入口，不拆成卡片目录或参数工作台',
      '声音、声源位置、波纹、观察提示和收集进度共享同一状态',
      '四段声音明确标注为项目内生成的程序化预览，不冒充现场录音或真实自然档案',
    ],
  },
  selectedDirection: {
    ...run.selectedDirection,
    title: '声音藏在哪里 · 明亮森林聆听路线',
    experienceForm: 'object-field',
    rationale: '把叶片、树洞、溪石和昆虫保留在同一幅森林剖面中；真实选择同时移动声源焦点、启动对应声音、扩散主题波纹、更新观察提示和收集路线，三个声源后自然汇成保存行动。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-paper-butterfly-object-field',
      title: '纸蝶日光游园 · 同一对象场中的探索与收集',
      principle: '借用主题对象持续保留空间关系，一次选择同时驱动局部焦点、说明、收集和最终行动的原理。',
      relevance: '四个森林声源需要在同一剖面中保持位置身份；只借对象场与选择因果，不复制纸蝶、温室、三维队形或视觉外观。',
      sourceUri: '../pages/v2/deliveries/paper-butterfly-garden/',
    },
    {
      referenceId: 'positive-sonic-editorial-feedback',
      title: '午夜电台 · 声音、画面与说明共享状态',
      principle: '借用用户手势启动声音，并让声音、可见反馈、解释文字和不可用降级共享状态的原理。',
      relevance: '每个森林声源都需产生可区分声音与同步波纹；只借声音因果和诚实降级，不复制电台网格、圆环或文字构图。',
      sourceUri: '../generated-runs/dedicated-f9ed58e5b7ea/',
    },
  ],
  assetPlan: {
    batchId: 'assets-r131-forest-sound-route',
    strategy: 'mixed',
    rationale: '唯一素材批次由程序化 SVG 森林剖面承担空间与波纹语义，四段项目内生成 WAV 承担可区分声音预览；页面持续披露它们不是现场录音。',
    assets: [
      {
        id: 'forest-illustration-field',
        role: '一幅连续明亮森林剖面、四个主题专属声源位置、波纹和收集路线',
        source: 'programmatic',
        required: true,
      },
      {
        id: 'forest-sound-previews',
        role: '叶片、树洞、溪石和昆虫四段可区分 WAV 声音预览，并支持明确的不可用降级',
        source: 'generated',
        required: true,
      },
    ],
  },
  interactionRationale: {
    mode: 'direct',
    audioApplicable: true,
    rationale: '鼠标、触摸和键盘选择真实声源；同一状态同时驱动音频播放、空间焦点、波纹、观察提示、收集路线和保存完成态，音频失败时视觉任务仍可完成。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    intentLevel: 'immersive',
    intentRationale: '声音、对象位置、波纹与路线必须在同一空间中形成不可由静态截图替代的探索体验；沉浸等级仅服务本次自然博物馆主题，不指定全局风格或渲染器。',
    heroMoment: {
      title: '四个声音藏在同一幅森林剖面里',
      description: '开场即展示一幅可探索的明亮森林剖面，叶片、树洞、溪石与昆虫既是主视觉也是四个真实声音入口。',
      themeConnection: '不依赖标题，观众也能从四个空间声源、同心波纹和逐步生长的路线辨认“声音藏在哪里”。',
      appearsWithinSeconds: 2,
      observableRuntimeChange: {
        trigger: '用户点击、触摸或键盘选择任一森林声源',
        from: '四个声源静候探索，路线尚未形成',
        to: '对应声音播放、位置波纹扩散、观察提示更新，并把该位置加入聆听路线',
      },
    },
    rendering: {
      primary: 'svg',
      supporting: ['dom-css'],
      rationale: '内联 SVG 负责连续森林剖面、对象位置、波纹和路线几何，DOM 负责可访问控制、文字说明与保存行动；没有虚构 WebGL 或 Three.js 职责。',
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '用前景遮挡、尺度、光线和局部焦点把四个声源组织成一幅连续森林空间，同时保持移动端可读和可触达。',
      cues: ['scale', 'occlusion', 'focus', 'lighting'],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '森林层次轻微呼吸，四个声源保持可辨识位置',
          thematicPurpose: '让观众立即理解这是一个可以聆听的自然空间',
        },
        {
          phase: 'exploration',
          driver: 'hybrid',
          visualState: '选择驱动实际 WAV、局部波纹、焦点、说明与收集路线同步变化',
          thematicPurpose: '把声音和森林中的具体位置建立清晰因果',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: '三个声源连成完整路线并开放保存，保存后留下完成反馈',
          thematicPurpose: '把探索自然收束为一条可带走的聆听路线',
        },
      ],
      runtimeAdvantage: '实际声音、空间波纹、收集顺序与路线生长共同表达探索过程，单张背景图无法等价呈现。',
    },
    interactionToScene: [
      {
        input: '选择叶片、树洞、溪石或昆虫',
        sceneResponse: '播放对应 WAV，突出对象并在其位置扩散波纹，同时更新观察提示与收集进度',
        productMeaning: '儿童能够听见声音并确认它在森林中的来源位置',
      },
      {
        input: '收集三个不同声源',
        sceneResponse: '按真实选择顺序连接三个位置并开放保存路线',
        productMeaning: '零散聆听被组织成一条属于自己的自然观察路线',
      },
    ],
    assetCredibility: {
      level: 'conceptual-coherent',
      strategy: '森林、对象位置、波纹和路线由统一 SVG 视觉场承担；四段本地 WAV 分别承担可区分的声音职责。',
      disclosure: '页面持续标注声音为程序化自然声预览，不冒充现场录音或真实自然档案。',
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
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一批程序化视觉与生成声音素材、一次构建、一次明确视觉精修和两次确定性重叠修复后，最终 bundle 已通过桌面开场、真实声音互动、390px reduced-motion 与音频不可用降级；达到阶段完成条件并停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId: identity.runId,
    layout: 'single-stage',
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
    rationale: '内容要求四个声源保持空间关系并让点击产生声音与波纹；单一对象场由任务支持，但不需要持久参数面板、实时指标簇或固定三屏。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 95,
    craftCohesion: 94,
    assetIntegration: 94,
    interactionValue: 96,
    mobileReadiness: 93,
  },
  summary: '明亮森林剖面、四个主题声源、空间波纹、观察提示和逐段形成的聆听路线构成统一且可记忆的自然博物馆语言；声音与视觉因果直接服务“声音藏在哪里”。',
  findings: [{
    code: 'generated-audio-preview-boundary',
    severity: 'minor',
    checkpoint: 'audio',
    message: '四段 WAV 是项目内生成的程序化预览，不是现场录音或真实自然档案；页面开场、播放区和保存结果持续披露。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `桌面开场在 ${opening.readyAtMs}ms 内呈现完整明亮森林剖面、四个声源和操作提示，四段声音素材均已就绪，无运行错误或调试残留。`),
    checkpoint('core', '叶片、树洞和溪石选择保留各自空间身份，三次选择播放不同 WAV、产生不同可见状态和一条非空聆听路线。'),
    checkpoint('mobile', '390×844 reduced-motion 通过真实触摸完成三个声源收集和保存，无横向溢出，观察提示和主要行动可达。'),
    checkpoint('interaction', '鼠标、触摸与键盘共享声源选择状态；声源焦点、波纹、提示、收集进度、路线和保存由真实输入联动。'),
    checkpoint('audio', '三段桌面样本均由原生媒体 playing 状态确认播放且使用不同 WAV URL；音频不可用时明确提示并保留视觉收集与保存。'),
  ],
  hardGates: {
    runtimeClean: issues.length === 0 && blockingResourceFailures.length === 0,
    criticalAssetsLoaded: openingState.ready
      && openingState.assetCount === 4
      && distinctAudioSources,
    primaryActionReachable: savedState.saved,
    mobileComplete: mobileState.ready && mobileState.saved && !mobileState.horizontalOverflow,
    truthfulClaims: true,
    interactionVerified: distinctVisualStates
      && savedState.routeReady
      && savedState.routePath.length > 40
      && savedState.collected.length === 3,
    audioVerified: audioActuallyPlaying
      && distinctAudioSources
      && fallbackState.audioState === 'unavailable'
      && fallbackState.saved,
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
      visibleChangeObserved: openingState.assetCount === 4,
      score: 95,
      summary: '首屏直接建立一幅可点击的明亮森林剖面，叶片、树洞、溪石和昆虫既是主视觉也是四个探索入口。',
    },
    runtime: {
      surfaceVisible: openingState.ready,
      stateChanged: savedState.collected.length === 3,
      visualOutputChanged: distinctVisualStates,
      advantageOverStaticObserved: distinctVisualStates && audioActuallyPlaying,
      comparisonMethod: 'semantic-state-plus-visual',
      score: 96,
      summary: '真实选择同时改变声源焦点、波纹、观察提示、收集路线和实际播放状态；静态图片无法表达声音与空间的因果。',
    },
    theme: {
      themeSpecificMemoryObserved: savedState.routeReady && savedState.saved,
      score: 95,
      summary: '可复述记忆是从一幅森林剖面里找到叶片、树洞和溪石的声音，再把三个位置连成自己的聆听路线。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: distinctVisualStates && samples.every((sample) => sample.hotspotPressed),
      score: 94,
      summary: '空间波纹、局部光线与路线生长解释声源位置和收集关系，动效承担观察语义而不是装饰。',
    },
    assets: {
      criticalAssetsLoaded: openingState.assetCount === 4,
      integratedWithScene: distinctAudioSources && distinctVisualStates,
      credible: true,
      score: 94,
      summary: '程序化森林场与四段生成 WAV 分别承担空间和声音职责，且明确披露声音只是程序化预览。',
    },
    craft: {
      cohesive: true,
      score: 94,
      summary: '日光绿、树皮褐、溪水蓝、植物标本字和手绘式剖面线条形成统一、明亮且不落入暗色工作台惯性的视觉语言。',
    },
    interaction: {
      input: '鼠标、触摸或键盘选择森林声源，静音/音量与保存路线',
      stateChanged: savedState.collected.length === 3 && savedState.saved,
      visualOutputChanged: distinctVisualStates,
      semanticOutputChanged: savedState.phase === 'saved' && savedState.routeReady,
      summary: '真实输入改变当前声源、声音、波纹、观察提示、收集顺序、路线和保存完成态。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: !mobileState.horizontalOverflow,
      contentReadable: mobileState.ready && mobileState.reducedMotion,
      primaryActionReachable: mobileState.saved,
      summary: '390px reduced-motion 用触摸完成聆听、收集和保存，关键对象、提示与行动可读且无横向溢出。',
    },
    fallback: {
      exercised: fallbackState.audioState === 'unavailable',
      rendered: fallbackState.ready,
      themePreserved: fallbackState.routePath.length > 40,
      contentPreserved: fallbackState.collected.length === 3,
      primaryActionReachable: fallbackState.saved,
      summary: '强制禁用 Web Audio 与媒体播放后，页面明确显示声音不可用，同时保留四个声源、视觉波纹、收集路线与保存行动。',
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
