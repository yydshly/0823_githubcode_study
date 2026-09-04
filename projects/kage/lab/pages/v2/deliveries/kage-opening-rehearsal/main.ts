type Rhythm = 'breathe' | 'strike' | 'drift';
type Phase = 'waiting' | 'spotlight' | 'reveal' | 'ready' | 'saved';
type AudioState = 'idle' | 'playing' | 'played' | 'unavailable';

declare global {
  interface Window {
    __kageR172?: {
      snapshot: () => {
        phase: Phase;
        rhythm: Rhythm;
        progress: number;
        saved: boolean;
        audio: AudioState;
        asset: string;
        idea: string;
        horizontalOverflow: boolean;
        reducedMotion: boolean;
      };
      setProgress: (value: number) => void;
      setRhythm: (value: Rhythm) => void;
      save: () => void;
    };
  }
}

const root = document.documentElement;
const timeline = document.querySelector<HTMLElement>('#timeline');
const scene = document.querySelector<HTMLElement>('#scene');
const canvas = document.querySelector<HTMLCanvasElement>('#light-score');
const heroAsset = document.querySelector<HTMLImageElement>('[data-hero-asset]');
const form = document.querySelector<HTMLFormElement>('#rehearsal-controls');
const ideaInput = document.querySelector<HTMLTextAreaElement>('#idea-input');
const progressInput = document.querySelector<HTMLInputElement>('#progress-input');
const progressLabel = document.querySelector<HTMLElement>('#progress-label');
const phaseIndex = document.querySelector<HTMLElement>('#phase-index');
const phaseTitle = document.querySelector<HTMLElement>('#phase-title');
const phaseCopy = document.querySelector<HTMLElement>('#phase-copy');
const deckStatus = document.querySelector<HTMLElement>('#deck-status');
const listenButton = document.querySelector<HTMLButtonElement>('#listen-button');
const resultIdea = document.querySelector<HTMLElement>('#result-idea');
const resultFeeling = document.querySelector<HTMLElement>('#result-feeling');
const resultAction = document.querySelector<HTMLElement>('#result-action');
const resultTitle = document.querySelector<HTMLElement>('#result-title');
const continueAction = document.querySelector<HTMLAnchorElement>('#continue-action');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rhythmCopy: Record<Rhythm, { label: string; feeling: string; action: string; status: string }> = {
  breathe: {
    label: '慢慢靠近',
    feeling: '像在晨光中慢慢靠近一张尚未干透的纸',
    action: '滚动让投影从雾中逐层显影',
    status: '画面会留出呼吸，声音以缓慢双拍引导靠近。'
  },
  strike: {
    label: '突然看见',
    feeling: '像幕布突然接住一道清晰而温暖的光',
    action: '蓄势后快速切开蒙版，让主体瞬间成立',
    status: '对比会在中段突然提高，声音以短促三拍完成显影。'
  },
  drift: {
    label: '向远处展开',
    feeling: '像视线越过层层纸幕，发现远处仍有空间',
    action: '滚动推动景深、横向漂移与远景光路',
    status: '画面会向远处拉开，声音以舒展的上行音程回应。'
  }
};

const phaseCopyMap: Array<{ at: number; phase: Exclude<Phase, 'saved'>; title: string; copy: string }> = [
  { at: 0, phase: 'waiting', title: '房间还在等一句话', copy: '写下想法，选择第一秒的节奏，再用滚轮让它从模糊走向清晰。' },
  { at: .2, phase: 'spotlight', title: '光开始寻找主体', copy: '开场不是装饰：它正在确认谁应该被看见，以及第一眼要留下什么感受。' },
  { at: .5, phase: 'reveal', title: '想法正在纸幕上显影', copy: '同一份素材随滚动、节奏和光路连续变化，形成一个可感知的产品动作。' },
  { at: .82, phase: 'ready', title: '第一幕已经可以保存', copy: '开场拥有情绪、记忆动作、媒介职责和继续创作的明确落点。' }
];

let progress = 0;
let rhythm: Rhythm = 'breathe';
let saved = false;
let audioState: AudioState = 'idle';
let pointerX = .7;
let pointerY = .45;
let dragging = false;
let dragStartY = 0;
let dragStartProgress = 0;
let frame = 0;
let audioContext: AudioContext | null = null;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function phaseFor(value: number): Exclude<Phase, 'saved'> {
  return [...phaseCopyMap].reverse().find((entry) => value >= entry.at)?.phase ?? 'waiting';
}

function activePhaseEntry(value: number) {
  return [...phaseCopyMap].reverse().find((entry) => value >= entry.at) ?? phaseCopyMap[0];
}

function updateContinuation() {
  if (!continueAction || !ideaInput) return;
  const params = new URLSearchParams({
    provider: 'codex',
    quality: 'high',
    brief: ideaInput.value.trim(),
    opening: rhythmCopy[rhythm].label,
    source: 'kage-opening-rehearsal-r172'
  });
  continueAction.href = `../../../../workbench.html?${params.toString()}`;
}

function updateScoreRail() {
  const active = progress < .2 ? 0 : progress < .5 ? 1 : progress < .82 ? 2 : 3;
  document.querySelectorAll<HTMLElement>('[data-score-step]').forEach((step, index) => {
    step.classList.toggle('is-current', index === active);
  });
}

function renderProgress(value: number, syncScroll = false) {
  progress = clamp(value);
  const effective = rhythm === 'strike'
    ? progress < .48 ? progress * .62 : .3 + (progress - .48) * 1.35
    : rhythm === 'drift' ? Math.pow(progress, .82) : progress;
  const entry = activePhaseEntry(progress);
  const percent = Math.round(progress * 100);
  root.dataset.phase = saved ? 'saved' : entry.phase;
  root.style.setProperty('--progress', effective.toFixed(4));
  root.style.setProperty('--reveal', `${Math.min(100, effective * 112).toFixed(1)}%`);
  root.style.setProperty('--scene-scale', (1.075 - effective * .075).toFixed(4));
  root.style.setProperty('--scene-blur', `${(15 * (1 - effective)).toFixed(2)}px`);
  root.style.setProperty('--scene-x', `${rhythm === 'drift' ? (-2.4 * effective).toFixed(2) : (1.2 * effective).toFixed(2)}%`);
  if (progressInput) progressInput.value = String(percent);
  if (progressLabel) progressLabel.textContent = `${String(percent).padStart(2, '0')}%`;
  if (phaseIndex) phaseIndex.textContent = `${String(percent).padStart(2, '0')} / 100`;
  if (phaseTitle) phaseTitle.textContent = entry.title;
  if (phaseCopy) phaseCopy.textContent = entry.copy;
  if (deckStatus && !saved) deckStatus.textContent = progress >= .82
    ? `「${rhythmCopy[rhythm].label}」已经成形，可以保存。`
    : rhythmCopy[rhythm].status;
  updateScoreRail();
  draw(performance.now());
  if (syncScroll && timeline) {
    const span = Math.max(1, timeline.offsetHeight - window.innerHeight);
    window.scrollTo({ top: progress * span, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

function setRhythm(next: Rhythm) {
  if (!(next in rhythmCopy)) return;
  rhythm = next;
  root.dataset.rhythm = rhythm;
  document.querySelectorAll<HTMLButtonElement>('[data-rhythm-value]').forEach((button) => {
    const selected = button.dataset.rhythmValue === rhythm;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (resultFeeling) resultFeeling.textContent = rhythmCopy[rhythm].feeling;
  if (resultAction) resultAction.textContent = rhythmCopy[rhythm].action;
  if (deckStatus) deckStatus.textContent = rhythmCopy[rhythm].status;
  updateContinuation();
  renderProgress(progress);
}

function syncFromScroll() {
  if (!timeline || saved) return;
  const span = Math.max(1, timeline.offsetHeight - window.innerHeight);
  renderProgress(window.scrollY / span);
}

function resizeCanvas() {
  if (!canvas) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(time: number) {
  const context = canvas?.getContext('2d');
  if (!context) return;
  const width = innerWidth;
  const height = innerHeight;
  context.clearRect(0, 0, width, height);
  const palette = rhythm === 'breathe' ? ['238,178,104', '204,81,43'] : rhythm === 'strike' ? ['255,213,142', '221,61,34'] : ['172,222,224', '82,124,130'];
  const pulse = reducedMotion ? 0 : Math.sin(time * (rhythm === 'strike' ? .004 : .0017)) * (3 + progress * 5);
  const startX = width * (.47 + progress * .07);
  const startY = height * (.55 - progress * .08);
  const endX = width * (.68 + (pointerX - .5) * .14 + progress * .12);
  const endY = height * (.48 + (pointerY - .5) * .12);

  for (let index = 0; index < 4; index += 1) {
    context.beginPath();
    context.moveTo(startX - index * 13, startY + index * 12);
    context.bezierCurveTo(width * .55, height * (.36 + index * .025), width * .62, height * (.67 - index * .035), endX + pulse, endY);
    context.lineWidth = Math.max(.5, (5.5 - index) * progress);
    context.strokeStyle = `rgba(${palette[index % 2]}, ${(progress * .19) / (index + 1)})`;
    context.shadowBlur = 22 + progress * 28;
    context.shadowColor = `rgba(${palette[0]}, ${progress * .38})`;
    context.stroke();
  }
  context.shadowBlur = 0;

  const radius = 18 + progress * 58;
  const glow = context.createRadialGradient(endX, endY, 0, endX, endY, radius);
  glow.addColorStop(0, `rgba(${palette[0]}, ${progress * .34})`);
  glow.addColorStop(1, `rgba(${palette[1]}, 0)`);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(endX, endY, radius, 0, Math.PI * 2);
  context.fill();
}

function animate(time: number) {
  draw(time);
  frame = reducedMotion ? 0 : requestAnimationFrame(animate);
}

async function playPulse() {
  if (audioState === 'playing') return;
  try {
    audioContext ??= new AudioContext();
    await audioContext.resume();
    audioState = 'playing';
    root.dataset.audio = audioState;
    const now = audioContext.currentTime;
    const pattern = rhythm === 'breathe'
      ? [{ at: 0, hz: 196, duration: .72 }, { at: .58, hz: 293.66, duration: .94 }]
      : rhythm === 'strike'
        ? [{ at: 0, hz: 146.83, duration: .22 }, { at: .18, hz: 392, duration: .28 }, { at: .38, hz: 587.33, duration: .5 }]
        : [{ at: 0, hz: 174.61, duration: .65 }, { at: .42, hz: 220, duration: .78 }, { at: .92, hz: 329.63, duration: 1.05 }];
    pattern.forEach((note) => {
      const oscillator = audioContext!.createOscillator();
      const gain = audioContext!.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note.hz, now + note.at);
      gain.gain.setValueAtTime(.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(.055, now + note.at + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, now + note.at + note.duration);
      oscillator.connect(gain).connect(audioContext!.destination);
      oscillator.start(now + note.at);
      oscillator.stop(now + note.at + note.duration + .03);
    });
    const duration = Math.max(...pattern.map((note) => note.at + note.duration));
    window.setTimeout(() => {
      audioState = 'played';
      root.dataset.audio = audioState;
      if (deckStatus) deckStatus.textContent = `已试听「${rhythmCopy[rhythm].label}」：声音只提示开场节奏，不替代视觉内容。`;
    }, duration * 1000 + 80);
  } catch {
    audioState = 'unavailable';
    root.dataset.audio = audioState;
    if (deckStatus) deckStatus.textContent = '当前浏览器未能播放声音；画面排练和保存仍可继续。';
  }
}

function saveDirection() {
  if (progress < .82) {
    renderProgress(.9, true);
    window.setTimeout(saveDirection, reducedMotion ? 0 : 520);
    return;
  }
  saved = true;
  root.dataset.saved = 'true';
  root.dataset.phase = 'saved';
  if (resultIdea) resultIdea.textContent = `“${ideaInput?.value.trim() || '一个尚未命名的产品想法'}”`;
  if (resultFeeling) resultFeeling.textContent = rhythmCopy[rhythm].feeling;
  if (resultAction) resultAction.textContent = rhythmCopy[rhythm].action;
  updateContinuation();
  window.setTimeout(() => resultTitle?.focus({ preventScroll: true }), reducedMotion ? 0 : 480);
}

function reset() {
  saved = false;
  root.dataset.saved = 'false';
  renderProgress(.08, true);
  window.setTimeout(() => ideaInput?.focus({ preventScroll: true }), reducedMotion ? 0 : 420);
}

document.querySelectorAll<HTMLButtonElement>('[data-rhythm-value]').forEach((button) => {
  button.addEventListener('click', () => setRhythm(button.dataset.rhythmValue as Rhythm));
});
progressInput?.addEventListener('input', () => renderProgress(Number(progressInput.value) / 100, true));
ideaInput?.addEventListener('input', updateContinuation);
listenButton?.addEventListener('click', playPulse);
form?.addEventListener('submit', (event) => { event.preventDefault(); saveDirection(); });
resetButton?.addEventListener('click', reset);

scene?.addEventListener('pointerdown', (event) => {
  dragging = true;
  dragStartY = event.clientY;
  dragStartProgress = progress;
  scene.setPointerCapture(event.pointerId);
});
scene?.addEventListener('pointermove', (event) => {
  pointerX = clamp(event.clientX / innerWidth);
  pointerY = clamp(event.clientY / innerHeight);
  if (dragging) renderProgress(dragStartProgress + (dragStartY - event.clientY) / innerHeight, true);
});
const endDrag = (event: PointerEvent) => {
  dragging = false;
  if (scene?.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
};
scene?.addEventListener('pointerup', endDrag);
scene?.addEventListener('pointercancel', endDrag);

window.addEventListener('scroll', syncFromScroll, { passive: true });
window.addEventListener('resize', () => { resizeCanvas(); syncFromScroll(); });
window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); renderProgress(progress + .08, true); }
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); renderProgress(progress - .08, true); }
  if (event.key === 'End') { event.preventDefault(); renderProgress(1, true); }
  if (event.key === 'Home') { event.preventDefault(); renderProgress(0, true); }
});

if (heroAsset) {
  const ready = () => { root.dataset.asset = 'ready'; };
  const fallback = () => { root.dataset.asset = 'fallback'; };
  heroAsset.addEventListener('load', ready, { once: true });
  heroAsset.addEventListener('error', fallback, { once: true });
  if (heroAsset.complete) heroAsset.naturalWidth > 0 ? ready() : fallback();
}

resizeCanvas();
setRhythm('breathe');
syncFromScroll();
root.dataset.audio = audioState;
if (!reducedMotion) frame = requestAnimationFrame(animate);
window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); audioContext?.close(); }, { once: true });

window.__kageR172 = {
  snapshot: () => ({
    phase: saved ? 'saved' : phaseFor(progress),
    rhythm,
    progress: Number(progress.toFixed(3)),
    saved,
    audio: audioState,
    asset: root.dataset.asset ?? 'unknown',
    idea: ideaInput?.value.trim() ?? '',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    reducedMotion
  }),
  setProgress: (value) => renderProgress(value, true),
  setRhythm,
  save: saveDirection
};
