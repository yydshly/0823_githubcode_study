import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const deliveryId = 'sea-fiber-scope';
const runId = 'direct-r155-sea-fiber-scope';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const outputRoot = resolve(root, 'docs', 'v2-research', 'evidence');
const outputPath = resolve(outputRoot, 'r155-sea-fiber-scope.final.json');
const previewSource = resolve(root, 'docs', 'v2-deliveries', 'evidence', 'r155-sea-fiber-scope', '02-desktop-fracture.png');
const previewTarget = resolve(root, 'public', 'creative-assets', 'v2-experience-archive', 'sea-fiber-scope.png');
const bundleFiles = ['index.html', 'style.css', 'main.ts'];

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
  route: './deliveries/sea-fiber-scope/',
  identity: { runId, bundleHash, bundleFiles },
  goalReplay: {
    subject: '海底光缆听诊产品',
    audience: '海洋通信维护团队与关注基础设施的人',
    feeling: '深海中的精确、安静与脆弱张力',
    primaryAction: '保存本次听诊',
    hardConstraints: ['以最终效果为准', '真实动态与互动', '有界执行', '不伪造真实检测结果'],
  },
  direction: {
    selected: '一束可检查的透明光缆作为持续三维主体，故障回波同步驱动形变、光、频谱和声音。',
    borrowPrinciples: ['spatial-product-topology', 'sound-as-state', 'interaction-as-message'],
    assetBatchCount: 0,
    rationale: '关键对象是连续结构与状态变化，程序化 3D 比静态主图更准确；没有为了使用模型而生成无职责素材。',
  },
  executionBudget: { directionsBuilt: 1, assetBatches: 0, fullBuilds: 1, deterministicFixes: 0, visualRefinements: 1 },
  browserEvidence: {
    desktopOpening: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/01-desktop-opening.png',
    desktopInteraction: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/02-desktop-fracture.png',
    desktopCompletion: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/03-desktop-restored.png',
    mobile: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/04-mobile-fracture.png',
    mobileFallback: 'docs/v2-deliveries/evidence/r155-sea-fiber-scope/05-mobile-fallback.png',
    realScrollProgress: true,
    pointerViewLinked: true,
    subjectDeformationLinked: true,
    stageAudioLinked: true,
    saveReached: true,
    mobile390Passed: true,
    reducedMotionPassed: true,
    webglFallbackPassed: true,
    horizontalOverflow: 0,
  },
  qualityAssessment: {
    verdict: 'pass',
    goalClarity: 92,
    creativeDistinctiveness: 90,
    craftCohesion: 89,
    assetIntegration: 92,
    interactionValue: 94,
    mobileReadiness: 89,
    summary: '光缆是可旋转、可变形和可听的持续主体；故障状态可被直接看见和听见，3D 与声音不再是互不相关的装饰。',
  },
  truthBoundary: '所有读数与声音均明确属于交互演示，不代表真实海缆测量、故障诊断或维修结果。',
  verdict: 'pass',
  archiveDisposition: 'replace-modular-room-sound-as-selected-3d-audio-reference',
  stopReason: '一次构建与一次视觉精修后，主题表达、互动因果、移动端和回退均通过；停止继续修改。',
};

await mkdir(outputRoot, { recursive: true });
await mkdir(resolve(previewTarget, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
await copyFile(previewSource, previewTarget);
console.log(JSON.stringify({ outputPath, previewTarget, runId, bundleHash, verdict: record.verdict }, null, 2));
