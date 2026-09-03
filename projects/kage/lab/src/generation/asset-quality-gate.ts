import { z } from 'zod';
import type { V2CreativeContract } from '../v2/creative-contract.ts';
import type { StateAssetEvidence, StateAssetStrategy } from '../v2/state-asset-strategy.ts';
import type { AssetCandidate } from './asset-plan.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const assetQualityRequestSchema = z.object({
  requirementId: safeId,
  role: z.enum(['subject', 'environment', 'atmosphere', 'information']),
  modality: z.enum(['transparent-image', 'image-sequence', 'model-3d', 'texture', 'procedural']),
  minimumQuality: z.enum(['L2-inspectable', 'L3-presentable', 'L4-cinematic']),
  recommendedSource: z.enum(['chatgpt-imagegen', 'user-or-licensed']),
  reason: z.string().min(8).max(300),
  responsibility: z.string().min(8).max(300),
  continuity: z.string().min(8).max(300),
  integration: z.enum(['alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-procedural']),
  proof: z.string().min(8).max(300)
}).strict();

export const assetQualityGateSchema = z.object({
  schemaVersion: z.literal(1),
  decision: z.enum(['ready', 'needs-codex-assets']),
  risk: z.enum(['low', 'medium', 'high']),
  summary: z.string().min(8).max(500),
  acceptedAssetIds: z.array(safeId),
  // One recovery pass may ask Codex for at most four decisive assets. This is a
  // product latency boundary, not a claim that the remaining responsibilities
  // do not exist: the summary reports anything deferred by the boundary.
  requests: z.array(assetQualityRequestSchema).max(4)
}).strict();

export type AssetQualityGate = z.infer<typeof assetQualityGateSchema>;

export interface AssetQualityCandidate {
  id: string;
  kind: 'image' | 'texture' | 'environment' | 'model-3d' | 'audio' | 'video' | 'font';
  source: 'chatgpt-generated' | 'model-generated' | 'user-provided' | 'licensed';
  role: string;
  description: string;
  qualityLevel?: 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic';
  features?: AssetCandidate['features'];
  experience?: {
    integration: 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | 'native-media';
    stateEvidence?: StateAssetEvidence;
  };
}

export function evaluateAssetQualityGate(
  contract: V2CreativeContract,
  candidates: readonly AssetQualityCandidate[]
): AssetQualityGate {
  const required = contract.assets.filter((asset) => asset.required && asset.modality !== 'procedural');
  const stateStrategy = contract.technical.stateAssetStrategy;
  if (!required.length) {
    const proceduralReady = !stateStrategy.required
      || (stateStrategy.route === 'procedural-state'
        && contract.assets.some((asset) => asset.required && asset.modality === 'procedural'));
    return assetQualityGateSchema.parse({
      schemaVersion: 1,
      decision: proceduralReady ? 'ready' : 'needs-codex-assets',
      risk: proceduralReady ? 'low' : 'high',
      summary: proceduralReady
        ? stateStrategy.required
          ? `状态资产门禁通过：${stateStrategy.reason}`
          : '当前体验不依赖外部关键素材，可以直接进入 Codex 构建。'
        : `目标要求 ${stateStrategy.route}，但合同没有提供可以证明状态变化的素材职责；不能进入 Codex 构建。`,
      acceptedAssetIds: [],
      requests: []
    });
  }

  const acceptedAssetIds = new Set<string>();
  const requireIndependentLayers = contract.technical.sceneComposition.required
    && contract.technical.sceneComposition.route === 'layered-2d';
  const requests = required.flatMap((requirement) => {
    const roleCompatible = candidates.filter((candidate) => candidateSupportsRole(requirement, candidate, stateStrategy));
    const compatible = roleCompatible.filter((candidate) => candidateHasRequiredPixelEvidence(requirement, candidate)
      && (!requireIndependentLayers || !acceptedAssetIds.has(candidate.id)));
    const accepted = compatible.find((candidate) => candidateMeetsQuality(
      requirement.minimumQuality,
      candidate.qualityLevel,
    ));
    if (accepted) {
      acceptedAssetIds.add(accepted.id);
      return [];
    }
    const missingExplicitQualityEvidence = compatible.some((candidate) => candidate.qualityLevel === undefined);
    const rejectedAlphaEvidence = roleCompatible.some((candidate) => !candidateHasRequiredPixelEvidence(requirement, candidate));
    return [{
      requirementId: requirement.id,
      role: requirement.role,
      modality: requirement.modality,
      minimumQuality: requirement.minimumQuality,
      recommendedSource: requirement.modality === 'model-3d' ? 'user-or-licensed' as const : 'chatgpt-imagegen' as const,
      reason: rejectedAlphaEvidence
        ? '候选素材声明为透明主体，但像素早检没有发现可用的真实 Alpha；全不透明 RGBA、JPEG 或烘焙棋盘格不能承担透明合成职责。'
        : missingExplicitQualityEvidence
        ? '候选没有显式 qualityLevel 质量证据；按来源中立规则最多只计为 L2-inspectable，达到 L3/L4 必须提供显式质量等级。'
        : `当前没有与 ${requirement.modality} 职责匹配、且达到 ${requirement.minimumQuality} 的可信素材。`,
      responsibility: requirement.visualResponsibility,
      continuity: requirement.continuityRule,
      integration: requirement.integration,
      proof: requirement.visibleProof
    }];
  });

  const stateReady = stateAssetReady(stateStrategy, contract, candidates);
  if (!requests.length && !stateReady.ready) {
    const target = stateRequirement(contract, stateStrategy);
    if (target) {
      requests.push({
        requirementId: target.id,
        role: target.role,
        modality: target.modality,
        minimumQuality: target.minimumQuality,
        recommendedSource: stateStrategy.route === 'inspectable-model' ? 'user-or-licensed' : 'chatgpt-imagegen',
        reason: stateReady.reason.slice(0, 300),
        responsibility: target.visualResponsibility,
        continuity: target.continuityRule,
        integration: target.integration,
        proof: target.visibleProof
      });
    }
  }

  if (requests.length || !stateReady.ready) {
    const totalRequestCount = requests.length;
    const boundedRequests = prioritizeRequests(requests).slice(0, 4);
    const deferredCount = Math.max(0, totalRequestCount - boundedRequests.length);
    const boundaryNote = deferredCount
      ? ` 本轮只提交最关键的 ${boundedRequests.length} 项，另有 ${deferredCount} 项不在本次恢复范围内；当前任务不会循环扩展素材批次。`
      : '';
    return assetQualityGateSchema.parse({
      schemaVersion: 1,
      decision: 'needs-codex-assets',
      risk: 'high',
      summary: requests.length
        ? requireIndependentLayers
          ? `2.5D 场景缺少 ${totalRequestCount} 项独立图层职责；任务已在 Codex 编码前暂停，同一张背景图不能重复充当环境、主体、前景和深度。${boundaryNote}`
          : `发现 ${totalRequestCount} 项关键素材未达到最终质量；任务已在 Codex 编码前暂停，不能用占位效果替代。${boundaryNote}`
        : `状态资产没有匹配合同职责：${stateReady.reason}`.slice(0, 500),
      acceptedAssetIds: [...acceptedAssetIds],
      requests: boundedRequests
    });
  }

  return assetQualityGateSchema.parse({
    schemaVersion: 1,
    decision: 'ready',
    risk: 'medium',
    summary: stateStrategy.required
      ? `素材与状态门禁通过：${acceptedAssetIds.size} 个可信素材能够承担 ${stateStrategy.changeKind} 的可观察变化。`
      : `素材门禁通过：${acceptedAssetIds.size} 个可信素材可以承担本次关键视觉责任。`,
    acceptedAssetIds: [...acceptedAssetIds],
    requests: []
  });
}

function prioritizeRequests(
  requests: readonly z.infer<typeof assetQualityRequestSchema>[]
): z.infer<typeof assetQualityRequestSchema>[] {
  const rolePriority: Record<z.infer<typeof assetQualityRequestSchema>['role'], number> = {
    subject: 0,
    environment: 1,
    information: 2,
    atmosphere: 3,
  };
  const qualityPriority: Record<z.infer<typeof assetQualityRequestSchema>['minimumQuality'], number> = {
    'L4-cinematic': 0,
    'L3-presentable': 1,
    'L2-inspectable': 2,
  };
  return [...requests].sort((left, right) => (
    rolePriority[left.role] - rolePriority[right.role]
    || qualityPriority[left.minimumQuality] - qualityPriority[right.minimumQuality]
    || left.requirementId.localeCompare(right.requirementId)
  ));
}

function stateAssetReady(
  strategy: StateAssetStrategy,
  contract: V2CreativeContract,
  candidates: readonly AssetQualityCandidate[]
): { ready: boolean; reason: string } {
  if (!strategy.required) return { ready: true, reason: strategy.reason };
  if (strategy.route === 'procedural-state') {
    const ready = contract.assets.some((asset) => asset.required && asset.modality === 'procedural');
    return {
      ready,
      reason: ready
        ? '程序化主体合同提供了运行时部件与状态证明。'
        : '程序化状态路线缺少必需的程序化主体职责。'
    };
  }

  const evidence = candidates.flatMap((candidate) => candidate.experience?.stateEvidence
    ? [{ candidate, evidence: candidate.experience.stateEvidence }]
    : []);
  const accepted = evidence.find(({ candidate, evidence: item }) => {
    if (strategy.route === 'inspectable-model') {
      return candidate.kind === 'model-3d'
        && item.mode === 'model-parts'
        && item.distinctStates >= strategy.minimumDistinctStates
        && item.partGroups >= strategy.minimumPartGroups;
    }
    const continuous = item.mode === 'sequence'
      && item.distinctStates >= strategy.minimumDistinctStates
      && Boolean(item.continuityKey);
    const layered = item.mode === 'layered-subject'
      && item.distinctStates >= strategy.minimumDistinctStates
      && item.partGroups >= strategy.minimumPartGroups;
    const model = candidate.kind === 'model-3d'
      && item.mode === 'model-parts'
      && item.distinctStates >= strategy.minimumDistinctStates
      && item.partGroups >= strategy.minimumPartGroups;
    return continuous || layered || model;
  });
  if (accepted) return { ready: true, reason: accepted.evidence.proof };

  const observed = evidence.length
    ? evidence.map(({ candidate, evidence: item }) => `${candidate.id}:${item.mode}/${item.distinctStates}状态/${item.partGroups}部件`).join('；')
    : '候选素材没有登记状态证据';
  return {
    ready: false,
    reason: `状态资产不足：需要至少 ${strategy.minimumDistinctStates} 个连续状态和 ${strategy.minimumPartGroups} 个可辨部件组；${observed}。单张静态图、裁切或箭头不能替代目标变化。`
  };
}

function stateRequirement(
  contract: V2CreativeContract,
  strategy: StateAssetStrategy
): V2CreativeContract['assets'][number] | undefined {
  if (strategy.route === 'inspectable-model') {
    return contract.assets.find((asset) => asset.required && asset.modality === 'model-3d');
  }
  return contract.assets.find((asset) => asset.required && strategy.acceptedModalities.includes(asset.modality))
    || contract.assets.find((asset) => asset.required && asset.modality !== 'procedural');
}

function candidateMeetsQuality(
  minimumQuality: V2CreativeContract['assets'][number]['minimumQuality'],
  qualityLevel?: AssetQualityCandidate['qualityLevel'],
): boolean {
  if (qualityLevel) return qualityRank(qualityLevel) >= qualityRank(minimumQuality);
  return minimumQuality === 'L2-inspectable';
}

function qualityRank(value: NonNullable<AssetQualityCandidate['qualityLevel']>): number {
  return value === 'L4-cinematic' ? 4 : value === 'L3-presentable' ? 3 : 2;
}

function candidateHasRequiredPixelEvidence(
  requirement: V2CreativeContract['assets'][number],
  candidate: AssetQualityCandidate,
): boolean {
  if (requirement.integration !== 'alpha-subject' && requirement.modality !== 'transparent-image') return true;
  return candidate.features?.alpha === 'binary' || candidate.features?.alpha === 'soft';
}

function candidateSupportsRole(
  requirement: V2CreativeContract['assets'][number],
  candidate: AssetQualityCandidate,
  strategy: StateAssetStrategy
): boolean {
  const { modality, integration } = requirement;
  const { kind } = candidate;
  if (requirement.id === 'state-subject' && strategy.required) {
    if (kind === 'model-3d' && strategy.acceptedModalities.includes('model-3d')) return true;
    if ((kind === 'image' || kind === 'environment' || kind === 'video')
      && (strategy.acceptedModalities.includes('image-sequence') || strategy.acceptedModalities.includes('transparent-image'))) {
      return true;
    }
  }
  if (candidate.experience && !integrationSupports(integration, candidate.experience.integration)) return false;
  if (modality === 'model-3d') return kind === 'model-3d';
  if (modality === 'texture') return kind === 'texture' || kind === 'image' || kind === 'environment';
  if (modality === 'image-sequence') return kind === 'image' || kind === 'environment' || kind === 'video';
  if (modality === 'transparent-image') return kind === 'image';
  return modality === 'procedural';
}

function integrationSupports(
  required: V2CreativeContract['assets'][number]['integration'],
  candidate: NonNullable<AssetQualityCandidate['experience']>['integration']
): boolean {
  if (required === 'alpha-subject') return candidate === 'alpha-subject';
  if (required === 'spatial-object') return candidate === 'spatial-object';
  if (required === 'full-bleed-environment' || required === 'seamless-field') {
    return candidate === 'full-bleed-environment' || candidate === 'seamless-field';
  }
  return true;
}
