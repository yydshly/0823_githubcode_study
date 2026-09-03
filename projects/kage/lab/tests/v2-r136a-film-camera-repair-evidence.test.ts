import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertV3RegistrationMatchesRun,
  evaluateV3DirectCreativeArchiveEligibility,
} from '../src/v2/direct-creative-v3-archive-gate.ts';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible,
} from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const deliveryId = 'film-camera-repair-paths';
const runId = 'direct-r136a-film-camera-repair-paths';
const expectedHash = 'f4c32fc7300996f0fac8c9afa82aeac0c8c01e721ff42cd1fb7c88d2a1838977';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136a-film-camera-repair-paths.direct-creative-run.json');
const reportPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136a-film-camera-repair-paths', 'report.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts'];

function bundleHash(): string {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

describe('R136A film-camera-repair-paths V3 evidence', () => {
  it('binds the code-native delivery to its final browser report', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));

    expect(bundleHash()).toBe(expectedHash);
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
      mediumDecision: { preferred: 'code-native' },
      assetPlan: { strategy: 'none', assets: [] },
      visualAmbition: {
        intentLevel: 'expressive',
        rendering: { primary: 'svg', supporting: ['dom-css'] },
      },
    });
    expect(run.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 1,
      visualRefinements: 1,
    });
    expect(report).toMatchObject({
      complete: true,
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
    });
    expect(report.observations).toHaveLength(5);
    expect(report.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);
  });

  it('proves both repair paths, saving, mobile completion and graceful enhancement-off behavior', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const moving = report.observations.find((item: any) => item.checkpoint === 'desktop-moving-route');
    const compared = report.observations.find((item: any) => item.checkpoint === 'desktop-stuck-saved');
    const mobile = report.observations.find((item: any) => item.checkpoint === 'mobile-reduced');
    const enhancementOff = report.observations.find((item: any) => item.checkpoint === 'enhancement-off-saved');

    expect(moving.moving).toMatchObject({ phase: 'confluence', route: 'moving', routeHistory: ['moving'] });
    expect(new Set(moving.svgHashes).size).toBe(2);
    expect(compared.stuck.geometryHash).not.toBe(compared.moving.geometryHash);
    expect(compared.state).toMatchObject({
      phase: 'saved',
      route: 'stuck',
      routeHistory: ['moving', 'stuck'],
      saved: true,
    });
    expect(mobile.state).toMatchObject({ saved: true, reducedMotion: true, horizontalOverflow: false });
    expect(mobile.viewport.width).toBe(390);
    expect(enhancementOff.state).toMatchObject({ saved: true, enhancementOff: true, horizontalOverflow: false });
  });

  it('passes final quality, WowGate and V3 medium-consistency boundaries', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = { runId, bundleHash: expectedHash };

    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null,
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass' });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 93 });
    expect(run.wowEvidence?.assessment).toMatchObject({ required: false, verdict: 'not-required', score: 92 });
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence, identity)).toMatchObject({ archiveEligible: true });
    expect(evaluateWowGateEvidence(run.wowEvidence, identity, run.visualAmbition!)).toMatchObject({ passed: true });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({
      eligible: true,
      mediumConsistent: true,
      reasons: [],
    });

    const registration = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);
    expect(registration).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/film-camera-repair-paths/',
      evidencePath: 'docs/v2-research/evidence/r136a-film-camera-repair-paths.direct-creative-run.json',
      runId,
      bundleHash: expectedHash,
      macroStructure: 'branching-confluence',
      mediumRoute: 'code-native',
      renderingMedium: 'svg',
    });
    expect(assertV3RegistrationMatchesRun(registration!, run).id).toBe(runId);
  });

  it('keeps the film camera as a recognizable shared subject instead of a generic panel switcher', () => {
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');
    const home = readFileSync(resolve(process.cwd(), 'pages', 'v2', 'index.html'), 'utf8');

    expect(html).toContain('data-experience="film-camera-repair-paths"');
    expect(html).toContain('id="camera-svg"');
    expect(html).toContain('id="advance-lever"');
    expect(html).toContain('id="battery-door"');
    expect(html).toContain('id="save-card"');
    expect(html).toContain('不代表精确故障或维修结论');
    expect(main).toContain('__filmCameraRepair');
    expect(main).toContain('routeHistory: state.routeHistory.map((route) => routeName(route)!)');
    expect(main).toContain('applyGeometry');
    expect(main).toContain("type RouteName = 'moving' | 'stuck'");
    expect(main).toContain("const routes: Record<RouteId, RouteDefinition>");
    expect(css).toContain('#route-path');
    expect(home.match(/data-v3-archive-id="film-camera-repair-paths"/g)).toHaveLength(1);
  });
});
