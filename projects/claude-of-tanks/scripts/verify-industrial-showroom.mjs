import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const projectRoot = resolve(import.meta.dirname, '..');
const requireFromUpstream = createRequire(resolve(projectRoot, 'upstream/package.json'));
const puppeteer = requireFromUpstream('puppeteer');

const baseUrl = process.argv.find((arg) => arg.startsWith('http')) || 'http://127.0.0.1:4174';
const showroomRoute = '/studio?map=desert&showcase=industrial-showroom&nogate=1';
const labRoute = '/studio?map=desert&showcase=capabilities&lab=layers&nogate=1';
const fullRoute = '/studio?map=desert&showcase=capabilities&nogate=1';
const outDir = resolve(projectRoot, 'evidence/industrial-showroom-final');
const MAX_SCREENSHOTS = 6;
const EXPECTED_SUBJECT_ID = 'atlas-inspection-rover';
const EXPECTED_SUBJECT_KIND = 'industrial-equipment';
const EXPECTED_VARIANTS = ['graphite-field', 'rescue-orange', 'arctic-service'];
const EXPECTED_HOTSPOTS = ['sensor-system', 'energy-module', 'all-terrain-drive'];
const MODEL_ASSET_RE = /\.(?:glb|gltf|fbx|obj|vrm)(?:$|[?#])/i;
const GUARD_METADATA_FIXTURE_URL = 'https://api.github.com/repos/Kevin-Liu-01/claude-of-tanks';
const SUCCESS_SCREENSHOTS = [
  '01-desktop-overview.png',
  '02-desktop-material-rescue-orange.png',
  '03-desktop-hotspot-sensor-system.png',
  '04-desktop-hotspot-all-terrain-drive.png',
  '05-mobile-touch-sensor-system.png',
];

mkdirSync(outDir, { recursive: true });
for (const filename of [...SUCCESS_SCREENSHOTS, 'failure.png']) {
  rmSync(resolve(outDir, filename), { force: true });
}

const report = {
  url: `${baseUrl}${showroomRoute}`,
  labUrl: `${baseUrl}${labRoute}`,
  fullDemoUrl: `${baseUrl}${fullRoute}`,
  startedAt: new Date().toISOString(),
  result: 'running',
  consoleErrors: [],
  modelAssetRequests: [],
  screenshots: [],
  checks: {},
  guardNetworkFixture: {
    url: GUARD_METADATA_FIXTURE_URL,
    scope: 'lab/full guard page only; showroom requests remain unmodified',
    reason: 'Deterministic metadata fixture avoids external GitHub API rate-limit noise during isolation checks.',
    response: { status: 200, body: { stargazers_count: 77 } },
    hits: 0,
  },
};

let browser;
let page;
let guardPage;
let touchSession;

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameVector(a, b, epsilon = 0.02) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}

function cameraDirection(camera) {
  if (!Array.isArray(camera?.pos) || !Array.isArray(camera?.lookAt)) return null;
  const direction = camera.lookAt.map((value, index) => value - camera.pos[index]);
  const length = Math.hypot(...direction);
  if (!Number.isFinite(length) || length <= 0.000001) return null;
  return direction.map((value) => value / length);
}

function sameCamera(a, b, epsilon = 0.02) {
  return Boolean(a && b)
    && sameVector(a.pos, b.pos, epsilon)
    && sameVector(cameraDirection(a), cameraDirection(b), epsilon)
    && Number.isFinite(a.fov)
    && Number.isFinite(b.fov)
    && Math.abs(a.fov - b.fov) <= epsilon;
}

function cameraKey(camera) {
  if (!camera) return null;
  return JSON.stringify({
    pos: camera.pos?.map((value) => Number(value.toFixed(3))),
    lookAt: camera.lookAt?.map((value) => Number(value.toFixed(3))),
    fov: Number(camera.fov?.toFixed?.(3)),
  });
}

function fingerprintKey(value) {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function zeroDurations(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  return value.split(',').every((part) => {
    const token = part.trim();
    if (token === 'none') return true;
    const numeric = Number.parseFloat(token);
    return Number.isFinite(numeric) && numeric === 0;
  });
}

function surfaceLabel(surface) {
  return typeof surface === 'function' ? surface() : surface;
}

function watchConsole(targetPage, surface) {
  targetPage.on('console', (message) => {
    if (message.type() !== 'error') return;
    report.consoleErrors.push({
      surface: surfaceLabel(surface),
      type: 'console',
      text: message.text(),
      location: message.location(),
    });
  });
  targetPage.on('pageerror', (error) => {
    report.consoleErrors.push({
      surface: surfaceLabel(surface),
      type: 'pageerror',
      text: String(error?.stack || error),
    });
  });
}

function watchModelRequests(targetPage) {
  targetPage.on('request', (request) => {
    const url = request.url();
    if (!MODEL_ASSET_RE.test(url)) return;
    report.modelAssetRequests.push({ url, resourceType: request.resourceType() });
  });
}

async function settleFrames(targetPage, count = 2) {
  await targetPage.evaluate((frameCount) => new Promise((resolveFrame) => {
    let remaining = Math.max(1, frameCount);
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolveFrame();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), count);
}

async function capture(targetPage, filename) {
  if (report.screenshots.length >= MAX_SCREENSHOTS) {
    throw new Error(`Screenshot budget exceeded before ${filename}`);
  }
  await settleFrames(targetPage, 2);
  await targetPage.screenshot({ path: resolve(outDir, filename) });
  report.screenshots.push(filename);
}

async function captureFailure() {
  for (const filename of report.screenshots) {
    rmSync(resolve(outDir, filename), { force: true });
  }
  report.screenshots = [];
  if (!page) return;
  const filename = 'failure.png';
  await page.screenshot({ path: resolve(outDir, filename) });
  report.screenshots.push(filename);
}

async function getShowroomSnapshot(targetPage) {
  return targetPage.evaluate(() => {
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    const panel = document.querySelector('#cot-industrial-showroom, [data-industrial-showroom]');
    if (!controller) {
      return {
        present: false,
        timeOrigin: performance.timeOrigin,
        panelPresent: Boolean(panel),
        capabilityInstalled: Boolean(window.__COT_CAPABILITY_SHOWCASE),
        labInstalled: Boolean(window.__COT_VISUAL_LAYER_LAB),
      };
    }

    const first = (...values) => values.find((value) => value !== undefined && value !== null);
    const vector = (value) => {
      if (Array.isArray(value)) return value.slice(0, 3).map(Number);
      if (value?.toArray) return value.toArray().slice(0, 3).map(Number);
      if (value && ['x', 'y', 'z'].every((key) => Number.isFinite(value[key]))) {
        return [value.x, value.y, value.z];
      }
      return null;
    };
    const normalizeCamera = (value, fallbackId = null) => {
      if (!value) return null;
      const camera = value.camera || value.pose || value;
      return {
        id: first(value.id, value.cameraPresetId, value.presetId, fallbackId),
        pos: vector(first(camera.pos, camera.position)),
        lookAt: vector(first(camera.lookAt, camera.target)),
        fov: Number(first(camera.fov, value.fov)),
      };
    };

    let publicState = {};
    let audit = {};
    let auditError = null;
    try {
      publicState = typeof controller.state === 'function' ? (controller.state() || {}) : (controller.state || {});
      audit = typeof controller.audit === 'function' ? (controller.audit() || {}) : {};
    } catch (error) {
      auditError = String(error?.stack || error);
    }
    const contract = first(controller.contract, audit.contract, {});
    const subject = first(audit.subject, publicState.subject, controller.subject, contract.subject, {});
    const provenance = first(audit.provenance, publicState.provenance, controller.provenance, contract.provenance, {});
    const variantSource = first(
      audit.materialVariants,
      publicState.materialVariants,
      controller.materialVariants,
      contract.materialVariants,
      [],
    );
    const hotspotSource = first(audit.hotspots, publicState.hotspots, controller.hotspots, contract.hotspots, []);
    const presetSource = first(
      audit.cameraPresets,
      publicState.cameraPresets,
      controller.cameraPresets,
      contract.cameraPresets,
      [],
    );
    const variants = Array.isArray(variantSource)
      ? variantSource.map((item) => typeof item === 'string'
        ? { id: item, label: item, targets: [] }
        : { id: item.id, label: item.label || item.id, targets: item.targets || item.meshes || [] })
      : [];
    const hotspots = Array.isArray(hotspotSource)
      ? hotspotSource.map((item) => typeof item === 'string'
        ? { id: item, label: item, targetPartId: null, cameraPresetId: item }
        : {
          id: item.id,
          label: item.label || item.id,
          targetPartId: first(item.targetPartId, item.partId, item.targetId),
          cameraPresetId: first(item.cameraPresetId, item.presetId, item.camera?.id, item.id),
        })
      : [];
    const cameraPresets = Array.isArray(presetSource)
      ? presetSource.map((item) => normalizeCamera(item, item?.id)).filter(Boolean)
      : [];
    let currentCamera = first(audit.camera, publicState.camera);
    if (!currentCamera && typeof controller.getCamera === 'function') {
      try {
        currentCamera = controller.getCamera();
      } catch {
        currentCamera = null;
      }
    }
    const motionSource = first(audit.motion, publicState.motion, controller.motion, {});
    const selectionDetail = document.querySelector(
      '#cot-industrial-showroom .is-detail, [data-hotspot-detail], [data-selection-detail], .showroom-detail, .industrial-showroom-detail',
    );
    const provenanceNode = document.querySelector(
      '#cot-industrial-showroom .is-proof, [data-provenance], .showroom-provenance, .industrial-showroom-provenance',
    );

    return {
      present: true,
      version: first(controller.version, contract.version, audit.version),
      status: first(controller.status, audit.status),
      error: first(controller.error, audit.error, null),
      auditError,
      timeOrigin: performance.timeOrigin,
      subject: {
        id: first(subject.id, audit.subjectId, publicState.subjectId, controller.subjectId),
        kind: first(subject.kind, subject.category, audit.subjectKind, contract.subjectKind),
        rootName: first(subject.rootName, audit.subjectRootName),
      },
      provenance: {
        origin: first(provenance.origin, provenance.kind, provenance.sourceKind),
        qualityClaim: first(provenance.qualityClaim, provenance.qualityLevel, provenance.quality),
        sourceModule: first(provenance.sourceModule, provenance.module, provenance.sourceFile),
        externalModelCount: first(provenance.externalModelCount, provenance.importedModelCount),
        generatedMeshCount: first(provenance.generatedMeshCount, provenance.meshCount),
      },
      variants,
      variantIds: variants.map((item) => item.id),
      hotspots,
      hotspotIds: hotspots.map((item) => item.id),
      cameraPresets,
      selectedSubjectId: first(
        audit.selectedSubjectId,
        publicState.selectedSubjectId,
        controller.selectedSubjectId,
      ),
      selectedPartId: first(audit.selectedPartId, publicState.selectedPartId, controller.selectedPartId),
      selectedVariantId: first(
        audit.selectedVariantId,
        publicState.selectedVariantId,
        controller.selectedVariantId,
      ),
      selectedHotspotId: first(
        audit.selectedHotspotId,
        publicState.selectedHotspotId,
        controller.selectedHotspotId,
      ),
      activeCameraPresetId: first(
        audit.activeCameraPresetId,
        publicState.activeCameraPresetId,
        controller.activeCameraPresetId,
      ),
      reducedMotion: first(
        audit.reducedMotion,
        publicState.reducedMotion,
        controller.reducedMotion,
      ),
      motion: {
        active: first(motionSource.active, motionSource.transitioning, audit.motionActive),
        durationMs: first(
          motionSource.durationMs,
          motionSource.transitionDurationMs,
          audit.transitionDurationMs,
        ),
        autoRotate: first(motionSource.autoRotate, audit.autoRotate, controller.autoRotate),
      },
      camera: normalizeCamera(currentCamera),
      materialFingerprint: first(
        audit.materialFingerprint,
        audit.materialSignature,
        publicState.materialFingerprint,
      ),
      renderedMeshCount: first(
        audit.renderedMeshCount,
        audit.meshCount,
        audit.subject?.meshCount,
        publicState.renderedMeshCount,
      ),
      tankActorCount: first(audit.tankActorCount, audit.vehicleActorCount, publicState.tankActorCount),
      subjectRootVisible: first(
        audit.subjectRootVisible,
        audit.subjectVisible,
        audit.subject?.visible,
        publicState.subjectRootVisible,
      ),
      panelPresent: Boolean(panel),
      panelText: panel?.textContent?.trim() || '',
      detailText: selectionDetail?.textContent?.trim() || '',
      provenanceText: provenanceNode?.textContent?.trim() || panel?.textContent?.trim() || '',
      capabilityInstalled: Boolean(window.__COT_CAPABILITY_SHOWCASE),
      labInstalled: Boolean(window.__COT_VISUAL_LAYER_LAB),
      labPanel: Boolean(document.querySelector('#cot-visual-layer-lab')),
      capabilityPanel: Boolean(document.querySelector('#cot-capability-director')),
    };
  });
}

function controlSelectors(kind, id) {
  if (kind === 'variant') {
    return [
      `#cot-industrial-showroom [data-variant="${id}"]`,
      `[data-industrial-showroom] [data-variant="${id}"]`,
      `#cot-industrial-showroom [data-variant-id="${id}"]`,
      `[data-industrial-showroom] [data-variant-id="${id}"]`,
      `[data-showroom-variant="${id}"]`,
      `[data-material-variant="${id}"]`,
    ];
  }
  return [
    `#cot-industrial-showroom [data-hotspot-card="${id}"]`,
    `#cot-industrial-hotspots [data-hotspot-marker="${id}"]`,
    `#cot-industrial-showroom [data-hotspot-id="${id}"]`,
    `[data-industrial-showroom] [data-hotspot-id="${id}"]`,
    `[data-showroom-hotspot="${id}"]`,
  ];
}

async function requireControl(targetPage, kind, id) {
  const selectors = controlSelectors(kind, id);
  const selector = await targetPage.evaluate((candidates) => candidates.find((candidate) => {
    const node = document.querySelector(candidate);
    return Boolean(node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
  }) || null, selectors);
  if (!selector) throw new Error(`Missing visible ${kind} control for ${id}: ${selectors.join(' | ')}`);
  return selector;
}

async function inspectControl(targetPage, selector) {
  return targetPage.$eval(selector, (node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      tagName: node.tagName,
      text: node.textContent?.trim() || '',
      tabIndex: node.tabIndex,
      disabled: Boolean(node.disabled),
      ariaPressed: node.getAttribute('aria-pressed'),
      visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      animationDuration: style.animationDuration,
      transitionDuration: style.transitionDuration,
    };
  });
}

async function waitForSelection(targetPage, kind, id, timeout = 10000) {
  await targetPage.waitForFunction(({ selectionKind, targetId }) => {
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    if (!controller) return false;
    let audit = {};
    let state = {};
    try {
      audit = typeof controller.audit === 'function' ? (controller.audit() || {}) : {};
      state = typeof controller.state === 'function' ? (controller.state() || {}) : (controller.state || {});
    } catch {
      return false;
    }
    const selected = selectionKind === 'variant'
      ? (audit.selectedVariantId ?? state.selectedVariantId ?? controller.selectedVariantId)
      : (audit.selectedHotspotId ?? state.selectedHotspotId ?? controller.selectedHotspotId);
    const motion = audit.motion ?? state.motion ?? controller.motion ?? {};
    return selected === targetId && motion.active !== true && motion.transitioning !== true;
  }, { timeout, polling: 50 }, { selectionKind: kind, targetId: id });
}

async function activateControl(targetPage, kind, id, input = 'pointer') {
  const selector = await requireControl(targetPage, kind, id);
  if (input === 'keyboard') {
    await targetPage.focus(selector);
    await targetPage.keyboard.press('Enter');
  } else {
    await targetPage.click(selector);
  }
  await waitForSelection(targetPage, kind, id);
  await settleFrames(targetPage, 2);
  return { selector, control: await inspectControl(targetPage, selector) };
}

async function waitForShowroomContract(targetPage) {
  await targetPage.waitForFunction(
    () => Boolean(window.__COT_INDUSTRIAL_SHOWROOM),
    { timeout: 30000, polling: 100 },
  );
  await targetPage.waitForFunction(() => {
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    if (!controller) return false;
    if (controller.status === 'error') return true;
    let audit = {};
    try {
      audit = typeof controller.audit === 'function' ? (controller.audit() || {}) : {};
    } catch {
      audit = {};
    }
    const contract = controller.contract || audit.contract || {};
    const subject = audit.subject || controller.subject || contract.subject || {};
    const variants = audit.materialVariants || controller.materialVariants || contract.materialVariants;
    const hotspots = audit.hotspots || controller.hotspots || contract.hotspots;
    const presets = audit.cameraPresets || controller.cameraPresets || contract.cameraPresets;
    return Boolean((subject.id || audit.subjectId || controller.subjectId)
      && Array.isArray(variants)
      && Array.isArray(hotspots)
      && Array.isArray(presets));
  }, { timeout: 30000, polling: 100 });
}

function preflightIssues(snapshot) {
  const issues = [];
  const variantIds = [...(snapshot?.variantIds || [])].sort();
  const hotspotIds = [...(snapshot?.hotspotIds || [])].sort();
  if (snapshot?.version !== 1) issues.push(`version=${snapshot?.version}; expected 1`);
  if (snapshot?.subject?.id !== EXPECTED_SUBJECT_ID) {
    issues.push(`subject.id=${snapshot?.subject?.id}; expected ${EXPECTED_SUBJECT_ID}`);
  }
  if (snapshot?.subject?.kind !== EXPECTED_SUBJECT_KIND) {
    issues.push(`subject.kind=${snapshot?.subject?.kind}; expected ${EXPECTED_SUBJECT_KIND}`);
  }
  if (!sameJson(variantIds, [...EXPECTED_VARIANTS].sort())) {
    issues.push(`variants=${JSON.stringify(variantIds)}; expected ${JSON.stringify(EXPECTED_VARIANTS)}`);
  }
  if (!sameJson(hotspotIds, [...EXPECTED_HOTSPOTS].sort())) {
    issues.push(`hotspots=${JSON.stringify(hotspotIds)}; expected ${JSON.stringify(EXPECTED_HOTSPOTS)}`);
  }
  if (snapshot?.cameraPresets?.length !== 3) {
    issues.push(`cameraPresets.length=${snapshot?.cameraPresets?.length}; expected 3`);
  }
  const presetIds = new Set(snapshot?.cameraPresets?.map((item) => item.id));
  for (const hotspot of snapshot?.hotspots || []) {
    if (!hotspot.targetPartId) issues.push(`hotspot ${hotspot.id} is missing targetPartId`);
    if (!presetIds.has(hotspot.cameraPresetId)) {
      issues.push(`hotspot ${hotspot.id} references missing camera preset ${hotspot.cameraPresetId}`);
    }
  }
  if (snapshot?.provenance?.origin !== 'procedural') {
    issues.push(`provenance.origin=${snapshot?.provenance?.origin}; expected procedural`);
  }
  if (snapshot?.provenance?.externalModelCount !== 0) {
    issues.push(`provenance.externalModelCount=${snapshot?.provenance?.externalModelCount}; expected 0`);
  }
  if (!/industrial[-_/ ]showroom/i.test(snapshot?.provenance?.sourceModule || '')) {
    issues.push(`provenance.sourceModule=${snapshot?.provenance?.sourceModule}; expected industrial-showroom module`);
  }
  if (!/(prototype|原型|l[12])/i.test(snapshot?.provenance?.qualityClaim || '')) {
    issues.push(`provenance.qualityClaim=${snapshot?.provenance?.qualityClaim}; expected prototype/L1/L2 claim`);
  }
  return issues;
}

try {
  browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-gl=angle', '--enable-webgl', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  let surface = 'showroom-desktop';
  page = await browser.newPage();
  watchConsole(page, () => surface);
  watchModelRequests(page);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const showroomStarted = performance.now();
  const showroomResponse = await page.goto(report.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  report.showroomHttpStatus = showroomResponse?.status() ?? null;
  await waitForShowroomContract(page);
  await page.waitForFunction(() => {
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    return controller?.status === 'ready' || controller?.status === 'error';
  }, { timeout: 300000, polling: 250 });
  report.desktop = await getShowroomSnapshot(page);
  if (report.desktop.status !== 'ready') {
    throw new Error(`Industrial showroom failed to become ready: ${JSON.stringify({
      status: report.desktop.status,
      error: report.desktop.error,
      auditError: report.desktop.auditError,
    })}`);
  }
  report.preflight = report.desktop;
  report.preflightIssues = preflightIssues(report.preflight);
  if (report.preflightIssues.length > 0) {
    throw new Error(`Industrial showroom preflight failed: ${report.preflightIssues.join('; ')}`);
  }
  report.showroomReadyMs = Math.round(performance.now() - showroomStarted);
  await capture(page, '01-desktop-overview.png');

  report.materialRows = [];
  for (const variantId of EXPECTED_VARIANTS) {
    const interaction = await activateControl(page, 'variant', variantId, 'pointer');
    const snapshot = await getShowroomSnapshot(page);
    report.materialRows.push({
      id: variantId,
      selectedVariantId: snapshot.selectedVariantId,
      fingerprint: snapshot.materialFingerprint,
      camera: snapshot.camera,
      control: interaction.control,
    });
    if (variantId === 'rescue-orange') await capture(page, '02-desktop-material-rescue-orange.png');
  }
  const materialReturnInteraction = await activateControl(page, 'variant', 'graphite-field', 'pointer');
  report.materialReturn = {
    snapshot: await getShowroomSnapshot(page),
    control: materialReturnInteraction.control,
  };

  report.hotspotRows = [];
  for (const hotspotId of EXPECTED_HOTSPOTS) {
    const interaction = await activateControl(page, 'hotspot', hotspotId, 'pointer');
    const snapshot = await getShowroomSnapshot(page);
    const hotspot = report.preflight.hotspots.find((item) => item.id === hotspotId);
    const preset = report.preflight.cameraPresets.find((item) => item.id === hotspot?.cameraPresetId);
    report.hotspotRows.push({
      id: hotspotId,
      hotspot,
      preset,
      selectedSubjectId: snapshot.selectedSubjectId,
      selectedPartId: snapshot.selectedPartId,
      selectedHotspotId: snapshot.selectedHotspotId,
      activeCameraPresetId: snapshot.activeCameraPresetId,
      camera: snapshot.camera,
      detailText: snapshot.detailText,
      control: interaction.control,
    });
    if (hotspotId === 'sensor-system') await capture(page, '03-desktop-hotspot-sensor-system.png');
    if (hotspotId === 'all-terrain-drive') await capture(page, '04-desktop-hotspot-all-terrain-drive.png');
  }

  const keyboardHotspotSelector = await requireControl(page, 'hotspot', 'energy-module');
  const keyboardVariantSelector = await requireControl(page, 'variant', 'rescue-orange');
  const keyboardHotspotControl = await inspectControl(page, keyboardHotspotSelector);
  const keyboardVariantControl = await inspectControl(page, keyboardVariantSelector);
  await page.keyboard.press('2');
  await waitForSelection(page, 'hotspot', 'energy-module');
  const afterKeyboardHotspot = await getShowroomSnapshot(page);
  await page.keyboard.press('v');
  await waitForSelection(page, 'variant', 'rescue-orange');
  const afterKeyboardVariant = await getShowroomSnapshot(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    if (!controller) return false;
    let audit = {};
    let state = {};
    try {
      audit = typeof controller.audit === 'function' ? (controller.audit() || {}) : {};
      state = typeof controller.state === 'function' ? (controller.state() || {}) : (controller.state || {});
    } catch {
      return false;
    }
    const selected = audit.selectedHotspotId ?? state.selectedHotspotId ?? controller.selectedHotspotId;
    return selected === null || selected === undefined || selected === 'overview';
  }, { timeout: 5000, polling: 50 });
  const afterEscape = await getShowroomSnapshot(page);
  report.keyboard = {
    hotspotSelector: keyboardHotspotSelector,
    variantSelector: keyboardVariantSelector,
    hotspotControl: keyboardHotspotControl,
    variantControl: keyboardVariantControl,
    afterHotspot: afterKeyboardHotspot,
    afterVariant: afterKeyboardVariant,
    afterEscape,
  };

  surface = 'showroom-mobile-touch';
  touchSession = await page.createCDPSession();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await touchSession.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
    configuration: 'mobile',
  });
  await page.waitForFunction(() => innerWidth === 390 && innerHeight === 844, { timeout: 5000 });
  await settleFrames(page, 2);

  const mobileSelectors = [];
  for (const id of EXPECTED_VARIANTS) mobileSelectors.push(await requireControl(page, 'variant', id));
  for (const id of EXPECTED_HOTSPOTS) mobileSelectors.push(await requireControl(page, 'hotspot', id));
  report.mobileLayout = await page.evaluate((selectors) => {
    const panel = document.querySelector('#cot-industrial-showroom, [data-industrial-showroom]');
    const panelRect = panel?.getBoundingClientRect();
    const canvas = document.querySelector('canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const controls = selectors.map((selector) => {
      const node = document.querySelector(selector);
      const rect = node?.getBoundingClientRect();
      return {
        selector,
        visible: Boolean(node && rect && rect.width > 0 && rect.height > 0),
        left: rect?.left ?? null,
        right: rect?.right ?? null,
        top: rect?.top ?? null,
        bottom: rect?.bottom ?? null,
        width: rect?.width ?? null,
        height: rect?.height ?? null,
      };
    });
    return {
      timeOrigin: performance.timeOrigin,
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      maxTouchPoints: navigator.maxTouchPoints,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      panel: panelRect ? {
        left: panelRect.left,
        right: panelRect.right,
        top: panelRect.top,
        bottom: panelRect.bottom,
        width: panelRect.width,
        height: panelRect.height,
      } : null,
      canvas: canvasRect ? {
        left: canvasRect.left,
        right: canvasRect.right,
        top: canvasRect.top,
        bottom: canvasRect.bottom,
        width: canvasRect.width,
        height: canvasRect.height,
      } : null,
      controls,
    };
  }, mobileSelectors);

  const mobileHotspotSelector = await requireControl(page, 'hotspot', 'sensor-system');
  const tapPoint = await page.$eval(mobileHotspotSelector, (node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.touchscreen.tap(tapPoint.x, tapPoint.y);
  await waitForSelection(page, 'hotspot', 'sensor-system');
  report.mobileSelection = await getShowroomSnapshot(page);
  await capture(page, '05-mobile-touch-sensor-system.png');

  surface = 'showroom-reduced-motion';
  await touchSession.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await page.setViewport({ width: 1000, height: 720, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.waitForFunction(() => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const controller = window.__COT_INDUSTRIAL_SHOWROOM;
    if (!controller) return false;
    let audit = {};
    let state = {};
    try {
      audit = typeof controller.audit === 'function' ? (controller.audit() || {}) : {};
      state = typeof controller.state === 'function' ? (controller.state() || {}) : (controller.state || {});
    } catch {
      return false;
    }
    return (audit.reducedMotion ?? state.reducedMotion ?? controller.reducedMotion) === true;
  }, { timeout: 5000, polling: 50 });
  const reducedStarted = performance.now();
  const reducedInteraction = await activateControl(page, 'hotspot', 'energy-module', 'pointer');
  const reducedReachedMs = Math.round(performance.now() - reducedStarted);
  const reducedFirst = await getShowroomSnapshot(page);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
  const reducedStable = await getShowroomSnapshot(page);
  const reducedStyles = await page.evaluate(() => {
    const nodes = [
      document.querySelector('#cot-industrial-showroom, [data-industrial-showroom]'),
      ...document.querySelectorAll(
        '[data-variant], [data-hotspot-card], [data-hotspot-marker], [data-variant-id], [data-hotspot-id]',
      ),
    ].filter(Boolean);
    return nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    });
  });
  report.reducedMotion = {
    timeOrigin: reducedFirst.timeOrigin,
    matches: await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    reachedMs: reducedReachedMs,
    first: reducedFirst,
    stable: reducedStable,
    control: reducedInteraction.control,
    styles: reducedStyles,
  };

  let guardSurface = 'lab-isolation-contract';
  guardPage = await browser.newPage();
  await guardPage.setRequestInterception(true);
  guardPage.on('request', async (request) => {
    try {
      if (request.url() === GUARD_METADATA_FIXTURE_URL) {
        report.guardNetworkFixture.hits += 1;
        await request.respond({
          status: 200,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': '*',
            'cache-control': 'no-store',
          },
          body: JSON.stringify(report.guardNetworkFixture.response.body),
        });
      } else {
        await request.continue();
      }
    } catch (error) {
      if (!request.isInterceptResolutionHandled()) {
        report.consoleErrors.push({
          surface: 'guard-network-fixture',
          type: 'fixture',
          text: String(error?.stack || error),
        });
      }
    }
  });
  watchConsole(guardPage, () => guardSurface);
  await guardPage.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
  const labResponse = await guardPage.goto(report.labUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  report.labHttpStatus = labResponse?.status() ?? null;
  await guardPage.waitForFunction(
    () => window.__COT_CAPABILITY_SHOWCASE?.labScene?.version === 8,
    { timeout: 30000, polling: 100 },
  );
  report.labGuard = await guardPage.evaluate(() => {
    const controller = window.__COT_CAPABILITY_SHOWCASE;
    const effectTypes = [...new Set(controller.scene.effects.map((effect) => effect.type))].sort();
    return {
      showroomInstalled: Boolean(window.__COT_INDUSTRIAL_SHOWROOM),
      showroomPanel: Boolean(document.querySelector('#cot-industrial-showroom, [data-industrial-showroom]')),
      labInstalled: Boolean(window.__COT_VISUAL_LAYER_LAB),
      labPanel: Boolean(document.querySelector('#cot-visual-layer-lab')),
      labSceneVersion: controller.labScene.version,
      labSceneMode: controller.labScene.mode,
      actorNames: controller.scene.actors.map((actor) => actor.name),
      actorCount: controller.scene.actors.length,
      effectCount: controller.scene.effects.length,
      missingRequiredTypes: controller.labScene.requiredEffectTypes.filter((type) => !effectTypes.includes(type)),
    };
  });

  guardSurface = 'full-demo-isolation-contract';
  const fullResponse = await guardPage.goto(report.fullDemoUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  report.fullDemoHttpStatus = fullResponse?.status() ?? null;
  await guardPage.waitForFunction(() => Boolean(window.__COT_CAPABILITY_SHOWCASE), { timeout: 30000, polling: 100 });
  report.fullDemoGuard = await guardPage.evaluate(() => {
    const controller = window.__COT_CAPABILITY_SHOWCASE;
    const effectTypes = [...new Set(controller.scene.effects.map((effect) => effect.type))].sort();
    return {
      showroomInstalled: Boolean(window.__COT_INDUSTRIAL_SHOWROOM),
      showroomPanel: Boolean(document.querySelector('#cot-industrial-showroom, [data-industrial-showroom]')),
      hasLabScene: Object.hasOwn(controller, 'labScene'),
      actorNames: controller.scene.actors.map((actor) => actor.name),
      effectCount: controller.scene.effects.length,
      effectTypeCount: effectTypes.length,
      missingRequiredTypes: controller.requiredEffectTypes.filter((type) => !effectTypes.includes(type)),
      actorTracks: controller.scene.storyboard.actorTracks.length,
      shots: controller.scene.storyboard.shots.length,
      labInstalled: Boolean(window.__COT_VISUAL_LAYER_LAB),
      labPanel: Boolean(document.querySelector('#cot-visual-layer-lab')),
    };
  });
  await guardPage.close();
  guardPage = null;

  const materialFingerprints = report.materialRows.map((row) => fingerprintKey(row.fingerprint));
  const hotspotCameraKeys = report.hotspotRows.map((row) => cameraKey(row.camera));
  const expectedVariantIds = [...EXPECTED_VARIANTS].sort();
  const expectedHotspotIds = [...EXPECTED_HOTSPOTS].sort();
  const provenanceText = report.desktop.provenanceText || '';

  report.checks = {
    showroomRouteReady: report.showroomHttpStatus === 200 && report.desktop.status === 'ready',
    expectedStaticContract: report.preflightIssues.length === 0
      && report.preflight.subject.id === EXPECTED_SUBJECT_ID
      && report.preflight.subject.kind === EXPECTED_SUBJECT_KIND
      && sameJson([...report.preflight.variantIds].sort(), expectedVariantIds)
      && sameJson([...report.preflight.hotspotIds].sort(), expectedHotspotIds)
      && report.preflight.cameraPresets.length === 3,
    nonTankSubject: report.desktop.subject.id === EXPECTED_SUBJECT_ID
      && report.desktop.subject.kind === EXPECTED_SUBJECT_KIND
      && report.desktop.tankActorCount === 0
      && report.desktop.subjectRootVisible === true
      && Number.isFinite(report.desktop.renderedMeshCount)
      && report.desktop.renderedMeshCount > 0,
    proceduralProvenance: report.desktop.provenance.origin === 'procedural'
      && report.desktop.provenance.externalModelCount === 0
      && Number.isFinite(report.desktop.provenance.generatedMeshCount)
      && report.desktop.provenance.generatedMeshCount > 0
      && report.desktop.provenance.generatedMeshCount === report.desktop.renderedMeshCount
      && /industrial[-_/ ]showroom/i.test(report.desktop.provenance.sourceModule || '')
      && /(prototype|原型|l[12])/i.test(report.desktop.provenance.qualityClaim || '')
      && /(?:procedural|程序化)/i.test(provenanceText)
      && /(?:prototype|原型|l1)/i.test(provenanceText)
      && report.modelAssetRequests.length === 0,
    materialVariants: report.materialRows.length === 3
      && report.materialRows.every((row) => row.selectedVariantId === row.id
        && row.control.visible === true
        && row.control.disabled === false
        && row.control.ariaPressed === 'true'
        && fingerprintKey(row.fingerprint) !== null)
      && new Set(materialFingerprints).size === 3
      && fingerprintKey(report.materialReturn.snapshot.materialFingerprint) === materialFingerprints[0]
      && report.materialReturn.snapshot.selectedVariantId === 'graphite-field'
      && report.materialReturn.control.ariaPressed === 'true',
    threeHotspotCameraPresets: report.hotspotRows.length === 3
      && report.hotspotRows.every((row) => row.selectedHotspotId === row.id
        && row.activeCameraPresetId === row.hotspot.cameraPresetId
        && row.control.visible === true
        && row.control.disabled === false
        && row.control.ariaPressed === 'true'
        && sameCamera(row.camera, row.preset))
      && new Set(hotspotCameraKeys).size === 3,
    pointerSelection: report.hotspotRows.every((row) => row.selectedSubjectId === EXPECTED_SUBJECT_ID
      && row.selectedPartId === row.hotspot.targetPartId
      && row.detailText.length > 0),
    keyboardJourney: report.keyboard.hotspotControl.tabIndex >= 0
      && report.keyboard.variantControl.tabIndex >= 0
      && report.keyboard.afterHotspot.selectedHotspotId === 'energy-module'
      && report.keyboard.afterVariant.selectedVariantId === 'rescue-orange'
      && [null, undefined, 'overview'].includes(report.keyboard.afterEscape.selectedHotspotId),
    mobileTouch: report.mobileLayout.viewport.width === 390
      && report.mobileLayout.viewport.height === 844
      && report.mobileLayout.scrollWidth <= 390
      && report.mobileLayout.maxTouchPoints >= 1
      && report.mobileLayout.coarsePointer === true
      && report.mobileLayout.panel?.left >= 0
      && report.mobileLayout.panel?.right <= 390
      && report.mobileLayout.panel?.top >= 0
      && report.mobileLayout.panel?.bottom <= 844
      && report.mobileLayout.canvas?.width > 0
      && report.mobileLayout.canvas?.height >= 844 * 0.45
      && report.mobileLayout.controls.length === 6
      && report.mobileLayout.controls.every((control) => control.visible
        && control.left >= 0 && control.right <= 390
        && control.top >= 0 && control.bottom <= 844
        && control.width >= 44 && control.height >= 44)
      && report.mobileSelection.selectedHotspotId === 'sensor-system'
      && report.mobileSelection.selectedSubjectId === EXPECTED_SUBJECT_ID,
    reducedMotion: report.reducedMotion.matches === true
      && report.reducedMotion.first.reducedMotion === true
      && report.reducedMotion.first.motion.durationMs === 0
      && report.reducedMotion.first.motion.autoRotate === false
      && report.reducedMotion.first.selectedHotspotId === 'energy-module'
      && report.reducedMotion.reachedMs <= 750
      && sameCamera(report.reducedMotion.first.camera, report.reducedMotion.stable.camera)
      && report.reducedMotion.styles.length >= 1
      && report.reducedMotion.styles.every((style) => zeroDurations(style.animationDuration)
        && zeroDurations(style.transitionDuration)),
    singleShowroomDocument: report.desktop.timeOrigin === report.mobileLayout.timeOrigin
      && report.mobileLayout.timeOrigin === report.reducedMotion.timeOrigin,
    showroomRouteIsolation: report.desktop.panelPresent === true
      && report.desktop.capabilityInstalled === false
      && report.desktop.labInstalled === false
      && report.desktop.labPanel === false
      && report.desktop.capabilityPanel === false,
    labRouteIsolation: report.labHttpStatus === 200
      && report.labGuard.showroomInstalled === false
      && report.labGuard.showroomPanel === false
      && report.labGuard.labSceneVersion === 8
      && report.labGuard.labSceneMode === 'single-hero-readable-fx'
      && report.labGuard.actorCount === 1
      && sameJson(report.labGuard.actorNames, ['red-lead'])
      && report.labGuard.effectCount === 16
      && report.labGuard.missingRequiredTypes.length === 0,
    fullDemoIsolation: report.fullDemoHttpStatus === 200
      && report.fullDemoGuard.showroomInstalled === false
      && report.fullDemoGuard.showroomPanel === false
      && report.fullDemoGuard.hasLabScene === false
      && sameJson(report.fullDemoGuard.actorNames, ['red-lead', 'blue-lead', 'support', 'old-wreck'])
      && report.fullDemoGuard.effectCount === 25
      && report.fullDemoGuard.effectTypeCount === 17
      && report.fullDemoGuard.missingRequiredTypes.length === 0
      && report.fullDemoGuard.actorTracks === 3
      && report.fullDemoGuard.shots === 6
      && report.fullDemoGuard.labInstalled === false
      && report.fullDemoGuard.labPanel === false,
    deterministicGuardMetadata: report.guardNetworkFixture.hits >= 1,
    evidenceBounded: sameJson(report.screenshots, SUCCESS_SCREENSHOTS)
      && report.screenshots.length === 5
      && report.screenshots.length <= MAX_SCREENSHOTS,
    noConsoleErrors: report.consoleErrors.length === 0,
  };
  report.result = Object.values(report.checks).every(Boolean) ? 'pass' : 'fail';
  if (report.result !== 'pass') {
    const failedChecks = Object.entries(report.checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    throw new Error(`Industrial showroom checks failed: ${failedChecks.join(', ')}`);
  }
} catch (error) {
  report.result = 'fail';
  report.error = String(error?.stack || error);
  report.diagnostics = await getShowroomSnapshot(page).catch(() => null);
  await captureFailure().catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await touchSession?.detach().catch(() => {});
  await guardPage?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

console.log(JSON.stringify({
  result: report.result,
  readyMs: report.showroomReadyMs,
  checks: report.checks,
  consoleErrors: report.consoleErrors,
  modelAssetRequests: report.modelAssetRequests,
  screenshots: report.screenshots,
  preflightIssues: report.preflightIssues,
  error: report.error,
}, null, 2));

if (report.result !== 'pass') process.exitCode = 1;
