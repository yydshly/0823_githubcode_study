import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOSSLIGHT_CORE_PACK_ID,
  MOONHARBOR_INKCUT_PACK_ID,
  SUNPATCH_FELT_PACK_ID,
  getContentPack
} from '../runtime/content-packs.js';
import { deriveRecipe, fingerprint } from '../runtime/npc-core.js';
import { contentVisualRecord } from '../runtime/visual-pipeline.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = { seed: 260825, count: 50, species: 'all', media: 'all', color: 'auto' };
const feltPack = getContentPack(SUNPATCH_FELT_PACK_ID);

function routeItems(pack) {
  return Array.from({ length: 50 }, function (_, slot) {
    const recipe = deriveRecipe(input, slot, pack);
    const visual = contentVisualRecord(recipe, pack);
    return {
      slot: slot,
      recipe: recipe,
      fingerprint: fingerprint(recipe),
      visual: visual
    };
  });
}

const feltItems = routeItems(feltPack);
const fixture = {
  schemaVersion: 'kindergrimm-golden-recipes/0.1',
  id: 'sunpatch-felt-2d-golden',
  seed: input.seed,
  pack: feltPack,
  items: feltItems
};

const routeIds = [MOSSLIGHT_CORE_PACK_ID, MOONHARBOR_INKCUT_PACK_ID, SUNPATCH_FELT_PACK_ID];
const routes = {};
for (const id of routeIds) {
  const pack = getContentPack(id);
  const items = routeItems(pack);
  routes[id] = {
    packId: pack.id,
    packFingerprint: pack.fingerprint,
    rendererId: pack.visual.id,
    rendererFingerprint: pack.visual.fingerprint,
    features: pack.visual.features.length,
    coverageGroups: Object.keys(pack.visual.coverage || {}).length,
    relation: 'independent-structural-renderer',
    slots: items.map(function (item) {
      return {
        slot: item.slot,
        recipeFingerprint: item.fingerprint,
        visualFingerprint: item.visual.fingerprint,
        species: item.recipe.species,
        media: item.recipe.media,
        base: item.recipe.base
      };
    })
  };
}

const review = {
  schemaVersion: 'kindergrimm-v2-m2-three-style-review/0.1',
  slotCount: 50,
  seed: input.seed,
  routes: routes,
  comparisonDisclosure: 'Slots share one master input and index; each locked Content Pack derives a legal Recipe under its own media constraints.',
  conclusion: {
    mosslightCore: 'rounded fairy-tale silhouette with gouache grammar',
    moonharborInkcut: 'narrow angular silhouette with hard ink hatch grammar',
    sunpatchFelt: 'wide soft silhouette with layered felt, button and blanket-stitch grammar'
  }
};

await fs.mkdir(path.join(project, 'fixtures', 'golden'), { recursive: true });
await fs.writeFile(path.join(project, 'fixtures', 'golden', 'sunpatch-felt-2d-recipes.json'), JSON.stringify(fixture, null, 2) + '\n');
await fs.writeFile(path.join(project, 'analysis', 'v2-m2-three-style-review.json'), JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({
  pack: { id: feltPack.id, fingerprint: feltPack.fingerprint, rendererFingerprint: feltPack.visual.fingerprint },
  goldenRecipes: feltItems.length,
  uniqueRecipes: new Set(feltItems.map(function (item) { return item.fingerprint; })).size,
  uniqueVisuals: new Set(feltItems.map(function (item) { return item.visual.fingerprint; })).size,
  routes: routeIds
}, null, 2));
