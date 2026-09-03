import { expect, test, type Locator, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type JourneySnapshot = {
  state: 'apart' | 'nearing' | 'together' | 'invited';
  progress: string;
  input: 'initial' | 'scroll' | 'stage-navigation' | 'keyboard' | 'cta';
  asset: 'loading' | 'ready' | 'failed';
  invitation: 'pending' | 'sent';
  viewport: { width: number; height: number };
  horizontalOverflow: boolean;
  stageTop: number;
  canvas: { width: number; height: number };
};

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type Observation = {
  checkpoint: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  readyAtMs?: number;
  state?: JourneySnapshot;
  semantic?: Record<string, unknown>;
};

const route = '/pages/v2/deliveries/same-table-tonight/';
const revision = 'r141-proof';
const runId = 'direct-r141-same-table-tonight';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'same-table-tonight');
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r141-same-table-tonight');
const forcedFailureAsset = '/assets/missing-distant-dinner-panorama.png';
const observations: Observation[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-nearing.png',
  '03-desktop-invited.png',
  '04-mobile-reduced-invited.png',
  '05-asset-fallback.png'
] as const;
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
  'assets/distant-dinner-panorama-v1.png'
] as const;

test.describe.configure({ mode: 'serial', timeout: 40_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function hasNoIssues(issues: RuntimeIssues): boolean {
  return Object.values(issues).every((items) => items.length === 0);
}

function hasOnlyExpectedFallbackIssues(issues: RuntimeIssues): boolean {
  const expectedConsoleError = (message: string) => (
    /Failed to load resource/i.test(message) && /404|ERR_FILE_NOT_FOUND|ERR_FAILED/i.test(message)
  );
  return issues.pageErrors.length === 0
    && issues.consoleErrors.every(expectedConsoleError)
    && issues.requestFailures.every((message) => message.includes(forcedFailureAsset))
    && issues.responseErrors.every((message) => message.includes(forcedFailureAsset));
}

test.beforeAll(async () => {
  await mkdir(evidenceDir, { recursive: true });
  observations.length = 0;
  await Promise.all([
    ...captures.map((file) => rm(resolve(evidenceDir, file), { force: true })),
    rm(resolve(evidenceDir, 'report.json'), { force: true }),
    rm(resolve(evidenceDir, 'report.failed.json'), { force: true })
  ]);
});

test.afterAll(async () => {
  const existing = (await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }))).filter((file): file is typeof captures[number] => Boolean(file));
  const complete = observations.length === 5
    && existing.length === captures.length
    && observations.every(({ checkpoint, issues }) => (
      checkpoint === 'asset-fallback'
        ? hasOnlyExpectedFallbackIssues(issues)
        : hasNoIssues(issues)
    ));
  const report = {
    schemaVersion: 1,
    stage: 'r141-same-table-tonight-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    bundleFiles,
    captures: existing,
    observations
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
});

function monitor(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = {
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: []
  };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`
    );
  });
  page.on('response', (response) => {
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

function observe(page: Page, checkpoint: string, issues: RuntimeIssues): Observation {
  const item: Observation = {
    checkpoint,
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    issues
  };
  observations.push(item);
  return item;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.body.dataset.asset === 'ready'
      && typeof (window as typeof window & { __R141_SNAPSHOT__?: unknown }).__R141_SNAPSHOT__ === 'function'
  ));
}

async function snap(page: Page): Promise<JourneySnapshot> {
  return page.evaluate(() => {
    const snapshot = (
      window as typeof window & { __R141_SNAPSHOT__?: () => JourneySnapshot }
    ).__R141_SNAPSHOT__;
    if (!snapshot) throw new Error('R141 snapshot API is unavailable.');
    return snapshot();
  });
}

function expectClean(issues: RuntimeIssues): void {
  expect(issues).toEqual({
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: []
  });
}

function expectOnlyForcedAssetFailure(issues: RuntimeIssues): void {
  expect(issues.pageErrors).toEqual([]);
  expect(issues.consoleErrors.every((message) => (
    /Failed to load resource/i.test(message) && /404|ERR_FILE_NOT_FOUND|ERR_FAILED/i.test(message)
  ))).toBe(true);
  expect(issues.requestFailures.every((message) => message.includes(forcedFailureAsset))).toBe(true);
  expect(issues.responseErrors.every((message) => message.includes(forcedFailureAsset))).toBe(true);
}

async function expectInsideViewport(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const viewportWidth = await locator.page().evaluate(() => innerWidth);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
}

test('desktop opening binds two room crops to one generated panorama', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const started = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-opening', issues);
  await ready(page);
  item.readyAtMs = Date.now() - started;
  item.state = await snap(page);
  item.semantic = await page.evaluate(() => {
    const images = [...document.querySelectorAll<HTMLImageElement>('[data-scene-image]')];
    const scene = document.querySelector<HTMLElement>('#scene-window')!;
    return {
      imageCount: images.length,
      uniqueImageSources: new Set(images.map((image) => image.currentSrc)).size,
      naturalDimensions: images.map((image) => ({ width: image.naturalWidth, height: image.naturalHeight })),
      sceneWidth: Math.round(scene.getBoundingClientRect().width),
      bodyBackgroundImage: getComputedStyle(document.body).backgroundImage
    };
  });
  expect(item.readyAtMs).toBeLessThan(4_000);
  expect(item.state).toMatchObject({
    state: 'apart',
    progress: '0.000',
    input: 'initial',
    asset: 'ready',
    invitation: 'pending',
    horizontalOverflow: false
  });
  expect(item.state!.canvas.width).toBeGreaterThan(0);
  expect(item.semantic).toMatchObject({
    imageCount: 2,
    uniqueImageSources: 1,
    naturalDimensions: [
      { width: 1881, height: 836 },
      { width: 1881, height: 836 }
    ]
  });
  expect(String(item.semantic!.bodyBackgroundImage)).not.toContain('distant-dinner-panorama');
  await expect(page.locator('#scene-window')).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('a real wheel gesture moves both rooms through the shared nearing state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-wheel-nearing', issues);
  await ready(page);
  const before = await page.locator('.distance-gap').boundingBox();
  await page.mouse.wheel(0, 900);
  await page.waitForFunction(() => (
    document.body.dataset.input === 'scroll'
      && document.body.dataset.state === 'nearing'
      && Number(document.body.dataset.progress) > .4
      && Number(document.body.dataset.progress) < .7
  ));
  const after = await page.locator('.distance-gap').boundingBox();
  item.state = await snap(page);
  item.semantic = {
    gapWidthBefore: before?.width ?? null,
    gapWidthAfter: after?.width ?? null,
    visibleTableNotes: await page.locator('.table-note:visible').count()
  };
  expect(item.state).toMatchObject({
    state: 'nearing',
    input: 'scroll',
    asset: 'ready',
    invitation: 'pending',
    horizontalOverflow: false
  });
  expect(Number(item.state!.progress)).toBeGreaterThan(.4);
  expect(Number(item.state!.progress)).toBeLessThan(.7);
  expect(after).not.toBeNull();
  expect(before).not.toBeNull();
  expect(after!.width).toBeLessThan(before!.width);
  expect(item.semantic.visibleTableNotes).toBe(2);
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('desktop completion unlocks the invitation and records the CTA outcome', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'desktop-complete-invited', issues);
  await ready(page);
  await page.keyboard.press('End');
  await page.waitForFunction(() => (
    document.body.dataset.state === 'together'
      && Number(document.body.dataset.progress) >= .99
  ));
  const inputAtCompletion = await page.locator('body').getAttribute('data-input');
  await expect(page.locator('#invite-button')).toBeVisible();
  await expect(page.locator('#invite-button')).toBeEnabled();
  await page.locator('#invite-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-invitation', 'sent');
  await expect(page.locator('#invitation-status')).toContainText('邀请已留在桌上');
  item.state = await snap(page);
  item.semantic = {
    inputAtCompletion,
    mainCtaText: await page.locator('#invite-button').innerText(),
    statusText: await page.locator('#invitation-status').innerText()
  };
  expect(item.state).toMatchObject({
    state: 'invited',
    progress: '1.000',
    input: 'cta',
    asset: 'ready',
    invitation: 'sent',
    horizontalOverflow: false
  });
  await page.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(issues);
});

test('390px reduced motion completes the same discrete journey without overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  const issues = monitor(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'mobile-reduced-invited', issues);
  await ready(page);
  await page.locator('[data-stage-progress="1"]').click();
  await page.waitForFunction(() => document.body.dataset.state === 'together');
  await expectInsideViewport(page.locator('#invite-button'));
  await expect(page.locator('#invite-button')).toBeEnabled();
  await page.locator('#invite-button').click();
  item.state = await snap(page);
  item.semantic = {
    reducedMotion: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    stageButtons: await page.locator('[data-stage-progress]').count(),
    inviteButtonBox: await page.locator('#invite-button').boundingBox()
  };
  expect(item.state).toMatchObject({
    state: 'invited',
    progress: '1.000',
    input: 'cta',
    asset: 'ready',
    invitation: 'sent',
    horizontalOverflow: false
  });
  expect(item.semantic.reducedMotion).toBe(true);
  expect(item.semantic.stageButtons).toBe(3);
  await page.screenshot({ path: resolve(evidenceDir, captures[3]), fullPage: false });
  expectClean(issues);
});

test('forced asset failure discloses the missing panorama and preserves the invitation action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  await page.goto(`${route}?forceAssetFailure=1&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  const item = observe(page, 'asset-fallback', issues);
  await page.waitForFunction(() => (
    document.body.dataset.asset === 'failed'
      && typeof (window as typeof window & { __R141_SNAPSHOT__?: unknown }).__R141_SNAPSHOT__ === 'function'
  ));
  await expect(page.locator('#asset-fallback')).toBeVisible();
  await expect(page.locator('#asset-fallback')).toContainText('不会用通用色块伪装两张餐桌');
  const fallbackState = await snap(page);
  const sceneVisibility = await page.locator('.scene-half').first().evaluate((element) => getComputedStyle(element).visibility);
  await page.screenshot({ path: resolve(evidenceDir, captures[4]), fullPage: false });

  await page.locator('#footer-invite-button').scrollIntoViewIfNeeded();
  await expect(page.locator('#footer-invite-button')).toBeEnabled();
  await page.locator('#footer-invite-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-invitation', 'sent');
  item.state = await snap(page);
  item.semantic = {
    fallbackState,
    fallbackVisible: true,
    sceneVisibility,
    footerActionCompleted: true,
    issuePolicy: 'Only the explicit missing panorama request may fail in this forced-fallback checkpoint.'
  };
  expect(fallbackState).toMatchObject({
    state: 'apart',
    progress: '0.000',
    asset: 'failed',
    invitation: 'pending',
    horizontalOverflow: false
  });
  expect(sceneVisibility).toBe('hidden');
  expect(item.state).toMatchObject({
    state: 'invited',
    asset: 'failed',
    invitation: 'sent',
    input: 'cta',
    horizontalOverflow: false
  });
  expectOnlyForcedAssetFailure(issues);
});
