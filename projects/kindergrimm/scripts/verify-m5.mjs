import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RUNTIME_SDK_SCHEMA,
  RUNTIME_SDK_VERSION,
  createAssetCache,
  createActorState,
  createRuntimeDiagnostics,
  createRuntimeSession,
  loadManifest,
  loadReleaseCandidate
} from '../runtime-sdk/index.js';
import { contractFingerprint, releaseCandidateSnapshot } from '../runtime/contracts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const valid = await read('fixtures/contracts/mosslight-v06-manifest.json');
const tampered = await read('fixtures/contracts/tampered-visual-fingerprint.json');
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), ...evidence });

const loaded = loadManifest(valid, { minAssets: 8, maxAssets: 24 });
const rejected = loadManifest(tampered, { minAssets: 8, maxAssets: 24 });
check('m5.sdk.identity', RUNTIME_SDK_SCHEMA === 'kindergrimm-runtime-sdk/0.1' && RUNTIME_SDK_VERSION === '0.1.0', { schemaVersion: RUNTIME_SDK_SCHEMA, version: RUNTIME_SDK_VERSION });
check('m5.loader.accept', loaded.ok && loaded.value.items.length >= 8, { count: loaded.value?.items.length ?? 0, pack: loaded.value?.pack?.fingerprint ?? null });
check('m5.loader.reject', !rejected.ok && rejected.errors.length > 0, { firstError: rejected.errors[0] });

const files = [
  { path: 'manifest.json', role: 'source-of-truth', bytes: 100, crc32: '1234abcd' },
  { path: 'spritesheet.png', role: 'transparent-preview-atlas', bytes: 200, crc32: '2345bcde' },
  { path: 'content-pack.json', role: 'content-pack-contract', bytes: 300, crc32: '3456cdef' }
];
const rc = releaseCandidateSnapshot({
  schemaVersion: 'kindergrimm-release-candidate/0.1',
  id: 'rc-mosslight-waystation-m5-fixture',
  version: '0.1.0',
  createdAt: '2026-08-24T00:00:00.000Z',
  studio: { name: 'kindergrimm-production-studio', version: '0.1.0' },
  candidate: {
    contentPack: { id: valid.contentPack.id, version: valid.contentPack.version, fingerprint: valid.contentPack.fingerprint },
    renderer: { id: valid.contentPack.visual.id, version: valid.contentPack.visual.version, fingerprint: valid.contentPack.visual.fingerprint },
    input: { seed: valid.batch.input.seed, count: valid.assets.length },
    slot: 0,
    assetFingerprints: valid.assets.map(asset => asset.fingerprint),
    visualFingerprints: valid.assets.map(asset => asset.visual?.fingerprint ?? null)
  },
  review: { decision: 'approved', notes: 'M5 fixture', reviewedAt: '2026-08-24T00:00:00.000Z' },
  gates: ['g1-contract', 'g2-asset', 'g3-visual', 'g4-portability', 'g5-runtime', 'g6-budget'].map(id => ({ id, status: 'pass', evidence: 'fixture pass' })),
  bundle: { representation: 'stored-zip', files, fingerprint: contractFingerprint(files) },
  provenance: { source: 'M5 verification fixture', upstreamCommit: valid.generator.upstreamCommit, license: valid.contentPack.provenance.license, runtimeLlmCalls: 0, cloudApiCalls: 0 }
});
const loadedRc = loadReleaseCandidate(rc, { pack: valid.contentPack });
const tamperedRc = structuredClone(rc);
 tamperedRc.candidate.renderer.fingerprint = '00000000';
const rejectedRc = loadReleaseCandidate(tamperedRc, { pack: valid.contentPack });
check('m5.rc-loader.accept', loadedRc.ok && loadedRc.value.assetFingerprints.length === valid.assets.length, { fingerprint: rc.fingerprint, assets: loadedRc.value?.assetFingerprints.length ?? 0 });
check('m5.rc-loader.reject', !rejectedRc.ok && rejectedRc.errors.length > 0, { firstError: rejectedRc.errors[0] });

const cache = createAssetCache({ maxEntries: 2 });
let builds = 0;
const cacheRecord = { packFingerprint: 'pack0001', rendererFingerprint: 'rend0001', assetFingerprint: 'asset001', visualFingerprint: 'visual01' };
const first = await cache.resolve(cacheRecord, () => ({ build: ++builds }));
const second = await cache.resolve(cacheRecord, () => ({ build: ++builds }));
check('m5.cache.deduplicate', first === second && builds === 1 && cache.snapshot().hits === 1, cache.snapshot());

const actor = createActorState();
const transitions = [actor.transition('selected'), actor.transition('moving'), actor.transition('damaged'), actor.transition('disabled')];
check('m5.state.lifecycle', transitions.every(value => value.ok) && actor.snapshot().state === 'disabled', actor.snapshot());

const session = createRuntimeSession({ ...loaded.value, source: 'imported', importName: 'fixture.json' });
session.setMode('encounter');
session.select(3);
const sessionSnapshot = session.snapshot();
const restored = createRuntimeSession();
const restoreResult = restored.restore(sessionSnapshot);
check('m5.session.restore', restoreResult.ok && JSON.stringify(restored.snapshot()) === JSON.stringify(sessionSnapshot), { revision: sessionSnapshot.revision, mode: sessionSnapshot.mode, selected: sessionSnapshot.selected });

let now = 10;
const diagnostics = createRuntimeDiagnostics(() => now);
const stop = diagnostics.start('mount');
now = 42;
stop();
diagnostics.count('actors', 8);
check('m5.diagnostics.snapshot', diagnostics.snapshot().timings.mount.lastMs === 32 && diagnostics.snapshot().counters.actors === 8, diagnostics.snapshot());

const failures = checks.filter(value => !value.ok);
const result = { schemaVersion: 'kindergrimm-m5-verification/0.1', checks, summary: { passed: checks.length - failures.length, failed: failures.length }, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
