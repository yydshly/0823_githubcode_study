import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');
const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4176';
const outDir = resolve(projectRoot, 'evidence/product-workbench');
mkdirSync(outDir, { recursive: true });

for (const filename of [
  '01-desktop-atlas.png',
  '02-desktop-atlas-exploded.png',
  '03-desktop-nova.png',
  '04-mobile-nova.png',
  'failure.png',
  'browser-report.json',
]) {
  const path = resolve(outDir, filename);
  if (existsSync(path)) rmSync(path, { force: true });
}

const report = {
  url: baseUrl + '/workbench',
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  forbiddenRuntimeRequests: [],
  externalModelRequests: [],
  screenshots: [],
  checks: {},
};

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (message) => {
  if (message.type() !== 'error') return;
  report.consoleErrors.push({ type: 'console', text: message.text(), location: message.location() });
});
page.on('pageerror', (error) => report.consoleErrors.push({ type: 'pageerror', text: String(error) }));
page.on('request', (request) => {
  const url = request.url();
  if (/\/src\/(?:main\.js|world\/|game\/|sim\/)|terrain|vegetation|maps\/desert/i.test(url)) {
    report.forbiddenRuntimeRequests.push(url);
  }
  if (/\.(?:glb|gltf|fbx|obj)(?:\?|$)/i.test(url)) report.externalModelRequests.push(url);
});

try {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const response = await page.goto(report.url, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__COT_PRODUCT_WORKBENCH?.status === 'ready',
    { timeout: 10_000, polling: 50 },
  );
  await page.evaluate(() => window.__COT_PRODUCT_WORKBENCH.resetMetrics());
  await new Promise((resolveWait) => setTimeout(resolveWait, 2200));

  report.desktopAtlas = await page.evaluate(() => {
    const snapshot = window.__COT_PRODUCT_WORKBENCH.snapshot;
    const canvas = document.getElementById('workbench-canvas').getBoundingClientRect();
    return {
      snapshot,
      canvas: { width: canvas.width, height: canvas.height },
      subjectButtons: document.querySelectorAll('[data-subject]').length,
      hotspotTabs: document.querySelectorAll('.feature-tabs [data-hotspot]').length,
      materialVariants: document.querySelectorAll('[data-variant]').length,
      worldHotspots: document.querySelectorAll('.world-hotspot').length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
    };
  });
  await page.screenshot({ path: resolve(outDir, '01-desktop-atlas.png'), fullPage: true });
  report.screenshots.push('01-desktop-atlas.png');

  await page.click('[data-hotspot="energy-module"]');
  await page.click('[data-variant="rescue-orange"]');
  await page.click('[data-action="explode"]');
  await new Promise((resolveWait) => setTimeout(resolveWait, 1200));
  report.atlasInteraction = await page.evaluate(() => window.__COT_PRODUCT_WORKBENCH.snapshot);
  await page.screenshot({ path: resolve(outDir, '02-desktop-atlas-exploded.png'), fullPage: true });
  report.screenshots.push('02-desktop-atlas-exploded.png');

  await page.click('[data-subject="nova-field-node"]');
  await page.waitForFunction(
    () => window.__COT_PRODUCT_WORKBENCH?.snapshot?.activeSubjectId === 'nova-field-node',
    { timeout: 5_000, polling: 50 },
  );
  await page.evaluate(() => window.__COT_PRODUCT_WORKBENCH.resetMetrics());
  await new Promise((resolveWait) => setTimeout(resolveWait, 2200));
  report.desktopNova = await page.evaluate(() => ({
    snapshot: window.__COT_PRODUCT_WORKBENCH.snapshot,
    hotspotTabs: document.querySelectorAll('.feature-tabs [data-hotspot]').length,
    materialVariants: document.querySelectorAll('[data-variant]').length,
    worldHotspots: document.querySelectorAll('.world-hotspot').length,
    activeSubjectLabel: document.querySelector('[data-architecture-subject]')?.textContent,
  }));
  await page.screenshot({ path: resolve(outDir, '03-desktop-nova.png'), fullPage: true });
  report.screenshots.push('03-desktop-nova.png');

  await page.click('[data-action="play"]');
  await new Promise((resolveWait) => setTimeout(resolveWait, 13_800));
  report.directorCrossSubject = await page.evaluate(() => ({
    director: window.__COT_PRODUCT_WORKBENCH.snapshot.director,
    activeSubjectId: window.__COT_PRODUCT_WORKBENCH.snapshot.activeSubjectId,
    presentation: window.__COT_PRODUCT_WORKBENCH.snapshot.architecture.presentation,
  }));

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluate(() => {
    window.__COT_PRODUCT_WORKBENCH.overview();
    window.__COT_PRODUCT_WORKBENCH.resetMetrics();
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 1400));
  report.mobileNova = await page.evaluate(() => {
    const visibleControls = [...document.querySelectorAll('.inspection-panel button, .primary-actions button')]
      .filter((node) => getComputedStyle(node).display !== 'none');
    return {
      snapshot: window.__COT_PRODUCT_WORKBENCH.snapshot,
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      controlSizes: visibleControls.map((node) => {
        const box = node.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
      inspectionBottom: document.querySelector('.inspection-panel').getBoundingClientRect().bottom,
      viewportHeight: innerHeight,
    };
  });
  await page.screenshot({ path: resolve(outDir, '04-mobile-nova.png'), fullPage: true });
  report.screenshots.push('04-mobile-nova.png');

  const atlas = report.desktopAtlas.snapshot;
  const atlasMetrics = atlas.metrics;
  const nova = report.desktopNova.snapshot;
  const novaMetrics = nova.metrics;
  const mobileMetrics = report.mobileNova.snapshot.metrics;
  const makeBudget = (id, label, value, target, unit) => ({
    id,
    label,
    value,
    target,
    unit,
    status: value <= target ? 'pass' : 'over',
  });
  report.performanceBudgets = [
    makeBudget('workbench-ready', '工作台 ready', atlasMetrics.readyMs, 5_000, 'ms'),
    makeBudget('atlas-frame-p95', 'Atlas 桌面动态帧 p95', atlasMetrics.frameP95Ms, 33.4, 'ms'),
    makeBudget('atlas-draw-calls', 'Atlas 高质量 draw calls', atlasMetrics.calls, 120, 'count'),
    makeBudget('atlas-triangles', 'Atlas 高质量 triangles', atlasMetrics.triangles, 150_000, 'count'),
    makeBudget('nova-draw-calls', 'Nova 高质量 draw calls', novaMetrics.calls, 60, 'count'),
    makeBudget('nova-triangles', 'Nova 高质量 triangles', novaMetrics.triangles, 150_000, 'count'),
    makeBudget('runtime-textures', '运行时纹理（含阴影）', Math.max(atlasMetrics.textures, novaMetrics.textures), 4, 'count'),
    makeBudget('mobile-draw-calls', 'Nova 移动轻质量 draw calls', mobileMetrics.calls, 70, 'count'),
  ];
  report.performanceSummary = {
    pass: report.performanceBudgets.filter((item) => item.status === 'pass').length,
    over: report.performanceBudgets.filter((item) => item.status === 'over').length,
  };
  report.optimization = {
    atlasCallsBefore: 151,
    atlasCallsAfter: atlasMetrics.calls,
    delta: atlasMetrics.calls - 151,
    reductionPercent: Number((((151 - atlasMetrics.calls) / 151) * 100).toFixed(1)),
    strategy: 'largest-silhouette shadow budget + low-tier outline suppression',
  };

  report.checks = {
    route200: response?.status() === 200,
    runtimeReady: atlas.status === 'ready',
    trueWorldNone: atlas.architecture.world === 'none'
      && atlas.architecture.scene === 'neutral-inspection-world-none',
    independentRenderCore: atlas.architecture.renderCore === 'standalone-threejs',
    twoSubjectRegistry: atlas.registryAudit?.valid === true
      && atlas.registryAudit?.subjectCount === 2
      && atlas.availableSubjectIds?.includes('atlas-inspection-rover')
      && atlas.availableSubjectIds?.includes('nova-field-node'),
    subjectAdapterContract: atlas.architecture.subjectAdapter === 'product-subject-v1'
      && atlas.subjectAdapter?.contract === 'product-subject-v1',
    noGameOrWorldModules: report.forbiddenRuntimeRequests.length === 0,
    noExternalModelRequests: report.externalModelRequests.length === 0,
    canvasVisible: report.desktopAtlas.canvas.width === 1440
      && report.desktopAtlas.canvas.height === 900,
    twoSubjectControls: report.desktopAtlas.subjectButtons === 2,
    atlasThreeHotspots: report.desktopAtlas.hotspotTabs === 3
      && report.desktopAtlas.worldHotspots === 3
      && atlas.subjectManifest?.sockets?.length === 3,
    atlasThreeMaterialVariants: report.desktopAtlas.materialVariants === 3
      && atlas.subjectManifest?.materialVariantIds?.length === 3,
    atlasInteractionContract: report.atlasInteraction.activeHotspotId === 'energy-module'
      && report.atlasInteraction.activeVariantId === 'rescue-orange'
      && report.atlasInteraction.exploded === true,
    shadowBudgetApplied: atlas.subjectAdapter?.activeShadowCasters === 24
      && atlas.subjectAdapter.activeShadowCasters < atlas.subjectAdapter.shadowCandidateCount,
    atlasCallOptimization: atlasMetrics.calls <= 120,
    novaSubjectSwitch: nova.activeSubjectId === 'nova-field-node'
      && nova.architecture.subject === 'nova-field-node'
      && report.desktopNova.activeSubjectLabel?.includes('Nova'),
    novaIndependentContract: nova.subjectManifest?.kind === 'industrial-energy-node'
      && nova.subjectManifest?.externalModelCount === 0
      && nova.subjectAdapter?.id === 'nova-field-node'
      && nova.architecture.presentation === atlas.architecture.presentation,
    novaThreeHotspots: report.desktopNova.hotspotTabs === 3
      && report.desktopNova.worldHotspots === 3
      && nova.subjectManifest?.sockets?.length === 3,
    novaThreeMaterialVariants: report.desktopNova.materialVariants === 3
      && nova.subjectManifest?.materialVariantIds?.length === 3,
    directorCrossesSubjects: report.directorCrossSubject.director.playing === true
      && report.directorCrossSubject.director.elapsedMs >= 13_000
      && report.directorCrossSubject.director.segmentId === 'nova-sensor'
      && report.directorCrossSubject.activeSubjectId === 'nova-field-node'
      && report.directorCrossSubject.presentation === 'product-stage-v2',
    performanceMeasured: atlasMetrics.sampleCount >= 60
      && novaMetrics.sampleCount >= 60
      && atlasMetrics.calls > 0
      && novaMetrics.calls > 0,
    performanceBudgetsReported: report.performanceBudgets.length === 8,
    mobileQualityReducesCalls: mobileMetrics.calls > 0 && mobileMetrics.calls < novaMetrics.calls,
    sourceTextureFree: atlas.sceneProfile.textureCount === 0,
    mobileNoHorizontalOverflow: report.mobileNova.innerWidth === 390
      && report.mobileNova.scrollWidth <= 390,
    mobileTouchTargets: report.mobileNova.controlSizes.length >= 9
      && report.mobileNova.controlSizes.every(({ width, height }) => width >= 44 && height >= 44),
    mobileLowQuality: report.mobileNova.snapshot.quality === 'low'
      && report.mobileNova.snapshot.subjectAdapter.visibleOutlineCount === 0
      && report.mobileNova.snapshot.subjectAdapter.activeShadowCasters === 0,
    reducedMotionStopsTurntable: report.mobileNova.reducedMotion === true
      && report.mobileNova.snapshot.reducedMotion === true
      && report.mobileNova.snapshot.autoRotate === false,
    evidenceComplete: report.screenshots.length === 4,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.result = Object.values(report.checks).every(Boolean) ? 'pass' : 'fail';
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  await page.screenshot({ path: resolve(outDir, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
