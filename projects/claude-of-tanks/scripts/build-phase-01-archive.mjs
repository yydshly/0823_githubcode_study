import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const archiveId = 'threejs-capability-research-phase-01-2026-08-26';
const archiveRoot = join(projectRoot, 'archive', archiveId);

const artifacts = [
  {
    id: 'stage-conclusion',
    kind: 'document',
    source: 'analysis/phase-01-stage-archive-2026-08-26.md',
    archived: 'phase-01-stage-archive.md',
  },
  {
    id: 'archive-refinement-r2',
    kind: 'document',
    source: 'analysis/archive-refinement-r2.md',
    archived: 'archive-refinement-r2.md',
  },
  {
    id: 'research-platform-v3',
    kind: 'document',
    source: 'analysis/research-platform-v3.md',
    archived: 'reports/research-platform-v3.md',
  },
  {
    id: 'archive-browser-report',
    kind: 'browser-report',
    source: 'evidence/research-archive/browser-report.json',
    archived: 'reports/archive-browser-report.json',
  },
  {
    id: 'research-platform-audit',
    kind: 'audit-report',
    source: 'evidence/research-platform/audit.json',
    archived: 'reports/research-platform-audit.json',
  },
  {
    id: 'research-platform-browser-report',
    kind: 'browser-report',
    source: 'evidence/research-platform/browser-report.json',
    archived: 'reports/research-platform-browser-report.json',
  },
  {
    id: 'product-workbench-browser-report',
    kind: 'browser-report',
    source: 'evidence/product-workbench/browser-report.json',
    archived: 'reports/product-workbench-browser-report.json',
  },
  {
    id: 'visual-layer-lab-report',
    kind: 'browser-report',
    source: 'evidence/visual-layer-lab-final/report.json',
    archived: 'reports/visual-layer-lab-report.json',
  },
  {
    id: 'desert-capability-report',
    kind: 'browser-report',
    source: 'evidence/capability-showcase/report.json',
    archived: 'reports/desert-capability-report.json',
  },
  {
    id: 'mobile-native-scorecard',
    kind: 'performance-report',
    source: 'evidence/mobile-native-scorecard.json',
    archived: 'reports/mobile-native-scorecard.json',
  },
  {
    id: 'archive-desktop-screenshot',
    kind: 'screenshot',
    source: 'evidence/research-archive/01-desktop-archive.png',
    archived: 'screenshots/01-desktop-archive.png',
  },
  {
    id: 'archive-tablet-screenshot',
    kind: 'screenshot',
    source: 'evidence/research-archive/02-tablet-archive.png',
    archived: 'screenshots/02-tablet-archive.png',
  },
  {
    id: 'archive-mobile-screenshot',
    kind: 'screenshot',
    source: 'evidence/research-archive/03-mobile-archive.png',
    archived: 'screenshots/03-mobile-archive.png',
  },
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

await mkdir(archiveRoot, { recursive: true });
await rm(join(archiveRoot, 'screenshots', '02-mobile-archive.png'), { force: true });

const entries = [];

for (const artifact of artifacts) {
  const sourcePath = join(projectRoot, artifact.source);
  const archivedPath = join(archiveRoot, artifact.archived);

  await mkdir(dirname(archivedPath), { recursive: true });
  await copyFile(sourcePath, archivedPath);

  const [sourceBuffer, archivedBuffer, archivedStat] = await Promise.all([
    readFile(sourcePath),
    readFile(archivedPath),
    stat(archivedPath),
  ]);

  const sourceHash = sha256(sourceBuffer);
  const archivedHash = sha256(archivedBuffer);

  if (sourceHash !== archivedHash) {
    throw new Error(`Archive copy mismatch: ${artifact.id}`);
  }

  entries.push({
    ...artifact,
    source: relative(projectRoot, sourcePath).replaceAll('\\', '/'),
    archived: relative(archiveRoot, archivedPath).replaceAll('\\', '/'),
    bytes: archivedStat.size,
    sha256: archivedHash,
  });
}

const readmePath = join(archiveRoot, 'README.md');
const readmeBuffer = await readFile(readmePath);

const manifest = {
  archiveId,
  status: 'archived',
  archiveDate: '2026-08-26',
  sourceRevision: 'fba54d06a5ccf1053477efde5e60bb9b338584e9',
  registryVersion: 3,
  policy: 'lightweight-evidence-bundle',
  generatedBy: 'scripts/build-phase-01-archive.mjs',
  entryCount: entries.length + 1,
  entries: [
    {
      id: 'archive-readme',
      kind: 'document',
      source: 'archive/threejs-capability-research-phase-01-2026-08-26/README.md',
      archived: 'README.md',
      bytes: readmeBuffer.byteLength,
      sha256: sha256(readmeBuffer),
    },
    ...entries,
  ],
};

await writeFile(
  join(archiveRoot, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  result: 'pass',
  archive: relative(projectRoot, archiveRoot).replaceAll('\\', '/'),
  entries: manifest.entryCount,
}, null, 2));

