import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OUTPUT_PROFILE_SCHEMA,
  OUTPUT_RECORD_SCHEMA,
  listOutputProfiles,
  outputProfileRecord,
  validateOutputProfileRecord
} from '../runtime/output-profiles.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const review = JSON.parse(await fs.readFile(path.join(project, 'analysis/v2-m2-output-profile-browser-review.json'), 'utf8'));
const checks = [];
const check = (id, ok, evidence) => checks.push({ id, ok: Boolean(ok), ...evidence });

const profiles = listOutputProfiles();
const byId = new Map(profiles.map(profile => [profile.id, profile]));
check('v2m2.outputs.catalog', OUTPUT_PROFILE_SCHEMA === 'kindergrimm-output-profile/0.1'
  && profiles.length === 4
  && ['transparent-character', 'portrait-avatar', 'card-catalog', 'sprite-sheet'].every(id => byId.has(id)), {
  profiles: profiles.map(profile => profile.id)
});

check('v2m2.outputs.dimensions', byId.get('transparent-character').width === 1024
  && byId.get('portrait-avatar').width === 512
  && byId.get('card-catalog').width === 768
  && byId.get('card-catalog').height === 1024
  && byId.get('sprite-sheet').tileSize === 256, {
  dimensions: profiles.map(profile => ({
    id: profile.id,
    width: profile.width || null,
    height: profile.height || null,
    tileSize: profile.tileSize || null
  }))
});

const identity = {
  assetFingerprint: '8c67d2d8',
  visualFingerprint: 'ff18f7b3',
  packFingerprint: 'f51ce69c',
  rendererFingerprint: 'f1d70ebd'
};
const records = review.profiles.map(item => outputProfileRecord({
  profileId: item.id,
  width: item.width,
  height: item.height,
  assetFingerprint: item.id === 'sprite-sheet' ? null : identity.assetFingerprint,
  visualFingerprint: item.id === 'sprite-sheet' ? null : identity.visualFingerprint,
  packFingerprint: identity.packFingerprint,
  rendererFingerprint: identity.rendererFingerprint
}));

check('v2m2.outputs.records', records.every(record => record.schemaVersion === OUTPUT_RECORD_SCHEMA
  && validateOutputProfileRecord(record).ok
  && record.derivation.recipeChanged === false
  && record.derivation.runtimeLlmCalls === 0
  && record.derivation.cloudApiCalls === 0), {
  fingerprints: records.map(record => record.fingerprint)
});

check('v2m2.outputs.fingerprints', records.every((record, index) => record.fingerprint === review.profiles[index].outputFingerprint)
  && new Set(records.map(record => record.fingerprint)).size === records.length, {
  expected: review.profiles.map(item => item.outputFingerprint),
  actual: records.map(record => record.fingerprint)
});

const evidenceChecks = await Promise.all(review.profiles.map(async item => {
  const screenshot = path.join(project, item.screenshot);
  const stat = await fs.stat(screenshot);
  return item.ok && stat.size > 0;
}));
check('v2m2.outputs.browser-evidence', review.runtime.webgl === true
  && review.runtime.generated === review.runtime.unique
  && review.runtime.consoleErrors === 0
  && evidenceChecks.every(Boolean), {
  pack: review.runtime.packFingerprint,
  renderer: review.runtime.rendererFingerprint,
  screenshots: review.profiles.map(item => item.screenshot)
});

check('v2m2.outputs.alpha-and-layout', review.profiles.find(item => item.id === 'transparent-character').cornerAlpha === 0
  && review.profiles.find(item => item.id === 'portrait-avatar').cornerAlpha === 0
  && review.profiles.find(item => item.id === 'card-catalog').cornerAlpha === 255
  && review.profiles.find(item => item.id === 'sprite-sheet').cornerAlpha === 0
  && review.profiles.find(item => item.id === 'sprite-sheet').columns === 4
  && review.profiles.find(item => item.id === 'sprite-sheet').rows === 3, {
  profiles: review.profiles.map(item => ({
    id: item.id,
    cornerAlpha: item.cornerAlpha,
    width: item.width,
    height: item.height
  }))
});

const environmentEvidence = await Promise.all(review.environmentMatrix.map(async item => {
  const stat = await fs.stat(path.join(project, item.screenshot));
  return stat.size > 0;
}));
const mobile = review.environmentMatrix.find(item => item.id === 'mobile-390');
const reduced = review.environmentMatrix.find(item => item.id === 'reduced-motion');
const webglOff = review.environmentMatrix.find(item => item.id === 'webgl-off');
check('v2m2.outputs.environment-matrix', review.environmentMatrix.length === 3
  && review.environmentMatrix.every(item => item.ok)
  && environmentEvidence.every(Boolean)
  && mobile.viewportWidth === 390
  && mobile.scrollWidth === 390
  && reduced.matched === true
  && webglOff.webgl === false
  && webglOff.generated === webglOff.unique
  && webglOff.pngExportDisabled === true, {
  environments: review.environmentMatrix.map(item => item.id)
});

const studio = review.productionStudio;
const studioScreenshots = [
  studio.desktopScreenshot,
  studio.fullScreenshot,
  studio.mobileScreenshot,
  studio.webglOffScreenshot
];
const studioEvidence = await Promise.all(studioScreenshots.map(async screenshot => {
  const stat = await fs.stat(path.join(project, screenshot));
  return stat.size > 0;
}));
check('v2m2.outputs.production-studio', studio.ok
  && studio.routes === 5
  && studio.assetFingerprint === identity.assetFingerprint
  && studio.visualFingerprint === identity.visualFingerprint
  && studio.profiles['transparent-character'] === review.profiles.find(item => item.id === 'transparent-character').outputFingerprint
  && studio.profiles['portrait-avatar'] === review.profiles.find(item => item.id === 'portrait-avatar').outputFingerprint
  && studio.profiles['card-catalog'] === review.profiles.find(item => item.id === 'card-catalog').outputFingerprint
  && studio.mobileViewport === 390
  && studio.mobileScrollWidth === 390
  && studio.webglOffRecordsAvailable === true
  && studio.webglOffImagesRendered === false
  && studio.consoleErrors === 0
  && studioEvidence.every(Boolean), {
  asset: studio.assetFingerprint,
  visual: studio.visualFingerprint,
  profiles: studio.profiles
});

const portability = review.portability;
check('v2m2.outputs.portability', portability.ok
  && portability.selectedManifestProfile === 'card-catalog'
  && portability.selectedManifestFingerprint === studio.profiles['card-catalog']
  && portability.bundleEntries.length === 4
  && ['manifest.json', 'spritesheet.png', 'output-profiles.json', 'content-pack.json'].every(name => portability.bundleEntries.includes(name))
  && portability.outputProfileRecords === 4
  && portability.outputProfilesBytes > 0
  && portability.allCrcValid === true
  && portability.runtimeLlmCalls === 0
  && portability.cloudApiCalls === 0, {
  entries: portability.bundleEntries,
  records: portability.outputProfileRecords,
  crc: portability.allCrcValid
});

for (const result of checks) {
  console.log((result.ok ? 'PASS' : 'FAIL') + ' ' + result.id);
}
const passed = checks.filter(result => result.ok).length;
console.log('V2-M2 OUTPUTS ' + passed + '/' + checks.length);
if (passed !== checks.length) process.exitCode = 1;
