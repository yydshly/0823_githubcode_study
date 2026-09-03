import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertV25DirectCreativeArchiveEligible } from '../src/v2/direct-creative-archive-gate.ts';
import {
  assertV3RegistrationMatchesRun,
  evaluateV3DirectCreativeArchiveEligibility,
} from '../src/v2/direct-creative-v3-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { V25_VERIFIED_DELIVERIES } from '../src/v2/v25-verified-deliveries.ts';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const runId = 'direct-r134-stormglass-archive';
const deliveryId = 'stormglass-archive';
const sourceRoot = new URL('../pages/v2/deliveries/stormglass-archive/', import.meta.url);
const contractPath = new URL('../docs/v2-research/V2-R134-STORMGLASS-ARCHIVE.md', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r134-stormglass-archive/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

describe('R134 stormglass-archive V3 bounded research evidence', () => {
  it('freezes one persistent WebGL scroll story instead of a workbench shell', () => {
    const contract = readFileSync(contractPath, 'utf8');
    const index = readFileSync(new URL('index.html', sourceRoot), 'utf8');
    const main = readFileSync(new URL('main.ts', sourceRoot), 'utf8');

    expect(contract).toContain('Visual ambition：Immersive');
    expect(contract).toContain('Experience architecture：Spatial Stage');
    expect(contract).toContain('dormant → gathering → branching → imprinted');
    expect(contract).toContain('艺术化模拟');
    expect(contract).toContain('最多两次确定性修复和一次基于浏览器证据的视觉精修');

    expect(index).toContain('data-experience="stormglass-archive"');
    expect(index).toContain('id="stormglass-canvas"');
    expect(index).toContain('data-signal-visual-anchor');
    expect(index).toContain('id="stormglass-fallback"');
    expect(index).toContain('id="save-imprint"');
    expect(index).toContain('data-signal-primary-action');
    expect(index).toContain('id="save-status"');
    expect(index).toContain('艺术化模拟');
    for (const state of ['dormant', 'gathering', 'branching', 'imprinted']) {
      expect(index).toContain(`data-scene="${state}"`);
    }
    expect(index).not.toMatch(/type=["']range["']/);
    expect(index).not.toContain('data-workbench');
    expect(main).toContain('__stormglassArchive');
    expect(main).toContain('setProgress');
    expect(main).toContain('saveImprint');
    expect(main).toContain('webglcontextlost');
  });

  it('binds adaptive browser proof to the exact three-file bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(run.finalCandidate).not.toBeNull();
    const identity = run.finalCandidate!;

    expect(identity).toMatchObject({ runId });
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r134-stormglass-archive-runtime-observations',
      identityBinding: 'runId+bundleHash',
      ...identity,
      route: '/pages/v2/deliveries/stormglass-archive/',
      revision: 'r134-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-branching.png',
      '03-desktop-imprint-saved.png',
      '04-mobile-reduced.png',
      '05-fallback-saved.png',
    ]);
    expect(report.observations).toHaveLength(5);
    for (const observation of report.observations) {
      expect(observation.issues).toEqual({
        pageErrors: [],
        consoleErrors: [],
        requestFailures: [],
        responseErrors: [],
      });
    }

    expect(report.observations[0]).toMatchObject({
      checkpoint: 'desktop-opening',
      viewport: { width: 1440, height: 900 },
      state: {
        ready: true,
        state: 'dormant',
        saved: false,
        fallback: false,
        reducedMotion: false,
        horizontalOverflow: false,
        quality: 'high',
        revision: 'r134-proof',
      },
    });
    expect(report.observations[0].readyAtMs).toBeLessThanOrEqual(4_500);
    expect(report.observations[0].state.frames).toBeGreaterThan(0);
    expect(report.observations[0].state.drawCalls).toBeGreaterThan(0);
    expect(report.observations[0].state.triangles).toBeGreaterThan(0);

    const scroll = report.observations[1];
    expect(scroll.checkpoint).toBe('desktop-wheel-journey');
    expect(scroll.semantic.stateSequence).toEqual(['dormant', 'gathering', 'branching', 'imprinted']);
    expect(scroll.semantic.actualWheelScrollDelta).toBeGreaterThan(900);
    expect(scroll.canvasPixelHashes).toHaveLength(4);
    expect(new Set(scroll.canvasPixelHashes).size).toBe(4);
    const { dormant, gathering, branching, imprinted } = scroll.states;
    expect(dormant.state).toBe('dormant');
    expect(gathering.state).toBe('gathering');
    expect(branching.state).toBe('branching');
    expect(imprinted.state).toBe('imprinted');
    expect(dormant.progress).toBeLessThan(gathering.progress);
    expect(gathering.progress).toBeLessThan(branching.progress);
    expect(branching.progress).toBeLessThan(imprinted.progress);
    expect(gathering.charge).toBeGreaterThan(dormant.charge + .04);
    expect(branching.crackGrowth).toBeGreaterThan(gathering.crackGrowth + .04);
    expect(imprinted.crackGrowth).toBeGreaterThanOrEqual(branching.crackGrowth);
    expect(Math.abs(branching.refraction - dormant.refraction)).toBeGreaterThan(.02);

    expect(report.observations[2]).toMatchObject({
      checkpoint: 'desktop-imprint-saved',
      state: { ready: true, state: 'imprinted', saved: true, fallback: false },
    });
    expect(report.observations[2].semantic.status).not.toBe('');
    expect(report.observations[2].semantic.focusedElement).toBe('save-imprint');
    expect(report.observations[3]).toMatchObject({
      checkpoint: 'mobile-reduced',
      viewport: { width: 390, height: 844 },
      state: {
        ready: true,
        state: 'imprinted',
        saved: true,
        fallback: false,
        reducedMotion: true,
        horizontalOverflow: false,
      },
      semantic: { stateSequence: ['dormant', 'gathering', 'branching', 'imprinted'] },
    });
    expect(report.observations[4]).toMatchObject({
      checkpoint: 'fallback-saved',
      state: {
        ready: true,
        state: 'imprinted',
        saved: true,
        fallback: true,
        reducedMotion: true,
        horizontalOverflow: false,
        drawCalls: 0,
        triangles: 0,
      },
      semantic: { fallbackVisible: true },
    });
  });

  it('registers a complete medium-bound V3 delivery without masquerading as V2.5', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = run.finalCandidate!;

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      selectedDirection: { experienceForm: 'persistent-webgl-scroll-story' },
      interactionRationale: { mode: 'mixed', audioApplicable: false },
      mediumDecision: {
        schemaVersion: 1,
        preferred: 'webgl-procedural',
      },
      assetPlan: {
        strategy: 'programmatic',
        assets: [
          expect.objectContaining({
            id: 'programmatic-runtime-visual',
            source: 'programmatic',
            required: true,
          }),
        ],
      },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 1,
          visualRefinements: 1,
        },
      },
    });
    expect(run.referencePrinciples.length).toBeGreaterThanOrEqual(1);
    expect(run.referencePrinciples.length).toBeLessThanOrEqual(3);
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null,
    });
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'spatial-journey',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'record-or-contribute',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass' });
    expect(run.adaptiveEvidence!.visualQuality.score).toBeGreaterThanOrEqual(90);
    expect(run.wowEvidence?.assessment).toMatchObject({ required: true, verdict: 'pass' });
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence, identity)).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      structurePassed: true,
      qualityPassed: true,
      archiveEligible: true,
    });
    expect(evaluateWowGateEvidence(run.wowEvidence, identity, run.visualAmbition!)).toMatchObject({
      identityValid: true,
      intentValid: true,
      passed: true,
    });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);

    expect(() => assertV25DirectCreativeArchiveEligible(run)).toThrow(
      'V2.5 新精选只接受 DirectCreativeRun protocol v2。',
    );
    expect(V25_VERIFIED_DELIVERIES.some((item) => item.deliveryId === deliveryId)).toBe(false);
    const registration = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);
    expect(registration).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/stormglass-archive/',
      evidencePath: 'docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
      runId,
      bundleHash: 'b518d1bcaeb0c4f4cba2267e29716337e1b1d07e09d1ab9006a704dace474591',
      macroStructure: 'spatial-journey',
      mediumRoute: 'webgl-procedural',
      renderingMedium: 'webgl-shader',
    });
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({
      eligible: true,
      mediumConsistent: true,
      reasons: [],
    });
    expect(assertV3RegistrationMatchesRun(registration!, run)).toMatchObject({
      id: runId,
      verdict: 'pass',
      mediumDecision: { preferred: 'webgl-procedural' },
      visualAmbition: { rendering: { primary: 'webgl-shader' } },
    });
    expect(run.stageReports.at(-1)?.summary).toContain('独立 V3 archive gate');
  });

  it('invalidates old evidence as soon as the final bundle identity changes', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const staleIdentity = {
      runId,
      bundleHash: '0'.repeat(64),
    };
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence, staleIdentity)).toMatchObject({
      identityValid: false,
      archiveEligible: false,
    });
    expect(evaluateWowGateEvidence(run.wowEvidence, staleIdentity, run.visualAmbition!)).toMatchObject({
      identityValid: false,
      passed: false,
    });
  });
});
