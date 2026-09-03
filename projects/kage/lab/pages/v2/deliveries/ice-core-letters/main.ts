import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

const ICE_STATES = ['opening', 'air-bubbles', 'ash-band', 'pollen-summer', 'letter-ready'] as const;
type IceState = (typeof ICE_STATES)[number];

type IceCoreSnapshot = {
  ready: boolean;
  state: IceState;
  activeState: IceState;
  phase: IceState;
  activeLayer: IceState;
  activeIndex: number;
  depthIndex: number;
  progress: number;
  depth: number;
  cameraDepth: number;
  coreRotation: number;
  bubbleOpacity: number;
  ashOpacity: number;
  pollenOpacity: number;
  canvasVisualHash: string;
  dialogOpen: boolean;
  sealed: boolean;
  saved: boolean;
  draftLength: number;
  fallback: boolean;
  reducedMotion: boolean;
  environmentLoaded: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
  revision: string;
};

declare global {
  interface Window {
    __iceCoreLetters?: {
      snapshot: () => IceCoreSnapshot;
      goto: (state: IceState | number) => void;
      setState: (state: IceState | number) => void;
      setProgress: (progress: number) => void;
      complete: () => void;
      openLetter: () => void;
      closeLetter: () => void;
    };
  }
}

type SceneProfile = Readonly<{
  progress: number;
  focusY: number;
  cameraZ: number;
  coreRotation: number;
  bubble: number;
  ash: number;
  pollen: number;
  strata: number;
}>;

type BubbleSeed = Readonly<{ x: number; y: number; z: number; scale: number; phase: number; drift: number }>;
type PollenSeed = Readonly<{ x: number; y: number; z: number; scale: number; phase: number }>;

const STATE_PROFILES: Readonly<Record<IceState, SceneProfile>> = {
  opening: {
    progress: 0,
    focusY: 1.05,
    cameraZ: 15.4,
    coreRotation: -.2,
    bubble: .15,
    ash: .12,
    pollen: .08,
    strata: .42,
  },
  'air-bubbles': {
    progress: .22,
    focusY: 1.65,
    cameraZ: 7.05,
    coreRotation: .08,
    bubble: 1,
    ash: .12,
    pollen: .06,
    strata: .56,
  },
  'ash-band': {
    progress: .47,
    focusY: -.05,
    cameraZ: 6.45,
    coreRotation: .3,
    bubble: .24,
    ash: 1,
    pollen: .1,
    strata: .7,
  },
  'pollen-summer': {
    progress: .72,
    focusY: -1.72,
    cameraZ: 6.35,
    coreRotation: .5,
    bubble: .18,
    ash: .2,
    pollen: 1,
    strata: .78,
  },
  'letter-ready': {
    progress: 1,
    focusY: -2.6,
    cameraZ: 10.35,
    coreRotation: .72,
    bubble: .34,
    ash: .4,
    pollen: .58,
    strata: 1,
  },
};

const STATE_ANNOUNCEMENTS: Readonly<Record<IceState, string>> = {
  opening: '冰芯全貌已经出现，向下阅读会沿年代下潜。',
  'air-bubbles': '已抵达空气气泡层，古老空气被封存在透明冰层中。',
  'ash-band': '已抵达火山灰层，灰褐色颗粒形成清楚的年代标记。',
  'pollen-summer': '已抵达花粉夏季层，暖金颗粒记录曾经的生长季。',
  'letter-ready': '已经抵达冰芯底部，可以写一封给未来的信。',
};

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;
const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const amount = clamp((value - edge0) / Math.max(.00001, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};
const seeded = (seed: number): number => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return value - Math.floor(value);
};

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`ICE CORE LETTERS is missing ${selector}.`);
  return element;
}

function isIceState(value: string | undefined): value is IceState {
  return value !== undefined && (ICE_STATES as readonly string[]).includes(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ice-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const root = document.documentElement;
const app = document.querySelector<HTMLElement>('#app')
  ?? document.querySelector<HTMLElement>('body[data-experience]')
  ?? document.body;
const canvas = requireElement<HTMLCanvasElement>('#ice-canvas, .ice-canvas');
const dialog = requireElement<HTMLDialogElement>('#letter-dialog, [data-letter-dialog]');
const openButton = requireElement<HTMLButtonElement>('#open-letter, [data-open-letter]');
const closeButton = requireElement<HTMLButtonElement>('#close-letter, [data-close-letter]');
const fallbackScene = requireElement<HTMLElement | SVGElement>('#fallback-scene, [data-fallback]');
const liveStatus = document.querySelector<HTMLElement>('#live-status, [data-live-status]');
const form = document.querySelector<HTMLFormElement>('#letter-form, [data-letter-form]');
const draft = document.querySelector<HTMLTextAreaElement>('#letter-draft, [data-letter-draft]');
const letterStatus = document.querySelector<HTMLElement>('#letter-status, [data-letter-status]');
const chapters = ICE_STATES.map((state) => document.querySelector<HTMLElement>(
  `[data-scene="${state}"], [data-ice-state="${state}"], #${state}`,
));
const stateLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-scene-link], [data-state-link]'));

const params = new URLSearchParams(location.search);
const qualityValue = params.get('quality');
const quality: GeneratedQuality = qualityValue === 'high' || qualityValue === 'low' ? qualityValue : 'balanced';
const motionMode = params.get('motion');
const reducedMotion = motionMode === 'reduce' || params.get('reducedMotion') === '1'
  ? true
  : motionMode === 'full'
    ? false
    : matchMedia('(prefers-reduced-motion: reduce)').matches;
const fallbackValue = params.get('fallback');
const forceFallbackValue = params.get('forceFallback');
const forcedFallback = forceFallbackValue === '1'
  || forceFallbackValue === 'true'
  || fallbackValue === '1'
  || fallbackValue === 'true'
  || fallbackValue === 'canvas'
  || fallbackValue === 'webgl';
const deterministicReview = params.get('visual-review') === '1';
const revision = params.get('revision') ?? 'r125-final';

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let coreGroup: THREE.Group | null = null;
let outerIceMaterial: THREE.MeshPhysicalMaterial | null = null;
let innerIceMaterial: THREE.MeshPhysicalMaterial | null = null;
let strataMaterial: THREE.MeshPhysicalMaterial | null = null;
let bubbleMaterial: THREE.MeshPhysicalMaterial | null = null;
let ashMaterial: THREE.MeshPhysicalMaterial | null = null;
let ashDustMaterial: THREE.PointsMaterial | null = null;
let pollenMaterial: THREE.MeshPhysicalMaterial | null = null;
let bubbleMesh: THREE.InstancedMesh | null = null;
let pollenMesh: THREE.InstancedMesh | null = null;
let glowLight: THREE.PointLight | null = null;

const bubbleSeeds: BubbleSeed[] = [];
const pollenSeeds: PollenSeed[] = [];
let stateStops = ICE_STATES.map((state) => STATE_PROFILES[state].progress);
let targetProgress = 0;
let renderedProgress = 0;
let activeState: IceState = 'opening';
let activeIndex = 0;
let cameraDepth = STATE_PROFILES.opening.cameraZ;
let currentProfile: SceneProfile = STATE_PROFILES.opening;
let fallback = forcedFallback;
let sceneReady = false;
let environmentSettled = false;
let environmentLoaded = false;
let ready = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let canvasVisualHash = hashString('ice-core-opening');
let sealed = false;
let disposed = false;
let frameId = 0;
let scrollFrame = 0;
let lastFrameAt = performance.now();
const startedAt = lastFrameAt;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

function setDataset(name: string, value: string): void {
  root.dataset[name] = value;
  app.dataset[name] = value;
}

function markReady(): void {
  if (!sceneReady || !environmentSettled || ready) return;
  ready = true;
  setDataset('iceCoreReady', 'true');
}

function preloadEnvironment(): void {
  const image = new Image();
  const settle = (loaded: boolean): void => {
    environmentLoaded = loaded;
    environmentSettled = true;
    setDataset('environmentLoaded', String(loaded));
    markReady();
  };
  image.addEventListener('load', () => settle(true), { once: true });
  image.addEventListener('error', () => settle(false), { once: true });
  image.src = new URL('./assets/glacier-crevasse-v1.png', import.meta.url).href;
  if (image.complete) settle(image.naturalWidth > 0);
}

function announce(message: string): void {
  if (liveStatus) liveStatus.textContent = message;
}

function setFallbackState(reason: string): void {
  if (runtime) {
    runtime.dispose();
    runtime = null;
  }
  fallback = true;
  canvas.hidden = true;
  fallbackScene.toggleAttribute('hidden', false);
  fallbackScene.dataset.fallbackReason = reason;
  setDataset('fallback', 'true');
  setDataset('iceCoreReady', 'false');
  sceneReady = true;
  frames = 0;
  drawCalls = 0;
  triangles = 0;
  applySemanticState(activeState, false);
  updateVisualHash(renderedProgress);
  markReady();
}

function elementState(link: HTMLAnchorElement): IceState | null {
  const explicit = link.dataset.sceneLink ?? link.dataset.stateLink;
  if (isIceState(explicit)) return explicit;
  const hash = link.hash.replace(/^#/, '');
  return isIceState(hash) ? hash : null;
}

function recalculateStateStops(): void {
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const measured = chapters.map((chapter, index) => {
    if (!chapter) return STATE_PROFILES[ICE_STATES[index]].progress;
    const rect = chapter.getBoundingClientRect();
    const pageTop = scrollY + rect.top;
    const targetTop = pageTop + rect.height * .5 - innerHeight * .5;
    return clamp(targetTop / scrollRange);
  });

  measured[0] = 0;
  for (let index = 1; index < measured.length; index += 1) {
    measured[index] = Math.max(measured[index], measured[index - 1] + .04);
  }
  measured[measured.length - 1] = Math.min(1, Math.max(measured[measured.length - 1], .82));
  stateStops = measured.map((stop) => clamp(stop));
}

function stateForProgress(progress: number): IceState {
  for (let index = ICE_STATES.length - 1; index > 0; index -= 1) {
    const threshold = (stateStops[index - 1] + stateStops[index]) * .5;
    if (progress >= threshold) return ICE_STATES[index];
  }
  return 'opening';
}

function applySemanticState(state: IceState, shouldAnnounce = true): void {
  const changed = activeState !== state;
  activeState = state;
  activeIndex = ICE_STATES.indexOf(state);
  fallbackScene.dataset.state = state;
  setDataset('iceState', state);
  root.style.setProperty('--ice-state-index', String(activeIndex));
  app.style.setProperty('--ice-state-index', String(activeIndex));

  chapters.forEach((chapter, index) => {
    if (!chapter) return;
    const current = index === activeIndex;
    chapter.dataset.active = String(current);
    chapter.setAttribute('aria-current', current ? 'step' : 'false');
  });

  stateLinks.forEach((link) => {
    const current = elementState(link) === state;
    link.dataset.active = String(current);
    link.classList.toggle('is-active', current);
    if (current) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  if (changed && shouldAnnounce) announce(STATE_ANNOUNCEMENTS[state]);
}

function blendProfiles(progress: number): SceneProfile {
  if (reducedMotion) return STATE_PROFILES[activeState];
  let leftIndex = 0;
  for (let index = 1; index < stateStops.length; index += 1) {
    if (progress >= stateStops[index]) leftIndex = index;
    else break;
  }
  const rightIndex = Math.min(ICE_STATES.length - 1, leftIndex + 1);
  const left = STATE_PROFILES[ICE_STATES[leftIndex]];
  const right = STATE_PROFILES[ICE_STATES[rightIndex]];
  const amount = leftIndex === rightIndex
    ? 0
    : smoothstep(stateStops[leftIndex], stateStops[rightIndex], progress);
  return {
    progress,
    focusY: lerp(left.focusY, right.focusY, amount),
    cameraZ: lerp(left.cameraZ, right.cameraZ, amount),
    coreRotation: lerp(left.coreRotation, right.coreRotation, amount),
    bubble: lerp(left.bubble, right.bubble, amount),
    ash: lerp(left.ash, right.ash, amount),
    pollen: lerp(left.pollen, right.pollen, amount),
    strata: lerp(left.strata, right.strata, amount),
  };
}

function updateVisualHash(progress: number): void {
  const profile = blendProfiles(progress);
  currentProfile = profile;
  const signature = [
    fallback ? 'fallback' : 'webgl',
    activeState,
    Math.round(progress * 1000),
    Math.round(profile.focusY * 100),
    Math.round(profile.cameraZ * 100),
    Math.round(profile.bubble * 100),
    Math.round(profile.ash * 100),
    Math.round(profile.pollen * 100),
    quality,
  ].join('|');
  canvasVisualHash = hashString(signature);
  canvas.dataset.visualHash = canvasVisualHash;
  root.dataset.canvasVisualHash = canvasVisualHash;
}

function createInstancedEvidence(
  sceneRuntime: NonNullable<typeof runtime>,
  iceGroup: THREE.Group,
): void {
  const bubbleCount = quality === 'high' ? 76 : quality === 'balanced' ? 54 : 34;
  const bubbleGeometry = sceneRuntime.geometry(new THREE.IcosahedronGeometry(1, quality === 'low' ? 1 : 2));
  bubbleMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xd9f5ff,
    emissive: 0x7fc7df,
    emissiveIntensity: .13,
    roughness: .08,
    metalness: 0,
    transmission: .72,
    thickness: .22,
    transparent: true,
    opacity: .62,
    depthWrite: false,
  }));
  bubbleMesh = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, bubbleCount);
  bubbleMesh.renderOrder = 4;
  const bubbleDummy = new THREE.Object3D();
  for (let index = 0; index < bubbleCount; index += 1) {
    const radius = Math.sqrt(seeded(index * 11 + 2)) * .62;
    const angle = seeded(index * 17 + 5) * Math.PI * 2;
    const scale = .018 + seeded(index * 23 + 7) * .085;
    const bubble: BubbleSeed = {
      x: Math.cos(angle) * radius,
      y: .58 + seeded(index * 31 + 13) * 2.25,
      z: Math.sin(angle) * radius,
      scale,
      phase: seeded(index * 41 + 17) * Math.PI * 2,
      drift: .28 + seeded(index * 47 + 19) * .42,
    };
    bubbleSeeds.push(bubble);
    bubbleDummy.position.set(bubble.x, bubble.y, bubble.z);
    bubbleDummy.scale.set(scale * .72, scale * 1.18, scale);
    bubbleDummy.updateMatrix();
    bubbleMesh.setMatrixAt(index, bubbleDummy.matrix);
  }
  bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bubbleMesh.instanceMatrix.needsUpdate = true;
  iceGroup.add(bubbleMesh);

  const pollenCount = quality === 'high' ? 94 : quality === 'balanced' ? 66 : 42;
  const pollenGeometry = sceneRuntime.geometry(new THREE.OctahedronGeometry(1, quality === 'low' ? 0 : 1));
  pollenMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xe1b449,
    emissive: 0x9a6419,
    emissiveIntensity: .3,
    roughness: .43,
    metalness: .04,
    transparent: true,
    opacity: .72,
    depthWrite: false,
  }));
  pollenMesh = new THREE.InstancedMesh(pollenGeometry, pollenMaterial, pollenCount);
  pollenMesh.renderOrder = 5;
  const pollenDummy = new THREE.Object3D();
  for (let index = 0; index < pollenCount; index += 1) {
    const radius = Math.sqrt(seeded(index * 19 + 3)) * .69;
    const angle = seeded(index * 29 + 9) * Math.PI * 2;
    const scale = .012 + seeded(index * 37 + 11) * .031;
    const pollen: PollenSeed = {
      x: Math.cos(angle) * radius,
      y: -1.72 + (seeded(index * 43 + 15) - .5) * .62,
      z: Math.sin(angle) * radius,
      scale,
      phase: seeded(index * 53 + 21) * Math.PI * 2,
    };
    pollenSeeds.push(pollen);
    pollenDummy.position.set(pollen.x, pollen.y, pollen.z);
    pollenDummy.scale.set(scale * 1.6, scale * .72, scale);
    pollenDummy.rotation.set(pollen.phase, pollen.phase * .47, pollen.phase * .22);
    pollenDummy.updateMatrix();
    pollenMesh.setMatrixAt(index, pollenDummy.matrix);
  }
  pollenMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pollenMesh.instanceMatrix.needsUpdate = true;
  iceGroup.add(pollenMesh);
}

function fractureCylinderSilhouette(
  geometry: THREE.BufferGeometry,
  height: number,
  strength: number,
): void {
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const radius = Math.hypot(x, z);
    if (radius < .05) continue;
    const angle = Math.atan2(z, x);
    const depth = (y + height * .5) / height;
    const contour = Math.sin(angle * 5.1 + depth * 7.7) * .56
      + Math.sin(angle * 11.3 - depth * 13.1) * .25
      + Math.sin(depth * 23.7) * .12;
    const scale = 1 + contour * strength;
    positions.setXYZ(index, x * scale, y, z * scale);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createIceCore(sceneRuntime: NonNullable<typeof runtime>): void {
  coreGroup = new THREE.Group();
  sceneRuntime.scene.add(coreGroup);

  const radialSegments = quality === 'low' ? 24 : quality === 'high' ? 72 : 48;
  const heightSegments = quality === 'low' ? 24 : quality === 'high' ? 72 : 46;
  const outerGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.93, .99, 8.65, radialSegments, heightSegments));
  fractureCylinderSilhouette(outerGeometry, 8.65, quality === 'low' ? .018 : .034);
  outerIceMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xd3f3fa,
    roughness: .1,
    metalness: 0,
    transmission: .64,
    thickness: 2.2,
    ior: 1.31,
    attenuationColor: new THREE.Color(0x77bad2),
    attenuationDistance: 3.8,
    transparent: true,
    opacity: .78,
    clearcoat: .72,
    clearcoatRoughness: .1,
    depthWrite: false,
    side: THREE.FrontSide,
  }));
  const outer = new THREE.Mesh(outerGeometry, outerIceMaterial);
  outer.renderOrder = 7;
  coreGroup.add(outer);

  const innerGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.76, .8, 8.42, radialSegments, Math.max(8, heightSegments / 2)));
  fractureCylinderSilhouette(innerGeometry, 8.42, quality === 'low' ? .009 : .017);
  innerIceMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xd9f6ff,
    roughness: .34,
    metalness: 0,
    transmission: .3,
    thickness: .8,
    transparent: true,
    opacity: .16,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const inner = new THREE.Mesh(innerGeometry, innerIceMaterial);
  inner.renderOrder = 1;
  coreGroup.add(inner);

  const facetMaterial = sceneRuntime.material(new THREE.MeshBasicMaterial({
    color: 0xeaffff,
    transparent: true,
    opacity: .032,
    wireframe: true,
    depthWrite: false,
  }));
  const facets = new THREE.Mesh(outerGeometry, facetMaterial);
  facets.scale.set(1.006, 1.001, 1.006);
  facets.renderOrder = 8;
  coreGroup.add(facets);

  strataMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xe9fbff,
    emissive: 0x6aa9bd,
    emissiveIntensity: .08,
    roughness: .38,
    transparent: true,
    opacity: .23,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  const layerCount = quality === 'low' ? 28 : quality === 'high' ? 52 : 40;
  const layerGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.79, .82, .012, radialSegments, 1));
  const layers = new THREE.InstancedMesh(layerGeometry, strataMaterial, layerCount);
  const layerDummy = new THREE.Object3D();
  const layerColor = new THREE.Color();
  for (let index = 0; index < layerCount; index += 1) {
    const y = lerp(-4.06, 4.06, index / Math.max(1, layerCount - 1));
    const wave = Math.sin(index * 1.73) * .035;
    layerDummy.position.set(wave, y, -wave * .7);
    layerDummy.scale.set(.92 + seeded(index + 91) * .12, .6 + seeded(index + 121) * 1.8, .92 + seeded(index + 161) * .12);
    layerDummy.rotation.y = seeded(index + 181) * .2;
    layerDummy.updateMatrix();
    layers.setMatrixAt(index, layerDummy.matrix);
    layerColor.setHSL(.52 + seeded(index + 211) * .035, .38, .77 + seeded(index + 241) * .15);
    layers.setColorAt(index, layerColor);
  }
  layers.instanceMatrix.needsUpdate = true;
  if (layers.instanceColor) layers.instanceColor.needsUpdate = true;
  layers.renderOrder = 2;
  coreGroup.add(layers);

  const ringGeometry = sceneRuntime.geometry(new THREE.TorusGeometry(.93, .018, quality === 'low' ? 5 : 8, radialSegments));
  const edgeMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xe4fbff,
    emissive: 0x89bfd0,
    emissiveIntensity: .17,
    roughness: .2,
    transparent: true,
    opacity: .56,
    depthWrite: false,
  }));
  for (const y of [-4.27, 4.27]) {
    const ring = new THREE.Mesh(ringGeometry, edgeMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.renderOrder = 8;
    coreGroup.add(ring);
  }

  const ashGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.835, .84, .17, radialSegments, 2));
  ashMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x594f48,
    emissive: 0x2b3639,
    emissiveIntensity: .16,
    roughness: .72,
    metalness: .04,
    transparent: true,
    opacity: .72,
    depthWrite: false,
  }));
  const ashBand = new THREE.Mesh(ashGeometry, ashMaterial);
  ashBand.position.y = -.05;
  ashBand.rotation.z = .012;
  ashBand.renderOrder = 5;
  coreGroup.add(ashBand);

  const ashDustCount = quality === 'low' ? 70 : quality === 'high' ? 180 : 120;
  const ashPositions = new Float32Array(ashDustCount * 3);
  for (let index = 0; index < ashDustCount; index += 1) {
    const radius = Math.sqrt(seeded(index * 7 + 2)) * .77;
    const angle = seeded(index * 13 + 4) * Math.PI * 2;
    ashPositions[index * 3] = Math.cos(angle) * radius;
    ashPositions[index * 3 + 1] = -.05 + (seeded(index * 17 + 6) - .5) * .24;
    ashPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const ashDustGeometry = sceneRuntime.geometry(new THREE.BufferGeometry());
  ashDustGeometry.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3));
  ashDustMaterial = sceneRuntime.material(new THREE.PointsMaterial({
    color: 0x3f4442,
    size: quality === 'low' ? .018 : .024,
    sizeAttenuation: true,
    transparent: true,
    opacity: .8,
    depthWrite: false,
  }));
  const ashDust = new THREE.Points(ashDustGeometry, ashDustMaterial);
  ashDust.renderOrder = 6;
  coreGroup.add(ashDust);

  createInstancedEvidence(sceneRuntime, coreGroup);
}

function createAtmosphere(sceneRuntime: NonNullable<typeof runtime>): void {
  sceneRuntime.scene.fog = new THREE.FogExp2(0xc6e7f2, .035);
  const hemisphere = new THREE.HemisphereLight(0xe9fbff, 0x32657a, 2.25);
  sceneRuntime.scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xf7ffff, 5.2);
  key.position.set(-4.6, 7.2, 6.4);
  sceneRuntime.scene.add(key);
  const rim = new THREE.DirectionalLight(0x69cbe8, 3.8);
  rim.position.set(4.8, 1.4, -3.2);
  sceneRuntime.scene.add(rim);
  glowLight = new THREE.PointLight(0xf1c768, .32, 5.8, 1.5);
  glowLight.position.set(.3, -1.7, 1.7);
  sceneRuntime.scene.add(glowLight);

  const speckCount = quality === 'low' ? 80 : quality === 'high' ? 210 : 140;
  const speckPositions = new Float32Array(speckCount * 3);
  for (let index = 0; index < speckCount; index += 1) {
    speckPositions[index * 3] = (seeded(index * 5 + 1) - .5) * 10;
    speckPositions[index * 3 + 1] = (seeded(index * 7 + 3) - .5) * 10;
    speckPositions[index * 3 + 2] = (seeded(index * 11 + 5) - .5) * 7 - 1;
  }
  const speckGeometry = sceneRuntime.geometry(new THREE.BufferGeometry());
  speckGeometry.setAttribute('position', new THREE.BufferAttribute(speckPositions, 3));
  const speckMaterial = sceneRuntime.material(new THREE.PointsMaterial({
    color: 0xe8fbff,
    size: quality === 'low' ? .018 : .026,
    sizeAttenuation: true,
    transparent: true,
    opacity: .42,
    depthWrite: false,
  }));
  sceneRuntime.scene.add(new THREE.Points(speckGeometry, speckMaterial));
}

function initializeScene(): void {
  if (forcedFallback) {
    setFallbackState('forced');
    return;
  }

  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 31, near: .08, far: 80 },
      clearColor: 0xb9ddea,
      clearAlpha: 0,
      toneMappingExposure: 1.14,
      maxDpr: 1.8,
      lowQualityMaxDpr: 1,
      renderer: { premultipliedAlpha: false },
    });
    runtime.renderer.sortObjects = true;
    createAtmosphere(runtime);
    createIceCore(runtime);
    fallback = false;
    canvas.hidden = false;
    fallbackScene.toggleAttribute('hidden', true);
    setDataset('fallback', 'false');
    resize();
    applyThreeScene(0, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
    sceneReady = true;
    markReady();
  } catch (error) {
    console.warn('[ice-core-letters] WebGL unavailable; continuing with the semantic ice-core fallback.', error);
    setFallbackState('webgl-unavailable');
  }
}

function updateEvidenceInstances(now: number, profile: SceneProfile): void {
  if (bubbleMesh) {
    const dummy = new THREE.Object3D();
    const elapsed = (now - startedAt) / 1000;
    for (let index = 0; index < bubbleSeeds.length; index += 1) {
      const bubble = bubbleSeeds[index];
      const motion = reducedMotion || deterministicReview ? 0 : Math.sin(elapsed * bubble.drift + bubble.phase) * .035;
      dummy.position.set(bubble.x + motion * .28, bubble.y + motion, bubble.z);
      dummy.scale.set(bubble.scale * .72, bubble.scale * (1.18 + profile.bubble * .12), bubble.scale);
      dummy.updateMatrix();
      bubbleMesh.setMatrixAt(index, dummy.matrix);
    }
    bubbleMesh.instanceMatrix.needsUpdate = true;
  }

  if (pollenMesh && !reducedMotion && !deterministicReview) {
    const dummy = new THREE.Object3D();
    const elapsed = (now - startedAt) / 1000;
    for (let index = 0; index < pollenSeeds.length; index += 1) {
      const pollen = pollenSeeds[index];
      const drift = Math.sin(elapsed * .34 + pollen.phase) * .018;
      dummy.position.set(pollen.x + drift, pollen.y + drift * .45, pollen.z);
      dummy.scale.set(pollen.scale * 1.6, pollen.scale * .72, pollen.scale);
      dummy.rotation.set(pollen.phase + elapsed * .08, pollen.phase * .47, pollen.phase * .22);
      dummy.updateMatrix();
      pollenMesh.setMatrixAt(index, dummy.matrix);
    }
    pollenMesh.instanceMatrix.needsUpdate = true;
  }
}

function applyThreeScene(progress: number, now: number): void {
  if (!runtime || !coreGroup) return;
  const profile = blendProfiles(progress);
  currentProfile = profile;
  const mobile = innerWidth <= 720;
  const tablet = innerWidth <= 1040;
  const sceneX = mobile ? 0 : tablet ? .55 : 1.16;
  const pointerStrength = reducedMotion ? 0 : .11;
  const idle = reducedMotion || deterministicReview ? 0 : Math.sin((now - startedAt) * .00034) * .018;
  coreGroup.position.set(sceneX, idle, 0);
  coreGroup.scale.setScalar(mobile ? .78 : tablet ? .88 : 1);
  coreGroup.rotation.set(.018 + pointer.y * .015 * pointerStrength, profile.coreRotation + pointer.x * pointerStrength, mobile ? -.015 : -.035);

  cameraDepth = profile.cameraZ + (mobile ? 1.8 : tablet ? .75 : 0);
  runtime.camera.position.set(
    mobile ? pointer.x * .04 : -.12 + pointer.x * .13,
    profile.focusY - pointer.y * .08,
    cameraDepth,
  );
  runtime.camera.lookAt(sceneX * .78, profile.focusY, 0);

  if (outerIceMaterial) {
    outerIceMaterial.opacity = .7 + profile.strata * .1;
    outerIceMaterial.roughness = .13 - profile.strata * .035;
  }
  if (innerIceMaterial) innerIceMaterial.opacity = .1 + profile.strata * .09;
  if (strataMaterial) strataMaterial.opacity = .05 + profile.strata * .18;
  if (bubbleMaterial) bubbleMaterial.opacity = .08 + profile.bubble * .74;
  if (ashMaterial) ashMaterial.opacity = .08 + profile.ash * .84;
  if (ashDustMaterial) ashDustMaterial.opacity = .05 + profile.ash * .9;
  if (pollenMaterial) pollenMaterial.opacity = .04 + profile.pollen * .9;
  if (glowLight) glowLight.intensity = .18 + profile.pollen * 1.35;
  updateEvidenceInstances(now, profile);
}

function resize(): void {
  recalculateStateStops();
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  applyThreeScene(renderedProgress, performance.now());
  runtime.render();
}

function updateProgressStyles(progress: number): void {
  const depth = blendProfiles(progress).focusY;
  root.style.setProperty('--ice-progress', progress.toFixed(4));
  root.style.setProperty('--ice-depth', depth.toFixed(3));
  app.style.setProperty('--ice-progress', progress.toFixed(4));
  app.style.setProperty('--ice-depth', depth.toFixed(3));
}

function syncScrollState(): void {
  scrollFrame = 0;
  recalculateStateStops();
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  targetProgress = clamp(scrollY / scrollRange);
  const nextState = stateForProgress(targetProgress);
  applySemanticState(nextState);
  if (reducedMotion) {
    renderedProgress = stateStops[ICE_STATES.indexOf(nextState)];
    updateProgressStyles(renderedProgress);
    updateVisualHash(renderedProgress);
    if (runtime) {
      applyThreeScene(renderedProgress, performance.now());
      runtime.render();
    }
  }
}

function onScroll(): void {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(syncScrollState);
}

function setProgress(progress: number): void {
  const next = clamp(Number.isFinite(progress) ? progress : 0);
  recalculateStateStops();
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  scrollTo({ top: next * scrollRange, behavior: 'auto' });
  targetProgress = next;
  renderedProgress = reducedMotion
    ? stateStops[ICE_STATES.indexOf(stateForProgress(next))]
    : next;
  applySemanticState(stateForProgress(next));
  updateProgressStyles(renderedProgress);
  updateVisualHash(renderedProgress);
  if (runtime) {
    applyThreeScene(renderedProgress, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
}

function resolveState(value: IceState | number): IceState {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return ICE_STATES[Math.max(0, Math.min(ICE_STATES.length - 1, value))];
    return stateForProgress(clamp(value));
  }
  return isIceState(value) ? value : activeState;
}

function gotoState(value: IceState | number): void {
  const state = resolveState(value);
  recalculateStateStops();
  const index = ICE_STATES.indexOf(state);
  const target = stateStops[index];
  setProgress(target);
  applySemanticState(state);
  announce(STATE_ANNOUNCEMENTS[state]);
}

function complete(): void {
  setProgress(1);
  applySemanticState('letter-ready');
  announce(STATE_ANNOUNCEMENTS['letter-ready']);
}

function openLetter(): void {
  if (!dialog.open) dialog.showModal();
  setDataset('letterOpen', 'true');
  requestAnimationFrame(() => (draft ?? closeButton).focus());
}

function closeLetter(): void {
  if (dialog.open) dialog.close();
}

function sealLetter(event: SubmitEvent): void {
  event.preventDefault();
  if (!draft) return;
  const value = draft.value.trim();
  if (!value) {
    sealed = false;
    if (letterStatus) letterStatus.textContent = '先写下一句话，再把它封进冰层。';
    draft.focus();
    return;
  }

  sealed = true;
  dialog.dataset.sealed = 'true';
  setDataset('letterSealed', 'true');
  if (letterStatus) letterStatus.textContent = '这封信已在当前页面的冰层里封存。';
  announce('给未来的信已经封存。');
}

function onStateLink(event: MouseEvent): void {
  const link = event.currentTarget;
  if (!(link instanceof HTMLAnchorElement)) return;
  const state = elementState(link);
  if (!state) return;
  event.preventDefault();
  gotoState(state);
  history.replaceState(null, '', `#${state}`);
}

function onKeydown(event: KeyboardEvent): void {
  if (dialog.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
    || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;

  let nextIndex: number | null = null;
  if (event.key === 'ArrowDown' || event.key === 'PageDown') nextIndex = Math.min(ICE_STATES.length - 1, activeIndex + 1);
  else if (event.key === 'ArrowUp' || event.key === 'PageUp') nextIndex = Math.max(0, activeIndex - 1);
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = ICE_STATES.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  gotoState(nextIndex);
}

function onPointerMove(event: PointerEvent): void {
  pointer.targetX = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  pointer.targetY = clamp(-(event.clientY / Math.max(1, innerHeight) * 2 - 1), -1, 1);
}

function onContextLost(event: Event): void {
  event.preventDefault();
  setFallbackState('context-lost');
  announce('3D 冰芯已暂停，基础冰芯仍可继续阅读和写信。');
}

function snapshot(): IceCoreSnapshot {
  return {
    ready,
    state: activeState,
    activeState,
    phase: activeState,
    activeLayer: activeState,
    activeIndex,
    depthIndex: activeIndex,
    progress: Number(renderedProgress.toFixed(4)),
    depth: Number(currentProfile.focusY.toFixed(3)),
    cameraDepth: Number(cameraDepth.toFixed(3)),
    coreRotation: Number(currentProfile.coreRotation.toFixed(3)),
    bubbleOpacity: Number(currentProfile.bubble.toFixed(3)),
    ashOpacity: Number(currentProfile.ash.toFixed(3)),
    pollenOpacity: Number(currentProfile.pollen.toFixed(3)),
    canvasVisualHash,
    dialogOpen: dialog.open,
    sealed,
    saved: sealed,
    draftLength: draft?.value.length ?? 0,
    fallback,
    reducedMotion,
    environmentLoaded,
    frames: fallback ? 0 : frames,
    drawCalls,
    triangles,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    quality,
    revision,
  };
}

function tick(now: number): void {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(.001, (now - lastFrameAt) / 1000));
  lastFrameAt = now;
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.8);
  renderedProgress += (targetProgress - renderedProgress) * smoothing;
  if (Math.abs(targetProgress - renderedProgress) < .0001) renderedProgress = targetProgress;
  pointer.x += (pointer.targetX - pointer.x) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 4.4));
  pointer.y += (pointer.targetY - pointer.y) * (reducedMotion ? 1 : 1 - Math.exp(-delta * 4.4));

  if (!fallback && runtime) {
    applyThreeScene(renderedProgress, now);
    runtime.render();
    frames += 1;
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
  updateProgressStyles(renderedProgress);
  updateVisualHash(renderedProgress);
  frameId = requestAnimationFrame(tick);
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(scrollFrame);
  removeEventListener('scroll', onScroll);
  removeEventListener('resize', resize);
  removeEventListener('keydown', onKeydown);
  removeEventListener('pointermove', onPointerMove);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  openButton.removeEventListener('click', openLetter);
  closeButton.removeEventListener('click', closeLetter);
  form?.removeEventListener('submit', sealLetter);
  stateLinks.forEach((link) => link.removeEventListener('click', onStateLink));
  runtime?.dispose();
  runtime = null;
  delete window.__iceCoreLetters;
}

setDataset('iceCoreReady', 'false');
setDataset('fallback', String(forcedFallback));
setDataset('reducedMotion', String(reducedMotion));
setDataset('letterOpen', 'false');
setDataset('letterSealed', 'false');
if (letterStatus) {
  letterStatus.setAttribute('role', 'status');
  letterStatus.setAttribute('aria-live', 'polite');
}
applySemanticState('opening', false);
preloadEnvironment();
initializeScene();
recalculateStateStops();
syncScrollState();

stateLinks.forEach((link) => link.addEventListener('click', onStateLink));
openButton.addEventListener('click', openLetter);
closeButton.addEventListener('click', closeLetter);
form?.addEventListener('submit', sealLetter);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeLetter();
});
dialog.addEventListener('close', () => {
  setDataset('letterOpen', 'false');
  openButton.focus();
});
canvas.addEventListener('webglcontextlost', onContextLost, false);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', resize, { passive: true });
addEventListener('keydown', onKeydown);
addEventListener('pointermove', onPointerMove, { passive: true });

window.__iceCoreLetters = {
  snapshot,
  goto: gotoState,
  setState: gotoState,
  setProgress,
  complete,
  openLetter,
  closeLetter,
};
frameId = requestAnimationFrame(tick);
addEventListener('pagehide', dispose, { once: true });

export {};
