import { expect, test, type Page, type Response } from '@playwright/test';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type Observation = {
  checkpoint: typeof checkpointOrder[number];
  url: string;
  viewport: { width: number; height: number };
  issues: RuntimeIssues;
  [key: string]: unknown;
};

declare global {
  interface Window {
    __FOX_OBSERVATORY__?: {
      readonly activeGait: 'survey' | 'walk' | 'run';
      readonly modelLoaded: boolean;
      readonly fallback: boolean;
      readonly clip: 'Survey' | 'Walk' | 'Run';
      readonly saved: boolean;
    };
  }
}

const baseUrl = (process.env.R138_BASE_URL
  ?? 'http://127.0.0.1:8147/0823_githubcode_study/projects/kage').replace(/\/$/, '');
const homePath = '/pages/v2/';
const foxPath = '/pages/v2/deliveries/fox-gait-observatory/';
const storageKey = 'r137-fox-gait-observation-card';
const evidenceDir = resolve(
  process.cwd(),
  'docs',
  'v2-research',
  'evidence',
  'r138-production-recovery',
);
const checkpointOrder = [
  'desktop-home',
  'desktop-fox-runtime',
  'mobile-home-and-fox',
] as const;
const captures = [
  '01-production-home-v3.png',
  '02-production-fox-runtime.png',
  '03-production-mobile-fox.png',
] as const;
const expectedV3Entries = [
  {
    id: 'stormglass-archive',
    route: './deliveries/stormglass-archive/',
    runId: 'direct-r134-stormglass-archive',
  },
  {
    id: 'prism-seed-theatre',
    route: './deliveries/prism-seed-theatre/',
    runId: 'direct-r135-prism-seed-theatre',
  },
  {
    id: 'film-camera-repair-paths',
    route: './deliveries/film-camera-repair-paths/',
    runId: 'direct-r136a-film-camera-repair-paths',
  },
  {
    id: 'west-bund-meeting-points',
    route: './deliveries/west-bund-meeting-points/',
    runId: 'direct-r136b-west-bund-meeting-points',
  },
  {
    id: 'fox-gait-observatory',
    route: './deliveries/fox-gait-observatory/',
    runId: 'direct-r137-fox-gait-observatory',
  },
  {
    id: 'ten-second-callsign-decode',
    route: './deliveries/ten-second-callsign-decode/',
    runId: 'direct-r139-ten-second-callsign-decode',
  },
  {
    id: 'folded-light-studio',
    route: './deliveries/folded-light-studio/',
    runId: 'direct-r140-folded-light-studio',
  },
] as const;
const observations: Observation[] = [];

test.describe.configure({ mode: 'serial', timeout: 30_000 });

function productionUrl(path: string, query = ''): string {
  return `${baseUrl}${path}${query}`;
}

function monitor(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = {
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(
      `${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`,
    );
  });
  page.on('response', (response) => {
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

function expectClean(issues: RuntimeIssues): void {
  expect(issues).toEqual({
    pageErrors: [],
    consoleErrors: [],
    requestFailures: [],
    responseErrors: [],
  });
}

function record(
  page: Page,
  checkpoint: typeof checkpointOrder[number],
  issues: RuntimeIssues,
): Observation {
  const observation: Observation = {
    checkpoint,
    url: page.url(),
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    issues,
  };
  observations.push(observation);
  return observation;
}

async function expectNoHorizontalOverflow(page: Page): Promise<number> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  return overflow;
}

async function waitForFoxReady(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    document.body.dataset.modelLoaded === 'true'
      && document.body.dataset.sceneReady === 'true'
      && window.__FOX_OBSERVATORY__?.modelLoaded === true
      && window.__FOX_OBSERVATORY__?.fallback === false
  ), undefined, { timeout: 15_000 });
}

async function waitForGait(page: Page, gait: 'survey' | 'walk' | 'run'): Promise<void> {
  await page.waitForFunction((expected) => {
    const debug = window.__FOX_OBSERVATORY__;
    const active = document.querySelector<HTMLButtonElement>(`[data-gait="${expected}"]`);
    return debug?.activeGait === expected
      && debug.clip.toLowerCase() === expected
      && document.body.dataset.activeGait === expected
      && document.body.dataset.clipName?.toLowerCase() === expected
      && active?.getAttribute('aria-pressed') === 'true';
  }, gait);
}

async function responseBytes(response: Response): Promise<number> {
  return (await response.body()).byteLength;
}

test.beforeAll(async () => {
  observations.length = 0;
  await mkdir(evidenceDir, { recursive: true });
  await Promise.all([
    ...captures.map((capture) => rm(resolve(evidenceDir, capture), { force: true })),
    rm(resolve(evidenceDir, 'report.json'), { force: true }),
    rm(resolve(evidenceDir, 'report.failed.json'), { force: true }),
  ]);
});

test.afterAll(async () => {
  const existingCaptures = (await Promise.all(captures.map(async (capture) => {
    try {
      await access(resolve(evidenceDir, capture));
      return capture;
    } catch {
      return null;
    }
  }))).filter((capture): capture is typeof captures[number] => capture !== null);
  const complete = observations.length === checkpointOrder.length
    && observations.every(({ checkpoint }, index) => checkpoint === checkpointOrder[index])
    && observations.every(({ issues }) => Object.values(issues).every((items) => items.length === 0))
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r138-production-static-recovery',
    capturedAt: new Date().toISOString(),
    baseUrl,
    source: '.pages-dist',
    complete,
    captures: existingCaptures,
    observations,
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
});

test('production V2 home exposes the current final V3 entries and a real R137 thumbnail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const foxThumbnailResponse = page.waitForResponse((response) => (
    response.request().resourceType() === 'image'
      && /fox-gait-observatory-[^/]+\.png$/i.test(new URL(response.url()).pathname)
  ));
  const startedAt = Date.now();
  const response = await page.goto(productionUrl(homePath, '?revision=r138-production'), {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status()).toBe(200);

  const cards = page.locator('[data-v3-archive-id]');
  await expect(cards).toHaveCount(expectedV3Entries.length);
  for (const expected of expectedV3Entries) {
    const card = page.locator(`[data-v3-archive-id="${expected.id}"]`);
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute('href', expected.route);
    await expect(card).toHaveAttribute('data-run-id', expected.runId);
    await expect(card).toHaveAttribute('data-bundle-hash', /^[a-f0-9]{64}$/);
  }

  const foxCard = page.locator('[data-v3-archive-id="fox-gait-observatory"]');
  await foxCard.scrollIntoViewIfNeeded();
  const imageResponse = await foxThumbnailResponse;
  const thumbnail = foxCard.locator('img');
  await expect(thumbnail).toBeVisible();
  await page.waitForFunction(() => {
    const image = document.querySelector<HTMLImageElement>(
      '[data-v3-archive-id="fox-gait-observatory"] img',
    );
    return Boolean(image?.complete && image.naturalWidth === 1440 && image.naturalHeight === 900);
  });
  const thumbnailState = await thumbnail.evaluate((image: HTMLImageElement) => ({
    src: image.currentSrc,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  }));
  const thumbnailBytes = await responseBytes(imageResponse);
  await page.waitForLoadState('networkidle');
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toMatch(/^image\/png/);
  expect(thumbnailBytes).toBeGreaterThan(100_000);
  expect(thumbnailState).toMatchObject({ naturalWidth: 1440, naturalHeight: 900 });

  const observation = record(page, 'desktop-home', issues);
  observation.loadMs = Date.now() - startedAt;
  observation.v3Entries = expectedV3Entries;
  observation.foxThumbnail = {
    ...thumbnailState,
    status: imageResponse.status(),
    bytes: thumbnailBytes,
  };
  await page.screenshot({ path: resolve(evidenceDir, captures[0]), fullPage: false });
  expectClean(issues);
});

test('production Fox delivery restores the exact GLB and keeps gait switching and save functional', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = monitor(page);
  const modelResponsePromise = page.waitForResponse((response) => (
    /Fox-[^/]+\.glb$/i.test(new URL(response.url()).pathname)
  ));
  const startedAt = Date.now();
  const response = await page.goto(productionUrl(foxPath, '?quality=high&motion=full&revision=r138-production'), {
    waitUntil: 'domcontentloaded',
  });
  expect(response?.status()).toBe(200);
  await waitForFoxReady(page);
  const modelResponse = await modelResponsePromise;
  const modelBytes = await responseBytes(modelResponse);
  expect(modelResponse.status()).toBe(200);
  expect(modelBytes).toBe(162_852);

  await waitForGait(page, 'survey');
  await page.locator('[data-gait="walk"]').click();
  await waitForGait(page, 'walk');
  await page.keyboard.press('3');
  await waitForGait(page, 'run');
  await page.locator('#save-card').click();
  await page.waitForFunction((key) => (
    localStorage.getItem(key) === 'run'
      && document.body.dataset.saved === 'true'
      && window.__FOX_OBSERVATORY__?.saved === true
  ), storageKey);
  await expect(page.locator('#save-card')).toContainText('已保存 · 奔跑');
  await expect(page.locator('.truth-boundary')).toContainText('不是野外测量数据');
  await page.waitForLoadState('networkidle');

  const observation = record(page, 'desktop-fox-runtime', issues);
  observation.readyMs = Date.now() - startedAt;
  observation.model = {
    url: modelResponse.url(),
    status: modelResponse.status(),
    bytes: modelBytes,
  };
  observation.state = await page.evaluate((key) => ({
    activeGait: window.__FOX_OBSERVATORY__?.activeGait,
    clip: window.__FOX_OBSERVATORY__?.clip,
    modelLoaded: window.__FOX_OBSERVATORY__?.modelLoaded,
    saved: window.__FOX_OBSERVATORY__?.saved,
    storedValue: localStorage.getItem(key),
  }), storageKey);
  observation.horizontalOverflow = await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, captures[1]), fullPage: false });
  expectClean(issues);
});

test('390px production home and Fox delivery remain usable without blocking overflow', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
  });
  const homePage = await context.newPage();
  const homeIssues = monitor(homePage);
  const homeResponse = await homePage.goto(productionUrl(homePath, '?revision=r138-production-mobile'), {
    waitUntil: 'domcontentloaded',
  });
  expect(homeResponse?.status()).toBe(200);
  await expect(homePage.locator('[data-v3-archive-id]')).toHaveCount(expectedV3Entries.length);
  await homePage.waitForLoadState('networkidle');
  const homeOverflow = await expectNoHorizontalOverflow(homePage);

  const foxPage = await context.newPage();
  const foxIssues = monitor(foxPage);
  const foxResponse = await foxPage.goto(
    productionUrl(foxPath, '?quality=high&motion=reduce&revision=r138-production-mobile'),
    { waitUntil: 'domcontentloaded' },
  );
  expect(foxResponse?.status()).toBe(200);
  await waitForFoxReady(foxPage);
  await foxPage.locator('[data-gait="walk"]').tap();
  await waitForGait(foxPage, 'walk');
  await foxPage.locator('[data-gait="run"]').tap();
  await waitForGait(foxPage, 'run');
  await foxPage.waitForLoadState('networkidle');
  const foxOverflow = await expectNoHorizontalOverflow(foxPage);
  const controlBoxes = await foxPage.locator('[data-gait]').evaluateAll((controls) => controls.map((control) => {
    const box = control.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width };
  }));
  expect(controlBoxes.every(({ left, right }) => left >= 0 && right <= 390)).toBe(true);

  const combinedIssues: RuntimeIssues = {
    pageErrors: [...homeIssues.pageErrors, ...foxIssues.pageErrors],
    consoleErrors: [...homeIssues.consoleErrors, ...foxIssues.consoleErrors],
    requestFailures: [...homeIssues.requestFailures, ...foxIssues.requestFailures],
    responseErrors: [...homeIssues.responseErrors, ...foxIssues.responseErrors],
  };
  const observation = record(foxPage, 'mobile-home-and-fox', combinedIssues);
  observation.home = {
    url: homePage.url(),
    horizontalOverflow: homeOverflow,
    v3EntryCount: await homePage.locator('[data-v3-archive-id]').count(),
  };
  observation.fox = {
    url: foxPage.url(),
    horizontalOverflow: foxOverflow,
    controlBoxes,
    state: await foxPage.evaluate(() => ({
      activeGait: window.__FOX_OBSERVATORY__?.activeGait,
      clip: window.__FOX_OBSERVATORY__?.clip,
      modelLoaded: window.__FOX_OBSERVATORY__?.modelLoaded,
    })),
  };
  await foxPage.screenshot({ path: resolve(evidenceDir, captures[2]), fullPage: false });
  expectClean(combinedIssues);
  await context.close();
});
