import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CREATIVE_CAPABILITY_REGISTRY
} from '../src/v2/creative-capability-registry.ts';
import {
  CREATIVE_GUIDANCE_BASELINE_R171,
  creativeGuidanceBaselineSchema
} from '../src/v2/creative-guidance-baseline.ts';
import { CREATIVE_FREEDOM_POLICY } from '../src/v2/creative-freedom-policy.ts';
import { CREATIVE_QUALITY_CANON } from '../src/v2/creative-quality-guidance.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('R171 frozen creative guidance baseline', () => {
  it('freezes the first goal without freezing a style, medium or page shape', () => {
    const baseline = creativeGuidanceBaselineSchema.parse(CREATIVE_GUIDANCE_BASELINE_R171);

    expect(baseline).toMatchObject({
      release: 'v2.6',
      stage: 'r171',
      status: 'frozen-guidance-baseline',
      firstGoal: {
        outcome: 'idea-to-emotionally-resonant-creative-web-product',
        successBasis: 'final-rendered-experience-and-product-evidence',
        productStructure: 'content-adaptive',
        techniquePolicy: 'open-and-subordinate-to-experience'
      }
    });
    expect(baseline.authority.globalStyleBans).toEqual([]);
    expect(baseline.authority.hardInstructionSources).toEqual(['user', 'quality']);
    expect(baseline.authority.advisoryInstructionSources).toEqual(['reference', 'inference']);
    expect(baseline.authority.unlistedMethods).toBe('allowed-when-better');
    expect(CREATIVE_FREEDOM_POLICY.methodSpace).toBe('open-including-unlisted-and-invented');
  });

  it('binds the frozen baseline to the real quality and capability registries', () => {
    expect(CREATIVE_GUIDANCE_BASELINE_R171.guidance.qualityDimensionIds).toEqual(
      CREATIVE_QUALITY_CANON.map((dimension) => dimension.id)
    );
    expect(CREATIVE_GUIDANCE_BASELINE_R171.guidance.capabilityIds).toEqual(
      CREATIVE_CAPABILITY_REGISTRY.map((capability) => capability.id)
    );
    expect(CREATIVE_GUIDANCE_BASELINE_R171.guidance.maximumRelevantReferences).toBe(3);
    expect(CREATIVE_GUIDANCE_BASELINE_R171.guidance.capabilityCatalogIsWhitelist).toBe(false);
  });

  it('states the actual maturity instead of claiming background one-click generation', () => {
    const baseline = CREATIVE_GUIDANCE_BASELINE_R171;
    expect(baseline.maturity.state).toBe('guidance-and-manual-codex-direct-ready');
    expect(baseline.maturity.stillRequiresCodexJudgment).toBe(true);
    expect(baseline.maturity.unresolvedGaps).toEqual([
      'no-workbench-backend-direct-executor',
      'no-unified-artifact-registry',
      'no-automatic-independent-taste-judge',
      'no-unified-first-preview-latency',
      'no-remote-multi-user-security'
    ]);
    expect(baseline.nextValidation).toMatchObject({
      mode: 'single-unseen-kage-related-formal-product',
      archivePolicy: 'one-best-result-or-research-only-stop',
      newRulesAllowedDuringValidation: false
    });
  });

  it('binds the conclusion to R169 and R170 without changing their frozen identities', () => {
    const finalEvidence = JSON.parse(read('docs/v2-research/evidence/r169-kage-feeling-lens.final.json'));
    const regression = JSON.parse(read('docs/v2-research/evidence/r170-creative-shape-regression/report.json'));
    const formal = V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === 'kage-feeling-lens');

    expect(finalEvidence.identity.runId).toBe(CREATIVE_GUIDANCE_BASELINE_R171.evidence.formalProductRunId);
    expect(formal).toMatchObject({
      runId: finalEvidence.identity.runId,
      bundleHash: finalEvidence.identity.bundleHash,
      status: 'formal-product'
    });
    expect(regression.stage).toBe(CREATIVE_GUIDANCE_BASELINE_R171.evidence.structureRegressionStage);
    expect(regression.comparison.verdict).toBe(
      CREATIVE_GUIDANCE_BASELINE_R171.evidence.structureRegressionVerdict
    );
    expect(regression.complete).toBe(true);
  });

  it('keeps the release, status page, README and bounded command aligned', () => {
    const release = read('docs/releases/V2.6-CREATIVE-GUIDANCE-BASELINE.md');
    const closure = read('docs/v2-research/V2-R171-STAGE-CLOSURE.md');
    const page = read('pages/v2/index.html');
    const labReadme = read('README.md');
    const projectReadme = read('../README.md');
    const packageJson = JSON.parse(read('package.json'));

    expect(release).toContain('Status: **FROZEN GUIDANCE BASELINE**');
    expect(release).toContain('正向指导与人工 Codex 直创可用');
    expect(closure).toContain('不满足则记录为研究结果');
    expect(page).toContain('V2.6 CREATIVE GUIDANCE / R171 FROZEN');
    expect(page).toContain('后台自动 Codex / 统一 Artifact Registry');
    expect(labReadme).toContain('V2.6 正向创作指导基线已冻结');
    expect(projectReadme).toContain('V2.6 正向创作指导基线');
    expect(packageJson.scripts['verify:r171']).toContain('test:browser:r171');
  });
});
