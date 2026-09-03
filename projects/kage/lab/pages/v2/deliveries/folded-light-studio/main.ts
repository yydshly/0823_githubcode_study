const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const body = document.body;
const journey = document.querySelector<HTMLElement>('#journey');
const stage = document.querySelector<HTMLElement>('.stage');
const lamp = document.querySelector<HTMLElement>('.lamp-composition');
const dragSurface = document.querySelector<HTMLElement>('.drag-surface');
const canvas = document.querySelector<HTMLCanvasElement>('#light-field');
const context = canvas?.getContext('2d', { alpha: true });
const frames = [...document.querySelectorAll<HTMLElement>('.lamp-frame')];
const stateButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-progress-target]')];
const bookingButton = document.querySelector<HTMLButtonElement>('.booking-button');
const bookingLabel = bookingButton?.querySelector('span');
const fallback = document.querySelector<HTMLElement>('.asset-fallback');
const storyIndex = document.querySelector<HTMLElement>('.story-index');
const storyKicker = document.querySelector<HTMLElement>('.story-kicker');
const storyTitle = document.querySelector<HTMLElement>('.material-story h2');
const storyBody = document.querySelector<HTMLElement>('.story-body');
const completionCopy = document.querySelector<HTMLElement>('.completion p');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (!journey || !stage || !lamp || !dragSurface || !canvas || !context || frames.length !== 4 || !bookingButton || !bookingLabel) {
  throw new Error('折光成形页面缺少必要节点。');
}

type StageCopy = {
  id: string;
  label: string;
  title: string;
  body: string;
  valueText: string;
};

const stages: StageCopy[] = [
  {
    id: 'folded',
    label: '折叠状态',
    title: '纤维先保存<br />结构的安静。',
    body: '纸浆中的长纤维沿折线排列，让灯体在收拢时只占一只书本的厚度。',
    valueText: '完全折叠'
  },
  {
    id: 'rising',
    label: '结构起势',
    title: '铰点不移动，<br />纸面开始呼吸。',
    body: '同一组扇形骨架依次张开，纤维纹理与金属铰点始终保持同一身份。',
    valueText: '展开三分之一'
  },
  {
    id: 'spreading',
    label: '透光形成',
    title: '光不是贴上去，<br />是从纤维里出来。',
    body: '展开面积越大，内部暖光穿过的纤维层越薄，桌面投影也随结构向外伸展。',
    valueText: '展开三分之二'
  },
  {
    id: 'open',
    label: '完全成光',
    title: '结构展开，<br />光才拥有体积。',
    body: '四次连续形态最终汇成一盏完整灯具；预约入口只在结构完成后出现。',
    valueText: '完全展开'
  }
];

let targetProgress = 0;
let displayProgress = 0;
let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartProgress = 0;
let assetLoaded = false;
let lastStageIndex = -1;
let frameId = 0;
let width = 0;
let height = 0;
let dpr = 1;
let explicitInputChannelUntil = 0;

const sourceAtlasUrl = new URL('./assets/folded-paper-lamp-atlas-v1.png', import.meta.url).href;
const assetUrls = [
  new URL('./assets/state-01-folded.png', import.meta.url).href,
  new URL('./assets/state-02-third.png', import.meta.url).href,
  new URL('./assets/state-03-two-thirds.png', import.meta.url).href,
  new URL('./assets/state-04-open.png', import.meta.url).href
];

Promise.all(assetUrls.map((url) => new Promise<void>((resolve, reject) => {
  const asset = new Image();
  asset.decoding = 'async';
  asset.onload = () => resolve();
  asset.onerror = () => reject(new Error(`无法载入状态素材：${url}`));
  asset.src = url;
}))).then(() => {
  assetLoaded = true;
  body.dataset.assetStatus = 'loaded';
  body.dataset.experience = 'ready';
  scheduleRender();
}).catch(() => {
  assetLoaded = false;
  body.dataset.assetStatus = 'failed';
  body.dataset.experience = 'fallback';
  fallback?.removeAttribute('hidden');
  bookingButton.disabled = false;
  bookingLabel.textContent = '预约实物看样';
  completionCopy && (completionCopy.textContent = '素材缺失时不展示伪展开；可直接预约查看真实样品。');
});

function scrollRange() {
  return Math.max(1, journey.offsetHeight - innerHeight);
}

function pageProgress() {
  return clamp((scrollY - journey.offsetTop) / scrollRange());
}

function scrollToProgress(progress: number, channel: string) {
  targetProgress = clamp(progress);
  body.dataset.inputChannel = channel;
  explicitInputChannelUntil = performance.now() + 420;
  if (reducedMotion.matches) targetProgress = Math.round(targetProgress * 3) / 3;
  scrollTo({ top: journey.offsetTop + scrollRange() * targetProgress, behavior: 'auto' });
  scheduleRender();
}

function stageIndexFor(progress: number) {
  if (progress < .19) return 0;
  if (progress < .51) return 1;
  if (progress < .83) return 2;
  return 3;
}

function updateCopy(index: number) {
  if (index === lastStageIndex) return;
  lastStageIndex = index;
  const item = stages[index];
  if (storyIndex) storyIndex.textContent = `0${index + 1} / 04`;
  if (storyKicker) storyKicker.textContent = item.label;
  if (storyTitle) storyTitle.innerHTML = item.title;
  if (storyBody) storyBody.textContent = item.body;
  dragSurface.setAttribute('aria-valuetext', item.valueText);
  stateButtons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}

function updateFrames(progress: number) {
  const phase = clamp(progress) * 3;
  const base = Math.min(2, Math.floor(phase));
  const blend = phase - base;
  frames.forEach((frame, index) => {
    const opacity = index === base ? 1 - blend : index === base + 1 ? blend : progress >= 1 && index === 3 ? 1 : 0;
    frame.style.opacity = opacity.toFixed(4);
  });
  body.dataset.frameWeights = frames.map((frame) => Number(frame.style.opacity || 0).toFixed(3)).join(',');
}

function updateState(progress: number) {
  const index = stageIndexFor(progress);
  const stageCopy = stages[index];
  document.documentElement.style.setProperty('--progress', progress.toFixed(4));
  body.dataset.progress = progress.toFixed(3);
  body.dataset.state = stageCopy.id;
  dragSurface.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  updateCopy(index);
  updateFrames(progress);

  const open = progress >= .94;
  bookingButton.disabled = !open && body.dataset.assetStatus !== 'failed';
  if (body.dataset.booking !== 'confirmed') bookingLabel.textContent = open ? '预约看样' : '继续展开';
  if (completionCopy && body.dataset.booking !== 'confirmed') {
    completionCopy.textContent = open
      ? '结构已完全展开。现在可以预约，在自然光下查看纸纤维与铰点样品。'
      : '完全展开后，结构说明与预约入口会在这里收束。';
  }
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  dpr = Math.min(devicePixelRatio || 1, 1.75);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawLightField(progress: number, time: number) {
  context.clearRect(0, 0, width, height);
  if (!assetLoaded || reducedMotion.matches) return;
  const lampRect = lamp.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const hingeX = lampRect.left - stageRect.left + lampRect.width * (.48 - progress * .03);
  const hingeY = lampRect.top - stageRect.top + lampRect.height * .72;
  const intensity = clamp((progress - .12) / .88);

  const glow = context.createRadialGradient(hingeX, hingeY, 0, hingeX, hingeY, Math.max(width, height) * (.18 + progress * .45));
  glow.addColorStop(0, `rgba(255, 199, 104, ${.13 + intensity * .2})`);
  glow.addColorStop(.28, `rgba(255, 221, 164, ${intensity * .12})`);
  glow.addColorStop(1, 'rgba(255, 228, 180, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < 12; index += 1) {
    const spread = lerp(.1, 1.02, progress);
    const angle = lerp(-1.4, -.18, index / 11) * spread + Math.sin(time * .00025 + index) * .006;
    const length = lerp(80, Math.max(width, height) * .62, progress) * (.82 + (index % 3) * .08);
    context.beginPath();
    context.moveTo(hingeX, hingeY);
    context.lineTo(hingeX + Math.cos(angle) * length, hingeY + Math.sin(angle) * length);
    context.strokeStyle = `rgba(255, 206, 125, ${intensity * (.022 + (index % 4) * .006)})`;
    context.lineWidth = 1 + (index % 2);
    context.stroke();
  }

  for (let index = 0; index < 34; index += 1) {
    const seed = (index * 0.61803398875) % 1;
    const radius = 90 + seed * Math.max(width, height) * .35 * progress;
    const angle = seed * Math.PI * 2 + time * .00002 * (index % 2 ? 1 : -1);
    const x = hingeX + Math.cos(angle) * radius;
    const y = hingeY + Math.sin(angle) * radius * .55;
    context.fillStyle = `rgba(130, 88, 40, ${intensity * (.025 + seed * .05)})`;
    context.fillRect(x, y, 1 + seed * 1.3, 1 + seed * 3);
  }
  context.restore();
}

function render(time = performance.now()) {
  frameId = 0;
  if (!dragging && !reducedMotion.matches) targetProgress = pageProgress();
  if (reducedMotion.matches) displayProgress = targetProgress;
  else displayProgress = lerp(displayProgress, targetProgress, .14);
  if (Math.abs(displayProgress - targetProgress) < .0004) displayProgress = targetProgress;
  updateState(displayProgress);
  drawLightField(displayProgress, time);
  if (Math.abs(displayProgress - targetProgress) > .0004 || dragging) scheduleRender();
}

function scheduleRender() {
  if (!frameId) frameId = requestAnimationFrame(render);
}

function beginDrag(event: PointerEvent) {
  dragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartProgress = targetProgress;
  dragSurface.setPointerCapture(event.pointerId);
  body.dataset.inputChannel = event.pointerType === 'touch' ? 'touch-drag' : 'pointer-drag';
  scheduleRender();
}

function moveDrag(event: PointerEvent) {
  if (!dragging) return;
  const horizontal = event.clientX - dragStartX;
  const vertical = dragStartY - event.clientY;
  const next = dragStartProgress + (Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical) / Math.min(620, Math.max(280, innerWidth * .55));
  scrollToProgress(next, event.pointerType === 'touch' ? 'touch-drag' : 'pointer-drag');
}

function endDrag(event: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  if (dragSurface.hasPointerCapture(event.pointerId)) dragSurface.releasePointerCapture(event.pointerId);
  scheduleRender();
}

dragSurface.addEventListener('pointerdown', beginDrag);
dragSurface.addEventListener('pointermove', moveDrag);
dragSurface.addEventListener('pointerup', endDrag);
dragSurface.addEventListener('pointercancel', endDrag);

addEventListener('scroll', () => {
  if (!dragging) {
    targetProgress = pageProgress();
    if (performance.now() >= explicitInputChannelUntil) body.dataset.inputChannel = 'scroll';
    scheduleRender();
  }
}, { passive: true });

addEventListener('keydown', (event) => {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches('button') && !target.matches('[data-progress-target]')) return;
  event.preventDefault();
  if (event.key === 'Home') scrollToProgress(0, 'keyboard');
  else if (event.key === 'End') scrollToProgress(1, 'keyboard');
  else scrollToProgress(targetProgress + (['ArrowRight', 'ArrowDown'].includes(event.key) ? .09 : -.09), 'keyboard');
});

stateButtons.forEach((button) => {
  button.addEventListener('click', () => scrollToProgress(Number(button.dataset.progressTarget || 0), 'stage-navigation'));
});

bookingButton.addEventListener('click', () => {
  body.dataset.booking = 'confirmed';
  bookingButton.disabled = false;
  bookingLabel.textContent = '已预约 · 样品 04';
  if (completionCopy) completionCopy.textContent = '预约已保存在此设备。我们会以完全展开的样品状态与你确认看样时间。';
  try { localStorage.setItem('folded-light-studio-booking', new Date().toISOString()); } catch { /* Storage is optional. */ }
});

addEventListener('resize', () => {
  resizeCanvas();
  targetProgress = pageProgress();
  scheduleRender();
});

reducedMotion.addEventListener('change', () => {
  targetProgress = Math.round(targetProgress * 3) / 3;
  resizeCanvas();
  scheduleRender();
});

resizeCanvas();
targetProgress = reducedMotion.matches ? 0 : pageProgress();
displayProgress = targetProgress;
updateState(displayProgress);
scheduleRender();

(window as typeof window & { __R140_FOLDED_LIGHT__?: unknown }).__R140_FOLDED_LIGHT__ = {
  setProgress: (progress: number) => scrollToProgress(progress, 'test-api'),
  getProgress: () => displayProgress,
  getAssetUrls: () => [...assetUrls],
  getSourceAtlasUrl: () => sourceAtlasUrl
};
