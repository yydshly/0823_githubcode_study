import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assertV25DirectCreativeArchiveEligible } from '../src/v2/direct-creative-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const identity = {
  runId: 'direct-r128-night-reflective-catalog',
  bundleHash: 'ef0ae71482af63a997095d6398b03f806833a418593d1ac46b8d0e709faca379',
} as const;
const sourceRoot = new URL('../pages/v2/deliveries/night-reflective-catalog/', import.meta.url);
const contractPath = new URL('../docs/v2-research/V2-R128-NIGHT-REFLECTIVE-CATALOG.md', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r128-night-reflective-catalog.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r128-night-reflective-catalog/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of ['index.html', 'style.css', 'main.ts']) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

describe('R128 night-reflective-catalog V2.5 bounded delivery evidence', () => {
  it('records the catalog contract and bounded stop rule before finalization', () => {
    const contract = readFileSync(contractPath, 'utf8');
    expect(contract).toContain('Visual ambition:** Immersive');
    expect(contract).toContain('Experience architecture:** Editorial Flow / Catalog');
    expect(contract).toContain('overview → filter → inspect → compare → saved');
    expect(contract).toContain('不使用持续中央英雄、长滚动空间旅程或持久参数面板');
    expect(contract).toContain('一次构建');
    expect(contract).toContain('最多一次明确缺陷的视觉精修');
    expect(contract).toContain('一次构建与一次视觉精修后');
  });

  it('binds the final DirectCreativeRun v2 to the current catalog source and adaptive browser evidence', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({
      identityBinding: 'runId+bundleHash',
      ...identity,
      revision: 'r128-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-overview.png',
      '02-desktop-compare.png',
      '03-mobile-reduced.png',
      '04-fallback.png',
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
    expect(report.observations[1]).toMatchObject({
      checkpoint: 'desktop-interaction',
      inspected: { filter: 'route', visibleCount: 4, driveMode: 'manual' },
      state: {
        selected: ['micro-prism', 'segmented-guide'],
        selectedCount: 2,
        saved: true,
      },
      semantic: { closeMethod: 'Escape', focusReturnedTo: 'open-compare' },
    });
    expect(report.observations[2]).toMatchObject({
      checkpoint: 'mobile-reduced',
      viewport: { width: 390, height: 844 },
      state: { reducedMotion: true, horizontalOverflow: false, selectedCount: 2 },
    });
    expect(report.observations[3]).toMatchObject({
      checkpoint: 'forced-fallback',
      state: { fallback: true, canvasCount: 0, selectedCount: 2, saved: true },
    });

    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      id: identity.runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      interactionRationale: { mode: 'direct', audioApplicable: false },
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
    expect(run.stageReports).toEqual([expect.objectContaining({
      stage: 'bounded-completion',
      status: 'completed',
      summary: expect.stringContaining('达到阶段完成条件并停止'),
    })]);
    expect(run.referencePrinciples).toHaveLength(3);
    expect(run.assetPlan).toMatchObject({
      strategy: 'programmatic',
      assets: [{ id: 'programmatic-reflective-samples', required: true }],
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'catalog',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'browse-collection',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 93 });
    expect(run.wowEvidence?.assessment).toMatchObject({ verdict: 'pass', score: 93 });
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
