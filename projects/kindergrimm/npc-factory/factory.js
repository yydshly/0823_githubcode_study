import * as THREE from 'three';
import { U, setRender } from '../upstream/src/part.js';
import { buildContentCharacter } from '../runtime/visual-pipeline.js';
import {
  SCHEMA_VERSION,
  PROVENANCE,
  normalizeInput,
  buildRecipes,
  assetManifest,
  batchManifest as makeBatchManifest,
  sheetLayout,
  verifyBatch
} from '../runtime/npc-core.js';
import { createStoredZip, inspectStoredZip } from '../runtime/zip-store.js';
import {
  ORIGINAL_PACK_ID,
  listContentPacks,
  getContentPack,
  isOriginalContentPack,
  recipeMatchesContentPack
} from '../runtime/content-packs.js';
import {
  listOutputProfiles,
  getOutputProfile,
  outputProfileRecord
} from '../runtime/output-profiles.js';

THREE.ColorManagement.enabled = false;

const FLOOR_Y = -.92;
const PREVIEW_SIZE = 320;
const EXPORT_SIZE = 1024;
const SHEET_TILE = 256;

const dom = {
  form: document.querySelector('#generator-form'),
  seed: document.querySelector('#master-seed'),
  count: document.querySelector('#batch-size'),
  color: document.querySelector('#color-mode'),
  species: document.querySelector('#species'),
  media: document.querySelector('#media'),
  pack: document.querySelector('#content-pack'),
  packSummary: document.querySelector('#pack-summary'),
  packStatus: document.querySelector('#pack-status'),
  packName: document.querySelector('#pack-name'),
  packDescription: document.querySelector('#pack-description'),
  packSpecies: document.querySelector('#pack-species'),
  packMedia: document.querySelector('#pack-media'),
  packColor: document.querySelector('#pack-color'),
  packFingerprint: document.querySelector('#pack-fingerprint'),
  packRenderer: document.querySelector('#pack-renderer'),
  packRendererFingerprint: document.querySelector('#pack-renderer-fingerprint'),
  packPartCount: document.querySelector('#pack-part-count'),
  packCoverage: document.querySelector('#pack-coverage'),
  engineRenderer: document.querySelector('#engine-renderer'),
  generate: document.querySelector('#generate'),
  verify: document.querySelector('#verify-batch'),
  newSeed: document.querySelector('#new-seed'),
  savedOnly: document.querySelector('#saved-only'),
  grid: document.querySelector('#asset-grid'),
  status: document.querySelector('#factory-status'),
  generated: document.querySelector('#metric-generated'),
  unique: document.querySelector('#metric-unique'),
  saved: document.querySelector('#metric-saved'),
  time: document.querySelector('#metric-time'),
  inspectorTitle: document.querySelector('#inspector-title'),
  hero: document.querySelector('#hero-preview'),
  metaSeed: document.querySelector('#meta-seed'),
  metaSpecies: document.querySelector('#meta-species'),
  metaMedia: document.querySelector('#meta-media'),
  metaFingerprint: document.querySelector('#meta-fingerprint'),
  metaPack: document.querySelector('#meta-pack'),
  metaPackFingerprint: document.querySelector('#meta-pack-fingerprint'),
  metaRenderer: document.querySelector('#meta-renderer'),
  metaVisualFingerprint: document.querySelector('#meta-visual-fingerprint'),
  metaVisualParts: document.querySelector('#meta-visual-parts'),
  metaCoverage: document.querySelector('#meta-coverage'),
  recipe: document.querySelector('#recipe-preview code'),
  toggleSaved: document.querySelector('#toggle-saved'),
  copyJson: document.querySelector('#copy-json'),
  exportJson: document.querySelector('#export-json'),
  outputProfile: document.querySelector('#output-profile'),
  outputProfileDetail: document.querySelector('#output-profile-detail'),
  exportPng: document.querySelector('#export-png'),
  exportBatch: document.querySelector('#export-batch'),
  exportSheet: document.querySelector('#export-sheet'),
  exportBundle: document.querySelector('#export-bundle'),
  bundleDetail: document.querySelector('#bundle-detail'),
  canvas: document.querySelector('#render-canvas')
};

const state = {
  items: [],
  selected: null,
  saved: new Set(),
  building: false,
  renderer: null,
  scene: null,
  camera: null,
  webglError: null,
  lastInput: null,
  pack: getContentPack(ORIGINAL_PACK_ID),
  outputProfile: getOutputProfile('transparent-character'),
  freeInput: { species: 'all', media: 'all', color: 'auto' }
};

function initRenderer() {
  if (new URLSearchParams(window.location.search).get('webgl') === 'off') {
    state.webglError = new Error('WebGL disabled by verification flag');
    dom.exportPng.disabled = true;
    setStatus('error', 'WebGL 不可用：仍可生成和导出 Recipe，PNG 预览已关闭');
    return;
  }
  try {
    const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const half = 1.34;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, .1, 100);
    camera.position.set(0, -.28, 10);
    camera.lookAt(0, -.28, 0);

    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
  } catch (error) {
    state.webglError = error;
    dom.exportPng.disabled = true;
    setStatus('error', 'WebGL 不可用：仍可生成和导出 Recipe，PNG 预览已关闭');
  }
}

function readInput() {
  const input = normalizeInput({
    seed: dom.seed.value,
    count: Number(dom.count.value),
    color: dom.color.value,
    species: dom.species.value,
    media: dom.media.value
  });
  dom.seed.value = String(input.seed);
  return input;
}

function applyPackUi() {
  const pack = getContentPack(dom.pack.value);
  const wasLocked = state.pack.constraints.mode === 'locked';
  const locked = pack.constraints.mode === 'locked';
  if (locked && !wasLocked) {
    state.freeInput = { species: dom.species.value, media: dom.media.value, color: dom.color.value };
  }
  state.pack = pack;
  dom.species.querySelector('option[value="all"]').textContent = locked ? '由内容包限定' : '全部 · Seed 决定';
  dom.media.querySelector('option[value="all"]').textContent = locked ? '由内容包限定' : '全部 · Seed 决定';
  if (locked) {
    dom.species.value = 'all';
    dom.media.value = 'all';
    dom.color.value = pack.constraints.color;
  } else if (wasLocked) {
    dom.species.value = state.freeInput.species;
    dom.media.value = state.freeInput.media;
    dom.color.value = state.freeInput.color;
  } else {
    state.freeInput = { species: dom.species.value, media: dom.media.value, color: dom.color.value };
  }
  dom.packSummary.dataset.pack = pack.id;
  dom.packStatus.textContent = pack.status.replaceAll('-', ' ').toUpperCase();
  dom.packName.textContent = pack.presentation.name;
  dom.packDescription.textContent = pack.presentation.summary;
  dom.packSpecies.textContent = locked ? pack.constraints.species.join(' / ') : `${pack.constraints.species.length} / input`;
  dom.packMedia.textContent = locked ? pack.constraints.media.join(' / ') : `${pack.constraints.media.length} / input`;
  dom.packColor.textContent = locked ? pack.constraints.color : 'input-driven';
  dom.packFingerprint.textContent = pack.fingerprint;
  dom.packRenderer.textContent = pack.visual?.id ?? 'BASE ONLY';
  dom.packRendererFingerprint.textContent = pack.visual?.fingerprint ?? '—';
  dom.packPartCount.textContent = String(pack.visual?.features.length ?? 0);
  dom.packCoverage.textContent = pack.visual?.coverage ? `${Object.keys(pack.visual.coverage).length} GROUPS` : 'BASE';
  dom.engineRenderer.textContent = pack.visual?.kind === 'procedural-2d-core'
    ? `Independent ${pack.visual.features.length}-part Core`
    : pack.visual ? `Base + ${pack.visual.features.length}-part kit` : 'Base Canvas';
  dom.bundleDetail.textContent = isOriginalContentPack(pack)
    ? 'ZIP · MANIFEST + SHEET'
    : 'ZIP · MANIFEST + SHEET + PACK';
  dom.species.disabled = state.building || locked;
  dom.media.disabled = state.building || locked;
  dom.color.disabled = state.building || locked;
  return pack;
}
function applyCameraProfile(rawProfile) {
  const profile = getOutputProfile(rawProfile);
  const camera = state.camera;
  const previous = {
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
    y: camera.position.y
  };
  const half = profile.camera.half;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.position.y = profile.camera.centerY;
  camera.lookAt(0, profile.camera.centerY, 0);
  camera.updateProjectionMatrix();
  return function restoreCamera() {
    camera.left = previous.left;
    camera.right = previous.right;
    camera.top = previous.top;
    camera.bottom = previous.bottom;
    camera.position.y = previous.y;
    camera.lookAt(0, previous.y, 0);
    camera.updateProjectionMatrix();
  };
}

function renderRecipe(recipe, size, resolution, profileId = 'transparent-character') {
  if (!state.renderer) return null;
  setRender({ u: resolution, frames: 1 });
  state.renderer.setSize(size, size, false);
  state.renderer.setClearColor(0x000000, 0);
  const restoreCamera = applyCameraProfile(profileId);
  const face = buildContentCharacter(recipe, state.pack);
  try {
    face.group.position.y = FLOOR_Y + face.F.B.floorY / U;
    state.scene.add(face.group);
    state.renderer.render(state.scene, state.camera);
    return state.renderer.domElement.toDataURL('image/png');
  } finally {
    state.scene.remove(face.group);
    face.dispose();
    restoreCamera();
  }
}

function renderRecipeBlob(recipe, size, resolution, profileId = 'transparent-character') {
  if (!state.renderer) return Promise.reject(new Error('WebGL unavailable'));
  setRender({ u: resolution, frames: 1 });
  state.renderer.setSize(size, size, false);
  state.renderer.setClearColor(0x000000, 0);
  const restoreCamera = applyCameraProfile(profileId);
  const face = buildContentCharacter(recipe, state.pack);
  face.group.position.y = FLOOR_Y + face.F.B.floorY / U;
  state.scene.add(face.group);
  state.renderer.render(state.scene, state.camera);

  return new Promise((resolve, reject) => {
    state.renderer.domElement.toBlob(blob => {
      state.scene.remove(face.group);
      face.dispose();
      restoreCamera();
      blob ? resolve(blob) : reject(new Error('PNG encoding failed'));
    }, 'image/png');
  });
}

function setStatus(kind, message) {
  dom.status.dataset.state = kind;
  dom.status.querySelector('strong').textContent = message;
}

function setBuilding(building) {
  state.building = building;
  dom.generate.disabled = building;
  dom.pack.disabled = building;
  dom.verify.disabled = building || state.items.length === 0;
  dom.newSeed.disabled = building;
  dom.exportBatch.disabled = building || state.items.length === 0;
  dom.exportSheet.disabled = building || state.items.length === 0 || !state.renderer;
  dom.exportBundle.disabled = building || state.items.length === 0 || !state.renderer;
  dom.grid.setAttribute('aria-busy', String(building));
  applyPackUi();
}

function updateMetrics(time = null) {
  const visible = state.items;
  dom.generated.textContent = String(visible.length);
  dom.unique.textContent = String(new Set(visible.map(item => item.fingerprint)).size);
  dom.saved.textContent = String(state.saved.size);
  if (time !== null) dom.time.textContent = `${Math.round(time)}ms`;
}

function renderGrid() {
  const items = dom.savedOnly.checked
    ? state.items.filter(item => state.saved.has(item.fingerprint))
    : state.items;

  if (!items.length) {
    dom.grid.innerHTML = `<div class="empty-state">${state.items.length ? '当前批次还没有收藏角色。<br>取消“只看收藏”或先收藏一个 NPC。' : '设置生成参数，然后创建第一批真实 NPC。'}</div>`;
    return;
  }

  dom.grid.innerHTML = items.map(item => {
    const selected = state.selected?.fingerprint === item.fingerprint;
    const saved = state.saved.has(item.fingerprint);
    return `
      <button class="asset-card" type="button" data-fingerprint="${item.fingerprint}" aria-pressed="${selected}">
        ${item.preview
          ? `<img src="${item.preview}" alt="${item.recipe.species} ${item.recipe.media} NPC，Seed ${item.recipe.seed}">`
          : `<span class="asset-placeholder">RECIPE READY<br>NO WEBGL PREVIEW</span>`}
        ${saved ? '<span class="saved-mark" aria-label="已收藏">★</span>' : ''}
        <span class="asset-card-copy">
          <small>NPC ${String(item.index + 1).padStart(2, '0')} · ${item.recipe.species}</small>
          <strong>${item.recipe.media} / ${item.recipe.base}</strong>
          <span>#${item.fingerprint}${item.visual ? ` · V#${item.visual.fingerprint} · ${item.visual.addedParts.length}P` : ``}</span>
        </span>
      </button>`;
  }).join('');

  dom.grid.querySelectorAll('[data-fingerprint]').forEach(button => {
    button.addEventListener('click', () => selectItem(button.dataset.fingerprint));
  });
}

function recipeSummary(item) {
  const { recipe } = item;
  const active = Object.entries(recipe.parts)
    .filter(([, slot]) => slot.params && !['none', false].includes(slot.params.style))
    .slice(0, 8)
    .map(([id, slot]) => ({ id, ...slot.params }));
  return JSON.stringify({
    schemaVersion: 'kindergrimm-research/0.1',
    seed: recipe.seed,
    species: recipe.species,
    media: recipe.media,
    color: recipe.color,
    base: recipe.base,
    visual: item.visual ?? undefined,
    parts: active
  }, null, 2);
}

function selectItem(value) {
  state.selected = state.items.find(item => item.fingerprint === value) || null;
  const item = state.selected;
  renderGrid();
  if (!item) return;

  dom.inspectorTitle.textContent = `NPC ${String(item.index + 1).padStart(2, '0')}`;
  dom.hero.innerHTML = item.preview
    ? `<img src="${item.preview}" alt="选中的 ${item.recipe.species} NPC">`
    : '<span>Recipe 已生成<br>当前浏览器没有 WebGL 预览</span>';
  dom.metaSeed.textContent = String(item.recipe.seed);
  dom.metaSpecies.textContent = item.recipe.species;
  dom.metaMedia.textContent = item.recipe.media;
  dom.metaFingerprint.textContent = item.fingerprint;
  dom.metaPack.textContent = state.pack.id;
  dom.metaPackFingerprint.textContent = state.pack.fingerprint;
  dom.metaRenderer.textContent = item.visual?.rendererId ?? 'kindergrimm-drawn-2d';
  dom.metaVisualFingerprint.textContent = item.visual?.fingerprint ?? '—';
  dom.metaVisualParts.textContent = String(item.visual?.addedParts.length ?? 0);
  dom.metaCoverage.textContent = item.visual ? `${Object.keys(state.pack.visual?.coverage ?? {}).length} GROUPS` : 'BASE';
  dom.recipe.textContent = recipeSummary(item);
  dom.toggleSaved.disabled = false;
  dom.copyJson.disabled = false;
  dom.exportJson.disabled = false;
  dom.exportPng.disabled = !state.renderer;
  updateSavedButton();
  if (state.outputProfile.id !== 'transparent-character') previewSelectedOutput();
}

function updateSavedButton() {
  if (!state.selected) return;
  const saved = state.saved.has(state.selected.fingerprint);
  dom.toggleSaved.textContent = saved ? '★ 取消收藏' : '☆ 收藏角色';
  dom.toggleSaved.setAttribute('aria-pressed', String(saved));
}

async function generateBatch() {
  if (state.building) return;
  const pack = applyPackUi();
  const input = readInput();
  state.lastInput = input;
  setBuilding(true);
  setStatus('working', `正在构建 ${input.count} 个真实角色…`);
  const started = performance.now();
  state.items = buildRecipes(input, pack);
  state.selected = null;
  renderGrid();

  if (state.renderer) {
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      item.preview = renderRecipe(item.recipe, PREVIEW_SIZE, 104);
      setStatus('working', `正在绘制 NPC ${i + 1} / ${state.items.length}`);
      if (i % 2 === 1) {
        renderGrid();
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
  }

  const elapsed = performance.now() - started;
  updateMetrics(elapsed);
  selectItem(state.items[0]?.fingerprint);
  setBuilding(false);
  const uniqueCount = new Set(state.items.map(item => item.fingerprint)).size;
  setStatus(state.renderer ? 'success' : 'error', state.renderer
    ? `${state.items.length} 个 NPC 已完成；${uniqueCount} 个唯一 Recipe${pack.visual ? ` + ${pack.visual.features.length}P ${pack.visual.kind === 'procedural-2d-core' ? 'independent Core' : 'kit'} / 角色` : ``} · ${pack.presentation.shortName}`
    : `${state.items.length} 个 Recipe 已完成；${uniqueCount} 个唯一 Recipe · ${pack.presentation.shortName}；WebGL 不可用，PNG 预览已关闭`);
}

function verifyDeterminism() {
  if (!state.lastInput || !state.items.length) return;
  const current = state.items.map(item => item.fingerprint);
  const pass = verifyBatch(state.items, state.lastInput, state.pack);
  setStatus(pass ? 'success' : 'error', pass
    ? `确定性通过：${current.length}/${current.length} 个 Recipe${state.pack.visual ? ` + Visual` : ``} 指纹按顺序一致`
    : '确定性失败：重复输入产生了不同 Recipe');
}

function manifestFor(item) {
  const asset = assetManifest(item);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generator: { name: 'kindergrimm', ...PROVENANCE },
    asset: {
      id: asset.id,
      fingerprint: asset.fingerprint,
      batchIndex: asset.batchIndex,
      representation: asset.representation
    },
    recipe: item.recipe
  };
  const profile = state.outputProfile;
  const dimensions = profile.batch
    ? sheetLayout(state.items.length, profile.tileSize)
    : { width: profile.width, height: profile.height };
  manifest.output = outputRecordFor(profile, dimensions.width, dimensions.height);
  if (!isOriginalContentPack(state.pack)) manifest.contentPack = state.pack;
  return manifest;
}

function batchBasename() {
  const suffix = isOriginalContentPack(state.pack) ? '' : `-${state.pack.id}`;
  return `npc-batch-${state.lastInput.seed}${suffix}`;
}
function exportBatchJson() {
  if (!state.items.length || !state.lastInput) return;
  const manifest = makeBatchManifest(state.items, state.lastInput, sheetLayout(state.items.length, SHEET_TILE), state.pack);
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${batchBasename()}.json`);
  setStatus('success', `批次 Manifest 已导出：${state.items.length} 个资产 · Seed ${state.lastInput.seed}`);
}

function imageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('预览图加载失败'));
    image.src = src;
  });
}

async function buildSpritesheet() {
  if (!state.renderer || state.items.some(item => !item.preview)) throw new Error('WebGL 预览不完整');
  const layout = sheetLayout(state.items.length, SHEET_TILE);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(state.items.map(item => imageFromUrl(item.preview)));
  images.forEach((image, index) => {
    const x = (index % layout.columns) * layout.tileSize;
    const y = Math.floor(index / layout.columns) * layout.tileSize;
    ctx.drawImage(image, x, y, layout.tileSize, layout.tileSize);
  });
  return { canvas, layout };
}

function outputRecordFor(profile, width, height) {
  return outputProfileRecord({
    profileId: profile.id,
    width,
    height,
    assetFingerprint: profile.batch ? null : state.selected?.fingerprint ?? null,
    visualFingerprint: profile.batch ? null : state.selected?.visual?.fingerprint ?? null,
    packFingerprint: state.pack.fingerprint,
    rendererFingerprint: state.pack.visual?.fingerprint ?? null
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 编码失败')), 'image/png');
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('PNG 预览读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function buildCardCatalogOutput(profile) {
  const canvas = document.createElement('canvas');
  canvas.width = profile.width;
  canvas.height = profile.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = profile.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#17352f';
  ctx.fillRect(34, 34, canvas.width - 68, canvas.height - 68);
  ctx.fillStyle = '#f7efd9';
  ctx.fillRect(48, 48, canvas.width - 96, canvas.height - 96);
  const source = renderRecipe(state.selected.recipe, 640, 220, 'transparent-character');
  const image = await imageFromUrl(source);
  ctx.drawImage(image, 64, 72, 640, 640);
  ctx.fillStyle = '#17352f';
  ctx.font = '800 18px ui-monospace, Consolas, monospace';
  ctx.fillText('KINDERGRIMM / CHARACTER CATALOG', 76, 764);
  ctx.font = '800 38px Inter, system-ui, sans-serif';
  ctx.fillText('NPC ' + String(state.selected.index + 1).padStart(2, '0'), 76, 818);
  ctx.font = '700 18px ui-monospace, Consolas, monospace';
  ctx.fillStyle = '#6c665a';
  ctx.fillText(state.selected.recipe.species.toUpperCase() + ' / ' + state.selected.recipe.media.toUpperCase(), 76, 858);
  ctx.fillText('ASSET #' + state.selected.fingerprint + '  VISUAL #' + (state.selected.visual?.fingerprint ?? 'BASE'), 76, 894);
  ctx.fillStyle = '#d46f52';
  ctx.fillRect(76, 922, 128, 8);
  const blob = await canvasToBlob(canvas);
  return {
    profile,
    blob,
    canvas,
    width: canvas.width,
    height: canvas.height,
    record: outputRecordFor(profile, canvas.width, canvas.height)
  };
}

async function buildSelectedOutput(rawProfile) {
  if (!state.selected || !state.renderer) throw new Error('角色或 WebGL 预览不可用');
  const profile = getOutputProfile(rawProfile);
  if (profile.id === 'sprite-sheet') {
    const result = await buildSpritesheet();
    return {
      profile,
      blob: await canvasToBlob(result.canvas),
      canvas: result.canvas,
      width: result.canvas.width,
      height: result.canvas.height,
      layout: result.layout,
      record: outputRecordFor(profile, result.canvas.width, result.canvas.height)
    };
  }
  if (profile.id === 'card-catalog') return buildCardCatalogOutput(profile);
  const blob = await renderRecipeBlob(state.selected.recipe, profile.width, Math.round(profile.width * .255), profile.id);
  return {
    profile,
    blob,
    canvas: null,
    width: profile.width,
    height: profile.height,
    record: outputRecordFor(profile, profile.width, profile.height)
  };
}

async function previewSelectedOutput() {
  if (!state.selected || !state.renderer) return;
  const profile = state.outputProfile;
  if (profile.id === 'transparent-character') {
    dom.hero.innerHTML = '<img src="' + state.selected.preview + '" alt="透明全身角色预览">';
    return;
  }
  const selectedFingerprint = state.selected.fingerprint;
  dom.hero.innerHTML = '<span>正在构建 ' + profile.label + '…</span>';
  try {
    const output = await buildSelectedOutput(profile);
    if (state.selected?.fingerprint !== selectedFingerprint || state.outputProfile.id !== profile.id) return;
    const dataUrl = output.canvas ? output.canvas.toDataURL('image/png') : await blobToDataUrl(output.blob);
    dom.hero.innerHTML = '<img src="' + dataUrl + '" alt="' + profile.label + ' 输出预览">';
  } catch (error) {
    dom.hero.innerHTML = '<span>输出预览失败<br>' + error.message + '</span>';
  }
}

function updateOutputProfileUi(preview = true) {
  state.outputProfile = getOutputProfile(dom.outputProfile.value);
  const profile = state.outputProfile;
  const dimensions = profile.batch ? profile.tileSize + 'px TILES' : profile.width + '×' + profile.height;
  dom.outputProfileDetail.textContent = profile.role.replaceAll('-', ' ').toUpperCase() + ' · ' + dimensions + ' · ' + profile.background;
  dom.exportPng.textContent = profile.batch
    ? '导出 Sprite Sheet'
    : '导出 ' + profile.label + ' · ' + dimensions;
  if (preview) previewSelectedOutput();
}

async function exportSpritesheet() {
  if (!state.items.length || !state.renderer || !state.lastInput) return;
  dom.exportSheet.disabled = true;
  setStatus('working', `正在拼装 ${state.items.length} 格透明 Sprite Sheet…`);
  try {
    const { canvas, layout } = await buildSpritesheet();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 编码失败')), 'image/png'));
    downloadBlob(blob, `${batchBasename()}-spritesheet.png`);
    setStatus('success', `Sprite Sheet 已导出：${layout.width}×${layout.height} · ${state.items.length} 格透明 PNG`);
  } catch (error) {
    setStatus('error', `Sprite Sheet 导出失败：${error.message}`);
  } finally {
    dom.exportSheet.disabled = !state.renderer || state.building;
  }
}

async function buildAssetBundle() {
  if (!state.items.length || !state.renderer || !state.lastInput) throw new Error('批次或 WebGL 预览不可用');
  const { canvas, layout } = await buildSpritesheet();
  const sheetBlob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 编码失败')), 'image/png'));
  const manifest = makeBatchManifest(state.items, state.lastInput, layout, state.pack);
  const packText = isOriginalContentPack(state.pack) ? null : JSON.stringify(state.pack, null, 2);
  const outputRecords = listOutputProfiles().map(profile => {
    const dimensions = profile.batch ? layout : profile;
    return outputRecordFor(profile, dimensions.width, dimensions.height);
  });
  const outputProfilesText = JSON.stringify({
    schemaVersion: 'kindergrimm-output-bundle/0.1',
    assetFingerprint: state.selected?.fingerprint ?? null,
    visualFingerprint: state.selected?.visual?.fingerprint ?? null,
    records: outputRecords
  }, null, 2);
  const bundleFiles = [
    { path: 'manifest.json', role: 'source-of-truth' },
    { path: 'spritesheet.png', role: 'transparent-preview-atlas', bytes: sheetBlob.size },
    { path: 'output-profiles.json', role: 'deterministic-output-lineage', bytes: new TextEncoder().encode(outputProfilesText).length }
  ];
  if (packText) bundleFiles.push({ path: 'content-pack.json', role: 'art-direction-contract', bytes: new TextEncoder().encode(packText).length });
  manifest.bundle = {
    schemaVersion: 'kindergrimm-bundle/0.1',
    compression: 'store',
    files: bundleFiles
  };
  const manifestText = JSON.stringify(manifest, null, 2);
  const zipFiles = [
    { name: 'manifest.json', data: manifestText },
    { name: 'spritesheet.png', data: sheetBlob },
    { name: 'output-profiles.json', data: outputProfilesText }
  ];
  if (packText) zipFiles.push({ name: 'content-pack.json', data: packText });
  const zip = await createStoredZip(zipFiles);
  return { zip, manifest, manifestText, sheetBlob, packText, outputProfilesText, outputRecords, layout };
}

async function exportBundle() {
  if (!state.items.length || !state.renderer || !state.lastInput) return;
  dom.exportBundle.disabled = true;
  setStatus('working', `正在打包 ${state.items.length} 个资产与透明 Sprite Sheet…`);
  try {
    const { zip } = await buildAssetBundle();
    downloadBlob(zip, `${batchBasename()}-bundle.zip`);
    const packFile = isOriginalContentPack(state.pack) ? '' : ' + content-pack.json';
    setStatus('success', `ZIP Bundle 已导出：manifest.json + spritesheet.png + output-profiles.json${packFile} · ${Math.round(zip.size / 1024)}KB`);
  } catch (error) {
    setStatus('error', `ZIP Bundle 导出失败：${error.message}`);
  } finally {
    dom.exportBundle.disabled = !state.renderer || state.building;
  }
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

async function exportPng() {
  if (!state.selected || !state.renderer) return;
  const profile = state.outputProfile;
  dom.exportPng.disabled = true;
  setStatus('working', '正在导出 NPC #' + state.selected.fingerprint + ' 的 ' + profile.label + '…');
  try {
    const output = await buildSelectedOutput(profile);
    const filename = profile.batch
      ? batchBasename() + '-sprite-sheet.png'
      : 'npc-' + state.selected.fingerprint + '-' + profile.id + '.png';
    downloadBlob(output.blob, filename);
    setStatus('success', 'PNG 已导出：' + filename + ' · ' + output.width + '×' + output.height + ' · OUTPUT #' + output.record.fingerprint);
  } catch (error) {
    setStatus('error', 'PNG 导出失败：' + error.message);
  } finally {
    dom.exportPng.disabled = !state.renderer;
  }
}

function exportJson() {
  if (!state.selected) return;
  const blob = new Blob([JSON.stringify(manifestFor(state.selected), null, 2)], { type: 'application/json' });
  downloadBlob(blob, `npc-${state.selected.fingerprint}.json`);
  setStatus('success', `Recipe 已导出：npc-${state.selected.fingerprint}.json`);
}

async function copyJson() {
  if (!state.selected) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(manifestFor(state.selected), null, 2));
    setStatus('success', `NPC #${state.selected.fingerprint} 的 Recipe 已复制`);
  } catch {
    setStatus('error', '浏览器拒绝剪贴板访问，请使用“下载 JSON”');
  }
}

dom.form.addEventListener('submit', event => {
  event.preventDefault();
  generateBatch();
});

dom.pack.addEventListener('change', () => {
  applyPackUi();
  generateBatch();
});
dom.verify.addEventListener('click', verifyDeterminism);
dom.newSeed.addEventListener('click', () => {
  dom.seed.value = String((Number(dom.seed.value) + 104729) % 1000000000);
  generateBatch();
});
dom.savedOnly.addEventListener('change', renderGrid);
dom.toggleSaved.addEventListener('click', () => {
  if (!state.selected) return;
  const id = state.selected.fingerprint;
  state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  updateSavedButton();
  updateMetrics();
  renderGrid();
  setStatus('success', state.saved.has(id) ? `NPC #${id} 已收藏` : `NPC #${id} 已取消收藏`);
});
dom.copyJson.addEventListener('click', copyJson);
dom.exportJson.addEventListener('click', exportJson);
dom.outputProfile.addEventListener('change', () => updateOutputProfileUi(true));
dom.exportPng.addEventListener('click', exportPng);
dom.exportBatch.addEventListener('click', exportBatchJson);
dom.exportSheet.addEventListener('click', exportSpritesheet);
dom.exportBundle.addEventListener('click', exportBundle);

window.__npcFactory = {
  state: () => ({
    generated: state.items.length,
    unique: new Set(state.items.map(item => item.fingerprint)).size,
    selected: state.selected?.fingerprint ?? null,
    saved: [...state.saved],
    webgl: Boolean(state.renderer),
    packId: state.pack.id,
    packFingerprint: state.pack.fingerprint,
    packStatus: state.pack.status,
    rendererId: state.pack.visual?.id ?? 'kindergrimm-drawn-2d',
    rendererFingerprint: state.pack.visual?.fingerprint ?? null,
    outputProfile: state.outputProfile.id,
    visualCount: state.items.filter(item => item.visual).length,
    visualPartCount: state.pack.visual?.features.length ?? 0,
    coverageGroups: Object.keys(state.pack.visual?.coverage ?? {}).length,
    visualFingerprints: state.items.map(item => item.visual?.fingerprint ?? null),
    packConstraintMatch: state.items.every(item => recipeMatchesContentPack(item.recipe, state.pack))
  }),
  manifest: () => state.selected ? manifestFor(state.selected) : null,
  batchManifest: () => state.items.length && state.lastInput
    ? makeBatchManifest(state.items, state.lastInput, sheetLayout(state.items.length, SHEET_TILE), state.pack)
    : null,
  verifyDeterminism: () => {
    if (!state.lastInput || !state.items.length) return false;
    return verifyBatch(state.items, state.lastInput, state.pack);
  },
  packs: () => listContentPacks(),
  outputProfiles: () => listOutputProfiles(),
  selectOutputProfile: async id => {
    dom.outputProfile.value = getOutputProfile(id).id;
    updateOutputProfileUi(false);
    await previewSelectedOutput();
    return window.__npcFactory.inspectOutputProfile(id);
  },
  inspectOutputProfile: async id => {
    if (!state.selected || !state.renderer) return null;
    const output = await buildSelectedOutput(id);
    let cornerAlpha = null;
    if (output.canvas) {
      cornerAlpha = output.canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3];
    } else {
      const dataUrl = await blobToDataUrl(output.blob);
      const image = await imageFromUrl(dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = output.width;
      canvas.height = output.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      cornerAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
    }
    return {
      profile: output.profile,
      width: output.width,
      height: output.height,
      bytes: output.blob.size,
      cornerAlpha,
      layout: output.layout ?? null,
      record: output.record
    };
  },
  previewOutputProfile: async id => {
    if (!state.selected || !state.renderer) return null;
    const output = await buildSelectedOutput(id);
    return output.canvas ? output.canvas.toDataURL('image/png') : blobToDataUrl(output.blob);
  },
  inspectPack: () => ({
    ...state.pack,
    recipesMatch: state.items.every(item => recipeMatchesContentPack(item.recipe, state.pack))
  }),
  inspectRendererAudit: () => {
    const item = state.selected || state.items[0];
    if (!item || !state.renderer) return null;
    const face = buildContentCharacter(item.recipe, state.pack);
    const audit = face.rendererAudit ? { ...face.rendererAudit, featurePlanes: { ...face.rendererAudit.featurePlanes } } : {
      rendererId: state.pack.visual?.id ?? 'kindergrimm-drawn-2d',
      independent: false,
      visiblePartPlanes: face.entries.length,
      authoredPartPlanes: face.entries.filter(entry => entry.authoredBy).length,
      upstreamVisiblePartPlanes: face.entries.filter(entry => !entry.authoredBy).length
    };
    face.dispose();
    return audit;
  },
  selectPack: async id => {
    dom.pack.value = id;
    applyPackUi();
    await generateBatch();
    return window.__npcFactory.state();
  },
  inspectSheet: async () => {
    if (!state.renderer || !state.items.length) return null;
    const { canvas, layout } = await buildSpritesheet();
    return {
      ...layout,
      mime: canvas.toDataURL('image/png').slice(5, 14),
      cornerAlpha: canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3],
      fingerprints: state.items.map(item => item.fingerprint)
    };
  },
  inspectBundle: async () => {
    if (!state.renderer || !state.items.length) return null;
    const bundle = await buildAssetBundle();
    return {
      ...(await inspectStoredZip(bundle.zip)),
      batchCount: bundle.manifest.batch.count,
      unique: bundle.manifest.batch.unique,
      layout: bundle.layout,
      manifestBytes: new TextEncoder().encode(bundle.manifestText).length,
      spritesheetBytes: bundle.sheetBlob.size,
      contentPackBytes: bundle.packText ? new TextEncoder().encode(bundle.packText).length : 0,
      outputProfilesBytes: new TextEncoder().encode(bundle.outputProfilesText).length,
      outputRecords: bundle.outputRecords,
      packId: state.pack.id,
      rendererId: state.pack.visual?.id ?? 'kindergrimm-drawn-2d',
      rendererFingerprint: state.pack.visual?.fingerprint ?? null,
      visualFingerprints: bundle.manifest.assets.map(asset => asset.visual?.fingerprint ?? null)
    };
  },
  inspectPng: () => {
    if (!state.selected || !state.renderer) return null;
    const dataUrl = renderRecipe(state.selected.recipe, EXPORT_SIZE, 260);
    const gl = state.renderer.getContext();
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return {
      width: state.renderer.domElement.width,
      height: state.renderer.domElement.height,
      mime: dataUrl.slice(5, dataUrl.indexOf(';')),
      dataUrlLength: dataUrl.length,
      cornerAlpha: pixel[3],
      rendererId: state.pack.visual?.id ?? 'kindergrimm-drawn-2d',
      visualFingerprint: state.selected.visual?.fingerprint ?? null
    };
  }
};

const outputProfileOptions = listOutputProfiles().map(profile => {
  const option = document.createElement('option');
  option.value = profile.id;
  option.textContent = profile.label;
  return option;
});
dom.outputProfile.replaceChildren(...outputProfileOptions);
dom.outputProfile.value = state.outputProfile.id;
updateOutputProfileUi(false);

const packOptions = listContentPacks().map(pack => {
  const option = document.createElement('option');
  option.value = pack.id;
  option.textContent = `${pack.presentation.name} · ${pack.presentation.label}`;
  return option;
});
dom.pack.replaceChildren(...packOptions);
const initialParams = new URLSearchParams(location.search);
const requestedPack = initialParams.get('pack');
if (requestedPack && listContentPacks().some(pack => pack.id === requestedPack)) dom.pack.value = requestedPack;
applyPackUi();
initRenderer();
generateBatch();
