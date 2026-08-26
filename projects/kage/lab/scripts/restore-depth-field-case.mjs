import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { archiveDedicatedCase } from '../server/case-library.ts';
import { validateAndMaterializeDedicatedBundle } from '../server/dedicated-code-service.ts';

const projectRoot = resolve(process.cwd());
const bundle = JSON.parse(await readFile(join(projectRoot, '.tmp', 'bundle-depth-field-synced.json'), 'utf8'));
const report = JSON.parse(await readFile(join(projectRoot, '.tmp', 'build-report-depth-field-synced.json'), 'utf8'));
const environment = { ...process.env, SIGNAL_PROJECT_ROOT: projectRoot };

const materialized = await validateAndMaterializeDedicatedBundle(
  report.request,
  bundle,
  environment,
  report.receipt.model,
  report.receipt.attempts
);

const runDirectory = resolve(projectRoot, materialized.receipt.directory);
await writeFile(join(runDirectory, 'build-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const archived = await archiveDedicatedCase({
  id: bundle.id,
  title: '先锋时装 · 模型精修完整作品',
  note: '从模型生成素材出发，依次处理主体割裂、透明边缘、全屏场融合与 2.5D 景深；只展示最终 depth-field 版本。',
  stage: 'featured',
  tags: ['model-generated', 'fashion', 'alpha-cutout', 'borderless-field', 'layered-depth']
}, environment);

console.log(JSON.stringify({ receipt: materialized.receipt, archived }, null, 2));
