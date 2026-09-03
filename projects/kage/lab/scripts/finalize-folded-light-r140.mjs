import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
import {
  attachDirectCreativeEvidence,
  directCreativeRunSchema,
  finalizeDirectCreativeRun,
  recordDirectCreativeAttempt,
  setDirectCreativeFinalCandidate,
} from '../src/v2/direct-creative-run.ts';
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import { assessDirectVisualQuality, createFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const deliveryId = 'folded-light-studio';
const runId = 'direct-r140-folded-light-studio';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio.direct-creative-run.json');
const e2ePath = resolve(root, 'e2e', 'v2-r140-folded-light-studio-delivery.spec.ts');
const evidenceRoot = resolve(root, 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio');
const atlasFile = 'assets/folded-paper-lamp-atlas-v1.png';
const derivativeFiles = [
  'assets/state-01-folded.png',
  'assets/state-02-third.png',
  'assets/state-03-two-thirds.png',
  'assets/state-04-open.png',
];
const runtimeBundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  atlasFile,
  ...derivativeFiles,
];
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
  atlasFile,
  ...derivativeFiles,
];
const checkpointOrder = [
  'desktop-opening',
  'desktop-causal-journey',
  'mobile-reduced-open',
  'asset-fallback',
];
const captureSpecs = [
  { file: '01-desktop-opening.png', width: 1440, height: 900 },
  { file: '02-desktop-mid-unfold.png', width: 1440, height: 900 },
  { file: '03-desktop-open-booked.png', width: 1440, height: 900 },
  { file: '04-mobile-reduced-open.png', width: 390, height: 844 },
  { file: '05-asset-fallback.png', width: 1440, height: 900 },
];
const expectedFrames = [
  { path: derivativeFiles[0], frameRect: { x: 0, y: 0, width: 627, height: 627 } },
  { path: derivativeFiles[1], frameRect: { x: 627, y: 0, width: 627, height: 627 } },
  { path: derivativeFiles[2], frameRect: { x: 0, y: 627, width: 627, height: 627 } },
  { path: derivativeFiles[3], frameRect: { x: 627, y: 627, width: 627, height: 627 } },
];
const brief = '为一家使用再生纸纤维制作折叠灯具的工作室设计发布网页。开场是一盏完全折叠的纸灯；访客滚动、拖动或用方向键时，同一盏灯依次展开，纸纤维开始透光，桌面光影随结构变化。完全展开后显示结构与材料说明，最终行动是“预约看样”。画面像工业设计杂志与灯光舞台结合，明亮、安静、有视觉冲击力，不做参数工作台。所有结构与发光变化均为概念演示。';

async function hashFiles(base, files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(base, file)));
  }
  return hash.digest('hex');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sameOrderedValues(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function sameRect(actual, expected) {
  return actual?.x === expected.x
    && actual?.y === expected.y
    && actual?.width === expected.width
    && actual?.height === expected.height;
}

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R140 browser evidence is missing ${checkpoint}.`);
  return item;
}

function parseWeights(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map(Number);
}

function weightsAreNormalized(weights) {
  return weights.length === 4
    && weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1)
    && Math.abs(weights.reduce((sum, weight) => sum + weight, 0) - 1) <= 0.002;
}

async function inspectPng(path) {
  const bytes = await readFile(path);
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let nonTransparent = 0;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0) nonTransparent += 1;
  }
  return {
    bytes,
    width: info.width,
    height: info.height,
    byteLength: bytes.length,
    hash: sha256(bytes),
    alphaCoverage: Math.round((nonTransparent / (info.width * info.height)) * 100_000_000) / 100_000_000,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha === true,
  };
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const e2eSource = await readFile(e2ePath, 'utf8');
const runtimeBundleHash = await hashFiles(sourceRoot, runtimeBundleFiles);
const reportShapeValid = report.schemaVersion === 1
  && report.stage === 'r140-folded-light-runtime-observations'
  && report.identityBinding === 'runId+bundleHash'
  && report.runId === runId
  && report.bundleHash === runtimeBundleHash
  && report.route === '/pages/v2/deliveries/folded-light-studio/'
  && report.revision === 'r140-proof'
  && report.complete === true
  && sameOrderedValues(report.bundleFiles, runtimeBundleFiles)
  && Array.isArray(report.observations)
  && report.observations.length === checkpointOrder.length
  && sameOrderedValues(report.observations.map((item) => item.checkpoint), checkpointOrder);
if (!reportShapeValid) {
  throw new Error('R140 browser report is stale, incomplete, malformed, or no longer matches the runtime bundle subset.');
}

const captureEvidence = [];
for (const spec of captureSpecs) {
  const image = await inspectPng(resolve(evidenceRoot, spec.file));
  if (image.format !== 'png'
    || image.width !== spec.width
    || image.height !== spec.height
    || image.byteLength < 100_000) {
    throw new Error(`R140 screenshot ${spec.file} is missing, malformed, or has the wrong viewport dimensions.`);
  }
  captureEvidence.push({ file: spec.file, width: image.width, height: image.height, bytes: image.byteLength, sha256: image.hash });
}

const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const contractText = await readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
const indexHtml = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const mainSource = await readFile(resolve(sourceRoot, 'main.ts'), 'utf8');
const assetFiles = [atlasFile, ...derivativeFiles];
const inspectedAssets = new Map();
for (const file of assetFiles) {
  inspectedAssets.set(file, await inspectPng(resolve(sourceRoot, file)));
}
const atlas = inspectedAssets.get(atlasFile);
const atlasEntry = manifest.assets?.find((asset) => asset.path === atlasFile);
const manifestEnvelopeVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.batchId === 'r140-folded-paper-lamp-single-atlas'
  && manifest.assetBatches === 1
  && manifest.generationCalls === 1
  && manifest.sourceAssetCount === 1
  && manifest.derivativeCount === 4
  && manifest.medium?.preferred === 'generated-image'
  && manifest.medium?.rendering === 'raster-image'
  && sameOrderedValues(manifest.assets?.map((asset) => asset.path), assetFiles)
  && atlasEntry?.role === 'source-atlas'
  && atlasEntry?.sourceLineage?.type === 'generated-source'
  && atlasEntry?.sourceLineage?.provider === 'built-in-imagegen'
  && atlasEntry?.sourceLineage?.batchId === manifest.batchId
  && atlasEntry?.sourceLineage?.sourceAsset === null
  && atlasEntry?.sourceLineage?.sourceSha256 === null
  && atlasEntry?.sourceLineage?.operation === 'single-transparent-atlas-generation';
if (!manifestEnvelopeVerified) {
  throw new Error('R140 asset manifest does not prove one generated atlas batch and four mechanical derivatives.');
}

let assetMetadataVerified = true;
for (const entry of manifest.assets) {
  const actual = inspectedAssets.get(entry.path);
  assetMetadataVerified = assetMetadataVerified
    && Boolean(actual)
    && entry.kind === 'raster-image'
    && entry.mimeType === 'image/png'
    && entry.width === actual.width
    && entry.height === actual.height
    && entry.bytes === actual.byteLength
    && entry.sha256 === actual.hash
    && entry.alphaCoverage === actual.alphaCoverage
    && actual.format === 'png'
    && actual.hasAlpha === true;
}

let derivativeLineageVerified = true;
for (const expected of expectedFrames) {
  const entry = manifest.assets.find((asset) => asset.path === expected.path);
  const frameBytes = await sharp(atlas.bytes)
    .extract({
      left: expected.frameRect.x,
      top: expected.frameRect.y,
      width: expected.frameRect.width,
      height: expected.frameRect.height,
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const derivativeBytes = await sharp(inspectedAssets.get(expected.path).bytes)
    .ensureAlpha()
    .raw()
    .toBuffer();
  derivativeLineageVerified = derivativeLineageVerified
    && entry?.role === 'mechanical-derivative'
    && sameRect(entry?.frameRect, expected.frameRect)
    && entry?.sourceLineage?.type === 'mechanical-derivative'
    && entry?.sourceLineage?.provider === 'local-pixel-crop'
    && entry?.sourceLineage?.batchId === manifest.batchId
    && entry?.sourceLineage?.sourceAsset === atlasFile
    && entry?.sourceLineage?.sourceSha256 === atlas.hash
    && entry?.sourceLineage?.operation === 'pixel-identical-mechanical-crop'
    && Buffer.compare(frameBytes, derivativeBytes) === 0;
}
const atlasMetadataVerified = atlas.width === 1254
  && atlas.height === 1254
  && atlas.byteLength === atlasEntry.bytes
  && atlas.hash === atlasEntry.sha256
  && atlas.alphaCoverage === atlasEntry.alphaCoverage
  && sameRect(atlasEntry.frameRect, { x: 0, y: 0, width: 1254, height: 1254 });
if (!assetMetadataVerified || !atlasMetadataVerified || !derivativeLineageVerified) {
  throw new Error('R140 image dimensions, bytes, SHA-256, alpha coverage, frame rect, or pixel lineage verification failed.');
}

const contractVerified = contractText.includes(runId)
  && contractText.includes('`generated-image`')
  && contractText.includes('primary rendering 为 `raster-image`')
  && contractText.includes('Interaction model: `mixed`')
  && contractText.includes('一次素材批次、一次构建')
  && contractText.includes('两次确定性修复')
  && contractText.includes('一次视觉精修')
  && contractText.includes('不得重跑素材生成')
  && contractText.includes('浏览器只允许在这两项修复后更新同一既定四项矩阵')
  && contractText.includes('不得伪装灯具已经展开')
  && contractText.includes('88 分优秀门');
const disclosureVerified = indexHtml.includes('结构、透光与光影变化均为概念演示，不代表量产参数')
  && indexHtml.includes('不伪装展开效果')
  && indexHtml.includes('本页面不会用通用图形冒充纸灯状态')
  && contractVerified;
if (!disclosureVerified) {
  throw new Error('R140 contract or visible conceptual/fallback truth boundary is missing.');
}

const opening = observation(report, 'desktop-opening');
const journey = observation(report, 'desktop-causal-journey');
const mobile = observation(report, 'mobile-reduced-open');
const fallback = observation(report, 'asset-fallback');
const midWeights = parseWeights(journey.midWeights);
const finalWeights = parseWeights(journey.finalWeights);
const openingVerified = opening.state === 'folded'
  && opening.progress === '0.000'
  && opening.frameBackground?.includes('state-01-folded.png')
  && opening.frameBackgroundSize === 'contain'
  && !opening.bodyBackgroundImage?.includes('folded-paper-lamp-atlas-v1.png')
  && opening.lampWidth > opening.viewportWidth * 0.45
  && opening.lampWidth < opening.viewportWidth * 0.7
  && opening.horizontalOverflow === false;
const e2eInputProtocolVerified = e2eSource.includes('page.mouse.wheel(0, 1150)')
  && e2eSource.includes("document.body.dataset.inputChannel === 'pointer-drag'")
  && e2eSource.includes("page.keyboard.press('End')")
  && e2eSource.includes("document.body.dataset.state === 'open'")
  && e2eSource.includes("toHaveAttribute('data-booking', 'confirmed')");
const sharedStateSourceVerified = mainSource.includes('let targetProgress = 0')
  && mainSource.includes('let displayProgress = 0')
  && mainSource.includes("body.dataset.inputChannel = channel")
  && mainSource.includes("addEventListener('scroll'")
  && mainSource.includes("dragSurface.addEventListener('pointerdown'")
  && mainSource.includes("addEventListener('keydown'")
  && mainSource.includes("event.key === 'End'")
  && mainSource.includes('updateFrames(progress)');
const journeyVerified = journey.afterWheel >= 0.2
  && journey.afterDrag > journey.afterWheel
  && weightsAreNormalized(midWeights)
  && midWeights.filter((weight) => weight > 0).length >= 2
  && weightsAreNormalized(finalWeights)
  && finalWeights[3] > 0.8
  && journey.finalInput === 'keyboard'
  && journey.booking === 'confirmed'
  && e2eInputProtocolVerified
  && sharedStateSourceVerified;
const mobileVerified = mobile.progress === '1.000'
  && mobile.state === 'open'
  && mobile.input === 'stage-navigation'
  && mobile.horizontalOverflow === false
  && mobile.trackButtons === 4;
const fallbackVerified = fallback.state === 'folded'
  && fallback.assetStatus === 'failed'
  && fallback.fallbackVisible === true;
const runtimeClean = reportShapeValid && captureEvidence.length === captureSpecs.length;
if (!openingVerified || !journeyVerified || !mobileVerified || !fallbackVerified || !runtimeClean) {
  throw new Error('R140 report does not prove opening, shared wheel/drag/keyboard progress, completion, mobile, and honest fallback.');
}

const bundleHash = await hashFiles(sourceRoot, bundleFiles);
const identity = { runId, bundleHash };
const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'generated-image'
  || run.assetPlan.strategy !== 'generated'
  || run.visualAmbition?.rendering.primary !== 'raster-image') {
  throw new Error('R140 brief must remain a generated-image / raster-image route.');
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '同一盏再生纸纤维折叠灯从合拢到成光的连续形态',
    audience: '希望理解纸灯结构并预约查看真实样品的设计访客',
    desiredOutcome: '用滚轮、拖拽或键盘让同一盏灯依次展开，理解纤维透光和结构变化，并在完全展开后预约看样。',
    primaryAction: '预约看样',
    hardConstraints: [
      '生成 atlas 与四个机械裁剪 derivative 必须来自同一素材批次并进入最终 bundleHash',
      '滚轮、拖拽、键盘和阶段导航必须共享同一展开进度，不得形成参数工作台',
      '所有结构与发光变化均为概念演示；素材失败时保持 folded 并明确不伪装展开',
    ],
    preferences: [
      '工业设计杂志、灯光舞台、纸白与暖光形成明亮安静的视觉语言',
      '同一铰点、灯座和纸纤维在四态保持连续，代码光场只承担增强',
      '390px 与 reduced-motion 保留四个关键状态和预约行动',
    ],
  },
  selectedDirection: {
    id: 'folded-paper-lamp-causal-unfold',
    title: '折光成形 · 纸灯连续展开舞台',
    experienceForm: 'image-sequence-spatial-journey',
    rationale: '透明生成 atlas 的四个机械裁剪持续承担同一纸灯；sticky 编辑舞台让共享进度同时驱动帧权重、透光、材料叙事和预约，不复制工作台或卡片式结构。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-prism-seed-media-responsibility',
      title: '棱镜种子剧场 · 主素材职责分离',
      principle: '高质量生成素材承担对象、材质和第一记忆，代码只增强可验证的输入因果。',
      relevance: '本页只借素材职责原则；纸灯需要自己的四态 atlas、机械裁剪和展开叙事，不复制温室构图或 WebGL 折射。',
      sourceUri: '../pages/v2/deliveries/prism-seed-theatre/',
    },
    {
      referenceId: 'positive-shared-state-causal-inputs',
      title: '共享状态驱动 · 多输入同一结果',
      principle: '滚轮、指针和键盘必须写入同一产品状态，并由状态统一更新视觉与语义结果。',
      relevance: '纸灯展开正需要三类输入共享 progress；只借因果验证方法，不继承任何既有视觉样式。',
      sourceUri: '../../docs/V2-REFERENCE-GUIDED-CREATIVE-CONTRACT.md',
    },
  ],
  assetPlan: {
    batchId: 'r140-folded-paper-lamp-single-atlas',
    strategy: 'generated',
    rationale: '唯一生成 atlas 承担同一纸灯四态；四张运行图只是该 atlas 的像素完全一致机械裁剪，不计为额外生成批次。',
    assets: [{
      id: 'state-subject',
      role: '同一再生纸灯的 folded / third / two-thirds / open 四个连续透明栅格状态，由一张生成 atlas 和四个机械裁剪共同交付。',
      source: 'generated',
      required: true,
    }],
  },
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '滚轮、灯体指针拖拽与键盘共享同一 progress，统一改变四帧权重、透光、材料说明和预约解锁；阶段按钮提供 reduced-motion 的离散入口。',
  },
  visualAmbition: {
    schemaVersion: 1,
    intentLevel: 'expressive',
    intentRationale: '既有截图证明主题专属主素材、编辑构图和因果展开达到优秀质量；证据未记录精确首屏毫秒数，因此不额外宣称未测量的旗舰五秒门。',
    heroMoment: {
      title: '把一束光折进纸里',
      description: '首屏以完全折叠的透明纸灯主体、超大编辑标题、纤维纸白和金属铰点建立工业设计杂志与灯光舞台的第一印象。',
      themeConnection: '隐藏标题后，同一折叠纸灯、纤维纹理、金属铰点与暖光仍能明确辨认再生纸灯主题。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '滚轮、灯体拖拽、方向键或阶段按钮推进共享进度',
        from: '完全合拢、低透光、预约锁定的纸灯',
        to: '完全展开、暖光和投影扩散、材料说明收束且预约解锁的同一盏灯',
      },
    },
    rendering: {
      primary: 'raster-image',
      supporting: ['image-sequence', 'canvas-2d', 'dom-css'],
      rationale: '单批透明 atlas 及其四个机械裁剪承担纸灯身份和材质；Canvas 2D 只画克制光场，DOM/CSS 只承担编辑排版、状态混合、披露与行动。',
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '纸灯尺度、透明边界、投影、光晕、文字遮挡关系和轻微水平位移形成灯光舞台深度，不伪装真实 3D。',
      cues: ['scale', 'occlusion', 'focus', 'lighting'],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: '完全折叠纸灯与大标题直接建立产品、材质和安静舞台。',
          thematicPurpose: '先确认同一主体和初始结构，再邀请访客展开。',
        },
        {
          phase: 'exploration',
          driver: 'hybrid',
          visualState: 'shared progress 交叉混合相邻机械裁剪，同时扩散暖光、投影并更新材料叙事。',
          thematicPurpose: '让结构展开与纤维透光成为同一可操作因果。',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: 'open 帧占主导，结构说明收束，预约按钮解锁并可确认。',
          thematicPurpose: '把概念演示自然收束到查看真实样品的行动。',
        },
      ],
      runtimeAdvantage: '静态海报不能同时表达同一灯具的四态连续性、多输入共享进度、透光增强和只在完成后解锁预约的因果链。',
    },
    interactionToScene: [
      {
        input: '原生滚轮',
        sceneResponse: '更新同一 targetProgress，并同步改变 frame weights、状态文案、灯光与预约门槛。',
        productMeaning: '访客沿页面旅程把折叠结构逐步展开。',
      },
      {
        input: '灯体指针或触摸拖拽',
        sceneResponse: '水平或垂直位移写入同一 progress，并反映为相邻纸灯帧交叉混合。',
        productMeaning: '访客像展开实物一样直接推动灯体结构。',
      },
      {
        input: '方向键、Home / End 或阶段按钮',
        sceneResponse: '通过同一 scrollToProgress 路径抵达连续或离散展开状态。',
        productMeaning: '键盘和 reduced-motion 访客获得等价完成路径。',
      },
      {
        input: '预约看样',
        sceneResponse: '仅在 open 状态启用，点击后写入 confirmed 并更新行动文案。',
        productMeaning: '概念展开完成后转向查看真实样品。',
      },
    ],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '透明 atlas 是唯一生成源；四个运行时状态是带精确 frame rect、bytes、hash、alpha coverage 和逐像素同一性证明的机械裁剪。',
      disclosure: '页面持续声明结构、透光与光影为概念演示，不代表量产参数；fallback 不用通用图形冒充纸灯状态。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 1.75,
      initialTransferBudgetMb: 4.5,
      mobileFallback: 'key-visual-with-content',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'spatial-journey',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'purchase-or-book',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: true,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容是同一盏灯的连续展开和完成后预约；sticky 空间旅程直接支持状态因果，没有并发参数或持久工作台需求。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 93,
    craftCohesion: 92,
    assetIntegration: 96,
    interactionValue: 91,
    mobileReadiness: 78,
  },
  summary: '桌面三态截图以同一纸灯、清晰纤维、金属铰点、暖光与大尺度编辑排版形成强而一致的产品记忆；wheel、drag、keyboard 共享展开因果。390px 主要行动和四态轨道可达且无横向溢出，但完成态标题下半部被行动区遮住，因此移动端维度明确下调。',
  findings: [{
    code: 'mobile-open-copy-crop',
    severity: 'minor',
    checkpoint: 'mobile',
    message: '390×844 完成态截图中，材料标题的下半部被预约行动区遮住；主灯、阶段轨道和预约按钮仍清楚可达，且没有页面级横向溢出。',
  }],
}, run.interactionRationale);

if (visualQuality.verdict !== 'pass' || visualQuality.score < 88) {
  throw new Error(`R140 visual quality did not reach the excellent gate: ${visualQuality.score}.`);
}

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, '1440×900 开场真实显示 atlas 左上裁剪的 folded 纸灯，主体宽度约占视口 59%，不是 body 背景且没有横向溢出。'),
    checkpoint('core', assetMetadataVerified && derivativeLineageVerified && journeyVerified, '同一生成 atlas 的四个 627×627 机械裁剪逐像素一致；共享进度让相邻帧混合并最终由 open 帧占主导。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 通过四个离散阶段抵达 open，预约行动可达且没有页面级横向溢出；已诚实记录标题遮挡小瑕疵。'),
    checkpoint('scroll', journeyVerified, `真实 wheel 先推进到 ${journey.afterWheel}，随后 drag 继续到 ${journey.afterDrag}；两次输入写入同一 progress 和 frame weights。`),
    checkpoint('interaction', journeyVerified && fallbackVerified, '既有浏览器序列在 wheel 和 drag 后以 End 键抵达 open 并确认预约；任一运行时 state derivative 失败时保持 folded、显示披露且仍可预约实物。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: openingVerified && assetMetadataVerified && derivativeLineageVerified,
    primaryActionReachable: journey.booking === 'confirmed' && fallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: disclosureVerified && fallbackVerified,
    interactionVerified: journeyVerified,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

run = attachDirectCreativeEvidence(run, finalEvidence);
run = finalizeDirectCreativeRun(run);
const eligibility = evaluateV3DirectCreativeArchiveEligibility(run);
if (!eligibility.eligible) {
  throw new Error(`R140 final run is not V3 archive eligible: ${eligibility.reasons.join(' ')}`);
}
await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  reportPath,
  runId: run.id,
  runtimeBundleHash,
  bundleHash,
  bundleFiles,
  captureEvidence,
  protocol: run.creativeProtocolVersion,
  medium: run.mediumDecision?.preferred,
  rendering: run.visualAmbition?.rendering,
  interaction: run.interactionRationale.mode,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality,
  wow: 'not-required-for-expressive',
  verdict: run.verdict,
  archiveDisposition: eligibility.eligible ? 'v3-ready-unregistered' : 'research-only',
}, null, 2));
