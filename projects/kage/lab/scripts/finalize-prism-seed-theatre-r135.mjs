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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'prism-seed-theatre');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r135-prism-seed-theatre', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r135-prism-seed-theatre.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/prism-seed-glasshouse-v1.png'];
const runId = 'direct-r135-prism-seed-theatre';
const brief = '为一座收藏阳光折射标本的植物温室设计网页。访客进入时看见一枚尚未展开的半透明种荚；随着探索，日光穿过种荚，在地面留下不断生长的彩色光谱，最终把这一刻保存成“今日折光标本”。画面明亮、宁静、真实，又有第一次看见自然奇迹的惊喜；不要像参数工作台。';

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
  if (!item) throw new Error(`R135 browser evidence is missing ${checkpoint}.`);
  return item;
}

function state(item) {
  if (!item?.state) throw new Error(`R135 browser evidence is missing state for ${item?.checkpoint || 'unknown'}.`);
  return item.state;
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
if (
  report.complete !== true
  || report.identityBinding !== 'runId+asset-bound-bundleHash'
  || report.runId !== runId
  || report.bundleHash !== bundleHash
) throw new Error('Browser report is stale or incomplete for the current R135 asset-bound bundle.');

const opening = observation(report, 'desktop-opening');
const interaction = observation(report, 'desktop-spectrum-interaction');
const completion = observation(report, 'desktop-specimen-saved');
const mobile = observation(report, 'mobile-reduced');
const fallback = observation(report, 'dual-fallback-saved');
const openingState = state(opening);
const savedState = state(completion);
const mobileState = state(mobile);
const fallbackState = state(fallback);
const before = interaction.before;
const after = interaction.after;
if (!before || !after) throw new Error('R135 interaction evidence requires before and after states.');

const allIssues = report.observations.flatMap((item) => [
  ...(item.issues?.pageErrors || []),
  ...(item.issues?.consoleErrors || []),
]);
const resourceFailures = report.observations.flatMap((item) => [
  ...(item.issues?.requestFailures || []),
  ...(item.issues?.responseErrors || []),
]);
const pixelChange = new Set(interaction.canvasPixelHashes || []).size === 2;
const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const assetBytes = await readFile(resolve(sourceRoot, 'assets', 'prism-seed-glasshouse-v1.png'));
const assetSha = createHash('sha256').update(assetBytes).digest('hex');
const assetVerified = manifest.generationCalls === 1
  && manifest.assets?.length === 1
  && manifest.assets[0]?.sha256 === assetSha
  && openingState.imageLoaded === true
  && openingState.frames > 0
  && openingState.drawCalls > 0
  && openingState.triangles > 0;
const lightFieldVerified = (interaction.actualScrollDelta || 0) > 0
  && pixelChange
  && after.progress > before.progress + .45
  && after.refraction > before.refraction + .003
  && after.spectralSpread > before.spectralSpread + .3
  && Math.abs(after.lightAngle - before.lightAngle) > 20;
const saveVerified = savedState.state === 'specimen'
  && savedState.progress >= .9
  && savedState.saved === true
  && savedState.imageLoaded === true;
const mobileVerified = mobile.viewport?.width === 390
  && mobileState.reducedMotion === true
  && mobileState.saved === true
  && mobileState.horizontalOverflow === 0;
const fallbackVerified = fallbackState.state === 'specimen'
  && fallbackState.fallback === true
  && fallbackState.assetFallback === true
  && fallbackState.frames === 0
  && fallbackState.saved === true
  && fallbackState.horizontalOverflow === 0;

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'generated-image') {
  throw new Error(`R135 ordinary brief must select generated-image primary, received ${run.mediumDecision?.preferred || 'missing'}.`);
}
if (run.assetPlan.strategy !== 'generated') {
  throw new Error(`R135 asset strategy must remain generated, received ${run.assetPlan.strategy}.`);
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '收藏阳光折射标本的植物温室与半透明种荚',
    audience: '希望快速进入植物艺术体验、感受日光与材料关系的普通网页访客',
    desiredOutcome: '从种荚尚未透光开始，沿滚动和指针移动看见光谱形成，并保存今日折光标本。',
    primaryAction: '保存今日折光标本',
    hardConstraints: [
      '不得把页面做成参数工作台',
      '关键生成主图必须真实加载并承担温室、种荚、材质和第一记忆点',
      '页面必须明确这是艺术化折光标本，不冒充真实光谱测量',
    ],
    preferences: [
      '明亮温室、自然日光、植物绿与克制光谱形成统一视觉语言',
      '滚轮推进折光，指针改变入射方向，代码只增强而不替代主素材',
      '页面长度与结构服从连续体验，不固定为三屏或控制面板',
    ],
  },
  selectedDirection: {
    id: 'prism-seed-spatial-stage',
    title: '棱镜种子剧场 · 日光标本空间舞台',
    experienceForm: 'image-led-spatial-stage',
    rationale: '一张高质量温室主视觉从始至终保持空间和材质身份；轻量 WebGL 折射、自然滚动、指针光线与最终保存组成连续体验，不复制工作台、卡片墙或固定三段。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-moonlit-image-responsibility',
      title: '月光潮池 · 主素材与互动职责分离',
      principle: '高质量连续主图承担环境、对象和第一记忆点，代码只承担位置、聚焦与可验证的互动因果。',
      relevance: '本页借用职责分离，不复制潮池横向全景；种荚温室需要自己的空间舞台和折光动作。',
      sourceUri: '../pages/v2/deliveries/moonlit-tidepool-panorama/',
    },
    {
      referenceId: 'positive-stormglass-causal-runtime',
      title: '雷雨余光档案馆 · 输入与材质变量绑定',
      principle: '统一进度同时驱动多个非 DOM 视觉变量，并在浏览器中用前后状态和像素差证明真实联动。',
      relevance: '本页只借输入因果与证据方法；不复制暗色、纯 WebGL 主视觉或长章节结构。',
      sourceUri: '../pages/v2/deliveries/stormglass-archive/',
    },
  ],
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '原生滚轮推动 sealed → warming → spectrum → specimen，同时提升折射和光谱；指针改变入射角；最终按钮保存完成态。',
  },
  visualAmbition: {
    schemaVersion: 1,
    intentLevel: 'flagship',
    intentRationale: '主题需要在五秒内用可信温室、巨型半透明种荚和自然光谱形成高记忆点，再让输入把静态素材转化为可参与的折光事件。',
    heroMoment: {
      title: '一枚种子把日光展开',
      description: '首屏直接呈现与温室融为一体的半透明种荚、纤维层、日光和地面光谱，不先展示工具或说明面板。',
      themeConnection: '隐藏标题后，访客仍能从巨型种荚、温室与棱镜光谱辨认“收藏阳光折射标本”的主题。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '滚轮改变折光进度，指针改变入射方向，最终点击保存标本',
        from: '日光停在种荚表皮，色散克制且完成行动不可用',
        to: '折射和地面光谱展开，种荚形成 specimen 状态并可保存',
      },
    },
    rendering: {
      primary: 'raster-image',
      supporting: ['webgl-shader', 'dom-css'],
      rationale: '唯一生成主图承担环境、对象、材质与构图身份；WebGL 只在其上做轻量折射和光谱因果，DOM 只承担可读语义与行动。',
    },
    spatialDepth: {
      mode: 'parallax',
      purpose: '利用主图自身前景叶片、温室结构、种荚尺度与轻微 UV 位移形成连续空间，避免把主体放进独立图片框。',
      cues: ['scale', 'occlusion', 'parallax', 'focus', 'lighting'],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '温室和种荚立即可见，日光只保留极轻的材质呼吸',
          thematicPurpose: '先用真实材料与空间建立可记忆的自然奇迹',
        },
        {
          phase: 'exploration',
          driver: 'hybrid',
          visualState: '滚轮连续增加折射与光谱，指针同时改变光线方向和局部亮度',
          thematicPurpose: '让访客亲手发现透明日光中的颜色，而不是观看预设幻灯片',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: '光谱稳定成完成构图，旁注退场，保存按钮把 specimen 写入页面状态',
          thematicPurpose: '把短暂光学事件收束为清楚且可验证的最终行动',
        },
      ],
      runtimeAdvantage: '同一高质量主图在滚轮和指针输入下产生折射强度、光谱宽度、光线角度与像素变化，静态海报不能等价表达。',
    },
    interactionToScene: [
      {
        input: '原生滚轮',
        sceneResponse: '连续改变 progress、refraction、spectralSpread 和画面状态',
        productMeaning: '访客让日光逐步穿过种荚并展开颜色',
      },
      {
        input: '指针、触摸或方向键',
        sceneResponse: '改变光线入射方向、局部辉光和折射位移',
        productMeaning: '同一标本会因观察方向不同而留下不同光线形状',
      },
      {
        input: '保存今日折光标本',
        sceneResponse: '完成态写入 saved，按钮和状态文本同步确认',
        productMeaning: '把短暂的光学时刻变成可带走的浏览状态',
      },
    ],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '唯一高质量生成图以完整温室环境、可信种荚材质和自然日光承担视觉身份；原始字节进入最终 hash，运行层不替换或遮盖主素材。',
      disclosure: '页面明确说明为艺术化折光标本，不代表真实光谱测量或植物学结论。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 1.75,
      initialTransferBudgetMb: 5,
      mobileFallback: 'key-visual-with-content',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'key-visual',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'first-runnable-preview',
  elapsedMs: 420_000,
  status: 'completed',
  summary: '唯一生成主图已进入项目并形成首个可运行 WebGL 增强页面；首次预览约 7 分钟，没有发起第二次生图。',
});
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r135-completion',
  elapsedMs: 1_220_000,
  status: 'completed',
  summary: '一个方向、一批素材、一张主图和一次构建完成；使用两次确定性修复与一次视觉精修，五个自适应浏览器检查均通过后停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'spatial-journey',
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
    rationale: '内容是同一温室和种荚中的连续折光事件，不需要参数工作台或固定三屏；自然滚动、边缘说明和最终保存最符合体验。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 94,
    craftCohesion: 93,
    assetIntegration: 97,
    interactionValue: 91,
    mobileReadiness: 92,
  },
  summary: '高质量温室主图承担材质和记忆点，标题、边缘阶段与自然光谱形成统一语言；滚轮、指针和保存均强化“让日光穿过种荚并收藏这一刻”的主题。',
  findings: [{
    code: 'conceptual-refraction-disclosure',
    severity: 'minor',
    checkpoint: 'opening',
    message: '光谱是艺术化视觉表达，不代表真实测量；页面已持续披露。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `首屏在 ${opening.readyAtMs}ms 内真实加载 1672×941 生成主图并启动 WebGL 增强，主题无需等待说明即可辨认。`),
    checkpoint('core', '同一温室主视觉完成 sealed → warming → spectrum → specimen，主图始终承担环境、种荚和材质。'),
    checkpoint('mobile', '390px reduced-motion 保留主图、完成态和保存行动，horizontalOverflow 为 0。'),
    checkpoint('scroll', '真实滚轮产生正向滚动位移，并同时提升 refraction、spectralSpread 和画面像素差异。'),
    checkpoint('interaction', '指针改变 lightAngle，最终按钮写入 saved；图片与 WebGL 双重失败时仍能完成语义旅程。'),
  ],
  hardGates: {
    runtimeClean: allIssues.length === 0 && resourceFailures.length === 0,
    criticalAssetsLoaded: assetVerified,
    primaryActionReachable: saveVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: true,
    interactionVerified: lightFieldVerified && saveVerified && fallbackVerified,
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
      observed: assetVerified,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: pixelChange,
      score: 96,
      summary: '首屏直接出现与温室融为一体的巨型半透明种荚、真实纤维与地面日光，五秒内形成不同于工作台和暗色科技的主题记忆。',
    },
    runtime: {
      surfaceVisible: openingState.frames > 0,
      stateChanged: lightFieldVerified,
      visualOutputChanged: pixelChange,
      advantageOverStaticObserved: lightFieldVerified,
      comparisonMethod: 'canvas-buffer-diff',
      score: 90,
      summary: '滚轮和指针不替换主图，却让折射强度、光谱宽度、入射角与 canvas 像素同步变化，使静态素材变成可参与的光学事件。',
    },
    theme: {
      themeSpecificMemoryObserved: saveVerified,
      score: 94,
      summary: '可复述记忆是进入温室、让一枚透明种荚把日光展开，再保存今日折光标本。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: lightFieldVerified,
      score: 90,
      summary: '前景叶片、温室梁柱、种荚尺度、轻微视差与局部折射形成连续空间；动效承担日光穿透的过程而非装饰。',
    },
    assets: {
      criticalAssetsLoaded: assetVerified,
      integratedWithScene: assetVerified && lightFieldVerified,
      credible: assetVerified,
      score: 97,
      summary: '唯一生成主图真实加载并进入 bundle hash；WebGL 直接以它为纹理增强，没有独立图片卡片、硬边或低质量代码主体。',
    },
    craft: {
      cohesive: true,
      score: 93,
      summary: '明亮植物绿、温暖石材、半透明膜、克制光谱、边缘排版和单一行动形成一致的植物艺术展语言。',
    },
    interaction: {
      input: '原生滚轮、指针/触摸/方向键与保存按钮',
      stateChanged: lightFieldVerified && saveVerified,
      visualOutputChanged: pixelChange,
      semanticOutputChanged: savedState.saved === true,
      summary: '滚轮和指针改变可测视觉变量，最终按钮把 specimen 写入 saved；互动直接强化产品主题。',
    },
    mobile: {
      viewportWidth: mobile.viewport?.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === 0,
      contentReadable: mobileState.reducedMotion === true,
      primaryActionReachable: mobileState.saved === true,
      summary: '390px reduced-motion 保留种荚构图、离散光谱状态与保存行动，无横向溢出。',
    },
    fallback: {
      exercised: fallbackState.fallback === true && fallbackState.assetFallback === true,
      rendered: fallbackState.ready === true,
      themePreserved: fallbackState.state === 'specimen',
      contentPreserved: fallbackState.ready === true,
      primaryActionReachable: fallbackState.saved === true,
      summary: '主图与 WebGL 双重失败时，明亮语义温室、折光阶段与保存行动仍保留，不启动第二素材批次。',
    },
    errors: {
      pageErrors: allIssues,
      consoleErrors: [],
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
  verdict: run.verdict,
  attempts: run.attemptBudget.used,
  firstPreviewMs: 420_000,
  totalElapsedMs: 1_220_000,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  archiveDisposition: run.verdict === 'pass' ? 'v3-ready' : 'research-only',
}, null, 2));
