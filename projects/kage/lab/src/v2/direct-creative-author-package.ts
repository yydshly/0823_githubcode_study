import { z } from 'zod';
import { stableHash } from '../generation/stable-hash.ts';
import {
  v2CreativeContractSchema,
  type V2CreativeContract
} from './creative-contract.ts';
import { serializeCodexAuthoringBrief } from './codex-execution-brief.ts';
import {
  createDirectCreativeRunFromContractV3,
  createDirectCreativeRunFromContractV4,
  createDirectCreativeRunFromContractV5
} from './direct-creative-protocol.ts';
import { creativeMediumDecisionSchema } from './creative-medium-decision.ts';
import { creativeDirectionSpecSchema } from './creative-direction-spec.ts';
import {
  DIRECT_CREATIVE_STATUS_REPORT_AFTER_MS,
  directCreativeAttemptBudgetSchema
} from './direct-creative-run.ts';
import {
  adaptiveEvidenceProfileSchema,
  createAdaptiveEvidenceProfile,
  creativeInteractionRationaleSchema,
  type CreativeInteractionRationale
} from './final-creative-evidence.ts';
import {
  isRuntimeAttractionRequired,
  visualAmbitionIntentLevelSchema
} from './visual-ambition.ts';
import { productDeliveryPlanSchema } from './product-delivery-readiness.ts';
import {
  createCreativeDirectorGuidance,
  serializeCompactCreativeDirectorGuidance
} from './creative-quality-guidance.ts';

const safeId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const {
  effectQualitySelection: _projectSelectionGateShape,
  ...compactCreativeDirectionShape
} = creativeDirectionSpecSchema.shape;
const compactCreativeDirectionSpecSchema = z.object(compactCreativeDirectionShape).strict()
  .superRefine((spec, context) => {
    const media = spec.supportingMedia.map((item) => item.medium);
    if (media.includes(spec.leadMedium.medium)) {
      context.addIssue({
        code: 'custom',
        path: ['supportingMedia'],
        message: '辅助媒介不得重复主导媒介。'
      });
    }
    if (media.length !== new Set(media).size) {
      context.addIssue({
        code: 'custom',
        path: ['supportingMedia'],
        message: '辅助媒介不得重复。'
      });
    }
  });

/**
 * The complete research contract remains persisted in V2. This schema only
 * verifies the identity and visual decisions that a one-shot author must see.
 */
export const compactCodexAuthoringInputSchema = z.object({
  schemaVersion: z.literal(1),
  contractId: safeId,
  exactBrief: z.string().trim().min(8).max(4000),
  mediumDecision: creativeMediumDecisionSchema,
  goal: z.object({
    subject: z.string().trim().min(2),
    audience: z.string().trim().min(2),
    feeling: z.string().trim().min(2),
    change: z.string().trim().min(4),
    action: z.string().trim().min(2),
    avoid: z.array(z.string().trim().min(2)).max(8)
  }).strict(),
  visualAmbition: z.object({
    intentLevel: visualAmbitionIntentLevelSchema,
    hero: z.object({
      title: z.string().trim().min(2),
      withinSeconds: z.number().min(0).max(15),
      change: z.unknown().nullable()
    }).passthrough(),
    rendering: z.object({
      primary: z.string().trim().min(2),
      supporting: z.array(z.string().trim().min(2)).max(4)
    }).passthrough(),
    depth: z.object({
      mode: z.string().trim().min(2),
      cues: z.array(z.string().trim().min(2)).max(8)
    }).passthrough(),
    motion: z.array(z.object({
      phase: z.string().trim().min(2),
      driver: z.string().trim().min(2),
      state: z.string().trim().min(2)
    }).passthrough()).min(1).max(3)
  }).passthrough(),
  creativeDirection: compactCreativeDirectionSpecSchema,
  direction: z.object({
    visualRole: z.string().trim().min(2),
    renderer: z.object({
      route: z.string().trim().min(2),
      base: z.string().trim().min(2),
      enhancement: z.string().trim().min(2),
      reason: z.string().trim().min(8),
      threeJustification: z.string().trim().min(8),
      fallback: z.string().trim().min(8)
    }).strict(),
    mechanisms: z.array(z.object({
      id: safeId,
      title: z.string().trim().min(2),
      job: z.string().trim().min(8)
    }).strict()).min(1).max(3),
    interaction: z.object({
      primaryInput: z.string().trim().min(2),
      semanticAction: z.string().trim().min(8),
      pointerRole: z.string().trim().min(2),
      touchAlternative: z.string().trim().min(8),
      keyboardAlternative: z.string().trim().min(8)
    }).strict(),
    rejected: z.array(z.object({
      id: safeId,
      reason: z.string().trim().min(8)
    }).strict()).max(3)
  }).strict(),
  references: z.array(z.object({
    id: safeId,
    title: z.string().trim().min(2),
    positiveBorrowPrinciples: z.array(z.string().trim().min(8)).min(1),
    relevanceReason: z.string().trim().min(8),
    confidence: z.number().min(0).max(1)
  }).passthrough()).max(3),
  assets: z.array(z.object({
    id: safeId,
    role: z.string().trim().min(2),
    modality: z.string().trim().min(2),
    required: z.boolean(),
    quality: z.string().trim().min(2),
    sourcePriority: z.array(z.string().trim().min(2)).min(1),
    responsibility: z.string().trim().min(8),
    continuity: z.string().trim().min(8),
    integration: z.string().trim().min(2),
    proof: z.string().trim().min(8),
    fallback: z.string().trim().min(2)
  }).strict()).max(5)
}).passthrough();

export type CompactCodexAuthoringInput = z.infer<typeof compactCodexAuthoringInputSchema>;

export const directCreativeRunSeedSchema = z.object({
  schemaVersion: z.literal(1),
  creativeProtocolVersion: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  id: z.string().regex(/^direct-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  contractId: safeId,
  mediumDecisionFingerprint: safeId,
  verdict: z.literal('pending'),
  directionId: safeId,
  assetBatchId: safeId,
  assetStrategy: z.enum(['generated', 'provided', 'licensed', 'programmatic', 'mixed', 'none']),
  interaction: creativeInteractionRationaleSchema,
  attemptBudget: directCreativeAttemptBudgetSchema,
  effectSelectionReceipt: z.null().optional(),
  productDeliveryPlan: productDeliveryPlanSchema.optional(),
  finalCandidate: z.null(),
  adaptiveEvidence: z.null(),
  stopReason: z.null()
}).strict().superRefine((seed, context) => {
  if (seed.creativeProtocolVersion >= 4 && seed.effectSelectionReceipt !== null) {
    context.addIssue({ code: 'custom', message: 'V4+ 初始 run 必须显式处于等待效果选择回执的状态。' });
  }
  if (seed.creativeProtocolVersion === 3 && seed.effectSelectionReceipt !== undefined) {
    context.addIssue({ code: 'custom', message: 'V3 初始 run 不应伪装为 V4 选择状态。' });
  }
  if (seed.creativeProtocolVersion === 5 && !seed.productDeliveryPlan) {
    context.addIssue({ code: 'custom', message: 'V5 初始 run 必须携带完整产品旅程计划。' });
  }
  if (seed.creativeProtocolVersion < 5 && seed.productDeliveryPlan !== undefined) {
    context.addIssue({ code: 'custom', message: '旧协议不应伪装为 V5 产品交付运行。' });
  }
});

export const directCreativeAuthorPackageSchema = z.object({
  schemaVersion: z.literal(1),
  packageId: z.string().regex(/^author-package-[a-z0-9]+$/),
  contractId: safeId,
  authoringInput: compactCodexAuthoringInputSchema,
  runSeed: directCreativeRunSeedSchema,
  timing: z.object({
    statusReportAfterMs: z.literal(DIRECT_CREATIVE_STATUS_REPORT_AFTER_MS),
    deadlineAfterMs: z.number().int().min(60_000).max(30 * 60_000),
    silentRetries: z.literal(0)
  }).strict(),
  evidenceRequirements: z.object({
    profile: adaptiveEvidenceProfileSchema,
    identityBinding: z.literal('runId+bundleHash'),
    macroStructureReview: z.literal('content-fit-required'),
    wowGateRequired: z.boolean(),
    productDeliveryRequired: z.boolean(),
    creativePromiseReview: z.literal('declared-promise-relative'),
    archivePolicy: z.literal('best-result-only')
  }).strict()
}).strict().superRefine((authorPackage, context) => {
  if (authorPackage.contractId !== authorPackage.authoringInput.contractId
    || authorPackage.contractId !== authorPackage.runSeed.contractId) {
    context.addIssue({ code: 'custom', message: '作者输入、合同和初始 run 必须来自同一 contractId。' });
  }
  const expectedWow = isRuntimeAttractionRequired(
    authorPackage.authoringInput.visualAmbition.intentLevel
  );
  if (authorPackage.evidenceRequirements.wowGateRequired !== expectedWow) {
    context.addIssue({ code: 'custom', message: 'WowGate 要求必须由当前视觉野心等级推导。' });
  }
  if (authorPackage.runSeed.interaction.mode
    !== authorPackage.evidenceRequirements.profile.interactionMode) {
    context.addIssue({ code: 'custom', message: '初始 run 的交互形态与验收配置不一致。' });
  }
  const expectedInteraction = preserveExactBriefSharedState(
    authorPackage.authoringInput.exactBrief,
    authorPackage.runSeed.interaction
  );
  if (JSON.stringify(authorPackage.runSeed.interaction) !== JSON.stringify(expectedInteraction)) {
    context.addIssue({ code: 'custom', message: '初始 run 必须保留 exactBrief 明确要求的多输入共享状态。' });
  }
  const expectedMediumFingerprint = stableHash(JSON.stringify(
    creativeMediumDecisionSchema.parse(authorPackage.authoringInput.mediumDecision)
  ));
  if (authorPackage.runSeed.mediumDecisionFingerprint !== expectedMediumFingerprint) {
    context.addIssue({ code: 'custom', message: '初始 run 与作者输入的媒介决策指纹不一致。' });
  }
  if (authorPackage.evidenceRequirements.productDeliveryRequired
    !== (authorPackage.runSeed.creativeProtocolVersion === 5)) {
    context.addIssue({ code: 'custom', message: '产品交付门要求必须与 V5 运行版本一致。' });
  }
});

export type DirectCreativeAuthorPackage = z.infer<typeof directCreativeAuthorPackageSchema>;

export function createDirectCreativeAuthorPackage(
  input: V2CreativeContract
): DirectCreativeAuthorPackage {
  return createDirectCreativeAuthorPackageForProtocol(input, 3);
}

export function createDirectCreativeAuthorPackageV4(
  input: V2CreativeContract
): DirectCreativeAuthorPackage {
  return createDirectCreativeAuthorPackageForProtocol(input, 4);
}

export function createDirectCreativeAuthorPackageV5(
  input: V2CreativeContract
): DirectCreativeAuthorPackage {
  return createDirectCreativeAuthorPackageForProtocol(input, 5);
}

function createDirectCreativeAuthorPackageForProtocol(
  input: V2CreativeContract,
  protocolVersion: 3 | 4 | 5
): DirectCreativeAuthorPackage {
  const contract = v2CreativeContractSchema.parse(input);
  const authoringInput = compactCodexAuthoringInputSchema.parse(
    JSON.parse(serializeCodexAuthoringBrief(contract))
  );
  const run = protocolVersion === 5
    ? createDirectCreativeRunFromContractV5(contract)
    : protocolVersion === 4
      ? createDirectCreativeRunFromContractV4(contract)
      : createDirectCreativeRunFromContractV3(contract);
  const interaction = preserveExactBriefSharedState(
    authoringInput.exactBrief,
    run.interactionRationale
  );
  const packageId = `author-package-${stableHash(JSON.stringify({
    contractId: contract.id,
    runId: run.id,
    authoringInput
  }))}`;

  return directCreativeAuthorPackageSchema.parse({
    schemaVersion: 1,
    packageId,
    contractId: contract.id,
    authoringInput,
    runSeed: {
      schemaVersion: 1,
      creativeProtocolVersion: protocolVersion,
      id: run.id,
      contractId: contract.id,
      mediumDecisionFingerprint: stableHash(JSON.stringify(authoringInput.mediumDecision)),
      verdict: 'pending',
      directionId: run.selectedDirection.id,
      assetBatchId: run.assetPlan.batchId,
      assetStrategy: run.assetPlan.strategy,
      interaction,
      attemptBudget: run.attemptBudget,
      ...(protocolVersion >= 4 ? { effectSelectionReceipt: null } : {}),
      ...(protocolVersion === 5 ? { productDeliveryPlan: run.productDeliveryPlan } : {}),
      finalCandidate: null,
      adaptiveEvidence: null,
      stopReason: null
    },
    timing: {
      statusReportAfterMs: DIRECT_CREATIVE_STATUS_REPORT_AFTER_MS,
      deadlineAfterMs: contract.executionLimits.stopAfterMinutes * 60_000,
      silentRetries: 0
    },
    evidenceRequirements: {
      profile: createAdaptiveEvidenceProfile(interaction),
      identityBinding: 'runId+bundleHash',
      macroStructureReview: 'content-fit-required',
      wowGateRequired: isRuntimeAttractionRequired(authoringInput.visualAmbition.intentLevel),
      productDeliveryRequired: protocolVersion === 5,
      creativePromiseReview: 'declared-promise-relative',
      archivePolicy: contract.executionLimits.archivePolicy
    }
  });
}

export function serializeDirectCreativeAuthorPackage(
  input: DirectCreativeAuthorPackage
): string {
  const authorPackage = directCreativeAuthorPackageSchema.parse(input);
  const creativeDirectorGuidance = createCreativeDirectorGuidance(authorPackage);
  const selectionGuard = authorPackage.runSeed.creativeProtocolVersion >= 4
    ? 'V4+ 初始 runSeed.effectSelectionReceipt=null：必须先把三个候选和唯一选择写入 EffectQualitySelectionReceipt，并通过 bindDirectCreativeEffectSelection；绑定前严禁记录素材批次或构建。无合格候选或回执无效时，必须在 effect-selection 阶段显式停止。'
    : 'V3选择自评不是最终浏览器证据';
  const productGuard = authorPackage.runSeed.creativeProtocolVersion === 5
    ? '这是 V5 产品交付运行：页面不能停在单个视觉演示。必须按 productDeliveryPlan 完成产品身份与价值、核心使用、可理解结果和后续路径；关键主视觉必须使用正式来源素材，或证明实时/程序化媒介本身就是产品功能。最终只有 attachProductDeliveryEvidence 绑定同一 bundle 并通过后，才可进入正式产品库。'
    : '仅有研究归档资格，不得标记为 V5 正式产品。';
  return [
    '请在现有 Kage 项目中直接完成一个主题专属、可运行的最佳网页。',
    '以下数据包是唯一创作边界：只选择一个方向、只进行一次素材批次与一次完整构建；最多两次确定性修复和一次视觉精修。',
    '先执行 creativeDirection.effectFirst：在获取素材或写代码前，内部比较三个大胆且真正不同的效果命题，再只提交并实现一个。比较不是三次构建，也不得触发额外素材批次。',
    '在资源前记录三个不同候选；技术数量、3D、声音、视频、模型或来源不计分。template-inertia 只提示复核。静态表达本身不扣分；仅当候选声明运行时变化为 essential 却可被静态画面等价替代时才拒绝。三个有效方向全被质量拒绝时才停止，最终质量由浏览器证据判断。',
    selectionGuard,
    productGuard,
    '最终体验高于技术目录；可以采用未列出的技术、合成方式或交互语法。',
    'creativeFreedom：硬边界只含用户要求、真实性、可用性、证据与预算；案例和推断必须可放弃，按创意承诺验收。',
    'resourceOrchestration 从产品能力、GitHub 机制、模型素材、项目能力与原创代码中选最少充分组合；不强制来源或技术。',
    '核对 revision、许可、真实性与回退。模型素材限一批；禁止静默换库、换模型或重复生成。',
    '不要建立后台模型调用，不要扩展供应商，不要把案例复制成模板；融合 references 的正向原理，并以最终浏览器效果为准。',
    '创意指导是建议：按感受、主题证据与行动选择，技术数量与技术声望不计分；不套案例，终稿只看浏览器。',
    'mediumDecision.preferred 与 creativeDirection.leadMedium 是资源规划中的主导媒介，不是唯一可用媒介。它不是创意边界，也不是技术白名单。支持手段只能强化同一视觉锚点，不得堆砌能力。alternative 是首选明确失败后的一次有界降级，不是第二创意方向，也不能触发第二批素材。',
    'creativeDirection.sourcePolicy=open-best-fit 表示素材来源默认开放：可以选择最适合的真实、已有、生成或程序化素材；只有 creativeDirection.hardConstraints 可以禁止当前任务的媒介或风格，案例风险与历史惯性不得升级为全局禁令。',
    'required image-sequence 的全部连续状态属于同一素材职责与同一素材批次；不得把各状态拆成多批，也不得用泛化单张环境图替代状态主体。',
    '页面宏观形态服从 technical.styleDiversity.structureDirection：只有 controlVisibility=persistent 且内容确实需要连续直接操作时才使用持久参数面板；none/contextual 不得擅自扩展为侧栏滑杆与指标工作台。',
    'story.structure.mode=branching-confluence 时，必须让两条路线都可返回重放、在同一视觉主体上产生主题专属差异，并保留路径身份汇合到同一行动；不得替换成目录、工作台、文案切换或线性长滚动。',
    'story.structure.mode=spatial-inspection 时，必须让同一通过门禁的动画模型保持主体身份，从模型 animations 核验真实命名剪辑，并让动作选择、镜头、空间证据、语义说明和结果共享同一状态；缺失模型或剪辑时诚实阻断，不得伪造动作。',
    `阶段超过 ${Math.round(authorPackage.timing.statusReportAfterMs / 1000)} 秒时报告可见进度；达到 ${Math.round(authorPackage.timing.deadlineAfterMs / 60_000)} 分钟截止线后显式停止，不得静默重试。`,
    '完成后按 evidenceRequirements 验证最终 runId + bundleHash，并附加 content-fit-required 宏观结构判断；未通过质量门时诚实停止，不进入精选库。',
    'CREATIVE_DIRECTOR_GUIDANCE_JSON',
    serializeCompactCreativeDirectorGuidance(creativeDirectorGuidance),
    'DIRECT_CREATIVE_AUTHOR_PACKAGE_JSON',
    JSON.stringify(authorPackage)
  ].join('\n');
}

function preserveExactBriefSharedState(
  exactBrief: string,
  interaction: CreativeInteractionRationale
): CreativeInteractionRationale {
  const clauses = exactBrief.split(/[。；;\n]/).map((clause) => clause.trim()).filter(Boolean);
  const sharedMultiInputClause = clauses.find((clause) => (
    /滚动|滚轮|\b(?:scroll|wheel)\b/i.test(clause)
      && /拖动|拖拽|\b(?:drag|swipe)\b/i.test(clause)
      && /方向键|箭头键|arrow\s*keys?|keyboard/i.test(clause)
      && /同一|共享|共同|同步/i.test(clause)
  ));
  if (!sharedMultiInputClause) return interaction;

  return creativeInteractionRationaleSchema.parse({
    mode: 'mixed',
    audioApplicable: interaction.audioApplicable,
    rationale: 'exactBrief 明确要求滚动、拖动与方向键共同推进同一主体状态；三种输入必须写入同一规范化状态，并同步驱动主体、结构或材质变化与语义结果。'
  });
}
