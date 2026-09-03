import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertV25DirectCreativeArchiveEligible,
  assertV25RegistrationMatchesRun,
} from '../src/v2/direct-creative-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { V25_VERIFIED_DELIVERIES } from '../src/v2/v25-verified-deliveries.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const runId = 'direct-r132-moonlit-tidepool-panorama';
const deliveryId = 'moonlit-tidepool-panorama';
const imageFile = 'assets/moonlit-tidepool-panorama-v1.png';
const sourceRoot = new URL('../pages/v2/deliveries/moonlit-tidepool-panorama/', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r132-moonlit-tidepool-panorama.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r132-moonlit-tidepool-panorama/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts', imageFile]) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

function inspectPng(): { bytes: number; width: number; height: number; hash: string } {
  const buffer = readFileSync(new URL(imageFile, sourceRoot));
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(buffer.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    bytes: buffer.length,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    hash: createHash('sha256').update(buffer).digest('hex'),
  };
}

describe('R132 moonlit-tidepool-panorama bounded delivery evidence', () => {
  it('freezes one wide generated panorama and the complete horizontal interaction contract', () => {
    const asset = inspectPng();
    expect(asset).toMatchObject({ bytes: 2_525_334, width: 1_915, height: 821 });
    expect(asset.width / asset.height).toBeGreaterThan(2.2);
    expect(asset.hash).toBe('494f40445f17fd6f79fa3e9808afa60732f62294ef77291e2806a952d5e1efee');

    const index = readFileSync(new URL('index.html', sourceRoot), 'utf8');
    const main = readFileSync(new URL('main.ts', sourceRoot), 'utf8');
    expect(index).toContain('data-experience="moonlit-tidepool-panorama"');
    expect(index).toContain('id="panorama-stage"');
    expect(index).toContain('id="panorama-viewport"');
    expect(index).toContain('id="panorama-image"');
    expect(index).toContain('moonlit-tidepool-panorama-v1.png');
    expect(index).toContain('id="panorama-fallback"');
    for (const station of ['rock', 'anemone', 'crab']) {
      expect(index).toContain(`data-station-id="${station}"`);
    }
    expect(index).toContain('id="prev-station"');
    expect(index).toContain('id="next-station"');
    expect(index).toContain('id="save-route"');
    expect(main).toContain('__moonlitTidepool');
    expect(main).toContain('fallback');
    expect(main).toContain('reducedMotion');
  });

  it('binds the final run, runtime report and generated PNG bytes to one identity', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(run.finalCandidate).not.toBeNull();
    const identity = run.finalCandidate!;

    expect(identity).toMatchObject({ runId });
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r132-moonlit-tidepool-panorama-runtime-observations',
      identityBinding: 'runId+bundleHash',
      ...identity,
      route: '/pages/v2/deliveries/moonlit-tidepool-panorama/',
      revision: 'r132-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-navigation.png',
      '03-desktop-route-saved.png',
      '04-mobile-reduced.png',
      '05-fallback-complete.png',
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
      state: {
        ready: true,
        visited: [],
        routeReady: false,
        saved: false,
        imageLoaded: true,
        fallback: false,
        horizontalOverflow: false,
      },
      image: { complete: true, naturalWidth: 1915, naturalHeight: 821 },
    });
    expect(report.observations[0].state.assetUrl).toContain('moonlit-tidepool-panorama-v1.png');
    expect(report.observations[1]).toMatchObject({
      checkpoint: 'desktop-panorama-navigation',
      comparison: {
        wheelMoved: true,
        dragMoved: true,
        arrowMoved: true,
        nextMoved: true,
        previousMovedBack: true,
      },
    });
    expect(report.observations[2]).toMatchObject({
      checkpoint: 'desktop-stations-save',
      comparison: { progressAdvanced: true, allStationsVisited: true, routeSaved: true },
      states: {
        saved: {
          visited: ['rock', 'anemone', 'crab'],
          routeReady: true,
          saved: true,
        },
      },
    });
    expect(report.observations[3]).toMatchObject({
      checkpoint: 'mobile-reduced',
      viewport: { width: 390, height: 844 },
      state: {
        visited: ['rock', 'anemone', 'crab'],
        routeReady: true,
        saved: true,
        imageLoaded: true,
        reducedMotion: true,
        horizontalOverflow: false,
      },
    });
    expect(report.observations[4]).toMatchObject({
      checkpoint: 'fallback-complete',
      state: {
        visited: ['rock', 'anemone', 'crab'],
        routeReady: true,
        saved: true,
        imageLoaded: false,
        fallback: true,
        horizontalOverflow: false,
      },
    });

    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      id: runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      selectedDirection: { experienceForm: 'horizontal-panorama' },
      interactionRationale: { mode: 'mixed', audioApplicable: false },
    });
    expect(run.referencePrinciples.length).toBeGreaterThanOrEqual(1);
    expect(run.referencePrinciples.length).toBeLessThanOrEqual(3);
    expect(run.assetPlan.strategy).toBe('mixed');
    expect(run.assetPlan.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'moonlit-tidepool-panorama-v1', source: 'generated', required: true }),
    ]));
    expect(run.attemptBudget.used.directionSelections).toBe(1);
    expect(run.attemptBudget.used.assetBatches).toBe(1);
    expect(run.attemptBudget.used.builds).toBe(1);
    expect(run.attemptBudget.used.deterministicRepairs).toBeLessThanOrEqual(2);
    expect(run.attemptBudget.used.visualRefinements).toBeLessThanOrEqual(1);
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.hardGates).toMatchObject({
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
        layout: 'horizontal-panorama',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'save-configuration',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality.verdict).toBe('pass');
    expect(run.adaptiveEvidence?.visualQuality.score).toBeGreaterThanOrEqual(90);
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
    expect(assertV25DirectCreativeArchiveEligible(run).id).toBe(runId);
  });

  it('requires the same final identity in the V2.5 registry and verified-example card', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = run.finalCandidate!;
    const registration = V25_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);
    expect(registration).toEqual({
      schemaVersion: 1,
      baselineVersion: '2.5',
      deliveryId,
      route: './deliveries/moonlit-tidepool-panorama/',
      evidencePath: 'docs/v2-research/evidence/r132-moonlit-tidepool-panorama.direct-creative-run.json',
      runId,
      bundleHash: identity.bundleHash,
      macroStructure: 'horizontal-panorama',
    });
    expect(assertV25RegistrationMatchesRun(registration!, run).id).toBe(runId);

    const index = readFileSync(new URL('../pages/v2/index.html', import.meta.url), 'utf8');
    expect(index).toContain('data-v25-archive-id="moonlit-tidepool-panorama"');
    expect(index).toContain(`data-run-id="${runId}"`);
    expect(index).toContain(`data-bundle-hash="${identity.bundleHash}"`);
    expect(index).toContain('./assets/verified-examples/moonlit-tidepool-panorama.png');
  });
});
