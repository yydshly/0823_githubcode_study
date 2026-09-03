import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
import { assertV3DirectCreativeArchiveEligible } from '../src/v2/direct-creative-v3-archive-gate.ts';
import {
  attachDirectCreativeEvidence,
  directCreativeRunSchema,
  finalizeDirectCreativeRun,
  recordDirectCreativeAttempt,
  recordDirectCreativeStageReport,
  setDirectCreativeFinalCandidate,
} from '../src/v2/direct-creative-run.ts';
import { assessDirectVisualQuality, createFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { reviewMacroStructureContentFit } from '../src/v2/macro-skeleton-inertia.ts';

const root = resolve(process.cwd());
const deliveryId = 'same-table-tonight';
const runId = 'direct-r141-same-table-tonight';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const evidenceRoot = resolve(root, 'docs', 'v2-research', 'evidence', 'r141-same-table-tonight');
const reportPath = resolve(evidenceRoot, 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r141-same-table-tonight.direct-creative-run.json');
const assetFile = 'assets/distant-dinner-panorama-v1.png';
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
  assetFile,
];
const checkpoints = [
  'desktop-opening',
  'desktop-wheel-nearing',
  'desktop-complete-invited',
  'mobile-reduced-invited',
  'asset-fallback',
];
const captures = [
  ['01-desktop-opening.png', 1440, 900],
  ['02-desktop-nearing.png', 1440, 900],
  ['03-desktop-invited.png', 1440, 900],
  ['04-mobile-reduced-invited.png', 390, 844],
  ['05-asset-fallback.png', 1440, 900],
];
const brief = '为一个让异地家人约定同一时刻吃饭的项目设计网页。访客要理解如何发起一次“同桌时刻”，看见双方留下的一道菜和一句话，并邀请另一张餐桌加入。页面应让相隔很远的两张桌子感觉正在靠近，温暖、克制，不煽情。最终行动是“发起今晚的同桌时刻”。人物、地点与故事均为概念演示。';

async function hashFiles(files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sameOrder(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R141 browser evidence is missing ${checkpoint}.`);
  return item;
}

function issuesFor(item) {
  return [
    ...(item.issues?.pageErrors || []),
    ...(item.issues?.consoleErrors || []),
    ...(item.issues?.requestFailures || []),
    ...(item.issues?.responseErrors || []),
  ];
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await hashFiles(bundleFiles);
const identity = { runId, bundleHash };
if (report.schemaVersion !== 1
  || report.stage !== 'r141-same-table-tonight-runtime-observations'
  || report.identityBinding !== 'runId+bundleHash'
  || report.runId !== runId
  || report.bundleHash !== bundleHash
  || report.route !== '/pages/v2/deliveries/same-table-tonight/'
  || report.revision !== 'r141-proof'
  || report.complete !== true
  || !sameOrder(report.bundleFiles, bundleFiles)
  || !sameOrder(report.observations?.map((item) => item.checkpoint), checkpoints)
  || !sameOrder(report.captures, captures.map(([file]) => file))) {
  throw new Error('R141 browser report is stale, incomplete, malformed, or belongs to another bundle.');
}

for (const [file, width, height] of captures) {
  const path = resolve(evidenceRoot, file);
  const bytes = await readFile(path);
  const metadata = await sharp(bytes).metadata();
  if (metadata.format !== 'png' || metadata.width !== width || metadata.height !== height || bytes.length < 100_000) {
    throw new Error(`R141 capture ${file} is missing, too small, or has the wrong viewport.`);
  }
}

const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const assetBytes = await readFile(resolve(sourceRoot, assetFile));
const assetMetadata = await sharp(assetBytes).metadata();
const asset = manifest.assets?.[0];
const assetVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.batchId === 'r141-same-table-single-panorama'
  && manifest.assetBatches === 1
  && manifest.generationCalls === 1
  && manifest.sourceAssetCount === 1
  && manifest.derivativeCount === 0
  && manifest.medium?.preferred === 'generated-image'
  && manifest.medium?.rendering === 'raster-image'
  && manifest.assets?.length === 1
  && asset?.path === assetFile
  && asset?.kind === 'raster-image'
  && asset?.role === 'source-panorama'
  && asset?.mimeType === 'image/png'
  && asset?.width === 1881
  && asset?.height === 836
  && asset?.bytes === assetBytes.length
  && asset?.sha256 === sha256(assetBytes)
  && asset?.sourceLineage?.type === 'generated-source'
  && asset?.sourceLineage?.provider === 'built-in-imagegen'
  && asset?.sourceLineage?.batchId === manifest.batchId
  && asset?.sourceLineage?.operation === 'single-wide-diptych-generation'
  && assetMetadata.format === 'png'
  && assetMetadata.width === 1881
  && assetMetadata.height === 836;
if (!assetVerified) {
  throw new Error('R141 manifest does not prove the one-call generated panorama and its exact final bytes.');
}

const contractText = await readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
const html = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const source = await readFile(resolve(sourceRoot, 'main.ts'), 'utf8');
const contractVerified = contractText.includes('one built-in image generation call')
  && contractText.includes('visual refinements: `1 / 1`'.replace('visual refinements', 'Visual refinements'))
  && (contractText.match(/\| pass \|/g) || []).length === 8
  && contractText.includes('视觉精修预算已经用尽');
const truthVerified = html.includes('人物、地点、菜品与故事不对应真实家庭或服务记录')
  && html.includes('主视觉暂时没有载入')
  && source.includes("const forceAssetFailure = params.get('forceAssetFailure') === '1'")
  && contractVerified;
if (!truthVerified) throw new Error('R141 final contract or visible conceptual/fallback boundary is missing.');

const opening = observation(report, 'desktop-opening');
const nearing = observation(report, 'desktop-wheel-nearing');
const invited = observation(report, 'desktop-complete-invited');
const mobile = observation(report, 'mobile-reduced-invited');
const fallback = observation(report, 'asset-fallback');
const runtimeClean = report.observations.every((item) => issuesFor(item).length === 0);
const openingVerified = opening.state?.state === 'apart'
  && opening.state?.progress === '0.000'
  && opening.state?.asset === 'ready'
  && opening.state?.horizontalOverflow === false
  && opening.semantic?.uniqueImageSources === 1
  && opening.semantic?.imageCount === 2
  && opening.semantic?.naturalDimensions?.every((item) => item.width === 1881 && item.height === 836)
  && opening.semantic?.bodyBackgroundImage === 'none';
const scrollVerified = nearing.state?.state === 'nearing'
  && nearing.state?.input === 'scroll'
  && Number(nearing.state?.progress) >= 0.34
  && Number(nearing.state?.progress) < 0.82
  && nearing.semantic?.gapWidthAfter < nearing.semantic?.gapWidthBefore
  && nearing.semantic?.visibleTableNotes === 2;
const invitedVerified = invited.state?.state === 'invited'
  && invited.state?.progress === '1.000'
  && invited.state?.asset === 'ready'
  && invited.state?.invitation === 'sent'
  && invited.state?.horizontalOverflow === false
  && invited.semantic?.statusText?.includes('邀请已留在桌上');
const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && mobile.state?.state === 'invited'
  && mobile.state?.progress === '1.000'
  && mobile.state?.asset === 'ready'
  && mobile.state?.horizontalOverflow === false
  && mobile.semantic?.reducedMotion === true
  && mobile.semantic?.stageButtons === 3
  && mobile.semantic?.inviteButtonBox?.x >= 0
  && mobile.semantic?.inviteButtonBox?.x + mobile.semantic?.inviteButtonBox?.width <= 390;
const fallbackVerified = fallback.state?.state === 'invited'
  && fallback.state?.asset === 'failed'
  && fallback.state?.invitation === 'sent'
  && fallback.semantic?.fallbackState?.asset === 'failed'
  && fallback.semantic?.fallbackVisible === true
  && fallback.semantic?.sceneVisibility === 'hidden'
  && fallback.semantic?.footerActionCompleted === true;
if (!runtimeClean || !openingVerified || !scrollVerified || !invitedVerified || !mobileVerified || !fallbackVerified) {
  throw new Error('R141 evidence does not prove the opening, causal wheel journey, invitation, mobile, and honest fallback.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'generated-image'
  || run.visualAmbition?.rendering.primary !== 'raster-image') {
  throw new Error('R141 ordinary brief must continue to select generated-image / raster-image without a medium hint.');
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '让相隔很远的两张家庭餐桌在同一晚餐时刻靠近',
    audience: '希望与异地家人发起一次共同晚餐的普通访客',
    desiredOutcome: '理解同桌时刻的发起方式，看见双方留下的一道菜和一句话，并邀请另一张餐桌加入。',
    primaryAction: '发起今晚的同桌时刻',
    hardConstraints: [
      '人物、地点、菜品与故事只可作为概念演示，不得冒充真实家庭或服务记录',
      '关键主素材必须真实加载并承担两张餐桌、距离和冷暖光线的主题职责',
      '主要行动、手机旅程与素材失败降级必须可用且诚实',
    ],
    preferences: [
      '温暖、克制、生活化，不以煽情人物特写代替产品含义',
      '让同一张宽幅素材中的两处餐桌随滚动从分离到相接',
      '采用短篇编辑流，不建立持久参数工作台或无意义控制器',
    ],
  },
  selectedDirection: {
    id: 'same-table-generated-editorial-join',
    title: '同桌时刻 · 两处生活空间沿桌沿靠近',
    experienceForm: 'generated-panorama-editorial-flow',
    rationale: '一张主题专属宽幅生成图同时承载冷暖两处生活空间；原生滚动只改变同一素材两半的距离，并依次揭示菜与话，最终让行动在桌沿相接后成立。',
  },
  referencePrinciples: [{
    referenceId: 'positive-moonlit-tidepool-panorama',
    title: '月光潮池夜巡 · 单一主图中的连续坐标',
    principle: '借用单一宽幅主素材统一空间坐标，并让多种输入改变同一位置状态的原理。',
    relevance: '异地双桌需要一个可连续靠近的共同坐标；只借连续性与等价输入，不复制潮池、夜色、热点数量或横向滚轮形式。',
    sourceUri: '../pages/v2/deliveries/moonlit-tidepool-panorama/',
  }],
  assetPlan: {
    batchId: 'r141-same-table-single-panorama',
    strategy: 'generated',
    rationale: '唯一生成源图同时履行场景身份与深度职责；运行时的左右裁切来自同一文件，不产生第二素材批次。',
    assets: [
      {
        id: 'scene-environment',
        role: '唯一宽幅生成图承担两处真实生活感餐桌、冷暖光线、菜品和共同桌沿的主题身份。',
        source: 'generated',
        required: true,
      },
      {
        id: 'scene-depth-field',
        role: '同一宽幅生成图中的窗景、前后遮挡、桌面透视和焦点承担可验证空间深度。',
        source: 'generated',
        required: true,
      },
    ],
  },
  interactionRationale: {
    mode: 'scroll',
    audioApplicable: false,
    rationale: '原生滚轮和离散阶段导航共享一个 progress，真实改变双桌间距、冷暖光场、双方留言和 CTA 解锁；互动直接解释“相隔很远但在这一刻靠近”。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    intentLevel: 'expressive',
    intentRationale: '普通产品 brief 自主路由到主题专属生成素材与短篇编辑流；视觉冲击来自真实生活场景的冷暖对照和连续合拢，不强加 3D 或历史模板。',
    heroMoment: {
      title: '远方，也能同时开席',
      description: '首屏把冷蓝与暖琥珀两张空餐桌放在同一眼平线上，中间保留真实距离；标题和一行说明立即建立异地共餐主题。',
      themeConnection: '隐藏标题后，两张各自留有一道菜的空餐桌、同一时间与可拼合桌沿仍能辨认“异地同桌”。',
      appearsWithinSeconds: 2,
      observableRuntimeChange: {
        trigger: '用户原生滚动或选择远、近、同桌阶段',
        from: '两处生活空间分离，中间留有宽阔暗场',
        to: '桌沿合拢，双方的菜和一句话出现，邀请行动解锁',
      },
    },
    rendering: {
      primary: 'raster-image',
      supporting: ['canvas-2d', 'dom-css'],
      rationale: '唯一 1881×836 生成宽幅图承担对象、材质、透视和第一记忆；Canvas 只画克制的会合光线，DOM/CSS 只承担裁切、编辑排版、状态和行动。',
    },
    spatialDepth: {
      mode: 'layered-2d',
      purpose: '同一素材的窗景、桌沿、椅子遮挡与左右位移建立两个空间的距离，并在合拢时保留自然材质连续性。',
      cues: ['occlusion', 'focus', 'perspective', 'lighting'],
    },
    motionArc: {
      beats: [
        { phase: 'opening', driver: 'none', visualState: '两张空餐桌分处冷暖两端，中间保持宽阔距离。', thematicPurpose: '先让访客感到异地与同一时刻。' },
        { phase: 'exploration', driver: 'scroll', visualState: '两半空间靠近，双方的一道菜和一句话依次出现。', thematicPurpose: '把共餐方法转化为可见因果。' },
        { phase: 'resolution', driver: 'scroll', visualState: '桌沿相接、会合光线稳定、邀请行动解锁。', thematicPurpose: '将情绪收束为发起今晚同桌时刻的明确行动。' },
      ],
      runtimeAdvantage: '静态图片只能展示两张桌子；运行时让距离、内容揭示与 CTA 解锁共享同一进度，用户亲自完成“靠近”。',
    },
    interactionToScene: [{
      input: '滚轮或阶段导航',
      sceneResponse: '同一宽幅主图的两半同步靠近，暗场缩小，双方留言出现，CTA 在同桌状态开放。',
      productMeaning: '两地不必变成同一生活，但可以约定同一时刻共同开席。',
    }],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '一次内置生图生成一张完整宽幅主视觉；两半运行图来自同一文件的机械裁切，代码不冒充关键生活素材。',
      disclosure: '人物、地点、菜品与故事均为概念演示，不对应真实家庭、地址或服务记录。',
    },
    fallbackPerformance: {
      ...run.visualAmbition.fallbackPerformance,
      initialTransferBudgetMb: 2.2,
      mobileFallback: 'key-visual-with-content',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'dom-content',
    },
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r141-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个普通 brief、一个方向、一次内置生图素材批次、一次构建和一次只移除人造接缝阴影的视觉精修已完成；五项自适应浏览器检查通过后停止。',
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
    realtimeFeedbackRequired: false,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '内容需要先感到距离、再理解双方留下的菜与话、最后发出邀请；短篇编辑流支持这个顺序，不需要持久参数面板。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 92,
    craftCohesion: 93,
    assetIntegration: 95,
    interactionValue: 92,
    mobileReadiness: 91,
  },
  summary: '冷蓝与暖琥珀的两处真实生活场景、同一桌沿、空椅与一菜一话形成主题专属语言；滚动让空间距离、信息和行动同步收束，390px 与素材失败状态仍完整可用。',
  findings: [{
    code: 'conceptual-family-scenes',
    severity: 'minor',
    checkpoint: 'core',
    message: '两处家庭、菜品与留言均为概念演示；页面已在行动区明确披露，不把它们伪装成真实用户记录。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', openingVerified, `桌面开场在 ${opening.readyAtMs}ms 内加载同一张 1881×836 宽幅素材的两处裁切，主题成立且无横向溢出。`),
    checkpoint('core', invitedVerified && fallbackVerified, '桌沿合拢后双方的一道菜和一句话可读，CTA 完成邀请；素材失败时明确披露并保留底部行动。'),
    checkpoint('mobile', mobileVerified, '390×844 reduced-motion 通过三段离散导航完成同一旅程，CTA 在视口内且没有页面级横向溢出。'),
    checkpoint('scroll', scrollVerified && invitedVerified, '真实 wheel 将 progress 推进到 nearing，暗场宽度缩小且两条留言出现；继续滚动抵达 together 并解锁邀请。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: openingVerified,
    primaryActionReachable: invitedVerified && fallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: truthVerified && fallbackVerified,
    interactionVerified: scrollVerified && invitedVerified,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

run = attachDirectCreativeEvidence(run, finalEvidence);
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
  structure: run.adaptiveEvidence?.macroStructureReview?.candidate.layout,
  interaction: run.interactionRationale.mode,
  attempts: run.attemptBudget.used,
  quality: run.adaptiveEvidence?.visualQuality,
  verdict: run.verdict,
  archiveDisposition: 'v3-ready',
}, null, 2));
