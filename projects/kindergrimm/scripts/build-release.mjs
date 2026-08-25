import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT_SCHEMAS,
  contractFingerprint,
  platformReleaseSnapshot,
  validatePlatformReleaseContract
} from '../runtime/contracts.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(projectDir, 'releases', 'kindergrimm-2d-v1');
const readJson = async relative => JSON.parse(await fs.readFile(path.join(projectDir, relative), 'utf8'));
const encode = value => new TextEncoder().encode(value);

function runSuite(id, script, summary) {
  const result = spawnSync(process.execPath, [path.join(projectDir, 'scripts', script)], { encoding: 'utf8', cwd: projectDir });
  if (result.status !== 0) throw new Error(`${id} failed: ${result.stderr || result.stdout}`);
  const report = JSON.parse(result.stdout);
  return { id, status: 'pass', summary: summary(report), report };
}

const suites = [
  runSuite('m2-contracts', 'verify-contracts.mjs', report => `${report.schemaCount} schemas · ${report.fixtureCount} fixtures · ${report.failures} failures`),
  runSuite('m3-independent-2d', 'verify-m3.mjs', report => `${report.summary.passed}/9 · ${report.summary.goldenRecipes} golden · ${report.summary.rendererFeatures} features`),
  runSuite('m5-runtime-sdk', 'verify-m5.mjs', report => `${report.summary.passed}/9 · loader/cache/state/session/diagnostics pass`)
];

const golden = await readJson('fixtures/golden/mosslight-core-2d-recipes.json');
const browserMatrix = {
  schemaVersion: 'kindergrimm-browser-matrix/1.0',
  capturedAt: '2026-08-24T14:00:00.000Z',
  surfaces: [
    {
      id: 'production-studio',
      paths: ['evidence/m4-production-studio-desktop.png', 'evidence/m4-production-studio-mobile.png', 'evidence/m4-production-studio-webgl-off.png'],
      assertions: ['Original/Decorator/Core comparison', '6/6 gates', '4-file RC CRC pass', '390 no overflow', 'keyboard journey', 'reduced-motion', 'WebGL-off semantic workflow']
    },
    {
      id: 'runtime-sdk',
      paths: ['evidence/m5-runtime-sdk-desktop.png', 'evidence/m5-runtime-sdk-mobile.png', 'evidence/m5-runtime-sdk-webgl-off.png'],
      assertions: ['three modes preserve 8 identities', '184 authored / 0 upstream planes', '186 draw calls', 'warm rebuild 177ms', '390 no overflow', 'keyboard actor state', 'WebGL-off roster/session/cache']
    }
  ]
};

const verificationMatrix = {
  schemaVersion: 'kindergrimm-release-verification/1.0',
  generatedAt: '2026-08-24T14:00:00.000Z',
  suites: suites.map(({ id, status, summary, report }) => ({ id, status, summary, reportSchema: report.schemaVersion ?? 'kindergrimm-contract-verification/0.1' })),
  summary: { passed: suites.length, failed: 0 }
};

const goldenSummary = {
  schemaVersion: 'kindergrimm-golden-summary/1.0',
  pack: { id: golden.pack.id, version: golden.pack.version, fingerprint: golden.pack.fingerprint },
  renderer: { id: golden.pack.visual.id, version: golden.pack.visual.version, fingerprint: golden.pack.visual.fingerprint },
  recipes: golden.items.length,
  uniqueRecipeFingerprints: new Set(golden.items.map(item => item.fingerprint)).size,
  uniqueVisualFingerprints: new Set(golden.items.map(item => item.visual.fingerprint)).size,
  species: [...new Set(golden.items.map(item => item.recipe.species))].sort(),
  supportedBases: golden.pack.provenance.supportedBases
};

const runtimeSdk = {
  schemaVersion: 'kindergrimm-runtime-sdk/0.1',
  id: 'kindergrimm-runtime-sdk',
  version: '0.1.0',
  pureEntry: 'runtime-sdk/index.js',
  rendererEntry: 'runtime-sdk/three.js',
  modules: ['bundle-loader', 'asset-cache', 'state-hooks', 'runtime-session', 'diagnostics', 'scene-adapter'],
  runtimeLlmCalls: 0,
  cloudApiCalls: 0
};

const provenance = `# Kindergrimm 2D v1 provenance

- Upstream: https://github.com/albertobeiz/kindergrimm
- Pinned commit: de339ad739d8cbd28ff2dd4a940af38c0ede86c8
- Upstream license: Unlicense / public domain.
- Upstream-owned path: projects/kindergrimm/upstream/ (not modified).
- Locally authored: contracts, Mosslight Decorator, independent Mosslight Core 2D renderer, Production Studio, Runtime SDK, tests, evidence and release records.
- Core renderer boundary: low-level upstream Canvas plane and animation protocol remain Unlicense; all 23 visible Core planes are locally authored.
- Runtime LLM calls: 0. Cloud API calls: 0.
- Optional AI and separate 3D programs are excluded from this release.
`;

const handoff = `# Kindergrimm 2D Platform v1 · Research Release

This artifact is the auditable handoff for the 2D-first deterministic game-asset platform proven in M0–M6.

## Verify

From the repository root:

    node projects/kindergrimm/scripts/verify-release.mjs

## Operate

1. Run \`.\\projects\\kindergrimm\\scripts\\npc-factory.ps1\`.
2. Open \`/projects/kindergrimm/production-studio/\`.
3. Author → Compare → Review → G1–G6 → build Release Candidate.
4. Open \`/projects/kindergrimm/npc-scenarios/?seed=240824&pack=mosslight-core-2d\`.
5. Verify Waystation, Encounter and Council preserve the same fingerprints.

## Locked identities

- Content Pack: mosslight-core-2d 0.1.0 / a96d877a
- Renderer: mosslight-core-2d 0.1.0 / 32d9c2cf
- Runtime SDK: kindergrimm-runtime-sdk 0.1.0
- Golden: 50 Recipe + 50 Visual fingerprints

This is a local research release, not an external publication. AI intent and 3D backends remain outside scope.
`;

const files = new Map([
  ['content-pack.json', JSON.stringify(golden.pack, null, 2) + '\n'],
  ['runtime-sdk.json', JSON.stringify(runtimeSdk, null, 2) + '\n'],
  ['golden-summary.json', JSON.stringify(goldenSummary, null, 2) + '\n'],
  ['browser-matrix.json', JSON.stringify(browserMatrix, null, 2) + '\n'],
  ['verification-matrix.json', JSON.stringify(verificationMatrix, null, 2) + '\n'],
  ['provenance.md', provenance],
  ['README.md', handoff]
]);

await fs.mkdir(releaseDir, { recursive: true });
for (const [name, text] of files) await fs.writeFile(path.join(releaseDir, name), text, 'utf8');

const roles = {
  'content-pack.json': 'locked-content-pack',
  'runtime-sdk.json': 'runtime-sdk-descriptor',
  'golden-summary.json': 'visual-golden-summary',
  'browser-matrix.json': 'browser-evidence-index',
  'verification-matrix.json': 'automated-verification-matrix',
  'provenance.md': 'source-and-license-boundary',
  'README.md': 'operator-handoff'
};
const artifacts = [...files].map(([filePath, text]) => ({ path: filePath, role: roles[filePath], bytes: encode(text).length, fingerprint: contractFingerprint(text) }));

const release = platformReleaseSnapshot({
  schemaVersion: CONTRACT_SCHEMAS.platformRelease,
  id: 'kindergrimm-2d-v1',
  version: '1.0.0',
  releasedAt: '2026-08-24T14:00:00.000Z',
  status: 'research-release',
  scope: {
    northStar: 'Versioned deterministic 2D game assets from author intent to reviewed release and stable runtime consumption.',
    included: ['domain contracts', 'independent Mosslight Core 2D', 'Production Studio', 'Runtime SDK', 'G0–G7 evidence'],
    excluded: ['external publishing', 'backend collaboration', 'AI intent adapter', '3D backend program']
  },
  identity: {
    upstream: { repository: 'https://github.com/albertobeiz/kindergrimm', commit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8', license: 'Unlicense' },
    contentPack: { id: golden.pack.id, version: golden.pack.version, fingerprint: golden.pack.fingerprint },
    renderer: { id: golden.pack.visual.id, version: golden.pack.visual.version, fingerprint: golden.pack.visual.fingerprint },
    runtimeSdk: { id: runtimeSdk.id, version: runtimeSdk.version, schemaVersion: runtimeSdk.schemaVersion }
  },
  gates: [
    { id: 'g0-goal', status: 'pass', evidence: ['PROGRAM.md North Star and 2D/AI/3D boundaries'] },
    { id: 'g1-contract', status: 'pass', evidence: ['7 schemas', '4 accept/reject fixtures', 'pure validators'] },
    { id: 'g2-asset', status: 'pass', evidence: ['23/23 Core authored planes', '0 upstream visible planes'] },
    { id: 'g3-visual', status: 'pass', evidence: ['50 unique Recipe fingerprints', '50 unique Visual fingerprints'] },
    { id: 'g4-portability', status: 'pass', evidence: ['Manifest validation', 'RC JSON', 'stored ZIP CRC evidence'] },
    { id: 'g5-runtime', status: 'pass', evidence: ['Runtime SDK 0.1.0', 'three modes preserve 8 identities', 'transactional import'] },
    { id: 'g6-budget', status: 'pass', evidence: ['Studio compare/RC budgets', 'Runtime warm rebuild 177ms', 'desktop/390/keyboard/motion/WebGL-off'] },
    { id: 'g7-release', status: 'pass', evidence: ['artifact inventory', 'provenance boundary', 'operator handoff', 'release verifier'] }
  ],
  artifacts,
  browserEvidence: browserMatrix.surfaces.map(surface => ({ id: surface.id, paths: surface.paths, assertions: surface.assertions })),
  provenance: {
    runtimeLlmCalls: 0,
    cloudApiCalls: 0,
    authoredPaths: ['runtime/', 'runtime-sdk/', 'production-studio/', 'npc-factory/', 'npc-scenarios/', 'schemas/', 'scripts/', 'analysis/', 'evidence/'],
    upstreamPaths: ['upstream/']
  },
  verification: {
    command: 'node projects/kindergrimm/scripts/verify-release.mjs',
    suites: suites.map(({ id, status, summary }) => ({ id, status, summary }))
  }
});

const validation = validatePlatformReleaseContract(release);
if (!validation.ok) throw new Error(validation.errors.join('\n'));
await fs.writeFile(path.join(releaseDir, 'release-manifest.json'), JSON.stringify(release, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ release: release.id, version: release.version, fingerprint: release.fingerprint, artifacts: artifacts.length, gates: release.gates.length, suites: suites.length }, null, 2));
