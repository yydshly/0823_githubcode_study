import type { ExperienceManifest, SceneAssetReference } from '../experience/schema';
import { assertExperienceManifest } from '../experience/validator';
import type { AssetCandidate } from './asset-plan';
import type { EffectSpec } from './effect-spec';

export function attachGeneratedAssets(
  manifest: ExperienceManifest,
  effectSpec: EffectSpec,
  candidates: readonly AssetCandidate[]
): ExperienceManifest {
  const visualCandidates = candidates.filter((candidate) => candidate.modality === 'image' || candidate.modality === 'texture' || candidate.modality === 'sprite' || candidate.modality === 'environment');
  if (!visualCandidates.length) return manifest;
  const scene = manifest.scenes.main ?? Object.values(manifest.scenes)[0];
  if (!scene) return manifest;
  const assets: SceneAssetReference[] = visualCandidates.map((candidate) => {
    const requirement = effectSpec.assetRequirements.find((item) => item.id === candidate.requirementId);
    return {
      id: candidate.requirementId,
      role: requirement?.purpose || 'generated visual asset',
      modality: candidate.modality,
      uri: candidate.uri,
      source: candidate.source === 'user-supplied' || candidate.source === 'captured' ? 'user-provided' : candidate.source,
      qualityLevel: candidate.qualityLevel,
      payloadBytes: candidate.payloadBytes,
      required: requirement?.required || false,
      ...(requirement?.experience ? { experience: requirement.experience } : {})
    };
  });
  return assertExperienceManifest({
    ...manifest,
    presentation: {
      brandLabel: `${effectSpec.title.toUpperCase()} / GENERATED`,
      footerLabel: 'MODEL ASSET / THREE.JS DIRECTION / HUMAN REVIEW',
      footerCopy: '该预览使用刚物化的模型素材；素材质量、许可与最终构图仍需在真实浏览器中确认。'
    },
    scenes: {
      ...manifest.scenes,
      [scene.id]: {
        ...scene,
        plugin: 'resonance-flagship',
        preset: 'generated-image-cinematic',
        effectPlugins: [],
        recipe: undefined,
        assets,
        postprocess: { type: 'bloom', strength: .42, radius: .3, threshold: .76 }
      }
    }
  });
}
