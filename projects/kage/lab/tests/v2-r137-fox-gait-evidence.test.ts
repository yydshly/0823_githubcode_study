import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertV3RegistrationMatchesRun,
  createV3VerifiedDeliveryRegistration,
  evaluateV3DirectCreativeArchiveEligibility,
  v3VerifiedDeliveryRegistrationSchema,
} from '../src/v2/direct-creative-v3-archive-gate.ts';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible,
} from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';

const deliveryId = 'fox-gait-observatory';
const runId = 'direct-r137-fox-gait-observatory';
const expectedBundleHash = '7b234dd7c3d49d642a974b7e6797fb47d14967f9a9f34b6d1c93664b1c9f83e6';
const expectedModelHash = 'd97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7';
const modelFile = 'assets/Fox.glb';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r137-fox-gait-observatory.direct-creative-run.json');
const reportPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r137-fox-gait-observatory', 'report.json');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'asset-manifest.json',
  'MODEL-CREDITS.md',
  'CONTRACT.md',
  modelFile,
];
const checkpointOrder = [
  'desktop-opening',
  'desktop-gait-inputs',
  'desktop-orbit-saved',
  'mobile-reduced',
  'fallback-complete',
];
const captures = [
  '01-desktop-opening.png',
  '02-desktop-gait-inputs.png',
  '03-desktop-orbit-saved.png',
  '04-mobile-reduced.png',
  '05-fallback-complete.png',
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

function parseGlb(bytes: Buffer): {
  version: number;
  declaredLength: number;
  json: any;
  binaryLength: number;
} {
  expect(bytes.toString('ascii', 0, 4)).toBe('glTF');
  const version = bytes.readUInt32LE(4);
  const declaredLength = bytes.readUInt32LE(8);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
  const jsonEnd = 20 + jsonLength;
  const json = JSON.parse(bytes.subarray(20, jsonEnd).toString('utf8').trimEnd());
  const binaryLength = bytes.readUInt32LE(jsonEnd);
  expect(bytes.readUInt32LE(jsonEnd + 4)).toBe(0x004e4942);
  expect(jsonEnd + 8 + binaryLength).toBe(bytes.length);
  return { version, declaredLength, json, binaryLength };
}

function report(): any {
  return JSON.parse(readFileSync(reportPath, 'utf8'));
}

describe('R137 Fox gait observatory final truth and evidence', () => {
  it('freezes the exact official Fox GLB bytes, structure, named clips and license provenance', () => {
    const bytes = readFileSync(resolve(sourceRoot, modelFile));
    const parsed = parseGlb(bytes);
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const credits = readFileSync(resolve(sourceRoot, 'MODEL-CREDITS.md'), 'utf8');
    const contract = readFileSync(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');

    expect(bytes.byteLength).toBe(162_852);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedModelHash);
    expect(parsed).toMatchObject({ version: 2, declaredLength: 162_852 });
    expect(parsed.json).toMatchObject({
      asset: { version: '2.0', copyright: expect.stringContaining('CC-BY 4.0') },
      scene: 0,
    });
    expect(parsed.json.scenes).toHaveLength(1);
    expect(parsed.json.nodes).toHaveLength(26);
    expect(parsed.json.meshes).toHaveLength(1);
    expect(parsed.json.meshes[0].primitives).toHaveLength(1);
    expect(parsed.json.skins).toHaveLength(1);
    expect(parsed.json.materials).toHaveLength(1);
    expect(parsed.json.textures).toHaveLength(1);
    expect(parsed.json.images).toHaveLength(1);
    expect(parsed.json.animations.map((animation: any) => ({
      name: animation.name,
      channels: animation.channels.length,
      samplers: animation.samplers.length,
    }))).toEqual([
      { name: 'Survey', channels: 21, samplers: 21 },
      { name: 'Walk', channels: 21, samplers: 21 },
      { name: 'Run', channels: 21, samplers: 21 },
    ]);
    for (const credit of ['PixelMannen', '@tomkranis', '@AsoboStudio', '@scurest']) {
      expect(parsed.json.asset.copyright).toContain(credit);
    }

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      deliveryId,
      batchId: 'r137-fox-official-single-model',
      assetBatches: 1,
      assets: [{
        id: 'khronos-fox-glb',
        path: modelFile,
        kind: 'model-3d',
        mimeType: 'model/gltf-binary',
        bytes: 162_852,
        sha256: expectedModelHash,
        quality: 'L3-presentable',
        budgetTier: 'A1',
        inspection: {
          scenes: 1,
          nodes: 26,
          meshes: 1,
          primitives: 1,
          skins: 1,
          animations: ['Survey', 'Walk', 'Run'],
        },
        source: {
          type: 'licensed',
          provider: 'KhronosGroup glTF-Sample-Assets',
          url: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox',
          downloadUrl: expect.stringMatching(/Models\/Fox\/glTF-Binary\/Fox\.glb$/),
        },
        license: { spdx: 'CC0-1.0 AND CC-BY-4.0' },
      }],
    });
    expect(credits).toContain('unchanged copy of the official binary glTF download');
    expect(credits).toContain('does not present those animation cycles as field measurements');
    expect(contract).toContain('宏结构为 `spatial-inspection`');
    expect(contract).toContain('不得把模型缩成装饰图标或在切换动作时替换成图片');
    expect(contract).toContain('模型动作演示，不是野外测量数据');
    expect(html).toContain('Khronos Fox GLB · CC0 / CC BY 4.0');
    expect(html).toContain('模型动作演示 · 不是野外测量数据');
    expect(main).toContain("new URL('./assets/Fox.glb', import.meta.url)");
    expect(main).toContain('THREE.AnimationClip.findByName(gltf.animations, gait.clip)');
    expect(main).toContain('mixer.clipAction(clip)');
  });

  it('binds the final run and report to the complete page, model, manifest, credits and contract bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const browser = report();

    expect(bundleHash()).toBe(expectedBundleHash);
    expect(browser).toMatchObject({
      schemaVersion: 1,
      stage: 'r137-fox-gait-observatory-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedBundleHash,
      bundleFiles,
      route: '/pages/v2/deliveries/fox-gait-observatory/',
      revision: 'r137-proof',
      complete: true,
      captures,
    });
    expect(browser.observations.map((item: any) => item.checkpoint)).toEqual(checkpointOrder);
    expect(browser.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      stopReason: null,
      finalCandidate: { runId, bundleHash: expectedBundleHash },
      selectedDirection: { experienceForm: 'spatial-inspection' },
      mediumDecision: { preferred: 'threejs-spatial' },
      assetPlan: {
        strategy: 'licensed',
        assets: [{ id: 'animated-spatial-model', source: 'licensed', required: true }],
      },
      interactionRationale: { mode: 'direct', audioApplicable: false },
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
  });

  it('proves the model cold-arrival separately from the sub-five-second hero shell', () => {
    const browser = report();
    const opening = browser.observations.find((item: any) => item.checkpoint === 'desktop-opening');

    expect(opening.heroVisibleAtMs).toBeLessThanOrEqual(5_000);
    expect(opening.readyAtMs).toBeGreaterThan(opening.heroVisibleAtMs);
    expect(opening.readyAtMs).toBeLessThanOrEqual(15_000);
    expect(opening.state).toMatchObject({
      activeGait: 'survey',
      clip: 'Survey',
      modelLoaded: true,
      sceneReady: true,
      fallback: false,
      saved: false,
      reducedMotion: false,
      horizontalOverflow: 0,
      canvasVisible: true,
      activeButton: 'survey',
    });
    expect(opening.modelResponses).toEqual([expect.objectContaining({
      status: 200,
      bytes: 162_852,
      url: expect.stringContaining('/fox-gait-observatory/assets/Fox.glb'),
    })]);

    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    expect(run.adaptiveEvidence?.visualQuality.findings).toContainEqual(expect.objectContaining({
      code: 'cold-dev-model-readiness',
      severity: 'minor',
      message: expect.stringContaining(`${opening.readyAtMs}ms`),
    }));
  });

  it('proves all named gait inputs, orbit, wheel, persistence, mobile and honest fallback', () => {
    const browser = report();
    const gaitInputs = browser.observations.find((item: any) => item.checkpoint === 'desktop-gait-inputs');
    const orbitSaved = browser.observations.find((item: any) => item.checkpoint === 'desktop-orbit-saved');
    const mobile = browser.observations.find((item: any) => item.checkpoint === 'mobile-reduced');
    const fallback = browser.observations.find((item: any) => item.checkpoint === 'fallback-complete');

    expect(gaitInputs.gaits).toMatchObject({
      survey: { activeGait: 'survey', clip: 'Survey', activeButton: 'survey', title: '先让耳朵抵达。', trailRhythm: '短距 · 停驻' },
      walk: { activeGait: 'walk', clip: 'Walk', activeButton: 'walk', title: '让路径变得可读。', trailRhythm: '等距 · 交替' },
      run: { activeGait: 'run', clip: 'Run', activeButton: 'run', title: '把身体交给前方。', trailRhythm: '长距 · 伸展' },
      arrowWalk: { activeGait: 'walk', clip: 'Walk', activeButton: 'walk' },
      keyboardSurvey: { activeGait: 'survey', clip: 'Survey', activeButton: 'survey' },
    });
    expect(orbitSaved.orbitCanvasHashes.before).not.toBe(orbitSaved.orbitCanvasHashes.after);
    expect(orbitSaved.wheelCanvasHashes.before).not.toBe(orbitSaved.wheelCanvasHashes.after);
    expect(orbitSaved.persistence).toMatchObject({
      storageKey: 'r137-fox-gait-observation-card',
      valueBeforeReload: 'run',
      valueAfterReload: 'run',
      beforeReload: { activeGait: 'run', clip: 'Run', saved: true },
      afterReload: { activeGait: 'run', clip: 'Run', saved: true },
    });

    expect(mobile).toMatchObject({
      viewport: { width: 390, height: 844 },
      inputs: {
        walk: { activeGait: 'walk', clip: 'Walk', reducedMotion: true },
        run: { activeGait: 'run', clip: 'Run', reducedMotion: true },
      },
      state: { modelLoaded: true, sceneReady: true, fallback: false, horizontalOverflow: 0 },
    });
    expect(mobile.buttonBoxes).toHaveLength(3);
    expect(mobile.buttonBoxes.every((box: any) => box.left >= 0 && box.right <= 390)).toBe(true);

    expect(fallback).toMatchObject({
      modelRequests: [],
      inputs: {
        walk: { activeGait: 'walk', clip: 'Walk', modelLoaded: false, fallback: true },
        run: { activeGait: 'run', clip: 'Run', modelLoaded: false, fallback: true },
      },
      state: {
        activeGait: 'run',
        clip: 'Run',
        modelLoaded: false,
        sceneReady: false,
        fallback: true,
        saved: true,
        canvasVisible: false,
        horizontalOverflow: 0,
      },
    });
  });

  it('passes final quality, immersive WowGate and matches the single V3 registry and homepage entry', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = { runId, bundleHash: expectedBundleHash };

    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null,
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 92 });
    expect(run.wowEvidence?.assessment).toMatchObject({ required: true, verdict: 'pass', score: 91 });
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
      route: './deliveries/fox-gait-observatory/',
      evidencePath: 'docs/v2-research/evidence/r137-fox-gait-observatory.direct-creative-run.json',
      run,
    });
    expect(v3VerifiedDeliveryRegistrationSchema.parse(registration)).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/fox-gait-observatory/',
      evidencePath: 'docs/v2-research/evidence/r137-fox-gait-observatory.direct-creative-run.json',
      runId,
      bundleHash: expectedBundleHash,
      macroStructure: 'spatial-inspection',
      mediumRoute: 'threejs-spatial',
      renderingMedium: 'threejs-3d',
    });
    expect(assertV3RegistrationMatchesRun(registration, run).id).toBe(runId);

    const registered = V3_VERIFIED_DELIVERIES.filter((item) => item.deliveryId === deliveryId);
    expect(registered).toHaveLength(1);
    expect(registered[0]).toEqual(registration);

    const home = readFileSync(resolve(process.cwd(), 'pages', 'v2', 'index.html'), 'utf8');
    expect(home.match(/data-v3-archive-id="fox-gait-observatory"/g)).toHaveLength(1);
    expect(home).toContain(`data-run-id="${runId}"`);
    expect(home).toContain(`data-bundle-hash="${expectedBundleHash}"`);
    expect(home).toContain('./assets/verified-examples/fox-gait-observatory.png');
    expect(readFileSync(resolve(
      process.cwd(),
      'pages',
      'v2',
      'assets',
      'verified-examples',
      'fox-gait-observatory.png',
    )).byteLength).toBeGreaterThan(100_000);
  });
});
