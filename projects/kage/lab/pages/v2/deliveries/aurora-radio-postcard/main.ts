import * as THREE from 'three';

type AuroraState = 'searching' | 'capture' | 'resonance' | 'postcard';

interface AuroraSnapshot {
  ready: boolean;
  state: AuroraState;
  tune: number;
  frequency: number;
  pointerX: number;
  pointerY: number;
  imageLoaded: boolean;
  frames: number;
  drawCalls: number;
  fallback: boolean;
  assetFallback: boolean;
  reducedMotion: boolean;
  audioEnabled: boolean;
  audioMuted: boolean;
  audioFilterHz: number;
  visualEnergy: number;
  sent: boolean;
  horizontalOverflow: number;
  revision: string;
}

declare global {
  interface Window {
    __auroraRadioPostcard?: {
      snapshot: () => AuroraSnapshot;
      setTune: (value: number) => void;
      setPointer: (x: number, y: number) => void;
      toggleAudio: () => Promise<void>;
      send: () => void;
    };
  }
}

const root = document.documentElement;
const stage = required<HTMLElement>('.aurora-stage');
const canvas = required<HTMLCanvasElement>('#aurora-canvas');
const image = required<HTMLImageElement>('#aurora-image');
const control = required<HTMLElement>('#frequency-control');
const audioButton = required<HTMLButtonElement>('#audio-toggle');
const audioLabel = required<HTMLElement>('#audio-label');
const frequencyValue = required<HTMLElement>('#frequency-value');
const signalIndex = required<HTMLElement>('#signal-index');
const signalTitle = required<HTMLElement>('#signal-title');
const signalDetail = required<HTMLElement>('#signal-detail');
const sendButton = required<HTMLButtonElement>('#send-postcard');
const sendStatus = required<HTMLElement>('#send-status');
const liveStatus = required<HTMLElement>('#live-status');

const params = new URLSearchParams(location.search);
const quality = params.get('quality') ?? 'high';
const revision = params.get('revision') ?? 'r145-preview';
const forcedFallback = ['1', 'true', 'webgl'].includes(params.get('fallback') ?? '');
const forcedAssetFallback = ['1', 'true', 'image'].includes(params.get('assetFallback') ?? '');
const reducedMotion = params.get('motion') === 'reduce'
  || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);

const copy: Record<AuroraState, { index: string; title: string; detail: string; aria: string }> = {
  searching: {
    index: '01 / SEARCHING',
    title: '雪地里只有很轻的底噪。',
    detail: '慢慢调频，让天空与接收器找到同一个节拍。',
    aria: '搜寻信号'
  },
  capture: {
    index: '02 / CAPTURE',
    title: '第一束光，被天线接住了。',
    detail: '极光开始收紧，底噪里出现一条可辨认的低频声纹。',
    aria: '捕获信号'
  },
  resonance: {
    index: '03 / RESONANCE',
    title: '天空与接收器正在共振。',
    detail: '继续微调。光带的弧度、色温和声音亮度由同一频率驱动。',
    aria: '极光共振'
  },
  postcard: {
    index: '04 / POSTCARD',
    title: '今晚的光，已经可以寄出。',
    detail: '这是一段艺术化映射，不代表真实极光无线电频率。',
    aria: '明信片已形成'
  }
};

let tune = 0;
let pointerX = .5;
let pointerY = .35;
let state: AuroraState = 'searching';
let imageLoaded = false;
let fallback = forcedFallback;
let assetFallback = forcedAssetFallback;
let sent = false;
let frames = 0;
let renderer: THREE.WebGLRenderer | null = null;
let material: THREE.ShaderMaterial | null = null;
let animationFrame = 0;
let dragging = false;
let audioContext: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let filter: BiquadFilterNode | null = null;
let oscillator: OscillatorNode | null = null;
let masterGain: GainNode | null = null;
let audioEnabled = false;
let audioMuted = false;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const frequencyFor = (value: number) => 34.8 + value * 37.6;

function stateFor(value: number): AuroraState {
  if (value >= .82) return 'postcard';
  if (value >= .52) return 'resonance';
  if (value >= .2) return 'capture';
  return 'searching';
}

function setRootNumber(name: string, value: number): void {
  root.style.setProperty(name, String(round(value)));
}

function renderState(announce = false): void {
  const next = stateFor(tune);
  const changed = next !== state;
  state = next;
  const current = copy[state];
  root.dataset.auroraState = state;
  signalIndex.textContent = current.index;
  signalTitle.textContent = current.title;
  signalDetail.textContent = current.detail;
  const frequency = frequencyFor(tune);
  frequencyValue.textContent = frequency.toFixed(1);
  control.setAttribute('aria-valuenow', frequency.toFixed(1));
  control.setAttribute('aria-valuetext', current.aria);
  sendButton.disabled = tune < .82;
  if ((changed || announce) && liveStatus) liveStatus.textContent = `${current.aria}。${current.title}`;
}

function applyTune(value: number, announce = false): void {
  tune = clamp01(value);
  setRootNumber('--tune', tune);
  material?.uniforms.uTune && (material.uniforms.uTune.value = tune);
  updateAudio();
  renderState(announce);
}

function updatePointer(x: number, y: number): void {
  pointerX = clamp01(x);
  pointerY = clamp01(y);
  setRootNumber('--pointer-x', pointerX);
  setRootNumber('--pointer-y', pointerY);
  material?.uniforms.uPointer.value.set(pointerX, pointerY);
}

function tuneFromClientX(clientX: number, announce = true): void {
  const rect = control.getBoundingClientRect();
  applyTune((clientX - rect.left) / Math.max(1, rect.width), announce);
}

async function toggleAudio(): Promise<void> {
  if (!audioContext) createAudioGraph();
  if (!audioContext) return;
  if (audioContext.state === 'suspended') await audioContext.resume();
  audioEnabled = true;
  audioMuted = !audioMuted && root.dataset.audio === 'on';
  const target = audioMuted ? 0 : .055;
  masterGain?.gain.setTargetAtTime(target, audioContext.currentTime, .05);
  root.dataset.audio = audioMuted ? 'muted' : 'on';
  audioButton.setAttribute('aria-pressed', String(!audioMuted));
  audioLabel.textContent = audioMuted ? '恢复监听' : '静音';
  liveStatus.textContent = audioMuted ? '监听已静音。' : `${copy[state].aria}的声音已经开启。`;
}

function createAudioGraph(): void {
  try {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioContext.destination);

    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * .55;
    noiseSource = audioContext.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.8;
    noiseSource.connect(filter).connect(masterGain);
    noiseSource.start();

    oscillator = audioContext.createOscillator();
    const oscillatorGain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillatorGain.gain.value = .16;
    oscillator.connect(oscillatorGain).connect(masterGain);
    oscillator.start();
    updateAudio();
  } catch (error) {
    console.warn('[aurora-radio-postcard] Audio unavailable.', error);
    audioContext = null;
    audioLabel.textContent = '声音不可用';
    audioButton.disabled = true;
  }
}

function audioFilterHz(): number {
  return 320 + tune * 1960;
}

function updateAudio(): void {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  filter?.frequency.setTargetAtTime(audioFilterHz(), now, .06);
  filter?.Q.setTargetAtTime(1.6 + tune * 7.2, now, .08);
  oscillator?.frequency.setTargetAtTime(82 + tune * 154, now, .08);
}

function sendPostcard(): void {
  if (tune < .82) {
    applyTune(1, true);
    return;
  }
  sent = true;
  root.dataset.sent = 'true';
  sendButton.querySelector('span')!.textContent = '极光明信片已寄出';
  sendStatus.textContent = '已保存在本次浏览状态中。频率和声音仍可继续调整。';
  liveStatus.textContent = '极光明信片已寄出。';
}

function createRenderer(texture: THREE.Texture): void {
  if (forcedFallback) return markFallback('已按要求启用 WebGL 回退');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.6 : 1.2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uImage: { value: texture },
        uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
        uImageSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
        uPointer: { value: new THREE.Vector2(pointerX, pointerY) },
        uTune: { value: tune },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uImage;
        uniform vec2 uResolution;
        uniform vec2 uImageSize;
        uniform vec2 uPointer;
        uniform float uTune;
        uniform float uTime;

        vec2 coverUv(vec2 uv){
          float sa = uResolution.x / max(uResolution.y, 1.0);
          float ia = uImageSize.x / max(uImageSize.y, 1.0);
          if(sa > ia) uv.y = (uv.y - .5) * (ia / sa) + .5;
          else uv.x = (uv.x - .5) * (sa / ia) + .5;
          return uv;
        }

        void main(){
          vec2 uv = coverUv(vUv);
          float sky = smoothstep(.32, .86, vUv.y);
          float horizon = smoothstep(.24, .48, vUv.y) * (1.0 - smoothstep(.78, 1.0, vUv.y));
          float phase = vUv.x * 11.0 + vUv.y * 4.4 + uTime * (.34 + uTune * .48);
          float fold = sin(phase + sin(phase * .37 + uTime * .16) * 2.6) * .5 + .5;
          float longWave = sin(vUv.x * 3.1 - uTime * .19 + uTune * 3.4);
          float drift = (fold - .5) * (.004 + uTune * .026) * sky;
          vec2 parallax = vec2((uPointer.x - .5) * -.008, (uPointer.y - .5) * .004) * sky;
          vec2 warped = uv + parallax + vec2(drift + longWave * sky * (.0015 + uTune * .005), drift * .58);
          vec3 base = texture2D(uImage, warped).rgb;
          float split = (.0007 + uTune * .0042) * sky;
          vec3 chroma = vec3(
            texture2D(uImage, warped + vec2(split, 0.0)).r,
            base.g,
            texture2D(uImage, warped - vec2(split, 0.0)).b
          );
          vec3 color = mix(base, chroma, .24 + uTune * .34);
          float ribbonA = pow(max(0.0, sin(phase * .71 + uTune * 6.0)), 7.0) * sky;
          float ribbonB = pow(max(0.0, sin(phase * .43 - uTime * .21 + 1.6)), 11.0) * horizon;
          float breathing = .72 + .28 * sin(uTime * .72 + vUv.x * 2.0);
          vec3 aurora = mix(vec3(.08,1.0,.64), vec3(.24,.68,1.0), .16 + uTune * .72);
          color += aurora * (ribbonA * (.09 + uTune * .34) + ribbonB * (.05 + uTune * .22)) * breathing;
          color += vec3(.14,.9,.72) * sky * (.018 + uTune * .045) * (fold - .18);
          float receiver = smoothstep(.34, .035, distance(vUv, vec2(.26,.19)));
          float pulse = .5 + .5 * sin(uTime * (2.2 + uTune * 2.8));
          color += vec3(1.0,.39,.08) * receiver * (.035 + uTune * .15) * (.58 + pulse * .42);
          float vignette = smoothstep(.86, .24, distance(vUv, vec2(.5,.5)));
          color *= mix(.78, 1.05, vignette);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    const resize = () => {
      if (!renderer || !material) return;
      renderer.setSize(innerWidth, innerHeight, false);
      material.uniforms.uResolution.value.set(innerWidth, innerHeight);
    };
    resize();
    addEventListener('resize', resize, { passive: true });
    const start = performance.now();
    const render = (time: number) => {
      if (!renderer || !material) return;
      material.uniforms.uTime.value = reducedMotion ? 0 : (time - start) / 1000;
      renderer.render(scene, camera);
      frames += 1;
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      renderer = null;
      material = null;
      markFallback('WebGL 上下文中断');
    });
  } catch (error) {
    console.warn('[aurora-radio-postcard] WebGL unavailable.', error);
    markFallback('WebGL 无法初始化');
  }
}

function markFallback(reason: string): void {
  fallback = true;
  root.dataset.fallback = 'true';
  canvas.hidden = true;
  liveStatus.textContent = `${reason}。静态极光、调频状态与寄出行动仍可使用。`;
}

function loadAsset(): void {
  if (forcedAssetFallback) {
    assetFallback = true;
    root.dataset.assetFallback = 'true';
    image.removeAttribute('src');
    markFallback('主视觉素材回退');
    root.dataset.auroraReady = 'true';
    return;
  }
  image.addEventListener('load', () => { imageLoaded = true; }, { once: true });
  image.addEventListener('error', () => {
    imageLoaded = false;
    assetFallback = true;
    root.dataset.assetFallback = 'true';
    markFallback('主视觉素材未能加载');
  }, { once: true });
  if (image.complete && image.naturalWidth > 0) imageLoaded = true;

  new THREE.TextureLoader().load(image.src, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    imageLoaded = true;
    createRenderer(texture);
    root.dataset.auroraReady = 'true';
    liveStatus.textContent = '极光无线电已准备。用滚轮、拖动或方向键开始调频。';
  }, undefined, () => {
    assetFallback = true;
    root.dataset.assetFallback = 'true';
    markFallback('WebGL 纹理未能加载');
    root.dataset.auroraReady = 'true';
  });
}

function snapshot(): AuroraSnapshot {
  return {
    ready: root.dataset.auroraReady === 'true',
    state,
    tune: round(tune),
    frequency: round(frequencyFor(tune)),
    pointerX: round(pointerX),
    pointerY: round(pointerY),
    imageLoaded,
    frames,
    drawCalls: renderer?.info.render.calls ?? 0,
    fallback,
    assetFallback,
    reducedMotion,
    audioEnabled,
    audioMuted,
    audioFilterHz: round(audioFilterHz()),
    visualEnergy: round(.18 + tune * .82),
    sent,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    revision
  };
}

stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  const magnitude = Math.max(.045, Math.min(.13, Math.abs(event.deltaY) / 720));
  applyTune(tune + Math.sign(event.deltaY) * magnitude, true);
}, { passive: false });
control.addEventListener('pointerdown', (event) => {
  dragging = true;
  control.setPointerCapture(event.pointerId);
  tuneFromClientX(event.clientX);
});
control.addEventListener('pointermove', (event) => {
  if (dragging) tuneFromClientX(event.clientX, false);
});
control.addEventListener('pointerup', (event) => {
  dragging = false;
  control.releasePointerCapture(event.pointerId);
  renderState(true);
});
control.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') applyTune(tune + .05, true);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') applyTune(tune - .05, true);
  if (event.key === 'Home') applyTune(0, true);
  if (event.key === 'End') applyTune(1, true);
});
stage.addEventListener('pointermove', (event) => updatePointer(event.clientX / innerWidth, event.clientY / innerHeight), { passive: true });
audioButton.addEventListener('click', () => void toggleAudio());
sendButton.addEventListener('click', sendPostcard);
addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrame);
  renderer?.dispose();
  material?.dispose();
  noiseSource?.stop();
  oscillator?.stop();
  void audioContext?.close();
});

root.dataset.fallback = forcedFallback ? 'true' : 'false';
root.dataset.assetFallback = forcedAssetFallback ? 'true' : 'false';
applyTune(0);
updatePointer(pointerX, pointerY);
loadAsset();

window.__auroraRadioPostcard = {
  snapshot,
  setTune: (value: number) => applyTune(value, true),
  setPointer: updatePointer,
  toggleAudio,
  send: sendPostcard
};

setTimeout(() => {
  if (root.dataset.auroraReady !== 'true') {
    markFallback('首次预览超时');
    root.dataset.auroraReady = 'true';
  }
}, 5500);

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Aurora Radio Postcard: missing ${selector}`);
  return element;
}
