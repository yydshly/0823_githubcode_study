import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertV25DirectCreativeArchiveEligible } from '../src/v2/direct-creative-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const identity = {
  runId: 'direct-r129-color-relay-branching',
  bundleHash: '1ccc53197308a7f6411a1157774b65980284dab773c50c8189f7210195c7e2cc',
} as const;
const sourceRoot = new URL('../pages/v2/deliveries/color-relay-branching/', import.meta.url);
const contractPath = new URL('../docs/v2-research/V2-R129-COLOR-RELAY-BRANCHING.md', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r129-color-relay-branching.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r129-color-relay-branching/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

describe('R129 color-relay branching-confluence V2.5 bounded delivery evidence', () => {
  it('records the immersive branching contract and bounded stop rule before finalization', () => {
    const contract = readFileSync(contractPath, 'utf8');
    expect(contract).toContain('Visual ambition:** Immersive');
    expect(contract).toContain('Experience architecture:** Spatial Stage');
    expect(contract).toContain('opening → team-selected → early-handoff | line-handoff → confluence → saved');
    expect(contract).toContain('最多两次确定性修复');
    expect(contract).toContain('最多一次明确缺陷的视觉精修');
    expect(contract).toContain('不进入正式 registry，不循环重做');
  });

  it('binds the final run to two real branches, adaptive evidence and the current source bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({
      identityBinding: 'runId+bundleHash',
      ...identity,
      revision: 'r129-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-early.png',
      '03-desktop-line-saved.png',
      '04-mobile-reduced.png',
      '05-fallback.png',
    ]);
    expect(report.observations).toHaveLength(4);
    for (const observation of report.observations) {
      expect(observation.issues).toEqual({
        pageErrors: [],
        consoleErrors: [],
        requestFailures: [],
        responseErrors: [],
      });
    }

    const branch = report.observations[1];
    expect(branch).toMatchObject({
      checkpoint: 'desktop-branch-confluence',
      comparison: {
        sameTeam: true,
        distinctRouteHash: true,
        distinctRouteGeometry: true,
        distinctRunnerFormation: true,
      },
      early: { selectedTeam: 'cyan', strategy: 'early', phase: 'confluence', formationSpread: 0.78, exchangeOverlap: 0.74 },
      line: { selectedTeam: 'cyan', strategy: 'line', phase: 'confluence', formationSpread: 0.34, exchangeOverlap: 0.36 },
      saved: { selectedTeam: 'cyan', strategy: 'line', phase: 'saved', saved: true },
    });
    expect(branch.early.routeHash).not.toBe(branch.line.routeHash);
    expect(branch.early.routeD).not.toBe(branch.line.routeD);
    expect(branch.early.runnerTransforms).not.toEqual(branch.line.runnerTransforms);
    expect(report.observations[2]).toMatchObject({
      checkpoint: 'mobile-reduced',
      viewport: { width: 390, height: 844 },
      state: { selectedTeam: 'coral', strategy: 'early', reducedMotion: true, saved: true, horizontalOverflow: false },
    });
    expect(report.observations[3]).toMatchObject({
      checkpoint: 'forced-fallback',
      state: { selectedTeam: 'blue', strategy: 'line', fallback: true, canvasFrames: 0, saved: true },
    });

    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      id: identity.runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      selectedDirection: { experienceForm: 'branching-confluence' },
      interactionRationale: { mode: 'direct', audioApplicable: false },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 0,
          visualRefinements: 1,
        },
      },
    });
    expect(run.referencePrinciples).toHaveLength(3);
    expect(run.assetPlan).toMatchObject({
      strategy: 'programmatic',
      assets: [{ id: 'programmatic-color-relay-field', required: true }],
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual(['opening', 'core', 'mobile', 'interaction']);
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'branching-confluence',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'save-configuration',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 94 });
    expect(run.visualAmbition).toMatchObject({ intentLevel: 'immersive' });
    expect(run.wowEvidence?.assessment).toMatchObject({ required: true, verdict: 'pass', score: 95 });
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
});
