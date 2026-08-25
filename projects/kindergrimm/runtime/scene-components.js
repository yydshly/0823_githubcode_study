import { makeRng, hashStr } from '../upstream/src/rng.js';
import { contractFingerprint } from './contracts.js';
import { assetVisualRecord } from './asset-types.js';
import { getPropStyleGrammar } from './prop-style-grammars.js';
import { renderPropAsset } from './prop-renderer.js';

export const SCENE_COMPONENT_RECIPE_SCHEMA = 'kindergrimm-scene-component-recipe/0.1';
export const SCENE_COMPONENT_ARCHETYPES = Object.freeze([
  Object.freeze({ id: 'waystation-display', label: 'Waystation Display' }),
  Object.freeze({ id: 'trail-shrine', label: 'Trail Shrine' }),
  Object.freeze({ id: 'courier-post', label: 'Courier Post' })
]);

const SCENE_PARTS = Object.freeze(['backdrop', 'ground', 'structure', 'sign', 'prop-cluster']);

function payload(recipe) {
  return {
    schemaVersion: recipe.schemaVersion,
    seed: recipe.seed,
    slot: recipe.slot,
    assetType: recipe.assetType,
    archetype: recipe.archetype,
    variant: recipe.variant,
    propSlots: recipe.propSlots,
    parts: recipe.parts,
    bounds: recipe.bounds,
    anchor: recipe.anchor,
    provenance: recipe.provenance
  };
}

export function deriveSceneComponentRecipe(masterSeed, slot) {
  const seed = hashStr(String(masterSeed) + ':scene-component:' + String(slot));
  const rng = makeRng(seed);
  const archetype = SCENE_COMPONENT_ARCHETYPES[slot % SCENE_COMPONENT_ARCHETYPES.length];
  const data = {
    schemaVersion: SCENE_COMPONENT_RECIPE_SCHEMA,
    seed,
    slot,
    assetType: 'scene-component',
    archetype: archetype.id,
    variant: {
      canopy: rng.pick(['scallop', 'banner', 'leaf']),
      time: rng.pick(['dawn', 'day', 'dusk']),
      accentIndex: rng.ri(0, 2)
    },
    propSlots: [slot % 12, (slot + 3) % 12, (slot + 7) % 12],
    parts: SCENE_PARTS.slice(),
    bounds: { width: 1, height: .5 },
    anchor: { id: 'ground-center', x: .5, y: .92 },
    provenance: {
      kind: 'local-authored-procedural-2d-scene-component',
      upstreamMechanism: 'Kindergrimm seeded RNG + Canvas part composition',
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
  return Object.freeze(Object.assign({}, data, { fingerprint: contractFingerprint(data) }));
}

export function buildSceneComponentRecipes(masterSeed, count = 12) {
  return Object.freeze(Array.from({ length: Math.max(1, Math.min(24, count)) }, function (_, slot) {
    return deriveSceneComponentRecipe(masterSeed, slot);
  }));
}

export function validateSceneComponentRecipe(recipe) {
  const errors = [];
  if (!recipe || recipe.schemaVersion !== SCENE_COMPONENT_RECIPE_SCHEMA) errors.push('schemaVersion: expected ' + SCENE_COMPONENT_RECIPE_SCHEMA);
  if (!recipe || recipe.assetType !== 'scene-component') errors.push('assetType: expected scene-component');
  if (!recipe || !SCENE_COMPONENT_ARCHETYPES.some(item => item.id === recipe.archetype)) errors.push('archetype: unsupported scene component');
  if (!recipe || JSON.stringify(recipe.parts) !== JSON.stringify(SCENE_PARTS)) errors.push('parts: expected five named scene parts');
  if (!recipe || !Array.isArray(recipe.propSlots) || recipe.propSlots.length !== 3) errors.push('propSlots: expected three prop slots');
  if (!recipe || !recipe.provenance || recipe.provenance.runtimeLlmCalls !== 0 || recipe.provenance.cloudApiCalls !== 0) errors.push('provenance: expected local deterministic generation');
  if (recipe) {
    const expected = contractFingerprint(payload(recipe));
    if (recipe.fingerprint !== expected) errors.push('fingerprint: expected ' + expected);
  }
  return { ok: errors.length === 0, errors, recipe: errors.length ? null : recipe };
}

function drawStructure(ctx, sceneRecipe, style, width, height, drawPart) {
  const felt = style.family === 'sunpatch';
  const inkcut = style.family === 'moonharbor-inkcut';
  const accent = style.palette.accent[sceneRecipe.variant.accentIndex];
  drawPart('backdrop', () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, style.palette.paper);
    gradient.addColorStop(1, style.palette.panel);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = .16;
    ctx.fillStyle = style.palette.light;
    ctx.beginPath();
    ctx.arc(width * .78, height * .22, height * .12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (inkcut) {
      ctx.globalAlpha = .15;
      ctx.strokeStyle = style.palette.dark;
      ctx.lineWidth = width * .003;
      for (let index = 0; index < 13; index += 1) {
        const y = height * (.08 + index * .055);
        ctx.beginPath();
        ctx.moveTo(width * .05, y + height * .08);
        ctx.lineTo(width * .95, y - height * .08);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  });
  drawPart('ground', () => {
    ctx.fillStyle = style.palette.bodyAlt;
    ctx.beginPath();
    if (inkcut) {
      ctx.moveTo(width * .1, height * .87);
      ctx.lineTo(width * .36, height * .81);
      ctx.lineTo(width * .9, height * .86);
      ctx.lineTo(width * .66, height * .94);
      ctx.lineTo(width * .18, height * .93);
      ctx.closePath();
    } else {
      ctx.ellipse(width * .5, height * .88, width * .43, height * .07, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  });
  drawPart('structure', () => {
    ctx.fillStyle = style.palette.dark;
    ctx.fillRect(width * .18, height * .3, width * .035, height * .5);
    ctx.fillRect(width * .785, height * .3, width * .035, height * .5);
    ctx.fillStyle = style.palette.body;
    ctx.fillRect(width * .17, height * .61, width * .66, height * .16);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(width * .13, height * .32);
    ctx.lineTo(width * .87, height * .32);
    ctx.lineTo(width * .78, height * .48);
    ctx.lineTo(width * .22, height * .48);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = style.palette.dark;
    ctx.lineWidth = width * (inkcut ? .014 : .01);
    ctx.lineJoin = inkcut ? 'miter' : 'round';
    if (felt) ctx.setLineDash([width * .018, width * .012]);
    ctx.stroke();
    ctx.setLineDash([]);
  });
  drawPart('sign', () => {
    ctx.fillStyle = style.palette.light;
    ctx.fillRect(width * .39, height * .19, width * .22, height * .11);
    ctx.strokeStyle = style.palette.dark;
    ctx.lineWidth = width * .007;
    if (felt) ctx.setLineDash([width * .014, width * .009]);
    ctx.strokeRect(width * .39, height * .19, width * .22, height * .11);
    ctx.setLineDash([]);
    ctx.fillStyle = style.palette.dark;
    ctx.font = '800 ' + Math.round(height * .045) + 'px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sceneRecipe.archetype.split('-')[0].toUpperCase(), width * .5, height * .26);
  });
}

export function renderSceneComponent(sceneRecipe, propRecipes, rawStyle, options = {}) {
  const validation = validateSceneComponentRecipe(sceneRecipe);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  const style = getPropStyleGrammar(rawStyle);
  const width = Math.max(640, Math.min(1600, options.width || 1200));
  const height = Math.round(width / 2);
  const canvas = options.canvas || document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const drawnParts = [];
  const drawPart = (id, drawing) => { drawing(); drawnParts.push(id); };
  drawStructure(ctx, sceneRecipe, style, width, height, drawPart);
  const embedded = [];
  drawPart('prop-cluster', () => {
    const positions = [
      { x: .24, y: .47, size: .28 },
      { x: .5, y: .45, size: .31 },
      { x: .75, y: .48, size: .27 }
    ];
    sceneRecipe.propSlots.forEach((slot, index) => {
      const propRecipe = propRecipes[slot % propRecipes.length];
      const rendered = renderPropAsset(propRecipe, style, { size: 320 });
      const target = positions[index];
      const size = width * target.size;
      ctx.drawImage(rendered.canvas, width * target.x - size / 2, height * target.y, size, size);
      embedded.push({
        recipeFingerprint: propRecipe.fingerprint,
        visualFingerprint: rendered.visual.fingerprint,
        namedParts: rendered.audit.namedParts
      });
    });
  });
  const visual = assetVisualRecord(sceneRecipe, style);
  return {
    canvas,
    recipe: sceneRecipe,
    style,
    visual,
    audit: {
      representation: 'local-authored-procedural-canvas-2d-scene-component',
      namedParts: sceneRecipe.parts.slice(),
      drawnParts,
      visibleParts: drawnParts.length,
      authoredParts: drawnParts.length,
      upstreamVisibleParts: 0,
      embeddedProps: embedded,
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
}
