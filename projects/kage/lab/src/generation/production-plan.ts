import { z } from 'zod';
import type { AssetPlan } from './asset-plan.ts';
import type { EffectSpec } from './effect-spec.ts';
import { decideImageAssetUse } from './asset-use-policy.ts';
import {
  hasProductionCapability,
  productionCapabilityIdSchema,
  type ProductionCapabilityId,
  type ProductionCapabilityProfile
} from './production-capabilities.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const productionTaskSchema = z.object({
  id: safeId,
  kind: z.enum(['asset-generation', 'asset-integration', 'code-synthesis', 'runtime-compose', 'browser-evaluation', 'manual-review']),
  status: z.enum(['ready', 'planned', 'adapted', 'blocked']),
  requiredCapability: productionCapabilityIdSchema.nullable(),
  requirementId: safeId.nullable(),
  output: z.string().min(4),
  reason: z.string().min(4),
  dependencies: z.array(safeId)
}).strict();

export const productionAdaptationSchema = z.object({
  id: safeId,
  requirementId: safeId.nullable(),
  from: z.string().min(2),
  to: z.string().min(2),
  reason: z.string().min(4),
  effectImpact: z.string().min(4)
}).strict();

export const productionPlanSchema = z.object({
  schemaVersion: z.literal(1),
  effectSpecId: safeId,
  providerId: z.string().min(1),
  model: z.string().min(1),
  status: z.enum(['ready', 'adapted', 'blocked']),
  strategy: z.enum(['procedural', 'media-assisted', 'asset-dependent']),
  tasks: z.array(productionTaskSchema).min(2),
  adaptations: z.array(productionAdaptationSchema),
  missingCapabilities: z.array(productionCapabilityIdSchema),
  metrics: z.object({
    ready: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    adapted: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative()
  }).strict(),
  nextAction: z.string().min(4)
}).strict().superRefine((value, context) => {
  const taskIds = new Set<string>();
  value.tasks.forEach((task, index) => {
    if (taskIds.has(task.id)) context.addIssue({ code: 'custom', path: ['tasks', index, 'id'], message: `生产任务 ID 重复：${task.id}` });
    taskIds.add(task.id);
  });
  value.tasks.forEach((task, index) => task.dependencies.forEach((dependency, dependencyIndex) => {
    if (!taskIds.has(dependency)) context.addIssue({ code: 'custom', path: ['tasks', index, 'dependencies', dependencyIndex], message: `生产任务依赖不存在：${dependency}` });
  }));
  const metrics = {
    ready: value.tasks.filter((task) => task.status === 'ready').length,
    planned: value.tasks.filter((task) => task.status === 'planned').length,
    adapted: value.tasks.filter((task) => task.status === 'adapted').length,
    blocked: value.tasks.filter((task) => task.status === 'blocked').length
  };
  (Object.keys(metrics) as Array<keyof typeof metrics>).forEach((key) => {
    if (metrics[key] !== value.metrics[key]) context.addIssue({ code: 'custom', path: ['metrics', key], message: `生产计划指标 ${key} 与任务不一致。` });
  });
  const expectedStatus = metrics.blocked ? 'blocked' : metrics.adapted || value.adaptations.length ? 'adapted' : 'ready';
  if (value.status !== expectedStatus) context.addIssue({ code: 'custom', path: ['status'], message: `生产计划状态应为 ${expectedStatus}。` });
});

export type ProductionPlan = z.infer<typeof productionPlanSchema>;
type ProductionTask = z.infer<typeof productionTaskSchema>;
type ProductionAdaptation = z.infer<typeof productionAdaptationSchema>;

export function assertProductionPlan(value: unknown): ProductionPlan {
  return productionPlanSchema.parse(value);
}

export function planCreativeProduction(
  effectSpec: EffectSpec,
  assetPlan: AssetPlan,
  profile: ProductionCapabilityProfile
): ProductionPlan {
  const tasks: ProductionTask[] = [];
  const adaptations: ProductionAdaptation[] = [];
  const missingCapabilities = new Set<ProductionCapabilityId>();
  const assetUsePolicy = decideImageAssetUse(effectSpec);

  tasks.push({
    id: 'compose-experience', kind: 'runtime-compose', status: 'ready',
    requiredCapability: 'registered-three-runtime', requirementId: null,
    output: 'ExperienceManifest、DOM 层、场景与时间轨道',
    reason: '使用已经验证的 Three.js 运行时组合当前可表达的效果层。', dependencies: []
  });

  assetPlan.items.forEach((item) => {
    const requirement = effectSpec.assetRequirements.find((candidate) => candidate.id === item.requirementId);
    if (!requirement) return;
    if (item.status === 'ready') {
      tasks.push({
        id: `integrate-${item.requirementId}`, kind: 'asset-integration', status: 'ready',
        requiredCapability: 'registered-three-runtime', requirementId: item.requirementId,
        output: `集成 ${item.modality} 候选 ${item.candidateUri}`,
        reason: '素材已达到质量与发布门禁，可以进入场景构建。', dependencies: ['compose-experience']
      });
      return;
    }
    const capability = capabilityForRoute(item.route);
    const policyItem = assetUsePolicy.items.find((entry) => entry.requirementId === item.requirementId);
    if (policyItem?.action === 'require-source') {
      const required = requirement.required;
      tasks.push({
        id: `source-${item.requirementId}`, kind: 'asset-integration', status: required ? 'blocked' : 'adapted',
        requiredCapability: null, requirementId: item.requirementId,
        output: `等待真实来源的 ${item.modality} 素材`,
        reason: policyItem.reason,
        dependencies: []
      });
      if (!required) adaptations.push({
        id: `adapt-${item.requirementId}-source`, requirementId: item.requirementId,
        from: item.modality, to: 'omit-unverified-evidence',
        reason: '可选准确素材尚无可信来源，本轮不生成也不展示。',
        effectImpact: '减少一层证据展示，但避免把生成内容误当作真实产品或品牌信息。'
      });
      return;
    }
    if (policyItem?.action === 'skip') {
      const decision = adaptMissingAsset(requirement, item.requirementId, capabilityForRoute(item.route), profile);
      tasks.push(decision.task);
      if (decision.adaptation) adaptations.push(decision.adaptation);
      return;
    }
    if (hasProductionCapability(profile, capability)) {
      tasks.push({
        id: `generate-${item.requirementId}`, kind: 'asset-generation', status: 'planned',
        requiredCapability: capability, requirementId: item.requirementId,
        output: `生成并检查 ${item.modality} 候选`,
        reason: item.status === 'planned' ? '所需生成适配器已集成。' : '现有候选不达标，使用可用适配器重新生成或升级。',
        dependencies: []
      });
      return;
    }
    missingCapabilities.add(capability);
    const decision = adaptMissingAsset(requirement, item.requirementId, capability, profile);
    tasks.push(decision.task);
    if (decision.adaptation) adaptations.push(decision.adaptation);
  });

  if (hasProductionCapability(profile, 'vision-evaluation')) {
    tasks.push({
      id: 'evaluate-visual-goal', kind: 'browser-evaluation', status: 'planned',
      requiredCapability: 'vision-evaluation', requirementId: null,
      output: '截图、目标符合度与视觉修正建议',
      reason: '视觉理解适配器已集成，可以对照 EffectSpec 评审真实页面。',
      dependencies: tasks.filter((task) => task.status !== 'blocked').map((task) => task.id)
    });
  } else {
    missingCapabilities.add('vision-evaluation');
    tasks.push({
      id: 'review-visual-manually', kind: 'manual-review', status: 'adapted',
      requiredCapability: null, requirementId: null,
      output: '浏览器截图与人工视觉评审记录',
      reason: '视觉理解模型未集成，保留真实浏览器证据并转为人工评审。',
      dependencies: tasks.filter((task) => task.status !== 'blocked').map((task) => task.id)
    });
    adaptations.push({
      id: 'adapt-visual-review', requirementId: null,
      from: 'vision-evaluation', to: 'manual-browser-review',
      reason: '当前模型不具备已集成的视觉评审能力。',
      effectImpact: '不会降低运行结果，但无法自动判断审美与目标符合度。'
    });
  }

  const metrics = {
    ready: tasks.filter((task) => task.status === 'ready').length,
    planned: tasks.filter((task) => task.status === 'planned').length,
    adapted: tasks.filter((task) => task.status === 'adapted').length,
    blocked: tasks.filter((task) => task.status === 'blocked').length
  };
  const status: ProductionPlan['status'] = metrics.blocked ? 'blocked' : metrics.adapted || adaptations.length ? 'adapted' : 'ready';
  const strategy: ProductionPlan['strategy'] = assetPlan.items.length === 0
    ? 'procedural'
    : assetPlan.items.every((item) => item.fallback === 'block') ? 'asset-dependent' : 'media-assisted';
  return assertProductionPlan({
    schemaVersion: 1,
    effectSpecId: effectSpec.id,
    providerId: profile.providerId,
    model: profile.model,
    status,
    strategy,
    tasks,
    adaptations,
    missingCapabilities: [...missingCapabilities],
    metrics,
    nextAction: status === 'blocked'
      ? '解决阻断素材或接入缺失生成器；不得用低保真替代冒充最终效果。'
      : status === 'adapted'
        ? '检查适配对最终效果的影响；接受后进入构建，否则接入更合适的模型能力。'
        : '按任务依赖生成素材、构建页面并完成视觉评审。'
  });
}

function adaptMissingAsset(
  requirement: EffectSpec['assetRequirements'][number],
  requirementId: string,
  missingCapability: ProductionCapabilityId,
  profile: ProductionCapabilityProfile
): { task: ProductionTask; adaptation: ProductionAdaptation | null } {
  if (requirement.fallback === 'procedural' && hasProductionCapability(profile, 'code-synthesis')) {
    return {
      task: {
        id: `adapt-${requirementId}`, kind: 'code-synthesis', status: 'adapted',
        requiredCapability: 'code-synthesis', requirementId,
        output: `使用程序化 Three.js 效果替代 ${requirement.modality}`,
        reason: `缺少 ${missingCapability}，但该需求允许程序化替代。`, dependencies: ['compose-experience']
      },
      adaptation: {
        id: `adapt-${requirementId}-procedural`, requirementId,
        from: requirement.modality, to: 'procedural-three-effect',
        reason: `未集成 ${missingCapability}，使用已集成的代码生成能力。`,
        effectImpact: '保留概念与运动关系，但真实感和特定主体准确度可能降低。'
      }
    };
  }
  if (requirement.fallback === 'image-plane' && hasProductionCapability(profile, 'image-generation')) {
    return {
      task: {
        id: `adapt-${requirementId}`, kind: 'asset-generation', status: 'adapted',
        requiredCapability: 'image-generation', requirementId,
        output: `生成分层图片并作为空间平面替代 ${requirement.modality}`,
        reason: `缺少 ${missingCapability}，但已集成图片生成能力。`, dependencies: []
      },
      adaptation: {
        id: `adapt-${requirementId}-image`, requirementId,
        from: requirement.modality, to: 'generated-image-plane',
        reason: `未集成 ${missingCapability}，采用可用的图片生成适配器。`,
        effectImpact: '保留构图和氛围，但不支持真实自由旋转、拆解或侧后方观察。'
      }
    };
  }
  if (requirement.fallback === 'dom-only' || (requirement.fallback === 'omit' && !requirement.required)) {
    const target = requirement.fallback === 'dom-only' ? 'semantic-dom' : 'omit-optional-layer';
    return {
      task: {
        id: `adapt-${requirementId}`, kind: 'runtime-compose', status: 'adapted',
        requiredCapability: 'registered-three-runtime', requirementId,
        output: target,
        reason: `缺少 ${missingCapability}，按 EffectSpec 的诚实回退策略调整。`, dependencies: ['compose-experience']
      },
      adaptation: {
        id: `adapt-${requirementId}-fallback`, requirementId,
        from: requirement.modality, to: target,
        reason: `未集成 ${missingCapability}，且该需求允许 ${requirement.fallback}。`,
        effectImpact: requirement.fallback === 'dom-only' ? '核心信息仍可读，但空间表现力下降。' : '移除非必要视觉层，核心叙事保持不变。'
      }
    };
  }
  return {
    task: {
      id: `block-${requirementId}`, kind: 'asset-generation', status: 'blocked',
      requiredCapability: missingCapability, requirementId,
      output: `等待 ${requirement.modality} 真实候选`,
      reason: `缺少 ${missingCapability}，且目标要求 ${requirement.minimumQuality} / ${requirement.fidelity}，不允许虚假替代。`,
      dependencies: []
    },
    adaptation: null
  };
}

function capabilityForRoute(route: AssetPlan['items'][number]['route']): ProductionCapabilityId {
  if (route === 'image-generation') return 'image-generation';
  if (route === 'texture-generation') return 'texture-generation';
  if (route === 'model-generation') return 'model-3d-generation';
  if (route === 'character-pipeline') return 'avatar-generation';
  if (route === 'environment-pipeline') return 'environment-generation';
  if (route === 'audio-generation') return 'audio-generation';
  if (route === 'video-generation') return 'video-generation';
  return 'image-generation';
}
