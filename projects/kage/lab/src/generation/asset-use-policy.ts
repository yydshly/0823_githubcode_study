import type { AssetRequirement, EffectSpec } from './effect-spec.ts';

export type AssetUseAction = 'generate' | 'require-source' | 'skip';

export interface AssetUsePolicyItem {
  requirementId: string;
  action: AssetUseAction;
  score: number;
  reason: string;
  expectedBenefit: string;
}

export interface AssetUsePolicy {
  schemaVersion: 1;
  effectSpecId: string;
  decision: 'approved' | 'source-required' | 'not-needed';
  approvedRequirementIds: readonly string[];
  items: readonly AssetUsePolicyItem[];
  constraints: readonly string[];
  summary: string;
}

const imageModalities = new Set<AssetRequirement['modality']>(['image', 'texture', 'sprite']);
const evidenceTerms = /(?:\b(?:wordmark|logo|brand|ui|screenshot|copy|pricing|diagram)\b|字标|标志|品牌|界面|截图|文案|价格|图表)/i;
const qualityRank: Record<AssetRequirement['minimumQuality'], number> = {
  'L0-missing': 0, 'L1-placeholder': 1, 'L2-inspectable': 2,
  'L3-presentable': 3, 'L4-cinematic': 4, 'L5-production': 5
};

/**
 * Decides whether an image generator materially helps the declared goal.
 * Availability is intentionally absent: a configured provider must not change the creative decision.
 */
export function decideImageAssetUse(
  effectSpec: EffectSpec,
  maximumGeneratedQuality: AssetRequirement['minimumQuality'] = 'L2-inspectable'
): AssetUsePolicy {
  const candidates = effectSpec.assetRequirements.filter(isImageGeneratorCompatible);
  const evaluated = candidates.map((requirement): AssetUsePolicyItem => {
    const layers = effectSpec.composition.layers.filter((layer) => layer.assetRequirementIds.includes(requirement.id));
    const visibleOutcome = layers.map((layer) => layer.visibleOutcome).join(' ');
    const evidenceLike = requirement.role === 'information' || evidenceTerms.test(`${requirement.id} ${requirement.purpose}`);
    if (!layers.length) return item(requirement, 'skip', 0, '没有任何可见效果层引用该素材，生成不会改变页面结果。', '无可验证收益');
    const fictionalEnvironmentPlate = requirement.modality === 'environment'
      && (requirement.experience?.integration === 'full-bleed-environment' || requirement.experience?.integration === 'seamless-field')
      && requirement.role === 'environment'
      && !evidenceLike;
    if ((requirement.fidelity === 'accurate' && !fictionalEnvironmentPlate) || evidenceLike) {
      return item(
        requirement,
        'require-source',
        0,
        '该素材承担准确主体、品牌或信息证据；生成模型不能作为事实来源。',
        `使用真实来源后可支撑：${visibleOutcome}`
      );
    }
    const generatorCannotMeetBlockingQuality = requirement.required
      && requirement.fallback === 'block'
      && qualityRank[requirement.minimumQuality] > qualityRank[maximumGeneratedQuality];
    if (generatorCannotMeetBlockingQuality) {
      return item(
        requirement,
        'require-source',
        0,
        `当前图片适配器最高只能形成 ${maximumGeneratedQuality} 候选，低于必需的 ${requirement.minimumQuality}；不启动一次注定被门禁拒绝的生成。`,
        `由 ChatGPT / Codex 或真实授权素材承担：${visibleOutcome}`
      );
    }
    const score = benefitScore(requirement, layers.map((layer) => layer.role));
    const decorativeOnly = !requirement.required && requirement.role === 'atmosphere' && requirement.fallback === 'procedural';
    if (decorativeOnly || score < 5) {
      return item(requirement, 'skip', score, '预期收益不足以证明一次外部生成调用，保留现有程序化表达。', visibleOutcome || '轻微氛围变化');
    }
    return item(requirement, 'generate', score, '该素材以建议性视觉增强已声明的可见效果，不承担准确事实表达。', visibleOutcome);
  });

  const ranked = evaluated.filter((entry) => entry.action === 'generate').sort((left, right) => right.score - left.score);
  const approved = new Set(ranked.slice(0, 2).map((entry) => entry.requirementId));
  const items = evaluated.map((entry) => entry.action === 'generate' && !approved.has(entry.requirementId)
    ? { ...entry, action: 'skip' as const, reason: '低于本轮前两个高收益素材；为控制成本与视觉噪声暂不生成。' }
    : entry);
  const sourceRequired = items.filter((entry) => entry.action === 'require-source');
  const decision: AssetUsePolicy['decision'] = approved.size ? 'approved' : sourceRequired.length ? 'source-required' : 'not-needed';
  const summary = decision === 'approved'
    ? `批准 ${approved.size} 个能改善目标表达的建议性素材；准确证据与其余装饰素材不调用生成器。`
    : decision === 'source-required'
      ? `没有适合生成器的素材；${sourceRequired.length} 个准确主体、品牌或信息证据需要真实来源。`
      : '当前效果不需要外部图片生成；程序化表达已经足够，或素材没有可验证的可见收益。';
  return {
    schemaVersion: 1,
    effectSpecId: effectSpec.id,
    decision,
    approvedRequirementIds: [...approved],
    items,
    constraints: [
      '准确产品、品牌、UI、文字和信息证据禁止由生成模型冒充。',
      '素材必须被可见效果层引用，并明确改善目标表达或记忆点。',
      '单次最多生成两个高收益素材；生成结果仍保持 L2，等待视觉与发布审核。',
      `首屏总素材预算不得超过 ${effectSpec.constraints.maxInitialAssetBytes} 字节。`
    ],
    summary
  };
}

export function isImageGeneratorCompatible(requirement: AssetRequirement): boolean {
  if (imageModalities.has(requirement.modality)) return true;
  return requirement.modality === 'environment'
    && requirement.role === 'environment'
    && (requirement.experience?.integration === 'full-bleed-environment' || requirement.experience?.integration === 'seamless-field');
}

function benefitScore(requirement: AssetRequirement, layerRoles: readonly string[]): number {
  let score = requirement.required ? 2 : 0;
  if (requirement.role === 'subject') score += 3;
  if (requirement.role === 'environment') score += 2;
  if (requirement.role === 'atmosphere') score += 1;
  if (requirement.fidelity === 'recognizable') score += 2;
  if (requirement.fidelity === 'suggestive') score += 1;
  if (qualityRank[requirement.minimumQuality] >= 3) score += 1;
  if (layerRoles.some((role) => role === 'world' || role === 'background' || role === 'foreground')) score += 2;
  return score;
}

function item(requirement: AssetRequirement, action: AssetUseAction, score: number, reason: string, expectedBenefit: string): AssetUsePolicyItem {
  return { requirementId: requirement.id, action, score, reason, expectedBenefit };
}
