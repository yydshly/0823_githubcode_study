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

const identity = {
  runId: 'direct-r127-roof-water-route',
  bundleHash: 'c41783ee2c07301fd996e92dd300618c9c019a93f74c358c8a0f36c8cb6effce',
} as const;
const sourceRoot = new URL('../pages/v2/deliveries/roof-water-route/', import.meta.url);
const contractPath = new URL('../docs/v2-research/V2-R127-ROOF-WATER-ROUTE.md', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r127-roof-water-route.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r127-roof-water-route/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

describe('R127 roof-water-route V2.5 bounded delivery', () => {
  it('records the immersive non-workbench contract before implementation', () => {
    const contract = readFileSync(contractPath, 'utf8');
    expect(contract).toContain('Visual ambition:** Immersive');
    expect(contract).toContain('Experience architecture:** Spatial Stage');
    expect(contract).toContain('opening → rainfall → gutter-flow → cistern → garden-release');
    expect(contract).toContain('不做参数工作台');
    expect(contract).toContain('一次构建');
    expect(contract).toContain('最多一次明确缺陷的视觉精修');
  });

  it('binds the final DirectCreativeRun v2 to current source and clean adaptive evidence', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({ identityBinding: 'runId+bundleHash', ...identity, revision: 'r127-proof' });
    expect(report.observations).toHaveLength(5);
    for (const observation of report.observations) {
      expect(observation.issues).toEqual({ pageErrors: [], consoleErrors: [], requestFailures: [], responseErrors: [] });
    }
    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      id: identity.runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      interactionRationale: { mode: 'scroll', audioApplicable: false },
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
    expect(run.referencePrinciples).toHaveLength(3);
    expect(run.assetPlan).toMatchObject({ strategy: 'programmatic', assets: [{ id: 'programmatic-roof-water-system', required: true }] });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual(['opening', 'core', 'mobile', 'scroll']);
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'spatial-journey',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
      },
    });
    expect(run.adaptiveEvidence?.visualQuality.verdict).toBe('pass');
    expect(run.wowEvidence?.assessment.verdict).toBe('pass');
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
    expect(assertV25DirectCreativeArchiveEligible(run).id).toBe(identity.runId);
  });

  it('has exactly one V2.5 registration that matches the final run and visible delivery card', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const registration = V25_VERIFIED_DELIVERIES.find((item) => item.deliveryId === 'roof-water-route');
    expect(registration).toMatchObject({
      baselineVersion: '2.5',
      route: './deliveries/roof-water-route/',
      evidencePath: 'docs/v2-research/evidence/r127-roof-water-route.direct-creative-run.json',
      ...identity,
      macroStructure: 'spatial-journey',
    });
    expect(assertV25RegistrationMatchesRun(registration!, run).id).toBe(identity.runId);
    const index = readFileSync(new URL('../pages/v2/index.html', import.meta.url), 'utf8');
    expect(index).toContain('data-v25-archive-id="roof-water-route"');
    expect(index).toContain(`data-run-id="${identity.runId}"`);
    expect(index).toContain(`data-bundle-hash="${identity.bundleHash}"`);
  });
});
