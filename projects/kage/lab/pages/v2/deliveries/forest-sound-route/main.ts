import leafSoundUrl from './assets/leaf-canopy.wav?url';
import hollowSoundUrl from './assets/tree-hollow.wav?url';
import creekSoundUrl from './assets/creek-stone.wav?url';
import insectSoundUrl from './assets/meadow-insect.wav?url';

type SoundId = 'leaf' | 'hollow' | 'creek' | 'insect';
type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'muted' | 'unavailable';

type SoundSource = {
  id: SoundId;
  index: string;
  name: string;
  position: string;
  observation: string;
  shortObservation: string;
  url: string;
  point: readonly [number, number];
};

type ForestSoundSnapshot = {
  ready: boolean;
  phase: 'discover' | 'listening' | 'route-ready' | 'saved';
  activeSound: SoundId | null;
  collected: SoundId[];
  routeReady: boolean;
  saved: boolean;
  audioState: AudioState;
  audioSource: string | null;
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
  horizontalOverflow: boolean;
  assetCount: number;
  visualRevision: string;
};

declare global {
  interface Window {
    __forestSoundRoute?: {
      snapshot: () => ForestSoundSnapshot;
      select: (id: SoundId, play?: boolean) => Promise<void>;
      stop: () => void;
      save: () => void;
    };
  }
}

const sources: readonly SoundSource[] = [
  {
    id: 'leaf',
    index: '01',
    name: '风穿过叶幕',
    position: '林冠下方 · 距离 0.4 m',
    observation: '先听见的是一整片叶子的摩擦，不是某一片叶子。风变缓时，高处的小叶仍会继续抖动。',
    shortObservation: '叶幕会把一阵风拆成许多细小的摩擦。',
    url: leafSoundUrl,
    point: [51, 22]
  },
  {
    id: 'hollow',
    index: '02',
    name: '树洞保存回声',
    position: '老栎树中段 · 距离 2.1 m',
    observation: '中空木质把短促敲击拉得更长。低频停留在洞里，像一只看不见的动物翻了个身。',
    shortObservation: '中空树干会放大低频，并延长短促声响。',
    url: hollowSoundUrl,
    point: [64, 43]
  },
  {
    id: 'creek',
    index: '03',
    name: '溪水绕过石头',
    position: '浅溪转弯处 · 距离 8.7 m',
    observation: '持续水流是底色，偶尔更亮的水滴从石头边缘跳出来。改变站位，水声的宽度也会改变。',
    shortObservation: '石头让连续水流出现可辨认的明亮水滴。',
    url: creekSoundUrl,
    point: [37, 77]
  },
  {
    id: 'insect',
    index: '04',
    name: '昆虫在光里应答',
    position: '林下光斑 · 距离 5.3 m',
    observation: '短促鸣叫不是同时发生：一只发声，另一只在稍远的位置回应，声音在光斑之间移动。',
    shortObservation: '两组鸣叫轮流出现，让声源在光斑间移动。',
    url: insectSoundUrl,
    point: [52, 58]
  }
];

const body = document.body;
const stage = document.querySelector<HTMLElement>('#forest-field');
const hotspots = [...document.querySelectorAll<HTMLButtonElement>('[data-sound-id]')];
const collectedCount = document.querySelector<HTMLElement>('#collected-count');
const soundIndex = document.querySelector<HTMLElement>('#sound-index');
const soundPosition = document.querySelector<HTMLElement>('#sound-position');
const soundName = document.querySelector<HTMLElement>('#sound-name');
const soundObservation = document.querySelector<HTMLElement>('#sound-observation');
const audioStatus = document.querySelector<HTMLElement>('#audio-status');
const playToggle = document.querySelector<HTMLButtonElement>('#play-toggle');
const playLabel = document.querySelector<HTMLElement>('#play-label');
const muteToggle = document.querySelector<HTMLButtonElement>('#mute-toggle');
const volumeControl = document.querySelector<HTMLInputElement>('#volume-control');
const routeList = document.querySelector<HTMLOListElement>('#route-list');
const routeCount = document.querySelector<HTMLElement>('#route-count');
const routePath = document.querySelector<SVGPathElement>('#route-path');
const routeShadow = document.querySelector<SVGPathElement>('#route-shadow');
const saveRoute = document.querySelector<HTMLButtonElement>('#save-route');
const saveLabel = document.querySelector<HTMLElement>('#save-label');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const liveStatus = document.querySelector<HTMLElement>('#live-status');

if (!stage || !collectedCount || !soundIndex || !soundPosition || !soundName || !soundObservation || !audioStatus
  || !playToggle || !playLabel || !muteToggle || !volumeControl || !routeList || !routeCount || !routePath
  || !routeShadow || !saveRoute || !saveLabel || !saveStatus || !liveStatus) {
  throw new Error('Forest sound route DOM contract is incomplete.');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).get('motion') === 'reduce';
const tracks = new Map<SoundId, HTMLAudioElement>();
const collected: SoundId[] = [];
let activeSound: SoundId | null = null;
let activeTrack: HTMLAudioElement | null = null;
let audioState: AudioState = 'idle';
let muted = false;
let volume = 0.65;
let saved = false;
let disposed = false;

function sourceFor(id: SoundId): SoundSource {
  const source = sources.find((candidate) => candidate.id === id);
  if (!source) throw new Error(`Unknown forest sound source: ${id}`);
  return source;
}

function isSoundId(value: string | undefined): value is SoundId {
  return value === 'leaf' || value === 'hollow' || value === 'creek' || value === 'insect';
}

function setAudioState(next: AudioState, message?: string): void {
  audioState = next;
  body.dataset.audioState = next;
  stage.dataset.audioState = next;
  const isPlaying = next === 'playing' || (next === 'muted' && Boolean(activeTrack && !activeTrack.paused));
  playToggle.setAttribute('aria-pressed', String(isPlaying));
  playLabel.textContent = isPlaying ? '停止当前声音' : activeSound ? '再次试听' : '选择后试听';
  if (message) audioStatus.textContent = message;
}

function updatePhase(): void {
  const routeReady = collected.length >= 3;
  const phase: ForestSoundSnapshot['phase'] = saved ? 'saved' : routeReady ? 'route-ready' : activeSound ? 'listening' : 'discover';
  body.dataset.phase = phase;
  body.dataset.routeReady = String(routeReady);
  stage.dataset.routeReady = String(routeReady);
  body.dataset.saved = String(saved);
}

function curvedRoute(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x - .8} ${y} a .8 .8 0 1 0 1.6 0 a .8 .8 0 1 0 -1.6 0`;
  }
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpointX = (previous[0] + current[0]) / 2;
    path += ` C ${midpointX} ${previous[1]}, ${midpointX} ${current[1]}, ${current[0]} ${current[1]}`;
  }
  return path;
}

function updateRoute(): void {
  collectedCount.textContent = String(Math.min(collected.length, 3));
  routeCount.textContent = `${Math.min(collected.length, 3)} / 3`;
  const slots = [...routeList.querySelectorAll<HTMLLIElement>('[data-route-slot]')];
  slots.forEach((slot, index) => {
    const id = collected[index];
    const label = slot.querySelector<HTMLElement>('b');
    if (label) label.textContent = id ? sourceFor(id).name : '等待声源';
    slot.dataset.filled = String(Boolean(id));
  });
  const points = collected.slice(0, 3).map((id) => sourceFor(id).point);
  const path = curvedRoute(points);
  routePath.setAttribute('d', path);
  routeShadow.setAttribute('d', path);
  hotspots.forEach((hotspot) => {
    const id = hotspot.dataset.soundId;
    hotspot.dataset.collected = String(isSoundId(id) && collected.includes(id));
  });

  const remaining = Math.max(0, 3 - collected.length);
  saveRoute.disabled = remaining > 0;
  saveLabel.textContent = remaining > 0 ? `再发现 ${remaining} 个声音` : saved ? '路线已保存' : '保存这条森林声音路线';
  updatePhase();
}

function stopActive(updateState = true): void {
  if (activeTrack) {
    activeTrack.pause();
    activeTrack.currentTime = 0;
  }
  if (updateState) setAudioState(activeSound ? 'paused' : 'idle', '声音已停止；已发现的路线仍然保留。');
}

function ensureTrack(source: SoundSource): HTMLAudioElement {
  const existing = tracks.get(source.id);
  if (existing) return existing;
  const audio = new Audio(source.url);
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = volume;
  audio.muted = muted;
  audio.dataset.soundId = source.id;
  audio.addEventListener('playing', () => {
    if (activeSound !== source.id) return;
    setAudioState(muted ? 'muted' : 'playing', `${source.name}正在播放 · 程序化自然声预览，不是现场录音。`);
  });
  audio.addEventListener('error', () => {
    if (activeSound !== source.id) return;
    setAudioState('unavailable', '声音暂不可用；观察、收集与保存仍可继续。');
  });
  tracks.set(source.id, audio);
  return audio;
}

async function playSource(id: SoundId): Promise<void> {
  const source = sourceFor(id);
  stopActive(false);
  activeTrack = ensureTrack(source);
  activeTrack.muted = muted;
  activeTrack.volume = volume;
  activeTrack.currentTime = 0;
  setAudioState('loading', `正在靠近${source.name}……`);
  try {
    await activeTrack.play();
    if (activeSound === id && !activeTrack.paused) {
      setAudioState(muted ? 'muted' : 'playing', `${source.name}正在播放 · 程序化自然声预览，不是现场录音。`);
    }
  } catch {
    setAudioState('unavailable', '声音暂不可用；观察、收集与保存仍可继续。');
  }
}

async function selectSource(id: SoundId, shouldPlay = true): Promise<void> {
  const source = sourceFor(id);
  activeSound = id;
  saved = false;
  body.dataset.activeSound = id;
  stage.dataset.activeSound = id;
  soundIndex.textContent = `已定位 · ${source.index}`;
  soundPosition.textContent = source.position;
  soundName.textContent = source.name;
  soundObservation.textContent = source.observation;
  playToggle.disabled = false;
  saveStatus.textContent = '';

  hotspots.forEach((hotspot) => hotspot.setAttribute('aria-pressed', String(hotspot.dataset.soundId === id)));
  if (!collected.includes(id) && collected.length < 3) collected.push(id);
  updateRoute();
  liveStatus.textContent = `${source.name}。${source.shortObservation} 已收集 ${Math.min(collected.length, 3)} 个声源。`;
  if (shouldPlay) await playSource(id);
}

function togglePlayback(): void {
  if (!activeSound) return;
  if (activeTrack && !activeTrack.paused) stopActive();
  else void playSource(activeSound);
}

function toggleMute(): void {
  muted = !muted;
  tracks.forEach((track) => { track.muted = muted; });
  muteToggle.setAttribute('aria-pressed', String(muted));
  muteToggle.textContent = muted ? '取消静音' : '静音';
  const isPlaying = Boolean(activeTrack && !activeTrack.paused);
  setAudioState(muted && isPlaying ? 'muted' : isPlaying ? 'playing' : activeSound ? 'paused' : 'idle',
    muted ? '已静音；视觉路线与观察提示继续更新。' : '声音已恢复。');
}

function setVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  tracks.forEach((track) => { track.volume = volume; });
  if (audioState !== 'unavailable') {
    audioStatus.textContent = `音量 ${Math.round(volume * 100)}% · 程序化自然声预览，不是现场录音。`;
  }
}

function saveListeningRoute(): void {
  if (collected.length < 3) return;
  saved = true;
  updateRoute();
  const names = collected.slice(0, 3).map((id) => sourceFor(id).name).join(' → ');
  saveStatus.textContent = `已保存：${names}`;
  liveStatus.textContent = `森林声音路线已保存。${names}。`;
}

function cycleFrom(element: HTMLButtonElement, direction: number): void {
  const currentIndex = hotspots.indexOf(element);
  const next = hotspots[(currentIndex + direction + hotspots.length) % hotspots.length];
  next.focus({ preventScroll: true });
}

function onStagePointerMove(event: PointerEvent): void {
  if (reducedMotion) return;
  const bounds = stage.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - .5) * 2;
  const y = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - .5) * 2;
  stage.style.setProperty('--pointer-x', x.toFixed(3));
  stage.style.setProperty('--pointer-y', y.toFixed(3));
}

function snapshot(): ForestSoundSnapshot {
  return {
    ready: document.documentElement.dataset.forestSoundReady === 'true',
    phase: body.dataset.phase as ForestSoundSnapshot['phase'],
    activeSound,
    collected: [...collected],
    routeReady: collected.length >= 3,
    saved,
    audioState,
    audioSource: activeTrack?.currentSrc || activeTrack?.src || null,
    muted,
    volume,
    reducedMotion,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    assetCount: sources.length,
    visualRevision: new URLSearchParams(location.search).get('revision') || 'r131-forest-sound-route'
  };
}

hotspots.forEach((hotspot) => {
  hotspot.addEventListener('click', () => {
    const id = hotspot.dataset.soundId;
    if (isSoundId(id)) void selectSource(id, true);
  });
  hotspot.addEventListener('keydown', (event) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    cycleFrom(hotspot, direction);
  });
});

playToggle.addEventListener('click', togglePlayback);
muteToggle.addEventListener('click', toggleMute);
volumeControl.addEventListener('input', () => setVolume(Number(volumeControl.value)));
saveRoute.addEventListener('click', saveListeningRoute);
stage.addEventListener('pointermove', onStagePointerMove, { passive: true });
stage.addEventListener('pointerleave', () => {
  stage.style.setProperty('--pointer-x', '0');
  stage.style.setProperty('--pointer-y', '0');
});

function dispose(): void {
  if (disposed) return;
  disposed = true;
  stopActive(false);
  tracks.forEach((track) => {
    track.pause();
    track.removeAttribute('src');
    track.load();
  });
  tracks.clear();
}

window.__forestSoundRoute = { snapshot, select: selectSource, stop: () => stopActive(), save: saveListeningRoute };
updateRoute();
setVolume(volume);
document.documentElement.dataset.forestSoundReady = 'true';
body.dataset.forestSoundReady = 'true';
liveStatus.textContent = '森林声音场已准备好。四个声源等待发现。';
addEventListener('pagehide', dispose, { once: true });
