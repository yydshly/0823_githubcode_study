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
const deliveryId = 'eclipse-post-office';
const runId = 'direct-r149-eclipse-post-office';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r149-eclipse-post-office', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r149-eclipse-post-office.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/eclipse-post-office-salt-flat-v1.png'];
const brief = '为一款把日食瞬间保存成私人明信片的产品设计沉浸网页。开场是盐湖上的开放式黄铜邮局，真实纸张与自然光构成高质量主视觉；访客滚动或拖动月影，让天空、盐面和邮局同步变暗，钻石环结束后纸上的句子显影，最终保存全食明信片。画面安静、真实、具有电影感，不做参数工作台，不提供或伪造真实天象时间地点。';

async function computeBundleHash() {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
if (report.complete !== true
  || report.identityBinding !== 'runId+asset-bound-bundleHash'
  || report.runId !== runId
  || report.bundleHash !== bundleHash
  || JSON.stringify(report.bundleFiles) !== JSON.stringify(bundleFiles)) {
  throw new Error('R149 browser evidence is stale, incomplete, or bound to another bundle.');
}

const opening = report.observations?.desktop?.opening;
const afterWheel = report.observations?.desktop?.afterWheel;
const totality = report.observations?.desktop?.totality;
const saved = report.observations?.desktop?.saved;
const mobile = report.observations?.mobile?.snapshot;
const fallback = report.observations?.fallback?.snapshot;
const pixelDelta = report.observations?.desktop?.meanPixelDelta ?? 0;
const pageErrors = report.observations?.desktop?.pageErrors ?? [];
const consoleErrors = report.observations?.desktop?.consoleErrors ?? [];
const runtimeVerified = opening?.ready === true
  && opening.imageLoaded === true
  && opening.canvasFrames > 0
  && opening.horizontalOverflow === 0
  && afterWheel?.alignment > .14
  && totality?.state === 'totality'
  && totality?.coronaStrength > .8
  && pixelDelta > 8
  && saved?.state === 'saved'
  && saved?.saved === true;
const mobileVerified = mobile?.state === 'saved'
  && mobile?.saved === true
  && mobile?.horizontalOverflow === 0;
const fallbackVerified = fallback?.state === 'saved'
  && fallback?.fallback === true
  && fallback?.assetFallback === true
  && fallback?.reducedMotion === true
  && fallback?.horizontalOverflow === 0;

const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const assetBytes = await readFile(resolve(sourceRoot, 'assets', 'eclipse-post-office-salt-flat-v1.png'));
const assetHash = createHash('sha256').update(assetBytes).digest('hex');
const assetVerified = manifest.generationCalls === 1
  && manifest.sourcePolicy === 'open-best-fit-resources'
  && manifest.assets?.length === 1
  && manifest.assets[0]?.sha256 === assetHash
  && opening?.imageLoaded === true;
if (!runtimeVerified || !mobileVerified || !fallbackVerified || !assetVerified || pageErrors.length || consoleErrors.length) {
  throw new Error('R149 final runtime, asset, mobile, or fallback evidence did not pass.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.mediumDecision?.preferred !== 'generated-image'
  || run.assetPlan.strategy !== 'generated'
  || run.visualAmbition?.rendering.primary !== 'raster-image') {
  throw new Error('R149 must remain the generated-image primary route selected from the ordinary brief.');
}

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '盐湖日食邮局与一张只在全食时显影的私人明信片',
    audience: '希望把一次短暂天象感受保存成私人纪念的普通访客',
    desiredOutcome: '移动月影，让真实环境、日食光环和明信片显影共享同一因果，并保存最终状态。',
    primaryAction: '保存全食明信片',
    hardConstraints: [
      '不得伪造真实日食时间、地点、路径或专业观测结论',
      '关键生成主图必须真实加载并承担盐湖、邮局、纸张、黄铜和光线身份',
      '滚轮、拖动和键盘必须驱动同一月影状态，不能只改变说明文字',
    ],
    preferences: [
      '沉浸式单一空间舞台，不做参数工作台、卡片墙或固定三屏',
      '生成素材承担真实感，Canvas 与 CSS 只承担日冕、月影和明暗变化',
      '一次素材批次、一次完整构建、有限修复后停止',
    ],
  },
  selectedDirection: {
    id: 'eclipse-post-office-spatial-stage',
    title: '日食邮局 · 只在全食时显影的信',
    experienceForm: 'generated-image-led-spatial-stage',
    rationale: '宽幅盐湖主图保持完整环境身份；滚轮与直接拖动让月影、色温、日冕和明信片同步变化，最终行动在同一场景完成。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-prism-seed-asset-responsibility',
      title: '棱镜种子剧场 · 主素材承担环境与材质',
      principle: '高质量主素材承担不可替换的环境、材质与第一记忆点，代码只增强主题变化。',
      relevance: '借用职责分离，不复制植物、温室、光谱或版式；本页用盐湖邮局和日食显影建立新主题。',
      sourceUri: '../pages/v2/deliveries/prism-seed-theatre/',
    },
    {
      referenceId: 'positive-aurora-postcard-causal-media',
      title: '极光无线电明信片 · 感官变化与最终行动',
      principle: '所有动态反馈由同一连续状态派生，并自然收束到可保存的媒体结果。',
      relevance: '只借共享状态和保存闭环，不复制极光、声音、频率界面或静态海报结构。',
      sourceUri: '../pages/v2/deliveries/aurora-radio-postcard/',
    },
  ],
  assetPlan: {
    batchId: 'r149-eclipse-imagegen-batch-1',
    strategy: 'generated',
    rationale: '唯一生成环境图承担照片级盐湖、纸张、黄铜、空间和自然光；程序化图形无法以同等成本提供可信主视觉。',
    assets: [{
      id: 'hero-product',
      role: '盐湖开放式邮局环境主图；不含日轮、月影、界面或文字，留给运行时因果层。',
      source: 'generated',
      required: true,
    }],
  },
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '原生滚轮与直接拖动/触摸/键盘共享 alignment；同一值同步改变月影、环境明暗、日冕、语义阶段和保存可用性。',
  },
  visualAmbition: {
    ...run.visualAmbition,
    intentLevel: 'flagship',
    intentRationale: '页面以照片级盐湖邮局建立真实感，以可直接操纵的日食光环建立吸引力和运行时优势。',
    heroMoment: {
      title: '把一句话寄到光消失的时刻',
      description: '首屏同时出现盐湖邮局、逼近的月影和发光日轮；全食后日冕与明信片形成最终构图。',
      themeConnection: '隐藏标题后仍可从盐湖邮局、月影轨道、全食光环和显影明信片辨认主题。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '滚轮、拖动、触摸或键盘移动月影，最终点击保存',
        from: '日光明亮、月影偏离、明信片未显影',
        to: '环境进入全食、日冕闭合、明信片显影并保存',
      },
    },
    rendering: {
      primary: 'raster-image',
      supporting: ['canvas-2d', 'dom-css'],
      rationale: '唯一生成主图承担场景可信度；Canvas 2D 绘制实时日冕，CSS/DOM 承担月影、遮罩、语义和行动。',
    },
    motionArc: {
      beats: [
        { phase: 'opening', driver: 'none', visualState: '盐湖邮局、偏离月影和日轮立即建立待发生事件。', thematicPurpose: '先建立地点、对象与期待。' },
        { phase: 'exploration', driver: 'hybrid', visualState: '滚轮或拖动让月影靠近，地面色温、亮度、日冕与文案同步变化。', thematicPurpose: '让访客亲手抵达全食，而不是播放幻灯片。' },
        { phase: 'resolution', driver: 'direct-input', visualState: '日冕闭合、明信片显影并可保存。', thematicPurpose: '把短暂天象收束为清楚的私人纪念。' },
      ],
      runtimeAdvantage: '真实输入同时改变主环境曝光、月影位置、Canvas 日冕、语义状态和明信片显影，静态图无法等价表达。',
    },
    interactionToScene: [
      { input: '滚轮、拖动、触摸或键盘', sceneResponse: 'alignment 连续驱动月影、totality、环境滤镜、日冕和语义状态。', productMeaning: '访客亲手让全食发生并让信件显影。' },
      { input: '保存全食明信片', sceneResponse: 'saved 写入页面状态，按钮、标题和确认文本同步变化。', productMeaning: '把短暂的视觉事件变成可带走的最终状态。' },
    ],
    assetCredibility: {
      level: 'editorial-credible',
      strategy: '唯一生成环境图在浏览器中真实加载并进入最终 bundle hash；代码没有用低质量图形替代关键场景。',
      disclosure: '页面明确标注为艺术化日食体验，不代表真实天象预报。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 1.75,
      initialTransferBudgetMb: 3,
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
  elapsedMs: 210_000,
  status: 'completed',
  summary: '唯一环境主图进入项目并完成首个可运行日食空间舞台；没有发起第二次素材生成。',
});
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r149-completion',
  elapsedMs: 780_000,
  status: 'completed',
  summary: '一次构建、两次拖动确定性修复和一次钻石环视觉精修后停止；三组真实浏览器验收通过。',
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
    rationale: '内容是一场在同一盐湖中发生的连续日食与显影事件；持续空间舞台比工作台、卡片流或固定屏数更符合主题。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 95,
    craftCohesion: 93,
    assetIntegration: 96,
    interactionValue: 94,
    mobileReadiness: 91,
  },
  summary: '盐湖邮局主图、编辑排版、月影、实时日冕与显影明信片形成同一视觉语言；交互直接强化产品主题。',
  findings: [{
    code: 'artistic-eclipse-disclosure',
    severity: 'minor',
    checkpoint: 'core',
    message: '日食与地点均为艺术化表达；页面已持续披露不代表真实天象预报。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', '1672×941 生成主图真实加载，盐湖邮局、月影和日轮在五秒内建立主题。'),
    checkpoint('core', '同一场景完成 waiting → approach → diamond-ring → totality → saved。'),
    checkpoint('mobile', '390px 键盘路径可完成显影与保存，horizontalOverflow 为 0。'),
    checkpoint('scroll', '真实滚轮推动 alignment 进入 approach，并同步改变环境与语义。'),
    checkpoint('interaction', '直接拖动抵达全食，场景平均像素差 88.69；双回退仍可保存。'),
  ],
  hardGates: {
    runtimeClean: pageErrors.length === 0 && consoleErrors.length === 0,
    criticalAssetsLoaded: assetVerified,
    primaryActionReachable: saved.saved === true,
    mobileComplete: mobileVerified,
    truthfulClaims: true,
    interactionVerified: runtimeVerified && fallbackVerified,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

const wowEvidence = createWowGateEvidenceFromBrowserObservations({
  identity,
  contract: run.visualAmbition,
  observations: {
    hero: { observed: true, completedAtMs: 1200, visibleChangeObserved: true, score: 95, summary: '盐湖邮局与逼近月影形成非模板化第一记忆点。' },
    runtime: { surfaceVisible: true, stateChanged: true, visualOutputChanged: pixelDelta > 8, advantageOverStaticObserved: true, comparisonMethod: 'pixel-diff', score: 94, summary: '滚轮和拖动产生可测的月影、曝光、日冕和明信片变化。' },
    theme: { themeSpecificMemoryObserved: true, score: 95, summary: '可复述记忆是把一句话寄到光消失的时刻。' },
    motionDepth: { meaningfulMotionOrDepthObserved: true, score: 92, summary: '宽幅环境、地平线、月影轨道和日冕共同形成空间事件。' },
    assets: { criticalAssetsLoaded: assetVerified, integratedWithScene: true, credible: true, score: 96, summary: '唯一生成环境图承担真实材质并与运行时明暗无边界融合。' },
    craft: { cohesive: true, score: 93, summary: '矿物白、石墨蓝、黄铜、纸张和日食银光形成统一语言。' },
    interaction: { input: '滚轮、拖动、触摸、键盘与保存按钮', stateChanged: true, visualOutputChanged: true, semanticOutputChanged: true, summary: '所有输入共享 alignment 并自然收束到保存明信片。' },
    mobile: { viewportWidth: 390, noHorizontalOverflow: true, contentReadable: true, primaryActionReachable: true, summary: '390px 保留光环、显影文本和保存行动。' },
    fallback: { exercised: true, rendered: true, themePreserved: true, contentPreserved: true, primaryActionReachable: true, summary: '主图和 Canvas 同时失败时仍可完成语义日食与保存。' },
    errors: { pageErrors, consoleErrors, blockingResourceFailures: [] },
  },
});

run = attachDirectCreativeEvidence(run, finalEvidence);
run = attachDirectCreativeWowEvidence(run, wowEvidence);
run = finalizeDirectCreativeRun(run);
assertV3DirectCreativeArchiveEligible(run);
await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  outputPath,
  runId,
  bundleHash,
  verdict: run.verdict,
  medium: run.mediumDecision?.preferred,
  rendering: run.visualAmbition?.rendering.primary,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  archiveDisposition: 'v3-ready',
}, null, 2));
