import { z } from 'zod';
import { assetModalitySchema, assetQualitySchema, type EffectSpec } from './effect-spec.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const assetGenerationRouteSchema = z.enum([
  'image-generation', 'texture-generation', 'model-generation', 'character-pipeline',
  'environment-pipeline', 'audio-generation', 'video-generation', 'licensed-library'
]);

export const assetSpatialFeaturesSchema = z.object({
  alpha: z.enum(['unknown', 'none', 'binary', 'soft']).default('unknown'),
  depth: z.enum(['none', 'estimated', 'authored']).default('none')
}).strict();

export const assetCandidateSchema = z.object({
  requirementId: safeId,
  modality: assetModalitySchema,
  qualityLevel: assetQualitySchema,
  source: z.enum(['user-supplied', 'model-generated', 'licensed-library', 'captured']),
  uri: z.string().min(1),
  license: z.string().nullable(),
  payloadBytes: z.number().int().nonnegative(),
  publishable: z.boolean(),
  features: assetSpatialFeaturesSchema.optional(),
  evidence: z.array(z.string().min(2))
}).strict();

export const assetPlanItemSchema = z.object({
  requirementId: safeId,
  modality: assetModalitySchema,
  status: z.enum(['ready', 'planned', 'upgrade-required', 'blocked']),
  qualityLevel: assetQualitySchema,
  route: assetGenerationRouteSchema,
  candidateUri: z.string().nullable(),
  source: z.enum(['none', 'user-supplied', 'model-generated', 'licensed-library', 'captured']),
  license: z.string().nullable(),
  payloadBytes: z.number().int().nonnegative(),
  publishable: z.boolean(),
  features: assetSpatialFeaturesSchema.optional(),
  fallback: z.enum(['procedural', 'image-plane', 'dom-only', 'omit', 'block']),
  decisions: z.array(z.string().min(2)).min(1)
}).strict();

export const assetPlanSchema = z.object({
  schemaVersion: z.literal(1),
  effectSpecId: safeId,
  status: z.enum(['ready', 'needs-generation', 'blocked']),
  items: z.array(assetPlanItemSchema),
  metrics: z.object({
    ready: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    totalPayloadBytes: z.number().int().nonnegative()
  }).strict(),
  nextAction: z.string().min(4)
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  value.items.forEach((item, index) => {
    if (ids.has(item.requirementId)) context.addIssue({ code: 'custom', path: ['items', index, 'requirementId'], message: `资产计划需求 ID 重复：${item.requirementId}` });
    ids.add(item.requirementId);
    if (item.qualityLevel === 'L0-missing' && (item.candidateUri !== null || item.source !== 'none' || item.payloadBytes !== 0 || item.publishable)) {
      context.addIssue({ code: 'custom', path: ['items', index], message: 'L0 Missing 资产不能拥有候选 URI、来源、负载或发布状态。' });
    }
    if (item.status === 'ready' && (!item.candidateUri || !item.publishable)) {
      context.addIssue({ code: 'custom', path: ['items', index], message: 'Ready 资产必须拥有候选 URI 并通过发布门禁。' });
    }
  });
  const metrics = {
    ready: value.items.filter((item) => item.status === 'ready').length,
    planned: value.items.filter((item) => item.status === 'planned').length,
    blocked: value.items.filter((item) => item.status === 'blocked' || item.status === 'upgrade-required').length,
    totalPayloadBytes: value.items.reduce((total, item) => total + item.payloadBytes, 0)
  };
  (Object.keys(metrics) as Array<keyof typeof metrics>).forEach((key) => {
    if (metrics[key] !== value.metrics[key]) context.addIssue({ code: 'custom', path: ['metrics', key], message: `资产计划指标 ${key} 与条目不一致。` });
  });
  const expectedStatus = metrics.blocked ? 'blocked' : metrics.planned ? 'needs-generation' : 'ready';
  if (value.status !== expectedStatus) context.addIssue({ code: 'custom', path: ['status'], message: `资产计划状态应为 ${expectedStatus}。` });
});

export type AssetCandidate = z.infer<typeof assetCandidateSchema>;
export type AssetPlan = z.infer<typeof assetPlanSchema>;

const qualityRank: Record<AssetCandidate['qualityLevel'], number> = {
  'L0-missing': 0,
  'L1-placeholder': 1,
  'L2-inspectable': 2,
  'L3-presentable': 3,
  'L4-cinematic': 4,
  'L5-production': 5
};

export function assertAssetPlan(value: unknown): AssetPlan {
  return assetPlanSchema.parse(value);
}

export function planAssets(effectSpec: EffectSpec, inventory: readonly AssetCandidate[] = []): AssetPlan {
  const items: AssetPlan['items'] = effectSpec.assetRequirements.map((requirement) => {
    const candidate = inventory.find((item) => item.requirementId === requirement.id && item.modality === requirement.modality);
    const route = routeFor(requirement.modality);
    if (!candidate) return {
      requirementId: requirement.id,
      modality: requirement.modality,
      status: 'planned' as const,
      qualityLevel: 'L0-missing' as const,
      route,
      candidateUri: null,
      source: 'none' as const,
      license: null,
      payloadBytes: 0,
      publishable: false,
      fallback: requirement.fallback,
      decisions: [
        `没有 ${requirement.modality} 候选；保持 L0 Missing。`,
        `需要通过 ${route} 产生真实候选，再执行质量、许可和运行时门禁。`
      ]
    };
    const qualityReady = qualityRank[candidate.qualityLevel] >= qualityRank[requirement.minimumQuality];
    const licenseReady = Boolean(candidate.license) && candidate.publishable;
    const ready = qualityReady && licenseReady;
    return {
      requirementId: requirement.id,
      modality: requirement.modality,
      status: ready ? 'ready' as const : 'upgrade-required' as const,
      qualityLevel: candidate.qualityLevel,
      route,
      candidateUri: candidate.uri,
      source: candidate.source,
      license: candidate.license,
      payloadBytes: candidate.payloadBytes,
      publishable: ready,
      ...(candidate.features ? { features: candidate.features } : {}),
      fallback: requirement.fallback,
      decisions: [
        qualityReady ? `候选达到 ${requirement.minimumQuality} 质量要求。` : `候选 ${candidate.qualityLevel} 低于 ${requirement.minimumQuality}。`,
        licenseReady ? '来源与发布许可已记录。' : '缺少可发布许可或候选尚未标记为可发布。',
        ...candidate.evidence
      ]
    };
  });
  const ready = items.filter((item) => item.status === 'ready').length;
  const planned = items.filter((item) => item.status === 'planned').length;
  const blocked = items.filter((item) => item.status === 'blocked' || item.status === 'upgrade-required').length;
  const totalPayloadBytes = items.reduce((total, item) => total + item.payloadBytes, 0);
  const status: AssetPlan['status'] = blocked ? 'blocked' : planned ? 'needs-generation' : 'ready';
  return assertAssetPlan({
    schemaVersion: 1,
    effectSpecId: effectSpec.id,
    status,
    items,
    metrics: { ready, planned, blocked, totalPayloadBytes },
    nextAction: status === 'ready'
      ? '资产满足当前目标；进入能力规划与受控构建。'
      : status === 'needs-generation'
        ? '调用对应素材生成器；生成结果仍需质量、许可、负载与浏览器检查。'
        : '替换、升级或补充许可；当前资产计划不得进入发布构建。'
  });
}

function routeFor(modality: AssetCandidate['modality']): AssetPlan['items'][number]['route'] {
  if (modality === 'image' || modality === 'sprite') return 'image-generation';
  if (modality === 'texture') return 'texture-generation';
  if (modality === 'model-3d') return 'model-generation';
  if (modality === 'avatar') return 'character-pipeline';
  if (modality === 'environment') return 'environment-pipeline';
  if (modality === 'audio') return 'audio-generation';
  if (modality === 'video') return 'video-generation';
  return 'licensed-library';
}
