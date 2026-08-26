import { z } from 'zod';
import type { ProviderProvenance, CreativeBrief, CreativeDirection } from './schema.ts';
import { assertEffectSpec, assetExperienceSchema, assetRequirementSchema, effectSpecSchema, type EffectSpec } from './effect-spec.ts';
import { stableHash } from './stable-hash.ts';

const shape = effectSpecSchema.shape;
const modelAssetRequirementSchema = assetRequirementSchema.extend({
  experience: assetExperienceSchema
}).strict();

/** Model-owned creative fields. Runtime provenance and schema metadata are injected after validation. */
export const modelEffectSpecDraftSchema = z.object({
  id: shape.id.describe('Stable kebab-case direction id, without provider or runtime names.'),
  title: shape.title.max(24),
  thesis: shape.thesis.max(140),
  route: shape.route,
  goal: shape.goal,
  direction: shape.direction,
  composition: shape.composition,
  motion: shape.motion,
  assetRequirements: z.array(modelAssetRequirementSchema).max(16),
  constraints: shape.constraints,
  reasoning: shape.reasoning
}).strict();

export type ModelEffectSpecDraft = z.infer<typeof modelEffectSpecDraftSchema>;

export function materializeModelEffectSpec(
  draft: ModelEffectSpecDraft,
  brief: CreativeBrief,
  provenance: ProviderProvenance
): EffectSpec {
  const briefHash = stableHash(`${brief.text}|${brief.seed ?? 0}`);
  return assertEffectSpec({
    ...draft,
    schemaVersion: 1,
    id: `effect-${briefHash}-${draft.id}`,
    provenance: {
      source: 'model',
      providerId: `${provenance.selected}:${provenance.model}`,
      model: provenance.model,
      briefHash
    }
  });
}

export function assertEffectSpecDiversity(effectSpecs: readonly EffectSpec[]): void {
  for (let left = 0; left < effectSpecs.length; left += 1) {
    for (let right = left + 1; right < effectSpecs.length; right += 1) {
      const dimensions = diversityDimensions(effectSpecs[left], effectSpecs[right]);
      if (dimensions.length < 3) {
        throw new Error(`EffectSpec ${effectSpecs[left].id} 与 ${effectSpecs[right].id} 只有 ${dimensions.length} 个实质差异维度；至少需要 3 个。`);
      }
    }
  }
}

function diversityDimensions(left: EffectSpec, right: EffectSpec): string[] {
  const dimensions: string[] = [];
  const signature = (value: readonly string[]) => [...value].map((item) => item.trim().toLowerCase()).sort().join('|');
  const techniques = (effectSpec: EffectSpec) => signature(effectSpec.composition.layers.flatMap((layer) => layer.techniques));
  const assets = (effectSpec: EffectSpec) => signature(effectSpec.assetRequirements.map((asset) => `${asset.modality}:${asset.fidelity}:${asset.fallback}`));
  if (left.route !== right.route) dimensions.push('route');
  if (left.composition.mode !== right.composition.mode) dimensions.push('composition');
  if (left.direction.spatialMetaphor.trim().toLowerCase() !== right.direction.spatialMetaphor.trim().toLowerCase()) dimensions.push('metaphor');
  if (signature(left.direction.visualGrammar) !== signature(right.direction.visualGrammar)) dimensions.push('visual-grammar');
  if (left.motion.cameraStrategy.trim().toLowerCase() !== right.motion.cameraStrategy.trim().toLowerCase()) dimensions.push('camera');
  if (signature(left.motion.drivers) !== signature(right.motion.drivers)) dimensions.push('interaction');
  if (techniques(left) !== techniques(right)) dimensions.push('techniques');
  if (assets(left) !== assets(right)) dimensions.push('assets');
  return dimensions;
}

/**
 * Temporary adapter from an unconstrained EffectSpec to today's two verified scene plugins.
 * It is a preview/compiler choice, not part of the model's creative vocabulary.
 */
export function compileRuntimeCompatibilityDirection(effectSpec: EffectSpec, index: number): CreativeDirection {
  const structure = runtimeStructure(effectSpec);
  const scenePlugin = 'composed-world' as const;
  const nodeCount = structure === 'focus' ? 1 : structure === 'branching' ? 5 : Math.max(3, Math.min(5, effectSpec.direction.moodArc.length));
  return {
    id: `runtime-${effectSpec.id}`,
    title: effectSpec.title,
    thesis: effectSpec.thesis,
    structure,
    scenePlugin,
    nodeCount,
    pace: effectSpec.motion.pace,
    theme: effectSpec.direction.palette,
    tags: effectSpec.direction.visualGrammar.slice(0, 5),
    rationale: [
      ...effectSpec.reasoning.slice(0, 2),
      `候选 ${index + 1} 由 EffectSpec 编译为组合场景语法；未生产的真实素材继续保留为显式缺口。`
    ]
  };
}

function runtimeStructure(effectSpec: EffectSpec): CreativeDirection['structure'] {
  if (effectSpec.motion.drivers.includes('choice')) return 'branching';
  if (effectSpec.route === 'cinematic-showcase' || (effectSpec.direction.moodArc.length <= 3 && effectSpec.composition.layers.length <= 4)) return 'focus';
  return 'journey';
}

