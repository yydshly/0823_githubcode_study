import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const upstreamRoot = resolve(projectRoot, 'upstream');
const patchesRoot = resolve(projectRoot, 'patches');
const patchPath = resolve(patchesRoot, 'studio-object3d-extension.patch');
const checksumPath = `${patchPath}.sha256`;

const patch = execFileSync(
  'git',
  ['-C', upstreamRoot, 'diff', '--no-ext-diff', '--binary', '--', 'src/game/studio.js'],
  { encoding: 'utf8' },
);

if (!patch.trim()) throw new Error('No local src/game/studio.js delta was found.');
if (!patch.includes('mountObject3D') || !patch.includes('registerTick')) {
  throw new Error('The Studio extension contract is missing from the captured delta.');
}

await mkdir(patchesRoot, { recursive: true });
await writeFile(patchPath, patch);
const digest = createHash('sha256').update(patch).digest('hex');
await writeFile(checksumPath, `${digest}  studio-object3d-extension.patch\n`);

console.log(JSON.stringify({ patchPath, checksumPath, sha256: digest }, null, 2));
