import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createGeneratedThreeRuntime,
  type GeneratedQuality,
} from '../../../../src/generated-sdk/index.ts';

type AssemblyMode = 'horizontal' | 'split' | 'wall';
type AudioState = 'idle' | 'playing' | 'stopped' | 'unavailable';
type PositionTuple = [number, number, number];

interface TransformDefinition {
  position: PositionTuple;
  rotation: PositionTuple;
  scale?: PositionTuple;
}

interface PoseDefinition {
  left: TransformDefinition;
  right: TransformDefinition;
  bridge: TransformDefinition;
}

interface RoutePulse {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  phase: number;
}

interface SpeakerAssembly {
  productRoot: THREE.Group;
  leftModule: THREE.Group;
  rightModule: THREE.Group;
  bridge: THREE.Group;
  drivers: THREE.Group;
  bassChamber: THREE.Group;
  contacts: THREE.Group;
  wallHooks: THREE.Group;
  frontCover: THREE.Group;
  soundRoute: THREE.Group;
  leftDrivers: THREE.Group;
  rightDrivers: THREE.Group;
  leftChamber: THREE.Group;
  rightChamber: THREE.Group;
  leftContacts: THREE.Group;
  rightContacts: THREE.Group;
  leftHook: THREE.Group;
  rightHook: THREE.Group;
  leftCover: THREE.Group;
  rightCover: THREE.Group;
  leftRoute: THREE.Group;
  rightRoute: THREE.Group;
  leftFollowers: THREE.Object3D[];
  rightFollowers: THREE.Object3D[];
  routePulses: RoutePulse[];
  routeMaterial: THREE.MeshStandardMaterial;
  pulseMaterial: THREE.MeshStandardMaterial;
}

interface ActivePreview {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  timer: number;
  version: number;
}

interface ModularRoomSoundSnapshot {
  ready: boolean;
  mode: AssemblyMode;
  progress: number;
  cutaway: boolean;
  playing: boolean;
  audioState: AudioState;
  saved: boolean;
  booked: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  quality: GeneratedQuality;
  revision: string;
  frames: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
  camera: {
    position: PositionTuple;
    target: PositionTuple;
    distance: number;
  };
  partPositions: Record<string, PositionTuple>;
  coverOffset: number;
  hooksVisible: boolean;
  routeVisible: boolean;
  canvasVisualHash: string;
  horizontalOverflow: boolean;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    __MODULAR_ROOM_SOUND__: {
      snapshot(): ModularRoomSoundSnapshot;
      goto(mode: AssemblyMode): ModularRoomSoundSnapshot;
      toggleCutaway(): ModularRoomSoundSnapshot;
      playPreview(): Promise<ModularRoomSoundSnapshot>;
      saveAndBook(): ModularRoomSoundSnapshot;
    };
  }
}

const MODES: readonly AssemblyMode[] = ['horizontal', 'split', 'wall'];
const MODE_PROGRESS: Record<AssemblyMode, number> = {
  horizontal: 0.04,
  split: 0.38,
  wall: 0.76,
};
const MODE_LABELS: Record<AssemblyMode, string> = {
  horizontal: '横置合体',
  split: '左右分体',
  wall: '双点壁挂',
};
const MODE_STATUS: Record<AssemblyMode, string> = {
  horizontal: '横置合体：两侧触点靠拢，金属桥位于装配中心。',
  split: '左右分体：两个模块拉开，触点间距与内部声路都可检查。',
  wall: '双点壁挂：两个模块抬升并转向墙面挂扣。',
};
const POSES: Record<AssemblyMode, PoseDefinition> = {
  horizontal: {
    left: { position: [-0.96, 0.12, 0], rotation: [0, -0.018, -0.012] },
    right: { position: [0.96, 0.12, 0], rotation: [0, 0.018, 0.012] },
    bridge: { position: [0, 0.14, -0.05], rotation: [0, 0, 0], scale: [1, 1, 1] },
  },
  split: {
    left: { position: [-1.78, 0.18, 0.22], rotation: [-0.025, 0.17, -0.055] },
    right: { position: [1.78, 0.28, -0.08], rotation: [0.018, -0.14, 0.052] },
    bridge: { position: [0, -0.87, 0.32], rotation: [0.08, 0, Math.PI / 2], scale: [0.78, 0.78, 0.78] },
  },
  wall: {
    left: { position: [-0.72, 0.78, -0.62], rotation: [-0.06, 0.23, -0.018] },
    right: { position: [1.72, 1.02, -0.82], rotation: [0.04, -0.18, 0.026] },
    bridge: { position: [0.48, -0.86, -0.18], rotation: [0, 0, Math.PI / 2], scale: [0.5, 0.5, 0.5] },
  },
};
const COVER_OPEN_POSITION = new THREE.Vector3(2.05, 0.42, 1.58);
const COVER_OPEN_QUATERNION = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, -0.42, 0.08));
const IDENTITY_QUATERNION = new THREE.Quaternion();
const STORAGE_KEY = 'r142-modular-room-sound';

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Modular Room Sound is missing ${selector}`);
  return element;
}

function optional<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value: number): number {
  const bounded = clamp(value);
  return bounded * bounded * (3 - 2 * bounded);
}

function isMode(value: string | undefined): value is AssemblyMode {
  return value === 'horizontal' || value === 'split' || value === 'wall';
}

function round(value: number, digits = 3): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function tuple(vector: THREE.Vector3): PositionTuple {
  return [round(vector.x), round(vector.y), round(vector.z)];
}

function quaternionFor(definition: TransformDefinition): THREE.Quaternion {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(...definition.rotation));
}

function scaleFor(definition: TransformDefinition): THREE.Vector3 {
  return new THREE.Vector3(...(definition.scale ?? [1, 1, 1]));
}

const root = required<HTMLElement>('#app');
const canvas = required<HTMLCanvasElement>('#scene-canvas');
const fallbackPanel = optional<HTMLElement>('#scene-fallback') ?? optional<HTMLElement>('[data-scene-fallback]');
const liveStatus = optional<HTMLElement>('[data-live-status]');
const modeStatus = optional<HTMLElement>('[data-mode-status]');
const audioStatus = optional<HTMLElement>('[data-audio-status]');
const saveStatus = optional<HTMLElement>('[data-save-status]');
const bookStatus = optional<HTMLElement>('[data-book-status]');
const fallbackReason = optional<HTMLElement>('[data-fallback-reason]');
const progressIndicators = Array.from(document.querySelectorAll<HTMLElement>('[data-progress]'));
const modeButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-mode]'));
const cutawayButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-cutaway]'));
const listenButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-listen]'));
const saveButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-save]'));
const bookButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-book]'));
const chapterElements = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter-mode]'));

const params = new URLSearchParams(location.search);
const qualityValue = params.get('quality');
const quality: GeneratedQuality = qualityValue === 'high' || qualityValue === 'low' ? qualityValue : 'balanced';
const motionValue = params.get('motion');
const reducedMotion = motionValue === 'full'
  ? false
  : motionValue === 'reduce' || motionValue === 'reduced'
    ? true
    : matchMedia('(prefers-reduced-motion: reduce)').matches;
const forcedFallback = params.get('fallback') === '1' || params.get('fallback') === 'true';
const forcedAudioFallback = params.get('audioFallback') === '1' || params.get('audioFallback') === 'true';
const revision = params.get('revision') ?? 'r142-modular-room-sound';

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let controls: OrbitControls | null = null;
let assembly: SpeakerAssembly | null = null;
let frameId = 0;
let scrollFrameId = 0;
let layoutFrameId = 0;
let disposed = false;
let ready = false;
let fallback = forcedFallback;
let contextLost = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let mode: AssemblyMode = 'horizontal';
let cutaway = false;
let scrollProgress = 0;
let coverOffset = 0;
let stageOffsetX = innerWidth <= 720 ? 0 : 1.32;
let audioState: AudioState = forcedAudioFallback ? 'unavailable' : 'idle';
let saved = false;
let booked = false;
let canvasVisualHash = '00000000';
let chapterStops: Array<{ mode: AssemblyMode; progress: number; element: HTMLElement | null }> = [
  { mode: 'horizontal', progress: MODE_PROGRESS.horizontal, element: null },
  { mode: 'split', progress: MODE_PROGRESS.split, element: null },
  { mode: 'wall', progress: MODE_PROGRESS.wall, element: null },
];
let lastFrameAt = performance.now();
let previewVersion = 0;
let audioContext: AudioContext | null = null;
let activePreview: ActivePreview | null = null;
let orbitInteracting = false;
let cameraFlight: {
  startedAt: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
} | null = null;

function readPersistedState(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const value = JSON.parse(stored) as { saved?: unknown; booked?: unknown };
    saved = value.saved === true;
    booked = value.booked === true;
  } catch {
    saved = false;
    booked = false;
  }
}

function persistState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ saved, booked }));
  } catch {
    // Persistence is progressive enhancement; the visible completion state remains valid.
  }
}

function announce(message: string): void {
  if (liveStatus) liveStatus.textContent = message;
}

function setDataset(name: string, value: string): void {
  root.dataset[name] = value;
  document.body.dataset[name] = value;
}

function hooksAreVisible(): boolean {
  return cutaway || mode === 'wall';
}

function routeIsVisible(): boolean {
  return cutaway || audioState === 'playing';
}

function updateDomState(): void {
  setDataset('mode', mode);
  setDataset('cutaway', String(cutaway));
  setDataset('playing', String(audioState === 'playing'));
  setDataset('audioState', audioState);
  setDataset('saved', String(saved));
  setDataset('booked', String(booked));
  setDataset('fallback', String(fallback));
  setDataset('reducedMotion', String(reducedMotion));
  setDataset('quality', quality);
  setDataset('sceneReady', String(ready));
  setDataset('contextLost', String(contextLost));
  root.style.setProperty('--scene-progress', scrollProgress.toFixed(4));

  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
  });
  cutawayButtons.forEach((button) => button.setAttribute('aria-pressed', String(cutaway)));
  listenButtons.forEach((button) => {
    const playing = audioState === 'playing';
    button.setAttribute('aria-pressed', String(playing));
    button.dataset.audioState = audioState;
  });
  saveButtons.forEach((button) => button.dataset.saved = String(saved));
  bookButtons.forEach((button) => button.dataset.booked = String(booked));
  const activeChapter = activeChapterForProgress(scrollProgress)?.element;
  chapterElements.forEach((chapter) => {
    const active = activeChapter === chapter;
    chapter.dataset.active = String(active);
    if (active) chapter.setAttribute('aria-current', 'step');
    else chapter.removeAttribute('aria-current');
  });
  progressIndicators.forEach((indicator) => {
    indicator.style.setProperty('--progress', scrollProgress.toFixed(4));
    indicator.setAttribute('aria-valuenow', String(Math.round(scrollProgress * 100)));
  });

  if (modeStatus) modeStatus.textContent = MODE_LABELS[mode];
  if (audioStatus) {
    audioStatus.textContent = audioState === 'playing'
      ? `${MODE_LABELS[mode]}概念试听正在播放；再次按试听可停止。`
      : audioState === 'unavailable'
        ? '音频增强不可用；装配、剖视、保存与预约仍可继续。'
        : '概念试听未播放；声音由浏览器实时合成，不代表实测声学。';
  }
  if (saveStatus) saveStatus.textContent = saved ? '当前装配已保存在本机页面状态。' : '尚未保存当前装配。';
  if (bookStatus) bookStatus.textContent = booked ? '试听预约意向已记录在本页。' : '尚未记录试听预约。';

  if (assembly) {
    assembly.wallHooks.visible = hooksAreVisible();
    assembly.soundRoute.visible = routeIsVisible();
    assembly.routePulses.forEach(({ mesh }) => { mesh.visible = audioState === 'playing'; });
  }
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function updateVisualHash(): void {
  const cameraPosition = !fallback && runtime ? runtime.camera.position : cameraProfile(mode).position;
  const signature = [
    fallback ? 'fallback' : 'webgl',
    mode,
    round(scrollProgress, 4),
    round(coverOffset, 3),
    cutaway ? 'open' : 'closed',
    audioState,
    saved ? 'saved' : 'unsaved',
    booked ? 'booked' : 'unbooked',
    quality,
    round(cameraPosition.x, 2),
    round(cameraPosition.y, 2),
    round(cameraPosition.z, 2),
  ].join('|');
  canvasVisualHash = hashString(signature);
  canvas.dataset.visualHash = canvasVisualHash;
}

function createRoundedExtrude(
  width: number,
  height: number,
  radius: number,
  depth: number,
  segments: number,
  bevel = 0.055,
): THREE.ExtrudeGeometry {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const boundedRadius = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + boundedRadius, -halfHeight);
  shape.lineTo(halfWidth - boundedRadius, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + boundedRadius);
  shape.lineTo(halfWidth, halfHeight - boundedRadius);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - boundedRadius, halfHeight);
  shape.lineTo(-halfWidth + boundedRadius, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - boundedRadius);
  shape.lineTo(-halfWidth, -halfHeight + boundedRadius);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + boundedRadius, -halfHeight);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: segments,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: Math.max(1, Math.min(4, Math.round(segments / 3))),
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.center();
  return geometry;
}

function createGrilleTexture(targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>): THREE.CanvasTexture {
  const source = document.createElement('canvas');
  source.width = 128;
  source.height = 128;
  const context = source.getContext('2d');
  if (context) {
    context.fillStyle = '#d85d42';
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'rgba(89, 39, 35, .42)';
    for (let y = 3; y < 128; y += 5) {
      for (let x = 3; x < 128; x += 5) {
        context.beginPath();
        context.arc(x + (y % 10 === 3 ? 0 : 2.5), y, 0.86, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.strokeStyle = 'rgba(255, 224, 196, .18)';
    context.lineWidth = 0.65;
    for (let y = 1; y < 128; y += 8) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(128, y + 4);
      context.stroke();
    }
  }
  const texture = targetRuntime.texture(new THREE.CanvasTexture(source));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.1, 1.9);
  texture.anisotropy = quality === 'high' ? 8 : quality === 'balanced' ? 4 : 1;
  return texture;
}

function setShadow(object: THREE.Object3D, cast = true, receive = true): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createModuleShell(
  targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>,
  side: -1 | 1,
  shellGeometry: THREE.ExtrudeGeometry,
  shellMaterial: THREE.MeshPhysicalMaterial,
  metalMaterial: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(shellGeometry, shellMaterial);
  shell.name = side < 0 ? 'leftRoundedExtrudedHousing' : 'rightRoundedExtrudedHousing';
  group.add(shell);

  const sideRailGeometry = targetRuntime.geometry(createRoundedExtrude(0.12, 1.62, 0.055, 0.065, 5, 0.018));
  const sideRail = new THREE.Mesh(sideRailGeometry, metalMaterial);
  sideRail.position.set(side < 0 ? -0.84 : 0.84, 0.02, 0.64);
  group.add(sideRail);

  const footGeometry = targetRuntime.geometry(new THREE.CylinderGeometry(0.105, 0.135, 0.12, quality === 'low' ? 10 : 18));
  for (const x of [-0.55, 0.55]) {
    const foot = new THREE.Mesh(footGeometry, metalMaterial);
    foot.position.set(x, -1.47, -0.08);
    group.add(foot);
  }

  const edgeGeometry = targetRuntime.geometry(new THREE.EdgesGeometry(shellGeometry, 32));
  const edgeMaterial = targetRuntime.material(new THREE.LineBasicMaterial({
    color: 0x8f382d,
    transparent: true,
    opacity: 0.28,
  }));
  const edge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  edge.renderOrder = 2;
  group.add(edge);
  setShadow(group);
  return group;
}

function createDriverRig(
  targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>,
  discGeometry: THREE.CylinderGeometry,
  ringGeometry: THREE.TorusGeometry,
  tweeterGeometry: THREE.SphereGeometry,
  coneMaterial: THREE.MeshStandardMaterial,
  ringMaterial: THREE.MeshStandardMaterial,
  tweeterMaterial: THREE.MeshPhysicalMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const woofer = new THREE.Mesh(discGeometry, coneMaterial);
  woofer.rotation.x = Math.PI / 2;
  woofer.position.set(0, -0.34, 0.68);
  group.add(woofer);
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.set(0, -0.34, 0.77);
  group.add(ring);
  const tweeter = new THREE.Mesh(tweeterGeometry, tweeterMaterial);
  tweeter.scale.set(0.31, 0.31, 0.12);
  tweeter.position.set(0, 0.67, 0.73);
  group.add(tweeter);
  const tweeterRingGeometry = targetRuntime.geometry(new THREE.TorusGeometry(0.245, 0.035, 6, quality === 'low' ? 18 : 28));
  const tweeterRing = new THREE.Mesh(tweeterRingGeometry, ringMaterial);
  tweeterRing.position.set(0, 0.67, 0.77);
  group.add(tweeterRing);
  setShadow(group);
  return group;
}

function createChamberRig(
  chamberGeometry: THREE.ExtrudeGeometry,
  chamberMaterial: THREE.MeshPhysicalMaterial,
  portGeometry: THREE.TorusGeometry,
  portMaterial: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
  chamber.position.z = 0.42;
  chamber.name = 'sealedBassVolumeConcept';
  group.add(chamber);
  const port = new THREE.Mesh(portGeometry, portMaterial);
  port.position.set(0, -0.83, 0.65);
  port.scale.set(1, 0.62, 1);
  group.add(port);
  return group;
}

function createContactRig(
  pinGeometry: THREE.CylinderGeometry,
  pinMaterial: THREE.MeshStandardMaterial,
  side: -1 | 1,
): THREE.Group {
  const group = new THREE.Group();
  const pins = new THREE.InstancedMesh(pinGeometry, pinMaterial, 3);
  pins.name = side < 0 ? 'leftContactPins' : 'rightContactPins';
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  for (let index = 0; index < 3; index += 1) {
    matrix.compose(
      new THREE.Vector3(side < 0 ? 0.94 : -0.94, -0.37 + index * 0.38, 0.05),
      rotation,
      new THREE.Vector3(1, 1, 1),
    );
    pins.setMatrixAt(index, matrix);
  }
  pins.instanceMatrix.needsUpdate = true;
  pins.castShadow = true;
  group.add(pins);
  return group;
}

function createHookRig(
  targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>,
  metalMaterial: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const plateGeometry = targetRuntime.geometry(createRoundedExtrude(0.58, 0.94, 0.18, 0.09, 5, 0.025));
  const plate = new THREE.Mesh(plateGeometry, metalMaterial);
  plate.position.set(0, 0.48, -0.72);
  group.add(plate);
  const hookGeometry = targetRuntime.geometry(new THREE.TorusGeometry(0.25, 0.055, 6, 18, Math.PI * 1.18));
  const hook = new THREE.Mesh(hookGeometry, metalMaterial);
  hook.rotation.set(Math.PI / 2, 0, -Math.PI * 0.09);
  hook.position.set(0, 0.77, -0.58);
  group.add(hook);
  const neckGeometry = targetRuntime.geometry(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 10));
  const neck = new THREE.Mesh(neckGeometry, metalMaterial);
  neck.rotation.x = Math.PI / 2;
  neck.position.set(0, 0.7, -0.61);
  group.add(neck);
  setShadow(group);
  return group;
}

function createCoverRig(
  targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>,
  coverGeometry: THREE.ExtrudeGeometry,
  grilleMaterial: THREE.MeshStandardMaterial,
  screwGeometry: THREE.CylinderGeometry,
  screwMaterial: THREE.MeshStandardMaterial,
): THREE.Group {
  const group = new THREE.Group();
  const cover = new THREE.Mesh(coverGeometry, grilleMaterial);
  cover.position.z = 0.76;
  cover.name = 'wovenFrontGrille';
  group.add(cover);
  const screws = new THREE.InstancedMesh(screwGeometry, screwMaterial, 4);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const corners: PositionTuple[] = [
    [-0.68, -1.09, 0.82],
    [0.68, -1.09, 0.82],
    [-0.68, 1.09, 0.82],
    [0.68, 1.09, 0.82],
  ];
  corners.forEach((position, index) => {
    matrix.compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(1, 1, 1));
    screws.setMatrixAt(index, matrix);
  });
  screws.instanceMatrix.needsUpdate = true;
  group.add(screws);
  const badgeGeometry = targetRuntime.geometry(createRoundedExtrude(0.42, 0.09, 0.045, 0.025, 4, 0.01));
  const badge = new THREE.Mesh(badgeGeometry, screwMaterial);
  badge.position.set(0, -1.12, 0.84);
  group.add(badge);
  setShadow(group);
  return group;
}

function createRouteRig(
  targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>,
  routeMaterial: THREE.MeshStandardMaterial,
  pulseMaterial: THREE.MeshStandardMaterial,
  side: -1 | 1,
  routePulses: RoutePulse[],
): THREE.Group {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.68, 0.7),
    new THREE.Vector3(side * 0.23, 0.35, 0.72),
    new THREE.Vector3(side * -0.18, -0.08, 0.71),
    new THREE.Vector3(0, -0.36, 0.72),
    new THREE.Vector3(side * 0.2, -0.74, 0.66),
  ]);
  const tubeGeometry = targetRuntime.geometry(new THREE.TubeGeometry(
    curve,
    quality === 'low' ? 10 : quality === 'high' ? 18 : 14,
    0.045,
    quality === 'low' ? 4 : 6,
    false,
  ));
  const tube = new THREE.Mesh(tubeGeometry, routeMaterial);
  tube.name = side < 0 ? 'leftLowSegmentSoundRoute' : 'rightLowSegmentSoundRoute';
  group.add(tube);
  const pulseGeometry = targetRuntime.geometry(new THREE.SphereGeometry(0.11, quality === 'low' ? 8 : 12, quality === 'low' ? 5 : 8));
  const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
  pulse.visible = false;
  group.add(pulse);
  routePulses.push({ curve, mesh: pulse, phase: side < 0 ? 0 : 0.48 });
  return group;
}

function createSpeakerAssembly(targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>): SpeakerAssembly {
  const productRoot = new THREE.Group();
  productRoot.name = 'productRoot';
  const leftModule = new THREE.Group();
  leftModule.name = 'leftModule';
  const rightModule = new THREE.Group();
  rightModule.name = 'rightModule';
  const bridge = new THREE.Group();
  bridge.name = 'bridge';
  const drivers = new THREE.Group();
  drivers.name = 'drivers';
  const bassChamber = new THREE.Group();
  bassChamber.name = 'bassChamber';
  const contacts = new THREE.Group();
  contacts.name = 'contacts';
  const wallHooks = new THREE.Group();
  wallHooks.name = 'wallHooks';
  const frontCover = new THREE.Group();
  frontCover.name = 'frontCover';
  const soundRoute = new THREE.Group();
  soundRoute.name = 'soundRoute';
  productRoot.add(leftModule, rightModule, bridge, drivers, bassChamber, contacts, wallHooks, frontCover, soundRoute);

  const roundedSegments = quality === 'low' ? 6 : quality === 'high' ? 14 : 10;
  const shellGeometry = targetRuntime.geometry(createRoundedExtrude(1.84, 2.76, 0.45, 1.12, roundedSegments, 0.075));
  const coverGeometry = targetRuntime.geometry(createRoundedExtrude(1.67, 2.56, 0.38, 0.065, roundedSegments, 0.028));
  const chamberGeometry = targetRuntime.geometry(createRoundedExtrude(1.2, 1.82, 0.34, 0.24, roundedSegments, 0.045));
  const bridgeGeometry = targetRuntime.geometry(createRoundedExtrude(0.42, 1.24, 0.2, 0.72, roundedSegments, 0.04));
  const discGeometry = targetRuntime.geometry(new THREE.CylinderGeometry(0.47, 0.36, 0.12, quality === 'low' ? 20 : 36, 1, false));
  const ringGeometry = targetRuntime.geometry(new THREE.TorusGeometry(0.5, 0.065, quality === 'low' ? 6 : 10, quality === 'low' ? 24 : 42));
  const tweeterGeometry = targetRuntime.geometry(new THREE.SphereGeometry(0.62, quality === 'low' ? 14 : 24, quality === 'low' ? 8 : 14));
  const portGeometry = targetRuntime.geometry(new THREE.TorusGeometry(0.19, 0.045, 6, quality === 'low' ? 18 : 28));
  const pinGeometry = targetRuntime.geometry(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 10));
  const screwGeometry = targetRuntime.geometry(new THREE.CylinderGeometry(0.028, 0.028, 0.025, 8));

  const shellMaterial = targetRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xf06f4f,
    roughness: 0.54,
    metalness: 0.03,
    clearcoat: 0.2,
    clearcoatRoughness: 0.48,
  }));
  const metalMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xb8ad9c,
    roughness: 0.27,
    metalness: 0.8,
  }));
  const contactMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xe5b45f,
    roughness: 0.22,
    metalness: 0.88,
  }));
  const coneMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0x173b82,
    roughness: 0.48,
    metalness: 0.13,
  }));
  const ringMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0x18356d,
    roughness: 0.23,
    metalness: 0.58,
  }));
  const tweeterMaterial = targetRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xe9d8bd,
    roughness: 0.25,
    metalness: 0.64,
    clearcoat: 0.42,
  }));
  const chamberMaterial = targetRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0x1d4ca6,
    emissive: 0x0c2c70,
    emissiveIntensity: 0.28,
    roughness: 0.28,
    metalness: 0.15,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
  }));
  const routeMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0x316bea,
    emissive: 0x1748bd,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  }));
  const pulseMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xbdd4ff,
    emissive: 0x2e73ff,
    emissiveIntensity: 2.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  }));
  const grilleTexture = createGrilleTexture(targetRuntime);
  const grilleMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    map: grilleTexture,
    color: 0xf4a081,
    roughness: 0.92,
    metalness: 0,
  }));

  leftModule.add(...createModuleShell(targetRuntime, -1, shellGeometry, shellMaterial, metalMaterial).children);
  rightModule.add(...createModuleShell(targetRuntime, 1, shellGeometry, shellMaterial, metalMaterial).children);

  const leftDrivers = createDriverRig(targetRuntime, discGeometry, ringGeometry, tweeterGeometry, coneMaterial, ringMaterial, tweeterMaterial);
  const rightDrivers = createDriverRig(targetRuntime, discGeometry, ringGeometry, tweeterGeometry, coneMaterial, ringMaterial, tweeterMaterial);
  drivers.add(leftDrivers, rightDrivers);

  const leftChamber = createChamberRig(chamberGeometry, chamberMaterial, portGeometry, ringMaterial);
  const rightChamber = createChamberRig(chamberGeometry, chamberMaterial, portGeometry, ringMaterial);
  bassChamber.add(leftChamber, rightChamber);

  const leftContacts = createContactRig(pinGeometry, contactMaterial, -1);
  const rightContacts = createContactRig(pinGeometry, contactMaterial, 1);
  contacts.add(leftContacts, rightContacts);

  const leftHook = createHookRig(targetRuntime, metalMaterial);
  const rightHook = createHookRig(targetRuntime, metalMaterial);
  wallHooks.add(leftHook, rightHook);

  const leftCover = createCoverRig(targetRuntime, coverGeometry, grilleMaterial, screwGeometry, contactMaterial);
  const rightCover = createCoverRig(targetRuntime, coverGeometry, grilleMaterial, screwGeometry, contactMaterial);
  frontCover.add(leftCover, rightCover);

  const routePulses: RoutePulse[] = [];
  const leftRoute = createRouteRig(targetRuntime, routeMaterial, pulseMaterial, -1, routePulses);
  const rightRoute = createRouteRig(targetRuntime, routeMaterial, pulseMaterial, 1, routePulses);
  soundRoute.add(leftRoute, rightRoute);

  const bridgeMesh = new THREE.Mesh(bridgeGeometry, metalMaterial);
  bridgeMesh.name = 'brushedMetalConnectionBridge';
  bridge.add(bridgeMesh);
  const bridgeCore = new THREE.Mesh(
    targetRuntime.geometry(new THREE.CylinderGeometry(0.16, 0.16, 0.8, quality === 'low' ? 12 : 22)),
    contactMaterial,
  );
  bridgeCore.rotation.x = Math.PI / 2;
  bridge.add(bridgeCore);
  setShadow(bridge);

  const leftFollowers = [leftModule, leftDrivers, leftChamber, leftContacts, leftHook, leftCover, leftRoute];
  const rightFollowers = [rightModule, rightDrivers, rightChamber, rightContacts, rightHook, rightCover, rightRoute];
  const created: SpeakerAssembly = {
    productRoot,
    leftModule,
    rightModule,
    bridge,
    drivers,
    bassChamber,
    contacts,
    wallHooks,
    frontCover,
    soundRoute,
    leftDrivers,
    rightDrivers,
    leftChamber,
    rightChamber,
    leftContacts,
    rightContacts,
    leftHook,
    rightHook,
    leftCover,
    rightCover,
    leftRoute,
    rightRoute,
    leftFollowers,
    rightFollowers,
    routePulses,
    routeMaterial,
    pulseMaterial,
  };
  applyPoseImmediately(created, mode);
  frontCover.position.set(0, 0, 0);
  frontCover.quaternion.identity();
  wallHooks.visible = hooksAreVisible();
  soundRoute.visible = routeIsVisible();
  return created;
}

function applyDefinitionImmediately(object: THREE.Object3D, definition: TransformDefinition): void {
  object.position.fromArray(definition.position);
  object.quaternion.copy(quaternionFor(definition));
  object.scale.copy(scaleFor(definition));
}

function applyPoseImmediately(targetAssembly: SpeakerAssembly, targetMode: AssemblyMode): void {
  const pose = POSES[targetMode];
  targetAssembly.leftFollowers.forEach((object) => applyDefinitionImmediately(object, pose.left));
  targetAssembly.rightFollowers.forEach((object) => applyDefinitionImmediately(object, pose.right));
  applyDefinitionImmediately(targetAssembly.bridge, pose.bridge);
}

function updateDefinition(object: THREE.Object3D, definition: TransformDefinition, amount: number): void {
  const position = new THREE.Vector3(...definition.position);
  const quaternion = quaternionFor(definition);
  const scale = scaleFor(definition);
  object.position.lerp(position, amount);
  object.quaternion.slerp(quaternion, amount);
  object.scale.lerp(scale, amount);
}

function updateAssembly(delta: number, elapsed: number): void {
  if (!assembly) return;
  const amount = reducedMotion ? 1 : 1 - Math.exp(-delta * 7.2);
  const pose = POSES[mode];
  assembly.leftFollowers.forEach((object) => updateDefinition(object, pose.left, amount));
  assembly.rightFollowers.forEach((object) => updateDefinition(object, pose.right, amount));
  updateDefinition(assembly.bridge, pose.bridge, amount);

  const coverTarget = cutaway ? COVER_OPEN_POSITION : new THREE.Vector3();
  const coverQuaternion = cutaway ? COVER_OPEN_QUATERNION : IDENTITY_QUATERNION;
  assembly.frontCover.position.lerp(coverTarget, amount);
  assembly.frontCover.quaternion.slerp(coverQuaternion, amount);
  coverOffset = assembly.frontCover.position.length();

  const playing = audioState === 'playing';
  assembly.routeMaterial.emissiveIntensity = playing ? 1.65 : 0.68;
  assembly.routeMaterial.opacity = playing ? 0.98 : 0.76;
  assembly.pulseMaterial.emissiveIntensity = playing ? 2.8 : 1.4;
  assembly.routePulses.forEach(({ curve, mesh, phase }) => {
    if (!playing) return;
    const speed = mode === 'horizontal' ? 0.34 : mode === 'split' ? 0.52 : 0.72;
    const progress = reducedMotion ? phase : (elapsed * speed + phase) % 1;
    curve.getPoint(progress, mesh.position);
    const pulseScale = reducedMotion ? 1 : 0.82 + Math.sin((elapsed * 7 + phase * 9)) * 0.16;
    mesh.scale.setScalar(pulseScale);
  });
  assembly.productRoot.updateMatrixWorld(true);
}

function createRoom(targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>): void {
  const room = new THREE.Group();
  room.name = 'creamDaylightRoom';
  const floorMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xeadfce,
    roughness: 0.96,
    metalness: 0,
  }));
  const wallMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xf5edde,
    roughness: 0.9,
    metalness: 0,
  }));
  const floor = new THREE.Mesh(targetRuntime.geometry(new THREE.PlaneGeometry(30, 24)), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.36;
  floor.receiveShadow = true;
  room.add(floor);
  const backWall = new THREE.Mesh(targetRuntime.geometry(new THREE.PlaneGeometry(30, 14)), wallMaterial);
  backWall.position.set(0, 5.5, -3.1);
  backWall.receiveShadow = true;
  room.add(backWall);

  const plinthMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xd8c8b5,
    roughness: 0.72,
    metalness: 0.02,
  }));
  const plinth = new THREE.Mesh(
    targetRuntime.geometry(new THREE.CylinderGeometry(3.1, 3.34, 0.28, quality === 'low' ? 36 : 72)),
    plinthMaterial,
  );
  plinth.position.set(stageOffsetX, -1.22, 0.08);
  plinth.receiveShadow = true;
  room.add(plinth);

  const rugMaterial = targetRuntime.material(new THREE.MeshStandardMaterial({
    color: 0x2c5fb8,
    roughness: 0.93,
    metalness: 0,
  }));
  const rug = new THREE.Mesh(
    targetRuntime.geometry(new THREE.RingGeometry(3.65, 4.22, quality === 'low' ? 44 : 84, 1, 0.28, Math.PI * 1.28)),
    rugMaterial,
  );
  rug.rotation.x = -Math.PI / 2;
  rug.rotation.z = -0.48;
  rug.position.set(stageOffsetX, -1.345, 0.18);
  room.add(rug);

  const sunlightMaterial = targetRuntime.material(new THREE.MeshBasicMaterial({
    color: 0xffd8a4,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  }));
  for (let index = 0; index < 3; index += 1) {
    const beam = new THREE.Mesh(targetRuntime.geometry(new THREE.PlaneGeometry(1.15, 12)), sunlightMaterial);
    beam.rotation.set(-Math.PI / 2, 0, -0.24);
    beam.position.set(-3.2 + index * 2.1, -1.32, -0.2 + index * 0.34);
    room.add(beam);
  }
  targetRuntime.scene.add(room);
}

function addLighting(targetRuntime: ReturnType<typeof createGeneratedThreeRuntime>): void {
  const hemisphere = new THREE.HemisphereLight(0xfff7e7, 0x8b7867, quality === 'low' ? 2.1 : 2.45);
  targetRuntime.scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffdfb6, quality === 'low' ? 2.7 : 3.75);
  sun.position.set(-6, 9, 7);
  sun.castShadow = quality !== 'low';
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.00022;
  targetRuntime.scene.add(sun);
  const edge = new THREE.DirectionalLight(0x7fa5ff, 1.45);
  edge.position.set(7, 3.5, -4);
  targetRuntime.scene.add(edge);
  const front = new THREE.PointLight(0xffb786, 1.1, 15, 2);
  front.position.set(4, 2.5, 6);
  targetRuntime.scene.add(front);
}

function cameraProfile(targetMode: AssemblyMode): { position: THREE.Vector3; target: THREE.Vector3 } {
  const mobile = innerWidth <= 720;
  if (mobile) {
    if (targetMode === 'wall') return { position: new THREE.Vector3(4.2, 2.9, 11.8), target: new THREE.Vector3(0, 0.25, 0) };
    if (targetMode === 'split') return { position: new THREE.Vector3(4.1, 2.35, 11.3), target: new THREE.Vector3(0, 0.05, 0) };
    return { position: new THREE.Vector3(3.8, 2.25, 10.6), target: new THREE.Vector3(0, 0.05, 0) };
  }
  if (targetMode === 'wall') return { position: new THREE.Vector3(5.2, 3.1, 11.4), target: new THREE.Vector3(0.3, 0.38, -0.15) };
  if (targetMode === 'split') return { position: new THREE.Vector3(5.3, 2.7, 10.7), target: new THREE.Vector3(0.2, 0.06, 0) };
  return { position: new THREE.Vector3(4.8, 2.5, 10.2), target: new THREE.Vector3(0, 0.06, 0) };
}

function initializeScene(): void {
  if (forcedFallback) {
    enterFallback('已按验证参数停用三维增强；SVG 与语义控制保留同一装配旅程。');
    return;
  }
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: innerWidth <= 720 ? 38 : 35, near: 0.1, far: 80 },
      clearColor: 0xf4ecdf,
      clearAlpha: 0,
      toneMappingExposure: 1.04,
      maxDpr: quality === 'high' ? 1.9 : 1.5,
      lowQualityMaxDpr: 1,
    });
    runtime.renderer.shadowMap.enabled = quality !== 'low';
    runtime.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    runtime.scene.fog = new THREE.Fog(0xf3e9da, 13, 30);
    createRoom(runtime);
    addLighting(runtime);
    assembly = createSpeakerAssembly(runtime);
    assembly.productRoot.position.set(stageOffsetX, 0, 0);
    runtime.scene.add(assembly.productRoot);

    const profile = cameraProfile(mode);
    runtime.camera.position.copy(profile.position);
    controls = new OrbitControls(runtime.camera, canvas);
    controls.target.copy(profile.target);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 7.4;
    controls.maxDistance = 14.5;
    controls.minPolarAngle = Math.PI * 0.23;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minAzimuthAngle = -0.55;
    controls.maxAzimuthAngle = 0.88;
    controls.addEventListener('start', onOrbitStart);
    controls.addEventListener('end', onOrbitEnd);
    controls.update();
    resizeScene();
    canvas.hidden = false;
    if (fallbackPanel) fallbackPanel.hidden = true;
    lastFrameAt = performance.now();
    frameId = requestAnimationFrame(tick);
  } catch (error) {
    runtime?.dispose();
    runtime = null;
    assembly = null;
    const message = error instanceof Error ? error.message : '未知 WebGL 错误';
    enterFallback(`三维增强未能建立：${message}。语义装配旅程仍可继续。`);
  }
}

function enterFallback(reason: string): void {
  fallback = true;
  canvas.hidden = true;
  if (fallbackPanel) fallbackPanel.hidden = false;
  if (fallbackReason) fallbackReason.textContent = reason;
  updateDomState();
  updateVisualHash();
}

function onOrbitStart(): void {
  orbitInteracting = true;
  cameraFlight = null;
}

function onOrbitEnd(): void {
  orbitInteracting = false;
}

function scheduleCamera(targetMode: AssemblyMode): void {
  if (!runtime || !controls || orbitInteracting) return;
  const profile = cameraProfile(targetMode);
  if (reducedMotion) {
    runtime.camera.position.copy(profile.position);
    controls.target.copy(profile.target);
    controls.update();
    cameraFlight = null;
    return;
  }
  cameraFlight = {
    startedAt: performance.now(),
    duration: 780,
    fromPosition: runtime.camera.position.clone(),
    toPosition: profile.position,
    fromTarget: controls.target.clone(),
    toTarget: profile.target,
  };
}

function updateCamera(now: number): void {
  if (!runtime || !controls || !cameraFlight) return;
  const amount = smoothstep((now - cameraFlight.startedAt) / cameraFlight.duration);
  runtime.camera.position.lerpVectors(cameraFlight.fromPosition, cameraFlight.toPosition, amount);
  controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.toTarget, amount);
  if (amount >= 1) cameraFlight = null;
}

function recalculateModeStops(): void {
  const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const measured: Array<{ mode: AssemblyMode; progress: number; element: HTMLElement | null }> = [];
  let previous = -0.05;
  chapterElements.forEach((chapter) => {
    const chapterMode = chapter.dataset.chapterMode;
    if (!isMode(chapterMode)) return;
    const rect = chapter.getBoundingClientRect();
    const documentTop = scrollY + rect.top;
    const anchor = clamp((documentTop + rect.height * 0.35 - innerHeight * 0.5) / range);
    const progress = clamp(Math.max(previous + 0.035, anchor));
    measured.push({ mode: chapterMode, progress, element: chapter });
    previous = progress;
  });
  if (measured.length > 0) chapterStops = measured;
  MODES.forEach((item) => {
    const first = chapterStops.find((stop) => stop.mode === item);
    if (first) MODE_PROGRESS[item] = first.progress;
  });
}

function activeChapterForProgress(progress: number): { mode: AssemblyMode; progress: number; element: HTMLElement | null } | null {
  if (chapterStops.length === 0) return null;
  let active = chapterStops[0];
  for (let index = 1; index < chapterStops.length; index += 1) {
    const threshold = (chapterStops[index - 1].progress + chapterStops[index].progress) / 2;
    if (progress < threshold) break;
    active = chapterStops[index];
  }
  return active;
}

function modeForProgress(progress: number): AssemblyMode {
  return activeChapterForProgress(progress)?.mode ?? 'horizontal';
}

function nearestStopForMode(targetMode: AssemblyMode): number {
  const candidates = chapterStops.filter((stop) => stop.mode === targetMode);
  if (candidates.length === 0) return MODE_PROGRESS[targetMode];
  return candidates.reduce((closest, candidate) => (
    Math.abs(candidate.progress - scrollProgress) < Math.abs(closest.progress - scrollProgress)
      ? candidate
      : closest
  )).progress;
}

function syncScroll(): void {
  scrollFrameId = 0;
  const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  scrollProgress = clamp(scrollY / range);
  const scrollMode = modeForProgress(scrollProgress);
  if (scrollMode !== mode) setMode(scrollMode, true);
  updateDomState();
  updateVisualHash();
}

function onScroll(): void {
  if (scrollFrameId) return;
  scrollFrameId = requestAnimationFrame(syncScroll);
}

function setMode(nextMode: AssemblyMode, fromScroll = false): void {
  if (nextMode === mode) {
    updateDomState();
    return;
  }
  if (audioState === 'playing') stopPreview(false);
  mode = nextMode;
  scheduleCamera(mode);
  updateDomState();
  updateVisualHash();
  if (!fromScroll) announce(`${MODE_LABELS[mode]}已就位。${MODE_STATUS[mode]}`);
  else announce(`滚动进入${MODE_LABELS[mode]}章节。`);
}

function gotoMode(nextMode: AssemblyMode): ModularRoomSoundSnapshot {
  if (!isMode(nextMode)) return snapshot();
  setMode(nextMode);
  const range = Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const targetProgress = nearestStopForMode(nextMode);
  if (range > 1) {
    scrollTo({ top: targetProgress * range, behavior: reducedMotion ? 'auto' : 'smooth' });
  } else {
    scrollProgress = targetProgress;
    updateDomState();
  }
  return snapshot();
}

function toggleCutaway(): ModularRoomSoundSnapshot {
  cutaway = !cutaway;
  updateDomState();
  updateVisualHash();
  announce(cutaway
    ? '前盖已移开；驱动单元、低音腔、触点、挂扣与概念声路可见。'
    : '前盖已归位；内部结构仍保留在同一装配树中。');
  return snapshot();
}

function addTone(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  nodes: AudioNode[],
  options: {
    start: number;
    duration: number;
    frequency: number;
    endFrequency?: number;
    gain: number;
    pan: number;
    type: OscillatorType;
  },
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  oscillator.type = options.type;
  oscillator.frequency.setValueAtTime(options.frequency, options.start);
  if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, options.start + options.duration);
  envelope.gain.setValueAtTime(0.0001, options.start);
  envelope.gain.exponentialRampToValueAtTime(options.gain, options.start + Math.min(0.045, options.duration * 0.2));
  envelope.gain.exponentialRampToValueAtTime(0.0001, options.start + options.duration);
  panner.pan.setValueAtTime(options.pan, options.start);
  oscillator.connect(envelope).connect(panner).connect(destination);
  oscillator.start(options.start);
  oscillator.stop(options.start + options.duration + 0.03);
  sources.push(oscillator);
  nodes.push(oscillator, envelope, panner);
}

function addAir(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  nodes: AudioNode[],
  start: number,
  duration: number,
  frequency: number,
  pan: number,
): void {
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 142;
  for (let index = 0; index < data.length; index += 1) {
    seed = (seed * 48271) % 2147483647;
    data[index] = (seed / 2147483647 * 2 - 1) * (1 - index / data.length);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.1;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(0.085, start + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  panner.pan.value = pan;
  source.connect(filter).connect(envelope).connect(panner).connect(destination);
  source.start(start);
  source.stop(start + duration + 0.02);
  sources.push(source);
  nodes.push(source, filter, envelope, panner);
}

function schedulePreview(context: AudioContext, targetMode: AssemblyMode): ActivePreview {
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [];
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = 0.19;
  compressor.threshold.value = -16;
  compressor.knee.value = 9;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.2;
  master.connect(compressor).connect(context.destination);
  nodes.push(master, compressor);
  const start = context.currentTime + 0.035;
  let duration = 3.25;

  if (targetMode === 'horizontal') {
    duration = 3.15;
    [0, 0.78, 1.56, 2.34].forEach((offset, index) => {
      addTone(context, master, sources, nodes, {
        start: start + offset,
        duration: 0.68,
        frequency: index % 2 === 0 ? 92 : 116,
        endFrequency: index % 2 === 0 ? 101 : 123,
        gain: 0.36,
        pan: 0,
        type: 'sine',
      });
      addTone(context, master, sources, nodes, {
        start: start + offset + 0.02,
        duration: 0.58,
        frequency: index % 2 === 0 ? 184 : 232,
        gain: 0.11,
        pan: 0,
        type: 'triangle',
      });
    });
    addAir(context, master, sources, nodes, start, 2.95, 520, 0);
  } else if (targetMode === 'split') {
    duration = 3.45;
    [0, 0.42, 0.94, 1.36, 1.92, 2.34, 2.86].forEach((offset, index) => {
      const left = index % 2 === 0;
      addTone(context, master, sources, nodes, {
        start: start + offset,
        duration: 0.36,
        frequency: left ? 132 : 176,
        endFrequency: left ? 148 : 158,
        gain: 0.24,
        pan: left ? -0.78 : 0.78,
        type: left ? 'triangle' : 'sine',
      });
    });
    addAir(context, master, sources, nodes, start + 0.08, 3.05, 890, -0.38);
    addAir(context, master, sources, nodes, start + 0.25, 2.9, 1240, 0.42);
  } else {
    duration = 3.75;
    [0, 0.58, 1.16, 1.74, 2.32, 2.9].forEach((offset, index) => {
      addTone(context, master, sources, nodes, {
        start: start + offset,
        duration: 0.76,
        frequency: 154 + index * 22,
        endFrequency: 218 + index * 31,
        gain: 0.19,
        pan: -0.52 + index * 0.2,
        type: 'sine',
      });
    });
    addAir(context, master, sources, nodes, start, 3.55, 1780, 0.16);
  }

  previewVersion += 1;
  const version = previewVersion;
  const timer = window.setTimeout(() => {
    if (!activePreview || activePreview.version !== version) return;
    stopPreview(true);
  }, Math.ceil((duration + 0.16) * 1000));
  return { sources, nodes, timer, version };
}

function stopPreview(announceStop: boolean): void {
  previewVersion += 1;
  if (activePreview) {
    clearTimeout(activePreview.timer);
    activePreview.sources.forEach((source) => {
      try { source.stop(); } catch { /* Already ended. */ }
    });
    activePreview.nodes.forEach((node) => {
      try { node.disconnect(); } catch { /* Already disconnected. */ }
    });
    activePreview = null;
  }
  if (audioState !== 'unavailable') audioState = 'stopped';
  updateDomState();
  updateVisualHash();
  if (announceStop) announce('概念试听已停止。');
}

async function playPreview(): Promise<ModularRoomSoundSnapshot> {
  if (audioState === 'playing') {
    stopPreview(true);
    return snapshot();
  }
  if (forcedAudioFallback) {
    audioState = 'unavailable';
    updateDomState();
    announce('音频增强已按验证参数停用；空间装配与主要行动不受影响。');
    return snapshot();
  }
  try {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) throw new Error('AudioContext unavailable');
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === 'suspended') await audioContext.resume();
    if (audioContext.state !== 'running') throw new Error(`AudioContext state: ${audioContext.state}`);
    activePreview = schedulePreview(audioContext, mode);
    audioState = 'playing';
    updateDomState();
    updateVisualHash();
    announce(`${MODE_LABELS[mode]}概念试听已开始；这是程序化提示片，不是声学测量。`);
  } catch {
    audioState = 'unavailable';
    if (activePreview) stopPreview(false);
    updateDomState();
    announce('浏览器没有允许音频增强；装配、剖视、保存与预约仍可继续。');
  }
  return snapshot();
}

function saveCurrent(): ModularRoomSoundSnapshot {
  saved = true;
  persistState();
  updateDomState();
  updateVisualHash();
  announce(`${MODE_LABELS[mode]}方案已保存在本机页面状态。`);
  return snapshot();
}

function bookListening(): ModularRoomSoundSnapshot {
  booked = true;
  persistState();
  updateDomState();
  updateVisualHash();
  announce('试听预约意向已记录；这是概念页面状态，不会向外部服务发送资料。');
  return snapshot();
}

function saveAndBook(): ModularRoomSoundSnapshot {
  saved = true;
  booked = true;
  persistState();
  updateDomState();
  updateVisualHash();
  announce(`${MODE_LABELS[mode]}方案已保存，试听预约意向也已记录在本页。`);
  return snapshot();
}

function onModeClick(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement) || !isMode(target.dataset.mode)) return;
  event.preventDefault();
  gotoMode(target.dataset.mode);
}

function onCutawayClick(event: Event): void {
  event.preventDefault();
  toggleCutaway();
}

function onListenClick(event: Event): void {
  event.preventDefault();
  void playPreview();
}

function onSaveClick(event: Event): void {
  event.preventDefault();
  saveCurrent();
}

function onBookClick(event: Event): void {
  event.preventDefault();
  bookListening();
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) return;
  const currentIndex = MODES.indexOf(mode);
  let nextMode: AssemblyMode | null = null;
  if (event.key === '1') nextMode = 'horizontal';
  else if (event.key === '2') nextMode = 'split';
  else if (event.key === '3') nextMode = 'wall';
  else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextMode = MODES[Math.min(MODES.length - 1, currentIndex + 1)];
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextMode = MODES[Math.max(0, currentIndex - 1)];
  if (nextMode) {
    event.preventDefault();
    gotoMode(nextMode);
    return;
  }
  if (event.key.toLowerCase() === 'c') {
    event.preventDefault();
    toggleCutaway();
  } else if (event.key.toLowerCase() === 'l' && !event.repeat) {
    event.preventDefault();
    void playPreview();
  } else if (event.key === 'Escape' && audioState === 'playing') {
    event.preventDefault();
    stopPreview(true);
  }
}

function resizeScene(): void {
  stageOffsetX = innerWidth <= 720 ? 0 : 1.32;
  recalculateModeStops();
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  if (assembly) assembly.productRoot.position.x = stageOffsetX;
  if (!orbitInteracting) {
    const profile = cameraProfile(mode);
    runtime.camera.position.copy(profile.position);
    controls?.target.copy(profile.target);
    controls?.update();
  }
  updateAssembly(1, performance.now() / 1000);
  runtime.render();
  drawCalls = runtime.renderer.info.render.calls;
  triangles = runtime.renderer.info.render.triangles;
  updateVisualHash();
}

function onResize(): void {
  if (layoutFrameId) cancelAnimationFrame(layoutFrameId);
  layoutFrameId = requestAnimationFrame(() => {
    layoutFrameId = 0;
    resizeScene();
    syncScroll();
  });
}

function onContextLost(event: Event): void {
  event.preventDefault();
  contextLost = true;
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  controls && (controls.enabled = false);
  enterFallback('WebGL 上下文已中断；已切换到同状态 SVG，音频与主要行动保持独立。');
  announce('三维增强已暂停；仍可切换装配、试听、保存并记录预约。');
}

function onContextRestored(): void {
  contextLost = true;
  enterFallback('WebGL 上下文曾中断；本次不静默重建场景，请刷新后重新进入三维增强。');
}

function tick(now: number): void {
  if (disposed || fallback || !runtime) return;
  const delta = Math.min(0.05, Math.max(0.001, (now - lastFrameAt) / 1000));
  lastFrameAt = now;
  updateCamera(now);
  updateAssembly(delta, now / 1000);
  controls?.update();
  runtime.render();
  frames += 1;
  drawCalls = runtime.renderer.info.render.calls;
  triangles = runtime.renderer.info.render.triangles;
  updateVisualHash();
  frameId = requestAnimationFrame(tick);
}

function poseWorldPosition(definition: TransformDefinition, local = new THREE.Vector3()): THREE.Vector3 {
  return local.clone()
    .applyQuaternion(quaternionFor(definition))
    .add(new THREE.Vector3(...definition.position))
    .add(new THREE.Vector3(stageOffsetX, 0, 0));
}

function objectWorldPosition(object: THREE.Object3D | null, fallbackPosition: THREE.Vector3): PositionTuple {
  if (!object || !assembly || fallback) return tuple(fallbackPosition);
  assembly.productRoot.updateMatrixWorld(true);
  return tuple(object.getWorldPosition(new THREE.Vector3()));
}

function objectWorldPoint(
  object: THREE.Object3D | null,
  localPoint: THREE.Vector3,
  fallbackPosition: THREE.Vector3,
): PositionTuple {
  if (!object || !assembly || fallback) return tuple(fallbackPosition);
  assembly.productRoot.updateMatrixWorld(true);
  return tuple(object.localToWorld(localPoint.clone()));
}

function collectPartPositions(): Record<string, PositionTuple> {
  const pose = POSES[mode];
  const leftPosition = poseWorldPosition(pose.left);
  const rightPosition = poseWorldPosition(pose.right);
  const bridgePosition = poseWorldPosition(pose.bridge);
  const leftContactPosition = poseWorldPosition(pose.left, new THREE.Vector3(0.94, 0, 0.05));
  const rightContactPosition = poseWorldPosition(pose.right, new THREE.Vector3(-0.94, 0, 0.05));
  const leftHookPosition = poseWorldPosition(pose.left, new THREE.Vector3(0, 0.63, -0.68));
  const rightHookPosition = poseWorldPosition(pose.right, new THREE.Vector3(0, 0.63, -0.68));
  const coverFallback = new THREE.Vector3(stageOffsetX, 0, 0).add(cutaway ? COVER_OPEN_POSITION : new THREE.Vector3());
  return {
    productRoot: objectWorldPosition(assembly?.productRoot ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
    leftModule: objectWorldPosition(assembly?.leftModule ?? null, leftPosition),
    rightModule: objectWorldPosition(assembly?.rightModule ?? null, rightPosition),
    bridge: objectWorldPosition(assembly?.bridge ?? null, bridgePosition),
    drivers: objectWorldPosition(assembly?.drivers ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
    bassChamber: objectWorldPosition(assembly?.bassChamber ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
    leftContact: objectWorldPoint(assembly?.leftContacts ?? null, new THREE.Vector3(0.94, 0, 0.05), leftContactPosition),
    rightContact: objectWorldPoint(assembly?.rightContacts ?? null, new THREE.Vector3(-0.94, 0, 0.05), rightContactPosition),
    contacts: objectWorldPosition(assembly?.contacts ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
    leftHook: objectWorldPoint(assembly?.leftHook ?? null, new THREE.Vector3(0, 0.63, -0.68), leftHookPosition),
    rightHook: objectWorldPoint(assembly?.rightHook ?? null, new THREE.Vector3(0, 0.63, -0.68), rightHookPosition),
    wallHooks: objectWorldPosition(assembly?.wallHooks ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
    frontCover: objectWorldPosition(assembly?.frontCover ?? null, coverFallback),
    soundRoute: objectWorldPosition(assembly?.soundRoute ?? null, new THREE.Vector3(stageOffsetX, 0, 0)),
  };
}

function snapshot(): ModularRoomSoundSnapshot {
  updateVisualHash();
  const profile = cameraProfile(mode);
  const cameraPosition = !fallback && runtime ? runtime.camera.position.clone() : profile.position;
  const cameraTarget = !fallback && controls ? controls.target.clone() : profile.target;
  const effectiveCoverOffset = !fallback && assembly ? coverOffset : cutaway ? COVER_OPEN_POSITION.length() : 0;
  return {
    ready,
    mode,
    progress: round(scrollProgress, 4),
    cutaway,
    playing: audioState === 'playing',
    audioState,
    saved,
    booked,
    fallback,
    reducedMotion,
    quality,
    revision,
    frames: fallback ? 0 : frames,
    drawCalls: fallback ? 0 : drawCalls,
    triangles: fallback ? 0 : triangles,
    pixelRatio: fallback || !runtime ? 0 : round(runtime.renderer.getPixelRatio(), 2),
    camera: {
      position: tuple(cameraPosition),
      target: tuple(cameraTarget),
      distance: round(cameraPosition.distanceTo(cameraTarget)),
    },
    partPositions: collectPartPositions(),
    coverOffset: round(effectiveCoverOffset),
    hooksVisible: hooksAreVisible(),
    routeVisible: routeIsVisible(),
    canvasVisualHash,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  };
}

function bindControls(): void {
  modeButtons.forEach((button) => button.addEventListener('click', onModeClick));
  cutawayButtons.forEach((button) => button.addEventListener('click', onCutawayClick));
  listenButtons.forEach((button) => button.addEventListener('click', onListenClick));
  saveButtons.forEach((button) => button.addEventListener('click', onSaveClick));
  bookButtons.forEach((button) => button.addEventListener('click', onBookClick));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  addEventListener('keydown', onKeydown);
  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  if (frameId) cancelAnimationFrame(frameId);
  if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
  if (layoutFrameId) cancelAnimationFrame(layoutFrameId);
  removeEventListener('scroll', onScroll);
  removeEventListener('resize', onResize);
  removeEventListener('keydown', onKeydown);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  canvas.removeEventListener('webglcontextrestored', onContextRestored);
  modeButtons.forEach((button) => button.removeEventListener('click', onModeClick));
  cutawayButtons.forEach((button) => button.removeEventListener('click', onCutawayClick));
  listenButtons.forEach((button) => button.removeEventListener('click', onListenClick));
  saveButtons.forEach((button) => button.removeEventListener('click', onSaveClick));
  bookButtons.forEach((button) => button.removeEventListener('click', onBookClick));
  if (controls) {
    controls.removeEventListener('start', onOrbitStart);
    controls.removeEventListener('end', onOrbitEnd);
    controls.dispose();
    controls = null;
  }
  stopPreview(false);
  if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  audioContext = null;
  runtime?.dispose();
  runtime = null;
  assembly = null;
  delete (window as Partial<Window>).__MODULAR_ROOM_SOUND__;
}

readPersistedState();
bindControls();
recalculateModeStops();
syncScroll();
updateDomState();

window.__MODULAR_ROOM_SOUND__ = {
  snapshot,
  goto: gotoMode,
  toggleCutaway,
  playPreview,
  saveAndBook,
};

initializeScene();
ready = true;
updateDomState();
updateVisualHash();
layoutFrameId = requestAnimationFrame(() => {
  layoutFrameId = 0;
  recalculateModeStops();
  syncScroll();
});
addEventListener('pagehide', dispose, { once: true });

export {};
