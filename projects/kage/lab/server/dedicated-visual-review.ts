import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { assessVisualEvidence, visualReviewEvidenceSchema, type VisualReviewAssessment, type VisualReviewEvidence } from '../src/generation/visual-review.ts';

type Environment = Readonly<Record<string, string | undefined>>;

export interface CapturedVisualReview {
  directory: string;
  imagePaths: string[];
  evidence: VisualReviewEvidence;
  assessment: VisualReviewAssessment;
}

export async function captureDedicatedVisualReview(runId: string, origin: string, environment: Environment = process.env): Promise<CapturedVisualReview> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(runId)) throw new Error('视觉评审运行 ID 非法。');
  const safeOrigin = normalizeLocalOrigin(origin);
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-visual-review-'));
  await mkdir(directory, { recursive: true });
  const executablePath = await resolveBrowserExecutable(environment);
  const browserErrors: string[] = [];
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-webgl', '--ignore-gpu-blocklist']
  });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    attachErrorCollection(desktop, browserErrors, 'desktop');
    const desktopUrl = `${safeOrigin}/generated-runs/${runId}/?quality=high&motion=full&visual-review=1`;
    await desktop.goto(desktopUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await desktop.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
    await desktop.waitForTimeout(700);

    const opening = await captureFrame(desktop, directory, 'opening', 'high', false, 0);
    const middle = await captureFrame(desktop, directory, 'middle', 'high', false, 0.44);
    const final = await captureFrame(desktop, directory, 'final', 'high', false, 1);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    attachErrorCollection(mobile, browserErrors, 'mobile');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await mobile.goto(`${safeOrigin}/generated-runs/${runId}/?quality=low&motion=reduce&visual-review=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await mobile.waitForFunction(() => document.body.dataset.generatedReady === 'true', null, { timeout: 30_000 });
    await mobile.waitForTimeout(500);
    const mobileFrame = await captureFrame(mobile, directory, 'mobile', 'low', true, 0);

    const evidence = visualReviewEvidenceSchema.parse({
      schemaVersion: 1,
      runId,
      capturedAt: new Date().toISOString(),
      frames: [opening, middle, final, mobileFrame],
      browserErrors: browserErrors.slice(0, 30)
    });
    return {
      directory,
      imagePaths: ['opening', 'middle', 'final', 'mobile'].map((name) => join(directory, `${name}.png`)),
      evidence,
      assessment: assessVisualEvidence(evidence)
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  } finally {
    await browser.close();
  }
}

export async function cleanupCapturedVisualReview(review: CapturedVisualReview): Promise<void> {
  await rm(review.directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 120 }).catch(() => undefined);
}

async function captureFrame(page: Page, directory: string, id: 'opening' | 'middle' | 'final' | 'mobile', quality: 'high' | 'low', reducedMotion: boolean, progress: number) {
  await page.evaluate((value) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    window.scrollTo({ top: maximum * value, behavior: 'instant' });
    window.postMessage({ type: 'signal-lab:preview-progress', progress: value }, '*');
  }, progress);
  await page.waitForTimeout(id === 'opening' || id === 'mobile' ? 250 : 700);
  const frame = await page.evaluate(({ frameId, frameQuality, frameReducedMotion }) => {
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
    const primaryHeading = document.querySelector<HTMLElement>('h1');
    return {
      id: frameId,
      viewport: { width: viewportWidth, height: viewportHeight },
      quality: frameQuality,
      reducedMotion: frameReducedMotion,
      ready: document.body.dataset.generatedReady === 'true',
      canvasCount: document.querySelectorAll('canvas').length,
      progress: Math.max(0, Math.min(1, derivedProgress)),
      scrollY: Math.max(0, Math.round(scrollY)),
      scrollHeight: Math.max(1, document.documentElement.scrollHeight),
      overflow: document.documentElement.scrollWidth - viewportWidth,
      heading: primaryHeading?.textContent?.trim() || '',
      headingVisible: primaryHeading ? candidates.includes(primaryHeading) : false,
      visibleTextCount: candidates.length,
      collisionCount,
      maxOverlapRatio: Math.max(0, Math.min(1, maxOverlapRatio)),
      blockingCollisionCount,
      editorialOverlapCount,
      maxBlockingOverlapRatio: Math.max(0, Math.min(1, maxBlockingOverlapRatio))
    };
  }, { frameId: id, frameQuality: quality, frameReducedMotion: reducedMotion });
  await page.screenshot({ path: join(directory, `${id}.png`), fullPage: false });
  return frame;
}

function attachErrorCollection(page: Page, errors: string[], label: string): void {
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`.slice(0, 600)));
  page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('WebSocket')) errors.push(`${label} console: ${message.text()}`.slice(0, 600)); });
}

function normalizeLocalOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('视觉评审只允许访问本机预览源。');
  return url.origin;
}

async function resolveBrowserExecutable(environment: Environment): Promise<string | undefined> {
  const candidate = environment.BROWSER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  if (!candidate) return undefined;
  try { await access(candidate); return candidate; } catch { return undefined; }
}
