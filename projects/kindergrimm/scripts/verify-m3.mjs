import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  contractFingerprint,
  validateContentPackContract,
  validateRecipeContract,
  validateVisualRecordContract
} from '../runtime/contracts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(here, '..');
const readJson = async relative => JSON.parse(await readFile(path.join(project, relative), 'utf8'));

const fixture = await readJson('fixtures/golden/mosslight-core-2d-recipes.json');
const review = await readJson('analysis/m3-three-way-review.json');
const coreSource = await readFile(path.join(project, 'runtime/mosslight-core.js'), 'utf8');

const checks = [];
const failures = [];
const check = (id, ok, details = {}) => {
  const row = { id, ok: Boolean(ok), ...details };
  checks.push(row);
  if (!row.ok) failures.push(row);
};

const pack = fixture.pack;
const renderer = pack?.visual;
const packResult = validateContentPackContract(pack, {
  expectedUpstreamCommit: 'de339ad739d8cbd28ff2dd4a940af38c0ede86c8',
  speciesIds: ['human', 'dog', 'cat', 'nightmare'],
  mediaIds: ['graphite', 'ink', 'watercolor', 'oil', 'chalk', 'marker', 'mosslight-gouache']
});

check('m3.pack.contract', packResult.ok, { issues: packResult.issues });
check('m3.renderer.identity', renderer?.id === 'mosslight-core-2d' && renderer?.kind === 'procedural-2d-core' && renderer?.baseRenderer === 'none', {
  rendererId: renderer?.id,
  kind: renderer?.kind,
  baseRenderer: renderer?.baseRenderer
});
check('m3.renderer.coverage', renderer?.features?.length >= 16 && Object.keys(renderer?.coverage ?? {}).length === 6, {
  features: renderer?.features?.length ?? 0,
  groups: Object.keys(renderer?.coverage ?? {}).length
});

const imports = [...coreSource.matchAll(/^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm)].map(match => match[1]);
const forbiddenImports = imports.filter(value => /rig\.js|layout\.js|upstream\/src\/parts/.test(value));
check('m3.renderer.static-independence', forbiddenImports.length === 0 && !/\bbuildCharacter\b|\bbuildLayout\b/.test(coreSource), {
  imports,
  forbiddenImports
});

check('m3.golden.count', fixture.schemaVersion === 'kindergrimm-golden-recipes/0.1' && fixture.items?.length === 50, {
  schemaVersion: fixture.schemaVersion,
  count: fixture.items?.length ?? 0
});

const recipeFingerprints = new Set();
const visualFingerprints = new Set();
const species = new Set();
const bases = new Set();
const itemFailures = [];

for (const [index, item] of (fixture.items ?? []).entries()) {
  const recipeResult = validateRecipeContract(item.recipe, {
    speciesIds: pack.constraints.species,
    mediaIds: pack.constraints.media,
    colorIds: ['color']
  });
  const expectedRecipeFingerprint = contractFingerprint(item.recipe);
  const visualResult = validateVisualRecordContract(item.visual, { recipe: item.recipe, renderer });
  const ok = item.slot === index
    && recipeResult.ok
    && item.fingerprint === expectedRecipeFingerprint
    && visualResult.ok
    && item.recipe.color === pack.constraints.color;
  if (!ok) itemFailures.push({
    index,
    slot: item.slot,
    recipeIssues: recipeResult.issues,
    visualIssues: visualResult.issues,
    expectedRecipeFingerprint,
    actualRecipeFingerprint: item.fingerprint
  });
  recipeFingerprints.add(item.fingerprint);
  visualFingerprints.add(item.visual?.fingerprint);
  species.add(item.recipe?.species);
  bases.add(item.recipe?.base);
}

check('m3.golden.contracts', itemFailures.length === 0, { failures: itemFailures.slice(0, 3) });
check('m3.golden.uniqueness', recipeFingerprints.size === 50 && visualFingerprints.size === 50, {
  recipes: recipeFingerprints.size,
  visuals: visualFingerprints.size
});
const supportedBases = pack.provenance.supportedBases ?? [];
check('m3.golden.distribution', species.size >= 3
  && supportedBases.length >= 1
  && supportedBases.every(value => bases.has(value))
  && [...bases].every(value => supportedBases.includes(value)), {
  species: [...species].sort(),
  bases: [...bases].sort(),
  supportedBases
});

const routeIds = ['kindergrimm-original', 'mosslight-waystation', 'mosslight-core-2d'];
const routeSummary = {};
let routesOk = review.schemaVersion === 'kindergrimm-three-way-review/0.1' && review.slotCount === 50;
for (const id of routeIds) {
  const route = review.routes?.[id];
  const slots = route?.slots ?? [];
  const slotOrder = slots.every((row, index) => row.slot === index);
  const uniqueRecipes = new Set(slots.map(row => row.recipeFingerprint)).size;
  routesOk &&= slots.length === 50 && slotOrder && uniqueRecipes === 50;
  routeSummary[id] = {
    count: slots.length,
    uniqueRecipes,
    uniqueVisuals: new Set(slots.map(row => row.visualFingerprint).filter(Boolean)).size,
    rendererId: route?.rendererId,
    features: route?.features,
    coverageGroups: route?.coverageGroups
  };
}
check('m3.review.three-way', routesOk, { routes: routeSummary });

const result = {
  schemaVersion: 'kindergrimm-m3-verification/0.1',
  checks,
  summary: {
    passed: checks.length - failures.length,
    failed: failures.length,
    goldenRecipes: fixture.items?.length ?? 0,
    uniqueRecipeFingerprints: recipeFingerprints.size,
    uniqueVisualFingerprints: visualFingerprints.size,
    species: [...species].sort(),
    bases: [...bases].sort(),
    rendererFeatures: renderer?.features?.length ?? 0,
    coverageGroups: Object.keys(renderer?.coverage ?? {}).length
  },
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
