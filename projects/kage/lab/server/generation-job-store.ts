import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';

type Environment = Readonly<Record<string, string | undefined>>;

const safeId = z.string().regex(/^job-[a-f0-9]{16}$/);
export const generationJobStageSchema = z.enum([
  'planning', 'assets', 'authoring', 'compiling', 'reviewing', 'refining', 'complete', 'blocked', 'failed'
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

export const generationJobSchema = z.object({
  schemaVersion: z.literal(1),
  id: safeId,
  fingerprint: z.string().regex(/^[a-f0-9]{24}$/),
  brief: z.string().trim().min(8).max(600),
  provider: z.enum(['auto', 'codex', 'mimo', 'minimax', 'openai']),
  executionOwner: z.enum(['client', 'server']).default('client'),
  selectedProvider: z.enum(['codex', 'mimo', 'minimax', 'openai', 'local']).nullable().default(null),
  quality: z.enum(['high', 'balanced', 'low']),
  seed: z.number().int().min(0).max(1_000_000),
  status: z.enum(['running', 'complete', 'blocked', 'failed']),
  stage: generationJobStageSchema,
  message: z.string().max(500),
  model: z.string().max(100).nullable(),
  runId: z.string().max(160).nullable(),
  selectedId: z.string().max(180).nullable(),
  assetRoute: z.enum(['catalog', 'generate', 'procedural', 'blocked']).nullable().default(null),
  assetCount: z.number().int().nonnegative().default(0),
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
  createdAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().nullable(),
  history: z.array(historyEntrySchema).max(40)
}).strict();

export type GenerationJob = z.infer<typeof generationJobSchema>;

export const createGenerationJobRequestSchema = z.object({
  brief: z.string().trim().min(8).max(600),
  provider: z.enum(['auto', 'codex', 'mimo', 'minimax', 'openai']),
  quality: z.enum(['high', 'balanced', 'low']),
  seed: z.number().int().min(0).max(1_000_000)
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
  sourceRunId: z.string().max(180).nullable().optional(),
  bestRunId: z.string().max(180).nullable().optional(),
  bestPreviewUrl: z.string().max(300).nullable().optional(),
  sourceReceipt: receiptSchema.nullable().optional(),
  bestReceipt: receiptSchema.nullable().optional(),
  decision: z.enum(['kept', 'refined', 'rejected']).nullable().optional(),
  sourceScore: z.number().min(0).max(100).nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
  error: z.string().max(1200).nullable().optional(),
  retryableStage: generationJobStageSchema.nullable().optional()
}).strict();

export type GenerationJobUpdate = z.infer<typeof updateGenerationJobRequestSchema>;

const writes = new Map<string, Promise<unknown>>();

export async function createGenerationJob(input: unknown, environment: Environment = process.env): Promise<GenerationJob> {
  const request = createGenerationJobRequestSchema.parse(input);
  const now = new Date().toISOString();
  const job = generationJobSchema.parse({
    schemaVersion: 1,
    id: `job-${randomBytes(8).toString('hex')}`,
    fingerprint: createHash('sha256').update(JSON.stringify(request)).digest('hex').slice(0, 24),
    ...request,
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
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    history: [{ stage: 'planning', at: now, message: '任务已建立，正在理解目标并形成最佳网页方向。' }]
  });
  await writeJob(job, environment);
  return job;
}

export async function readGenerationJob(id: string, environment: Environment = process.env): Promise<GenerationJob | null> {
  const parsed = safeId.safeParse(id);
  if (!parsed.success) return null;
  try {
    return generationJobSchema.parse(JSON.parse(await readFile(jobPath(parsed.data, environment), 'utf8')));
  } catch {
    return null;
  }
}

export async function updateGenerationJob(id: string, input: unknown, environment: Environment = process.env): Promise<GenerationJob> {
  const parsedId = safeId.parse(id);
  const patch = updateGenerationJobRequestSchema.parse(input);
  return serialize(parsedId, async () => {
    const current = await readGenerationJob(parsedId, environment);
    if (!current) throw new Error('生成任务不存在。');
    const now = new Date().toISOString();
    const status = patch.stage === 'complete' ? 'complete' : patch.stage === 'blocked' ? 'blocked' : patch.stage === 'failed' ? 'failed' : 'running';
    const next = generationJobSchema.parse({
      ...current,
      ...patch,
      status,
      updatedAt: now,
      finishedAt: status === 'complete' || status === 'blocked' || status === 'failed' ? now : null,
      error: patch.stage === 'failed' || patch.stage === 'blocked' ? patch.error ?? current.error : null,
      retryableStage: patch.stage === 'failed' ? patch.retryableStage ?? current.retryableStage : patch.stage === 'blocked' ? patch.retryableStage ?? null : null,
      history: [...current.history, { stage: patch.stage, at: now, message: patch.message }].slice(-40)
    });
    await writeJob(next, environment);
    return next;
  });
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
