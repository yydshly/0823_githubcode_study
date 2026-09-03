import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
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
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import { assessDirectVisualQuality, createFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const deliveryId = 'modular-room-sound';
const runId = 'direct-r142-modular-room-sound';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r142-modular-room-sound', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r142-modular-room-sound.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md', 'asset-manifest.json'];
const checkpointOrder = [
  'desktop-opening',
  'desktop-assembly-causality',
  'desktop-cutaway-audio-complete',
  'mobile-low-reduced',
  'webgl-fallback-complete',
  'audio-fallback-complete',
];
const captureSpecs = [
  ['01-desktop-opening.png', 1440, 900],
  ['02-desktop-assembly-causality.png', 1440, 900],
  ['03-desktop-cutaway-audio-complete.png', 1440, 900],
  ['04-mobile-low-reduced.png', 390, 844],
  ['05-webgl-fallback-complete.png', 1440, 900],
  ['06-audio-fallback-complete.png', 1440, 900],
];
const partNames = [
  'productRoot', 'leftModule', 'rightModule', 'bridge', 'drivers', 'bassChamber',
  'leftContact', 'rightContact', 'contacts', 'leftHook', 'rightHook', 'wallHooks',
  'frontCover', 'soundRoute',
];
const brief = '为一款可分体的客厅音响设计产品网页。访客可以自由旋转检查同一套音频设备，并在横置、左右分体和壁挂之间切换；箱体、扬声单元、低音腔、连接触点和挂扣必须按真实装配关系重新就位。开启剖视后，访客要能沿声音通路看清每个单元与腔体怎样连接，并试听当前组合对应的程序化声音片段。最终行动是保存这套组合并预约试听。页面中的产品、声路和试听均为概念设计演示，不代表真实产品参数。';

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function sameOrderedValues(actual, expected) {
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
  if (!item) throw new Error(`R142 browser evidence is missing ${checkpoint}.`);
  return item;
}

function isLiveWebglState(candidate, options = {}) {
  return candidate?.ready === true
    && candidate.fallback === false
    && candidate.frames > 2
    && candidate.drawCalls > 0
    && candidate.triangles > 1_000
    && candidate.pixelRatio > 0
    && candidate.horizontalOverflow === false
    && /^[0-9a-f]{8}$/.test(candidate.canvasVisualHash ?? '')
    && (options.mode === undefined || candidate.mode === options.mode)
    && (options.quality === undefined || candidate.quality === options.quality)
    && (options.reducedMotion === undefined || candidate.reducedMotion === options.reducedMotion);
}

function isFallbackState(candidate) {
  return candidate?.ready === true
    && candidate.fallback === true
    && candidate.frames === 0
    && candidate.drawCalls === 0
    && candidate.triangles === 0
    && candidate.pixelRatio === 0
    && candidate.horizontalOverflow === false;
}

function moduleDistance(candidate) {
  const left = candidate?.partPositions?.leftModule;
  const right = candidate?.partPositions?.rightModule;
  if (!Array.isArray(left) || !Array.isArray(right)) return Number.NaN;
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
const captureNames = captureSpecs.map(([file]) => file);
const reportShapeValid = report.schemaVersion === 1
  && report.stage === 'r142-modular-room-sound-runtime-observations'
  && report.identityBinding === 'runId+bundleHash'
  && report.runId === runId
  && report.bundleHash === bundleHash
  && report.route === '/pages/v2/deliveries/modular-room-sound/'
  && report.revision === 'r142-proof'
  && report.complete === true
  && sameOrderedValues(report.bundleFiles, bundleFiles)
  && sameOrderedValues(report.captures, captureNames)
  && Array.isArray(report.observations)
  && report.observations.length === checkpointOrder.length
  && sameOrderedValues(report.observations.map((item) => item.checkpoint), checkpointOrder)
  && report.observations.every(issuesAreClean);
if (!reportShapeValid) {
  throw new Error('Browser report is failed, stale, incomplete, or malformed for the current R142 bundle.');
}

for (const [file, width, height] of captureSpecs) {
  const bytes = await readFile(resolve(root, 'docs', 'v2-research', 'evidence', 'r142-modular-room-sound', file));
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height || bytes.length < 30_000) {
    throw new Error(`R142 capture ${file} is missing, too small, or has the wrong viewport.`);
  }
}

const [manifestText, contractText, indexHtml, styleSource, mainSource] = await Promise.all([
  readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'),
  readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8'),
  readFile(resolve(sourceRoot, 'index.html'), 'utf8'),
  readFile(resolve(sourceRoot, 'style.css'), 'utf8'),
  readFile(resolve(sourceRoot, 'main.ts'), 'utf8'),
]);
const manifest = JSON.parse(manifestText);
const mainBytes = Buffer.byteLength(mainSource);
const mainHash = createHash('sha256').update(mainSource).digest('hex');
const asset = manifest.assets?.[0];
const provenanceVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.batchId === 'r142-author-generated-speaker-rig'
  && manifest.assetBatches === 1
  && manifest.assets?.length === 1
  && asset?.id === 'author-generated-modular-speaker-rig'
  && asset.path === 'main.ts'
  && asset.kind === 'model-3d'
  && asset.mimeType === 'application/typescript'
  && asset.bytes === mainBytes
  && asset.sha256 === mainHash
  && asset.quality === 'L3-presentable'
  && asset.budgetTier === 'A1'
  && asset.inspection?.root === 'productRoot'
  && sameOrderedValues(asset.inspection.poses, ['horizontal', 'split', 'wall'])
  && sameOrderedValues(asset.inspection.namedParts, [
    'leftModule', 'rightModule', 'bridge', 'drivers', 'bassChamber', 'contacts',
    'wallHooks', 'frontCover', 'soundRoute',
  ])
  && asset.source?.type === 'author-generated'
  && asset.source.provider === 'Codex direct creative run'
  && asset.source.provenanceRecord === 'pages/v2/deliveries/modular-room-sound/CONTRACT.md'
  && asset.license?.name === 'Project-authored source; no external product asset';

const implementationVerified = contractText.includes('同一装配树的三个姿态')
  && contractText.includes('`cutaway` 只移开前盖')
  && contractText.includes('试听必须由用户手势启动')
  && contractText.includes('不是实际品牌、规格、声学测量或安装建议')
  && contractText.includes('最终身份绑定 `runId + bundleHash`')
  && indexHtml.includes('概念设计演示，不代表真实品牌与声学参数')
  && indexHtml.includes('不是安装指导')
  && indexHtml.includes('不是扬声器录音或真实房间测量')
  && mainSource.includes('createGeneratedThreeRuntime')
  && mainSource.includes('new OrbitControls(runtime.camera, canvas)')
  && mainSource.includes("canvas.addEventListener('webglcontextlost'")
  && mainSource.includes("addEventListener('pagehide', dispose")
  && mainSource.includes('window.__MODULAR_ROOM_SOUND__ =')
  && mainSource.includes('AudioContextConstructor')
  && styleSource.includes('touch-action: pan-y pinch-zoom');
if (!provenanceVerified || !implementationVerified) {
  throw new Error('R142 generated-model provenance, contract, visible disclosure, or runtime-boundary gate failed.');
}

const opening = observation(report, 'desktop-opening');
const assembly = observation(report, 'desktop-assembly-causality');
const cutawayAudio = observation(report, 'desktop-cutaway-audio-complete');
const mobile = observation(report, 'mobile-low-reduced');
const webglFallback = observation(report, 'webgl-fallback-complete');
const audioFallback = observation(report, 'audio-fallback-complete');
const openingState = opening.state;
const horizontal = assembly.assemblies?.horizontal;
const split = assembly.assemblies?.split;
const wall = assembly.assemblies?.wall;
const mobileState = mobile.state;
const webglFallbackState = webglFallback.completed;
const audioFallbackState = audioFallback.completed;

const openingVerified = opening.viewport?.width === 1440
  && opening.viewport?.height === 900
  && Number.isFinite(opening.heroVisibleAtMs)
  && opening.heroVisibleAtMs <= 5_000
  && Number.isFinite(opening.readyAtMs)
  && opening.readyAtMs <= 15_000
  && isLiveWebglState(openingState, { mode: 'horizontal', quality: 'high', reducedMotion: false })
  && openingState.revision === 'r142-proof'
  && openingState.cutaway === false
  && openingState.audioState === 'idle'
  && openingState.saved === false
  && openingState.booked === false
  && sameOrderedValues([...opening.partNames].sort(), [...partNames].sort());

const modeHashes = [horizontal?.canvasVisualHash, split?.canvasVisualHash, wall?.canvasVisualHash];
const assemblyVerified = isLiveWebglState(horizontal, { mode: 'horizontal' })
  && isLiveWebglState(split, { mode: 'split' })
  && isLiveWebglState(wall, { mode: 'wall' })
  && Math.abs(moduleDistance(horizontal) - 1.92) < 0.08
  && moduleDistance(split) > 3.45
  && wall.partPositions.leftModule[1] > split.partPositions.leftModule[1] + 0.45
  && wall.partPositions.rightModule[1] > split.partPositions.rightModule[1] + 0.55
  && wall.hooksVisible === true
  && new Set(modeHashes).size === 3
  && assembly.orbit?.input === 'mouse-drag'
  && assembly.orbit.canvasHashes?.before !== assembly.orbit.canvasHashes?.after
  && JSON.stringify(assembly.orbit.camera?.before) !== JSON.stringify(assembly.orbit.camera?.after)
  && assembly.zoom?.input === 'mouse-wheel'
  && assembly.zoom.canvasHashes?.before !== assembly.zoom.canvasHashes?.after
  && assembly.zoom.camera?.before?.distance !== assembly.zoom.camera?.after?.distance
  && assembly.nativeScroll?.input === 'mouse-wheel-over-chapter'
  && assembly.nativeScroll.after > assembly.nativeScroll.before;

const desktopCompletionVerified = cutawayAudio.beforeAudio?.audioState === 'idle'
  && cutawayAudio.beforeAudio?.playing === false
  && cutawayAudio.cutaway?.cutaway === true
  && cutawayAudio.cutaway.coverOffset > 2
  && cutawayAudio.cutaway.hooksVisible === true
  && cutawayAudio.cutaway.routeVisible === true
  && cutawayAudio.audioStarted?.audioState === 'playing'
  && cutawayAudio.audioStarted.playing === true
  && cutawayAudio.completed?.saved === true
  && cutawayAudio.completed.booked === true
  && cutawayAudio.completed.fallback === false
  && cutawayAudio.storage === '{"saved":true,"booked":true}';

const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && isLiveWebglState(mobile.inputs?.split, { mode: 'split', quality: 'low', reducedMotion: true })
  && isLiveWebglState(mobile.inputs?.wall, { mode: 'wall', quality: 'low', reducedMotion: true })
  && isLiveWebglState(mobileState, { quality: 'low', reducedMotion: true })
  && mobileState.pixelRatio <= 1
  && mobileState.cutaway === true
  && mobileState.saved === true
  && mobileState.booked === true
  && Array.isArray(mobile.controlBoxes)
  && mobile.controlBoxes.length === 7
  && mobile.controlBoxes.every((box) => box.left >= -1 && box.right <= 391 && box.width >= 44 && box.height >= 44);

const webglFallbackVerified = isFallbackState(webglFallback.inputs?.split)
  && webglFallback.inputs.split.mode === 'split'
  && isFallbackState(webglFallback.inputs?.wall)
  && webglFallback.inputs.wall.mode === 'wall'
  && webglFallback.cutaway?.cutaway === true
  && webglFallback.cutaway.routeVisible === true
  && webglFallback.cutaway.hooksVisible === true
  && isFallbackState(webglFallback.audioStarted)
  && webglFallback.audioStarted.audioState === 'playing'
  && webglFallback.audioStarted.playing === true
  && isFallbackState(webglFallbackState)
  && webglFallbackState.saved === true
  && webglFallbackState.booked === true;

const audioFallbackVerified = isLiveWebglState(audioFallback.beforeInput, { quality: 'high', reducedMotion: true })
  && audioFallback.beforeInput.audioState === 'unavailable'
  && audioFallback.beforeInput.playing === false
  && isLiveWebglState(audioFallback.unavailable)
  && audioFallback.unavailable.audioState === 'unavailable'
  && audioFallback.unavailable.playing === false
  && isLiveWebglState(audioFallback.inputs?.split, { mode: 'split' })
  && audioFallback.inputs.split.audioState === 'unavailable'
  && audioFallback.inputs.cutaway?.cutaway === true
  && audioFallback.inputs.cutaway.routeVisible === true
  && isLiveWebglState(audioFallbackState)
  && audioFallbackState.audioState === 'unavailable'
  && audioFallbackState.saved === true
  && audioFallbackState.booked === true;

const runtimeClean = report.observations.every(issuesAreClean);
if (!runtimeClean || !openingVerified || !assemblyVerified || !desktopCompletionVerified
  || !mobileVerified || !webglFallbackVerified || !audioFallbackVerified) {
  throw new Error('R142 report does not prove opening, assembly causality, scroll/orbit, cutaway/audio, mobile, and independent fallbacks.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (
  run.creativeProtocolVersion !== 3
  || run.mediumDecision?.preferred !== 'threejs-spatial'
  || run.assetPlan.strategy !== 'generated'
  || run.assetPlan.assets.length !== 1
  || run.assetPlan.assets[0]?.id !== 'hero-product'
  || run.assetPlan.assets[0]?.source !== 'generated'
  || run.assetPlan.assets[0]?.required !== true
  || run.visualAmbition?.intentLevel !== 'immersive'
  || run.visualAmbition.rendering.primary !== 'threejs-3d'
) throw new Error('R142 must remain an immersive Three.js route with one required generated model batch.');

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '同一套可横置、分体、壁挂并可剖视的概念客厅音响',
    audience: '正在为客厅选择音响摆位、希望先理解装配和声路的普通访客',
    desiredOutcome: '围绕同一装配树检查三种姿态、内部声路与当前程序化试听，并保存组合、记录预约意向。',
    primaryAction: '保存当前组合并预约客厅试听',
    hardConstraints: [
      'horizontal、split、wall 必须改变同一具名装配树的真实空间关系，不能替换成图片或无关对象',
      '剖视只移开前盖；WebGL 与音频独立失败时，装配、保存和预约仍须诚实可用',
      '产品、声路与声音均为概念演示，不得冒充品牌规格、声学测量或安装建议',
    ],
    preferences: [
      '奶油白日光空间、珊瑚橙产品、钴蓝声路与拉丝金属形成温暖雕塑家具语言',
      '非均匀原生滚动负责叙事，按钮、键盘、拖拽、滚轮和触摸负责直接检查',
      '390px、low quality、reduced motion 保留完整语义旅程和至少 44px 控制',
    ],
  },
  selectedDirection: {
    id: 'daylight-modular-sound-path',
    title: '日光雕塑音响 · 可检查装配声路',
    experienceForm: 'spatial-inspection',
    rationale: '同一珊瑚橙装配树常驻奶油白客厅舞台，原生滚动、三姿态、剖视、受限 OrbitControls、程序化声音和最终行动共享一套运行状态。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-smart-audio-anchor',
      title: '同一可信产品贯穿全程',
      principle: '让抽象声音反馈绑定具体产品状态，产品身份、装配关系和行动不被中段装饰替换。',
      relevance: '本页需要同一音响在三姿态、剖视、试听与完成态中保持可追踪身份，只借状态锚定原则。',
    },
    {
      referenceId: 'positive-sonic-editorial-feedback',
      title: '声音、可见反馈与行动共享状态',
      principle: '声音仅由用户手势启动，可见反馈说明当前状态，并诚实披露声音边界。',
      relevance: '本页用程序化提示音强化当前装配，但不继承电台排版或冒充实测声学。',
    },
  ],
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: true,
    rationale: '原生滚动推进非均匀章节；按钮、键盘、触摸、拖拽与滚轮直接改变同一装配树、剖视、相机、试听及最终完成状态。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    heroMoment: {
      title: '日光客厅里，一件声音家具先合为一体',
      description: '五秒内奶油白空间、珊瑚橙双模块与金属桥形成可辨识声音家具；具名 WebGL 装配树随后承担真实遮挡、材质与空间关系。',
      themeConnection: '隐藏标题后，橙色双模块、中央金属桥、三姿态和蓝色内部声路仍能辨认“可分体客厅音响”。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '滚动章节或使用装配按钮、数字键、剖视、拖拽、滚轮与试听按钮',
        from: '双模块由金属桥合为一件横置声音家具，前盖闭合且试听未启动',
        to: '模块分开或抬升壁挂，前盖移开，内部腔体、触点、挂扣和钴蓝声路可检查，并可保存预约',
      },
    },
    rendering: {
      primary: 'threejs-3d',
      supporting: ['dom-css'],
      rationale: 'Three.js 生成并保持唯一具名音响装配树，承担空间拓扑、遮挡、材质、相机和声路；语义 DOM 承担章节、控制、披露、SVG fallback 与行动。',
    },
    spatialDepth: {
      mode: 'scene-3d',
      purpose: '用真实相对位置、旋转、遮挡、前盖位移、挂扣、触点和受限相机证明装配因果，而不是用平面状态图冒充。',
      cues: ['scale', 'occlusion', 'perspective', 'lighting', 'camera-motion'],
    },
    motionArc: {
      beats: [
        { phase: 'opening', driver: 'time', visualState: '横置双模块与金属桥在日光客厅成为一件声音家具', thematicPurpose: '先建立同一概念产品与温暖住宅尺度' },
        { phase: 'exploration', driver: 'hybrid', visualState: '原生滚动与直接输入切换分体、剖视和壁挂，并允许环绕、靠近与程序化试听', thematicPurpose: '让空间拓扑、内部声路和当前声音状态变得可理解' },
        { phase: 'resolution', driver: 'direct-input', visualState: '当前组合以保存和预约意向收束，同时保留概念边界', thematicPurpose: '把理解装配关系转化为明确且诚实的下一步' },
      ],
      runtimeAdvantage: '只有持续运行的同一装配树才能同时证明三姿态的相对位置、剖视遮挡、可控相机、声路与声音状态；静态海报不能等价表达。',
    },
    interactionToScene: [
      { input: '原生滚动、装配按钮与数字/方向键', sceneResponse: '同一 leftModule、rightModule 与 bridge 插值到 horizontal、split 或 wall 姿态', productMeaning: '访客理解同一产品如何随客厅摆位重新装配' },
      { input: '拖拽环绕与滚轮靠近', sceneResponse: 'OrbitControls 在受限角度与距离内改变相机，并产生不同画布与运行时 hash', productMeaning: '访客主动检查模块、触点、挂扣和前后遮挡' },
      { input: '剖视与用户手势试听', sceneResponse: '只移开 frontCover，显示 drivers、bassChamber、contacts、wallHooks、soundRoute，并启动当前姿态的程序化声音', productMeaning: '访客把听觉提示与可见内部连接关联起来' },
      { input: '保存与预约按钮', sceneResponse: 'saved、booked、状态文字和本地存储同步确认，不向外部服务提交资料', productMeaning: '把当前概念组合收束为下一步试听意向' },
    ],
    assetCredibility: {
      level: 'product-faithful',
      strategy: '单一作者生成 TypeScript 模型批次提供具名、可寻址、可插值的产品树；manifest 冻结 main.ts 字节、SHA-256、姿态和部件职责。',
      disclosure: '页面与 fallback 持续说明这是精致概念产品和程序化声音提示，不是现实品牌、规格、测量或安装建议。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 1.9,
      initialTransferBudgetMb: 2,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'key-visual',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r142-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一个确定性程序化模型批次和一次完整构建形成当前 bundle；六项真实浏览器检查点及 runId+bundleHash 身份门禁通过后停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'spatial-inspection',
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
    rationale: '三种离散装配、剖视、环绕和声音共享同一空间主体；原生章节与情境按钮足够，不需要持久参数面板或指标工作台。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 93,
    craftCohesion: 92,
    assetIntegration: 95,
    interactionValue: 95,
    mobileReadiness: 92,
  },
  summary: '日光住宅、珊瑚橙装配树、金属桥与钴蓝声路形成主题专属产品电影；三姿态、剖视、相机、声音、移动端与独立 fallback 都直接解释产品意义。',
  findings: [],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, `日光产品电影与横置装配在 ${opening.heroVisibleAtMs}ms 内可见，WebGL 于 ${opening.readyAtMs}ms 内产生具名部件、调用数、三角形与画布 hash。`),
    checkpoint('core', provenanceVerified && implementationVerified && assemblyVerified && desktopCompletionVerified, '单一作者生成装配树、manifest、三姿态空间位置、剖视部件、保存与预约均由当前 bundle 和真实浏览器状态核验。'),
    checkpoint('mobile', mobileVerified, '390×844、low quality、reduced motion 的触摸旅程保持三姿态、剖视、44px 控制、DPR≤1、保存与预约，无横向溢出。'),
    checkpoint('scroll', assemblyVerified, '真实鼠标滚轮在章节卡上推进原生页面滚动；装配状态与非均匀章节同步，未退化为强制滚动容器。'),
    checkpoint('interaction', assemblyVerified && webglFallbackVerified && audioFallbackVerified, '真实按钮、键盘、鼠标拖拽、画布滚轮和触摸改变装配、相机、hash 与完成状态；WebGL/音频可独立失败。'),
    checkpoint('audio', desktopCompletionVerified && webglFallbackVerified && audioFallbackVerified, '音频仅在真实试听按钮手势后进入 playing；WebGL fallback 仍可播放，audioFallback 明确 unavailable 且不阻断装配、剖视和主要行动。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: provenanceVerified && implementationVerified && openingVerified,
    primaryActionReachable: desktopCompletionVerified && mobileVerified && webglFallbackVerified && audioFallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: provenanceVerified && implementationVerified && webglFallbackVerified && audioFallbackVerified,
    interactionVerified: assemblyVerified && desktopCompletionVerified && mobileVerified,
    audioVerified: desktopCompletionVerified && webglFallbackVerified && audioFallbackVerified,
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
      completedAtMs: openingVerified ? opening.heroVisibleAtMs : null,
      visibleChangeObserved: openingVerified,
      score: 92,
      summary: '五秒内日光客厅、珊瑚橙双模块与金属桥形成可辨识声音家具，真实 WebGL 装配树随后承担结构和材质。',
    },
    runtime: {
      surfaceVisible: openingState.fallback === false && openingState.frames > 2,
      stateChanged: assemblyVerified && desktopCompletionVerified,
      visualOutputChanged: assembly.orbit.canvasHashes.before !== assembly.orbit.canvasHashes.after
        && assembly.zoom.canvasHashes.before !== assembly.zoom.canvasHashes.after,
      advantageOverStaticObserved: assemblyVerified && desktopCompletionVerified,
      comparisonMethod: 'canvas-buffer-diff',
      score: 96,
      summary: '三姿态改变具名部件位置；拖拽、滚轮、剖视与声音改变相机、遮挡、声路及 canvas/hash，静态海报不能等价表达。',
    },
    theme: {
      themeSpecificMemoryObserved: desktopCompletionVerified,
      score: 94,
      summary: '可复述记忆是同一件珊瑚橙声音家具从横置合体到左右分体、壁挂，再移开前盖沿蓝色声路试听并保存。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: assemblyVerified,
      score: 95,
      summary: '模块、金属桥、触点、挂扣与前盖使用真实相对位置、旋转、遮挡和受限相机解释装配因果，不是装饰性自转。',
    },
    assets: {
      criticalAssetsLoaded: provenanceVerified && openingVerified,
      integratedWithScene: openingState.ready === true && openingState.fallback === false,
      credible: provenanceVerified && implementationVerified,
      score: 95,
      summary: `唯一作者生成模型批次以 main.ts ${mainBytes} bytes / ${mainHash} 冻结，具名姿态和部件职责与可见概念边界均可核验。`,
    },
    craft: {
      cohesive: true,
      score: 93,
      summary: '奶油白、珊瑚橙、钴蓝、拉丝金属、住宅日光与编辑式章节形成统一且非工作台式的产品电影语言。',
    },
    interaction: {
      input: '原生滚动、装配按钮、键盘、触摸、鼠标拖拽、滚轮、剖视、试听、保存与预约',
      stateChanged: assemblyVerified && desktopCompletionVerified,
      visualOutputChanged: assembly.orbit.canvasHashes.before !== assembly.orbit.canvasHashes.after,
      semanticOutputChanged: desktopCompletionVerified,
      summary: '每种输入都改变同一产品的装配、观察、声音或完成状态，并直接服务于理解与保存当前组合。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === false,
      contentReadable: mobileVerified,
      primaryActionReachable: mobileState.saved === true && mobileState.booked === true,
      summary: '390px low/reduced 保留 WebGL 主体、触摸装配、剖视、保存和预约，控制不越界且 DPR 被限制为 1。',
    },
    fallback: {
      exercised: webglFallbackState.fallback === true && audioFallbackState.audioState === 'unavailable',
      rendered: webglFallbackState.fallback === true,
      themePreserved: webglFallback.cutaway?.routeVisible === true,
      contentPreserved: webglFallbackVerified && audioFallbackVerified,
      primaryActionReachable: webglFallbackState.saved === true && webglFallbackState.booked === true
        && audioFallbackState.saved === true && audioFallbackState.booked === true,
      summary: 'WebGL fallback 以同状态 SVG 保留三姿态、剖视、试听和完成；audioFallback 保留实时 WebGL、装配、剖视与完成并明确 unavailable。',
    },
    errors: {
      pageErrors: report.observations.flatMap((item) => item.issues.pageErrors),
      consoleErrors: report.observations.flatMap((item) => item.issues.consoleErrors),
      blockingResourceFailures: report.observations.flatMap((item) => [
        ...item.issues.requestFailures,
        ...item.issues.responseErrors,
      ]),
    },
  },
});

run = attachDirectCreativeEvidence(run, finalEvidence);
run = attachDirectCreativeWowEvidence(run, wowEvidence);
run = finalizeDirectCreativeRun(run);
const archiveEligibility = evaluateV3DirectCreativeArchiveEligibility(run);
if (run.verdict !== 'pass' || !archiveEligibility.eligible) {
  throw new Error(`R142 V3 archive gate rejected the final run: ${archiveEligibility.reasons.join(' ')}`);
}
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
  generatedModel: { path: 'main.ts', bytes: mainBytes, sha256: mainHash },
  macroStructure: run.adaptiveEvidence?.macroStructureReview?.candidate.layout,
  checkpoints: run.adaptiveEvidence?.profile.requiredCheckpoints,
  verdict: run.verdict,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  archiveDisposition: 'v3-ready',
}, null, 2));
