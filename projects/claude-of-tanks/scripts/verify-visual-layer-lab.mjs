import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');
const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4174';
const labRoute = '/studio?map=desert&showcase=capabilities&lab=layers&nogate=1';
const fullRoute = '/studio?map=desert&showcase=capabilities&nogate=1';
const outDir = resolve(projectRoot, 'evidence/visual-layer-lab-final');
mkdirSync(outDir, { recursive: true });

const report = {
  url: `${baseUrl}${labRoute}`,
  fullDemoUrl: `${baseUrl}${fullRoute}`,
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  screenshots: [],
  checks: {},
};

const expectedStages = [
  { id: 'geometry', material: 'normal', world: false, shadow: false, post: false, fx: false },
  { id: 'materials', material: 'basic', world: false, shadow: false, post: false, fx: false },
  { id: 'lighting', material: 'original', world: false, shadow: true, post: false, fx: false },
  { id: 'environment', material: 'original', world: true, shadow: true, post: false, fx: false },
  { id: 'post', material: 'original', world: true, shadow: true, post: true, fx: false },
  { id: 'camera', material: 'original', world: true, shadow: true, post: true, fx: false },
  { id: 'fx', material: 'original', world: true, shadow: true, post: true, fx: true },
];

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--use-gl=angle', '--enable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
});

function watchConsole(page, surface) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    report.consoleErrors.push({
      surface,
      type: 'console',
      text: message.text(),
      location: message.location(),
    });
  });
  page.on('pageerror', (error) => {
    report.consoleErrors.push({ surface, type: 'pageerror', text: String(error) });
  });
}

async function capture(page, filename) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 800));
  await page.screenshot({ path: resolve(outDir, filename) });
  report.screenshots.push(filename);
}

async function waitForStage(page, stageIndex) {
  await page.waitForFunction(
    (target) => window.__COT_VISUAL_LAYER_LAB?.stageIndex === target,
    { timeout: 30000, polling: 50 },
    stageIndex,
  );
}

function sameVector(a, b, epsilon = 0.02) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let page;
let fullPage;

try {
  page = await browser.newPage();
  watchConsole(page, 'lab');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const readyStart = performance.now();
  await page.goto(report.url, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await page.waitForFunction(
    () => window.__COT_CAPABILITY_SHOWCASE?.labScene?.version === 8,
    { timeout: 30000, polling: 100 },
  );
  report.preloadContract = await page.evaluate(() => {
    const controller = window.__COT_CAPABILITY_SHOWCASE;
    const meta = controller.labScene;
    const effectTypes = [...new Set(controller.scene.effects.map((effect) => effect.type))].sort();
    return {
      version: meta.version,
      mode: meta.mode,
      actorNames: controller.scene.actors.map((actor) => actor.name),
      actorCount: controller.scene.actors.length,
      effectCount: controller.scene.effects.length,
      effectTypes,
      requiredEffectTypes: meta.requiredEffectTypes,
      missingRequiredTypes: meta.requiredEffectTypes.filter((type) => !effectTypes.includes(type)),
      actorAnchors: [...new Set(controller.scene.effects.filter((effect) => effect.actor).map((effect) => effect.actor))],
      trackActors: controller.scene.storyboard.actorTracks.map((track) => track.actor),
      heroPosition: meta.heroPosition,
      sampledTiltDeg: meta.sampledTiltDeg,
      originalFullCounts: meta.originalFullCounts,
      reloadName: controller.reload.name,
      playbackLocked: controller.labPlayback?.locked === true,
    };
  });

  await page.waitForFunction(
    () => {
      const controller = window.__COT_CAPABILITY_SHOWCASE;
      const lab = window.__COT_VISUAL_LAYER_LAB;
      return controller?.status === 'error' || lab?.status === 'error'
        || (controller?.status === 'ready' && lab?.status === 'ready'
          && lab?.r2?.version === 2 && lab?.r3?.version === 3);
    },
    { timeout: 240000, polling: 500 },
  );
  const runtimeStatus = await page.evaluate(() => ({
    controller: window.__COT_CAPABILITY_SHOWCASE?.status,
    controllerError: window.__COT_CAPABILITY_SHOWCASE?.error || null,
    lab: window.__COT_VISUAL_LAYER_LAB?.status,
    labError: window.__COT_VISUAL_LAYER_LAB?.error || null,
  }));
  if (runtimeStatus.controller !== 'ready' || runtimeStatus.lab !== 'ready') {
    throw new Error(`Lab failed to become ready: ${JSON.stringify(runtimeStatus)}`);
  }
  report.desktopReadyMs = Math.round(performance.now() - readyStart);

  const stableBefore = await page.evaluate(() => {
    const lab = window.__COT_VISUAL_LAYER_LAB;
    const actor = lab.actors[0];
    return {
      timeMs: lab.studio.fxTimeMs,
      stageIndex: lab.stageIndex,
      camera: lab.studio.getCamera(),
      actor: [actor.state.pos.x, actor.state.pos.y, actor.state.pos.z, actor.state.yaw],
    };
  });
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1600));
  const stableAfter = await page.evaluate(() => {
    const lab = window.__COT_VISUAL_LAYER_LAB;
    const actor = lab.actors[0];
    return {
      timeMs: lab.studio.fxTimeMs,
      stageIndex: lab.stageIndex,
      camera: lab.studio.getCamera(),
      actor: [actor.state.pos.x, actor.state.pos.y, actor.state.pos.z, actor.state.yaw],
    };
  });
  report.playbackStability = { before: stableBefore, after: stableAfter };

  report.desktopDefault = await page.evaluate(() => {
    const lab = window.__COT_VISUAL_LAYER_LAB;
    const actor = lab.actors[0];
    const panel = document.querySelector('#cot-visual-layer-lab');
    const dock = document.querySelector('.cot-studio .dock');
    const director = document.querySelector('#cot-capability-director');
    const ground = window.__DEBUG.scene.getObjectByName('visual-layer-lab-ground-r2');
    const atmosphere = [...lab.r2.atmosphere.keys()];
    const rect = panel.getBoundingClientRect();
    const obstacles = window.__DEBUG.world?.getObstacles?.() || [];
    const heroX = actor.state.pos.x;
    const heroZ = actor.state.pos.z;
    const nearbyObstacles = obstacles.filter((item) => {
      const min = item.min;
      const max = item.max;
      return Array.isArray(min) && Array.isArray(max)
        && heroX >= min[0] - 4 && heroX <= max[0] + 4
        && heroZ >= min[2] - 4 && heroZ <= max[2] + 4;
    }).length;
    return {
      audit: lab.audit(),
      timeOrigin: performance.timeOrigin,
      actorNames: lab.actors.map((item) => item.name),
      visibleActors: lab.actors.filter((item) => item.visual?.root?.visible).map((item) => item.name),
      rememberedMeshes: lab.originalMaterials.size,
      actorPose: {
        x: actor.state.pos.x,
        z: actor.state.pos.z,
        pitch: actor.state.visualPitch,
        roll: actor.state.visualRoll,
      },
      nearbyObstacles,
      panel: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width },
      dockDisplay: getComputedStyle(dock).display,
      directorDisplay: getComputedStyle(director).display,
      atmosphere: atmosphere.map((object) => ({ visible: object.visible })),
      ground: ground ? {
        visible: ground.visible,
        plane: !!ground.getObjectByName('visual-layer-lab-neutral-plane'),
        grid: !!ground.getObjectByName('visual-layer-lab-meter-grid'),
      } : null,
    };
  });
  await capture(page, '01-desktop-geometry.png');

  report.stageRows = [];
  for (let index = 0; index < expectedStages.length; index++) {
    const row = await page.evaluate(async (stageIndex) => {
      const startedAt = performance.now();
      await window.__COT_VISUAL_LAYER_LAB.setStage(stageIndex);
      const lab = window.__COT_VISUAL_LAYER_LAB;
      const audit = lab.audit();
      let visibleFxObjects = 0;
      lab.debug.fx?.group?.traverse((object) => {
        if (object !== lab.debug.fx.group && object.visible) visibleFxObjects++;
      });
      return {
        elapsedMs: Math.round(performance.now() - startedAt),
        audit,
        canvasStage: lab.debug.renderer.domElement.dataset.visualLabStage,
        visibleFxObjects,
      };
    }, index);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1100));
    row.resident = await page.evaluate(() => ({
      stageIndex: window.__COT_VISUAL_LAYER_LAB.stageIndex,
      timeMs: window.__COT_VISUAL_LAYER_LAB.studio.fxTimeMs,
    }));
    report.stageRows.push(row);
    if (index === 4) await capture(page, '02-desktop-post.png');
    if (index === 6) await capture(page, '03-desktop-fx.png');
  }

  const stageCameras = report.stageRows.map((row) => row.audit.camera);
  report.cameraConsistency = {
    inspection: stageCameras.slice(0, 5).every((camera) =>
      sameVector(camera.pos, stageCameras[0].pos)
        && sameVector(camera.lookAt, stageCameras[0].lookAt)
        && Math.abs(camera.fov - stageCameras[0].fov) < 0.01),
    cinematic: sameVector(stageCameras[5].pos, stageCameras[6].pos)
      && sameVector(stageCameras[5].lookAt, stageCameras[6].lookAt)
      && Math.abs(stageCameras[5].fov - stageCameras[6].fov) < 0.01,
  };

  await page.evaluate(() => window.__COT_VISUAL_LAYER_LAB.setStage(4));
  await page.click('#cot-visual-layer-lab [data-action="compare"]');
  await waitForStage(page, 3);
  const comparePrevious = await page.evaluate(() => ({
    audit: window.__COT_VISUAL_LAYER_LAB.audit(),
    compareBase: window.__COT_VISUAL_LAYER_LAB.r2.compareBase,
    pressed: document.querySelector('#cot-visual-layer-lab [data-action="compare"]').getAttribute('aria-pressed'),
  }));
  await page.click('#cot-visual-layer-lab [data-action="compare"]');
  await waitForStage(page, 4);
  const compareReturned = await page.evaluate(() => ({
    audit: window.__COT_VISUAL_LAYER_LAB.audit(),
    compareBase: window.__COT_VISUAL_LAYER_LAB.r2.compareBase,
    pressed: document.querySelector('#cot-visual-layer-lab [data-action="compare"]').getAttribute('aria-pressed'),
  }));
  report.compare = { previous: comparePrevious, returned: compareReturned };

  await page.evaluate(async () => {
    await window.__COT_VISUAL_LAYER_LAB.setStage(0);
    document.body.focus();
  });
  await page.keyboard.press('ArrowRight');
  await waitForStage(page, 1);
  await page.keyboard.press('KeyB');
  await waitForStage(page, 0);
  const keyboardCompare = await page.evaluate(() => window.__COT_VISUAL_LAYER_LAB.r2.compareBase);
  await page.keyboard.press('KeyB');
  await waitForStage(page, 1);
  const keyboardReturned = await page.evaluate(() => window.__COT_VISUAL_LAYER_LAB.r2.compareBase);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__COT_VISUAL_LAYER_LAB.autoPlaying === true, { timeout: 3000 });
  const autoOn = await page.evaluate(() => window.__COT_VISUAL_LAYER_LAB.autoPlaying);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__COT_VISUAL_LAYER_LAB.autoPlaying === false, { timeout: 3000 });
  report.keyboard = await page.evaluate((compareBase, returnedBase, wasAutoOn) => ({
    compareBase,
    returnedBase,
    autoOn: wasAutoOn,
    autoOff: window.__COT_VISUAL_LAYER_LAB.autoPlaying,
    events: window.__COT_VISUAL_LAYER_LAB.r2.keyboardEvents,
    stageId: window.__COT_VISUAL_LAYER_LAB.audit().stageId,
  }), keyboardCompare, keyboardReturned, autoOn);

  await page.click('#cot-visual-layer-lab [data-action="studio-tools"]');
  await page.waitForFunction(() => window.__COT_VISUAL_LAYER_LAB.r2.studioDockVisible === true, { timeout: 3000 });
  report.studioTools = await page.evaluate(() => {
    const panel = document.querySelector('#cot-visual-layer-lab').getBoundingClientRect();
    const dockNode = document.querySelector('.cot-studio .dock');
    const dock = dockNode.getBoundingClientRect();
    const button = document.querySelector('#cot-visual-layer-lab [data-action="studio-tools"]');
    return {
      dockDisplay: getComputedStyle(dockNode).display,
      panel: { left: panel.left, right: panel.right },
      dock: { left: dock.left, right: dock.right },
      pressed: button.getAttribute('aria-pressed'),
    };
  });
  await capture(page, '04-desktop-studio-tools.png');
  await page.click('#cot-visual-layer-lab [data-action="studio-tools"]');
  await page.waitForFunction(() => window.__COT_VISUAL_LAYER_LAB.r2.studioDockVisible === false, { timeout: 3000 });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.waitForFunction(() => innerWidth === 390 && innerHeight === 844, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  await page.evaluate(() => window.__COT_VISUAL_LAYER_LAB.setStage(4));
  report.mobile = await page.evaluate(() => {
    const panel = document.querySelector('#cot-visual-layer-lab');
    const rect = panel.getBoundingClientRect();
    const buttons = [...panel.querySelectorAll('.vl-controls button')].map((button) => {
      const bounds = button.getBoundingClientRect();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    });
    return {
      timeOrigin: performance.timeOrigin,
      viewport: { width: innerWidth, height: innerHeight },
      panel: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      buttons,
      dockDisplay: getComputedStyle(document.querySelector('.cot-studio .dock')).display,
    };
  });
  await capture(page, '05-mobile-post.png');

  await page.setViewport({ width: 1000, height: 720, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(
    () => innerWidth === 1000 && window.__COT_VISUAL_LAYER_LAB?.r2?.reduceMotion === true,
    { timeout: 5000 },
  );
  report.reducedMotion = await page.evaluate(() => {
    const lab = window.__COT_VISUAL_LAYER_LAB;
    lab.toggleAuto();
    const style = getComputedStyle(document.querySelector('#cot-visual-layer-lab'));
    const result = {
      timeOrigin: performance.timeOrigin,
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      reduceMotion: lab.r2.reduceMotion,
      autoPlaying: lab.autoPlaying,
      intervalMs: lab.r2.autoIntervalMs,
      backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
    };
    lab.toggleAuto();
    result.autoStopped = lab.autoPlaying === false;
    return result;
  });

  fullPage = await browser.newPage();
  watchConsole(fullPage, 'full-demo-contract');
  await fullPage.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
  await fullPage.goto(report.fullDemoUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await fullPage.waitForFunction(() => Boolean(window.__COT_CAPABILITY_SHOWCASE), { timeout: 30000, polling: 100 });
  report.fullDemoContract = await fullPage.evaluate(() => {
    const controller = window.__COT_CAPABILITY_SHOWCASE;
    const effectTypes = [...new Set(controller.scene.effects.map((effect) => effect.type))].sort();
    return {
      hasLabScene: Object.hasOwn(controller, 'labScene'),
      actorNames: controller.scene.actors.map((actor) => actor.name),
      effectCount: controller.scene.effects.length,
      effectTypeCount: effectTypes.length,
      missingRequiredTypes: controller.requiredEffectTypes.filter((type) => !effectTypes.includes(type)),
      actorTracks: controller.scene.storyboard.actorTracks.length,
      shots: controller.scene.storyboard.shots.length,
      reloadName: controller.reload.name,
      labPanel: Boolean(document.querySelector('#cot-visual-layer-lab')),
      labInstalled: Boolean(window.__COT_VISUAL_LAYER_LAB),
    };
  });
  await fullPage.close();
  fullPage = null;

  const stageContract = report.stageRows.every((row, index) => {
    const expected = expectedStages[index];
    const audit = row.audit;
    const expectedActive = expectedStages.slice(0, index + 1).map((stage) => stage.id);
    const diagnosticMaterial = index === 0
      ? sameJson(audit.materialKinds, ['MeshNormalMaterial'])
      : index === 1
        ? sameJson(audit.materialKinds, ['MeshBasicMaterial'])
        : true;
    return audit.stageId === expected.id
      && audit.stageIndex === index
      && sameJson(audit.activeLayers, expectedActive)
      && audit.materialMode === expected.material
      && audit.worldVisible === expected.world
      && audit.shadowsEnabled === expected.shadow
      && audit.postEnabled === expected.post
      && audit.fxVisible === expected.fx
      && audit.heroMeshCount > 0
      && row.canvasStage === expected.id
      && row.resident.stageIndex === index
      && row.resident.timeMs === (index < 5 ? 0 : index === 5 ? 11800 : 15000)
      && diagnosticMaterial;
  });

  report.checks = {
    deterministicPreload: report.preloadContract.version === 8
      && report.preloadContract.mode === 'single-hero-readable-fx'
      && report.preloadContract.actorCount === 1
      && sameJson(report.preloadContract.actorNames, ['red-lead'])
      && report.preloadContract.effectCount === 16
      && report.preloadContract.missingRequiredTypes.length === 0
      && sameJson(report.preloadContract.actorAnchors, ['red-lead'])
      && sameJson(report.preloadContract.trackActors, ['red-lead'])
      && sameJson(report.preloadContract.heroPosition, [30, -82])
      && report.preloadContract.reloadName === 'reloadLayerLabScene'
      && report.preloadContract.playbackLocked === true,
    fullCapabilityPreservedInMetadata: report.preloadContract.originalFullCounts.actors === 4
      && report.preloadContract.originalFullCounts.effects === 25
      && report.preloadContract.originalFullCounts.effectTypes === 17,
    playbackStable: stableBefore.timeMs === 0
      && stableAfter.timeMs === 0
      && stableBefore.stageIndex === 0
      && stableAfter.stageIndex === 0
      && sameJson(stableBefore.actor, stableAfter.actor)
      && sameJson(stableBefore.camera, stableAfter.camera),
    singleHeroRuntime: sameJson(report.desktopDefault.actorNames, ['red-lead'])
      && sameJson(report.desktopDefault.visibleActors, ['red-lead'])
      && report.desktopDefault.rememberedMeshes > 0,
    flatHeroPlacement: Math.abs(report.desktopDefault.actorPose.x - 30) < 0.05
      && Math.abs(report.desktopDefault.actorPose.z + 82) < 0.05
      && Math.hypot(report.desktopDefault.actorPose.pitch, report.desktopDefault.actorPose.roll) < 0.08
      && report.desktopDefault.nearbyObstacles === 0,
    neutralGround: report.desktopDefault.ground?.visible === true
      && report.desktopDefault.ground?.plane === true
      && report.desktopDefault.ground?.grid === true,
    atmosphereHidden: report.desktopDefault.atmosphere.length >= 1
      && report.desktopDefault.atmosphere.every((item) => item.visible === false),
    cleanStage: report.desktopDefault.dockDisplay === 'none'
      && report.desktopDefault.directorDisplay === 'none'
      && report.desktopDefault.panel.width <= 365,
    sevenLayerContract: stageContract,
    cameraPairs: report.cameraConsistency.inspection && report.cameraConsistency.cinematic,
    fxLayerVisible: report.stageRows[6].visibleFxObjects > 0,
    compareRoundTrip: report.compare.previous.audit.stageId === 'environment'
      && report.compare.previous.compareBase === 4
      && report.compare.previous.pressed === 'true'
      && report.compare.returned.audit.stageId === 'post'
      && report.compare.returned.compareBase === null
      && report.compare.returned.pressed === 'false',
    keyboardJourney: report.keyboard.compareBase === 1
      && report.keyboard.returnedBase === null
      && report.keyboard.stageId === 'materials'
      && report.keyboard.autoOn === true
      && report.keyboard.autoOff === false
      && ['ArrowRight', 'KeyB', 'Space'].every((code) => report.keyboard.events.includes(code)),
    studioToolsForeground: report.studioTools.dockDisplay !== 'none'
      && report.studioTools.pressed === 'true'
      && report.studioTools.panel.right <= report.studioTools.dock.left + 1,
    mobileSheet: report.mobile.panel.bottom <= 844
      && report.mobile.panel.top >= 422
      && report.mobile.panel.left >= 0
      && report.mobile.panel.right <= 390
      && report.mobile.buttons.length === 5
      && report.mobile.buttons.every((button) => button.left >= 0 && button.right <= 390 && button.bottom <= 844)
      && report.mobile.dockDisplay === 'none',
    reducedMotion: report.reducedMotion.matches === true
      && report.reducedMotion.reduceMotion === true
      && report.reducedMotion.autoPlaying === true
      && report.reducedMotion.intervalMs === 5200
      && report.reducedMotion.backdropFilter === 'none'
      && report.reducedMotion.autoStopped === true,
    singleLabDocument: report.desktopDefault.timeOrigin === report.mobile.timeOrigin
      && report.mobile.timeOrigin === report.reducedMotion.timeOrigin,
    fullDemoUnaffected: report.fullDemoContract.hasLabScene === false
      && sameJson(report.fullDemoContract.actorNames, ['red-lead', 'blue-lead', 'support', 'old-wreck'])
      && report.fullDemoContract.effectCount === 25
      && report.fullDemoContract.effectTypeCount === 17
      && report.fullDemoContract.missingRequiredTypes.length === 0
      && report.fullDemoContract.actorTracks === 3
      && report.fullDemoContract.shots === 6
      && report.fullDemoContract.reloadName === 'reload'
      && report.fullDemoContract.labPanel === false
      && report.fullDemoContract.labInstalled === false,
    evidenceBounded: report.screenshots.length === 5,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.result = Object.values(report.checks).every(Boolean) ? 'pass' : 'fail';
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  report.diagnostics = await page?.evaluate(() => ({
    gameReady: window.__GAME_READY,
    controller: window.__COT_CAPABILITY_SHOWCASE ? {
      status: window.__COT_CAPABILITY_SHOWCASE.status,
      error: window.__COT_CAPABILITY_SHOWCASE.error || null,
      labScene: window.__COT_CAPABILITY_SHOWCASE.labScene || null,
      actors: window.__COT_CAPABILITY_SHOWCASE.scene?.actors?.length,
    } : null,
    lab: window.__COT_VISUAL_LAYER_LAB ? {
      status: window.__COT_VISUAL_LAYER_LAB.status,
      error: window.__COT_VISUAL_LAYER_LAB.error || null,
      stageIndex: window.__COT_VISUAL_LAYER_LAB.stageIndex,
    } : null,
  })).catch(() => null);
  await page?.screenshot({ path: resolve(outDir, 'failure.png') }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fullPage?.close().catch(() => {});
  await browser.close();
}

console.log(JSON.stringify({
  result: report.result,
  readyMs: report.desktopReadyMs,
  checks: report.checks,
  consoleErrors: report.consoleErrors,
  stageTransitions: report.stageRows?.map((row, index) => ({ stage: expectedStages[index].id, elapsedMs: row.elapsedMs })),
  error: report.error,
}, null, 2));
if (report.result !== 'pass') process.exitCode = 1;
