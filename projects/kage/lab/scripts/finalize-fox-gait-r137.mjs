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
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import { assessDirectVisualQuality, createFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const deliveryId = 'fox-gait-observatory';
const runId = 'direct-r137-fox-gait-observatory';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r137-fox-gait-observatory', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r137-fox-gait-observatory.direct-creative-run.json');
const modelFile = 'assets/Fox.glb';
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'asset-manifest.json',
  'MODEL-CREDITS.md',
  'CONTRACT.md',
  modelFile,
];
const checkpointOrder = [
  'desktop-opening',
  'desktop-gait-inputs',
  'desktop-orbit-saved',
  'mobile-reduced',
  'fallback-complete',
];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-gait-inputs.png',
  '03-desktop-orbit-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
];
const modelBytesExpected = 162_852;
const modelHashExpected = 'd97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7';
const brief = '为自然教育馆设计一张观察赤狐动作节奏的沉浸式网页。真实可追溯的动画 Fox GLB 始终是空间主体。访客围绕同一只狐选择“侦察 / 行走 / 奔跑”，模型真实切换 Survey、Walk、Run 三套动画，镜头、足迹节距和动作说明同步变化，最终保存一张“我的狐步观察卡”。场景像清晨雪地里的自然纪录片与野外观察手册，明亮、真实，不是暗色科技工作台。页面必须说明这是模型动作演示，不是野外测量数据。';

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function parseGlb(bytes) {
  if (bytes.length < 28 || bytes.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('Fox.glb is not a complete binary glTF container.');
  }
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  const jsonEnd = 20 + jsonLength;
  if (version !== 2 || declaredLength !== bytes.length || jsonType !== 0x4e4f534a || jsonEnd + 8 > bytes.length) {
    throw new Error('Fox.glb header, JSON chunk, or declared byte length is invalid.');
  }
  const json = JSON.parse(bytes.subarray(20, jsonEnd).toString('utf8').trimEnd());
  const binaryLength = bytes.readUInt32LE(jsonEnd);
  const binaryType = bytes.readUInt32LE(jsonEnd + 4);
  if (binaryType !== 0x004e4942 || jsonEnd + 8 + binaryLength !== bytes.length) {
    throw new Error('Fox.glb binary chunk does not fill the declared container.');
  }
  return { version, declaredLength, jsonLength, binaryLength, json };
}

function sameOrderedValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R137 browser evidence is missing ${checkpoint}.`);
  return item;
}

function state(item) {
  if (!item?.state) throw new Error(`R137 browser evidence is missing state for ${item?.checkpoint || 'unknown'}.`);
  return item.state;
}

function issuesAreClean(item) {
  return item?.issues
    && ['pageErrors', 'consoleErrors', 'requestFailures', 'responseErrors']
      .every((key) => Array.isArray(item.issues[key]) && item.issues[key].length === 0);
}

function isGaitState(candidate, gait, clip, title, rhythm, loaded = true) {
  return candidate?.activeGait === gait
    && candidate.clip === clip
    && candidate.modelLoaded === loaded
    && candidate.sceneReady === loaded
    && candidate.fallback === !loaded
    && candidate.canvasVisible === loaded
    && candidate.activeButton === gait
    && candidate.title === title
    && candidate.trailRhythm === rhythm
    && candidate.horizontalOverflow === 0
    && typeof candidate.description === 'string'
    && candidate.description.length > 20;
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
const reportShapeValid = report.schemaVersion === 1
  && report.stage === 'r137-fox-gait-observatory-runtime-observations'
  && report.identityBinding === 'runId+bundleHash'
  && report.runId === runId
  && report.bundleHash === bundleHash
  && report.route === '/pages/v2/deliveries/fox-gait-observatory/'
  && report.revision === 'r137-proof'
  && report.complete === true
  && sameOrderedValues(report.bundleFiles, bundleFiles)
  && sameOrderedValues(report.captures, captures)
  && Array.isArray(report.observations)
  && report.observations.length === checkpointOrder.length
  && sameOrderedValues(report.observations.map((item) => item.checkpoint), checkpointOrder)
  && report.observations.every(issuesAreClean);
if (!reportShapeValid) {
  throw new Error('Browser report is failed, stale, incomplete, or malformed for the current R137 bundle.');
}

const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const credits = await readFile(resolve(sourceRoot, 'MODEL-CREDITS.md'), 'utf8');
const contractText = await readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
const indexHtml = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const mainSource = await readFile(resolve(sourceRoot, 'main.ts'), 'utf8');
const modelBytes = await readFile(resolve(sourceRoot, modelFile));
const modelHash = createHash('sha256').update(modelBytes).digest('hex');
const glb = parseGlb(modelBytes);
const modelAsset = manifest.assets?.[0];
const animationSummary = glb.json.animations?.map((animation) => ({
  name: animation.name,
  channels: animation.channels?.length,
  samplers: animation.samplers?.length,
})) ?? [];
const copyright = glb.json.asset?.copyright ?? '';
const modelTruthVerified = modelBytes.length === modelBytesExpected
  && modelHash === modelHashExpected
  && glb.version === 2
  && glb.declaredLength === modelBytesExpected
  && glb.json.asset?.version === '2.0'
  && glb.json.scene === 0
  && glb.json.scenes?.length === 1
  && glb.json.nodes?.length === 26
  && glb.json.meshes?.length === 1
  && glb.json.meshes[0]?.primitives?.length === 1
  && glb.json.skins?.length === 1
  && glb.json.materials?.length === 1
  && glb.json.textures?.length === 1
  && glb.json.images?.length === 1
  && JSON.stringify(animationSummary) === JSON.stringify([
    { name: 'Survey', channels: 21, samplers: 21 },
    { name: 'Walk', channels: 21, samplers: 21 },
    { name: 'Run', channels: 21, samplers: 21 },
  ])
  && copyright.includes('CC-BY 4.0')
  && copyright.includes('PixelMannen')
  && copyright.includes('@tomkranis')
  && copyright.includes('@AsoboStudio')
  && copyright.includes('@scurest');

const provenanceVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.batchId === 'r137-fox-official-single-model'
  && manifest.assetBatches === 1
  && manifest.assets?.length === 1
  && modelAsset?.id === 'khronos-fox-glb'
  && modelAsset.path === modelFile
  && modelAsset.kind === 'model-3d'
  && modelAsset.mimeType === 'model/gltf-binary'
  && modelAsset.bytes === modelBytesExpected
  && modelAsset.sha256 === modelHashExpected
  && modelAsset.quality === 'L3-presentable'
  && modelAsset.budgetTier === 'A1'
  && modelAsset.inspection?.scenes === 1
  && modelAsset.inspection.nodes === 26
  && modelAsset.inspection.meshes === 1
  && modelAsset.inspection.primitives === 1
  && modelAsset.inspection.skins === 1
  && sameOrderedValues(modelAsset.inspection.animations, ['Survey', 'Walk', 'Run'])
  && modelAsset.source?.type === 'licensed'
  && modelAsset.source.provider === 'KhronosGroup glTF-Sample-Assets'
  && modelAsset.source.url === 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox'
  && modelAsset.source.downloadUrl.endsWith('/Models/Fox/glTF-Binary/Fox.glb')
  && modelAsset.license?.spdx === 'CC0-1.0 AND CC-BY-4.0'
  && modelAsset.license.url === 'https://creativecommons.org/licenses/by/4.0/'
  && modelAsset.attribution.includes('PixelMannen')
  && modelAsset.attribution.includes('tomkranis')
  && modelAsset.attribution.includes('AsoboStudio')
  && modelAsset.attribution.includes('scurest')
  && modelAsset.responsibility.includes('Survey / Walk / Run')
  && modelAsset.runtimeBoundary.includes('不得用程序化狐狸或静态图片替代');

const disclosureVerified = credits.includes('KhronosGroup glTF-Sample-Assets / Fox')
  && credits.includes('PixelMannen, CC0 1.0 Universal')
  && credits.includes('tomkranis, CC BY 4.0 International')
  && credits.includes('AsoboStudio and scurest, CC BY 4.0 International')
  && credits.includes('unchanged copy of the official binary glTF download')
  && credits.includes('does not present those animation cycles as field measurements')
  && contractText.includes('宏结构为 `spatial-inspection`')
  && contractText.includes('Survey / Walk / Run')
  && contractText.includes('不得把模型缩成装饰图标或在切换动作时替换成图片')
  && contractText.includes('模型动作演示，不是野外测量数据')
  && indexHtml.includes('Khronos Fox GLB · CC0 / CC BY 4.0')
  && indexHtml.includes('模型动作演示 · 不是野外测量数据')
  && indexHtml.includes('github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox')
  && mainSource.includes("new URL('./assets/Fox.glb', import.meta.url)")
  && mainSource.includes('THREE.AnimationClip.findByName(gltf.animations, gait.clip)')
  && mainSource.includes('mixer.clipAction(clip)')
  && mainSource.includes('.play()');
if (!modelTruthVerified || !provenanceVerified || !disclosureVerified) {
  throw new Error('R137 Fox GLB truth, provenance, contract, or visible disclosure gate failed.');
}

const opening = observation(report, 'desktop-opening');
const gaitInputs = observation(report, 'desktop-gait-inputs');
const orbitSaved = observation(report, 'desktop-orbit-saved');
const mobile = observation(report, 'mobile-reduced');
const fallback = observation(report, 'fallback-complete');
const openingState = state(opening);
const mobileState = state(mobile);
const fallbackState = state(fallback);

const openingVerified = opening.viewport?.width === 1440
  && opening.viewport?.height === 900
  && opening.readyAtMs <= 15_000
  && Number.isFinite(opening.heroVisibleAtMs)
  && opening.heroVisibleAtMs <= 5_000
  && isGaitState(openingState, 'survey', 'Survey', '先让耳朵抵达。', '短距 · 停驻')
  && openingState.saved === false
  && openingState.reducedMotion === false
  && opening.modelResponses?.length === 1
  && opening.modelResponses[0]?.status === 200
  && opening.modelResponses[0]?.bytes === modelBytesExpected
  && opening.modelResponses[0]?.url?.endsWith(`/fox-gait-observatory/${modelFile}`);

const gaits = gaitInputs.gaits ?? {};
const gaitInputsVerified = isGaitState(gaits.survey, 'survey', 'Survey', '先让耳朵抵达。', '短距 · 停驻')
  && isGaitState(gaits.walk, 'walk', 'Walk', '让路径变得可读。', '等距 · 交替')
  && isGaitState(gaits.run, 'run', 'Run', '把身体交给前方。', '长距 · 伸展')
  && isGaitState(gaits.arrowWalk, 'walk', 'Walk', '让路径变得可读。', '等距 · 交替')
  && isGaitState(gaits.keyboardSurvey, 'survey', 'Survey', '先让耳朵抵达。', '短距 · 停驻');

const orbitChanged = orbitSaved.orbitCanvasHashes?.before
  && orbitSaved.orbitCanvasHashes.after
  && orbitSaved.orbitCanvasHashes.before !== orbitSaved.orbitCanvasHashes.after;
const wheelChanged = orbitSaved.wheelCanvasHashes?.before
  && orbitSaved.wheelCanvasHashes.after
  && orbitSaved.wheelCanvasHashes.before !== orbitSaved.wheelCanvasHashes.after;
const persisted = orbitSaved.persistence;
const saveVerified = persisted?.storageKey === 'r137-fox-gait-observation-card'
  && persisted.valueBeforeReload === 'run'
  && persisted.valueAfterReload === 'run'
  && isGaitState(persisted.beforeReload, 'run', 'Run', '把身体交给前方。', '长距 · 伸展')
  && isGaitState(persisted.afterReload, 'run', 'Run', '把身体交给前方。', '长距 · 伸展')
  && persisted.beforeReload.saved === true
  && persisted.afterReload.saved === true;
const spatialInputVerified = orbitChanged && wheelChanged && saveVerified;

const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && isGaitState(mobile.inputs?.walk, 'walk', 'Walk', '让路径变得可读。', '等距 · 交替')
  && isGaitState(mobile.inputs?.run, 'run', 'Run', '把身体交给前方。', '长距 · 伸展')
  && mobileState.reducedMotion === true
  && mobileState.modelLoaded === true
  && mobileState.horizontalOverflow === 0
  && Array.isArray(mobile.buttonBoxes)
  && mobile.buttonBoxes.length === 3
  && mobile.buttonBoxes.every((box) => box.left >= 0 && box.right <= 390 && box.top >= 0 && box.bottom <= 844);

const fallbackVerified = fallback.modelRequests?.length === 0
  && isGaitState(fallback.inputs?.walk, 'walk', 'Walk', '让路径变得可读。', '等距 · 交替', false)
  && isGaitState(fallback.inputs?.run, 'run', 'Run', '把身体交给前方。', '长距 · 伸展', false)
  && isGaitState(fallbackState, 'run', 'Run', '把身体交给前方。', '长距 · 伸展', false)
  && fallbackState.saved === true;

const runtimeClean = report.observations.every(issuesAreClean);
if (!runtimeClean || !openingVerified || !gaitInputsVerified || !spatialInputVerified || !mobileVerified || !fallbackVerified) {
  throw new Error('R137 report does not prove the model, gait inputs, orbit, wheel, persistence, mobile, and fallback boundaries.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (
  run.creativeProtocolVersion !== 3
  || run.mediumDecision?.preferred !== 'threejs-spatial'
  || run.assetPlan.strategy !== 'licensed'
  || run.assetPlan.assets.length !== 1
  || run.assetPlan.assets[0]?.id !== 'animated-spatial-model'
  || run.assetPlan.assets[0]?.source !== 'licensed'
  || run.assetPlan.assets[0]?.required !== true
  || run.visualAmbition?.intentLevel !== 'immersive'
  || run.visualAmbition.rendering.primary !== 'threejs-3d'
) throw new Error('R137 must remain an immersive Three.js spatial route with one required licensed model.');

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '自然教育馆中同一只可追溯动画赤狐的三种动作节奏',
    audience: '希望通过可理解空间观察认识动物动作，而不是阅读专业参数表的普通访客',
    desiredOutcome: '围绕同一只狐切换 Survey、Walk、Run，观察真实模型剪辑、镜头与足迹节奏，并保存当前狐步观察卡。',
    primaryAction: '保存狐步观察卡',
    hardConstraints: [
      'Fox.glb 必须保持唯一空间主体，实际字节、来源、许可、骨骼、网格与三个命名动画均可核验',
      'Survey、Walk、Run 必须切换模型内真实剪辑，不得用速度、程序化摆动、图片或文案替代',
      '持续声明这是模型动作演示，不是野外测量数据；fallback 不得伪装 3D 或播放状态',
    ],
    preferences: [
      '晨雪、狐橙、自然观察手册与全屏空间舞台形成明亮统一语言',
      '按钮、键盘、拖拽、滚轮和保存都服务同一只狐，不形成暗色参数工作台',
      '390px 与 reduced-motion 保留模型主体、三种选择与保存行动',
    ],
  },
  selectedDirection: {
    id: 'fox-gait-spatial-inspection',
    title: '狐步三拍 · 动画模型空间观察场',
    experienceForm: 'spatial-inspection',
    rationale: '可追溯 Fox GLB 持续占据清晨雪地舞台，三套真实动画剪辑、镜头、足迹、语义说明和保存结果共享同一动作状态；DOM 只提供自然手册式引导与诚实回退。',
  },
  referencePrinciples: [{
    referenceId: 'positive-khronos-fox-animation-clips',
    title: 'Khronos Fox · 可追溯动画模型责任',
    principle: '先冻结 GLB 来源、许可、质量、animations 与命名 clip，再让模型、动画混合器、语义 DOM 和移动端 fallback 各自承担可核验职责。',
    relevance: '本页直接需要同一真实动画模型、三种命名剪辑、OrbitControls 与诚实回退；只借实现原则，不继承示例视觉样式。',
    sourceUri: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox',
  }],
  interactionRationale: {
    mode: 'direct',
    audioApplicable: false,
    rationale: '按钮和键盘切换 Survey、Walk、Run 真实动画；拖拽环绕、滚轮靠近、视角复位与保存观察卡均产生可见且与空间观察直接相关的结果。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    heroMoment: {
      title: '清晨雪地里，同一只狐先停下来听',
      description: '五秒内先出现狐步自然观察手册与晨雪空间壳，随后本地 Fox GLB 在同一舞台落地，狐橙轮廓、阴影和观察弧线形成主题专属第一记忆。',
      themeConnection: '隐藏标题后，赤狐模型、三种狐步和雪地足迹仍可辨认“观察同一只狐动作节奏”的主题。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '选择侦察、行走或奔跑，拖拽环绕并滚轮靠近',
        from: 'Survey 停驻姿态、短距足迹和第一观察镜头',
        to: 'Walk 或 Run 真实模型剪辑、对应镜头与足迹节距，并可保存当前观察卡',
      },
    },
    rendering: {
      primary: 'threejs-3d',
      supporting: ['dom-css'],
      rationale: '本地 Fox GLB 的几何、纹理、骨骼和动画承担主体身份；Three.js 负责可信空间、灯光和输入，语义 DOM 只承担观察说明、选择、保存与失败回退。',
    },
    spatialDepth: {
      mode: 'scene-3d',
      purpose: '真实模型尺度、透视、遮挡、阴影、环绕视角与滚轮距离共同形成可检查空间，而不是把狐狸放进一张图片卡。',
      cues: ['scale', 'occlusion', 'perspective', 'lighting', 'camera-motion'],
    },
    motionArc: {
      beats: [
        { phase: 'opening', driver: 'time', visualState: '晨雪空间和自然手册先出现，Fox GLB 载入后以 Survey 停驻姿态落地', thematicPurpose: '先建立同一只可观察动物的生命感与空间身份' },
        { phase: 'exploration', driver: 'direct-input', visualState: '按钮或键盘真实切换三套 clip，拖拽和滚轮改变观察角度与距离', thematicPurpose: '让动作差异通过模型、镜头、足迹和语义同步被理解' },
        { phase: 'resolution', driver: 'direct-input', visualState: '当前动作收束为可保存的狐步观察卡并跨重载保留', thematicPurpose: '把一次空间观察变成清楚、可带走的结果' },
      ],
      runtimeAdvantage: '只有运行时模型才能在同一主体上真实播放三套骨骼动画，并让访客主动改变观察角度和距离；静态海报不能等价表达。',
    },
    interactionToScene: [
      { input: '动作按钮、数字键与左右方向键', sceneResponse: '同一 AnimationMixer 切换 Survey、Walk 或 Run，并同步镜头、足迹节距和观察文字', productMeaning: '访客比较同一只狐在三种动作中的身体节奏' },
      { input: '拖拽、触摸与滚轮', sceneResponse: 'OrbitControls 改变环绕方位与观察距离，模型和雪地关系持续可见', productMeaning: '访客像绕到野外标本另一侧一样检查动作轮廓' },
      { input: '保存狐步观察卡', sceneResponse: '当前动作写入 saved 和本地存储，按钮与重载状态同步确认', productMeaning: '把当前最关心的动作保存为本次观察结果' },
    ],
    assetCredibility: {
      level: 'product-faithful',
      strategy: '官方 Khronos Fox GLB 的原始字节、hash、网格、骨骼、纹理与三套命名动画进入最终 bundle；模型职责不由程序化替身承担。',
      disclosure: '页面持续显示模型来源与 CC0 / CC BY 4.0，并说明这是模型动作演示，不是野外测量数据。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 1.85,
      initialTransferBudgetMb: 1,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r137-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一批官方授权 GLB 和一次完整构建形成当前 bundle；未启动第二素材批次或视觉返工，模型真实性、五项自适应浏览器证据和最终身份绑定通过后停止。',
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
    rationale: '三种离散动作选择服务同一模型观察，必须让狐持续成为空间主体；不需要持久参数面板、指标簇或工作台。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 93,
    creativeDistinctiveness: 92,
    craftCohesion: 92,
    assetIntegration: 94,
    interactionValue: 92,
    mobileReadiness: 89,
  },
  summary: '真实 Fox GLB、晨雪空间、自然手册排版与狐橙强调形成统一且主题专属的记忆点；三套模型动画、镜头、足迹、环绕与保存让视觉和产品意义直接联动。',
  findings: [{
    code: 'cold-dev-model-readiness',
    severity: 'minor',
    checkpoint: 'opening',
    message: `浏览器冷启动中自然手册壳在 ${opening.heroVisibleAtMs}ms 内可见，但 WebGL/GLB 完整 ready 为 ${opening.readyAtMs}ms；模型仅 162852 bytes，后续发布阶段仍应以生产构建复核首模到达时间。`,
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, `狐步自然手册壳在 ${opening.heroVisibleAtMs}ms 内出现；唯一 162852-byte Fox GLB 随后真实加载为 Survey 主体，模型来源、许可与非测量声明持续可见。`),
    checkpoint('core', gaitInputsVerified && modelTruthVerified, '按钮与键盘在同一模型上真实选择 Survey、Walk、Run，并同步动作标题、说明和足迹节奏；GLB 内三个同名 clip、skin 与 mesh 已静态核验。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 保留 Fox 主体、三种语义动作和可达按钮，无阻断横向溢出。'),
    checkpoint('interaction', spatialInputVerified && fallbackVerified, '真实拖拽与滚轮改变画布；Run 观察卡跨重载保存；强制 fallback 不请求 GLB、不伪装 3D，仍可选择和保存。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: modelTruthVerified && provenanceVerified && openingVerified,
    primaryActionReachable: saveVerified && fallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: provenanceVerified && disclosureVerified && fallbackVerified,
    interactionVerified: gaitInputsVerified && spatialInputVerified && fallbackVerified,
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
      observed: openingVerified,
      completedAtMs: openingVerified ? opening.heroVisibleAtMs : null,
      visibleChangeObserved: openingVerified,
      score: 84,
      summary: '五秒内先出现狐步自然观察手册、晨雪场和主题标题；同一 Fox GLB 随后落入该空间，成为不可替代的第一视觉主体。',
    },
    runtime: {
      surfaceVisible: openingState.canvasVisible === true,
      stateChanged: gaitInputsVerified && spatialInputVerified,
      visualOutputChanged: Boolean(orbitChanged && wheelChanged),
      advantageOverStaticObserved: gaitInputsVerified && spatialInputVerified,
      comparisonMethod: 'canvas-buffer-diff',
      score: 92,
      summary: '按钮与键盘切换真实命名动作，拖拽和滚轮在静态姿态下产生不同 canvas hash；同一模型空间不能由一张海报等价替代。',
    },
    theme: {
      themeSpecificMemoryObserved: saveVerified,
      score: 92,
      summary: '可复述记忆是围绕同一只雪地赤狐听、走、跑，并保存最关心的一拍。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: gaitInputsVerified && spatialInputVerified,
      score: 92,
      summary: '真实骨骼动画、透视、落地阴影、足迹间距、环绕视角和滚轮距离共同解释动作节奏，不是装饰性自转。',
    },
    assets: {
      criticalAssetsLoaded: modelTruthVerified && openingState.modelLoaded === true,
      integratedWithScene: openingState.sceneReady === true && openingState.canvasVisible === true,
      credible: modelTruthVerified && provenanceVerified && disclosureVerified,
      score: 95,
      summary: '唯一 Fox GLB 的原始字节、hash、mesh、skin、纹理、许可和三套命名动画均核验并进入最终 bundle。',
    },
    craft: {
      cohesive: true,
      score: 91,
      summary: '晨雪雾蓝、狐橙、炭灰手册排版、低多边形材质和单一底部动作轨道形成一致的自然教育馆语言。',
    },
    interaction: {
      input: '动作按钮、键盘、拖拽环绕、滚轮缩放与保存按钮',
      stateChanged: gaitInputsVerified && spatialInputVerified,
      visualOutputChanged: Boolean(orbitChanged && wheelChanged),
      semanticOutputChanged: saveVerified,
      summary: '每种输入都改变模型动作、观察角度、距离或最终保存状态，并强化“比较同一只狐的三种动作”。',
    },
    mobile: {
      viewportWidth: mobile.viewport.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === 0,
      contentReadable: mobileVerified,
      primaryActionReachable: mobileVerified,
      summary: '390px reduced-motion 保留完整动作选择、主题说明和模型空间，三枚按钮均在可视区域内。',
    },
    fallback: {
      exercised: fallbackState.fallback === true,
      rendered: fallbackState.canvasVisible === false,
      themePreserved: fallback.inputs?.run?.title === '把身体交给前方。',
      contentPreserved: fallbackVerified,
      primaryActionReachable: fallbackState.saved === true,
      summary: 'fallback=1 不请求 Fox.glb、不显示 Canvas，也不宣称动画播放；三种模型动作说明和保存任务仍可完成。',
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
  throw new Error(`R137 V3 archive gate rejected the final run: ${archiveEligibility.reasons.join(' ')}`);
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
  model: {
    path: modelFile,
    bytes: modelBytes.length,
    sha256: modelHash,
    animations: animationSummary,
    nodes: glb.json.nodes.length,
    meshes: glb.json.meshes.length,
    skins: glb.json.skins.length,
  },
  macroStructure: run.adaptiveEvidence?.macroStructureReview?.candidate.layout,
  checkpoints: run.adaptiveEvidence?.profile.requiredCheckpoints,
  verdict: run.verdict,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  modelReadyAtMs: opening.readyAtMs,
  heroVisibleAtMs: opening.heroVisibleAtMs,
  archiveDisposition: 'v3-ready',
}, null, 2));
