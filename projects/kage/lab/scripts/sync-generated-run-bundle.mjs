import { readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

const runId = process.argv[2] || '';
if (!/^dedicated-[a-z0-9-]+$/.test(runId)) throw new Error('Expected a safe dedicated run id.');

const projectRoot = process.cwd();
const runsRoot = resolve(projectRoot, 'generated', 'runs');
const runRoot = resolve(runsRoot, runId);
if (runRoot !== runsRoot && !runRoot.startsWith(`${runsRoot}${sep}`)) throw new Error('Run path escaped generated/runs.');

const bundlePath = join(runRoot, 'bundle.json');
const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
for (const file of bundle.files || []) {
  if (!/^src\/[a-zA-Z0-9_.-]+$/.test(file.path)) throw new Error(`Unsafe generated source path: ${file.path}`);
  file.content = await readFile(join(runRoot, file.path), 'utf8');
}

const temporary = `${bundlePath}.tmp`;
await writeFile(temporary, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
await rename(temporary, bundlePath);
console.log(JSON.stringify({ runId, files: bundle.files.length, bundlePath }, null, 2));
