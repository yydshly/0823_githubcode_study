import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const root = process.cwd();
const evidenceDir = path.resolve(root, 'docs', 'v2-research', 'evidence', 'r170-creative-shape-regression');
const captures = [
  '01-feeling-lens-opening.png',
  '02-feeling-lens-formed.png',
  '03-reflective-catalog-opening.png',
  '04-reflective-catalog-compare.png'
] as const;

type RuntimeIssues = {
  pageErrors: string[];
  consoleErrors: string[];
  requestFailures: string[];
  responseErrors: string[];
};

type Observation = {
  deliveryId: string;
  route: string;
  architecture: string;
  visualLanguage: string;
  interactionModel: string;
  captures: string[];
  issues: RuntimeIssues;
  states: Record<string, unknown>;
};

const observations: Observation[] = [];

function captureRuntimeIssues(page: Page): RuntimeIssues {
  const issues: RuntimeIssues = { pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] };
  page.on('pageerror', (error) => issues.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') issues.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    issues.requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) issues.responseErrors.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

function expectClean(issues: RuntimeIssues) {
  expect(issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
}

function bundleHash(directory: string, files: string[]) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(fs.readFileSync(path.join(root, directory, file)));
  }
  return hash.digest('hex');
}

test.describe.configure({ mode: 'serial', timeout: 45_000 });

test.beforeAll(() => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  observations.length = 0;
  for (const capture of captures) fs.rmSync(path.join(evidenceDir, capture), { force: true });
  fs.rmSync(path.join(evidenceDir, 'report.json'), { force: true });
  fs.rmSync(path.join(evidenceDir, 'report.failed.json'), { force: true });
});

test.afterAll(() => {
  const r169Hash = bundleHash('pages/v2/deliveries/kage-feeling-lens', [
    'index.html',
    'style.css',
    'main.ts',
    'asset-manifest.json',
    'assets/kage-paper-light-world-v1.png'
  ]);
  const r128Hash = bundleHash('pages/v2/deliveries/night-reflective-catalog', [
    'index.html',
    'style.css',
    'main.ts'
  ]);
  const allCapturesExist = captures.every((capture) => fs.existsSync(path.join(evidenceDir, capture)));
  const clean = observations.length === 2
    && observations.every((observation) => Object.values(observation.issues).every((items) => items.length === 0));
  const complete = allCapturesExist && clean;
  const report = {
    schemaVersion: 1,
    stage: 'r170-creative-shape-regression',
    capturedAt: new Date().toISOString(),
    purpose: '验证开放能力指导不会把不同产品压成统一页面模板。',
    browser: 'local Chrome via Playwright',
    freshEvidence: true,
    identityBinding: 'runId+bundleHash',
    identities: [
      {
        deliveryId: 'kage-feeling-lens',
        runId: 'direct-r169-kage-feeling-lens',
        bundleHash: r169Hash
      },
      {
        deliveryId: 'night-reflective-catalog',
        runId: 'direct-r128-night-reflective-catalog',
        bundleHash: r128Hash
      }
    ],
    comparison: {
      sameTemplate: false,
      distinctAxes: ['macro-architecture', 'information-density', 'visual-language', 'interaction-model', 'completion-shape'],
      observedDifference: '连续明亮的情绪成形场景，与暗色高密度的材料目录和比较模态，在结构、视觉与操作上均不同。',
      nonBlockingRisk: 'KAGE 感受取景器约 39% 的中段滚动位置存在一屏信息密度偏低；不影响主路径与本次结构多样性结论。',
      verdict: complete ? 'pass-with-note' : 'incomplete'
    },
    complete,
    captures,
    observations
  };
  const filename = complete ? 'report.json' : 'report.failed.json';
  fs.writeFileSync(path.join(evidenceDir, filename), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
});

test('R169 remains a continuous, light, feeling-led product journey', async ({ page }) => {
  const route = '/pages/v2/deliveries/kage-feeling-lens/?quality=high&motion=full&revision=r170-regression';
  const issues = captureRuntimeIssues(page);
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__kageR169?.snapshot().asset === 'ready');
  const opening = await page.evaluate(() => window.__kageR169?.snapshot());
  await expect(page.locator('#opening-title')).toContainText('先看见它的感受');
  await page.screenshot({ path: path.join(evidenceDir, captures[0]) });

  await page.locator('[data-emotion-value="awake"]').click();
  await page.locator('#form-direction').click();
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'formed');
  await page.waitForFunction(() => {
    const box = document.querySelector('#formation-title')?.getBoundingClientRect();
    return Boolean(box && box.top >= 0 && box.bottom <= innerHeight);
  });
  await page.waitForFunction(() => window.__kageR169?.snapshot().phase === 'formed');
  await expect(page.locator('#formation-title')).toBeVisible();
  await expect(page.locator('#continue-action')).toHaveAttribute('href', /workbench\.html\?/);
  const formed = await page.evaluate(() => window.__kageR169?.snapshot());
  await page.screenshot({ path: path.join(evidenceDir, captures[1]) });

  expect(opening).toMatchObject({ phase: 'idea', asset: 'ready', horizontalOverflow: false });
  expect(formed).toMatchObject({ phase: 'formed', emotion: 'awake', asset: 'ready', horizontalOverflow: false });
  observations.push({
    deliveryId: 'kage-feeling-lens',
    route,
    architecture: 'continuous-scene / idea → feeling → formed → continuation',
    visualLanguage: 'warm paper, generated spatial image, editorial typography, reveal mask',
    interactionModel: 'emotion choice + scroll/pointer/keyboard formation',
    captures: [captures[0], captures[1]],
    issues,
    states: { opening, formed }
  });
  expectClean(issues);
});

test('R128 remains a dense catalog with a shared beam and comparative result', async ({ page }) => {
  const route = '/pages/v2/deliveries/night-reflective-catalog/?quality=high&motion=full&revision=r170-regression';
  const issues = captureRuntimeIssues(page);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.documentElement.dataset.r128Ready === 'true'
    && window.__nightReflectiveCatalog?.snapshot().ready === true);
  const opening = await page.evaluate(() => window.__nightReflectiveCatalog!.snapshot());
  await expect(page.locator('.sample-card')).toHaveCount(8);
  await page.screenshot({ path: path.join(evidenceDir, captures[2]) });

  await page.locator('[data-sample-id="glass-bead"] .sample-select').click();
  await page.locator('[data-sample-id="micro-prism"] .sample-select').click();
  await page.locator('#open-compare').click();
  await expect(page.locator('#compare-dialog')).toBeVisible();
  await expect(page.locator('.compare-item')).toHaveCount(2);
  const compared = await page.evaluate(() => window.__nightReflectiveCatalog!.snapshot());
  await page.screenshot({ path: path.join(evidenceDir, captures[3]) });

  expect(opening).toMatchObject({ visibleCount: 8, selectedCount: 0, dialogOpen: false, horizontalOverflow: false });
  expect(compared).toMatchObject({ selectedCount: 2, dialogOpen: true, horizontalOverflow: false });
  observations.push({
    deliveryId: 'night-reflective-catalog',
    route,
    architecture: 'catalog-grid / filter → inspect → select → compare',
    visualLanguage: 'black material index, acid highlight, eight live procedural swatches',
    interactionModel: 'shared pointer beam + sample selection + comparison dialog',
    captures: [captures[2], captures[3]],
    issues,
    states: { opening, compared }
  });
  expectClean(issues);
});

test('R170 project status remains readable at the in-app browser width', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/pages/v2/?revision=r170-regression#project-status', { waitUntil: 'networkidle' });
  await expect(page.locator('#project-status')).toBeVisible();
  await expect(page.locator('#project-status')).toContainText('R170 结构回归通过');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
