import type { PlanContext } from '../src/capabilities/schema.ts';
import { generateAssets } from './asset-generator.ts';
import { generateDedicatedExperience, refineDedicatedExperience, type DedicatedBuildReceipt, type DedicatedCodeRequest, type DedicatedRefinementResult } from './dedicated-code-service.ts';
import { readGenerationJob, updateGenerationJob, type GenerationJob, type GenerationJobStage } from './generation-job-store.ts';
import { interpretWithProvider, providerStatus } from './provider-service.ts';
import { planAssetResolution } from '../src/generation/asset-resolution.ts';
import { selectProjectCreativeAssets, type ProjectCreativeAsset } from '../src/generation/creative-asset-catalog.ts';
import { generateCreativeRun } from '../src/generation/orchestrator.ts';
import type { AssetProductionReport } from '../src/generation/asset-production.ts';
import type { BriefInterpretation, CreativeBrief, CreativeRun, ProviderStatusResponse } from '../src/generation/schema.ts';

type Environment = Readonly<Record<string, string | undefined>>;
type AssetContext = NonNullable<DedicatedCodeRequest['reference']['assets']>[number];

export interface GenerationJobRunnerDependencies {
  readJob(id: string, environment: Environment): Promise<GenerationJob | null>;
  updateJob(id: string, input: unknown, environment: Environment): Promise<GenerationJob>;
  interpret(brief: CreativeBrief, provider: GenerationJob['provider'], environment: Environment): Promise<BriefInterpretation>;
  compileRun(brief: CreativeBrief, interpretation: BriefInterpretation, context: PlanContext): Promise<CreativeRun>;
  providerStatus(environment: Environment): Promise<ProviderStatusResponse>;
  selectProjectAssets(brief: string, limit?: number): ProjectCreativeAsset[];
  generateAssets(input: unknown, environment: Environment): Promise<AssetProductionReport>;
  build(input: unknown, environment: Environment): Promise<DedicatedBuildReceipt>;
  refine(input: unknown, environment: Environment): Promise<DedicatedRefinementResult>;
}

const defaultDependencies: GenerationJobRunnerDependencies = {
  readJob: readGenerationJob,
  updateJob: updateGenerationJob,
  interpret: interpretWithProvider,
  compileRun: (brief, interpretation, context) => generateCreativeRun(brief, {
    id: `server-${interpretation.provenance.selected}`,
    interpret: async () => interpretation,
  }, context),
  providerStatus,
  selectProjectAssets: selectProjectCreativeAssets,
  generateAssets,
  build: generateDedicatedExperience,
  refine: refineDedicatedExperience,
};

const activeJobs = new Map<string, Promise<void>>();

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
    assertTotalBudget(initial, runtime);
    if ((initial.stage === 'reviewing' || initial.stage === 'refining') && initial.sourceReceipt) {
      await finishVisualReview(initial, initial.sourceReceipt, runtime, dependencies);
      return;
    }

    stage = 'planning';
    await dependencies.updateJob(id, {
      stage,
      message: '服务端正在用模型理解目标、页面结构与视觉变化；关闭工作台不会中断任务。',
    }, runtime);
    const brief: CreativeBrief = { text: initial.brief, seed: initial.seed };
    const interpretation = await dependencies.interpret(brief, initial.provider, runtime);
    assertTotalBudget(initial, runtime);
    const run = await dependencies.compileRun(brief, interpretation, {
      quality: initial.quality,
      renderer: 'webgl',
      motion: 'full',
    });
    const selected = run.candidates[0];
    if (!selected) throw new Error('模型没有形成可执行的网页方向。');

    stage = 'assets';
    await dependencies.updateJob(id, {
      stage,
      message: '最佳方向已经确定，正在选择项目素材；只有明确缺少时才会调用 MiniMax。',
      model: interpretation.provenance.model,
      selectedProvider: interpretation.provenance.selected,
      runId: run.id,
      selectedId: selected.id,
    }, runtime);
    const assetResult = await resolveAssets(initial, selected.effectSpec, runtime, dependencies);
    assertTotalBudget(initial, runtime);
    await dependencies.updateJob(id, {
      stage: 'assets',
      message: assetResult.route === 'catalog'
        ? `已匹配 ${assetResult.assets.length} 个项目优选素材，跳过 MiniMax。`
        : assetResult.route === 'generate'
          ? `MiniMax 已物化 ${assetResult.assets.length} 个备用素材，准备交给 Codex 构建。`
          : '当前目标无需外部素材，将使用程序化 Three.js 表达。',
      assetRoute: assetResult.route,
      assetCount: assetResult.assets.length,
    }, runtime);

    stage = 'authoring';
    await dependencies.updateJob(id, {
      stage,
      message: assetResult.assets.length
        ? `已确认 ${assetResult.assets.length} 个有来源素材，Codex 正在构建专属网页。`
        : '已确认当前方向适合程序化表达，Codex 正在构建专属网页。',
    }, runtime);
    const receipt = await dependencies.build({
      brief: initial.brief,
      seed: initial.seed,
      quality: initial.quality,
      runId: run.id,
      selectedId: selected.id,
      reference: {
        title: selected.manifest.title,
        summary: selected.manifest.summary,
        scenePlugin: selected.direction.scenePlugin,
        productionStatus: selected.productionPlan.status,
        theme: Object.fromEntries(Object.entries(selected.manifest.theme)),
        assets: assetResult.assets,
      },
    } satisfies DedicatedCodeRequest, runtime);
    assertTotalBudget(initial, runtime);
    await dependencies.updateJob(id, {
      stage: 'reviewing',
      message: '专属网页已编译，正在检查首屏、中段、末段与手机状态。',
      sourceRunId: receipt.id,
      sourceReceipt: receipt,
    }, runtime);
    await finishVisualReview(initial, receipt, runtime, dependencies);
  } catch (error) {
    if (error instanceof AssetBlockedError) {
      await dependencies.updateJob(id, { stage: 'blocked', message: error.message, error: error.message }, runtime);
      return;
    }
    const message = cleanError(error);
    await dependencies.updateJob(id, {
      stage: 'failed',
      message: `服务端任务停在 ${stageLabel(stage)}，可从该阶段恢复。`,
      error: message,
      retryableStage: retryableStage(stage),
    }, runtime).catch(() => undefined);
    throw error;
  }
}

async function finishVisualReview(
  job: GenerationJob,
  receipt: DedicatedBuildReceipt,
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<void> {
  try {
    await dependencies.updateJob(job.id, {
      stage: 'refining',
      message: '正在依据真实浏览器截图决定保留原版或执行最多一次视觉精修。',
    }, environment);
    const result = await dependencies.refine({ id: receipt.id }, environment);
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
    }, environment);
  } catch (error) {
    const message = cleanError(error);
    await dependencies.updateJob(job.id, {
      stage: 'complete',
      message: `专属网页已经可运行；自动视觉验收未完成，已保留当前版本供查看：${message}`.slice(0, 500),
      sourceRunId: receipt.id,
      bestRunId: receipt.id,
      bestPreviewUrl: receipt.previewUrl,
      bestReceipt: receipt,
      model: receipt.model,
      decision: 'kept',
      sourceScore: null,
      finalScore: null,
    }, environment);
  }
}

async function resolveAssets(
  job: GenerationJob,
  effectSpec: CreativeRun['candidates'][number]['effectSpec'],
  environment: Environment,
  dependencies: GenerationJobRunnerDependencies,
): Promise<{ route: 'catalog' | 'generate' | 'procedural'; assets: AssetContext[] }> {
  const catalog = dependencies.selectProjectAssets(job.brief, 3);
  const status = await dependencies.providerStatus(environment);
  const minimax = status.providers.find((provider) => provider.id === 'minimax');
  const imageGeneratorAvailable = Boolean(minimax?.available && minimax.capabilities.includes('image-generation'));
  const plan = planAssetResolution(effectSpec, catalog.map((asset) => asset.kind), imageGeneratorAvailable, job.brief, catalog.length);
  if (plan.route === 'blocked') throw new AssetBlockedError(plan.message);
  if (plan.route === 'procedural') return { route: plan.route, assets: [] };
  if (plan.route === 'catalog') return { route: plan.route, assets: catalog.map(toCatalogContext) };

  const report = await dependencies.generateAssets({
    schemaVersion: 1,
    provider: 'minimax',
    brief: job.brief,
    effectSpec,
    seed: job.seed,
  }, environment);
  if (!report.assets.length || report.status === 'blocked') throw new AssetBlockedError(report.messages.join(' '));
  return { route: 'generate', assets: report.assets.slice(0, 6).map((asset) => {
    const requirement = effectSpec.assetRequirements.find((item) => item.id === asset.requirementId);
    const id = asset.uri.split('/').filter(Boolean).at(-1) || asset.requirementId;
    return {
      id,
      uri: asset.uri,
      bundlePath: `assets/${id}.png`,
      kind: asset.modality === 'sprite' || asset.modality === 'avatar' ? 'image' : asset.modality,
      source: 'model-generated',
      role: requirement?.role || 'generated visual asset',
      description: requirement?.purpose || 'Generated visual asset for the selected experience direction.',
      payloadBytes: asset.payloadBytes,
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
    role: asset.role,
    description: asset.description,
    payloadBytes: asset.payloadBytes,
    ...(asset.required !== undefined ? { required: asset.required } : {}),
    ...(asset.experience ? { experience: asset.experience } : {}),
  };
}

function boundedEnvironment(environment: Environment): Environment {
  return {
    ...environment,
    CODEX_BUNDLE_MODEL: environment.CODEX_BUNDLE_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol',
    CREATIVE_MODEL_TIMEOUT_MS: environment.CREATIVE_MODEL_TIMEOUT_MS || '90000',
    MINIMAX_IMAGE_TIMEOUT_MS: environment.MINIMAX_IMAGE_TIMEOUT_MS || '120000',
    DEDICATED_CODE_TIMEOUT_MS: environment.DEDICATED_CODE_TIMEOUT_MS || '100000',
    VISUAL_REFINEMENT_TIMEOUT_MS: environment.VISUAL_REFINEMENT_TIMEOUT_MS || '90000',
    VISUAL_ACCEPTANCE_TIMEOUT_MS: environment.VISUAL_ACCEPTANCE_TIMEOUT_MS || '45000',
    GENERATION_JOB_TOTAL_TIMEOUT_MS: environment.GENERATION_JOB_TOTAL_TIMEOUT_MS || '720000',
  };
}

function assertTotalBudget(job: GenerationJob, environment: Environment): void {
  const budget = numberFrom(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS, 720_000);
  const elapsed = Date.now() - Date.parse(job.createdAt);
  if (elapsed > budget) throw new Error(`生成任务超过 ${Math.round(budget / 60_000)} 分钟总预算。`);
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

class AssetBlockedError extends Error {}
