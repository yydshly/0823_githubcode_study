import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONTRACT_SCHEMAS,
  validateBatchManifestContract
} from '../runtime/contracts.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, '..');
const fixtureDir = path.join(projectDir, 'fixtures', 'contracts');
const schemaDir = path.join(projectDir, 'schemas');
const pinnedCommit = 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8';

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function verifySchemas() {
  const expected = new Map([
    ['recipe.schema.json', CONTRACT_SCHEMAS.recipe],
    ['renderer.schema.json', CONTRACT_SCHEMAS.renderer],
    ['content-pack.schema.json', CONTRACT_SCHEMAS.contentPack],
    ['visual-record.schema.json', CONTRACT_SCHEMAS.visualRecord],
    ['batch-manifest.schema.json', CONTRACT_SCHEMAS.batchManifest],
    ['release-candidate.schema.json', CONTRACT_SCHEMAS.releaseCandidate],
    ['platform-release.schema.json', CONTRACT_SCHEMAS.platformRelease]
  ]);
  const rows = [];
  for (const [file, id] of expected) {
    const schema = await readJson(path.join(schemaDir, file));
    const ok = schema.$schema === 'https://json-schema.org/draft/2020-12/schema' && schema.$id === id;
    rows.push({ file, id, ok });
  }
  return rows;
}

function verifyKnownValues(manifest, fixture) {
  const failures = [];
  if (fixture.firstRecipeFingerprint && manifest.assets[0]?.fingerprint !== fixture.firstRecipeFingerprint) failures.push('firstRecipeFingerprint');
  if (fixture.packFingerprint && manifest.contentPack?.fingerprint !== fixture.packFingerprint) failures.push('packFingerprint');
  if (fixture.rendererFingerprint && manifest.contentPack?.visual?.fingerprint !== fixture.rendererFingerprint) failures.push('rendererFingerprint');
  if (fixture.firstVisualFingerprint && manifest.assets[0]?.visual?.fingerprint !== fixture.firstVisualFingerprint) failures.push('firstVisualFingerprint');
  if (fixture.partsPerAsset && manifest.assets.some(asset => asset.visual?.addedParts?.length !== fixture.partsPerAsset)) failures.push('partsPerAsset');
  return failures;
}

async function verifyFixtures() {
  const index = await readJson(path.join(fixtureDir, 'fixture-index.json'));
  const rows = [];
  for (const fixture of index.fixtures) {
    const manifest = await readJson(path.join(fixtureDir, fixture.file));
    const result = validateBatchManifestContract(manifest, {
      minAssets: 1,
      maxAssets: 24,
      expectedUpstreamCommit: pinnedCommit,
      contentPackOptions: { expectedUpstreamCommit: pinnedCommit }
    });
    const knownFailures = verifyKnownValues(manifest, fixture);
    const expectedIssue = fixture.expect === 'reject'
      ? result.issues.some(issue => issue.code === fixture.expectedCode && issue.path === fixture.expectedPath)
      : true;
    const behavior = fixture.expect === 'accept' ? result.ok : !result.ok && expectedIssue;
    rows.push({
      file: fixture.file,
      expect: fixture.expect,
      ok: behavior && knownFailures.length === 0,
      issues: result.issues.length,
      firstIssue: result.issues[0] ? `${result.issues[0].code}@${result.issues[0].path}` : null,
      knownFailures
    });
  }
  return rows;
}

const schemas = await verifySchemas();
const fixtures = await verifyFixtures();
const failures = [
  ...schemas.filter(row => !row.ok),
  ...fixtures.filter(row => !row.ok)
];

console.log(JSON.stringify({
  pureModule: true,
  schemaCount: schemas.length,
  fixtureCount: fixtures.length,
  schemas,
  fixtures,
  failures: failures.length
}, null, 2));

if (failures.length) process.exitCode = 1;

