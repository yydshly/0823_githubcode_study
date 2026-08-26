import { z } from 'zod';

export const productionCapabilityIdSchema = z.enum([
  'deterministic-analysis',
  'creative-analysis',
  'code-synthesis',
  'image-generation',
  'texture-generation',
  'model-3d-generation',
  'avatar-generation',
  'environment-generation',
  'audio-generation',
  'video-generation',
  'vision-evaluation',
  'registered-three-runtime',
  'browser-preview'
]);

export type ProductionCapabilityId = z.infer<typeof productionCapabilityIdSchema>;

export const productionCapabilityStateSchema = z.object({
  id: productionCapabilityIdSchema,
  available: z.boolean(),
  adapter: z.string().nullable(),
  reason: z.string().nullable()
}).strict();

export const productionCapabilityProfileSchema = z.object({
  schemaVersion: z.literal(1),
  providerId: z.string().min(1),
  model: z.string().min(1),
  capabilities: z.array(productionCapabilityStateSchema)
}).strict().superRefine((value, context) => {
  const ids = new Set<string>();
  value.capabilities.forEach((capability, index) => {
    if (ids.has(capability.id)) context.addIssue({ code: 'custom', path: ['capabilities', index, 'id'], message: `生产能力重复：${capability.id}` });
    ids.add(capability.id);
    if (capability.available && !capability.adapter) context.addIssue({ code: 'custom', path: ['capabilities', index, 'adapter'], message: '可用能力必须声明实际适配器。' });
  });
});

export type ProductionCapabilityProfile = z.infer<typeof productionCapabilityProfileSchema>;

export type ProductionCapabilityAdapters = Partial<Record<ProductionCapabilityId, string>>;
export type IntegratedProductionCapabilities = readonly ProductionCapabilityId[] | ProductionCapabilityAdapters;

const allCapabilities = productionCapabilityIdSchema.options;

export function createProductionCapabilityProfile(
  providerId: string,
  model: string,
  integratedCapabilities: IntegratedProductionCapabilities = []
): ProductionCapabilityProfile {
  const customAdapters: ProductionCapabilityAdapters = isCapabilityList(integratedCapabilities) ? {} : integratedCapabilities;
  const additionalCapabilities = isCapabilityList(integratedCapabilities) ? integratedCapabilities : Object.keys(integratedCapabilities) as ProductionCapabilityId[];
  const integrated = new Set<ProductionCapabilityId>([
    'registered-three-runtime', 'browser-preview', ...additionalCapabilities
  ]);
  const isLanguageModel = providerId === 'codex' || providerId === 'mimo' || providerId === 'minimax' || providerId === 'openai';
  if (isLanguageModel) {
    integrated.add('creative-analysis');
    integrated.add('code-synthesis');
  } else {
    integrated.add('deterministic-analysis');
  }
  return productionCapabilityProfileSchema.parse({
    schemaVersion: 1,
    providerId,
    model,
    capabilities: allCapabilities.map((id) => ({
      id,
      available: integrated.has(id),
      adapter: integrated.has(id) ? customAdapters[id] ?? adapterName(id, providerId) : null,
      reason: integrated.has(id) ? null : missingReason(id)
    }))
  });
}

export function hasProductionCapability(profile: ProductionCapabilityProfile, capability: ProductionCapabilityId): boolean {
  return profile.capabilities.some((item) => item.id === capability && item.available);
}

export function availableProductionCapabilities(profile: ProductionCapabilityProfile): ProductionCapabilityId[] {
  return profile.capabilities.filter((item) => item.available).map((item) => item.id);
}

function isCapabilityList(value: IntegratedProductionCapabilities): value is readonly ProductionCapabilityId[] {
  return Array.isArray(value);
}

function adapterName(capability: ProductionCapabilityId, providerId: string): string {
  if (capability === 'registered-three-runtime') return 'experience-runtime-v2';
  if (capability === 'browser-preview') return 'playwright-browser-evidence';
  if (capability === 'deterministic-analysis') return 'baseline-keyword-v1';
  if (capability === 'creative-analysis' || capability === 'code-synthesis') return `${providerId}-language-adapter`;
  return `${providerId}-${capability}-adapter`;
}

function missingReason(capability: ProductionCapabilityId): string {
  const descriptions: Partial<Record<ProductionCapabilityId, string>> = {
    'image-generation': '项目尚未接入图片生成适配器。',
    'texture-generation': '项目尚未接入纹理生成与纹理质量检查适配器。',
    'model-3d-generation': '项目尚未接入真实 3D/GLB 生成与清理适配器。',
    'avatar-generation': '项目尚未接入角色、Rig 或 VRM 生成适配器。',
    'environment-generation': '项目尚未接入环境、HDRI 或 3DGS 生成适配器。',
    'audio-generation': '项目尚未接入音乐、氛围音或旁白生成适配器。',
    'video-generation': '项目尚未接入视频生成或编码适配器。',
    'vision-evaluation': '项目尚未接入基于截图的视觉理解评审适配器。'
  };
  return descriptions[capability] || '当前 provider 没有集成这项生产能力。';
}
