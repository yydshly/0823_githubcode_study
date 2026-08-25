import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOSSLIGHT_CORE_PACK_ID,
  MOONHARBOR_CORE_PACK_ID,
  MOONHARBOR_INKCUT_PACK_ID,
  getContentPack
} from '../runtime/content-packs.js';
import { deriveRecipe, fingerprint } from '../runtime/npc-core.js';
import { contentVisualRecord } from '../runtime/visual-pipeline.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = { seed: 260824, count: 50, species: 'all', media: 'all', color: 'auto' };
const inkcutPack = getContentPack(MOONHARBOR_INKCUT_PACK_ID);

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

const inkcutItems = routeItems(inkcutPack);
const fixture = {
  schemaVersion: 'kindergrimm-golden-recipes/0.1',
  id: 'moonharbor-inkcut-2d-golden',
  seed: input.seed,
  pack: inkcutPack,
  items: inkcutItems
};

const routeIds = [MOSSLIGHT_CORE_PACK_ID, MOONHARBOR_CORE_PACK_ID, MOONHARBOR_INKCUT_PACK_ID];
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
    relation: id === MOONHARBOR_CORE_PACK_ID ? 'palette-identity-variant' : 'independent-structural-renderer',
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
  schemaVersion: 'kindergrimm-v2-m1-three-way-review/0.1',
  slotCount: 50,
  seed: input.seed,
  routes: routes,
  conclusion: {
    mosslightCore: 'independent gouache structural renderer',
    moonharborFamily: 'palette and identity variant sharing Mosslight structure',
    moonharborInkcut: 'independent angular mask, narrow coat, ink hatch and signal prop renderer'
  }
};

await fs.mkdir(path.join(project, 'fixtures', 'golden'), { recursive: true });
await fs.writeFile(path.join(project, 'fixtures', 'golden', 'moonharbor-inkcut-2d-recipes.json'), JSON.stringify(fixture, null, 2) + '\n');
await fs.writeFile(path.join(project, 'analysis', 'v2-m1-three-way-review.json'), JSON.stringify(review, null, 2) + '\n');
console.log(JSON.stringify({
  pack: { id: inkcutPack.id, fingerprint: inkcutPack.fingerprint, rendererFingerprint: inkcutPack.visual.fingerprint },
  goldenRecipes: inkcutItems.length,
  uniqueRecipes: new Set(inkcutItems.map(function (item) { return item.fingerprint; })).size,
  uniqueVisuals: new Set(inkcutItems.map(function (item) { return item.visual.fingerprint; })).size,
  routes: routeIds
}, null, 2));
