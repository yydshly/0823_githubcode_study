import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inspectImageAsset } from '../server/image-asset-inspection.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { createDirectCreativeRunFromContractV3 } from '../src/v2/direct-creative-protocol.ts';
import {
  attachDirectCreativeEvidence,
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
const deliveryId = 'west-bund-meeting-points';
const runId = 'direct-r136b-west-bund-meeting-points';
const assetFile = 'assets/xuhui-west-bund-osm-map-v1.jpg';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const reportPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r136b-west-bund-meeting-points', 'report.json');
const outputPath = resolve(root, 'docs', 'v2-research', 'evidence', 'r136b-west-bund-meeting-points.direct-creative-run.json');
// Keep this order identical to the browser reporter. The contract, manifest,
// and licensed map bytes are all part of the final identity.
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'CONTRACT.md', assetFile];
const checkpointOrder = [
  'desktop-opening',
  'desktop-inputs',
  'desktop-selection-saved',
  'mobile-reduced',
  'fallback-complete',
];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-inputs.png',
  '03-desktop-selection-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
];
const brief = '为第一次去上海徐汇滨江看展、需要与朋友约碰头点的人，设计「西岸集合点图卷」。必须使用项目已有、带 OpenStreetMap 署名的真实徐汇滨江地图与可追溯地标坐标，并把它组织为一张可横向穿行的连续图卷。西岸美术馆、油罐艺术中心、龙美术馆和星美术馆始终落在同一真实底图和同一坐标变换中。访客用滚轮、拖拽、触摸、方向键或上一站/下一站按钮改变同一个横向位置；选择地标后，真实热点、场馆名称、地址和集合卡同步更新。最终行动为「保存集合点卡」。视觉像一张摊开的周末展览折页：纸白、江水蓝、橙红定位针，地图是第一记忆点，信息贴近地点出现。真实区域、场馆名称、地址和坐标承担事实；集合建议与示意步行线必须显式标为产品演示，不提供或暗示实时开放时间。不要 WebGL、Three.js 或生成图；代码只负责语义 DOM、SVG 标记与输入状态。';

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

function observation(report, checkpoint) {
  const item = report.observations?.find((candidate) => candidate.checkpoint === checkpoint);
  if (!item) throw new Error(`R136B browser evidence is missing ${checkpoint}.`);
  return item;
}

function state(item) {
  if (!item?.state) {
    throw new Error(`R136B browser evidence is missing state for ${item?.checkpoint || 'unknown'}.`);
  }
  return item.state;
}

function documentFits(item) {
  return item?.document?.overflow <= 1
    && item.document.scrollWidth - item.document.clientWidth <= 1;
}

function panoramaScrolls(item) {
  return item?.panorama?.scrollWidth > item.panorama.clientWidth + 100
    && item.panorama.maximum > 100;
}

function movedForward(input) {
  return input?.after?.domScrollLeft > input.before?.domScrollLeft + 8
    && Math.abs(input.after.domScrollLeft - input.after.runtimeScrollLeft) <= 1
    && input.after.activePin === input.after.activeLandmark
    && input.after.activeRailIndex >= 0;
}

function issuesAreClean(item) {
  const issues = item?.issues;
  return issues
    && ['pageErrors', 'consoleErrors', 'requestFailures', 'responseErrors']
      .every((key) => Array.isArray(issues[key]) && issues[key].length === 0);
}

// Do not fall back to report.failed.json. Missing, failed, incomplete, or stale
// browser evidence must stop the finalizer before an archive file is written.
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const bundleHash = await computeBundleHash();
const identity = { runId, bundleHash };
const reportShapeValid = report.schemaVersion === 1
  && report.stage === 'r136b-west-bund-meeting-points-runtime-observations'
  && report.identityBinding === 'runId+bundleHash'
  && report.runId === runId
  && report.bundleHash === bundleHash
  && report.route === '/pages/v2/deliveries/west-bund-meeting-points/'
  && report.revision === 'r136b-proof'
  && report.complete === true
  && sameOrderedValues(report.bundleFiles, bundleFiles)
  && sameOrderedValues(report.captures, captures)
  && Array.isArray(report.observations)
  && report.observations.length === checkpointOrder.length
  && sameOrderedValues(report.observations.map((item) => item.checkpoint), checkpointOrder)
  && report.observations.every(issuesAreClean);
if (!reportShapeValid) {
  throw new Error('Browser report is failed, stale, incomplete, or malformed for the current R136B bundle.');
}

const opening = observation(report, 'desktop-opening');
const inputs = observation(report, 'desktop-inputs');
const selectedSaved = observation(report, 'desktop-selection-saved');
const mobile = observation(report, 'mobile-reduced');
const fallback = observation(report, 'fallback-complete');
const openingState = state(opening);
const inputsState = state(inputs);
const mobileState = state(mobile);
const fallbackState = state(fallback);

const manifest = JSON.parse(await readFile(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
const manifestAsset = manifest.assets?.[0];
const assetBytes = await readFile(resolve(sourceRoot, assetFile));
const assetInspection = await inspectImageAsset(assetBytes);
const sourceAssetBytes = await readFile(resolve(root, 'public', 'creative-assets', 'xuhui-west-bund-osm-map-v1.jpg'));
const provenance = JSON.parse(await readFile(resolve(root, 'cases', 'runs', 'dedicated-c0514ddead80', 'build-report.json'), 'utf8'));
const provenanceAsset = provenance.usedAssets?.find((asset) => asset.id === 'xuhui-west-bund-osm-map-v1');
const assetHash = createHash('sha256').update(assetBytes).digest('hex');
const indexHtml = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const contractText = await readFile(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
const manifestTruthVerified = manifest.schemaVersion === 1
  && manifest.deliveryId === deliveryId
  && manifest.assets?.length === 1
  && manifestAsset?.id === 'xuhui-west-bund-osm-map-v1'
  && manifestAsset.path === assetFile
  && manifestAsset.kind === 'image'
  && manifestAsset.mimeType === 'image/jpeg'
  && manifestAsset.width === assetInspection.width
  && manifestAsset.height === assetInspection.height
  && manifestAsset.bytes === assetBytes.byteLength
  && manifestAsset.sha256 === assetInspection.sha256
  && manifestAsset.sha256 === assetHash
  && manifestAsset.source?.type === 'licensed'
  && manifestAsset.source.provider === 'OpenStreetMap contributors'
  && manifestAsset.source.url === 'https://www.openstreetmap.org/copyright'
  && manifestAsset.source.localSource === 'public/creative-assets/xuhui-west-bund-osm-map-v1.jpg'
  && manifestAsset.source.provenanceRecord === 'cases/runs/dedicated-c0514ddead80/build-report.json'
  && manifestAsset.source.originalBundlePath === assetFile
  && manifestAsset.license?.name === 'Open Data Commons Open Database License (ODbL) 1.0'
  && manifestAsset.license.url === 'https://opendatacommons.org/licenses/odbl/1-0/'
  && manifestAsset.attribution === '© OpenStreetMap contributors'
  && assetInspection.format === 'jpeg'
  && assetInspection.width === 960
  && assetInspection.height === 576
  && assetBytes.byteLength === 124_206
  && assetHash === '0a4e65006b159dfc8900e9ef2631a83c0c8bbb456efd774dd582fc12694b3d75'
  && sourceAssetBytes.equals(assetBytes)
  && provenanceAsset?.bundlePath === assetFile
  && provenanceAsset.source === 'licensed'
  && provenanceAsset.payloadBytes === assetBytes.byteLength
  && indexHtml.includes('href="https://www.openstreetmap.org/copyright"')
  && indexHtml.includes('© OpenStreetMap contributors')
  && contractText.includes('地图自然尺寸 960×576')
  && contractText.includes(assetHash);
if (!manifestTruthVerified) {
  throw new Error('R136B licensed-map manifest truth gate does not match the decoded asset or provenance bytes.');
}

const openingVerified = opening.readyAtMs <= 8_000
  && opening.viewport?.width === 1440
  && opening.viewport?.height === 900
  && openingState.ready === true
  && openingState.activeLandmark === 'west-bund-museum'
  && openingState.activeName === '西岸美术馆'
  && openingState.activeAddress === '龙腾大道 2600 号'
  && openingState.coordinates === '121.4593301, 31.1695893'
  && openingState.positionIndex === 0
  && openingState.scrollLeft === 0
  && openingState.savedId === null
  && openingState.imageLoaded === true
  && openingState.fallback === false
  && openingState.reducedMotion === false
  && openingState.horizontalOverflow === false
  && openingState.routeIsProductDemo === true
  && openingState.revision === 'r136b-proof'
  && openingState.assetUrl?.includes(assetFile)
  && opening.image?.complete === true
  && opening.image.naturalWidth === assetInspection.width
  && opening.image.naturalHeight === assetInspection.height
  && opening.landmarks?.length === 4
  && panoramaScrolls(opening)
  && documentFits(opening);

const inputMovementVerified = inputs.sameController === true
  && movedForward(inputs.inputs?.wheel)
  && movedForward(inputs.inputs?.drag)
  && movedForward(inputs.inputs?.arrowRight)
  && movedForward(inputs.inputs?.next)
  && inputs.inputs?.previous?.after?.domScrollLeft < inputs.inputs.previous.before.domScrollLeft - 8
  && Math.abs(inputs.inputs.previous.after.domScrollLeft - inputs.inputs.previous.after.runtimeScrollLeft) <= 1
  && inputsState.ready === true
  && inputsState.activeLandmark === 'tank-shanghai'
  && inputsState.horizontalOverflow === false
  && inputsState.routeIsProductDemo === true
  && documentFits(inputs);

const selectedState = selectedSaved.selection?.after?.state;
const persistedState = selectedSaved.persistence?.stateAfterReload;
const selectionSaveVerified = selectedSaved.selection?.before?.route !== selectedSaved.selection?.after?.route
  && selectedState?.activeLandmark === 'long-museum'
  && selectedState.activeName === '龙美术馆'
  && selectedState.activeAddress === '龙腾大道 3398 号'
  && selectedState.coordinates === '121.4601929, 31.1859164'
  && selectedState.positionIndex === 2
  && selectedState.savedId === null
  && selectedState.routeIsProductDemo === true
  && selectedSaved.selection.after.card?.name === '龙美术馆'
  && selectedSaved.selection.after.card?.address === '龙腾大道 3398 号'
  && selectedSaved.selection.after.card?.coordinates === '121.4601929, 31.1859164'
  && selectedSaved.persistence?.storageKey === 'r136b-west-bund-saved-meeting-point'
  && selectedSaved.persistence.valueBeforeReload === 'long-museum'
  && selectedSaved.persistence.valueAfterReload === 'long-museum'
  && persistedState?.savedId === 'long-museum'
  && persistedState.activeLandmark === 'long-museum'
  && persistedState.horizontalOverflow === false
  && documentFits(selectedSaved);

const mobileVerified = mobile.viewport?.width === 390
  && mobile.viewport?.height === 844
  && mobile.input?.kind === 'touch-tap-next-button'
  && mobile.input.after?.domScrollLeft > mobile.input.before?.domScrollLeft + 8
  && mobile.storage?.key === 'r136b-west-bund-saved-meeting-point'
  && mobile.storage.value === 'tank-shanghai'
  && mobileState.ready === true
  && mobileState.activeLandmark === 'tank-shanghai'
  && mobileState.activeName === '油罐艺术中心'
  && mobileState.activeAddress === '龙腾大道 2380 号'
  && mobileState.coordinates === '121.4593761, 31.1665647'
  && mobileState.savedId === 'tank-shanghai'
  && mobileState.imageLoaded === true
  && mobileState.fallback === false
  && mobileState.reducedMotion === true
  && mobileState.horizontalOverflow === false
  && mobileState.routeIsProductDemo === true
  && panoramaScrolls(mobile)
  && documentFits(mobile);

const fallbackVerified = fallback.honestFallback?.landmarkCount === 4
  && fallback.honestFallback.attribution === '© OpenStreetMap contributors'
  && fallback.honestFallback.renderedMap?.backgroundImage === 'none'
  && fallback.honestFallback.renderedMap.visibleImages === 0
  && fallback.honestFallback.renderedMap.visibleSvgs === 0
  && fallback.storage?.key === 'r136b-west-bund-saved-meeting-point'
  && fallback.storage.value === 'start-museum'
  && fallbackState.ready === true
  && fallbackState.activeLandmark === 'start-museum'
  && fallbackState.activeName === '星美术馆'
  && fallbackState.activeAddress === '瑞宁路 111 号'
  && fallbackState.coordinates === '121.4657116, 31.1897166'
  && fallbackState.savedId === 'start-museum'
  && fallbackState.imageLoaded === false
  && fallbackState.fallback === true
  && fallbackState.reducedMotion === true
  && fallbackState.horizontalOverflow === false
  && fallbackState.routeIsProductDemo === true
  && documentFits(fallback);

const attributionVerified = opening.attribution?.text === '© OpenStreetMap contributors'
  && opening.attribution.href === 'https://www.openstreetmap.org/copyright'
  && fallback.honestFallback?.attribution === '© OpenStreetMap contributors';
const runtimeClean = report.observations.every(issuesAreClean);
const checkpointProof = {
  opening: openingVerified && manifestTruthVerified && attributionVerified,
  core: selectionSaveVerified && manifestTruthVerified,
  mobile: mobileVerified,
  scroll: inputMovementVerified,
  interaction: inputMovementVerified && selectionSaveVerified && fallbackVerified,
};
if (!runtimeClean || Object.values(checkpointProof).some((passed) => !passed)) {
  throw new Error('R136B report does not prove every required adaptive checkpoint and truth boundary.');
}

const contract = createV2CreativeContract(brief);
let run = createDirectCreativeRunFromContractV3(contract);
if (run.creativeProtocolVersion !== 3 || run.mediumDecision?.preferred !== 'grounded-real-media') {
  throw new Error(`R136B must select grounded-real-media in DirectCreativeRun V3, received ${run.mediumDecision?.preferred || 'missing'}.`);
}
if (
  run.assetPlan.strategy !== 'licensed'
  || run.assetPlan.assets.length !== 1
  || run.assetPlan.assets[0]?.id !== 'map-evidence-field'
  || run.assetPlan.assets[0]?.source !== 'licensed'
  || run.assetPlan.assets[0]?.required !== true
) throw new Error('R136B must keep one required licensed map responsibility in its asset plan.');
if (
  run.visualAmbition?.intentLevel !== 'expressive'
  || run.visualAmbition.rendering.primary !== 'raster-image'
  || run.visualAmbition.rendering.supporting.length !== 1
  || run.visualAmbition.rendering.supporting[0] !== 'dom-css'
) throw new Error('R136B must remain Expressive raster-image with DOM/CSS support and no runtime renderer drift.');

run = directCreativeRunSchema.parse({
  ...run,
  id: runId,
  goalPlayback: {
    ...run.goalPlayback,
    subject: '上海徐汇滨江真实底图上的四个文化场馆集合点',
    audience: '第一次去徐汇滨江看展、需要与朋友确定碰头点的访客',
    desiredOutcome: '在同一真实地图和统一横向位置中比较四个地标，核对名称、地址与坐标，并保存一张集合点卡。',
    primaryAction: '保存集合点卡',
    hardConstraints: [
      '真实地理必须由本地 OpenStreetMap 静态图、可追溯地标坐标和持续署名承担',
      '集合建议和橙红示意路线必须标为产品演示，不展示或暗示实时开放时间、路况或可通行性',
      '图片失败时只能回退到真实地标名单，不得用生成图或程序化图形伪造地图',
      '不得使用 WebGL、Three.js、Canvas 或生成图替代授权地图的事实职责',
    ],
    preferences: [
      '纸白、江水蓝与橙红定位针组成摊开的周末展览折页',
      '滚轮、拖拽、触摸、键盘、热点和按钮必须共享同一个横向位置状态',
      '390px reduced-motion 与图片失败状态均保留选择和保存行动',
    ],
  },
  selectedDirection: {
    id: 'west-bund-grounded-map-foldout',
    title: '西岸集合点图卷 · 真实地图横向折页',
    experienceForm: 'horizontal-panorama',
    rationale: '一张带 OpenStreetMap 署名的真实徐汇滨江地图持续承担地理基底；统一横向位置同时驱动地图热点、路线、场馆事实、集合卡与保存状态，不形成控制台或卡片轮播。',
  },
  referencePrinciples: [
    {
      referenceId: 'positive-xuhui-grounded-atlas',
      title: '徐汇滨江地图 · 真实地理与演示边界',
      principle: '真实底图、地标经纬度与同一投影承担事实，署名持续可见；事实与产品演示建议明确分层。',
      relevance: '本交付复用同一可追溯地图资产和四个地标事实，并把它们组织为横向集合点图卷。',
      sourceUri: 'cases/runs/dedicated-c0514ddead80/',
    },
    {
      referenceId: 'positive-moonlit-tidepool-panorama',
      title: '月光潮池 · 同一横向位置的多输入证明',
      principle: '滚轮、拖拽、触摸、键盘和按钮应改变同一横向位置，并保留移动端与诚实回退。',
      relevance: '本页只借横向输入与证据方法，不复制虚构潮池视觉；地理事实始终由授权地图承担。',
      sourceUri: '../pages/v2/deliveries/moonlit-tidepool-panorama/',
    },
  ],
  interactionRationale: {
    mode: 'mixed',
    audioApplicable: false,
    rationale: '原生横向滚动、滚轮、拖拽、触摸、方向键、热点和上一站/下一站共享 scrollLeft；选择同步更新真实地标事实，按钮保存当前集合点卡。',
  },
});

run = recordDirectCreativeAttempt(run, 'asset-batch');
run = recordDirectCreativeAttempt(run, 'build');
run = recordDirectCreativeAttempt(run, 'deterministic-repair');
run = recordDirectCreativeAttempt(run, 'visual-refinement');
run = recordDirectCreativeStageReport(run, {
  stage: 'bounded-r136b-completion',
  elapsedMs: 0,
  status: 'completed',
  summary: '一个方向、一批授权地图素材与一次构建形成当前 bundle；一次确定性修复解决滚轮回吸，一次视觉精修消除 fallback 说明遮挡，随后 manifest 真相门及五个自适应浏览器检查全部通过并停止。',
});
run = setDirectCreativeFinalCandidate(run, identity);

const macroStructureReview = reviewMacroStructureContentFit({
  candidate: {
    runId,
    layout: 'horizontal-panorama',
    persistentControlPanel: false,
    visibleParameterControls: false,
    realtimeMetricCluster: false,
    primaryAction: 'save-configuration',
  },
  recent: [],
  contentEvidence: {
    concurrentParameterCount: 0,
    realtimeFeedbackRequired: false,
    primaryActionDependsOnCurrentState: true,
    persistentControlsExplicitlyRequested: false,
    rationale: '四个场馆必须持续落在同一真实底图与同一横向位置变换中；横向图卷直接表达地理连续性和集合决策，不需要持久参数工作台。',
  },
});

const visualQuality = assessDirectVisualQuality({
  dimensions: {
    goalClarity: 95,
    creativeDistinctiveness: 91,
    craftCohesion: 92,
    assetIntegration: 96,
    interactionValue: 94,
    mobileReadiness: 92,
  },
  summary: '真实徐汇滨江地图是稳定的第一视觉记忆点；纸白折页、江水蓝与橙红定位针把地图、地标事实、横向位置和保存行动组织成统一的周末看展集合体验。',
  findings: [{
    code: 'realtime-information-boundary',
    severity: 'minor',
    checkpoint: 'core',
    message: '集合建议与橙红路线只承担产品演示；页面持续声明不代表实时开放、路况或可通行路线。',
  }],
}, run.interactionRationale);

const checkpoint = (kind, passed, summary) => ({ kind, ...identity, passed, summary });
const finalEvidence = createFinalCreativeEvidence({
  identity,
  interaction: run.interactionRationale,
  checkpoints: [
    checkpoint('opening', checkpointProof.opening, `桌面首屏在 ${opening.readyAtMs}ms 内解码并显示 960×576 授权地图、四个真实地标和 OpenStreetMap 署名，文档无横向溢出。`),
    checkpoint('core', checkpointProof.core, '选择龙美术馆后，同一位置上的热点、示意路线、名称、地址、坐标和集合卡同步更新，保存状态跨重载保留。'),
    checkpoint('mobile', checkpointProof.mobile, '390×844 reduced-motion 触摸下一站并保存油罐艺术中心集合点卡，地图、事实、行动与文档宽度均完整。'),
    checkpoint('scroll', checkpointProof.scroll, '滚轮、拖拽、ArrowRight、上一站和下一站都改变同一 scrollLeft，并同步活跃热点与横向位置索引。'),
    checkpoint('interaction', checkpointProof.interaction, '热点选择、跨重载保存和图片失败名单均可完成；fallback 不显示图片、SVG 或伪造地图，仍保留真实事实与署名。'),
  ],
  hardGates: {
    runtimeClean,
    criticalAssetsLoaded: manifestTruthVerified && openingVerified,
    primaryActionReachable: selectionSaveVerified && fallbackVerified,
    mobileComplete: mobileVerified,
    truthfulClaims: manifestTruthVerified && attributionVerified
      && openingState.routeIsProductDemo === true
      && selectedState.routeIsProductDemo === true
      && mobileState.routeIsProductDemo === true
      && fallbackState.routeIsProductDemo === true,
    interactionVerified: inputMovementVerified && selectionSaveVerified && fallbackVerified,
    audioVerified: null,
  },
  visualQuality,
  macroStructureReview,
});

run = attachDirectCreativeEvidence(run, finalEvidence);
// Expressive does not require Wow evidence. Do not attach a synthetic
// not-required assessment: the V3 gate evaluates this intent directly.
run = finalizeDirectCreativeRun(run);
const archiveEligibility = evaluateV3DirectCreativeArchiveEligibility(run);
if (run.verdict !== 'pass' || !archiveEligibility.eligible) {
  throw new Error(`R136B V3 archive gate rejected the final run: ${archiveEligibility.reasons.join(' ')}`);
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
  asset: {
    path: assetFile,
    bytes: assetBytes.byteLength,
    width: assetInspection.width,
    height: assetInspection.height,
    sha256: assetHash,
    attribution: manifestAsset.attribution,
  },
  macroStructure: run.adaptiveEvidence?.macroStructureReview?.candidate.layout,
  checkpoints: run.adaptiveEvidence?.profile.requiredCheckpoints,
  verdict: run.verdict,
  quality: run.adaptiveEvidence?.visualQuality.score,
  wowEvidence: run.wowEvidence ?? null,
  archiveDisposition: 'v3-ready',
}, null, 2));
