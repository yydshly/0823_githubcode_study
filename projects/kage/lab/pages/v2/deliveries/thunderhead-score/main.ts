type StormPhase = 'lift' | 'tower' | 'charge' | 'release';

type PhaseCopy = {
  index: string;
  word: string;
  title: string;
  description: string;
  altitude: string;
  velocity: string;
};

interface StormSnapshot {
  ready: boolean;
  phase: StormPhase;
  progress: number;
  energy: number;
  shear: number;
  altitude: string;
  audioActive: boolean;
  audioFilterHz: number;
  imageLoaded: boolean;
  canvasFallback: boolean;
  assetFallback: boolean;
  reducedMotion: boolean;
  saved: boolean;
  frames: number;
  horizontalOverflow: number;
  quality: string;
  revision: string;
}

declare global {
  interface Window {
    __thunderheadScore?: {
      snapshot: () => StormSnapshot;
      setProgress: (value: number) => void;
      setShear: (value: number) => void;
      toggleAudio: () => Promise<void>;
      saveScore: () => void;
    };
  }
}

const root = document.documentElement;
const stage = required<HTMLElement>('#storm-stage');
const weatherField = required<HTMLElement>('.weather-field');
const canvas = required<HTMLCanvasElement>('#storm-canvas');
const context = canvas.getContext('2d');
const image = required<HTMLImageElement>('#storm-environment');
const phaseIndex = required<HTMLElement>('#phase-index');
const phaseTitle = required<HTMLElement>('#phase-title');
const phaseDescription = required<HTMLElement>('#phase-description');
const phaseWord = required<HTMLElement>('#phase-word');
const altitudeValue = required<HTMLElement>('#altitude-value');
const velocityValue = required<HTMLElement>('#velocity-value');
const shearValue = required<HTMLElement>('#shear-value');
const energyValue = required<HTMLOutputElement>('#energy-value');
const audioToggle = required<HTMLButtonElement>('#audio-toggle');
const audioLabel = required<HTMLElement>('#audio-label');
const saveButton = required<HTMLButtonElement>('#save-score');
const saveStatus = required<HTMLElement>('#save-status');
const liveStatus = required<HTMLElement>('#live-status');
const phaseButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-storm-target]')];

const params = new URLSearchParams(location.search);
const quality = params.get('quality') ?? 'high';
const revision = params.get('revision') ?? 'r153-score-sheet';
const reducedMotion = params.get('motion') === 'reduce'
  || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);
const forcedCanvasFallback = ['1', 'true', 'canvas'].includes(params.get('fallback') ?? '');
const forcedAssetFallback = ['1', 'true', 'image'].includes(params.get('assetFallback') ?? '');

const phases: Record<StormPhase, PhaseCopy> = {
  lift: {
    index: 'I · LIFT',
    word: 'LIFT',
    title: '暖空气离开地面。',
    description: '它携带水汽向上，云还没有重量，只有越来越快的呼吸。',
    altitude: '1.8 km',
    velocity: '8 m/s',
  },
  tower: {
    index: 'II · TOWER',
    word: 'TOWER',
    title: '上升气流开始建造高度。',
    description: '水滴在冷空气中凝结，释放的热量继续推高整座云塔。',
    altitude: '6.4 km',
    velocity: '24 m/s',
  },
  charge: {
    index: 'III · CHARGE',
    word: 'CHARGE',
    title: '冰晶和水滴交换电荷。',
    description: '上下气流把正负电荷拉开，亮光不是装饰，而是压力找到了一条出口。',
    altitude: '10.7 km',
    velocity: '39 m/s',
  },
  release: {
    index: 'IV · RELEASE',
    word: 'RAIN',
    title: '重量终于超过上升的力量。',
    description: '雨幕带走电荷和热量，风暴的声音从高空回到地面。',
    altitude: '12.4 km',
    velocity: '17 m/s',
  },
};

let progress = 0;
let energy = .08;
let shear = 0;
let phase: StormPhase = 'lift';
let imageLoaded = false;
let saved = false;
let frames = 0;
let animationFrame = 0;
let scrollFrame = 0;
let canvasFallback = forcedCanvasFallback || !context;
let assetFallback = forcedAssetFallback;
let audioContext: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;
let noiseFilter: BiquadFilterNode | null = null;
let lowOscillator: OscillatorNode | null = null;
let lowGain: GainNode | null = null;
let audioActive = false;
let audioFilterHz = 180;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Thunderhead Score: missing ${selector}`);
  return element;
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;

function phaseFor(value: number): StormPhase {
  if (value >= .86) return 'release';
  if (value >= .58) return 'charge';
  if (value >= .26) return 'tower';
  return 'lift';
}

function setRootNumber(name: string, value: number): void {
  root.style.setProperty(name, String(round(value)));
}

function progressFromScroll(): number {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  return clamp(-stage.getBoundingClientRect().top / max);
}

function scrollToProgress(value: number, behavior: ScrollBehavior = reducedMotion ? 'auto' : 'smooth'): void {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const top = scrollY + stage.getBoundingClientRect().top + clamp(value) * max;
  scrollTo({ top, behavior });
  if (reducedMotion) applyProgress(value, true);
}

function applyProgress(value: number, announce = false): void {
  progress = clamp(value);
  energy = clamp(.08 + progress * .92 + Math.abs(shear) * .08);
  const nextPhase = phaseFor(progress);
  const changed = nextPhase !== phase;
  phase = nextPhase;
  root.dataset.stormPhase = phase;
  setRootNumber('--progress', progress);
  setRootNumber('--energy', energy);

  const copy = phases[phase];
  phaseIndex.textContent = copy.index;
  phaseWord.textContent = copy.word;
  phaseTitle.textContent = copy.title;
  phaseDescription.textContent = copy.description;
  altitudeValue.textContent = copy.altitude;
  velocityValue.textContent = copy.velocity;
  energyValue.value = String(Math.round(energy * 100)).padStart(2, '0');
  saveButton.disabled = progress < .86;
  phaseButtons.forEach((button, index) => {
    const active = index === ['lift', 'tower', 'charge', 'release'].indexOf(phase);
    if (active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  if (changed || announce) liveStatus.textContent = `${copy.index}。${copy.title} ${copy.description}`;
  updateAudio();
}

function applyShear(value: number, announce = false): void {
  shear = clamp(value, -1, 1);
  setRootNumber('--shear', shear);
  const degrees = Math.round(shear * 32);
  shearValue.textContent = `${degrees >= 0 ? '+' : '−'}${String(Math.abs(degrees)).padStart(2, '0')}°`;
  energy = clamp(.08 + progress * .92 + Math.abs(shear) * .08);
  setRootNumber('--energy', energy);
  energyValue.value = String(Math.round(energy * 100)).padStart(2, '0');
  if (announce) liveStatus.textContent = `风切调整为 ${degrees} 度，云体轨迹和声场已经改变。`;
  updateAudio();
}

function resizeCanvas(): void {
  if (!context || canvasFallback) return;
  const bounds = weatherField.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const pixelRatio = Math.min(devicePixelRatio, quality === 'high' ? 1.6 : 1.15);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function drawWeather(time: number): void {
  if (!context || canvasFallback) return;
  const bounds = weatherField.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  context.clearRect(0, 0, width, height);

  const drift = reducedMotion ? 0 : time * .00009;
  const flowCount = quality === 'low' ? 7 : 13;
  context.save();
  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < flowCount; index += 1) {
    const lane = index / Math.max(1, flowCount - 1);
    const y = height * (.2 + lane * .62);
    const wave = Math.sin(drift * 9 + index * 1.7) * height * .025;
    context.beginPath();
    context.moveTo(-width * .08, y + wave);
    context.bezierCurveTo(
      width * (.22 + shear * .08),
      y - height * (.17 + progress * .07),
      width * (.58 + shear * .12),
      y + height * (.12 - lane * .1),
      width * 1.08,
      y - height * (.08 + progress * .04),
    );
    context.strokeStyle = index % 3 === 0
      ? `rgba(255,220,158,${.08 + energy * .14})`
      : `rgba(179,226,244,${.055 + energy * .1})`;
    context.lineWidth = index % 4 === 0 ? 1.4 : .65;
    context.stroke();
  }

  if (progress > .54) {
    const charge = clamp((progress - .54) / .28);
    context.shadowBlur = 14;
    context.shadowColor = 'rgba(255,213,141,.65)';
    context.strokeStyle = `rgba(255,229,183,${.18 + charge * .48})`;
    context.lineWidth = 1.15;
    for (let bolt = 0; bolt < 3; bolt += 1) {
      const startX = width * (.62 + bolt * .065 + shear * .035);
      let x = startX;
      let y = height * (.31 + bolt * .035);
      context.beginPath();
      context.moveTo(x, y);
      for (let segment = 0; segment < 7; segment += 1) {
        x += (Math.sin(time * .001 + bolt * 4 + segment * 2.1) * 7 + shear * 8);
        y += height * .035;
        context.lineTo(x, y);
      }
      context.stroke();
    }
    context.shadowBlur = 0;
  }

  if (progress > .72) {
    const rain = clamp((progress - .72) / .28);
    const rainCount = quality === 'low' ? 38 : 72;
    context.globalCompositeOperation = 'source-over';
    context.lineWidth = .75;
    for (let index = 0; index < rainCount; index += 1) {
      const seed = (index * 73) % 101;
      const x = width * (.43 + ((seed / 101 + drift * (1 + index % 3)) % 1) * .62);
      const y = (height * ((index * .137 + drift * 8) % 1));
      context.strokeStyle = `rgba(198,228,239,${.04 + rain * .23})`;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 10 - shear * 18, y + 34 + rain * 32);
      context.stroke();
    }
  }
  context.restore();
}

function animate(time: number): void {
  frames += 1;
  drawWeather(time);
  if (!reducedMotion) animationFrame = requestAnimationFrame(animate);
}

function buildNoiseBuffer(audio: AudioContext): AudioBuffer {
  const duration = 2;
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    const envelope = Math.sin(Math.PI * index / channel.length);
    channel[index] = (Math.random() * 2 - 1) * (.65 + envelope * .35);
  }
  return buffer;
}

async function ensureAudio(): Promise<void> {
  if (audioContext) return;
  const AudioConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioConstructor) {
    audioLabel.textContent = '此设备无声场';
    audioToggle.disabled = true;
    return;
  }
  audioContext = new AudioConstructor();
  noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = buildNoiseBuffer(audioContext);
  noiseSource.loop = true;
  noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = audioFilterHz;
  noiseGain = audioContext.createGain();
  noiseGain.gain.value = 0;
  noiseSource.connect(noiseFilter).connect(noiseGain).connect(audioContext.destination);
  noiseSource.start();

  lowOscillator = audioContext.createOscillator();
  lowOscillator.type = 'sine';
  lowOscillator.frequency.value = 42;
  lowGain = audioContext.createGain();
  lowGain.gain.value = 0;
  lowOscillator.connect(lowGain).connect(audioContext.destination);
  lowOscillator.start();
}

async function toggleAudio(): Promise<void> {
  await ensureAudio();
  if (!audioContext || !noiseGain || !lowGain) return;
  if (audioContext.state === 'suspended') await audioContext.resume();
  audioActive = !audioActive;
  root.dataset.audio = audioActive ? 'on' : 'off';
  audioToggle.setAttribute('aria-pressed', String(audioActive));
  audioLabel.textContent = audioActive ? '云体正在发声' : '听见云体';
  updateAudio();
  liveStatus.textContent = audioActive ? '天气声场已开启，声音会随云体能量和风切改变。' : '天气声场已静音。';
}

function updateAudio(): void {
  if (!audioContext || !noiseGain || !noiseFilter || !lowGain || !lowOscillator) return;
  const now = audioContext.currentTime;
  audioFilterHz = Math.round(180 + energy * 1250 + Math.abs(shear) * 260);
  noiseFilter.frequency.setTargetAtTime(audioFilterHz, now, .12);
  noiseGain.gain.setTargetAtTime(audioActive ? .018 + energy * .085 : 0, now, .14);
  lowOscillator.frequency.setTargetAtTime(38 + progress * 25 + shear * 4, now, .18);
  lowGain.gain.setTargetAtTime(audioActive ? .006 + Math.max(0, progress - .45) * .045 : 0, now, .18);
}

function saveScore(): void {
  if (progress < .86) {
    scrollToProgress(1);
    return;
  }
  saved = true;
  root.dataset.saved = 'true';
  saveButton.dataset.saved = 'true';
  saveButton.querySelector('span')!.textContent = '这段合唱谱已保存';
  const shearText = shear >= 0 ? `东向 ${Math.round(Math.abs(shear) * 32)}°` : `西向 ${Math.round(Math.abs(shear) * 32)}°`;
  saveStatus.textContent = `能量 ${Math.round(energy * 100)} · 风切 ${shearText} · 四个乐章已写入本次浏览状态。`;
  liveStatus.textContent = '雷暴合唱谱已保存。';
}

function markCanvasFallback(reason: string): void {
  canvasFallback = true;
  root.dataset.canvasFallback = 'true';
  canvas.hidden = true;
  liveStatus.textContent = `${reason}。环境素材、阶段选择和保存仍可使用。`;
}

function markAssetFallback(): void {
  assetFallback = true;
  root.dataset.assetFallback = 'true';
  liveStatus.textContent = '雷暴环境素材未能加载，已使用天气色场回退；阶段和互动仍可继续。';
}

image.addEventListener('load', () => {
  imageLoaded = true;
  root.dataset.stormReady = 'true';
  liveStatus.textContent = '雷暴合唱谱已经准备。滚动进入云体，移动指针改变风切。';
}, { once: true });
image.addEventListener('error', () => {
  imageLoaded = false;
  markAssetFallback();
  root.dataset.stormReady = 'true';
}, { once: true });
if (forcedAssetFallback) markAssetFallback();
else if (image.complete && image.naturalWidth > 0) {
  imageLoaded = true;
  root.dataset.stormReady = 'true';
}
if (forcedCanvasFallback) markCanvasFallback('已按要求启用 Canvas 回退');

addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    applyProgress(progressFromScroll());
  });
}, { passive: true });
addEventListener('pointermove', (event) => applyShear((event.clientX / innerWidth - .5) * 2), { passive: true });
addEventListener('resize', resizeCanvas, { passive: true });
addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') applyShear(shear + .12, true);
  if (event.key === 'ArrowLeft') applyShear(shear - .12, true);
  if (event.key === 'ArrowDown' || event.key === 'PageDown') scrollToProgress(progress + .2);
  if (event.key === 'ArrowUp' || event.key === 'PageUp') scrollToProgress(progress - .2);
  if (event.key === 'Home') scrollToProgress(0);
  if (event.key === 'End') scrollToProgress(1);
  if (event.key === ' ') {
    event.preventDefault();
    void toggleAudio();
  }
  if (event.key.toLowerCase() === 's' && !saveButton.disabled) saveScore();
});

phaseButtons.forEach((button) => button.addEventListener('click', () => {
  scrollToProgress(Number(button.dataset.stormTarget ?? 0));
}));
audioToggle.addEventListener('click', () => void toggleAudio());
saveButton.addEventListener('click', saveScore);
addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrame);
  cancelAnimationFrame(scrollFrame);
  noiseSource?.stop();
  lowOscillator?.stop();
  void audioContext?.close();
});

root.dataset.canvasFallback = String(canvasFallback);
root.dataset.assetFallback = String(assetFallback);
root.dataset.saved = 'false';
resizeCanvas();
applyProgress(progressFromScroll());
applyShear(0);
if (context && !canvasFallback) {
  drawWeather(0);
  if (!reducedMotion) animationFrame = requestAnimationFrame(animate);
}
setTimeout(() => {
  if (root.dataset.stormReady !== 'true') {
    if (!imageLoaded) markAssetFallback();
    root.dataset.stormReady = 'true';
  }
}, 4500);

window.__thunderheadScore = {
  snapshot: () => ({
    ready: root.dataset.stormReady === 'true',
    phase,
    progress: round(progress),
    energy: round(energy),
    shear: round(shear),
    altitude: phases[phase].altitude,
    audioActive,
    audioFilterHz,
    imageLoaded,
    canvasFallback,
    assetFallback,
    reducedMotion,
    saved,
    frames,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    quality,
    revision,
  }),
  setProgress: (value: number) => {
    applyProgress(value, true);
    scrollToProgress(value, 'auto');
  },
  setShear: (value: number) => applyShear(value, true),
  toggleAudio,
  saveScore,
};

export {};
