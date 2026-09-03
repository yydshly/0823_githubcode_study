import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

type ButterflyId = 'mulberry' | 'glassine' | 'recycled' | 'gold' | 'indigo' | 'vellum';
type ExperiencePhase = 'opening' | 'exploring' | 'selected' | 'joined';

interface ButterflyProfile {
  id: ButterflyId;
  index: string;
  name: string;
  material: string;
  light: string;
  kicker: string;
  story: string;
  color: number;
  edgeColor: number;
  opacity: number;
  roughness: number;
  clearcoat: number;
  texture: 'fiber' | 'grid' | 'fleck' | 'wash' | 'plain';
  base: readonly [number, number, number];
  turn: number;
}

interface ButterflyRig {
  profile: ButterflyProfile;
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  wingMaterial: THREE.MeshPhysicalMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
  base: THREE.Vector3;
  target: THREE.Vector3;
  phaseOffset: number;
}

interface PaperButterflySnapshot {
  ready: boolean;
  phase: ExperiencePhase;
  selectedId: ButterflyId | null;
  joined: boolean;
  pointer: { x: number; y: number; active: boolean };
  formationAmount: number;
  openingProgress: number;
  objectCount: number;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  reducedMotion: boolean;
  environmentLoaded: boolean;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
  visualRevision: string;
}

declare global {
  interface Window {
    __paperButterflyGarden: {
      snapshot(): PaperButterflySnapshot;
      select(id: ButterflyId): void;
      join(): void;
      setPointer(x: number, y: number): void;
    };
  }
}

const profiles: readonly ButterflyProfile[] = [
  {
    id: 'mulberry', index: '01', name: '桑皮纸蝶', material: '手抄桑皮纸', light: '温暖漫透', kicker: '纤维留下手的方向',
    story: '长纤维没有被藏起来。它们沿着折线相互牵住，让薄纸在晨风里仍保留一段柔韧的骨架。',
    color: 0xd97457, edgeColor: 0x6d3d31, opacity: .95, roughness: .78, clearcoat: .05, texture: 'fiber', base: [-2.05, 1.14, .18], turn: -.12,
  },
  {
    id: 'glassine', index: '02', name: '格拉辛纸蝶', material: '半透明格拉辛纸', light: '清亮透射', kicker: '让光先穿过去',
    story: '密实纸面接住温室顶棚的白光，只留下一点乳白反射。转身时，城市轮廓会短暂从翅面浮现。',
    color: 0xe8efd5, edgeColor: 0x71806d, opacity: .72, roughness: .22, clearcoat: .36, texture: 'grid', base: [-.28, 1.68, -.42], turn: .14,
  },
  {
    id: 'recycled', index: '03', name: '再生纸蝶', material: '旧票据再生纸', light: '颗粒散射', kicker: '旧字变成新的斑点',
    story: '被打碎的票根不再说明日期，只留下深浅不一的纸粒。靠近时，细小字痕像一座被折叠的花园。',
    color: 0xb99b68, edgeColor: 0x66553b, opacity: .94, roughness: .88, clearcoat: .02, texture: 'fleck', base: [1.58, 1.05, .08], turn: -.2,
  },
  {
    id: 'gold', index: '04', name: '金纤维纸蝶', material: '麻纸与金色纤维', light: '点状闪烁', kicker: '把阳光缝进纸里',
    story: '几缕金色纤维被压进柔软麻纸。它不会整片发亮，只在翅膀改变角度时回应一次日光。',
    color: 0xe2b453, edgeColor: 0x74552a, opacity: .93, roughness: .64, clearcoat: .28, texture: 'fleck', base: [-1.12, -.12, .52], turn: .1,
  },
  {
    id: 'indigo', index: '05', name: '靛蓝宣纸蝶', material: '靛蓝渗染宣纸', light: '边缘吸光', kicker: '颜色沿水走过',
    story: '靛蓝从折痕向外渗开，深处像夜，薄处仍透出叶片的绿色。它记录的不是图案，而是水停下的位置。',
    color: 0x415c6d, edgeColor: 0x233844, opacity: .93, roughness: .72, clearcoat: .08, texture: 'wash', base: [.7, -.5, -.08], turn: -.08,
  },
  {
    id: 'vellum', index: '06', name: '硫酸纸蝶', material: '雾面硫酸纸', light: '柔雾轮廓', kicker: '看见背后的叶脉',
    story: '雾面纸没有遮住温室，只把远处叶片变成一层柔软影子。两片翅膀合拢时，轮廓才重新清晰。',
    color: 0xeee0c2, edgeColor: 0x756e5c, opacity: .68, roughness: .42, clearcoat: .12, texture: 'plain', base: [2.42, -.2, .3], turn: .18,
  },
] as const;

const joinFormation: readonly (readonly [number, number, number])[] = [
  [-1.22, .68, .58], [-.52, 1.18, .32], [.22, .88, .72], [.87, .3, .44], [.24, -.22, .68], [-.58, -.08, .42],
];

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Paper Butterfly Garden is missing ${selector}`);
  return element;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function isButterflyId(value: string): value is ButterflyId {
  return profiles.some((profile) => profile.id === value);
}

const root = required<HTMLDivElement>('#app');
const canvas = required<HTMLCanvasElement>('.butterfly-canvas');
const environmentPlate = required<HTMLImageElement>('.environment-plate');
const fallbackMessage = required<HTMLDivElement>('[data-fallback-message]');
const liveStatus = required<HTMLParagraphElement>('[data-live-status]');
const sheetIndex = required<HTMLSpanElement>('[data-sheet-index]');
const sheetState = required<HTMLSpanElement>('[data-sheet-state]');
const sheetKicker = required<HTMLParagraphElement>('[data-sheet-kicker]');
const sheetTitle = required<HTMLHeadingElement>('[data-sheet-title]');
const sheetStory = required<HTMLParagraphElement>('[data-sheet-story]');
const sheetMaterial = required<HTMLElement>('[data-sheet-material]');
const sheetLight = required<HTMLElement>('[data-sheet-light]');
const joinButton = required<HTMLButtonElement>('[data-join]');
const joinLabel = required<HTMLSpanElement>('[data-join-label]');
const markerButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-butterfly-id]'));

const params = new URLSearchParams(location.search);
const qualityValue = params.get('quality');
const quality: GeneratedQuality = qualityValue === 'high' || qualityValue === 'low' ? qualityValue : 'balanced';
const motionValue = params.get('motion');
const reducedMotion = motionValue === 'full' ? false : motionValue === 'reduced' ? true : matchMedia('(prefers-reduced-motion: reduce)').matches;
const forcedFallback = params.get('fallback') === '1' || params.get('fallback') === 'true';
const visualRevision = params.get('revision') ?? 'r120-paper-butterfly-garden';

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let frameId = 0;
let disposed = false;
let ready = false;
let fallback = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let phase: ExperiencePhase = 'opening';
let selectedId: ButterflyId | null = null;
let joined = false;
let openingProgress = reducedMotion ? 1 : 0;
let formationAmount = 0;
let environmentLoaded = environmentPlate.complete && environmentPlate.naturalWidth > 0;
let environmentFailed = false;
const startedAt = performance.now();
let lastFrameAt = startedAt;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
const rigs: ButterflyRig[] = [];

function markEnvironmentLoaded(): void {
  environmentLoaded = true;
  root.dataset.environmentLoaded = 'true';
}

function markEnvironmentFailed(): void {
  environmentFailed = true;
  root.dataset.environmentLoaded = 'false';
}

if (environmentLoaded) markEnvironmentLoaded();
environmentPlate.addEventListener('load', markEnvironmentLoaded, { once: true });
environmentPlate.addEventListener('error', markEnvironmentFailed, { once: true });

function makePaperTexture(profile: ButterflyProfile, seed: number): THREE.CanvasTexture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(textureCanvas);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, 128, 128);
  let value = seed * 1973 + 17;
  const random = (): number => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };

  if (profile.texture === 'fiber') {
    context.strokeStyle = 'rgba(74,55,36,.22)';
    context.lineWidth = .65;
    for (let index = 0; index < 58; index += 1) {
      const y = random() * 128;
      context.beginPath();
      context.moveTo(-8, y);
      context.bezierCurveTo(34, y + random() * 9 - 4.5, 82, y + random() * 8 - 4, 136, y + random() * 7 - 3.5);
      context.stroke();
    }
  } else if (profile.texture === 'grid') {
    context.strokeStyle = 'rgba(78,92,73,.12)';
    context.lineWidth = .5;
    for (let position = 4; position < 128; position += 7) {
      context.beginPath(); context.moveTo(position, 0); context.lineTo(position, 128); context.stroke();
      context.beginPath(); context.moveTo(0, position); context.lineTo(128, position); context.stroke();
    }
  } else if (profile.texture === 'fleck') {
    for (let index = 0; index < 110; index += 1) {
      const light = random() > .75;
      context.fillStyle = light ? 'rgba(241,194,82,.6)' : 'rgba(65,52,34,.18)';
      const size = .5 + random() * 2;
      context.fillRect(random() * 128, random() * 128, size, size * (.7 + random()));
    }
  } else if (profile.texture === 'wash') {
    const gradient = context.createRadialGradient(36, 38, 4, 64, 64, 88);
    gradient.addColorStop(0, 'rgba(20,41,59,.5)');
    gradient.addColorStop(.56, 'rgba(69,91,105,.18)');
    gradient.addColorStop(1, 'rgba(230,235,219,.06)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  } else {
    context.fillStyle = 'rgba(91,80,61,.06)';
    for (let index = 0; index < 44; index += 1) context.fillRect(random() * 128, random() * 128, 1, 1);
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1.3);
  return texture;
}

function makeWingGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(.03, .1);
  shape.bezierCurveTo(.16, .76, .87, 1.04, 1.28, .56);
  shape.bezierCurveTo(1.47, .33, 1.06, .08, .67, -.05);
  shape.bezierCurveTo(1.15, -.2, 1.13, -.74, .57, -.77);
  shape.bezierCurveTo(.18, -.73, .02, -.3, .03, .1);
  return new THREE.ShapeGeometry(shape, 14);
}

function makeVeinGeometry(): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(.08, .08, .025), new THREE.Vector3(1.08, .52, .025),
    new THREE.Vector3(.11, .04, .025), new THREE.Vector3(.72, -.58, .025),
    new THREE.Vector3(.42, .22, .025), new THREE.Vector3(.88, .02, .025),
  ]);
}

function createButterfly(profile: ButterflyProfile, index: number, wingGeometry: THREE.ShapeGeometry, edgeGeometry: THREE.EdgesGeometry, veinGeometry: THREE.BufferGeometry): ButterflyRig {
  if (!runtime) throw new Error('Paper butterfly runtime is required before scene objects are created.');
  const paperTexture = runtime.texture(makePaperTexture(profile, index + 1));
  const wingMaterial = runtime.material(new THREE.MeshPhysicalMaterial({
    color: profile.color,
    map: paperTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: profile.opacity,
    roughness: profile.roughness,
    metalness: profile.id === 'gold' ? .08 : 0,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: .52,
    depthWrite: profile.opacity > .8,
  }));
  const edgeMaterial = runtime.material(new THREE.LineBasicMaterial({ color: profile.edgeColor, transparent: true, opacity: .55, depthWrite: false }));
  const veinMaterial = runtime.material(new THREE.LineBasicMaterial({ color: profile.edgeColor, transparent: true, opacity: profile.id === 'glassine' ? .18 : .31, depthWrite: false }));
  const bodyMaterial = runtime.material(new THREE.MeshPhysicalMaterial({ color: profile.edgeColor, roughness: .68, clearcoat: .1 }));
  const group = new THREE.Group();
  const leftWing = new THREE.Group();
  const rightWing = new THREE.Group();

  const leftPaper = new THREE.Mesh(wingGeometry, wingMaterial);
  const leftEdge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  const leftVeins = new THREE.LineSegments(veinGeometry, veinMaterial);
  leftWing.scale.x = -1;
  leftWing.add(leftPaper, leftEdge, leftVeins);

  const rightPaper = new THREE.Mesh(wingGeometry, wingMaterial);
  const rightEdge = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  const rightVeins = new THREE.LineSegments(veinGeometry, veinMaterial);
  rightWing.add(rightPaper, rightEdge, rightVeins);
  group.add(leftWing, rightWing);

  const body = new THREE.Mesh(runtime.geometry(new THREE.CapsuleGeometry(.055, .63, 5, 10)), bodyMaterial);
  body.position.y = -.02;
  body.position.z = .08;
  group.add(body);

  const antennaGeometry = runtime.geometry(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.025, .62, .08), new THREE.Vector3(-.25, .94, .04),
    new THREE.Vector3(.025, .62, .08), new THREE.Vector3(.25, .94, .04),
  ]));
  const antennaMaterial = runtime.material(new THREE.LineBasicMaterial({ color: profile.edgeColor, transparent: true, opacity: .68 }));
  group.add(new THREE.LineSegments(antennaGeometry, antennaMaterial));

  const base = new THREE.Vector3(...profile.base);
  group.position.copy(base);
  group.rotation.z = profile.turn;
  group.scale.setScalar(reducedMotion ? .7 : .06);
  runtime.scene.add(group);
  return { profile, group, leftWing, rightWing, wingMaterial, edgeMaterial, base, target: base.clone(), phaseOffset: index * .93 + .3 };
}

function useFallback(message = '3D 纸蝶暂不可用，已保留完整的语义互动'): void {
  fallback = true;
  document.documentElement.dataset.fallback = 'true';
  fallbackMessage.hidden = false;
  const strong = fallbackMessage.querySelector('strong');
  if (strong) strong.textContent = message;
  if (phase === 'opening') phase = 'exploring';
  openingProgress = 1;
  root.dataset.phase = phase;
  root.dataset.paperButterflyReady = 'true';
  ready = true;
}

function initializeScene(): void {
  if (forcedFallback) {
    useFallback('基础纸蝶游园已按请求启用');
    return;
  }
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 39, near: .1, far: 60 },
      clearColor: 0xffffff,
      clearAlpha: 0,
      toneMappingExposure: 1.13,
      maxDpr: 2,
      lowQualityMaxDpr: 1,
    });
    runtime.camera.position.set(0, .18, 9.4);
    runtime.camera.lookAt(.18, .3, 0);
    runtime.scene.add(new THREE.HemisphereLight(0xfff6d4, 0x314c38, 2.35));
    const sun = new THREE.DirectionalLight(0xffdfa1, 4.1);
    sun.position.set(5.5, 8, 7);
    runtime.scene.add(sun);
    const leafBounce = new THREE.DirectionalLight(0x8bb487, 1.3);
    leafBounce.position.set(-5, -1, 3);
    runtime.scene.add(leafBounce);

    const wingGeometry = runtime.geometry(makeWingGeometry());
    const edgeGeometry = runtime.geometry(new THREE.EdgesGeometry(wingGeometry, 22));
    const veinGeometry = runtime.geometry(makeVeinGeometry());
    profiles.forEach((profile, index) => rigs.push(createButterfly(profile, index, wingGeometry, edgeGeometry, veinGeometry)));
  } catch (error) {
    console.warn('Paper Butterfly Garden WebGL scene unavailable; using semantic fallback.', error);
    runtime?.dispose();
    runtime = null;
    useFallback();
  }
}

function resize(): void {
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  const mobile = innerWidth <= 820;
  runtime.camera.position.z = mobile ? 11.6 : 9.4;
  runtime.camera.position.y = mobile ? .36 : .18;
  runtime.camera.lookAt(mobile ? .1 : .18, mobile ? .18 : .3, 0);
  rigs.forEach((rig) => {
    if (mobile) {
      const mobileBases: Record<ButterflyId, readonly [number, number, number]> = {
        mulberry: [-2.05, 1.05, .18], glassine: [-.2, 1.6, -.42], recycled: [1.9, .95, .08],
        gold: [-1.25, -.1, .52], indigo: [.7, -.45, -.08], vellum: [2.55, -.12, .3],
      };
      rig.base.set(...mobileBases[rig.profile.id]);
    } else {
      rig.base.set(...rig.profile.base);
    }
  });
}

function profileFor(id: ButterflyId): ButterflyProfile {
  const profile = profiles.find((candidate) => candidate.id === id);
  if (!profile) throw new Error(`Unknown paper butterfly ${id}`);
  return profile;
}

function updateSheet(): void {
  markerButtons.forEach((button) => {
    const id = button.dataset.butterflyId;
    button.setAttribute('aria-pressed', String(id === selectedId));
  });
  if (!selectedId) {
    sheetIndex.textContent = '00 / 06';
    sheetState.textContent = '等待一阵风';
    sheetKicker.textContent = '晨光档案';
    sheetTitle.textContent = '先靠近一只纸蝶';
    sheetStory.textContent = '指针会改变六只纸蝶之间的距离；触摸、Tab 或方向键也可以逐只探索。';
    sheetMaterial.textContent = '六种概念纸材';
    sheetLight.textContent = '随晨光变化';
    joinButton.disabled = true;
    joinLabel.textContent = '选择后加入游园';
    return;
  }
  const profile = profileFor(selectedId);
  sheetIndex.textContent = `${profile.index} / 06`;
  sheetState.textContent = joined ? '已加入日光游园' : '纸上记忆已展开';
  sheetKicker.textContent = profile.kicker;
  sheetTitle.textContent = profile.name;
  sheetStory.textContent = joined ? `${profile.story} 它已与其余纸蝶形成一段面向晨光的队列。` : profile.story;
  sheetMaterial.textContent = profile.material;
  sheetLight.textContent = profile.light;
  joinButton.disabled = false;
  joinLabel.textContent = joined ? '散开，继续探索' : '让它加入日光游园';
}

function selectButterfly(id: ButterflyId, source: 'pointer' | 'keyboard' | 'api' = 'api'): void {
  selectedId = id;
  joined = false;
  phase = 'selected';
  root.dataset.phase = phase;
  root.dataset.selectedButterfly = id;
  updateSheet();
  const profile = profileFor(id);
  liveStatus.textContent = `${profile.name}已展开。${profile.material}，${profile.light}。`;
  if (source === 'keyboard') markerButtons.find((button) => button.dataset.butterflyId === id)?.focus({ preventScroll: true });
}

function clearSelection(): void {
  selectedId = null;
  joined = false;
  phase = 'exploring';
  root.dataset.phase = phase;
  delete root.dataset.selectedButterfly;
  updateSheet();
  liveStatus.textContent = '已回到六只纸蝶的晨光编队。';
}

function joinSelected(): void {
  if (!selectedId) return;
  joined = true;
  phase = 'joined';
  root.dataset.phase = phase;
  updateSheet();
  liveStatus.textContent = `${profileFor(selectedId).name}已加入日光游园，六只纸蝶正在重新编队。`;
}

function onJoinButtonClick(): void {
  if (joined) {
    clearSelection();
    liveStatus.textContent = '纸蝶已经散开，可以继续探索六种纸材。';
    return;
  }
  joinSelected();
}

function setPointer(x: number, y: number): void {
  if (phase === 'opening') {
    openingProgress = 1;
    phase = 'exploring';
    root.dataset.phase = phase;
  }
  pointer.targetX = clamp(x, -1, 1);
  pointer.targetY = clamp(y, -1, 1);
  pointer.active = true;
}

function onPointerMove(event: PointerEvent): void {
  const x = event.clientX / Math.max(innerWidth, 1) * 2 - 1;
  const y = event.clientY / Math.max(innerHeight, 1) * 2 - 1;
  setPointer(x, y);
}

function onPointerLeave(): void {
  pointer.active = false;
  pointer.targetX = 0;
  pointer.targetY = 0;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    clearSelection();
    return;
  }
  if ((event.key === 'j' || event.key === 'J') && selectedId) {
    joinSelected();
    return;
  }
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
  if (!direction) return;
  event.preventDefault();
  const currentIndex = selectedId ? profiles.findIndex((profile) => profile.id === selectedId) : direction > 0 ? -1 : 0;
  const nextIndex = (currentIndex + direction + profiles.length) % profiles.length;
  selectButterfly(profiles[nextIndex].id, 'keyboard');
}

function onContextLost(event: Event): void {
  event.preventDefault();
  runtime?.dispose();
  runtime = null;
  useFallback('3D 场景已暂停，基础纸蝶游园继续运行');
}

function updateRig(rig: ButterflyRig, elapsed: number, delta: number): void {
  const mobile = innerWidth <= 820;
  const selected = rig.profile.id === selectedId;
  rig.target.copy(rig.base);

  if (joined) {
    const formation = joinFormation[profiles.findIndex((profile) => profile.id === rig.profile.id)];
    rig.target.set(formation[0] + (mobile ? 0 : .22), formation[1] + (mobile ? .08 : .2), formation[2]);
  } else if (selectedId) {
    if (selected) {
      rig.target.set(mobile ? .05 : .32, mobile ? .42 : .38, 1.35);
    } else {
      const away = rig.base.clone().sub(new THREE.Vector3(.15, .32, 0)).normalize().multiplyScalar(mobile ? .26 : .42);
      rig.target.add(away);
      rig.target.z -= .68;
    }
  } else {
    const pointerWorld = new THREE.Vector3(pointer.x * 2.8, -pointer.y * 1.75 + .18, .4);
    const individualPull = .13 + (rig.phaseOffset % 1) * .08;
    rig.target.lerp(pointerWorld, formationAmount * individualPull);
    if (!reducedMotion) {
      rig.target.x += Math.sin(elapsed * .48 + rig.phaseOffset) * .035;
      rig.target.y += Math.cos(elapsed * .42 + rig.phaseOffset) * .045;
    }
  }

  const response = reducedMotion ? 1 : Math.min(1, delta * (joined ? 4.3 : selectedId ? 5.6 : 3.6));
  rig.group.position.lerp(rig.target, response);
  const intro = easeOutCubic(openingProgress);
  const baseScale = mobile ? .66 : .78;
  const phaseScale = joined ? .88 : selected ? 1.12 : selectedId ? .66 : 1;
  const targetScale = intro * baseScale * phaseScale;
  const currentScale = lerp(rig.group.scale.x, targetScale, reducedMotion ? 1 : Math.min(1, delta * 5.5));
  rig.group.scale.setScalar(currentScale);

  const flutter = reducedMotion ? .3 : Math.sin(elapsed * (2.15 + rig.phaseOffset * .12) + rig.phaseOffset) * .28;
  const pointerLift = pointer.active ? Math.abs(pointer.x - rig.base.x / 3) * .07 : 0;
  const fold = joined ? .32 + flutter * .22 : selected ? .18 + flutter * .12 : .38 + flutter + pointerLift;
  rig.leftWing.rotation.y = -fold;
  rig.rightWing.rotation.y = fold;
  rig.group.rotation.z = rig.profile.turn + (joined ? Math.sin(rig.phaseOffset) * .16 : pointer.x * .045) + (reducedMotion ? 0 : Math.sin(elapsed * .36 + rig.phaseOffset) * .025);
  rig.group.rotation.x = selected ? -.08 : pointer.y * .025;

  const targetOpacity = selectedId && !selected ? rig.profile.opacity * .48 : rig.profile.opacity;
  rig.wingMaterial.opacity = lerp(rig.wingMaterial.opacity, targetOpacity, Math.min(1, delta * 6));
  rig.edgeMaterial.opacity = lerp(rig.edgeMaterial.opacity, selectedId && !selected ? .22 : .55, Math.min(1, delta * 6));
}

function tick(now: number): void {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(.001, (now - lastFrameAt) / 1000));
  const elapsed = (now - startedAt) / 1000;
  lastFrameAt = now;
  if (!reducedMotion && openingProgress < 1) openingProgress = clamp(elapsed / 2.25, 0, 1);
  if (openingProgress >= 1 && phase === 'opening') {
    phase = 'exploring';
    root.dataset.phase = phase;
    liveStatus.textContent = '六只纸蝶已经展开，可以移动指针、触摸或使用键盘探索。';
  }
  pointer.x = lerp(pointer.x, pointer.targetX, reducedMotion ? 1 : Math.min(1, delta * 5));
  pointer.y = lerp(pointer.y, pointer.targetY, reducedMotion ? 1 : Math.min(1, delta * 5));
  const formationTarget = joined ? 1 : pointer.active && !selectedId ? .78 : .12;
  formationAmount = lerp(formationAmount, formationTarget, reducedMotion ? 1 : Math.min(1, delta * 3.8));

  if (runtime) {
    rigs.forEach((rig) => updateRig(rig, elapsed, delta));
    runtime.camera.position.x = reducedMotion ? 0 : pointer.x * .08;
    runtime.camera.position.y = (innerWidth <= 820 ? .36 : .18) - (reducedMotion ? 0 : pointer.y * .045);
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
  frames += 1;
  ready = frames > 2 && (environmentLoaded || environmentFailed);
  if (ready) root.dataset.paperButterflyReady = 'true';
  frameId = requestAnimationFrame(tick);
}

function snapshot(): PaperButterflySnapshot {
  return {
    ready,
    phase,
    selectedId,
    joined,
    pointer: { x: Number(pointer.x.toFixed(3)), y: Number(pointer.y.toFixed(3)), active: pointer.active },
    formationAmount: Number(formationAmount.toFixed(3)),
    openingProgress: Number(openingProgress.toFixed(3)),
    objectCount: profiles.length,
    frames: fallback ? 0 : frames,
    drawCalls,
    triangles,
    fallback,
    reducedMotion,
    environmentLoaded,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    quality,
    visualRevision,
  };
}

markerButtons.forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const id = button.dataset.butterflyId;
    if (id && isButterflyId(id)) selectButterfly(id, 'pointer');
  });
});
joinButton.addEventListener('click', onJoinButtonClick);
addEventListener('pointermove', onPointerMove, { passive: true });
addEventListener('pointerdown', onPointerMove, { passive: true });
addEventListener('pointerleave', onPointerLeave);
addEventListener('keydown', onKeydown);
addEventListener('resize', resize, { passive: true });
canvas.addEventListener('webglcontextlost', onContextLost);

initializeScene();
resize();
updateSheet();
window.__paperButterflyGarden = { snapshot, select: (id) => selectButterfly(id, 'api'), join: joinSelected, setPointer };
frameId = requestAnimationFrame(tick);

function dispose(): void {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  removeEventListener('pointermove', onPointerMove);
  removeEventListener('pointerdown', onPointerMove);
  removeEventListener('pointerleave', onPointerLeave);
  removeEventListener('keydown', onKeydown);
  removeEventListener('resize', resize);
  joinButton.removeEventListener('click', onJoinButtonClick);
  environmentPlate.removeEventListener('load', markEnvironmentLoaded);
  environmentPlate.removeEventListener('error', markEnvironmentFailed);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  runtime?.dispose();
  runtime = null;
}

addEventListener('pagehide', dispose, { once: true });
