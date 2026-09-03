import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

const STORM_STATES = ['dormant', 'gathering', 'branching', 'imprinted'] as const;
type StormState = (typeof STORM_STATES)[number];

type SceneProfile = Readonly<{
  progress: number;
  charge: number;
  crackGrowth: number;
  refraction: number;
  brightness: number;
  groupX: number;
  rotation: number;
  cameraZ: number;
}>;

type StormglassSnapshot = {
  ready: boolean;
  state: StormState;
  phase: StormState;
  progress: number;
  charge: number;
  crackGrowth: number;
  refraction: number;
  brightness: number;
  cameraDepth: number;
  glassRotation: number;
  canvasVisualHash: string;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  horizontalOverflow: boolean;
  quality: GeneratedQuality;
  revision: string;
};

declare global {
  interface Window {
    __stormglassArchive?: {
      snapshot: () => StormglassSnapshot;
      setProgress: (progress: number) => void;
      goto: (state: StormState | number) => void;
      saveImprint: () => void;
    };
  }
}

const PROFILES: Readonly<Record<StormState, SceneProfile>> = {
  dormant: {
    progress: 0,
    charge: .08,
    crackGrowth: .03,
    refraction: .18,
    brightness: .2,
    groupX: 1.18,
    rotation: -.18,
    cameraZ: 11.7,
  },
  gathering: {
    progress: .31,
    charge: .62,
    crackGrowth: .2,
    refraction: .48,
    brightness: .44,
    groupX: .42,
    rotation: .05,
    cameraZ: 10.55,
  },
  branching: {
    progress: .64,
    charge: 1,
    crackGrowth: .8,
    refraction: .9,
    brightness: 1,
    groupX: -.72,
    rotation: .2,
    cameraZ: 9.65,
  },
  imprinted: {
    progress: 1,
    charge: .28,
    crackGrowth: 1,
    refraction: .68,
    brightness: .84,
    groupX: 1.08,
    rotation: .34,
    cameraZ: 10.65,
  },
};

const ANNOUNCEMENTS: Readonly<Record<StormState, string>> = {
  dormant: '风暴玻璃处于静置状态，内部仍有微弱余光。',
  gathering: '余光正在沿玻璃内部断面汇聚。',
  branching: '闪电裂隙已经分叉并形成清楚亮纹。',
  imprinted: '闪电拓片已经成像，可以保存。',
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
  if (!element) throw new Error(`STORMGLASS ARCHIVE is missing ${selector}.`);
  return element;
}

function isStormState(value: unknown): value is StormState {
  return typeof value === 'string' && (STORM_STATES as readonly string[]).includes(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const params = new URLSearchParams(location.search);
const qualityValue = params.get('quality');
const quality: GeneratedQuality = qualityValue === 'low' || qualityValue === 'balanced' ? qualityValue : 'high';
const revision = params.get('revision') || 'r134-live';
const reducedMotion = params.get('motion') === 'reduce'
  || (params.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
const forcedFallback = ['1', 'true', 'webgl', 'canvas'].includes(params.get('fallback') || '');
const deterministicReview = params.get('visual-review') === '1';

const root = document.documentElement;
const stage = requireElement<HTMLElement>('#stormglass-stage');
const canvas = requireElement<HTMLCanvasElement>('#stormglass-canvas');
const fallbackScene = requireElement<SVGElement>('#stormglass-fallback');
const chapters = STORM_STATES.map((state) => requireElement<HTMLElement>(`[data-scene="${state}"]`));
const stateLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-scene-link]'));
const progressFill = requireElement<HTMLElement>('#progress-fill');
const saveButton = requireElement<HTMLButtonElement>('#save-imprint');
const saveStatus = requireElement<HTMLElement>('#save-status');
const liveStatus = requireElement<HTMLElement>('#live-status');
const chargeReading = requireElement<HTMLElement>('#charge-reading');
const crackReading = requireElement<HTMLElement>('#crack-reading');

let activeState: StormState = 'dormant';
let activeIndex = 0;
let stateStops = STORM_STATES.map((state) => PROFILES[state].progress);
let targetProgress = 0;
let renderedProgress = 0;
let currentProfile: SceneProfile = PROFILES.dormant;
let saved = false;
let ready = false;
let fallback = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let canvasVisualHash = '';
let cameraDepth = PROFILES.dormant.cameraZ;
let scrollFrame = 0;
let frameId = 0;
let disposed = false;
let lastFrameAt = performance.now();
const startedAt = performance.now();

type Runtime = ReturnType<typeof createGeneratedThreeRuntime>;
let runtime: Runtime | null = null;
let glassGroup: THREE.Group | null = null;
let glassShell: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshPhysicalMaterial> | null = null;
let fieldMaterial: THREE.ShaderMaterial | null = null;
let cloudMaterial: THREE.ShaderMaterial | null = null;
let crackGeometry: THREE.BufferGeometry | null = null;
let crackMaterial: THREE.LineBasicMaterial | null = null;
let crackGlowMaterial: THREE.LineBasicMaterial | null = null;
let crackCoreMesh: THREE.InstancedMesh | null = null;
let crackHaloMesh: THREE.InstancedMesh | null = null;
let crackCoreMaterial: THREE.MeshStandardMaterial | null = null;
let crackHaloMaterial: THREE.MeshBasicMaterial | null = null;
let chargeGeometry: THREE.BufferGeometry | null = null;
let chargeMaterial: THREE.PointsMaterial | null = null;
let electricLight: THREE.PointLight | null = null;
let crackSegmentCount = 0;

const particleStarts: THREE.Vector3[] = [];
const particleTargets: THREE.Vector3[] = [];

function setDataset(name: string, value: string): void {
  root.dataset[name] = value;
  stage.dataset[name] = value;
}

function announce(message: string): void {
  liveStatus.textContent = '';
  requestAnimationFrame(() => { liveStatus.textContent = message; });
}

function markReady(): void {
  if (ready) return;
  ready = true;
  setDataset('stormglassReady', 'true');
}

function shapeForGlass(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-1.68, 3.12);
  shape.bezierCurveTo(-2.22, 2.42, -2.32, 1.1, -2.18, -.25);
  shape.bezierCurveTo(-2.03, -1.78, -1.37, -2.94, -.18, -3.42);
  shape.bezierCurveTo(1.08, -3.04, 1.91, -1.78, 2.12, -.35);
  shape.bezierCurveTo(2.33, 1.18, 2.06, 2.45, 1.48, 3.18);
  shape.bezierCurveTo(.58, 3.48, -.74, 3.46, -1.68, 3.12);
  shape.closePath();
  return shape;
}

const cloudVertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uEnergy;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = .55;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + 17.17;
      amplitude *= .48;
    }
    return value;
  }
  void main() {
    vec2 uv = vUv;
    float time = uTime * .018;
    float low = fbm(uv * 3.2 + vec2(time, -time * .45));
    float high = fbm(uv * 7.8 - vec2(time * .7, time * .2));
    float cloud = smoothstep(.2, .86, low * .72 + high * .3);
    float center = 1.0 - smoothstep(.05, .72, distance(uv, vec2(.52, .48)));
    vec3 lead = vec3(.045, .057, .068);
    vec3 silver = vec3(.24, .28, .31);
    vec3 color = mix(lead, silver, cloud * .62);
    color += vec3(.35, .54, .62) * center * uEnergy * .12;
    float vignette = smoothstep(.9, .22, distance(uv, vec2(.5)));
    gl_FragColor = vec4(color * (.72 + vignette * .35), 1.0);
  }
`;

const fieldVertexShader = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormalView;
  void main() {
    vUv = uv;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fieldFragmentShader = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  varying vec3 vNormalView;
  uniform float uTime;
  uniform float uCharge;
  uniform float uRefraction;
  uniform float uBrightness;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.73, 289.13))) * 45758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec2 centered = vUv - .5;
    float drift = uTime * .024;
    float bands = noise(vec2(vUv.y * 13.0 - drift, vUv.x * 5.0 + drift));
    float vertical = pow(max(0.0, 1.0 - abs(centered.x) * 1.7), 2.0);
    float energy = smoothstep(.38, .92, bands + vertical * uCharge * .55);
    float fresnel = pow(1.0 - abs(vNormalView.z), 2.2);
    vec3 base = mix(vec3(.06, .085, .105), vec3(.34, .48, .55), uRefraction * .58);
    vec3 electric = vec3(.72, .93, 1.0) * energy * uBrightness * .46;
    float alpha = .12 + uRefraction * .16 + energy * .13 + fresnel * .18;
    gl_FragColor = vec4(base + electric, alpha);
  }
`;

function createCloudField(sceneRuntime: Runtime): void {
  const geometry = sceneRuntime.geometry(new THREE.PlaneGeometry(32, 20, 1, 1));
  cloudMaterial = sceneRuntime.material(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uEnergy: { value: .2 },
    },
    vertexShader: cloudVertexShader,
    fragmentShader: cloudFragmentShader,
    depthWrite: false,
    depthTest: false,
  }));
  const cloud = new THREE.Mesh(geometry, cloudMaterial);
  cloud.position.set(0, 0, -4.6);
  sceneRuntime.scene.add(cloud);

  const hazeGeometry = sceneRuntime.geometry(new THREE.PlaneGeometry(22, 15));
  const hazeMaterial = sceneRuntime.material(new THREE.MeshBasicMaterial({
    color: 0x6d7d86,
    transparent: true,
    opacity: .045,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
  haze.position.set(.6, -.6, -3.8);
  haze.rotation.z = -.13;
  sceneRuntime.scene.add(haze);
}

function createCrackPositions(): Float32Array {
  const points: number[] = [];
  const spine: THREE.Vector3[] = [];
  const count = 43;
  for (let index = 0; index <= count; index += 1) {
    const amount = index / count;
    const y = 2.86 - amount * 5.88;
    const x = Math.sin(index * 1.76) * (.09 + amount * .05)
      + Math.sin(index * .43) * .2
      + (seeded(index + 91) - .5) * .16;
    spine.push(new THREE.Vector3(x, y, .34));
    if (index > 0) {
      const previous = spine[index - 1];
      points.push(previous.x, previous.y, previous.z, x, y, .34);
    }
  }

  const branchStarts = [7, 12, 17, 23, 29, 34, 38];
  branchStarts.forEach((startIndex, branchIndex) => {
    const start = spine[startIndex];
    const direction = branchIndex % 2 === 0 ? -1 : 1;
    const length = 4 + Math.floor(seeded(branchIndex + 302) * 4);
    let previous = start.clone();
    for (let step = 1; step <= length; step += 1) {
      const next = new THREE.Vector3(
        start.x + direction * step * (.18 + seeded(branchIndex * 17 + step) * .1),
        start.y - step * (.11 + seeded(branchIndex * 31 + step) * .08),
        .34 + seeded(branchIndex * 41 + step) * .025,
      );
      points.push(previous.x, previous.y, previous.z, next.x, next.y, next.z);
      previous = next;
    }
  });
  return new Float32Array(points);
}

function createChargeField(sceneRuntime: Runtime, targetPositions: Float32Array): THREE.Points {
  const count = quality === 'high' ? 240 : quality === 'balanced' ? 170 : 110;
  const positions = new Float32Array(count * 3);
  const targetCount = Math.max(1, targetPositions.length / 3);
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(index * 17 + 11) * Math.PI * 2;
    const radius = 2.1 + seeded(index * 23 + 13) * 1.55;
    const start = new THREE.Vector3(
      Math.cos(angle) * radius,
      (seeded(index * 31 + 7) - .5) * 6.2,
      (seeded(index * 43 + 3) - .5) * 1.1 + .2,
    );
    const targetIndex = Math.floor(seeded(index * 53 + 17) * targetCount) * 3;
    const target = new THREE.Vector3(
      targetPositions[targetIndex] ?? 0,
      targetPositions[targetIndex + 1] ?? 0,
      (targetPositions[targetIndex + 2] ?? .34) + .05,
    );
    particleStarts.push(start);
    particleTargets.push(target);
    positions.set([start.x, start.y, start.z], index * 3);
  }
  chargeGeometry = sceneRuntime.geometry(new THREE.BufferGeometry());
  chargeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  chargeMaterial = sceneRuntime.material(new THREE.PointsMaterial({
    color: 0xdaf7ff,
    size: quality === 'low' ? .045 : .06,
    sizeAttenuation: true,
    transparent: true,
    opacity: .18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  return new THREE.Points(chargeGeometry, chargeMaterial);
}

function createVolumetricCracks(
  sceneRuntime: Runtime,
  positions: Float32Array,
): [THREE.InstancedMesh, THREE.InstancedMesh] {
  const segmentCount = positions.length / 6;
  const cylinder = sceneRuntime.geometry(new THREE.CylinderGeometry(1, 1, 1, 7, 1, true));
  crackCoreMaterial = sceneRuntime.material(new THREE.MeshStandardMaterial({
    color: 0xf4fdff,
    emissive: 0xc8f5ff,
    emissiveIntensity: 3.4,
    roughness: .16,
    metalness: 0,
    transparent: true,
    opacity: .82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  crackHaloMaterial = sceneRuntime.material(new THREE.MeshBasicMaterial({
    color: 0x71d6ff,
    transparent: true,
    opacity: .14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const core = new THREE.InstancedMesh(cylinder, crackCoreMaterial, segmentCount);
  const halo = new THREE.InstancedMesh(cylinder, crackHaloMaterial, segmentCount);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const midpoint = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < segmentCount; index += 1) {
    const offset = index * 6;
    from.set(positions[offset], positions[offset + 1], positions[offset + 2] + .01);
    to.set(positions[offset + 3], positions[offset + 4], positions[offset + 5] + .01);
    direction.subVectors(to, from);
    const length = direction.length();
    midpoint.addVectors(from, to).multiplyScalar(.5);
    dummy.position.copy(midpoint);
    dummy.quaternion.setFromUnitVectors(up, direction.normalize());
    dummy.scale.set(.012, length, .012);
    dummy.updateMatrix();
    core.setMatrixAt(index, dummy.matrix);
    dummy.scale.set(.042, length, .042);
    dummy.updateMatrix();
    halo.setMatrixAt(index, dummy.matrix);
  }
  core.instanceMatrix.needsUpdate = true;
  halo.instanceMatrix.needsUpdate = true;
  core.count = 1;
  halo.count = 1;
  core.renderOrder = 9;
  halo.renderOrder = 8;
  return [core, halo];
}

function createStormglass(sceneRuntime: Runtime): void {
  glassGroup = new THREE.Group();
  const shape = shapeForGlass();
  const shellGeometry = sceneRuntime.geometry(new THREE.ExtrudeGeometry(shape, {
    depth: .42,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: .12,
    bevelSize: .11,
    bevelSegments: quality === 'low' ? 2 : 5,
  }));
  shellGeometry.translate(0, 0, -.21);
  glassShell = new THREE.Mesh(shellGeometry, sceneRuntime.material(new THREE.MeshPhysicalMaterial({
    color: 0xa8bbc4,
    roughness: .12,
    metalness: .03,
    transmission: .76,
    thickness: .74,
    ior: 1.46,
    transparent: true,
    opacity: .56,
    clearcoat: 1,
    clearcoatRoughness: .08,
    depthWrite: false,
    side: THREE.DoubleSide,
  })));
  glassShell.renderOrder = 2;
  glassGroup.add(glassShell);

  const fieldGeometry = sceneRuntime.geometry(new THREE.ShapeGeometry(shape, quality === 'low' ? 6 : 16));
  fieldMaterial = sceneRuntime.material(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCharge: { value: .08 },
      uRefraction: { value: .18 },
      uBrightness: { value: .2 },
    },
    vertexShader: fieldVertexShader,
    fragmentShader: fieldFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  }));
  const innerField = new THREE.Mesh(fieldGeometry, fieldMaterial);
  innerField.position.z = .12;
  innerField.renderOrder = 3;
  glassGroup.add(innerField);

  const rimGeometry = sceneRuntime.geometry(new THREE.EdgesGeometry(shellGeometry, 24));
  const rimMaterial = sceneRuntime.material(new THREE.LineBasicMaterial({
    color: 0xc7d7dc,
    transparent: true,
    opacity: .22,
    blending: THREE.AdditiveBlending,
  }));
  const rim = new THREE.LineSegments(rimGeometry, rimMaterial);
  rim.renderOrder = 5;
  glassGroup.add(rim);

  const crackPositions = createCrackPositions();
  crackGeometry = sceneRuntime.geometry(new THREE.BufferGeometry());
  crackGeometry.setAttribute('position', new THREE.BufferAttribute(crackPositions, 3));
  crackSegmentCount = crackPositions.length / 6;
  crackGeometry.setDrawRange(0, 2);
  crackMaterial = sceneRuntime.material(new THREE.LineBasicMaterial({
    color: 0xeafcff,
    transparent: true,
    opacity: .35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  crackGlowMaterial = sceneRuntime.material(new THREE.LineBasicMaterial({
    color: 0x6fcfff,
    transparent: true,
    opacity: .16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const crack = new THREE.LineSegments(crackGeometry, crackMaterial);
  crack.renderOrder = 7;
  const glow = new THREE.LineSegments(crackGeometry, crackGlowMaterial);
  glow.scale.set(1.012, 1.012, 1);
  glow.position.z = -.03;
  glow.renderOrder = 6;
  glassGroup.add(glow, crack);

  [crackCoreMesh, crackHaloMesh] = createVolumetricCracks(sceneRuntime, crackPositions);
  glassGroup.add(crackHaloMesh, crackCoreMesh);

  const charges = createChargeField(sceneRuntime, crackPositions);
  charges.renderOrder = 8;
  glassGroup.add(charges);

  const haloGeometry = sceneRuntime.geometry(new THREE.RingGeometry(2.25, 2.95, 96));
  const haloMaterial = sceneRuntime.material(new THREE.MeshBasicMaterial({
    color: 0x9eddea,
    transparent: true,
    opacity: .032,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }));
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.z = -.45;
  halo.scale.y = 1.12;
  glassGroup.add(halo);

  sceneRuntime.scene.add(glassGroup);
  electricLight = new THREE.PointLight(0xcaf5ff, .6, 12, 1.5);
  electricLight.position.set(0, .2, 2.6);
  glassGroup.add(electricLight);
}

function initializeScene(): void {
  if (forcedFallback) {
    setFallbackState('forced');
    return;
  }
  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 36, near: .08, far: 60 },
      clearColor: 0x090d11,
      clearAlpha: 1,
      toneMappingExposure: 1.08,
      maxDpr: 1.8,
      lowQualityMaxDpr: 1,
      renderer: { premultipliedAlpha: false },
    });
    runtime.scene.fog = new THREE.FogExp2(0x0a0e12, .025);
    runtime.scene.add(new THREE.HemisphereLight(0xc5d6dc, 0x10151a, 1.2));
    const key = new THREE.DirectionalLight(0xe8f5f7, 2.2);
    key.position.set(-5, 6, 8);
    runtime.scene.add(key);
    const edge = new THREE.DirectionalLight(0x7fc8dc, 1.35);
    edge.position.set(6, -2, 5);
    runtime.scene.add(edge);
    createCloudField(runtime);
    createStormglass(runtime);
    fallback = false;
    canvas.hidden = false;
    fallbackScene.hidden = true;
    setDataset('fallback', 'false');
    resize();
    applyScene(0, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
    markReady();
  } catch (error) {
    console.warn('[stormglass-archive] WebGL unavailable; semantic lightning imprint remains available.', error);
    setFallbackState('webgl-unavailable');
  }
}

function setFallbackState(reason: string): void {
  fallback = true;
  runtime?.dispose();
  runtime = null;
  canvas.hidden = true;
  fallbackScene.hidden = false;
  fallbackScene.dataset.fallbackReason = reason;
  frames = 0;
  drawCalls = 0;
  triangles = 0;
  setDataset('fallback', 'true');
  updateVisualHash(renderedProgress);
  markReady();
}

function recalculateStateStops(): void {
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const measured = chapters.map((chapter, index) => {
    const rect = chapter.getBoundingClientRect();
    const pageTop = scrollY + rect.top;
    const targetTop = pageTop + rect.height * .45 - innerHeight * .5;
    return index === 0 ? 0 : clamp(targetTop / scrollRange);
  });
  measured[0] = 0;
  for (let index = 1; index < measured.length; index += 1) {
    measured[index] = Math.max(measured[index], measured[index - 1] + .12);
  }
  measured[measured.length - 1] = Math.max(.84, Math.min(1, measured[measured.length - 1]));
  stateStops = measured.map((value) => clamp(value));
}

function stateForProgress(progress: number): StormState {
  for (let index = STORM_STATES.length - 1; index > 0; index -= 1) {
    const threshold = (stateStops[index - 1] + stateStops[index]) * .5;
    if (progress >= threshold) return STORM_STATES[index];
  }
  return 'dormant';
}

function applySemanticState(state: StormState, shouldAnnounce = true): void {
  const changed = activeState !== state;
  activeState = state;
  activeIndex = STORM_STATES.indexOf(state);
  setDataset('stormglassState', state);
  root.style.setProperty('--state-index', String(activeIndex));
  chapters.forEach((chapter, index) => {
    const current = index === activeIndex;
    chapter.dataset.active = String(current);
    if (current) chapter.setAttribute('aria-current', 'step');
    else chapter.removeAttribute('aria-current');
  });
  stateLinks.forEach((link) => {
    const current = link.dataset.sceneLink === state;
    if (current) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  if (changed && shouldAnnounce) announce(ANNOUNCEMENTS[state]);
}

function blendProfiles(progress: number): SceneProfile {
  if (reducedMotion) return PROFILES[activeState];
  let leftIndex = 0;
  for (let index = 1; index < stateStops.length; index += 1) {
    if (progress >= stateStops[index]) leftIndex = index;
    else break;
  }
  const rightIndex = Math.min(STORM_STATES.length - 1, leftIndex + 1);
  const left = PROFILES[STORM_STATES[leftIndex]];
  const right = PROFILES[STORM_STATES[rightIndex]];
  const amount = leftIndex === rightIndex
    ? 0
    : smoothstep(stateStops[leftIndex], stateStops[rightIndex], progress);
  return {
    progress,
    charge: lerp(left.charge, right.charge, amount),
    crackGrowth: lerp(left.crackGrowth, right.crackGrowth, amount),
    refraction: lerp(left.refraction, right.refraction, amount),
    brightness: lerp(left.brightness, right.brightness, amount),
    groupX: lerp(left.groupX, right.groupX, amount),
    rotation: lerp(left.rotation, right.rotation, amount),
    cameraZ: lerp(left.cameraZ, right.cameraZ, amount),
  };
}

function updateCharges(profile: SceneProfile, now: number): void {
  if (!chargeGeometry) return;
  const positions = chargeGeometry.getAttribute('position') as THREE.BufferAttribute;
  const elapsed = (now - startedAt) / 1000;
  for (let index = 0; index < particleStarts.length; index += 1) {
    const start = particleStarts[index];
    const target = particleTargets[index];
    const delay = seeded(index * 71 + 5) * .55;
    const arrival = smoothstep(delay, Math.min(1, delay + .34), profile.charge);
    const orbit = reducedMotion || deterministicReview ? 0 : (1 - arrival) * Math.sin(elapsed * (.42 + seeded(index) * .45) + index) * .08;
    positions.setXYZ(
      index,
      lerp(start.x, target.x, arrival) + orbit,
      lerp(start.y, target.y, arrival) + orbit * .35,
      lerp(start.z, target.z, arrival),
    );
  }
  positions.needsUpdate = true;
}

function applyScene(progress: number, now: number): void {
  if (!runtime || !glassGroup) return;
  const profile = blendProfiles(progress);
  currentProfile = profile;
  const mobile = innerWidth <= 620;
  const tablet = innerWidth <= 950;
  const time = (reducedMotion || deterministicReview ? 0 : now - startedAt) / 1000;
  const idle = reducedMotion || deterministicReview ? 0 : Math.sin(time * .46) * .055;
  const scale = mobile ? .67 : tablet ? .82 : 1;
  glassGroup.scale.setScalar(scale);
  glassGroup.position.set(mobile ? 0 : profile.groupX, mobile ? .7 + idle : idle, 0);
  glassGroup.rotation.set(-.035 + idle * .08, profile.rotation + idle * .18, -.035 + profile.rotation * .06);

  cameraDepth = profile.cameraZ + (mobile ? 1.6 : tablet ? .65 : 0);
  runtime.camera.position.set(0, mobile ? .45 : 0, cameraDepth);
  runtime.camera.lookAt(mobile ? 0 : profile.groupX * .28, mobile ? .25 : 0, 0);

  if (glassShell) {
    glassShell.material.opacity = .43 + profile.refraction * .2;
    glassShell.material.roughness = .18 - profile.refraction * .09;
    glassShell.material.transmission = .58 + profile.refraction * .3;
  }
  if (fieldMaterial) {
    fieldMaterial.uniforms.uTime.value = time;
    fieldMaterial.uniforms.uCharge.value = profile.charge;
    fieldMaterial.uniforms.uRefraction.value = profile.refraction;
    fieldMaterial.uniforms.uBrightness.value = profile.brightness;
  }
  if (cloudMaterial) {
    cloudMaterial.uniforms.uTime.value = time;
    cloudMaterial.uniforms.uEnergy.value = profile.brightness;
  }
  if (crackGeometry) {
    const visibleSegments = Math.max(1, Math.round(crackSegmentCount * profile.crackGrowth));
    crackGeometry.setDrawRange(0, visibleSegments * 2);
    if (crackCoreMesh) crackCoreMesh.count = visibleSegments;
    if (crackHaloMesh) crackHaloMesh.count = visibleSegments;
  }
  if (crackMaterial) crackMaterial.opacity = .2 + profile.brightness * .78;
  if (crackGlowMaterial) crackGlowMaterial.opacity = .05 + profile.brightness * .35;
  if (crackCoreMaterial) crackCoreMaterial.opacity = .42 + profile.brightness * .55;
  if (crackHaloMaterial) crackHaloMaterial.opacity = .04 + profile.brightness * .22;
  if (chargeMaterial) {
    const fadeAfterImprint = activeState === 'imprinted' ? .55 : 1;
    chargeMaterial.opacity = (.1 + profile.charge * .72) * fadeAfterImprint;
    chargeMaterial.size = (quality === 'low' ? .04 : .055) + profile.charge * .025;
  }
  if (electricLight) electricLight.intensity = .28 + profile.brightness * 3.4;
  updateCharges(profile, now);
}

function updateVisualHash(progress: number): void {
  const profile = blendProfiles(progress);
  currentProfile = profile;
  const signature = [
    fallback ? 'fallback' : 'webgl',
    activeState,
    Math.round(progress * 1000),
    Math.round(profile.charge * 1000),
    Math.round(profile.crackGrowth * 1000),
    Math.round(profile.refraction * 1000),
    saved ? 'saved' : 'open',
    quality,
  ].join('|');
  canvasVisualHash = hashString(signature);
  canvas.dataset.visualHash = canvasVisualHash;
}

function updateSemanticReadings(progress: number): void {
  const profile = blendProfiles(progress);
  root.style.setProperty('--progress', progress.toFixed(4));
  progressFill.style.width = `${progress * 100}%`;
  chargeReading.textContent = `${Math.round(profile.charge * 100).toString().padStart(2, '0')}%`;
  crackReading.textContent = `${Math.round(profile.crackGrowth * 100).toString().padStart(2, '0')}%`;
}

function syncScrollState(): void {
  scrollFrame = 0;
  recalculateStateStops();
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  targetProgress = clamp(scrollY / scrollRange);
  const state = stateForProgress(targetProgress);
  applySemanticState(state);
  if (reducedMotion) {
    renderedProgress = stateStops[STORM_STATES.indexOf(state)];
    updateSemanticReadings(renderedProgress);
    updateVisualHash(renderedProgress);
    if (runtime) {
      applyScene(renderedProgress, performance.now());
      runtime.render();
      drawCalls = runtime.renderer.info.render.calls;
      triangles = runtime.renderer.info.render.triangles;
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
  const state = stateForProgress(next);
  applySemanticState(state);
  renderedProgress = reducedMotion ? stateStops[STORM_STATES.indexOf(state)] : next;
  updateSemanticReadings(renderedProgress);
  updateVisualHash(renderedProgress);
  if (runtime) {
    applyScene(renderedProgress, performance.now());
    runtime.render();
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
}

function resolveState(value: StormState | number): StormState {
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return STORM_STATES[Math.max(0, Math.min(STORM_STATES.length - 1, value))];
    return stateForProgress(clamp(value));
  }
  return isStormState(value) ? value : activeState;
}

function gotoState(value: StormState | number): void {
  const state = resolveState(value);
  recalculateStateStops();
  setProgress(stateStops[STORM_STATES.indexOf(state)]);
  applySemanticState(state);
  announce(ANNOUNCEMENTS[state]);
}

function saveImprint(): void {
  if (activeState !== 'imprinted') gotoState('imprinted');
  saved = true;
  setDataset('saved', 'true');
  saveButton.dataset.saved = 'true';
  saveButton.querySelector('span')!.textContent = '闪电拓片已保存在本页';
  saveStatus.textContent = '已保存 · 风暴玻璃 07 / 本地页面状态';
  updateVisualHash(renderedProgress);
  announce('这次闪电拓片已经保存在当前页面。');
}

function resize(): void {
  recalculateStateStops();
  if (!runtime) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  applyScene(renderedProgress, performance.now());
  runtime.render();
}

function onStateLink(event: MouseEvent): void {
  const link = event.currentTarget;
  if (!(link instanceof HTMLAnchorElement)) return;
  const state = link.dataset.sceneLink;
  if (!isStormState(state)) return;
  event.preventDefault();
  gotoState(state);
  history.replaceState(null, '', `#${state}`);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof HTMLInputElement
    || event.target instanceof HTMLTextAreaElement
    || event.target instanceof HTMLSelectElement
    || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
  let nextIndex: number | null = null;
  if (event.key === 'ArrowDown' || event.key === 'PageDown') nextIndex = Math.min(STORM_STATES.length - 1, activeIndex + 1);
  else if (event.key === 'ArrowUp' || event.key === 'PageUp') nextIndex = Math.max(0, activeIndex - 1);
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = STORM_STATES.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  gotoState(nextIndex);
}

function onContextLost(event: Event): void {
  event.preventDefault();
  setFallbackState('context-lost');
  announce('增强场景已暂停，仍可阅读四个阶段并保存闪电拓片。');
}

function snapshot(): StormglassSnapshot {
  return {
    ready,
    state: activeState,
    phase: activeState,
    progress: Number(renderedProgress.toFixed(4)),
    charge: Number(currentProfile.charge.toFixed(3)),
    crackGrowth: Number(currentProfile.crackGrowth.toFixed(3)),
    refraction: Number(currentProfile.refraction.toFixed(3)),
    brightness: Number(currentProfile.brightness.toFixed(3)),
    cameraDepth: Number(cameraDepth.toFixed(3)),
    glassRotation: Number(currentProfile.rotation.toFixed(3)),
    canvasVisualHash,
    saved,
    fallback,
    reducedMotion,
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
  const smoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 6.2);
  renderedProgress += (targetProgress - renderedProgress) * smoothing;
  if (Math.abs(targetProgress - renderedProgress) < .0001) renderedProgress = targetProgress;
  if (!fallback && runtime) {
    applyScene(renderedProgress, now);
    runtime.render();
    frames += 1;
    drawCalls = runtime.renderer.info.render.calls;
    triangles = runtime.renderer.info.render.triangles;
  }
  updateSemanticReadings(renderedProgress);
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
  canvas.removeEventListener('webglcontextlost', onContextLost);
  stateLinks.forEach((link) => link.removeEventListener('click', onStateLink));
  saveButton.removeEventListener('click', saveImprint);
  runtime?.dispose();
  runtime = null;
  delete window.__stormglassArchive;
}

setDataset('stormglassReady', 'false');
setDataset('stormglassState', 'dormant');
setDataset('fallback', String(forcedFallback));
setDataset('reducedMotion', String(reducedMotion));
setDataset('saved', 'false');
applySemanticState('dormant', false);
initializeScene();
recalculateStateStops();
syncScrollState();

stateLinks.forEach((link) => link.addEventListener('click', onStateLink));
saveButton.addEventListener('click', saveImprint);
canvas.addEventListener('webglcontextlost', onContextLost, false);
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', resize, { passive: true });
addEventListener('keydown', onKeydown);

window.__stormglassArchive = {
  snapshot,
  setProgress,
  goto: gotoState,
  saveImprint,
};
frameId = requestAnimationFrame(tick);
addEventListener('pagehide', dispose, { once: true });

export {};
