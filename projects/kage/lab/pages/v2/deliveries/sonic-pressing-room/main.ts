import * as THREE from 'three';

type PressState = 'silent' | 'cutting' | 'resonant' | 'kept';
type AudioState = 'locked' | 'playing' | 'paused' | 'unavailable';

interface PressSnapshot {
  ready: boolean;
  state: PressState;
  progress: number;
  audioState: AudioState;
  audioContextState: string;
  low: number;
  mid: number;
  high: number;
  grooveDepth: number;
  refraction: number;
  edgeVibration: number;
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
    __sonicPressingRoom?: {
      snapshot: () => PressSnapshot;
      setProgress: (value: number) => void;
      setPointer: (x: number, y: number) => void;
      toggleAudio: () => Promise<void>;
      save: () => void;
    };
  }
}

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('#press-stage');
const canvas = document.querySelector<HTMLCanvasElement>('#press-canvas');
const audioButton = document.querySelector<HTMLButtonElement>('#audio-toggle');
const audioLabel = document.querySelector<HTMLElement>('#audio-label');
const audioProxy = document.querySelector<HTMLButtonElement>('[data-audio-proxy]');
const saveButton = document.querySelector<HTMLButtonElement>('#save-imprint');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const liveStatus = document.querySelector<HTMLElement>('#live-status');
const stateIndex = document.querySelector<HTMLElement>('#state-index');
const spectrumNote = document.querySelector<HTMLElement>('#spectrum-note');
const lowMeter = document.querySelector<HTMLElement>('#low-meter');
const midMeter = document.querySelector<HTMLElement>('#mid-meter');
const highMeter = document.querySelector<HTMLElement>('#high-meter');
const lowValue = document.querySelector<HTMLOutputElement>('#low-value');
const midValue = document.querySelector<HTMLOutputElement>('#mid-value');
const highValue = document.querySelector<HTMLOutputElement>('#high-value');
const stateButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-target]')];

if (!stage || !canvas || !audioButton || !audioLabel || !audioProxy || !saveButton || !saveStatus || !liveStatus || !stateIndex || !spectrumNote || !lowMeter || !midMeter || !highMeter || !lowValue || !midValue || !highValue) {
  throw new Error('Sonic Pressing Room: required DOM contract is missing.');
}

const params = new URLSearchParams(location.search);
const quality = params.get('quality') ?? 'high';
const revision = params.get('revision') ?? 'r157-preview';
const forcedFallback = ['1', 'true', 'webgl', 'canvas'].includes(params.get('fallback') ?? '');
const forcedAudioUnavailable = ['off', 'unavailable', '0'].includes(params.get('audio') ?? '');
const reducedMotion = params.get('motion') === 'reduce' || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number, precision = 1000) => Math.round(value * precision) / precision;

let progress = 0;
let pointerX = .5;
let pointerY = .5;
let pressState: PressState = 'silent';
let audioState: AudioState = forcedAudioUnavailable ? 'unavailable' : 'locked';
let fallback = forcedFallback;
let saved = false;
let frames = 0;
let scrollFrame = 0;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let discGroup: THREE.Group | null = null;
let discMaterial: THREE.ShaderMaterial | null = null;
let edgeMaterial: THREE.MeshBasicMaterial | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let masterGain: GainNode | null = null;
let lowOscillator: OscillatorNode | null = null;
let midOscillator: OscillatorNode | null = null;
let highOscillator: OscillatorNode | null = null;
let lowGain: GainNode | null = null;
let midGain: GainNode | null = null;
let highGain: GainNode | null = null;
let frequencyData: Uint8Array<ArrayBuffer> | null = null;
let low = 0;
let mid = 0;
let high = 0;

const stateCopy: Record<PressState, string> = {
  silent: '空白唱片等待第一道声音。',
  cutting: '声音开始进入表面，沟槽正在显影。',
  resonant: '三个频段正在留下不同的材质痕迹。',
  kept: '声纹已经压入透明材质，可以保存。',
};

function stateFor(value: number): PressState {
  if (value >= .88) return 'kept';
  if (value >= .48) return 'resonant';
  if (value >= .14) return 'cutting';
  return 'silent';
}

function setCss(name: string, value: number): void {
  root.style.setProperty(name, String(round(value)));
}

function progressFromScroll(): number {
  const max = Math.max(1, stage!.offsetHeight - innerHeight);
  return clamp01(-stage!.getBoundingClientRect().top / max);
}

function setScrollProgress(value: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'): void {
  const normalized = clamp01(value);
  const max = Math.max(1, stage!.offsetHeight - innerHeight);
  const target = scrollY + stage!.getBoundingClientRect().top + normalized * max;
  scrollTo({ top: target, behavior });
  if (reducedMotion || behavior === 'auto') applyProgress(normalized, true);
}

function updateSemanticState(announce = false): void {
  const next = stateFor(progress);
  const changed = next !== pressState;
  pressState = next;
  root.dataset.pressState = pressState;
  stateIndex.textContent = `${Math.round(progress * 100).toString().padStart(2, '0')}%`;
  saveButton.disabled = progress < .88;
  stateButtons.forEach((button, index) => {
    const active = index === ['silent', 'cutting', 'resonant', 'kept'].indexOf(pressState);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (changed || announce) liveStatus.textContent = stateCopy[pressState];
}

function applyProgress(value: number, announce = false): void {
  progress = clamp01(value);
  setCss('--progress', progress);
  updateSemanticState(announce);
}

function setPointer(x: number, y: number): void {
  pointerX = clamp01(x);
  pointerY = clamp01(y);
  setCss('--pointer-x', pointerX);
  setCss('--pointer-y', pointerY);
}

function meanBand(data: Uint8Array<ArrayBuffer>, from: number, to: number): number {
  let sum = 0;
  const start = Math.max(0, Math.floor(from));
  const end = Math.min(data.length, Math.ceil(to));
  for (let index = start; index < end; index += 1) sum += data[index];
  return end > start ? sum / (end - start) / 255 : 0;
}

function updateSpectrum(): void {
  if (audioState === 'playing' && analyser && frequencyData) {
    analyser.getByteFrequencyData(frequencyData);
    const nyquist = (audioContext?.sampleRate ?? 48000) / 2;
    const bin = frequencyData.length / nyquist;
    low += (meanBand(frequencyData, 40 * bin, 180 * bin) - low) * .2;
    mid += (meanBand(frequencyData, 220 * bin, 1100 * bin) - mid) * .2;
    high += (meanBand(frequencyData, 1500 * bin, 4200 * bin) - high) * .2;
  } else {
    low *= .9;
    mid *= .9;
    high *= .9;
  }
  setCss('--low', low);
  setCss('--mid', mid);
  setCss('--high', high);
  lowMeter.style.width = `${Math.min(100, low * 132)}%`;
  midMeter.style.width = `${Math.min(100, mid * 145)}%`;
  highMeter.style.width = `${Math.min(100, high * 165)}%`;
  lowValue.value = low.toFixed(2);
  midValue.value = mid.toFixed(2);
  highValue.value = high.toFixed(2);
}

async function createAudio(): Promise<void> {
  if (forcedAudioUnavailable || typeof AudioContext === 'undefined') {
    audioState = 'unavailable';
    root.dataset.audio = audioState;
    audioLabel.textContent = '音频不可用';
    spectrumNote.textContent = '当前环境无法启动音频；滚动压片与保存仍可使用。';
    liveStatus.textContent = '音频不可用，已保留无声压片路径。';
    return;
  }
  if (!audioContext) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = .72;
    frequencyData = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    masterGain = audioContext.createGain();
    masterGain.gain.value = .0001;
    masterGain.connect(analyser);
    analyser.connect(audioContext.destination);

    lowOscillator = audioContext.createOscillator();
    midOscillator = audioContext.createOscillator();
    highOscillator = audioContext.createOscillator();
    lowGain = audioContext.createGain();
    midGain = audioContext.createGain();
    highGain = audioContext.createGain();
    lowOscillator.type = 'sine';
    midOscillator.type = 'triangle';
    highOscillator.type = 'sine';
    lowOscillator.frequency.value = 72;
    midOscillator.frequency.value = 420;
    highOscillator.frequency.value = 2380;
    lowGain.gain.value = .56;
    midGain.gain.value = .29;
    highGain.gain.value = .12;
    lowOscillator.connect(lowGain).connect(masterGain);
    midOscillator.connect(midGain).connect(masterGain);
    highOscillator.connect(highGain).connect(masterGain);
    lowOscillator.start();
    midOscillator.start();
    highOscillator.start();
  }
  if (audioContext.state === 'suspended') await audioContext.resume();
}

async function toggleAudio(): Promise<void> {
  await createAudio();
  if (!audioContext || !masterGain || audioState === 'unavailable') return;
  const nextPlaying = audioState !== 'playing';
  audioState = nextPlaying ? 'playing' : 'paused';
  root.dataset.audio = audioState;
  audioButton.setAttribute('aria-pressed', String(nextPlaying));
  audioLabel.textContent = nextPlaying ? '暂停这段声音' : '继续这段声音';
  audioProxy.textContent = nextPlaying ? '声音正在进入材质 ↗' : '继续一段声纹 ↗';
  masterGain.gain.setTargetAtTime(nextPlaying ? .08 : .0001, audioContext.currentTime, .06);
  spectrumNote.textContent = nextPlaying
    ? '频段来自当前浏览器合成声音的 AnalyserNode；数值会连续改变同一张唱片。'
    : '声音已暂停，材质保留当前压片进度。';
  liveStatus.textContent = nextPlaying ? '声音已开启，低中高频正在驱动唱片材质。' : '声音已暂停。';
}

function save(): void {
  if (progress < .88) {
    setScrollProgress(1);
    return;
  }
  saved = true;
  root.dataset.saved = 'true';
  saveButton.querySelector('span')!.textContent = '这一段声纹已保存';
  saveStatus.textContent = '已保存当前压片进度与三个频段的可视化快照。';
  liveStatus.textContent = '这一段声纹已经保存。';
}

const discVertex = /* glsl */`
  varying vec2 vUv;
  varying float vRadius;
  varying float vGroove;
  uniform float uTime;
  uniform float uProgress;
  uniform float uLow;
  uniform float uHigh;
  void main() {
    vUv = uv;
    vec2 center = uv - .5;
    float radius = length(center) * 2.0;
    vRadius = radius;
    float cut = smoothstep(.02, .98, uProgress);
    float grooves = sin(radius * 310.0 + uLow * 13.0) * (.012 + uLow * .065) * cut;
    float edge = smoothstep(.78, .99, radius) * sin(atan(center.y, center.x) * 19.0 + uTime * 6.0) * uHigh * .09;
    vGroove = grooves;
    vec3 displaced = position;
    displaced.z += grooves + edge;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const discFragment = /* glsl */`
  varying vec2 vUv;
  varying float vRadius;
  varying float vGroove;
  uniform float uTime;
  uniform float uProgress;
  uniform float uLow;
  uniform float uMid;
  uniform float uHigh;
  uniform vec2 uPointer;
  void main() {
    float outer = 1.0 - smoothstep(.965, 1.0, vRadius);
    float hole = smoothstep(.105, .13, vRadius);
    float mask = outer * hole;
    if (mask < .01) discard;
    float angle = atan(vUv.y - .5, vUv.x - .5);
    float grooveLine = .5 + .5 * sin(vRadius * 310.0 + uLow * 13.0);
    grooveLine = pow(grooveLine, 7.0) * smoothstep(.03, .22, uProgress);
    float sweep = .5 + .5 * sin(angle * 3.0 - uTime * .28 + vRadius * 8.0);
    vec3 resin = mix(vec3(.12, .055, .065), vec3(.58, .25, .13), grooveLine * (.28 + uLow));
    float spectralMix = clamp(uMid * 3.2 + sweep * .25, 0.0, 1.0);
    vec3 prism = mix(vec3(.98, .62, .34), vec3(.25, .88, .91), spectralMix);
    float radialLight = pow(1.0 - abs(vRadius - .58), 6.0) * (.2 + uMid * .75);
    float pointerLight = max(0.0, 1.0 - distance(vUv, uPointer)) * .22;
    vec3 color = resin + prism * (grooveLine * (.34 + uMid * .72) + radialLight + pointerLight);
    color += vec3(.8, .32, .18) * abs(vGroove) * 3.4;
    float alpha = mask * (.38 + grooveLine * (.23 + uLow * .16) + radialLight * .24 + uProgress * .07);
    gl_FragColor = vec4(color, alpha);
  }
`;

function createScene(): void {
  if (forcedFallback) {
    fallback = true;
    root.dataset.fallback = 'true';
    root.dataset.pressReady = 'true';
    liveStatus.textContent = 'WebGL 已关闭，同心沟槽回退与完整操作仍可使用。';
    return;
  }
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: quality !== 'low', powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.7 : 1.3));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 40);
    camera.position.set(0, .1, 7.2);
    discGroup = new THREE.Group();
    discGroup.position.set(innerWidth > 900 ? .7 : .35, .05, 0);
    scene.add(discGroup);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.48, 128),
      new THREE.MeshBasicMaterial({ color: 0x030203, transparent: true, opacity: .35, depthWrite: false }),
    );
    shadow.position.set(.18, -.22, -.17);
    shadow.scale.set(1.05, .92, 1);
    discGroup.add(shadow);

    discMaterial = new THREE.ShaderMaterial({
      vertexShader: discVertex,
      fragmentShader: discFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uLow: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uPointer: { value: new THREE.Vector2(.5, .5) },
      },
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.52, quality === 'low' ? 128 : 220), discMaterial);
    discGroup.add(disc);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(.27, .58, 96),
      new THREE.MeshPhysicalMaterial({ color: 0xe6b180, roughness: .16, metalness: .22, transmission: .48, thickness: .25, transparent: true, opacity: .76, side: THREE.DoubleSide }),
    );
    inner.position.z = .035;
    discGroup.add(inner);

    edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xf0ac77, transparent: true, opacity: .42, blending: THREE.AdditiveBlending });
    const edge = new THREE.Mesh(new THREE.RingGeometry(2.49, 2.535, 192), edgeMaterial);
    edge.position.z = .045;
    discGroup.add(edge);

    const pin = new THREE.Mesh(new THREE.CircleGeometry(.105, 64), new THREE.MeshBasicMaterial({ color: 0x160b0e, transparent: true, opacity: .88 }));
    pin.position.z = .06;
    discGroup.add(pin);

    const pressPlate = new THREE.Mesh(
      new THREE.RingGeometry(2.66, 2.73, 180),
      new THREE.MeshBasicMaterial({ color: 0xb98464, transparent: true, opacity: .15 }),
    );
    pressPlate.position.z = -.08;
    discGroup.add(pressPlate);

    root.dataset.pressReady = 'true';
  } catch (error) {
    fallback = true;
    root.dataset.fallback = 'true';
    root.dataset.pressReady = 'true';
    console.warn('Sonic Pressing Room: WebGL fallback active.', error);
  }
}

function resize(): void {
  if (!renderer || !camera) return;
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (discGroup) discGroup.position.x = innerWidth > 900 ? .78 : .42;
}

function animate(time: number): void {
  frames += 1;
  updateSpectrum();
  if (discMaterial) {
    discMaterial.uniforms.uTime.value = time * .001;
    discMaterial.uniforms.uProgress.value = progress;
    discMaterial.uniforms.uLow.value = low;
    discMaterial.uniforms.uMid.value = mid;
    discMaterial.uniforms.uHigh.value = high;
    discMaterial.uniforms.uPointer.value.set(pointerX, 1 - pointerY);
  }
  if (discGroup) {
    const motion = reducedMotion ? 0 : 1;
    discGroup.rotation.x += ((pointerY - .5) * -.19 * motion - discGroup.rotation.x) * .045;
    discGroup.rotation.y += ((pointerX - .5) * .24 * motion - discGroup.rotation.y) * .045;
    discGroup.rotation.z = -.12 + Math.sin(time * .00055) * .012 * motion + high * .025;
    discGroup.scale.setScalar(.91 + progress * .05 + low * .025);
  }
  if (edgeMaterial) {
    edgeMaterial.opacity = .32 + progress * .18 + high * .5;
    edgeMaterial.color.lerpColors(new THREE.Color(0xf0ac77), new THREE.Color(0x72e5e5), clamp01(high * 4.5));
  }
  if (renderer && scene && camera) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function handleScroll(): void {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    applyProgress(progressFromScroll());
  });
}

stage.addEventListener('pointermove', (event) => {
  const bounds = stage.getBoundingClientRect();
  setPointer((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / innerHeight);
}, { passive: true });
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('keydown', (event) => {
  if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    setScrollProgress(progress + .14);
  }
  if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault();
    setScrollProgress(progress - .14);
  }
});
audioButton.addEventListener('click', () => { void toggleAudio(); });
audioProxy.addEventListener('click', () => { void toggleAudio(); });
saveButton.addEventListener('click', save);
stateButtons.forEach((button) => button.addEventListener('click', () => {
  setScrollProgress(Number(button.dataset.target ?? 0));
}));

window.__sonicPressingRoom = {
  snapshot: () => ({
    ready: root.dataset.pressReady === 'true',
    state: pressState,
    progress: round(progress),
    audioState,
    audioContextState: audioContext?.state ?? (forcedAudioUnavailable ? 'unavailable' : 'not-created'),
    low: round(low),
    mid: round(mid),
    high: round(high),
    grooveDepth: round(progress * (.12 + low * .28)),
    refraction: round(progress * (.18 + mid * .76)),
    edgeVibration: round(progress * high),
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
  setPointer,
  toggleAudio,
  save,
};

root.dataset.audio = audioState;
createScene();
resize();
applyProgress(progressFromScroll(), true);
requestAnimationFrame(animate);
