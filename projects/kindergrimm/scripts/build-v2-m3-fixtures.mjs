import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assetOutputRecord,
  assetVisualRecord,
  buildAssetTypeRecipes
} from '../runtime/asset-types.js';
import { listPropStyleGrammars } from '../runtime/prop-style-grammars.js';
import { buildSceneComponentRecipes } from '../runtime/scene-components.js';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seed = 240824;
const recipes = buildAssetTypeRecipes(seed, 12);
const scenes = buildSceneComponentRecipes(seed, 12);
const styles = listPropStyleGrammars();

const fixture = {
  schemaVersion: 'kindergrimm-v2-m3-asset-type-golden/0.1',
  seed,
  styles: styles.map(style => ({ id: style.id, fingerprint: style.fingerprint })),
  props: recipes.map(recipe => ({
    slot: recipe.slot,
    archetype: recipe.archetype,
    recipe,
    visuals: Object.fromEntries(styles.map(style => {
      const visual = assetVisualRecord(recipe, style);
      const icon = assetOutputRecord({
        profileId: 'inventory-icon',
        width: 256,
        height: 256,
        recipeFingerprint: recipe.fingerprint,
        visualFingerprint: visual.fingerprint,
        styleFingerprint: style.fingerprint
      });
      return [style.id, { visualFingerprint: visual.fingerprint, iconFingerprint: icon.fingerprint }];
    }))
  })),
  scenes: scenes.map(scene => ({
    slot: scene.slot,
    archetype: scene.archetype,
    recipe: scene,
    visuals: Object.fromEntries(styles.map(style => {
      const visual = assetVisualRecord(scene, style);
      return [style.id, visual.fingerprint];
    }))
  }))
};

const target = path.join(project, 'fixtures/golden/v2-m3-asset-types.json');
await fs.writeFile(target, JSON.stringify(fixture, null, 2) + '\n');
console.log(target);
