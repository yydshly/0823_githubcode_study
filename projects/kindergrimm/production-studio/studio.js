import * as THREE from 'three';
import { U, setRender } from '../upstream/src/part.js';
import { createAnimator } from '../upstream/src/anim.js';
import { buildContentCharacter, contentVisualRecord } from '../runtime/visual-pipeline.js';
import {
  PROVENANCE,
  normalizeInput,
  deriveRecipe,
  fingerprint,
  buildRecipes,
  batchManifest,
  sheetLayout,
  verifyBatch,
  validateBatchManifest
} from '../runtime/npc-core.js';
import {
  ORIGINAL_PACK_ID,
  MOSSLIGHT_CORE_PACK_ID,
  MOONHARBOR_INKCUT_PACK_ID,
  SUNPATCH_FELT_PACK_ID,
  getContentPack,
  validateContentPack
} from '../runtime/content-packs.js';
import {
  CONTRACT_SCHEMAS,
  contractFingerprint,
  releaseCandidateSnapshot,
  validateReleaseCandidateContract
} from '../runtime/contracts.js';
import { createStoredZip, inspectStoredZip, crc32 } from '../runtime/zip-store.js';
import {
  listOutputProfiles,
  getOutputProfile,
  outputProfileRecord
} from '../runtime/output-profiles.js';

THREE.ColorManagement.enabled = false;

const STUDIO_SCHEMA = 'kindergrimm-production-studio/0.1';
const STUDIO_VERSION = '0.1.0';
const STORAGE_KEY = STUDIO_SCHEMA;
const FLOOR_Y = -.92;
const PREVIEW_SIZE = 420;
const SHEET_TILE = 256;
const ROUTES = Object.freeze([
  { key: 'original', id: ORIGINAL_PACK_ID },
  { key: 'decorator', id: 'mosslight-waystation' },
  { key: 'core', id: MOSSLIGHT_CORE_PACK_ID },
  { key: 'inkcut', id: MOONHARBOR_INKCUT_PACK_ID },
  { key: 'felt', id: SUNPATCH_FELT_PACK_ID }
]);

const dom = {
  form: document.querySelector('#author-form'),
  seed: document.querySelector('#master-seed'),
  slot: document.querySelector('#compare-slot'),
  count: document.querySelector('#batch-count'),
  version: document.querySelector('#candidate-version'),
  dirty: document.querySelector('#dirty-badge'),
  generate: document.querySelector('#generate-draft'),
  restore: document.querySelector('#restore-session'),
  reset: document.querySelector('#reset-session'),
  exportSession: document.querySelector('#export-session'),
  packFingerprint: document.querySelector('#pack-fingerprint'),
  rendererFingerprint: document.querySelector('#renderer-fingerprint'),
  status: document.querySelector('#studio-status'),
  compareTime: document.querySelector('#compare-time'),
  webglStatus: document.querySelector('#webgl-status'),
  revision: document.querySelector('#revision-count'),
  reviewState: document.querySelector('#review-state'),
  reviewNotes: document.querySelector('#review-notes'),
  reviewCopy: document.querySelector('#review-copy'),
  approve: document.querySelector('#approve-candidate'),
  reject: document.querySelector('#reject-candidate'),
  candidatePack: document.querySelector('#candidate-pack'),
  candidateRenderer: document.querySelector('#candidate-renderer'),
  candidateRecipe: document.querySelector('#candidate-recipe'),
  candidateVisual: document.querySelector('#candidate-visual'),
  candidatePlanes: document.querySelector('#candidate-planes'),
  sessionState: document.querySelector('#session-state'),
  gateSummary: document.querySelector('#gate-summary'),
  gateList: document.querySelector('#gate-list'),
  runGates: document.querySelector('#run-gates'),
  releaseTitle: document.querySelector('#rc-title'),
  releaseCopy: document.querySelector('#release-copy'),
  releaseBuild: document.querySelector('#build-release'),
  rcFingerprint: document.querySelector('#rc-fingerprint'),
  rcSize: document.querySelector('#rc-size'),
  rcFiles: document.querySelector('#rc-files'),
  rcCrc: document.querySelector('#rc-crc'),
  downloadRcJson: document.querySelector('#download-rc-json'),
  downloadRcZip: document.querySelector('#download-rc-zip'),
  outputIdentity: document.querySelector('#output-identity'),
  canvas: document.querySelector('#render-canvas')
};

const outputDom = Object.fromEntries(listOutputProfiles().map(profile => [profile.id, {
  image: document.querySelector('#output-' + profile.id),
  dimensions: document.querySelector('#output-' + profile.id + '-dimensions'),
  fingerprint: document.querySelector('#output-' + profile.id + '-fingerprint')
}]));

const routeDom = Object.fromEntries(ROUTES.map(route => [route.key, {
  image: document.querySelector(`#preview-${route.key}`),
  recipe: document.querySelector(`#recipe-${route.key}`),
  visual: document.querySelector(`#visual-${route.key}`),
  traits: document.querySelector(`#traits-${route.key}`),
  source: document.querySelector(`#source-${route.key}`)
}]));

const corePack = getContentPack(MOSSLIGHT_CORE_PACK_ID);
const state = {
  renderer: null,
  scene: null,
  camera: null,
  webglError: null,
  building: false,
  revision: 0,
  inputDirty: false,
  draft: null,
  comparison: {},
  outputShowcase: {},
  coreItems: [],
  manifest: null,
  compareMs: 0,
  review: { decision: 'pending', notes: '', reviewedAt: null, revision: null },
  gates: [],
  releaseCandidate: null,
  releaseZip: null,
  releaseInspection: null,
  releaseBuildMs: 0
};

function setStatus(kind, message) {
  dom.status.dataset.state = kind;
  dom.status.querySelector('strong').textContent = message;
}

function setBusy(value) {
  state.building = value;
  for (const control of [dom.generate, dom.restore, dom.reset, dom.runGates, dom.approve, dom.reject, dom.releaseBuild]) control.disabled = value || control.dataset.locked === 'true';
  dom.form.setAttribute('aria-busy', String(value));
}

function initRenderer() {
  if (new URLSearchParams(location.search).get('webgl') === 'off') {
    state.webglError = new Error('WebGL disabled by query');
    dom.webglStatus.textContent = 'OFF';
    document.body.dataset.webgl = 'off';
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
    dom.webglStatus.textContent = 'ON';
    document.body.dataset.webgl = 'on';
  } catch (error) {
    state.webglError = error;
    dom.webglStatus.textContent = 'OFF';
    document.body.dataset.webgl = 'off';
  }
}

function formValue() {
  const version = dom.version.value.trim();
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('RC version 必须是 x.y.z');
  return {
    seed: Math.max(0, Math.min(999999999, Number(dom.seed.value) || 240824)),
    slot: Math.max(0, Math.min(49, Number(dom.slot.value) || 0)),
    count: [8, 12, 24].includes(Number(dom.count.value)) ? Number(dom.count.value) : 12,
    version
  };
}

function batchInput(draft) {
  return normalizeInput({ seed: draft.seed, count: draft.count, species: 'all', media: 'all', color: 'auto' });
}

function auditCharacter(recipe, pack) {
  const face = buildContentCharacter(recipe, pack);
  const audit = face.rendererAudit ? JSON.parse(JSON.stringify(face.rendererAudit)) : {
    rendererId: pack.visual?.id ?? 'kindergrimm-drawn-2d',
    independent: false,
    visiblePartPlanes: face.entries.length,
    authoredPartPlanes: face.entries.filter(entry => entry.authoredBy).length,
    upstreamVisiblePartPlanes: face.entries.filter(entry => !entry.authoredBy).length
  };
  face.dispose();
  return audit;
}

function applyCameraProfile(rawProfile) {
  const profile = getOutputProfile(rawProfile);
  const camera = state.camera;
  const previous = { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom, y: camera.position.y };
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

function renderCharacter(recipe, pack, size = PREVIEW_SIZE, resolution = 104, profileId = 'transparent-character') {
  if (!state.renderer) return { dataUrl: null, audit: auditCharacter(recipe, pack) };
  setRender({ u: resolution, frames: 1 });
  state.renderer.setSize(size, size, false);
  state.renderer.setClearColor(0x000000, 0);
  const restoreCamera = applyCameraProfile(profileId);
  const face = buildContentCharacter(recipe, pack);
  face.group.position.y = FLOOR_Y + face.F.B.floorY / U;
  state.scene.add(face.group);
  state.renderer.render(state.scene, state.camera);
  const dataUrl = state.renderer.domElement.toDataURL('image/png');
  const audit = face.rendererAudit ? JSON.parse(JSON.stringify(face.rendererAudit)) : {
    rendererId: pack.visual?.id ?? 'kindergrimm-drawn-2d',
    independent: false,
    visiblePartPlanes: face.entries.length,
    authoredPartPlanes: face.entries.filter(entry => entry.authoredBy).length,
    upstreamVisiblePartPlanes: face.entries.filter(entry => !entry.authoredBy).length
  };
  state.scene.remove(face.group);
  face.dispose();
  restoreCamera();
  return { dataUrl, audit };
}

function outputImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('输出预览图加载失败'));
    image.src = src;
  });
}

async function buildOutputShowcase(result) {
  const profiles = listOutputProfiles();
  const showcase = {};
  const identity = {
    assetFingerprint: result.fingerprint,
    visualFingerprint: result.visual?.fingerprint ?? null,
    packFingerprint: result.pack.fingerprint,
    rendererFingerprint: result.pack.visual?.fingerprint ?? null
  };
  for (const profile of profiles) {
    const width = profile.width || profile.tileSize;
    const height = profile.height || profile.tileSize;
    showcase[profile.id] = {
      profile,
      width,
      height,
      dataUrl: null,
      record: outputProfileRecord({ profileId: profile.id, width, height, ...identity })
    };
  }
  if (!state.renderer) return showcase;

  showcase['transparent-character'].dataUrl = renderCharacter(result.recipe, result.pack, 1024, 260, 'transparent-character').dataUrl;
  showcase['portrait-avatar'].dataUrl = renderCharacter(result.recipe, result.pack, 512, 180, 'portrait-avatar').dataUrl;
  const sourceImage = await outputImageFromUrl(showcase['transparent-character'].dataUrl);

  const card = document.createElement('canvas');
  card.width = 768;
  card.height = 1024;
  const cardCtx = card.getContext('2d');
  cardCtx.fillStyle = '#f1e7cf';
  cardCtx.fillRect(0, 0, card.width, card.height);
  cardCtx.fillStyle = '#17352f';
  cardCtx.fillRect(34, 34, card.width - 68, card.height - 68);
  cardCtx.fillStyle = '#f7efd9';
  cardCtx.fillRect(48, 48, card.width - 96, card.height - 96);
  cardCtx.drawImage(sourceImage, 64, 72, 640, 640);
  cardCtx.fillStyle = '#17352f';
  cardCtx.font = '800 18px ui-monospace, Consolas, monospace';
  cardCtx.fillText('KINDERGRIMM / OUTPUT PROOF', 76, 764);
  cardCtx.font = '800 36px Inter, system-ui, sans-serif';
  cardCtx.fillText('SUNPATCH FELT', 76, 818);
  cardCtx.font = '700 17px ui-monospace, Consolas, monospace';
  cardCtx.fillStyle = '#6c665a';
  cardCtx.fillText('ASSET #' + result.fingerprint + ' / VISUAL #' + result.visual.fingerprint, 76, 862);
  cardCtx.fillStyle = '#d46f52';
  cardCtx.fillRect(76, 906, 132, 8);
  showcase['card-catalog'].dataUrl = card.toDataURL('image/png');

  const tile = document.createElement('canvas');
  tile.width = 256;
  tile.height = 256;
  const tileCtx = tile.getContext('2d');
  tileCtx.clearRect(0, 0, 256, 256);
  tileCtx.drawImage(sourceImage, 0, 0, 256, 256);
  showcase['sprite-sheet'].dataUrl = tile.toDataURL('image/png');
  return showcase;
}

function renderOutputShowcase() {
  const felt = state.comparison.felt;
  dom.outputIdentity.textContent = felt
    ? 'ASSET #' + felt.fingerprint + ' · VISUAL #' + felt.visual.fingerprint
    : '等待同槽素材';
  for (const profile of listOutputProfiles()) {
    const output = state.outputShowcase[profile.id];
    const view = outputDom[profile.id];
    if (!view || !output) continue;
    if (output.dataUrl) view.image.src = output.dataUrl;
    else view.image.removeAttribute('src');
    view.dimensions.textContent = output.width + '×' + output.height;
    view.fingerprint.textContent = output.record.fingerprint;
  }
}

function comparisonSignature(draft = state.draft) {
  if (!draft) return null;
  return `${draft.seed}:${draft.slot}:${draft.count}:${draft.version}:${corePack.fingerprint}`;
}

function sessionRecord() {
  return {
    schemaVersion: STUDIO_SCHEMA,
    studioVersion: STUDIO_VERSION,
    signature: comparisonSignature(),
    author: state.draft || formValue(),
    revision: state.revision,
    review: state.review,
    gates: state.gates,
    releaseCandidate: state.releaseCandidate,
    outputs: Object.fromEntries(Object.entries(state.outputShowcase).map(([id, output]) => [id, output.record])),
    savedAt: new Date().toISOString()
  };
}

function saveSession() {
  if (!state.draft) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRecord()));
  dom.sessionState.textContent = 'SAVED';
  dom.restore.disabled = false;
}

function invalidateApproval(reason = 'Author input changed') {
  if (!state.draft) return;
  state.inputDirty = true;
  state.review = { ...state.review, decision: 'dirty', reviewedAt: null, revision: null };
  state.gates = [];
  state.releaseCandidate = null;
  state.releaseZip = null;
  state.releaseInspection = null;
  dom.dirty.dataset.state = 'dirty';
  dom.dirty.textContent = 'DIRTY';
  setStatus('idle', `${reason}；重新生成后才能审查与发布。`);
  renderReview();
  renderGates();
  renderRelease();
}

function renderComparison() {
  for (const route of ROUTES) {
    const result = state.comparison[route.key];
    const view = routeDom[route.key];
    if (!result) continue;
    if (result.preview) view.image.src = result.preview;
    else view.image.removeAttribute('src');
    view.recipe.textContent = result.fingerprint;
    view.traits.textContent = `${result.recipe.species} / ${result.recipe.media} / ${result.recipe.base}`;
    if (view.visual) view.visual.textContent = result.visual?.fingerprint ?? '—';
    if (view.source && result.audit) view.source.textContent = `${result.audit.authoredPartPlanes} / ${result.audit.visiblePartPlanes} authored · ${result.audit.upstreamVisiblePartPlanes} upstream`;
  }
  const core = state.comparison.core;
  dom.compareTime.textContent = state.compareMs ? `${Math.round(state.compareMs)}ms` : '—';
  dom.revision.textContent = String(state.revision);
  dom.candidatePack.textContent = corePack.fingerprint;
  dom.candidateRenderer.textContent = corePack.visual.fingerprint;
  dom.candidateRecipe.textContent = core?.fingerprint ?? '—';
  dom.candidateVisual.textContent = core?.visual?.fingerprint ?? '—';
  dom.candidatePlanes.textContent = core ? `${core.audit.authoredPartPlanes}/${core.audit.visiblePartPlanes} authored` : '—';
}

function renderReview() {
  const decision = state.review.decision;
  dom.reviewState.dataset.state = decision;
  dom.reviewState.textContent = decision.toUpperCase();
  dom.reviewNotes.value = state.review.notes || '';
  const hasDraft = Boolean(state.draft) && !state.inputDirty;
  dom.approve.disabled = state.building || !hasDraft;
  dom.reject.disabled = state.building || !hasDraft;
  if (decision === 'approved') dom.reviewCopy.textContent = `Revision ${state.review.revision} 已批准；输入变化会自动使批准失效。`;
  else if (decision === 'rejected') dom.reviewCopy.textContent = `Revision ${state.review.revision} 已拒绝；保留备注后可修改输入再生成。`;
  else if (decision === 'dirty') dom.reviewCopy.textContent = 'Author 输入已变化；当前批准和 Gate 结果已经失效。';
  else dom.reviewCopy.textContent = '生成比较后，可批准或拒绝当前 revision。';
}

function renderGates() {
  const byId = Object.fromEntries(state.gates.map(gate => [gate.id, gate]));
  for (const item of dom.gateList.querySelectorAll('li')) {
    const gate = byId[item.dataset.gate];
    item.dataset.state = gate?.status ?? 'idle';
    item.querySelector('small').textContent = gate?.evidence ?? '等待执行';
  }
  const passed = state.gates.filter(gate => gate.status === 'pass').length;
  const failed = state.gates.filter(gate => gate.status === 'fail').length;
  dom.gateSummary.dataset.state = failed ? 'fail' : passed === 6 ? 'pass' : 'idle';
  dom.gateSummary.textContent = failed ? `${failed} FAIL` : passed === 6 ? '6 / 6 PASS' : 'NOT RUN';
  dom.runGates.disabled = state.building || !state.draft || state.inputDirty;
}

function canRelease() {
  return state.review.decision === 'approved'
    && state.review.revision === state.revision
    && !state.inputDirty
    && state.gates.length === 6
    && state.gates.every(gate => gate.status === 'pass');
}

function renderRelease() {
  const eligible = canRelease();
  dom.releaseBuild.disabled = state.building || !eligible || !state.renderer;
  dom.releaseBuild.dataset.locked = String(!eligible || !state.renderer);
  if (state.releaseCandidate) {
    dom.releaseTitle.textContent = 'Release Candidate 已构建';
    dom.releaseCopy.textContent = `RC ${state.releaseCandidate.version} 已通过纯合同与 ZIP CRC 检查。`;
    dom.rcFingerprint.textContent = state.releaseCandidate.fingerprint;
    dom.rcSize.textContent = `${state.releaseInspection?.size ?? 0} B`;
    dom.rcFiles.textContent = String(state.releaseInspection?.entries.length ?? 0);
    dom.rcCrc.textContent = state.releaseInspection?.allCrcValid ? 'PASS' : 'FAIL';
    dom.downloadRcJson.disabled = false;
    dom.downloadRcZip.disabled = false;
  } else {
    dom.releaseTitle.textContent = eligible && !state.renderer ? '合同已就绪，预览能力缺失' : eligible ? '可以构建候选版本' : '尚未可发布';
    dom.releaseCopy.textContent = eligible && !state.renderer
      ? 'WebGL-off 仍可导出 Session JSON；spritesheet 与 RC ZIP 需要 WebGL。'
      : eligible ? '当前 revision 已批准，G1–G6 全部通过。' : '需要当前 revision 已批准，并且 G1–G6 全部通过。';
    dom.rcFingerprint.textContent = '—';
    dom.rcSize.textContent = '—';
    dom.rcFiles.textContent = '—';
    dom.rcCrc.textContent = '—';
    dom.downloadRcJson.disabled = true;
    dom.downloadRcZip.disabled = true;
  }
}

function renderAll() {
  dom.packFingerprint.textContent = corePack.fingerprint;
  dom.rendererFingerprint.textContent = corePack.visual.fingerprint;
  dom.dirty.dataset.state = state.inputDirty ? 'dirty' : 'clean';
  dom.dirty.textContent = state.inputDirty ? 'DIRTY' : 'CLEAN';
  renderComparison();
  renderOutputShowcase();
  renderReview();
  renderGates();
  renderRelease();
}

async function buildComparison(options = {}) {
  if (state.building) return false;
  let draft;
  try { draft = formValue(); }
  catch (error) { setStatus('error', error.message); return false; }
  setBusy(true);
  setStatus('working', '正在派生同一 Slot 的 Original、Decorator、Core、Inkcut 和 Felt…');
  const started = performance.now();
  try {
    const input = batchInput(draft);
    const nextComparison = {};
    for (const route of ROUTES) {
      const pack = getContentPack(route.id);
      const recipe = deriveRecipe(input, draft.slot, pack);
      const rendered = renderCharacter(recipe, pack);
      nextComparison[route.key] = {
        routeId: route.id,
        pack,
        recipe,
        fingerprint: fingerprint(recipe),
        visual: pack.visual
          ? contentVisualRecord(recipe, pack)
          : null,
        preview: rendered.dataUrl,
        audit: rendered.audit
      };
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    const coreItems = buildRecipes(input, corePack);
    const manifest = batchManifest(coreItems, input, sheetLayout(coreItems.length, SHEET_TILE), corePack);
    state.revision = options.restoreRevision ?? state.revision + 1;
    state.inputDirty = false;
    state.draft = draft;
    state.comparison = nextComparison;
    state.outputShowcase = await buildOutputShowcase(nextComparison.felt);
    state.coreItems = coreItems;
    state.manifest = manifest;
    state.compareMs = performance.now() - started;
    state.review = options.restoreReview ?? { decision: 'pending', notes: state.review.notes || '', reviewedAt: null, revision: null };
    state.gates = options.restoreGates ?? [];
    state.releaseCandidate = null;
    state.releaseZip = null;
    state.releaseInspection = null;
    renderAll();
    saveSession();
    setStatus('success', `Revision ${state.revision} 已生成 · ${ROUTES.length} routes · Core ${coreItems.length} assets · ${Math.round(state.compareMs)}ms`);
    return true;
  } catch (error) {
    console.error(error);
    setStatus('error', `生成失败：${error.message}`);
    return false;
  } finally {
    setBusy(false);
    renderAll();
  }
}

function setReview(decision) {
  if (!state.draft || state.inputDirty) return;
  state.review = {
    decision,
    notes: dom.reviewNotes.value.trim(),
    reviewedAt: new Date().toISOString(),
    revision: state.revision
  };
  state.releaseCandidate = null;
  state.releaseZip = null;
  state.releaseInspection = null;
  saveSession();
  renderReview();
  renderRelease();
  setStatus(decision === 'approved' ? 'success' : 'idle', decision === 'approved'
    ? `Revision ${state.revision} 已批准；现在运行 G1–G6。`
    : `Revision ${state.revision} 已拒绝；修改 Author 输入后重新生成。`);
}

async function runGates() {
  if (!state.draft || state.inputDirty || state.building) return [];
  setBusy(true);
  setStatus('working', '正在执行 G1–G6 合同、资产、视觉、携带、运行时和预算审查…');
  try {
    const packCheck = validateContentPack(corePack);
    const manifestCheck = validateBatchManifest(state.manifest, { minAssets: state.draft.count, maxAssets: state.draft.count });
    const core = state.comparison.core;
    let golden = null;
    try { golden = await fetch('../fixtures/golden/mosslight-core-2d-recipes.json').then(response => response.json()); }
    catch { golden = null; }
    const goldenRecipes = new Set((golden?.items ?? []).map(item => item.fingerprint)).size;
    const goldenVisuals = new Set((golden?.items ?? []).map(item => item.visual?.fingerprint)).size;
    let runtimeOk = false;
    try {
      const face = buildContentCharacter(core.recipe, corePack);
      const animator = createAnimator(() => face, { blink: true, gaze: true, sway: true, breath: true, boil: false, amp: 1 });
      animator.update(performance.now() / 1000, .016);
      runtimeOk = face.entries.length === 23 && face.rendererAudit?.independent === true;
      face.dispose();
    } catch { runtimeOk = false; }
    const deterministic = verifyBatch(state.coreItems, batchInput(state.draft), corePack);
    state.gates = [
      { id: 'g1-contract', status: packCheck.ok && manifestCheck.ok ? 'pass' : 'fail', evidence: packCheck.ok && manifestCheck.ok ? `Pack ${corePack.fingerprint} + ${state.coreItems.length}-asset Manifest valid` : [...packCheck.errors, ...manifestCheck.errors].slice(0, 1).join(' ') },
      { id: 'g2-asset', status: core.audit.independent && core.audit.visiblePartPlanes === 23 && core.audit.upstreamVisiblePartPlanes === 0 ? 'pass' : 'fail', evidence: `${core.audit.authoredPartPlanes}/${core.audit.visiblePartPlanes} authored · ${core.audit.upstreamVisiblePartPlanes} upstream` },
      { id: 'g3-visual', status: goldenRecipes === 50 && goldenVisuals === 50 && golden?.pack?.fingerprint === corePack.fingerprint ? 'pass' : 'fail', evidence: golden ? `${goldenRecipes} Recipe + ${goldenVisuals} Visual golden fingerprints` : 'golden fixture unavailable' },
      { id: 'g4-portability', status: manifestCheck.ok && deterministic ? 'pass' : 'fail', evidence: manifestCheck.ok && deterministic ? `Manifest valid · ${state.coreItems.length}/${state.coreItems.length} deterministic` : 'Manifest or deterministic rebuild failed' },
      { id: 'g5-runtime', status: runtimeOk ? 'pass' : 'fail', evidence: runtimeOk ? 'Animator adapter update + 23-plane Core face pass' : 'Runtime adapter failed' },
      { id: 'g6-budget', status: state.compareMs <= 1800 && core.audit.visiblePartPlanes <= 28 ? 'pass' : 'fail', evidence: `${Math.round(state.compareMs)}ms compare · ${core.audit.visiblePartPlanes}/28 planes · DPR 1` }
    ];
    state.releaseCandidate = null;
    state.releaseZip = null;
    state.releaseInspection = null;
    saveSession();
    renderGates();
    renderRelease();
    const pass = state.gates.every(gate => gate.status === 'pass');
    setStatus(pass ? 'success' : 'error', pass ? 'G1–G6 全部通过；批准当前 revision 后可构建 RC。' : `${state.gates.filter(gate => gate.status === 'fail').length} 个 Gate 未通过。`);
    return state.gates;
  } finally {
    setBusy(false);
    renderAll();
  }
}

function blobFromCanvas(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas encoding failed')), type));
}

function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function buildSpritesheet() {
  if (!state.renderer) throw new Error('WebGL unavailable');
  const layout = sheetLayout(state.coreItems.length, SHEET_TILE);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < state.coreItems.length; index += 1) {
    const rendered = renderCharacter(state.coreItems[index].recipe, corePack, SHEET_TILE, 96);
    const image = await imageFromUrl(rendered.dataUrl);
    context.drawImage(image, (index % layout.columns) * SHEET_TILE, Math.floor(index / layout.columns) * SHEET_TILE, SHEET_TILE, SHEET_TILE);
    if (index % 3 === 2) await new Promise(resolve => requestAnimationFrame(resolve));
  }
  return { blob: await blobFromCanvas(canvas), layout };
}

const bytesOf = async value => value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : new TextEncoder().encode(value);
const hexCrc = bytes => crc32(bytes).toString(16).padStart(8, '0');

async function buildReleaseCandidate() {
  if (!canRelease() || !state.renderer || state.building) return null;
  setBusy(true);
  setStatus('working', `正在构建 ${state.coreItems.length} 资产 spritesheet 与 Release Candidate ZIP…`);
  const started = performance.now();
  try {
    const { blob: sheetBlob } = await buildSpritesheet();
    const manifestText = JSON.stringify(state.manifest, null, 2);
    const packText = JSON.stringify(corePack, null, 2);
    const payloads = [
      { path: 'manifest.json', role: 'source-of-truth', data: manifestText },
      { path: 'spritesheet.png', role: 'transparent-preview-atlas', data: sheetBlob },
      { path: 'content-pack.json', role: 'content-pack-contract', data: packText }
    ];
    const files = [];
    for (const payload of payloads) {
      const bytes = await bytesOf(payload.data);
      files.push({ path: payload.path, role: payload.role, bytes: bytes.length, crc32: hexCrc(bytes) });
    }
    const now = new Date().toISOString();
    const record = releaseCandidateSnapshot({
      schemaVersion: CONTRACT_SCHEMAS.releaseCandidate,
      id: `rc-mosslight-core-2d-${state.draft.seed}-${state.draft.version.replaceAll('.', '-')}`,
      version: state.draft.version,
      createdAt: now,
      studio: { name: 'kindergrimm-production-studio', version: STUDIO_VERSION },
      candidate: {
        contentPack: { id: corePack.id, version: corePack.version, fingerprint: corePack.fingerprint },
        renderer: { id: corePack.visual.id, version: corePack.visual.version, fingerprint: corePack.visual.fingerprint },
        input: { seed: state.draft.seed, count: state.draft.count },
        slot: state.draft.slot,
        assetFingerprints: state.coreItems.map(item => item.fingerprint),
        visualFingerprints: state.coreItems.map(item => item.visual.fingerprint)
      },
      review: {
        decision: 'approved',
        notes: state.review.notes,
        reviewedAt: state.review.reviewedAt
      },
      gates: state.gates.map(gate => ({ id: gate.id, status: gate.status, evidence: gate.evidence })),
      bundle: {
        representation: 'stored-zip',
        files,
        fingerprint: contractFingerprint(files)
      },
      provenance: {
        source: 'Kindergrimm research / Mosslight Core 2D',
        upstreamCommit: PROVENANCE.upstreamCommit,
        license: corePack.provenance.license,
        runtimeLlmCalls: 0,
        cloudApiCalls: 0
      }
    });
    const validation = validateReleaseCandidateContract(record, { pack: corePack });
    if (!validation.ok) throw new Error(validation.errors[0]);
    const recordText = JSON.stringify(record, null, 2);
    const zip = await createStoredZip([
      ...payloads.map(payload => ({ name: payload.path, data: payload.data })),
      { name: 'release-candidate.json', data: recordText }
    ]);
    const inspection = await inspectStoredZip(zip);
    if (!inspection.allCrcValid) throw new Error('ZIP CRC inspection failed');
    const elapsed = performance.now() - started;
    if (elapsed > 4000) throw new Error(`RC build ${Math.round(elapsed)}ms exceeds 4000ms budget`);
    state.releaseCandidate = record;
    state.releaseZip = zip;
    state.releaseInspection = inspection;
    state.releaseBuildMs = elapsed;
    saveSession();
    renderRelease();
    setStatus('success', `RC ${record.version} 已构建 · ${inspection.entries.length} files · ${inspection.size} bytes · ${Math.round(elapsed)}ms`);
    return { record, inspection, buildMs: Math.round(elapsed) };
  } catch (error) {
    console.error(error);
    setStatus('error', `RC 构建失败：${error.message}`);
    return null;
  } finally {
    setBusy(false);
    renderAll();
  }
}

function download(value, name, type = 'application/json') {
  const blob = value instanceof Blob ? value : new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function restoreSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { setStatus('idle', '没有可恢复的本地生产会话。'); return false; }
  try {
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== STUDIO_SCHEMA) throw new Error('unsupported Studio session schema');
    dom.seed.value = String(saved.author.seed);
    dom.slot.value = String(saved.author.slot);
    dom.count.value = String(saved.author.count);
    dom.version.value = saved.author.version;
    const restored = await buildComparison({
      restoreRevision: saved.revision,
      restoreReview: saved.signature === `${saved.author.seed}:${saved.author.slot}:${saved.author.count}:${saved.author.version}:${corePack.fingerprint}` ? saved.review : undefined,
      restoreGates: saved.gates ?? []
    });
    if (restored) {
      dom.sessionState.textContent = 'RESTORED';
      renderAll();
      setStatus('success', `本地 Revision ${state.revision} 已恢复；RC ZIP 需重新构建。`);
    }
    return restored;
  } catch (error) {
    setStatus('error', `恢复失败：${error.message}`);
    return false;
  }
}

function resetSession() {
  localStorage.removeItem(STORAGE_KEY);
  dom.seed.value = '240824';
  dom.slot.value = '0';
  dom.count.value = '12';
  dom.version.value = '0.1.0';
  state.revision = 0;
  state.review = { decision: 'pending', notes: '', reviewedAt: null, revision: null };
  state.gates = [];
  state.releaseCandidate = null;
  state.releaseZip = null;
  state.releaseInspection = null;
  dom.sessionState.textContent = 'NEW';
  buildComparison();
}

dom.form.addEventListener('submit', event => { event.preventDefault(); buildComparison(); });
for (const input of [dom.seed, dom.slot, dom.count, dom.version]) input.addEventListener('input', () => invalidateApproval('Author input changed'));
dom.reviewNotes.addEventListener('input', () => {
  state.review.notes = dom.reviewNotes.value;
  if (['approved', 'rejected'].includes(state.review.decision)) {
    state.review.decision = 'dirty';
    state.review.reviewedAt = null;
    state.review.revision = null;
    state.gates = [];
    state.releaseCandidate = null;
    state.releaseZip = null;
    state.releaseInspection = null;
  }
  if (state.draft) saveSession();
  renderReview(); renderGates(); renderRelease();
});
dom.approve.addEventListener('click', () => setReview('approved'));
dom.reject.addEventListener('click', () => setReview('rejected'));
dom.runGates.addEventListener('click', runGates);
dom.releaseBuild.addEventListener('click', buildReleaseCandidate);
dom.restore.addEventListener('click', restoreSession);
dom.reset.addEventListener('click', resetSession);
dom.exportSession.addEventListener('click', () => download(JSON.stringify({ ...sessionRecord(), comparison: Object.fromEntries(Object.entries(state.comparison).map(([key, value]) => [key, { recipeFingerprint: value.fingerprint, visualFingerprint: value.visual?.fingerprint ?? null, packFingerprint: value.pack.fingerprint }])) }, null, 2), `kindergrimm-studio-${state.draft?.seed ?? 'new'}.json`));
dom.downloadRcJson.addEventListener('click', () => state.releaseCandidate && download(JSON.stringify(state.releaseCandidate, null, 2), `${state.releaseCandidate.id}.json`));
dom.downloadRcZip.addEventListener('click', () => state.releaseZip && download(state.releaseZip, `${state.releaseCandidate.id}.zip`, 'application/zip'));

window.__productionStudio = {
  state: () => ({
    schemaVersion: STUDIO_SCHEMA,
    revision: state.revision,
    inputDirty: state.inputDirty,
    webgl: Boolean(state.renderer),
    draft: state.draft ? { ...state.draft } : null,
    comparisonRoutes: Object.keys(state.comparison),
    routeFingerprints: Object.fromEntries(Object.entries(state.comparison).map(([key, value]) => [key, { recipe: value.fingerprint, visual: value.visual?.fingerprint ?? null, pack: value.pack.fingerprint }])),
    coreAudit: state.comparison.core?.audit ?? null,
    inkcutAudit: state.comparison.inkcut?.audit ?? null,
    feltAudit: state.comparison.felt?.audit ?? null,
    outputProfiles: Object.fromEntries(Object.entries(state.outputShowcase).map(([id, output]) => [id, {
      width: output.width,
      height: output.height,
      fingerprint: output.record.fingerprint,
      assetFingerprint: output.record.identity.assetFingerprint,
      visualFingerprint: output.record.identity.visualFingerprint,
      rendered: Boolean(output.dataUrl)
    }])),
    compareMs: Math.round(state.compareMs),
    review: { ...state.review },
    gates: state.gates.map(gate => ({ ...gate })),
    releaseReady: canRelease(),
    releaseCandidate: state.releaseCandidate?.fingerprint ?? null,
    releaseBuildMs: Math.round(state.releaseBuildMs),
    zip: state.releaseInspection ? { size: state.releaseInspection.size, entries: state.releaseInspection.entries, allCrcValid: state.releaseInspection.allCrcValid } : null,
    stored: Boolean(localStorage.getItem(STORAGE_KEY)),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  }),
  session: () => sessionRecord(),
  manifest: () => state.manifest,
  regenerate: values => {
    if (values?.seed !== undefined) dom.seed.value = String(values.seed);
    if (values?.slot !== undefined) dom.slot.value = String(values.slot);
    if (values?.count !== undefined) dom.count.value = String(values.count);
    if (values?.version !== undefined) dom.version.value = values.version;
    return buildComparison();
  },
  approve: notes => { if (notes !== undefined) dom.reviewNotes.value = notes; setReview('approved'); return window.__productionStudio.state(); },
  reject: notes => { if (notes !== undefined) dom.reviewNotes.value = notes; setReview('rejected'); return window.__productionStudio.state(); },
  runGates,
  buildRelease: buildReleaseCandidate,
  restore: restoreSession,
  reset: resetSession,
  validateReleaseCandidate: record => validateReleaseCandidateContract(record, { pack: corePack }),
  inspectPack: () => corePack
};

dom.packFingerprint.textContent = corePack.fingerprint;
dom.rendererFingerprint.textContent = corePack.visual.fingerprint;
dom.restore.disabled = !localStorage.getItem(STORAGE_KEY);
initRenderer();
renderAll();
buildComparison();
