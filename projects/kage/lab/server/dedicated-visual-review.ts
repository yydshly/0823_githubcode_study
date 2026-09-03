import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { assessVisualEvidence, visualReviewEvidenceSchema, type CausalJourneyState, type VisualReviewAssessment, type VisualReviewEvidence } from '../src/generation/visual-review.ts';
import { createVisualReviewPlan, visualReviewPlanSchema, type VisualReviewCheckpoint, type VisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { assertGenerationDeadline, clampTimeoutToGenerationDeadline, remainingGenerationDeadlineMs } from './generation-deadline.ts';

type Environment = Readonly<Record<string, string | undefined>>;

export const SEMANTIC_FEEDBACK_SELECTOR = '[data-signal-primary-result],[data-result],[data-detail],[data-note],[aria-live],[role="status"]';

export interface CapturedVisualReview {
  directory: string;
  imagePaths: string[];
  plan: VisualReviewPlan;
  evidence: VisualReviewEvidence;
  assessment: VisualReviewAssessment;
}

export async function captureDedicatedVisualReview(
  runId: string,
  origin: string,
  environment: Environment = process.env,
  requestedPlan: VisualReviewPlan = createVisualReviewPlan()
): Promise<CapturedVisualReview> {
  assertGenerationDeadline(environment);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId)) throw new Error('视觉评审运行 ID 非法。');
  const safeOrigin = normalizeLocalOrigin(origin);
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-visual-review-'));
  await mkdir(directory, { recursive: true });
  const executablePath = await resolveBrowserExecutable(environment);
  const plan = visualReviewPlanSchema.parse(requestedPlan);
  const browserErrors: string[] = [];
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-webgl', '--ignore-gpu-blocklist']
  });
  let deadlineExpired = false;
  const remaining = remainingGenerationDeadlineMs(environment);
  const deadlineTimer = remaining === null ? null : setTimeout(() => {
    deadlineExpired = true;
    void browser.close().catch(() => undefined);
  }, Math.max(1, remaining));
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    desktop.setDefaultTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
    desktop.setDefaultNavigationTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
    attachErrorCollection(desktop, browserErrors, 'desktop');
    const desktopUrl = `${safeOrigin}/generated-runs/${runId}/?quality=high&motion=full&visual-review=1`;
    await desktop.goto(desktopUrl, { waitUntil: 'domcontentloaded', timeout: clampTimeoutToGenerationDeadline(environment, 30_000) });
    await waitForGeneratedRuntime(desktop, 'desktop', environment);
    await desktop.waitForTimeout(700);

    const desktopFrames = [];
    const captureSubjectStates = plan.checkpoints.some((checkpoint) => checkpoint.expectSubjectChange);
    let previousSubjectSignature: CanvasSignature | null = null;
    for (const checkpoint of plan.checkpoints.filter((item) => item.surface === 'desktop')) {
      const captured = await captureFrame(desktop, directory, checkpoint, previousSubjectSignature, captureSubjectStates);
      desktopFrames.push(captured.frame);
      if (captured.subjectSignature) previousSubjectSignature = captured.subjectSignature;
    }

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    mobile.setDefaultTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
    mobile.setDefaultNavigationTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
    attachErrorCollection(mobile, browserErrors, 'mobile');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await mobile.goto(`${safeOrigin}/generated-runs/${runId}/?quality=low&motion=reduce&visual-review=1`, { waitUntil: 'domcontentloaded', timeout: clampTimeoutToGenerationDeadline(environment, 30_000) });
    await waitForGeneratedRuntime(mobile, 'mobile', environment);
    await mobile.waitForTimeout(500);
    const mobileCheckpoints = plan.checkpoints.filter((item) => item.surface === 'mobile');
    if (mobileCheckpoints.length === 0) throw new Error('视觉验收计划缺少移动端检查点。');
    const mobileFrames = [];
    for (const checkpoint of mobileCheckpoints) {
      mobileFrames.push((await captureFrame(mobile, directory, checkpoint)).frame);
    }

    const fallbackCheckpoint = plan.checkpoints.find((item) => item.surface === 'fallback');
    let fallbackFrame: VisualReviewEvidence['frames'][number] | null = null;
    if (fallbackCheckpoint) {
      const fallback = await browser.newPage({ viewport: { width: 1024, height: 720 }, deviceScaleFactor: 1 });
      fallback.setDefaultTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
      fallback.setDefaultNavigationTimeout(clampTimeoutToGenerationDeadline(environment, 30_000));
      attachErrorCollection(fallback, browserErrors, 'fallback');
      await fallback.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        const withoutWebgl = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
          return Reflect.apply(original, this, [type, ...args]);
        };
        HTMLCanvasElement.prototype.getContext = withoutWebgl as typeof HTMLCanvasElement.prototype.getContext;
      });
      await fallback.emulateMedia({ reducedMotion: 'reduce' });
      await fallback.goto(`${safeOrigin}/generated-runs/${runId}/?quality=low&motion=reduce&visual-review=1`, { waitUntil: 'domcontentloaded', timeout: clampTimeoutToGenerationDeadline(environment, 30_000) });
      await fallback.waitForFunction(() => ['true', 'error'].includes(document.body.dataset.generatedReady || ''), null, { timeout: clampTimeoutToGenerationDeadline(environment, 30_000) });
      await fallback.waitForTimeout(500);
      fallbackFrame = (await captureFrame(fallback, directory, fallbackCheckpoint)).frame;
    }

    const frames = [...desktopFrames, ...mobileFrames, ...(fallbackFrame ? [fallbackFrame] : [])];
    const evidence = visualReviewEvidenceSchema.parse({
      schemaVersion: 1,
      runId,
      capturedAt: new Date().toISOString(),
      frames,
      browserErrors: browserErrors.slice(0, 30)
    });
    return {
      directory,
      imagePaths: frames.map((frame) => join(directory, `${frame.id}.png`)),
      plan,
      evidence,
      assessment: assessVisualEvidence(evidence, plan)
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    if (deadlineExpired) throw new Error('生成任务达到总时间上限，浏览器验收已停止。');
    throw error;
  } finally {
    if (deadlineTimer) clearTimeout(deadlineTimer);
    await browser.close().catch(() => undefined);
  }
}

export async function cleanupCapturedVisualReview(review: CapturedVisualReview): Promise<void> {
  await rm(review.directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 }).catch(() => undefined);
}

async function captureFrame(
  page: Page,
  directory: string,
  checkpoint: VisualReviewCheckpoint,
  previousSubjectSignature: CanvasSignature | null = null,
  captureSubjectState = false
) {
  const { id, quality, reducedMotion, progress, action } = checkpoint;
  await page.evaluate((value) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({ top: maximum * value, behavior: 'instant' });
    window.postMessage({ type: 'signal-lab:preview-progress', progress: value }, '*');
  }, progress);
  const causalState = checkpoint.causalProbe
    ? await probePrimaryJourney(page, checkpoint.causalProbe)
    : undefined;
  const semanticBefore = action === 'semantic-probe' ? await readSemanticState(page) : null;
  const sceneBefore = action === 'semantic-probe' ? await readCanvasSignature(page) : null;
  const driverState = action === 'driver-probe' ? await probeSharedStateDriver(page) : undefined;
  let parameterActionObserved = false;
  if (action === 'semantic-probe') {
    const targets = page.locator('input[type="range"],select,input:not([type="hidden"]):not([type="color"])');
    for (let index = 0; index < await targets.count(); index += 1) {
      const target = targets.nth(index);
      if (!await target.isVisible()) continue;
      await target.focus();
      const tag = await target.evaluate((element) => element.tagName.toLowerCase());
      const type = await target.getAttribute('type');
      if (tag === 'input' && type === 'range') {
        const range = await target.evaluate((element) => {
          const input = element as HTMLInputElement;
          return { min: Number(input.min || 0), max: Number(input.max || 100), value: Number(input.value) };
        });
        const fraction = range.value > range.min + (range.max - range.min) * .62 ? .28 : .78;
        await target.fill(String(Math.round(range.min + (range.max - range.min) * fraction)));
      } else if (tag === 'select') {
        const optionCount = await target.locator('option').count();
        const selectedIndex = await target.evaluate((element) => (element as HTMLSelectElement).selectedIndex);
        if (optionCount > 1) await target.selectOption({ index: (selectedIndex + 1) % optionCount });
      }
      parameterActionObserved = true;
      break;
    }
  }
  await page.waitForTimeout(action === 'semantic-probe' ? 350 : action === 'driver-probe' ? 180 : id === 'opening' || id === 'mobile' ? 250 : 700);
  const semanticAfterParameter = action === 'semantic-probe' ? await readSemanticState(page) : null;
  const sceneAfterParameter = action === 'semantic-probe' ? await readCanvasSignature(page) : null;
  const highLevelSceneBefore = sceneAfterParameter;
  let highLevelActionObserved = false;
  if (action === 'semantic-probe') {
    const highLevelTargets = page.locator('button[data-cue],button[data-preset],button[data-mode],button[data-view],button[data-route],button[data-state],[role="tab"]');
    for (let index = 0; index < await highLevelTargets.count(); index += 1) {
      const target = highLevelTargets.nth(index);
      if (!await target.isVisible()) continue;
      const active = await target.evaluate((element) => element.classList.contains('is-active')
        || element.getAttribute('aria-selected') === 'true'
        || element.getAttribute('aria-pressed') === 'true');
      if (active) continue;
      await target.focus();
      await target.click();
      highLevelActionObserved = true;
      break;
    }
    if (!parameterActionObserved && !highLevelActionObserved) {
      const viewport = page.viewportSize();
      await page.mouse.move(Math.round((viewport?.width || 1440) * .72), Math.round((viewport?.height || 900) * .42));
    }
  }
  if (highLevelActionObserved) await page.waitForTimeout(450);
  const semanticAfter = action === 'semantic-probe' ? await readSemanticState(page) : null;
  const highLevelSceneAfter = action === 'semantic-probe' ? await readCanvasSignature(page) : null;
  const semanticState = semanticBefore && semanticAfterParameter && semanticAfter
    ? combineSemanticEvidence({
        before: semanticBefore,
        afterParameter: semanticAfterParameter,
        highLevelBefore: semanticAfterParameter,
        after: semanticAfter,
        parameterActionObserved,
        highLevelActionObserved,
        sceneBefore,
        sceneAfterParameter,
        highLevelSceneBefore,
        highLevelSceneAfter
    })
    : undefined;
  const subjectCapture = captureSubjectState && checkpoint.surface === 'desktop'
    ? await readSubjectSignature(page)
    : { signature: null, selector: '' };
  const subjectComparison = checkpoint.expectSubjectChange
    ? compareSubjectSignatures(previousSubjectSignature, subjectCapture.signature)
    : { changed: null, delta: 0 };
  // Locator screenshots scroll the visual anchor into view. Restore the
  // contract checkpoint before measuring and capturing the actual review
  // frame, otherwise opening/final evidence silently shows the anchor crop
  // instead of the intended journey position.
  await page.evaluate((value) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({ top: maximum * value, behavior: 'instant' });
  }, progress);
  await page.waitForTimeout(80);
  const frame = await page.evaluate(({ frameId, frameQuality, frameReducedMotion, frameAction }) => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const candidates = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,p,a,button,li')].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05
        && rect.width > 4 && rect.height > 4 && rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
    });
    let collisionCount = 0;
    let maxOverlapRatio = 0;
    let blockingCollisionCount = 0;
    let editorialOverlapCount = 0;
    let maxBlockingOverlapRatio = 0;
    const roleOf = (element: HTMLElement): 'heading' | 'body' | 'interactive' => {
      const tag = element.tagName.toLowerCase();
      if (tag === 'a' || tag === 'button') return 'interactive';
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') return 'heading';
      return 'body';
    };
    const paintedRect = (element: HTMLElement): DOMRect => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const contentRect = range.getBoundingClientRect();
      range.detach();
      return contentRect.width > 0 && contentRect.height > 0
        ? contentRect
        : element.getBoundingClientRect();
    };

    for (let first = 0; first < candidates.length; first += 1) {
      for (let second = first + 1; second < candidates.length; second += 1) {
        const a = candidates[first];
        const b = candidates[second];
        if (a.contains(b) || b.contains(a) || a.parentElement === b.parentElement) continue;
        const ar = paintedRect(a);
        const br = paintedRect(b);
        const width = Math.max(0, Math.min(ar.right, br.right) - Math.max(ar.left, br.left));
        const height = Math.max(0, Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top));
        const overlap = width * height;
        if (overlap <= 0) continue;
        const ratio = overlap / Math.max(1, Math.min(ar.width * ar.height, br.width * br.height));
        if (ratio >= 0.12) {
          collisionCount += 1;
          const roles = [roleOf(a), roleOf(b)];
          if (roles.includes('interactive') || !roles.includes('heading')) {
            blockingCollisionCount += 1;
            maxBlockingOverlapRatio = Math.max(maxBlockingOverlapRatio, ratio);
          } else {
            editorialOverlapCount += 1;
          }
        }
        maxOverlapRatio = Math.max(maxOverlapRatio, ratio);
      }
    }
    const maximum = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const exposed = Number(document.body.dataset.generatedProgress);
    const derivedProgress = Number.isFinite(exposed) ? exposed : scrollY / maximum;
    const headingMetrics = candidates
      .filter((element) => ['h1', 'h2', 'h3'].includes(element.tagName.toLowerCase()))
      .map((element) => {
        const rect = paintedRect(element);
        const width = Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
        const height = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
        const area = width * height;
        return {
          text: element.textContent?.trim() || '',
          area,
          fontSizePx: Number.parseFloat(getComputedStyle(element).fontSize) || 0,
          heightRatio: Math.min(1, height / Math.max(1, viewportHeight)),
          areaRatio: Math.min(1, area / Math.max(1, viewportWidth * viewportHeight))
        };
      })
      .sort((left, right) => right.area - left.area)[0] || {
        text: '', area: 0, fontSizePx: 0, heightRatio: 0, areaRatio: 0
      };
    const runtimeState = document.body.dataset.generatedReady;
    const webglAvailable = (() => {
      const probe = document.createElement('canvas');
      return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
    })();
    const interactionTargets = [...document.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[role="button"],[tabindex]')].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05
        && rect.width > 4 && rect.height > 4 && rect.right > 0 && rect.bottom > 0 && rect.left < viewportWidth && rect.top < viewportHeight;
    });
    const mobileTaskPath = (() => {
      const isRendered = (element: HTMLElement): boolean => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05
          && rect.width > 4 && rect.height > 4;
      };
      const isHorizontallyReachable = (element: HTMLElement): boolean => {
        if (!isRendered(element)) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width > viewportWidth + 1 || rect.left < -1 || rect.right > viewportWidth + 1) return false;
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if (style.overflowX === 'hidden' || style.overflowX === 'clip') {
            const bounds = ancestor.getBoundingClientRect();
            if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) return false;
          }
          ancestor = ancestor.parentElement;
        }
        return true;
      };
      const inspect = (selector: string) => {
        const nodes = [...document.querySelectorAll<HTMLElement>(selector)].filter(isRendered);
        return { count: nodes.length, reachable: nodes.filter(isHorizontallyReachable).length };
      };
      const controls = inspect('[data-signal-primary-control]');
      const results = inspect('[data-signal-primary-result]');
      const actions = inspect('[data-signal-primary-action]');
      return {
        controlCount: controls.count,
        resultCount: results.count,
        actionCount: actions.count,
        reachableControlCount: controls.reachable,
        reachableResultCount: results.reachable,
        reachableActionCount: actions.reachable
      };
    })();
    const generatedCanvas = document.querySelector<HTMLCanvasElement>('.generated-canvas');
    const canvasOcclusion = (() => {
      if (!generatedCanvas?.parentElement || frameAction === 'webgl-fallback') return { risk: false, ratio: 0, layer: '' };
      const canvasStyle = getComputedStyle(generatedCanvas);
      const canvasZ = Number.parseInt(canvasStyle.zIndex, 10);
      const normalizedCanvasZ = Number.isFinite(canvasZ) ? canvasZ : 0;
      const viewportArea = Math.max(1, viewportWidth * viewportHeight);
      const alphaOf = (color: string): number => {
        const match = color.match(/rgba?\((?:\s*\d+(?:\.\d+)?\s*,){3}\s*(\d*(?:\.\d+)?)\s*\)/i);
        if (match) return Number(match[1]);
        if (color === 'transparent') return 0;
        return color.startsWith('rgb(') ? 1 : 0;
      };
      const labelOf = (element: HTMLElement): string => {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList].slice(0, 3).map((name) => `.${name}`).join('');
        return `${element.tagName.toLowerCase()}${id}${classes}`.slice(0, 160);
      };
      let strongest = { risk: false, ratio: 0, layer: '' };
      for (const sibling of [...generatedCanvas.parentElement.children]) {
        if (!(sibling instanceof HTMLElement) || sibling === generatedCanvas || sibling.classList.contains('generated-loading')) continue;
        const siblingStyle = getComputedStyle(sibling);
        const siblingZ = Number.parseInt(siblingStyle.zIndex, 10);
        const normalizedSiblingZ = Number.isFinite(siblingZ) ? siblingZ : 0;
        if (normalizedSiblingZ < normalizedCanvasZ || siblingStyle.display === 'none' || siblingStyle.visibility === 'hidden' || Number(siblingStyle.opacity) <= .05) continue;
        const paintedLayers = [sibling, ...sibling.querySelectorAll<HTMLElement>('*')];
        for (const layer of paintedLayers) {
          const style = getComputedStyle(layer);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) <= .05) continue;
          const rect = layer.getBoundingClientRect();
          const width = Math.max(0, Math.min(viewportWidth, rect.right) - Math.max(0, rect.left));
          const height = Math.max(0, Math.min(viewportHeight, rect.bottom) - Math.max(0, rect.top));
          const ratio = width * height / viewportArea;
          const opaqueBackground = alphaOf(style.backgroundColor) >= .92 || style.backgroundImage !== 'none';
          if (ratio >= .94 && opaqueBackground && ratio > strongest.ratio) {
            strongest = { risk: true, ratio: Math.min(1, ratio), layer: labelOf(layer) };
          }
        }
      }
      return strongest;
    })();
    return {
      id: frameId,
      viewport: { width: viewportWidth, height: viewportHeight },
      quality: frameQuality,
      reducedMotion: frameReducedMotion,
      ready: runtimeState === 'true' || (frameAction === 'webgl-fallback' && runtimeState === 'error' && candidates.length >= 2),
      canvasCount: document.querySelectorAll('canvas').length,
      progress: Math.max(0, Math.min(1, derivedProgress)),
      scrollY: Math.max(0, Math.round(scrollY)),
      scrollHeight: Math.max(1, document.documentElement.scrollHeight),
      overflow: document.documentElement.scrollWidth - viewportWidth,
      heading: headingMetrics.text,
      headingVisible: headingMetrics.area > 0,
      headingFontSizePx: headingMetrics.fontSizePx,
      headingViewportHeightRatio: headingMetrics.heightRatio,
      headingViewportAreaRatio: headingMetrics.areaRatio,
      visibleTextCount: candidates.length,
      collisionCount,
      maxOverlapRatio: Math.max(0, Math.min(1, maxOverlapRatio)),
      blockingCollisionCount,
      editorialOverlapCount,
      maxBlockingOverlapRatio: Math.max(0, Math.min(1, maxBlockingOverlapRatio)),
      canvasOcclusionRisk: canvasOcclusion.risk,
      canvasOcclusionRatio: canvasOcclusion.ratio,
      canvasOccludingLayer: canvasOcclusion.layer,
      action: frameAction,
      interactionTargetCount: interactionTargets.length,
      interactionInputObserved: frameAction !== 'semantic-probe' || Number(document.body.dataset.generatedPointerStrength || 0) > .5 || document.activeElement !== document.body,
      mobileTaskPath,
      webglAvailable,
      fallbackActive: frameAction === 'webgl-fallback' && webglAvailable === false
    };
  }, { frameId: id, frameQuality: quality, frameReducedMotion: reducedMotion, frameAction: action });
  await page.screenshot({ path: join(directory, `${id}.png`), fullPage: false });
  return {
    frame: {
      ...frame,
      subjectCaptureAvailable: subjectCapture.signature !== null,
      subjectChangeExpected: checkpoint.expectSubjectChange,
      subjectChanged: checkpoint.expectSubjectChange ? subjectComparison.changed : null,
      subjectDelta: checkpoint.expectSubjectChange ? subjectComparison.delta : 0,
      subjectSelector: subjectCapture.selector,
      ...(semanticState ? { semanticState } : {}),
      ...(causalState ? { causalState } : {}),
      ...(driverState ? { driverState } : {})
    },
    subjectSignature: subjectCapture.signature
  };
}

interface SemanticStateSnapshot {
  controls: Array<{ key: string; value: string }>;
  displays: Array<{ key: string; value: string }>;
  aggregateText: string;
  feedbackText: string;
}

interface CanvasSignature {
  samples: number[];
}

interface DriverDomSnapshot {
  rootFound: boolean;
  demoControlFound: boolean;
  progressMarkerFound: boolean;
  progress: number | null;
  mode: string;
}

interface PrimaryJourneyDomSnapshot {
  markers: CausalJourneyState['markers'];
  anchorIdentityStable: boolean;
  anchorPresentation: {
    width: number;
    height: number;
    opacity: string;
    filter: string;
    scaleX: number;
    scaleY: number;
    clipPath: string;
    objectFit: string;
    objectPosition: string;
    backgroundPosition: string;
    backgroundSize: string;
    hasCanvas: boolean;
  } | null;
  resultState: string;
  actionAvailable: boolean;
  progress: number;
  scrollY: number;
}

const PRIMARY_CAUSAL_ANCHOR_TOKEN = 'r91-primary-journey';

export async function probePrimaryJourney(page: Page, input: 'wheel' | 'control'): Promise<CausalJourneyState> {
  const initialScrollY = await page.evaluate(() => scrollY);
  await markPrimaryJourneyAnchor(page);
  const before = await readPrimaryJourneyDomSnapshot(page);
  const requiredMarkersPresent = before.markers.anchorCount === 1
    && before.markers.resultCount >= 1
    && before.markers.actionCount >= 1
    && (input === 'wheel' || before.markers.controlCount >= 1);
  if (!requiredMarkersPresent) {
    await clearPrimaryJourneyProbeMarkers(page);
    return {
      input,
      markers: before.markers,
      inputObserved: false,
      anchorIdentityStable: before.anchorIdentityStable,
      anchorChanged: null,
      anchorDelta: 0,
      resultChanged: false,
      actionAvailable: before.actionAvailable,
      substitute: 'none',
      initialProgress: before.progress,
      finalProgress: before.progress
    };
  }

  const beforeAnchor = await readPrimaryJourneyElementSignature(page, `[data-signal-causal-anchor="${PRIMARY_CAUSAL_ANCHOR_TOKEN}"]`, true);
  const beforeResult = await readPrimaryJourneyElementSignature(page, '[data-signal-primary-result]', false);
  const inputObserved = input === 'wheel'
    ? await performPrimaryWheelInput(page)
    : await performPrimaryControlInput(page);
  await page.waitForTimeout(320);
  const after = await readPrimaryJourneyDomSnapshot(page);
  const afterAnchor = await readPrimaryJourneyElementSignature(page, `[data-signal-causal-anchor="${PRIMARY_CAUSAL_ANCHOR_TOKEN}"]`, true);
  const afterResult = await readPrimaryJourneyElementSignature(page, '[data-signal-primary-result]', false);
  const anchorComparison = compareSubjectSignatures(beforeAnchor, afterAnchor);
  const resultComparison = compareCanvasSignatures(beforeResult, afterResult);
  const resultChanged = before.resultState !== after.resultState || resultComparison.changed === true;
  const substitute = classifyPrimaryJourneySubstitute(before, after, anchorComparison, resultChanged);

  if (input === 'wheel') {
    await page.evaluate(({ y, progress }) => {
      window.scrollTo({ top: y, behavior: 'instant' });
      window.postMessage({ type: 'signal-lab:preview-progress', progress }, '*');
    }, { y: initialScrollY, progress: before.progress });
    await page.waitForTimeout(80);
  }
  await clearPrimaryJourneyProbeMarkers(page);
  return {
    input,
    markers: before.markers,
    inputObserved,
    anchorIdentityStable: after.anchorIdentityStable,
    anchorChanged: anchorComparison.changed,
    anchorDelta: anchorComparison.delta,
    resultChanged,
    actionAvailable: after.actionAvailable,
    substitute,
    initialProgress: before.progress,
    finalProgress: after.progress
  };
}

async function markPrimaryJourneyAnchor(page: Page): Promise<void> {
  await page.evaluate((token) => {
    document.querySelectorAll('[data-signal-causal-anchor]').forEach((element) => element.removeAttribute('data-signal-causal-anchor'));
    const rendered = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05
        && rect.width > 4 && rect.height > 4;
    };
    const anchor = [...document.querySelectorAll<HTMLElement>('[data-signal-visual-anchor]')].find(rendered);
    if (anchor) anchor.setAttribute('data-signal-causal-anchor', token);
  }, PRIMARY_CAUSAL_ANCHOR_TOKEN);
}

async function clearPrimaryJourneyProbeMarkers(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('[data-signal-causal-anchor]').forEach((element) => element.removeAttribute('data-signal-causal-anchor'));
    delete document.body.dataset.signalCausalWheelObserved;
    document.getElementById('signal-primary-journey-capture-style')?.remove();
  }).catch(() => undefined);
}

async function readPrimaryJourneyDomSnapshot(page: Page): Promise<PrimaryJourneyDomSnapshot> {
  return page.evaluate((token) => {
    const rendered = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05
        && rect.width > 4 && rect.height > 4;
    };
    const select = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].filter(rendered);
    const anchors = select('[data-signal-visual-anchor]');
    const controls = select('[data-signal-primary-control]');
    const results = select('[data-signal-primary-result]');
    const actions = select('[data-signal-primary-action]');
    const anchor = document.querySelector<HTMLElement>(`[data-signal-causal-anchor="${token}"]`);
    const action = actions[0];
    const result = results[0];
    const maximum = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const exposed = Number(document.body.dataset.generatedProgress);
    const progress = Number.isFinite(exposed) ? exposed : scrollY / maximum;
    const actionAvailable = Boolean(action && !('disabled' in action && Boolean((action as HTMLButtonElement).disabled))
      && action.getAttribute('aria-disabled') !== 'true'
      && getComputedStyle(action).pointerEvents !== 'none'
      && action.getBoundingClientRect().left >= -1
      && action.getBoundingClientRect().right <= innerWidth + 1);
    let anchorPresentation: PrimaryJourneyDomSnapshot['anchorPresentation'] = null;
    if (anchor) {
      const style = getComputedStyle(anchor);
      const rect = anchor.getBoundingClientRect();
      let scaleX = 1;
      let scaleY = 1;
      try {
        const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);
        scaleX = Math.hypot(matrix.m11, matrix.m12);
        scaleY = Math.hypot(matrix.m21, matrix.m22);
      } catch { /* keep neutral scale */ }
      anchorPresentation = {
        width: rect.width,
        height: rect.height,
        opacity: style.opacity,
        filter: style.filter,
        scaleX,
        scaleY,
        clipPath: style.clipPath,
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        backgroundPosition: style.backgroundPosition,
        backgroundSize: style.backgroundSize,
        hasCanvas: Boolean(anchor.querySelector('canvas'))
      };
    }
    const resultState = result ? JSON.stringify({
      text: result.textContent?.replace(/\s+/g, ' ').trim() || '',
      value: 'value' in result ? String((result as HTMLInputElement).value ?? '') : '',
      ariaValue: result.getAttribute('aria-valuenow') || '',
      ariaPressed: result.getAttribute('aria-pressed') || '',
      state: result.dataset.state || '',
      result: result.dataset.result || '',
      valueData: result.dataset.value || ''
    }) : '';
    return {
      markers: {
        anchorCount: anchors.length,
        controlCount: controls.length,
        resultCount: results.length,
        actionCount: actions.length
      },
      anchorIdentityStable: Boolean(anchor && anchor.matches('[data-signal-visual-anchor]')),
      anchorPresentation,
      resultState,
      actionAvailable,
      progress: Math.max(0, Math.min(1, progress)),
      scrollY: Math.max(0, scrollY)
    };
  }, PRIMARY_CAUSAL_ANCHOR_TOKEN);
}

async function readPrimaryJourneyElementSignature(page: Page, selector: string, hideSemanticLayers: boolean): Promise<CanvasSignature | null> {
  const target = page.locator(selector).first();
  if (!await target.count()) return null;
  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) return null;
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const width = Math.min(viewport.width - x, box.width - Math.max(0, -box.x));
  const height = Math.min(viewport.height - y, box.height - Math.max(0, -box.y));
  if (width < 4 || height < 4) return null;
  if (hideSemanticLayers) {
    await page.evaluate((token) => {
      const style = document.createElement('style');
      style.id = 'signal-primary-journey-capture-style';
      style.textContent = `[data-signal-causal-anchor="${token}"] :is(h1,h2,h3,p,a,button,label,output,[data-signal-primary-control],[data-signal-primary-result],[data-signal-primary-action]){visibility:hidden!important}`;
      document.head.appendChild(style);
    }, PRIMARY_CAUSAL_ANCHOR_TOKEN);
  }
  try {
    const screenshot = await page.screenshot({
      type: 'png',
      animations: 'disabled',
      clip: { x, y, width, height }
    });
    return await signatureFromPng(page, screenshot.toString('base64'));
  } finally {
    if (hideSemanticLayers) await page.evaluate(() => document.getElementById('signal-primary-journey-capture-style')?.remove());
  }
}

async function performPrimaryWheelInput(page: Page): Promise<boolean> {
  await page.evaluate(() => {
    document.body.dataset.signalCausalWheelObserved = 'false';
    addEventListener('wheel', () => { document.body.dataset.signalCausalWheelObserved = 'true'; }, { once: true });
  });
  await page.mouse.wheel(0, Math.max(280, Math.round((page.viewportSize()?.height || 900) * .42)));
  await page.waitForTimeout(120);
  return page.evaluate(() => document.body.dataset.signalCausalWheelObserved === 'true');
}

const PRIMARY_CONTROL_TARGET_SELECTOR = [
  '[data-signal-primary-control]:is(button,input:not([type="hidden"]),select,textarea,a[href],summary,[role="button"],[role="tab"],[role="radio"],[role="option"],[role="switch"])',
  '[data-signal-primary-control] :is(button,input:not([type="hidden"]),select,textarea,a[href],summary,[role="button"],[role="tab"],[role="radio"],[role="option"],[role="switch"])'
].join(',');

export async function performPrimaryControlInput(page: Page): Promise<boolean> {
  const controls = page.locator(PRIMARY_CONTROL_TARGET_SELECTOR);
  const eligible: Array<{ index: number; preferInactiveButton: boolean }> = [];
  for (let index = 0; index < await controls.count(); index += 1) {
    const target = controls.nth(index);
    if (!await target.isVisible() || !await target.isEnabled()) continue;
    const state = await target.evaluate((element) => {
      const tag = element.tagName.toLowerCase();
      const type = (element.getAttribute('type') || '').toLowerCase();
      const role = (element.getAttribute('role') || '').toLowerCase();
      const ariaPressed = element.getAttribute('aria-pressed');
      const ariaSelected = element.getAttribute('aria-selected');
      const ariaChecked = element.getAttribute('aria-checked');
      const ariaCurrent = element.getAttribute('aria-current');
      const nativeChoiceActive = tag === 'input'
        && (type === 'checkbox' || type === 'radio')
        && Boolean((element as HTMLInputElement).checked);
      const active = ariaPressed === 'true'
        || ariaSelected === 'true'
        || ariaChecked === 'true'
        || nativeChoiceActive
        || (ariaCurrent !== null && ariaCurrent !== '' && ariaCurrent !== 'false')
        || element.classList.contains('active')
        || element.classList.contains('is-active')
        || element.getAttribute('data-active') === 'true'
        || element.getAttribute('data-state') === 'active';
      const buttonLike = tag === 'button'
        || (tag === 'input' && ['button', 'submit', 'reset', 'checkbox', 'radio'].includes(type))
        || ['button', 'tab', 'radio', 'option', 'switch'].includes(role);
      return {
        active,
        preferInactiveButton: buttonLike
          && ((ariaPressed !== null && ariaPressed !== 'true')
            || (ariaSelected !== null && ariaSelected !== 'true'))
      };
    });
    if (!state.active) eligible.push({ index, preferInactiveButton: state.preferInactiveButton });
  }

  eligible.sort((left, right) => Number(right.preferInactiveButton) - Number(left.preferInactiveButton));
  for (const candidate of eligible) {
    const target = controls.nth(candidate.index);
    const tag = await target.evaluate((element) => element.tagName.toLowerCase());
    const type = (await target.getAttribute('type') || '').toLowerCase();
    if (tag === 'input' && type === 'range') {
      const range = await target.evaluate((element) => {
        const input = element as HTMLInputElement;
        return { min: Number(input.min || 0), max: Number(input.max || 100), value: Number(input.value) };
      });
      if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || range.max <= range.min) continue;
      const next = range.value > (range.min + range.max) / 2 ? range.min : range.max;
      await target.fill(String(next));
      return true;
    }
    if (tag === 'select') {
      const count = await target.locator('option').count();
      if (count < 2) continue;
      const selected = await target.evaluate((element) => (element as HTMLSelectElement).selectedIndex);
      await target.selectOption({ index: (selected + 1) % count });
      return true;
    }
    await target.click();
    return true;
  }
  return false;
}

function classifyPrimaryJourneySubstitute(
  before: PrimaryJourneyDomSnapshot,
  after: PrimaryJourneyDomSnapshot,
  anchor: { changed: boolean | null; delta: number },
  resultChanged: boolean
): CausalJourneyState['substitute'] {
  if (!before.anchorPresentation || !after.anchorPresentation) return 'continuity-unverified';
  const first = before.anchorPresentation;
  const second = after.anchorPresentation;
  // Canvas content cannot be truthfully classified from CSS alone; its camera
  // continuity remains part of independent visual judgment.
  if (!first.hasCanvas && !second.hasCanvas && (first.opacity !== second.opacity || first.filter !== second.filter)) {
    return 'opacity-or-blur-only';
  }
  const sizeRatio = Math.max(
    first.width > 0 ? second.width / first.width : 1,
    first.height > 0 ? second.height / first.height : 1,
    second.width > 0 ? first.width / second.width : 1,
    second.height > 0 ? first.height / second.height : 1,
    first.scaleX > 0 ? second.scaleX / first.scaleX : 1,
    first.scaleY > 0 ? second.scaleY / first.scaleY : 1,
    second.scaleX > 0 ? first.scaleX / second.scaleX : 1,
    second.scaleY > 0 ? first.scaleY / second.scaleY : 1
  );
  if (sizeRatio >= 1.16) return 'whole-scale-only';
  if (first.clipPath !== second.clipPath
    || first.objectFit !== second.objectFit
    || first.objectPosition !== second.objectPosition
    || first.backgroundPosition !== second.backgroundPosition
    || first.backgroundSize !== second.backgroundSize) return 'framing-only';
  if (anchor.changed !== true) return resultChanged ? 'copy-or-highlight-only' : 'none';
  return 'none';
}

async function readDriverDomSnapshot(page: Page): Promise<DriverDomSnapshot> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-signal-shared-driver]');
    const demoControl = document.querySelector<HTMLElement>('[data-signal-demo-control]');
    const progress = document.querySelector<HTMLElement>('[data-signal-driver-progress]');
    let normalized: number | null = null;
    if (progress) {
      const raw = progress.getAttribute('aria-valuenow')
        ?? progress.dataset.progress
        ?? (progress instanceof HTMLInputElement ? progress.value : progress.textContent);
      const value = Number(String(raw ?? '').match(/-?\d+(?:\.\d+)?/)?.[0]);
      const minimum = Number(progress.getAttribute('aria-valuemin') ?? 0);
      const declaredMaximum = Number(progress.getAttribute('aria-valuemax'));
      const maximum = Number.isFinite(declaredMaximum) && declaredMaximum > minimum
        ? declaredMaximum
        : value > 1 ? 100 : 1;
      if (Number.isFinite(value)) normalized = Math.max(0, Math.min(1, (value - minimum) / Math.max(.0001, maximum - minimum)));
    }
    return {
      rootFound: Boolean(root),
      demoControlFound: Boolean(demoControl),
      progressMarkerFound: Boolean(progress),
      progress: normalized,
      mode: root?.dataset.driveMode || ''
    };
  });
}

async function probeSharedStateDriver(page: Page) {
  const initial = await readDriverDomSnapshot(page);
  const initialScene = await readCanvasSignature(page);
  const demoControl = page.locator('[data-signal-demo-control]').first();
  if (initial.demoControlFound && await demoControl.isVisible()) await demoControl.click();
  await page.waitForTimeout(850);
  const afterDemo = await readDriverDomSnapshot(page);
  const afterDemoScene = await readCanvasSignature(page);

  await page.mouse.wheel(0, Math.max(360, Math.round((page.viewportSize()?.height || 900) * .55)));
  await page.waitForTimeout(420);
  const afterWheel = await readDriverDomSnapshot(page);
  const afterWheelScene = await readCanvasSignature(page);

  const manualControls = page.locator('[data-signal-primary-control]');
  let manualControlFound = false;
  for (let index = 0; index < await manualControls.count(); index += 1) {
    const target = manualControls.nth(index);
    if (!await target.isVisible()) continue;
    const tag = await target.evaluate((element) => element.tagName.toLowerCase());
    const type = await target.getAttribute('type');
    if (tag === 'input' && type === 'range') {
      const range = await target.evaluate((element) => {
        const input = element as HTMLInputElement;
        return { min: Number(input.min || 0), max: Number(input.max || 100), value: Number(input.value) };
      });
      const targetValue = range.value > (range.min + range.max) / 2 ? range.min : range.max;
      await target.fill(String(targetValue));
      manualControlFound = true;
      break;
    }
  }
  await page.waitForTimeout(220);
  const afterManual = await readDriverDomSnapshot(page);
  const afterManualScene = await readCanvasSignature(page);
  await page.waitForTimeout(480);
  const stableManual = await readDriverDomSnapshot(page);

  const progressChanged = (before: number | null, after: number | null) => before !== null && after !== null && Math.abs(after - before) >= .01;
  const progressStable = afterManual.progress !== null && stableManual.progress !== null
    && Math.abs(stableManual.progress - afterManual.progress) < .01;
  const demoScene = compareCanvasSignatures(initialScene, afterDemoScene);
  const wheelScene = compareCanvasSignatures(afterDemoScene, afterWheelScene);
  const manualScene = compareCanvasSignatures(afterWheelScene, afterManualScene);
  return {
    rootFound: initial.rootFound,
    demoControlFound: initial.demoControlFound,
    progressMarkerFound: initial.progressMarkerFound,
    manualControlFound,
    demoProgressChanged: progressChanged(initial.progress, afterDemo.progress),
    wheelProgressChanged: progressChanged(afterDemo.progress, afterWheel.progress),
    manualOverrideObserved: manualControlFound && afterManual.mode === 'manual' && stableManual.mode === 'manual' && progressStable,
    demoSceneChanged: demoScene.changed,
    wheelSceneChanged: wheelScene.changed,
    manualSceneChanged: manualScene.changed,
    demoSceneDelta: demoScene.delta,
    wheelSceneDelta: wheelScene.delta,
    manualSceneDelta: manualScene.delta,
    initialProgress: initial.progress,
    afterDemoProgress: afterDemo.progress,
    afterWheelProgress: afterWheel.progress,
    afterManualProgress: afterManual.progress,
    modes: [afterDemo.mode, afterWheel.mode, afterManual.mode]
  };
}

async function readSubjectSignature(page: Page): Promise<{ signature: CanvasSignature | null; selector: string }> {
  const selector = await page.evaluate(() => {
    document.querySelectorAll('[data-signal-review-anchor]').forEach((element) => element.removeAttribute('data-signal-review-anchor'));
    // Stateful contracts require an explicit subject boundary. Falling back to a
    // large image/canvas can mistake crop, camera or copy changes for a physical
    // state change and would make the gate claim evidence it does not possess.
    const selectors = ['[data-signal-visual-anchor]'];
    const seen = new Set<Element>();
    const candidates = selectors.flatMap((query) => [...document.querySelectorAll<HTMLElement>(query)].map((element) => ({ element, query })))
      .filter(({ element }) => {
        if (seen.has(element)) return false;
        seen.add(element);
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .05
          && rect.width * rect.height >= innerWidth * innerHeight * .12;
      })
      .map(({ element, query }) => ({ element, query, area: element.getBoundingClientRect().width * element.getBoundingClientRect().height }))
      .sort((left, right) => right.area - left.area);
    const selected = candidates[0];
    if (!selected) return '';
    selected.element.dataset.signalReviewAnchor = 'true';
    return selected.query.slice(0, 160);
  });
  if (!selector) return { signature: null, selector: '' };
  try {
    const target = page.locator('[data-signal-review-anchor="true"]').first();
    if (!await target.count() || !await target.isVisible()) return { signature: null, selector };
    const screenshot = await target.screenshot({ type: 'png', animations: 'disabled' });
    return { signature: await signatureFromPng(page, screenshot.toString('base64')), selector };
  } finally {
    await page.evaluate(() => document.querySelector('[data-signal-review-anchor]')?.removeAttribute('data-signal-review-anchor'));
  }
}

async function signatureFromPng(page: Page, base64: string): Promise<CanvasSignature | null> {
  return page.evaluate(async (encoded) => {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 32;
    sampleCanvas.height = 18;
    const context = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) { bitmap.close(); return null; }
    context.drawImage(bitmap, 0, 0, sampleCanvas.width, sampleCanvas.height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
    const samples: number[] = [];
    for (let offset = 0; offset < pixels.length; offset += 4) samples.push(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
    return { samples };
  }, base64);
}

async function readSemanticState(page: Page): Promise<SemanticStateSnapshot> {
  return page.evaluate((feedbackSelector) => {
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input:not([type="hidden"]):not([type="color"]),select,button[data-cue],button[data-preset],button[data-mode],button[data-view],button[data-route],button[data-state],[role="tab"]')]
      .filter(visible)
      .map((element, index) => {
        if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
          const label = element.getAttribute('aria-label')
            || element.closest('label')?.textContent?.replace(/\s+/g, ' ').trim()
            || '';
          return {
            key: element.dataset.key || element.dataset.param || element.name || element.id || label || `control-${index}`,
            value: element.value
          };
        }
        const semanticKey = element.dataset.cue || element.dataset.preset || element.dataset.mode || element.dataset.view
          || element.dataset.route || element.dataset.state || element.getAttribute('aria-label') || element.textContent?.trim() || element.id;
        const semanticValue = element.getAttribute('aria-selected') || element.getAttribute('aria-pressed')
          || (element.classList.contains('is-active') ? 'active' : 'inactive');
        return { key: semanticKey, value: semanticValue };
      });
    const displays = [...document.querySelectorAll<HTMLOutputElement>('[data-value]')]
      .filter(visible)
      .map((element) => ({ key: element.dataset.value || element.id, value: element.value || element.textContent?.trim() || '' }));
    const aggregate = document.querySelector<HTMLElement>('[data-total]');
    const feedback = [...document.querySelectorAll<HTMLElement>(feedbackSelector)]
      .filter(visible)
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean)
      .join(' | ');
    return {
      controls,
      displays,
      aggregateText: aggregate ? ('value' in aggregate && typeof (aggregate as HTMLOutputElement).value === 'string' ? (aggregate as HTMLOutputElement).value : aggregate.textContent?.trim() || '') : '',
      feedbackText: feedback
    };
  }, SEMANTIC_FEEDBACK_SELECTOR);
}

async function readCanvasSignature(page: Page): Promise<CanvasSignature | null> {
  const canvas = page.locator('canvas').first();
  if (!await canvas.count() || !await canvas.isVisible()) return null;
  await page.evaluate(() => {
    const target = document.querySelector<HTMLCanvasElement>('canvas');
    if (!target?.parentElement) return;
    target.parentElement.dataset.signalCanvasCapture = 'true';
    const style = document.createElement('style');
    style.id = 'signal-canvas-capture-style';
    style.textContent = '[data-signal-canvas-capture="true"] > :not(canvas){visibility:hidden!important}';
    document.head.appendChild(style);
  });
  try {
    const screenshot = await canvas.screenshot({ type: 'png', animations: 'disabled' });
    return await signatureFromPng(page, screenshot.toString('base64'));
  } finally {
    await page.evaluate(() => {
      document.getElementById('signal-canvas-capture-style')?.remove();
      document.querySelector<HTMLElement>('[data-signal-canvas-capture]')?.removeAttribute('data-signal-canvas-capture');
    });
  }
}

function compareCanvasSignatures(before: CanvasSignature | null, after: CanvasSignature | null): { changed: boolean | null; delta: number } {
  if (!before || !after || before.samples.length !== after.samples.length || before.samples.length === 0) return { changed: null, delta: 0 };
  const difference = before.samples.reduce((total, value, index) => total + Math.abs(value - after.samples[index]), 0);
  const delta = Math.max(0, Math.min(1, difference / (before.samples.length * 255)));
  return { changed: delta >= .008, delta };
}

function compareSubjectSignatures(before: CanvasSignature | null, after: CanvasSignature | null): { changed: boolean | null; delta: number } {
  const comparison = compareCanvasSignatures(before, after);
  return { ...comparison, changed: comparison.changed == null ? null : comparison.delta >= .018 };
}

function combineSemanticEvidence(input: {
  before: SemanticStateSnapshot;
  afterParameter: SemanticStateSnapshot;
  highLevelBefore: SemanticStateSnapshot;
  after: SemanticStateSnapshot;
  parameterActionObserved: boolean;
  highLevelActionObserved: boolean;
  sceneBefore: CanvasSignature | null;
  sceneAfterParameter: CanvasSignature | null;
  highLevelSceneBefore: CanvasSignature | null;
  highLevelSceneAfter: CanvasSignature | null;
}) {
  const parameter = compareSemanticState(input.before, input.afterParameter);
  const highLevel = compareSemanticState(input.highLevelBefore, input.after);
  const scene = compareCanvasSignatures(input.sceneBefore, input.sceneAfterParameter);
  const highLevelScene = compareCanvasSignatures(input.highLevelSceneBefore, input.highLevelSceneAfter);
  return {
    inputChanged: input.parameterActionObserved ? parameter.inputChanged : highLevel.inputChanged,
    outputChanged: parameter.outputChanged || highLevel.outputChanged,
    parameterActionObserved: input.parameterActionObserved,
    highLevelActionObserved: input.highLevelActionObserved,
    sceneChanged: scene.changed,
    highLevelSceneChanged: highLevelScene.changed,
    sceneDelta: scene.delta,
    highLevelSceneDelta: highLevelScene.delta,
    mismatchedValueCount: Math.max(parameter.mismatchedValueCount, highLevel.mismatchedValueCount),
    aggregateInvariantValid: parameter.aggregateInvariantValid ?? highLevel.aggregateInvariantValid,
    issues: [...parameter.issues, ...highLevel.issues].slice(0, 12)
  };
}

function compareSemanticState(before: SemanticStateSnapshot, after: SemanticStateSnapshot) {
  const normalizeNumber = (value: string) => {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const beforeControls = new Map(before.controls.map((item) => [item.key, item.value]));
  const afterDisplays = new Map(after.displays.map((item) => [item.key, item.value]));
  const changedKeys = after.controls.filter((item) => beforeControls.get(item.key) !== item.value).map((item) => item.key);
  const issues: string[] = [];
  let mismatchedValueCount = 0;
  for (const control of after.controls) {
    const display = afterDisplays.get(control.key);
    if (display === undefined) continue;
    const controlNumber = normalizeNumber(control.value);
    const displayNumber = normalizeNumber(display);
    if (controlNumber !== null && displayNumber !== null && Math.abs(controlNumber - displayNumber) > .01) {
      mismatchedValueCount += 1;
      issues.push(`${control.key || '控件'} 的输入值 ${controlNumber} 与显示值 ${displayNumber} 不一致`);
    }
  }
  let aggregateInvariantValid: boolean | null = null;
  if (/(?:总配比|总比例|配比合计|比例合计|total\s*(?:ratio|percentage))/i.test(after.aggregateText) && after.aggregateText.includes('%')) {
    const aggregate = normalizeNumber(after.aggregateText);
    aggregateInvariantValid = aggregate !== null && Math.abs(aggregate - 100) <= .01;
    if (!aggregateInvariantValid) issues.push(`声明为百分比的合计值是 ${aggregate ?? '未知'}%，应保持 100%`);
  }
  const beforeOutput = JSON.stringify({ displays: before.displays, aggregateText: before.aggregateText, feedbackText: before.feedbackText });
  const afterOutput = JSON.stringify({ displays: after.displays, aggregateText: after.aggregateText, feedbackText: after.feedbackText });
  return {
    inputChanged: changedKeys.length > 0,
    outputChanged: beforeOutput !== afterOutput,
    mismatchedValueCount,
    aggregateInvariantValid,
    issues: issues.slice(0, 12)
  };
}

function attachErrorCollection(page: Page, errors: string[], label: string): void {
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`.slice(0, 600)));
  page.on('console', (message) => {
    const expectedFallback = label === 'fallback';
    if (message.type() === 'error' && !message.text().includes('WebSocket') && !expectedFallback) errors.push(`${label} console: ${message.text()}`.slice(0, 600));
  });
}

function normalizeLocalOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('视觉评审只允许访问本机预览源。');
  return url.origin;
}

async function resolveBrowserExecutable(environment: Environment): Promise<string | undefined> {
  // Prefer the Playwright-managed Chromium that is already verified with this project.
  // A system browser remains available as an explicit override, but is not a stable
  // default for headless WebGL review across machines.
  const candidate = environment.BROWSER_EXECUTABLE_PATH;
  if (!candidate) return undefined;
  try { await access(candidate); return candidate; } catch { return undefined; }
}

async function waitForGeneratedRuntime(page: Page, surface: string, environment: Environment): Promise<void> {
  await page.waitForFunction(
    () => ['true', 'error'].includes(document.body.dataset.generatedReady || ''),
    null,
    { timeout: clampTimeoutToGenerationDeadline(environment, 30_000) }
  );
  const state = await page.evaluate(() => document.body.dataset.generatedReady || 'missing');
  if (state !== 'true') throw new Error(`${surface} 生成页面运行时初始化失败（generatedReady=${state}）。`);
}
