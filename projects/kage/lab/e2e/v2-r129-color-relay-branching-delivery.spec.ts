import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type TeamId = 'cyan' | 'coral' | 'yellow' | 'blue';
type StrategyId = 'early' | 'line';

type RelaySnapshot = {
  ready: boolean;
  phase: 'opening' | 'team-selected' | 'running' | 'confluence' | 'saved';
  selectedTeam: TeamId | null;
  strategy: StrategyId | null;
  driveMode: 'demo' | 'manual' | 'paused';
  progress: number;
  saved: boolean;
  fallback: boolean;
  reducedMotion: boolean;
  routeHash: string;
  routeD: string;
  formationSpread: number;
  exchangeOverlap: number;
  canvasFrames: number;
  runnerTransforms: string[];
  horizontalOverflow: boolean;
  revision: string;
};

declare global {
  interface Window {
    __colorRelay?: {
      snapshot: () => RelaySnapshot;
    };
  }
}

type Issues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

const route = '/pages/v2/deliveries/color-relay-branching/';
const revision = 'r129-proof';
const runId = 'direct-r129-color-relay-branching';
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r129-color-relay-branching');
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', 'color-relay-branching');
const observations: Record<string, unknown>[] = [];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-early.png',
  '03-desktop-line-saved.png',
  '04-mobile-reduced.png',
  '05-fallback.png'
];

test.describe.configure({ mode: 'serial', timeout: 40_000 });

async function bundleHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(await readFile(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
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
  const cleanIssues = JSON.stringify({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
  const captureChecks = await Promise.all(captures.map(async (file) => {
    try {
      await access(resolve(evidenceDir, file));
      return file;
    } catch {
      return null;
    }
  }));
  const existingCaptures = captureChecks.filter((file): file is string => Boolean(file));
  const complete = observations.length === 4
    && observations.every((observation) => JSON.stringify(observation.issues) === cleanIssues)
    && existingCaptures.length === captures.length;
  const report = {
    schemaVersion: 1,
    stage: 'r129-color-relay-branching-runtime-observations',
    capturedAt: new Date().toISOString(),
    identityBinding: 'runId+bundleHash',
    runId,
    bundleHash: await bundleHash(),
    route,
    revision,
    complete,
    captures: complete ? captures : existingCaptures,
    observations
  };
  await writeFile(
    resolve(evidenceDir, complete ? 'report.json' : 'report.failed.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
});

function observe(page: Page): Issues {
  const issues: Issues = { pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => {
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.relayReady === 'true'
    && window.__colorRelay?.snapshot().ready === true);
}

async function snapshot(page: Page): Promise<RelaySnapshot> {
  return page.evaluate(() => window.__colorRelay!.snapshot());
}

async function expectNoOverflow(page: Page): Promise<void> {
  expect((await snapshot(page)).horizontalOverflow).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

function expectClean(issues: Issues): void {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

test('desktop opening reads as one high-color relay stage with four persistent team paths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  const startedAt = Date.now();
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const current = await snapshot(page);
  expect(Date.now() - startedAt).toBeLessThanOrEqual(8_000);
  expect(current).toMatchObject({
    ready: true,
    phase: 'opening',
    selectedTeam: null,
    strategy: null,
    driveMode: 'demo',
    fallback: false,
    reducedMotion: false,
    horizontalOverflow: false,
    revision
  });
  await expect(page.locator('[data-lane]')).toHaveCount(4);
  await expect(page.locator('[data-team]')).toHaveCount(4);
  await expect(page.locator('#branch-choice')).toBeHidden();
  await expect(page.locator('#outcome-ticket')).toBeHidden();
  await expect(page.locator('input[type="range"], .control-panel, .workbench-panel')).toHaveCount(0);
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '01-desktop-opening.png') });
  observations.push({ checkpoint: 'desktop-opening', readyAtMs: Date.now() - startedAt, issues, state: current });
  expectClean(issues);
});

test('same team takes two geometrically distinct branches, reconverges and saves through real UI', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=full&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);

  await page.locator('[data-team="cyan"]').click();
  await expect(page.locator('#branch-choice')).toBeVisible();
  await page.locator('[data-strategy="early"]').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'confluence');
  const early = await snapshot(page);
  expect(early).toMatchObject({ selectedTeam: 'cyan', strategy: 'early', phase: 'confluence', progress: 1, saved: false });
  expect(early.routeHash).toMatch(/^relay-[0-9a-f]{8}$/);
  expect(early.routeD.length).toBeGreaterThan(40);
  expect(early.runnerTransforms.every((transform) => transform.includes('translate('))).toBe(true);
  await page.screenshot({ path: resolve(evidenceDir, '02-desktop-early.png') });

  await page.locator('#choose-again').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'team-selected');
  await page.locator('[data-strategy="line"]').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'confluence');
  const line = await snapshot(page);
  expect(line).toMatchObject({ selectedTeam: 'cyan', strategy: 'line', phase: 'confluence', progress: 1, saved: false });
  expect(line.routeHash).not.toBe(early.routeHash);
  expect(line.routeD).not.toBe(early.routeD);
  expect(line.runnerTransforms).not.toEqual(early.runnerTransforms);
  expect(line.formationSpread).not.toBe(early.formationSpread);
  expect(line.exchangeOverlap).not.toBe(early.exchangeOverlap);
  await page.locator('#save-plan').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'saved');
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ selectedTeam: 'cyan', strategy: 'line', phase: 'saved', saved: true });
  await expect(page.locator('#save-status')).toContainText('已保存虚构方案');
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '03-desktop-line-saved.png') });
  observations.push({
    checkpoint: 'desktop-branch-confluence',
    issues,
    early,
    line,
    saved,
    comparison: {
      sameTeam: early.selectedTeam === line.selectedTeam,
      distinctRouteHash: early.routeHash !== line.routeHash,
      distinctRouteGeometry: early.routeD !== line.routeD,
      distinctRunnerFormation: JSON.stringify(early.runnerTransforms) !== JSON.stringify(line.runnerTransforms)
    }
  });
  expectClean(issues);
});

test('390px reduced-motion touch journey preserves visible branch consequence and save without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const issues = observe(page);
  await page.goto(`${route}?quality=high&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.locator('[data-team="coral"]').tap();
  await page.locator('[data-strategy="early"]').tap();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'confluence');
  const confluence = await snapshot(page);
  expect(confluence).toMatchObject({
    selectedTeam: 'coral',
    strategy: 'early',
    phase: 'confluence',
    progress: 1,
    reducedMotion: true,
    driveMode: 'manual',
    horizontalOverflow: false
  });
  expect(confluence.routeD.length).toBeGreaterThan(40);
  expect(confluence.runnerTransforms.every((transform) => transform.includes('translate('))).toBe(true);
  await page.locator('#save-plan').tap();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().saved === true);
  const saved = await snapshot(page);
  expect(saved.phase).toBe('saved');
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '04-mobile-reduced.png') });
  observations.push({ checkpoint: 'mobile-reduced', issues, state: saved, branchState: confluence, viewport: { width: 390, height: 844 } });
  expectClean(issues);
  await context.close();
});

test('forced Canvas fallback keeps SVG branch geometry, confluence and save available', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const issues = observe(page);
  await page.goto(`${route}?quality=high&fallback=1&motion=reduce&revision=${revision}`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  expect(await snapshot(page)).toMatchObject({ fallback: true, reducedMotion: true, canvasFrames: 0, phase: 'opening' });
  await expect(page.locator('#trail-canvas')).toBeHidden();
  await page.locator('[data-team="blue"]').click();
  await page.locator('[data-strategy="line"]').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().phase === 'confluence');
  const confluence = await snapshot(page);
  expect(confluence).toMatchObject({ selectedTeam: 'blue', strategy: 'line', phase: 'confluence', fallback: true, canvasFrames: 0 });
  expect(confluence.routeHash).toMatch(/^relay-[0-9a-f]{8}$/);
  expect(confluence.routeD.length).toBeGreaterThan(40);
  expect(confluence.runnerTransforms.every((transform) => transform.includes('translate('))).toBe(true);
  await page.locator('#save-plan').click();
  await page.waitForFunction(() => window.__colorRelay?.snapshot().saved === true);
  const saved = await snapshot(page);
  expect(saved).toMatchObject({ phase: 'saved', saved: true, fallback: true, canvasFrames: 0, horizontalOverflow: false });
  await expectNoOverflow(page);
  await page.screenshot({ path: resolve(evidenceDir, '05-fallback.png') });
  observations.push({ checkpoint: 'forced-fallback', issues, state: saved, branchState: confluence });
  expectClean(issues);
});

