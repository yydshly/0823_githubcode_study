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
  MOONHARBOR_INKCUT_PACK_ID,
  getContentPack,
  validateContentPack
} from '../runtime/content-packs.js';
import {
  MOONHARBOR_INKCUT_RENDERER_ID,
  MOONHARBOR_INKCUT_MEDIA_ID,
  MOONHARBOR_INKCUT_FEATURES,
  MOONHARBOR_INKCUT_COVERAGE
} from '../runtime/moonharbor-inkcut.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(project, relative), 'utf8');
const json = async relative => JSON.parse(await read(relative));
const checks = [];
const check = (id, ok, evidence) => checks.push(Object.assign({}, evidence || {}, { id: id, ok: Boolean(ok) }));

const fixture = await json('fixtures/golden/moonharbor-inkcut-2d-recipes.json');
const review = await json('analysis/v2-m1-three-way-review.json');
const source = await read('runtime/moonharbor-inkcut.js');
const pack = getContentPack(MOONHARBOR_INKCUT_PACK_ID);
const renderer = pack.visual;

const pureContract = validateContentPackContract(pack, {
  expectedUpstreamCommit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8',
  speciesIds: ['human', 'dog', 'cat', 'nightmare'],
  mediaIds: ['graphite', 'ink', 'watercolor', 'oil', 'chalk', 'marker', 'mosslight-gouache', MOONHARBOR_INKCUT_MEDIA_ID]
});
const domainContract = validateContentPack(pack);
check('v2m1.pack.contract', pureContract.ok && domainContract.ok, {
  pack: pack.fingerprint,
  renderer: renderer.fingerprint,
  issues: pureContract.issues.concat(domainContract.issues)
});

check('v2m1.renderer.identity', renderer.id === MOONHARBOR_INKCUT_RENDERER_ID
  && renderer.kind === 'procedural-2d-core'
  && renderer.baseRenderer === 'none'
  && renderer.runtimeModule === 'runtime/moonharbor-inkcut.js', {
  id: renderer.id,
  kind: renderer.kind,
  baseRenderer: renderer.baseRenderer
});

const imports = Array.from(source.matchAll(/^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm)).map(function (match) { return match[1]; });
const forbidden = imports.filter(function (value) { return /mosslight|rig\.js|layout\.js|upstream\/src\/parts/.test(value); });
const mosslightIds = Array.from(source.matchAll(/['"](core-[a-z0-9-]+)['"]/g)).map(function (match) { return match[1]; });
check('v2m1.renderer.static-independence', forbidden.length === 0
  && mosslightIds.length === 0
  && !source.includes('buildMosslightCoreCharacter')
  && !source.includes('mosslightCoreVisualRecord'), {
  imports: imports,
  forbidden: forbidden,
  mosslightFeatureIds: mosslightIds
});

check('v2m1.renderer.coverage', MOONHARBOR_INKCUT_FEATURES.length >= 18
  && Object.keys(MOONHARBOR_INKCUT_COVERAGE).length === 6
  && renderer.features.length === MOONHARBOR_INKCUT_FEATURES.length, {
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
check('v2m1.golden.contracts', fixture.items.length === 50 && itemFailures.length === 0, {
  count: fixture.items.length,
  failures: itemFailures.slice(0, 3)
});
check('v2m1.golden.uniqueness', recipeFingerprints.size === 50 && visualFingerprints.size === 50 && species.size >= 3, {
  recipes: recipeFingerprints.size,
  visuals: visualFingerprints.size,
  species: Array.from(species).sort()
});

const routeIds = ['mosslight-core-2d', 'moonharbor-core-2d', 'moonharbor-inkcut-2d'];
let routesOk = review.schemaVersion === 'kindergrimm-v2-m1-three-way-review/0.1' && review.slotCount === 50;
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
check('v2m1.review.three-way', routesOk
  && review.routes['moonharbor-core-2d'].rendererId === 'mosslight-core-2d'
  && review.routes['moonharbor-inkcut-2d'].rendererId === MOONHARBOR_INKCUT_RENDERER_ID, {
  routes: routeSummary
});

const tampered = structuredClone(fixture.items[0].visual);
tampered.variant.coatHem = 'tampered';
const tamper = validateVisualRecordContract(tampered, { recipe: fixture.items[0].recipe, renderer: renderer });
check('v2m1.visual.tamper', !tamper.ok && tamper.errors.some(function (error) { return error.includes('fingerprint'); }), {
  firstError: tamper.errors[0]
});

const integration = {
  packs: await read('runtime/content-packs.js'),
  pipeline: await read('runtime/visual-pipeline.js'),
  styleRegistry: await read('runtime/style-renderers.js'),
  studio: await read('production-studio/studio.js'),
  studioHtml: await read('production-studio/index.html'),
  program: await read('PROGRAM-V2.md')
};
check('v2m1.integration', integration.packs.includes(MOONHARBOR_INKCUT_PACK_ID)
  && integration.pipeline.includes('buildStyleCharacter')
  && integration.styleRegistry.includes('buildMoonharborInkcutCharacter')
  && integration.studio.includes('inkcut')
  && integration.studioHtml.includes('preview-inkcut')
  && integration.program.includes('V2-M1 · Structural Style Backend')
  && integration.program.includes('| DONE |'), {
  surfaces: ['registry', 'visual-pipeline', 'production-studio', 'program']
});

const browserEvidencePaths = [
  'evidence/v2-m1-inkcut-factory-desktop.png',
  'evidence/v2-m1-inkcut-factory-mobile.png',
  'evidence/v2-m1-inkcut-factory-webgl-off.png',
  'evidence/v2-m1-inkcut-runtime-desktop.png',
  'evidence/v2-m1-production-studio-four-route.png'
];
const browserEvidence = await Promise.all(browserEvidencePaths.map(async function (relative) {
  try {
    const stat = await fs.stat(path.join(project, relative));
    return { path: relative, bytes: stat.size, ok: stat.isFile() && stat.size > 0 };
  } catch (error) {
    return { path: relative, ok: false, error: error.message };
  }
}));
check('v2m1.browser.evidence', browserEvidence.every(function (item) { return item.ok; }), {
  files: browserEvidence
});

const failures = checks.filter(function (item) { return !item.ok; });
const result = {
  schemaVersion: 'kindergrimm-v2-m1-verification/0.1',
  identity: {
    pack: { id: pack.id, fingerprint: pack.fingerprint },
    renderer: { id: renderer.id, fingerprint: renderer.fingerprint },
    media: MOONHARBOR_INKCUT_MEDIA_ID
  },
  checks: checks,
  summary: {
    passed: checks.length - failures.length,
    failed: failures.length,
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
