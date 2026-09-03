import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import { directCreativeRunSchema, isDirectCreativeRunArchiveEligible } from '../src/v2/direct-creative-run.ts';
import { evaluateFinalCreativeEvidence } from '../src/v2/final-creative-evidence.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const deliveryId = 'fridge-tonight';
const runId = 'direct-r143-fridge-tonight';
const expectedHash = 'c91dbd26982c8d8eddf7007c8ed1cf4fd162dd7cd92e568197774542221828b1';
const sourceRoot = resolve(process.cwd(), 'pages', 'v2', 'deliveries', deliveryId);
const evidenceRoot = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r143-fridge-tonight');
const runPath = resolve(process.cwd(), 'docs', 'v2-research', 'evidence', 'r143-fridge-tonight.direct-creative-run.json');
const reportPath = resolve(evidenceRoot, 'report.json');
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'CONTRACT.md', 'asset-manifest.json'] as const;
const captures = [
  ['01-desktop-opening.png', 1440, 2296],
  ['02-desktop-causal-result.png', 1440, 900],
  ['03-desktop-saved.png', 1440, 900],
  ['04-mobile-reduced-result.png', 390, 3157],
  ['05-no-js-readable.png', 1440, 2677],
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

function loadRun() {
  return directCreativeRunSchema.parse(JSON.parse(readFileSync(runPath, 'utf8')));
}

describe('R143 fridge-tonight final V3 evidence', () => {
  it('binds the exact five-file code-native bundle to five clean browser checkpoints', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const run = loadRun();

    expect(hashFiles(bundleFiles)).toBe(expectedHash);
    expect(report).toMatchObject({
      schemaVersion: 1,
      stage: 'r143-fridge-tonight-runtime-observations',
      identityBinding: 'runId+bundleHash',
      runId,
      bundleHash: expectedHash,
      route: '/pages/v2/deliveries/fridge-tonight/',
      revision: 'r143-proof',
      complete: true,
    });
    expect(report.bundleFiles).toEqual(bundleFiles);
    expect(report.captures).toEqual(captures.map(([file]) => file));
    expect(report.observations.map((item: any) => item.checkpoint)).toEqual([
      'desktop-opening',
      'desktop-causal-selection-and-withdrawal',
      'desktop-save-restore-reset',
      'mobile-reduced-result',
      'no-js-readable',
    ]);
    expect(report.observations.every((item: any) => (
      Object.values(item.issues).every((issues: unknown) => Array.isArray(issues) && issues.length === 0)
    ))).toBe(true);
    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      finalCandidate: { runId, bundleHash: expectedHash },
      adaptiveEvidence: { runId, bundleHash: expectedHash },
    });
  });

  it('proves opening, reversible recipe causality, persistence and the no-JS readable base', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const [opening, causal, persistence, _mobile, noJs] = report.observations;

    expect(opening).toMatchObject({
      viewport: { width: 1440, height: 900 },
      state: {
        ready: true,
        revision: 'r143-proof',
        selected: [],
        selectionCount: 0,
        eligible: false,
        menuId: 'none',
        timelineMarks: 0,
        saved: false,
        renderer: 'dom-css-inline-svg',
        horizontalOverflow: false,
      },
      semantic: {
        ingredientButtons: 6,
        canvasCount: 0,
        webglContext: false,
        headline: '快过期，正好今晚。',
      },
    });
    expect(causal.semantic.first).toMatchObject({
      selected: ['tomato', 'eggs'],
      eligible: true,
      menuId: 'tomato-egg-rice',
      menuTitle: '番茄滑蛋盖饭',
      missingItems: ['米饭', '小葱'],
      timelineMarks: 2,
    });
    expect(causal.semantic.withdrawn).toMatchObject({
      selected: ['tomato'],
      eligible: false,
      menuId: 'none',
      menuTitle: '',
      missingItems: [],
      timelineMarks: 1,
    });
    expect(causal.semantic.second).toMatchObject({
      selected: ['tomato', 'tofu'],
      eligible: true,
      menuId: 'tomato-tofu-soup',
      menuTitle: '番茄豆腐暖汤',
      missingItems: ['生姜', '米饭'],
      timelineMarks: 2,
    });
    expect(causal.semantic.first.menuId).not.toBe(causal.semantic.second.menuId);
    expect(causal.semantic.first.missingItems).not.toEqual(causal.semantic.second.missingItems);
    expect(persistence.semantic.savedState).toMatchObject({
      selected: ['spinach', 'mushroom'],
      menuId: 'greens-mushroom-noodles',
      menuTitle: '菌菇青蔬拌面',
      saved: true,
    });
    expect(persistence.semantic.restored).toMatchObject({
      selected: ['spinach', 'mushroom'],
      menuId: 'greens-mushroom-noodles',
      saved: true,
    });
    expect(persistence.semantic.reset).toMatchObject({
      selected: [],
      selectionCount: 0,
      eligible: false,
      menuId: 'none',
      timelineMarks: 0,
      saved: false,
    });
    expect(noJs).toMatchObject({
      viewport: { width: 1440, height: 900 },
      state: { ready: 'false', buttons: 6, canvasCount: 0, horizontalOverflow: false },
    });
  });

  it('proves the complete 390px reduced-motion result and five physical screenshots', async () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const mobile = report.observations.find((item: any) => item.checkpoint === 'mobile-reduced-result');

    expect(mobile).toMatchObject({
      viewport: { width: 390, height: 844 },
      state: {
        ready: true,
        revision: 'r143-proof',
        selected: ['tofu', 'mushroom'],
        selectionCount: 2,
        eligible: true,
        menuId: 'mushroom-tofu',
        menuTitle: '菌菇烧豆腐',
        missingItems: ['小葱', '生抽'],
        timelineMarks: 2,
        reducedMotion: true,
        horizontalOverflow: false,
      },
      semantic: { innerWidth: 390 },
    });
    expect(mobile.semantic.firstButton.width).toBeGreaterThan(44);
    expect(mobile.semantic.firstButton.height).toBeGreaterThan(44);

    for (const [file, width, height] of captures) {
      const bytes = readFileSync(resolve(evidenceRoot, file));
      const metadata = await sharp(bytes).metadata();
      expect(metadata).toMatchObject({ format: 'png', width, height });
      expect(bytes.length).toBeGreaterThan(100_000);
    }
  });

  it('locks the truthful zero-asset DOM/CSS/inline-SVG decision without a hidden Three route', () => {
    const manifest = JSON.parse(readFileSync(resolve(sourceRoot, 'asset-manifest.json'), 'utf8'));
    const html = readFileSync(resolve(sourceRoot, 'index.html'), 'utf8');
    const css = readFileSync(resolve(sourceRoot, 'style.css'), 'utf8');
    const main = readFileSync(resolve(sourceRoot, 'main.ts'), 'utf8');
    const contract = readFileSync(resolve(sourceRoot, 'CONTRACT.md'), 'utf8');

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      deliveryId,
      batchId: 'r143-code-native-no-assets',
      assetBatches: 0,
      generationCalls: 0,
      sourceAssetCount: 0,
      derivativeCount: 0,
      medium: { preferred: 'code-native', rendering: 'dom-css', supporting: ['inline-svg'] },
      assets: [],
    });
    expect(manifest.lineagePolicy).toContain('No asset batch was created');
    expect(html.match(/<svg\b/g)).toHaveLength(7);
    expect(html.match(/data-fridge-ingredient=/g)).toHaveLength(6);
    expect(html).not.toMatch(/<img\b|<video\b|<audio\b|<canvas\b|(?:src|href)\s*=\s*["']https?:\/\//i);
    expect(css).not.toMatch(/url\s*\(\s*["']?https?:\/\//i);
    expect(main).not.toMatch(/from\s+["']three["']|WebGLRenderingContext|getContext\s*\(\s*["']webgl|AudioContext/i);
    expect(main).toContain('window.__FRIDGE_TONIGHT__ = { snapshot, reset }');
    expect(main).toContain('function toggleIngredient(id: IngredientId)');
    expect(main).toContain('function renderTimeline(items: Ingredient[])');
    expect(main).toContain('function renderMenu(items: Ingredient[])');
    expect(contract).toContain('用户没有禁止 Three.js、WebGL、生成图或外部素材');
    expect(contract).toContain('Rendering base: semantic DOM + CSS + inline SVG');
    expect(contract).toContain('Macro structure: 内容适配的连续编辑流');
    expect(contract).toContain('素材批次：0 / 1');
    expect(contract).toContain('视觉精修：最多 1 次');
  });

  it('passes V3 quality, editorial structure, bounded attempts and optional Wow handling', () => {
    const run = loadRun();
    const identity = { runId, bundleHash: expectedHash };

    expect(run).toMatchObject({
      creativeProtocolVersion: 3,
      id: runId,
      verdict: 'pass',
      mediumDecision: { preferred: 'code-native', assetResponsibilities: [] },
      assetPlan: { batchId: 'r143-code-native-no-assets', strategy: 'none', assets: [] },
      interactionRationale: { mode: 'direct', audioApplicable: false },
      visualAmbition: {
        intentLevel: 'expressive',
        rendering: { primary: 'dom-css', supporting: ['svg'] },
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
      adaptiveEvidence: {
        hardGates: { audioVerified: null },
        visualQuality: { verdict: 'pass', score: 92 },
        macroStructureReview: {
          verdict: 'pass',
          persistentWorkbench: false,
          contentJustified: true,
          candidate: {
            layout: 'editorial-flow',
            persistentControlPanel: false,
            visibleParameterControls: false,
            realtimeMetricCluster: false,
          },
        },
      },
      wowEvidence: {
        assessment: { required: false, verdict: 'not-required' },
      },
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening',
      'core',
      'mobile',
      'interaction',
    ]);
    expect(evaluateFinalCreativeEvidence(run.adaptiveEvidence!, identity)).toMatchObject({
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
});
