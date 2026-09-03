import * as THREE from 'three';

type FiberState = 'dormant' | 'tracing' | 'fracture' | 'restored';

interface FiberSnapshot {
  ready: boolean;
  state: FiberState;
  progress: number;
  pointerX: number;
  pointerY: number;
  distanceKm: number;
  returnDb: number;
  strain: number;
  pulseFrequency: number;
  audioActive: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  saved: boolean;
  frames: number;
  drawCalls: number;
  triangles: number;
  horizontalOverflow: number;
  revision: string;
}

declare global {
  interface Window {
    __seaFiberScope?: {
      snapshot: () => FiberSnapshot;
      setProgress: (value: number) => void;
      setPointer: (x: number, y: number) => void;
      toggleSound: () => Promise<void>;
      save: () => void;
    };
  }
}

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('#fiber-stage');
const canvas = document.querySelector<HTMLCanvasElement>('#fiber-canvas');
const soundButton = document.querySelector<HTMLButtonElement>('#sound-toggle');
const soundLabel = document.querySelector<HTMLElement>('#sound-label');
const saveButton = document.querySelector<HTMLButtonElement>('#save-scan');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const liveStatus = document.querySelector<HTMLElement>('#live-status');
const scopeIndex = document.querySelector<HTMLElement>('#scope-index');
const scopeTitle = document.querySelector<HTMLElement>('#scope-title');
const scopeDetail = document.querySelector<HTMLElement>('#scope-detail');
const returnValue = document.querySelector<HTMLElement>('#return-value');
const strainValue = document.querySelector<HTMLElement>('#strain-value');
const phaseValue = document.querySelector<HTMLElement>('#phase-value');
const routeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-target]')];

if (!stage || !canvas || !soundButton || !soundLabel || !saveButton || !saveStatus || !liveStatus || !scopeIndex || !scopeTitle || !scopeDetail || !returnValue || !strainValue || !phaseValue) {
  throw new Error('Sea Fiber Scope: required DOM contract is missing.');
}

const params = new URLSearchParams(location.search);
const quality = params.get('quality') ?? 'high';
const revision = params.get('revision') ?? 'r155-preview';
const forcedFallback = ['1', 'true', 'webgl', 'canvas'].includes(params.get('fallback') ?? '');
const reducedMotion = params.get('motion') === 'reduce' || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number, precision = 1000) => Math.round(value * precision) / precision;

const copy: Record<FiberState, { title: string; detail: string; phase: string }> = {
  dormant: { title: '线路尚未发声', detail: '移动指针检查纤芯角度，滚动开始一次听诊。', phase: 'STILL' },
  tracing: { title: '载波沿着玻璃向前', detail: '光脉冲正在读取回程信号，六束纤芯保持同一节律。', phase: 'TRACE' },
  fracture: { title: '第 14.8 公里出现双重回波', detail: '微裂隙让一束信号变成两条路径；光、张力与声音同时失真。', phase: 'ECHO' },
  restored: { title: '回波重新连成一束光', detail: '恢复模拟完成，线路重新获得连续的相位与亮度。', phase: 'CLEAR' },
};

let progress = 0;
let pointerX = .52;
let pointerY = .44;
let state: FiberState = 'dormant';
let fallback = forcedFallback;
let saved = false;
let frames = 0;
let scrollTick = 0;
let animationFrame = 0;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let cableGroup: THREE.Group | null = null;
let pulse: THREE.Mesh | null = null;
let pulseLight: THREE.PointLight | null = null;
let faultRing: THREE.Mesh | null = null;
let audioContext: AudioContext | null = null;
let audioGain: GainNode | null = null;
let carrier: OscillatorNode | null = null;
let overtone: OscillatorNode | null = null;
let audioActive = false;
const fiberMeshes: { geometry: THREE.TubeGeometry; base: Float32Array; angle: number }[] = [];

const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-5.2, -1.25, .15),
  new THREE.Vector3(-3.8, -.65, -.28),
  new THREE.Vector3(-2.2, -.24, .18),
  new THREE.Vector3(-.6, .14, -.08),
  new THREE.Vector3(.9, .35, .2),
  new THREE.Vector3(2.6, .66, -.15),
  new THREE.Vector3(4.3, 1.15, .05),
  new THREE.Vector3(5.5, 1.42, -.22),
], false, 'catmullrom', .42);

function stateFor(value: number): FiberState {
  if (value >= .86) return 'restored';
  if (value >= .48) return 'fracture';
  if (value >= .16) return 'tracing';
  return 'dormant';
}

function strainFor(value: number): number {
  if (value < .34) return value * .08;
  const peak = Math.exp(-Math.pow((value - .61) / .18, 2));
  return .026 + peak * .93 - Math.max(0, value - .78) * 3.3;
}

function signalFor(value: number): number {
  return clamp01(value < .84 ? Math.max(0, (value - .12) * 1.38) : 1 - (value - .84) * 2.4);
}

function setCss(name: string, value: number): void {
  root.style.setProperty(name, String(round(value)));
}

function updateFiberDeformation(strain: number): void {
  fiberMeshes.forEach(({ geometry, base, angle }) => {
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index += 1) {
      const offset = index * 3;
      const x = base[offset];
      const localFault = Math.exp(-Math.pow((x - .55) / .72, 2));
      const split = localFault * strain * .22;
      position.array[offset] = x + localFault * strain * .045;
      position.array[offset + 1] = base[offset + 1] + Math.cos(angle) * split;
      position.array[offset + 2] = base[offset + 2] + Math.sin(angle) * split;
    }
    position.needsUpdate = true;
    geometry.computeBoundingSphere();
  });
}

function renderSemanticState(announce = false): void {
  const next = stateFor(progress);
  const changed = next !== state;
  state = next;
  root.dataset.fiberState = state;
  const current = copy[state];
  const distance = progress * 24.7;
  const strain = Math.max(.02, strainFor(progress));
  const returnDb = -48 + signalFor(progress) * 26 - (state === 'fracture' ? strain * 8 : 0);
  scopeIndex.textContent = `${distance.toFixed(1).padStart(4, '0')} KM`;
  scopeTitle.textContent = current.title;
  scopeDetail.textContent = current.detail;
  returnValue.textContent = `${returnDb.toFixed(0)} dB`;
  strainValue.textContent = `${strain.toFixed(2)}%`;
  phaseValue.textContent = current.phase;
  saveButton.disabled = progress < .86;
  routeButtons.forEach((button, index) => {
    const active = index === ['dormant', 'tracing', 'fracture', 'restored'].indexOf(state);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (changed || announce) liveStatus.textContent = `${current.title}。${current.detail}`;
}

function updateAudio(): void {
  if (!audioContext || !carrier || !overtone || !audioGain) return;
  const now = audioContext.currentTime;
  const strain = strainFor(progress);
  const carrierHz = state === 'dormant' ? 42 : state === 'tracing' ? 67 + progress * 18 : state === 'fracture' ? 104 + strain * 74 : 82;
  const overtoneHz = state === 'fracture' ? carrierHz * 1.47 : carrierHz * 2.01;
  carrier.frequency.setTargetAtTime(carrierHz, now, .08);
  overtone.frequency.setTargetAtTime(overtoneHz, now, .08);
  audioGain.gain.setTargetAtTime(audioActive ? (state === 'fracture' ? .07 : .045) : .0001, now, .08);
}

function applyProgress(value: number, announce = false): void {
  progress = clamp01(value);
  const strain = Math.max(0, strainFor(progress));
  setCss('--progress', progress);
  setCss('--strain', strain);
  setCss('--signal', signalFor(progress));
  updateFiberDeformation(strain);
  renderSemanticState(announce);
  updateAudio();
}

function progressFromScroll(): number {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  return clamp01(-stage.getBoundingClientRect().top / max);
}

function setScrollProgress(value: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'): void {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const target = scrollY + stage.getBoundingClientRect().top + clamp01(value) * max;
  scrollTo({ top: target, behavior });
  if (reducedMotion) applyProgress(value, true);
}

function updatePointer(x: number, y: number): void {
  pointerX = clamp01(x);
  pointerY = clamp01(y);
  setCss('--pointer-x', pointerX);
  setCss('--pointer-y', pointerY);
}

async function toggleSound(): Promise<void> {
  if (!audioContext) {
    audioContext = new AudioContext();
    audioGain = audioContext.createGain();
    carrier = audioContext.createOscillator();
    overtone = audioContext.createOscillator();
    carrier.type = 'sine';
    overtone.type = 'triangle';
    audioGain.gain.value = .0001;
    carrier.connect(audioGain);
    overtone.connect(audioGain);
    audioGain.connect(audioContext.destination);
    carrier.start();
    overtone.start();
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
  audioActive = !audioActive;
  root.dataset.sound = audioActive ? 'on' : 'off';
  soundButton.setAttribute('aria-pressed', String(audioActive));
  soundLabel.textContent = audioActive ? '关闭线路声音' : '开启线路声音';
  updateAudio();
  liveStatus.textContent = audioActive ? `线路声音已开启，当前阶段 ${copy[state].phase}。` : '线路声音已关闭。';
}

function save(): void {
  if (progress < .86) {
    setScrollProgress(1);
    return;
  }
  saved = true;
  root.dataset.saved = 'true';
  saveButton.querySelector('span')!.textContent = '本次听诊已保存';
  saveStatus.textContent = '已保存当前线路、回波阶段与声音状态。';
  liveStatus.textContent = '本次海底光缆听诊已保存。';
}

function createFiberScene(): void {
  if (forcedFallback) {
    fallback = true;
    root.dataset.fallback = 'true';
    root.dataset.fiberReady = 'true';
    liveStatus.textContent = 'WebGL 已关闭，语义光缆与完整操作路径仍可使用。';
    return;
  }
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.65 : 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020a10, .075);
    camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 80);
    camera.position.set(0, .35, 7.4);

    cableGroup = new THREE.Group();
    scene.add(cableGroup);
    const outer = new THREE.Mesh(
      new THREE.TubeGeometry(path, quality === 'low' ? 92 : 150, .48, quality === 'low' ? 12 : 24, false),
      new THREE.MeshPhysicalMaterial({ color: 0x286a72, roughness: .12, metalness: .18, transmission: .58, thickness: .7, transparent: true, opacity: .42, depthWrite: false, clearcoat: 1, clearcoatRoughness: .08, side: THREE.DoubleSide }),
    );
    outer.renderOrder = 0;
    cableGroup.add(outer);

    const palette = [0x67e6db, 0xd6b66f, 0x6da7d4, 0xc77f72, 0xa98dcb, 0x8fd1ca];
    palette.forEach((color, index) => {
      const angle = (index / palette.length) * Math.PI * 2;
      const offset = new THREE.Vector3(0, Math.cos(angle) * .22, Math.sin(angle) * .22);
      const points = path.getPoints(72).map((point) => point.clone().add(offset));
      const strandPath = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(strandPath, quality === 'low' ? 72 : 116, .041, 8, false);
      const material = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: .72, roughness: .18, metalness: .08, transmission: .16, thickness: .22, clearcoat: .7, clearcoatRoughness: .12, transparent: true, opacity: .9 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 2;
      cableGroup!.add(mesh);
      fiberMeshes.push({ geometry, base: new Float32Array((geometry.attributes.position as THREE.BufferAttribute).array), angle });
    });

    for (let index = 0; index < 7; index += 1) {
      const t = .08 + index * .14;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.51, .012, 8, 48), new THREE.MeshBasicMaterial({ color: 0x87e6dd, transparent: true, opacity: .22 }));
      ring.position.copy(path.getPointAt(t));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), path.getTangentAt(t).normalize());
      cableGroup.add(ring);
    }

    faultRing = new THREE.Mesh(new THREE.TorusGeometry(.67, .022, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffb05f, transparent: true, opacity: .05, blending: THREE.AdditiveBlending }));
    faultRing.position.copy(path.getPointAt(.57));
    faultRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), path.getTangentAt(.57).normalize());
    cableGroup.add(faultRing);

    pulse = new THREE.Mesh(new THREE.SphereGeometry(.11, 20, 20), new THREE.MeshBasicMaterial({ color: 0x8ffff0, blending: THREE.AdditiveBlending }));
    pulseLight = new THREE.PointLight(0x79ffe9, 8, 3.2, 1.4);
    cableGroup.add(pulse, pulseLight);

    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = quality === 'low' ? 180 : 420;
    const dust = new Float32Array(dustCount * 3);
    for (let index = 0; index < dustCount; index += 1) {
      dust[index * 3] = (Math.random() - .5) * 13;
      dust[index * 3 + 1] = (Math.random() - .5) * 7;
      dust[index * 3 + 2] = (Math.random() - .5) * 7;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x74bdb8, size: .018, transparent: true, opacity: .34, depthWrite: false })));
    scene.add(new THREE.HemisphereLight(0x75d9cf, 0x020509, 1.4));
    const key = new THREE.DirectionalLight(0xb7fff3, 4.2);
    key.position.set(-2, 4, 6);
    scene.add(key);
    root.dataset.fiberReady = 'true';
  } catch (error) {
    console.warn('Sea Fiber Scope WebGL fallback:', error);
    fallback = true;
    root.dataset.fallback = 'true';
    root.dataset.fiberReady = 'true';
    liveStatus.textContent = '三维线路不可用，已切换到可操作的语义光缆。';
  }
}

function resize(): void {
  if (!renderer || !camera) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 48 : 38;
  camera.updateProjectionMatrix();
}

function animate(time: number): void {
  animationFrame = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera || !cableGroup || !pulse || !pulseLight || !faultRing) return;
  frames += 1;
  const seconds = time * .001;
  const pulseT = state === 'dormant' ? .03 : (progress * .82 + (reducedMotion ? 0 : (seconds * .035) % .13)) % .96;
  const point = path.getPointAt(pulseT);
  pulse.position.copy(point);
  pulseLight.position.copy(point);
  const fracture = state === 'fracture' ? Math.max(.18, strainFor(progress)) : 0;
  (faultRing.material as THREE.MeshBasicMaterial).opacity = fracture * .78;
  faultRing.scale.setScalar(1 + Math.sin(seconds * 5.5) * fracture * .18);
  const restored = state === 'restored';
  const pulseColor = restored ? 0xc4fff4 : state === 'fracture' ? 0xffb15f : 0x75ffe9;
  (pulse.material as THREE.MeshBasicMaterial).color.setHex(pulseColor);
  pulseLight.color.setHex(pulseColor);
  pulse.scale.setScalar(1 + signalFor(progress) * .85 + (reducedMotion ? 0 : Math.sin(seconds * 4) * .12));
  cableGroup.rotation.x += ((pointerY - .5) * .22 - cableGroup.rotation.x) * .045;
  cableGroup.rotation.y += ((pointerX - .5) * .28 - cableGroup.rotation.y) * .045;
  cableGroup.rotation.z += ((-.08 + progress * .1) - cableGroup.rotation.z) * .035;
  camera.position.x += (((pointerX - .5) * -.42 + progress * .28) - camera.position.x) * .03;
  camera.position.y += ((.35 + (pointerY - .5) * .34 - progress * .15) - camera.position.y) * .03;
  camera.position.z += (((innerWidth < 760 ? 8.6 : 7.4) - progress * .38) - camera.position.z) * .03;
  camera.lookAt(0, .05, 0);
  renderer.render(scene, camera);
}

function onScroll(): void {
  if (scrollTick) return;
  scrollTick = requestAnimationFrame(() => {
    scrollTick = 0;
    applyProgress(progressFromScroll());
  });
}

routeButtons.forEach((button) => button.addEventListener('click', () => setScrollProgress(Number(button.dataset.target ?? 0))));
soundButton.addEventListener('click', () => void toggleSound());
saveButton.addEventListener('click', save);
addEventListener('pointermove', (event) => updatePointer(event.clientX / innerWidth, event.clientY / innerHeight), { passive: true });
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', resize, { passive: true });
addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'PageDown') setScrollProgress(progress + .18);
  if (event.key === 'ArrowUp' || event.key === 'PageUp') setScrollProgress(progress - .18);
  if (event.key.toLowerCase() === 'm') void toggleSound();
});

window.__seaFiberScope = {
  snapshot: () => ({
    ready: root.dataset.fiberReady === 'true',
    state,
    progress: round(progress),
    pointerX: round(pointerX),
    pointerY: round(pointerY),
    distanceKm: round(progress * 24.7),
    returnDb: round(-48 + signalFor(progress) * 26 - (state === 'fracture' ? strainFor(progress) * 8 : 0)),
    strain: round(Math.max(.02, strainFor(progress))),
    pulseFrequency: state === 'dormant' ? 42 : state === 'tracing' ? round(67 + progress * 18) : state === 'fracture' ? round(104 + strainFor(progress) * 74) : 82,
    audioActive,
    fallback,
    reducedMotion,
    saved,
    frames,
    drawCalls: renderer?.info.render.calls ?? 0,
    triangles: renderer?.info.render.triangles ?? 0,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    revision,
  }),
  setProgress: (value) => applyProgress(value, true),
  setPointer: updatePointer,
  toggleSound,
  save,
};

createFiberScene();
resize();
applyProgress(progressFromScroll());
animate(performance.now());

addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(scrollTick);
  renderer?.dispose();
  void audioContext?.close();
}, { once: true });
