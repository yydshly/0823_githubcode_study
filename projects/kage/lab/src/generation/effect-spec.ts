import { z } from 'zod';
import type { CapabilityGap } from '../capabilities/proposal.ts';
import type { BriefInterpretation, CreativeBrief, CreativeDirection } from './schema.ts';
import { stableHash } from './stable-hash.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);

export const experienceRouteSchema = z.enum([
  'immersive-page', 'product-viewer', 'cinematic-showcase', 'spatial-portfolio',
  'configurator', 'character-experience', 'real-scene', 'technical-visualization'
]);

export const effectTechniqueSchema = z.enum([
  'dom-layout', 'procedural-geometry', 'shader', 'particles', 'lighting',
  'image-plane', 'model-3d', 'video-texture', 'postprocess'
]);

export const assetModalitySchema = z.enum([
  'image', 'texture', 'sprite', 'model-3d', 'avatar', 'environment',
  'audio', 'video', 'font'
]);

export const assetQualitySchema = z.enum([
  'L0-missing', 'L1-placeholder', 'L2-inspectable',
  'L3-presentable', 'L4-cinematic', 'L5-production'
]);

export const assetExperienceSchema = z.object({
  anchor: z.number().min(0).max(1).describe('The normalized experience position where this asset has its strongest visual responsibility.'),
  function: z.enum(['establish', 'develop', 'transform', 'resolve', 'persistent']),
  visualState: z.string().min(8).max(180),
  continuity: z.string().min(8).max(180),
  integration: z.enum([
    'alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-media'
  ])
}).strict();

export const assetRequirementSchema = z.object({
  id: safeId,
  role: z.enum(['subject', 'environment', 'atmosphere', 'information', 'interaction', 'sound']),
  modality: assetModalitySchema,
  purpose: z.string().min(8),
  required: z.boolean(),
  minimumQuality: assetQualitySchema,
  fidelity: z.enum(['suggestive', 'recognizable', 'accurate']),
  fallback: z.enum(['procedural', 'image-plane', 'dom-only', 'omit', 'block']),
  experience: assetExperienceSchema.optional()
}).strict();

export const effectLayerSchema = z.object({
  id: safeId,
  role: z.enum(['content', 'background', 'world', 'foreground', 'postprocess', 'interaction']),
  purpose: z.string().min(8),
  techniques: z.array(effectTechniqueSchema).min(1).max(4),
  assetRequirementIds: z.array(safeId),
  visibleOutcome: z.string().min(8)
}).strict();

export const effectSpecSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  title: z.string().min(2),
  thesis: z.string().min(8),
  route: experienceRouteSchema,
  goal: z.object({
    subject: z.string().min(2),
    audience: z.string().min(2),
    desiredOutcome: z.string().min(8),
    primaryAction: z.string().min(2)
  }).strict(),
  direction: z.object({
    signatureMoment: z.string().min(8),
    spatialMetaphor: z.string().min(4),
    visualGrammar: z.array(z.string().min(2)).min(2).max(8),
    moodArc: z.array(z.string().min(2)).min(2).max(6),
    palette: z.object({
      deep: color, surface: color, text: color, muted: color, accent: color, accentSoft: color
    }).strict()
  }).strict(),
  composition: z.object({
    mode: z.enum(['dom-led', 'hybrid-2.5d', 'spatial-3d']),
    domRole: z.string().min(8),
    webglRole: z.string().min(8),
    layers: z.array(effectLayerSchema).min(2).max(12)
  }).strict(),
  motion: z.object({
    pace: z.enum(['calm', 'measured', 'dynamic']),
    cameraStrategy: z.string().min(8),
    drivers: z.array(z.enum(['scroll', 'pointer', 'timeline', 'choice', 'audio', 'device-motion', 'physics'])).min(1),
    reducedMotion: z.string().min(8)
  }).strict(),
  assetRequirements: z.array(assetRequirementSchema).max(16),
  constraints: z.object({
    targetDevices: z.array(z.enum(['desktop', 'mobile', 'tablet'])).min(1),
    qualityIntent: z.enum(['prototype', 'presentable', 'cinematic', 'production']),
    targetFrameTimeMs: z.number().positive().max(50),
    maxInitialAssetBytes: z.number().int().nonnegative()
  }).strict(),
  reasoning: z.array(z.string().min(4)).min(1).max(12),
  provenance: z.object({
    source: z.enum(['model', 'compatibility-compiler']),
    providerId: z.string().min(1),
    model: z.string().min(1),
    briefHash: z.string().min(1)
  }).strict()
}).strict().superRefine((value, context) => {
  const requirementIds = new Set<string>();
  value.assetRequirements.forEach((requirement, index) => {
    if (requirementIds.has(requirement.id)) context.addIssue({ code: 'custom', path: ['assetRequirements', index, 'id'], message: `资产需求 ID 重复：${requirement.id}` });
    requirementIds.add(requirement.id);
  });
  const layerIds = new Set<string>();
  value.composition.layers.forEach((layer, index) => {
    if (layerIds.has(layer.id)) context.addIssue({ code: 'custom', path: ['composition', 'layers', index, 'id'], message: `效果层 ID 重复：${layer.id}` });
    layerIds.add(layer.id);
    layer.assetRequirementIds.forEach((requirementId, requirementIndex) => {
      if (!requirementIds.has(requirementId)) context.addIssue({ code: 'custom', path: ['composition', 'layers', index, 'assetRequirementIds', requirementIndex], message: `效果层引用不存在的资产需求：${requirementId}` });
    });
  });
});

export type EffectSpec = z.infer<typeof effectSpecSchema>;
export type AssetRequirement = z.infer<typeof assetRequirementSchema>;

export function assertEffectSpec(value: unknown): EffectSpec {
  return effectSpecSchema.parse(value);
}

export function compileCompatibilityEffectSpec(
  brief: CreativeBrief,
  interpretation: BriefInterpretation,
  direction: CreativeDirection
): EffectSpec {
  const briefHash = stableHash(`${brief.text}|${brief.seed ?? 0}`);
  const structureIntent = structureEffect(direction.structure);
  const worldIntent = direction.scenePlugin === 'chromatic-tide'
    ? {
        metaphor: '可被穿行和折射的色彩介质',
        grammar: ['折射光幕', '连续色域', '柔性深度', '编辑化留白'],
        technique: 'shader' as const,
        visible: '色彩和折射随体验进度形成连续空间变化。'
      }
    : {
        metaphor: '可观察、聚合并逐步显现的信号场',
        grammar: ['空间信号', '结构化粒子', '冷静尺度', '证据式显现'],
        technique: 'procedural-geometry' as const,
        visible: '信号结构从稀疏状态聚合成清晰的视觉主体。'
      };
  const assetRequirements = interpretation.capabilityGaps.flatMap(assetRequirementFromGap);
  const assetRequirementIds = assetRequirements.map((item) => item.id);
  return assertEffectSpec({
    schemaVersion: 1,
    id: `effect-${briefHash}-${direction.id}`,
    title: direction.title,
    thesis: direction.thesis,
    route: 'immersive-page',
    goal: {
      subject: interpretation.subject,
      audience: interpretation.audience,
      desiredOutcome: `让访客通过${structureIntent.outcome}理解并记住“${interpretation.subject}”。`,
      primaryAction: structureIntent.action
    },
    direction: {
      signatureMoment: structureIntent.signatureMoment,
      spatialMetaphor: worldIntent.metaphor,
      visualGrammar: [...worldIntent.grammar, ...direction.tags].slice(0, 8),
      moodArc: structureIntent.moodArc,
      palette: direction.theme
    },
    composition: {
      mode: 'spatial-3d',
      domRole: '承载可阅读内容、导航、行动入口与无 WebGL 语义回退。',
      webglRole: '承载空间记忆、镜头关系、氛围变化与核心视觉主体。',
      layers: [
        {
          id: 'semantic-content', role: 'content', purpose: '解释主题并提供可访问的内容与行动路径。',
          techniques: ['dom-layout'], assetRequirementIds: [],
          visibleOutcome: '即使 WebGL 不可用，访客仍能理解完整信息。'
        },
        {
          id: 'spatial-world', role: 'world', purpose: '建立与目标一致且可被镜头解释的空间世界。',
          techniques: [worldIntent.technique, 'lighting'], assetRequirementIds,
          visibleOutcome: worldIntent.visible
        },
        {
          id: 'interaction-feedback', role: 'interaction', purpose: '把用户推进转成可感知但不干扰阅读的视觉反馈。',
          techniques: ['shader'], assetRequirementIds: [],
          visibleOutcome: '滚动或选择会改变镜头、能量和主体显现状态。'
        }
      ]
    },
    motion: {
      pace: direction.pace,
      cameraStrategy: structureIntent.cameraStrategy,
      drivers: direction.structure === 'branching' ? ['scroll', 'choice'] : ['scroll'],
      reducedMotion: '保留稳定构图和内容顺序，移除连续位移并使用静态关键状态。'
    },
    assetRequirements,
    constraints: {
      targetDevices: ['desktop', 'mobile'],
      qualityIntent: 'presentable',
      targetFrameTimeMs: 16.7,
      maxInitialAssetBytes: 8_000_000
    },
    reasoning: [
      ...direction.rationale,
      `兼容层从现有 ${direction.structure} 结构和 ${direction.scenePlugin} 场景推导；后续由模型直接生成 EffectSpec。`
    ],
    provenance: {
      source: 'compatibility-compiler',
      providerId: interpretation.providerId,
      model: interpretation.provenance.model,
      briefHash
    }
  });
}

function structureEffect(structure: CreativeDirection['structure']): {
  outcome: string;
  action: string;
  signatureMoment: string;
  moodArc: string[];
  cameraStrategy: string;
} {
  if (structure === 'focus') return {
    outcome: '一次连续视觉变化', action: '聚焦核心价值并进入下一步',
    signatureMoment: '主体从环境中完整显现，并在最终英雄构图中稳定停留。',
    moodArc: ['克制建立', '连续靠近', '清晰显现'],
    cameraStrategy: '使用一个连续镜头完成远观、靠近、局部揭示和稳定停留。'
  };
  if (structure === 'branching') return {
    outcome: '可选择的观看路径', action: '选择适合自己的理解路径',
    signatureMoment: '访客的选择使空间关系发生分化，最终在共同结论处重新汇合。',
    moodArc: ['建立问题', '主动选择', '路径回应', '结论汇合'],
    cameraStrategy: '共享入口镜头后按选择改变观察角度，并在结论镜头重新建立统一尺度。'
  };
  return {
    outcome: '逐步建立的证据与情绪', action: '沿叙事理解核心能力并采取行动',
    signatureMoment: '核心价值在证据节点由抽象氛围转为可辨认的空间结构。',
    moodArc: ['建立坐标', '逐步展开', '形成证据', '稳定收束'],
    cameraStrategy: '以远景建立空间，使用中景推进理解，最后用稳定英雄镜头收束。'
  };
}

function assetRequirementFromGap(gap: CapabilityGap): AssetRequirement[] {
  if (gap.kind !== 'asset') return [];
  const isCharacter = gap.suggestedId.includes('character') || gap.tags.includes('avatar');
  return [{
    id: gap.suggestedId,
    role: 'subject',
    modality: isCharacter ? 'avatar' : 'model-3d',
    purpose: gap.need,
    required: gap.priority === 'essential',
    minimumQuality: 'L3-presentable',
    fidelity: 'accurate',
    fallback: 'block',
    experience: {
      anchor: .45,
      function: 'develop',
      visualState: '真实主体在体验推进后成为可辨认的空间视觉锚点。',
      continuity: '继承前序氛围与光色，并为最终稳定构图保留材质和尺度连续性。',
      integration: 'spatial-object'
    }
  }];
}
