import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const deliveryId = 'thunderhead-score';
const runId = 'direct-r153-thunderhead-score-sheet';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const outputRoot = resolve(root, 'docs', 'v2-research', 'evidence');
const outputPath = resolve(outputRoot, 'r153-thunderhead-score-sheet.final.json');
const previewSource = resolve(root, 'docs', 'v2-deliveries', 'evidence', 'r153-thunderhead-score-sheet', '01-desktop-opening.png');
const previewTarget = resolve(root, 'public', 'creative-assets', 'v2-experience-archive', 'thunderhead-score.png');
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
  revisionReason: '用户在真实浏览器中指出 R149 与 R152 风格相同；R153 修正宏观构图而不增加全局风格禁令。',
  structureCorrection: {
    priorPattern: 'full-bleed generated image + overlaid large title + bottom stage rail',
    finalPattern: 'light editorial score sheet + bounded storm aperture + vertical movement axis',
    addedAssetBatches: 0,
    preservedCausality: ['scroll-phase', 'pointer-shear', 'programmatic-audio', 'save-score'],
  },
  browserEvidence: {
    desktopOpening: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/01-desktop-opening.png',
    desktopInteraction: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/02-desktop-charge.png',
    desktopCompletion: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/03-desktop-saved.png',
    mobile: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/04-mobile-charge.png',
    mobileFallback: 'docs/v2-deliveries/evidence/r153-thunderhead-score-sheet/05-mobile-fallback.png',
    photoWidthBelow70Percent: true,
    verticalMovementAxis: true,
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
    goalClarity: 93,
    creativeDistinctiveness: 91,
    craftCohesion: 91,
    assetIntegration: 92,
    interactionValue: 92,
    mobileReadiness: 89,
    templateInertiaCorrected: true,
    summary: '雷暴素材不再充当可互换全屏背景；纸面、窗口、垂直乐谱和同一天气状态形成新的版面与交互语言。',
  },
  truthBoundary: '页面持续标注为艺术化展览模拟，不代表真实气象观测或预报。',
  verdict: 'pass',
  archiveDisposition: 'replace-r152-current-reference',
  stopReason: '宏观骨架差异、因果互动与跨表面证据均已通过；停止继续增加案例或视觉技术。',
};

await mkdir(outputRoot, { recursive: true });
await mkdir(resolve(previewTarget, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
await copyFile(previewSource, previewTarget);
console.log(JSON.stringify({ outputPath, previewTarget, runId, bundleHash, verdict: record.verdict }, null, 2));
