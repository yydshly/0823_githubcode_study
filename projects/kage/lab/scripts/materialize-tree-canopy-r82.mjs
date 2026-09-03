import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { validateAndMaterializeDedicatedBundle } from '../server/dedicated-code-service.ts';

const projectRoot = resolve(process.cwd());
const parentId = 'dedicated-d436653c3b9a';
const id = 'dedicated-tree-canopy-final-r82';
const parentDirectory = join(projectRoot, 'generated', 'runs', parentId);
const workingDirectory = join(projectRoot, 'generated', 'runs', id);
const assetPath = join(projectRoot, 'public', 'creative-assets', 'r82-tree-canopy', 'street-canopy-hero-v1.png');
const assetBytes = (await stat(assetPath)).size;
const parentBundle = JSON.parse(await readFile(join(parentDirectory, 'bundle.json'), 'utf8'));
const parentReport = JSON.parse(await readFile(join(parentDirectory, 'build-report.json'), 'utf8'));
const sourceFiles = await Promise.all(parentBundle.files.map(async (file) => ({
  ...file,
  content: await readFile(join(workingDirectory, file.path), 'utf8'),
})));

const asset = {
  id: 'street-canopy-hero-v1',
  uri: '/creative-assets/r82-tree-canopy/street-canopy-hero-v1.png',
  bundlePath: 'assets/street-canopy-hero-v1.png',
  kind: 'image',
  source: 'chatgpt-generated',
  qualityLevel: 'L3-presentable',
  role: 'persistent real-world street canopy environment',
  description: '真实街道、成熟树冠与地面树荫的全屏主体环境；Three.js 只叠加可验证的树荫、热场和补水反馈。',
  payloadBytes: assetBytes,
  required: true,
  experience: {
    anchor: 0.5,
    function: 'persistent',
    visualState: '同一街道环境从清晨、正午到浇灌后保持空间连续。',
    continuity: '树木、道路、建筑与光向不切换，只改变树荫、热场和湿润反馈。',
    integration: 'full-bleed-environment',
  },
};

const request = structuredClone(parentReport.request);
request.reference.assets = [asset];
request.reference.productionStatus = 'asset-grounded';

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
  'gpt-5.6-sol+direct-r82',
  1,
);
const reportPath = join(projectRoot, materialized.receipt.directory, 'build-report.json');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
await writeFile(reportPath, `${JSON.stringify({
  ...report,
  revision: {
    parentId,
    instruction: '以最终效果收口：用真实树冠街道素材替换基础几何主体，并打通自动演示、真实滚轮与直接控件。',
    summary: '全屏真实环境承担主体识别，Three.js 只负责树荫、热场和补水的可验证反馈；保留业务闭环并支持移动端。',
    changedFiles: ['src/experience.ts', 'src/director.ts', 'src/scene.ts', 'src/page.css'],
    model: 'gpt-5.6-sol+direct-r82',
  },
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(materialized.receipt, null, 2));
