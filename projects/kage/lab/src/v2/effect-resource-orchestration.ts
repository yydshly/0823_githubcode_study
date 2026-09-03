import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';

export const effectResourceSourceTypeSchema = z.enum([
  'existing-product-capability',
  'github-implementation',
  'model-generated-asset',
  'project-existing-capability',
  'direct-original-code'
]);

export type EffectResourceSourceType = z.infer<typeof effectResourceSourceTypeSchema>;

export const effectResourceOrchestrationSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.literal('open-best-fit-resources'),
  sources: z.tuple([
    z.literal('existing-product-capability'),
    z.literal('github-implementation'),
    z.literal('model-generated-asset'),
    z.literal('project-existing-capability'),
    z.literal('direct-original-code')
  ]),
  selection: z.object({
    sourceCountPolicy: z.literal('minimum-sufficient'),
    combinationAllowed: z.literal(true),
    mandatorySource: z.literal('none'),
    vendorOrModelWhitelist: z.literal('none'),
    selectionRule: z.literal('effect-first-quality-evidence-risk'),
    visualIdentityPolicy: z.literal('capability-not-identity')
  }).strict(),
  executionBounds: z.object({
    researchPolicy: z.literal('reviewed-evidence-first'),
    generatedAssetBatches: z.literal(1),
    dependencyDecision: z.literal('freeze-before-build'),
    postBuildDependencyChange: z.literal('deterministic-fix-only'),
    silentAlternatives: z.literal(0)
  }).strict(),
  qualityGates: z.tuple([
    z.literal('generated-final-quality'),
    z.literal('external-truth-and-fallback'),
    z.literal('github-revision-license-fallback'),
    z.literal('procedural-not-hero-placeholder'),
    z.literal('browser-final-judge')
  ])
}).strict();

export type EffectResourceOrchestration = z.infer<typeof effectResourceOrchestrationSchema>;

export function deriveEffectResourceOrchestration(
  _contract: V2CreativeContract
): EffectResourceOrchestration {
  return effectResourceOrchestrationSchema.parse({
    schemaVersion: 1,
    mode: 'open-best-fit-resources',
    sources: [
      'existing-product-capability',
      'github-implementation',
      'model-generated-asset',
      'project-existing-capability',
      'direct-original-code'
    ],
    selection: {
      sourceCountPolicy: 'minimum-sufficient',
      combinationAllowed: true,
      mandatorySource: 'none',
      vendorOrModelWhitelist: 'none',
      selectionRule: 'effect-first-quality-evidence-risk',
      visualIdentityPolicy: 'capability-not-identity'
    },
    executionBounds: {
      researchPolicy: 'reviewed-evidence-first',
      generatedAssetBatches: 1,
      dependencyDecision: 'freeze-before-build',
      postBuildDependencyChange: 'deterministic-fix-only',
      silentAlternatives: 0
    },
    qualityGates: [
      'generated-final-quality',
      'external-truth-and-fallback',
      'github-revision-license-fallback',
      'procedural-not-hero-placeholder',
      'browser-final-judge'
    ]
  });
}
