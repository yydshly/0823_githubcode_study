import * as THREE from 'three';
import {
  INDUSTRIAL_CAMERA_PRESETS,
  INDUSTRIAL_HOTSPOTS,
  INDUSTRIAL_MATERIAL_VARIANTS,
  INDUSTRIAL_OVERVIEW_CAMERA,
  INDUSTRIAL_SHOWROOM_PROVENANCE,
  INDUSTRIAL_SHOWROOM_SUBJECT,
  INDUSTRIAL_SHOWROOM_VERSION,
  INDUSTRIAL_STAGE,
  isIndustrialShowroomRoute,
} from '/@cot-research/industrial-showroom-config.js';
import { createAtlasInspectionRover } from '/@cot-research/industrial-showroom-asset.js';

if (!isIndustrialShowroomRoute()) {
  throw new Error('Industrial showroom entry requires the canonical /studio?showcase=industrial-showroom route');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const asset = createAtlasInspectionRover();
const hotspotById = new Map(INDUSTRIAL_HOTSPOTS.map((hotspot) => [hotspot.id, hotspot]));
const hotspotProjectionCamera = new THREE.PerspectiveCamera(50, 1, 0.05, 4000);
const hotspotProjectionLookAt = new THREE.Vector3();
const hotspotProjectionWorld = new THREE.Vector3();
const hotspotProjectionNdc = new THREE.Vector3();

let presentation = null;
let unregisterTick = null;
let cameraTransition = null;
let ui = null;
let disposed = false;
let beforeUnloadHandler = null;
let mediaChangeHandler = null;
let resizeHandler = null;
let keydownHandler = null;
let worldOverviewCamera = null;
const projectedPoints = INDUSTRIAL_HOTSPOTS.map((hotspot) => ({
  id: hotspot.id,
  visible: false,
  x: null,
  y: null,
  ndc: [0, 0, 0],
  world: [0, 0, 0],
}));
let lifecycleRaf = 0;

const controller = {
  version: INDUSTRIAL_SHOWROOM_VERSION,
  status: 'booting',
  error: null,
  subject: Object.freeze({ ...INDUSTRIAL_SHOWROOM_SUBJECT }),
  provenance: Object.freeze({
    ...INDUSTRIAL_SHOWROOM_PROVENANCE,
    generatedMeshCount: asset.manifest.generatedMeshCount,
  }),
  materialVariants: asset.materialVariants,
  hotspots: INDUSTRIAL_HOTSPOTS,
  cameraPresets: INDUSTRIAL_CAMERA_PRESETS,
  selectedSubjectId: INDUSTRIAL_SHOWROOM_SUBJECT.id,
  selectedPartId: null,
  selectedVariantId: asset.selectedVariantId,
  selectedHotspotId: null,
  activeCameraPresetId: 'overview',
  reducedMotion: reducedMotionQuery.matches,
  motion: {
    active: false,
    durationMs: reducedMotionQuery.matches ? 0 : INDUSTRIAL_STAGE.cameraTransitionMs,
    autoRotate: false,
  },
  studio: null,
  manifest: asset.manifest,
};

function findRendererCanvas() {
  const canvases = [...document.querySelectorAll('canvas')];
  return canvases.find((canvas) => canvas.width > 1 && canvas.height > 1) || canvases[0] || null;
}

async function waitForStudio(timeoutMs = 300000) {
  const startedAt = performance.now();
  while (performance.now() - startedAt < timeoutMs) {
    const studio = window.__STUDIO;
    if (window.__GAME_READY === true && studio?.active === true) {
      const required = ['mountObject3D', 'unmountObject3D', 'invalidate', 'registerTick'];
      const missing = required.filter((name) => typeof studio[name] !== 'function');
      if (missing.length) throw new Error(`Studio extension API missing: ${missing.join(', ')}`);
      return studio;
    }
    await sleep(100);
  }
  throw new Error('Industrial showroom could not acquire the active Studio renderer');
}

function sampleGroundHeight(studio, x, z) {
  const original = studio.getCamera();
  studio.setCamera({ mode: 'fly', pos: [x, 0, z], groundRel: true });
  const y = studio.getCamera().pos[1];
  studio.setCamera(original);
  return y;
}

function makeContactShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 12, 128, 128, 122);
  gradient.addColorStop(0, 'rgba(0,0,0,.82)');
  gradient.addColorStop(0.42, 'rgba(0,0,0,.5)');
  gradient.addColorStop(0.76, 'rgba(0,0,0,.16)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'atlas-procedural-contact-shadow';
  texture.needsUpdate = true;
  return texture;
}

function createPresentation(rootAsset, groundY) {
  const root = new THREE.Group();
  root.name = 'cot-industrial-showroom-root';
  root.position.set(INDUSTRIAL_STAGE.anchor[0], groundY, INDUSTRIAL_STAGE.anchor[1]);
  root.userData.routeOwner = 'industrial-showroom';

  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x111719,
    roughness: 0.64,
    metalness: 0.48,
  });
  const platformTopMaterial = new THREE.MeshStandardMaterial({
    color: 0x293237,
    roughness: 0.42,
    metalness: 0.72,
  });
  const backdropMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b1012,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const ribMaterial = new THREE.MeshStandardMaterial({
    color: 0x222b2f,
    roughness: 0.46,
    metalness: 0.7,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa33f,
    emissive: 0x6c2c08,
    emissiveIntensity: 0.9,
    roughness: 0.34,
    metalness: 0.5,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.86, 0.18, 72), platformMaterial);
  base.name = 'industrial-showroom-pedestal-base';
  base.position.y = 0.09;
  base.receiveShadow = true;
  root.add(base);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(4.42, 4.42, 0.055, 72), platformTopMaterial);
  top.name = 'industrial-showroom-pedestal-top';
  top.position.y = 0.2075;
  top.receiveShadow = true;
  root.add(top);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.035, 8, 96), accentMaterial);
  ring.name = 'industrial-showroom-pedestal-ring';
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.245;
  root.add(ring);

  const shadowTexture = makeContactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    toneMapped: false,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 4.5), shadowMaterial);
  contactShadow.name = 'industrial-showroom-contact-shadow';
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.242, 0);
  contactShadow.renderOrder = 3;
  root.add(contactShadow);

  const grid = new THREE.GridHelper(15, 30, 0x6c7f87, 0x253036);
  grid.name = 'industrial-showroom-floor-grid';
  grid.position.y = 0.006;
  grid.material.transparent = true;
  grid.material.opacity = 0.26;
  root.add(grid);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7.5), backdropMaterial);
  backWall.name = 'industrial-showroom-backdrop';
  backWall.position.set(0, 3.65, -4.95);
  backWall.receiveShadow = true;
  root.add(backWall);

  for (let index = -3; index <= 3; index++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.075, 6.8, 0.13), ribMaterial);
    rib.name = `industrial-showroom-backdrop-rib-${index + 4}`;
    rib.position.set(index * 1.82, 3.55, -4.84);
    rib.castShadow = true;
    root.add(rib);
  }
  const lightBar = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.065, 0.08), accentMaterial);
  lightBar.name = 'industrial-showroom-header-light';
  lightBar.position.set(0, 6.68, -4.82);
  root.add(lightBar);

  const keyTarget = new THREE.Object3D();
  keyTarget.position.set(0, 1.25, 0);
  root.add(keyTarget);
  const keyLight = new THREE.SpotLight(0xffd5a8, 420, 24, 0.52, 0.52, 2);
  keyLight.name = 'industrial-showroom-key-light';
  keyLight.position.set(-5.8, 7.6, 6.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0002;
  keyLight.target = keyTarget;
  root.add(keyLight);

  const rimTarget = new THREE.Object3D();
  rimTarget.position.set(0, 1.65, -0.3);
  root.add(rimTarget);
  const rimLight = new THREE.SpotLight(0x6adfff, 280, 20, 0.58, 0.6, 2);
  rimLight.name = 'industrial-showroom-rim-light';
  rimLight.position.set(5.8, 5.4, -4.2);
  rimLight.target = rimTarget;
  root.add(rimLight);

  rootAsset.position.set(0, 0.24, 0);
  rootAsset.rotation.y = INDUSTRIAL_STAGE.initialYaw;
  root.add(rootAsset);
  root.updateMatrixWorld(true);

  return { root, shadowTexture };
}

function disposePresentation(value) {
  if (!value?.root) return;
  value.root.remove(asset.root);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const spotLights = new Set();
  value.root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.isSpotLight) spotLights.add(object);
    const entries = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of entries) if (material) materials.add(material);
  });
  for (const material of materials) {
    for (const candidate of Object.values(material)) {
      if (candidate?.isTexture) textures.add(candidate);
    }
  }
  if (value.shadowTexture) textures.add(value.shadowTexture);
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  for (const spotLight of spotLights) spotLight.dispose();
  value.root.clear();
}

function toWorldPose(localPreset) {
  if (!presentation) return localPreset;
  const [originX, originY, originZ] = presentation.root.position.toArray();
  return Object.freeze({
    id: localPreset.id,
    pos: Object.freeze([
      originX + localPreset.pos[0],
      originY + localPreset.pos[1],
      originZ + localPreset.pos[2],
    ]),
    lookAt: Object.freeze([
      originX + localPreset.lookAt[0],
      originY + localPreset.lookAt[1],
      originZ + localPreset.lookAt[2],
    ]),
    fov: localPreset.fov,
    mode: 'fly',
  });
}

function interpolateArray(from, to, t) {
  return from.map((value, index) => THREE.MathUtils.lerp(value, to[index], t));
}

function applyCamera(pose) {
  controller.studio.setCamera({
    mode: 'fly',
    pos: [...pose.pos],
    lookAt: [...pose.lookAt],
    fov: pose.fov,
    rollDeg: 0,
  });
}

function cancelCameraTransition() {
  cameraTransition = null;
  controller.motion.active = false;
}

function beginCameraTransition(target) {
  if (!controller.studio || !target) return false;
  const durationMs = controller.reducedMotion ? 0 : INDUSTRIAL_STAGE.cameraTransitionMs;
  controller.motion.durationMs = durationMs;
  cancelCameraTransition();
  if (durationMs === 0) {
    applyCamera(target);
    controller.motion.active = false;
    controller.studio.invalidate();
    updateProjectedHotspots();
    return true;
  }
  const current = controller.studio.getCamera();
  cameraTransition = {
    elapsedMs: 0,
    durationMs,
    from: {
      pos: current.pos,
      lookAt: current.lookAt,
      fov: current.fov,
    },
    target,
  };
  controller.motion.active = true;
  return true;
}

function completeCameraTransition() {
  if (!cameraTransition) return;
  applyCamera(cameraTransition.target);
  cameraTransition = null;
  controller.motion.active = false;
  ui?.renderMotion();
}

function projectHotspot(hotspot, camera, rect, point) {
  const socket = asset.sockets[hotspot.socketId];
  if (!socket) {
    point.visible = false;
    point.x = null;
    point.y = null;
    return point;
  }
  socket.getWorldPosition(hotspotProjectionWorld);
  hotspotProjectionNdc.copy(hotspotProjectionWorld).project(camera);
  const ndc = hotspotProjectionNdc;
  const visible = Number.isFinite(ndc.x) && Number.isFinite(ndc.y) && Number.isFinite(ndc.z)
    && ndc.z >= -1 && ndc.z <= 1
    && ndc.x >= -1.08 && ndc.x <= 1.08
    && ndc.y >= -1.08 && ndc.y <= 1.08;
  point.visible = visible;
  point.x = visible ? Math.round((rect.left + (ndc.x * 0.5 + 0.5) * rect.width) * 10) / 10 : null;
  point.y = visible ? Math.round((rect.top + (-ndc.y * 0.5 + 0.5) * rect.height) * 10) / 10 : null;
  point.ndc[0] = Math.round(ndc.x * 10000) / 10000;
  point.ndc[1] = Math.round(ndc.y * 10000) / 10000;
  point.ndc[2] = Math.round(ndc.z * 10000) / 10000;
  point.world[0] = Math.round(hotspotProjectionWorld.x * 1000) / 1000;
  point.world[1] = Math.round(hotspotProjectionWorld.y * 1000) / 1000;
  point.world[2] = Math.round(hotspotProjectionWorld.z * 1000) / 1000;
  return point;
}

function updateProjectedHotspots() {
  if (!presentation || !controller.studio || !ui) return projectedPoints;
  const canvas = findRendererCanvas();
  if (!canvas) return projectedPoints;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return projectedPoints;
  const cameraState = controller.studio.getCamera();
  hotspotProjectionCamera.fov = cameraState.fov;
  hotspotProjectionCamera.aspect = rect.width / rect.height;
  hotspotProjectionCamera.position.fromArray(cameraState.pos);
  hotspotProjectionCamera.up.set(0, 1, 0);
  hotspotProjectionLookAt.fromArray(cameraState.lookAt);
  hotspotProjectionCamera.lookAt(hotspotProjectionLookAt);
  if (cameraState.rollDeg) hotspotProjectionCamera.rotateZ(THREE.MathUtils.degToRad(cameraState.rollDeg));
  hotspotProjectionCamera.updateProjectionMatrix();
  hotspotProjectionCamera.updateMatrixWorld(true);
  presentation.root.updateMatrixWorld(true);
  for (let index = 0; index < INDUSTRIAL_HOTSPOTS.length; index++) {
    projectHotspot(INDUSTRIAL_HOTSPOTS[index], hotspotProjectionCamera, rect, projectedPoints[index]);
  }
  ui.renderMarkers(projectedPoints);
  return projectedPoints;
}

function tick(dt) {
  if (disposed || controller.status !== 'ready') return false;
  let dirty = false;
  if (cameraTransition) {
    cameraTransition.elapsedMs += Math.max(0, Math.min(0.1, Number(dt) || 0)) * 1000;
    const linear = Math.min(1, cameraTransition.elapsedMs / cameraTransition.durationMs);
    const eased = linear * linear * (3 - 2 * linear);
    applyCamera({
      pos: interpolateArray(cameraTransition.from.pos, cameraTransition.target.pos, eased),
      lookAt: interpolateArray(cameraTransition.from.lookAt, cameraTransition.target.lookAt, eased),
      fov: THREE.MathUtils.lerp(cameraTransition.from.fov, cameraTransition.target.fov, eased),
    });
    dirty = true;
    if (linear >= 1) completeCameraTransition();
  }
  if (controller.motion.autoRotate && !controller.reducedMotion && !controller.motion.active) {
    asset.root.rotation.y += Math.max(0, Math.min(0.1, Number(dt) || 0)) * INDUSTRIAL_STAGE.autoRotateRadPerSecond;
    dirty = true;
  }
  if (dirty) updateProjectedHotspots();
  return dirty;
}

function isGarageRoute() {
  return (window.location.pathname.replace(/\/+$/, '') || '/') === '/';
}

function suspendShowroom() {
  if (disposed || controller.status !== 'ready') return false;
  cancelCameraTransition();
  controller.motion.autoRotate = false;
  controller.status = 'suspended';
  ui?.renderMotion();
  ui?.setVisible(false);
  return true;
}

function resumeShowroom() {
  if (disposed || controller.status !== 'suspended') return false;
  controller.status = 'ready';
  ui?.setVisible(true);
  ui?.renderSelection();
  ui?.renderVariant();
  ui?.renderMotion();
  updateProjectedHotspots();
  return true;
}

function monitorDomLifecycle() {
  lifecycleRaf = 0;
  if (disposed) return;
  const canonicalRoute = isIndustrialShowroomRoute();
  if (canonicalRoute && controller.studio?.active === true) {
    resumeShowroom();
    if (controller.status === 'ready') updateProjectedHotspots();
  } else if (canonicalRoute || isGarageRoute()) {
    suspendShowroom();
  } else {
    controller.dispose();
    return;
  }
  lifecycleRaf = requestAnimationFrame(monitorDomLifecycle);
}

function startDomLifecycleMonitor() {
  if (!disposed && !lifecycleRaf) lifecycleRaf = requestAnimationFrame(monitorDomLifecycle);
}

function mountInterface() {
  const panel = document.createElement('section');
  panel.id = 'cot-industrial-showroom';
  panel.dataset.ready = 'false';
  panel.innerHTML = `
    <style>
      #cot-industrial-showroom{--is-accent:#ffa33f;--is-cyan:#8feaff;position:fixed;z-index:100004;left:18px;top:18px;width:min(370px,calc(100vw - 36px));overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:18px;color:#edf4f3;background:linear-gradient(155deg,rgba(10,15,17,.96),rgba(7,11,13,.91));box-shadow:0 28px 90px rgba(0,0,0,.56);backdrop-filter:blur(18px);font:13px/1.45 Inter,ui-sans-serif,system-ui,sans-serif}
      #cot-industrial-showroom *{box-sizing:border-box}#cot-industrial-showroom button{font:inherit;touch-action:manipulation}
      #cot-industrial-showroom .is-head{padding:15px 16px 13px;border-bottom:1px solid rgba(255,255,255,.08)}
      #cot-industrial-showroom .is-kicker{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#9caeae;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
      #cot-industrial-showroom .is-badge{padding:4px 7px;border:1px solid rgba(143,234,255,.28);border-radius:999px;color:var(--is-cyan);letter-spacing:.08em;background:rgba(143,234,255,.07)}
      #cot-industrial-showroom h1{margin:10px 0 4px;color:#fff;font-size:20px;line-height:1.05;letter-spacing:.015em}#cot-industrial-showroom .is-sub{margin:0;color:#a9b8b8}
      #cot-industrial-showroom .is-proof{margin-top:11px;padding:8px 10px;border-left:3px solid var(--is-accent);color:#d8e2df;background:rgba(255,163,63,.07);font-size:11px}
      #cot-industrial-showroom .is-detail{min-height:86px;padding:13px 16px 10px;border-bottom:1px solid rgba(255,255,255,.07)}#cot-industrial-showroom .is-detail small{display:block;color:var(--is-accent);font-weight:800;letter-spacing:.1em}#cot-industrial-showroom .is-detail strong{display:block;margin-top:3px;color:#fff;font-size:15px}#cot-industrial-showroom .is-detail p{margin:4px 0 0;color:#aebcbb}
      #cot-industrial-showroom .is-hotspot-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:10px 12px}
      #cot-industrial-showroom .is-hotspot-card{min-width:0;min-height:54px;padding:7px 5px;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#b7c3c2;background:rgba(255,255,255,.035);cursor:pointer}#cot-industrial-showroom .is-hotspot-card span{display:block;color:var(--is-accent);font-weight:900}#cot-industrial-showroom .is-hotspot-card[aria-pressed=true]{border-color:rgba(255,163,63,.64);color:#fff;background:rgba(255,163,63,.12)}
      #cot-industrial-showroom .is-section-label{padding:0 14px;color:#748687;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      #cot-industrial-showroom .is-variants{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:7px 12px 10px}
      #cot-industrial-showroom .is-variant{min-width:0;min-height:44px;padding:6px;border:1px solid rgba(255,255,255,.12);border-radius:9px;color:#adbbba;background:#151d20;cursor:pointer;font-size:10px}#cot-industrial-showroom .is-variant[aria-pressed=true]{border-color:var(--is-cyan);color:#071113;background:var(--is-cyan);font-weight:800}
      #cot-industrial-showroom .is-actions{display:flex;gap:6px;padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,.07)}#cot-industrial-showroom .is-actions button{min-height:44px;padding:7px 10px;border:1px solid rgba(255,255,255,.14);border-radius:9px;color:#e9f0ef;background:#182124;cursor:pointer}#cot-industrial-showroom .is-actions button:first-child{flex:1}#cot-industrial-showroom .is-actions button[aria-pressed=true]{border-color:rgba(255,163,63,.5);color:var(--is-accent)}#cot-industrial-showroom .is-actions button:disabled{opacity:.42;cursor:not-allowed}
      #cot-industrial-showroom .is-status{padding:0 14px 11px;color:#758788;font-size:10px}#cot-industrial-showroom button:focus-visible,#cot-industrial-hotspots button:focus-visible{outline:2px solid #fff;outline-offset:2px}
      #cot-industrial-hotspots{position:fixed;z-index:100003;inset:0;pointer-events:none;font:800 11px/1 Inter,ui-sans-serif,system-ui,sans-serif}
      #cot-industrial-hotspots .is-marker{position:absolute;left:0;top:0;display:flex;align-items:center;gap:7px;min-width:44px;min-height:44px;padding:0 10px 0 0;border:0;border-radius:999px;color:#071113;background:rgba(232,244,241,.92);box-shadow:0 10px 28px rgba(0,0,0,.38);cursor:pointer;pointer-events:auto;transform:translate3d(-200px,-200px,0);transition:opacity .16s ease,transform .16s ease}#cot-industrial-hotspots .is-marker[hidden]{display:none}#cot-industrial-hotspots .is-marker b{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;color:#081011;background:var(--is-accent,#ffa33f);font-size:12px}#cot-industrial-hotspots .is-marker[aria-pressed=true]{color:#fff;background:rgba(12,18,20,.94);box-shadow:0 0 0 2px #ffa33f,0 12px 34px rgba(0,0,0,.5)}
      html[data-cot-industrial-showroom=true] .cot-studio .dock{display:none!important}
      @media(max-width:640px){#cot-industrial-showroom{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:43vh;overflow:auto;border-radius:16px}#cot-industrial-showroom .is-head{padding:10px 12px 8px}#cot-industrial-showroom h1{margin-top:6px;font-size:17px}#cot-industrial-showroom .is-sub,#cot-industrial-showroom .is-proof{display:none}#cot-industrial-showroom .is-detail{min-height:65px;padding:8px 12px 7px}#cot-industrial-showroom .is-detail p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#cot-industrial-showroom .is-hotspot-list{padding:7px 8px 6px}#cot-industrial-showroom .is-hotspot-card{min-height:48px}#cot-industrial-showroom .is-section-label{display:none}#cot-industrial-showroom .is-variants{padding:0 8px 7px}#cot-industrial-showroom .is-actions{padding:7px 8px 8px}#cot-industrial-showroom .is-status{display:none}#cot-industrial-hotspots .is-marker{width:44px;padding:0}#cot-industrial-hotspots .is-marker span{display:none}}
      @media(prefers-reduced-motion:reduce){#cot-industrial-showroom,#cot-industrial-showroom *,#cot-industrial-hotspots .is-marker{animation:none!important;transition-duration:0s!important;scroll-behavior:auto!important;backdrop-filter:none!important}}
    </style>
    <div class="is-head">
      <div class="is-kicker"><span>ATLAS / FIELD SYSTEMS</span><span class="is-badge">PROGRAMMATIC PROTOTYPE</span></div>
      <h1>ATLAS INSPECTION ROVER</h1>
      <p class="is-sub">工业巡检设备概念展示 · 复用同一 Studio 渲染、镜头与后期管线</p>
      <div class="is-proof">程序化资产 · Prototype / L2 · 非商业生产模型 · 0 个外部 3D 模型</div>
    </div>
    <div class="is-detail" aria-live="polite"><small>OVERVIEW</small><strong>可维护的工业巡检平台</strong><p>选择热点查看构造层级，或切换材料验证同一几何的产品表达。</p></div>
    <div class="is-hotspot-list" role="group" aria-label="产品热点">
      ${INDUSTRIAL_HOTSPOTS.map((hotspot) => `<button type="button" class="is-hotspot-card" data-hotspot-card="${hotspot.id}" aria-pressed="false"><span>${String(hotspot.index).padStart(2, '0')}</span>${hotspot.label}</button>`).join('')}
    </div>
    <div class="is-section-label">Material variants · V 循环</div>
    <div class="is-variants" role="radiogroup" aria-label="材质变体">
      ${INDUSTRIAL_MATERIAL_VARIANTS.map((variant) => `<button type="button" class="is-variant" data-variant="${variant.id}" role="radio" aria-checked="${variant.id === controller.selectedVariantId}" aria-pressed="${variant.id === controller.selectedVariantId}">${variant.label}</button>`).join('')}
    </div>
    <div class="is-actions"><button type="button" data-action="overview">返回全景 · Esc</button><button type="button" data-action="motion" aria-pressed="${controller.motion.autoRotate}">转台 ${controller.motion.autoRotate ? '开启' : '关闭'}</button></div>
    <div class="is-status">正在连接 Scene Studio… · 1–3 热点 / V 材质 / Esc 全景</div>`;

  const markerLayer = document.createElement('div');
  markerLayer.id = 'cot-industrial-hotspots';
  markerLayer.setAttribute('aria-label', '画面热点');
  const markerButtons = new Map();
  for (const hotspot of INDUSTRIAL_HOTSPOTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'is-marker';
    button.dataset.hotspotMarker = hotspot.id;
    button.setAttribute('aria-label', `${hotspot.index}. ${hotspot.label}`);
    button.setAttribute('aria-pressed', 'false');
    button.hidden = true;
    button.innerHTML = `<b>${hotspot.index}</b><span>${hotspot.label}</span>`;
    markerLayer.appendChild(button);
    markerButtons.set(hotspot.id, button);
  }
  document.body.append(panel, markerLayer);
  document.documentElement.dataset.cotIndustrialShowroom = 'true';

  const cleanups = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  for (const button of panel.querySelectorAll('[data-hotspot-card]')) {
    listen(button, 'click', () => controller.selectHotspot(button.dataset.hotspotCard));
  }
  for (const button of markerButtons.values()) {
    listen(button, 'click', () => controller.selectHotspot(button.dataset.hotspotMarker));
  }
  for (const button of panel.querySelectorAll('[data-variant]')) {
    listen(button, 'click', () => controller.selectVariant(button.dataset.variant));
  }
  listen(panel.querySelector('[data-action=overview]'), 'click', () => controller.showOverview());
  listen(panel.querySelector('[data-action=motion]'), 'click', () => controller.setAutoRotate(!controller.motion.autoRotate));

  const detail = panel.querySelector('.is-detail');
  const status = panel.querySelector('.is-status');
  const motionButton = panel.querySelector('[data-action=motion]');
  return {
    panel,
    markerLayer,
    setVisible(visible) {
      panel.hidden = !visible;
      markerLayer.hidden = !visible;
    },
    ready() {
      panel.dataset.ready = 'true';
      status.textContent = '同一 Studio 场景内挂载 · 0 坦克 actor · 1–3 热点 / V 材质 / Esc 全景';
    },
    error(message) {
      panel.dataset.ready = 'error';
      status.textContent = `展厅启动失败：${message}`;
      detail.innerHTML = `<small>STARTUP ERROR</small><strong>无法挂载展示对象</strong><p>${String(message)}</p>`;
    },
    renderSelection() {
      const hotspot = hotspotById.get(controller.selectedHotspotId);
      if (hotspot) {
        detail.innerHTML = `<small>${hotspot.eyebrow}</small><strong>${hotspot.label}</strong><p>${hotspot.detail}</p>`;
      } else {
        detail.innerHTML = '<small>OVERVIEW</small><strong>可维护的工业巡检平台</strong><p>选择热点查看构造层级，或切换材料验证同一几何的产品表达。</p>';
      }
      for (const button of document.querySelectorAll('#cot-industrial-showroom [data-hotspot-card],#cot-industrial-hotspots [data-hotspot-marker]')) {
        const id = button.dataset.hotspotCard || button.dataset.hotspotMarker;
        button.setAttribute('aria-pressed', String(id === controller.selectedHotspotId));
      }
    },
    renderVariant() {
      for (const button of panel.querySelectorAll('[data-variant]')) {
        const active = button.dataset.variant === controller.selectedVariantId;
        button.setAttribute('aria-checked', String(active));
        button.setAttribute('aria-pressed', String(active));
      }
    },
    renderMotion() {
      motionButton.disabled = controller.reducedMotion;
      motionButton.setAttribute('aria-pressed', String(controller.motion.autoRotate));
      motionButton.textContent = controller.reducedMotion
        ? '减少动态'
        : `转台 ${controller.motion.autoRotate ? '开启' : '关闭'}`;
    },
    renderMarkers(points) {
      for (const point of points) {
        const button = markerButtons.get(point.id);
        if (!button) continue;
        button.hidden = !point.visible;
        if (point.visible) button.style.transform = `translate3d(${Math.round(point.x - 22)}px,${Math.round(point.y - 22)}px,0)`;
      }
    },
    destroy() {
      while (cleanups.length) cleanups.pop()();
      panel.remove();
      markerLayer.remove();
      delete document.documentElement.dataset.cotIndustrialShowroom;
    },
  };
}

controller.selectVariant = function selectVariant(id) {
  if (!INDUSTRIAL_MATERIAL_VARIANTS.some((variant) => variant.id === id)) return false;
  asset.applyMaterialVariant(id);
  this.selectedVariantId = id;
  this.studio?.invalidate();
  ui?.renderVariant();
  return this.audit();
};

controller.selectHotspot = function selectHotspot(id) {
  const hotspot = hotspotById.get(id);
  const preset = this.cameraPresets.find((item) => item.id === hotspot?.cameraPresetId);
  if (!hotspot || !preset || this.status !== 'ready') return false;
  asset.root.rotation.y = INDUSTRIAL_STAGE.initialYaw;
  this.selectedSubjectId = INDUSTRIAL_SHOWROOM_SUBJECT.id;
  this.selectedPartId = hotspot.targetPartId;
  this.selectedHotspotId = hotspot.id;
  this.activeCameraPresetId = preset.id;
  this.motion.autoRotate = false;
  beginCameraTransition(preset);
  ui?.renderSelection();
  ui?.renderMotion();
  this.studio.invalidate();
  return true;
};

controller.showOverview = function showOverview() {
  if (this.status !== 'ready' || !worldOverviewCamera) return false;
  asset.root.rotation.y = INDUSTRIAL_STAGE.initialYaw;
  this.selectedPartId = null;
  this.selectedHotspotId = null;
  this.activeCameraPresetId = 'overview';
  this.motion.autoRotate = false;
  beginCameraTransition(worldOverviewCamera);
  ui?.renderSelection();
  ui?.renderMotion();
  this.studio.invalidate();
  return true;
};

controller.setAutoRotate = function setAutoRotate(enabled) {
  if (this.reducedMotion) enabled = false;
  const next = Boolean(enabled);
  if (next && (this.status !== 'ready' || !worldOverviewCamera)) return false;
  if (next) {
    cancelCameraTransition();
    asset.root.rotation.y = INDUSTRIAL_STAGE.initialYaw;
    applyCamera(worldOverviewCamera);
    this.selectedPartId = null;
    this.selectedHotspotId = null;
    this.activeCameraPresetId = 'overview';
    ui?.renderSelection();
    updateProjectedHotspots();
  }
  this.motion.autoRotate = next;
  ui?.renderMotion();
  this.studio?.invalidate();
  return this.motion.autoRotate;
};

controller.cycleVariant = function cycleVariant() {
  const index = INDUSTRIAL_MATERIAL_VARIANTS.findIndex((variant) => variant.id === this.selectedVariantId);
  const next = INDUSTRIAL_MATERIAL_VARIANTS[(index + 1) % INDUSTRIAL_MATERIAL_VARIANTS.length];
  return this.selectVariant(next.id);
};

controller.audit = function audit() {
  let meshCount = 0;
  let visibleMeshCount = 0;
  asset.root.traverse((object) => {
    if (!object.isMesh) return;
    meshCount++;
    if (object.visible) visibleMeshCount++;
  });
  const camera = this.studio?.getCamera?.() || null;
  const screenPoints = updateProjectedHotspots().map((point) => ({
    ...point,
    ndc: [...point.ndc],
    world: [...point.world],
  }));
  return {
    version: this.version,
    status: this.status,
    route: 'industrial-showroom',
    subject: {
      ...this.subject,
      exists: Boolean(asset.root),
      visible: asset.root.visible,
      meshCount,
      visibleMeshCount,
    },
    provenance: { ...this.provenance },
    meshFingerprint: asset.manifest.meshFingerprint,
    materialFingerprint: asset.getMaterialFingerprint(),
    selectedSubjectId: this.selectedSubjectId,
    selectedPartId: this.selectedPartId,
    selectedVariantId: this.selectedVariantId,
    selectedHotspotId: this.selectedHotspotId,
    activeCameraPresetId: this.activeCameraPresetId,
    hotspotCount: this.hotspots.length,
    cameraPresetCount: this.cameraPresets.length,
    socketCount: Object.keys(asset.sockets).length,
    screenPoints,
    camera,
    tankActorCount: this.studio?.listActors?.().length ?? 0,
    mountedObjectCount: this.studio?.mountedObjectCount ?? null,
    registeredTickCount: this.studio?.registeredTickCount ?? null,
    reducedMotion: this.reducedMotion,
    motion: { ...this.motion },
  };
};

function runCleanup(action) {
  try {
    action();
  } catch (error) {
    console.warn('[industrial-showroom] cleanup failed', error);
  }
}

function cleanupRuntime() {
  if (lifecycleRaf) cancelAnimationFrame(lifecycleRaf);
  lifecycleRaf = 0;
  cancelCameraTransition();
  controller.motion.autoRotate = false;
  if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (keydownHandler) window.removeEventListener('keydown', keydownHandler, true);
  if (mediaChangeHandler) reducedMotionQuery.removeEventListener?.('change', mediaChangeHandler);
  beforeUnloadHandler = null;
  resizeHandler = null;
  keydownHandler = null;
  mediaChangeHandler = null;
  const releaseTick = unregisterTick;
  unregisterTick = null;
  if (releaseTick) runCleanup(releaseTick);
  const doomedPresentation = presentation;
  presentation = null;
  if (doomedPresentation?.root && controller.studio) {
    runCleanup(() => controller.studio.unmountObject3D(doomedPresentation.root, { dispose: false }));
  }
  if (doomedPresentation) runCleanup(() => disposePresentation(doomedPresentation));
  runCleanup(() => asset.dispose());
  const doomedUi = ui;
  ui = null;
  if (doomedUi) runCleanup(() => doomedUi.destroy());
}

controller.dispose = function dispose() {
  if (disposed) return false;
  disposed = true;
  cleanupRuntime();
  this.status = 'disposed';
  if (window.__COT_INDUSTRIAL_SHOWROOM === this) delete window.__COT_INDUSTRIAL_SHOWROOM;
  return true;
};

async function init() {
  try {
    ui = mountInterface();
    ui.renderMotion();
    controller.studio = await waitForStudio();
    if (controller.studio.active !== true || !isIndustrialShowroomRoute()) {
      controller.dispose();
      return;
    }
    controller.studio.pause();
    controller.studio.clearActors();
    controller.studio.clearEffects();
    controller.studio.setRailVisible(false);
    const groundY = sampleGroundHeight(
      controller.studio,
      INDUSTRIAL_STAGE.anchor[0],
      INDUSTRIAL_STAGE.anchor[1],
    );
    presentation = createPresentation(asset.root, groundY);
    controller.studio.mountObject3D(presentation.root);
    controller.cameraPresets = Object.freeze(INDUSTRIAL_CAMERA_PRESETS.map(toWorldPose));
    worldOverviewCamera = toWorldPose(INDUSTRIAL_OVERVIEW_CAMERA);
    applyCamera(worldOverviewCamera);
    unregisterTick = controller.studio.registerTick(tick);
    controller.status = 'ready';
    controller.motion.autoRotate = false;
    controller.studio.invalidate();
    ui.ready();
    ui.renderSelection();
    ui.renderVariant();
    ui.renderMotion();
    updateProjectedHotspots();

    resizeHandler = () => updateProjectedHotspots();
    window.addEventListener('resize', resizeHandler, { passive: true });
    keydownHandler = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target?.closest?.('input,textarea,select,[contenteditable=true]')) return;
      const numberMatch = /^(?:Digit|Numpad)([1-3])$/.exec(event.code);
      const handled = Boolean(numberMatch) || event.code === 'KeyV' || event.code === 'Escape';
      if (!handled) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (numberMatch) controller.selectHotspot(INDUSTRIAL_HOTSPOTS[Number(numberMatch[1]) - 1].id);
      else if (event.code === 'KeyV') controller.cycleVariant();
      else controller.showOverview();
    };
    window.addEventListener('keydown', keydownHandler, true);
    mediaChangeHandler = (event) => {
      controller.reducedMotion = event.matches;
      controller.motion.durationMs = event.matches ? 0 : INDUSTRIAL_STAGE.cameraTransitionMs;
      if (event.matches) {
        controller.motion.autoRotate = false;
        completeCameraTransition();
      }
      ui?.renderMotion();
      controller.studio?.invalidate();
    };
    reducedMotionQuery.addEventListener?.('change', mediaChangeHandler);
    beforeUnloadHandler = () => controller.dispose();
    window.addEventListener('beforeunload', beforeUnloadHandler, { once: true });
    startDomLifecycleMonitor();
  } catch (error) {
    cleanupRuntime();
    controller.status = 'error';
    controller.error = String(error?.stack || error);
    console.error('[industrial-showroom]', error);
  }
}

window.__COT_INDUSTRIAL_SHOWROOM = controller;
init();

export { controller as INDUSTRIAL_SHOWROOM_CONTROLLER };
