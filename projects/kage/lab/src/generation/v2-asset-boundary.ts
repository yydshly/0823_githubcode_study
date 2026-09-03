import { assertEffectSpec, type AssetRequirement, type EffectSpec } from './effect-spec.ts';
import type { V2CreativeContract } from '../v2/creative-contract.ts';

type ContractAsset = V2CreativeContract['assets'][number];

/**
 * The model may propose useful visual details, but it cannot add a harder asset
 * dependency than the deterministic V2 contract. This adapter keeps the model's
 * composition and motion while making the contract the source of truth for assets.
 */
export function alignEffectSpecAssetsToV2Contract(
  effectSpec: EffectSpec,
  contract: V2CreativeContract
): EffectSpec {
  if (!effectSpec.composition || !Array.isArray(effectSpec.composition.layers)) return effectSpec;
  const contractAssets = contract.assets.filter((asset) => asset.modality !== 'procedural');
  const requirements = contractAssets.map((asset) => requirementFromContract(asset));
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  const layers = effectSpec.composition.layers.map((layer) => ({
    ...layer,
    assetRequirementIds: layer.assetRequirementIds.filter((id) => requirementIds.has(id))
  }));

  for (const requirement of requirements) {
    const target = preferredLayerIndex(layers, requirement.role);
    if (target < 0) continue;
    const layer = layers[target];
    if (!layer.assetRequirementIds.includes(requirement.id)) {
      layers[target] = { ...layer, assetRequirementIds: [...layer.assetRequirementIds, requirement.id] };
    }
  }

  return assertEffectSpec({
    ...effectSpec,
    composition: { ...effectSpec.composition, layers },
    assetRequirements: requirements
  });
}

function requirementFromContract(asset: ContractAsset): AssetRequirement {
  const modality = effectModality(asset.modality);
  const integration = asset.integration === 'native-procedural' ? 'native-media' : asset.integration;
  return {
    id: asset.id,
    role: asset.role,
    modality,
    purpose: asset.visualResponsibility,
    required: asset.required,
    minimumQuality: asset.minimumQuality,
    fidelity: asset.role === 'information' || modality === 'model-3d' ? 'accurate' : 'recognizable',
    fallback: effectFallback(asset.fallback),
    experience: {
      anchor: asset.role === 'environment' ? 0.25 : asset.role === 'information' ? 0.68 : 0.48,
      function: asset.role === 'environment' ? 'establish' : asset.role === 'information' ? 'transform' : 'persistent',
      visualState: asset.visibleProof,
      continuity: asset.continuityRule,
      integration
    }
  };
}

function effectModality(modality: ContractAsset['modality']): AssetRequirement['modality'] {
  if (modality === 'transparent-image') return 'image';
  if (modality === 'image-sequence') return 'environment';
  if (modality === 'model-3d') return 'model-3d';
  if (modality === 'texture') return 'texture';
  throw new Error('程序化职责不应进入外部素材适配。');
}

function effectFallback(fallback: ContractAsset['fallback']): AssetRequirement['fallback'] {
  if (fallback === 'block') return 'block';
  if (fallback === 'dom-only') return 'dom-only';
  if (fallback === 'static-image') return 'image-plane';
  return 'procedural';
}

function preferredLayerIndex(
  layers: EffectSpec['composition']['layers'],
  role: AssetRequirement['role']
): number {
  const preferred = role === 'environment'
    ? ['world', 'background']
    : role === 'subject'
      ? ['foreground', 'world', 'content']
      : role === 'information'
        ? ['content', 'foreground', 'interaction']
        : ['background', 'world', 'postprocess'];
  const found = layers.findIndex((layer) => preferred.includes(layer.role));
  return found >= 0 ? found : layers.length ? 0 : -1;
}
