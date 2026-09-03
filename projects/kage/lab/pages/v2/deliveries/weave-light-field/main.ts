import * as THREE from 'three';
import { createGeneratedThreeRuntime, type GeneratedQuality } from '../../../../src/generated-sdk/index.ts';

type WeavePhase = 'opening' | 'weaving' | 'complete' | 'saved';

type WeaveLightSnapshot = {
  ready: boolean;
  phase: WeavePhase;
  step: number;
  row: number;
  wovenRows: number;
  maxRows: number;
  completed: boolean;
  saved: boolean;
  pattern: string;
  heroProgress: number;
  openingProgress: number;
  clothProgress: number;
  shuttlePosition: number;
  heddleOffsets: [number, number, number];
  warpCount: number;
  visibleWeftCords: number;
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
    __weaveLightField?: {
      snapshot: () => WeaveLightSnapshot;
      advance: () => void;
      save: () => void;
      reset: () => void;
    };
  }
}

type PatternState = Readonly<{ name: string; description: string }>;
type HeddleRig = Readonly<{ group: THREE.Group; baseY: number }>;
type WeftCord = Readonly<{ mesh: THREE.Mesh; row: number; strand: number; direction: number }>;

const MAX_ROWS = 6;
const patternStates: readonly PatternState[] = [
  { name: '空纱架', description: '暖白经纱已张起，等待第一道纬线穿过。' },
  { name: '晨光底纬', description: '姜黄纬纱先落下，成为晨鸟腹部的第一层暖光。' },
  { name: '靛蓝翼根', description: '第一组综丝抬起，靛蓝翼根开始压进同一片织面。' },
  { name: '朱砂鸟喙', description: '三组综丝错峰交换，朱砂小喙在经纬交点显现。' },
  { name: '展翼弧线', description: '梭子折返，靛蓝色块沿翼缘向外舒展。' },
  { name: '尾羽与日轮', description: '姜黄日轮和朱砂尾羽接近完整，织面开始收束。' },
  { name: '晨鸟纹完整', description: '六道纬纱共同锁住晨鸟轮廓，可以保存这片织纹。' },
];

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;
const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const amount = clamp((value - edge0) / Math.max(.00001, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
};
const easeInOutCubic = (value: number): number => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

function requireElement<T extends Element>(selector: string, parent: ParentNode = document): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`WEAVE LIGHT FIELD is missing ${selector}.`);
  return element;
}

const root = document.documentElement;
const shell = requireElement<HTMLElement>('#app');
const canvas = requireElement<HTMLCanvasElement>('.weave-canvas');
const advanceButton = requireElement<HTMLButtonElement>('[data-advance]');
const saveButton = requireElement<HTMLButtonElement>('[data-save]');
const resetButton = requireElement<HTMLButtonElement>('[data-reset]');
const rowCount = requireElement<HTMLElement>('[data-row-count]');
const railCount = requireElement<HTMLElement>('[data-rail-count]');
const phaseLabel = requireElement<HTMLElement>('[data-phase-label]');
const patternName = requireElement<HTMLElement>('[data-pattern-name]');
const patternDescription = requireElement<HTMLElement>('[data-pattern-description]');
const railHint = requireElement<HTMLElement>('[data-rail-hint]');
const progressFill = requireElement<HTMLElement>('[data-progress-fill]');
const stepPips = Array.from(document.querySelectorAll<HTMLElement>('[data-step-pips] i'));
const liveStatus = requireElement<HTMLElement>('[data-live-status]');
const fallbackMessage = requireElement<HTMLElement>('[data-fallback-message]');
const fallbackReveal = requireElement<SVGRectElement>('[data-fallback-reveal]');
const fallbackShuttle = requireElement<SVGGraphicsElement>('[data-fallback-shuttle]');
const saveLabel = requireElement<HTMLElement>('span:first-child', saveButton);

if (stepPips.length !== MAX_ROWS) throw new Error('WEAVE LIGHT FIELD requires six progress pips.');

const params = new URLSearchParams(location.search);
const qualityValue = params.get('quality');
const quality: GeneratedQuality = qualityValue === 'high' || qualityValue === 'low' ? qualityValue : 'balanced';
const motionMode = params.get('motion');
const reducedMotion = motionMode === 'reduce'
  ? true
  : motionMode === 'full'
    ? false
    : matchMedia('(prefers-reduced-motion: reduce)').matches;
const visualRevision = params.get('revision') ?? 'r123-weave-light-field';
const forcedFallback = params.get('fallback') === '1';

let fallback = forcedFallback;
let phase: WeavePhase = reducedMotion || forcedFallback ? 'weaving' : 'opening';
let wovenRows = 0;
let saved = false;
let heroProgress = reducedMotion || forcedFallback ? 1 : 0;
let clothProgress = 0;
let ready = false;
let frames = 0;
let drawCalls = 0;
let triangles = 0;
let disposed = false;
let frameId = 0;
let lastFrameAt = performance.now();
const startedAt = lastFrameAt;
let throwStartedAt = -10000;
let shuttlePosition = -1;
let manualShuttlePosition = -1;
let heddleOffsets: [number, number, number] = [0, 0, 0];
let dragging = false;
let dragPointerId = -1;
let dragStartX = 0;
let dragDistance = 0;
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

let runtime: ReturnType<typeof createGeneratedThreeRuntime> | null = null;
let loomGroup: THREE.Group | null = null;
let frameGroup: THREE.Group | null = null;
let warpMesh: THREE.InstancedMesh | null = null;
let clothMaterial: THREE.ShaderMaterial | null = null;
let clothBeam: THREE.Mesh | null = null;
let warpBeam: THREE.Mesh | null = null;
let shuttleGroup: THREE.Group | null = null;
let shuttleSpoolMaterial: THREE.MeshPhysicalMaterial | null = null;
let shuttleTailGeometry: THREE.BufferGeometry | null = null;
let beaterGroup: THREE.Group | null = null;
let keyLight: THREE.DirectionalLight | null = null;
const heddleRigs: HeddleRig[] = [];
const weftCords: WeftCord[] = [];
const warpCount = quality === 'high' ? 54 : quality === 'balanced' ? 42 : 32;

function updateSemanticState(): void {
  const state = patternStates[wovenRows];
  const complete = wovenRows >= MAX_ROWS;
  root.dataset.phase = phase;
  root.dataset.weaveRows = String(wovenRows);
  root.dataset.saved = String(saved);
  shell.dataset.phase = phase;
  rowCount.textContent = `${String(wovenRows).padStart(2, '0')} / 06`;
  railCount.textContent = `${wovenRows} 梭`;
  patternName.textContent = state.name;
  patternDescription.textContent = state.description;
  phaseLabel.textContent = phase === 'opening'
    ? '装置正在展开'
    : phase === 'saved'
      ? '织纹已保存在本页'
      : complete
        ? '晨鸟纹已经完成'
        : wovenRows === 0
          ? '空经等待第一梭'
          : `第 ${wovenRows} 梭已落纬`;
  railHint.textContent = phase === 'saved'
    ? '完成态已锁定；重置后可以重新织造。'
    : complete
      ? '六梭已经形成晨鸟纹，现在可以保存。'
      : wovenRows === 0
        ? '点击场景、拖动梭子或使用空格键。'
        : '继续推进，综丝、梭子和织面会同步变化。';
  advanceButton.disabled = complete || saved;
  saveButton.disabled = !complete || saved;
  saveLabel.textContent = saved ? '织纹已保存' : '保存我的织纹';
  root.style.setProperty('--weave-progress', String(wovenRows / MAX_ROWS));
  progressFill.style.width = `${wovenRows / MAX_ROWS * 100}%`;
  stepPips.forEach((pip, index) => pip.classList.toggle('is-woven', index < wovenRows));
}

function updateFallbackVisuals(): void {
  const revealHeight = 248 * clothProgress;
  fallbackReveal.setAttribute('y', (486 - revealHeight).toFixed(2));
  fallbackReveal.setAttribute('height', revealHeight.toFixed(2));
  const fallbackX = (shuttlePosition + 1) * .5 * 500;
  fallbackShuttle.setAttribute('transform', `translate(${fallbackX.toFixed(2)} 0)`);
  root.style.setProperty('--heddle-a', `${(heddleOffsets[0] * 62).toFixed(2)}px`);
  root.style.setProperty('--heddle-b', `${(heddleOffsets[1] * 62).toFixed(2)}px`);
  root.style.setProperty('--heddle-c', `${(heddleOffsets[2] * 62).toFixed(2)}px`);
}

function announce(message: string): void {
  liveStatus.textContent = message;
}

function advance(): void {
  if (saved || wovenRows >= MAX_ROWS) return;
  if (heroProgress < 1) heroProgress = 1;
  wovenRows += 1;
  phase = wovenRows >= MAX_ROWS ? 'complete' : 'weaving';
  throwStartedAt = performance.now();
  manualShuttlePosition = wovenRows % 2 === 1 ? -1 : 1;
  updateSemanticState();
  announce(wovenRows >= MAX_ROWS
    ? '第六梭已经落下，晨鸟纹样完整，可以保存我的织纹。'
    : `第 ${wovenRows} 梭已经穿过，${patternStates[wovenRows].name}正在同一片织面上形成。`);
}

function save(): void {
  if (wovenRows < MAX_ROWS || saved) {
    if (wovenRows < MAX_ROWS) announce(`还需要 ${MAX_ROWS - wovenRows} 梭才能完成晨鸟纹。`);
    return;
  }
  saved = true;
  phase = 'saved';
  updateSemanticState();
  announce('晨鸟织纹已保存在本页。这是空间织造教学演示，不代表真实织机参数。');
}

function reset(): void {
  wovenRows = 0;
  saved = false;
  phase = 'weaving';
  clothProgress = 0;
  throwStartedAt = -10000;
  shuttlePosition = -1;
  manualShuttlePosition = -1;
  heddleOffsets = [0, 0, 0];
  updateSemanticState();
  updateFallbackVisuals();
  announce('织面已回到空经状态，可以重新推进第一梭。');
}

function makeClothTexture(size: number): THREE.CanvasTexture {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = Math.round(size * .52);
  const context = textureCanvas.getContext('2d');
  if (!context) return new THREE.CanvasTexture(textureCanvas);

  const width = textureCanvas.width;
  const height = textureCanvas.height;
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#f7e7c8');
  background.addColorStop(.52, '#ecd3a7');
  background.addColorStop(1, '#dfbd88');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = .52;
  for (let x = 0; x < width; x += 11) {
    context.strokeStyle = x % 33 === 0 ? '#fff9e9' : '#bd925e';
    context.lineWidth = x % 33 === 0 ? 2.2 : 1;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + 2, height * .32, x - 2, height * .7, x + 1, height);
    context.stroke();
  }
  context.globalAlpha = .42;
  for (let y = 2; y < height; y += 7) {
    context.strokeStyle = y % 21 === 2 ? '#fff4d9' : '#9c7044';
    context.lineWidth = y % 21 === 2 ? 2 : .8;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(width * .28, y + 2, width * .72, y - 2, width, y + 1);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.save();
  context.translate(width * .03, height * .02);
  context.fillStyle = '#d9a736';
  context.beginPath();
  context.arc(width * .78, height * .22, height * .13, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#244f7c';
  context.beginPath();
  context.moveTo(width * .28, height * .65);
  context.bezierCurveTo(width * .37, height * .3, width * .54, height * .22, width * .67, height * .52);
  context.bezierCurveTo(width * .58, height * .48, width * .5, height * .54, width * .45, height * .7);
  context.bezierCurveTo(width * .39, height * .82, width * .32, height * .78, width * .28, height * .65);
  context.fill();

  context.fillStyle = '#326592';
  context.beginPath();
  context.moveTo(width * .42, height * .58);
  context.bezierCurveTo(width * .43, height * .28, width * .54, height * .12, width * .68, height * .28);
  context.bezierCurveTo(width * .59, height * .33, width * .55, height * .5, width * .54, height * .65);
  context.closePath();
  context.fill();

  context.fillStyle = '#d8a33c';
  context.beginPath();
  context.ellipse(width * .62, height * .64, width * .13, height * .12, -.15, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(width * .72, height * .58, height * .075, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#d95037';
  context.beginPath();
  context.moveTo(width * .755, height * .57);
  context.lineTo(width * .82, height * .605);
  context.lineTo(width * .755, height * .63);
  context.closePath();
  context.fill();
  context.lineCap = 'round';
  context.lineWidth = Math.max(10, size * .015);
  context.strokeStyle = '#c84332';
  context.beginPath();
  context.moveTo(width * .35, height * .7);
  context.lineTo(width * .21, height * .86);
  context.moveTo(width * .39, height * .73);
  context.lineTo(width * .3, height * .93);
  context.stroke();

  context.fillStyle = '#fff8df';
  context.beginPath();
  context.arc(width * .735, height * .565, height * .015, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#213b4b';
  context.beginPath();
  context.arc(width * .738, height * .565, height * .007, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.globalAlpha = .26;
  let seed = 2917;
  for (let index = 0; index < 390; index += 1) {
    seed = seed * 48271 % 2147483647;
    const x = seed / 2147483647 * width;
    seed = seed * 48271 % 2147483647;
    const y = seed / 2147483647 * height;
    context.fillStyle = index % 3 === 0 ? '#fff9e9' : '#6e563d';
    context.fillRect(x, y, index % 5 === 0 ? 2 : 1, 1);
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const clothVertexShader = `
  uniform float uTime;
  uniform float uMotion;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float wave = sin(uv.x * 18.0 + uTime * .42) * sin(uv.y * 11.0 - uTime * .27);
    float edge = smoothstep(0.0, .18, uv.x) * smoothstep(0.0, .18, 1.0 - uv.x);
    p.z += wave * .018 * uMotion * edge;
    p.x += sin(uv.y * 19.0 + uTime * .18) * .004 * uMotion;
    vShade = .91 + wave * .06;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const clothFragmentShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uReveal;
  uniform float uSaved;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    float revealed = 1.0 - smoothstep(uReveal - .012, uReveal + .018, vUv.y);
    revealed *= smoothstep(.001, .026, uReveal);
    float edge = smoothstep(0.0, .012, vUv.x) * smoothstep(0.0, .012, 1.0 - vUv.x);
    vec4 texel = texture2D(uTexture, vUv);
    float thread = sin(vUv.x * 1050.0) * sin(vUv.y * 560.0) * .025;
    vec3 color = texel.rgb * (vShade + thread) + uSaved * vec3(.028, .018, .002);
    float alpha = revealed * edge;
    if (alpha < .015) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function initializeScene(): void {
  if (forcedFallback) {
    useFallback('基础织造视图已按请求启用');
    return;
  }

  try {
    runtime = createGeneratedThreeRuntime(canvas, {
      quality,
      camera: { fov: 35, near: .1, far: 60 },
      clearColor: 0xf4ecdb,
      clearAlpha: 0,
      toneMappingExposure: 1.08,
      maxDpr: 1.8,
      lowQualityMaxDpr: 1,
    });
    runtime.renderer.shadowMap.enabled = quality !== 'low';
    runtime.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const sceneRuntime = runtime;
    loomGroup = new THREE.Group();
    frameGroup = new THREE.Group();
    loomGroup.add(frameGroup);
    sceneRuntime.scene.add(loomGroup);

    const woodMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xa97042, roughness: .58, metalness: .03, clearcoat: .18, clearcoatRoughness: .64 }));
    const woodEdgeMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0x6f452c, roughness: .7, metalness: .02 }));
    const metalMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0x88938b, roughness: .32, metalness: .72, clearcoat: .2 }));
    const warpMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xfff0cf, roughness: .8, metalness: 0, sheen: .72, sheenColor: new THREE.Color(0xffe3ae), sheenRoughness: .86 }));
    const boxGeometry = sceneRuntime.geometry(new THREE.BoxGeometry(1, 1, 1));
    const cylinderGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(1, 1, 1, quality === 'low' ? 12 : 24));

    const addBox = (parent: THREE.Group, scale: readonly [number, number, number], position: readonly [number, number, number], material: THREE.Material): THREE.Mesh => {
      const mesh = new THREE.Mesh(boxGeometry, material);
      mesh.scale.set(...scale);
      mesh.position.set(...position);
      mesh.castShadow = quality !== 'low';
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    addBox(frameGroup, [.24, 4.75, .32], [-3.48, 0, -.08], woodMaterial);
    addBox(frameGroup, [.24, 4.75, .32], [3.48, 0, -.08], woodMaterial);
    addBox(frameGroup, [7.16, .22, .34], [0, 2.31, -.08], woodMaterial);
    addBox(frameGroup, [7.16, .2, .34], [0, -2.31, -.08], woodMaterial);
    addBox(frameGroup, [.82, .16, 1.08], [-3.48, -2.45, .1], woodEdgeMaterial);
    addBox(frameGroup, [.82, .16, 1.08], [3.48, -2.45, .1], woodEdgeMaterial);

    warpBeam = new THREE.Mesh(cylinderGeometry, metalMaterial);
    warpBeam.scale.set(.27, 3.22, .27);
    warpBeam.rotation.z = Math.PI / 2;
    warpBeam.position.set(0, 1.96, -.15);
    warpBeam.castShadow = quality !== 'low';
    frameGroup.add(warpBeam);

    clothBeam = new THREE.Mesh(cylinderGeometry, woodEdgeMaterial);
    clothBeam.scale.set(.31, 3.22, .31);
    clothBeam.rotation.z = Math.PI / 2;
    clothBeam.position.set(0, -1.99, .02);
    clothBeam.castShadow = quality !== 'low';
    frameGroup.add(clothBeam);

    const warpGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.009, .011, 1, quality === 'low' ? 5 : 8));
    warpMesh = new THREE.InstancedMesh(warpGeometry, warpMaterial, warpCount);
    warpMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    warpMesh.position.z = -.01;
    loomGroup.add(warpMesh);

    const heddleColors = [0x87928b, 0xb47c48, 0x465f7f] as const;
    const torusGeometry = sceneRuntime.geometry(new THREE.TorusGeometry(.048, .012, quality === 'low' ? 5 : 8, quality === 'low' ? 10 : 18));
    for (let rigIndex = 0; rigIndex < 3; rigIndex += 1) {
      const group = new THREE.Group();
      group.position.z = .23 + rigIndex * .16;
      const rigMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: heddleColors[rigIndex], roughness: .3, metalness: .68 }));
      addBox(group, [6.15, .06, .08], [0, .46, 0], rigMaterial);
      addBox(group, [6.15, .055, .07], [0, -.39, 0], rigMaterial);
      const ringCount = Math.ceil(warpCount / 3);
      const rings = new THREE.InstancedMesh(torusGeometry, rigMaterial, ringCount);
      const dummy = new THREE.Object3D();
      for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
        const warpIndex = ringIndex * 3 + rigIndex;
        const x = lerp(-3.08, 3.08, clamp(warpIndex / Math.max(1, warpCount - 1)));
        dummy.position.set(x, .02, 0);
        dummy.updateMatrix();
        rings.setMatrixAt(ringIndex, dummy.matrix);
      }
      rings.instanceMatrix.needsUpdate = true;
      group.add(rings);
      loomGroup.add(group);
      heddleRigs.push({ group, baseY: (rigIndex - 1) * .04 });
    }

    beaterGroup = new THREE.Group();
    beaterGroup.position.set(0, .05, .78);
    addBox(beaterGroup, [6.4, .07, .09], [0, .61, 0], metalMaterial);
    addBox(beaterGroup, [6.4, .07, .09], [0, -.62, 0], metalMaterial);
    const slatGeometry = sceneRuntime.geometry(new THREE.BoxGeometry(.018, 1.18, .025));
    const slats = new THREE.InstancedMesh(slatGeometry, metalMaterial, quality === 'low' ? 24 : 36);
    const slatDummy = new THREE.Object3D();
    for (let index = 0; index < slats.count; index += 1) {
      slatDummy.position.set(lerp(-3.05, 3.05, index / Math.max(1, slats.count - 1)), 0, 0);
      slatDummy.updateMatrix();
      slats.setMatrixAt(index, slatDummy.matrix);
    }
    slats.instanceMatrix.needsUpdate = true;
    beaterGroup.add(slats);
    loomGroup.add(beaterGroup);

    const clothTexture = sceneRuntime.texture(makeClothTexture(quality === 'low' ? 512 : 1024));
    clothTexture.anisotropy = Math.min(8, sceneRuntime.renderer.capabilities.getMaxAnisotropy());
    const clothGeometry = sceneRuntime.geometry(new THREE.PlaneGeometry(6.08, 2.55, quality === 'low' ? 24 : 48, quality === 'low' ? 12 : 24));
    clothMaterial = sceneRuntime.material(new THREE.ShaderMaterial({
      vertexShader: clothVertexShader,
      fragmentShader: clothFragmentShader,
      uniforms: {
        uTexture: { value: clothTexture },
        uReveal: { value: 0 },
        uSaved: { value: 0 },
        uTime: { value: 0 },
        uMotion: { value: reducedMotion ? 0 : 1 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    }));
    const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
    cloth.position.set(0, -.54, .17);
    cloth.castShadow = false;
    cloth.receiveShadow = true;
    loomGroup.add(cloth);

    const cordColors = [0xd7a436, 0x274f7c, 0xd95337, 0x315f8c, 0xd3a13b, 0xc94735] as const;
    const cordGeometry = sceneRuntime.geometry(new THREE.CylinderGeometry(.012, .012, 1, quality === 'low' ? 5 : 8));
    for (let row = 0; row < MAX_ROWS; row += 1) {
      const cordMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: cordColors[row], roughness: .7, sheen: .8, sheenColor: new THREE.Color(cordColors[row]) }));
      for (let strand = 0; strand < 3; strand += 1) {
        const mesh = new THREE.Mesh(cordGeometry, cordMaterial);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(0, -1.62 + (row + .5) * (2.25 / MAX_ROWS) + (strand - 1) * .025, .225 + strand * .003);
        mesh.scale.set(1, .001, 1);
        loomGroup.add(mesh);
        weftCords.push({ mesh, row, strand, direction: row % 2 === 0 ? 1 : -1 });
      }
    }

    shuttleGroup = new THREE.Group();
    const shuttleShape = new THREE.Shape();
    shuttleShape.moveTo(-.78, 0);
    shuttleShape.bezierCurveTo(-.56, .24, .48, .24, .78, 0);
    shuttleShape.bezierCurveTo(.48, -.24, -.56, -.24, -.78, 0);
    const shuttleGeometry = sceneRuntime.geometry(new THREE.ExtrudeGeometry(shuttleShape, { depth: .18, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: quality === 'low' ? 2 : 4, curveSegments: quality === 'low' ? 8 : 16 }));
    shuttleGeometry.center();
    const shuttleMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: 0xc94c36, roughness: .46, clearcoat: .3, clearcoatRoughness: .42 }));
    const shuttleBody = new THREE.Mesh(shuttleGeometry, shuttleMaterial);
    shuttleBody.castShadow = quality !== 'low';
    shuttleGroup.add(shuttleBody);
    shuttleSpoolMaterial = sceneRuntime.material(new THREE.MeshPhysicalMaterial({ color: cordColors[0], roughness: .72, sheen: .8 }));
    const spool = new THREE.Mesh(sceneRuntime.geometry(new THREE.CylinderGeometry(.09, .09, .58, 14)), shuttleSpoolMaterial);
    spool.rotation.z = Math.PI / 2;
    spool.position.z = .12;
    shuttleGroup.add(spool);
    shuttleGroup.position.set(-3.55, -1.43, 1.02);
    loomGroup.add(shuttleGroup);

    shuttleTailGeometry = sceneRuntime.geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]));
    const tailMaterial = sceneRuntime.material(new THREE.LineBasicMaterial({ color: 0xc94c36, transparent: true, opacity: .68 }));
    const shuttleTail = new THREE.Line(shuttleTailGeometry, tailMaterial);
    loomGroup.add(shuttleTail);

    const ground = new THREE.Mesh(
      sceneRuntime.geometry(new THREE.PlaneGeometry(22, 17)),
      sceneRuntime.material(new THREE.ShadowMaterial({ color: 0x765331, opacity: quality === 'low' ? .08 : .15, transparent: true })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -2.55, 1.1);
    ground.receiveShadow = quality !== 'low';
    sceneRuntime.scene.add(ground);

    sceneRuntime.scene.add(new THREE.HemisphereLight(0xfff8df, 0xa3815f, 2.7));
    keyLight = new THREE.DirectionalLight(0xffe2a4, 4.4);
    keyLight.position.set(4.8, 7.6, 6.8);
    keyLight.castShadow = quality !== 'low';
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.set(quality === 'high' ? 1536 : 1024, quality === 'high' ? 1536 : 1024);
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -.0004;
    }
    sceneRuntime.scene.add(keyLight);
    const indigoFill = new THREE.DirectionalLight(0x91b2cb, 1.28);
    indigoFill.position.set(-5, 2.4, 4.2);
    sceneRuntime.scene.add(indigoFill);
    const warmBounce = new THREE.DirectionalLight(0xf1a664, .78);
    warmBounce.position.set(2, -2, 3.5);
    sceneRuntime.scene.add(warmBounce);
  } catch (error) {
    console.warn('[weave-light-field] WebGL unavailable; using complete semantic fallback.', error);
    runtime?.dispose();
    runtime = null;
    useFallback();
  }
}

function useFallback(message = '3D 纤维装置暂不可用，基础织造视图继续运行'): void {
  fallback = true;
  root.dataset.fallback = 'true';
  fallbackMessage.hidden = false;
  const strong = fallbackMessage.querySelector('strong');
  if (strong) strong.textContent = message;
  heroProgress = 1;
  if (phase === 'opening') phase = 'weaving';
  ready = true;
  root.dataset.weaveReady = 'true';
  updateSemanticState();
}

function resize(): void {
  if (!runtime || !loomGroup) return;
  runtime.resize({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio || 1 });
  const mobile = innerWidth <= 860;
  loomGroup.scale.setScalar(mobile ? .68 : .93);
  loomGroup.position.set(mobile ? 0 : .22, mobile ? .27 : -.03, 0);
  runtime.camera.position.set(mobile ? 0 : pointer.x * .12, mobile ? .42 : .3 - pointer.y * .05, mobile ? 15.7 : 10.25);
  runtime.camera.lookAt(0, mobile ? -.04 : -.05, 0);
}

function updateWarpInstances(): void {
  if (!warpMesh) return;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < warpCount; index += 1) {
    const staggerStart = .12 + index / Math.max(1, warpCount - 1) * .15;
    const reveal = smoothstep(staggerStart, .58, heroProgress);
    dummy.position.set(lerp(-3.08, 3.08, index / Math.max(1, warpCount - 1)), -.02, .02);
    dummy.scale.set(1, Math.max(.001, 3.86 * reveal), 1);
    dummy.updateMatrix();
    warpMesh.setMatrixAt(index, dummy.matrix);
  }
  warpMesh.instanceMatrix.needsUpdate = true;
}

function updateThreeScene(now: number, throwProgress: number): void {
  if (!runtime || !loomGroup || !frameGroup || !clothMaterial || !clothBeam || !warpBeam || !shuttleGroup || !shuttleSpoolMaterial || !beaterGroup) return;
  const elapsed = (now - startedAt) / 1000;
  const frameReveal = smoothstep(0, .26, heroProgress);
  const mechanismReveal = smoothstep(.28, .74, heroProgress);
  const shuttleReveal = smoothstep(.58, .93, heroProgress);
  frameGroup.scale.set(Math.max(.02, frameReveal), lerp(.86, 1, frameReveal), 1);
  warpBeam.rotation.x = clothProgress * .34;
  clothBeam.rotation.x = -clothProgress * 1.45;
  updateWarpInstances();

  heddleRigs.forEach((rig, index) => {
    rig.group.visible = heroProgress > .25;
    rig.group.position.y = heddleOffsets[index] + lerp(index % 2 === 0 ? .86 : -.86, rig.baseY, mechanismReveal);
  });
  beaterGroup.visible = heroProgress > .36;
  beaterGroup.rotation.x = (reducedMotion ? 0 : Math.sin(Math.PI * throwProgress) * -.2) + lerp(.38, 0, mechanismReveal);

  shuttleGroup.visible = heroProgress > .54;
  const weaveY = -1.5 + Math.max(0, wovenRows - .5) * (2.22 / MAX_ROWS);
  shuttleGroup.position.set(shuttlePosition * 3.45, weaveY, 1.02);
  shuttleGroup.scale.setScalar(Math.max(.04, shuttleReveal));
  shuttleGroup.rotation.z = shuttlePosition * -.035;
  const cordColors = [0xd7a436, 0xd7a436, 0x274f7c, 0xd95337, 0x315f8c, 0xd3a13b, 0xc94735] as const;
  shuttleSpoolMaterial.color.setHex(cordColors[wovenRows]);

  if (shuttleTailGeometry) {
    const positions = shuttleTailGeometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, shuttleGroup.position.x, shuttleGroup.position.y, shuttleGroup.position.z - .06);
    positions.setXYZ(1, shuttlePosition > 0 ? 3.02 : -3.02, weaveY, .25);
    positions.needsUpdate = true;
  }

  weftCords.forEach((cord) => {
    const rowStart = cord.row / MAX_ROWS;
    const localReveal = clamp((clothProgress - rowStart) * MAX_ROWS);
    const width = 6.04 * localReveal;
    cord.mesh.visible = localReveal > .002;
    cord.mesh.scale.y = Math.max(.001, width);
    cord.mesh.position.x = cord.direction > 0 ? -3.02 + width / 2 : 3.02 - width / 2;
    cord.mesh.position.z = .225 + cord.strand * .003;
  });

  clothMaterial.uniforms.uReveal.value = clothProgress;
  clothMaterial.uniforms.uSaved.value = lerp(clothMaterial.uniforms.uSaved.value as number, saved ? 1 : 0, reducedMotion ? 1 : .08);
  clothMaterial.uniforms.uTime.value = elapsed;
  clothMaterial.uniforms.uMotion.value = reducedMotion ? 0 : 1;
  if (keyLight) keyLight.intensity = lerp(keyLight.intensity, saved ? 5.05 : 4.4, reducedMotion ? 1 : .06);

  const mobile = innerWidth <= 860;
  if (!mobile) {
    runtime.camera.position.x = pointer.x * .14;
    runtime.camera.position.y = .3 - pointer.y * .06;
    runtime.camera.lookAt(.06, -.05, 0);
  }
  runtime.render();
  drawCalls = runtime.renderer.info.render.calls;
  triangles = runtime.renderer.info.render.triangles;
}

function tick(now: number): void {
  if (disposed) return;
  const delta = Math.min(.05, Math.max(.001, (now - lastFrameAt) / 1000));
  lastFrameAt = now;
  if (!reducedMotion && !fallback && heroProgress < 1) heroProgress = clamp((now - startedAt) / 2300);
  else if (reducedMotion || fallback) heroProgress = 1;
  if (heroProgress >= 1 && phase === 'opening') {
    phase = 'weaving';
    updateSemanticState();
    announce('经纱、三组综丝、梭子与卷布轴已经稳定，可以推进第一梭。');
  }

  const pointerSmoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
  pointer.x = lerp(pointer.x, pointer.targetX, pointerSmoothing);
  pointer.y = lerp(pointer.y, pointer.targetY, pointerSmoothing);
  const clothTarget = wovenRows / MAX_ROWS;
  clothProgress = reducedMotion ? clothTarget : lerp(clothProgress, clothTarget, 1 - Math.exp(-delta * 5.2));

  const rawThrowProgress = clamp((now - throwStartedAt) / (reducedMotion ? 1 : 720));
  const throwProgress = easeInOutCubic(rawThrowProgress);
  const direction = wovenRows % 2 === 1 ? 1 : -1;
  if (dragging) {
    shuttlePosition = manualShuttlePosition;
  } else if (rawThrowProgress < 1 && wovenRows > 0) {
    shuttlePosition = lerp(-direction, direction, throwProgress);
  } else {
    shuttlePosition = wovenRows === 0 ? -1 : direction;
  }

  heddleOffsets = [0, 1, 2].map((index) => {
    const base = ((wovenRows + index) % 3 - 1) * .09;
    const local = clamp(rawThrowProgress * 1.34 - index * .13);
    const pulse = Math.sin(local * Math.PI) * (index === 1 ? -.33 : .3);
    return base + (rawThrowProgress < 1 ? pulse : 0);
  }) as [number, number, number];

  updateThreeScene(now, throwProgress);
  updateFallbackVisuals();
  frames += 1;
  if (!ready && frames > 2) {
    ready = true;
    root.dataset.weaveReady = 'true';
  }
  frameId = requestAnimationFrame(tick);
}

function snapshot(): WeaveLightSnapshot {
  return {
    ready,
    phase,
    step: wovenRows,
    row: wovenRows,
    wovenRows,
    maxRows: MAX_ROWS,
    completed: wovenRows >= MAX_ROWS,
    saved,
    pattern: patternStates[wovenRows].name,
    heroProgress: Number(heroProgress.toFixed(3)),
    openingProgress: Number(heroProgress.toFixed(3)),
    clothProgress: Number(clothProgress.toFixed(3)),
    shuttlePosition: Number(shuttlePosition.toFixed(3)),
    heddleOffsets: heddleOffsets.map((value) => Number(value.toFixed(3))) as [number, number, number],
    warpCount,
    visibleWeftCords: Math.round(clothProgress * MAX_ROWS * 3),
    frames: fallback ? 0 : frames,
    drawCalls,
    triangles,
    fallback,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    quality,
    revision: visualRevision,
  };
}

function setPointerFromEvent(event: PointerEvent): void {
  pointer.targetX = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  pointer.targetY = clamp(-(event.clientY / Math.max(1, innerHeight) * 2 - 1), -1, 1);
}

function onCanvasPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  setPointerFromEvent(event);
  dragging = true;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragDistance = 0;
  manualShuttlePosition = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
  canvas.setPointerCapture(event.pointerId);
}

function onCanvasPointerMove(event: PointerEvent): void {
  setPointerFromEvent(event);
  if (!dragging || event.pointerId !== dragPointerId) return;
  dragDistance = Math.max(dragDistance, Math.abs(event.clientX - dragStartX));
  manualShuttlePosition = clamp(event.clientX / Math.max(1, innerWidth) * 2 - 1, -1, 1);
}

function onCanvasPointerUp(event: PointerEvent): void {
  if (!dragging || event.pointerId !== dragPointerId) return;
  dragging = false;
  dragPointerId = -1;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  advance();
}

function onGlobalPointerMove(event: PointerEvent): void {
  setPointerFromEvent(event);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
  if (event.key === ' ' || event.code === 'Space' || event.key === 'ArrowRight') {
    event.preventDefault();
    advance();
  }
}

function onContextLost(event: Event): void {
  event.preventDefault();
  runtime?.dispose();
  runtime = null;
  useFallback('3D 纤维装置已暂停，基础织造视图继续运行');
}

function dispose(): void {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  advanceButton.removeEventListener('click', advance);
  saveButton.removeEventListener('click', save);
  resetButton.removeEventListener('click', reset);
  canvas.removeEventListener('pointerdown', onCanvasPointerDown);
  canvas.removeEventListener('pointermove', onCanvasPointerMove);
  canvas.removeEventListener('pointerup', onCanvasPointerUp);
  canvas.removeEventListener('pointercancel', onCanvasPointerUp);
  canvas.removeEventListener('webglcontextlost', onContextLost);
  removeEventListener('pointermove', onGlobalPointerMove);
  removeEventListener('keydown', onKeydown);
  removeEventListener('resize', resize);
  runtime?.dispose();
  runtime = null;
  delete window.__weaveLightField;
}

advanceButton.addEventListener('click', advance);
saveButton.addEventListener('click', save);
resetButton.addEventListener('click', reset);
canvas.addEventListener('pointerdown', onCanvasPointerDown);
canvas.addEventListener('pointermove', onCanvasPointerMove);
canvas.addEventListener('pointerup', onCanvasPointerUp);
canvas.addEventListener('pointercancel', onCanvasPointerUp);
canvas.addEventListener('webglcontextlost', onContextLost);
addEventListener('pointermove', onGlobalPointerMove, { passive: true });
addEventListener('keydown', onKeydown);
addEventListener('resize', resize, { passive: true });

updateSemanticState();
initializeScene();
resize();
updateFallbackVisuals();
window.__weaveLightField = { snapshot, advance, save, reset };
frameId = requestAnimationFrame(tick);
addEventListener('pagehide', dispose, { once: true });
