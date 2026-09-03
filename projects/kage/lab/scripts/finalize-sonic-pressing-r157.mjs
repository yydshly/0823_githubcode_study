import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const deliveryId = 'sonic-pressing-room';
const runId = 'direct-r157-sonic-pressing-room';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const outputRoot = resolve(root, 'docs', 'v2-research', 'evidence');
const outputPath = resolve(outputRoot, 'r157-sonic-pressing-room.final.json');
const previewSource = resolve(root, 'docs', 'v2-deliveries', 'evidence', 'r157-sonic-pressing-room', '02-desktop-resonant.png');
const previewTarget = resolve(root, 'public', 'creative-assets', 'v2-experience-archive', 'sonic-pressing-room.png');
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
  route: './deliveries/sonic-pressing-room/',
  identity: { runId, bundleHash, bundleFiles },
  goalReplay: {
    subject: '声纹压片室',
    audience: '喜欢声音与实体媒介的独立创作者',
    feeling: '暗暖、透明、可听见的材质张力',
    primaryAction: '保存这一段声纹',
    hardConstraints: ['以最终效果为准', '真实动态与互动', '有界执行', '不冒充真实母带制作'],
  },
  mediumDecision: {
    preferred: 'webgl-procedural',
    rationale: '真实频段必须连续改变同一主体的沟槽、折光和边缘；静态图无法承担这项运行时职责。',
  },
  direction: {
    selected: '一张持续可见的透明唱片，把声音从不可见信号变成逐层显影的材质印记。',
    referenceIds: ['positive-audio-signal-continuity', 'positive-noise-surface-causality'],
    borrowPrinciples: ['连续声频必须驱动可见状态', '滚动与直接输入共享同一压片进度', '风险提示不升级为风格禁令'],
    assetBatchCount: 0,
    rationale: '程序化 WebGL 是对当前主题最准确的媒介选择，不是禁止生图；本次没有需要由静态素材承担的关键视觉职责。',
  },
  executionBudget: { directionsBuilt: 1, assetBatches: 0, fullBuilds: 1, deterministicFixes: 1, visualRefinements: 1 },
  browserEvidence: {
    desktopOpening: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/01-desktop-opening.png',
    desktopInteraction: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/02-desktop-resonant.png',
    desktopCompletion: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/03-desktop-kept.png',
    mobile: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/04-mobile-resonant.png',
    webglFallback: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/05-mobile-webgl-fallback.png',
    audioFallback: 'docs/v2-deliveries/evidence/r157-sonic-pressing-room/06-desktop-audio-fallback.png',
    realScrollProgress: true,
    realAnalyserBands: true,
    lowGrooveLinked: true,
    midRefractionLinked: true,
    highEdgeLinked: true,
    saveReached: true,
    mobile390Passed: true,
    reducedMotionPassed: true,
    webglFallbackPassed: true,
    audioFallbackPassed: true,
    horizontalOverflow: 0,
  },
  qualityAssessment: {
    verdict: 'pass',
    goalClarity: 93,
    creativeDistinctiveness: 88,
    craftCohesion: 89,
    assetIntegration: 92,
    interactionValue: 94,
    mobileReadiness: 91,
    summary: '透明唱片是持续可见的主体；开场、共振和留存具有清楚的视觉差异，真实频段承担不同材质职责，移动端仍保持同一体验。',
  },
  truthBoundary: '声音为浏览器合成信号，材质为程序化可视化；页面不代表真实母带、实体唱片、声学测量或生产结果。',
  verdict: 'pass',
  archiveDisposition: 'replace-aurora-radio-postcard-as-stronger-audio-material-reference',
  stopReason: '一个方向、一次构建和一次基于浏览器证据的视觉精修后，最终质量门通过；停止追加方向与修图。',
};

await mkdir(outputRoot, { recursive: true });
await mkdir(resolve(previewTarget, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
await copyFile(previewSource, previewTarget);
console.log(JSON.stringify({ outputPath, previewTarget, runId, bundleHash, verdict: record.verdict }, null, 2));
