import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateAndMaterializeDedicatedBundle } from '../server/dedicated-code-service.ts';

const projectRoot = resolve(process.cwd());
const parentId = 'dedicated-woodblock-asset-r32';
const id = 'dedicated-woodblock-adaptive-r46';
const parentDirectory = join(projectRoot, 'generated', 'runs', parentId);
const workingDirectory = join(projectRoot, 'generated', 'runs', id);
const assetPath = join(projectRoot, 'public', 'creative-assets', 'r31-woodblock', 'washi-final-print-v1.png');
const assetBytes = (await stat(assetPath)).size;
const parentBundle = JSON.parse(await readFile(join(parentDirectory, 'bundle.json'), 'utf8'));
const parentReport = JSON.parse(await readFile(join(parentDirectory, 'build-report.json'), 'utf8'));
const sourceFiles = await Promise.all(parentBundle.files.map(async (file) => ({
  ...file,
  content: await readFile(join(workingDirectory, file.path), 'utf8'),
})));

const asset = {
  id: 'washi-final-print-v1',
  uri: '/creative-assets/r31-woodblock/washi-final-print-v1.png',
  bundlePath: 'assets/washi-final-print-v1.png',
  kind: 'image',
  source: 'chatgpt-generated',
  qualityLevel: 'L3-presentable',
  role: 'same-sheet final woodblock print hero texture',
  description: '透明背景的同一张手工和纸成品；五个产品状态只逐层显露压痕、靛蓝与朱红，不切换主体。',
  payloadBytes: assetBytes,
  required: true,
  experience: {
    anchor: 0.72,
    function: 'persistent',
    visualState: '同一张和纸从就位、压痕、靛蓝、朱红到完整作品连续完成。',
    continuity: '纸张轮廓、纤维、画面坐标和光向全程保持不变，只改变工序状态。',
    integration: 'alpha-subject',
  },
};

const request = structuredClone(parentReport.request);
request.reference.assets = [asset];
request.reference.productionStatus = 'asset-grounded';
request.creativeContract.experience.structure = {
  mode: 'continuous-canvas',
  segmentPolicy: 'content-derived',
  layoutRule: '同一张纸和同一画布贯穿全部工序；五个状态是连续时间锚点，不对应五个页面。',
};
request.creativeContract.experience.beats = [
  { id: 'paper-ready', position: 0, purpose: 'establish', visibleState: '同一张未落墨的纸与工作台建立材质、尺度和光线。', userProgression: '靠近纸面并确认纤维与留白。' },
  { id: 'pressure-trace', position: .2, purpose: 'develop', visibleState: '木版压力在同一张纸上留下压痕和纤维变化。', userProgression: '继续推进第一次真实接触。' },
  { id: 'indigo-layer', position: .46, purpose: 'develop', visibleState: '靛蓝墨层沿同一套印坐标压入纸面。', userProgression: '观察墨色与纸纤维的吸收关系。' },
  { id: 'vermilion-register', position: .72, purpose: 'transform', visibleState: '朱红套色落下并保留轻微错版证据。', userProgression: '比较两层墨色和套准关系。' },
  { id: 'finished-imprint', position: 1, purpose: 'resolve', visibleState: '完整作品稳定显现，并收束到预约一次亲手套印。', userProgression: '停止主要运动，观察成品并完成行动。' },
];
request.creativeContract.acceptance = request.creativeContract.acceptance.map((check) => ({
  ...check,
  id: check.id === 'middle-causal' ? 'process-causal' : check.id,
  evidence: check.evidence === 'screenshot-middle' ? 'screenshot-beat' : check.evidence,
}));
request.creativeContract.assets = request.creativeContract.assets.map((item) => item.required ? {
  ...item,
  id: 'washi-final-print',
  role: 'subject',
  modality: 'transparent-image',
  sourcePriority: ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
  visualResponsibility: '承担同一张和纸的真实纤维、完整海浪与飞鸟版画，以及全部工序的连续英雄识别。',
  continuityRule: '所有状态使用同一张纸和同一画面坐标，仅逐层显露压痕、靛蓝与朱红。',
  integration: 'alpha-subject',
  visibleProof: '五个合同状态中的纸张边缘和纤维一致，最终状态显示完整版画。',
  fallback: 'static-image',
} : item);

const bundle = {
  ...parentBundle,
  id,
  files: sourceFiles,
  assets: [{ id: asset.id, path: asset.bundlePath, kind: 'image', source: 'generated', required: true }],
};

const materialized = await validateAndMaterializeDedicatedBundle(
  request,
  bundle,
  { ...process.env, SIGNAL_PROJECT_ROOT: projectRoot },
  'gpt-5.6-sol+adaptive-r46',
  1,
);
const reportPath = join(projectRoot, materialized.receipt.directory, 'build-report.json');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
await writeFile(reportPath, `${JSON.stringify({
  ...report,
  revision: {
    parentId,
    instruction: '按产品工序重构为五个连续状态，取消固定开场、中段、结尾三屏结构。',
    summary: '同一 Three.js 画布持续存在，五个状态按非均匀节奏驱动压痕、靛蓝、朱红与最终行动；DOM 节点不等于页面。',
    changedFiles: ['src/experience.ts', 'src/director.ts', 'src/page.css'],
    model: 'gpt-5.6-sol+adaptive-r46',
  },
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(materialized.receipt, null, 2));
