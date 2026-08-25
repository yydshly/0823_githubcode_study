import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import '/@cot-research/product-workbench.css';
import { createNeutralInspectionScene } from '/@cot-research/neutral-inspection-scene.js';
import { createAtlasInspectionRover } from '/@cot-research/industrial-showroom-asset.js';
import {
  INDUSTRIAL_CAMERA_PRESETS,
  INDUSTRIAL_HOTSPOTS,
  INDUSTRIAL_MATERIAL_VARIANTS,
  INDUSTRIAL_OVERVIEW_CAMERA,
  INDUSTRIAL_SHOWROOM_PROVENANCE,
} from '/@cot-research/industrial-showroom-config.js';

const WORKBENCH_VERSION = 1;
const DIRECTOR_DURATION_MS = 20_000;
const startedAt = performance.now();
const workbench = document.querySelector('.workbench');
const canvas = document.getElementById('workbench-canvas');
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const compactQuery = matchMedia('(max-width: 760px)');
const listeners = [];
let disposed = false;
let animationFrame = 0;

const ui = {
  loading: document.querySelector('.loading strong'),
  title: document.querySelector('[data-active-title]'),
  detail: document.querySelector('[data-active-detail]'),
  step: document.querySelector('[data-step-count]'),
  featureButtons: [...document.querySelectorAll('[data-hotspot]')],
  variantRow: document.querySelector('[data-variant-row]'),
  explode: document.querySelector('[data-action="explode"]'),
  rotate: document.querySelector('[data-action="rotate"]'),
  quality: document.querySelector('[data-action="quality"]'),
  play: document.querySelector('[data-action="play"]'),
  overview: document.querySelector('[data-action="overview"]'),
  pause: document.querySelector('[data-action="pause"]'),
  directorState: document.querySelector('[data-director-state]'),
  directorCaption: document.querySelector('[data-director-caption]'),
  timelineProgress: document.querySelector('[data-timeline-progress]'),
  hotspotLayer: document.querySelector('.hotspot-layer'),
  metrics: new Map([...document.querySelectorAll('[data-metric]')].map((node) => [node.dataset.metric, node])),
};

const state = {
  status: 'booting',
  activeHotspotId: null,
  activeVariantId: INDUSTRIAL_MATERIAL_VARIANTS[0].id,
  autoRotate: !reducedMotionQuery.matches,
  exploded: false,
  explodeProgress: 0,
  explodeTarget: 0,
  quality: compactQuery.matches ? 'low' : 'high',
  reducedMotion: reducedMotionQuery.matches,
  director: {
    playing: false,
    paused: false,
    elapsedMs: 0,
    segmentId: null,
    caption: '独立产品工作台',
  },
  metrics: {
    readyMs: null,
    fps: 0,
    frameP95Ms: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    sampleCount: 0,
    quality: null,
  },
};

let renderer;
let camera;
let controls;
let stage;
let asset;
let cameraTransition = null;
let lastFrameAt = performance.now();
let elapsedSeconds = 0;
let lastTelemetryAt = 0;
let directorSegment = null;
const frameSamples = [];
const hotspotButtons = new Map();
const partOrigins = new Map();
const tempWorld = new THREE.Vector3();
const tempProjected = new THREE.Vector3();

const overviewPreset = Object.freeze({
  id: 'overview',
  position: INDUSTRIAL_OVERVIEW_CAMERA.pos,
  target: INDUSTRIAL_OVERVIEW_CAMERA.lookAt,
  fov: INDUSTRIAL_OVERVIEW_CAMERA.fov,
});

const cameraPresets = new Map([
  ['overview', overviewPreset],
  ...INDUSTRIAL_CAMERA_PRESETS.map((preset) => [preset.id, {
    id: preset.id,
    position: preset.pos,
    target: preset.lookAt,
    fov: preset.fov,
  }]),
]);

const hotspotIndex = new Map(INDUSTRIAL_HOTSPOTS.map((hotspot) => [hotspot.id, hotspot]));
const explodeOffsets = Object.freeze({
  chassis: [0, 0, 0],
  'sensor-system': [0, 1.25, 0.28],
  'energy-module': [-1.2, 0.3, -0.12],
  'all-terrain-drive': [0, -0.34, 0],
  'safety-frame': [0, 0.55, -0.72],
  'service-bay': [0.78, 0.46, -0.42],
});

function listen(target, type, handler, options) {
  target.addEventListener(type, handler, options);
  listeners.push(() => target.removeEventListener(type, handler, options));
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function percentile(values, amount) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * amount))];
}

function setButtonPressed(button, pressed) {
  button.setAttribute('aria-pressed', String(Boolean(pressed)));
}

function updateControlLabels() {
  setButtonPressed(ui.explode, state.exploded);
  setButtonPressed(ui.rotate, state.autoRotate);
  setButtonPressed(ui.quality, state.quality === 'high');
  ui.explode.textContent = state.exploded ? '收拢结构' : '分解结构';
  ui.rotate.textContent = state.autoRotate ? '转台：开' : '转台：关';
  ui.quality.textContent = state.quality === 'high' ? '质量：高' : '质量：轻';
  ui.pause.textContent = state.director.paused ? '继续' : '暂停';
}

function setQuality(tier) {
  state.quality = tier === 'high' ? 'high' : 'low';
  const dprCap = state.quality === 'high' ? 1.75 : 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  stage.setQuality(state.quality);
  resize();
  updateControlLabels();
}

function setExploded(enabled, { manual = true } = {}) {
  if (manual) stopDirector();
  state.exploded = Boolean(enabled);
  state.explodeTarget = state.exploded ? 1 : 0;
  updateControlLabels();
}

function setAutoRotate(enabled, { manual = true } = {}) {
  if (manual) stopDirector();
  state.autoRotate = state.reducedMotion ? false : Boolean(enabled);
  updateControlLabels();
}

function setVariant(id, { manual = true } = {}) {
  if (manual) stopDirector();
  asset.applyMaterialVariant(id);
  state.activeVariantId = id;
  for (const button of ui.variantRow.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.variant === id);
    button.setAttribute('aria-pressed', String(button.dataset.variant === id));
  }
}

function resolveCameraPose(preset) {
  const target = new THREE.Vector3(...preset.target);
  const position = new THREE.Vector3(...preset.position);
  if (compactQuery.matches) {
    const distanceScale = preset.id === 'overview' ? 1.55 : 1.25;
    position.sub(target).multiplyScalar(distanceScale).add(target);
  }
  return { position, target, fov: compactQuery.matches ? Math.max(38, preset.fov) : preset.fov };
}

function transitionToPreset(id, durationMs = 760) {
  const preset = cameraPresets.get(id);
  if (!preset) return false;
  const duration = state.reducedMotion ? 0 : durationMs;
  const pose = resolveCameraPose(preset);
  cameraTransition = {
    elapsedMs: 0,
    durationMs: duration,
    fromPosition: camera.position.clone(),
    fromTarget: controls.target.clone(),
    fromFov: camera.fov,
    toPosition: pose.position,
    toTarget: pose.target,
    toFov: pose.fov,
  };
  if (duration === 0) updateCameraTransition(0);
  return true;
}

function updateCameraTransition(deltaMs) {
  if (!cameraTransition) return;
  cameraTransition.elapsedMs += deltaMs;
  const raw = cameraTransition.durationMs === 0
    ? 1
    : Math.min(1, cameraTransition.elapsedMs / cameraTransition.durationMs);
  const progress = easeInOutCubic(raw);
  camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, progress);
  controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, progress);
  camera.fov = THREE.MathUtils.lerp(cameraTransition.fromFov, cameraTransition.toFov, progress);
  camera.updateProjectionMatrix();
  controls.update();
  if (raw >= 1) cameraTransition = null;
}

function renderInspectionCopy(hotspot) {
  if (!hotspot) {
    ui.title.textContent = '整体视图';
    ui.detail.textContent = '拖动旋转、滚轮缩放，或选择部件查看程序化层级与独立镜头。';
    ui.step.textContent = '00 / 03';
  } else {
    ui.title.textContent = hotspot.label;
    ui.detail.textContent = hotspot.detail;
    ui.step.textContent = `0${hotspot.index} / 03`;
  }
  for (const button of ui.featureButtons) {
    const active = button.dataset.hotspot === hotspot?.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const [id, button] of hotspotButtons) button.classList.toggle('active', id === hotspot?.id);
}

function selectHotspot(id, { manual = true } = {}) {
  if (manual) stopDirector();
  const hotspot = hotspotIndex.get(id);
  if (!hotspot) return false;
  state.activeHotspotId = id;
  renderInspectionCopy(hotspot);
  transitionToPreset(hotspot.cameraPresetId);
  return true;
}

function showOverview({ manual = true } = {}) {
  if (manual) stopDirector();
  state.activeHotspotId = null;
  renderInspectionCopy(null);
  transitionToPreset('overview', 850);
}

function stopDirector() {
  if (!state.director.playing) return;
  state.director.playing = false;
  state.director.paused = false;
  state.director.segmentId = null;
  directorSegment = null;
  ui.directorState.textContent = 'READY';
  ui.directorCaption.textContent = '手动检查模式';
  ui.timelineProgress.style.width = '0%';
  updateControlLabels();
}

function setDirectorSegment(id, caption, action) {
  if (directorSegment === id) return;
  directorSegment = id;
  state.director.segmentId = id;
  state.director.caption = caption;
  ui.directorCaption.textContent = caption;
  action();
}

function applyDirectorTimeline() {
  const time = state.director.elapsedMs;
  if (time < 2300) {
    setDirectorSegment('establish', '01 · 建立无地图的独立舞台', () => {
      showOverview({ manual: false });
      setExploded(false, { manual: false });
      setVariant('graphite-field', { manual: false });
      setAutoRotate(true, { manual: false });
    });
  } else if (time < 5900) {
    setDirectorSegment('sensor', '02 · 镜头解释传感系统', () => {
      selectHotspot('sensor-system', { manual: false });
      setExploded(false, { manual: false });
    });
  } else if (time < 9300) {
    setDirectorSegment('energy', '03 · 材质与能源模块切换', () => {
      selectHotspot('energy-module', { manual: false });
      setVariant('rescue-orange', { manual: false });
    });
  } else if (time < 12_800) {
    setDirectorSegment('drive', '04 · 分解层级与驱动结构', () => {
      selectHotspot('all-terrain-drive', { manual: false });
      setExploded(true, { manual: false });
    });
  } else if (time < 16_200) {
    setDirectorSegment('variant', '05 · 极地维护材质变体', () => {
      showOverview({ manual: false });
      setVariant('arctic-service', { manual: false });
      setExploded(true, { manual: false });
    });
  } else {
    setDirectorSegment('hero', '06 · 收拢并回到产品英雄镜头', () => {
      showOverview({ manual: false });
      setExploded(false, { manual: false });
      setVariant('graphite-field', { manual: false });
      setAutoRotate(true, { manual: false });
    });
  }
}

function playDirector() {
  state.director.playing = true;
  state.director.paused = false;
  state.director.elapsedMs = 0;
  state.director.segmentId = null;
  directorSegment = null;
  ui.directorState.textContent = 'PLAYING / 20S';
  ui.timelineProgress.style.width = '0%';
  applyDirectorTimeline();
  updateControlLabels();
}

function toggleDirectorPause() {
  if (!state.director.playing) {
    playDirector();
    return;
  }
  state.director.paused = !state.director.paused;
  ui.directorState.textContent = state.director.paused ? 'PAUSED' : 'PLAYING / 20S';
  updateControlLabels();
}

function updateDirector(deltaMs) {
  if (!state.director.playing || state.director.paused) return;
  state.director.elapsedMs += deltaMs;
  if (state.director.elapsedMs >= DIRECTOR_DURATION_MS) {
    state.director.elapsedMs = DIRECTOR_DURATION_MS;
    ui.timelineProgress.style.width = '100%';
    state.director.playing = false;
    state.director.paused = false;
    ui.directorState.textContent = 'COMPLETE';
    ui.directorCaption.textContent = 'Scene + Subject + Presentation 已完成';
    updateControlLabels();
    return;
  }
  applyDirectorTimeline();
  ui.timelineProgress.style.width = `${(state.director.elapsedMs / DIRECTOR_DURATION_MS) * 100}%`;
}

function updateExplosion(deltaSeconds) {
  const speed = state.reducedMotion ? 1 : Math.min(1, deltaSeconds * 5.5);
  state.explodeProgress = THREE.MathUtils.lerp(state.explodeProgress, state.explodeTarget, speed);
  for (const [id, part] of Object.entries(asset.parts)) {
    const origin = partOrigins.get(id);
    const offset = explodeOffsets[id] || [0, 0, 0];
    part.position.set(
      origin.x + offset[0] * state.explodeProgress,
      origin.y + offset[1] * state.explodeProgress,
      origin.z + offset[2] * state.explodeProgress,
    );
  }
}

function createVariantControls() {
  for (const variant of INDUSTRIAL_MATERIAL_VARIANTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variant = variant.id;
    button.textContent = variant.label.replace('版', '');
    button.title = variant.description;
    button.setAttribute('aria-pressed', 'false');
    listen(button, 'click', () => setVariant(variant.id));
    ui.variantRow.append(button);
  }
}

function createHotspotControls() {
  for (const hotspot of INDUSTRIAL_HOTSPOTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'world-hotspot';
    button.textContent = String(hotspot.index).padStart(2, '0');
    button.setAttribute('aria-label', `检查${hotspot.label}`);
    button.dataset.hotspot = hotspot.id;
    listen(button, 'click', () => selectHotspot(hotspot.id));
    ui.hotspotLayer.append(button);
    hotspotButtons.set(hotspot.id, button);
  }
}

function updateHotspotPositions() {
  const width = innerWidth;
  const height = innerHeight;
  for (const hotspot of INDUSTRIAL_HOTSPOTS) {
    const socket = asset.sockets[hotspot.socketId];
    const button = hotspotButtons.get(hotspot.id);
    if (!socket || !button) continue;
    socket.getWorldPosition(tempWorld);
    tempProjected.copy(tempWorld).project(camera);
    const x = (tempProjected.x * 0.5 + 0.5) * width;
    const y = (-tempProjected.y * 0.5 + 0.5) * height;
    const visible = tempProjected.z > -1 && tempProjected.z < 1
      && x > 18 && x < width - 18
      && y > 70 && y < height - (compactQuery.matches ? 280 : 48);
    button.hidden = !visible;
    if (visible) {
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
    }
  }
}

function resize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, innerWidth);
  const height = Math.max(1, innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateTelemetry(now) {
  if (now - lastTelemetryAt < 500) return;
  lastTelemetryAt = now;
  const samples = frameSamples.slice(-120);
  const average = samples.reduce((sum, value) => sum + value, 0) / Math.max(1, samples.length);
  state.metrics.fps = Math.round(Math.min(999, 1000 / Math.max(0.001, average)));
  state.metrics.frameP95Ms = Number(percentile(samples, 0.95).toFixed(1));
  state.metrics.calls = renderer.info.render.calls;
  state.metrics.triangles = renderer.info.render.triangles;
  state.metrics.geometries = renderer.info.memory.geometries;
  state.metrics.textures = renderer.info.memory.textures;
  state.metrics.sampleCount = samples.length;
  state.metrics.quality = state.quality;
  ui.metrics.get('fps').textContent = state.metrics.fps;
  ui.metrics.get('frame').textContent = state.metrics.frameP95Ms.toFixed(1);
  ui.metrics.get('calls').textContent = state.metrics.calls;
  ui.metrics.get('triangles').textContent = state.metrics.triangles.toLocaleString('en-US');
  ui.metrics.get('textures').textContent = state.metrics.textures;
}

function resetMetrics() {
  frameSamples.length = 0;
  lastTelemetryAt = performance.now();
  const readyMs = state.metrics.readyMs;
  Object.assign(state.metrics, {
    readyMs,
    fps: 0,
    frameP95Ms: 0,
    calls: 0,
    triangles: 0,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    sampleCount: 0,
    quality: state.quality,
  });
  return true;
}

function snapshot() {
  return {
    version: WORKBENCH_VERSION,
    status: state.status,
    route: location.pathname,
    architecture: {
      renderCore: 'standalone-threejs',
      scene: stage?.profile?.id || null,
      subject: asset?.manifest?.id || null,
      presentation: 'product-stage-v1',
      world: stage?.profile?.world || null,
    },
    sceneProfile: stage?.profile || null,
    subjectManifest: asset?.manifest || null,
    provenance: INDUSTRIAL_SHOWROOM_PROVENANCE,
    activeHotspotId: state.activeHotspotId,
    activeVariantId: state.activeVariantId,
    exploded: state.exploded,
    autoRotate: state.autoRotate,
    quality: state.quality,
    reducedMotion: state.reducedMotion,
    director: { ...state.director },
    metrics: { ...state.metrics },
    renderer: renderer ? {
      outputColorSpace: renderer.outputColorSpace,
      toneMapping: renderer.toneMapping,
      pixelRatio: renderer.getPixelRatio(),
      shadows: renderer.shadowMap.enabled,
    } : null,
  };
}

function dispose() {
  if (disposed) return false;
  disposed = true;
  cancelAnimationFrame(animationFrame);
  for (const release of listeners.splice(0)) release();
  controls?.dispose();
  asset?.dispose();
  stage?.dispose();
  renderer?.dispose();
  hotspotButtons.clear();
  delete window.__COT_PRODUCT_WORKBENCH;
  state.status = 'disposed';
  return true;
}

function tick(now) {
  if (disposed) return;
  const deltaMs = Math.min(50, Math.max(0, now - lastFrameAt));
  const deltaSeconds = deltaMs / 1000;
  lastFrameAt = now;
  elapsedSeconds += deltaSeconds;
  frameSamples.push(deltaMs);
  if (frameSamples.length > 240) frameSamples.shift();

  updateDirector(deltaMs);
  updateCameraTransition(deltaMs);
  updateExplosion(deltaSeconds);
  if (state.autoRotate && !state.reducedMotion && !cameraTransition) {
    asset.root.rotation.y += deltaSeconds * 0.16;
  }
  stage.update(elapsedSeconds, state.reducedMotion);
  controls.update();
  renderer.render(stage.scene, camera);
  updateHotspotPositions();
  updateTelemetry(now);
  animationFrame = requestAnimationFrame(tick);
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialPose = resolveCameraPose(overviewPreset);
    camera = new THREE.PerspectiveCamera(initialPose.fov, 1, 0.1, 80);
    camera.position.copy(initialPose.position);
    controls = new OrbitControls(camera, canvas);
    controls.target.copy(initialPose.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 22;
    controls.minPolarAngle = 0.45;
    controls.maxPolarAngle = 1.48;
    controls.update();

    stage = createNeutralInspectionScene(renderer);
    asset = createAtlasInspectionRover();
    asset.root.position.set(0, 0.22, 0);
    asset.root.rotation.y = -0.34;
    stage.root.add(asset.root);
    for (const [id, part] of Object.entries(asset.parts)) partOrigins.set(id, part.position.clone());

    createVariantControls();
    createHotspotControls();
    setVariant(state.activeVariantId, { manual: false });
    setQuality(state.quality);
    renderInspectionCopy(null);
    updateControlLabels();

    for (const button of ui.featureButtons) {
      listen(button, 'click', () => selectHotspot(button.dataset.hotspot));
    }
    listen(ui.explode, 'click', () => setExploded(!state.exploded));
    listen(ui.rotate, 'click', () => setAutoRotate(!state.autoRotate));
    listen(ui.quality, 'click', () => setQuality(state.quality === 'high' ? 'low' : 'high'));
    listen(ui.play, 'click', playDirector);
    listen(ui.overview, 'click', () => showOverview());
    listen(ui.pause, 'click', toggleDirectorPause);
    listen(controls, 'start', () => {
      if (state.director.playing) stopDirector();
      state.autoRotate = false;
      updateControlLabels();
    });
    listen(window, 'resize', resize, { passive: true });
    listen(window, 'keydown', (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target?.closest?.('input,textarea,select,[contenteditable=true]')) return;
      const digit = /^(?:Digit|Numpad)([1-3])$/.exec(event.code);
      if (digit) selectHotspot(INDUSTRIAL_HOTSPOTS[Number(digit[1]) - 1].id);
      else if (event.code === 'KeyV') setVariant(
        INDUSTRIAL_MATERIAL_VARIANTS[
          (INDUSTRIAL_MATERIAL_VARIANTS.findIndex((variant) => variant.id === state.activeVariantId) + 1)
          % INDUSTRIAL_MATERIAL_VARIANTS.length
        ].id,
      );
      else if (event.code === 'KeyE') setExploded(!state.exploded);
      else if (event.code === 'Space') toggleDirectorPause();
      else if (event.code === 'Escape') showOverview();
      else return;
      event.preventDefault();
    });
    listen(reducedMotionQuery, 'change', (event) => {
      state.reducedMotion = event.matches;
      if (event.matches) {
        state.autoRotate = false;
        if (cameraTransition) updateCameraTransition(cameraTransition.durationMs);
      }
      updateControlLabels();
    });
    listen(compactQuery, 'change', () => {
      if (compactQuery.matches && state.quality === 'high') setQuality('low');
      showOverview({ manual: false });
    });
    listen(window, 'beforeunload', dispose, { once: true });

    resize();
    renderer.render(stage.scene, camera);
    animationFrame = requestAnimationFrame(tick);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    state.metrics.readyMs = Math.round(performance.now() - startedAt);
    state.status = 'ready';
    workbench.classList.add('ready');
    workbench.setAttribute('aria-busy', 'false');
  } catch (error) {
    state.status = 'error';
    state.error = String(error?.stack || error);
    workbench.classList.add('error');
    ui.loading.textContent = '工作台启动失败，请查看控制台。';
    console.error('[product-workbench]', error);
  }
}

window.__COT_PRODUCT_WORKBENCH = {
  version: WORKBENCH_VERSION,
  get status() { return state.status; },
  get metrics() { return { ...state.metrics }; },
  get architecture() { return snapshot().architecture; },
  get snapshot() { return snapshot(); },
  play: playDirector,
  pause: toggleDirectorPause,
  overview: () => showOverview(),
  selectHotspot,
  setVariant,
  setExploded,
  setQuality,
  resetMetrics,
  dispose,
};

init();
