import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
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

const deliveryId = 'same-table-tonight';
const runId = 'direct-r141-same-table-tonight';
const expectedHash = '7c0783b971046e4a3d1aea74c2eca6c29d8d883b3abffb710917b3d654277666';
const assetFile = 'assets/distant-dinner-panorama-v1.png';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidenceRoot = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r141-same-table-tonight');
const runPath = resolve(
  process.cwd(),
  'docs',
  'v2-research',
  'evidence',
  'r141-same-table-tonight.direct-creative-run.json',
);
const reportPath = resolve(evidenceRoot, 'report.json');
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
  assetFile,
] as const;
const captures = [
  ['01-desktop-opening.png', 1440, 900],
  ['02-desktop-nearing.png', 1440, 900],
  ['03-desktop-invited.png', 1440, 900],
  ['04-mobile-reduced-invited.png', 390, 844],
  ['05-asset-fallback.png', 1440, 900],
] as const;

function hashFiles(files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function fileHash(file: string): string {
  return createHash('sha256')
    .update(readFileSync(resolve(sourceRoot, file)))
    .digest('hex');
}

function loadRun() {
  return directCreativeRunSchema.parse(JSON.parse(readFileSync(runPath, 'utf8')));
}

describe('R141 same-table-tonight final evidence', () => {
  it('binds the exact six-file bundle to the final report and DirectCreativeRun identity', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const run = loadRun();

    expect(hashFiles(bundleFiles)).toBe(expectedHash);
    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r141-same-table-tonight-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
      route: '/pages/v2/deliveries/same-table-tonight/',
      revision: 'r141-proof',
      complete: true,
    });
    expect(report.bundleFiles).toEqual(bundleFiles);
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
      adaptiveEvidence: { runId, bundleHash: expectedHash },
    });
  });

  it('locks one built-in imagegen batch and the exact source panorama metadata', async () => {
    const manifest = JSON.parse(
      readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'),
    );
    const assetBytes = readFileSync(resolve(sourceRoot, assetFile));
    const metadata = await sharp(assetBytes).metadata();

    expect(manifest).toEqual({
      schemaVersion: 1,
      deliveryId,
      batchId: 'r141-same-table-single-panorama',
      assetBatches: 1,
      generationCalls: 1,
      sourceAssetCount: 1,
      derivativeCount: 0,
      medium: {
        preferred: 'generated-image',
        rendering: 'raster-image',
        supporting: ['canvas-2d', 'dom-css'],
      },
      assets: [
        {
          path: assetFile,
          kind: 'raster-image',
          role: 'source-panorama',
          mimeType: 'image/png',
          width: 1881,
          height: 836,
          bytes: 1_731_679,
          sha256: 'c42a15f590d0704b789b31a5eecb894ce01fc55694a6f5c026840be1480af23d',
          sourceLineage: {
            type: 'generated-source',
            provider: 'built-in-imagegen',
            batchId: 'r141-same-table-single-panorama',
            sourceAsset: null,
            operation: 'single-wide-diptych-generation',
          },
          visualResponsibility: '两处生活化餐桌、冷暖光线、同一眼平线和可拼合桌沿共同承担主题身份；代码只裁切同一源图并改变两半之间的距离。',
          truthBoundary: '人物、地点、菜品与故事均为概念演示；该图不对应真实家庭、真实住址或真实服务记录。',
        },
      ],
    });
    expect(metadata).toMatchObject({ format: 'png', width: 1881, height: 836 });
    expect(assetBytes.length).toBe(1_731_679);
    expect(fileHash(assetFile)).toBe(
      'c42a15f590d0704b789b31a5eecb894ce01fc55694a6f5c026840be1480af23d',
    );
  });

  it('preserves five clean causal checkpoints and five physical screenshots', async () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));

    expect(report.captures).toEqual(captures.map(([file]) => file));
    expect(report.observations.map((item: any) => item.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-wheel-nearing',
      'desktop-complete-invited',
      'mobile-reduced-invited',
      'asset-fallback',
    ]);
    expect(report.observations.every((item: any) => (
      ['pageErrors', 'consoleErrors', 'requestFailures', 'responseErrors']
        .every((key) => Array.isArray(item.issues[key]) && item.issues[key].length === 0)
    ))).toBe(true);

    const [opening, nearing, invited, mobile, fallback] = report.observations;
    expect(opening).toMatchObject({
      viewport: { width: 1440, height: 900 },
      state: {
        state: 'apart',
        progress: '0.000',
        input: 'initial',
        asset: 'ready',
        invitation: 'pending',
        horizontalOverflow: false,
      },
      semantic: {
        imageCount: 2,
        uniqueImageSources: 1,
        naturalDimensions: [
          { width: 1881, height: 836 },
          { width: 1881, height: 836 },
        ],
        bodyBackgroundImage: 'none',
      },
    });
    expect(nearing).toMatchObject({
      state: { state: 'nearing', input: 'scroll', asset: 'ready', horizontalOverflow: false },
      semantic: { visibleTableNotes: 2 },
    });
    expect(nearing.semantic.gapWidthAfter).toBeLessThan(nearing.semantic.gapWidthBefore);
    expect(invited).toMatchObject({
      state: {
        state: 'invited',
        progress: '1.000',
        input: 'cta',
        invitation: 'sent',
        horizontalOverflow: false,
      },
    });
    expect(mobile).toMatchObject({
      viewport: { width: 390, height: 844 },
      state: { state: 'invited', progress: '1.000', horizontalOverflow: false },
      semantic: { reducedMotion: true, stageButtons: 3 },
    });
    expect(fallback).toMatchObject({
      state: { state: 'invited', asset: 'failed', invitation: 'sent', horizontalOverflow: false },
      semantic: {
        fallbackState: { state: 'apart', asset: 'failed', invitation: 'pending' },
        fallbackVisible: true,
        sceneVisibility: 'hidden',
        footerActionCompleted: true,
      },
    });

    for (const [file, width, height] of captures) {
      const path = resolve(evidenceRoot, file);
      const screenshot = readFileSync(path);
      const metadata = await sharp(screenshot).metadata();
      expect(metadata).toMatchObject({ format: 'png', width, height });
      expect(screenshot.length).toBeGreaterThan(100_000);
    }
  });

  it('passes protocol 3, excellent quality, medium, structure, interaction and attempt gates', () => {
    const run = loadRun();
    const identity = { runId, bundleHash: expectedHash };

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      mediumDecision: { preferred: 'generated-image' },
      assetPlan: {
        batchId: 'r141-same-table-single-panorama',
        strategy: 'generated',
      },
      interactionRationale: { mode: 'scroll', audioApplicable: false },
      visualAmbition: {
        rendering: { primary: 'raster-image', supporting: ['canvas-2d', 'dom-css'] },
      },
      attemptBudget: {
        used: {
          directionSelections: 1,
          assetBatches: 1,
          builds: 1,
          deterministicRepairs: 0,
          visualRefinements: 1,
        },
      },
      adaptiveEvidence: {
        visualQuality: { verdict: 'pass', score: 93 },
        macroStructureReview: {
          verdict: 'pass',
          persistentWorkbench: false,
          contentJustified: true,
          candidate: { layout: 'editorial-flow' },
        },
      },
    });
    expect(run.assetPlan.assets).toHaveLength(2);
    expect(run.assetPlan.assets.every((asset) => asset.source === 'generated')).toBe(true);
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
    ]);
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence!, identity)).toMatchObject({
      identityValid: true,
      checkpointsPassed: true,
      hardGatesPassed: true,
      structurePassed: true,
      qualityPassed: true,
      archiveEligible: true,
    });
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toEqual({
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

  it('matches the frozen V3 registry entry to the same final run identity', () => {
    const run = loadRun();
    const registration = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);

    expect(registration).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId,
      route: './deliveries/same-table-tonight/',
      evidencePath: 'docs/v2-research/evidence/r141-same-table-tonight.direct-creative-run.json',
      runId,
      bundleHash: expectedHash,
      macroStructure: 'editorial-flow',
      mediumRoute: 'generated-image',
      renderingMedium: 'raster-image',
    });
    expect(assertV3RegistrationMatchesRun(registration!, run).id).toBe(runId);
  });

  it('keeps the page truthful and routes every journey input through one scroll progress controller', () => {
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');
    const contract = readFileSync(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');

    expect(html).toContain('两张异地餐桌逐渐靠近的概念场景');
    expect(html).toContain('这是一项概念演示；人物、地点、菜品与故事不对应真实家庭或服务记录。');
    expect(html).toContain('这里不会用通用色块伪装两张餐桌；完整说明与发起行动仍然可用。');
    expect(html.match(/data-scene-image/g)).toHaveLength(2);
    expect(contract).toContain('人物、地点、菜品与故事均为概念演示；不得冒充真实家庭或真实服务记录');
    expect(contract).toContain('One direction, one built-in image generation call, one source panorama.');
    expect(contract).toContain('选择结果与当前决策层一致：`generated-image / raster-image`');
    expect(contract).toContain('宏观结构为 `editorial-flow`');
    expect(contract).toContain('Deterministic repairs: `0 / 2`');
    expect(contract).toContain('Visual refinements: `1 / 1`');

    expect(main).toContain('let progress = 0;');
    expect(main).toContain('function applyProgress(next: number, input: InputChannel)');
    expect(main).toContain("applyProgress(scrollProgress(), 'scroll')");
    expect(main).toContain("addEventListener('scroll', updateFromScroll, { passive: true })");
    expect(main).toContain("scrollToProgress(value, 'stage-navigation')");
    expect(main).toContain("scrollToProgress(0, 'keyboard')");
    expect(main).toContain("scrollToProgress(1, 'keyboard')");
    expect(main).toContain("body.style.setProperty('--progress', progress.toFixed(4))");
    expect(main).toContain('inviteButton.disabled = progress < .82 && !invitationSent');
    expect(main).toContain('renderLightField(progress)');
  });
});
