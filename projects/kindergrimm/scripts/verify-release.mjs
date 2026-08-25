import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contractFingerprint, validatePlatformReleaseContract } from '../runtime/contracts.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseDir = path.join(projectDir, 'releases', 'kindergrimm-2d-v1');
const manifest = JSON.parse(await fs.readFile(path.join(releaseDir, 'release-manifest.json'), 'utf8'));
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), ...evidence });

const contract = validatePlatformReleaseContract(manifest);
check('m6.release.contract', contract.ok, { fingerprint: contract.fingerprint, issues: contract.issues });

const inventory = [];
for (const artifact of manifest.artifacts) {
  try {
    const text = await fs.readFile(path.join(releaseDir, artifact.path), 'utf8');
    const bytes = new TextEncoder().encode(text).length;
    const fingerprint = contractFingerprint(text);
    inventory.push({ path: artifact.path, bytes, fingerprint, ok: bytes === artifact.bytes && fingerprint === artifact.fingerprint });
  } catch (error) {
    inventory.push({ path: artifact.path, ok: false, error: error.message });
  }
}
check('m6.release.inventory', inventory.length >= 4 && inventory.every(item => item.ok), { inventory });

const evidence = [];
for (const surface of manifest.browserEvidence) {
  for (const relative of surface.paths) {
    try {
      const stat = await fs.stat(path.join(projectDir, relative));
      evidence.push({ surface: surface.id, path: relative, bytes: stat.size, ok: stat.isFile() && stat.size > 0 });
    } catch (error) {
      evidence.push({ surface: surface.id, path: relative, ok: false, error: error.message });
    }
  }
}
check('m6.release.browser-evidence', evidence.length >= 6 && evidence.every(item => item.ok), { evidence });

const suites = [
  ['m2-contracts', 'verify-contracts.mjs'],
  ['m3-independent-2d', 'verify-m3.mjs'],
  ['m5-runtime-sdk', 'verify-m5.mjs']
].map(([id, script]) => {
  const result = spawnSync(process.execPath, [path.join(projectDir, 'scripts', script)], { cwd: projectDir, encoding: 'utf8' });
  return { id, ok: result.status === 0, exitCode: result.status, report: result.status === 0 ? JSON.parse(result.stdout) : null, error: result.status === 0 ? null : (result.stderr || result.stdout) };
});
check('m6.release.suites', suites.every(suite => suite.ok), { suites: suites.map(suite => ({ id: suite.id, ok: suite.ok, exitCode: suite.exitCode })) });

const gateIds = manifest.gates.map(gate => gate.id);
check('m6.release.gates', manifest.gates.length === 8 && manifest.gates.every(gate => gate.status === 'pass') && new Set(gateIds).size === 8, { gateIds });
check('m6.release.identity', manifest.identity.contentPack.fingerprint === 'a96d877a' && manifest.identity.renderer.fingerprint === '32d9c2cf' && manifest.identity.runtimeSdk.version === '0.1.0', { identity: manifest.identity });
check('m6.release.boundary', manifest.provenance.runtimeLlmCalls === 0 && manifest.provenance.cloudApiCalls === 0 && manifest.scope.excluded.includes('AI intent adapter') && manifest.scope.excluded.includes('3D backend program'), { excluded: manifest.scope.excluded });

const tampered = structuredClone(manifest);
tampered.artifacts[0].bytes += 1;
const tamperResult = validatePlatformReleaseContract(tampered);
check('m6.release.tamper', !tamperResult.ok && tamperResult.errors.some(error => error.includes('fingerprint')), { firstError: tamperResult.errors[0] });

const failures = checks.filter(value => !value.ok);
const result = { schemaVersion: 'kindergrimm-m6-verification/1.0', release: { id: manifest.id, version: manifest.version, fingerprint: manifest.fingerprint }, checks, summary: { passed: checks.length - failures.length, failed: failures.length, artifacts: inventory.length, evidence: evidence.length, gates: manifest.gates.length }, failures };
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
