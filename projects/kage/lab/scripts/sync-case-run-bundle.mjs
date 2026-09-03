import { readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const runId = process.argv[2] || '';
if (!/^dedicated-[a-z0-9-]+$/.test(runId)) throw new Error('Expected a safe dedicated case id.');

const projectRoot = process.cwd();
const runsRoot = resolve(projectRoot, 'cases', 'runs');
const runRoot = resolve(runsRoot, runId);
if (runRoot !== runsRoot && !runRoot.startsWith(`${runsRoot}${sep}`)) throw new Error('Case path escaped cases/runs.');

const bundlePath = join(runRoot, 'bundle.json');
const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
const existing = new Map((bundle.files || []).map((file) => [file.path, file]));
const names = (await readdir(join(runRoot, 'src')))
  .filter((name) => /\.(?:ts|css)$/.test(name))
  .sort();

bundle.files = await Promise.all(names.map(async (name) => {
  const path = `src/${name}`;
  if (!/^src\/[a-zA-Z0-9_.-]+$/.test(path)) throw new Error(`Unsafe case source path: ${path}`);
  const previous = existing.get(path) || {};
  return {
    ...previous,
    path,
    language: extname(name) === '.css' ? 'css' : 'typescript',
    content: await readFile(join(runRoot, path), 'utf8'),
  };
}));

const temporary = `${bundlePath}.tmp`;
await writeFile(temporary, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
await rename(temporary, bundlePath);
console.log(JSON.stringify({ runId, files: bundle.files.map((file) => file.path), bundlePath }, null, 2));
