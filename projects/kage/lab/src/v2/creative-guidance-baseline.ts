import { z } from 'zod';
import {
  CREATIVE_CAPABILITY_REGISTRY,
  creativeCapabilityIdSchema
} from './creative-capability-registry.ts';
import {
  CREATIVE_QUALITY_CANON,
  creativeQualityDimensionIdSchema
} from './creative-quality-guidance.ts';

const provenSystemCapabilityIdSchema = z.enum([
  'experience-intent-and-promise',
  'positive-reference-and-quality-guidance',
  'open-capability-selection',
  'bounded-codex-direct-preparation',
  'adaptive-browser-evidence',
  'final-identity-and-formal-product-registration'
]);

const unresolvedGapIdSchema = z.enum([
  'no-workbench-backend-direct-executor',
  'no-unified-artifact-registry',
  'no-automatic-independent-taste-judge',
  'no-unified-first-preview-latency',
  'no-remote-multi-user-security'
]);

export const creativeGuidanceBaselineSchema = z.object({
  schemaVersion: z.literal(1),
  release: z.literal('v2.6'),
  stage: z.literal('r171'),
  status: z.literal('frozen-guidance-baseline'),
  firstGoal: z.object({
    outcome: z.literal('idea-to-emotionally-resonant-creative-web-product'),
    successBasis: z.literal('final-rendered-experience-and-product-evidence'),
    productStructure: z.literal('content-adaptive'),
    techniquePolicy: z.literal('open-and-subordinate-to-experience')
  }).strict(),
  authority: z.object({
    hardInstructionSources: z.tuple([z.literal('user'), z.literal('quality')]),
    advisoryInstructionSources: z.tuple([z.literal('reference'), z.literal('inference')]),
    globalStyleBans: z.array(z.never()).max(0),
    referencePolicy: z.literal('borrow-principles-never-copy-pages'),
    unlistedMethods: z.literal('allowed-when-better')
  }).strict(),
  guidance: z.object({
    qualityDimensionIds: z.array(creativeQualityDimensionIdSchema).length(7),
    capabilityIds: z.array(creativeCapabilityIdSchema).length(8),
    maximumRelevantReferences: z.literal(3),
    lowRelevanceAction: z.literal('omit-reference'),
    capabilityCatalogIsWhitelist: z.literal(false)
  }).strict(),
  executionBoundary: z.object({
    creativeDirectionsBuilt: z.literal(1),
    assetBatches: z.literal(1),
    fullBuilds: z.literal(1),
    maximumDeterministicRepairs: z.literal(2),
    maximumVisualRefinements: z.literal(1),
    silentRetries: z.literal(0),
    sixtySecondProgressReport: z.literal(true)
  }).strict(),
  maturity: z.object({
    state: z.literal('guidance-and-manual-codex-direct-ready'),
    provenSystemCapabilities: z.array(provenSystemCapabilityIdSchema).length(6),
    stillRequiresCodexJudgment: z.literal(true),
    unresolvedGaps: z.array(unresolvedGapIdSchema).length(5)
  }).strict(),
  evidence: z.object({
    formalProductId: z.literal('kage-feeling-lens'),
    formalProductRunId: z.literal('direct-r169-kage-feeling-lens'),
    structureRegressionStage: z.literal('r170-creative-shape-regression'),
    structureRegressionVerdict: z.literal('pass-with-note')
  }).strict(),
  nextValidation: z.object({
    mode: z.literal('single-unseen-kage-related-formal-product'),
    question: z.string().trim().min(40),
    mustProve: z.tuple([
      z.literal('guidance-is-derived-before-build'),
      z.literal('theme-specific-feeling-and-signature-moment'),
      z.literal('content-adaptive-media-structure-and-interaction'),
      z.literal('complete-product-use-result-and-continuation'),
      z.literal('final-browser-evidence-bound-to-the-bundle'),
      z.literal('honest-stop-when-excellence-is-not-reached')
    ]),
    archivePolicy: z.literal('one-best-result-or-research-only-stop'),
    newRulesAllowedDuringValidation: z.literal(false)
  }).strict(),
  compatibility: z.object({
    v1Unchanged: z.literal(true),
    frozenDeliveriesUnchanged: z.literal(true),
    workbenchBackendIntegrationDeferred: z.literal(true),
    newModelProviderDeferred: z.literal(true)
  }).strict()
}).strict();

export type CreativeGuidanceBaseline = z.infer<typeof creativeGuidanceBaselineSchema>;

/**
 * R171 is a recoverable project truth, not another visual rule set. It binds
 * the guidance already proven in R167–R170 and names the gaps that remain.
 */
export const CREATIVE_GUIDANCE_BASELINE_R171: CreativeGuidanceBaseline =
  creativeGuidanceBaselineSchema.parse({
    schemaVersion: 1,
    release: 'v2.6',
    stage: 'r171',
    status: 'frozen-guidance-baseline',
    firstGoal: {
      outcome: 'idea-to-emotionally-resonant-creative-web-product',
      successBasis: 'final-rendered-experience-and-product-evidence',
      productStructure: 'content-adaptive',
      techniquePolicy: 'open-and-subordinate-to-experience'
    },
    authority: {
      hardInstructionSources: ['user', 'quality'],
      advisoryInstructionSources: ['reference', 'inference'],
      globalStyleBans: [],
      referencePolicy: 'borrow-principles-never-copy-pages',
      unlistedMethods: 'allowed-when-better'
    },
    guidance: {
      qualityDimensionIds: CREATIVE_QUALITY_CANON.map((dimension) => dimension.id),
      capabilityIds: CREATIVE_CAPABILITY_REGISTRY.map((capability) => capability.id),
      maximumRelevantReferences: 3,
      lowRelevanceAction: 'omit-reference',
      capabilityCatalogIsWhitelist: false
    },
    executionBoundary: {
      creativeDirectionsBuilt: 1,
      assetBatches: 1,
      fullBuilds: 1,
      maximumDeterministicRepairs: 2,
      maximumVisualRefinements: 1,
      silentRetries: 0,
      sixtySecondProgressReport: true
    },
    maturity: {
      state: 'guidance-and-manual-codex-direct-ready',
      provenSystemCapabilities: [
        'experience-intent-and-promise',
        'positive-reference-and-quality-guidance',
        'open-capability-selection',
        'bounded-codex-direct-preparation',
        'adaptive-browser-evidence',
        'final-identity-and-formal-product-registration'
      ],
      stillRequiresCodexJudgment: true,
      unresolvedGaps: [
        'no-workbench-backend-direct-executor',
        'no-unified-artifact-registry',
        'no-automatic-independent-taste-judge',
        'no-unified-first-preview-latency',
        'no-remote-multi-user-security'
      ]
    },
    evidence: {
      formalProductId: 'kage-feeling-lens',
      formalProductRunId: 'direct-r169-kage-feeling-lens',
      structureRegressionStage: 'r170-creative-shape-regression',
      structureRegressionVerdict: 'pass-with-note'
    },
    nextValidation: {
      mode: 'single-unseen-kage-related-formal-product',
      question: '冻结的正向指导能否在不增加案例和规则的前提下，把一个未使用过且与 KAGE 创作者产品相关的想法，收敛为一个真正优秀的正式网页产品？',
      mustProve: [
        'guidance-is-derived-before-build',
        'theme-specific-feeling-and-signature-moment',
        'content-adaptive-media-structure-and-interaction',
        'complete-product-use-result-and-continuation',
        'final-browser-evidence-bound-to-the-bundle',
        'honest-stop-when-excellence-is-not-reached'
      ],
      archivePolicy: 'one-best-result-or-research-only-stop',
      newRulesAllowedDuringValidation: false
    },
    compatibility: {
      v1Unchanged: true,
      frozenDeliveriesUnchanged: true,
      workbenchBackendIntegrationDeferred: true,
      newModelProviderDeferred: true
    }
  });
