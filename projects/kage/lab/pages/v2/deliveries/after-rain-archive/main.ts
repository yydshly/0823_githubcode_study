type ScentTone = 'night' | 'paper' | 'asphalt' | 'bloom';

type ScentSnapshot = {
  ready: boolean;
  progress: number;
  chapter: string;
  chapterNumber: string;
  tone: ScentTone;
  pointerEnergy: number;
  frames: number;
  dialogOpen: boolean;
  reducedMotion: boolean;
  fallback: boolean;
  horizontalOverflow: boolean;
  visualRevision: string;
};

declare global {
  interface Window {
    __afterRainArchive?: { snapshot: () => ScentSnapshot; openArchive: () => void };
  }
}

const root = document.documentElement;
const canvas = document.querySelector<HTMLCanvasElement>('.scent-canvas');
const context = canvas?.getContext('2d', { alpha: true }) ?? null;
const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')];
const chapterNumber = document.querySelector<HTMLElement>('[data-chapter-number]');
const chapterName = document.querySelector<HTMLElement>('[data-chapter-name]');
const enterButton = document.querySelector<HTMLButtonElement>('[data-enter]');
const closeButton = document.querySelector<HTMLButtonElement>('[data-close]');
const dialog = document.querySelector<HTMLDialogElement>('[data-dialog]');
const entryStatus = document.querySelector<HTMLElement>('[data-entry-status]');
const fallbackMessage = document.querySelector<HTMLElement>('[data-fallback-message]');

if (!canvas || !chapterNumber || !chapterName || !enterButton || !closeButton || !dialog || !entryStatus || !fallbackMessage) {
  throw new Error('After Rain Archive requires its canvas, chapter markers, action and dialog.');
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const forcedFallback = new URLSearchParams(location.search).get('fallback') === 'canvas';
const fallback = forcedFallback || !context;
const visualRevision = 'r119-editorial-proof';
let ready = false;
let progress = 0;
let activeChapter = chapters[0]?.dataset.chapter ?? '雨后开场';
let activeNumber = chapters[0]?.dataset.number ?? '00';
let tone = (chapters[0]?.dataset.tone ?? 'night') as ScentTone;
let pointerX = innerWidth * .5;
let pointerY = innerHeight * .5;
let pointerEnergy = 0;
let frame = 0;
let raf = 0;
let disposed = false;
let scrollQueued = false;

type Trace = { seed: number; x: number; y: number; radius: number; drift: number; phase: number };
const traces: Trace[] = Array.from({ length: 44 }, (_, index) => ({
  seed: random(index + 7),
  x: random(index * 17 + 11),
  y: random(index * 29 + 3),
  radius: 16 + random(index * 41 + 5) * 84,
  drift: .12 + random(index * 31 + 19) * .46,
  phase: random(index * 23 + 13) * Math.PI * 2,
}));

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function resize() {
  if (!context) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.75);
  canvas.width = Math.max(1, Math.round(innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(innerHeight * dpr));
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function updateScrollState() {
  scrollQueued = false;
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  progress = Math.min(1, Math.max(0, scrollY / max));
  root.style.setProperty('--progress', progress.toFixed(4));
  const probe = innerHeight * .48;
  const current = chapters.find((chapter) => {
    const rect = chapter.getBoundingClientRect();
    return rect.top <= probe && rect.bottom > probe;
  }) ?? chapters.at(-1);
  if (!current) return;
  activeChapter = current.dataset.chapter ?? activeChapter;
  activeNumber = current.dataset.number ?? activeNumber;
  tone = (current.dataset.tone ?? tone) as ScentTone;
  root.dataset.scentTone = tone;
  chapterNumber.textContent = activeNumber;
  chapterName.textContent = activeChapter;
}

function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(updateScrollState);
}

function onPointer(event: PointerEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;
  pointerEnergy = Math.min(1, pointerEnergy + .22);
  root.style.setProperty('--mx', `${(pointerX / Math.max(1, innerWidth) * 100).toFixed(2)}%`);
  root.style.setProperty('--my', `${(pointerY / Math.max(1, innerHeight) * 100).toFixed(2)}%`);
}

function palette(): [number, number, number] {
  if (tone === 'paper') return [88, 68, 45];
  if (tone === 'bloom') return [89, 111, 58];
  if (tone === 'asphalt') return [226, 178, 77];
  return [188, 219, 203];
}

function paint(now: number) {
  if (!context || fallback || disposed) return;
  context.clearRect(0, 0, innerWidth, innerHeight);
  const time = reducedMotion ? 0 : now * .00014;
  const [r, g, b] = palette();
  const energy = .35 + pointerEnergy * .75;
  for (let index = 0; index < traces.length; index += 1) {
    const trace = traces[index];
    const wave = Math.sin(time * (1 + trace.drift) + trace.phase + progress * 4.4);
    const baseX = trace.x * innerWidth + wave * 58;
    const baseY = (trace.y + progress * trace.drift * .6) % 1 * innerHeight;
    const dx = pointerX - baseX;
    const dy = pointerY - baseY;
    const distance = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - distance / 360) * pointerEnergy;
    const x = baseX + dx * pull * .16;
    const y = baseY + dy * pull * .16;
    const radius = trace.radius * (.6 + energy * .48 + pull * .72);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},${.035 + pull * .045})`);
    gradient.addColorStop(.42, `rgba(${r},${g},${b},${.018 + pull * .026})`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radius, radius * (.32 + trace.seed * .28), wave * .28, 0, Math.PI * 2);
    context.fill();
    if (index % 4 === 0) {
      context.strokeStyle = `rgba(${r},${g},${b},${.04 + pull * .07})`;
      context.lineWidth = .6;
      context.beginPath();
      context.moveTo(x - radius * .75, y + wave * 12);
      context.bezierCurveTo(x - radius * .2, y - radius * .22, x + radius * .3, y + radius * .19, x + radius * .9, y - wave * 16);
      context.stroke();
    }
  }
  pointerEnergy *= reducedMotion ? .7 : .985;
  frame += 1;
  raf = requestAnimationFrame(paint);
}

function openArchive() {
  if (!dialog.open) dialog.showModal();
  entryStatus.textContent = '本月档案已开启 · Nº 047';
  root.dataset.archiveOpen = 'true';
}

function closeArchive() {
  dialog.close();
  root.dataset.archiveOpen = 'false';
  enterButton.focus();
}

function snapshot(): ScentSnapshot {
  return {
    ready,
    progress: Number(progress.toFixed(4)),
    chapter: activeChapter,
    chapterNumber: activeNumber,
    tone,
    pointerEnergy: Number(pointerEnergy.toFixed(3)),
    frames: fallback ? 0 : frame,
    dialogOpen: dialog.open,
    reducedMotion,
    fallback,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    visualRevision,
  };
}

if (fallback) {
  root.dataset.canvasFallback = 'true';
  canvas.hidden = true;
  fallbackMessage.hidden = false;
}

resize();
updateScrollState();
addEventListener('resize', resize, { passive: true });
addEventListener('scroll', onScroll, { passive: true });
addEventListener('pointermove', onPointer, { passive: true });
enterButton.addEventListener('click', openArchive);
closeButton.addEventListener('click', closeArchive);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeArchive();
});

ready = true;
root.dataset.afterRainReady = 'true';
window.__afterRainArchive = { snapshot, openArchive };
if (!fallback) raf = requestAnimationFrame(paint);

addEventListener('pagehide', () => {
  disposed = true;
  cancelAnimationFrame(raf);
  removeEventListener('resize', resize);
  removeEventListener('scroll', onScroll);
  removeEventListener('pointermove', onPointer);
  delete window.__afterRainArchive;
}, { once: true });
