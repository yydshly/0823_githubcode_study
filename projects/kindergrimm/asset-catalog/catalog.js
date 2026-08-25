import {
  ASSET_BUNDLE_SCHEMA,
  ASSET_OUTPUT_PROFILES,
  assetTypeCapability,
  assetOutputRecord,
  assetVisualRecord,
  buildAssetTypeRecipes,
  validateAssetTypeRecipe,
  validateAssetVisualRecord
} from '../runtime/asset-types.js';
import {
  listPropStyleGrammars,
  validatePropStyleGrammar
} from '../runtime/prop-style-grammars.js';
import { renderPropAsset } from '../runtime/prop-renderer.js';
import {
  buildSceneComponentRecipes,
  renderSceneComponent,
  validateSceneComponentRecipe
} from '../runtime/scene-components.js';
import { createStoredZip, inspectStoredZip } from '../runtime/zip-store.js';

const SAMPLE_COUNT = 12;
const TILE_SIZE = 256;
const styles = listPropStyleGrammars();

const dom = {
  form: document.querySelector('#catalog-form'),
  seed: document.querySelector('#master-seed'),
  generate: document.querySelector('#generate-assets'),
  verify: document.querySelector('#verify-assets'),
  status: document.querySelector('#catalog-status'),
  grid: document.querySelector('#comparison-grid'),
  recipes: document.querySelector('#metric-recipes'),
  visuals: document.querySelector('#metric-visuals'),
  unique: document.querySelector('#metric-unique'),
  build: document.querySelector('#metric-build'),
  mosslightFp: document.querySelector('#mosslight-style-fp'),
  inkcutFp: document.querySelector('#inkcut-style-fp'),
  sunpatchFp: document.querySelector('#sunpatch-style-fp'),
  showcaseRecipe: document.querySelector('#showcase-scene-recipe'),
  showcaseButtons: Array.from(document.querySelectorAll('[data-showcase-style]')),
  showcaseMosslight: document.querySelector('#showcase-mosslight'),
  showcaseMosslightFp: document.querySelector('#showcase-mosslight-fp'),
  showcaseInkcut: document.querySelector('#showcase-inkcut'),
  showcaseInkcutFp: document.querySelector('#showcase-inkcut-fp'),
  showcaseSunpatch: document.querySelector('#showcase-sunpatch'),
  showcaseSunpatchFp: document.querySelector('#showcase-sunpatch-fp'),
  inspectorTitle: document.querySelector('#inspector-title'),
  selectedPreview: document.querySelector('#selected-preview'),
  metaRecipe: document.querySelector('#meta-recipe'),
  metaVisual: document.querySelector('#meta-visual'),
  metaStyle: document.querySelector('#meta-style'),
  metaArchetype: document.querySelector('#meta-archetype'),
  metaParts: document.querySelector('#meta-parts'),
  metaSource: document.querySelector('#meta-source'),
  sceneIdentity: document.querySelector('#scene-component-identity'),
  scenePreview: document.querySelector('#scene-component-preview'),
  sceneRecipe: document.querySelector('#scene-recipe-fp'),
  sceneVisual: document.querySelector('#scene-visual-fp'),
  sceneParts: document.querySelector('#scene-parts'),
  sceneProps: document.querySelector('#scene-props'),
  manifest: document.querySelector('#download-manifest'),
  bundle: document.querySelector('#download-bundle'),
  bundleSummary: document.querySelector('#bundle-summary')
};

const outputDom = Object.fromEntries(ASSET_OUTPUT_PROFILES.map(profile => [profile.id, {
  image: document.querySelector('#output-' + profile.id),
  fingerprint: document.querySelector('#output-' + profile.id + '-fp')
}]));

const showcaseDom = {
  'mosslight-prop-gouache': { image: dom.showcaseMosslight, fingerprint: dom.showcaseMosslightFp },
  'moonharbor-inkcut-props': { image: dom.showcaseInkcut, fingerprint: dom.showcaseInkcutFp },
  'sunpatch-felt-props': { image: dom.showcaseSunpatch, fingerprint: dom.showcaseSunpatchFp }
};
const canvasDisabled = new URLSearchParams(location.search).get('canvas') === 'off';
const state = {
  seed: 240824,
  recipes: [],
  assets: new Map(),
  sceneRecipes: [],
  sceneVisuals: new Map(),
  showcaseScenes: new Map(),
  selectedScene: null,
  selected: null,
  outputs: null,
  building: false,
  buildMs: 0,
  canvasAvailable: !canvasDisabled && Boolean(document.createElement('canvas').getContext('2d')),
  bundleInspection: null
};

function setStatus(kind, message) {
  dom.status.dataset.state = kind;
  dom.status.querySelector('strong').textContent = message;
}

function setBuilding(value) {
  state.building = value;
  dom.generate.disabled = value;
  dom.verify.disabled = value || !state.recipes.length;
  dom.bundle.disabled = value || !state.selected || !state.canvasAvailable;
  dom.grid.setAttribute('aria-busy', String(value));
}

function assetKey(slot, styleId) {
  return String(slot) + ':' + styleId;
}

function getAsset(slot, styleId) {
  return state.assets.get(assetKey(slot, styleId)) || null;
}

function renderGrid() {
  if (!state.recipes.length) {
    dom.grid.innerHTML = '<div class="asset-fallback">等待生成 Prop Recipe</div>';
    return;
  }
  dom.grid.innerHTML = state.recipes.map(recipe => {
    const cells = styles.map(style => {
      const asset = getAsset(recipe.slot, style.id);
      const selected = state.selected && state.selected.recipe.slot === recipe.slot && state.selected.style.id === style.id;
      const preview = asset && asset.preview
        ? '<img src="' + asset.preview + '" alt="' + style.label + ' ' + recipe.archetype + '">'
        : '<span class="asset-fallback">RECIPE READY<br>CANVAS OFF</span>';
      return '<button class="asset-button" type="button" data-slot="' + recipe.slot + '" data-style="' + style.id + '" aria-pressed="' + Boolean(selected) + '">' +
        preview +
        '<span class="asset-copy"><strong>' + style.family.toUpperCase() + ' / ' + recipe.archetype + '</strong>' +
        '<small>' + style.materialGrammar.slice(0, 2).join(' · ') + '</small>' +
        '<code>V#' + asset.visual.fingerprint + '</code></span></button>';
    }).join('');
    return '<article class="comparison-row">' +
      '<div class="recipe-cell"><span>SLOT ' + String(recipe.slot).padStart(2, '0') + '</span><strong>' + recipe.archetype + '</strong><code>R#' + recipe.fingerprint + '</code></div>' +
      cells + '</article>';
  }).join('');
  dom.grid.querySelectorAll('.asset-button').forEach(button => {
    button.addEventListener('click', () => selectAsset(Number(button.dataset.slot), button.dataset.style));
  });
}

function updateMetrics() {
  const visuals = Array.from(state.assets.values()).map(asset => asset.visual.fingerprint);
  dom.recipes.textContent = String(state.recipes.length);
  dom.visuals.textContent = String(visuals.length);
  dom.unique.textContent = String(new Set(visuals).size);
  dom.build.textContent = state.buildMs ? Math.round(state.buildMs) + 'ms' : '—';
}

function clearOutputImages() {
  for (const profile of ASSET_OUTPUT_PROFILES) {
    outputDom[profile.id].image.removeAttribute('src');
    outputDom[profile.id].fingerprint.textContent = '—';
  }
}

function drawRoundedPanel(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function buildPropSheet(style) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE * 4;
  canvas.height = TILE_SIZE * 3;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.recipes.forEach((recipe, index) => {
    const rendered = renderPropAsset(recipe, style, { size: TILE_SIZE });
    const x = index % 4 * TILE_SIZE;
    const y = Math.floor(index / 4) * TILE_SIZE;
    ctx.drawImage(rendered.canvas, x, y);
  });
  return canvas;
}

function buildOutputs(asset) {
  const transparent = renderPropAsset(asset.recipe, asset.style, { size: 512 }).canvas;

  const icon = document.createElement('canvas');
  icon.width = 256;
  icon.height = 256;
  const iconCtx = icon.getContext('2d');
  iconCtx.fillStyle = asset.style.palette.panel;
  iconCtx.fillRect(0, 0, 256, 256);
  drawRoundedPanel(iconCtx, 15, 15, 226, 226, 34, asset.style.palette.paper);
  iconCtx.drawImage(transparent, 22, 22, 212, 212);

  const card = document.createElement('canvas');
  card.width = 512;
  card.height = 640;
  const cardCtx = card.getContext('2d');
  cardCtx.fillStyle = asset.style.palette.paper;
  cardCtx.fillRect(0, 0, card.width, card.height);
  cardCtx.fillStyle = asset.style.palette.dark;
  cardCtx.fillRect(24, 24, 464, 592);
  cardCtx.fillStyle = asset.style.palette.panel;
  cardCtx.fillRect(34, 34, 444, 572);
  cardCtx.drawImage(transparent, 50, 38, 412, 412);
  cardCtx.fillStyle = asset.style.palette.dark;
  cardCtx.font = '800 15px ui-monospace, Consolas, monospace';
  cardCtx.fillText('KINDERGRIMM / PROP CATALOG', 54, 480);
  cardCtx.font = '800 30px Inter, system-ui, sans-serif';
  cardCtx.fillText(asset.recipe.archetype.toUpperCase(), 54, 523);
  cardCtx.font = '700 13px ui-monospace, Consolas, monospace';
  cardCtx.fillStyle = '#665f55';
  cardCtx.fillText('R#' + asset.recipe.fingerprint + ' / V#' + asset.visual.fingerprint, 54, 554);
  cardCtx.fillText(asset.style.label.toUpperCase(), 54, 580);

  const sheet = buildPropSheet(asset.style);
  const outputs = {
    'transparent-prop': {
      canvas: transparent,
      record: assetOutputRecord({ profileId: 'transparent-prop', width: 512, height: 512, recipeFingerprint: asset.recipe.fingerprint, visualFingerprint: asset.visual.fingerprint, styleFingerprint: asset.style.fingerprint })
    },
    'inventory-icon': {
      canvas: icon,
      record: assetOutputRecord({ profileId: 'inventory-icon', width: 256, height: 256, recipeFingerprint: asset.recipe.fingerprint, visualFingerprint: asset.visual.fingerprint, styleFingerprint: asset.style.fingerprint })
    },
    'catalog-card': {
      canvas: card,
      record: assetOutputRecord({ profileId: 'catalog-card', width: 512, height: 640, recipeFingerprint: asset.recipe.fingerprint, visualFingerprint: asset.visual.fingerprint, styleFingerprint: asset.style.fingerprint })
    },
    'prop-sheet': {
      canvas: sheet,
      record: assetOutputRecord({ profileId: 'prop-sheet', width: sheet.width, height: sheet.height, recipeFingerprint: null, visualFingerprint: null, styleFingerprint: asset.style.fingerprint })
    }
  };
  return outputs;
}

function renderOutputs() {
  clearOutputImages();
  if (!state.outputs) return;
  for (const profile of ASSET_OUTPUT_PROFILES) {
    const output = state.outputs[profile.id];
    outputDom[profile.id].image.src = output.canvas.toDataURL('image/png');
    outputDom[profile.id].fingerprint.textContent = output.record.fingerprint;
  }
}

function renderResultStage(asset) {
  const sceneRecipe = state.sceneRecipes[asset.recipe.slot % state.sceneRecipes.length];
  state.showcaseScenes = new Map();
  dom.showcaseRecipe.textContent = 'SCENE R#' + sceneRecipe.fingerprint + ' · ' + sceneRecipe.archetype.toUpperCase();
  for (const style of styles) {
    const visual = state.sceneVisuals.get(assetKey(sceneRecipe.slot, style.id)) || assetVisualRecord(sceneRecipe, style);
    const rendered = state.canvasAvailable
      ? renderSceneComponent(sceneRecipe, state.recipes, style, { width: 1200 })
      : null;
    const target = showcaseDom[style.id];
    if (rendered) target.image.src = rendered.canvas.toDataURL('image/png');
    else target.image.removeAttribute('src');
    target.fingerprint.textContent = visual.fingerprint;
    state.showcaseScenes.set(style.id, { recipe: sceneRecipe, style, visual, rendered });
  }
  for (const button of dom.showcaseButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.showcaseStyle === asset.style.id));
  }
}

function renderSelectedScene(asset) {
  const sceneRecipe = state.sceneRecipes[asset.recipe.slot % state.sceneRecipes.length];
  const staged = state.showcaseScenes.get(asset.style.id);
  const visual = staged && staged.recipe.fingerprint === sceneRecipe.fingerprint
    ? staged.visual
    : assetVisualRecord(sceneRecipe, asset.style);
  let rendered = staged && staged.recipe.fingerprint === sceneRecipe.fingerprint ? staged.rendered : null;
  if (!rendered && state.canvasAvailable) rendered = renderSceneComponent(sceneRecipe, state.recipes, asset.style, { width: 1200 });
  state.selectedScene = { recipe: sceneRecipe, style: asset.style, visual, rendered };
  dom.sceneIdentity.textContent = asset.style.family.toUpperCase() + ' · ' + sceneRecipe.archetype.toUpperCase();
  dom.sceneRecipe.textContent = sceneRecipe.fingerprint;
  dom.sceneVisual.textContent = visual.fingerprint;
  dom.sceneParts.textContent = sceneRecipe.parts.join(' / ');
  dom.sceneProps.textContent = sceneRecipe.propSlots.map(slot => state.recipes[slot].archetype).join(' / ');
  if (rendered) dom.scenePreview.src = rendered.canvas.toDataURL('image/png');
  else dom.scenePreview.removeAttribute('src');
}

function selectAsset(slot, styleId) {
  const asset = getAsset(slot, styleId);
  if (!asset) return null;
  state.selected = asset;
  state.bundleInspection = null;
  renderGrid();
  dom.inspectorTitle.textContent = asset.style.family.toUpperCase() + ' / ' + asset.recipe.archetype.toUpperCase();
  dom.metaRecipe.textContent = asset.recipe.fingerprint;
  dom.metaVisual.textContent = asset.visual.fingerprint;
  dom.metaStyle.textContent = asset.style.fingerprint;
  dom.metaArchetype.textContent = asset.recipe.archetype;
  dom.metaParts.textContent = asset.recipe.parts.join(' / ');
  dom.metaSource.textContent = asset.audit ? asset.audit.authoredParts + '/' + asset.audit.visibleParts + ' authored · 0 upstream' : 'Recipe + Visual only';
  if (asset.preview) dom.selectedPreview.innerHTML = '<img src="' + asset.preview + '" alt="选中的 ' + asset.recipe.archetype + '">';
  else dom.selectedPreview.innerHTML = '<span>Canvas 不可用<br>Recipe / Visual Record 仍可审查</span>';
  state.outputs = state.canvasAvailable ? buildOutputs(asset) : null;
  renderResultStage(asset);
  renderSelectedScene(asset);
  renderOutputs();
  dom.manifest.disabled = false;
  dom.bundle.disabled = !state.canvasAvailable;
  dom.bundleSummary.textContent = state.canvasAvailable
    ? 'ZIP READY · Manifest + Prop + Icon + Card + Sheet + Scene + Style Grammar'
    : 'CANVAS OFF · Manifest 可导出；PNG 与 ZIP 已安全关闭';
  return asset;
}

async function generateAssets() {
  if (state.building) return false;
  setBuilding(true);
  setStatus('working', '正在派生 12 个 Prop Recipe 与 36 个三风格 Visual…');
  const started = performance.now();
  state.seed = Math.max(0, Math.min(999999999, Number(dom.seed.value) || 240824));
  dom.seed.value = String(state.seed);
  state.recipes = buildAssetTypeRecipes(state.seed, SAMPLE_COUNT);
  state.sceneRecipes = buildSceneComponentRecipes(state.seed, SAMPLE_COUNT);
  state.sceneVisuals = new Map();
  state.showcaseScenes = new Map();
  state.assets = new Map();
  state.selected = null;
  state.outputs = null;
  clearOutputImages();
  for (const recipe of state.recipes) {
    for (const style of styles) {
      const visual = assetVisualRecord(recipe, style);
      let preview = null;
      let audit = null;
      if (state.canvasAvailable) {
        const rendered = renderPropAsset(recipe, style, { size: 320 });
        preview = rendered.canvas.toDataURL('image/png');
        audit = rendered.audit;
      }
      state.assets.set(assetKey(recipe.slot, style.id), { recipe, style, visual, preview, audit });
    }
    if (recipe.slot % 3 === 2) await new Promise(resolve => requestAnimationFrame(resolve));
  }
  for (const sceneRecipe of state.sceneRecipes) {
    for (const style of styles) {
      const visual = assetVisualRecord(sceneRecipe, style);
      state.sceneVisuals.set(assetKey(sceneRecipe.slot, style.id), visual);
    }
  }
  state.buildMs = performance.now() - started;
  updateMetrics();
  renderGrid();
  selectAsset(0, styles[0].id);
  setBuilding(false);
  const unique = new Set(Array.from(state.assets.values()).map(asset => asset.visual.fingerprint)).size;
  setStatus(state.canvasAvailable ? 'success' : 'error', state.canvasAvailable
    ? '完成：12 Recipe / 36 Visual / ' + unique + ' unique · 3 styles · 5 named parts / asset'
    : 'Canvas 已关闭：12 Recipe / 36 Visual Record 仍可验证；图像与 ZIP 不可用');
  return true;
}

function verifyAssets() {
  const recipeOk = state.recipes.every(recipe => validateAssetTypeRecipe(recipe).ok);
  const stylesOk = styles.every(style => validatePropStyleGrammar(style).ok);
  const visualOk = Array.from(state.assets.values()).every(asset => validateAssetVisualRecord(asset.visual, asset.recipe, asset.style).ok);
  const sceneOk = state.sceneRecipes.length === 12
    && state.sceneRecipes.every(recipe => validateSceneComponentRecipe(recipe).ok)
    && state.sceneVisuals.size === SAMPLE_COUNT * styles.length
    && new Set(Array.from(state.sceneVisuals.values()).map(visual => visual.fingerprint)).size === SAMPLE_COUNT * styles.length;
  const auditOk = !state.canvasAvailable || Array.from(state.assets.values()).every(asset => asset.audit
    && asset.audit.visibleParts === 5
    && asset.audit.authoredParts === 5
    && asset.audit.upstreamVisibleParts === 0
    && JSON.stringify(asset.audit.drawnParts) === JSON.stringify(asset.recipe.parts));
  const repeated = buildAssetTypeRecipes(state.seed, SAMPLE_COUNT);
  const deterministic = JSON.stringify(repeated) === JSON.stringify(state.recipes);
  const pass = recipeOk && stylesOk && visualOk && sceneOk && auditOk && deterministic;
  setStatus(pass ? 'success' : 'error', pass
    ? '验证通过：Prop / Icon / Scene、三 Style、named parts 与重复 Seed 全部一致'
    : '验证失败：合同、部件审计或确定性不一致');
  return pass;
}

function manifestRecord() {
  return {
    schemaVersion: ASSET_BUNDLE_SCHEMA,
    generatedAt: 'deterministic-runtime',
    seed: state.seed,
    capability: assetTypeCapability(),
    recipes: state.recipes,
    styles,
    assets: Array.from(state.assets.values()).map(asset => ({
      recipeFingerprint: asset.recipe.fingerprint,
      visual: asset.visual,
      audit: asset.audit
    })),
    sceneComponents: state.sceneRecipes.map(recipe => ({
      recipe,
      visuals: styles.map(style => state.sceneVisuals.get(assetKey(recipe.slot, style.id)))
    })),
    selected: state.selected ? {
      recipeFingerprint: state.selected.recipe.fingerprint,
      visualFingerprint: state.selected.visual.fingerprint,
      styleFingerprint: state.selected.style.fingerprint
    } : null,
    outputs: state.outputs ? Object.fromEntries(Object.entries(state.outputs).map(([id, output]) => [id, output.record])) : {},
    provenance: {
      upstream: 'albertobeiz/kindergrimm seeded RNG and Canvas part mechanism',
      localExtension: 'V2-M3 Asset Type / Prop Style Grammar',
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
}

async function buildBundle() {
  if (!state.selected || !state.outputs || !state.canvasAvailable) throw new Error('Canvas output unavailable');
  const manifest = manifestRecord();
  const sceneCanvas = state.selectedScene && state.selectedScene.rendered && state.selectedScene.rendered.canvas;
  if (!sceneCanvas) throw new Error('Scene component output unavailable');
  const files = [
    { name: 'manifest.json', data: JSON.stringify(manifest, null, 2) },
    { name: 'style-grammars.json', data: JSON.stringify(styles, null, 2) },
    { name: 'scene-components.json', data: JSON.stringify(state.sceneRecipes, null, 2) },
    { name: 'selected/prop.png', data: await canvasToBlob(state.outputs['transparent-prop'].canvas) },
    { name: 'selected/icon.png', data: await canvasToBlob(state.outputs['inventory-icon'].canvas) },
    { name: 'selected/card.png', data: await canvasToBlob(state.outputs['catalog-card'].canvas) },
    { name: 'batch/prop-sheet.png', data: await canvasToBlob(state.outputs['prop-sheet'].canvas) },
    { name: 'scene/scene-component.png', data: await canvasToBlob(sceneCanvas) }
  ];
  const zip = await createStoredZip(files);
  const inspection = await inspectStoredZip(zip);
  state.bundleInspection = inspection;
  return { zip, manifest, inspection, files: files.map(file => file.name) };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadText(text, filename) {
  downloadBlob(new Blob([text], { type: 'application/json' }), filename);
}

dom.form.addEventListener('submit', event => {
  event.preventDefault();
  generateAssets();
});
dom.verify.addEventListener('click', verifyAssets);
for (const button of dom.showcaseButtons) {
  button.addEventListener('click', () => {
    if (!state.selected) return;
    selectAsset(state.selected.recipe.slot, button.dataset.showcaseStyle);
  });
}
dom.manifest.addEventListener('click', () => downloadText(JSON.stringify(manifestRecord(), null, 2), 'kindergrimm-props-' + state.seed + '.json'));
dom.bundle.addEventListener('click', async () => {
  dom.bundle.disabled = true;
  setStatus('working', '正在构建 8-entry stored ZIP 并检查 CRC…');
  try {
    const bundle = await buildBundle();
    downloadBlob(bundle.zip, 'kindergrimm-props-' + state.seed + '.zip');
    setStatus(bundle.inspection.allCrcValid ? 'success' : 'error', 'ZIP：' + bundle.inspection.entries.length + ' entries · CRC ' + (bundle.inspection.allCrcValid ? 'PASS' : 'FAIL') + ' · ' + bundle.inspection.size + ' bytes');
  } catch (error) {
    setStatus('error', 'ZIP 构建失败：' + error.message);
  } finally {
    dom.bundle.disabled = !state.canvasAvailable;
  }
});

window.__materialCatalog = {
  state: () => ({
    seed: state.seed,
    recipes: state.recipes.length,
    recipeUnique: new Set(state.recipes.map(recipe => recipe.fingerprint)).size,
    visuals: state.assets.size,
    visualUnique: new Set(Array.from(state.assets.values()).map(asset => asset.visual.fingerprint)).size,
    sceneRecipes: state.sceneRecipes.length,
    sceneRecipeUnique: new Set(state.sceneRecipes.map(recipe => recipe.fingerprint)).size,
    sceneVisuals: state.sceneVisuals.size,
    sceneVisualUnique: new Set(Array.from(state.sceneVisuals.values()).map(visual => visual.fingerprint)).size,
    styles: styles.map(style => ({ id: style.id, fingerprint: style.fingerprint })),
    selected: state.selected ? {
      slot: state.selected.recipe.slot,
      archetype: state.selected.recipe.archetype,
      recipeFingerprint: state.selected.recipe.fingerprint,
      visualFingerprint: state.selected.visual.fingerprint,
      styleId: state.selected.style.id,
      styleFingerprint: state.selected.style.fingerprint,
      audit: state.selected.audit
    } : null,
    outputs: state.outputs ? Object.fromEntries(Object.entries(state.outputs).map(([id, output]) => [id, {
      width: output.canvas.width,
      height: output.canvas.height,
      fingerprint: output.record.fingerprint,
      cornerAlpha: output.canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3]
    }])) : {},
    scene: state.selectedScene ? {
      recipeFingerprint: state.selectedScene.recipe.fingerprint,
      visualFingerprint: state.selectedScene.visual.fingerprint,
      styleId: state.selectedScene.style.id,
      rendered: Boolean(state.selectedScene.rendered),
      audit: state.selectedScene.rendered ? state.selectedScene.rendered.audit : null
    } : null,
    showcase: Array.from(state.showcaseScenes.values()).map(item => ({
      styleId: item.style.id,
      recipeFingerprint: item.recipe.fingerprint,
      visualFingerprint: item.visual.fingerprint,
      rendered: Boolean(item.rendered),
      embeddedProps: item.rendered ? item.rendered.audit.embeddedProps.length : 0
    })),
    canvas: state.canvasAvailable,
    buildMs: Math.round(state.buildMs),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  }),
  verify: verifyAssets,
  manifest: manifestRecord,
  select: (slot, styleId) => {
    selectAsset(slot, styleId);
    return window.__materialCatalog.state();
  },
  inspectBundle: async () => {
    const bundle = await buildBundle();
    return {
      files: bundle.files,
      size: bundle.inspection.size,
      entries: bundle.inspection.entries,
      allCrcValid: bundle.inspection.allCrcValid,
      outputFingerprints: Object.fromEntries(Object.entries(state.outputs).map(([id, output]) => [id, output.record.fingerprint]))
    };
  }
};

dom.mosslightFp.textContent = styles.find(style => style.id === 'mosslight-prop-gouache').fingerprint;
dom.inkcutFp.textContent = styles.find(style => style.id === 'moonharbor-inkcut-props').fingerprint;
dom.sunpatchFp.textContent = styles.find(style => style.id === 'sunpatch-felt-props').fingerprint;
const params = new URLSearchParams(location.search);
if (params.has('seed')) dom.seed.value = params.get('seed');
generateAssets();
