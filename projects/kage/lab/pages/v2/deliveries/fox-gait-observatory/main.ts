import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type GaitId = 'survey' | 'walk' | 'run';

interface GaitDefinition {
  id: GaitId;
  index: string;
  clip: 'Survey' | 'Walk' | 'Run';
  kicker: string;
  title: string;
  description: string;
  rhythm: string;
  camera: THREE.Vector3Tuple;
  target: THREE.Vector3Tuple;
  footprintSpacing: number;
  footprintSpread: number;
  sample: number;
}

const GAITS: Record<GaitId, GaitDefinition> = {
  survey: {
    id: 'survey', index: '01', clip: 'Survey', kicker: 'LISTEN / 侦察',
    title: '先让耳朵抵达。',
    description: '身体几乎停住，头部和耳朵先扫描周围。观察重心如何留在四足之间。',
    rhythm: '短距 · 停驻', camera: [4.8, 2.3, 6.6], target: [0, 1.05, 0],
    footprintSpacing: 0.58, footprintSpread: 0.23, sample: 0.24
  },
  walk: {
    id: 'walk', index: '02', clip: 'Walk', kicker: 'MEASURE / 行走',
    title: '让路径变得可读。',
    description: '步伐稳定交替，背线保持平衡。沿侧面观察前后足如何接续同一条移动方向。',
    rhythm: '等距 · 交替', camera: [5.7, 1.72, 3.8], target: [0, 0.92, 0],
    footprintSpacing: 0.82, footprintSpread: 0.27, sample: 0.38
  },
  run: {
    id: 'run', index: '03', clip: 'Run', kicker: 'RELEASE / 奔跑',
    title: '把身体交给前方。',
    description: '步幅被拉开，躯干明显伸缩。靠近地面观察足迹间隔如何随动作循环一起放大。',
    rhythm: '长距 · 伸展', camera: [4.35, 1.42, 4.45], target: [0.2, 0.78, -0.15],
    footprintSpacing: 1.18, footprintSpread: 0.31, sample: 0.2
  }
};

const body = document.body;
const canvas = required<HTMLCanvasElement>('#scene-canvas');
const loading = required<HTMLElement>('#loading');
const loadingProgress = required<HTMLElement>('#loading-progress');
const fallbackCard = required<HTMLElement>('#fallback-card');
const fallbackReason = required<HTMLElement>('#fallback-reason');
const sceneStatus = required<HTMLElement>('#scene-status');
const gaitIndex = required<HTMLElement>('#gait-index');
const gaitKicker = required<HTMLElement>('#gait-kicker');
const gaitTitle = required<HTMLElement>('#gait-title');
const gaitDescription = required<HTMLElement>('#gait-description');
const clipName = required<HTMLElement>('#clip-name');
const trailRhythm = required<HTMLElement>('#trail-rhythm');
const resetViewButton = required<HTMLButtonElement>('#reset-view');
const saveButton = required<HTMLButtonElement>('#save-card');
const gaitButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-gait]')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(window.location.search);
const forceFallback = params.get('fallback') === '1' || params.get('forceFallback') === '1';
const storageKey = 'r137-fox-gait-observation-card';

let activeGait: GaitId = parseGait(localStorage.getItem(storageKey)) ?? 'survey';
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let mixer: THREE.AnimationMixer | null = null;
let fox: THREE.Object3D | null = null;
let trail: THREE.Group | null = null;
let raf = 0;
let lastTime = performance.now();
let cameraMove: {
  startAt: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
} | null = null;
const actions = new Map<GaitId, THREE.AnimationAction>();

const debugState = {
  get activeGait() { return activeGait; },
  get modelLoaded() { return Boolean(fox); },
  get fallback() { return body.dataset.fallback === 'true'; },
  get clip() { return GAITS[activeGait].clip; },
  get saved() { return body.dataset.saved === 'true'; }
};
(window as Window & { __FOX_OBSERVATORY__?: typeof debugState }).__FOX_OBSERVATORY__ = debugState;

bindSemanticControls();
updateSemanticState(activeGait, false);

if (forceFallback) {
  activateFallback('已按验证参数停用三维增强；以下为同一任务的语义回退。');
} else {
  initialiseScene().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : '未知模型载入错误';
    activateFallback(`三维场景未能建立：${message}`);
  });
}

async function initialiseScene(): Promise<void> {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.45 : 1.85));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc7d5d3, 0.046);

  camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.fromArray(GAITS[activeGait].camera);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.055;
  controls.target.fromArray(GAITS[activeGait].target);
  controls.minDistance = 3.4;
  controls.maxDistance = 10;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.enablePan = false;
  controls.addEventListener('start', () => { cameraMove = null; });

  addLighting(scene);
  addSnowField(scene);
  trail = addFootprintTrail(scene);

  const loader = new GLTFLoader();
  const assetUrl = new URL('./assets/Fox.glb', import.meta.url).href;
  const gltf = await new Promise<Awaited<ReturnType<typeof loader.loadAsync>>>((resolve, reject) => {
    loader.load(assetUrl, resolve, (event) => {
      const percent = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0;
      loadingProgress.textContent = `读取模型 · ${percent}%`;
    }, reject);
  });

  fox = gltf.scene;
  prepareFox(fox);
  scene.add(fox);
  mixer = new THREE.AnimationMixer(fox);
  for (const gait of Object.values(GAITS)) {
    const clip = THREE.AnimationClip.findByName(gltf.animations, gait.clip);
    if (!clip) throw new Error(`模型缺少 ${gait.clip} 动画`);
    actions.set(gait.id, mixer.clipAction(clip));
  }

  body.dataset.modelLoaded = 'true';
  body.dataset.sceneReady = 'true';
  loading.hidden = true;
  sceneStatus.textContent = '赤狐三维模型已载入。可选择侦察、行走或奔跑，并拖拽环绕观察。';
  setGait(activeGait, false);
  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    activateFallback('WebGL 上下文已中断，已切换到语义观察卡。');
  }, { once: true });
  lastTime = performance.now();
  raf = requestAnimationFrame(render);
}

function addLighting(targetScene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xf8f3da, 0x516d70, 2.35);
  targetScene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffecd0, 4.3);
  sun.position.set(-5, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.bias = -0.00025;
  targetScene.add(sun);

  const edge = new THREE.DirectionalLight(0xa8d2d6, 2.15);
  edge.position.set(7, 4, -5);
  targetScene.add(edge);
}

function addSnowField(targetScene: THREE.Scene): void {
  const texture = createSnowTexture();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(28, 128),
    new THREE.MeshStandardMaterial({ map: texture, color: 0xdce6e3, roughness: 0.98, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  targetScene.add(ground);

  for (let index = 0; index < 5; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.4 + index * 1.25, 3.42 + index * 1.25, 160, 1, Math.PI * 0.08, Math.PI * 1.45),
      new THREE.MeshBasicMaterial({ color: 0x6f8f8e, transparent: true, opacity: 0.075, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = -0.38;
    ring.position.y = 0.012 + index * 0.001;
    targetScene.add(ring);
  }

  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 72),
    new THREE.MeshBasicMaterial({ color: 0xd8895d, transparent: true, opacity: 0.08, depthWrite: false })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(0, 0.018, 0);
  targetScene.add(marker);
}

function createSnowTexture(): THREE.CanvasTexture {
  const source = document.createElement('canvas');
  source.width = 512;
  source.height = 512;
  const context = source.getContext('2d');
  if (!context) return new THREE.CanvasTexture(source);
  const gradient = context.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#eef2ec');
  gradient.addColorStop(0.52, '#d5e0de');
  gradient.addColorStop(1, '#c3d1d0');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  let seed = 137;
  for (let index = 0; index < 1150; index += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = (seed / 2147483647) * 512;
    seed = (seed * 16807) % 2147483647;
    const y = (seed / 2147483647) * 512;
    seed = (seed * 16807) % 2147483647;
    const alpha = 0.035 + (seed / 2147483647) * 0.055;
    context.fillStyle = `rgba(82, 106, 105, ${alpha})`;
    context.fillRect(x, y, 1.25, 1.25);
  }
  return new THREE.CanvasTexture(source);
}

function addFootprintTrail(targetScene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.CircleGeometry(0.095, 18);
  geometry.scale(0.72, 1.12, 1);
  for (let index = 0; index < 12; index += 1) {
    const material = new THREE.MeshBasicMaterial({ color: 0x315351, transparent: true, opacity: 0.18, depthWrite: false });
    const print = new THREE.Mesh(geometry, material);
    print.rotation.x = -Math.PI / 2;
    print.position.y = 0.028;
    print.userData.order = index;
    group.add(print);
  }
  group.rotation.y = -0.34;
  group.position.set(-1.8, 0, -1.7);
  targetScene.add(group);
  return group;
}

function prepareFox(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if ('map' in material && material.map instanceof THREE.Texture) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1;
      }
    }
  });
  root.updateMatrixWorld(true);
  const initial = new THREE.Box3().setFromObject(root);
  const size = initial.getSize(new THREE.Vector3());
  const scale = 2.35 / Math.max(size.y, 0.001);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const centre = fitted.getCenter(new THREE.Vector3());
  root.position.x -= centre.x;
  root.position.z -= centre.z;
  root.position.y -= fitted.min.y;
  root.rotation.y = -0.34;
}

function bindSemanticControls(): void {
  gaitButtons.forEach((button) => {
    button.addEventListener('click', () => setGait(parseGait(button.dataset.gait) ?? 'survey', true));
  });
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const order: GaitId[] = ['survey', 'walk', 'run'];
    if (event.key === '1') return setGait('survey', true);
    if (event.key === '2') return setGait('walk', true);
    if (event.key === '3') return setGait('run', true);
    const current = order.indexOf(activeGait);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setGait(order[Math.min(order.length - 1, current + 1)], true);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setGait(order[Math.max(0, current - 1)], true);
    }
  });
  resetViewButton.addEventListener('click', () => moveCamera(GAITS[activeGait], true));
  saveButton.addEventListener('click', () => {
    localStorage.setItem(storageKey, activeGait);
    body.dataset.saved = 'true';
    saveButton.dataset.saved = 'true';
    saveButton.querySelector('span')!.textContent = `已保存 · ${gaitLabel(activeGait)}`;
    sceneStatus.textContent = `已保存${gaitLabel(activeGait)}观察卡。`;
  });
}

function setGait(next: GaitId, announce: boolean): void {
  const previous = activeGait;
  activeGait = next;
  updateSemanticState(next, announce);
  updateTrail(next);
  if (actions.size > 0) {
    const previousAction = actions.get(previous);
    const action = actions.get(next);
    if (action) {
      mixer!.timeScale = reducedMotion ? 0 : 1;
      action.enabled = true;
      action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (reducedMotion) {
        action.time = action.getClip().duration * GAITS[next].sample;
        mixer!.update(0);
      } else if (previousAction && previousAction !== action) {
        previousAction.crossFadeTo(action, 0.42, true);
      }
    }
    moveCamera(GAITS[next], false);
  }
}

function updateSemanticState(next: GaitId, announce: boolean): void {
  const gait = GAITS[next];
  body.dataset.activeGait = next;
  body.dataset.clipName = gait.clip;
  body.dataset.saved = String(localStorage.getItem(storageKey) === next);
  gaitIndex.textContent = gait.index;
  gaitKicker.textContent = gait.kicker;
  gaitTitle.textContent = gait.title;
  gaitDescription.textContent = gait.description;
  clipName.textContent = gait.clip;
  trailRhythm.textContent = gait.rhythm;
  gaitButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.gait === next)));
  const saved = localStorage.getItem(storageKey) === next;
  saveButton.dataset.saved = String(saved);
  saveButton.querySelector('span')!.textContent = saved ? `已保存 · ${gaitLabel(next)}` : '保存狐步观察卡';
  if (announce) sceneStatus.textContent = `已切换到${gaitLabel(next)}，正在播放 ${gait.clip} 模型动画。`;
}

function updateTrail(next: GaitId): void {
  if (!trail) return;
  const gait = GAITS[next];
  trail.children.forEach((child, index) => {
    const pair = Math.floor(index / 2);
    const side = index % 2 === 0 ? -1 : 1;
    child.position.x = pair * gait.footprintSpacing;
    child.position.z = side * gait.footprintSpread + (pair % 2) * 0.08;
    child.rotation.z = side * 0.16;
    const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
    material.opacity = next === 'survey' ? Math.max(0.06, 0.2 - pair * 0.022) : 0.16;
  });
  trail.position.x = next === 'run' ? -3.45 : next === 'walk' ? -2.75 : -1.65;
}

function moveCamera(gait: GaitDefinition, immediate: boolean): void {
  if (!camera || !controls) return;
  const toPosition = new THREE.Vector3().fromArray(gait.camera);
  const toTarget = new THREE.Vector3().fromArray(gait.target);
  if (immediate || reducedMotion) {
    camera.position.copy(toPosition);
    controls.target.copy(toTarget);
    controls.update();
    cameraMove = null;
    return;
  }
  cameraMove = {
    startAt: performance.now(),
    duration: 920,
    fromPosition: camera.position.clone(),
    toPosition,
    fromTarget: controls.target.clone(),
    toTarget
  };
}

function render(now: number): void {
  if (!renderer || !scene || !camera || !controls) return;
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (mixer && !reducedMotion) mixer.update(delta);
  if (cameraMove) {
    const progress = Math.min(1, (now - cameraMove.startAt) / cameraMove.duration);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(cameraMove.fromPosition, cameraMove.toPosition, eased);
    controls.target.lerpVectors(cameraMove.fromTarget, cameraMove.toTarget, eased);
    if (progress >= 1) cameraMove = null;
  }
  controls.update();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(render);
}

function resize(): void {
  if (!renderer || !camera) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.45 : 1.85));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function activateFallback(reason: string): void {
  cancelAnimationFrame(raf);
  body.dataset.fallback = 'true';
  body.dataset.sceneReady = 'false';
  fallbackReason.textContent = reason;
  fallbackCard.hidden = false;
  loading.hidden = true;
  sceneStatus.textContent = '三维增强不可用，已显示可操作的语义观察卡。';
  renderer?.dispose();
  renderer = null;
}

function parseGait(value: string | null | undefined): GaitId | null {
  return value === 'survey' || value === 'walk' || value === 'run' ? value : null;
}

function gaitLabel(gait: GaitId): string {
  return gait === 'survey' ? '侦察' : gait === 'walk' ? '行走' : '奔跑';
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

window.addEventListener('pagehide', () => {
  cancelAnimationFrame(raf);
  renderer?.dispose();
});
