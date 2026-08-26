import { z } from 'zod';
import type { PlanContext } from '../capabilities/schema.ts';
import type { AssetPlan } from './asset-plan.ts';
import type { EffectSpec } from './effect-spec.ts';

export const presentationStrategyIdSchema = z.enum([
  'semantic-dom',
  'procedural-field',
  'layered-depth',
  'material-refraction',
  'model-spatial',
  'video-spatial'
]);

export const presentationStrategySchema = z.object({
  schemaVersion: z.literal(1),
  preferred: presentationStrategyIdSchema,
  active: presentationStrategyIdSchema,
  status: z.enum(['ready', 'planned', 'adapted', 'blocked']),
  qualityGate: z.enum(['all', 'balanced-up', 'high-only']),
  evidence: z.array(z.string().min(4)).min(1),
  fallback: z.object({
    strategy: presentationStrategyIdSchema,
    triggers: z.array(z.enum(['low-quality', 'reduced-motion', 'missing-webgl', 'missing-asset', 'asset-gate-failed'])).min(1),
    reason: z.string().min(8)
  }).strict()
}).strict();

export type PresentationStrategy = z.infer<typeof presentationStrategySchema>;

const includesAny = (value: string, terms: readonly string[]): boolean => terms.some((term) => value.includes(term));

export function selectPresentationStrategy(
  effectSpec: EffectSpec,
  assetPlan: AssetPlan,
  context: PlanContext
): PresentationStrategy {
  const vocabulary = [
    effectSpec.title,
    effectSpec.thesis,
    effectSpec.direction.signatureMoment,
    effectSpec.direction.spatialMetaphor,
    ...effectSpec.direction.visualGrammar,
    ...effectSpec.composition.layers.flatMap((layer) => [layer.purpose, layer.visibleOutcome, ...layer.techniques])
  ].join(' ').toLowerCase();
  const ready = assetPlan.items.filter((item) => item.status === 'ready');
  const readyModel = ready.find((item) => item.modality === 'model-3d');
  const requiredModel = assetPlan.items.find((item) => item.modality === 'model-3d' && item.fallback === 'block');
  const readyVideo = ready.find((item) => item.modality === 'video');
  const readyImage = ready.find((item) => item.modality === 'image' || item.modality === 'texture' || item.modality === 'sprite');
  const imageCandidate = readyImage || assetPlan.items.find((item) => item.modality === 'image' || item.modality === 'texture' || item.modality === 'sprite');
  const hasSoftAlpha = readyImage?.features?.alpha === 'soft';
  const hasDepth = readyImage?.features?.depth === 'estimated' || readyImage?.features?.depth === 'authored';
  const wantsRefraction = includesAny(vocabulary, ['透明', '折射', '玻璃', '液态', '薄纱', 'transparent', 'refract', 'glass', 'liquid', 'organza']);
  const wantsDepth = effectSpec.composition.mode === 'hybrid-2.5d'
    || hasDepth
    || effectSpec.composition.layers.some((layer) => layer.techniques.includes('image-plane'));

  let preferred: PresentationStrategy['preferred'] = 'procedural-field';
  let status: PresentationStrategy['status'] = 'ready';
  let qualityGate: PresentationStrategy['qualityGate'] = 'all';
  let fallback: PresentationStrategy['fallback'] = {
    strategy: 'semantic-dom',
    triggers: ['missing-webgl'],
    reason: 'WebGL 不可用时保留完整语义内容、导航和行动入口。'
  };
  const evidence: string[] = [];

  if (effectSpec.composition.mode === 'dom-led') {
    preferred = 'semantic-dom';
    evidence.push('EffectSpec 明确由 DOM 承担主要表达，不为使用 Three.js 强行增加空间层。');
  } else if (readyModel) {
    preferred = 'model-spatial';
    qualityGate = 'balanced-up';
    evidence.push(`真实 ${readyModel.qualityLevel} 3D 候选已通过素材门禁。`);
    fallback = {
      strategy: imageCandidate ? 'layered-depth' : 'semantic-dom',
      triggers: ['low-quality', 'reduced-motion', 'missing-webgl', 'asset-gate-failed'],
      reason: imageCandidate ? '受限设备使用分层图像保持主体与构图。' : '没有可信图像替代时只保留语义页面。'
    };
  } else if (requiredModel) {
    preferred = 'model-spatial';
    status = 'blocked';
    qualityGate = 'balanced-up';
    evidence.push('目标要求准确、可检查的真实模型，但当前模型素材没有通过门禁。');
    fallback = {
      strategy: 'semantic-dom',
      triggers: ['missing-asset', 'asset-gate-failed', 'missing-webgl'],
      reason: '真实产品检查不可由装饰性几何冒充；素材就绪前不生成虚假模型。'
    };
  } else if (readyVideo) {
    preferred = 'video-spatial';
    qualityGate = 'balanced-up';
    evidence.push(`视频候选 ${readyVideo.candidateUri ?? readyVideo.requirementId} 已通过素材门禁。`);
    fallback = {
      strategy: imageCandidate ? 'layered-depth' : 'semantic-dom',
      triggers: ['low-quality', 'reduced-motion', 'missing-webgl', 'asset-gate-failed'],
      reason: imageCandidate ? '静态分层图像替代连续媒体，但保留空间构图。' : '媒体不可用时保留完整语义页面。'
    };
  } else if (readyImage && hasSoftAlpha && wantsRefraction) {
    preferred = 'material-refraction';
    qualityGate = 'balanced-up';
    evidence.push('透明图像具有 soft alpha，且 EffectSpec 明确需要透明、液态或折射材质。');
    fallback = {
      strategy: 'layered-depth',
      triggers: ['low-quality', 'reduced-motion', 'missing-webgl', 'asset-gate-failed'],
      reason: '关闭实时折射后仍用透明素材的分层纵深保持主体可信度。'
    };
  } else if (readyImage && (wantsDepth || hasSoftAlpha)) {
    preferred = 'layered-depth';
    qualityGate = 'all';
    evidence.push(hasDepth ? '图像具有可用深度信息，可构建受控 2.5D 视差。' : '现有图像适合被分层，而不是伪装成可自由旋转的真实 3D。');
    fallback = {
      strategy: 'semantic-dom',
      triggers: ['reduced-motion', 'missing-webgl', 'asset-gate-failed'],
      reason: '减少视差后仍保留静态主图与完整 DOM 内容。'
    };
  } else if (imageCandidate) {
    preferred = 'layered-depth';
    status = imageCandidate.status === 'blocked' || imageCandidate.status === 'upgrade-required' ? 'blocked' : 'planned';
    evidence.push('EffectSpec 需要图像素材；素材通过门禁后采用分层空间，不使用无关程序化占位物。');
    fallback = {
      strategy: 'procedural-field',
      triggers: ['missing-asset', 'asset-gate-failed', 'low-quality', 'missing-webgl'],
      reason: '素材未就绪时只展示不冒充具体主体的程序化氛围和语义内容。'
    };
  } else {
    evidence.push('没有必须依赖的可信媒体素材；使用程序化场域表达空间关系和运动。');
  }

  let active = preferred;
  if (context.renderer !== 'webgl') active = 'semantic-dom';
  else if (context.motion === 'reduce' && preferred !== 'semantic-dom' && preferred !== 'procedural-field') active = fallback.strategy;
  else if (context.quality === 'low' && qualityGate !== 'all') active = fallback.strategy;
  if (active !== preferred && status !== 'blocked') status = 'adapted';

  return presentationStrategySchema.parse({ schemaVersion: 1, preferred, active, status, qualityGate, evidence, fallback });
}
