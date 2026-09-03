type Emotion = 'near' | 'awake' | 'open';
type Phase = 'idea' | 'feeling' | 'formed';

type EmotionCopy = {
  label: string;
  response: string;
  title: string;
  summary: string;
  subject: string;
  medium: string;
  interaction: string;
};

declare global {
  interface Window {
    __kageR169?: {
      snapshot: () => {
        phase: Phase;
        emotion: Emotion;
        progress: number;
        idea: string;
        asset: string;
        horizontalOverflow: boolean;
        reducedMotion: boolean;
      };
      setEmotion: (emotion: Emotion) => void;
      setProgress: (progress: number) => void;
    };
  }
}

const root = document.documentElement;
const journey = document.querySelector<HTMLElement>('#journey');
const world = document.querySelector<HTMLElement>('#world');
const canvas = document.querySelector<HTMLCanvasElement>('#light-canvas');
const heroAsset = document.querySelector<HTMLImageElement>('[data-hero-asset]');
const ideaForm = document.querySelector<HTMLFormElement>('#idea-form');
const ideaInput = document.querySelector<HTMLTextAreaElement>('#idea-input');
const progressIndex = document.querySelector<HTMLElement>('#progress-index');
const progressBar = document.querySelector<HTMLElement>('#progress-bar');
const sceneResponse = document.querySelector<HTMLElement>('#scene-response');
const composerStatus = document.querySelector<HTMLElement>('#composer-status');
const formationTitle = document.querySelector<HTMLElement>('#formation-title');
const formationSummary = document.querySelector<HTMLElement>('#formation-summary');
const directionSubject = document.querySelector<HTMLElement>('#direction-subject');
const directionMedium = document.querySelector<HTMLElement>('#direction-medium');
const directionInteraction = document.querySelector<HTMLElement>('#direction-interaction');
const continueAction = document.querySelector<HTMLAnchorElement>('#continue-action');
const resetAction = document.querySelector<HTMLButtonElement>('#reset-action');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const emotionCopy: Record<Emotion, EmotionCopy> = {
  near: {
    label: '想靠近',
    response: '暖光正在靠近纸面纤维',
    title: '让想法从纸面，<br /><em>长成可以进入的光域。</em>',
    summary: '用正式主视觉建立触手可及的世界，让指针寻找光、滚动控制清晰度，把“靠近”变成真实可感知的产品动作。',
    subject: '一张正在打开的纤维纸膜',
    medium: '正式生成视觉 × 蒙版景深 × Canvas 光路',
    interaction: '滚动成形；指针寻找光；选择改变温度与细节'
  },
  awake: {
    label: '被唤醒',
    response: '冷暖折射正在穿过透明结构',
    title: '让第一束光，<br /><em>成为产品的回应。</em>',
    summary: '保留同一片纸与玻璃空间，提高折射对比和光路速度；每一次输入都必须让画面给出明确回应，而不是叠加无意义特效。',
    subject: '穿过半透明结构的一束回应之光',
    medium: '正式生成视觉 × 光谱混合 × 响应式轨迹',
    interaction: '选择改变色谱；滚动释放张力；指针扰动光线'
  },
  open: {
    label: '想展开',
    response: '远景正在打开，光路开始指向深处',
    title: '让一条光路，<br /><em>把人带进想法深处。</em>',
    summary: '把画面中的连续道路变成体验结构：近处保存想法的材质，远处承接内容和行动，让空间感服务于“继续探索”。',
    subject: '从纸面延伸到远方的连续路径',
    medium: '正式生成视觉 × 空间裁切 × 连续滚动状态',
    interaction: '滚动推进路径；拖动改变视差；结果解锁创作入口'
  }
};

let progress = 0;
let emotion: Emotion = 'near';
let pointerX = 0.66;
let pointerY = 0.46;
let isDragging = false;
let dragStartY = 0;
let dragStartScrollY = 0;
let animationFrame = 0;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function resolvePhase(value: number): Phase {
  if (value < 0.28) return 'idea';
  if (value < 0.72) return 'feeling';
  return 'formed';
}

function updateContinuation(): void {
  if (!continueAction || !ideaInput) return;
  const params = new URLSearchParams({
    provider: 'codex',
    quality: 'high',
    brief: ideaInput.value.trim(),
    direction: emotionCopy[emotion].label,
    source: 'kage-feeling-lens-r169'
  });
  continueAction.href = `../../../../workbench.html?${params.toString()}`;
}

function renderEmotion(): void {
  const copy = emotionCopy[emotion];
  root.dataset.emotion = emotion;
  document.querySelectorAll<HTMLButtonElement>('[data-emotion-value]').forEach((button) => {
    const selected = button.dataset.emotionValue === emotion;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (sceneResponse) sceneResponse.textContent = copy.response;
  if (composerStatus) composerStatus.textContent = `已选择「${copy.label}」；继续滚动，让画面和方向一起形成。`;
  if (formationTitle) formationTitle.innerHTML = copy.title;
  if (formationSummary) formationSummary.textContent = copy.summary;
  if (directionSubject) directionSubject.textContent = copy.subject;
  if (directionMedium) directionMedium.textContent = copy.medium;
  if (directionInteraction) directionInteraction.textContent = copy.interaction;
  updateContinuation();
}

function renderProgress(value: number, syncScroll = false): void {
  progress = clamp(value);
  const percent = Math.round(progress * 100);
  const phase = resolvePhase(progress);
  const revealSize = 12 + progress * 118;
  const focus = 1.045 - progress * 0.045;
  const blur = 13 * (1 - progress);
  root.dataset.phase = phase;
  root.style.setProperty('--progress', progress.toFixed(4));
  root.style.setProperty('--reveal-size', `${revealSize.toFixed(1)}%`);
  root.style.setProperty('--scene-scale', focus.toFixed(4));
  root.style.setProperty('--scene-blur', `${blur.toFixed(2)}px`);
  root.style.setProperty('--dream-opacity', (0.82 - progress * 0.42).toFixed(3));
  root.style.setProperty('--formed-opacity', (0.18 + progress * 0.82).toFixed(3));
  root.style.setProperty('--wash-opacity', (0.92 - progress * 0.5).toFixed(3));
  root.style.setProperty('--focus-size', `${(36 + progress * 74).toFixed(1)}px`);
  if (progressIndex) progressIndex.textContent = String(percent).padStart(2, '0');
  if (progressBar) progressBar.style.transform = `scaleY(${progress.toFixed(4)})`;
  if (syncScroll && journey) {
    const span = Math.max(1, journey.offsetHeight - window.innerHeight);
    window.scrollTo({ top: journey.offsetTop + progress * span, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

function updateFromScroll(): void {
  if (!journey) return;
  const span = Math.max(1, journey.offsetHeight - window.innerHeight);
  renderProgress((window.scrollY - journey.offsetTop) / span);
}

function setPointer(clientX: number, clientY: number): void {
  pointerX = clamp(clientX / window.innerWidth);
  pointerY = clamp(clientY / window.innerHeight);
  root.style.setProperty('--pointer-x', `${(pointerX * 100).toFixed(2)}%`);
  root.style.setProperty('--pointer-y', `${(pointerY * 100).toFixed(2)}%`);
  root.style.setProperty('--drift-x', `${((pointerX - 0.5) * -1.7).toFixed(3)}%`);
  root.style.setProperty('--drift-y', `${((pointerY - 0.5) * -1.2).toFixed(3)}%`);
}

function resizeCanvas(): void {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawLight(time = 0): void {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  context.clearRect(0, 0, width, height);

  const palette = emotion === 'near'
    ? ['255, 210, 122', '255, 244, 214']
    : emotion === 'awake'
      ? ['108, 226, 229', '255, 177, 91']
      : ['141, 198, 213', '255, 226, 169'];
  const startX = width * (0.1 + progress * 0.08);
  const startY = height * (0.78 - progress * 0.08);
  const endX = width * (0.55 + progress * 0.38);
  const endY = height * (0.62 - progress * 0.24);
  const pulse = reducedMotion ? 0 : Math.sin(time * 0.0014) * 5;

  for (let index = 0; index < 3; index += 1) {
    const alpha = (0.08 + progress * 0.18) / (index + 1);
    context.beginPath();
    context.moveTo(startX, startY + index * 9);
    context.bezierCurveTo(
      width * (0.32 + pointerX * 0.08),
      height * (0.83 - progress * 0.22 + index * 0.01),
      width * (0.54 + pointerX * 0.14),
      height * (0.42 + pointerY * 0.12 - progress * 0.08),
      endX + pulse,
      endY - index * 7
    );
    context.strokeStyle = `rgba(${palette[index % 2]}, ${alpha})`;
    context.lineWidth = (8 - index * 2) * (0.35 + progress * 0.65);
    context.shadowBlur = 18 + progress * 32;
    context.shadowColor = `rgba(${palette[0]}, ${0.25 + progress * 0.25})`;
    context.stroke();
  }
  context.shadowBlur = 0;

  const radius = 3 + progress * 7;
  const gradient = context.createRadialGradient(endX, endY, 0, endX, endY, radius * 5);
  gradient.addColorStop(0, `rgba(${palette[1]}, ${0.75 * progress})`);
  gradient.addColorStop(1, `rgba(${palette[0]}, 0)`);
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(endX, endY, radius * 5, 0, Math.PI * 2);
  context.fill();
}

function animate(time: number): void {
  drawLight(time);
  animationFrame = reducedMotion ? 0 : window.requestAnimationFrame(animate);
}

document.querySelectorAll<HTMLButtonElement>('[data-emotion-value]').forEach((button) => {
  button.addEventListener('click', () => {
    const next = button.dataset.emotionValue as Emotion;
    if (!(next in emotionCopy)) return;
    emotion = next;
    renderEmotion();
    drawLight(performance.now());
  });
});

ideaForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  updateContinuation();
  renderProgress(Math.max(progress, 0.92), true);
  window.setTimeout(() => document.querySelector<HTMLElement>('#formation-title')?.focus({ preventScroll: true }), reducedMotion ? 0 : 760);
});

ideaInput?.addEventListener('input', updateContinuation);

resetAction?.addEventListener('click', () => {
  const order: Emotion[] = ['near', 'awake', 'open'];
  emotion = order[(order.indexOf(emotion) + 1) % order.length];
  renderEmotion();
  renderProgress(0.38, true);
});

world?.addEventListener('pointerdown', (event) => {
  isDragging = true;
  dragStartY = event.clientY;
  dragStartScrollY = window.scrollY;
  world.setPointerCapture(event.pointerId);
  root.dataset.dragging = 'true';
});

world?.addEventListener('pointermove', (event) => {
  setPointer(event.clientX, event.clientY);
  if (!isDragging) return;
  window.scrollTo({ top: dragStartScrollY + (dragStartY - event.clientY) * 2.2, behavior: 'auto' });
});

const endDrag = (event: PointerEvent) => {
  if (!isDragging) return;
  isDragging = false;
  root.dataset.dragging = 'false';
  if (world?.hasPointerCapture(event.pointerId)) world.releasePointerCapture(event.pointerId);
};
world?.addEventListener('pointerup', endDrag);
world?.addEventListener('pointercancel', endDrag);

window.addEventListener('scroll', updateFromScroll, { passive: true });
window.addEventListener('resize', () => {
  resizeCanvas();
  updateFromScroll();
  drawLight(performance.now());
});
window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault();
    renderProgress(progress + 0.08, true);
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    renderProgress(progress - 0.08, true);
  }
  if (event.key === 'End') {
    event.preventDefault();
    renderProgress(1, true);
  }
  if (event.key === 'Home') {
    event.preventDefault();
    renderProgress(0, true);
  }
});

if (heroAsset) {
  const markReady = () => { root.dataset.asset = 'ready'; };
  const markError = () => { root.dataset.asset = 'fallback'; };
  heroAsset.addEventListener('load', markReady, { once: true });
  heroAsset.addEventListener('error', markError, { once: true });
  if (heroAsset.complete) heroAsset.naturalWidth > 0 ? markReady() : markError();
}

resizeCanvas();
setPointer(window.innerWidth * pointerX, window.innerHeight * pointerY);
renderEmotion();
updateFromScroll();
drawLight(0);
if (!reducedMotion) animationFrame = window.requestAnimationFrame(animate);

window.addEventListener('pagehide', () => {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
}, { once: true });

window.__kageR169 = {
  snapshot: () => ({
    phase: resolvePhase(progress),
    emotion,
    progress: Number(progress.toFixed(3)),
    idea: ideaInput?.value.trim() ?? '',
    asset: root.dataset.asset ?? 'unknown',
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    reducedMotion
  }),
  setEmotion: (next) => {
    if (!(next in emotionCopy)) return;
    emotion = next;
    renderEmotion();
  },
  setProgress: (next) => renderProgress(next, true)
};
