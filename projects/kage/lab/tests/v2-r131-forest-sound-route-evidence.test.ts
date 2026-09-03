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

const runId = 'direct-r131-forest-sound-route';
const sourceRoot = new URL('../pages/v2/deliveries/forest-sound-route/', import.meta.url);
const contractPath = new URL('../docs/v2-research/V2-R131-FOREST-SOUND-ROUTE.md', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r131-forest-sound-route.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r131-forest-sound-route/report.json', import.meta.url);

function sourceHash(): string {
  const hash = createHash('sha256');
  for (const file of [
    'index.html',
    'style.css',
    'main.ts',
    'assets/leaf-canopy.wav',
    'assets/tree-hollow.wav',
    'assets/creek-stone.wav',
    'assets/meadow-insect.wav',
  ]) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(new URL(file, sourceRoot)));
  }
  return hash.digest('hex');
}

function inspectWav(file: string): { hash: string; bytes: number; peak: number } {
  const buffer = readFileSync(new URL(`../pages/v2/deliveries/forest-sound-route/assets/${file}`, import.meta.url));
  expect(buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(buffer.subarray(8, 12).toString('ascii')).toBe('WAVE');
  let offset = 12;
  let data = Buffer.alloc(0);
  while (offset + 8 <= buffer.length) {
    const id = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') {
      data = buffer.subarray(offset + 8, Math.min(offset + 8 + size, buffer.length));
      break;
    }
    offset += 8 + size + (size % 2);
  }
  let peak = 0;
  for (let index = 0; index + 1 < data.length; index += 2) {
    peak = Math.max(peak, Math.abs(data.readInt16LE(index)));
  }
  return {
    hash: createHash('sha256').update(buffer).digest('hex'),
    bytes: buffer.length,
    peak,
  };
}

describe('R131 forest-sound-route bounded delivery evidence', () => {
  it('freezes one object-field direction, audio truth boundary and bounded stop rule', () => {
    const contract = readFileSync(contractPath, 'utf8');
    expect(contract).toContain('儿童自然博物馆');
    expect(contract).toContain('森林声音探索');
    expect(contract).toContain('Visual ambition：Immersive');
    expect(contract).toContain('Experience architecture：Spatial Stage');
    expect(contract).toContain('最多两次确定性修复');
    expect(contract).toContain('最多一次视觉精修');
    expect(contract).toContain('程序化自然声预览');
    expect(contract).toContain('不购买或声明真实现场录音');
  });

  it('binds four unique, non-empty local WAV previews into the final bundle identity', () => {
    const assets = [
      inspectWav('leaf-canopy.wav'),
      inspectWav('tree-hollow.wav'),
      inspectWav('creek-stone.wav'),
      inspectWav('meadow-insect.wav'),
    ];
    expect(new Set(assets.map((asset) => asset.hash)).size).toBe(4);
    expect(assets.every((asset) => asset.bytes > 50_000 && asset.peak > 500)).toBe(true);
  });

  it('binds distinct audible sources, visible feedback, route completion and mobile evidence to the final bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(run.finalCandidate).not.toBeNull();
    const identity = run.finalCandidate!;

    expect(identity).toMatchObject({ runId });
    expect(sourceHash()).toBe(identity.bundleHash);
    expect(report).toMatchObject({
      identityBinding: 'runId+bundleHash',
      ...identity,
      revision: 'r131-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-first-sound.png',
      '03-desktop-route-saved.png',
      '04-mobile-reduced.png',
      '05-audio-unavailable.png',
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

    expect(report.observations[0]).toMatchObject({
      checkpoint: 'desktop-opening',
      state: {
        ready: true,
        phase: 'discover',
        collected: [],
        assetCount: 4,
        audioState: 'idle',
        routeReady: false,
        horizontalOverflow: false,
      },
    });
    const interaction = report.observations[1];
    expect(interaction).toMatchObject({
      checkpoint: 'desktop-interaction-audio',
      comparison: {
        distinctAudioSources: true,
        distinctVisualStates: true,
        audioActuallyPlaying: true,
      },
      state: {
        phase: 'saved',
        collected: ['leaf', 'hollow', 'creek'],
        routeReady: true,
        saved: true,
      },
    });
    expect(interaction.samples).toHaveLength(3);
    expect(new Set(interaction.samples.map((sample: { audioSource: string }) => sample.audioSource)).size).toBe(3);
    expect(interaction.samples.every((sample: { audioState: string; audioSource: string; hotspotPressed: boolean }) => (
      sample.audioState === 'playing'
      && sample.audioSource.includes('.wav')
      && sample.hotspotPressed
    ))).toBe(true);
    expect(report.observations[2]).toMatchObject({
      checkpoint: 'mobile-reduced',
      viewport: { width: 390, height: 844 },
      state: {
        routeReady: true,
        saved: true,
        reducedMotion: true,
        horizontalOverflow: false,
      },
    });
    expect(report.observations[3]).toMatchObject({
      checkpoint: 'audio-unavailable-fallback',
      state: {
        audioState: 'unavailable',
        routeReady: true,
        saved: true,
        horizontalOverflow: false,
      },
    });

    expect(run).toMatchObject({
      creativeProtocolVersion: 2,
      id: runId,
      finalCandidate: identity,
      verdict: 'pass',
      stopReason: null,
      selectedDirection: { experienceForm: 'object-field' },
      interactionRationale: { mode: 'direct', audioApplicable: true },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 2,
          visualRefinements: 1,
        },
      },
    });
    expect(run.referencePrinciples.map((reference) => reference.referenceId)).toEqual([
      'positive-paper-butterfly-object-field',
      'positive-sonic-editorial-feedback',
    ]);
    expect(run.assetPlan).toMatchObject({
      strategy: 'mixed',
      assets: [
        { id: 'forest-illustration-field', source: 'programmatic', required: true },
        { id: 'forest-sound-previews', source: 'generated', required: true },
      ],
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'interaction',
      'audio',
    ]);
    expect(run.adaptiveEvidence?.hardGates).toMatchObject({
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
        layout: 'single-stage',
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

  it('registers the same final identity in the V2.5 archive and verified-example card', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const registration = V25_VERIFIED_DELIVERIES.find((item) => item.deliveryId === 'forest-sound-route');
    expect(registration).toEqual({
      schemaVersion: 1,
      baselineVersion: '2.5',
      deliveryId: 'forest-sound-route',
      route: './deliveries/forest-sound-route/',
      evidencePath: 'docs/v2-research/evidence/r131-forest-sound-route.direct-creative-run.json',
      runId,
      bundleHash: '2a8112069032c41fa4ecdc12fc90e981fa0adf14be73e9a53ca1dd22cb4b0906',
      macroStructure: 'single-stage',
    });
    expect(assertV25RegistrationMatchesRun(registration!, run).id).toBe(runId);

    const index = readFileSync(new URL('../pages/v2/index.html', import.meta.url), 'utf8');
    expect(index).toContain('data-v25-archive-id="forest-sound-route"');
    expect(index).toContain(`data-run-id="${runId}"`);
    expect(index).toContain(`data-bundle-hash="${registration!.bundleHash}"`);
    expect(index).toContain('./assets/verified-examples/forest-sound-route.png');
  });
});
