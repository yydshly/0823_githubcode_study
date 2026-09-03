type EclipseState = 'waiting' | 'approach' | 'diamond-ring' | 'totality' | 'saved';

interface EclipseSnapshot {
  ready: boolean;
  state: EclipseState;
  alignment: number;
  totality: number;
  imageLoaded: boolean;
  canvasFrames: number;
  coronaStrength: number;
  fallback: boolean;
  assetFallback: boolean;
  reducedMotion: boolean;
  saved: boolean;
  horizontalOverflow: number;
  revision: string;
}

declare global {
  interface Window {
    __eclipsePostOffice?: {
      snapshot: () => EclipseSnapshot;
      setAlignment: (value: number) => void;
      savePostcard: () => void;
    };
  }
}

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('#eclipse-stage');
const scene = document.querySelector<HTMLElement>('.scene');
const canvas = document.querySelector<HTMLCanvasElement>('#corona-canvas');
const environmentImage = document.querySelector<HTMLImageElement>('#environment-image');
const alignmentControl = document.querySelector<HTMLInputElement>('#alignment-control');
const alignmentValue = document.querySelector<HTMLOutputElement>('#alignment-value');
const stateLabel = document.querySelector<HTMLElement>('#state-label');
const observationIndex = document.querySelector<HTMLElement>('#observation-index');
const observationTitle = document.querySelector<HTMLElement>('#observation-title');
const observationDetail = document.querySelector<HTMLElement>('#observation-detail');
const saveButton = document.querySelector<HTMLButtonElement>('#save-postcard');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const liveStatus = document.querySelector<HTMLElement>('#live-status');
const phaseButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-eclipse-target]')];

if (!stage || !scene || !canvas || !environmentImage || !alignmentControl || !alignmentValue || !stateLabel || !observationIndex || !observationTitle || !observationDetail || !saveButton || !saveStatus || !liveStatus) {
  throw new Error('Eclipse Post Office: required DOM contract is missing.');
}

const params = new URLSearchParams(location.search);
const revision = params.get('revision') ?? 'r149-preview';
const reducedMotion = params.get('motion') === 'reduce'
  || (!params.has('motion') && matchMedia('(prefers-reduced-motion: reduce)').matches);
const forcedFallback = ['1', 'true', 'canvas'].includes(params.get('fallback') ?? '');
const forcedAssetFallback = ['1', 'true', 'image'].includes(params.get('assetFallback') ?? '');
const quality = params.get('quality') ?? 'high';

const copy: Record<Exclude<EclipseState, 'saved'>, { label: string; index: string; title: string; detail: string }> = {
  waiting: {
    label: '影子还在路上',
    index: '01 / BEFORE SHADOW',
    title: '日光仍把每一粒盐照得分明。',
    detail: '滚动页面，或直接拖动天空中的月影。',
  },
  approach: {
    label: '盐湖正在降温',
    index: '02 / FIRST CONTACT',
    title: '光线变薄，纸张先察觉了变化。',
    detail: '月影、地面色温和邮局亮度由同一个对齐值同步改变。',
  },
  'diamond-ring': {
    label: '最后一道光',
    index: '03 / DIAMOND RING',
    title: '世界只剩下一枚很小的亮点。',
    detail: '继续靠近。明信片会在日冕闭合时显影。',
  },
  totality: {
    label: '全食 · 明信片已显影',
    index: '04 / TOTALITY',
    title: '太阳没有消失，它只是把边缘交了出来。',
    detail: '全食状态已形成，可以保存这张艺术化明信片。',
  },
};

let alignment = 0;
let totality = 0;
let state: EclipseState = 'waiting';
let saved = false;
let ready = false;
let imageLoaded = false;
let canvasFrames = 0;
let dragging = false;
let directLockUntil = 0;
let frameRequest = 0;
let needsFrame = true;
let context: CanvasRenderingContext2D | null = null;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const round = (value: number) => Math.round(value * 1000) / 1000;
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function eclipseStateFor(value: number): Exclude<EclipseState, 'saved'> {
  if (value >= .92) return 'totality';
  if (value >= .66) return 'diamond-ring';
  if (value >= .18) return 'approach';
  return 'waiting';
}

function stateIndex(value: Exclude<EclipseState, 'saved'>): number {
  return ['waiting', 'approach', 'diamond-ring', 'totality'].indexOf(value);
}

function requestCoronaFrame(): void {
  needsFrame = true;
  if (reducedMotion && !forcedFallback) renderCorona(performance.now());
}

function applyAlignment(value: number, announce = false): void {
  alignment = clamp01(value);
  totality = smoothstep(.12, .96, alignment);
  const semanticState = eclipseStateFor(alignment);
  state = saved && semanticState === 'totality' ? 'saved' : semanticState;

  root.style.setProperty('--alignment', String(round(alignment)));
  root.style.setProperty('--totality', String(round(totality)));
  root.style.setProperty('--diamond', String(round(clamp01(1 - Math.abs(alignment - .78) / .18))));
  root.dataset.eclipseState = state;
  alignmentControl.value = String(Math.round(alignment * 100));
  alignmentValue.value = String(Math.round(alignment * 100)).padStart(2, '0');

  const current = copy[semanticState];
  stateLabel.textContent = saved ? '明信片已保存' : current.label;
  observationIndex.textContent = current.index;
  observationTitle.textContent = current.title;
  observationDetail.textContent = current.detail;
  saveButton.disabled = alignment < .92;

  phaseButtons.forEach((button, index) => {
    if (index === stateIndex(semanticState)) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });

  if (announce) liveStatus.textContent = `${current.label}。${current.title}`;
  requestCoronaFrame();
}

function scrollProgress(): number {
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const top = stage.getBoundingClientRect().top;
  return clamp01(-top / max);
}

function scrollToAlignment(value: number): void {
  const targetAlignment = clamp01(value);
  const max = Math.max(1, stage.offsetHeight - innerHeight);
  const stageTop = scrollY + stage.getBoundingClientRect().top;
  scrollTo({ top: stageTop + targetAlignment * max, behavior: reducedMotion ? 'auto' : 'smooth' });
  applyAlignment(targetAlignment, true);
}

function pointerAlignment(clientX: number): number {
  const start = innerWidth <= 800 ? innerWidth * .2 : innerWidth * .34;
  const end = innerWidth <= 800 ? innerWidth * .72 : innerWidth * .74;
  return clamp01((clientX - start) / Math.max(1, end - start));
}

function savePostcard(): void {
  if (alignment < .92) {
    scrollToAlignment(1);
    return;
  }
  saved = true;
  state = 'saved';
  root.dataset.saved = 'true';
  root.dataset.eclipseState = 'saved';
  saveButton.querySelector('span')!.textContent = '全食明信片已保存';
  saveStatus.textContent = '已保存在本次浏览状态中。月影位置与显影文字会继续保留。';
  stateLabel.textContent = '明信片已保存';
  liveStatus.textContent = '全食明信片已保存。';
}

function markAssetFallback(): void {
  imageLoaded = false;
  root.dataset.assetFallback = 'true';
  liveStatus.textContent = '环境主图未能加载，已启用盐湖地平线回退；月影与明信片旅程仍可继续。';
}

function resizeCanvas(): void {
  if (forcedFallback) return;
  const pixelRatio = Math.min(devicePixelRatio, quality === 'high' ? 1.75 : 1.25);
  canvas.width = Math.max(1, Math.floor(innerWidth * pixelRatio));
  canvas.height = Math.max(1, Math.floor(innerHeight * pixelRatio));
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  context = canvas.getContext('2d');
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  requestCoronaFrame();
}

function drawRay(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, length: number, alpha: number): void {
  const start = radius + 3;
  const sx = x + Math.cos(angle) * start;
  const sy = y + Math.sin(angle) * start;
  const bend = Math.sin(angle * 3.1) * length * .12;
  const ex = x + Math.cos(angle) * (start + length) - Math.sin(angle) * bend;
  const ey = y + Math.sin(angle) * (start + length) + Math.cos(angle) * bend;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(
    x + Math.cos(angle) * (start + length * .45) + Math.sin(angle) * bend,
    y + Math.sin(angle) * (start + length * .45) - Math.cos(angle) * bend,
    ex,
    ey,
  );
  ctx.strokeStyle = `rgba(224, 244, 255, ${alpha})`;
  ctx.lineWidth = .7;
  ctx.stroke();
}

function renderCorona(time: number): void {
  if (!context || forcedFallback) return;
  if (!needsFrame && reducedMotion) return;
  needsFrame = false;

  const ctx = context;
  const width = innerWidth;
  const height = innerHeight;
  const mobile = width <= 800;
  const x = width * (mobile ? .72 : .74);
  const y = Math.min(mobile ? height * .24 : height * .21, mobile ? 190 : 240);
  const radius = Math.max(46, Math.min(mobile ? width * .125 : width * .055, 88));
  const strength = smoothstep(.45, .96, alignment);
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(x, y, radius * .72, x, y, radius * (2.6 + strength * 2.2));
  glow.addColorStop(0, `rgba(255, 244, 203, ${.2 + strength * .34})`);
  glow.addColorStop(.34, `rgba(169, 222, 239, ${strength * .22})`);
  glow.addColorStop(1, 'rgba(91, 163, 194, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * (2.6 + strength * 2.2), 0, Math.PI * 2);
  ctx.fill();

  if (strength > .02) {
    const pulse = reducedMotion ? 0 : Math.sin(time * .0008) * .05;
    for (let index = 0; index < 84; index += 1) {
      const angle = index / 84 * Math.PI * 2;
      const rhythm = .56 + .44 * Math.abs(Math.sin(index * 2.17 + time * (reducedMotion ? 0 : .00022)));
      const length = radius * (.35 + rhythm * (1.25 + strength * 1.9));
      drawRay(ctx, x, y, radius, angle, length, strength * (.06 + rhythm * .22 + pulse));
    }
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 250, 231, ${.28 + strength * .68})`;
    ctx.lineWidth = 1.4 + strength * 2.3;
    ctx.stroke();
  }

  const horizonGlow = ctx.createRadialGradient(x, height * .72, 0, x, height * .72, width * .46);
  horizonGlow.addColorStop(0, `rgba(117, 204, 223, ${strength * .12})`);
  horizonGlow.addColorStop(1, 'rgba(117, 204, 223, 0)');
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, height * .48, width, height * .52);
  ctx.restore();
  canvasFrames += 1;
}

function animationLoop(time: number): void {
  if (!reducedMotion) {
    needsFrame = true;
    renderCorona(time);
    frameRequest = requestAnimationFrame(animationLoop);
  }
}

addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if ((event.target as Element | null)?.closest('button, input, a, .postcard')) return;
  event.preventDefault();
  dragging = true;
  directLockUntil = performance.now() + 800;
  applyAlignment(pointerAlignment(event.clientX), true);
}, { capture: true });

addEventListener('pointermove', (event) => {
  if (!dragging) return;
  directLockUntil = performance.now() + 800;
  applyAlignment(pointerAlignment(event.clientX));
}, { capture: true });

addEventListener('pointerup', () => {
  if (!dragging) return;
  dragging = false;
  directLockUntil = performance.now() + 500;
  applyAlignment(alignment, true);
}, { capture: true });

alignmentControl.addEventListener('input', () => {
  directLockUntil = performance.now() + 900;
  applyAlignment(Number(alignmentControl.value) / 100, true);
});

phaseButtons.forEach((button) => {
  button.addEventListener('click', () => scrollToAlignment(Number(button.dataset.eclipseTarget ?? 0)));
});

saveButton.addEventListener('click', savePostcard);

addEventListener('scroll', () => {
  if (dragging || performance.now() < directLockUntil) return;
  applyAlignment(scrollProgress());
}, { passive: true });

addEventListener('resize', () => {
  resizeCanvas();
  applyAlignment(alignment);
});

if (forcedFallback) {
  root.dataset.fallback = 'true';
  canvas.hidden = true;
} else {
  resizeCanvas();
  if (!reducedMotion) frameRequest = requestAnimationFrame(animationLoop);
}

const imageReady = new Promise<void>((resolve) => {
  if (forcedAssetFallback) {
    markAssetFallback();
    resolve();
    return;
  }
  if (environmentImage.complete && environmentImage.naturalWidth > 0) {
    imageLoaded = true;
    resolve();
    return;
  }
  environmentImage.addEventListener('load', () => {
    imageLoaded = true;
    resolve();
  }, { once: true });
  environmentImage.addEventListener('error', () => {
    markAssetFallback();
    resolve();
  }, { once: true });
});

window.__eclipsePostOffice = {
  snapshot: () => ({
    ready,
    state,
    alignment: round(alignment),
    totality: round(totality),
    imageLoaded,
    canvasFrames,
    coronaStrength: round(smoothstep(.45, .96, alignment)),
    fallback: forcedFallback,
    assetFallback: forcedAssetFallback || root.dataset.assetFallback === 'true',
    reducedMotion,
    saved,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    revision,
  }),
  setAlignment: (value: number) => {
    directLockUntil = performance.now() + 900;
    applyAlignment(value, true);
  },
  savePostcard,
};

imageReady.then(() => {
  applyAlignment(scrollProgress());
  requestAnimationFrame(() => {
    ready = true;
    root.dataset.eclipseReady = 'true';
    liveStatus.textContent = imageLoaded
      ? '日食邮局已准备。移动月影开始显影。'
      : '日食邮局已使用回退场景准备。移动月影开始显影。';
  });
});

addEventListener('pagehide', () => cancelAnimationFrame(frameRequest), { once: true });

export {};
