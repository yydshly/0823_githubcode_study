import { z } from 'zod';
import { assetCandidateSchema } from './asset-plan.ts';
import { decideImageAssetUse } from './asset-use-policy.ts';
import { effectSpecSchema, type AssetRequirement, type EffectSpec } from './effect-spec.ts';

export const assetProductionRequestSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.literal('minimax'),
  brief: z.string().trim().min(8).max(600),
  effectSpec: effectSpecSchema,
  seed: z.number().int().nonnegative().max(2_147_483_647)
}).strict();

export const assetProductionReportSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  provider: z.literal('minimax'),
  model: z.string().min(1),
  status: z.enum(['ready', 'partial', 'blocked']),
  assets: z.array(assetCandidateSchema),
  unsupportedRequirementIds: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  cache: z.object({ hits: z.number().int().nonnegative(), misses: z.number().int().nonnegative() }).strict(),
  messages: z.array(z.string().min(4)).min(1)
}).strict();

export type AssetProductionRequest = z.infer<typeof assetProductionRequestSchema>;
export type AssetProductionReport = z.infer<typeof assetProductionReportSchema>;

export function producibleImageRequirements(effectSpec: EffectSpec): AssetRequirement[] {
  const approved = new Set(decideImageAssetUse(effectSpec).approvedRequirementIds);
  return effectSpec.assetRequirements.filter((item) => approved.has(item.id));
}

export function compileAssetPrompt(brief: string, effectSpec: EffectSpec, requirement: AssetRequirement): string {
  const layerPurposes = effectSpec.composition.layers
    .filter((layer) => layer.assetRequirementIds.includes(requirement.id))
    .map((layer) => layer.visibleOutcome);
  const experience = requirement.experience;
  const compositionInstruction = experience
    ? integrationInstruction(experience.integration)
    : 'Compose as a flexible website visual with a clear subject and enough environmental continuation for integration.';
  return [
    `Create a production-minded visual asset for an immersive Three.js ${effectSpec.route}.`,
    `User intent: ${brief}`,
    `Subject: ${effectSpec.goal.subject}. Audience: ${effectSpec.goal.audience}.`,
    `Asset role: ${requirement.role}. Purpose: ${requirement.purpose}`,
    `Signature moment: ${effectSpec.direction.signatureMoment}`,
    `Spatial metaphor: ${effectSpec.direction.spatialMetaphor}`,
    `Visual grammar: ${effectSpec.direction.visualGrammar.join(', ')}.`,
    `Mood arc: ${effectSpec.direction.moodArc.join(' → ')}.`,
    `Palette: deep ${effectSpec.direction.palette.deep}, accent ${effectSpec.direction.palette.accent}, secondary ${effectSpec.direction.palette.accentSoft}.`,
    experience ? `Experience anchor: ${experience.anchor.toFixed(2)} / 1. Narrative function: ${experience.function}.` : '',
    experience ? `Required visual state: ${experience.visualState}` : '',
    experience ? `Continuity with adjacent states: ${experience.continuity}` : '',
    layerPurposes.length ? `Visible runtime outcome: ${layerPurposes.join(' ')}` : '',
    compositionInstruction,
    'No text, letters, logos, watermarks, UI panels, generic HUD overlays, or stock-template composition.',
    'Prioritize a clear visual subject, believable material, controlled lighting, depth separation, and a strong final memory point.'
  ].filter(Boolean).join('\n').slice(0, 1500);
}

function integrationInstruction(integration: NonNullable<AssetRequirement['experience']>['integration']): string {
  if (integration === 'alpha-subject') return 'Create one isolated, extraction-friendly subject with generous safe margin, complete silhouette, no frame, no floor line, and strong edge separation; it will be composited over a continuous WebGL environment.';
  if (integration === 'full-bleed-environment') return 'Create a full-bleed 16:9 environment whose light, depth, and texture continue through every edge; avoid a centered poster or visible frame.';
  if (integration === 'seamless-field') return 'Create an edge-continuous material or atmospheric field that can cover and softly blend across the viewport without a visible rectangular boundary.';
  if (integration === 'spatial-object') return 'Create a clearly readable spatial object with believable scale, material, grounding cues, and enough surrounding context for depth-aware Three.js staging.';
  return 'Create native media-ready imagery with stable composition, clean temporal intent, and no embedded interface or typography.';
}
