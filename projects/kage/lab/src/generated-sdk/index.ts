export type GeneratedQuality = 'high' | 'balanced' | 'low';
export interface GeneratedViewport { width: number; height: number; dpr: number; }
export interface GeneratedMountContext {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  quality: GeneratedQuality;
  reducedMotion: boolean;
  viewport: Readonly<GeneratedViewport>;
}
export interface GeneratedFrame {
  elapsed: number; delta: number; progress: number;
  pointer: Readonly<{ x: number; y: number; strength: number }>;
  viewport: Readonly<GeneratedViewport>;
  reducedMotion: boolean;
}
export interface GeneratedExperience {
  mount(context: GeneratedMountContext): void | Promise<void>;
  update(frame: GeneratedFrame): void;
  resize(viewport: GeneratedViewport): void;
  dispose(): void;
}

export function defineExperience(experience: GeneratedExperience): GeneratedExperience { return experience; }

export function startExperience(experience: GeneratedExperience): void {
  const container = document.querySelector<HTMLElement>('#app');
  if (!container) throw new Error('Generated experience requires #app.');
  const canvas = document.createElement('canvas');
  canvas.className = 'generated-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  const params = new URLSearchParams(location.search);
  const quality = readQuality(params.get('quality'));
  const reducedMotion = params.get('motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deterministicReview = params.get('visual-review') === '1';
  const pointer = { x: 0, y: 0, strength: 0 };
  const pointerTarget = { x: 0, y: 0, strength: 0 };
  let progress = 0; let progressTarget = 0; let frameId = 0; let disposed = false;
  let last = performance.now(); const started = last;
  const viewport = (): GeneratedViewport => ({
    width: Math.max(1, innerWidth), height: Math.max(1, innerHeight),
    dpr: Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'balanced' ? 1.5 : 1)
  });
  const syncScroll = (): void => { const range = Math.max(1, document.documentElement.scrollHeight - innerHeight); if (range > 2) progressTarget = clamp(scrollY / range); };
  const onPointerMove = (event: PointerEvent): void => {
    pointerTarget.x = event.clientX / Math.max(1, innerWidth) * 2 - 1;
    pointerTarget.y = -(event.clientY / Math.max(1, innerHeight) * 2 - 1);
    pointerTarget.strength = 1;
  };
  const onPointerLeave = (): void => { pointerTarget.strength = 0; };
  const onWheel = (event: WheelEvent): void => { progressTarget = clamp(progressTarget + Math.max(-180, Math.min(180, event.deltaY)) * .0009); };
  const onMessage = (event: MessageEvent): void => {
    if (event.data?.type !== 'signal-lab:preview-progress') return;
    const next = Number(event.data.progress); if (Number.isFinite(next)) progressTarget = clamp(next);
  };
  const onResize = (): void => experience.resize(viewport());
  const tick = (now: number): void => {
    if (disposed) return;
    const delta = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    const smoothing = reducedMotion || deterministicReview ? 1 : 1 - Math.exp(-delta * 7.5);
    progress += (progressTarget - progress) * smoothing;
    pointer.x += (pointerTarget.x - pointer.x) * smoothing;
    pointer.y += (pointerTarget.y - pointer.y) * smoothing;
    pointer.strength += (pointerTarget.strength - pointer.strength) * smoothing;
    document.body.dataset.generatedProgress = progress.toFixed(4);
    experience.update({ elapsed: (now - started) / 1000, delta, progress, pointer, viewport: viewport(), reducedMotion });
    frameId = requestAnimationFrame(tick);
  };
  const dispose = (): void => {
    if (disposed) return; disposed = true; cancelAnimationFrame(frameId);
    delete document.body.dataset.generatedProgress;
    removeEventListener('scroll', syncScroll); removeEventListener('resize', onResize); removeEventListener('pointermove', onPointerMove);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave); removeEventListener('wheel', onWheel); removeEventListener('message', onMessage);
    experience.dispose();
  };

  const initialViewport = viewport();
  Promise.resolve(experience.mount({ container, canvas, quality, reducedMotion, viewport: initialViewport })).then(() => {
    container.querySelector('.generated-loading')?.remove();
    experience.resize(initialViewport); syncScroll();
    addEventListener('scroll', syncScroll, { passive: true }); addEventListener('resize', onResize, { passive: true });
    addEventListener('pointermove', onPointerMove, { passive: true }); document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
    addEventListener('wheel', onWheel, { passive: true }); addEventListener('message', onMessage); addEventListener('pagehide', dispose, { once: true });
    frameId = requestAnimationFrame(tick); document.body.dataset.generatedReady = 'true';
  }).catch((error) => {
    document.body.dataset.generatedReady = 'error';
    container.querySelector('.generated-loading')?.remove();
    const fallback = document.createElement('section'); fallback.className = 'generated-runtime-error';
    fallback.innerHTML = '<strong>3D 增强没有启动</strong><p>页面内容仍然可读，请使用基础体验。</p>'; container.append(fallback);
    console.error('[generated-experience] mount failed', error);
  });
}

function readQuality(value: string | null): GeneratedQuality { return value === 'high' || value === 'low' ? value : 'balanced'; }
function clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
