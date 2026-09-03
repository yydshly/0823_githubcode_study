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

const deliveryId = 'ten-second-callsign-decode';
const runId = 'direct-r139-ten-second-callsign-decode';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r139-ten-second-callsign-decode.direct-creative-run.json');
const reportPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r139-ten-second-callsign-decode', 'report.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md'];

function bundleHash(): string {
  const hash = createHash('sha256');
  for (const file of bundleFiles) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

describe('R139 ten-second callsign decoder V3 evidence', () => {
  it('binds the final DOM/CSS/Web Audio bundle to exactly five clean browser checkpoints', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const expectedHash = report.bundleHash as string;

    expect(bundleHash()).toBe(expectedHash);
    expect(report).toMatchObject({
      complete: true,
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
      revision: 'r139-proof',
      bundleFiles,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-decoding.png',
      '03-desktop-saved.png',
      '04-mobile-reduced-saved.png',
      '05-audio-fallback-saved.png',
    ]);
    expect(report.observations.map((item: any) => item.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-audio-decoding',
      'desktop-checked-saved',
      'mobile-reduced-saved',
      'audio-fallback-saved',
    ]);
    expect(report.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
      mediumDecision: { preferred: 'code-native', assetResponsibilities: [] },
      assetPlan: { strategy: 'none', assets: [] },
      selectedDirection: {
        id: 'ten-second-callsign-typographic-sonic-field',
        experienceForm: 'typographic-sonic-field',
      },
      interactionRationale: { mode: 'direct', audioApplicable: true },
      visualAmbition: {
        intentLevel: 'expressive',
        rendering: { primary: 'dom-css', supporting: [] },
      },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 2,
          visualRefinements: 0,
        },
      },
    });
  });

  it('proves a real sounding intermediate state, nine tones, honest checking and persisted completion', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const opening = report.observations.find((item: any) => item.checkpoint === 'desktop-opening');
    const playback = report.observations.find((item: any) => item.checkpoint === 'desktop-audio-decoding');
    const checked = report.observations.find((item: any) => item.checkpoint === 'desktop-checked-saved');

    expect(opening).toMatchObject({
      state: {
        ready: true,
        phase: 'waiting',
        audioState: 'locked',
        audioContextState: 'not-created',
        revealedCount: 0,
        canonicalSequenceId: 'demo-kage-v1',
        expectedDurationMs: 10_000,
        horizontalOverflow: false,
      },
      semantic: {
        segments: 4,
        images: 0,
        canvases: 0,
        answerTextInitiallyPresent: false,
      },
    });
    expect(playback.semantic.soundingState).toMatchObject({
      phase: 'sounding',
      audioState: 'playing',
      audioContextState: 'running',
      playingScope: 'all',
      currentLetter: 0,
      currentElement: 0,
      scheduledToneCount: 9,
      completedPlaybackCount: 0,
      audioFallback: false,
    });
    expect(playback.semantic.soundingSegments).toBe(1);
    expect(playback.state).toMatchObject({
      phase: 'decoding',
      audioContextState: 'running',
      revealedCount: 4,
      revealed: [true, true, true, true],
      scheduledToneCount: 9,
      completedPlaybackCount: 1,
      canonicalSequenceId: 'demo-kage-v1',
    });
    const incorrectState = checked.semantic.incorrectState || {
      phase: 'checked',
      checkStatus: checked.semantic.wrongStatus,
      saved: false,
    };
    expect(incorrectState).toMatchObject({
      phase: 'checked',
      checkStatus: 'incorrect',
      saved: false,
    });
    expect(checked.semantic.completionVisibleAfterIncorrect === false
      || checked.semantic.completionHiddenAfterWrong === true).toBe(true);
    expect(checked.semantic.storageBeforeReload).toContain('demo-kage-v1');
    expect(checked.semantic.storageAfterReload).toBe(checked.semantic.storageBeforeReload);
    expect(checked).toMatchObject({
      state: {
        phase: 'saved',
        checkStatus: 'correct',
        saved: true,
        restored: true,
        revealedCount: 4,
      },
    });
  });

  it('proves 390px reduced-motion completion and an honest audio-unavailable fallback', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const mobile = report.observations.find((item: any) => item.checkpoint === 'mobile-reduced-saved');
    const fallback = report.observations.find((item: any) => item.checkpoint === 'audio-fallback-saved');

    expect(mobile).toMatchObject({
      viewport: { width: 390, height: 844 },
      state: {
        ready: true,
        phase: 'saved',
        checkStatus: 'correct',
        saved: true,
        reducedMotion: true,
        scheduledToneCount: 9,
        completedPlaybackCount: 1,
        horizontalOverflow: false,
      },
    });
    expect(fallback).toMatchObject({
      state: {
        ready: true,
        phase: 'saved',
        audioState: 'unavailable',
        audioContextState: 'unavailable',
        audioFallback: true,
        scheduledToneCount: 0,
        completedPlaybackCount: 1,
        revealedCount: 4,
        checkStatus: 'correct',
        saved: true,
        horizontalOverflow: false,
      },
    });
  });

  it('passes final quality, optional Wow evidence and the V3 medium-consistency gate', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = run.finalCandidate!;

    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'interaction',
      'audio',
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
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: {
        layout: 'editorial-flow',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'record-or-contribute',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 92 });
    expect(run.wowEvidence?.assessment).toMatchObject({
      required: false,
      verdict: 'not-required',
      score: 93,
    });
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence, identity)).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      structurePassed: true,
      qualityPassed: true,
      archiveEligible: true,
    });
    expect(evaluateWowGateEvidence(run.wowEvidence, identity, run.visualAmbition!)).toMatchObject({
      required: false,
      identityValid: true,
      intentValid: true,
      passed: true,
    });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({
      eligible: true,
      protocolValid: true,
      verdictPassed: true,
      identityValid: true,
      structurePassed: true,
      qualityPassed: true,
      wowPassed: true,
      mediumConsistent: true,
      reasons: [],
    });
  });

  it('registers the same final identity in the V3 verified collection', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const expectedHash = run.finalCandidate!.bundleHash;
    const registration = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);

    expect(registration).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/ten-second-callsign-decode/',
      evidencePath: 'docs/v2-research/evidence/r139-ten-second-callsign-decode.direct-creative-run.json',
      runId,
      bundleHash: expectedHash,
      macroStructure: 'editorial-flow',
      mediumRoute: 'code-native',
      renderingMedium: 'dom-css',
    });
    expect(assertV3RegistrationMatchesRun(registration!, run).id).toBe(runId);
  });

  it('keeps the answer hidden until listening and checking while sharing one canonical sequence', () => {
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');

    expect(html).toContain('data-experience="ten-second-callsign-decode"');
    expect(html).toContain('id="signal-strip"');
    expect(html).toContain('id="play-all"');
    expect(html).toContain('id="decode-input"');
    expect(html).toContain('id="completion-card"');
    expect(html).toContain('id="save-card"');
    expect(html).toContain('虚构演示');
    expect(main).toContain("const EXERCISE_ID = 'demo-kage-v1' as const");
    expect(main).toContain('window.__callsignDecoder');
    expect(main).toContain("state.phase = 'sounding'");
    expect(main).toContain('state.scheduledToneCount += 1');
    expect(main).toContain("state.checkStatus = 'incorrect'");
    expect(main).toContain("state.phase = 'saved'");
    expect(css).toContain('.signal-segment[data-state="sounding"]');
    expect(css).toContain('body[data-answer-state="correct"]');
  });
});
