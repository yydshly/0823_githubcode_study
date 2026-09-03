import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectImageAsset } from '../server/image-asset-inspection.ts';
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
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';

const deliveryId = 'west-bund-meeting-points';
const runId = 'direct-r136b-west-bund-meeting-points';
const assetFile = 'assets/xuhui-west-bund-osm-map-v1.jpg';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136b-west-bund-meeting-points.direct-creative-run.json');
const reportPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r136b-west-bund-meeting-points', 'report.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'CONTRACT.md', assetFile];
const checkpointOrder = [
  'desktop-opening',
  'desktop-inputs',
  'desktop-selection-saved',
  'mobile-reduced',
  'fallback-complete',
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

describe('R136B west-bund-meeting-points V3 evidence', () => {
  it('freezes the licensed OSM asset bytes, decoded dimensions, provenance and visible attribution', async () => {
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const asset = readFileSync(resolve(sourceRoot, assetFile));
    const sourceAsset = readFileSync(resolve(process.cwd(), 'public', 'creative-assets', 'xuhui-west-bund-osm-map-v1.jpg'));
    const provenance = JSON.parse(readFileSync(resolve(process.cwd(), 'cases', 'runs', 'dedicated-c0514ddead80', 'build-report.json'), 'utf8'));
    const inspection = await inspectImageAsset(asset);

    expect(inspection).toMatchObject({
      format: 'jpeg',
      width: 960,
      height: 576,
      sha256: '0a4e65006b159dfc8900e9ef2631a83c0c8bbb456efd774dd582fc12694b3d75',
    });
    expect(asset.byteLength).toBe(124_206);
    expect(sourceAsset.equals(asset)).toBe(true);
    expect(manifest).toEqual({
      schemaVersion: 1,
      deliveryId,
      assets: [{
        id: 'xuhui-west-bund-osm-map-v1',
        path: assetFile,
        kind: 'image',
        mimeType: 'image/jpeg',
        width: 960,
        height: 576,
        bytes: 124_206,
        sha256: inspection.sha256,
        source: {
          type: 'licensed',
          provider: 'OpenStreetMap contributors',
          url: 'https://www.openstreetmap.org/copyright',
          localSource: 'public/creative-assets/xuhui-west-bund-osm-map-v1.jpg',
          provenanceRecord: 'cases/runs/dedicated-c0514ddead80/build-report.json',
          originalBundlePath: assetFile,
        },
        license: {
          name: 'Open Data Commons Open Database License (ODbL) 1.0',
          url: 'https://opendatacommons.org/licenses/odbl/1-0/',
        },
        attribution: '© OpenStreetMap contributors',
        description: expect.stringContaining('OpenStreetMap'),
        responsibility: expect.stringContaining('真实道路'),
        runtimeBoundary: expect.stringContaining('不得以程序化或生成图伪造地理证据'),
      }],
    });
    expect(provenance.usedAssets).toContainEqual(expect.objectContaining({
      id: 'xuhui-west-bund-osm-map-v1',
      bundlePath: assetFile,
      source: 'licensed',
      payloadBytes: 124_206,
    }));

    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
    expect(html).toContain('© OpenStreetMap contributors');
    expect(html).toContain('真实地理基底 · 集合建议为产品演示');
    expect(html).toContain('不代表可通行路线、实时路况或实时开放状态');
  });

  it('binds the final V3 run to the complete current browser report and full source bundle', () => {
    const expectedHash = bundleHash();
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));

    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r136b-west-bund-meeting-points-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
      bundleFiles,
      route: '/pages/v2/deliveries/west-bund-meeting-points/',
      revision: 'r136b-proof',
      complete: true,
    });
    expect(report.captures).toEqual([
      '01-desktop-opening.png',
      '02-desktop-inputs.png',
      '03-desktop-selection-saved.png',
      '04-mobile-reduced.png',
      '05-fallback-complete.png',
    ]);
    expect(report.observations.map((item: any) => item.checkpoint)).toEqual(checkpointOrder);
    expect(report.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      stopReason: null,
      finalCandidate: { runId, bundleHash: expectedHash },
      selectedDirection: { experienceForm: 'horizontal-panorama' },
      mediumDecision: { preferred: 'grounded-real-media' },
      assetPlan: {
        strategy: 'licensed',
        assets: [{ id: 'map-evidence-field', source: 'licensed', required: true }],
      },
      interactionRationale: { mode: 'mixed', audioApplicable: false },
      visualAmbition: {
        intentLevel: 'expressive',
        rendering: { primary: 'raster-image', supporting: ['dom-css'] },
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
    expect(run.wowEvidence).toBeUndefined();
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.checkpoints.map((checkpoint) => checkpoint.kind)).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
      'interaction',
    ]);
  });

  it('proves one shared panorama position, fact synchronization, persistence, mobile and honest fallback', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const opening = report.observations.find((item: any) => item.checkpoint === 'desktop-opening');
    const inputs = report.observations.find((item: any) => item.checkpoint === 'desktop-inputs');
    const saved = report.observations.find((item: any) => item.checkpoint === 'desktop-selection-saved');
    const mobile = report.observations.find((item: any) => item.checkpoint === 'mobile-reduced');
    const fallback = report.observations.find((item: any) => item.checkpoint === 'fallback-complete');

    expect(opening).toMatchObject({
      viewport: { width: 1440, height: 900 },
      state: {
        ready: true,
        activeLandmark: 'west-bund-museum',
        activeName: '西岸美术馆',
        activeAddress: '龙腾大道 2600 号',
        coordinates: '121.4593301, 31.1695893',
        imageLoaded: true,
        fallback: false,
        routeIsProductDemo: true,
        horizontalOverflow: false,
      },
      image: { complete: true, naturalWidth: 960, naturalHeight: 576 },
      attribution: {
        text: '© OpenStreetMap contributors',
        href: 'https://www.openstreetmap.org/copyright',
      },
    });
    expect(opening.panorama.scrollWidth).toBeGreaterThan(opening.panorama.clientWidth + 100);
    expect(inputs.sameController).toBe(true);
    for (const key of ['wheel', 'drag', 'arrowRight', 'next']) {
      expect(inputs.inputs[key].after.domScrollLeft).toBeGreaterThan(inputs.inputs[key].before.domScrollLeft + 8);
      expect(Math.abs(inputs.inputs[key].after.domScrollLeft - inputs.inputs[key].after.runtimeScrollLeft)).toBeLessThanOrEqual(1);
    }
    expect(inputs.inputs.previous.after.domScrollLeft).toBeLessThan(inputs.inputs.previous.before.domScrollLeft - 8);

    expect(saved.selection.after).toMatchObject({
      state: {
        activeLandmark: 'long-museum',
        activeName: '龙美术馆',
        activeAddress: '龙腾大道 3398 号',
        coordinates: '121.4601929, 31.1859164',
        routeIsProductDemo: true,
      },
      card: {
        name: '龙美术馆',
        address: '龙腾大道 3398 号',
        coordinates: '121.4601929, 31.1859164',
      },
    });
    expect(saved.selection.after.route).not.toBe(saved.selection.before.route);
    expect(saved.persistence).toMatchObject({
      storageKey: 'r136b-west-bund-saved-meeting-point',
      valueBeforeReload: 'long-museum',
      valueAfterReload: 'long-museum',
      stateAfterReload: { activeLandmark: 'long-museum', savedId: 'long-museum' },
    });
    expect(mobile).toMatchObject({
      viewport: { width: 390, height: 844 },
      input: { kind: 'touch-tap-next-button' },
      storage: { key: 'r136b-west-bund-saved-meeting-point', value: 'tank-shanghai' },
      state: {
        activeLandmark: 'tank-shanghai',
        savedId: 'tank-shanghai',
        imageLoaded: true,
        fallback: false,
        reducedMotion: true,
        horizontalOverflow: false,
      },
    });
    expect(fallback).toMatchObject({
      honestFallback: {
        landmarkCount: 4,
        attribution: '© OpenStreetMap contributors',
        renderedMap: { backgroundImage: 'none', visibleImages: 0, visibleSvgs: 0 },
      },
      storage: { key: 'r136b-west-bund-saved-meeting-point', value: 'start-museum' },
      state: {
        activeLandmark: 'start-museum',
        savedId: 'start-museum',
        imageLoaded: false,
        fallback: true,
        routeIsProductDemo: true,
        horizontalOverflow: false,
      },
    });
  });

  it('passes final adaptive evidence and produces a valid V3 registration shape without requiring registry mutation', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = { runId, bundleHash: bundleHash() };

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
      contentJustified: true,
      candidate: {
        layout: 'horizontal-panorama',
        persistentControlPanel: false,
        visibleParameterControls: false,
        realtimeMetricCluster: false,
        primaryAction: 'save-configuration',
      },
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({ verdict: 'pass', score: 93 });
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence, identity)).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      structurePassed: true,
      qualityPassed: true,
      archiveEligible: true,
    });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({
      eligible: true,
      wowPassed: true,
      mediumConsistent: true,
      reasons: [],
    });

    const registration = createV3VerifiedDeliveryRegistration({
      deliveryId,
      route: './deliveries/west-bund-meeting-points/',
      evidencePath: 'docs/v2-research/evidence/r136b-west-bund-meeting-points.direct-creative-run.json',
      run,
    });
    expect(v3VerifiedDeliveryRegistrationSchema.parse(registration)).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/west-bund-meeting-points/',
      evidencePath: 'docs/v2-research/evidence/r136b-west-bund-meeting-points.direct-creative-run.json',
      runId,
      bundleHash: identity.bundleHash,
      macroStructure: 'horizontal-panorama',
      mediumRoute: 'grounded-real-media',
      renderingMedium: 'raster-image',
    });
    expect(assertV3RegistrationMatchesRun(registration, run).id).toBe(runId);

    const registered = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);
    expect(registered).toEqual(registration);
    const home = readFileSync(resolve(process.cwd(), 'pages', 'v2', 'index.html'), 'utf8');
    expect(home.match(/data-v3-archive-id="west-bund-meeting-points"/g)).toHaveLength(1);
    expect(home).toContain(`data-run-id="${runId}"`);
    expect(home).toContain(`data-bundle-hash="${identity.bundleHash}"`);
    expect(home).toContain('./assets/verified-examples/west-bund-meeting-points.png');
  });
});
