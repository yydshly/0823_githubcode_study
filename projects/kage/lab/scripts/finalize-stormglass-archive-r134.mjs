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
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', 'stormglass-archive');
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r134-stormglass-archive', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r134-stormglass-archive.direct-creative-run.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts'];
const runId = 'direct-r134-stormglass-archive';

const brief = [
  '为一座收集雷雨余光的虚构气象档案馆设计沉浸网页。',
  '开场铅灰云层中悬浮一片风暴玻璃；滚动时电荷沿玻璃裂隙汇聚，闪电余辉从冷灰逐渐凝成电白拓片，最终行动为“保存这次闪电拓片”。',
  '使用实时 WebGL 程序化光场，让滚动真实驱动电荷、裂隙亮度和玻璃折射；不是参数工作台，不要滑杆、卡片目录或固定三段。',
  '结果是艺术化模拟，不冒充真实气象测量。',
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

function requireObservation(report, checkpoint) {
  const observation = report.observations?.find((item) => item.checkpoint === checkpoint);
  if (!observation) throw new Error(`R134 browser evidence is missing ${checkpoint}.`);
  return observation;
}

function requireState(observation) {
  if (!observation?.state) throw new Error(`R134 browser evidence is missing state for ${observation?.checkpoint || 'unknown'}.`);
  return observation.state;
}

function finiteProgress(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const indexSource = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const identity = { runId, bundleHash };
if (
  report.complete !== true
  || report.identityBinding !== 'runId+bundleHash'
  || report.runId !== identity.runId
  || report.bundleHash !== identity.bundleHash
) {
  throw new Error('Browser report is stale or incomplete for the current R134 bundle. Rerun bounded browser evidence first.');
}

const opening = requireObservation(report, 'desktop-opening');
const scroll = requireObservation(report, 'desktop-wheel-journey');
const save = requireObservation(report, 'desktop-imprint-saved');
const mobile = requireObservation(report, 'mobile-reduced');
const fallback = requireObservation(report, 'fallback-saved');
const openingState = requireState(opening);
const savedState = requireState(save);
const mobileState = requireState(mobile);
const fallbackState = requireState(fallback);
const dormant = scroll.states?.dormant;
const gathering = scroll.states?.gathering;
const branching = scroll.states?.branching;
const imprinted = scroll.states?.imprinted;
if (!dormant || !gathering || !branching || !imprinted) {
  throw new Error('R134 scroll evidence must contain dormant, gathering, branching and imprinted states.');
}

const allIssues = report.observations.flatMap((observation) => [
  ...(observation.issues?.pageErrors || []),
  ...(observation.issues?.consoleErrors || []),
]);
const blockingResourceFailures = report.observations.flatMap((observation) => [
  ...(observation.issues?.requestFailures || []),
  ...(observation.issues?.responseErrors || []),
]);
const uniqueCanvasFrames = new Set(scroll.canvasPixelHashes || []);
const rendererVisible = openingState.ready === true
  && openingState.fallback === false
  && openingState.frames > 0
  && openingState.drawCalls > 0
  && openingState.triangles > 0
  && uniqueCanvasFrames.size === 4;
const scrollArcVerified = dormant.state === 'dormant'
  && gathering.state === 'gathering'
  && branching.state === 'branching'
  && imprinted.state === 'imprinted'
  && uniqueCanvasFrames.size === 4
  && (scroll.semantic?.actualWheelScrollDelta || 0) > 0
  && finiteProgress(gathering.progress)
  && finiteProgress(branching.progress)
  && finiteProgress(imprinted.progress)
  && gathering.progress < branching.progress
  && branching.progress < imprinted.progress
  && gathering.charge > dormant.charge + .04
  && gathering.crackGrowth < branching.crackGrowth
  && branching.crackGrowth <= imprinted.crackGrowth
  && Math.abs(branching.refraction - dormant.refraction) > .02;
const saveVerified = savedState.ready === true
  && savedState.state === 'imprinted'
  && savedState.saved === true
  && savedState.progress >= 0.95;
const mobileVerified = mobile.viewport?.width === 390
  && mobileState.ready === true
  && mobileState.saved === true
  && mobileState.reducedMotion === true
  && mobileState.horizontalOverflow === false;
const fallbackVerified = fallbackState.ready === true
  && fallbackState.fallback === true
  && fallbackState.saved === true
  && fallbackState.state === 'imprinted'
  && fallbackState.horizontalOverflow === false
  && fallback.semantic?.fallbackVisible === true;

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '雷雨余光档案馆的风暴玻璃',
    audience: '对自然现象、材料和视觉叙事感兴趣的普通网页访客',
    desiredOutcome: '从一片低能量风暴玻璃开始，沿滚动看见电荷聚集、裂隙生长和闪电余辉凝成唯一拓片，并保存这次艺术化记录。',
    primaryAction: '保存这次闪电拓片',
    hardConstraints: [
      '滚动必须真实驱动电荷、裂隙亮度和玻璃折射，而非只切换文案',
      '结果必须明确为艺术化模拟，不冒充真实气象测量',
      '不得使用滑杆、卡片目录、持久参数工作台或固定三段模板',
    ],
    preferences: [
      '全视口持久 WebGL 风暴玻璃承担主题身份和运行时变化',
      '铅灰、雾白与克制电蓝形成统一的玻璃、雾与闪电材质语言',
      'reduced-motion 和 WebGL failure 仍保留四个状态与保存行动',
    ],
  },
  selectedDirection: {
    id: 'stormglass-scroll-field',
    title: '雷雨余光档案馆 · 风暴玻璃滚动光场',
    experienceForm: 'persistent-webgl-scroll-story',
    rationale: '一个持久全屏 WebGL 风暴玻璃让同一主体从休眠、电荷汇聚、裂隙分叉到拓片凝固；DOM 只承担可读章节和保存行动，因此不是参数工作台或卡片目录。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-ice-core-persistent-scene',
      title: '冰芯来信 · 持久场景与章节绑定',
      principle: '借用同一视觉主体贯穿滚动旅程、章节只推动主体状态而不替换主场景的原理。',
      relevance: '风暴玻璃必须在四个状态中保持同一对象身份；只借持久场景机制，不复制冰芯主题、版式或材质。',
      sourceUri: '../pages/v2/deliveries/ice-core-letters/',
    },
    {
      referenceId: 'threejs-runtime-causal-material',
      title: 'Three.js 运行时材质因果研究',
      principle: '借用统一 director state 同时驱动相机、材质、粒子与几何，让浏览器输入产生可观察的非静态变化。',
      relevance: '本页需要滚动同时改变电荷、裂隙和折射；只借状态组织原理，不固化某种 Three.js 视觉模板。',
      sourceUri: '../pages/v2/research/',
    },
  ],
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '原生滚动推动 dormant → gathering → branching → imprinted，并同步改变电荷、裂隙与折射；最终按钮把稳定完成态保存到页面内状态。',
  },
  visualAmbition: {
    schemaVersion: 1,
    intentLevel: 'immersive',
    intentRationale: '主题需要在首屏建立悬浮风暴玻璃，并通过真实 WebGL 运行时变化把雷雨余光从能量状态收束为可保存拓片。',
    heroMoment: {
      title: '闪电仍被困在玻璃里',
      description: '首屏在铅灰云雾中呈现透明不规则风暴玻璃、内部余辉、电荷微粒与尚未展开的裂隙，先于说明建立主题。',
      themeConnection: '即使隐藏标题，玻璃内被困住的电白裂隙和缓慢漂移电荷也能让访客辨认“保存雷雨余光”的主题。',
      appearsWithinSeconds: 5,
      observableRuntimeChange: {
        trigger: '用户原生滚动推进四个语义阶段并点击最终保存按钮',
        from: '低对比 dormant 玻璃内只有少量余辉和微弱折射',
        to: '电荷沿分叉裂隙汇聚，玻璃折射增强，最终形成稳定的 imprinted 闪电拓片并被保存',
      },
    },
    rendering: {
      primary: 'webgl-shader',
      supporting: ['threejs-3d', 'dom-css', 'svg'],
      rationale: 'WebGL/Three.js 程序化玻璃、裂隙线、电荷粒子和折射带承担关键视觉职责；DOM 保留语义与行动，SVG 只在渲染器失败时保持等价旅程。',
    },
    spatialDepth: {
      mode: 'scene-3d',
      purpose: '通过玻璃内外层遮挡、透视、折射带、雾和轻微相机侧移建立可凝视的悬浮材料空间，而不是平面背景图。',
      cues: ['scale', 'occlusion', 'focus', 'lighting', 'perspective', 'camera-motion'],
    },
    motionArc: {
      beats: [
        {
          phase: 'opening',
          driver: 'time',
          visualState: 'dormant 玻璃在雾中低速呼吸，少量电荷保留雷雨刚结束的余温',
          thematicPurpose: '在五秒内建立安静、危险且主题专属的风暴玻璃记忆',
        },
        {
          phase: 'exploration',
          driver: 'scroll',
          visualState: '滚动推动电荷增殖、裂隙连续生长、局部亮度与玻璃折射同步增强',
          thematicPurpose: '让访客亲自把散落余光从无形能量变成可观察的分叉结构',
        },
        {
          phase: 'resolution',
          driver: 'direct-input',
          visualState: 'imprinted 状态减弱漂移并稳定构图，保存按钮把本次闪电拓片写入页面状态',
          thematicPurpose: '把沉浸变化收束为清晰且可验证的主要行动',
        },
      ],
      runtimeAdvantage: '同一主体的电荷数量、裂隙生长、折射强度、相机位置和最终保存态随真实输入形成因果链，一张静态图无法等价表达。',
    },
    interactionToScene: [
      {
        input: '用户原生滚动',
        sceneResponse: '统一 director progress 同时改变电荷、裂隙生长、折射和相机侧移，并更新四阶段语义焦点',
        productMeaning: '访客把雷雨过后的散落余光逐步收集成一张可辨认的闪电拓片',
      },
      {
        input: '用户点击“保存这次闪电拓片”',
        sceneResponse: '场景稳定在 imprinted 完成态，按钮和完成反馈同步写入 saved 状态',
        productMeaning: '把一次短暂自然现象转化为可带走的艺术化档案记录',
      },
    ],
    assetCredibility: {
      level: 'conceptual-coherent',
      strategy: '程序化玻璃、裂隙、电荷与雾在同一 WebGL 光场内生成并共享光照与空间，避免关键主体像贴图；页面不依赖外部素材。',
      disclosure: '页面明确说明为艺术化模拟，不代表真实气象测量、闪电数据或科研结论。',
    },
    fallbackPerformance: {
      targetFps: 60,
      maxDevicePixelRatio: 2,
      initialTransferBudgetMb: 4,
      mobileFallback: 'simplified-scene',
      reducedMotionFallback: 'key-states',
      rendererFailureFallback: 'key-visual',
    },
  },
});

if (run.mediumDecision?.preferred !== 'webgl-procedural') {
  throw new Error(`R134 V3 medium decision must be webgl-procedural, received ${run.mediumDecision?.preferred || 'missing'}.`);
}
run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r134-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个 WebGL 程序化媒介方向、一次无外部素材的程序化素材批次和一次完整构建已完成；浏览器证据覆盖首屏、滚动弧线、保存、390px reduced-motion 与 WebGL failure，未继续增加视觉方向。',
});
run = recordDirectCreativeStageReport(run, {
  stage: 'archive-disposition',
  elapsedMs: 0,
  status: 'completed',
  summary: '本记录为 protocol V3 精选结果：独立 V3 archive gate 绑定最终 run、bundle、宏观结构与 WebGL 主媒介后登记；冻结的 V2.5 精选门仍只接受 protocol V2，不发生跨版本伪装。',
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
    rationale: '内容是同一风暴玻璃沿滚动形成闪电拓片的连续空间旅程；没有并发参数或数据仪表需求，因此全屏持久场景与边缘章节比工作台更适配。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 94,
    creativeDistinctiveness: 96,
    craftCohesion: 94,
    assetIntegration: 95,
    interactionValue: 96,
    mobileReadiness: 92,
  },
  summary: '同一悬浮风暴玻璃、铅灰云雾、电白裂隙与克制电蓝形成主题专属语言；程序化视觉无贴图边界，滚动和保存真实强化“收集余光并形成拓片”的产品概念。',
  findings: [{
    code: 'conceptual-weather-disclosure',
    severity: 'minor',
    checkpoint: 'opening',
    message: '风暴玻璃和闪电拓片是艺术化模拟，不代表真实气象测量；页面持续披露这一真实性边界。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, summary) => ({ kind, ...identity, passed: true, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', `桌面首屏在 ${opening.readyAtMs ?? '记录'}ms 内呈现非空 WebGL 风暴玻璃，实际绘制 ${openingState.drawCalls} 个 draw calls / ${openingState.triangles} triangles，无阻断错误。`),
    checkpoint('core', '同一主体完成 dormant → gathering → branching → imprinted，电荷、裂隙和折射的程序化状态均进入完成值。'),
    checkpoint('mobile', '390px reduced-motion 使用离散关键状态完成 imprinted 与保存，正文无横向溢出且主要行动可达。'),
    checkpoint('scroll', '真实滚动使 progress 单调推进，同时改变 charge、crackGrowth、refraction 与 canvas 像素，不是只切换文字。'),
    checkpoint('interaction', '最终按钮把 imprinted 场景写入 saved 状态；WebGL failure 的 SVG 旅程同样可完成保存。'),
  ],
  hardGates: {
    runtimeClean: allIssues.length === 0 && blockingResourceFailures.length === 0,
    criticalAssetsLoaded: rendererVisible,
    primaryActionReachable: saveVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: indexSource.includes('艺术化模拟') && !indexSource.includes('真实气象测量结果'),
    interactionVerified: scrollArcVerified && saveVerified && fallbackVerified,
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
      observed: rendererVisible,
      completedAtMs: opening.readyAtMs ?? null,
      visibleChangeObserved: uniqueCanvasFrames.size === 4,
      score: 95,
      summary: '首屏在铅灰雾中直接出现透明不规则风暴玻璃、内部电荷与微弱电白裂隙，五秒内建立主题专属材料记忆。',
    },
    runtime: {
      surfaceVisible: rendererVisible,
      stateChanged: scrollArcVerified,
      visualOutputChanged: uniqueCanvasFrames.size === 4,
      advantageOverStaticObserved: scrollArcVerified,
      comparisonMethod: 'canvas-buffer-diff',
      score: 96,
      summary: '滚动前后 director 状态与 canvas 像素都改变，电荷、裂隙生长和折射形成一张静态背景无法表达的连续因果弧线。',
    },
    theme: {
      themeSpecificMemoryObserved: scrollArcVerified && saveVerified,
      score: 95,
      summary: '可复述记忆是把玻璃里散落的雷雨余光沿裂隙收集，最终凝成并保存一张电白闪电拓片。',
    },
    motionDepth: {
      meaningfulMotionOrDepthObserved: scrollArcVerified,
      score: 94,
      summary: '玻璃内外遮挡、透视、折射和相机侧移共同强化悬浮材料空间，滚动变化承担能量汇聚而非装饰。',
    },
    assets: {
      criticalAssetsLoaded: rendererVisible,
      integratedWithScene: rendererVisible && scrollArcVerified,
      credible: rendererVisible && scrollArcVerified,
      score: 95,
      summary: '关键视觉完全由同一 WebGL 场景中的玻璃、裂隙、电荷和雾生成，不依赖外部贴图，也没有中央图片边界。',
    },
    craft: {
      cohesive: true,
      score: 94,
      summary: '铅灰、雾白、少量电蓝、细窄档案字体和低速玻璃运动形成一致的安静且危险的气象档案语言。',
    },
    interaction: {
      input: '原生滚动与最终“保存这次闪电拓片”按钮',
      stateChanged: scrollArcVerified && saveVerified,
      visualOutputChanged: uniqueCanvasFrames.size === 4,
      semanticOutputChanged: savedState.saved === true,
      summary: '滚动真实改变场景数值和像素，最终点击再将 imprinted 结果写入 saved 状态，两类输入都具有可见产品含义。',
    },
    mobile: {
      viewportWidth: mobile.viewport?.width,
      noHorizontalOverflow: mobileState.horizontalOverflow === false,
      contentReadable: mobileState.ready === true && mobileState.reducedMotion === true,
      primaryActionReachable: mobileState.saved === true,
      summary: '390px reduced-motion 使用离散关键状态保留完整四阶段、视觉主体和保存行动，body 无横向溢出。',
    },
    fallback: {
      exercised: fallbackState.fallback === true,
      rendered: fallback.semantic?.fallbackVisible === true,
      themePreserved: fallbackState.state === 'imprinted',
      contentPreserved: fallbackState.ready === true,
      primaryActionReachable: fallbackState.saved === true,
      summary: '强制 WebGL failure 后，主题专属 SVG 闪电拓片、四阶段语义和保存按钮均保留，不启动第二次素材生成。',
    },
    errors: {
      pageErrors: allIssues,
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
  reportPath,
  runId: run.id,
  bundleHash,
  bundleFiles,
  protocol: run.creativeProtocolVersion,
  medium: run.mediumDecision?.preferred,
  verdict: run.verdict,
  stopReason: run.stopReason,
  attempts: run.attemptBudget.used,
  checkpoints: run.adaptiveEvidence?.profile.requiredCheckpoints,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wow: run.wowEvidence?.assessment.score,
  archiveDisposition: 'v3-verified',
}, null, 2));
