import { makeRng, hashStr } from '../upstream/src/rng.js';
import { contractFingerprint } from './contracts.js';

export const ASSET_TYPE_RECIPE_SCHEMA = 'kindergrimm-asset-type-recipe/0.1';
export const ASSET_VISUAL_RECORD_SCHEMA = 'kindergrimm-asset-visual-record/0.1';
export const ASSET_TYPE_REGISTRY_SCHEMA = 'kindergrimm-asset-type-registry/0.1';
export const ASSET_BUNDLE_SCHEMA = 'kindergrimm-asset-type-bundle/0.1';

export const PROP_ARCHETYPES = Object.freeze([
  Object.freeze({ id: 'lantern', label: 'Way Lantern', anchor: 'ground-center', parts: ['body', 'frame', 'handle', 'light', 'emblem'] }),
  Object.freeze({ id: 'satchel', label: 'Courier Satchel', anchor: 'ground-center', parts: ['body', 'flap', 'strap', 'buckle', 'emblem'] }),
  Object.freeze({ id: 'scroll', label: 'Story Scroll', anchor: 'center', parts: ['paper', 'rollers', 'ribbon', 'mark', 'seal'] }),
  Object.freeze({ id: 'waymark', label: 'Trail Waymark', anchor: 'ground-center', parts: ['post', 'board', 'arrow', 'mark', 'ground'] }),
  Object.freeze({ id: 'charm', label: 'Pocket Charm', anchor: 'center', parts: ['token', 'rim', 'cord', 'mark', 'tassel'] })
]);

export const ASSET_OUTPUT_PROFILES = Object.freeze([
  Object.freeze({ id: 'transparent-prop', label: 'Transparent Prop', role: 'runtime-and-compositing', width: 512, height: 512, background: 'transparent', batch: false }),
  Object.freeze({ id: 'inventory-icon', label: 'Inventory Icon', role: 'ui-icon', width: 256, height: 256, background: 'style-panel', batch: false }),
  Object.freeze({ id: 'catalog-card', label: 'Catalog Card', role: 'review-and-card', width: 512, height: 640, background: 'style-paper', batch: false }),
  Object.freeze({ id: 'prop-sheet', label: 'Prop Sheet', role: 'row-major-batch-atlas', tileSize: 256, background: 'transparent', batch: true })
]);

const ARCHETYPE_BY_ID = new Map(PROP_ARCHETYPES.map(item => [item.id, item]));
const OUTPUT_BY_ID = new Map(ASSET_OUTPUT_PROFILES.map(item => [item.id, item]));

export const ASSET_TYPE_REGISTRY = Object.freeze({
  schemaVersion: ASSET_TYPE_REGISTRY_SCHEMA,
  types: Object.freeze([
    Object.freeze({
      id: 'prop',
      label: 'Prop / Item',
      status: 'implemented',
      recipeSchema: ASSET_TYPE_RECIPE_SCHEMA,
      archetypes: Object.freeze(PROP_ARCHETYPES.map(item => item.id)),
      outputs: Object.freeze(ASSET_OUTPUT_PROFILES.map(item => item.id))
    }),
    Object.freeze({ id: 'icon', label: 'Icon / Emblem', status: 'implemented-derived-output', sourceType: 'prop', output: 'inventory-icon' }),
    Object.freeze({ id: 'scene-component', label: 'Scene Component', status: 'implemented', sourceTypes: Object.freeze(['prop']), recipeSchema: 'kindergrimm-scene-component-recipe/0.1' })
  ])
});

function recipePayload(recipe) {
  return {
    schemaVersion: recipe.schemaVersion,
    seed: recipe.seed,
    slot: recipe.slot,
    assetType: recipe.assetType,
    archetype: recipe.archetype,
    variant: recipe.variant,
    anchor: recipe.anchor,
    bounds: recipe.bounds,
    parts: recipe.parts,
    provenance: recipe.provenance
  };
}

export function deriveAssetTypeRecipe(masterSeed, slot) {
  const seed = hashStr(String(masterSeed) + ':prop:' + String(slot));
  const rng = makeRng(seed);
  const archetype = PROP_ARCHETYPES[slot % PROP_ARCHETYPES.length];
  const payload = {
    schemaVersion: ASSET_TYPE_RECIPE_SCHEMA,
    seed,
    slot,
    assetType: 'prop',
    archetype: archetype.id,
    variant: {
      silhouette: rng.pick(['round', 'tall', 'wide']),
      detail: rng.pick(['leaf', 'sun', 'star', 'route']),
      wear: rng.pick(['clean', 'soft-worn', 'patched']),
      scale: Number(rng.r(.88, 1.12).toFixed(3)),
      accentIndex: rng.ri(0, 2)
    },
    anchor: {
      id: archetype.anchor,
      x: .5,
      y: archetype.anchor === 'ground-center' ? .88 : .5
    },
    bounds: {
      width: archetype.id === 'waymark' ? .74 : archetype.id === 'scroll' ? .78 : .64,
      height: archetype.id === 'waymark' ? .88 : archetype.id === 'charm' ? .62 : .72
    },
    parts: archetype.parts.slice(),
    provenance: {
      kind: 'local-authored-procedural-2d',
      upstreamMechanism: 'Kindergrimm seeded RNG + Canvas part grammar',
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
  return Object.freeze(Object.assign({}, payload, { fingerprint: contractFingerprint(payload) }));
}

export function buildAssetTypeRecipes(masterSeed, count = 12) {
  const safeCount = Math.max(1, Math.min(50, Math.floor(Number(count) || 12)));
  return Object.freeze(Array.from({ length: safeCount }, function (_, slot) {
    return deriveAssetTypeRecipe(masterSeed, slot);
  }));
}

export function validateAssetTypeRecipe(recipe) {
  const errors = [];
  if (!recipe || recipe.schemaVersion !== ASSET_TYPE_RECIPE_SCHEMA) errors.push('schemaVersion: expected ' + ASSET_TYPE_RECIPE_SCHEMA);
  if (!recipe || recipe.assetType !== 'prop') errors.push('assetType: expected prop');
  if (!recipe || !ARCHETYPE_BY_ID.has(recipe.archetype)) errors.push('archetype: unsupported prop archetype');
  if (!recipe || !Number.isInteger(recipe.seed) || recipe.seed < 0) errors.push('seed: expected non-negative integer');
  if (!recipe || !Number.isInteger(recipe.slot) || recipe.slot < 0) errors.push('slot: expected non-negative integer');
  const archetype = ARCHETYPE_BY_ID.get(recipe && recipe.archetype);
  if (archetype && JSON.stringify(recipe.parts) !== JSON.stringify(archetype.parts)) errors.push('parts: expected named archetype parts');
  if (!recipe || !recipe.anchor || !['ground-center', 'center'].includes(recipe.anchor.id)) errors.push('anchor.id: unsupported anchor');
  if (!recipe || !recipe.provenance || recipe.provenance.runtimeLlmCalls !== 0 || recipe.provenance.cloudApiCalls !== 0) errors.push('provenance: expected local deterministic generation');
  if (recipe) {
    const expected = contractFingerprint(recipePayload(recipe));
    if (recipe.fingerprint !== expected) errors.push('fingerprint: expected ' + expected);
  }
  return { ok: errors.length === 0, errors, recipe: errors.length ? null : recipe };
}

export function assetVisualRecord(recipe, style) {
  const payload = {
    schemaVersion: ASSET_VISUAL_RECORD_SCHEMA,
    recipeFingerprint: recipe.fingerprint,
    assetType: recipe.assetType,
    archetype: recipe.archetype,
    styleId: style.id,
    styleFingerprint: style.fingerprint,
    representation: 'local-authored-procedural-canvas-2d',
    namedParts: recipe.parts.slice(),
    provenance: {
      source: style.provenance.source,
      upstreamMechanism: 'Kindergrimm Canvas part grammar',
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
  return Object.freeze(Object.assign({}, payload, { fingerprint: contractFingerprint(payload) }));
}

export function validateAssetVisualRecord(record, recipe, style) {
  const errors = [];
  if (!record || record.schemaVersion !== ASSET_VISUAL_RECORD_SCHEMA) errors.push('schemaVersion: expected ' + ASSET_VISUAL_RECORD_SCHEMA);
  if (!record || record.recipeFingerprint !== recipe.fingerprint) errors.push('recipeFingerprint: mismatch');
  if (!record || record.styleId !== style.id || record.styleFingerprint !== style.fingerprint) errors.push('style: mismatch');
  if (!record || JSON.stringify(record.namedParts) !== JSON.stringify(recipe.parts)) errors.push('namedParts: mismatch');
  if (record) {
    const payload = {
      schemaVersion: record.schemaVersion,
      recipeFingerprint: record.recipeFingerprint,
      assetType: record.assetType,
      archetype: record.archetype,
      styleId: record.styleId,
      styleFingerprint: record.styleFingerprint,
      representation: record.representation,
      namedParts: record.namedParts,
      provenance: record.provenance
    };
    const expected = contractFingerprint(payload);
    if (record.fingerprint !== expected) errors.push('fingerprint: expected ' + expected);
  }
  return { ok: errors.length === 0, errors, record: errors.length ? null : record };
}

export function getAssetOutputProfile(value) {
  const id = typeof value === 'string' ? value : value && value.id;
  return OUTPUT_BY_ID.get(id) || OUTPUT_BY_ID.get('transparent-prop');
}

export function assetOutputRecord(input) {
  const profile = getAssetOutputProfile(input.profileId);
  const payload = {
    schemaVersion: 'kindergrimm-asset-output-record/0.1',
    profile: {
      id: profile.id,
      role: profile.role,
      width: input.width || profile.width || null,
      height: input.height || profile.height || null,
      tileSize: profile.tileSize || null,
      background: profile.background,
      batch: profile.batch
    },
    identity: {
      recipeFingerprint: input.recipeFingerprint || null,
      visualFingerprint: input.visualFingerprint || null,
      styleFingerprint: input.styleFingerprint
    },
    derivation: {
      source: 'deterministic-asset-type-render',
      recipeChanged: false,
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
  return Object.freeze(Object.assign({}, payload, { fingerprint: contractFingerprint(payload) }));
}

export function assetTypeCapability() {
  return ASSET_TYPE_REGISTRY;
}
