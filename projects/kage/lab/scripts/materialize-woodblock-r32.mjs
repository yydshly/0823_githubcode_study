import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateAndMaterializeDedicatedBundle } from '../server/dedicated-code-service.ts';

const projectRoot = resolve(process.cwd());
const parentId = 'dedicated-7b4cae3ee35e';
const id = 'dedicated-woodblock-asset-r32';
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
  description: '透明背景的同一张手工和纸成品，包含靛蓝海浪、朱红飞鸟、纸纤维与压痕；滚动只逐层显露该素材，不切换主体。',
  payloadBytes: assetBytes,
  required: true,
  experience: {
    anchor: 0.72,
    function: 'persistent',
    visualState: '同一张和纸从无墨、靛蓝海浪到朱红飞鸟逐层完成。',
    continuity: '纸张轮廓、纤维、画面坐标和光向全程保持不变，只改变墨层显露进度。',
    integration: 'alpha-subject',
  },
};

const request = structuredClone(parentReport.request);
request.reference.assets = [asset];
request.reference.productionStatus = 'asset-grounded';
request.creativeContract.assets = request.creativeContract.assets.map((item) => item.required ? {
  id: 'washi-final-print',
  role: 'subject',
  modality: 'transparent-image',
  required: true,
  minimumQuality: 'L3-presentable',
  sourcePriority: ['user-supplied', 'curated-library', 'primary-image-model', 'minimax-fallback'],
  visualResponsibility: '承担同一张和纸的真实纤维、完整海浪与飞鸟版画，以及最终英雄识别。',
  continuityRule: '滚动状态必须使用同一张纸和同一画面坐标，仅逐层显露压痕、靛蓝与朱红。',
  integration: 'alpha-subject',
  visibleProof: 'opening、middle、ending 的纸张边缘和纤维完全一致，末段显示完整版画。',
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
  'gpt-5.6-sol+imagegen-r32',
  1,
);
const reportPath = join(projectRoot, materialized.receipt.directory, 'build-report.json');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
await writeFile(reportPath, `${JSON.stringify({
  ...report,
  revision: {
    parentId,
    instruction: '用高质量透明和纸成品素材替代纯 Shader 主图，同时保持同一纸张的连续套印滚动。',
    summary: 'ImageGen 提供纸墨细节，Three.js 负责同一纸张、墨层显露、压版、光影和相机连续性。',
    changedFiles: ['src/scene.ts', 'src/experience.ts'],
    model: 'gpt-5.6-sol+imagegen-r32',
  },
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(materialized.receipt, null, 2));
