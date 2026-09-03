import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const deliveryId = 'lighthouse-chart-reveal';
const runId = 'direct-r160-lighthouse-chart-reveal';
const sourceRoot = resolve(root, 'pages', 'v2', 'deliveries', deliveryId);
const outputRoot = resolve(root, 'docs', 'v2-research', 'evidence');
const outputPath = resolve(outputRoot, 'r160-lighthouse-chart-reveal.final.json');
const previewSource = resolve(root, 'docs', 'v2-deliveries', 'evidence', 'r160-lighthouse-chart-reveal', 'desktop-complete.png');
const previewTarget = resolve(root, 'public', 'creative-assets', 'v2-experience-archive', 'lighthouse-chart-reveal.png');
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
  route: './deliveries/lighthouse-chart-reveal/',
  identity: { runId, bundleHash, bundleFiles },
  goalReplay: {
    subject: '失踪灯塔海图显影',
    audience: '进入虚构海洋档案、希望通过观察完成发现的人',
    feeling: '潮湿、神秘、精密且具有发现感',
    primaryAction: '保存这次显影',
    hardConstraints: ['以最终视觉体验为准', '发现必须由真实输入触发', '零素材批次', '不冒充真实海图或档案'],
  },
  mediumDecision: {
    preferred: 'svg-mask-canvas-runtime',
    rationale: 'SVG 同时承担纸面、隐藏墨迹、遮罩和返航路线；Canvas 只增强水光，DOM 保证操作、状态与回退完整。',
  },
  direction: {
    selected: '让显影灯在同一张受潮海图上逐处唤回三枚灯塔印记。',
    compared: ['SVG 显影海图', 'WebGL 雾港巡航', '生成旧地图拼贴'],
    referenceIds: ['stormglass-archive', 'moonlit-tidepool-panorama', 'prism-seed-theatre'],
    borrowPrinciples: ['短暂现象留下可回看证据', '连续地点承载寻找路径', '光成为状态变化的原因'],
    assetBatchCount: 0,
  },
  executionBudget: { directionsBuilt: 1, assetBatches: 0, fullBuilds: 1, deterministicFixes: 1, visualRefinements: 1 },
  browserEvidence: {
    desktopOpening: 'docs/v2-deliveries/evidence/r160-lighthouse-chart-reveal/desktop-opening.png',
    desktopInteraction: 'docs/v2-deliveries/evidence/r160-lighthouse-chart-reveal/desktop-revealing.png',
    desktopCompletion: 'docs/v2-deliveries/evidence/r160-lighthouse-chart-reveal/desktop-complete.png',
    mobileOpening: 'docs/v2-deliveries/evidence/r160-lighthouse-chart-reveal/mobile-opening.png',
    mobileCompletion: 'docs/v2-deliveries/evidence/r160-lighthouse-chart-reveal/mobile-complete.png',
    pointerRevealLinked: true,
    falseHitRejected: true,
    routeCompletionReached: true,
    keyboardMotionPassed: true,
    mobile390JourneyPassed: true,
    reducedMotionPassed: true,
    canvasFallbackPassed: true,
    horizontalOverflow: 0,
  },
  qualityAssessment: {
    verdict: 'pass',
    goalClarity: 92,
    creativeDistinctiveness: 94,
    craftCohesion: 92,
    assetIntegration: 93,
    interactionValue: 93,
    mobileReadiness: 90,
    summary: '海图、显影灯、隐藏印记和返航线共享同一视觉语言；没有生成图或 3D，仍以遮罩、材质和真实命中形成强主题体验。',
  },
  truthBoundary: '页面为虚构交互练习档案，不对应真实地点、坐标、灯塔、航线或历史记录。',
  verdict: 'pass',
  archiveDisposition: 'replace-ten-second-callsign-decode-as-less-redundant-mask-and-spatial-interaction-reference',
  stopReason: '一个方向、零素材批次、一次完整构建、一次遮挡修复与一次移动端/完成态视觉精修后通过；停止追加技术和视觉变体。',
};

await mkdir(outputRoot, { recursive: true });
await mkdir(resolve(previewTarget, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
await copyFile(previewSource, previewTarget);
console.log(JSON.stringify({ outputPath, previewTarget, runId, bundleHash, verdict: record.verdict }, null, 2));

