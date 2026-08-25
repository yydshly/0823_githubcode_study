import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const archiveRoot = join(
  projectRoot,
  'archive',
  'threejs-capability-research-phase-01-2026-08-26',
);

const manifest = JSON.parse(await readFile(join(archiveRoot, 'manifest.json'), 'utf8'));
const issues = [];

const requiredIds = new Set([
  'archive-readme',
  'stage-conclusion',
  'archive-refinement-r2',
  'research-platform-v3',
  'archive-browser-report',
  'research-platform-audit',
  'research-platform-browser-report',
  'product-workbench-browser-report',
  'visual-layer-lab-report',
  'desert-capability-report',
  'mobile-native-scorecard',
  'archive-desktop-screenshot',
  'archive-tablet-screenshot',
  'archive-mobile-screenshot',
]);

for (const id of requiredIds) {
  if (!manifest.entries.some((entry) => entry.id === id)) {
    issues.push(`Missing required manifest entry: ${id}`);
  }
}

for (const entry of manifest.entries) {
  const filePath = join(archiveRoot, entry.archived);

  try {
    const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    const hash = createHash('sha256').update(buffer).digest('hex');

    if (fileStat.size !== entry.bytes) {
      issues.push(`Byte count mismatch: ${entry.archived}`);
    }

    if (hash !== entry.sha256) {
      issues.push(`SHA-256 mismatch: ${entry.archived}`);
    }
  } catch (error) {
    issues.push(`Unreadable archive entry: ${entry.archived} (${error.message})`);
  }
}

const archiveBrowserReport = JSON.parse(
  await readFile(join(archiveRoot, 'reports', 'archive-browser-report.json'), 'utf8'),
);

if (archiveBrowserReport.result !== 'pass') {
  issues.push('Archive browser report is not passing.');
}

const failedBrowserChecks = Object.entries(archiveBrowserReport.checks ?? {})
  .filter(([, passed]) => passed !== true)
  .map(([name]) => name);

if (failedBrowserChecks.length > 0) {
  issues.push(`Archive browser checks failed: ${failedBrowserChecks.join(', ')}`);
}

const report = {
  result: issues.length === 0 ? 'pass' : 'fail',
  archiveId: manifest.archiveId,
  status: manifest.status,
  archiveDate: manifest.archiveDate,
  entries: manifest.entries.length,
  hashChecks: manifest.entries.length,
  browserChecks: Object.keys(archiveBrowserReport.checks ?? {}).length,
  issues,
};

await writeFile(
  join(archiveRoot, 'audit-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(report, null, 2));

if (issues.length > 0) {
  process.exitCode = 1;
}

