import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

const ROOF_STATES = ['opening', 'rainfall', 'gutter-flow', 'cistern', 'garden-release'] as const;
type RoofState = (typeof ROOF_STATES)[number];

type CameraSnapshot = Readonly<{
  x: number;
  y: number;
  z: number;
  lookX: number;
  lookY: number;
}>;

type RoofWaterSnapshot = {
  ready: boolean;
  state: RoofState;
  activeState: RoofState;
  activeIndex: number;
  progress: number;
  rainLevel: number;
  waterTravel: number;
  tankFill: number;
  plantGrowth: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  canvasVisualHash: string;
  camera: CameraSnapshot;
  water: {
    rainfall: number;
    roofFlow: number;
    gutterFlow: number;
    downpipeFlow: number;
    releaseFlow: number;
    routeExtent: number;
    visibleDrops: number;
  };
  tank: {
    level: number;
    opacity: number;
  };
  plant: {
    growth: number;
    hydration: number;
  };
  dialogOpen: boolean;
  saved: boolean;
  noteLength: number;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
  revision: string;
};

declare global {
  interface Window {
    __roofWaterRoute?: {
      snapshot: () => RoofWaterSnapshot;
      setProgress: (progress: number) => void;
      setState: (state: RoofState | number) => void;
      goto: (state: RoofState | number) => void;
      openPlan: () => void;
      closePlan: () => void;
    };
  }
}

type SceneProfile = Readonly<{
  progress: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookX: number;
  lookY: number;
  rainfall: number;
  roofFlow: number;
  gutterFlow: number;
  downpipeFlow: number;
  tankLevel: number;
  releaseFlow: number;
  plantGrowth: number;
  hydration: number;
  routeExtent: number;
}>;

type RainSeed = Readonly<{ x: number; z: number; phase: number; speed: number; length: number }>;
type PlantSeed = Readonly<{ x: number; z: number; phase: number }>;
type LeafSeed = Readonly<{
  plantIndex: number;
  leafIndex: number;
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}>;

const STATE_PROFILES: Readonly<Record<RoofState, SceneProfile>> = {
  opening: {
    progress: 0,
    cameraX: .2,
    cameraY: .85,
    cameraZ: 15.7,
    lookX: .2,
    lookY: .35,
    rainfall: .04,
    roofFlow: .06,
    gutterFlow: .02,
    downpipeFlow: 0,
    tankLevel: .08,
    releaseFlow: 0,
    plantGrowth: .42,
    hydration: .06,
    routeExtent: .08,
  },
  rainfall: {
    progress: .22,
    cameraX: -.8,
    cameraY: 1.7,
    cameraZ: 12.7,
    lookX: -.55,
    lookY: 1.55,
    rainfall: 1,
    roofFlow: .72,
    gutterFlow: .18,
    downpipeFlow: .04,
    tankLevel: .1,
    releaseFlow: 0,
    plantGrowth: .43,
    hydration: .08,
    routeExtent: .3,
  },
  'gutter-flow': {
    progress: .48,
    cameraX: .85,
    cameraY: .8,
    cameraZ: 11.45,
    lookX: 1.2,
    lookY: .78,
    rainfall: .78,
    roofFlow: 1,
    gutterFlow: 1,
    downpipeFlow: .86,
    tankLevel: .24,
    releaseFlow: 0,
    plantGrowth: .45,
    hydration: .12,
    routeExtent: .62,
  },
  cistern: {
    progress: .73,
    cameraX: 2.05,
    cameraY: -.55,
    cameraZ: 10.5,
    lookX: 2.55,
    lookY: -.65,
    rainfall: .38,
    roofFlow: .55,
    gutterFlow: .72,
    downpipeFlow: 1,
    tankLevel: .82,
    releaseFlow: .06,
    plantGrowth: .53,
    hydration: .3,
    routeExtent: .78,
  },
  'garden-release': {
    progress: 1,
    cameraX: 2.45,
    cameraY: -.35,
    cameraZ: 13.7,
    lookX: 2.5,
    lookY: -.7,
    rainfall: .16,
    roofFlow: .28,
    gutterFlow: .36,
    downpipeFlow: .5,
    tankLevel: .62,
    releaseFlow: 1,
    plantGrowth: 1,
    hydration: 1,
    routeExtent: 1,
  },
};

const STATE_ANNOUNCEMENTS: Readonly<Record<RoofState, string>> = {
  opening: '建筑剖面已经展开，一滴水悬在屋檐上方。',
  rainfall: '雨水落在斜屋顶上，并沿屋面汇向檐口。',
  'gutter-flow': '水已经进入天沟，正在通过落水管向下流动。',
  cistern: '雨水进入半透明蓄水罐，水位正在上升。',
  'garden-release': '储存的雨水已经释放到花园，植物正在舒展。',
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
const rounded = (value: number, digits = 3): number => Number(value.toFixed(digits));

function isRoofState(value: string | undefined): value is RoofState {
  return value !== undefined && (ROOF_STATES as readonly string[]).includes(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `roof-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function query<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

const root = document.documentElement;
const app = query<HTMLElement>('#app, [data-roof-water-route]') ?? document.body;
const canvas = query<HTMLCanvasElement>('#roof-water-canvas, #roof-canvas, .roof-water-canvas, [data-roof-canvas]');
const fallbackScene = query<HTMLElement | SVGElement>('#fallback-scene, [data-fallback-scene], #app [data-fallback]');
const fallbackMessage = query<HTMLElement>('[data-fallback-message]');
const liveStatus = query<HTMLElement>('#live-status, [data-live-status]');
const dialog = query<HTMLDialogElement>('#plan-dialog, [data-plan-dialog], dialog[data-roof-plan]');
const openButtons = Array.from(document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
  '#open-plan, [data-open-plan], [data-plan-open]',
));
const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
  '#close-plan, [data-close-plan], [data-plan-close]',
));
const planForm = query<HTMLFormElement>('#plan-form, [data-plan-form]');
const planNote = query<HTMLInputElement | HTMLTextAreaElement>('[data-plan-note]');
const planStatus = query<HTMLElement>('#plan-status, [data-plan-status]');
const chapters = ROOF_STATES.map((state) => query<HTMLElement>(
  `[data-scene="${state}"], [data-roof-state="${state}"], [data-state="${state}"], #${state}`,
));
const stateLinks = Array.from(document.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
  '[data-scene-link], [data-state-link], [data-roof-state-link]',
));

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
const forcedFallback = params.get('forceFallback') === '1'
  || params.get('forceFallback') === 'true'
  || fallbackValue === '1'
  || fallbackValue === 'true'
  || fallbackValue === 'webgl'
  || fallbackValue === 'canvas';
const deterministicReview = params.get('visual-review') === '1';
const revision = params.get('revision') ?? 'r127-roof-water-route';
const storageKey = 'kage:roof-water-route:plan';

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let architectureGroup: THREE.Group | null = null;
let waterRoute: THREE.CatmullRomCurve3 | null = null;
let waterBeads: THREE.InstancedMesh | null = null;
let rainDrops: THREE.InstancedMesh | null = null;
let suspendedDrop: THREE.Mesh | null = null;
let tankWater: THREE.Mesh | null = null;
let tankWaterSurface: THREE.Mesh | null = null;
let tankWaterMaterial: THREE.MeshPhysicalMaterial | null = null;
let roofWaterMaterial: THREE.MeshPhysicalMaterial | null = null;
let gutterWaterMaterial: THREE.MeshPhysicalMaterial | null = null;
let pipeWaterMaterial: THREE.MeshPhysicalMaterial | null = null;
let releaseWaterMaterial: THREE.MeshPhysicalMaterial | null = null;
let soilMaterial: THREE.MeshPhysicalMaterial | null = null;
let gardenGlow: THREE.PointLight | null = null;
let stemInstances: THREE.InstancedMesh | null = null;
let leafInstances: THREE.InstancedMesh | null = null;
let leafLightInstances: THREE.InstancedMesh | null = null;
let flowerInstances: THREE.InstancedMesh | null = null;
const plantSeeds: PlantSeed[] = [];
const leafSeeds: LeafSeed[] = [];
const leafLightSeeds: LeafSeed[] = [];
const flowerPlantIndices: number[] = [];
const rainSeeds: RainSeed[] = [];

let stateStops = ROOF_STATES.map((state) => STATE_PROFILES[state].progress);
let activeState: RoofState = 'opening';
let activeIndex = 0;
let targetProgress = 0;
let renderedProgress = 0;
let currentProfile: SceneProfile = STATE_PROFILES.opening;
let cameraSnapshot: CameraSnapshot = {
  x: STATE_PROFILES.opening.cameraX,
  y: STATE_PROFILES.opening.cameraY,
  z: STATE_PROFILES.opening.cameraZ,
  lookX: STATE_PROFILES.opening.lookX,
  lookY: STATE_PROFILES.opening.lookY,
};
let visibleDrops = 0;
let canvasVisualHash = hashString('opening|0');
let fallback = forcedFallback || !canvas;
let ready = false;
let saved = false;
let disposed = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let frameId = 0;
let scrollFrame = 0;
let lastFrameAt = performance.now();
const startedAt = lastFrameAt;
let focusReturn: HTMLElement | null = null;

function setDataset(name: string, value: string): void {
  root.dataset[name] = value;
  app.dataset[name] = value;
}

function announce(message: string): void {
  if (liveStatus) liveStatus.textContent = message;
}

function elementState(element: HTMLElement): RoofState | null {
  const explicit = element.dataset.sceneLink
    ?? element.dataset.stateLink
    ?? element.dataset.roofStateLink
    ?? element.dataset.roofState;
  if (isRoofState(explicit)) return explicit;
  if (element instanceof HTMLAnchorElement) {
    const hash = element.hash.replace(/^#/, '');
    if (isRoofState(hash)) return hash;
  }
  return null;
}

function recalculateStateStops(): void {
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const measured = chapters.map((chapter, index) => {
    if (!chapter) return STATE_PROFILES[ROOF_STATES[index]].progress;
    const rect = chapter.getBoundingClientRect();
    const center = scrollY + rect.top + rect.height * .5 - innerHeight * .5;
    return clamp(center / scrollRange);
  });
  measured[0] = 0;
  for (let index = 1; index < measured.length; index += 1) {
    measured[index] = Math.max(measured[index], measured[index - 1] + .045);
  }
  measured[measured.length - 1] = Math.max(.84, measured[measured.length - 1]);
  stateStops = measured.map((stop) => clamp(stop));
}

function stateForProgress(progress: number): RoofState {
  for (let index = ROOF_STATES.length - 1; index > 0; index -= 1) {
    const threshold = (stateStops[index - 1] + stateStops[index]) * .5;
    if (progress >= threshold) return ROOF_STATES[index];
  }
  return 'opening';
}

function blendProfiles(progress: number): SceneProfile {
  if (reducedMotion) return STATE_PROFILES[activeState];
  let leftIndex = 0;
  for (let index = 1; index < stateStops.length; index += 1) {
    if (progress >= stateStops[index]) leftIndex = index;
    else break;
  }
  const rightIndex = Math.min(ROOF_STATES.length - 1, leftIndex + 1);
  const left = STATE_PROFILES[ROOF_STATES[leftIndex]];
  const right = STATE_PROFILES[ROOF_STATES[rightIndex]];
  const amount = leftIndex === rightIndex ? 0 : smoothstep(stateStops[leftIndex], stateStops[rightIndex], progress);
  return {
    progress,
    cameraX: lerp(left.cameraX, right.cameraX, amount),
    cameraY: lerp(left.cameraY, right.cameraY, amount),
    cameraZ: lerp(left.cameraZ, right.cameraZ, amount),
    lookX: lerp(left.lookX, right.lookX, amount),
    lookY: lerp(left.lookY, right.lookY, amount),
    rainfall: lerp(left.rainfall, right.rainfall, amount),
    roofFlow: lerp(left.roofFlow, right.roofFlow, amount),
    gutterFlow: lerp(left.gutterFlow, right.gutterFlow, amount),
    downpipeFlow: lerp(left.downpipeFlow, right.downpipeFlow, amount),
    tankLevel: lerp(left.tankLevel, right.tankLevel, amount),
    releaseFlow: lerp(left.releaseFlow, right.releaseFlow, amount),
    plantGrowth: lerp(left.plantGrowth, right.plantGrowth, amount),
    hydration: lerp(left.hydration, right.hydration, amount),
    routeExtent: lerp(left.routeExtent, right.routeExtent, amount),
  };
}

function applySemanticState(state: RoofState, shouldAnnounce = true): void {
  const changed = activeState !== state;
  activeState = state;
  activeIndex = ROOF_STATES.indexOf(state);
  setDataset('roofState', state);
  setDataset('waterState', state);
  if (fallbackScene) fallbackScene.dataset.state = state;
  root.style.setProperty('--roof-state-index', String(activeIndex));
  app.style.setProperty('--roof-state-index', String(activeIndex));

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
    if (current) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  if (changed && shouldAnnounce) announce(STATE_ANNOUNCEMENTS[state]);
}

function addBox(
  sceneRuntime: NonNullable<typeof runtime>,
  parent: THREE.Object3D,
  scale: readonly [number, number, number],
  position: readonly [number, number, number],
  material: THREE.Material,
  rotationZ = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(sceneRuntime.geometry(new THREE.BoxGeometry(1, 1, 1)), material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.rotation.z = rotationZ;
  mesh.castShadow = quality !== 'low';
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makePlasterTexture(sceneRuntime: NonNullable<typeof runtime>): THREE.CanvasTexture {
  const textureCanvas = document.createElement('canvas');
  const size = quality === 'low' ? 128 : 256;
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext('2d');
  if (context) {
    context.fillStyle = '#e9dfca';
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < (quality === 'low' ? 420 : 1200); index += 1) {
      const x = seeded(index * 17 + 3) * size;
      const y = seeded(index * 29 + 7) * size;
      const light = seeded(index * 41 + 11) > .5;
      context.fillStyle = light ? 'rgba(255,250,232,.18)' : 'rgba(112,94,68,.08)';
      const radius = .25 + seeded(index * 53 + 13) * 1.15;
      context.fillRect(x, y, radius, radius * .55);
    }
    context.globalAlpha = .08;
    context.strokeStyle = '#8f795d';
    context.lineWidth = .6;
    for (let y = 18; y < size; y += 31) {
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(size * .3, y + 2, size * .72, y - 2, size, y + 1);
      context.stroke();
    }
  }
  const texture = sceneRuntime.texture(new THREE.CanvasTexture(textureCanvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 1.8);
  texture.anisotropy = Math.min(4, sceneRuntime.renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createTube(
  sceneRuntime: NonNullable<typeof runtime>,
  points: readonly THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  tubularSegments = 32,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([...points], false, 'centripetal');
  const geometry = sceneRuntime.geometry(new THREE.TubeGeometry(
    curve,
    quality === 'low' ? Math.max(8, Math.floor(tubularSegments * .55)) : tubularSegments,
    radius,
    quality === 'low' ? 5 : 8,
    false,
  ));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 7;
  sceneRuntime.scene.add(mesh);
  return mesh;
}

function createArchitecture(sceneRuntime: NonNullable<typeof runtime>): void {
  architectureGroup = new THREE.Group();
  architectureGroup.position.x = -.35;
  sceneRuntime.scene.add(architectureGroup);

  const plasterTexture = makePlasterTexture(sceneRuntime);
  const plaster = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xe8ddc7,
    map: plasterTexture,
    roughness: .93,
    metalness: 0,
  }));
  const plasterSide = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xcdbb9d,
    roughness: .93,
  }));
  const terracotta = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xa85836,
    roughness: .68,
    clearcoat: .08,
  }));
  const roofEdge = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x75442f,
    roughness: .77,
  }));
  const roofUnder = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x604435,
    roughness: .86,
    metalness: 0,
  }));
  const cutEdge = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xb89f7b,
    roughness: .82,
    clearcoat: .04,
  }));
  const wood = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x92613b,
    roughness: .72,
  }));
  const darkRoom = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x7c8b82,
    roughness: .86,
  }));
  const glass = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xcbe6e7,
    roughness: .1,
    transmission: .56,
    thickness: .18,
    transparent: true,
    opacity: .46,
    depthWrite: false,
  }));
  const metal = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x899594,
    roughness: .3,
    metalness: .78,
    clearcoat: .22,
  }));
  const metalDark = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x596765,
    roughness: .38,
    metalness: .7,
  }));

  // A readable open-front house section: rear wall, floors, room dividers and pitched roof.
  addBox(sceneRuntime, architectureGroup, [5.25, 4.2, .22], [-1.1, -.1, -.68], plaster);
  addBox(sceneRuntime, architectureGroup, [.24, 4.25, 1.35], [-3.72, -.08, 0], plasterSide);
  addBox(sceneRuntime, architectureGroup, [.22, 4.25, 1.35], [1.5, -.08, 0], cutEdge);
  addBox(sceneRuntime, architectureGroup, [5.5, .24, 1.45], [-.98, -2.18, 0], plasterSide);
  addBox(sceneRuntime, architectureGroup, [5.22, .16, 1.3], [-1.08, -.1, .02], wood);
  addBox(sceneRuntime, architectureGroup, [5.3, .08, 1.42], [-1.08, -.23, .02], cutEdge);
  addBox(sceneRuntime, architectureGroup, [5.62, .28, 1.58], [-1.02, -2.33, .02], cutEdge);
  addBox(sceneRuntime, architectureGroup, [5.42, .12, 1.52], [-1.08, 1.91, .02], cutEdge);
  addBox(sceneRuntime, architectureGroup, [.16, 1.9, 1.22], [-.9, -1.12, .04], plasterSide);
  addBox(sceneRuntime, architectureGroup, [1.25, 1.42, .07], [-2.35, -.96, -.52], darkRoom);
  addBox(sceneRuntime, architectureGroup, [1.12, .82, .07], [.45, 1.23, -.52], glass);
  addBox(sceneRuntime, architectureGroup, [.075, .82, .1], [.45, 1.23, -.44], wood);
  addBox(sceneRuntime, architectureGroup, [1.12, .075, .1], [.45, 1.23, -.44], wood);
  addBox(sceneRuntime, architectureGroup, [1.18, .1, .72], [-2.25, -1.73, .25], wood);
  addBox(sceneRuntime, architectureGroup, [.13, 1.08, .13], [-2.72, -1.34, .26], wood);
  addBox(sceneRuntime, architectureGroup, [.13, 1.08, .13], [-1.78, -1.34, .26], wood);

  const roofAngle = .49;
  addBox(sceneRuntime, architectureGroup, [3.22, .2, 1.65], [-2.18, 2.95, -.02], terracotta, roofAngle);
  addBox(sceneRuntime, architectureGroup, [3.25, .2, 1.65], [.43, 2.95, -.02], terracotta, -roofAngle);
  addBox(sceneRuntime, architectureGroup, [3.22, .07, 1.69], [-2.2, 2.8, .02], roofEdge, roofAngle);
  addBox(sceneRuntime, architectureGroup, [3.25, .07, 1.69], [.45, 2.8, .02], roofEdge, -roofAngle);
  addBox(sceneRuntime, architectureGroup, [3.08, .09, 1.43], [-2.14, 2.7, .15], roofUnder, roofAngle);
  addBox(sceneRuntime, architectureGroup, [3.1, .09, 1.43], [.37, 2.7, .15], roofUnder, -roofAngle);
  addBox(sceneRuntime, architectureGroup, [.12, .38, 1.82], [-3.61, 2.18, .02], roofEdge, roofAngle);
  addBox(sceneRuntime, architectureGroup, [.12, .38, 1.82], [1.84, 2.18, .02], roofEdge, -roofAngle);
  for (const z of [-.58, .04, .66]) {
    addBox(sceneRuntime, architectureGroup, [3.05, .055, .07], [-2.13, 2.67, z], wood, roofAngle);
    addBox(sceneRuntime, architectureGroup, [3.06, .055, .07], [.38, 2.67, z], wood, -roofAngle);
  }
  const ridge = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.16, .16, 3.45, quality === 'low' ? 10 : 18)),
    terracotta,
  );
  ridge.rotation.x = Math.PI / 2;
  ridge.position.set(-.88, 3.7, 0);
  architectureGroup.add(ridge);

  const gutter = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.14, .14, 3.55, quality === 'low' ? 12 : 22, 1, true, 0, Math.PI)),
    metal,
  );
  gutter.rotation.z = Math.PI / 2;
  gutter.position.set(.25, 2.2, .92);
  architectureGroup.add(gutter);
  const downpipe = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.105, .105, 3.9, quality === 'low' ? 10 : 18)),
    metalDark,
  );
  downpipe.position.set(2.18, .27, .02);
  architectureGroup.add(downpipe);
  const pipeElbow = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.TorusGeometry(.21, .105, quality === 'low' ? 7 : 12, quality === 'low' ? 12 : 22, Math.PI / 2)),
    metalDark,
  );
  pipeElbow.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  pipeElbow.position.set(2.02, 2.05, .02);
  architectureGroup.add(pipeElbow);

  // Semi-transparent cistern and a visible blue water body.
  const tankShellMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x9fc9c7,
    roughness: .13,
    metalness: .04,
    transmission: .5,
    thickness: .45,
    transparent: true,
    opacity: .46,
    depthWrite: false,
    side: THREE.DoubleSide,
    clearcoat: .32,
    clearcoatRoughness: .18,
  }));
  const tankBackMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x6ca6a7,
    roughness: .2,
    transmission: .22,
    thickness: .5,
    transparent: true,
    opacity: .2,
    depthWrite: false,
    side: THREE.BackSide,
  }));
  const tankBack = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.84, .9, 2.5, quality === 'low' ? 20 : 36, 1, true)),
    tankBackMaterial,
  );
  tankBack.position.set(3.12, -1, 0);
  tankBack.renderOrder = 2;
  architectureGroup.add(tankBack);
  const tankShell = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.88, .94, 2.55, quality === 'low' ? 20 : 36, 1, true)),
    tankShellMaterial,
  );
  tankShell.position.set(3.12, -1, 0);
  tankShell.renderOrder = 5;
  architectureGroup.add(tankShell);
  const tankCapMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xc9e2dc,
    roughness: .1,
    transmission: .62,
    thickness: .16,
    transparent: true,
    opacity: .34,
    depthWrite: false,
    clearcoat: .46,
  }));
  for (const y of [-2.24, .24]) {
    const cap = new THREE.Mesh(
      sceneRuntime.geometry(new THREE.CylinderGeometry(.87, .87, .045, quality === 'low' ? 20 : 36)),
      tankCapMaterial,
    );
    cap.position.set(3.12, y, 0);
    cap.renderOrder = 6;
    architectureGroup.add(cap);
  }
  const tankRimGeometry = sceneRuntime.geometry(new THREE.TorusGeometry(.88, .045, 8, quality === 'low' ? 20 : 36));
  for (const y of [-2.25, .25]) {
    const rim = new THREE.Mesh(tankRimGeometry, metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(3.12, y, 0);
    architectureGroup.add(rim);
  }
  for (const x of [2.29, 3.95]) {
    const band = addBox(sceneRuntime, architectureGroup, [.045, 2.42, .075], [x, -1, .72], metal);
    band.castShadow = false;
    band.renderOrder = 7;
  }
  tankWaterMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x258eb0,
    emissive: 0x1b6780,
    emissiveIntensity: .16,
    roughness: .12,
    transmission: .18,
    transparent: true,
    opacity: .68,
    depthWrite: false,
  }));
  tankWater = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.79, .84, 1, quality === 'low' ? 18 : 32)),
    tankWaterMaterial,
  );
  tankWater.position.set(3.12, -2.1, 0);
  tankWater.renderOrder = 4;
  architectureGroup.add(tankWater);
  const tankSurfaceMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x75d3df,
    emissive: 0x237c93,
    emissiveIntensity: .24,
    roughness: .04,
    transmission: .36,
    transparent: true,
    opacity: .82,
    depthWrite: false,
    clearcoat: .86,
    clearcoatRoughness: .06,
  }));
  tankWaterSurface = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.CylinderGeometry(.82, .82, .035, quality === 'low' ? 18 : 32)),
    tankSurfaceMaterial,
  );
  tankWaterSurface.position.set(3.12, -2.08, 0);
  tankWaterSurface.renderOrder = 8;
  architectureGroup.add(tankWaterSurface);
  addBox(sceneRuntime, architectureGroup, [.3, .18, .25], [4.02, -1.67, 0], metalDark);

  // Garden bed, irrigation channel and plants.
  soilMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x725138,
    roughness: 1,
  }));
  addBox(sceneRuntime, architectureGroup, [3.1, .4, 1.55], [5.15, -2.05, .02], soilMaterial);
  const stone = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xb4a88f, roughness: .92 }));
  addBox(sceneRuntime, architectureGroup, [3.2, .18, 1.68], [5.15, -2.32, .02], stone);

  const stemMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0x39784c, roughness: .82 }));
  const leafMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x4d9660,
    roughness: .64,
    sheen: .42,
    sheenColor: new THREE.Color(0xa6c977),
  }));
  const leafLightMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x78ad67,
    roughness: .67,
    sheen: .38,
    sheenColor: new THREE.Color(0xc6df93),
  }));
  const flowerMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xd9a34d, roughness: .65 }));
  const plantCount = quality === 'low' ? 5 : 7;
  const stemGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.028, .045, .95, quality === 'low' ? 6 : 9));
  const leafGeometry = sceneRuntime.geometry(new THREE.SphereGeometry(.22, quality === 'low' ? 7 : 11, quality === 'low' ? 5 : 8));
  for (let index = 0; index < plantCount; index += 1) {
    const x = 4.2 + index * (2.15 / Math.max(1, plantCount - 1));
    plantSeeds.push({ x, z: index % 2 ? .35 : -.28, phase: index * .84 });
    const leafCount = quality === 'low' ? 4 : 6;
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
      const seed: LeafSeed = {
        plantIndex: index,
        leafIndex,
        x: (leafIndex % 2 ? 1 : -1) * (.16 + (leafIndex % 3) * .025),
        y: .2 + leafIndex * .125,
        z: (leafIndex % 3 - 1) * .075,
        rotationX: (leafIndex % 3 - 1) * .18,
        rotationY: (leafIndex % 2 ? 1 : -1) * .32,
        rotationZ: (leafIndex % 2 ? 1 : -1) * (.66 + leafIndex * .055),
      };
      (leafIndex % 3 === 0 ? leafLightSeeds : leafSeeds).push(seed);
    }
    if (index % 2 === 0) flowerPlantIndices.push(index);
  }
  stemInstances = new THREE.InstancedMesh(stemGeometry, stemMaterial, plantSeeds.length);
  leafInstances = new THREE.InstancedMesh(leafGeometry, leafMaterial, leafSeeds.length);
  leafLightInstances = new THREE.InstancedMesh(leafGeometry, leafLightMaterial, leafLightSeeds.length);
  flowerInstances = new THREE.InstancedMesh(
    sceneRuntime.geometry(new THREE.DodecahedronGeometry(.13, quality === 'low' ? 0 : 1)),
    flowerMaterial,
    flowerPlantIndices.length,
  );
  for (const mesh of [stemInstances, leafInstances, leafLightInstances, flowerInstances]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = quality !== 'low';
    mesh.receiveShadow = true;
    architectureGroup.add(mesh);
  }

  gardenGlow = new THREE.PointLight(0xcce29a, 0, 5.5, 1.7);
  gardenGlow.position.set(5.2, -.8, 1.8);
  architectureGroup.add(gardenGlow);
}

function createWaterSystem(sceneRuntime: NonNullable<typeof runtime>): void {
  const waterBase = {
    color: 0x2d9fcb,
    emissive: 0x126e94,
    emissiveIntensity: .3,
    roughness: .08,
    metalness: 0,
    transmission: .28,
    transparent: true,
    opacity: .7,
    depthWrite: false,
  } as const;
  roofWaterMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial(waterBase));
  gutterWaterMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ ...waterBase, opacity: .08 }));
  pipeWaterMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ ...waterBase, opacity: .04 }));
  releaseWaterMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ ...waterBase, opacity: .02 }));

  createTube(sceneRuntime, [
    new THREE.Vector3(-.8, 3.65, .95),
    new THREE.Vector3(.18, 3.18, .95),
    new THREE.Vector3(1.5, 2.45, .95),
    new THREE.Vector3(1.72, 2.28, .95),
  ], .038, roofWaterMaterial, 38);
  createTube(sceneRuntime, [
    new THREE.Vector3(-.45, 2.22, 1.02),
    new THREE.Vector3(.65, 2.21, 1.02),
    new THREE.Vector3(1.55, 2.18, 1.02),
    new THREE.Vector3(1.82, 2.08, 1.02),
  ], .052, gutterWaterMaterial, 30);
  createTube(sceneRuntime, [
    new THREE.Vector3(1.86, 2.08, 1.01),
    new THREE.Vector3(1.9, 1.65, 1.01),
    new THREE.Vector3(1.9, -.55, 1.01),
    new THREE.Vector3(2.3, -.72, 1.01),
    new THREE.Vector3(2.52, -.72, .8),
  ], .048, pipeWaterMaterial, 42);
  createTube(sceneRuntime, [
    new THREE.Vector3(3.65, -1.68, .9),
    new THREE.Vector3(4.05, -1.7, .92),
    new THREE.Vector3(4.35, -1.86, .86),
    new THREE.Vector3(5.05, -1.9, .65),
    new THREE.Vector3(5.7, -1.9, .42),
  ], .052, releaseWaterMaterial, 36);

  waterRoute = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, 5.05, 1.12),
    new THREE.Vector3(-.8, 3.65, 1.12),
    new THREE.Vector3(.2, 3.14, 1.12),
    new THREE.Vector3(1.62, 2.34, 1.12),
    new THREE.Vector3(1.86, 2.08, 1.12),
    new THREE.Vector3(1.9, -.55, 1.12),
    new THREE.Vector3(2.55, -.72, .85),
    new THREE.Vector3(3.12, -1.2, .55),
    new THREE.Vector3(3.68, -1.68, .9),
    new THREE.Vector3(4.5, -1.88, .78),
    new THREE.Vector3(5.95, -1.9, .4),
  ], false, 'centripetal');
  const beadCount = quality === 'high' ? 66 : quality === 'balanced' ? 48 : 30;
  const beadGeometry = sceneRuntime.geometry(new THREE.SphereGeometry(.072, quality === 'low' ? 6 : 10, quality === 'low' ? 5 : 8));
  const beadMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    ...waterBase,
    opacity: .86,
    transmission: .46,
    clearcoat: .7,
  }));
  waterBeads = new THREE.InstancedMesh(beadGeometry, beadMaterial, beadCount);
  waterBeads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waterBeads.renderOrder = 10;
  sceneRuntime.scene.add(waterBeads);

  const rainCount = quality === 'high' ? 92 : quality === 'balanced' ? 62 : 38;
  const rainGeometry = sceneRuntime.geometry(new THREE.SphereGeometry(1, quality === 'low' ? 5 : 8, quality === 'low' ? 4 : 6));
  const rainMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    ...waterBase,
    opacity: .64,
    transmission: .52,
  }));
  rainDrops = new THREE.InstancedMesh(rainGeometry, rainMaterial, rainCount);
  rainDrops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rainDrops.renderOrder = 9;
  for (let index = 0; index < rainCount; index += 1) {
    rainSeeds.push({
      x: -3.65 + seeded(index * 17 + 4) * 5.9,
      z: -.7 + seeded(index * 29 + 9) * 2.5,
      phase: seeded(index * 37 + 12),
      speed: .68 + seeded(index * 43 + 18) * .52,
      length: .065 + seeded(index * 47 + 22) * .075,
    });
  }
  sceneRuntime.scene.add(rainDrops);

  suspendedDrop = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.SphereGeometry(.17, quality === 'low' ? 10 : 18, quality === 'low' ? 7 : 12)),
    beadMaterial,
  );
  suspendedDrop.scale.set(.72, 1.42, .72);
  suspendedDrop.position.set(-1.12, 4.62, 1.17);
  suspendedDrop.renderOrder = 12;
  sceneRuntime.scene.add(suspendedDrop);
}

function createAtmosphere(sceneRuntime: NonNullable<typeof runtime>): void {
  sceneRuntime.scene.fog = new THREE.Fog(0xd9e8df, 16, 34);
  sceneRuntime.scene.add(new THREE.HemisphereLight(0xfff9dc, 0x587466, 2.18));
  const sun = new THREE.DirectionalLight(0xffe4a6, 5.35);
  sun.position.set(-4.8, 9.8, 7.8);
  sun.castShadow = quality !== 'low';
  if (sun.castShadow) {
    const mapSize = quality === 'high' ? 1536 : 1024;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -.0005;
  }
  sceneRuntime.scene.add(sun);
  const skyFill = new THREE.DirectionalLight(0x9fd6e1, 1.18);
  skyFill.position.set(7, 4, 4);
  sceneRuntime.scene.add(skyFill);
  const warmBounce = new THREE.DirectionalLight(0xf0b27f, .62);
  warmBounce.position.set(-3, -2, 5);
  sceneRuntime.scene.add(warmBounce);

  const ground = new THREE.Mesh(
    sceneRuntime.geometry(new THREE.PlaneGeometry(34, 24)),
    sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xb7c99d, roughness: 1 })),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(1.1, -2.43, 0);
  ground.receiveShadow = true;
  sceneRuntime.scene.add(ground);
}

function setFallback(reason: string): void {
  runtime?.dispose();
  runtime = null;
  fallback = true;
  if (canvas) canvas.hidden = true;
  if (fallbackScene) {
    fallbackScene.toggleAttribute('hidden', false);
    fallbackScene.dataset.fallbackReason = reason;
    fallbackScene.dataset.state = activeState;
  }
  if (fallbackMessage) {
    fallbackMessage.hidden = false;
    const strong = fallbackMessage.querySelector('strong');
    if (strong && reason === 'context-lost') strong.textContent = '3D 场景已暂停，基础建筑剖面继续运行';
  }
  setDataset('fallback', 'true');
  frames = 0;
  drawCalls = 0;
  triangles = 0;
  ready = true;
  setDataset('roofWaterReady', 'true');
  updateProgressStyles(renderedProgress);
}

function initializeScene(): void {
  if (forcedFallback || !canvas) {
    setFallback(forcedFallback ? 'forced' : 'missing-canvas');
    return;
  }
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 34, near: .08, far: 80 },
      clearColor: 0xdcece4,
      clearAlpha: 0,
      toneMappingExposure: 1.1,
      maxDpr: 1.8,
      lowQualityMaxDpr: 1,
      renderer: { premultipliedAlpha: false },
    });
    runtime.renderer.shadowMap.enabled = quality !== 'low';
    runtime.renderer.shadowMap.type = THREE.PCFShadowMap;
    createAtmosphere(runtime);
    createArchitecture(runtime);
    createWaterSystem(runtime);
    fallback = false;
    canvas.hidden = false;
    if (fallbackScene) fallbackScene.toggleAttribute('hidden', true);
    setDataset('fallback', 'false');
    resize();
    applyThreeScene(0, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  } catch (error) {
    console.warn('[roof-water-route] WebGL unavailable; semantic roof route remains active.', error);
    setFallback('webgl-unavailable');
  }
}

function updateRain(now: number, profile: SceneProfile): void {
  if (!rainDrops) return;
  const dummy = new THREE.Object3D();
  const elapsed = (now - startedAt) / 1000;
  const count = Math.round(rainSeeds.length * profile.rainfall);
  visibleDrops = count;
  for (let index = 0; index < rainSeeds.length; index += 1) {
    const seed = rainSeeds[index];
    if (index >= count) {
      dummy.scale.setScalar(0);
    } else {
      const travel = reducedMotion || deterministicReview
        ? seed.phase
        : (seed.phase + elapsed * seed.speed) % 1;
      dummy.position.set(seed.x, 6.1 - travel * 3.75, seed.z);
      dummy.scale.set(seed.length * .38, seed.length * 2.7, seed.length * .38);
    }
    dummy.updateMatrix();
    rainDrops.setMatrixAt(index, dummy.matrix);
  }
  rainDrops.instanceMatrix.needsUpdate = true;
}

function updateWaterRoute(now: number, profile: SceneProfile): void {
  if (!waterBeads || !waterRoute) return;
  const dummy = new THREE.Object3D();
  const elapsed = (now - startedAt) / 1000;
  const flow = Math.max(profile.rainfall, profile.gutterFlow, profile.downpipeFlow, profile.releaseFlow);
  const visible = Math.max(1, Math.round(waterBeads.count * (.28 + flow * .72)));
  for (let index = 0; index < waterBeads.count; index += 1) {
    if (index >= visible) {
      dummy.scale.setScalar(0);
    } else {
      const base = index / Math.max(1, visible - 1);
      const motion = reducedMotion || deterministicReview ? 0 : (elapsed * .055 * (.35 + flow * .65)) % .035;
      const position = waterRoute.getPointAt(clamp((base + motion) * profile.routeExtent));
      const pulse = .65 + Math.sin(index * 2.41 + elapsed * 4) * (reducedMotion ? 0 : .12);
      dummy.position.copy(position);
      dummy.scale.setScalar(pulse);
    }
    dummy.updateMatrix();
    waterBeads.setMatrixAt(index, dummy.matrix);
  }
  waterBeads.instanceMatrix.needsUpdate = true;
}

function updatePlants(profile: SceneProfile, now: number): void {
  const elapsed = (now - startedAt) / 1000;
  const dummy = new THREE.Object3D();
  plantSeeds.forEach((plant, index) => {
    const stagger = smoothstep(.18 + index * .025, .72 + index * .025, profile.plantGrowth);
    const idle = reducedMotion || deterministicReview ? 0 : Math.sin(elapsed * .72 + plant.phase) * .025 * stagger;
    const stemGrowth = lerp(.62, 1.08, stagger);
    dummy.position.set(plant.x, -1.86 + .475 * stemGrowth, plant.z);
    dummy.rotation.set(0, 0, idle);
    dummy.scale.set(1, stemGrowth, 1);
    dummy.updateMatrix();
    stemInstances?.setMatrixAt(index, dummy.matrix);
  });
  if (stemInstances) stemInstances.instanceMatrix.needsUpdate = true;

  const updateLeaves = (mesh: THREE.InstancedMesh | null, seeds: readonly LeafSeed[]): void => {
    if (!mesh) return;
    seeds.forEach((leaf, index) => {
      const plant = plantSeeds[leaf.plantIndex];
      const stagger = smoothstep(.18 + leaf.plantIndex * .025, .72 + leaf.plantIndex * .025, profile.plantGrowth);
      const idle = reducedMotion || deterministicReview ? 0 : Math.sin(elapsed * .72 + plant.phase) * .025 * stagger;
      const growth = lerp(.36, 1, smoothstep(.04 + leaf.leafIndex * .055, .78, stagger));
      dummy.position.set(plant.x + leaf.x, -1.86 + leaf.y, plant.z + leaf.z);
      dummy.rotation.set(leaf.rotationX, leaf.rotationY, leaf.rotationZ + idle);
      dummy.scale.set(.72 * growth, 1.18 * growth, .34 * growth);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  updateLeaves(leafInstances, leafSeeds);
  updateLeaves(leafLightInstances, leafLightSeeds);

  if (flowerInstances) {
    flowerPlantIndices.forEach((plantIndex, index) => {
      const plant = plantSeeds[plantIndex];
      const stagger = smoothstep(.18 + plantIndex * .025, .72 + plantIndex * .025, profile.plantGrowth);
      const scale = smoothstep(.66, .94, stagger);
      dummy.position.set(plant.x, -.88, plant.z);
      dummy.rotation.set(0, plantIndex * .42, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      flowerInstances?.setMatrixAt(index, dummy.matrix);
    });
    flowerInstances.instanceMatrix.needsUpdate = true;
  }
}

function applyThreeScene(progress: number, now: number): void {
  if (!runtime) return;
  const profile = blendProfiles(progress);
  currentProfile = profile;
  const mobile = innerWidth <= 720;
  const tablet = innerWidth <= 1060;
  const cameraZ = profile.cameraZ + (mobile ? 5.3 : tablet ? 1.8 : 0);
  const cameraX = profile.cameraX + (mobile ? .4 : 0);
  const cameraY = profile.cameraY + (mobile ? .35 : 0);
  runtime.camera.position.set(cameraX, cameraY, cameraZ);
  runtime.camera.lookAt(profile.lookX, profile.lookY, 0);
  cameraSnapshot = {
    x: rounded(cameraX),
    y: rounded(cameraY),
    z: rounded(cameraZ),
    lookX: rounded(profile.lookX),
    lookY: rounded(profile.lookY),
  };
  if (architectureGroup) {
    architectureGroup.scale.setScalar(mobile ? .86 : tablet ? .94 : 1);
    architectureGroup.position.x = mobile ? -.1 : -.35;
  }
  if (roofWaterMaterial) roofWaterMaterial.opacity = .06 + profile.roofFlow * .84;
  if (gutterWaterMaterial) gutterWaterMaterial.opacity = .04 + profile.gutterFlow * .9;
  if (pipeWaterMaterial) pipeWaterMaterial.opacity = .025 + profile.downpipeFlow * .88;
  if (releaseWaterMaterial) releaseWaterMaterial.opacity = .02 + profile.releaseFlow * .94;
  if (tankWater && tankWaterMaterial) {
    const waterHeight = .16 + profile.tankLevel * 2.18;
    tankWater.scale.y = waterHeight;
    tankWater.position.y = -2.17 + waterHeight * .5;
    tankWaterMaterial.opacity = .46 + profile.tankLevel * .34;
    if (tankWaterSurface) {
      tankWaterSurface.position.y = -2.17 + waterHeight;
      const surfacePulse = reducedMotion || deterministicReview ? 1 : 1 + Math.sin((now - startedAt) * .0024) * .018;
      tankWaterSurface.scale.set(surfacePulse, 1, surfacePulse);
    }
  }
  if (soilMaterial) {
    soilMaterial.color.setRGB(
      lerp(.45, .25, profile.hydration),
      lerp(.32, .22, profile.hydration),
      lerp(.22, .17, profile.hydration),
    );
  }
  if (gardenGlow) gardenGlow.intensity = profile.hydration * 1.35;
  if (suspendedDrop) {
    suspendedDrop.visible = progress < .27;
    const pulse = reducedMotion || deterministicReview ? 1 : 1 + Math.sin((now - startedAt) * .004) * .08;
    suspendedDrop.scale.set(.72 * pulse, 1.42 * pulse, .72 * pulse);
  }
  updateRain(now, profile);
  updateWaterRoute(now, profile);
  updatePlants(profile, now);
}

function updateProgressStyles(progress: number): void {
  const profile = blendProfiles(progress);
  canvasVisualHash = hashString([
    fallback ? 'fallback' : 'webgl',
    activeState,
    Math.round(progress * 1000),
    Math.round(profile.rainfall * 100),
    Math.round(profile.routeExtent * 100),
    Math.round(profile.tankLevel * 100),
    Math.round(profile.plantGrowth * 100),
    Math.round(cameraSnapshot.x * 100),
    Math.round(cameraSnapshot.y * 100),
    Math.round(cameraSnapshot.z * 100),
    quality,
  ].join('|'));
  if (canvas) canvas.dataset.visualHash = canvasVisualHash;
  root.dataset.canvasVisualHash = canvasVisualHash;
  root.style.setProperty('--roof-progress', progress.toFixed(4));
  root.style.setProperty('--tank-level', profile.tankLevel.toFixed(4));
  root.style.setProperty('--plant-growth', profile.plantGrowth.toFixed(4));
  root.style.setProperty('--rainfall', profile.rainfall.toFixed(4));
  app.style.setProperty('--roof-progress', progress.toFixed(4));
  app.style.setProperty('--tank-level', profile.tankLevel.toFixed(4));
  app.style.setProperty('--plant-growth', profile.plantGrowth.toFixed(4));
  app.style.setProperty('--rainfall', profile.rainfall.toFixed(4));
  if (fallbackScene) {
    fallbackScene.style.setProperty('--roof-progress', progress.toFixed(4));
    fallbackScene.style.setProperty('--tank-level', profile.tankLevel.toFixed(4));
    fallbackScene.style.setProperty('--plant-growth', profile.plantGrowth.toFixed(4));
  }
}

function resize(): void {
  recalculateStateStops();
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  applyThreeScene(renderedProgress, performance.now());
  runtime.render();
  drawCalls = runtime.renderer.info.render.calls;
  triangles = runtime.renderer.info.render.triangles;
}

function syncScrollState(): void {
  scrollFrame = 0;
  recalculateStateStops();
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  targetProgress = clamp(scrollY / scrollRange);
  const state = stateForProgress(targetProgress);
  applySemanticState(state);
  if (reducedMotion) {
    renderedProgress = stateStops[ROOF_STATES.indexOf(state)];
    updateProgressStyles(renderedProgress);
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
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  scrollTo({ top: next * scrollRange, behavior: 'auto' });
  root.style.scrollBehavior = previousScrollBehavior;
  targetProgress = next;
  const state = stateForProgress(next);
  applySemanticState(state);
  renderedProgress = reducedMotion ? stateStops[ROOF_STATES.indexOf(state)] : next;
  updateProgressStyles(renderedProgress);
  if (runtime) {
    applyThreeScene(renderedProgress, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  } else {
    currentProfile = blendProfiles(renderedProgress);
    const mobile = innerWidth <= 720;
    const tablet = innerWidth <= 1060;
    cameraSnapshot = {
      x: rounded(currentProfile.cameraX + (mobile ? .4 : 0)),
      y: rounded(currentProfile.cameraY + (mobile ? .35 : 0)),
      z: rounded(currentProfile.cameraZ + (mobile ? 5.3 : tablet ? 1.8 : 0)),
      lookX: rounded(currentProfile.lookX),
      lookY: rounded(currentProfile.lookY),
    };
  }
}

function resolveState(value: RoofState | number): RoofState {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return ROOF_STATES[Math.max(0, Math.min(ROOF_STATES.length - 1, value))];
    return stateForProgress(clamp(value));
  }
  return isRoofState(value) ? value : activeState;
}

function setState(value: RoofState | number): void {
  const state = resolveState(value);
  recalculateStateStops();
  setProgress(stateStops[ROOF_STATES.indexOf(state)]);
  applySemanticState(state);
  announce(STATE_ANNOUNCEMENTS[state]);
}

function onStateLink(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const state = elementState(target);
  if (!state) return;
  event.preventDefault();
  setState(state);
  history.replaceState(null, '', `#${state}`);
}

function openPlan(): void {
  if (!dialog) return;
  focusReturn = document.activeElement instanceof HTMLElement
    && document.activeElement !== document.body
    && document.activeElement !== root
    ? document.activeElement
    : openButtons[0] ?? null;
  if (!dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  setDataset('planOpen', 'true');
  requestAnimationFrame(() => {
    const first = dialog.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    (first ?? dialog).focus();
  });
}

function closePlan(): void {
  if (!dialog?.open) return;
  if (typeof dialog.close === 'function') dialog.close();
  else {
    dialog.removeAttribute('open');
    onDialogClosed();
  }
}

function onDialogClosed(): void {
  setDataset('planOpen', 'false');
  if (focusReturn?.isConnected) focusReturn.focus();
  else openButtons[0]?.focus();
  focusReturn = null;
}

function savePlan(event: SubmitEvent): void {
  event.preventDefault();
  if (!planForm) return;
  const values: Record<string, string | string[]> = {};
  new FormData(planForm).forEach((value, key) => {
    const text = String(value);
    const existing = values[key];
    if (existing === undefined) values[key] = text;
    else values[key] = Array.isArray(existing) ? [...existing, text] : [existing, text];
  });
  try {
    localStorage.setItem(storageKey, JSON.stringify({ values, savedAt: new Date().toISOString() }));
    saved = true;
    setDataset('planSaved', 'true');
    if (planStatus) planStatus.textContent = '屋顶路线概念清单已保存在这台设备上。';
    announce('屋顶路线概念清单已保存。');
  } catch (error) {
    saved = false;
    setDataset('planSaved', 'false');
    if (planStatus) planStatus.textContent = '当前浏览器无法本地保存；你仍可继续查看这份清单。';
    console.warn('[roof-water-route] Local plan could not be saved.', error);
  }
}

function restorePlan(): void {
  if (!planForm) return;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { values?: Record<string, string | string[]> };
    if (!parsed.values || typeof parsed.values !== 'object') return;
    Object.entries(parsed.values).forEach(([name, stored]) => {
      const values = Array.isArray(stored) ? stored : [stored];
      const controls = Array.from(planForm.elements).filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => (
        (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
        && element.name === name
      ));
      controls.forEach((control) => {
        if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
          control.checked = values.includes(control.value);
        } else if (control instanceof HTMLSelectElement && control.multiple) {
          Array.from(control.options).forEach((option) => { option.selected = values.includes(option.value); });
        } else {
          control.value = values[0] ?? '';
        }
      });
    });
    saved = true;
    setDataset('planSaved', 'true');
    if (planStatus) planStatus.textContent = '已载入这台设备上保存的屋顶路线清单。';
  } catch (error) {
    console.warn('[roof-water-route] Stored plan was unreadable and was ignored.', error);
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (dialog?.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
    || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
  let nextIndex: number | null = null;
  if (event.key === 'ArrowDown' || event.key === 'PageDown') nextIndex = Math.min(ROOF_STATES.length - 1, activeIndex + 1);
  else if (event.key === 'ArrowUp' || event.key === 'PageUp') nextIndex = Math.max(0, activeIndex - 1);
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = ROOF_STATES.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  setState(nextIndex);
}

function onContextLost(event: Event): void {
  event.preventDefault();
  setFallback('context-lost');
  announce('3D 建筑剖面已暂停，基础屋顶水路仍可阅读和规划。');
}

function snapshot(): RoofWaterSnapshot {
  return {
    ready,
    state: activeState,
    activeState,
    activeIndex,
    progress: rounded(renderedProgress, 4),
    rainLevel: rounded(currentProfile.rainfall),
    waterTravel: rounded(currentProfile.routeExtent),
    tankFill: rounded(currentProfile.tankLevel),
    plantGrowth: rounded(currentProfile.plantGrowth),
    cameraX: cameraSnapshot.x,
    cameraY: cameraSnapshot.y,
    cameraZ: cameraSnapshot.z,
    canvasVisualHash,
    camera: cameraSnapshot,
    water: {
      rainfall: rounded(currentProfile.rainfall),
      roofFlow: rounded(currentProfile.roofFlow),
      gutterFlow: rounded(currentProfile.gutterFlow),
      downpipeFlow: rounded(currentProfile.downpipeFlow),
      releaseFlow: rounded(currentProfile.releaseFlow),
      routeExtent: rounded(currentProfile.routeExtent),
      visibleDrops,
    },
    tank: {
      level: rounded(currentProfile.tankLevel),
      opacity: rounded(.46 + currentProfile.tankLevel * .34),
    },
    plant: {
      growth: rounded(currentProfile.plantGrowth),
      hydration: rounded(currentProfile.hydration),
    },
    dialogOpen: Boolean(dialog?.open),
    saved,
    noteLength: planNote?.value.length ?? 0,
    frames: fallback ? 0 : frames,
    drawCalls,
    triangles,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    quality,
    revision,
  };
}

function tick(now: number): void {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(.001, (now - lastFrameAt) / 1000));
  lastFrameAt = now;
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 5.6);
  renderedProgress += (targetProgress - renderedProgress) * smoothing;
  if (Math.abs(targetProgress - renderedProgress) < .0001) renderedProgress = targetProgress;
  currentProfile = blendProfiles(renderedProgress);
  updateProgressStyles(renderedProgress);
  if (runtime && !fallback) {
    applyThreeScene(renderedProgress, now);
    runtime.render();
    frames += 1;
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
    if (!ready && frames >= 2) {
      ready = true;
      setDataset('roofWaterReady', 'true');
    }
  }
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
  canvas?.removeEventListener('webglcontextlost', onContextLost);
  stateLinks.forEach((link) => link.removeEventListener('click', onStateLink));
  openButtons.forEach((button) => button.removeEventListener('click', openPlan));
  closeButtons.forEach((button) => button.removeEventListener('click', closePlan));
  planForm?.removeEventListener('submit', savePlan);
  runtime?.dispose();
  runtime = null;
  delete window.__roofWaterRoute;
}

setDataset('roofWaterReady', 'false');
setDataset('fallback', String(fallback));
setDataset('reducedMotion', String(reducedMotion));
setDataset('planOpen', 'false');
setDataset('planSaved', 'false');
if (planStatus) {
  planStatus.setAttribute('role', 'status');
  planStatus.setAttribute('aria-live', 'polite');
}
applySemanticState('opening', false);
restorePlan();
initializeScene();
recalculateStateStops();
syncScrollState();

stateLinks.forEach((link) => link.addEventListener('click', onStateLink));
openButtons.forEach((button) => button.addEventListener('click', openPlan));
closeButtons.forEach((button) => button.addEventListener('click', closePlan));
planForm?.addEventListener('submit', savePlan);
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) closePlan();
});
dialog?.addEventListener('close', onDialogClosed);
canvas?.addEventListener('webglcontextlost', onContextLost, false);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', resize, { passive: true });
addEventListener('keydown', onKeydown);

window.__roofWaterRoute = { snapshot, setProgress, setState, goto: setState, openPlan, closePlan };
frameId = requestAnimationFrame(tick);
addEventListener('pagehide', dispose, { once: true });

export {};
