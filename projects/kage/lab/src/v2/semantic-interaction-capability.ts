import { z } from 'zod';
import type { ExperiencePattern } from './reference-intelligence.ts';
import { hasExplicitBranchingConfluenceIntent } from './branching-confluence.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const coastlineEvidenceSchema = z.object({
  id: safeId,
  year: z.number().int().min(1900).max(2200),
  label: z.string().min(2),
  lossSquareKilometers: z.number().min(0),
  retreatMeters: z.number().min(0),
  relativeWaterCentimeters: z.number(),
  sceneMorph: z.number().min(0).max(1),
  summary: z.string().min(12)
}).strict();

export type CoastlineEvidence = z.infer<typeof coastlineEvidenceSchema>;

export interface InterpolatedCoastlineEvidence {
  position: number;
  anchorIndex: number;
  fromIndex: number;
  toIndex: number;
  blend: number;
  year: number;
  lossSquareKilometers: number;
  retreatMeters: number;
  relativeWaterCentimeters: number;
  sceneMorph: number;
  label: string;
  summary: string;
}

export const semanticInteractionCapabilitySchema = z.object({
  id: safeId,
  evidenceLevel: z.enum(['E1', 'E2', 'E3', 'E4']),
  state: z.enum(['candidate', 'validated', 'rejected']),
  problem: z.string().min(20),
  meaning: z.string().min(20),
  inputs: z.array(z.enum(['scroll', 'pointer', 'touch', 'keyboard'])).min(4).max(4),
  outputs: z.array(z.enum(['scene-shape', 'evidence-value', 'narrative-layer', 'selection-state'])).min(4).max(4),
  baseInterface: z.string().min(20),
  enhancedInterface: z.string().min(20),
  reducedMotionRule: z.string().min(20),
  rejectionRules: z.array(z.string().min(12)).min(2),
  evidence: z.array(coastlineEvidenceSchema).length(3)
}).strict();

export type SemanticInteractionCapability = z.infer<typeof semanticInteractionCapabilitySchema>;

export const semanticInteractionDecisionSchema = z.object({
  selected: z.boolean(),
  capabilityId: safeId.nullable(),
  score: z.number().min(0).max(100),
  matchedSignals: z.array(z.string().min(1)),
  reasons: z.array(z.string().min(3)).min(1),
  blockers: z.array(z.string().min(3)),
  evaluatedCapability: semanticInteractionCapabilitySchema
}).strict();

export type SemanticInteractionDecision = z.infer<typeof semanticInteractionDecisionSchema>;

export interface SemanticInteractionDecisionInput {
  brief: string;
  pattern: ExperiencePattern;
  primaryInput: 'scroll' | 'pointer' | 'direct-navigation';
  assetRoles: readonly string[];
}

export const semanticInteractionCapability: SemanticInteractionCapability = semanticInteractionCapabilitySchema.parse({
  id: 'semantic-responsive-interaction',
  evidenceLevel: 'E4',
  state: 'validated',
  problem: '装饰性鼠标动效不能帮助用户理解内容，也无法稳定迁移到触摸、键盘和减少动态效果环境。',
  meaning: '滚动选择证据层，时间选择改变海岸形态和数字，指针只在局部揭示相对于基准年已经消失的土地。',
  inputs: ['scroll', 'pointer', 'touch', 'keyboard'],
  outputs: ['scene-shape', 'evidence-value', 'narrative-layer', 'selection-state'],
  baseInterface: '语义 DOM 始终提供年代按钮、损失数字、解释文字和当前状态，不依赖 WebGL 完成比较。',
  enhancedInterface: 'WebGL 把年代选择映射为同一海岸场的连续形变，并让局部证据透镜显示相对损失范围。',
  reducedMotionRule: '减少动态效果时立即切换到目标年代和阶段，停止连续漂移，但保留所有数值和比较结果。',
  rejectionRules: [
    '移除交互后信息理解完全不变时拒绝晋级。',
    '触摸、键盘或无 WebGL 回退无法完成比较时拒绝晋级。'
  ],
  evidence: [
    {
      id: 'coast-1984',
      year: 1984,
      label: '基准海岸',
      lossSquareKilometers: 0,
      retreatMeters: 0,
      relativeWaterCentimeters: 0,
      sceneMorph: 0,
      summary: '沙洲仍然连续，潮沟尚未切断内侧湿地。'
    },
    {
      id: 'coast-2004',
      year: 2004,
      label: '潮沟扩张',
      lossSquareKilometers: 3.2,
      retreatMeters: 186,
      relativeWaterCentimeters: 8,
      sceneMorph: 0.5,
      summary: '外侧沙洲变薄，新的潮沟开始把湿地分成孤立片区。'
    },
    {
      id: 'coast-2026',
      year: 2026,
      label: '临界断面',
      lossSquareKilometers: 8.7,
      retreatMeters: 421,
      relativeWaterCentimeters: 17,
      sceneMorph: 1,
      summary: '连续岸线已经断裂，曾经被遮蔽的社区直接面对风暴潮。'
    }
  ]
});

const lerp = (from: number, to: number, blend: number) => from + (to - from) * blend;

export function interpolateCoastlineEvidence(
  position: number,
  evidence = semanticInteractionCapability.evidence
): InterpolatedCoastlineEvidence {
  const normalized = Number.isFinite(position) ? Math.min(1, Math.max(0, position)) : 0;
  const scaled = normalized * Math.max(0, evidence.length - 1);
  const fromIndex = Math.floor(scaled);
  const toIndex = Math.min(evidence.length - 1, Math.ceil(scaled));
  const blend = scaled - fromIndex;
  const from = evidence[fromIndex] ?? evidence[0]!;
  const to = evidence[toIndex] ?? from;
  const anchorIndex = Math.round(scaled);
  const isAnchor = Math.abs(scaled - anchorIndex) < 0.001;

  return {
    position: normalized,
    anchorIndex,
    fromIndex,
    toIndex,
    blend,
    year: lerp(from.year, to.year, blend),
    lossSquareKilometers: lerp(from.lossSquareKilometers, to.lossSquareKilometers, blend),
    retreatMeters: lerp(from.retreatMeters, to.retreatMeters, blend),
    relativeWaterCentimeters: lerp(from.relativeWaterCentimeters, to.relativeWaterCentimeters, blend),
    sceneMorph: lerp(from.sceneMorph, to.sceneMorph, blend),
    label: isAnchor ? from.label : `${from.year}—${to.year} / 变化中`,
    summary: isAnchor
      ? from.summary
      : `正在比较 ${from.year} 与 ${to.year} 之间的岸线变化；释放后吸附到最近证据年。`
  };
}

export function resolveEvidenceIndexFromPosition(position: number, count = semanticInteractionCapability.evidence.length) {
  if (!Number.isFinite(position) || count <= 1) return 0;
  const normalized = Math.min(1, Math.max(0, position));
  return Math.min(count - 1, Math.round(normalized * (count - 1)));
}

export function cycleEvidenceIndex(index: number, direction: -1 | 1, count = semanticInteractionCapability.evidence.length) {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, index + direction));
}

const semanticSignals = [
  '比较', '对照', '证据', '年代', '时间', '变化', '关系', '路径', '选择', '探索', '档案',
  '损失', '消失', '因果', 'compare', 'evidence', 'timeline', 'relationship', 'choose', 'explore'
] as const;

const semanticBlockerSignals = [
  '纯静态', '静态单页', '无需交互', '不需要交互', '只展示',
  'glb', 'gltf', '自由旋转', '拆解', '第一人称', 'orbit', 'configurator'
] as const;

export function selectSemanticInteractionCapability(
  input: SemanticInteractionDecisionInput
): SemanticInteractionDecision {
  const normalized = input.brief.toLowerCase();
  const branchingConfluence = hasExplicitBranchingConfluenceIntent(input.brief);
  const pointerSemanticAction = /(?:指针|鼠标|触摸|拖动|点击).{0,64}(?:改变|选择|比较|揭示|更新|控制|混合|切换|播放|出现|显示|发声|同步)|(?:改变|选择|比较|揭示|更新|控制|混合|切换|播放|出现|显示|发声|同步).{0,64}(?:指针|鼠标|触摸|拖动|点击)/i.test(normalized);
  const stateSelectionAction = /(?:选择|切换|调整|填写|选中).{0,36}(?:后|时|并|会|同步).{0,48}(?:更新|改变|显示|查看|高亮|切换|联动|同步)|(?:select|choose|change).{0,48}(?:update|highlight|sync|show)/i.test(normalized);
  const explicitSemanticAction = pointerSemanticAction || stateSelectionAction || branchingConfluence;
  const matchedSignals = semanticSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const matchedBlockers = semanticBlockerSignals.filter((signal) => normalized.includes(signal.toLowerCase()));
  const patternMatch = input.pattern === 'spatial-exploration' || input.pattern === 'editorial-field';
  const hasInformationResponsibility = input.assetRoles.includes('information');
  const hasSemanticInput = input.primaryInput === 'direct-navigation' || input.primaryInput === 'pointer';
  const score = Math.min(100, Math.max(0,
    Math.min(45, matchedSignals.length * 9)
      + (patternMatch ? 25 : 0)
      + (hasInformationResponsibility ? 20 : 0)
      + (explicitSemanticAction ? 60 : hasSemanticInput ? 15 : 0)
      - (matchedBlockers.length ? 70 : 0)
  ));
  const blockers = matchedBlockers.map((signal) => (
    ['glb', 'gltf', '自由旋转', '拆解', '第一人称', 'orbit', 'configurator'].includes(signal)
      ? `目标包含“${signal}”，应使用真实空间对象能力，不能套用当前证据比较原型。`
      : `目标明确包含“${signal}”，交互不应成为主要表达手段。`
  ));
  const selected = score >= 60 && blockers.length === 0;
  const reasons = [
    explicitSemanticAction
      ? branchingConfluence
        ? '目标明确要求选择两条路线、观察不同可见后果并汇合到同一行动。'
        : '目标明确要求直接选择、指针或触摸操作改变内容、比例或可见状态。'
      : matchedSignals.length
      ? `目标命中“${matchedSignals.join('、')}”等信息关系信号。`
      : '目标没有明确要求通过操作理解比较、证据或关系。',
    patternMatch && hasInformationResponsibility
      ? `体验模式 ${input.pattern} 且存在信息素材职责，交互可以改变理解。`
      : '当前体验模式或素材职责不足以证明交互必须存在。',
    hasSemanticInput
      ? `现有导演决策已把 ${input.primaryInput} 定义为有语义的主要输入。`
      : '现有导演决策只需要滚动推进，不额外增加主要交互。'
  ];

  return semanticInteractionDecisionSchema.parse({
    selected,
    capabilityId: selected ? semanticInteractionCapability.id : null,
    score,
    matchedSignals,
    reasons,
    blockers,
    evaluatedCapability: semanticInteractionCapability
  });
}
