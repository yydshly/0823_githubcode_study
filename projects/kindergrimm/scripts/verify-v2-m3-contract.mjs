import {
  ASSET_TYPE_RECIPE_SCHEMA,
  ASSET_VISUAL_RECORD_SCHEMA,
  ASSET_OUTPUT_PROFILES,
  PROP_ARCHETYPES,
  assetTypeCapability,
  buildAssetTypeRecipes,
  assetVisualRecord,
  assetOutputRecord,
  validateAssetTypeRecipe,
  validateAssetVisualRecord
} from '../runtime/asset-types.js';
import {
  listPropStyleGrammars,
  validatePropStyleGrammar
} from '../runtime/prop-style-grammars.js';
import {
  buildSceneComponentRecipes,
  validateSceneComponentRecipe
} from '../runtime/scene-components.js';

const checks = [];
const check = (id, ok, evidence = {}) => checks.push({ id, ok: Boolean(ok), ...evidence });
const recipes = buildAssetTypeRecipes(240824, 12);
const repeated = buildAssetTypeRecipes(240824, 12);
const styles = listPropStyleGrammars();
const scenes = buildSceneComponentRecipes(240824, 12);
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = JSON.parse(await fs.readFile(path.join(project, 'fixtures/golden/v2-m3-asset-types.json'), 'utf8'));

check('v2m3.asset-type.registry', assetTypeCapability().types.length === 3
  && assetTypeCapability().types[0].id === 'prop'
  && PROP_ARCHETYPES.length === 5
  && ASSET_OUTPUT_PROFILES.length === 4, {
  types: assetTypeCapability().types.map(type => type.id),
  archetypes: PROP_ARCHETYPES.map(item => item.id),
  outputs: ASSET_OUTPUT_PROFILES.map(item => item.id)
});

check('v2m3.prop.recipe-contract', recipes.length === 12
  && recipes.every(recipe => recipe.schemaVersion === ASSET_TYPE_RECIPE_SCHEMA && validateAssetTypeRecipe(recipe).ok), {
  count: recipes.length,
  unique: new Set(recipes.map(recipe => recipe.fingerprint)).size
});

check('v2m3.prop.deterministic', JSON.stringify(recipes) === JSON.stringify(repeated)
  && new Set(recipes.map(recipe => recipe.fingerprint)).size === recipes.length, {
  fingerprints: recipes.map(recipe => recipe.fingerprint)
});

check('v2m3.style.grammars', styles.length === 3
  && styles.every(style => validatePropStyleGrammar(style).ok)
  && new Set(styles.map(style => style.rendererId)).size === 3
  && new Set(styles.map(style => JSON.stringify(style.materialGrammar))).size === 3, {
  styles: styles.map(style => ({ id: style.id, fingerprint: style.fingerprint, rendererId: style.rendererId }))
});

const visuals = styles.flatMap(style => recipes.map(recipe => assetVisualRecord(recipe, style)));
check('v2m3.prop.visual-records', visuals.length === 36
  && visuals.every((visual, index) => {
    const style = styles[Math.floor(index / recipes.length)];
    const recipe = recipes[index % recipes.length];
    return visual.schemaVersion === ASSET_VISUAL_RECORD_SCHEMA && validateAssetVisualRecord(visual, recipe, style).ok;
  })
  && new Set(visuals.map(visual => visual.fingerprint)).size === visuals.length, {
  count: visuals.length,
  unique: new Set(visuals.map(visual => visual.fingerprint)).size
});

const outputs = ASSET_OUTPUT_PROFILES.map(profile => assetOutputRecord({
  profileId: profile.id,
  width: profile.width || 1024,
  height: profile.height || 768,
  recipeFingerprint: recipes[0].fingerprint,
  visualFingerprint: visuals[0].fingerprint,
  styleFingerprint: styles[0].fingerprint
}));
check('v2m3.prop.output-records', outputs.length === 4
  && new Set(outputs.map(output => output.fingerprint)).size === 4
  && outputs.every(output => output.derivation.runtimeLlmCalls === 0 && output.derivation.cloudApiCalls === 0), {
  outputs: outputs.map(output => ({ id: output.profile.id, fingerprint: output.fingerprint }))
});

const icons = recipes.map((recipe, index) => assetOutputRecord({
  profileId: 'inventory-icon',
  width: 256,
  height: 256,
  recipeFingerprint: recipe.fingerprint,
  visualFingerprint: visuals[index].fingerprint,
  styleFingerprint: styles[0].fingerprint
}));
check('v2m3.icon.derived-samples', icons.length === 12
  && new Set(icons.map(icon => icon.fingerprint)).size === 12, {
  count: icons.length,
  unique: new Set(icons.map(icon => icon.fingerprint)).size
});

const sceneVisuals = styles.flatMap(style => scenes.map(scene => assetVisualRecord(scene, style)));
check('v2m3.scene-component.samples', scenes.length === 12
  && scenes.every(scene => validateSceneComponentRecipe(scene).ok)
  && new Set(scenes.map(scene => scene.fingerprint)).size === 12
  && sceneVisuals.length === 36
  && new Set(sceneVisuals.map(visual => visual.fingerprint)).size === 36, {
  recipes: scenes.length,
  recipeUnique: new Set(scenes.map(scene => scene.fingerprint)).size,
  visuals: sceneVisuals.length,
  visualUnique: new Set(sceneVisuals.map(visual => visual.fingerprint)).size
});

check('v2m3.golden.fixture', fixture.schemaVersion === 'kindergrimm-v2-m3-asset-type-golden/0.1'
  && fixture.seed === 240824
  && fixture.styles.length === 3
  && fixture.styles.every((item, index) => item.id === styles[index].id && item.fingerprint === styles[index].fingerprint)
  && fixture.props.length === 12
  && fixture.scenes.length === 12
  && fixture.props.every((item, index) => item.recipe.fingerprint === recipes[index].fingerprint)
  && fixture.scenes.every((item, index) => item.recipe.fingerprint === scenes[index].fingerprint), {
  props: fixture.props.length,
  scenes: fixture.scenes.length,
  styles: fixture.styles
});

const tampered = structuredClone(recipes[0]);
tampered.variant.detail = 'tampered';
check('v2m3.prop.tamper', !validateAssetTypeRecipe(tampered).ok, {
  expectedFingerprint: recipes[0].fingerprint,
  actualFingerprint: tampered.fingerprint
});

const failures = checks.filter(item => !item.ok);
for (const result of checks) console.log((result.ok ? 'PASS' : 'FAIL') + ' ' + result.id);
console.log('V2-M3 CONTRACT ' + (checks.length - failures.length) + '/' + checks.length);
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
