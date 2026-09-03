import { z } from 'zod';
import type { ExperiencePattern } from './reference-intelligence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const evidenceStateSchema = z.enum([
  'screenshot-opening',
  'screenshot-beat',
  'screenshot-ending',
  'screenshot-mobile',
  'asset-request',
  'runtime'
]);

export const presentationCapabilitySchema = z.object({
  id: safeId,
  title: z.string().min(3),
  evidenceLevel: z.literal('runtime-verified'),
  prototypeUrl: z.string().min(1),
  sourceEvidence: z.array(z.string().min(1)).min(2),
  applicablePatterns: z.array(z.enum([
    'continuous-scroll',
    'environmental-memory',
    'product-atmosphere',
    'material-transformation',
    'spatial-exploration',
    'editorial-field'
  ])).min(1),
  positiveSignals: z.array(z.string().min(1)).min(3),
  blockerSignals: z.array(z.string().min(1)),
  assetContract: z.object({
    acceptedModalities: z.array(z.enum(['image-sequence', 'video', 'canvas-frame-sequence'])).min(1),
    minimumStates: z.number().int().min(2),
    maximumStates: z.number().int().max(12),
    continuityRules: z.array(z.string().min(8)).min(3),
    variationRules: z.array(z.string().min(8)).min(2),
    maximumInitialBytes: z.number().int().positive(),
    maximumTotalBytes: z.number().int().positive()
  }).strict(),
  runtimeContract: z.object({
    layout: z.literal('fixed-full-bleed-media'),
    driver: z.literal('scroll-progress'),
    renderer: z.literal('dom-css-webgl-optional'),
    smoothingFactor: z.number().min(0).max(1),
    contentLayer: z.literal('semantic-dom'),
    reducedMotion: z.literal('stable-states-crossfade')
  }).strict(),
  acceptanceEvidence: z.array(evidenceStateSchema).min(4)
}).strict();

export type PresentationCapability = z.infer<typeof presentationCapabilitySchema>;

export const capabilitySelectionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  reasons: z.array(z.string().min(3)).min(1),
  blockers: z.array(z.string().min(3)),
  contract: presentationCapabilitySchema.nullable()
}).strict();

export type CapabilitySelection = z.infer<typeof capabilitySelectionSchema>;

export const mediaScrollScrubCapability: PresentationCapability = presentationCapabilitySchema.parse({
  id: 'media-scroll-scrub',
  title: '连续媒体滚动叙事',
  evidenceLevel: 'runtime-verified',
  prototypeUrl: './prototypes/scroll-scrub-media/',
  sourceEvidence: [
    'https://motionsites.ai/lesson/build-scroll-animated-website-with-ai',
    '../../docs/v2-research/MOTIONSITES-R02-SCROLL-SCRUB-PROTOTYPE.md'
  ],
  applicablePatterns: ['continuous-scroll', 'environmental-memory', 'product-atmosphere'],
  positiveSignals: [
    '滚动', '连续', '逐渐', '形成', '变化', '记忆', '梦境', '情绪', '状态',
    'scroll', 'sequence', 'memory', 'transition'
  ],
  blockerSignals: [
    'glb', 'gltf', '拆解', '自由旋转', '配置器', '第一人称', '碰撞', '真实三维检查',
    'orbit', 'configurator', 'first-person'
  ],
  assetContract: {
    acceptedModalities: ['image-sequence', 'video', 'canvas-frame-sequence'],
    minimumStates: 3,
    maximumStates: 6,
    continuityRules: [
      '连续状态必须共享主体、场所或可追踪的空间坐标。',
      '机位、光向和视觉重心不能在相邻状态中无理由跳变。',
      '素材必须延伸到视口边缘，不允许出现矩形海报边界。'
    ],
    variationRules: [
      '每个阶段至少有一个服务叙事动词的可读状态变化。',
      '首尾状态必须分别为标题安全区和最终行动保留空间。'
    ],
    maximumInitialBytes: 2_500_000,
    maximumTotalBytes: 6_000_000
  },
  runtimeContract: {
    layout: 'fixed-full-bleed-media',
    driver: 'scroll-progress',
    renderer: 'dom-css-webgl-optional',
    smoothingFactor: 0.12,
    contentLayer: 'semantic-dom',
    reducedMotion: 'stable-states-crossfade'
  },
  acceptanceEvidence: [
    'asset-request',
    'screenshot-opening',
    'screenshot-beat',
    'screenshot-ending',
    'screenshot-mobile',
    'runtime'
  ]
});

export const presentationCapabilityCatalog: readonly PresentationCapability[] = [
  mediaScrollScrubCapability
];

export interface CapabilitySelectionInput {
  brief: string;
  pattern: ExperiencePattern;
  assetModalities: readonly string[];
}

export function selectPresentationCapability(input: CapabilitySelectionInput): CapabilitySelection {
  const capability = mediaScrollScrubCapability;
  const normalized = input.brief.toLowerCase();
  const matchedSignals = capability.positiveSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const matchedBlockers = capability.blockerSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const patternMatch = capability.applicablePatterns.includes(input.pattern);
  const hasContinuousMedia = input.assetModalities.includes('image-sequence')
    || input.assetModalities.includes('video')
    || input.assetModalities.includes('canvas-frame-sequence');

  const score = Math.min(100, Math.max(0,
    (patternMatch ? 40 : 0)
      + Math.min(30, matchedSignals.length * 6)
      + (hasContinuousMedia ? 25 : 0)
      - (matchedBlockers.length ? 55 : 0)
  ));

  const blockers = [
    ...matchedBlockers.map((signal) => `目标包含“${signal}”，需要真实空间或模型交互路线。`),
    ...(!hasContinuousMedia ? ['当前素材计划没有连续图片、视频或帧序列。'] : [])
  ];
  const selected = score >= 65 && blockers.length === 0;
  const reasons = [
    patternMatch
      ? `体验模式 ${input.pattern} 适合固定媒体滚动时间轴。`
      : `体验模式 ${input.pattern} 不是该能力的优先路线。`,
    matchedSignals.length
      ? `目标命中 ${matchedSignals.join('、')} 等连续叙事信号。`
      : '目标没有明确命中连续叙事信号。',
    hasContinuousMedia
      ? '素材计划提供了可映射到滚动状态的连续媒体。'
      : '需要先建立连续媒体素材职责。'
  ];

  return capabilitySelectionSchema.parse({
    selected,
    capabilityId: selected ? capability.id : null,
    score,
    reasons,
    blockers,
    contract: selected ? capability : null
  });
}
