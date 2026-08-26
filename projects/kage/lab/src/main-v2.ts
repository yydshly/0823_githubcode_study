import './styles.css';
import './styles-v2.css';
import './styles-r11.css';
import { capabilityCatalog } from './capabilities/catalog';
import { planCapabilities } from './capabilities/planner';
import type { CapabilityPlan } from './capabilities/schema';
import { defaultExperience, experienceRegistry } from './experience/fixtures';
import { buildFlowPlan } from './experience/flow-plan';
import { loadGeneratedExperience } from './generation/generated-store';
import { CinematicScrollDriver, experienceSegmentAtProgress } from './runtime/cinematic-scroll-driver';
import { CinematicPointerController, dampingFactor } from './runtime/experience-motion';
import { directExperienceCamera } from './runtime/experience-camera-director';
import { ExperienceRuntime } from './runtime/experience-runtime';
import { mixExperienceSceneState } from './runtime/experience-scene-state';
import type { ExperienceSegment } from './runtime/experience-scroll-driver';
import { QualityGovernor, resolveInitialQuality, type EffectiveQuality, type QualityPreference } from './runtime/quality';
import { renderExperienceControls, type LabPreferences, type MotionPreference, type RendererPreference } from './ui/experience-controls';
import { renderExperience, updateActiveNode } from './ui/experience-dom';

interface DebugSnapshot {
  lifecycle: string;
  experience: string;
  activeNodeId: string;
  flowPlan: { id: string; nodeIds: readonly string[]; flowIds: readonly string[] };
  capabilityPlan: CapabilityPlan;
  segment: { fromId: string; toId: string; t: number; progress: number; phase: string };
  motion: 'full' | 'reduce';
  qualityPreference: QualityPreference;
  qualityEffective: EffectiveQuality;
  rendererPreference: RendererPreference;
  viewport: { width: number; height: number; dpr: number; portrait: boolean };
  runtime: ReturnType<ExperienceRuntime['snapshot']> | null;
  motionFrame: { pointer: ReturnType<CinematicPointerController['snapshot']>; scrollVelocity: number; preview: boolean };
  story: string;
  chapter: number;
}

declare global { interface Window { __signalLab?: { snapshot: () => DebugSnapshot } } }

const params = new URLSearchParams(location.search);
const requestedExperience = params.get('experience') || params.get('story') || '';
const requestedGenerated = params.get('generated') || '';
const generatedExperience = requestedGenerated ? loadGeneratedExperience(requestedGenerated) : null;
const experience = generatedExperience || experienceRegistry.get(requestedExperience) || defaultExperience;
const choices = readChoices(params, experience.nodes);
const flowPlan = buildFlowPlan(experience, { choices });
const qualityPreference = readEnum(params.get('quality'), ['auto', 'high', 'balanced', 'low'], 'auto') as QualityPreference;
const motionPreference = readEnum(params.get('motion'), ['system', 'full', 'reduce'], 'system') as MotionPreference;
const rendererPreference = readEnum(params.get('renderer'), ['webgl', 'none'], 'webgl') as RendererPreference;
const debug = params.get('debug') === '1';
const embed = params.get('embed') === '1';
const preferences: LabPreferences = { experience, quality: qualityPreference, motion: motionPreference, renderer: rendererPreference, debug };
const initialId = flowPlan.nodeIds[0];
const initialSegment: ExperienceSegment = { fromId: initialId, toId: initialId, activeId: initialId, fromIndex: 0, toIndex: 0, activeIndex: 0, t: 0, progress: 0, phase: 'establish' };

const mediaMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionEffective: 'full' | 'reduce' = effectiveMotion(motionPreference, mediaMotion.matches);
let qualityEffective = resolveInitialQuality(qualityPreference);
let capabilityPlan = planCapabilities(experience, capabilityCatalog, { quality: qualityEffective, renderer: rendererPreference, motion: motionEffective });
let segment = initialSegment;
let runtime: ExperienceRuntime | null = null;
let raf = 0;
let previousTime = performance.now();
let visible = !document.hidden;
const pointerController = new CinematicPointerController();
let previewProgressTarget = .04;
let previewProgress = .04;
let previewVelocity = 0;
let pendingRender = false;

const experienceDom = renderExperience(experience, flowPlan);
renderExperienceControls(preferences);
document.documentElement.dataset.motion = motionEffective;
document.body.dataset.quality = qualityEffective;
document.body.dataset.embed = embed ? 'true' : 'false';
document.body.dataset.capability = capabilityPlan.status;
document.body.dataset.experience = experience.id;
const debugPanel = requiredElement<HTMLElement>('#debug-panel');
const status = requiredElement<HTMLElement>('#runtime-status');
const canvas = requiredElement<HTMLCanvasElement>('#world-canvas');
debugPanel.hidden = !debug;

const driver = new CinematicScrollDriver(flowPlan, experienceDom.sections, (next) => {
  segment = next;
  updateActiveNode(experienceDom, next.activeId);
  document.body.dataset.motionPhase = next.phase ?? 'hold';
}, requestRender);

experienceDom.navLinks.forEach((link, nodeId) => link.addEventListener('click', (event) => {
  event.preventDefault();
  driver.scrollTo(nodeId, motionEffective === 'reduce' ? 'auto' : 'smooth');
  history.replaceState(null, '', `#${nodeId}`);
}));

const governor = new QualityGovernor(qualityPreference === 'auto', qualityEffective, (next) => {
  qualityEffective = next; document.body.dataset.quality = next;
  capabilityPlan = planCapabilities(experience, capabilityCatalog, { quality: next, renderer: rendererPreference, motion: motionEffective });
  document.body.dataset.capability = capabilityPlan.status;
  runtime?.setQuality(next); requestRender();
});

if (rendererPreference === 'none') enterFallback('已切换到无 WebGL 的完整阅读模式。');
else {
  try {
    runtime = new ExperienceRuntime(canvas, experience, qualityEffective, () => enterFallback('WebGL 上下文已暂停，正文和导航仍可使用。'), () => {
      document.body.dataset.renderer = 'running'; status.textContent = 'WebGL 上下文已恢复。'; requestRender();
    }, requestRender);
    document.body.dataset.renderer = 'running'; status.textContent = '空间场景与插件已就绪。';
  } catch (error) {
    console.warn('[signal-lab] WebGL unavailable; using semantic fallback.', error);
    enterFallback('此设备未启用 WebGL，已显示完整阅读版本。');
  }
}

const requestedNode = params.get('node') || params.get('chapter');
if (requestedNode) {
  const numeric = Number(requestedNode);
  const nodeId = Number.isInteger(numeric) ? flowPlan.nodeIds[Math.min(flowPlan.nodeIds.length - 1, Math.max(0, numeric))] : requestedNode;
  if (flowPlan.nodeIds.includes(nodeId)) requestAnimationFrame(() => driver.scrollTo(nodeId, 'auto'));
}
if (debug) window.__signalLab = { snapshot: createSnapshot };

mediaMotion.addEventListener('change', () => {
  if (motionPreference !== 'system') return;
  motionEffective = effectiveMotion(motionPreference, mediaMotion.matches);
  document.documentElement.dataset.motion = motionEffective;
  capabilityPlan = planCapabilities(experience, capabilityCatalog, { quality: qualityEffective, renderer: rendererPreference, motion: motionEffective });
  document.body.dataset.capability = capabilityPlan.status; restartLoop();
});
addEventListener('resize', () => { runtime?.resize(); requestRender(); }, { passive: true });
addEventListener('pointermove', (event) => {
  if (motionEffective === 'reduce' || matchMedia('(hover: none)').matches) return;
  pointerController.setTarget((event.clientX / innerWidth - .5) * 2, (.5 - event.clientY / innerHeight) * 2);
}, { passive: true });
addEventListener('pointerleave', releasePointer, { passive: true });
addEventListener('blur', releasePointer, { passive: true });
addEventListener('message', handlePreviewMessage);
addEventListener('wheel', forwardPreviewWheel, { passive: true });
document.addEventListener('visibilitychange', () => { visible = !document.hidden; previousTime = performance.now(); if (visible) restartLoop(); });
addEventListener('beforeunload', () => {
  cancelAnimationFrame(raf); driver.destroy(); runtime?.dispose();
  removeEventListener('message', handlePreviewMessage); removeEventListener('wheel', forwardPreviewWheel);
}, { once: true });
restartLoop();

function frame(now: number): void {
  raf = 0;
  if (!visible || !runtime) return;
  const delta = Math.min(50, now - previousTime); previousTime = now; governor.record(delta, now); renderFrame(now, delta);
  if (motionEffective === 'full') raf = requestAnimationFrame(frame);
}

function renderFrame(now = performance.now(), delta = 16.67): void {
  pendingRender = false;
  if (!runtime || !visible) return;
  segment = embed ? advancePreviewTimeline(delta) : driver.advance(delta, motionEffective === 'reduce');
  updateActiveNode(experienceDom, segment.activeId);
  document.body.dataset.motionPhase = segment.phase ?? 'hold';
  const portrait = innerHeight > innerWidth;
  const pose = directExperienceCamera(experience, segment, portrait, motionEffective === 'reduce');
  const state = mixExperienceSceneState(experience, segment, motionEffective === 'reduce');
  const pointer = pointerController.advance(delta, motionEffective === 'reduce');
  runtime.render(pose, state, now / 1000, pointer, delta, embed ? previewVelocity : driver.velocity);
  if (debug) debugPanel.textContent = JSON.stringify(createSnapshot(), null, 2);
}

function requestRender(): void {
  if (motionEffective === 'full' || pendingRender) return;
  pendingRender = true; requestAnimationFrame(() => renderFrame());
}

function restartLoop(): void {
  cancelAnimationFrame(raf); raf = 0; previousTime = performance.now();
  if (!visible || !runtime) return;
  if (motionEffective === 'full') raf = requestAnimationFrame(frame); else requestRender();
}

function enterFallback(message: string): void {
  document.body.dataset.renderer = 'fallback'; status.textContent = message; cancelAnimationFrame(raf); raf = 0;
}

function releasePointer(): void { pointerController.release(); }

function handlePreviewMessage(event: MessageEvent): void {
  if (!embed || event.origin !== location.origin || !event.data || event.data.type !== 'signal-lab:preview-progress') return;
  const progress = Number(event.data.progress);
  if (!Number.isFinite(progress)) return;
  previewProgressTarget = Math.min(1, Math.max(0, progress));
  requestRender();
}

function forwardPreviewWheel(event: WheelEvent): void {
  if (!embed || parent === window) return;
  parent.postMessage({ type: 'signal-lab:preview-wheel', deltaY: event.deltaY }, location.origin);
}

function advancePreviewTimeline(delta: number): ExperienceSegment {
  const previous = previewProgress;
  if (motionEffective === 'reduce') previewProgress = previewProgressTarget;
  else previewProgress += (previewProgressTarget - previewProgress) * dampingFactor(6.8, delta);
  const seconds = Math.max(1 / 240, Math.min(.05, delta / 1000));
  const rawVelocity = Math.max(-4, Math.min(4, (previewProgress - previous) / seconds));
  previewVelocity += (rawVelocity - previewVelocity) * dampingFactor(7, delta);
  return experienceSegmentAtProgress(flowPlan, previewProgress);
}

function createSnapshot(): DebugSnapshot {
  return {
    lifecycle: document.body.dataset.renderer || 'unknown', experience: experience.id, activeNodeId: segment.activeId,
    flowPlan: { id: flowPlan.id, nodeIds: flowPlan.nodeIds, flowIds: flowPlan.flowIds },
    capabilityPlan,
    segment: { fromId: segment.fromId, toId: segment.toId, t: round(segment.t), progress: round(segment.progress), phase: segment.phase ?? 'hold' },
    motion: motionEffective, qualityPreference, qualityEffective, rendererPreference,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, portrait: innerHeight > innerWidth }, runtime: runtime?.snapshot() || null,
    motionFrame: { pointer: pointerController.snapshot(), scrollVelocity: round(embed ? previewVelocity : driver.velocity), preview: embed },
    story: experience.id, chapter: segment.activeIndex
  };
}

function readChoices(search: URLSearchParams, nodes: ExperienceManifestLikeNodes): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of search.entries()) if (key.startsWith('choice.')) values[key.slice(7)] = value;
  const generic = search.get('choice');
  if (generic) {
    const firstChoice = Object.values(nodes).find((node) => node.type === 'choice');
    if (firstChoice) values[firstChoice.id] = generic;
  }
  return values;
}

type ExperienceManifestLikeNodes = typeof experience.nodes;
function effectiveMotion(preference: MotionPreference, systemReduced: boolean): 'full' | 'reduce' { return preference === 'reduce' ? 'reduce' : preference === 'full' ? 'full' : systemReduced ? 'reduce' : 'full'; }
function readEnum(value: string | null, options: readonly string[], fallback: string): string { return value && options.includes(value) ? value : fallback; }
function round(value: number): number { return Math.round(value * 1000) / 1000; }
function requiredElement<T extends Element>(selector: string): T { const node = document.querySelector<T>(selector); if (!node) throw new Error(`Required runtime DOM is missing: ${selector}`); return node; }
