import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import '/@cot-research/product-workbench.css';
import { createNeutralInspectionScene } from '/@cot-research/neutral-inspection-scene.js';
import { createProductSubjectAdapter } from '/@cot-research/product-subject-adapter.js';
import {
  PRODUCT_SUBJECT_DEFINITIONS,
  auditProductSubjectDefinitions,
  getProductSubjectDefinition,
} from '/@cot-research/product-subject-registry.js';

const WORKBENCH_VERSION = 2;
const DIRECTOR_DURATION_MS = 22_000;
const ATLAS_ID = 'atlas-inspection-rover';
const NOVA_ID = 'nova-field-node';
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
  subjectCode: document.querySelector('[data-subject-code]'),
  subjectSummary: document.querySelector('[data-subject-summary]'),
  architectureSubject: document.querySelector('[data-architecture-subject]'),
  subjectRow: document.querySelector('[data-subject-row]'),
  featureTabs: document.querySelector('.feature-tabs'),
  title: document.querySelector('[data-active-title]'),
  detail: document.querySelector('[data-active-detail]'),
  step: document.querySelector('[data-step-count]'),
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
  activeSubjectId: PRODUCT_SUBJECT_DEFINITIONS[0].id,
  activeHotspotId: null,
  activeVariantId: null,
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
    caption: '双主体产品工作台',
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
let subject;
let overviewPreset = PRODUCT_SUBJECT_DEFINITIONS[0].overview;
let cameraPresets = new Map();
let hotspotIndex = new Map();
let featureButtons = [];
let cameraTransition = null;
let lastFrameAt = performance.now();
let elapsedSeconds = 0;
let lastTelemetryAt = 0;
let directorSegment = null;
const frameSamples = [];
const subjectButtons = new Map();
const hotspotButtons = new Map();
const tempWorld = new THREE.Vector3();
const tempProjected = new THREE.Vector3();

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
    geometries: renderer?.info.memory.geometries || 0,
    textures: renderer?.info.memory.textures || 0,
    sampleCount: 0,
    quality: state.quality,
  });
  return true;
}

function setQuality(tier) {
  state.quality = tier === 'high' ? 'high' : 'low';
  const dprCap = state.quality === 'high' ? 1.75 : 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  stage.setQuality(state.quality);
  subject?.setQuality(state.quality);
  resize();
  updateControlLabels();
}

function setExploded(enabled, options = {}) {
  const manual = options.manual !== false;
  if (manual) stopDirector();
  state.exploded = Boolean(enabled);
  state.explodeTarget = state.exploded ? 1 : 0;
  updateControlLabels();
}

function setAutoRotate(enabled, options = {}) {
  const manual = options.manual !== false;
  if (manual) stopDirector();
  state.autoRotate = state.reducedMotion ? false : Boolean(enabled);
  updateControlLabels();
}

function setVariant(id, options = {}) {
  const manual = options.manual !== false;
  if (manual) stopDirector();
  if (!subject?.materialVariants.some((variant) => variant.id === id)) return false;
  subject.applyMaterialVariant(id);
  state.activeVariantId = id;
  for (const button of ui.variantRow.querySelectorAll('button')) {
    const active = button.dataset.variant === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  return true;
}

function resolveCameraPose(preset) {
  const target = new THREE.Vector3(...preset.target);
  const position = new THREE.Vector3(...preset.position);
  if (compactQuery.matches) {
    const distanceScale = preset.id === 'overview' ? 1.55 : 1.25;
    position.sub(target).multiplyScalar(distanceScale).add(target);
  }
  return {
    position,
    target,
    fov: compactQuery.matches ? Math.max(38, preset.fov) : preset.fov,
  };
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
  const total = subject?.hotspots.length || 0;
  if (!hotspot) {
    ui.title.textContent = '整体视图';
    ui.detail.textContent = '当前主体已通过统一适配器挂载。拖动旋转，或选择热点检查零件、镜头和材质契约。';
    ui.step.textContent = '00 / ' + String(total).padStart(2, '0');
  } else {
    ui.title.textContent = hotspot.label;
    ui.detail.textContent = hotspot.detail;
    ui.step.textContent = String(hotspot.index).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  }
  for (const button of featureButtons) {
    const active = button.dataset.hotspot === hotspot?.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const [id, button] of hotspotButtons) button.classList.toggle('active', id === hotspot?.id);
}

function selectHotspot(id, options = {}) {
  const manual = options.manual !== false;
  if (manual) stopDirector();
  const hotspot = hotspotIndex.get(id);
  if (!hotspot) return false;
  state.activeHotspotId = id;
  renderInspectionCopy(hotspot);
  transitionToPreset(hotspot.cameraPresetId);
  return true;
}

function showOverview(options = {}) {
  const manual = options.manual !== false;
  if (manual) stopDirector();
  state.activeHotspotId = null;
  renderInspectionCopy(null);
  transitionToPreset('overview', 850);
}

function createSubjectControls() {
  ui.subjectRow.replaceChildren();
  for (const definition of PRODUCT_SUBJECT_DEFINITIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.subject = definition.id;
    button.innerHTML = '<b>' + definition.code + '</b><span>' + definition.shortLabel + '</span>';
    button.setAttribute('aria-pressed', 'false');
    listen(button, 'click', () => selectSubject(definition.id));
    ui.subjectRow.append(button);
    subjectButtons.set(definition.id, button);
  }
}

function createInspectionControls() {
  ui.featureTabs.replaceChildren();
  ui.variantRow.replaceChildren();
  ui.hotspotLayer.replaceChildren();
  featureButtons = [];
  hotspotButtons.clear();

  for (const hotspot of subject.hotspots) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.hotspot = hotspot.id;
    tab.innerHTML = '<b>' + String(hotspot.index).padStart(2, '0') + '</b><span>' + hotspot.label + '</span>';
    tab.setAttribute('aria-pressed', 'false');
    tab.addEventListener('click', () => selectHotspot(hotspot.id));
    ui.featureTabs.append(tab);
    featureButtons.push(tab);

    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'world-hotspot';
    marker.textContent = String(hotspot.index).padStart(2, '0');
    marker.setAttribute('aria-label', '检查' + hotspot.label);
    marker.dataset.hotspot = hotspot.id;
    marker.addEventListener('click', () => selectHotspot(hotspot.id));
    ui.hotspotLayer.append(marker);
    hotspotButtons.set(hotspot.id, marker);
  }

  for (const variant of subject.materialVariants) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variant = variant.id;
    button.textContent = variant.label.replace('版', '');
    button.title = variant.description;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => setVariant(variant.id));
    ui.variantRow.append(button);
  }
}

function selectSubject(id, options = {}) {
  const manual = options.manual !== false;
  const keepCamera = options.keepCamera === true;
  if (manual) stopDirector();
  const definition = getProductSubjectDefinition(id);
  if (!definition) return false;
  if (subject?.definition.id === id) {
    if (!keepCamera) showOverview({ manual: false });
    return true;
  }

  const nextSubject = createProductSubjectAdapter(definition);
  nextSubject.setQuality(state.quality);
  nextSubject.mount(stage.root);
  const previousSubject = subject;
  subject = nextSubject;
  previousSubject?.dispose();

  state.activeSubjectId = definition.id;
  state.activeHotspotId = null;
  state.exploded = false;
  state.explodeProgress = 0;
  state.explodeTarget = 0;
  overviewPreset = definition.overview;
  cameraPresets = new Map([
    ['overview', definition.overview],
    ...definition.cameraPresets.map((preset) => [preset.id, preset]),
  ]);
  hotspotIndex = new Map(definition.hotspots.map((hotspot) => [hotspot.id, hotspot]));

  ui.subjectCode.textContent = definition.code;
  ui.subjectSummary.textContent = definition.summary;
  ui.architectureSubject.textContent = definition.shortLabel;
  for (const [subjectId, button] of subjectButtons) {
    const active = subjectId === definition.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }

  createInspectionControls();
  setVariant(subject.materialVariants[0].id, { manual: false });
  renderInspectionCopy(null);
  updateControlLabels();
  resetMetrics();
  if (!keepCamera) showOverview({ manual: false });
  return true;
}

function stopDirector() {
  if (!state.director.playing && !state.director.paused) return;
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
  if (time < 2200) {
    setDirectorSegment('atlas-establish', '01 · Atlas：独立舞台与主体契约', () => {
      selectSubject(ATLAS_ID, { manual: false });
      showOverview({ manual: false });
      setExploded(false, { manual: false });
      setVariant('graphite-field', { manual: false });
      setAutoRotate(true, { manual: false });
    });
  } else if (time < 5200) {
    setDirectorSegment('atlas-sensor', '02 · Atlas：传感系统镜头', () => {
      selectHotspot('sensor-system', { manual: false });
    });
  } else if (time < 8200) {
    setDirectorSegment('atlas-energy', '03 · Atlas：能源材质变体', () => {
      selectHotspot('energy-module', { manual: false });
      setVariant('rescue-orange', { manual: false });
    });
  } else if (time < 10_500) {
    setDirectorSegment('atlas-explode', '04 · Atlas：零件分解层级', () => {
      selectHotspot('all-terrain-drive', { manual: false });
      setExploded(true, { manual: false });
    });
  } else if (time < 13_200) {
    setDirectorSegment('nova-establish', '05 · 同一展台切换 Nova 能源节点', () => {
      selectSubject(NOVA_ID, { manual: false });
      showOverview({ manual: false });
      setAutoRotate(true, { manual: false });
    });
  } else if (time < 15_900) {
    setDirectorSegment('nova-sensor', '06 · Nova：主体自带局部动画', () => {
      selectHotspot('sensor-crown', { manual: false });
    });
  } else if (time < 18_800) {
    setDirectorSegment('nova-core', '07 · Nova：透明能源核心与配色', () => {
      selectHotspot('power-core', { manual: false });
      setVariant('hazard-amber', { manual: false });
    });
  } else {
    setDirectorSegment('nova-explode', '08 · Nova：复用分解与热点系统', () => {
      selectHotspot('stabilizers', { manual: false });
      setExploded(true, { manual: false });
    });
  }
}

function playDirector() {
  if (state.activeSubjectId !== ATLAS_ID) selectSubject(ATLAS_ID, { manual: false });
  state.director.playing = true;
  state.director.paused = false;
  state.director.elapsedMs = 0;
  state.director.segmentId = null;
  directorSegment = null;
  ui.directorState.textContent = 'PLAYING / 22S';
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
  ui.directorState.textContent = state.director.paused ? 'PAUSED' : 'PLAYING / 22S';
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
    ui.directorCaption.textContent = 'Scene + 2 Subjects + Presentation 已完成';
    updateControlLabels();
    return;
  }
  applyDirectorTimeline();
  ui.timelineProgress.style.width = ((state.director.elapsedMs / DIRECTOR_DURATION_MS) * 100) + '%';
}

function updateExplosion(deltaSeconds) {
  if (!subject) return;
  const speed = state.reducedMotion ? 1 : Math.min(1, deltaSeconds * 5.5);
  state.explodeProgress = THREE.MathUtils.lerp(state.explodeProgress, state.explodeTarget, speed);
  for (const [id, part] of Object.entries(subject.parts)) {
    const origin = subject.partOrigins.get(id);
    const offset = subject.explodeOffsets[id] || [0, 0, 0];
    part.position.set(
      origin.x + offset[0] * state.explodeProgress,
      origin.y + offset[1] * state.explodeProgress,
      origin.z + offset[2] * state.explodeProgress,
    );
  }
}

function updateHotspotPositions() {
  if (!subject) return;
  const width = innerWidth;
  const height = innerHeight;
  for (const hotspot of subject.hotspots) {
    const socket = subject.sockets[hotspot.socketId];
    const button = hotspotButtons.get(hotspot.id);
    if (!socket || !button) continue;
    socket.getWorldPosition(tempWorld);
    tempProjected.copy(tempWorld).project(camera);
    const x = (tempProjected.x * 0.5 + 0.5) * width;
    const y = (-tempProjected.y * 0.5 + 0.5) * height;
    const visible = tempProjected.z > -1 && tempProjected.z < 1
      && x > 18 && x < width - 18
      && y > 70 && y < height - (compactQuery.matches ? 310 : 48);
    button.hidden = !visible;
    if (visible) {
      button.style.left = x + 'px';
      button.style.top = y + 'px';
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

function snapshot() {
  return {
    version: WORKBENCH_VERSION,
    status: state.status,
    route: location.pathname,
    architecture: {
      renderCore: 'standalone-threejs',
      scene: stage?.profile?.id || null,
      subject: subject?.manifest.id || null,
      subjectAdapter: 'product-subject-v1',
      presentation: 'product-stage-v2',
      world: stage?.profile?.world || null,
    },
    registryAudit: auditProductSubjectDefinitions(),
    availableSubjectIds: PRODUCT_SUBJECT_DEFINITIONS.map((entry) => entry.id),
    sceneProfile: stage?.profile || null,
    subjectManifest: subject?.manifest || null,
    subjectAdapter: subject?.getSnapshot() || null,
    provenance: subject?.manifest ? {
      origin: subject.manifest.origin,
      qualityClaim: subject.manifest.qualityClaim,
      sourceModule: subject.manifest.sourceModule,
      externalModelCount: subject.manifest.externalModelCount,
    } : null,
    activeSubjectId: state.activeSubjectId,
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
  subject?.dispose();
  stage?.dispose();
  renderer?.dispose();
  subjectButtons.clear();
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
  subject?.update(elapsedSeconds, deltaSeconds, state.reducedMotion);
  if (state.autoRotate && !state.reducedMotion && !cameraTransition && subject) {
    subject.root.rotation.y += deltaSeconds * 0.16;
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
    const registryAudit = auditProductSubjectDefinitions();
    if (!registryAudit.valid) throw new Error('Subject registry invalid: ' + registryAudit.issues.join(', '));

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
    createSubjectControls();
    selectSubject(PRODUCT_SUBJECT_DEFINITIONS[0].id, { manual: false, keepCamera: true });
    setQuality(state.quality);
    renderInspectionCopy(null);
    updateControlLabels();

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
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
      if (digit && subject.hotspots[Number(digit[1]) - 1]) {
        selectHotspot(subject.hotspots[Number(digit[1]) - 1].id);
      } else if (event.code === 'KeyS') {
        const current = PRODUCT_SUBJECT_DEFINITIONS.findIndex((entry) => entry.id === state.activeSubjectId);
        selectSubject(PRODUCT_SUBJECT_DEFINITIONS[(current + 1) % PRODUCT_SUBJECT_DEFINITIONS.length].id);
      } else if (event.code === 'KeyV') {
        const variants = subject.materialVariants;
        const current = variants.findIndex((variant) => variant.id === state.activeVariantId);
        setVariant(variants[(current + 1) % variants.length].id);
      } else if (event.code === 'KeyE') {
        setExploded(!state.exploded);
      } else if (event.code === 'Space') {
        toggleDirectorPause();
      } else if (event.code === 'Escape') {
        showOverview();
      } else {
        return;
      }
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
  selectSubject,
  selectHotspot,
  setVariant,
  setExploded,
  setQuality,
  resetMetrics,
  dispose,
};

init();
