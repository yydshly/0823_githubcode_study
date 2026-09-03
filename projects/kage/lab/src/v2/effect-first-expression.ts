import { z } from 'zod';
import type { V2CreativeContract } from './creative-contract.ts';

/**
 * This directive sits above renderer and asset planning. It tells the author
 * what the audience should perceive while keeping implementation vocabulary
 * deliberately open.
 */
export const effectFirstExpressionDirectiveSchema = z.object({
  schemaVersion: z.literal(1),
  priority: z.literal('final-experience-over-known-techniques'),
  experiencePromise: z.object({
    audience: z.string().trim().min(2).max(300),
    emotionalTarget: z.string().trim().min(2).max(300),
    perceptualShift: z.string().trim().min(8).max(600),
    finalAction: z.string().trim().min(2).max(220)
  }).strict(),
  openExploration: z.object({
    candidateCount: z.literal(3),
    divergenceRule: z.string().trim().min(12).max(600),
    compareBy: z.tuple([
      z.literal('theme-specific-memory'),
      z.literal('sensory-impact'),
      z.literal('surprise-without-confusion'),
      z.literal('runtime-meaning'),
      z.literal('craft-cohesion')
    ]),
    commitPolicy: z.literal('compare-before-assets-then-build-one'),
    qualitySelection: z.object({
      rule: z.literal('goal-fit-with-no-rejection'),
      fail: z.literal('stop-before-assets'),
      proof: z.literal('browser-final')
    }).strict()
  }).strict(),
  methodPolicy: z.object({
    knownTechniquesAreExamplesOnly: z.literal(true),
    unlistedTechniquesAllowed: z.literal(true),
    inventionAllowed: z.literal(true),
    techniqueQuota: z.literal('none'),
    selectionRule: z.literal('choose-methods-only-after-selecting-the-effect'),
    sourcePolicy: z.literal('open-best-fit')
  }).strict(),
  effectProof: z.object({
    signaturePhenomenon: z.string().trim().min(8).max(600),
    observableChange: z.string().trim().min(8).max(600),
    staticEquivalentRisk: z.string().trim().min(8).max(500)
  }).strict(),
  authoringInstruction: z.string().trim().min(20).max(1000)
}).strict();

export type EffectFirstExpressionDirective = z.infer<
  typeof effectFirstExpressionDirectiveSchema
>;

export function deriveEffectFirstExpressionDirective(
  contract: V2CreativeContract
): EffectFirstExpressionDirective {
  const first = contract.experience.beats[0]!;
  const last = contract.experience.beats.at(-1)!;
  const visualAnchor = contract.visualAnchor.subject;

  return effectFirstExpressionDirectiveSchema.parse({
    schemaVersion: 1,
    priority: 'final-experience-over-known-techniques',
    experiencePromise: {
      audience: contract.intent.audience,
      emotionalTarget: contract.intent.desiredFeeling,
      perceptualShift: `让用户从“${first.visibleState}”经历到“${last.visibleState}”，并理解“${contract.intent.narrativeChange}”。`,
      finalAction: contract.intent.primaryAction
    },
    openExploration: {
      candidateCount: 3,
      divergenceRule: '开工前内部比较三个真正不同的体验命题；差异必须来自视觉世界、时间关系、空间逻辑或用户角色，而不是只换配色、字体、媒介名称或页面皮肤。',
      compareBy: [
        'theme-specific-memory',
        'sensory-impact',
        'surprise-without-confusion',
        'runtime-meaning',
        'craft-cohesion'
      ],
      commitPolicy: 'compare-before-assets-then-build-one',
      qualitySelection: {
        rule: 'goal-fit-with-no-rejection',
        fail: 'stop-before-assets',
        proof: 'browser-final'
      }
    },
    methodPolicy: {
      knownTechniquesAreExamplesOnly: true,
      unlistedTechniquesAllowed: true,
      inventionAllowed: true,
      techniqueQuota: 'none',
      selectionRule: 'choose-methods-only-after-selecting-the-effect',
      sourcePolicy: 'open-best-fit'
    },
    effectProof: {
      signaturePhenomenon: `根据“${clip(contract.brief, 160)}”围绕“${visualAnchor}”创造一个与本主题不可互换、可以被用户复述的感知事件。`,
      observableChange: `最终浏览器中必须真实看见或听见“${contract.intent.narrativeChange}”，而不是只改变说明文字、数字、高亮或通用装饰。`,
      staticEquivalentRisk: '如果一张静态截图已经等价表达全部承诺，则动态、互动或空间手段尚未产生足够价值。'
    },
    authoringInstruction: '先以创意导演身份提出三个大胆且互不相似的效果命题，选择其中最能服务体验承诺的一个，再决定素材、代码、动画、声音、视频、空间、排版或尚未进入项目目录的其他实现手段。现有能力清单只提供证据和启发，不是创作边界；但用户硬要求、真实性、安全、性能与有界执行仍必须遵守。'
  });
}

function clip(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}
