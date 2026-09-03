import { z } from 'zod';
import { stableHash } from '../generation/stable-hash.ts';
import {
  createV2CreativeContract,
  v2CreativeContractSchema,
  type V2CreativeContract
} from './creative-contract.ts';
import {
  creativePromiseSchema,
  type CreativePromise
} from './creative-freedom-policy.ts';
import {
  createDirectCreativeAuthorPackageV5,
  directCreativeAuthorPackageSchema,
  serializeDirectCreativeAuthorPackage
} from './direct-creative-author-package.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const experienceIntentSchema = z.object({
  schemaVersion: z.literal(1),
  exactBrief: z.string().trim().min(8).max(4000),
  subject: z.string().trim().min(2).max(200),
  audience: z.string().trim().min(2).max(300),
  intendedFeeling: z.string().trim().min(2).max(300),
  intendedUnderstanding: z.string().trim().min(8).max(700),
  themeSpecificMemory: z.string().trim().min(4).max(700),
  primaryAction: z.string().trim().min(2).max(220)
}).strict();

export type ExperienceIntent = z.infer<typeof experienceIntentSchema>;

/**
 * Additive V2 entry. It deliberately wraps the existing V5 protocol instead
 * of changing V1, the legacy workbench, frozen deliveries, or their schemas.
 */
export const directCreativePreparationSchema = z.object({
  schemaVersion: z.literal(1),
  entry: z.literal('kage-v2-codex-direct'),
  preparationId: z.string().regex(/^preparation-[a-z0-9]+$/),
  contractId: safeId,
  runId: z.string().regex(/^direct-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  state: z.literal('prepared'),
  experienceIntent: experienceIntentSchema,
  experiencePromise: creativePromiseSchema,
  contract: v2CreativeContractSchema,
  authorPackage: directCreativeAuthorPackageSchema,
  nextAction: z.literal('compare-directions-and-bind-selection')
}).strict().superRefine((preparation, context) => {
  if (preparation.contractId !== preparation.contract.id
    || preparation.contractId !== preparation.authorPackage.contractId) {
    context.addIssue({ code: 'custom', message: '意图、合同与作者包必须来自同一 contractId。' });
  }
  if (preparation.runId !== preparation.authorPackage.runSeed.id) {
    context.addIssue({ code: 'custom', message: '准备记录必须绑定作者包中的唯一 DirectCreativeRun。' });
  }
  if (preparation.experienceIntent.exactBrief !== preparation.contract.brief) {
    context.addIssue({ code: 'custom', message: '体验意图必须保留用户的原始 brief。' });
  }
  if (preparation.authorPackage.runSeed.creativeProtocolVersion !== 5) {
    context.addIssue({ code: 'custom', message: '新直创入口只准备 V5 产品交付运行。' });
  }
  const invalidHardInstructions = preparation.contract.instructions.filter((instruction) => (
    instruction.strength === 'hard'
      && instruction.source !== 'user'
      && instruction.source !== 'quality'
  ));
  if (invalidHardInstructions.length > 0) {
    context.addIssue({
      code: 'custom',
      message: '只有用户当前要求与通用质量门可以成为硬约束。'
    });
  }
});

export type DirectCreativePreparation = z.infer<typeof directCreativePreparationSchema>;

/**
 * The single side-effect-free preparation entry for new V2 Codex-direct work.
 * It does not invoke a model, write files, archive a case, or start deployment.
 */
export function prepareDirectCreativeRun(rawBrief: string): DirectCreativePreparation {
  const contract = createV2CreativeContract(rawBrief);
  const authorPackage = createDirectCreativeAuthorPackageV5(contract);
  const experienceIntent = deriveExperienceIntent(contract);
  const experiencePromise = deriveExperiencePromise(contract, authorPackage);
  const preparationId = `preparation-${stableHash(JSON.stringify({
    contractId: contract.id,
    runId: authorPackage.runSeed.id,
    experienceIntent,
    experiencePromise
  }))}`;

  return directCreativePreparationSchema.parse({
    schemaVersion: 1,
    entry: 'kage-v2-codex-direct',
    preparationId,
    contractId: contract.id,
    runId: authorPackage.runSeed.id,
    state: 'prepared',
    experienceIntent,
    experiencePromise,
    contract,
    authorPackage,
    nextAction: 'compare-directions-and-bind-selection'
  });
}

export function serializeDirectCreativePreparation(input: DirectCreativePreparation): string {
  const preparation = directCreativePreparationSchema.parse(input);
  return [
    'KAGE V2 CODEX DIRECT PREPARATION',
    '先兑现体验承诺，再选择技术。3D、声音、视频、生成素材、真实素材、排版、Shader 与程序化表达均为开放手段。',
    '不得把历史模板、案例风险或推断升级为硬约束；只有用户当前要求、真实性、运行质量、证据身份、安全与预算是硬边界。',
    '以下 ExperienceIntent 和 ExperiencePromise 是本次最终浏览器判断的必填依据；缺失或未兑现时不得进入精选库。',
    'EXPERIENCE_INTENT_JSON',
    JSON.stringify(preparation.experienceIntent),
    'EXPERIENCE_PROMISE_JSON',
    JSON.stringify(preparation.experiencePromise),
    serializeDirectCreativeAuthorPackage(preparation.authorPackage)
  ].join('\n');
}

function deriveExperienceIntent(contract: V2CreativeContract): ExperienceIntent {
  return experienceIntentSchema.parse({
    schemaVersion: 1,
    exactBrief: contract.brief,
    subject: contract.intent.subject,
    audience: contract.intent.audience,
    intendedFeeling: contract.intent.desiredFeeling,
    intendedUnderstanding: contract.intent.narrativeChange,
    themeSpecificMemory: contract.experience.finalMemoryPoint,
    primaryAction: contract.intent.primaryAction
  });
}

function deriveExperiencePromise(
  contract: V2CreativeContract,
  authorPackage: z.infer<typeof directCreativeAuthorPackageSchema>
): CreativePromise {
  const direction = authorPackage.authoringInput.creativeDirection;
  const methods = [
    direction.leadMedium.medium,
    ...direction.supportingMedia.map((medium) => medium.medium)
  ].filter((method, index, all) => all.indexOf(method) === index);
  const interactionMode = authorPackage.runSeed.interaction.mode;

  return creativePromiseSchema.parse({
    schemaVersion: 1,
    thesis: contract.experience.thesis,
    signatureMoment: `${direction.signatureMoment.title}：${direction.signatureMoment.themeConnection}`,
    expressionStrategy: `${direction.leadMedium.responsibility} ${direction.qualityStrategy.cohesionRule}`,
    runtimeRole: interactionMode === 'none' ? 'not-applicable' : 'essential',
    chosenMethods: methods,
    methodRationale: `${direction.leadMedium.rationale} 所有辅助手段只服务同一体验承诺，可在最终效果更好时替换。`
  });
}
