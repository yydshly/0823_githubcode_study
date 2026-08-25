import {
  LOOKS, PRESETS, SPECIES, compileIntent, createManifest, fingerprint, sceneReadiness,
} from './compiler.js';
import {
  DrawnSourceRenderer, GlossSourceRenderer, ObjectSourceRenderer, UsageWorldRenderer, VoxelSourceRenderer,
  sourceRendererMeta, webglAvailable,
} from './source-renderers.js';
import {
  CAPABILITY_MODES, ENVIRONMENT_FINISHES, ENVIRONMENT_PALETTES, ENVIRONMENT_SPECIES,
  HISTORY_STYLES, ITEM_RANKS, SOURCE_MEDIA, STYLE_CAPABILITIES, capabilitySummary,
  environmentManifest, environmentRecipe, itemManifest, styleProofUrl,
} from './capability-matrix.js';
import { FAMILIES, rollItem, thumbFor } from '../upstream/src/items/index.js';
import {
  SCENE_ACTORS, SCENE_BIOMES, SCENE_INTERACTIONS, SCENE_MOODS, SCENE_PRESETS, SCENE_TYPES,
  createScenePackageManifest, matchSceneDemand,
} from './scene-orchestrator.js';
import { USAGE_PROOFS, usageProof } from './usage-proofs.js';
import { DEMAND_STATUSES, demandCoverage, demandsFor } from './asset-demands.js';

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);
const pretty = value => JSON.stringify(value, null, 2);
const params = new URLSearchParams(location.search);
const renderOff = params.get('render') === 'off';
const canRender = !renderOff && webglAvailable();
const CHARACTER_SELECTORS = ['#render-fallback', '.preview-grid', '.truth-panel', '.readiness', '.source-boundary'];

let current = null;
let currentStats = {};
let currentItem = null;
let currentItemCanvas = null;
let currentEnvironment = null;
let currentScenePlan = null;
let currentUsageStats = null;
let activeUsageProof = 'narrative';
let activeDemandFilter = 'all';
let activeMode = 'character';
let busy = false;
let renderers = null;
let objectRenderer = null;
let usageWorldRenderer = null;

function option(select, item, label = item.label ?? item.id ?? item) {
  const node = document.createElement('option');
  node.value = item.id ?? item;
  node.textContent = label;
  select.appendChild(node);
}

function populateControls() {
  PRESETS.forEach(item => option(byId('preset'), item));
  SPECIES.forEach(item => option(byId('species'), item));
  LOOKS.forEach(item => option(byId('look'), item));
  STYLE_CAPABILITIES.forEach(item => option(byId('style-capability'), item, `${item.kind === 'media' ? '媒介' : item.era} · ${item.label}`));
  FAMILIES.forEach(item => option(byId('item-family'), item, `${item.noun || item.id} · ${item.slot}`));
  ITEM_RANKS.forEach(rank => option(byId('item-rank'), rank, rank));
  ENVIRONMENT_SPECIES.forEach(id => option(byId('environment-species'), id, id));
  ENVIRONMENT_PALETTES.forEach(id => option(byId('environment-palette'), id, id));
  ENVIRONMENT_FINISHES.forEach(id => option(byId('environment-finish'), id, id));
  SCENE_PRESETS.forEach(item => option(byId('scene-preset'), item));
  SCENE_TYPES.forEach(item => option(byId('scene-type'), item));
  SCENE_MOODS.forEach(item => option(byId('scene-mood'), item));
  SCENE_BIOMES.forEach(item => option(byId('scene-biome'), item));
  SCENE_INTERACTIONS.forEach(item => option(byId('scene-interaction'), item));
  SCENE_ACTORS.forEach(item => option(byId('scene-actor'), item));
  SCENE_PRESETS.forEach(item => option(byId('usage-scene-preset'), item));
}

function renderStyleRegistry() {
  const host = byId('style-registry');
  host.textContent = '';
  STYLE_CAPABILITIES.forEach(entry => {
    const card = document.createElement('article');
    card.className = 'style-token';
    card.dataset.styleId = entry.id;
    const kind = document.createElement('span');
    kind.textContent = entry.kind === 'media' ? 'SOURCE MEDIA' : `HISTORY · ${entry.era}`;
    const title = document.createElement('strong');
    title.textContent = entry.label;
    const use = document.createElement('span');
    use.textContent = entry.use;
    card.append(kind, title, use);
    host.appendChild(card);
  });
}

function setMode(mode, { focus = false } = {}) {
  if (!CAPABILITY_MODES.some(entry => entry.id === mode)) mode = 'character';
  activeMode = mode;
  document.body.dataset.activeMode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => {
    const selected = button.dataset.mode === mode;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  CHARACTER_SELECTORS.forEach(selector => {
    const node = $(selector);
    if (node) {
      node.dataset.characterPanel = '';
      node.hidden = mode !== 'character' || (node.id === 'render-fallback' && canRender);
    }
  });
  document.querySelectorAll('.mode-panel').forEach(panel => { panel.hidden = panel.id !== `${mode}-mode`; });
  const labels = {
    character: ['同一意图，三种真实素材形态', 'LIVE UPSTREAM BUILDERS'],
    style: ['源库风格能力与实时样张', 'STYLE SELECTION SURFACE'],
    item: ['源库道具生成、透明素材与来源记录', 'ITEM PRODUCTION SURFACE'],
    environment: ['程序化环境对象与场景代理图', 'OBJECT PRODUCTION SURFACE'],
    scene: ['从场景需求到真实源素材包', 'SCENE-DEMAND ORCHESTRATION'],
    usage: ['真实产品如何消费这些源素材', 'ASSET USAGE PROOFS'],
  };
  byId('stage-title').textContent = labels[mode][0];
  $('.stage-head .eyebrow').textContent = labels[mode][1];
  if (mode === 'environment' && !currentEnvironment) generateEnvironment();
  if (mode === 'item' && !currentItem) generateItem();
  if (mode === 'style' && !byId('style-frame').hasAttribute('src')) updateStyleProof();
  if (mode === 'scene' && !currentScenePlan) generateScenePlan();
  if (mode === 'usage' && !currentUsageStats) generateUsageProofs();
}

function applyPreset(id, generate = true) {
  const preset = PRESETS.find(item => item.id === id) || PRESETS[0];
  byId('preset').value = preset.id;
  byId('seed').value = preset.seed;
  byId('species').value = preset.species;
  byId('look').value = preset.look;
  byId('scene-role').value = preset.sceneRole;
  if (generate) generateAssets();
}

function formIntent() {
  const preset = PRESETS.find(item => item.id === byId('preset').value) || PRESETS[0];
  return { assetId: `${preset.id}-${byId('seed').value}`, seed: Number(byId('seed').value), species: byId('species').value, look: byId('look').value, sceneRole: byId('scene-role').value };
}

function setBusy(next) {
  busy = next;
  document.body.classList.toggle('is-busy', next);
  document.querySelectorAll('button, input, select, textarea').forEach(control => {
    if (control.id !== 'copy-intent') control.disabled = next;
  });
  $('.asset-stage').setAttribute('aria-busy', String(next));
}

function showError(message) {
  const target = byId('form-error');
  target.textContent = message;
  target.hidden = !message;
}

function initializeRenderers() {
  if (!canRender) {
    byId('render-fallback').hidden = false;
    document.querySelectorAll('.canvas-host, .object-stage').forEach(host => {
      const note = document.createElement('p'); note.className = 'canvas-off-note'; note.textContent = '实时 WebGL Renderer 已关闭'; host.appendChild(note);
    });
    byId('usage-world-fallback').hidden = false;
    document.querySelectorAll('[data-export], #export-package, #environment-export').forEach(button => button.disabled = true);
    return;
  }
  renderers = {
    drawn: new DrawnSourceRenderer(byId('drawn-stage')),
    voxel: new VoxelSourceRenderer(byId('voxel-stage')),
    gloss: new GlossSourceRenderer(byId('gloss-stage')),
  };
  objectRenderer = new ObjectSourceRenderer(byId('environment-stage'));
  usageWorldRenderer = new UsageWorldRenderer(byId('usage-world-stage'));
  byId('usage-world-fallback').hidden = true;
}

function renderMapping(compiled) {
  const list = byId('mapping-list'); list.textContent = '';
  compiled.mapping.forEach(item => {
    const row = document.createElement('div'); row.className = 'mapping-row';
    const field = document.createElement('code'); field.textContent = item.field;
    const level = document.createElement('span'); level.className = `level level--${item.level}`; level.textContent = item.label;
    const detail = document.createElement('p'); detail.textContent = item.detail;
    row.append(field, level, detail); list.appendChild(row);
  });
}

function renderReadiness(compiled) {
  const grid = byId('readiness-grid'); grid.textContent = '';
  sceneReadiness(compiled).forEach(item => {
    const card = document.createElement('article'); card.className = 'readiness-card';
    const title = document.createElement('h3'); title.textContent = item.backend;
    const representation = document.createElement('p'); representation.className = 'representation'; representation.textContent = item.representation;
    const use = document.createElement('p'); use.textContent = item.sceneUse;
    const list = document.createElement('ul'); item.ready.forEach(text => { const li = document.createElement('li'); li.textContent = text; list.appendChild(li); });
    const gap = document.createElement('p'); gap.className = 'gap'; gap.textContent = item.gap;
    const filename = document.createElement('code'); filename.textContent = item.filename;
    card.append(title, representation, use, list, gap, filename); grid.appendChild(card);
  });
}

function statText(backend, stats) {
  if (!stats) return 'Recipe 已编译 · 实时渲染关闭';
  if (backend === 'drawn') return `${stats.parts} parts · ${stats.planes} planes · ${stats.media}`;
  if (backend === 'voxel') return `${stats.voxels} voxels · ${stats.tris} tris · ${stats.parts} parts`;
  return `${stats.meshes} meshes · ${stats.verts} verts · ${stats.material}`;
}

function updateUi(compiled) {
  byId('intent-json').textContent = pretty(compiled.intent);
  byId('fingerprint').textContent = compiled.fingerprint;
  for (const backend of ['drawn', 'voxel', 'gloss']) {
    byId(`${backend}-recipe`).textContent = pretty(compiled.nativeRecipes[backend]);
    byId(`${backend}-stats`).textContent = statText(backend, currentStats[backend]);
  }
  renderMapping(compiled); renderReadiness(compiled);
  byId('export-status').textContent = canRender ? '已生成。可导出三张 768×768 透明 PNG 与来源 Manifest。' : 'Recipe 已编译；当前模式不执行 PNG 渲染。';
}

async function generateAssets(intentOverride = null) {
  if (busy) return;
  setBusy(true); showError('');
  try {
    const compiled = compileIntent(intentOverride || formIntent()); currentStats = {};
    if (renderers) {
      currentStats.drawn = renderers.drawn.setRecipe(compiled.nativeRecipes.drawn);
      currentStats.voxel = renderers.voxel.setRecipe(compiled.nativeRecipes.voxel);
      currentStats.gloss = renderers.gloss.setRecipe(compiled.nativeRecipes.gloss);
      compiled.nativeRecipes = { drawn: currentStats.drawn.nativeRecipe, voxel: currentStats.voxel.nativeRecipe, gloss: currentStats.gloss.nativeRecipe };
      compiled.fingerprint = fingerprint({ intent: compiled.intent, nativeRecipes: compiled.nativeRecipes });
    }
    current = compiled; updateUi(compiled); return compiled;
  } catch (error) { showError(error.message || '生成失败。'); byId('export-status').textContent = '生成失败，请修正输入。'; if (intentOverride) throw error; }
  finally {
    setBusy(false);
    if (!canRender) document.querySelectorAll('[data-export], #export-package, #environment-export').forEach(button => button.disabled = true);
  }
}

function updateStyleProof() {
  const style = byId('style-capability').value || STYLE_CAPABILITIES[0].id;
  const seed = Math.max(1, Number(byId('style-seed').value) || 1);
  const n = Number(byId('style-count').value) || 6;
  const url = styleProofUrl({ style, seed, n });
  byId('style-frame').src = url;
  byId('style-source-link').href = url.replace('&shot', '');
  document.querySelectorAll('.style-token').forEach(card => card.classList.toggle('is-active', card.dataset.styleId === style));
  return url;
}

function generateItem() {
  const family = byId('item-family').value || FAMILIES[0].id;
  const rank = byId('item-rank').value || ITEM_RANKS[0];
  const seed = Math.max(1, Number(byId('item-seed').value) || 1);
  const item = rollItem(family, rank, seed);
  if (!item) throw new Error('源库没有返回道具。');
  const canvas = thumbFor(item, 512);
  const host = byId('item-stage'); host.textContent = ''; host.appendChild(canvas);
  currentItem = item; currentItemCanvas = canvas;
  const manifest = itemManifest(item, { px: 512 });
  byId('item-name').textContent = item.name;
  byId('item-copy').textContent = item.desc;
  byId('item-stats').textContent = `${item.family} · ${item.rank} · ${item.slot} · seed ${item.seed}`;
  const hosts = byId('item-hosts'); hosts.textContent = '';
  const validHosts = ['CARD / HUD', item.slot === 'floor' ? 'FLOOR PROP' : 'ON CHARACTER'];
  validHosts.forEach(text => { const chip = document.createElement('span'); chip.textContent = text; hosts.appendChild(chip); });
  byId('item-manifest').textContent = pretty(manifest);
  return { item, canvas, manifest };
}

function generateEnvironment() {
  const input = { seed: Number(byId('environment-seed').value), species: byId('environment-species').value, palette: byId('environment-palette').value, material: byId('environment-finish').value };
  let recipe = environmentRecipe(input);
  let stats = null;
  if (objectRenderer) {
    const built = objectRenderer.setRecipe(recipe);
    recipe = built.nativeRecipe;
    stats = { buildMs: built.buildMs, verts: built.verts, meshes: built.meshes, bounds: built.bounds };
  }
  const manifest = environmentManifest(recipe, stats, { representation: 'transparent-png-proxy', width: 768, height: 768 });
  currentEnvironment = { recipe, stats, manifest };
  byId('environment-name').textContent = `${recipe.palette} ${recipe.species}`;
  byId('environment-stats').textContent = stats ? `${stats.meshes} meshes · ${stats.verts} verts · ${Math.round(stats.buildMs * 10) / 10} ms` : 'Recipe 已编译 · WebGL 几何构建关闭';
  byId('environment-manifest').textContent = pretty(manifest);
  return currentEnvironment;
}

function copyUsageImage(sourceId, targetId, unavailableText) {
  const source = byId(sourceId);
  const target = byId(targetId);
  const sourceValue = source?.getAttribute('src');
  const frame = target.parentElement;
  if (sourceValue) {
    target.src = sourceValue;
    delete frame.dataset.usageUnavailable;
    return true;
  }
  target.removeAttribute('src');
  frame.dataset.usageUnavailable = unavailableText;
  return false;
}

function renderCollectionLedger(plan) {
  const host = byId('usage-collection-ledger');
  host.textContent = '';
  const rows = [
    ['Scene Fingerprint', plan.fingerprint],
    ['Source Commit', plan.source.commit.slice(0, 12)],
    ['Character Recipe', `${plan.selections.character.species} / ${plan.selections.character.look}`],
    ['Item Recipe', `${plan.selections.item.family} / ${plan.selections.item.rank} / ${plan.selections.item.seed}`],
  ];
  rows.forEach(([term, value]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = value;
    row.append(dt, dd); host.appendChild(row);
  });
}

function renderUsageComparison() {
  const host = byId('usage-comparison-grid');
  host.textContent = '';
  USAGE_PROOFS.forEach(proof => {
    const card = document.createElement('article'); card.className = 'usage-comparison-card';
    const rep = document.createElement('span'); rep.textContent = proof.representation;
    const title = document.createElement('h4'); title.textContent = proof.title;
    const assets = document.createElement('p'); assets.textContent = proof.assets;
    const value = document.createElement('p'); value.textContent = proof.value;
    card.append(rep, title, assets, value); host.appendChild(card);
  });
}

function demandSourceDetail(row, plan) {
  if (!plan) return row.source;
  if (['portrait', 'figure-proxy', 'voxel-character'].includes(row.id)) return row.source + ' · ' + plan.selections.character.species + '/' + plan.selections.character.look;
  if (['quest-item', 'reward-item', 'item-hud', 'item-model'].includes(row.id)) return row.source + ' · ' + plan.selections.item.family + '/' + plan.selections.item.rank;
  if (row.id === 'plant') return row.source + ' · ' + (plan.selections.environment?.species || 'scene environment');
  if (['provenance', 'world-plan'].includes(row.id)) return row.source + ' · ' + plan.fingerprint.slice(0, 12);
  return row.source;
}

function renderDemandBoard(plan = currentScenePlan) {
  const proof = usageProof(activeUsageProof);
  const rows = demandsFor(proof.id);
  const coverage = demandCoverage(proof.id);
  const visibleRows = rows.filter(row => activeDemandFilter === 'all' || (activeDemandFilter === 'ready' ? row.status !== 'extension-needed' : row.status === 'extension-needed'));
  const body = byId('demand-table-body');
  if (!body) return coverage;
  body.textContent = '';
  visibleRows.forEach(row => {
    const tr = document.createElement('tr'); tr.dataset.status = row.status; tr.dataset.demandId = row.id;
    const asset = document.createElement('td');
    const assetName = document.createElement('strong'); assetName.textContent = row.asset;
    const assetId = document.createElement('code'); assetId.textContent = row.id;
    asset.append(assetName, assetId);
    const consumer = document.createElement('td'); consumer.textContent = row.consumer;
    const representation = document.createElement('td'); representation.textContent = row.representation;
    const source = document.createElement('td'); source.textContent = demandSourceDetail(row, plan);
    const statusCell = document.createElement('td');
    const status = document.createElement('span'); status.className = 'demand-status'; status.dataset.tone = DEMAND_STATUSES[row.status].tone; status.textContent = DEMAND_STATUSES[row.status].label; statusCell.appendChild(status);
    const gap = document.createElement('td'); gap.className = 'demand-gap-cell';
    const gapTitle = document.createElement('strong'); gapTitle.textContent = row.gap;
    const next = document.createElement('span'); next.textContent = row.next;
    gap.append(gapTitle, next); tr.append(asset, consumer, representation, source, statusCell, gap); body.appendChild(tr);
  });
  byId('demand-coverage-percent').textContent = coverage.percent + '%';
  byId('demand-coverage-label').textContent = coverage.ready + '/' + coverage.total + ' 项当前可用 · ' + coverage.gaps + ' 项需扩展';
  byId('demand-coverage-bar').style.width = coverage.percent + '%';
  byId('demand-board-status').textContent = proof.title + ' · 显示 ' + visibleRows.length + '/' + rows.length + ' 项 · ' + (plan?.intent.title || '等待场景素材');
  const firstGap = rows.find(row => row.status === 'extension-needed');
  byId('demand-next-title').textContent = firstGap ? firstGap.asset : '当前覆盖完整';
  byId('demand-next-copy').textContent = firstGap ? firstGap.gap + '。' + firstGap.next : '当前消费者所需素材已可由源库与确定性消费层覆盖。';
  document.querySelectorAll('[data-demand-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.demandFilter === activeDemandFilter)));
  return coverage;
}

function setDemandFilter(filter = 'all') {
  activeDemandFilter = ['all', 'ready', 'gap'].includes(filter) ? filter : 'all';
  return renderDemandBoard();
}
function setUsageProof(id, { focus = false } = {}) {
  const proof = usageProof(id);
  activeUsageProof = proof.id;
  document.querySelectorAll('[data-usage-proof]').forEach(button => {
    const selected = button.dataset.usageProof === proof.id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  document.querySelectorAll('[data-usage-panel]').forEach(panel => { panel.hidden = panel.dataset.usagePanel !== proof.id; });
  byId('usage-context-title').textContent = proof.title;
  byId('usage-context-user').textContent = proof.consumer;
  byId('usage-context-assets').textContent = proof.assets;
  byId('usage-context-value').textContent = proof.value;
  byId('usage-context-next').textContent = proof.next;
  byId('usage-context-boundary').textContent = proof.boundary;
  renderDemandBoard();
  if (proof.id === 'world' && usageWorldRenderer) requestAnimationFrame(() => usageWorldRenderer.resize());
  return proof;
}

async function generateUsageProofs() {
  if (busy) return null;
  const started = performance.now();
  byId('usage-plan-status').textContent = '正在生成同一素材计划的三个消费证明…';
  const presetId = byId('usage-scene-preset').value || SCENE_PRESETS[0].id;
  applyScenePreset(presetId, false);
  const plan = await generateScenePlan();
  if (!plan) {
    byId('usage-plan-status').textContent = '素材计划生成失败。';
    return null;
  }

  copyUsageImage('scene-drawn-preview', 'usage-story-character', 'Drawn Renderer 不可用；角色 Recipe 已保留');
  copyUsageImage('scene-item-preview', 'usage-story-item', '道具素材不可用');
  copyUsageImage('scene-gloss-preview', 'usage-collection-character', 'Gloss Renderer 不可用；角色 Recipe 已保留');
  copyUsageImage('scene-item-preview', 'usage-collection-item', '道具素材不可用');
  copyUsageImage('scene-item-preview', 'usage-world-item', '道具 HUD 不可用');

  byId('usage-story-style').textContent = `${plan.selections.style.id} · SOURCE STYLE`;
  byId('usage-story-title').textContent = plan.intent.title;
  byId('usage-story-copy').textContent = plan.intent.purpose || '这组素材等待一段明确的叙事目的。';
  byId('usage-story-item-label').textContent = currentItem.name;

  byId('usage-collection-title').textContent = `${plan.intent.title} · ${plan.selections.character.species}`;
  byId('usage-collection-copy').textContent = `由 Seed ${plan.intent.seed} 复现的 Gloss 角色代理与 ${currentItem.name} 奖励条目。`;
  byId('usage-collection-item-label').textContent = currentItem.name;
  renderCollectionLedger(plan);

  byId('usage-world-item-label').textContent = currentItem.name;
  byId('usage-world-title').textContent = plan.intent.title;
  let worldStats = null;
  if (usageWorldRenderer) {
    worldStats = usageWorldRenderer.setAssets(current.nativeRecipes.voxel, currentEnvironment.recipe);
    byId('usage-world-fallback').hidden = true;
    const render = worldStats.renderer;
    byId('usage-world-stats').textContent = `${render.calls} calls · ${render.triangles} tris · ${worldStats.buildMs.toFixed(1)} ms build`;
  } else {
    byId('usage-world-fallback').hidden = false;
    byId('usage-world-stats').textContent = 'Recipe ready · WebGL placement unavailable';
  }

  currentUsageStats = {
    planFingerprint: plan.fingerprint,
    proofCount: USAGE_PROOFS.length,
    generatedMs: performance.now() - started,
    world: worldStats,
    twoDConsumersReady: Boolean(byId('usage-story-item').getAttribute('src') && byId('usage-collection-item').getAttribute('src')),
  };
  renderUsageComparison();
  setUsageProof(activeUsageProof);
  byId('usage-plan-status').textContent = `${plan.intent.title} · 3 usage proofs · ${currentUsageStats.generatedMs.toFixed(1)} ms`;
  return currentUsageStats;
}
function formSceneIntent() {
  return {
    title: byId('scene-title').value,
    purpose: byId('scene-purpose').value,
    seed: Number(byId('scene-seed').value),
    sceneType: byId('scene-type').value,
    mood: byId('scene-mood').value,
    biome: byId('scene-biome').value,
    interaction: byId('scene-interaction').value,
    actor: byId('scene-actor').value,
  };
}

function applyScenePreset(id, generate = true) {
  const preset = SCENE_PRESETS.find(item => item.id === id) || SCENE_PRESETS[0];
  byId('scene-preset').value = preset.id;
  byId('scene-title').value = preset.title;
  byId('scene-purpose').value = preset.purpose;
  byId('scene-seed').value = preset.seed;
  byId('scene-type').value = preset.sceneType;
  byId('scene-mood').value = preset.mood;
  byId('scene-biome').value = preset.biome;
  byId('scene-interaction').value = preset.interaction;
  byId('scene-actor').value = preset.actor;
  if (generate) return generateScenePlan();
  return preset;
}

function showSceneError(message = '') {
  const target = byId('scene-error');
  target.textContent = message;
  target.hidden = !message;
}

function setCanvasPreview(canvas, image) {
  const frame = image.closest('.scene-asset-frame');
  if (!canvas) {
    image.removeAttribute('src');
    frame.dataset.unavailable = '实时 WebGL 已关闭；Recipe 已保留';
    return;
  }
  delete frame.dataset.unavailable;
  image.src = canvas.toDataURL('image/png');
}

function renderSceneExplanations(plan) {
  const host = byId('scene-explanation-list');
  host.textContent = '';
  plan.explanations.forEach(entry => {
    const row = document.createElement('article'); row.className = 'scene-explanation-row';
    const signal = document.createElement('code'); signal.textContent = entry.signal;
    const decision = document.createElement('strong'); decision.textContent = `${entry.capability} → ${entry.decision}`;
    const reason = document.createElement('p'); reason.textContent = `${entry.reason} Source: ${entry.source}.`;
    const gap = document.createElement('p'); gap.className = 'scene-gap'; gap.textContent = entry.gap;
    row.append(signal, decision, reason, gap); host.appendChild(row);
  });
}

async function generateScenePlan() {
  if (busy) return null;
  const previousPlan = currentScenePlan;
  currentScenePlan = null;
  byId('scene-export').disabled = true;
  byId('scene-status').textContent = '正在编译需求并调用四类源能力…';
  showSceneError('');
  try {
    const plan = matchSceneDemand(formSceneIntent());
    const character = plan.selections.character;
    byId('seed').value = character.seed;
    byId('species').value = character.species;
    byId('look').value = character.look;
    byId('scene-role').value = character.sceneRole;
    await generateAssets(character);

    const style = plan.selections.style;
    byId('style-capability').value = style.id;
    byId('style-seed').value = style.seed;
    byId('style-count').value = String(style.n);
    const styleUrl = updateStyleProof();
    byId('scene-style-frame').src = styleUrl;

    const item = plan.selections.item;
    byId('item-family').value = item.family;
    byId('item-rank').value = item.rank;
    byId('item-seed').value = item.seed;
    generateItem();

    const environment = plan.selections.environment;
    byId('environment-species').value = environment.species;
    byId('environment-palette').value = environment.palette;
    byId('environment-finish').value = environment.material;
    byId('environment-seed').value = environment.seed;
    generateEnvironment();

    setCanvasPreview(renderers?.drawn?.renderer.domElement, byId('scene-drawn-preview'));
    setCanvasPreview(renderers?.voxel?.renderer.domElement, byId('scene-voxel-preview'));
    setCanvasPreview(renderers?.gloss?.renderer.domElement, byId('scene-gloss-preview'));
    setCanvasPreview(currentItemCanvas, byId('scene-item-preview'));
    setCanvasPreview(objectRenderer?.renderer.domElement, byId('scene-environment-preview'));

    byId('scene-output-title').textContent = plan.intent.title;
    byId('scene-fingerprint').textContent = plan.fingerprint;
    byId('scene-style-label').textContent = style.id;
    byId('scene-item-label').textContent = `${currentItem.name} · ${item.rank}`;
    byId('scene-item-note').textContent = `${item.family} / ${currentItem.slot} / seed ${item.seed}；真实 2D 透明素材。`;
    byId('scene-environment-label').textContent = `${environment.palette} ${environment.species}`;
    byId('scene-environment-note').textContent = currentEnvironment.stats
      ? `${currentEnvironment.stats.meshes} meshes · ${currentEnvironment.stats.verts} verts；PNG 仅为代理图。`
      : '程序化 Recipe 已编译；实时几何因 WebGL 关闭而未构建。';
    renderSceneExplanations(plan);
    currentScenePlan = plan;
    const manifest = createScenePackageManifest(plan, []);
    byId('scene-manifest').textContent = pretty(manifest);
    byId('scene-export').disabled = !canRender;
    byId('scene-status').textContent = canRender
      ? '素材组已生成：3 角色形态 + 1 道具 + 1 环境对象 + 1 风格依据。'
      : '已完成确定性匹配、道具和 Recipe；WebGL 资产与整包导出已关闭。';
    return plan;
  } catch (error) {
    currentScenePlan = previousPlan;
    byId('scene-export').disabled = !canRender || !currentScenePlan;
    showSceneError(error.message || '场景编排失败。');
    byId('scene-status').textContent = '编排失败，请修正场景输入。';
    return null;
  }
}

async function exportScenePackage({ download = true } = {}) {
  if (!currentScenePlan || !renderers || !objectRenderer) throw new Error('请先在 WebGL 可用时生成场景素材组。');
  setBusy(true);
  byId('scene-status').textContent = '正在导出并计算五张 PNG 的 SHA-256…';
  try {
    const characterFiles = [];
    for (const backend of ['drawn', 'voxel', 'gloss']) characterFiles.push(await exportBackend(backend, { download: false }));
    const itemFile = await exportItem({ download: false });
    const environmentFile = await exportEnvironment({ download: false });
    const itemName = `${currentScenePlan.selections.item.family}-${currentScenePlan.selections.item.rank}-${currentScenePlan.selections.item.seed}.png`;
    const environmentName = `${currentScenePlan.selections.environment.species}-${currentScenePlan.selections.environment.palette}-${currentScenePlan.selections.environment.seed}--proxy.png`;
    const assets = [
      ...characterFiles.map(file => ({ id: `character-${file.record.backend}`, filename: file.record.filename, ...file.record })),
      { id: 'item', filename: itemName, mime: itemFile.blob.type, bytes: itemFile.blob.size, width: 512, height: 512, sha256: itemFile.manifest.output.sha256, representation: itemFile.manifest.output.representation, provenance: itemFile.manifest.source },
      { id: 'environment', filename: environmentName, mime: environmentFile.blob.type, bytes: environmentFile.blob.size, width: environmentFile.width, height: environmentFile.height, sha256: environmentFile.manifest.output.sha256, representation: environmentFile.manifest.representation, proxyRepresentation: environmentFile.manifest.output.representation, provenance: environmentFile.manifest.source },
    ];
    const manifest = createScenePackageManifest(currentScenePlan, assets);
    const manifestBlob = new Blob([`${pretty(manifest)}\n`], { type: 'application/json' });
    const files = [
      ...characterFiles.map(file => ({ filename: file.record.filename, blob: file.blob })),
      { filename: itemName, blob: itemFile.blob },
      { filename: environmentName, blob: environmentFile.blob },
      { filename: `${manifest.packageId}--scene-manifest.json`, blob: manifestBlob },
    ];
    if (download) files.forEach(file => downloadBlob(file.blob, file.filename));
    const totalBytes = files.reduce((sum, file) => sum + file.blob.size, 0);
    byId('scene-manifest').textContent = pretty(manifest);
    byId('scene-status').textContent = `场景素材包就绪：6 files · ${Math.round(totalBytes / 1024)} KB · 5 PNG SHA-256。`;
    return { files, manifest, manifestBlob, totalBytes };
  } catch (error) {
    byId('scene-status').textContent = `导出失败：${error.message}`;
    throw error;
  } finally {
    setBusy(false);
  }
}
async function sha256(blob) {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function canvasBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 编码失败。')), 'image/png')); }
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.hidden = true; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportBackend(backend, { download = true } = {}) {
  if (!current || !renderers?.[backend]) throw new Error('该 Renderer 当前不可用。');
  const readiness = sceneReadiness(current).find(item => item.backend === backend);
  const rendered = await renderers[backend].exportPng();
  const record = { backend, filename: readiness.filename, mime: rendered.blob.type, bytes: rendered.blob.size, width: rendered.width, height: rendered.height, sha256: await sha256(rendered.blob), representation: readiness.representation, provenance: sourceRendererMeta[backend] };
  if (download) downloadBlob(rendered.blob, record.filename);
  return { ...rendered, record };
}

async function exportBundle({ download = true } = {}) {
  if (!current || !renderers) throw new Error('请先在可用的 WebGL 模式生成素材。');
  setBusy(true); byId('export-status').textContent = '正在标准化并校验三个 PNG…';
  try {
    const files = []; for (const backend of ['drawn', 'voxel', 'gloss']) files.push(await exportBackend(backend, { download: false }));
    const manifest = createManifest(current, files.map(file => file.record));
    const manifestBlob = new Blob([`${pretty(manifest)}\n`], { type: 'application/json' });
    if (download) { files.forEach(file => downloadBlob(file.blob, file.record.filename)); downloadBlob(manifestBlob, `${current.intent.assetId}--manifest.json`); }
    const total = files.reduce((sum, file) => sum + file.blob.size, 0) + manifestBlob.size;
    byId('export-status').textContent = `导出就绪：4 files · ${Math.round(total / 1024)} KB · 3 SHA-256。`;
    return { files, manifest, manifestBlob, totalBytes: total };
  } finally { setBusy(false); }
}

async function exportItem({ download = true } = {}) {
  if (!currentItem || !currentItemCanvas) throw new Error('请先生成道具。');
  const blob = await canvasBlob(currentItemCanvas);
  const manifest = { ...itemManifest(currentItem, { px: 512 }), output: { ...itemManifest(currentItem, { px: 512 }).output, bytes: blob.size, sha256: await sha256(blob) } };
  const jsonBlob = new Blob([`${pretty(manifest)}\n`], { type: 'application/json' });
  const stem = `${currentItem.family}-${currentItem.rank}-${currentItem.seed}`;
  if (download) { downloadBlob(blob, `${stem}.png`); downloadBlob(jsonBlob, `${stem}.json`); }
  byId('item-manifest').textContent = pretty(manifest);
  return { blob, manifest, manifestBlob: jsonBlob };
}

async function exportEnvironment({ download = true } = {}) {
  if (!currentEnvironment || !objectRenderer) throw new Error('当前环境对象 Renderer 不可用。');
  const rendered = await objectRenderer.exportPng();
  const output = { representation: 'transparent-png-proxy', width: rendered.width, height: rendered.height, bytes: rendered.blob.size, sha256: await sha256(rendered.blob) };
  const manifest = environmentManifest(currentEnvironment.recipe, currentEnvironment.stats, output);
  const jsonBlob = new Blob([`${pretty(manifest)}\n`], { type: 'application/json' });
  const stem = `${currentEnvironment.recipe.species}-${currentEnvironment.recipe.palette}-${currentEnvironment.recipe.seed}`;
  if (download) { downloadBlob(rendered.blob, `${stem}--proxy.png`); downloadBlob(jsonBlob, `${stem}.json`); }
  byId('environment-manifest').textContent = pretty(manifest);
  return { ...rendered, manifest, manifestBlob: jsonBlob };
}

function wireEvents() {
  byId('intent-form').addEventListener('submit', event => { event.preventDefault(); generateAssets(); });
  byId('preset').addEventListener('change', event => applyPreset(event.target.value));
  byId('reroll').addEventListener('click', () => { const value = new Uint32Array(1); crypto.getRandomValues(value); byId('seed').value = 1 + (value[0] % 2147483646); generateAssets(); });
  byId('copy-intent').addEventListener('click', async () => { if (!current) return; await navigator.clipboard.writeText(pretty(current.intent)); byId('copy-intent').textContent = '已复制'; setTimeout(() => { byId('copy-intent').textContent = '复制'; }, 1200); });
  byId('export-package').addEventListener('click', () => exportBundle().catch(error => { byId('export-status').textContent = error.message; }));
  document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', async () => { const backend = button.dataset.export; setBusy(true); try { const result = await exportBackend(backend); byId('export-status').textContent = `${result.record.filename} · ${Math.round(result.blob.size / 1024)} KB · SHA-256 已记录。`; } finally { setBusy(false); } }));
  document.querySelectorAll('[data-mode]').forEach((button, index, buttons) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
    button.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1; setMode(buttons[(index + step + buttons.length) % buttons.length].dataset.mode, { focus: true }); });
  });
  byId('style-form').addEventListener('submit', event => { event.preventDefault(); updateStyleProof(); });
  byId('style-capability').addEventListener('change', updateStyleProof);
  byId('item-form').addEventListener('submit', event => { event.preventDefault(); generateItem(); });
  byId('item-export').addEventListener('click', () => exportItem().catch(() => {}));
  byId('environment-form').addEventListener('submit', event => { event.preventDefault(); generateEnvironment(); });
  byId('environment-export').addEventListener('click', () => exportEnvironment().catch(() => {}));
  byId('scene-preset').addEventListener('change', event => applyScenePreset(event.target.value));
  byId('scene-form').addEventListener('submit', event => { event.preventDefault(); generateScenePlan(); });
  byId('scene-export').addEventListener('click', () => exportScenePackage().catch(() => {}));
  byId('usage-scene-preset').addEventListener('change', () => generateUsageProofs());
  byId('usage-refresh').addEventListener('click', () => generateUsageProofs());
  document.querySelectorAll('[data-usage-proof]').forEach((button, index, buttons) => {
    button.addEventListener('click', () => setUsageProof(button.dataset.usageProof));
    button.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const step = event.key === 'ArrowRight' ? 1 : -1; setUsageProof(buttons[(index + step + buttons.length) % buttons.length].dataset.usageProof, { focus: true }); });
  });
  document.querySelectorAll('[data-demand-filter]').forEach(button => button.addEventListener('click', () => setDemandFilter(button.dataset.demandFilter)));
}

populateControls();
renderStyleRegistry();
initializeRenderers();
wireEvents();
applyPreset(PRESETS[0].id, false);
applyScenePreset(SCENE_PRESETS[0].id, false);
await generateAssets();
setMode(params.get('mode') || 'character');

window.__assetLab = {
  compileIntent, generateAssets, exportBackend, exportBundle, setMode, updateStyleProof,
  generateItem, exportItem, generateEnvironment, exportEnvironment,
  matchSceneDemand, applyScenePreset, generateScenePlan, exportScenePackage,
  generateUsageProofs, setUsageProof, setDemandFilter, renderDemandBoard,
  get current() { return current; }, get currentItem() { return currentItem; }, get currentEnvironment() { return currentEnvironment; }, get currentScenePlan() { return currentScenePlan; }, get currentUsageStats() { return currentUsageStats; }, get renderers() { return renderers; },
  snapshot() {
    return {
      canRender, renderOff, busy, activeMode, assetId: current?.intent.assetId, seed: current?.intent.seed,
      species: current?.intent.species, fingerprint: current?.fingerprint, mapping: current?.mapping.map(item => item.level),
      nativeSeeds: current ? Object.values(current.nativeRecipes).map(recipe => recipe.seed) : [], readiness: document.querySelectorAll('.readiness-card').length,
      characterCanvases: document.querySelectorAll('.canvas-host canvas').length, canvases: document.querySelectorAll('.canvas-host canvas').length, styleCapabilities: STYLE_CAPABILITIES.length,
      itemFamilies: FAMILIES.length, itemRanks: ITEM_RANKS.length, environmentSpecies: ENVIRONMENT_SPECIES.length,
      environmentPalettes: ENVIRONMENT_PALETTES.length, itemFingerprint: currentItem ? itemManifest(currentItem).fingerprint : null,
      environmentFingerprint: currentEnvironment?.manifest.fingerprint ?? null, sceneFingerprint: currentScenePlan?.fingerprint ?? null, scenePresetCount: SCENE_PRESETS.length, usageProofCount: USAGE_PROOFS.length, activeUsageProof, usageWorldCanvas: document.querySelectorAll('#usage-world-stage canvas').length,
      usageWorldCalls: currentUsageStats?.world?.renderer.calls ?? null, usageWorldTriangles: currentUsageStats?.world?.renderer.triangles ?? null,
      demandFilter: activeDemandFilter, demandRows: document.querySelectorAll('#demand-table-body tr').length, demandCoverage: demandCoverage(activeUsageProof),
      scenePreviewCount: document.querySelectorAll('#scene-mode img[src]').length, sceneExplanationCount: document.querySelectorAll('.scene-explanation-row').length, fallbackVisible: !byId('render-fallback').hidden,
      capabilitySummary: capabilitySummary(),
    };
  },
};











