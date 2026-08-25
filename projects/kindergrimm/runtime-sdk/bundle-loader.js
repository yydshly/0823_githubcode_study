import { validateBatchManifestContract, validateReleaseCandidateContract } from '../runtime/contracts.js';

export const RUNTIME_SOURCE_SCHEMA = 'kindergrimm-runtime-source/0.1';

function failure(kind, result) {
  return {
    ok: false,
    kind,
    issues: (result?.issues ?? []).map(issue => ({ ...issue })),
    errors: [...(result?.errors ?? ['runtime source validation failed'])],
    warnings: [...(result?.warnings ?? [])],
    value: null
  };
}

export function loadManifest(manifest, options = {}) {
  const validator = options.validate ?? validateBatchManifestContract;
  const result = validator(manifest, {
    minAssets: options.minAssets ?? 8,
    maxAssets: options.maxAssets ?? 24
  });
  if (!result.ok) return failure('manifest', result);
  const items = result.items ?? result.assets ?? [];
  const input = result.input ?? manifest.batch?.input ?? null;
  let pack = result.pack ?? manifest.contentPack ?? null;
  if (options.resolvePack) {
    try { pack = options.resolvePack(pack); }
    catch (error) { return failure('manifest', { errors: [error.message] }); }
  }
  return {
    ok: true,
    kind: 'manifest',
    issues: [],
    errors: [],
    warnings: [...(result.warnings ?? [])],
    value: {
      schemaVersion: RUNTIME_SOURCE_SCHEMA,
      source: 'manifest',
      manifest,
      input,
      items,
      pack,
      assetFingerprints: items.map(item => item.fingerprint),
      visualFingerprints: items.map(item => item.visual?.fingerprint ?? null)
    }
  };
}

export function loadReleaseCandidate(record, options = {}) {
  let pack = options.pack;
  if (!pack && options.resolvePack) {
    try { pack = options.resolvePack(record?.candidate?.contentPack); }
    catch (error) { return failure('release-candidate', { errors: [error.message] }); }
  }
  const result = validateReleaseCandidateContract(record, { pack });
  if (!result.ok) return failure('release-candidate', result);
  return {
    ok: true,
    kind: 'release-candidate',
    issues: [], errors: [], warnings: [],
    value: {
      schemaVersion: RUNTIME_SOURCE_SCHEMA,
      source: 'release-candidate',
      record: result.value,
      pack: pack ?? result.value.candidate.contentPack,
      assetFingerprints: [...result.value.candidate.assetFingerprints],
      visualFingerprints: [...result.value.candidate.visualFingerprints]
    }
  };
}

export function loadRuntimeSource(value, options = {}) {
  if (value?.schemaVersion === 'kindergrimm-release-candidate/0.1') return loadReleaseCandidate(value, options);
  return loadManifest(value, options);
}
