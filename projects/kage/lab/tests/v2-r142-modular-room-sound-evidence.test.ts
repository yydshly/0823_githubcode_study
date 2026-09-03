import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertV3RegistrationMatchesRun,
  createV3VerifiedDeliveryRegistration,
  evaluateV3DirectCreativeArchiveEligibility,
  v3VerifiedDeliveryRegistrationSchema,
} from '../src/v2/direct-creative-v3-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const deliveryId = 'modular-room-sound';
const runId = 'direct-r142-modular-room-sound';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(
  process.cwd(),
  'docs',
  'v2-research',
  'evidence',
  'r142-modular-room-sound.direct-creative-run.json',
);
const evidenceDir = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r142-modular-room-sound');
const reportPath = resolve(evidenceDir, 'report.json');
const failedReportPath = resolve(evidenceDir, 'report.failed.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md', 'asset-manifest.json'];
const checkpointOrder = [
  'desktop-opening',
  'desktop-assembly-causality',
  'desktop-cutaway-audio-complete',
  'mobile-low-reduced',
  'webgl-fallback-complete',
  'audio-fallback-complete',
];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-assembly-causality.png',
  '03-desktop-cutaway-audio-complete.png',
  '04-mobile-low-reduced.png',
  '05-webgl-fallback-complete.png',
  '06-audio-fallback-complete.png',
];
const partNames = [
  'productRoot', 'leftModule', 'rightModule', 'bridge', 'drivers', 'bassChamber',
  'leftContact', 'rightContact', 'contacts', 'leftHook', 'rightHook', 'wallHooks',
  'frontCover', 'soundRoute',
];

function bundleHash(): string {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function report(): any {
  return JSON.parse(readFileSync(reportPath, 'utf8'));
}

function observation(browser: any, checkpoint: string): any {
  return browser.observations.find((item: any) => item.checkpoint === checkpoint);
}

function moduleDistance(candidate: any): number {
  const left = candidate.partPositions.leftModule;
  const right = candidate.partPositions.rightModule;
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}

describe('R142 modular room sound final truth and evidence', () => {
  it('freezes the single author-generated model batch, named topology and truthful concept boundary', () => {
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const contract = readFileSync(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const mainBytes = readFileSync(resolve(sourceRoot, 'main.ts'));
    const main = mainBytes.toString('utf8');
    const mainHash = createHash('sha256').update(mainBytes).digest('hex');

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      deliveryId,
      batchId: 'r142-author-generated-speaker-rig',
      assetBatches: 1,
      assets: [{
        id: 'author-generated-modular-speaker-rig',
        path: 'main.ts',
        kind: 'model-3d',
        mimeType: 'application/typescript',
        bytes: mainBytes.byteLength,
        sha256: mainHash,
        quality: 'L3-presentable',
        budgetTier: 'A1',
        inspection: {
          root: 'productRoot',
          poses: ['horizontal', 'split', 'wall'],
          namedParts: [
            'leftModule', 'rightModule', 'bridge', 'drivers', 'bassChamber', 'contacts',
            'wallHooks', 'frontCover', 'soundRoute',
          ],
          stateDriver: 'shared pose interpolation plus cutaway',
          renderer: 'Three.js WebGLRenderer',
        },
        source: {
          type: 'author-generated',
          provider: 'Codex direct creative run',
          provenanceRecord: 'pages/v2/deliveries/modular-room-sound/CONTRACT.md',
        },
        license: { name: 'Project-authored source; no external product asset' },
      }],
    });
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0].responsibility).toContain('三种装配姿态');
    expect(manifest.assets[0].runtimeBoundary).toContain('不是现实品牌');

    expect(contract).toContain('同一装配树的三个姿态');
    expect(contract).toContain('`cutaway` 只移开前盖');
    expect(contract).toContain('试听必须由用户手势启动');
    expect(contract).toContain('最终身份绑定 `runId + bundleHash`');
    expect(html).toContain('概念设计演示，不代表真实品牌与声学参数');
    expect(html).toContain('不是安装指导');
    expect(html).toContain('不是扬声器录音或真实房间测量');
    expect(css).toContain('touch-action: pan-y pinch-zoom');
    expect(main).toContain('createGeneratedThreeRuntime');
    expect(main).toContain('new OrbitControls(runtime.camera, canvas)');
    expect(main).toContain("canvas.addEventListener('webglcontextlost'");
    expect(main).toContain("addEventListener('pagehide', dispose");
    expect(main).toContain('window.__MODULAR_ROOM_SOUND__ =');
    expect(main).toContain('AudioContextConstructor');
  });

  it('keeps report.json and report.failed.json mutually exclusive and binds the exact five-file bundle', () => {
    expect(existsSync(reportPath)).toBe(true);
    expect(existsSync(failedReportPath)).toBe(false);
    const browser = report();
    const expectedHash = bundleHash();

    expect(browser).toMatchObject({
      schemaVersion: 1,
      stage: 'r142-modular-room-sound-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
      bundleFiles,
      route: '/pages/v2/deliveries/modular-room-sound/',
      revision: 'r142-proof',
      complete: true,
      captures,
    });
    expect(browser.observations.map((item: any) => item.checkpoint)).toEqual(checkpointOrder);
    expect(browser.observations).toHaveLength(6);
    expect(browser.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);
    expect(captures.every((capture) => readFileSync(resolve(evidenceDir, capture)).byteLength > 30_000)).toBe(true);
  });

  it('proves live WebGL, one causal assembly tree, native scroll, orbit, cutaway, audio and completion', () => {
    const browser = report();
    const opening = observation(browser, 'desktop-opening');
    const assembly = observation(browser, 'desktop-assembly-causality');
    const completion = observation(browser, 'desktop-cutaway-audio-complete');
    const { horizontal, split, wall } = assembly.assemblies;

    expect(opening.heroVisibleAtMs).toBeLessThanOrEqual(5_000);
    expect(opening.readyAtMs).toBeLessThanOrEqual(15_000);
    expect(opening.state).toMatchObject({
      ready: true,
      mode: 'horizontal',
      cutaway: false,
      audioState: 'idle',
      saved: false,
      booked: false,
      fallback: false,
      reducedMotion: false,
      quality: 'high',
      revision: 'r142-proof',
      hooksVisible: false,
      routeVisible: false,
      horizontalOverflow: false,
    });
    expect(opening.state.frames).toBeGreaterThan(2);
    expect(opening.state.drawCalls).toBeGreaterThan(0);
    expect(opening.state.triangles).toBeGreaterThan(1_000);
    expect(opening.state.pixelRatio).toBeGreaterThan(0);
    expect(opening.state.pixelRatio).toBeLessThanOrEqual(1.9);
    expect([...opening.partNames].sort()).toEqual([...partNames].sort());

    expect(horizontal.mode).toBe('horizontal');
    expect(split.mode).toBe('split');
    expect(wall.mode).toBe('wall');
    expect(moduleDistance(horizontal)).toBeCloseTo(1.92, 1);
    expect(moduleDistance(split)).toBeGreaterThan(3.45);
    expect(wall.partPositions.leftModule[1]).toBeGreaterThan(split.partPositions.leftModule[1] + 0.45);
    expect(wall.partPositions.rightModule[1]).toBeGreaterThan(split.partPositions.rightModule[1] + 0.55);
    expect(wall.hooksVisible).toBe(true);
    expect(new Set([
      horizontal.canvasVisualHash,
      split.canvasVisualHash,
      wall.canvasVisualHash,
    ]).size).toBe(3);
    expect(assembly.orbit).toMatchObject({ input: 'mouse-drag' });
    expect(assembly.orbit.canvasHashes.before).not.toBe(assembly.orbit.canvasHashes.after);
    expect(assembly.orbit.camera.before).not.toEqual(assembly.orbit.camera.after);
    expect(assembly.zoom).toMatchObject({ input: 'mouse-wheel' });
    expect(assembly.zoom.canvasHashes.before).not.toBe(assembly.zoom.canvasHashes.after);
    expect(assembly.zoom.camera.before.distance).not.toBe(assembly.zoom.camera.after.distance);
    expect(assembly.nativeScroll).toMatchObject({ input: 'mouse-wheel-over-chapter' });
    expect(assembly.nativeScroll.after).toBeGreaterThan(assembly.nativeScroll.before);

    expect(completion.beforeAudio).toMatchObject({ cutaway: false, audioState: 'idle', playing: false });
    expect(completion.cutaway).toMatchObject({ cutaway: true, hooksVisible: true, routeVisible: true });
    expect(completion.cutaway.coverOffset).toBeGreaterThan(2);
    expect(completion.audioStarted).toMatchObject({ audioState: 'playing', playing: true, routeVisible: true });
    expect(completion.completed).toMatchObject({ saved: true, booked: true, fallback: false });
    expect(completion.storage).toBe('{"saved":true,"booked":true}');
  });

  it('proves the complete 390px low/reduced journey and independent WebGL/audio failure boundaries', () => {
    const browser = report();
    const mobile = observation(browser, 'mobile-low-reduced');
    const webgl = observation(browser, 'webgl-fallback-complete');
    const audio = observation(browser, 'audio-fallback-complete');

    expect(mobile.viewport).toEqual({ width: 390, height: 844 });
    expect(mobile.inputs.split).toMatchObject({ mode: 'split', quality: 'low', reducedMotion: true, fallback: false });
    expect(mobile.inputs.wall).toMatchObject({ mode: 'wall', quality: 'low', reducedMotion: true, fallback: false, hooksVisible: true });
    expect(mobile.state).toMatchObject({
      cutaway: true,
      saved: true,
      booked: true,
      quality: 'low',
      reducedMotion: true,
      fallback: false,
      horizontalOverflow: false,
    });
    expect(mobile.state.pixelRatio).toBeGreaterThan(0);
    expect(mobile.state.pixelRatio).toBeLessThanOrEqual(1);
    expect(mobile.controlBoxes).toHaveLength(7);
    expect(mobile.controlBoxes.every((box: any) => (
      box.left >= -1 && box.right <= 391 && box.width >= 44 && box.height >= 44
    ))).toBe(true);

    for (const state of [webgl.inputs.split, webgl.inputs.wall, webgl.audioStarted, webgl.completed]) {
      expect(state).toMatchObject({ fallback: true, frames: 0, drawCalls: 0, triangles: 0, pixelRatio: 0 });
    }
    expect(webgl.inputs).toMatchObject({ split: { mode: 'split' }, wall: { mode: 'wall', hooksVisible: true } });
    expect(webgl.cutaway).toMatchObject({ cutaway: true, routeVisible: true, hooksVisible: true, fallback: true });
    expect(webgl.audioStarted).toMatchObject({ audioState: 'playing', playing: true, fallback: true });
    expect(webgl.completed).toMatchObject({ saved: true, booked: true, fallback: true });

    expect(audio.beforeInput).toMatchObject({ fallback: false, audioState: 'unavailable', playing: false });
    expect(audio.beforeInput.frames).toBeGreaterThan(2);
    expect(audio.beforeInput.drawCalls).toBeGreaterThan(0);
    expect(audio.beforeInput.triangles).toBeGreaterThan(1_000);
    expect(audio.unavailable).toMatchObject({ fallback: false, audioState: 'unavailable', playing: false });
    expect(audio.inputs.split).toMatchObject({ mode: 'split', fallback: false, audioState: 'unavailable' });
    expect(audio.inputs.cutaway).toMatchObject({ cutaway: true, routeVisible: true, audioState: 'unavailable' });
    expect(audio.completed).toMatchObject({ saved: true, booked: true, fallback: false, audioState: 'unavailable' });
  });

  it('finalizes one V3-eligible immersive run with exact identity and six adaptive checkpoints', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const expectedHash = bundleHash();
    const identity = { runId, bundleHash: expectedHash };

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      stopReason: null,
      finalCandidate: identity,
      selectedDirection: { experienceForm: 'spatial-inspection' },
      mediumDecision: { preferred: 'threejs-spatial' },
      assetPlan: {
        strategy: 'generated',
        assets: [{ id: 'hero-product', source: 'generated', required: true }],
      },
      interactionRationale: { mode: 'mixed', audioApplicable: true },
      visualAmbition: {
        intentLevel: 'immersive',
        rendering: { primary: 'threejs-3d', supporting: ['dom-css'] },
        spatialDepth: { mode: 'scene-3d' },
      },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 0,
          visualRefinements: 0,
        },
      },
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'scroll', 'interaction', 'audio',
    ]);
    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: true,
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 94 });
    expect(run.wowEvidence?.assessment).toMatchObject({ required: true, verdict: 'pass' });
    expect(run.wowEvidence!.assessment.score).toBeGreaterThanOrEqual(90);
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence!, identity)).toMatchObject({ archiveEligible: true });
    expect(evaluateWowGateEvidence(run.wowEvidence!, identity, run.visualAmbition!)).toMatchObject({ passed: true });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({
      eligible: true,
      wowPassed: true,
      mediumConsistent: true,
      reasons: [],
    });

    const registration = createV3VerifiedDeliveryRegistration({
      deliveryId,
      route: './deliveries/modular-room-sound/',
      evidencePath: 'docs/v2-research/evidence/r142-modular-room-sound.direct-creative-run.json',
      run,
    });
    expect(v3VerifiedDeliveryRegistrationSchema.parse(registration)).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/modular-room-sound/',
      evidencePath: 'docs/v2-research/evidence/r142-modular-room-sound.direct-creative-run.json',
      runId,
      bundleHash: expectedHash,
      macroStructure: 'spatial-inspection',
      mediumRoute: 'threejs-spatial',
      renderingMedium: 'threejs-3d',
    });
    expect(assertV3RegistrationMatchesRun(registration, run).id).toBe(runId);
  });
});
