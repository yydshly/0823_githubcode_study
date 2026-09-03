import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { summarizeV2CreativeContract, v2WorkbenchContractSummarySchema } from '../src/v2/workbench-contract-summary.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { assetQualityGateSchema } from '../src/generation/asset-quality-gate.ts';
import { deliveryQualityAssessmentSchema } from '../src/generation/delivery-quality.ts';
import {
  createIntentProvenance,
  intentProvenanceSchema,
  intentSubmissionSourceSchema
} from '../src/generation/intent-provenance.ts';
import { stateAssetEvidenceSchema } from '../src/v2/state-asset-strategy.ts';
import { dedicatedCodeRequestSchema } from './dedicated-code-service.ts';

type Environment = Readonly<Record<string, string | undefined>>;

const safeId = z.string().regex(/^job-[a-f0-9]{16}$/);
const v2ContractIdSchema = z.string().regex(/^contract-[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const generationJobStageSchema = z.enum([
  'planning', 'assets', 'authoring', 'compiling', 'reviewing', 'refining', 'review-required', 'complete', 'blocked', 'failed'
]);
export type GenerationJobStage = z.infer<typeof generationJobStageSchema>;

const receiptSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  provider: z.literal('codex'),
  model: z.string(),
  status: z.literal('compiled'),
  previewUrl: z.string(),
  generatedAt: z.string(),
  files: z.number().int().nonnegative(),
  assets: z.number().int().nonnegative(),
  sourceBytes: z.number().int().nonnegative(),
  hasShaders: z.boolean(),
  compileMs: z.number().nonnegative(),
  attempts: z.number().int().positive(),
  directory: z.string()
}).strict();

const historyEntrySchema = z.object({
  stage: generationJobStageSchema,
  at: z.string(),
  message: z.string().max(500)
}).strict();

const phaseDurationsSchema = z.object({
  planning: z.number().int().nonnegative(),
  assets: z.number().int().nonnegative(),
  authoring: z.number().int().nonnegative(),
  reviewing: z.number().int().nonnegative(),
}).strict();

type GenerationJobPhase = keyof z.infer<typeof phaseDurationsSchema>;

const assetRequirementIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const assetCompletionSchema = z.object({
  completionId: z.string().regex(/^completion-[a-f0-9]{16}$/),
  requirementIds: z.array(assetRequirementIdSchema).min(1).max(4)
    .refine((ids) => new Set(ids).size === ids.length, '素材完成职责不能重复。'),
  status: z.enum(['requested', 'resumed', 'exhausted']),
  submissionId: z.string().regex(/^submission-[a-f0-9]{16}$/).nullable(),
  attempts: z.number().int().min(0).max(1),
  createdAt: z.string(),
  resumedAt: z.string().nullable()
}).strict().superRefine((completion, context) => {
  if (completion.status === 'requested'
    && (completion.attempts !== 0 || completion.submissionId !== null || completion.resumedAt !== null)) {
    context.addIssue({ code: 'custom', message: '待补素材合同不能提前消耗提交次数或记录恢复时间。' });
  }
  if (completion.status === 'resumed'
    && (completion.attempts !== 1 || completion.submissionId === null || completion.resumedAt === null)) {
    context.addIssue({ code: 'custom', message: '已恢复素材合同必须绑定唯一提交和恢复时间。' });
  }
  if (completion.status === 'exhausted' && (completion.attempts !== 1 || completion.resumedAt !== null)) {
    context.addIssue({ code: 'custom', message: '已耗尽素材合同必须消耗唯一次数且不能记录恢复时间。' });
  }
});

export type AssetCompletion = z.infer<typeof assetCompletionSchema>;

export const generationJobSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  fingerprint: z.string().regex(/^[a-f0-9]{24}$/),
  brief: z.string().trim().min(8).max(600),
  expectedContractId: v2ContractIdSchema.nullable().default(null),
  intentProvenance: intentProvenanceSchema.nullable().default(null),
  provider: z.enum(['auto', 'codex', 'mimo', 'minimax', 'openai']),
  executionOwner: z.enum(['client', 'server']).default('client'),
  selectedProvider: z.enum(['codex', 'mimo', 'minimax', 'openai', 'local']).nullable().default(null),
  quality: z.enum(['high', 'balanced', 'low']),
  seed: z.number().int().min(0).max(1_000_000),
  status: z.enum(['running', 'review-required', 'complete', 'blocked', 'failed']),
  stage: generationJobStageSchema,
  message: z.string().max(500),
  model: z.string().max(100).nullable(),
  runId: z.string().max(160).nullable(),
  selectedId: z.string().max(180).nullable(),
  assetRoute: z.enum(['catalog', 'generate', 'procedural', 'blocked']).nullable().default(null),
  assetCount: z.number().int().nonnegative().default(0),
  assetGate: assetQualityGateSchema.nullable().default(null),
  assetCompletion: assetCompletionSchema.nullable().default(null),
  deliveryQuality: deliveryQualityAssessmentSchema.nullable().default(null),
  resumeBuild: dedicatedCodeRequestSchema.nullable().default(null),
  v2ContractSummary: v2WorkbenchContractSummarySchema.nullable().default(null),
  sourceRunId: z.string().max(180).nullable(),
  bestRunId: z.string().max(180).nullable(),
  bestPreviewUrl: z.string().max(300).nullable(),
  sourceReceipt: receiptSchema.nullable(),
  bestReceipt: receiptSchema.nullable(),
  decision: z.enum(['kept', 'refined', 'rejected']).nullable(),
  sourceScore: z.number().min(0).max(100).nullable(),
  finalScore: z.number().min(0).max(100).nullable(),
  error: z.string().max(1200).nullable(),
  retryableStage: generationJobStageSchema.nullable(),
  authoringAttempts: z.number().int().min(0).max(1).default(0),
  recoveryAttempts: z.number().int().min(0).max(1).default(0),
  refinementAttempts: z.number().int().min(0).max(1).default(0),
  budgetStartedAt: z.string().nullable().default(null),
  deadlineAt: z.string().nullable().default(null),
  phaseDurationsMs: phaseDurationsSchema.nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  history: z.array(historyEntrySchema).max(40)
}).strict();

export type GenerationJob = z.infer<typeof generationJobSchema>;

export const generationJobAssetSubmissionSchema = z.object({
  completionId: z.string().regex(/^completion-[a-f0-9]{16}$/),
  submissionId: z.string().regex(/^submission-[a-f0-9]{16}$/),
  attachments: z.array(z.object({
    assetId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    requirementId: assetRequirementIdSchema,
    reviewedCodex: z.object({
      model: z.string().trim().min(1).max(100),
      summary: z.string().trim().min(1).max(500),
      subjectMatch: z.boolean(),
      integrationMatch: z.boolean(),
      continuityMatch: z.boolean(),
      continuityEvidence: z.string().trim().min(1).max(500),
      stateEvidence: stateAssetEvidenceSchema.optional(),
      qualityLevel: z.literal('L3-presentable')
    }).strict().optional()
  }).strict()).min(1).max(4)
}).strict().superRefine((submission, context) => {
  const requirementIds = submission.attachments.map((attachment) => attachment.requirementId);
  if (new Set(requirementIds).size !== requirementIds.length) {
    context.addIssue({ code: 'custom', path: ['attachments'], message: '同一次提交不能重复素材职责。' });
  }
  const assetIds = submission.attachments.map((attachment) => attachment.assetId);
  if (new Set(assetIds).size !== assetIds.length) {
    context.addIssue({ code: 'custom', path: ['attachments'], message: '同一次提交不能重复素材。' });
  }
});

export type GenerationJobAssetSubmission = z.infer<typeof generationJobAssetSubmissionSchema>;

export const createGenerationJobRequestSchema = z.object({
  brief: z.string().trim().min(8).max(600),
  provider: z.enum(['auto', 'codex', 'mimo', 'minimax', 'openai']),
  quality: z.enum(['high', 'balanced', 'low']),
  seed: z.number().int().min(0).max(1_000_000),
  expectedContractId: v2ContractIdSchema.optional(),
  intentSource: intentSubmissionSourceSchema.default('api-client'),
  experimentConstraints: z.array(z.string().trim().min(2).max(180)).max(6).default([])
}).strict();

export const updateGenerationJobRequestSchema = z.object({
  stage: generationJobStageSchema,
  message: z.string().trim().min(1).max(500),
  model: z.string().max(100).nullable().optional(),
  selectedProvider: z.enum(['codex', 'mimo', 'minimax', 'openai', 'local']).nullable().optional(),
  runId: z.string().max(160).nullable().optional(),
  selectedId: z.string().max(180).nullable().optional(),
  assetRoute: z.enum(['catalog', 'generate', 'procedural', 'blocked']).nullable().optional(),
  assetCount: z.number().int().nonnegative().optional(),
  assetGate: assetQualityGateSchema.nullable().optional(),
  assetCompletion: assetCompletionSchema.nullable().optional(),
  deliveryQuality: deliveryQualityAssessmentSchema.nullable().optional(),
  resumeBuild: dedicatedCodeRequestSchema.nullable().optional(),
  v2ContractSummary: v2WorkbenchContractSummarySchema.nullable().optional(),
  sourceRunId: z.string().max(180).nullable().optional(),
  bestRunId: z.string().max(180).nullable().optional(),
  bestPreviewUrl: z.string().max(300).nullable().optional(),
  sourceReceipt: receiptSchema.nullable().optional(),
  bestReceipt: receiptSchema.nullable().optional(),
  decision: z.enum(['kept', 'refined', 'rejected']).nullable().optional(),
  sourceScore: z.number().min(0).max(100).nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
  error: z.string().max(1200).nullable().optional(),
  retryableStage: generationJobStageSchema.nullable().optional(),
  authoringAttempts: z.number().int().min(0).max(1).optional(),
  recoveryAttempts: z.number().int().min(0).max(1).optional(),
  refinementAttempts: z.number().int().min(0).max(1).optional(),
  budgetStartedAt: z.string().nullable().optional(),
  deadlineAt: z.string().nullable().optional()
}).strict();

export type GenerationJobUpdate = z.infer<typeof updateGenerationJobRequestSchema>;

const writes = new Map<string, Promise<unknown>>();

export async function createGenerationJob(input: unknown, environment: Environment = process.env): Promise<GenerationJob> {
  const request = createGenerationJobRequestSchema.parse(input);
  const now = new Date().toISOString();
  const deadlineAt = new Date(Date.parse(now) + generationJobBudgetMs(environment)).toISOString();
  const intentProvenance = createIntentProvenance(
    request.brief,
    request.intentSource,
    request.experimentConstraints
  );
  const actualContractId = createV2CreativeContract(intentProvenance.rawUserBrief).id;
  if (request.expectedContractId && request.expectedContractId !== actualContractId) {
    throw new Error(`V2 合同不一致：请求 ${request.expectedContractId}，当前想法得到 ${actualContractId}。生成任务未创建。`);
  }
  const job = generationJobSchema.parse({
    schemaVersion: 1,
    id: `job-${randomBytes(8).toString('hex')}`,
    fingerprint: createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 24),
    brief: intentProvenance.rawUserBrief,
    expectedContractId: request.expectedContractId || null,
    intentProvenance,
    provider: request.provider,
    quality: request.quality,
    seed: request.seed,
    executionOwner: 'server',
    status: 'running',
    stage: 'planning',
    message: '任务已建立，正在理解目标并形成最佳网页方向。',
    model: null,
    selectedProvider: null,
    runId: null,
    selectedId: null,
    assetRoute: null,
    assetCount: 0,
    assetGate: null,
    assetCompletion: null,
    deliveryQuality: null,
    resumeBuild: null,
    v2ContractSummary: null,
    sourceRunId: null,
    bestRunId: null,
    bestPreviewUrl: null,
    sourceReceipt: null,
    bestReceipt: null,
    decision: null,
    sourceScore: null,
    finalScore: null,
    error: null,
    retryableStage: null,
    authoringAttempts: 0,
    recoveryAttempts: 0,
    refinementAttempts: 0,
    budgetStartedAt: now,
    deadlineAt,
    phaseDurationsMs: { planning: 0, assets: 0, authoring: 0, reviewing: 0 },
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    history: [{ stage: 'planning', at: now, message: '任务已建立，正在理解目标并形成最佳网页方向。' }]
  });
  await writeJob(job, environment);
  return job;
}

function generationJobBudgetMs(environment: Environment): number {
  const configured = Number(environment.GENERATION_JOB_TOTAL_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 5_000
    ? Math.min(configured, 180_000)
    : 180_000;
}

export async function readGenerationJob(id: string, environment: Environment = process.env): Promise<GenerationJob | null> {
  const parsed = safeId.safeParse(id);
  if (!parsed.success) return null;
  try {
    return parsePersistedJob(JSON.parse(await readFile(jobPath(parsed.data, environment), 'utf8')));
  } catch {
    return null;
  }
}

function parsePersistedJob(value: unknown): GenerationJob {
  const current = generationJobSchema.safeParse(value);
  if (current.success) return current.data;
  if (!isRecord(value) || typeof value.brief !== 'string') return generationJobSchema.parse(value);
  const migrated: Record<string, unknown> = { ...value };
  if (value.assetCompletion === undefined) migrated.assetCompletion = null;
  const contract = createV2CreativeContract(value.brief);
  if (isRecord(value.resumeBuild)) {
    migrated.resumeBuild = { ...value.resumeBuild, creativeContract: contract };
  }
  if (value.v2ContractSummary !== null && value.v2ContractSummary !== undefined) {
    migrated.v2ContractSummary = summarizeV2CreativeContract(contract, 0);
  }
  return generationJobSchema.parse(migrated);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function updateGenerationJob(id: string, input: unknown, environment: Environment = process.env): Promise<GenerationJob> {
  const patch = updateGenerationJobRequestSchema.parse(input);
  return mutateGenerationJob(id, () => patch, environment);
}

export async function mutateGenerationJob(
  id: string,
  mutator: (current: GenerationJob) => unknown | null | Promise<unknown | null>,
  environment: Environment = process.env,
): Promise<GenerationJob> {
  const parsedId = safeId.parse(id);
  return serialize(parsedId, async () => {
    const current = await readGenerationJob(parsedId, environment);
    if (!current) throw new Error('生成任务不存在。');
    const input = await mutator(current);
    if (input === null) return current;
    const patch = updateGenerationJobRequestSchema.parse(input);
    const now = new Date().toISOString();
    const next = applyGenerationJobUpdate(current, patch, now);
    await writeJob(next, environment);
    return next;
  });
}

export function createAssetCompletion(
  jobId: string,
  requirementIds: readonly string[],
  now: string | Date = new Date(),
): AssetCompletion {
  const parsedJobId = safeId.parse(jobId);
  const parsedRequirementIds = z.array(assetRequirementIdSchema).min(1).max(4).parse([...requirementIds]);
  const normalizedRequirementIds = [...new Set(parsedRequirementIds)].sort();
  if (normalizedRequirementIds.length !== parsedRequirementIds.length) throw new Error('素材完成职责不能重复。');
  const createdAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const digest = createHash('sha256')
    .update(JSON.stringify({ jobId: parsedJobId, requirementIds: normalizedRequirementIds }))
    .digest('hex')
    .slice(0, 16);
  return assetCompletionSchema.parse({
    completionId: `completion-${digest}`,
    requirementIds: normalizedRequirementIds,
    status: 'requested',
    submissionId: null,
    attempts: 0,
    createdAt,
    resumedAt: null
  });
}

function applyGenerationJobUpdate(current: GenerationJob, patch: GenerationJobUpdate, now: string): GenerationJob {
  const phaseDurationsMs = accumulatePhaseDuration(current, now);
  const status = patch.stage === 'complete'
    ? 'complete'
    : patch.stage === 'review-required'
      ? 'review-required'
      : patch.stage === 'blocked'
        ? 'blocked'
        : patch.stage === 'failed'
          ? 'failed'
          : 'running';
  return generationJobSchema.parse({
    ...current,
    ...patch,
    status,
    updatedAt: now,
    finishedAt: status !== 'running' ? now : null,
    phaseDurationsMs,
    error: patch.stage === 'failed' || patch.stage === 'blocked' || patch.stage === 'review-required'
      ? (Object.prototype.hasOwnProperty.call(patch, 'error') ? patch.error : current.error)
      : null,
    retryableStage: patch.stage === 'failed' || patch.stage === 'review-required'
      ? (Object.prototype.hasOwnProperty.call(patch, 'retryableStage') ? patch.retryableStage : current.retryableStage)
      : patch.stage === 'blocked'
        ? (Object.prototype.hasOwnProperty.call(patch, 'retryableStage') ? patch.retryableStage : null)
        : null,
    history: [...current.history, { stage: patch.stage, at: now, message: patch.message }].slice(-40)
  });
}

function accumulatePhaseDuration(job: GenerationJob, now: string): NonNullable<GenerationJob['phaseDurationsMs']> {
  const durations = job.phaseDurationsMs || phaseDurationsFromHistory(job);
  if (job.status !== 'running') return durations;
  const phase = phaseForStage(job.stage);
  if (!phase) return durations;
  const previous = Date.parse(job.updatedAt);
  const current = Date.parse(now);
  const elapsed = Number.isFinite(previous) && Number.isFinite(current) ? Math.max(0, current - previous) : 0;
  return { ...durations, [phase]: durations[phase] + elapsed };
}

function phaseDurationsFromHistory(job: GenerationJob): NonNullable<GenerationJob['phaseDurationsMs']> {
  const durations = { planning: 0, assets: 0, authoring: 0, reviewing: 0 };
  const entries = [...job.history].sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  entries.forEach((entry, index) => {
    const phase = phaseForStage(entry.stage);
    if (!phase) return;
    const started = Date.parse(entry.at);
    const ended = Date.parse(entries[index + 1]?.at || job.updatedAt);
    if (Number.isFinite(started) && Number.isFinite(ended)) durations[phase] += Math.max(0, ended - started);
  });
  return durations;
}

function phaseForStage(stage: GenerationJobStage): GenerationJobPhase | null {
  if (stage === 'planning') return 'planning';
  if (stage === 'assets') return 'assets';
  if (stage === 'authoring' || stage === 'compiling') return 'authoring';
  if (stage === 'reviewing' || stage === 'refining') return 'reviewing';
  return null;
}

function jobRoot(environment: Environment): string {
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const root = resolve(environment.SIGNAL_GENERATION_JOBS_DIR || join(projectRoot, 'generated', 'jobs'));
  assertInside(projectRoot, root);
  return root;
}

function jobPath(id: string, environment: Environment): string {
  const root = jobRoot(environment);
  const target = resolve(root, `${id}.json`);
  assertInside(root, target);
  return target;
}

async function writeJob(job: GenerationJob, environment: Environment): Promise<void> {
  const target = jobPath(job.id, environment);
  await mkdir(resolve(target, '..'), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(generationJobSchema.parse(job), null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function serialize<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const previous = writes.get(id) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  writes.set(id, next.finally(() => { if (writes.get(id) === next) writes.delete(id); }));
  return next;
}

function assertInside(root: string, target: string): void {
  const path = relative(root, target);
  if (path === '..' || path.startsWith(`..${sep}`)) throw new Error('生成任务路径越过项目目录。');
}
