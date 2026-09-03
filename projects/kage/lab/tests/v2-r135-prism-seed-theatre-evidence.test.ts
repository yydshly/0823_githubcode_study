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

const deliveryId = 'prism-seed-theatre';
const runId = 'direct-r135-prism-seed-theatre';
const expectedHash = 'd4ebe575019203c7335541c30d22e750be9d64ddf1663e127740f1f55ac6f739';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r135-prism-seed-theatre.direct-creative-run.json');
const reportPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r135-prism-seed-theatre', 'report.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/prism-seed-glasshouse-v1.png'];

function bundleHash(): string {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

describe('R135 prism-seed-theatre V3 evidence', () => {
  it('binds the final run to the generated key visual and exact browser report', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const asset = readFileSync(resolve(sourceRoot, 'assets', 'prism-seed-glasshouse-v1.png'));

    expect(bundleHash()).toBe(expectedHash);
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
      mediumDecision: { preferred: 'generated-image' },
      assetPlan: { strategy: 'generated' },
      visualAmbition: {
        intentLevel: 'flagship',
        rendering: {
          primary: 'raster-image',
          supporting: ['webgl-shader', 'dom-css'],
        },
      },
    });
    expect(run.assetPlan.assets).toContainEqual(expect.objectContaining({ source: 'generated', required: true }));
    expect(run.attemptBudget.used).toEqual({
      directionSelections: 1,
      assetBatches: 1,
      builds: 1,
      deterministicRepairs: 2,
      visualRefinements: 1,
    });
    expect(report).toMatchObject({
      complete: true,
      identityBinding: 'runId+asset-bound-bundleHash',
      runId,
      bundleHash: expectedHash,
    });
    expect(report.observations).toHaveLength(5);
    expect(new Set(report.observations[1].canvasPixelHashes).size).toBe(2);
    expect(manifest).toMatchObject({ generationCalls: 1, assets: [{ source: 'built-in-imagegen' }] });
    expect(manifest.assets[0].sha256).toBe(createHash('sha256').update(asset).digest('hex'));
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
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 94 });
    expect(run.wowEvidence?.assessment).toMatchObject({ required: true, verdict: 'pass', score: 93 });
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
      route: './deliveries/prism-seed-theatre/',
      evidencePath: 'docs/v2-research/evidence/r135-prism-seed-theatre.direct-creative-run.json',
      runId,
      bundleHash: expectedHash,
      macroStructure: 'spatial-journey',
      mediumRoute: 'generated-image',
      renderingMedium: 'raster-image',
    });
    expect(assertV3RegistrationMatchesRun(registration!, run).id).toBe(runId);
  });

  it('keeps the key visual primary while the page exposes real interaction and honest fallback', () => {
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');

    expect(html).toContain('data-experience="prism-seed-theatre"');
    expect(html).toContain('assets/prism-seed-glasshouse-v1.png');
    expect(html).toContain('id="prism-canvas"');
    expect(html).toContain('id="save-specimen"');
    expect(html).toContain('不代表真实光谱测量');
    expect(main).toContain('__prismSeedTheatre');
    expect(main).toContain("addEventListener('scroll'");
    expect(main).toContain("addEventListener('pointermove'");
    expect(main).toContain('uProgress');
    expect(main).toContain('uPointer');
    expect(css).toContain('html[data-asset-fallback="true"]');
    expect(`${html}\n${css}`).not.toMatch(/type="range"|control-panel|parameter-grid/i);
  });
});
