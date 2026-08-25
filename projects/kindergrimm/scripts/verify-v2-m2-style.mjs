import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contractFingerprint,
  validateContentPackContract,
  validateRecipeContract,
  validateVisualRecordContract
} from '../runtime/contracts.js';
import {
  SUNPATCH_FELT_PACK_ID,
  getContentPack,
  validateContentPack
} from '../runtime/content-packs.js';
import {
  SUNPATCH_FELT_RENDERER_ID,
  SUNPATCH_FELT_MEDIA_ID,
  SUNPATCH_FELT_FEATURES,
  SUNPATCH_FELT_COVERAGE
} from '../runtime/sunpatch-felt.js';
import { listStyleRenderers, styleRendererCapability } from '../runtime/style-renderers.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(project, relative), 'utf8');
const json = async relative => JSON.parse(await read(relative));
const checks = [];
const check = (id, ok, evidence) => checks.push(Object.assign({}, evidence || {}, { id: id, ok: Boolean(ok) }));

const fixture = await json('fixtures/golden/sunpatch-felt-2d-recipes.json');
const review = await json('analysis/v2-m2-three-style-review.json');
const source = await read('runtime/sunpatch-felt.js');
const pack = getContentPack(SUNPATCH_FELT_PACK_ID);
const renderer = pack.visual;

const pureContract = validateContentPackContract(pack, {
  expectedUpstreamCommit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8',
  speciesIds: ['human', 'dog', 'cat', 'nightmare'],
  mediaIds: ['graphite', 'ink', 'watercolor', 'oil', 'chalk', 'marker', 'mosslight-gouache', 'moonharbor-inkcut', SUNPATCH_FELT_MEDIA_ID]
});
const domainContract = validateContentPack(pack);
check('v2m2.pack.contract', pureContract.ok && domainContract.ok, {
  pack: pack.fingerprint,
  renderer: renderer.fingerprint,
  issues: pureContract.issues.concat(domainContract.issues)
});

const styleIds = listStyleRenderers().map(function (item) { return item.id; });
const capability = styleRendererCapability(SUNPATCH_FELT_RENDERER_ID);
check('v2m2.style.registry', styleIds.length === 3
  && styleIds.includes('mosslight-core-2d')
  && styleIds.includes('moonharbor-inkcut-2d')
  && styleIds.includes(SUNPATCH_FELT_RENDERER_ID)
  && capability && capability.features.length === SUNPATCH_FELT_FEATURES.length, {
  renderers: styleIds,
  capability: capability
});

const imports = Array.from(source.matchAll(/^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm)).map(function (match) { return match[1]; });
const forbidden = imports.filter(function (value) { return /mosslight|inkcut|rig\.js|layout\.js|upstream\/src\/parts/.test(value); });
const foreignIds = Array.from(source.matchAll(/['"]((?:core|ink)-[a-z0-9-]+)['"]/g)).map(function (match) { return match[1]; });
check('v2m2.renderer.static-independence', forbidden.length === 0
  && foreignIds.length === 0
  && !source.includes('buildMosslightCoreCharacter')
  && !source.includes('buildMoonharborInkcutCharacter'), {
  imports: imports,
  forbidden: forbidden,
  foreignFeatureIds: foreignIds
});

check('v2m2.renderer.coverage', SUNPATCH_FELT_FEATURES.length >= 18
  && Object.keys(SUNPATCH_FELT_COVERAGE).length === 6
  && renderer.features.length === SUNPATCH_FELT_FEATURES.length, {
  features: renderer.features.length,
  groups: Object.keys(renderer.coverage).length
});

const itemFailures = [];
const recipeFingerprints = new Set();
const visualFingerprints = new Set();
const species = new Set();
for (const [index, item] of fixture.items.entries()) {
  const recipeResult = validateRecipeContract(item.recipe, {
    speciesIds: pack.constraints.species,
    mediaIds: pack.constraints.media,
    colorIds: ['color']
  });
  const visualResult = validateVisualRecordContract(item.visual, { recipe: item.recipe, renderer: renderer });
  const expectedRecipe = contractFingerprint(item.recipe);
  if (item.slot !== index || !recipeResult.ok || !visualResult.ok || item.fingerprint !== expectedRecipe || item.recipe.base !== 'biped') {
    itemFailures.push({ index: index, recipeIssues: recipeResult.issues, visualIssues: visualResult.issues });
  }
  recipeFingerprints.add(item.fingerprint);
  visualFingerprints.add(item.visual.fingerprint);
  species.add(item.recipe.species);
}
check('v2m2.golden.contracts', fixture.items.length === 50 && itemFailures.length === 0, {
  count: fixture.items.length,
  failures: itemFailures.slice(0, 3)
});
check('v2m2.golden.uniqueness', recipeFingerprints.size === 50 && visualFingerprints.size === 50 && species.size >= 3, {
  recipes: recipeFingerprints.size,
  visuals: visualFingerprints.size,
  species: Array.from(species).sort()
});

const routeIds = ['mosslight-core-2d', 'moonharbor-inkcut-2d', 'sunpatch-felt-2d'];
let routesOk = review.schemaVersion === 'kindergrimm-v2-m2-three-style-review/0.1' && review.slotCount === 50;
const routeSummary = {};
for (const id of routeIds) {
  const route = review.routes[id];
  const slots = route && route.slots || [];
  routesOk = routesOk && slots.length === 50
    && slots.every(function (row, index) { return row.slot === index; })
    && new Set(slots.map(function (row) { return row.recipeFingerprint; })).size === 50
    && new Set(slots.map(function (row) { return row.visualFingerprint; })).size === 50;
  routeSummary[id] = {
    recipes: new Set(slots.map(function (row) { return row.recipeFingerprint; })).size,
    visuals: new Set(slots.map(function (row) { return row.visualFingerprint; })).size,
    renderer: route && route.rendererId,
    features: route && route.features
  };
}
check('v2m2.review.three-style', routesOk
  && review.routes['sunpatch-felt-2d'].rendererId === SUNPATCH_FELT_RENDERER_ID, {
  routes: routeSummary
});

const tampered = structuredClone(fixture.items[0].visual);
tampered.variant.buttonType = 'tampered';
const tamper = validateVisualRecordContract(tampered, { recipe: fixture.items[0].recipe, renderer: renderer });
check('v2m2.visual.tamper', !tamper.ok && tamper.errors.some(function (error) { return error.includes('fingerprint'); }), {
  firstError: tamper.errors[0]
});

const integration = {
  packs: await read('runtime/content-packs.js'),
  pipeline: await read('runtime/visual-pipeline.js'),
  registry: await read('runtime/style-renderers.js'),
  factory: await read('npc-factory/factory.js'),
  scenarios: await read('npc-scenarios/scenarios.js'),
  traceability: await read('analysis/v2-m2-upstream-extension-traceability-matrix.md'),
  decision: await read('analysis/v2-m2-third-style-decision.md')
};
check('v2m2.integration', integration.packs.includes(SUNPATCH_FELT_PACK_ID)
  && integration.pipeline.includes('buildStyleCharacter')
  && integration.registry.includes('buildSunpatchFeltCharacter')
  && integration.factory.includes('listContentPacks')
  && integration.scenarios.includes('listContentPacks')
  && integration.traceability.includes('one drawing / multiple hosts')
  && integration.decision.includes('Sunpatch Felt 2D'), {
  surfaces: ['content-pack', 'style-registry', 'factory', 'runtime', 'research']
});

const sceneReview = await json('analysis/v2-m2-sunpatch-scene-browser-review.json');
const sceneEvidence = await Promise.all(sceneReview.modes.map(async function (mode) {
  const stat = await fs.stat(path.join(project, mode.screenshot));
  return stat.size > 0;
}));
check('v2m2.scene.browser-evidence', sceneReview.schemaVersion === 'kindergrimm-scene-browser-review/0.1'
  && sceneReview.packFingerprint === pack.fingerprint
  && sceneReview.rendererFingerprint === renderer.fingerprint
  && sceneReview.consoleErrors === 0
  && sceneReview.modes.length === 3
  && sceneReview.modes.every(function (mode) {
    return mode.ok
      && mode.actors === 8
      && mode.unique === 8
      && mode.partPlanes === 208
      && mode.authoredPartPlanes === 208
      && mode.upstreamVisiblePartPlanes === 0
      && mode.independentActors === 8;
  })
  && sceneEvidence.every(Boolean), {
  modes: sceneReview.modes.map(function (mode) { return mode.id; }),
  planesPerActor: sceneReview.modes[0].partPlanes / sceneReview.modes[0].actors
});

const failures = checks.filter(function (item) { return !item.ok; });
const result = {
  schemaVersion: 'kindergrimm-v2-m2-style-verification/0.1',
  identity: {
    pack: { id: pack.id, fingerprint: pack.fingerprint },
    renderer: { id: renderer.id, fingerprint: renderer.fingerprint },
    media: SUNPATCH_FELT_MEDIA_ID
  },
  checks: checks,
  summary: {
    passed: checks.length - failures.length,
    failed: failures.length,
    styleRenderers: styleIds.length,
    goldenRecipes: fixture.items.length,
    uniqueRecipes: recipeFingerprints.size,
    uniqueVisuals: visualFingerprints.size,
    features: renderer.features.length,
    coverageGroups: Object.keys(renderer.coverage).length
  },
  failures: failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
