import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible,
} from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';

const deliveryId = 'folded-light-studio';
const runId = 'direct-r140-folded-light-studio';
const expectedHash = '752235b5c5303e616318a484f632bcd7f037d0841bc28469f15b433527f37f24';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidenceRoot = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio');
const evidencePath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r140-folded-light-studio.direct-creative-run.json');
const reportPath = resolve(evidenceRoot, 'report.json');
const atlasFile = 'assets/folded-paper-lamp-atlas-v1.png';
const derivativeFiles = [
  'assets/state-01-folded.png',
  'assets/state-02-third.png',
  'assets/state-03-two-thirds.png',
  'assets/state-04-open.png',
];
const runtimeBundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  atlasFile,
  ...derivativeFiles,
];
const bundleFiles = [
  'index.html',
  'style.css',
  'main.ts',
  'CONTRACT.md',
  'asset-manifest.json',
  atlasFile,
  ...derivativeFiles,
];
const frameRects = [
  { x: 0, y: 0, width: 627, height: 627 },
  { x: 627, y: 0, width: 627, height: 627 },
  { x: 0, y: 627, width: 627, height: 627 },
  { x: 627, y: 627, width: 627, height: 627 },
];

function hashFiles(files: readonly string[]): string {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(Buffer.from([0]));
    hash.update(readFileSync(resolve(sourceRoot, file)));
  }
  return hash.digest('hex');
}

function assetHash(path: string): string {
  return createHash('sha256').update(readFileSync(resolve(sourceRoot, path))).digest('hex');
}

async function alphaCoverage(path: string): Promise<{ width: number; height: number; coverage: number }> {
  const { data, info } = await sharp(resolve(sourceRoot, path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let nonTransparent = 0;
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0) nonTransparent += 1;
  }
  return {
    width: info.width,
    height: info.height,
    coverage: Math.round((nonTransparent / (info.width * info.height)) * 100_000_000) / 100_000_000,
  };
}

describe('R140 folded-light-studio final evidence', () => {
  it('binds the final candidate to contract, manifest, atlas and all four derivatives while preserving the browser runtime hash', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(hashFiles(bundleFiles)).toBe(expectedHash);
    expect(hashFiles(runtimeBundleFiles)).toBe(report.bundleHash);
    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r140-folded-light-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      route: '/pages/v2/deliveries/folded-light-studio/',
      revision: 'r140-proof',
      bundleFiles: runtimeBundleFiles,
      complete: true,
    });
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
    });
  });

  it('proves one generated transparent atlas and four pixel-identical mechanical crop derivatives', async () => {
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const atlasEntry = manifest.assets[0];

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      deliveryId,
      batchId: 'r140-folded-paper-lamp-single-atlas',
      assetBatches: 1,
      generationCalls: 1,
      sourceAssetCount: 1,
      derivativeCount: 4,
      medium: { preferred: 'generated-image', rendering: 'raster-image' },
    });
    expect(manifest.assets.map((asset: any) => asset.path)).toEqual([atlasFile, ...derivativeFiles]);
    expect(atlasEntry).toMatchObject({
      role: 'source-atlas',
      width: 1254,
      height: 1254,
      bytes: readFileSync(resolve(sourceRoot, atlasFile)).length,
      sha256: assetHash(atlasFile),
      alphaCoverage: 0.37593958,
      frameRect: { x: 0, y: 0, width: 1254, height: 1254 },
      sourceLineage: {
        type: 'generated-source',
        provider: 'built-in-imagegen',
        batchId: 'r140-folded-paper-lamp-single-atlas',
        sourceAsset: null,
        sourceSha256: null,
        operation: 'single-transparent-atlas-generation',
      },
    });

    const atlasBytes = readFileSync(resolve(sourceRoot, atlasFile));
    for (let index = 0; index < derivativeFiles.length; index += 1) {
      const path = derivativeFiles[index];
      const entry = manifest.assets[index + 1];
      const frameRect = frameRects[index];
      const actual = await alphaCoverage(path);
      const atlasFrame = await sharp(atlasBytes)
        .extract({ left: frameRect.x, top: frameRect.y, width: frameRect.width, height: frameRect.height })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const derivative = await sharp(resolve(sourceRoot, path)).ensureAlpha().raw().toBuffer();

      expect(entry).toMatchObject({
        path,
        role: 'mechanical-derivative',
        width: actual.width,
        height: actual.height,
        bytes: readFileSync(resolve(sourceRoot, path)).length,
        sha256: assetHash(path),
        alphaCoverage: actual.coverage,
        frameRect,
        sourceLineage: {
          type: 'mechanical-derivative',
          provider: 'local-pixel-crop',
          batchId: 'r140-folded-paper-lamp-single-atlas',
          sourceAsset: atlasFile,
          sourceSha256: atlasEntry.sha256,
          operation: 'pixel-identical-mechanical-crop',
        },
      });
      expect(Buffer.compare(atlasFrame, derivative)).toBe(0);
    }
  });

  it('keeps the existing four-checkpoint browser report and five screenshots as causal evidence', async () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    expect(report.observations.map((item: any) => item.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-causal-journey',
      'mobile-reduced-open',
      'asset-fallback',
    ]);

    const opening = report.observations[0];
    expect(opening).toMatchObject({
      state: 'folded',
      progress: '0.000',
      frameBackgroundSize: 'contain',
      bodyBackgroundImage: 'none',
      viewportWidth: 1440,
      horizontalOverflow: false,
    });
    expect(opening.frameBackground).toContain('state-01-folded.png');
    expect(opening.lampWidth).toBeGreaterThan(1440 * 0.45);
    expect(opening.lampWidth).toBeLessThan(1440 * 0.7);

    const journey = report.observations[1];
    const midWeights = journey.midWeights.split(',').map(Number);
    const finalWeights = journey.finalWeights.split(',').map(Number);
    expect(journey.afterWheel).toBeGreaterThanOrEqual(0.2);
    expect(journey.afterDrag).toBeGreaterThan(journey.afterWheel);
    expect(midWeights.filter((weight: number) => weight > 0)).toHaveLength(2);
    expect(finalWeights[3]).toBeGreaterThan(0.8);
    expect(journey).toMatchObject({ finalInput: 'keyboard', booking: 'confirmed' });

    expect(report.observations[2]).toMatchObject({
      progress: '1.000',
      state: 'open',
      input: 'stage-navigation',
      horizontalOverflow: false,
      trackButtons: 4,
    });
    expect(report.observations[3]).toMatchObject({
      state: 'folded',
      assetStatus: 'failed',
      fallbackVisible: true,
    });

    const captures = [
      ['01-desktop-opening.png', 1440, 900],
      ['02-desktop-mid-unfold.png', 1440, 900],
      ['03-desktop-open-booked.png', 1440, 900],
      ['04-mobile-reduced-open.png', 390, 844],
      ['05-asset-fallback.png', 1440, 900],
    ] as const;
    for (const [file, width, height] of captures) {
      const metadata = await sharp(resolve(evidenceRoot, file)).metadata();
      expect(metadata).toMatchObject({ format: 'png', width, height });
      expect(readFileSync(resolve(evidenceRoot, file)).length).toBeGreaterThan(100_000);
    }
  });

  it('passes the excellent visual gate, mixed-interaction evidence and V3 medium boundary without registering V3', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const identity = { runId, bundleHash: expectedHash };

    expect(run).toMatchObject({
      mediumDecision: { preferred: 'generated-image' },
      assetPlan: {
        batchId: 'r140-folded-paper-lamp-single-atlas',
        strategy: 'generated',
        assets: [{ id: 'state-subject', source: 'generated', required: true }],
      },
      interactionRationale: { mode: 'mixed', audioApplicable: false },
      selectedDirection: {
        id: 'folded-paper-lamp-causal-unfold',
        experienceForm: 'image-sequence-spatial-journey',
      },
      visualAmbition: {
        intentLevel: 'expressive',
        rendering: {
          primary: 'raster-image',
          supporting: ['image-sequence', 'canvas-2d', 'dom-css'],
        },
      },
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
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'scroll',
      'interaction',
    ]);
    expect(run.adaptiveEvidence?.hardGates).toEqual({
      runtimeClean: true,
      criticalAssetsLoaded: true,
      primaryActionReachable: true,
      mobileComplete: true,
      truthfulClaims: true,
      interactionVerified: true,
      audioVerified: null,
    });
    expect(run.adaptiveEvidence?.visualQuality).toMatchObject({
      verdict: 'pass',
      score: 91,
      dimensions: { mobileReadiness: 78 },
      findings: [{ code: 'mobile-open-copy-crop', severity: 'minor', checkpoint: 'mobile' }],
    });
    expect(run.adaptiveEvidence?.macroStructureReview).toMatchObject({
      verdict: 'pass',
      persistentWorkbench: false,
      contentJustified: true,
      candidate: { layout: 'spatial-journey', primaryAction: 'purchase-or-book' },
    });
    expect(run.wowEvidence).toBeUndefined();
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence!, identity)).toMatchObject({
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

  it('keeps the generated-image subject primary and every input on one progress controller', () => {
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');
    const contract = readFileSync(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');

    expect(html).toContain('data-visual-anchor="folded-paper-lamp"');
    expect(html).toContain('结构、透光与光影变化均为概念演示，不代表量产参数');
    expect(html).toContain('不伪装展开效果');
    for (const file of derivativeFiles) expect(css).toContain(file.replace('assets/', './assets/'));
    expect(css).not.toMatch(/body[^}]*folded-paper-lamp-atlas-v1/s);
    expect(main).toContain("const sourceAtlasUrl = new URL('./assets/folded-paper-lamp-atlas-v1.png'");
    expect(main).toContain('Promise.all(assetUrls.map');
    expect(main).toContain("new URL('./assets/state-04-open.png'");
    expect(main).toContain('let targetProgress = 0');
    expect(main).toContain('let displayProgress = 0');
    expect(main).toContain("addEventListener('scroll'");
    expect(main).toContain("dragSurface.addEventListener('pointerdown'");
    expect(main).toContain("addEventListener('keydown'");
    expect(main).toContain('scrollToProgress(1, \'keyboard\')');
    expect(main).toContain('updateFrames(progress)');
    expect(contract).toContain('Interaction model: `mixed`');
    expect(contract).toContain('一次素材批次、一次构建');
    expect(contract).toContain('88 分优秀门');
  });
});
