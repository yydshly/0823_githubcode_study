import './styles.css';
import { defaultStory, storyRegistry } from './config/stories';
import { directCamera } from './runtime/camera-director';
import { QualityGovernor, resolveInitialQuality, type EffectiveQuality, type QualityPreference } from './runtime/quality';
import { SignalScene } from './runtime/scene';
import { mixSceneState } from './runtime/scene-state';
import { ScrollDriver, type StorySegment } from './runtime/scroll-driver';
import { renderControls, type LabPreferences, type MotionPreference, type RendererPreference } from './ui/lab-controls';
import { renderStory, updateActiveChapter } from './ui/story-dom';

interface DebugSnapshot {
  lifecycle: string;
  story: string;
  chapter: number;
  segment: { from: number; to: number; t: number; progress: number };
  motion: 'full' | 'reduce';
  qualityPreference: QualityPreference;
  qualityEffective: EffectiveQuality;
  rendererPreference: RendererPreference;
  viewport: { width: number; height: number; dpr: number; portrait: boolean };
  runtime: ReturnType<SignalScene['snapshot']> | null;
}

declare global {
  interface Window {
    __signalLab?: { snapshot: () => DebugSnapshot };
  }
}

const params = new URLSearchParams(location.search);
const story = storyRegistry.get(params.get('story') || '') || defaultStory;
const qualityPreference = readEnum(params.get('quality'), ['auto', 'high', 'balanced', 'low'], 'auto') as QualityPreference;
const motionPreference = readEnum(params.get('motion'), ['system', 'full', 'reduce'], 'system') as MotionPreference;
const rendererPreference = readEnum(params.get('renderer'), ['webgl', 'none'], 'webgl') as RendererPreference;
const debug = params.get('debug') === '1';
const preferences: LabPreferences = { story, quality: qualityPreference, motion: motionPreference, renderer: rendererPreference, debug };

const mediaMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionEffective: 'full' | 'reduce' = effectiveMotion(motionPreference, mediaMotion.matches);
let qualityEffective = resolveInitialQuality(qualityPreference);
let segment: StorySegment = { from: 0, to: 0, t: 0, active: 0, progress: 0 };
let runtime: SignalScene | null = null;
let raf = 0;
let previousTime = performance.now();
let visible = !document.hidden;
let pointer = { x: 0, y: 0 };
let pendingRender = false;

const { sections, navLinks } = renderStory(story);
renderControls(preferences);
document.documentElement.dataset.motion = motionEffective;
document.body.dataset.quality = qualityEffective;
const debugPanel = requiredElement<HTMLElement>('#debug-panel');
const status = requiredElement<HTMLElement>('#runtime-status');
const canvas = requiredElement<HTMLCanvasElement>('#world-canvas');
debugPanel.hidden = !debug;

const driver = new ScrollDriver(sections, (next) => {
  segment = next;
  updateActiveChapter(sections, navLinks, next.active);
  requestRender();
});

navLinks.forEach((link, index) => link.addEventListener('click', (event) => {
  event.preventDefault();
  driver.scrollTo(index, motionEffective === 'reduce' ? 'auto' : 'smooth');
  history.replaceState(null, '', `#${story.chapters[index].id}`);
}));

const governor = new QualityGovernor(qualityPreference === 'auto', qualityEffective, (next) => {
  qualityEffective = next;
  document.body.dataset.quality = next;
  runtime?.setQuality(next);
  requestRender();
});

if (rendererPreference === 'none') {
  enterFallback('已切换到无 WebGL 的完整阅读模式。');
} else {
  try {
    runtime = new SignalScene(canvas, story, qualityEffective, () => {
      enterFallback('WebGL 上下文已暂停，正文和导航仍可使用。');
    }, () => {
      document.body.dataset.renderer = 'running';
      status.textContent = 'WebGL 上下文已恢复。';
      requestRender();
    });
    document.body.dataset.renderer = 'running';
    status.textContent = '空间场景已就绪。';
  } catch (error) {
    console.warn('[signal-lab] WebGL unavailable; using semantic fallback.', error);
    enterFallback('此设备未启用 WebGL，已显示完整阅读版本。');
  }
}

const requestedChapter = params.get('chapter');
if (requestedChapter) {
  const numeric = Number(requestedChapter);
  const index = Number.isInteger(numeric)
    ? Math.min(story.chapters.length - 1, Math.max(0, numeric))
    : story.chapters.findIndex((chapter) => chapter.id === requestedChapter);
  if (index >= 0) requestAnimationFrame(() => driver.scrollTo(index, 'auto'));
}

if (debug) {
  window.__signalLab = { snapshot: createSnapshot };
}

mediaMotion.addEventListener('change', () => {
  if (motionPreference !== 'system') return;
  motionEffective = effectiveMotion(motionPreference, mediaMotion.matches);
  document.documentElement.dataset.motion = motionEffective;
  restartLoop();
});

addEventListener('resize', () => {
  runtime?.resize();
  requestRender();
}, { passive: true });

addEventListener('pointermove', (event) => {
  if (motionEffective === 'reduce' || matchMedia('(hover: none)').matches) return;
  pointer = {
    x: (event.clientX / innerWidth - 0.5) * 2,
    y: (0.5 - event.clientY / innerHeight) * 2
  };
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  visible = !document.hidden;
  previousTime = performance.now();
  if (visible) restartLoop();
});

addEventListener('beforeunload', () => {
  cancelAnimationFrame(raf);
  driver.destroy();
  runtime?.dispose();
}, { once: true });

restartLoop();

function frame(now: number): void {
  raf = 0;
  if (!visible || !runtime) return;
  const delta = Math.min(50, now - previousTime);
  previousTime = now;
  governor.record(delta, now);
  renderFrame(now);
  if (motionEffective === 'full') raf = requestAnimationFrame(frame);
}

function renderFrame(now = performance.now()): void {
  pendingRender = false;
  if (!runtime || !visible) return;
  const portrait = innerHeight > innerWidth;
  const pose = directCamera(story, segment, portrait, motionEffective === 'reduce');
  const sceneState = mixSceneState(story, segment, motionEffective === 'reduce');
  runtime.render(pose, sceneState, now / 1000, motionEffective === 'reduce' ? { x: 0, y: 0 } : pointer);
  if (debug) debugPanel.textContent = JSON.stringify(createSnapshot(), null, 2);
}

function requestRender(): void {
  if (motionEffective === 'full' || pendingRender) return;
  pendingRender = true;
  requestAnimationFrame(() => renderFrame());
}

function restartLoop(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  previousTime = performance.now();
  if (!visible || !runtime) return;
  if (motionEffective === 'full') raf = requestAnimationFrame(frame);
  else requestRender();
}

function enterFallback(message: string): void {
  document.body.dataset.renderer = 'fallback';
  status.textContent = message;
  cancelAnimationFrame(raf);
  raf = 0;
}

function createSnapshot(): DebugSnapshot {
  return {
    lifecycle: document.body.dataset.renderer || 'unknown',
    story: story.id,
    chapter: segment.active,
    segment: { from: segment.from, to: segment.to, t: round(segment.t), progress: round(segment.progress) },
    motion: motionEffective,
    qualityPreference,
    qualityEffective,
    rendererPreference,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, portrait: innerHeight > innerWidth },
    runtime: runtime?.snapshot() || null
  };
}

function effectiveMotion(preference: MotionPreference, systemReduced: boolean): 'full' | 'reduce' {
  if (preference === 'reduce') return 'reduce';
  if (preference === 'full') return 'full';
  return systemReduced ? 'reduce' : 'full';
}

function readEnum(value: string | null, options: readonly string[], fallback: string): string {
  return value && options.includes(value) ? value : fallback;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function requiredElement<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Required runtime DOM is missing: ${selector}`);
  return node;
}
