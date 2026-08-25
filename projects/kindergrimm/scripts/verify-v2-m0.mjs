import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contentPackSnapshot,
  validateContentPackContract
} from '../runtime/contracts.js';
import {
  CONTENT_PACK_FAMILY_SCHEMA,
  MOONHARBOR_CORE_PACK_ID,
  MOONHARBOR_CORE_PROFILE,
  deriveContentPackFamily,
  describeContentPackFamily
} from '../runtime/content-pack-family.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(project, relative), 'utf8');
const json = async relative => JSON.parse(await read(relative));
const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ ...evidence, id, ok: Boolean(ok) });

const release = await json('releases/kindergrimm-2d-v1/release-manifest.json');
const base = await json('releases/kindergrimm-2d-v1/content-pack.json');
check('v2.v1.release-frozen', release.fingerprint === 'df8ac08c'
  && base.fingerprint === 'a96d877a'
  && base.visual.fingerprint === '32d9c2cf', {
  release: release.fingerprint,
  pack: base.fingerprint,
  renderer: base.visual.fingerprint
});

const first = contentPackSnapshot(deriveContentPackFamily(base));
const second = contentPackSnapshot(deriveContentPackFamily(base));
const contract = validateContentPackContract(first, {
  expectedUpstreamCommit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8',
  speciesIds: ['human', 'dog', 'cat', 'nightmare'],
  mediaIds: ['graphite', 'ink', 'watercolor', 'oil', 'chalk', 'marker', 'mosslight-gouache']
});
check('v2.family.contract', contract.ok
  && first.id === MOONHARBOR_CORE_PACK_ID
  && MOONHARBOR_CORE_PROFILE.schemaVersion === CONTENT_PACK_FAMILY_SCHEMA, {
  id: first.id,
  packFingerprint: first.fingerprint,
  rendererFingerprint: first.visual.fingerprint,
  issues: contract.issues
});
check('v2.family.deterministic', JSON.stringify(first) === JSON.stringify(second), {
  packFingerprint: first.fingerprint,
  rendererFingerprint: first.visual.fingerprint
});

const lineage = describeContentPackFamily(base, first);
check('v2.family.lineage', lineage.relation === 'palette-identity-variant'
  && first.visual.id === base.visual.id
  && first.visual.fingerprint !== base.visual.fingerprint
  && JSON.stringify(first.visual.features) === JSON.stringify(base.visual.features)
  && JSON.stringify(first.visual.coverage) === JSON.stringify(base.visual.coverage)
  && JSON.stringify(first.visual.palette) !== JSON.stringify(base.visual.palette), lineage);

const tampered = structuredClone(first);
tampered.visual.palette.glow = '#ffffff';
const tamper = validateContentPackContract(tampered, {
  expectedUpstreamCommit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8',
  speciesIds: ['human', 'dog', 'cat', 'nightmare'],
  mediaIds: ['graphite', 'ink', 'watercolor', 'oil', 'chalk', 'marker', 'mosslight-gouache']
});
check('v2.family.tamper', !tamper.ok && tamper.errors.some(error => error.includes('fingerprint')), {
  firstError: tamper.errors[0]
});

const integration = {
  packs: await read('runtime/content-packs.js'),
  core: await read('runtime/npc-core.js'),
  factory: await read('npc-factory/index.html'),
  factoryJs: await read('npc-factory/factory.js'),
  scenarios: await read('npc-scenarios/index.html'),
  scenariosJs: await read('npc-scenarios/scenarios.js'),
  studio: await read('production-studio/index.html'),
  program: await read('PROGRAM-V2.md'),
  nextContract: await read('analysis/v2-m1-structural-style-backend-delivery-contract.md'),
  m2Contract: await read('analysis/v2-m2-style-system-expansion-delivery-contract.md'),
  m3Contract: await read('analysis/v2-m3-asset-capability-expansion-delivery-contract.md')
};
check('v2.family.integration', integration.packs.includes('deriveContentPackFamily')
  && integration.core.includes("pack.visual?.kind === 'procedural-2d-core'")
  && integration.factory.includes('kindergrimm-original')
  && integration.factoryJs.includes("initialParams.get('pack')")
  && integration.factoryJs.includes('replaceChildren(...packOptions)')
  && integration.scenarios.includes('kindergrimm-original')
  && integration.scenariosJs.includes('replaceChildren(...packOptions)')
  && integration.studio.includes('V2 多风格扩展'), {
  surfaces: ['registry', 'generation-core', 'factory', 'scenarios', 'studio-nav']
});
check('v2.program.locked', integration.program.includes('V2-M0 · Preserve & Family Proof')
  && integration.program.includes('V2-M1 · Independent Structural Style Backend')
  && integration.program.includes('V2-M2 · Style System Expansion')
  && integration.nextContract.includes('DONE')
  && integration.m2Contract.includes('DONE')
  && integration.m3Contract.includes('DONE'), {
  completed: ['V2-M0', 'V2-M1', 'V2-M2', 'V2-M3'],
  current: 'V2-M4'
});

const browserEvidencePaths = [
  'evidence/v2-m0-moonharbor-factory-desktop.png',
  'evidence/v2-m0-moonharbor-factory-mobile.png',
  'evidence/v2-m0-moonharbor-factory-webgl-off.png',
  'evidence/v2-m0-moonharbor-runtime-desktop.png',
  'evidence/v2-program-portfolio-mobile.png'
];
const browserEvidence = await Promise.all(browserEvidencePaths.map(async relative => {
  try {
    const stat = await fs.stat(path.join(project, relative));
    return { path: relative, bytes: stat.size, ok: stat.isFile() && stat.size > 0 };
  } catch (error) {
    return { path: relative, ok: false, error: error.message };
  }
}));
check('v2.browser.evidence', browserEvidence.every(item => item.ok), { files: browserEvidence });

const failures = checks.filter(item => !item.ok);
const result = {
  schemaVersion: 'kindergrimm-v2-m0-verification/0.1',
  family: {
    basePack: base.id,
    derivedPack: first.id,
    packFingerprint: first.fingerprint,
    sharedRenderer: first.visual.id,
    rendererFingerprint: first.visual.fingerprint
  },
  checks,
  summary: { passed: checks.length - failures.length, failed: failures.length },
  failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
