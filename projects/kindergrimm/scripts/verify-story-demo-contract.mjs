import assert from 'node:assert/strict';
import {
  STORY_CAST,
  STORY_CHAPTERS,
  STORY_ENDINGS,
  createStoryState,
  availableStoryActions,
  storyCommand,
  validateStoryState
} from '../runtime/story-reply-before-storm.js';
import { buildAssetTypeRecipes, validateAssetTypeRecipe } from '../runtime/asset-types.js';
import { listPropStyleGrammars, validatePropStyleGrammar } from '../runtime/prop-style-grammars.js';

const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (error) { results.push({ name, ok: false, error: error.message }); }
}
function play(commands) {
  return commands.reduce((state, command) => storyCommand(state, command), createStoryState());
}

check('story-content-is-comprehensive', () => {
  assert.equal(STORY_CHAPTERS.length, 3);
  assert.equal(STORY_CAST.length, 4);
  assert.equal(Object.keys(STORY_ENDINGS).length, 2);
});

check('community-ending-completes-full-loop', () => {
  const state = play(['accept_letter','light_lantern','repair_waymark','guide_family','continue_gate','unseal_route','signal_public']);
  assert.equal(state.ending, 'community');
  assert.equal(state.trust, 5);
  assert.equal(state.storm, 2);
  assert.equal(state.inventory.length, 5);
  assert.ok(validateStoryState(state).ok);
});

check('council-ending-completes-fast-loop', () => {
  const state = play(['accept_letter','light_lantern','repair_waymark','continue_gate','unseal_route','deliver_council']);
  assert.equal(state.ending, 'council');
  assert.equal(state.trust, 1);
  assert.equal(state.storm, 1);
  assert.ok(validateStoryState(state).ok);
});

check('invalid-command-is-rejected', () => {
  assert.throws(() => storyCommand(createStoryState(), 'signal_public'));
});

check('restart-restores-deterministic-state', () => {
  const ended = play(['accept_letter','light_lantern','repair_waymark','continue_gate','unseal_route','deliver_council']);
  assert.deepEqual(storyCommand(ended, 'restart'), createStoryState());
});

check('five-prop-archetypes-are-real-and-valid', () => {
  const recipes = buildAssetTypeRecipes(240824, 15);
  const archetypes = new Set(recipes.map(recipe => recipe.archetype));
  assert.deepEqual([...archetypes].sort(), ['charm','lantern','satchel','scroll','waymark']);
  assert.ok(recipes.every(recipe => validateAssetTypeRecipe(recipe).ok));
});

check('three-style-grammars-are-valid', () => {
  const styles = listPropStyleGrammars();
  assert.equal(styles.length, 3);
  assert.ok(styles.every(style => validatePropStyleGrammar(style).ok));
});

check('action-availability-is-state-driven', () => {
  let state = createStoryState();
  assert.deepEqual(availableStoryActions(state).map(action => action.id), ['accept_letter']);
  state = play(['accept_letter','light_lantern','repair_waymark']);
  assert.deepEqual(availableStoryActions(state).map(action => action.id), ['guide_family','continue_gate']);
});

for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ': ' + result.error : ''}`);
const passed = results.filter(result => result.ok).length;
console.log(`Results: ${passed}/${results.length}`);
if (passed !== results.length) process.exitCode = 1;
