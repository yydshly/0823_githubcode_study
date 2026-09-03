type Phase = 'entry' | 'walking' | 'complete' | 'saved';
type Pace = 'slow' | 'steady' | 'brisk';

type RainlightSnapshot = {
  phase: Phase;
  progress: number;
  place: string;
  note: string;
  pace: Pace;
  saved: boolean;
  assetLoaded: boolean;
  assetFallback: boolean;
  canvasAvailable: boolean;
  audio: boolean;
};

declare global {
  interface Window {
    __rainlightR163?: {
      snapshot: () => RainlightSnapshot;
      setProgress: (progress: number) => void;
      start: () => void;
      save: () => void;
      edit: () => void;
    };
    webkitAudioContext?: typeof AudioContext;
  }
}

const root = document.documentElement;
const form = document.querySelector<HTMLFormElement>('#walk-form');
const placeInput = document.querySelector<HTMLInputElement>('#place-input');
const noteInput = document.querySelector<HTMLTextAreaElement>('#note-input');
const canvas = document.querySelector<HTMLCanvasElement>('#trace-canvas');
const dragSurface = document.querySelector<HTMLElement>('#drag-surface');
const sceneImage = document.querySelector<HTMLImageElement>('#scene-image');
const audioToggle = document.querySelector<HTMLButtonElement>('#audio-toggle');
const saveButton = document.querySelector<HTMLButtonElement>('#save-letter');
const editButton = document.querySelector<HTMLButtonElement>('#edit-letter');
const progressBar = document.querySelector<HTMLElement>('#progress-bar');
const progressLabel = document.querySelector<HTMLElement>('#progress-label');
const phaseIndex = document.querySelector<HTMLElement>('#phase-index');
const walkingPlace = document.querySelector<HTMLElement>('#walking-place');
const walkingPace = document.querySelector<HTMLElement>('#walking-pace');
const letterPlace = document.querySelector<HTMLElement>('#letter-place');
const letterPace = document.querySelector<HTMLElement>('#letter-pace');
const letterNote = document.querySelector<HTMLElement>('#letter-note');
const letterTime = document.querySelector<HTMLElement>('#letter-time');
const saveStatus = document.querySelector<HTMLElement>('#save-status');

if (!form || !placeInput || !noteInput || !canvas || !dragSurface || !sceneImage ||
  !audioToggle || !saveButton || !editButton || !progressBar || !progressLabel ||
  !phaseIndex || !walkingPlace || !walkingPace || !letterPlace || !letterPace ||
  !letterNote || !letterTime || !saveStatus) {
  throw new Error('Rainlight product surface is incomplete.');
}

const paceLabels: Record<Pace, string> = {
  slow: '慢走',
  steady: '平稳',
  brisk: '快步'
};

const state: RainlightSnapshot = {
  phase: 'entry',
  progress: 0,
  place: placeInput.value.trim(),
  note: noteInput.value.trim(),
  pace: 'slow',
  saved: false,
  assetLoaded: false,
  assetFallback: false,
  canvasAvailable: Boolean(canvas.getContext('2d')),
  audio: false
};

let dragging = false;
let audioContext: AudioContext | null = null;
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

function selectedPace(): Pace {
  const selected = new FormData(form).get('pace');
  return selected === 'steady' || selected === 'brisk' ? selected : 'slow';
}

function syncContent() {
  state.place = placeInput.value.trim() || '未命名的转角';
  state.note = noteInput.value.trim() || '这段雨夜没有留下文字，只留下了一条光。';
  state.pace = selectedPace();
  const paceLabel = paceLabels[state.pace];
  walkingPlace.textContent = state.place;
  walkingPace.textContent = paceLabel;
  letterPlace.textContent = state.place;
  letterPace.textContent = paceLabel;
  letterNote.textContent = state.note;
}

function interpolateTrace(width: number, height: number) {
  const control = [
    { x: width * .53, y: height * 1.02 },
    { x: width * .56, y: height * .79 },
    { x: width * .70, y: height * .64 },
    { x: width * .69, y: height * .44 },
    { x: width * .76, y: height * .35 }
  ];
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index < 120; index += 1) {
    const normalized = index / 119;
    const segmentFloat = normalized * (control.length - 1);
    const segment = Math.min(control.length - 2, Math.floor(segmentFloat));
    const local = segmentFloat - segment;
    const start = control[segment];
    const end = control[segment + 1];
    const bend = Math.sin(normalized * Math.PI * 5) * width * .004;
    points.push({
      x: start.x + (end.x - start.x) * local + bend,
      y: start.y + (end.y - start.y) * local
    });
  }
  return points;
}

function drawTrace() {
  const context = canvas.getContext('2d');
  if (!context) {
    state.canvasAvailable = false;
    root.dataset.canvas = 'fallback';
    return;
  }
  state.canvasAvailable = true;
  root.dataset.canvas = 'available';
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * dpr));
  canvas.height = Math.max(1, Math.round(bounds.height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);

  const points = interpolateTrace(bounds.width, bounds.height);
  const visibleCount = Math.max(0, Math.round((points.length - 1) * state.progress));
  if (visibleCount < 2) return;

  const gradient = context.createLinearGradient(
    bounds.width * .53,
    bounds.height,
    bounds.width * .76,
    bounds.height * .35
  );
  gradient.addColorStop(0, 'rgba(116, 226, 218, .28)');
  gradient.addColorStop(.58, 'rgba(255, 177, 84, .82)');
  gradient.addColorStop(1, 'rgba(255, 245, 210, .98)');
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index <= visibleCount; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.strokeStyle = gradient;
  context.lineWidth = 2.2;
  context.lineCap = 'round';
  context.shadowColor = 'rgba(255, 187, 93, .9)';
  context.shadowBlur = 20;
  context.stroke();

  const end = points[visibleCount];
  const glow = context.createRadialGradient(end.x, end.y, 0, end.x, end.y, 26);
  glow.addColorStop(0, 'rgba(255, 244, 206, 1)');
  glow.addColorStop(.18, 'rgba(255, 187, 91, .78)');
  glow.addColorStop(1, 'rgba(255, 187, 91, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(end.x, end.y, 26, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = .28 + state.progress * .35;
  context.fillStyle = 'rgba(255, 193, 110, .7)';
  for (let index = 0; index < visibleCount; index += 14) {
    const point = points[index];
    context.beginPath();
    context.ellipse(point.x + 8, point.y + 12, 2.5 + state.progress * 3, 12, -.16, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function render() {
  root.dataset.phase = state.phase;
  root.dataset.saved = String(state.saved);
  root.dataset.audio = state.audio ? 'on' : 'off';
  root.style.setProperty('--progress', state.progress.toFixed(4));
  const percent = Math.round(state.progress * 100);
  progressBar.style.width = `${percent}%`;
  dragSurface.setAttribute('aria-valuenow', String(percent));

  if (state.phase === 'entry') {
    phaseIndex.textContent = '01 / 写下';
    progressLabel.textContent = '尚未出发';
  } else if (state.phase === 'walking') {
    phaseIndex.textContent = '02 / 夜行';
    progressLabel.textContent = `${percent}%`;
  } else {
    phaseIndex.textContent = '03 / 信笺';
    progressLabel.textContent = state.saved ? '已保存' : '抵达暖光';
  }
  drawTrace();
}

function setProgress(next: number) {
  if (state.phase !== 'walking') return;
  state.progress = Math.min(1, Math.max(0, next));
  if (state.progress >= .995) {
    state.progress = 1;
    state.phase = 'complete';
    letterTime.textContent = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
    saveStatus.textContent = '光迹已完成，可以把这封夜行信保存到本机。';
  }
  render();
}

function start() {
  syncContent();
  state.progress = .04;
  state.phase = 'walking';
  state.saved = false;
  saveStatus.textContent = '完成夜行后即可保存。';
  render();
  dragSurface.focus({ preventScroll: true });
}

function save() {
  if (state.phase !== 'complete' && state.phase !== 'saved') return;
  try {
    localStorage.setItem('kage-r163-rainlight-letter', JSON.stringify({
      version: 1,
      place: state.place,
      note: state.note,
      pace: state.pace,
      savedAt: new Date().toISOString(),
      truth: 'Personal visual memory; not map, location, or navigation data.'
    }));
    state.saved = true;
    state.phase = 'saved';
    saveStatus.textContent = '已保存到这台设备。你仍可以重新编辑。';
  } catch {
    saveStatus.textContent = '浏览器阻止了本机保存；夜行信仍保留在当前页面。';
  }
  render();
}

function edit() {
  state.phase = 'entry';
  state.progress = 0;
  state.saved = false;
  render();
  placeInput.focus({ preventScroll: true });
}

function updateFromPointer(clientX: number) {
  const bounds = dragSurface.getBoundingClientRect();
  setProgress((clientX - bounds.left) / Math.max(1, bounds.width));
}

function stopAudio() {
  rainSource?.stop();
  rainSource?.disconnect();
  rainGain?.disconnect();
  rainSource = null;
  rainGain = null;
  if (audioContext && audioContext.state !== 'closed') void audioContext.close();
  audioContext = null;
  state.audio = false;
  audioToggle.setAttribute('aria-pressed', 'false');
  audioToggle.querySelector('b')!.textContent = '听见雨声';
  render();
}

async function startAudio() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    audioToggle.querySelector('b')!.textContent = '浏览器不支持声音';
    return;
  }
  audioContext = new Context();
  await audioContext.resume();
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate);
  const channel = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < channel.length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = last * .985 + white * .015;
    channel[index] = last * 2.2;
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 1450;
  gain.gain.value = .045;
  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start();
  rainSource = source;
  rainGain = gain;
  state.audio = true;
  audioToggle.setAttribute('aria-pressed', 'true');
  audioToggle.querySelector('b')!.textContent = '关闭雨声';
  render();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  start();
});

window.addEventListener('wheel', (event) => {
  if (state.phase !== 'walking') return;
  event.preventDefault();
  const multiplier = state.pace === 'slow' ? .00065 : state.pace === 'steady' ? .0009 : .00115;
  setProgress(state.progress + event.deltaY * multiplier);
}, { passive: false });

dragSurface.addEventListener('pointerdown', (event) => {
  if (state.phase !== 'walking') return;
  dragging = true;
  dragSurface.setPointerCapture(event.pointerId);
  updateFromPointer(event.clientX);
});
dragSurface.addEventListener('pointermove', (event) => {
  if (dragging) updateFromPointer(event.clientX);
});
dragSurface.addEventListener('pointerup', (event) => {
  dragging = false;
  if (dragSurface.hasPointerCapture(event.pointerId)) dragSurface.releasePointerCapture(event.pointerId);
});
dragSurface.addEventListener('pointercancel', () => { dragging = false; });
dragSurface.addEventListener('keydown', (event) => {
  if (state.phase !== 'walking') return;
  const step = event.shiftKey ? .15 : .06;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageDown') {
    event.preventDefault();
    setProgress(state.progress + step);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageUp') {
    event.preventDefault();
    setProgress(state.progress - step);
  } else if (event.key === 'End') {
    event.preventDefault();
    setProgress(1);
  }
});

audioToggle.addEventListener('click', () => {
  if (state.audio) stopAudio();
  else void startAudio();
});
saveButton.addEventListener('click', save);
editButton.addEventListener('click', edit);
window.addEventListener('resize', drawTrace);
window.addEventListener('beforeunload', stopAudio);

function markAssetReady() {
  state.assetLoaded = sceneImage.naturalWidth > 1000;
  state.assetFallback = !state.assetLoaded;
  root.dataset.asset = state.assetLoaded ? 'loaded' : 'fallback';
}

sceneImage.addEventListener('load', markAssetReady);
sceneImage.addEventListener('error', () => {
  state.assetLoaded = false;
  state.assetFallback = true;
  root.dataset.asset = 'fallback';
  sceneImage.hidden = true;
});
if (sceneImage.complete) markAssetReady();

window.__rainlightR163 = {
  snapshot: () => ({ ...state }),
  setProgress,
  start,
  save,
  edit
};

syncContent();
render();
root.dataset.r163Ready = 'true';

export {};
