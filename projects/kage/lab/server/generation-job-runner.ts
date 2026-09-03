import type { PlanContext } from '../src/capabilities/schema.ts';
import { generateAssets, readCachedUserAsset, type CachedUserAssetDescriptor } from './asset-generator.ts';
import { dedicatedAuthoringModel, dedicatedCodeRequestSchema, dedicatedVisualRefinementModel, generateDedicatedExperience, hasSavedDedicatedCandidate, recoverSavedDedicatedCandidate, refineDedicatedExperience, type DedicatedBuildReceipt, type DedicatedCodeRequest, type DedicatedGenerationProgress, type DedicatedRefinementResult } from './dedicated-code-service.ts';
import {
  createAssetCompletion,
  generationJobAssetSubmissionSchema,
  mutateGenerationJob,
  readGenerationJob,
  updateGenerationJob,
  type GenerationJob,
  type GenerationJobAssetSubmission,
  type GenerationJobStage,
} from './generation-job-store.ts';
import { interpretWithProvider, providerStatus } from './provider-service.ts';
import { planAssetResolution } from '../src/generation/asset-resolution.ts';
import { findProjectCreativeAssetById, selectProjectCreativeAssets, type ProjectCreativeAsset } from '../src/generation/creative-asset-catalog.ts';
import { generateCreativeRun } from '../src/generation/orchestrator.ts';
import { selectCreativeCandidate } from '../src/generation/creative-candidate-selection.ts';
import type { AssetProductionReport } from '../src/generation/asset-production.ts';
import type { BriefInterpretation, CreativeBrief, CreativeRun, ProviderStatusResponse } from '../src/generation/schema.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';
import { evaluateAssetQualityGate } from '../src/generation/asset-quality-gate.ts';
import { assessDeliveryQuality } from '../src/generation/delivery-quality.ts';
import { createVisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { alignEffectSpecAssetsToV2Contract } from '../src/generation/v2-asset-boundary.ts';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter.ts';

type Environment = Readonly<Record<string, string | undefined>>;
type AssetContext = NonNullable<DedicatedCodeRequest['reference']['assets']>[number];
type ContractAssetResponsibility = NonNullable<DedicatedCodeRequest['creativeContract']>['assets'][number];
type AssetSubmissionAttachment = GenerationJobAssetSubmission['attachments'][number];
interface ResolvedAssets {
  route: 'catalog' | 'generate' | 'procedural';
  assets: AssetContext[];
  failure: string | null;
}

export interface GenerationJobRunnerDependencies {
  readJob(id: string, environment: Environment): Promise<GenerationJob | null>;
  updateJob(id: string, input: unknown, environment: Environment): Promise<GenerationJob>;
  mutateJob?(
    id: string,
    mutator: (current: GenerationJob) => unknown | null | Promise<unknown | null>,
    environment: Environment,
  ): Promise<GenerationJob>;
  interpret(brief: CreativeBrief, provider: GenerationJob['provider'], environment: Environment): Promise<BriefInterpretation>;
  interpretLocally?(brief: CreativeBrief): Promise<BriefInterpretation>;
  compileRun(brief: CreativeBrief, interpretation: BriefInterpretation, context: PlanContext): Promise<CreativeRun>;
  providerStatus(environment: Environment): Promise<ProviderStatusResponse>;
  selectProjectAssets(brief: string, limit?: number): ProjectCreativeAsset[];
  generateAssets(input: unknown, environment: Environment): Promise<AssetProductionReport>;
  build(input: unknown, environment: Environment, onProgress?: (progress: DedicatedGenerationProgress) => void | Promise<void>): Promise<DedicatedBuildReceipt>;
  hasRecoveryCandidate?(input: unknown, environment: Environment): Promise<boolean>;
  recover?(input: unknown, environment: Environment, model?: string, onProgress?: (progress: DedicatedGenerationProgress) => void | Promise<void>): Promise<DedicatedBuildReceipt>;
  refine(input: unknown, environment: Environment): Promise<DedicatedRefinementResult>;
}

const defaultDependencies: GenerationJobRunnerDependencies = {
  readJob: readGenerationJob,
  updateJob: updateGenerationJob,
  mutateJob: mutateGenerationJob,
  interpret: interpretWithProvider,
  interpretLocally: (brief) => new BaselineBriefInterpreter().interpret(brief),
  compileRun: (brief, interpretation, context) => generateCreativeRun(brief, {
    id: `server-${interpretation.provenance.selected}`,
    interpret: async () => interpretation,
  }, context),
  providerStatus,
  selectProjectAssets: selectProjectCreativeAssets,
  generateAssets,
  build: generateDedicatedExperience,
  hasRecoveryCandidate: hasSavedDedicatedCandidate,
  recover: recoverSavedDedicatedCandidate,
  refine: refineDedicatedExperience,
};

const activeJobs = new Map<string, Promise<void>>();
const assetSubmissionLocks = new Map<string, Promise<unknown>>();
const MAX_AUTHORING_ATTEMPTS = 1;
const MAX_RECOVERY_ATTEMPTS = 1;
const MAX_REFINEMENT_ATTEMPTS = 1;

function reviewedCompletionAsset(
  cached: CachedUserAssetDescriptor,
  item: AssetSubmissionAttachment,
  requirement: ContractAssetResponsibility,
): AssetContext {
  const review = item.reviewedCodex;
  if (!review) return { ...cached };
  if (!review.subjectMatch || !review.integrationMatch || !review.continuityMatch) {
    throw new Error(`素材 ${item.assetId} 的 Codex 审阅回执没有通过主体、集成与连续性检查。`);
  }
  if (review.summary.trim().length < 8 || review.continuityEvidence.trim().length < 8) {
    throw new Error(`素材 ${item.assetId} 的 Codex 审阅证据过短，不能提升为展示级候选。`);
  }
  const integration = runtimeIntegration(requirement.integration);
  if (!integration) throw new Error(`素材职责 ${requirement.id} 不是可由外部媒体完成的职责。`);
  return {
    ...cached,
    source: 'chatgpt-generated',
    qualityLevel: 'L3-presentable',
    role: `${requirement.role}: ${requirement.visualResponsibility}`.slice(0, 120),
    description: `Codex ${review.model} 已审阅：${review.summary}`.slice(0, 300),
    experience: {
      anchor: requirement.role === 'environment' ? 0.15 : requirement.role === 'information' ? 0.7 : 0.5,
      function: requirement.role === 'environment'
        ? 'establish'
        : requirement.role === 'information'
          ? 'resolve'
          : requirement.role === 'atmosphere'
            ? 'develop'
            : 'persistent',
      visualState: review.summary.trim().slice(0, 180),
      continuity: review.continuityEvidence.trim().slice(0, 180),
      integration,
      ...(review.stateEvidence ? { stateEvidence: review.stateEvidence } : {}),
    },
  };
}

function runtimeIntegration(
  integration: ContractAssetResponsibility['integration'],
): NonNullable<AssetContext['experience']>['integration'] | null {
  return integration === 'native-procedural' ? null : integration;
}

function fitnessIntegration(
  integration: ContractAssetResponsibility['integration'],
): 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | undefined {
  return integration === 'native-procedural' ? undefined : integration;
}

function serializeAssetSubmission<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const previous = assetSubmissionLocks.get(id) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  assetSubmissionLocks.set(id, next);
  return next.finally(() => {
    if (assetSubmissionLocks.get(id) === next) assetSubmissionLocks.delete(id);
  });
}

export function ensureGenerationJobRunning(
  id: string,
  environment: Environment = process.env,
  dependencies: GenerationJobRunnerDependencies = defaultDependencies,
): Promise<void> {
  const current = activeJobs.get(id);
  if (current) return current;
  const task = runGenerationJobPipeline(id, environment, dependencies)
    .catch((error) => console.error(`[generation-job:${id}] ${cleanError(error)}`))
    .finally(() => { if (activeJobs.get(id) === task) activeJobs.delete(id); });
  activeJobs.set(id, task);
  return task;
}

export async function submitGenerationJobAssets(
  id: string,
  value: unknown,
  environment: Environment = process.env,
  dependencies: GenerationJobRunnerDependencies = defaultDependencies,
): Promise<GenerationJob> {
  const submission = generationJobAssetSubmissionSchema.parse(value);
  let shouldStart = false;
  const mutate = async (current: GenerationJob): Promise<unknown | null> => {
    const completion = current.assetCompletion;
    if (completion?.submissionId === submission.submissionId && completion.status !== 'requested') return null;
    if (current.status !== 'blocked' || current.assetGate?.decision !== 'needs-codex-assets' || !current.resumeBuild) {
      throw new Error('当前任务没有等待补充素材，不能执行素材恢复。');
    }
    if (!completion || completion.completionId !== submission.completionId) {
      throw new Error('素材完成合同与当前任务不一致；不会创建新任务或刷新恢复次数。');
    }
    if (completion.status !== 'requested' || completion.attempts !== 0) {
      throw new Error('当前素材完成合同已经处理；不会再次恢复或重复调用模型。');
    }
    const submittedRequirementIds = submission.attachments.map((item) => item.requirementId).sort();
    if (submittedRequirementIds.join('|') !== [...completion.requirementIds].sort().join('|')) {
      throw new Error('本次提交必须一次性覆盖当前素材完成合同中的全部职责。');
    }
    const contract = current.resumeBuild.creativeContract;
    if (!contract) throw new Error('任务缺少 V2 构建合同，不能安全恢复。');

    const attached: AssetContext[] = [];
    for (const item of submission.attachments) {
      const request = current.assetGate.requests.find((entry) => entry.requirementId === item.requirementId);
      const requirement = contract.assets.find((asset) => asset.id === item.requirementId && asset.required);
      if (!request || !requirement) throw new Error(`素材职责 ${item.requirementId} 不属于当前恢复合同。`);
      const cached = await readCachedUserAsset(item.assetId, environment, {
        role: requirement.role,
        integration: fitnessIntegration(requirement.integration),
      });
      const projectAsset = findProjectCreativeAssetById(item.assetId);
      const resolved: AssetContext | null = cached
        ? reviewedCompletionAsset(cached, item, requirement)
        : projectAsset
          ? {
              id: projectAsset.id,
              uri: projectAsset.uri,
              bundlePath: projectAsset.bundlePath,
              kind: projectAsset.kind,
              source: projectAsset.source,
              ...(projectAsset.qualityLevel ? { qualityLevel: projectAsset.qualityLevel } : {}),
              role: projectAsset.role,
              description: projectAsset.description,
              payloadBytes: projectAsset.payloadBytes,
              ...(projectAsset.features ? { features: projectAsset.features } : {}),
              ...(projectAsset.experience ? { experience: { ...projectAsset.experience } } : {})
            }
          : null;
      if (!resolved) throw new Error(`素材 ${item.assetId} 不存在，或没有通过当前职责的像素/结构早检。`);
      attached.push({
        ...resolved,
        role: `${requirement.role}: ${requirement.visualResponsibility}`.slice(0, 120),
        description: `${resolved.description} ${requirement.continuityRule}`.slice(0, 300),
        required: true,
      });
    }

    const existing = current.resumeBuild.reference.assets || [];
    const merged = [...attached, ...existing.filter((asset) => !attached.some((item) => item.uri === asset.uri))]
      .filter((asset, index, assets) => assets.findIndex((item) => item.uri === asset.uri) === index)
      .slice(0, 6);
    const candidateBuild = dedicatedCodeRequestSchema.parse({
      ...current.resumeBuild,
      reference: { ...current.resumeBuild.reference, assets: merged }
    });
    const assetGate = evaluateAssetQualityGate(contract, merged);
    const deliveryQuality = assessDeliveryQuality(current.quality, contract, merged);
    const ready = assetGate.decision === 'ready';
    const acceptedAssets = ready
      ? merged.filter((asset) => assetGate.acceptedAssetIds.includes(asset.id))
      : merged;
    const resumeBuild = dedicatedCodeRequestSchema.parse({
      ...candidateBuild,
      reference: { ...candidateBuild.reference, assets: acceptedAssets }
    });
    const resumedBudget = ready ? freshBudgetWindow(boundedEnvironment(environment)) : null;
    const now = new Date().toISOString();
    shouldStart = ready;
    return {
      stage: ready ? 'assets' : 'blocked',
      message: ready
        ? `已确认 ${attached.length} 个补充素材，素材门禁通过；同一 Job 将从 Codex 编码阶段继续。`
        : `${assetGate.summary} 唯一素材恢复次数已用完，任务停止且不会自动循环。`,
      assetRoute: ready ? 'catalog' : 'blocked',
      assetCount: acceptedAssets.length,
      assetGate,
      assetCompletion: {
        ...completion,
        status: ready ? 'resumed' : 'exhausted',
        submissionId: submission.submissionId,
        attempts: 1,
        resumedAt: ready ? now : null,
      },
      deliveryQuality,
      resumeBuild,
      ...(resumedBudget ? { budgetStartedAt: resumedBudget.startedAt, deadlineAt: resumedBudget.deadlineAt } : {}),
      error: ready ? null : assetGate.summary,
    };
  };

  const next = dependencies.mutateJob
    ? await dependencies.mutateJob(id, mutate, environment)
    : await serializeAssetSubmission(id, async () => {
        const current = await dependencies.readJob(id, environment);
        if (!current) throw new Error('生成任务不存在。');
        const patch = await mutate(current);
        return patch === null ? current : dependencies.updateJob(id, patch, environment);
      });
  if (shouldStart) void ensureGenerationJobRunning(id, environment, dependencies);
  return next;
}

export async function recoverGenerationJobCandidate(
  id: string,
  environment: Environment = process.env,
  dependencies: GenerationJobRunnerDependencies = defaultDependencies,
): Promise<GenerationJob> {
  const current = await dependencies.readJob(id, environment);
  if (!current) throw new Error('生成任务不存在。');
  if (current.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    throw new Error('当前任务已经执行过一次候选恢复，不会再次处理。');
  }
  if (current.status === 'failed' && current.retryableStage === 'planning' && current.v2ContractSummary) {
    return recoverPlanningCheckpoint(current, environment, dependencies);
  }
  if (current.status !== 'failed' || current.retryableStage !== 'authoring' || !current.resumeBuild) {
    throw new Error('当前任务没有可本地恢复的 authoring 候选。');
  }
  const runtime = boundedEnvironment(environment);
  const recoveryAvailable = dependencies.hasRecoveryCandidate
    ? await dependencies.hasRecoveryCandidate(current.resumeBuild, runtime)
    : Boolean(dependencies.recover);
  if (!recoveryAvailable) {
    return dependencies.updateJob(id, {
      stage: 'failed',
      message: '模型在候选落盘前停止；没有可恢复检查点，任务已结束。',
      error: current.error || '没有已保存的 raw-bundle.json 候选检查点。',
      retryableStage: null,
    }, runtime);
  }
  const model = current.model || dedicatedAuthoringModel(runtime, current.quality);
  const budget = freshBudgetWindow(runtime);
  const recovering = await dependencies.updateJob(id, {
    stage: 'authoring',
    model,
    recoveryAttempts: current.recoveryAttempts + 1,
    budgetStartedAt: budget.startedAt,
    deadlineAt: budget.deadlineAt,
    message: '正在重放已保存候选并执行本地确定性修复；不会重新调用模型。',
  }, runtime);
  const recoveryEnvironment = environmentWithinBudget(recovering, runtime);
  const started = Date.now();
  try {
    const recover = dependencies.recover || recoverSavedDedicatedCandidate;
    const receipt = await recover(current.resumeBuild, recoveryEnvironment, model, async (progress) => {
      await dependencies.updateJob(id, {
        stage: 'authoring',
        model,
        message: generationProgressMessage(model, progress, Date.now() - started).slice(0, 500),
      }, runtime);
    });
    const reviewing = await dependencies.updateJob(id, {
      stage: 'reviewing',
      message: '已保存候选通过本地恢复和编译，正在进入既有浏览器验收。',
      sourceRunId: receipt.id,
      sourceReceipt: receipt,
    }, runtime);
    await finishVisualReview({ ...recovering, ...reviewing }, receipt, runtime, dependencies);
  } catch (error) {
    const message = cleanError(error);
    await dependencies.updateJob(id, {
      stage: 'failed',
      message: '已保存候选的有限本地恢复已停止；不会重新调用模型。',
      error: message,
      retryableStage: null,
    }, runtime).catch(() => undefined);
  }
  const result = await dependencies.readJob(id, environment);
  if (!result) throw new Error('恢复后的生成任务记录丢失。');
  return result;
}

async function recoverPlanningCheckpoint(
  current: GenerationJob,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<GenerationJob> {
  const runtime = boundedEnvironment(environment);
  const creativeContract = createV2CreativeContract(current.brief);
  if (creativeContract.id !== current.v2ContractSummary?.contractId) {
    return dependencies.updateJob(current.id, {
      stage: 'failed',
      recoveryAttempts: current.recoveryAttempts + 1,
      message: '规划检查点与当前确定性 V2 合同不一致；任务已终止，不会远程重新规划。',
      error: `规划合同漂移：检查点 ${current.v2ContractSummary?.contractId || 'missing'}，当前 ${creativeContract.id}。`,
      retryableStage: null,
    }, runtime);
  }

  const budget = freshBudgetWindow(runtime);
  const recovering = await dependencies.updateJob(current.id, {
    stage: 'planning',
    recoveryAttempts: current.recoveryAttempts + 1,
    budgetStartedAt: budget.startedAt,
    deadlineAt: budget.deadlineAt,
    message: '正在使用已保存的 V2 合同执行唯一一次本地规划恢复；不会再调用远程规划模型。',
  }, runtime);
  try {
    const brief: CreativeBrief = { text: recovering.brief, seed: recovering.seed };
    const interpretLocally = dependencies.interpretLocally
      || ((input: CreativeBrief) => new BaselineBriefInterpreter().interpret(input));
    const interpretation = await interpretLocally(brief);
    assertTotalBudget(recovering, runtime);
    await continueAfterPlanning(recovering, creativeContract, interpretation, runtime, dependencies);
  } catch (error) {
    await dependencies.updateJob(current.id, {
      stage: 'failed',
      message: '唯一一次本地规划恢复已停止；任务终止且不会转回远程规划。',
      error: cleanError(error),
      retryableStage: null,
    }, runtime).catch(() => undefined);
  }
  const result = await dependencies.readJob(current.id, environment);
  if (!result) throw new Error('恢复后的生成任务记录丢失。');
  return result;
}

export async function runGenerationJobPipeline(
  id: string,
  environment: Environment = process.env,
  dependencies: GenerationJobRunnerDependencies = defaultDependencies,
): Promise<void> {
  const initial = await dependencies.readJob(id, environment);
  if (!initial || initial.status === 'complete' || initial.status === 'blocked' || initial.status === 'failed') return;
  const runtime = boundedEnvironment(environment);
  let stage: GenerationJobStage = initial.stage;
  try {
    if (initial.stage === 'assets' && initial.resumeBuild && initial.assetGate?.decision === 'ready') {
      stage = 'authoring';
      await authorAndReview(initial, initial.resumeBuild, runtime, dependencies);
      return;
    }
    assertTotalBudget(initial, runtime);
    if (initial.stage === 'authoring' && initial.resumeBuild) {
      await recoverInterruptedAuthoring(initial, runtime, dependencies);
      return;
    }
    if (initial.stage === 'refining' && initial.sourceReceipt) {
      await stopInterruptedVisualReview(initial, initial.sourceReceipt, runtime, dependencies);
      return;
    }
    if (initial.stage === 'reviewing' && initial.sourceReceipt) {
      await finishVisualReview(initial, initial.sourceReceipt, runtime, dependencies);
      return;
    }

    stage = 'planning';
    const contractStarted = Date.now();
    const creativeContract = createV2CreativeContract(initial.brief);
    if (initial.expectedContractId && initial.expectedContractId !== creativeContract.id) {
      throw new Error(`V2 合同漂移：任务锁定 ${initial.expectedContractId}，当前规划得到 ${creativeContract.id}。已在作者调用前停止。`);
    }
    const v2ContractSummary = summarizeV2CreativeContract(creativeContract, Date.now() - contractStarted);
    const useRemoteCreativePlanning = environment.SIGNAL_REMOTE_CREATIVE_PLANNING === '1'
      || !dependencies.interpretLocally;
    await dependencies.updateJob(id, {
      stage,
      message: useRemoteCreativePlanning
        ? `V2 约束已在 ${v2ContractSummary.preparedMs}ms 内确定：${v2ContractSummary.pattern} / ${v2ContractSummary.rendererRoute} / ${v2ContractSummary.sceneCompositionRoute} / ${v2ContractSummary.stateAssetRoute}；显式开启的远程创意规划正在该边界内形成一个方向，硬上限 90 秒。`
        : `V2 约束已在 ${v2ContractSummary.preparedMs}ms 内确定：${v2ContractSummary.pattern} / ${v2ContractSummary.rendererRoute} / ${v2ContractSummary.sceneCompositionRoute} / ${v2ContractSummary.stateAssetRoute}；正在执行本地确定性规划，不额外调用远程创意解释模型。`,
      v2ContractSummary,
    }, runtime);
    const brief: CreativeBrief = { text: initial.brief, seed: initial.seed };
    const interpretation = useRemoteCreativePlanning
      ? await dependencies.interpret(brief, initial.provider, environmentWithinBudget(initial, runtime))
      : await dependencies.interpretLocally!(brief);
    assertTotalBudget(initial, runtime);
    await continueAfterPlanning(initial, creativeContract, interpretation, runtime, dependencies, (next) => { stage = next; });
  } catch (error) {
    const message = cleanError(error);
    const retry = error instanceof AuthoringFailure && !error.recoveryAvailable
      ? null
      : retryableStage(stage);
    await dependencies.updateJob(id, {
      stage: 'failed',
      message: retry
        ? `服务端任务停在 ${stageLabel(stage)}，可从该阶段恢复。`
        : stage === 'authoring'
          ? '专属代码模型在候选落盘前停止；没有可恢复检查点，任务已结束。'
          : `服务端任务停在 ${stageLabel(stage)}；当前没有安全恢复路径。`,
      error: message,
      retryableStage: retry,
    }, runtime).catch(() => undefined);
    throw error;
  }
}

async function continueAfterPlanning(
  initial: GenerationJob,
  creativeContract: ReturnType<typeof createV2CreativeContract>,
  interpretation: BriefInterpretation,
  runtime: Environment,
  dependencies: GenerationJobRunnerDependencies,
  onStage: (stage: GenerationJobStage) => void = () => undefined,
): Promise<void> {
  const brief: CreativeBrief = { text: initial.brief, seed: initial.seed };
  const run = await dependencies.compileRun(brief, interpretation, {
      quality: initial.quality,
      renderer: 'webgl',
      motion: 'full',
    });
  const selection = selectCreativeCandidate(run.candidates, creativeContract);
  if (!selection) throw new Error('模型没有形成可执行的网页方向。');
  const selected = selection.candidate;
  console.info(`[generation-job] selected ${selected.id}: ${selection.reason}`);

  onStage('assets');
  await dependencies.updateJob(initial.id, {
      stage: 'assets',
      message: `最佳方向已经确定（${selection.reason}），正在选择项目素材；只有明确缺少时才会调用 MiniMax。`,
      model: interpretation.provenance.model,
      selectedProvider: interpretation.provenance.selected,
      runId: run.id,
      selectedId: selected.id,
    }, runtime);
  const boundedEffectSpec = alignEffectSpecAssetsToV2Contract(selected.effectSpec, creativeContract);
    const requiredAssetCount = creativeContract.assets.filter((asset) => asset.required && asset.modality !== 'procedural').length;
    const assetResult = await resolveAssets(
      initial,
      boundedEffectSpec,
      environmentWithinBudget(initial, runtime),
      dependencies,
      Math.max(3, Math.min(requiredAssetCount, 6)),
    );
    assertTotalBudget(initial, runtime);
    const evaluatedAssetGate = evaluateAssetQualityGate(creativeContract, assetResult.assets);
    const assetGate = assetResult.failure && evaluatedAssetGate.decision === 'needs-codex-assets'
      ? {
          ...evaluatedAssetGate,
          summary: `自动素材尝试已停止且不会重试：${assetResult.failure} ${evaluatedAssetGate.summary}`.slice(0, 500),
        }
      : evaluatedAssetGate;
    const acceptedAssets = assetGate.decision === 'ready'
      ? assetResult.assets.filter((asset) => assetGate.acceptedAssetIds.includes(asset.id))
      : assetResult.assets;
    const deliveryQuality = assessDeliveryQuality(initial.quality, creativeContract, acceptedAssets);
    const resumeBuild = dedicatedCodeRequestSchema.parse({
      brief: initial.brief,
      seed: initial.seed,
      quality: initial.quality,
      runId: run.id,
      selectedId: selected.id,
      creativeContract,
      reference: {
        title: selected.manifest.title,
        summary: selected.manifest.summary,
        scenePlugin: selected.direction.scenePlugin,
        productionStatus: selected.productionPlan.status,
        theme: Object.fromEntries(Object.entries(selected.manifest.theme)),
        assets: acceptedAssets,
      },
    });
  const assetJob = await dependencies.updateJob(initial.id, {
      stage: 'assets',
      message: assetGate.decision === 'needs-codex-assets'
        ? assetGate.summary
        : assetResult.failure
          ? `自动素材候选已停止：${assetResult.failure} 当前合同允许无该候选继续构建。`
        : assetResult.route === 'catalog'
        ? `已匹配 ${assetResult.assets.length} 个项目优选素材，跳过 MiniMax。`
        : assetResult.route === 'generate'
          ? `MiniMax 已物化 ${assetResult.assets.length} 个 L2 候选素材；它们不是最终素材，Codex 构建后仍必须通过主体连续性和浏览器视觉门禁。`
          : '当前目标无需外部素材，将使用程序化 Three.js 表达。',
      assetRoute: assetResult.route,
      assetCount: acceptedAssets.length,
      assetGate,
      deliveryQuality,
      resumeBuild,
    }, runtime);
  if (assetGate.decision === 'needs-codex-assets') {
      const assetCompletion = assetGate.requests.length
        ? createAssetCompletion(initial.id, assetGate.requests.map((request) => request.requirementId))
        : null;
      await dependencies.updateJob(initial.id, {
        stage: 'blocked',
        message: `${assetGate.summary} 工作台已生成具体素材请求。`,
        assetRoute: 'blocked',
        assetCount: acceptedAssets.length,
        assetGate,
        assetCompletion,
        deliveryQuality,
        resumeBuild,
        error: assetGate.summary,
      }, runtime);
    return;
  }

  onStage('authoring');
  await authorAndReview(assetJob, resumeBuild, runtime, dependencies);
}

async function authorAndReview(
  job: GenerationJob,
  buildRequest: DedicatedCodeRequest,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<void> {
  const current = await dependencies.readJob(job.id, environment);
  if (!current) throw new Error('生成任务不存在。');
  if (current.authoringAttempts >= MAX_AUTHORING_ATTEMPTS) {
    throw new Error('专属代码模型已经调用过一次，不会再次自动调用。');
  }
  const authorModel = dedicatedAuthoringModel(environment, buildRequest.quality);
  const authoring = await dependencies.updateJob(job.id, {
    stage: 'authoring',
    model: authorModel,
    authoringAttempts: current.authoringAttempts + 1,
    message: buildRequest.reference.assets?.length
      ? `已确认 ${buildRequest.reference.assets.length} 个有来源素材；${authorModel} 只执行一次完整生成，候选落盘后最多进行两轮本地修复。模型硬上限 ${authorTimeoutSeconds(environment)} 秒。`
      : `已确认程序化路线；${authorModel} 只执行一次完整生成，候选落盘后最多进行两轮本地修复。模型硬上限 ${authorTimeoutSeconds(environment)} 秒。`,
  }, environment);
  const authorStarted = Date.now();
  let candidateSaved = false;
  let receipt: DedicatedBuildReceipt;
  try {
    receipt = await dependencies.build(buildRequest, environmentWithinBudget(authoring, environment), async (progress) => {
      if (progress.phase !== 'attempt-start') candidateSaved = true;
      const message = generationProgressMessage(authorModel, progress, Date.now() - authorStarted);
      await dependencies.updateJob(job.id, { stage: 'authoring', model: authorModel, message: message.slice(0, 500) }, environment);
    });
  } catch (error) {
    throw new AuthoringFailure(cleanError(error), candidateSaved);
  }
  const reviewing = await dependencies.updateJob(job.id, {
    stage: 'reviewing',
    message: '专属网页已编译，正在按产品语义状态、手机与必要回退路径进行自适应验收。',
    sourceRunId: receipt.id,
    sourceReceipt: receipt,
  }, environment);
  await finishVisualReview({ ...authoring, ...reviewing }, receipt, environment, dependencies);
}

async function recoverInterruptedAuthoring(
  job: GenerationJob,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<void> {
  if (!job.resumeBuild) throw new Error('中断任务缺少构建检查点。');
  if (job.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    await dependencies.updateJob(job.id, {
      stage: 'failed',
      message: '专属构建已经中断且候选恢复次数已用尽；任务已停止，不会重新调用模型。',
      error: '候选恢复次数已达到 1 次上限。',
      retryableStage: null,
    }, environment);
    return;
  }
  const recoveryAvailable = dependencies.hasRecoveryCandidate
    ? await dependencies.hasRecoveryCandidate(job.resumeBuild, environment)
    : Boolean(dependencies.recover);
  if (!recoveryAvailable) {
    await dependencies.updateJob(job.id, {
      stage: 'failed',
      message: '中断发生在候选落盘前；没有可恢复检查点，任务已停止。',
      error: '没有已保存的 raw-bundle.json 候选检查点。',
      retryableStage: null,
    }, environment);
    return;
  }
  const model = job.model || dedicatedAuthoringModel(environment, job.quality);
  const recovering = await dependencies.updateJob(job.id, {
    stage: 'authoring',
    model,
    recoveryAttempts: job.recoveryAttempts + 1,
    message: '检测到服务在专属构建阶段中断；只恢复已保存候选，不会重新理解目标或调用模型。',
  }, environment);
  try {
    const recover = dependencies.recover || recoverSavedDedicatedCandidate;
    const receipt = await recover(job.resumeBuild, environmentWithinBudget(recovering, environment), model, async (progress) => {
      await dependencies.updateJob(job.id, {
        stage: 'authoring',
        model,
        message: generationProgressMessage(model, progress, 0).slice(0, 500),
      }, environment);
    });
    const reviewing = await dependencies.updateJob(job.id, {
      stage: 'reviewing',
      message: '中断前保存的候选已恢复并编译，正在进入一次浏览器验收。',
      sourceRunId: receipt.id,
      sourceReceipt: receipt,
    }, environment);
    await finishVisualReview({ ...recovering, ...reviewing }, receipt, environment, dependencies);
  } catch (error) {
    const message = cleanError(error);
    await dependencies.updateJob(job.id, {
      stage: 'failed',
      message: '中断任务没有可恢复候选；任务已停止，不会重新调用模型。',
      error: message,
      retryableStage: null,
    }, environment);
  }
}

function authorTimeoutSeconds(environment: Environment): number {
  const value = Number(environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS || 300_000);
  return Math.round((Number.isFinite(value) ? Math.min(Math.max(value, 5_000), 600_000) : 300_000) / 1000);
}

function generationProgressMessage(model: string, progress: DedicatedGenerationProgress, _elapsedMs: number): string {
  return progress.phase === 'attempt-start'
    ? `${model} 已开始唯一一次专属代码生成；模型硬上限 ${Math.round(progress.timeoutMs / 1000)} 秒。`
    : progress.phase === 'candidate-saved'
      ? `模型候选已保存到 ${progress.artifactPath || '.artifacts'}；正在执行本地 Schema、安全与 TypeScript 门禁。`
      : progress.phase === 'local-repair'
        ? `本地确定性修复 ${progress.localRepair}/${progress.maxLocalRepairs}：${progress.actions?.join('；') || '已应用白名单修复'}。不会重新调用模型。`
        : `候选在 ${progress.localRepair || 0} 轮本地修复后已通过编译，继续浏览器验收。`;
}

async function finishVisualReview(
  job: GenerationJob,
  receipt: DedicatedBuildReceipt,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<void> {
  const current = await dependencies.readJob(job.id, environment);
  if (!current) throw new Error('生成任务不存在。');
  if (current.refinementAttempts >= MAX_REFINEMENT_ATTEMPTS) {
    await stopInterruptedVisualReview(current, receipt, environment, dependencies);
    return;
  }
  try {
    const refinementModel = dedicatedVisualRefinementModel(environment);
    const refining = await dependencies.updateJob(job.id, {
      stage: 'refining',
      refinementAttempts: current.refinementAttempts + 1,
      message: `正在执行快速结构预检；只有证据证明值得时，${refinementModel} 才会执行最多一次视觉精修。`,
    }, environment);
    const result = await dependencies.refine({ id: receipt.id }, environmentWithinBudget(refining, environment, true));
    const deliveryQuality = assessDeliveryQuality(
      job.quality,
      job.resumeBuild?.creativeContract,
      job.resumeBuild?.reference.assets || [],
      result.visualAcceptance,
      {
        mechanical: result.finalAssessment,
        plan: createVisualReviewPlan(job.resumeBuild?.creativeContract)
      },
    );
    if (!deliveryQuality.finalEligible) {
      await dependencies.updateJob(job.id, {
        stage: 'review-required',
        message: `网页已生成且可运行，但没有达到最终交付素材质量：${deliveryQuality.summary}`.slice(0, 500),
        sourceRunId: result.parentId,
        bestRunId: result.receipt.id,
        bestPreviewUrl: result.receipt.previewUrl,
        bestReceipt: result.receipt,
        model: result.receipt.model,
        decision: result.status,
        sourceScore: result.sourceAssessment.score,
        finalScore: result.visualAcceptance.score,
        deliveryQuality,
        error: deliveryQuality.summary,
        retryableStage: 'reviewing',
      }, environment);
      return;
    }
    await dependencies.updateJob(job.id, {
      stage: 'complete',
      message: result.status === 'refined'
        ? '视觉精修完成，新版本已成为最终最佳网页。'
        : result.status === 'kept'
          ? '浏览器验收完成，原版本就是当前最佳网页。'
          : '修订候选未通过，已自动回退并保留更好的原版本。',
      sourceRunId: result.parentId,
      bestRunId: result.receipt.id,
      bestPreviewUrl: result.receipt.previewUrl,
      bestReceipt: result.receipt,
      model: result.receipt.model,
      decision: result.status,
      sourceScore: result.sourceAssessment.score,
      finalScore: result.visualAcceptance.score,
      deliveryQuality,
    }, environment);
  } catch (error) {
    const message = cleanError(error);
    const fallbackAssetWarning = job.assetRoute === 'generate'
      ? 'MiniMax 素材已经进入可运行网页；自动视觉验收未完成，当前版本保留为待定稿结果'
      : '专属网页已经生成并可运行；自动视觉验收未完成，当前版本保留为待定稿结果';
    await dependencies.updateJob(job.id, {
      stage: 'review-required',
      message: `${fallbackAssetWarning}：${message}`.slice(0, 500),
      sourceRunId: receipt.id,
      bestRunId: receipt.id,
      bestPreviewUrl: receipt.previewUrl,
      bestReceipt: receipt,
      model: receipt.model,
      decision: null,
      sourceScore: null,
      finalScore: null,
      deliveryQuality: assessDeliveryQuality(
        job.quality,
        job.resumeBuild?.creativeContract,
        job.resumeBuild?.reference.assets || [],
      ),
      error: message,
      retryableStage: 'reviewing',
    }, environment);
  }
}

async function stopInterruptedVisualReview(
  job: GenerationJob,
  receipt: DedicatedBuildReceipt,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<void> {
  await dependencies.updateJob(job.id, {
    stage: 'review-required',
    message: '网页已经生成；视觉验收曾被中断且一次自动精修额度已用尽，已保留可运行候选并停止自动处理。',
    sourceRunId: receipt.id,
    bestRunId: receipt.id,
    bestPreviewUrl: receipt.previewUrl,
    bestReceipt: receipt,
    model: receipt.model,
    decision: null,
    sourceScore: null,
    finalScore: null,
    deliveryQuality: job.deliveryQuality,
    error: '自动视觉验收中断；未再次调用模型。',
    retryableStage: null,
  }, environment);
}

async function resolveAssets(
  job: GenerationJob,
  effectSpec: CreativeRun['candidates'][number]['effectSpec'],
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
  catalogLimit = 3,
): Promise<ResolvedAssets> {
  const catalog = dependencies.selectProjectAssets(job.brief, catalogLimit);
  const status = await dependencies.providerStatus(environment);
  const minimax = status.providers.find((provider) => provider.id === 'minimax');
  const imageGeneratorAvailable = Boolean(minimax?.available && minimax.capabilities.includes('image-generation'));
  const plan = planAssetResolution(effectSpec, catalog.map((asset) => asset.kind), imageGeneratorAvailable, job.brief, catalog.length);
  // The deterministic V2 quality gate owns the final decision for contract
  // assets. A missing image-sequence/model must become a concrete Codex/user
  // asset request with a resumable build checkpoint, not an early opaque stop.
  if (plan.route === 'blocked') return { route: 'catalog', assets: [], failure: plan.message };
  if (plan.route === 'procedural') return { route: plan.route, assets: [], failure: null };
  if (plan.route === 'catalog') return { route: plan.route, assets: catalog.map(toCatalogContext), failure: null };

  let report: AssetProductionReport;
  try {
    report = await dependencies.generateAssets({
      schemaVersion: 1,
      provider: 'minimax',
      brief: job.brief,
      effectSpec,
      seed: job.seed,
    }, environment);
  } catch (error) {
    return { route: 'generate', assets: [], failure: cleanError(error) };
  }
  if (!report.assets.length || report.status === 'blocked') {
    return { route: 'generate', assets: [], failure: report.messages.join(' ').slice(0, 300) };
  }
  return { route: 'generate', failure: null, assets: report.assets.slice(0, 2).map((asset) => {
    const requirement = effectSpec.assetRequirements.find((item) => item.id === asset.requirementId);
    const id = asset.uri.split('/').filter(Boolean).at(-1) || asset.requirementId;
    return {
      id,
      uri: asset.uri,
      bundlePath: `assets/${id}.png`,
      kind: asset.modality === 'sprite' || asset.modality === 'avatar' ? 'image' : asset.modality,
      source: 'model-generated',
      qualityLevel: 'L2-inspectable',
      role: requirement?.role || 'generated visual asset',
      description: requirement?.purpose || 'Generated visual asset for the selected experience direction.',
      payloadBytes: asset.payloadBytes,
      ...(asset.features ? { features: asset.features } : {}),
      required: requirement?.required || false,
      ...(requirement?.experience ? { experience: requirement.experience } : {}),
    } as AssetContext;
  }) };
}

function toCatalogContext(asset: ProjectCreativeAsset): AssetContext {
  return {
    id: asset.id,
    uri: asset.uri,
    bundlePath: asset.bundlePath,
    kind: asset.kind,
    source: asset.source,
    ...(asset.qualityLevel ? { qualityLevel: asset.qualityLevel } : {}),
    role: asset.role,
    description: asset.description,
    payloadBytes: asset.payloadBytes,
    ...(asset.features ? { features: asset.features } : {}),
    ...(asset.required !== undefined ? { required: asset.required } : {}),
    ...(asset.experience ? { experience: asset.experience } : {}),
  };
}

export function boundedEnvironment(environment: Environment): Environment {
  const explicitAuthoringModel = environment.CODEX_AUTHORING_MODEL || environment.CODEX_BUNDLE_MODEL;
  return {
    ...environment,
    CODEX_BALANCED_AUTHORING_MODEL: environment.CODEX_BALANCED_AUTHORING_MODEL || 'gpt-5.6-terra',
    // R81 proved that Terra can land a runnable first candidate inside the
    // bounded window. Keep Sol for the evidence-driven refinement pass so a
    // slow first call cannot leave the user with no page at all.
    CODEX_HIGH_QUALITY_AUTHORING_MODEL: environment.CODEX_HIGH_QUALITY_AUTHORING_MODEL || 'gpt-5.6-terra',
    ...(explicitAuthoringModel ? {
      CODEX_AUTHORING_MODEL: explicitAuthoringModel,
      CODEX_BUNDLE_MODEL: environment.CODEX_BUNDLE_MODEL || explicitAuthoringModel,
    } : {}),
    CODEX_AUTHORING_REASONING_EFFORT: environment.CODEX_AUTHORING_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT || 'medium',
    CODEX_VISUAL_REFINEMENT_MODEL: environment.CODEX_VISUAL_REFINEMENT_MODEL || 'gpt-5.6-sol',
    CODEX_VISUAL_REFINEMENT_REASONING_EFFORT: environment.CODEX_VISUAL_REFINEMENT_REASONING_EFFORT || 'medium',
    CODEX_VISUAL_ACCEPTANCE_MODEL: environment.CODEX_VISUAL_ACCEPTANCE_MODEL || 'gpt-5.6-luna',
    CODEX_VISUAL_ACCEPTANCE_REASONING_EFFORT: environment.CODEX_VISUAL_ACCEPTANCE_REASONING_EFFORT || 'low',
    CREATIVE_MODEL_TIMEOUT_MS: boundedTimeout(environment.CREATIVE_MODEL_TIMEOUT_MS, 90_000, 90_000),
    MINIMAX_IMAGE_TIMEOUT_MS: boundedTimeout(environment.MINIMAX_IMAGE_TIMEOUT_MS, 120_000, 120_000),
    DEDICATED_CODE_TIMEOUT_MS: boundedTimeout(environment.DEDICATED_CODE_TIMEOUT_MS, 90_000, 90_000),
    VISUAL_REFINEMENT_TIMEOUT_MS: boundedTimeout(environment.VISUAL_REFINEMENT_TIMEOUT_MS, 45_000, 45_000),
    VISUAL_ACCEPTANCE_TIMEOUT_MS: boundedTimeout(environment.VISUAL_ACCEPTANCE_TIMEOUT_MS, 30_000, 30_000),
    GENERATION_JOB_TOTAL_TIMEOUT_MS: boundedTimeout(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS, 180_000, 180_000),
  };
}

function boundedTimeout(value: string | undefined, fallback: number, maximum: number): string {
  return String(Math.min(numberFrom(value, fallback), maximum));
}

function assertTotalBudget(job: GenerationJob, environment: Environment): void {
  const remaining = remainingBudgetMs(job, environment);
  if (remaining <= 0) throw new Error(`生成任务超过 ${Math.round(numberFrom(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS, 180_000) / 60_000)} 分钟总预算。`);
}

function environmentWithinBudget(job: GenerationJob, environment: Environment, splitVisualBudget = false): Environment {
  const remaining = remainingBudgetMs(job, environment);
  if (remaining < 5_000) throw new Error('生成任务剩余时间不足 5 秒，已停止后续处理。');
  const stageBudget = Math.max(5_000, remaining);
  const visualBudget = splitVisualBudget ? Math.max(5_000, Math.floor(remaining / 2)) : stageBudget;
  const deadlineAt = job.deadlineAt || new Date(Date.now() + remaining).toISOString();
  return {
    ...environment,
    GENERATION_JOB_DEADLINE_AT: deadlineAt,
    CREATIVE_MODEL_TIMEOUT_MS: clampExistingTimeout(environment.CREATIVE_MODEL_TIMEOUT_MS, stageBudget),
    MINIMAX_IMAGE_TIMEOUT_MS: clampExistingTimeout(environment.MINIMAX_IMAGE_TIMEOUT_MS, stageBudget),
    DEDICATED_CODE_TIMEOUT_MS: clampExistingTimeout(environment.DEDICATED_CODE_TIMEOUT_MS, stageBudget),
    VISUAL_REFINEMENT_TIMEOUT_MS: clampExistingTimeout(environment.VISUAL_REFINEMENT_TIMEOUT_MS, visualBudget),
    VISUAL_ACCEPTANCE_TIMEOUT_MS: clampExistingTimeout(environment.VISUAL_ACCEPTANCE_TIMEOUT_MS, visualBudget),
  };
}

function remainingBudgetMs(job: GenerationJob, environment: Environment): number {
  const deadline = job.deadlineAt ? Date.parse(job.deadlineAt) : Number.NaN;
  if (Number.isFinite(deadline)) return deadline - Date.now();
  const started = Date.parse(job.budgetStartedAt || job.updatedAt || job.createdAt);
  return numberFrom(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS, 180_000) - (Date.now() - started);
}

function clampExistingTimeout(value: string | undefined, maximum: number): string {
  const parsed = Number(value);
  return String(Math.min(Number.isFinite(parsed) && parsed >= 5_000 ? parsed : maximum, maximum));
}

function freshBudgetWindow(environment: Environment): { startedAt: string; deadlineAt: string } {
  const now = Date.now();
  const budget = numberFrom(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS, 180_000);
  return { startedAt: new Date(now).toISOString(), deadlineAt: new Date(now + budget).toISOString() };
}

function retryableStage(stage: GenerationJobStage): 'planning' | 'authoring' | 'reviewing' {
  if (stage === 'reviewing' || stage === 'refining') return 'reviewing';
  if (stage === 'authoring' || stage === 'compiling') return 'authoring';
  return 'planning';
}

function stageLabel(stage: GenerationJobStage): string {
  if (stage === 'planning') return '目标规划';
  if (stage === 'assets') return '素材准备';
  if (stage === 'authoring' || stage === 'compiling') return '专属构建';
  return '浏览器验收';
}

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5_000 ? Math.min(parsed, 1_800_000) : fallback;
}

function cleanError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 1200);
}


class AuthoringFailure extends Error {
  constructor(message: string, readonly recoveryAvailable: boolean) {
    super(message);
    this.name = 'AuthoringFailure';
  }
}
