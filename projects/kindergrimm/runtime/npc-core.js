import { newRecipe, ensureParams } from '../upstream/src/rig.js';
import { SPECIES_IDS } from '../upstream/src/species.js';
import { MEDIA_IDS } from '../upstream/src/media.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import {
  ORIGINAL_PACK_ID,
  PINNED_UPSTREAM_COMMIT,
  CONTENT_MEDIA_IDS,
  getContentPack,
  isOriginalContentPack,
  validateContentPack,
  resolvePackFields,
  recipeMatchesContentPack
} from './content-packs.js';
import { contentVisualRecord } from './visual-pipeline.js';
import {
  CONTRACT_SCHEMAS,
  CONTRACT_ERROR_CODES,
  contractIssue,
  formatContractIssue,
  validateBatchManifestContract
} from './contracts.js';

export const UPSTREAM_COMMIT = PINNED_UPSTREAM_COMMIT;
export const SCHEMA_VERSION = CONTRACT_SCHEMAS.batchManifest;
export const DEFAULT_INPUT = Object.freeze({
  seed: 240824,
  count: 8,
  color: 'auto',
  species: 'all',
  media: 'all'
});

export const PROVENANCE = Object.freeze({
  source: 'albertobeiz/kindergrimm',
  upstreamCommit: UPSTREAM_COMMIT,
  license: 'Unlicense / public domain dedication',
  representation: 'procedural 2D Canvas parts composed as CanvasTexture planes',
  runtime: 'browser-local JavaScript + Canvas 2D + Three.js/WebGL',
  runtimeLlmCalls: 0,
  cloudApiCalls: 0
});

const validOr = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export function normalizeInput(input = {}) {
  return {
    seed: Math.max(0, Math.min(999999999, Number(input.seed) || DEFAULT_INPUT.seed)),
    count: [8, 12, 24].includes(Number(input.count)) ? Number(input.count) : DEFAULT_INPUT.count,
    color: validOr(input.color, ['auto', 'plain', 'color'], DEFAULT_INPUT.color),
    species: validOr(input.species, [...SPECIES_IDS, 'all'], DEFAULT_INPUT.species),
    media: validOr(input.media, [...MEDIA_IDS, 'all'], DEFAULT_INPUT.media)
  };
}

export function deriveRecipe(rawInput, index, rawPack = ORIGINAL_PACK_ID) {
  const input = normalizeInput(rawInput);
  const pack = getContentPack(rawPack);
  const seed = hashStr(`${input.seed}:npc:${index}`) % 1000000000;
  const recipe = newRecipe(seed);
  const packFields = resolvePackFields(input, index, pack);
  recipe.species = packFields?.species ?? (input.species === 'all'
    ? makeRng(hashStr(`${input.seed}:species:${index}`)).pick(SPECIES_IDS)
    : input.species);
  recipe.media = packFields?.media ?? (input.media === 'all'
    ? makeRng(hashStr(`${input.seed}:media:${index}`)).pick(MEDIA_IDS)
    : input.media);
  recipe.color = packFields?.color ?? input.color;
  recipe.base = pack.visual?.kind === 'procedural-2d-core'
    ? makeRng(hashStr(`${input.seed}:content-pack:${pack.id}:base:${index}`)).pick(pack.provenance.supportedBases)
    : null;
  ensureParams(recipe);
  return recipe;
}

export function fingerprint(recipe) {
  return hashStr(JSON.stringify(recipe)).toString(16).padStart(8, '0');
}

export function buildRecipes(rawInput, rawPack = ORIGINAL_PACK_ID) {
  const input = normalizeInput(rawInput);
  const pack = getContentPack(rawPack);
  return Array.from({ length: input.count }, (_, index) => {
    const recipe = deriveRecipe(input, index, pack);
    const item = { index, recipe, fingerprint: fingerprint(recipe), preview: null };
    const visual = contentVisualRecord(recipe, pack);
    if (visual) item.visual = visual;
    return item;
  });
}

export function assetManifest(item) {
  const asset = {
    id: `npc-${item.fingerprint}`,
    fingerprint: item.fingerprint,
    batchIndex: item.index,
    representation: 'procedural-2d-canvas-texture',
    recipe: item.recipe
  };
  if (item.visual) asset.visual = item.visual;
  return asset;
}

export function sheetLayout(count, tileSize = 256) {
  const columns = Math.min(4, Math.max(1, count));
  const rows = Math.ceil(count / columns);
  return {
    tileSize,
    columns,
    rows,
    width: columns * tileSize,
    height: rows * tileSize,
    background: 'transparent',
    order: 'row-major'
  };
}

export function batchManifest(items, rawInput, sheet = sheetLayout(items.length), rawPack = ORIGINAL_PACK_ID) {
  const input = normalizeInput(rawInput);
  const pack = getContentPack(rawPack);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generator: {
      name: 'kindergrimm',
      ...PROVENANCE
    },
    batch: {
      id: isOriginalContentPack(pack) ? `batch-${input.seed}` : `batch-${input.seed}-${pack.id}`,
      input,
      count: items.length,
      unique: new Set(items.map(item => item.fingerprint)).size,
      deterministicOrder: true
    },
    spritesheet: sheet,
    assets: items.map(assetManifest)
  };
  if (!isOriginalContentPack(pack)) manifest.contentPack = pack;
  return manifest;
}

export function verifyBatch(items, input, rawPack = ORIGINAL_PACK_ID) {
  const rebuilt = buildRecipes(input, rawPack);
  return rebuilt.length === items.length && rebuilt.every((item, index) =>
    item.fingerprint === items[index].fingerprint
    && (item.visual?.fingerprint ?? null) === (items[index].visual?.fingerprint ?? null));
}

export function validateBatchManifest(manifest, { minAssets = 1, maxAssets = 24 } = {}) {
  const contract = validateBatchManifestContract(manifest, {
    minAssets,
    maxAssets,
    expectedUpstreamCommit: UPSTREAM_COMMIT,
    contentPackOptions: {
      expectedUpstreamCommit: UPSTREAM_COMMIT,
      speciesIds: SPECIES_IDS,
      mediaIds: CONTENT_MEDIA_IDS
    },
    recipeOptions: {
      speciesIds: SPECIES_IDS,
      mediaIds: CONTENT_MEDIA_IDS,
      colorIds: ['auto', 'plain', 'color']
    }
  });
  const issues = [...contract.issues];
  const warnings = contract.warnings.map(formatContractIssue);
  const issueKeys = new Set(issues.map(issue => issue.code + ':' + issue.path + ':' + issue.message));
  const add = (code, path, message) => {
    const key = code + ':' + path + ':' + message;
    if (!issueKeys.has(key)) {
      issues.push(contractIssue(code, path, message));
      issueKeys.add(key);
    }
  };

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      ok: false,
      issues,
      errors: issues.map(formatContractIssue),
      warnings,
      items: [],
      input: null,
      pack: getContentPack()
    };
  }

  let pack = getContentPack();
  let packValid = true;
  if (manifest.contentPack) {
    const packResult = validateContentPack(manifest.contentPack);
    if (!packResult.ok) {
      packValid = false;
      for (const issue of packResult.issues || []) add(issue.code, issue.path, issue.message);
    } else {
      pack = packResult.pack;
    }
  }

  if (manifest.generator?.representation !== PROVENANCE.representation) warnings.push('generator.representation: differs from the pinned runtime description');

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const items = [];
  assets.forEach((asset, index) => {
    if (!asset || typeof asset !== 'object' || !asset.recipe || typeof asset.recipe !== 'object') return;
    if (asset.representation !== 'procedural-2d-canvas-texture') warnings.push('assets[' + index + '].representation: unexpected value');
    if (packValid && !recipeMatchesContentPack(asset.recipe, pack)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'assets[' + index + '].recipe', 'violates contentPack constraints');
    const expectedVisual = packValid ? contentVisualRecord(asset.recipe, pack) : null;
    if (expectedVisual) {
      if (!asset.visual) add(CONTRACT_ERROR_CODES.required, 'assets[' + index + '].visual', 'required by contentPack renderer');
      else if (JSON.stringify(asset.visual) !== JSON.stringify(expectedVisual)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'assets[' + index + '].visual', 'does not match recipe + renderer');
    } else if (asset.visual && packValid) {
      add(CONTRACT_ERROR_CODES.constraintMismatch, 'assets[' + index + '].visual', 'renderer is not declared by contentPack');
    }
    const item = {
      index: Number.isInteger(asset.batchIndex) ? asset.batchIndex : index,
      recipe: asset.recipe,
      fingerprint: fingerprint(asset.recipe),
      preview: null
    };
    if (expectedVisual) item.visual = expectedVisual;
    items.push(item);
  });

  const input = manifest.batch?.input && typeof manifest.batch.input === 'object'
    ? normalizeInput(manifest.batch.input)
    : null;
  if (!input) add(CONTRACT_ERROR_CODES.required, 'batch.input', 'missing generation input');

  if (input && assets.length && packValid && issues.length === 0) {
    const expected = buildRecipes({ ...input, count: assets.length }, pack);
    assets.forEach((asset, index) => {
      if (asset.fingerprint !== expected[index].fingerprint) add(CONTRACT_ERROR_CODES.constraintMismatch, 'assets[' + index + ']', 'does not match contentPack + batch.input');
      if ((asset.visual?.fingerprint ?? null) !== (expected[index].visual?.fingerprint ?? null)) add(CONTRACT_ERROR_CODES.constraintMismatch, 'assets[' + index + '].visual', 'does not match contentPack + batch.input');
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    errors: issues.map(formatContractIssue),
    warnings,
    items,
    input,
    pack
  };
}
export function assertBatchManifest(manifest, options) {
  const result = validateBatchManifest(manifest, options);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result;
}

export function scenarioIdentity(item, rawPack = ORIGINAL_PACK_ID) {
  const rng = makeRng(hashStr(`scenario:${item.fingerprint}`));
  const pack = getContentPack(rawPack);
  const names = pack.identity.names;
  const roles = pack.identity.roles;
  return {
    name: `${rng.pick(names)}-${String(item.index + 1).padStart(2, '0')}`,
    role: roles[item.index % roles.length],
    signal: rng.pick(['steady', 'curious', 'wary', 'restless'])
  };
}
