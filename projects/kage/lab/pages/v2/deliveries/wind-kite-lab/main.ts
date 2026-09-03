import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

type HeroState = 'rising' | 'calibrating' | 'settled';
type FlightMode = 'demo' | 'manual' | 'saved' | 'fallback';

type FlightPose = {
  pitch: number;
  roll: number;
  yaw: number;
  lift: number;
  canopyBow: number;
  tetherSag: number;
  stability: number;
  tension: number;
};

type WindKiteSnapshot = {
  ready: boolean;
  heroProgress: number;
  heroState: HeroState;
  mode: FlightMode;
  windSpeed: number;
  bridleOffset: number;
  altitude: number;
  gust: number;
  pose: FlightPose;
  frames: number;
  drawCalls: number;
  triangles: number;
  fallback: boolean;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
  saved: boolean;
  visualRevision: string;
};

declare global {
  interface Window {
    __windKiteLab?: {
      snapshot: () => WindKiteSnapshot;
      setWindSpeed: (value: number) => void;
      setBridleOffset: (value: number) => void;
      setAltitude: (value: number) => void;
    };
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
const easeOutCubic = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const radians = (degrees: number) => degrees * Math.PI / 180;

const root = document.documentElement;
const shell = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('.kite-canvas');
const windInput = document.querySelector<HTMLInputElement>('#wind-speed');
const bridleInput = document.querySelector<HTMLInputElement>('#bridle-offset');
const altitudeInput = document.querySelector<HTMLInputElement>('#altitude');
const windOutput = document.querySelector<HTMLOutputElement>('[data-wind-output]');
const bridleOutput = document.querySelector<HTMLOutputElement>('[data-bridle-output]');
const altitudeOutput = document.querySelector<HTMLOutputElement>('[data-altitude-output]');
const stabilityNode = document.querySelector<HTMLElement>('[data-stability]');
const tensionNode = document.querySelector<HTMLElement>('[data-tension]');
const flightStateNode = document.querySelector<HTMLElement>('[data-flight-state]');
const saveButton = document.querySelector<HTMLButtonElement>('[data-save]');
const saveStatus = document.querySelector<HTMLElement>('[data-save-status]');
const fallbackMessage = document.querySelector<HTMLElement>('[data-fallback-message]');

if (!shell || !canvas || !windInput || !bridleInput || !altitudeInput || !windOutput || !bridleOutput || !altitudeOutput || !stabilityNode || !tensionNode || !flightStateNode || !saveButton || !saveStatus || !fallbackMessage) {
  throw new Error('WIND ATLAS delivery is missing required synchronized elements.');
}

const params = new URLSearchParams(location.search);
const quality: GeneratedQuality = params.get('quality') === 'high' || params.get('quality') === 'low'
  ? params.get('quality') as GeneratedQuality
  : 'balanced';
const motionMode = params.get('motion');
const reducedMotion = motionMode === 'full'
  ? false
  : motionMode === 'reduce'
    ? true
    : matchMedia('(prefers-reduced-motion: reduce)').matches;

let fallback = params.get('fallback') === '1' || params.get('forceFallback') === '1';
let windSpeed = 22;
let bridleOffset = 0;
let altitude = 65;
let gust = 0;
let gustTarget = 0;
let heroProgress = reducedMotion ? 1 : 0;
let heroState: HeroState = reducedMotion ? 'settled' : 'rising';
let mode: FlightMode = fallback ? 'fallback' : 'demo';
let saved = false;
let ready = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
const visualRevision = params.get('revision') ?? 'working';
let frameId = 0;
let disposed = false;
let startedAt = performance.now();
let lastFrameAt = startedAt;

function derivePose(): FlightPose {
  const gustLoad = Math.abs(gust) * 11;
  const stability = clamp(
    96 - Math.abs(windSpeed - 22) * 2.15 - Math.abs(bridleOffset) * .82 - gustLoad + altitude * .045,
    18,
    99,
  );
  return {
    pitch: clamp((windSpeed - 21) * .62 - (altitude - 65) * .035, -11, 18),
    roll: clamp(bridleOffset * .42 + gust * 9, -24, 24),
    yaw: clamp(bridleOffset * .21 + gust * 5.5, -13, 13),
    lift: clamp(46 + windSpeed * 1.25 + altitude * .12 - Math.abs(bridleOffset) * .3, 35, 98),
    canopyBow: clamp(.08 + windSpeed / 135 + Math.abs(gust) * .055, .1, .38),
    tetherSag: clamp(.47 - windSpeed / 98 + altitude / 540, .13, .48),
    stability,
    tension: clamp(3.8 + windSpeed * windSpeed * .018 + altitude * .024 + Math.abs(bridleOffset) * .035, 4, 38),
  };
}

function flightLabel(pose: FlightPose): string {
  if (mode === 'saved') return '方案已保存';
  if (fallback) return '基础模拟运行中';
  if (mode === 'manual') {
    if (pose.stability >= 82) return '手动调校 · 稳定巡航';
    if (pose.stability >= 58) return '手动调校 · 需要微调';
    return '手动调校 · 侧风偏移';
  }
  if (heroState === 'rising') return '纸鸢正在升起';
  if (heroState === 'calibrating') return '正在寻找平衡';
  if (pose.stability >= 82) return '稳定巡航';
  if (pose.stability >= 58) return '需要微调';
  return '侧风偏移明显';
}

function updateInterface() {
  const pose = derivePose();
  windInput.value = String(Math.round(windSpeed));
  bridleInput.value = String(Math.round(bridleOffset));
  altitudeInput.value = String(Math.round(altitude));
  windOutput.textContent = `${Math.round(windSpeed)} km/h`;
  bridleOutput.textContent = `${bridleOffset > 0 ? '+' : ''}${Math.round(bridleOffset)}%`;
  altitudeOutput.textContent = `${Math.round(altitude)} m*`;
  stabilityNode.textContent = String(Math.round(pose.stability));
  tensionNode.textContent = pose.tension.toFixed(1);
  flightStateNode.textContent = flightLabel(pose);
  root.style.setProperty('--kite-roll', `${pose.roll.toFixed(1)}deg`);
  root.style.setProperty('--kite-rise', `${Math.round((65 - altitude) * .75)}px`);
  root.style.setProperty('--wind-streak', (windSpeed / 22).toFixed(2));
}

function beginManual() {
  if (mode !== 'manual') mode = 'manual';
  saved = false;
  saveStatus.textContent = '正在实时更新纸鸢、尾带、风流与概念结果。';
}

function setWindSpeed(value: number, manual = true) {
  windSpeed = clamp(value, 8, 36);
  if (manual) beginManual();
  updateInterface();
}

function setBridleOffset(value: number, manual = true) {
  bridleOffset = clamp(value, -40, 40);
  if (manual) beginManual();
  updateInterface();
}

function setAltitude(value: number, manual = true) {
  altitude = clamp(value, 20, 120);
  if (manual) beginManual();
  updateInterface();
}

const onWindInput = () => setWindSpeed(Number(windInput.value));
const onBridleInput = () => setBridleOffset(Number(bridleInput.value));
const onAltitudeInput = () => setAltitude(Number(altitudeInput.value));
windInput.addEventListener('input', onWindInput);
bridleInput.addEventListener('input', onBridleInput);
altitudeInput.addEventListener('input', onAltitudeInput);

function onPointer(event: PointerEvent) {
  const normalized = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  gustTarget = normalized;
  if (event.type === 'pointerdown' || Math.abs(normalized - gust) > .16) beginManual();
}

function onPointerLeave() {
  gustTarget = 0;
}

function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  setWindSpeed(windSpeed + clamp(event.deltaY, -120, 120) * .022);
}

function onKeydown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
  if (event.key === 'ArrowUp') {
    event.preventDefault(); setAltitude(altitude + 4);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault(); setAltitude(altitude - 4);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault(); setWindSpeed(windSpeed + 1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault(); setWindSpeed(windSpeed - 1);
  }
}

function onSave() {
  saved = true;
  mode = fallback ? 'fallback' : 'saved';
  const pose = derivePose();
  saveStatus.textContent = `已保存：${Math.round(windSpeed)} km/h · 偏置 ${bridleOffset > 0 ? '+' : ''}${Math.round(bridleOffset)}% · ${Math.round(altitude)} m；概念稳定性 ${Math.round(pose.stability)}。`;
  updateInterface();
}

addEventListener('pointermove', onPointer, { passive: true });
addEventListener('pointerdown', onPointer, { passive: true });
addEventListener('pointerleave', onPointerLeave, { passive: true });
addEventListener('wheel', onWheel, { passive: false });
addEventListener('keydown', onKeydown);
saveButton.addEventListener('click', onSave);

function useFallback(message = '已切换到基础风场模拟') {
  fallback = true;
  mode = 'fallback';
  root.dataset.fallback = 'true';
  fallbackMessage.hidden = false;
  const heading = fallbackMessage.querySelector('strong');
  if (heading) heading.textContent = message;
  heroProgress = 1;
  heroState = 'settled';
  updateInterface();
}

type Ribbon = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  positions: Float32Array;
  offset: number;
  phase: number;
  length: number;
};

type FlowLine = {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  positions: Float32Array;
  index: number;
};

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let kiteGroup: THREE.Group | null = null;
let paperGeometry: THREE.BufferGeometry | null = null;
let tetherLine: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
let tetherPositions: Float32Array | null = null;
let bridleLine: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> | null = null;
let bridlePositions: Float32Array | null = null;
let ribbons: Ribbon[] = [];
let flowLines: FlowLine[] = [];
let cloudSprites: THREE.Sprite[] = [];
const kiteBasePositions = new Float32Array([
  0, 1.55, 0, 1.28, .18, 0, 0, .13, .2,
  1.28, .18, 0, 0, -1.42, 0, 0, .13, .2,
  0, -1.42, 0, -1.28, .18, 0, 0, .13, .2,
  -1.28, .18, 0, 0, 1.55, 0, 0, .13, .2,
]);

function colorArray(): Float32Array {
  const vermillion = new THREE.Color(0xef4a2c);
  const cobalt = new THREE.Color(0x1d5ad7);
  const warm = new THREE.Color(0xfff1ce);
  const colors = new Float32Array(12 * 3);
  const triangleColors = [cobalt, cobalt, warm, cobalt, warm, warm, warm, vermillion, warm, vermillion, vermillion, warm];
  triangleColors.forEach((color, index) => color.toArray(colors, index * 3));
  return colors;
}

function createRibbon(group: THREE.Group, color: number, offset: number, phase: number, length: number): Ribbon {
  if (!runtime) throw new Error('Runtime required before creating ribbons.');
  const segments = quality === 'low' ? 16 : 24;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const a = index * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = runtime.geometry(new THREE.BufferGeometry());
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = runtime.material(new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: .9,
    depthWrite: false,
  }));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  group.add(mesh);
  return { mesh, positions, offset, phase, length };
}

function updateRibbon(ribbon: Ribbon, time: number, pose: FlightPose) {
  const segments = ribbon.positions.length / 6 - 1;
  const flutterTime = reducedMotion ? 0 : time * (1.5 + windSpeed * .055);
  const amplitude = .12 + windSpeed * .009 + Math.abs(gust) * .14;
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const wave = Math.sin(progress * 8.4 - flutterTime + ribbon.phase) * amplitude * progress;
    const broadWave = Math.sin(progress * 3.2 - flutterTime * .42 + ribbon.phase) * .16 * progress;
    const x = ribbon.offset + wave + gust * progress * .3;
    const y = -1.38 - progress * ribbon.length + broadWave;
    const z = -.03 + Math.cos(progress * 6.2 - flutterTime + ribbon.phase) * .13 * progress + pose.pitch * .003;
    const width = .045 * (1 - progress * .38);
    const base = index * 6;
    ribbon.positions[base] = x - width;
    ribbon.positions[base + 1] = y;
    ribbon.positions[base + 2] = z;
    ribbon.positions[base + 3] = x + width;
    ribbon.positions[base + 4] = y + .025;
    ribbon.positions[base + 5] = z;
  }
  ribbon.mesh.geometry.attributes.position.needsUpdate = true;
  ribbon.mesh.geometry.computeBoundingSphere();
}

function makeCloudTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext('2d');
  if (!context) throw new Error('Unable to create cloud texture.');
  context.clearRect(0, 0, 256, 128);
  const circles = [[54, 78, 39], [100, 60, 49], [145, 72, 43], [191, 81, 31], [122, 90, 48]];
  for (const [x, y, radius] of circles) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,.88)');
    gradient.addColorStop(.55, 'rgba(255,255,255,.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  return new THREE.CanvasTexture(textureCanvas);
}

function makePaperTexture(): THREE.CanvasTexture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 512;
  const context = textureCanvas.getContext('2d');
  if (!context) throw new Error('Unable to create paper texture.');
  const wash = context.createLinearGradient(0, 0, 512, 512);
  wash.addColorStop(0, '#fffaf0');
  wash.addColorStop(.48, '#efe9dd');
  wash.addColorStop(1, '#fffdf4');
  context.fillStyle = wash;
  context.fillRect(0, 0, 512, 512);
  let seed = 118;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  context.lineCap = 'round';
  for (let index = 0; index < 92; index += 1) {
    const y = random() * 512;
    const x = random() * 460 - 20;
    const length = 28 + random() * 120;
    context.strokeStyle = `rgba(76, 62, 38, ${(.018 + random() * .026).toFixed(3)})`;
    context.lineWidth = .4 + random() * .8;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(x + length * .3, y - 2, x + length * .72, y + 2, x + length, y + random() * 3 - 1.5);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeCylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
  if (!runtime) throw new Error('Runtime required before creating spars.');
  const direction = end.clone().sub(start);
  const geometry = runtime.geometry(new THREE.CylinderGeometry(radius, radius, direction.length(), 10));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function initializeScene() {
  if (fallback) {
    useFallback();
    return;
  }
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 36, near: .1, far: 80 },
      clearColor: 0xaadfff,
      clearAlpha: 0,
      toneMappingExposure: 1.18,
      maxDpr: 2,
      lowQualityMaxDpr: 1,
    });
    runtime.camera.position.set(0, .25, 9.2);
    runtime.camera.lookAt(0, .2, 0);

    runtime.scene.add(new THREE.HemisphereLight(0xeaf9ff, 0x52859d, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4d2, 3.4);
    sun.position.set(-4, 8, 7);
    runtime.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x528dff, 1.1);
    fill.position.set(6, 1, 4);
    runtime.scene.add(fill);

    const horizonMaterial = runtime.material(new THREE.MeshBasicMaterial({ color: 0x4d9ebc, transparent: true, opacity: .42, depthWrite: false }));
    const horizon = new THREE.Mesh(runtime.geometry(new THREE.PlaneGeometry(28, 3.8)), horizonMaterial);
    horizon.position.set(0, -2.75, -4.5);
    runtime.scene.add(horizon);
    const seaMaterial = runtime.material(new THREE.MeshPhysicalMaterial({ color: 0x3d92ae, roughness: .2, metalness: .05, transparent: true, opacity: .68 }));
    const sea = new THREE.Mesh(runtime.geometry(new THREE.PlaneGeometry(26, 18, 1, 1)), seaMaterial);
    sea.rotation.x = -Math.PI / 2.35;
    sea.position.set(0, -2.65, -2.3);
    runtime.scene.add(sea);

    const cloudTexture = runtime.texture(makeCloudTexture());
    for (let index = 0; index < 7; index += 1) {
      const material = runtime.material(new THREE.SpriteMaterial({ map: cloudTexture, transparent: true, opacity: .2 + index % 3 * .06, depthWrite: false }));
      const sprite = new THREE.Sprite(material);
      sprite.position.set(-7 + index * 2.35, 2.2 + (index % 3) * .72, -2.8 - (index % 2) * 1.8);
      sprite.scale.set(3.1 + (index % 2) * 1.2, 1.55 + (index % 3) * .18, 1);
      cloudSprites.push(sprite);
      runtime.scene.add(sprite);
    }

    kiteGroup = new THREE.Group();
    paperGeometry = runtime.geometry(new THREE.BufferGeometry());
    paperGeometry.setAttribute('position', new THREE.BufferAttribute(kiteBasePositions.slice(), 3));
    paperGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray(), 3));
    const paperUv = new Float32Array(12 * 2);
    for (let index = 0; index < 12; index += 1) {
      const base = index * 3;
      paperUv[index * 2] = kiteBasePositions[base] / 2.56 + .5;
      paperUv[index * 2 + 1] = (kiteBasePositions[base + 1] + 1.42) / 2.97;
    }
    paperGeometry.setAttribute('uv', new THREE.BufferAttribute(paperUv, 2));
    paperGeometry.computeVertexNormals();
    const paperTexture = runtime.texture(makePaperTexture());
    const paperMaterial = runtime.material(new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      map: paperTexture,
      side: THREE.DoubleSide,
      roughness: .72,
      metalness: 0,
      clearcoat: .16,
      clearcoatRoughness: .8,
      transparent: true,
      opacity: .98,
    }));
    const paper = new THREE.Mesh(paperGeometry, paperMaterial);
    kiteGroup.add(paper);

    const edgeMaterial = runtime.material(new THREE.LineBasicMaterial({ color: 0x14314a, transparent: true, opacity: .45 }));
    const edges = new THREE.LineSegments(runtime.geometry(new THREE.EdgesGeometry(paperGeometry, 8)), edgeMaterial);
    edges.position.z = .014;
    kiteGroup.add(edges);

    const bambooMaterial = runtime.material(new THREE.MeshPhysicalMaterial({ color: 0xdca75a, roughness: .58, metalness: 0, clearcoat: .14 }));
    kiteGroup.add(makeCylinderBetween(new THREE.Vector3(0, -1.45, .08), new THREE.Vector3(0, 1.57, .08), .035, bambooMaterial));
    kiteGroup.add(makeCylinderBetween(new THREE.Vector3(-1.3, .18, .08), new THREE.Vector3(1.3, .18, .08), .029, bambooMaterial));
    const knot = new THREE.Mesh(runtime.geometry(new THREE.SphereGeometry(.075, 16, 10)), bambooMaterial);
    knot.position.set(0, .16, .17);
    kiteGroup.add(knot);

    ribbons = [
      createRibbon(kiteGroup, 0xef4a2c, -.22, .2, 2.55),
      createRibbon(kiteGroup, 0x1d5ad7, .2, 2.2, 2.85),
      createRibbon(kiteGroup, 0xffebbe, 0, 4.1, 3.08),
    ];
    runtime.scene.add(kiteGroup);

    const tetherGeometry = runtime.geometry(new THREE.BufferGeometry());
    tetherPositions = new Float32Array(42 * 3);
    tetherGeometry.setAttribute('position', new THREE.BufferAttribute(tetherPositions, 3));
    const tetherMaterial = runtime.material(new THREE.LineBasicMaterial({ color: 0x17344a, transparent: true, opacity: .65 }));
    tetherLine = new THREE.Line(tetherGeometry, tetherMaterial);
    runtime.scene.add(tetherLine);

    const bridleGeometry = runtime.geometry(new THREE.BufferGeometry());
    bridlePositions = new Float32Array(12);
    bridleGeometry.setAttribute('position', new THREE.BufferAttribute(bridlePositions, 3));
    const bridleMaterial = runtime.material(new THREE.LineBasicMaterial({ color: 0x3b2d21, transparent: true, opacity: .72 }));
    bridleLine = new THREE.LineSegments(bridleGeometry, bridleMaterial);
    bridleLine.renderOrder = 4;
    kiteGroup.add(bridleLine);

    const flowCount = quality === 'low' ? 6 : quality === 'high' ? 11 : 8;
    for (let index = 0; index < flowCount; index += 1) {
      const positions = new Float32Array(34 * 3);
      const geometry = runtime.geometry(new THREE.BufferGeometry());
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = runtime.material(new THREE.LineBasicMaterial({
        color: index % 3 === 0 ? 0xfff5d4 : 0xffffff,
        transparent: true,
        opacity: .18 + (index % 4) * .055,
        depthWrite: false,
      }));
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 1;
      flowLines.push({ line, positions, index });
      runtime.scene.add(line);
    }
  } catch (error) {
    console.warn('WIND ATLAS WebGL scene unavailable; using semantic fallback.', error);
    runtime?.dispose();
    runtime = null;
    useFallback();
  }
}

function updatePaper(pose: FlightPose) {
  if (!paperGeometry) return;
  const position = paperGeometry.attributes.position as THREE.BufferAttribute;
  for (let index = 0; index < position.count; index += 1) {
    const base = index * 3;
    const x = kiteBasePositions[base];
    const y = kiteBasePositions[base + 1];
    const centerFactor = 1 - clamp(Math.abs(x) / 1.28, 0, 1);
    position.setXYZ(index, x, y, kiteBasePositions[base + 2] + pose.canopyBow * centerFactor + Math.abs(y - .15) * .014);
  }
  position.needsUpdate = true;
  paperGeometry.computeVertexNormals();
}

function updateTether(pose: FlightPose) {
  if (!kiteGroup || !tetherLine || !tetherPositions) return;
  kiteGroup.updateMatrixWorld(true);
  const start = new THREE.Vector3(0, .12, .16).applyMatrix4(kiteGroup.matrixWorld);
  const end = new THREE.Vector3(innerWidth < 760 ? 3.05 : 3.85, -3.35, .4);
  const count = tetherPositions.length / 3;
  for (let index = 0; index < count; index += 1) {
    const progress = index / (count - 1);
    const x = lerp(start.x, end.x, progress);
    const y = lerp(start.y, end.y, progress) - Math.sin(Math.PI * progress) * pose.tetherSag * 1.5;
    const z = lerp(start.z, end.z, progress) + Math.sin(Math.PI * progress) * .24;
    tetherPositions[index * 3] = x;
    tetherPositions[index * 3 + 1] = y;
    tetherPositions[index * 3 + 2] = z;
  }
  tetherLine.geometry.attributes.position.needsUpdate = true;
}

function updateBridle() {
  if (!bridleLine || !bridlePositions) return;
  const tieX = bridleOffset * .009;
  const tieY = .06 - Math.abs(bridleOffset) * .0015;
  const tieZ = .52;
  bridlePositions.set([
    -1.05, .18, .09, tieX, tieY, tieZ,
    1.05, .18, .09, tieX, tieY, tieZ,
  ]);
  bridleLine.geometry.attributes.position.needsUpdate = true;
}

function updateFlows(time: number) {
  for (const flow of flowLines) {
    const count = flow.positions.length / 3;
    const speed = reducedMotion ? 0 : time * (.22 + windSpeed * .018);
    for (let point = 0; point < count; point += 1) {
      const progress = point / (count - 1);
      let x = -8 + progress * 16 + speed + flow.index * 1.17;
      x = ((x + 8) % 16 + 16) % 16 - 8;
      const yBase = -1.25 + flow.index * .46;
      const curve = Math.sin(progress * Math.PI * 2 + flow.index * .74 + time * .18) * (.12 + windSpeed * .002);
      const gustCurve = gust * Math.exp(-Math.pow(x + .2, 2) * .18) * .55;
      flow.positions[point * 3] = x;
      flow.positions[point * 3 + 1] = yBase + curve + gustCurve;
      flow.positions[point * 3 + 2] = -1.1 + (flow.index % 3) * .68 + Math.sin(progress * 5 + flow.index) * .12;
    }
    flow.line.geometry.attributes.position.needsUpdate = true;
  }
}

function resize() {
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  runtime.camera.position.z = innerWidth < 760 ? 10.5 : 9.2;
  runtime.camera.position.y = innerWidth < 760 ? .6 : .25;
  runtime.camera.lookAt(innerWidth < 760 ? .35 : 0, .15, 0);
}

function onContextLost(event: Event) {
  event.preventDefault();
  runtime?.dispose();
  runtime = null;
  useFallback('3D 场景已暂停，基础模拟继续运行');
}

initializeScene();
resize();
addEventListener('resize', resize, { passive: true });
canvas.addEventListener('webglcontextlost', onContextLost);

function tick(now: number) {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(.001, (now - lastFrameAt) / 1000));
  const elapsed = (now - startedAt) / 1000;
  lastFrameAt = now;
  if (!reducedMotion && heroProgress < 1) heroProgress = clamp(elapsed / 3.2, 0, 1);
  if (heroProgress < .62) heroState = 'rising';
  else if (heroProgress < 1) heroState = 'calibrating';
  else heroState = 'settled';
  gust += (gustTarget - gust) * Math.min(1, delta * (reducedMotion ? 30 : 5.5));
  if (mode === 'demo' && heroProgress >= 1 && elapsed > 5) gustTarget *= .96;

  const pose = derivePose();
  if (runtime && kiteGroup) {
    const intro = easeOutCubic(heroProgress);
    const targetY = .45 + (altitude - 65) * .012;
    const targetX = innerWidth < 760 ? .45 : -.12;
    kiteGroup.position.set(
      targetX + gust * .17,
      lerp(-3.15, targetY, intro),
      lerp(-2.4, 0, intro),
    );
    kiteGroup.rotation.set(
      radians(pose.pitch) + (reducedMotion ? 0 : Math.sin(elapsed * 1.4) * .015),
      radians(pose.yaw),
      radians(-pose.roll) + (reducedMotion ? 0 : Math.sin(elapsed * 1.8) * .012),
    );
    const scale = (.88 + altitude / 560) * (.82 + intro * .18);
    kiteGroup.scale.setScalar(scale);
    updatePaper(pose);
    updateBridle();
    ribbons.forEach((ribbon) => updateRibbon(ribbon, elapsed, pose));
    updateTether(pose);
    updateFlows(elapsed);
    cloudSprites.forEach((cloud, index) => {
      cloud.position.x += reducedMotion ? 0 : delta * (.018 + index * .004);
      if (cloud.position.x > 9) cloud.position.x = -9;
    });
    runtime.camera.position.x = gust * .08;
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
  frames += 1;
  ready = true;
  root.dataset.windKiteReady = 'true';
  root.dataset.windKiteLabReady = 'true';
  if (frames % 4 === 0 || reducedMotion) updateInterface();
  frameId = requestAnimationFrame(tick);
}

function snapshot(): WindKiteSnapshot {
  const pose = derivePose();
  return {
    ready,
    heroProgress: Number(heroProgress.toFixed(3)),
    heroState,
    mode,
    windSpeed: Number(windSpeed.toFixed(2)),
    bridleOffset: Number(bridleOffset.toFixed(2)),
    altitude: Number(altitude.toFixed(2)),
    gust: Number(gust.toFixed(3)),
    pose: {
      pitch: Number(pose.pitch.toFixed(3)),
      roll: Number(pose.roll.toFixed(3)),
      yaw: Number(pose.yaw.toFixed(3)),
      lift: Number(pose.lift.toFixed(3)),
      canopyBow: Number(pose.canopyBow.toFixed(3)),
      tetherSag: Number(pose.tetherSag.toFixed(3)),
      stability: Number(pose.stability.toFixed(3)),
      tension: Number(pose.tension.toFixed(3)),
    },
    frames: fallback ? 0 : frames,
    drawCalls,
    triangles,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    quality,
    saved,
    visualRevision,
  };
}

window.__windKiteLab = { snapshot, setWindSpeed, setBridleOffset, setAltitude };
updateInterface();
frameId = requestAnimationFrame(tick);

function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  removeEventListener('resize', resize);
  removeEventListener('pointermove', onPointer);
  removeEventListener('pointerdown', onPointer);
  removeEventListener('pointerleave', onPointerLeave);
  removeEventListener('wheel', onWheel);
  removeEventListener('keydown', onKeydown);
  windInput.removeEventListener('input', onWindInput);
  bridleInput.removeEventListener('input', onBridleInput);
  altitudeInput.removeEventListener('input', onAltitudeInput);
  saveButton.removeEventListener('click', onSave);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  runtime?.dispose();
  runtime = null;
  delete window.__windKiteLab;
}

addEventListener('pagehide', dispose, { once: true });
