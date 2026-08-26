import type { EffectSpec } from './effect-spec';
import { decideImageAssetUse, isImageGeneratorCompatible } from './asset-use-policy';

export interface AssetResolutionPlan {
  route: 'catalog' | 'generate' | 'procedural' | 'blocked';
  message: string;
}

/**
 * Chooses the smallest truthful asset route before dedicated code generation.
 * Provider availability can execute a decision, but cannot change whether an asset is useful.
 */
export function planAssetResolution(
  effectSpec: EffectSpec,
  matchedAssetModalities: readonly string[],
  imageGeneratorAvailable: boolean,
  brief = '',
  matchedAssetCount = matchedAssetModalities.length
): AssetResolutionPlan {
  const available = new Set(matchedAssetModalities);
  const declaredHardNeeds = effectSpec.assetRequirements
    .filter((requirement) => requirement.required && requirement.fallback === 'block')
    .map((requirement) => ({ id: requirement.id, modality: requirement.modality, imageCompatible: isImageGeneratorCompatible(requirement) }));
  const explicitHardNeeds = explicitAssetNeeds(brief);
  const imageGeneratorModalities = new Set(['image', 'texture', 'sprite']);
  const missingExplicitNeeds = explicitHardNeeds.filter((need) => !available.has(need.modality));
  const unsupportedExplicitNeeds = missingExplicitNeeds.filter((need) => !imageGeneratorModalities.has(need.modality));
  if (unsupportedExplicitNeeds.length) {
    return {
      route: 'blocked',
      message: `当前目标明确要求但缺少 ${unsupportedExplicitNeeds.map((item) => item.modality).join('、')} 素材（${unsupportedExplicitNeeds.map((item) => item.id).join('、')}）；不能用其他模态或占位效果冒充。`
    };
  }

  if (matchedAssetModalities.length > 0) {
    return {
      route: 'catalog',
      message: declaredHardNeeds.some((need) => !available.has(need.modality))
        ? `复用 ${Math.max(1, matchedAssetCount)} 个与目标匹配的项目素材，并让构建器按现有模态采用真实的 2.5D / Three.js 表达。`
        : `复用 ${Math.max(1, matchedAssetCount)} 个与当前目标匹配且有来源记录的项目素材。`
    };
  }

  const missingDeclaredNeeds = declaredHardNeeds.filter((need) => !available.has(need.modality));
  const unsupportedDeclaredNeeds = missingDeclaredNeeds.filter((need) => !need.imageCompatible);
  if (unsupportedDeclaredNeeds.length) {
    return {
      route: 'blocked',
      message: `当前目标缺少必须的 ${unsupportedDeclaredNeeds.map((item) => item.modality).join('、')} 素材（${unsupportedDeclaredNeeds.map((item) => item.id).join('、')}）；现有图片生成器不能产出这些资产，不能用占位效果替代。`
    };
  }

  const policy = decideImageAssetUse(effectSpec);
  if (policy.decision === 'not-needed') {
    return { route: 'procedural', message: policy.summary };
  }
  if (policy.decision === 'source-required') {
    return { route: 'blocked', message: policy.summary };
  }
  if (!imageGeneratorAvailable) {
    return {
      route: 'blocked',
      message: `${policy.summary} 当前没有可用的图片生成适配器，不能用程序化占位物冒充目标主体。`
    };
  }
  return {
    route: 'generate',
    message: `${policy.summary} 将调用已连接的 MiniMax 图片适配器并物化结果。`
  };
}

function explicitAssetNeeds(brief: string): Array<{ id: string; modality: string }> {
  const normalized = brief.toLocaleLowerCase();
  const needs: Array<{ id: string; modality: string }> = [];
  if (/(?:\bglb\b|\bgltf\b|\bfbx\b|\bobj\b|\bvrm\b|live2d|真实\s*3d|3d\s*模型|三维模型|产品拆解)/i.test(normalized)) {
    needs.push({ id: 'brief-explicit-model', modality: 'model-3d' });
  }
  if (/(?:真实音频|音频文件|上传音频|背景音乐素材)/i.test(normalized)) {
    needs.push({ id: 'brief-explicit-audio', modality: 'audio' });
  }
  if (/(?:实拍视频|视频素材|上传视频)/i.test(normalized)) {
    needs.push({ id: 'brief-explicit-video', modality: 'video' });
  }
  return needs;
}
