import { z } from 'zod';
import type { RuntimeEvaluationEvidence } from './evaluation.ts';
import { stableHash } from '../generation/stable-hash.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const runtimeEvidenceSampleSchema = z.object({
  id: safeId,
  mode: z.enum(['desktop-webgl', 'mobile-webgl', 'mobile-fallback']),
  url: z.string().min(1),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  lifecycle: z.enum(['running', 'fallback']),
  rendererPreference: z.enum(['webgl', 'none']),
  motion: z.enum(['full', 'reduce']),
  quality: z.enum(['high', 'balanced', 'low']),
  framesRendered: z.number().int().nonnegative(),
  drawCalls: z.number().int().nonnegative(),
  scenePluginId: z.string().min(1).nullable(),
  nodeCount: z.number().int().positive(),
  navCount: z.number().int().positive(),
  semanticContentPresent: z.boolean(),
  horizontalOverflow: z.boolean()
}).strict();

export const runtimeEvidenceBundleSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  candidateId: safeId,
  manifestId: safeId,
  collector: z.object({ mode: z.literal('same-origin-browser'), adapter: z.literal('runtime-evidence-collector-v1'), screenshotVisionUsed: z.literal(false) }).strict(),
  samples: z.tuple([runtimeEvidenceSampleSchema, runtimeEvidenceSampleSchema, runtimeEvidenceSampleSchema]),
  status: z.enum(['ready', 'failed']),
  failures: z.array(z.string().min(2)),
  summary: z.string().min(4)
}).strict().superRefine((value, context) => {
  const modes = new Set(value.samples.map((sample) => sample.mode));
  (['desktop-webgl', 'mobile-webgl', 'mobile-fallback'] as const).forEach((mode) => {
    if (!modes.has(mode)) context.addIssue({ code: 'custom', path: ['samples'], message: `运行证据缺少 ${mode}。` });
  });
  const expectedStatus = value.failures.length ? 'failed' : 'ready';
  if (value.status !== expectedStatus) context.addIssue({ code: 'custom', path: ['status'], message: `证据状态应为 ${expectedStatus}。` });
});

export type RuntimeEvidenceSample = z.infer<typeof runtimeEvidenceSampleSchema>;
export type RuntimeEvidenceBundle = z.infer<typeof runtimeEvidenceBundleSchema>;

interface PreviewSnapshot {
  lifecycle: string;
  experience: string;
  flowPlan: { nodeIds: readonly string[] };
  motion: string;
  qualityEffective: string;
  rendererPreference: string;
  viewport: { width: number; height: number };
  runtime: null | {
    lifecycle: string;
    framesRendered: number;
    drawCalls: number;
    quality: string;
    scenePlugin: { id: string };
  };
}

interface PreviewWindow {
  __signalLab?: { snapshot: () => PreviewSnapshot };
}

interface SampleTarget {
  mode: RuntimeEvidenceSample['mode'];
  width: number;
  height: number;
  renderer: RuntimeEvidenceSample['rendererPreference'];
  quality: RuntimeEvidenceSample['quality'];
}

const targets: readonly SampleTarget[] = [
  { mode: 'desktop-webgl', width: 1440, height: 900, renderer: 'webgl', quality: 'balanced' },
  { mode: 'mobile-webgl', width: 390, height: 844, renderer: 'webgl', quality: 'low' },
  { mode: 'mobile-fallback', width: 390, height: 844, renderer: 'none', quality: 'low' }
];

export async function collectRuntimeEvidence(
  previewUrl: string,
  candidateId: string,
  manifestId: string,
  onProgress?: (completed: number, total: number, mode: RuntimeEvidenceSample['mode']) => void,
  signal?: AbortSignal
): Promise<RuntimeEvidenceBundle> {
  const samples: RuntimeEvidenceSample[] = [];
  const failures: string[] = [];
  for (const target of targets) {
    if (signal?.aborted) throw abortError();
    try {
      samples.push(await collectSample(previewUrl, manifestId, target, signal));
    } catch (error) {
      if (isAbortError(error)) throw error;
      failures.push(`${target.mode}: ${error instanceof Error ? error.message : String(error)}`);
      samples.push(failedSample(previewUrl, target));
    }
    onProgress?.(samples.length, targets.length, target.mode);
  }
  const tuple = samples as [RuntimeEvidenceSample, RuntimeEvidenceSample, RuntimeEvidenceSample];
  return runtimeEvidenceBundleSchema.parse({
    schemaVersion: 1,
    id: `runtime-evidence-${stableHash(`${candidateId}|${samples.map(sampleSignature).join('|')}`)}`,
    candidateId,
    manifestId,
    collector: { mode: 'same-origin-browser', adapter: 'runtime-evidence-collector-v1', screenshotVisionUsed: false },
    samples: tuple,
    status: failures.length ? 'failed' : 'ready',
    failures,
    summary: failures.length
      ? `${samples.length - failures.length}/3 个受控预览状态通过，${failures.length} 个状态采集失败。`
      : '桌面 WebGL、手机低画质 WebGL 和手机语义回退均已从真实同源预览采集。'
  });
}

export function runtimeEvidenceForEvaluation(bundle: RuntimeEvidenceBundle): RuntimeEvaluationEvidence | undefined {
  if (bundle.status !== 'ready') return undefined;
  const desktop = bundle.samples.find((sample) => sample.mode === 'desktop-webgl');
  const mobile = bundle.samples.find((sample) => sample.mode === 'mobile-webgl');
  const fallback = bundle.samples.find((sample) => sample.mode === 'mobile-fallback');
  if (!desktop || !mobile || !fallback || !desktop.scenePluginId) return undefined;
  return {
    lifecycle: desktop.lifecycle,
    renderer: desktop.rendererPreference,
    viewport: desktop.viewport,
    quality: desktop.quality,
    drawCalls: Math.max(desktop.drawCalls, mobile.drawCalls),
    scenePluginId: desktop.scenePluginId,
    semanticFallbackVerified: fallback.lifecycle === 'fallback' && fallback.semanticContentPresent && fallback.nodeCount === fallback.navCount,
    reducedMotionVerified: desktop.motion === 'reduce' && mobile.motion === 'reduce',
    horizontalOverflow: bundle.samples.some((sample) => sample.horizontalOverflow),
    samples: bundle.samples.map((sample) => `${sample.mode}:${sample.lifecycle}:${sample.viewport.width}x${sample.viewport.height}:draw=${sample.drawCalls}:overflow=${sample.horizontalOverflow}`)
  };
}

async function collectSample(baseUrl: string, manifestId: string, target: SampleTarget, signal?: AbortSignal): Promise<RuntimeEvidenceSample> {
  const url = new URL(baseUrl, location.href);
  url.searchParams.set('debug', '1');
  url.searchParams.set('quality', target.quality);
  url.searchParams.set('motion', 'reduce');
  url.searchParams.set('renderer', target.renderer);
  if (url.origin !== location.origin) throw new Error('运行证据只允许采集同源预览。');
  const frame = document.createElement('iframe');
  frame.title = `runtime evidence ${target.mode}`;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.width = String(target.width);
  frame.height = String(target.height);
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${target.width}px;height:${target.height}px;opacity:.001;pointer-events:none;border:0;`;
  document.body.append(frame);
  try {
    await loadFrame(frame, url.href, signal);
    const { snapshot, doc } = await waitForSnapshot(frame, target.renderer, manifestId, signal);
    const nodeCount = doc.querySelectorAll('#story section[data-node-id]').length;
    const navCount = doc.querySelectorAll('#chapter-nav a[data-node-id]').length;
    const semanticContentPresent = nodeCount > 0
      && navCount > 0
      && Boolean(doc.querySelector('.story-title')?.textContent?.trim())
      && Boolean(doc.querySelector('.chapter-title')?.textContent?.trim());
    const lifecycle = target.renderer === 'none' ? 'fallback' : snapshot.lifecycle === 'running' ? 'running' : 'fallback';
    return runtimeEvidenceSampleSchema.parse({
      id: `sample-${target.mode}`,
      mode: target.mode,
      url: url.href,
      viewport: { width: snapshot.viewport.width, height: snapshot.viewport.height },
      lifecycle,
      rendererPreference: snapshot.rendererPreference,
      motion: snapshot.motion,
      quality: snapshot.qualityEffective,
      framesRendered: snapshot.runtime?.framesRendered || 0,
      drawCalls: snapshot.runtime?.drawCalls || 0,
      scenePluginId: snapshot.runtime?.scenePlugin.id || null,
      nodeCount,
      navCount,
      semanticContentPresent,
      horizontalOverflow: doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1
    });
  } finally {
    frame.remove();
  }
}

function failedSample(baseUrl: string, target: SampleTarget): RuntimeEvidenceSample {
  return runtimeEvidenceSampleSchema.parse({
    id: `sample-${target.mode}`, mode: target.mode, url: baseUrl,
    viewport: { width: target.width, height: target.height }, lifecycle: target.renderer === 'none' ? 'fallback' : 'running',
    rendererPreference: target.renderer, motion: 'reduce', quality: target.quality,
    framesRendered: 0, drawCalls: 0, scenePluginId: null, nodeCount: 1, navCount: 1,
    semanticContentPresent: false, horizontalOverflow: false
  });
}

function loadFrame(frame: HTMLIFrameElement, url: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (callback: () => void) => { clearTimeout(timer); signal?.removeEventListener('abort', onAbort); callback(); };
    const onAbort = () => finish(() => reject(abortError()));
    const timer = window.setTimeout(() => finish(() => reject(new Error('预览载入超时。'))), 12_000);
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    frame.addEventListener('load', () => finish(resolve), { once: true });
    frame.addEventListener('error', () => finish(() => reject(new Error('预览载入失败。'))), { once: true });
    frame.src = url;
  });
}

async function waitForSnapshot(frame: HTMLIFrameElement, renderer: SampleTarget['renderer'], manifestId: string, signal?: AbortSignal): Promise<{ snapshot: PreviewSnapshot; doc: Document }> {
  const started = performance.now();
  while (performance.now() - started < 12_000) {
    if (signal?.aborted) throw abortError();
    const win = frame.contentWindow as unknown as PreviewWindow | null;
    const doc = frame.contentDocument;
    const snapshot = win?.__signalLab?.snapshot();
    const lifecycleReady = renderer === 'none'
      ? snapshot?.lifecycle === 'fallback'
      : snapshot?.lifecycle === 'running' && Boolean(snapshot.runtime && snapshot.runtime.framesRendered > 0);
    if (snapshot && doc && snapshot.experience === manifestId && lifecycleReady) return { snapshot, doc };
    await delay(80);
  }
  throw new Error(`没有得到 ${renderer} 的稳定运行快照。`);
}

function sampleSignature(sample: RuntimeEvidenceSample): string {
  return `${sample.mode}:${sample.lifecycle}:${sample.viewport.width}x${sample.viewport.height}:${sample.drawCalls}:${sample.scenePluginId}:${sample.horizontalOverflow}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function abortError(): DOMException {
  return new DOMException('运行证据采集已取消。', 'AbortError');
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
