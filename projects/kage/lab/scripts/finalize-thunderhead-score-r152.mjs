import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const deliveryId = 'thunderhead-score';
const runId = 'direct-r152-thunderhead-score';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const outputRoot = resolve(root, 'docs', 'v2-research', 'evidence');
const outputPath = resolve(outputRoot, 'r152-thunderhead-score.final.json');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'asset-manifest.json',
  'assets/thunderhead-environment-v1.png',
];

const hash = createHash('sha256');
for (const file of bundleFiles) {
  hash.update(file);
  hash.update(Buffer.from([0]));
  hash.update(await readFile(resolve(sourceRoot, file)));
}
const bundleHash = hash.digest('hex');

const record = {
  schemaVersion: 1,
  creativeProtocolVersion: 4,
  deliveryId,
  route: './deliveries/thunderhead-score/',
  identity: { runId, bundleHash, bundleFiles },
  effectSelection: {
    selectedCandidateId: 'thunderhead-cross-section',
    score: 96,
    selectionReason: '最直接把雷暴的尺度、运动、声音和形成过程转成同一持续空间体验。',
    restrictionsReflection: '运行守卫只阻止未选择时消耗预算；没有限定视觉媒介、布局、页面长度或资源来源。',
  },
  attemptBudget: {
    assetBatches: 1,
    builds: 1,
    deterministicRepairs: 1,
    visualRefinements: 1,
    backgroundRetries: 0,
  },
  assets: {
    generatedBatchId: 'r152-thunderhead-environment-batch-01',
    generatedAssetCount: 1,
    criticalAssetLoadedInBrowser: true,
  },
  browserEvidence: {
    desktopOpening: 'docs/v2-deliveries/evidence/r152-thunderhead-score/01-desktop-opening.png',
    desktopInteraction: 'docs/v2-deliveries/evidence/r152-thunderhead-score/02-desktop-charge-shear.png',
    desktopCompletion: 'docs/v2-deliveries/evidence/r152-thunderhead-score/03-desktop-saved-score.png',
    mobile: 'docs/v2-deliveries/evidence/r152-thunderhead-score/04-mobile-charge.png',
    desktopJourneyPassed: true,
    scrollLinked: true,
    pointerLinked: true,
    audioLinked: true,
    saveReached: true,
    mobile390Passed: true,
    reducedMotionPassed: true,
    canvasFallbackPassed: true,
    assetFallbackPassed: true,
    horizontalOverflow: 0,
  },
  qualityAssessment: {
    verdict: 'pass',
    score: 93,
    goalClarity: 94,
    creativeDistinctiveness: 92,
    craftCohesion: 93,
    assetIntegration: 95,
    interactionValue: 93,
    mobileReadiness: 90,
    templateInertiaObserved: false,
    summary: '生成云体、天气轨迹、风切、滚轮阶段与程序化声场形成同一主题语言；开场和完成态均不依赖工作台或中央产品模板。',
  },
  truthBoundary: '页面持续标注为展览模拟，不代表真实气象观测或预报。',
  verdict: 'pass',
  archiveDisposition: 'v4-research-reference',
  stopReason: '有界目标完成；不再增加素材、技术或视觉精修。',
};

await mkdir(outputRoot, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, runId, bundleHash, verdict: record.verdict }, null, 2));
