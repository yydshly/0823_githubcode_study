type PrototypeSnapshot = {
  progress: number;
  activeScene: 'awakening' | 'fragments' | 'record';
  activeBeat: number;
  assetsLoaded: boolean[];
  viewport: { width: number; height: number };
  hasHorizontalOverflow: boolean;
};

type PrototypeApi = {
  setProgress: (progress: number) => PrototypeSnapshot;
  snapshot: () => PrototypeSnapshot;
};

declare global {
  interface Window {
    __scrollScrubPrototype?: PrototypeApi;
  }
}

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const normalized = clamp((value - edge0) / (edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
};

const root = document.documentElement;
const layers = Array.from(document.querySelectorAll<HTMLElement>('.media-layer'));
const images = Array.from(document.querySelectorAll<HTMLImageElement>('.media-layer img'));
const beats = Array.from(document.querySelectorAll<HTMLElement>('.story-beat'));
const indexLabel = document.querySelector<HTMLElement>('[data-index]');
const chapterLabel = document.querySelector<HTMLElement>('[data-chapter]');
const stateLabel = document.querySelector<HTMLElement>('[data-state-label]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const chapters = ['醒来以后', '记忆正在成形', '留给今晚'];
const stateLabels = ['房间尚未清晰', '碎片开始靠近', '记忆已有归处'];
let targetProgress = 0;
let currentProgress = 0;
let rafId = 0;

const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

function sceneWeights(progress: number) {
  const firstToMiddle = smoothstep(0.17, 0.43, progress);
  const middleToFinal = smoothstep(0.59, 0.84, progress);
  return [1 - firstToMiddle, firstToMiddle * (1 - middleToFinal), middleToFinal];
}

function beatWeights(progress: number) {
  const firstToMiddle = smoothstep(0.13, 0.31, progress);
  const middleToFinal = smoothstep(0.66, 0.83, progress);
  return [1 - firstToMiddle, firstToMiddle * (1 - middleToFinal), middleToFinal];
}

function activeIndex(progress: number) {
  if (progress < 0.3) return 0;
  if (progress < 0.72) return 1;
  return 2;
}

function render(progress: number) {
  const p = clamp(progress);
  const sceneOpacity = sceneWeights(p);
  const textOpacity = beatWeights(p);
  const active = activeIndex(p);
  const motionScale = reducedMotion.matches ? 0 : 1;

  root.style.setProperty('--progress', p.toFixed(4));

  layers.forEach((layer, index) => {
    const direction = index - 1;
    const scale = 1.035 + (p * 0.055 + index * 0.016) * motionScale;
    const x = (direction * 1.4 - p * direction * 1.8) * motionScale;
    const y = (p * -1.5 + index * 0.6) * motionScale;
    layer.style.opacity = sceneOpacity[index].toFixed(4);
    layer.style.transform = `translate3d(${x.toFixed(2)}%, ${y.toFixed(2)}%, 0) scale(${scale.toFixed(4)})`;
    layer.style.zIndex = String(index + 1);
  });

  beats.forEach((beat, index) => {
    const opacity = textOpacity[index];
    const centerOffset = index === 0 ? -48 : -50;
    const y = centerOffset + (1 - opacity) * 8;
    const isFinal = index === 2;
    beat.style.opacity = opacity.toFixed(4);
    beat.style.transform = isFinal
      ? `translate3d(0, ${(1 - opacity) * 30}px, 0)`
      : `translate3d(0, ${y}%, 0)`;
    beat.style.pointerEvents = opacity > 0.72 ? 'auto' : 'none';
    beat.setAttribute('aria-hidden', opacity > 0.15 ? 'false' : 'true');
  });

  if (indexLabel) indexLabel.textContent = `0${active + 1}`;
  if (chapterLabel) chapterLabel.textContent = chapters[active];
  if (stateLabel) stateLabel.textContent = stateLabels[active];
  root.dataset.activeScene = ['awakening', 'fragments', 'record'][active];
}

function snapshot(): PrototypeSnapshot {
  const active = activeIndex(currentProgress);
  return {
    progress: Number(currentProgress.toFixed(4)),
    activeScene: ['awakening', 'fragments', 'record'][active] as PrototypeSnapshot['activeScene'],
    activeBeat: active,
    assetsLoaded: images.map((image) => image.complete && image.naturalWidth > 0),
    viewport: { width: window.innerWidth, height: window.innerHeight },
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
}

function setProgress(progress: number) {
  const next = clamp(progress);
  window.scrollTo({ top: next * maxScroll(), behavior: 'auto' });
  targetProgress = next;
  currentProgress = next;
  render(next);
  return snapshot();
}

function tick() {
  const easing = reducedMotion.matches ? 1 : 0.12;
  currentProgress += (targetProgress - currentProgress) * easing;
  if (Math.abs(targetProgress - currentProgress) < 0.0001) currentProgress = targetProgress;
  render(currentProgress);
  rafId = window.requestAnimationFrame(tick);
}

function updateScrollTarget() {
  targetProgress = clamp(window.scrollY / maxScroll());
}

window.__scrollScrubPrototype = { setProgress, snapshot };
window.addEventListener('scroll', updateScrollTarget, { passive: true });
window.addEventListener('resize', updateScrollTarget, { passive: true });
window.addEventListener('pagehide', () => window.cancelAnimationFrame(rafId), { once: true });
reducedMotion.addEventListener('change', () => render(currentProgress));

Promise.all(
  images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }),
).finally(() => {
  root.dataset.prototypeReady = 'true';
});

updateScrollTarget();
render(0);
rafId = window.requestAnimationFrame(tick);

export {};
