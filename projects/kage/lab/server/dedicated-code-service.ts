import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { assertGeneratedExperienceBundle, generatedBundleSummary, generatedExperienceBundleSchema, type GeneratedExperienceBundle } from '../src/generation/generated-experience-bundle.ts';
import type { VisualReviewAssessment } from '../src/generation/visual-review.ts';
import { isFinalVisualCandidateEligible, visualAcceptanceSchema, type VisualAcceptance } from '../src/generation/visual-acceptance.ts';
import { compileDedicatedSources } from './dedicated-typescript-compiler.ts';
import { captureDedicatedVisualReview, cleanupCapturedVisualReview, type CapturedVisualReview } from './dedicated-visual-review.ts';

type Environment = Readonly<Record<string, string | undefined>>;
interface ProcessResult { code: number; stdout: string; stderr: string; }
interface MaterializedRun { bundle: GeneratedExperienceBundle; receipt: DedicatedBuildReceipt; }

const dedicatedAssetContextSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  uri: z.string().regex(/^\/(?:api\/creative\/assets|creative-assets)\/[a-zA-Z0-9._/-]+$/).refine((value) => !value.includes('..'), '素材 URI 不能包含路径穿越。'),
  bundlePath: z.string().regex(/^assets\/[a-zA-Z0-9_./-]+$/).refine((value) => !value.includes('..'), '素材 bundlePath 不能包含路径穿越。'),
  kind: z.enum(['image', 'texture', 'environment', 'model-3d', 'audio', 'video', 'font']),
  source: z.enum(['chatgpt-generated', 'model-generated', 'user-provided', 'licensed']),
  role: z.string().trim().min(2).max(120),
  description: z.string().trim().min(4).max(300),
  payloadBytes: z.number().int().nonnegative().max(50_000_000),
  required: z.boolean().optional(),
  experience: z.object({
    anchor: z.number().min(0).max(1),
    function: z.enum(['establish', 'develop', 'transform', 'resolve', 'persistent']),
    visualState: z.string().min(8).max(180),
    continuity: z.string().min(8).max(180),
    integration: z.enum(['alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-media'])
  }).strict().optional()
}).strict();

export const dedicatedCodeRequestSchema = z.object({
  brief: z.string().trim().min(8).max(600), seed: z.number().int().min(0).max(1_000_000),
  quality: z.enum(['high', 'balanced', 'low']), runId: z.string().min(4).max(120), selectedId: z.string().min(4).max(160),
  reference: z.object({
    title: z.string().min(1).max(120), summary: z.string().min(1).max(240), scenePlugin: z.string().min(1).max(60),
    productionStatus: z.string().min(1).max(40), theme: z.record(z.string(), z.string()).optional(),
    assets: z.array(dedicatedAssetContextSchema).max(6).optional()
  }).strict()
}).strict();
export type DedicatedCodeRequest = z.infer<typeof dedicatedCodeRequestSchema>;

export const dedicatedRefinementRequestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
}).strict();

export const dedicatedRevisionRequestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  instruction: z.string().trim().min(4).max(500)
}).strict();

const dedicatedRevisionModelResponseSchema = z.object({
  summary: z.string().min(4).max(700),
  changedFiles: z.array(z.object({
    path: z.string().min(1).max(120),
    content: z.string().max(48_000)
  }).strict()).min(1).max(4)
}).strict();

const dedicatedBuildReceiptSchema = z.object({
  id: z.string(), provider: z.literal('codex'), model: z.string(), status: z.literal('compiled'), previewUrl: z.string(), generatedAt: z.string(),
  files: z.number().int(), assets: z.number().int(), sourceBytes: z.number().int(), hasShaders: z.boolean(), compileMs: z.number(), attempts: z.number().int(), directory: z.string()
}).strict();

const storedDedicatedReportSchema = z.object({ receipt: dedicatedBuildReceiptSchema, request: dedicatedCodeRequestSchema }).passthrough();

const visualRefinementModelResponseSchema = z.object({
  decision: z.enum(['keep', 'revise']),
  summary: z.string().min(4).max(700),
  resolved: z.array(z.string().min(2).max(300)).max(12),
  remaining: z.array(z.string().min(2).max(300)).max(12),
  bundle: generatedExperienceBundleSchema.nullable()
}).strict();

type VisualRefinementModelResponse = z.infer<typeof visualRefinementModelResponseSchema>;

export interface DedicatedBuildReceipt {
  id: string; provider: 'codex'; model: string; status: 'compiled'; previewUrl: string; generatedAt: string;
  files: number; assets: number; sourceBytes: number; hasShaders: boolean; compileMs: number; attempts: number; directory: string;
}

export interface DedicatedRefinementResult {
  status: 'kept' | 'refined' | 'rejected';
  parentId: string;
  receipt: DedicatedBuildReceipt;
  sourceAssessment: VisualReviewAssessment;
  finalAssessment: VisualReviewAssessment;
  visualAcceptance: VisualAcceptance;
  summary: string;
  resolved: string[];
  remaining: string[];
}

export interface DedicatedRevisionResult {
  parentId: string;
  receipt: DedicatedBuildReceipt;
  summary: string;
  changedFiles: string[];
}


let codexBinaryPromise: Promise<string | null> | null = null;

export async function generateDedicatedExperience(input: unknown, environment: Environment = process.env): Promise<DedicatedBuildReceipt> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能生成专属网页代码。');
  const model = environment.CODEX_BUNDLE_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-terra';
  let lastFailure = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await runCodexBundle(codexBinary, request, environment, lastFailure);
    try {
      const materialized = await validateAndMaterializeDedicatedBundle(request, canonicalizeBundle(raw, request), environment, model, attempt);
      return materialized.receipt;
    } catch (error) {
      lastFailure = cleanError(error);
      if (attempt === 2) throw new Error(`专属代码两次构建均未通过：${lastFailure}`);
    }
  }
  throw new Error('专属代码没有形成可运行结果。');
}

export async function reviseDedicatedExperience(input: unknown, environment: Environment = process.env): Promise<DedicatedRevisionResult> {
  const revisionRequest = dedicatedRevisionRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能修改当前专属网页。');
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const runDirectory = resolve(runsRoot, revisionRequest.id);
  assertInside(runsRoot, runDirectory, '待修改运行越过生成根目录。');
  const currentBundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(runDirectory, 'bundle.json'), 'utf8')) as unknown);
  const storedReport = storedDedicatedReportSchema.parse(JSON.parse(await readFile(join(runDirectory, 'build-report.json'), 'utf8')) as unknown);
  const sourceRequest = dedicatedCodeRequestSchema.parse(storedReport.request);
  const model = environment.CODEX_REVISION_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
  const revision = await runCodexRevision(codexBinary, sourceRequest, currentBundle, revisionRequest.instruction, environment);
  const revisedBundle = applyDedicatedRevision(currentBundle, revision.changedFiles, sourceRequest);
  const materialized = await validateAndMaterializeDedicatedBundle(sourceRequest, revisedBundle, environment, model, 1);
  const reportPath = join(resolve(projectRoot, materialized.receipt.directory), 'build-report.json');
  const childReport = JSON.parse(await readFile(reportPath, 'utf8')) as Record<string, unknown>;
  await writeFile(reportPath, JSON.stringify({
    ...childReport,
    revision: {
      parentId: revisionRequest.id,
      instruction: revisionRequest.instruction,
      summary: revision.summary,
      changedFiles: revision.changedFiles.map((file) => file.path),
      model
    }
  }, null, 2), 'utf8');
  return {
    parentId: revisionRequest.id,
    receipt: materialized.receipt,
    summary: revision.summary,
    changedFiles: revision.changedFiles.map((file) => file.path)
  };
}


export async function refineDedicatedExperience(input: unknown, environment: Environment = process.env): Promise<DedicatedRefinementResult> {
  const refinementRequest = dedicatedRefinementRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能执行自动视觉精修。');
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const runDirectory = resolve(runsRoot, refinementRequest.id);
  assertInside(runsRoot, runDirectory, '待精修运行越过生成根目录。');
  const currentBundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(runDirectory, 'bundle.json'), 'utf8')) as unknown);
  const storedReport = storedDedicatedReportSchema.parse(JSON.parse(await readFile(join(runDirectory, 'build-report.json'), 'utf8')) as unknown);
  const sourceRequest = dedicatedCodeRequestSchema.parse(storedReport.request);
  const sourceReceipt = dedicatedBuildReceiptSchema.parse(storedReport.receipt);
  const origin = environment.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143';
  const model = environment.CODEX_VISUAL_REFINEMENT_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
  let sourceReview: CapturedVisualReview | null = null;
  let finalReview: CapturedVisualReview | null = null;
  try {
    sourceReview = await captureDedicatedVisualReview(refinementRequest.id, origin, environment);
    await writeVisualReview(runDirectory, sourceReview);
    let lastFailure = '';
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await runCodexVisualRefinement(codexBinary, sourceRequest, currentBundle, sourceReview, environment, lastFailure);
      if (response.decision === 'keep') {
        if (response.bundle) throw new Error('保留决定不应返回修订 bundle。');
        if (sourceReview.assessment.verdict !== 'pass') {
          lastFailure = `当前版本视觉评审为 ${sourceReview.assessment.verdict}（${sourceReview.assessment.score} 分），不能直接 keep。`;
          if (attempt === 2) throw new Error('自动视觉精修两次均未形成通过版本：' + lastFailure);
          continue;
        }
        const visualAcceptance = await runCodexVisualAcceptance(codexBinary, sourceRequest, currentBundle, sourceReview, environment);
        await writeVisualReview(runDirectory, sourceReview, visualAcceptance);
        if (!isFinalVisualCandidateEligible(sourceReview.assessment, visualAcceptance)) {
          lastFailure = visualAcceptanceFailure(visualAcceptance);
          if (attempt === 2) throw new Error('自动视觉精修两次均未形成通过版本：' + lastFailure);
          continue;
        }
        await recordRefinementResult(sourceReceipt.directory, {
          status: 'kept', parentId: refinementRequest.id, selectedId: sourceReceipt.id, model,
          sourceAssessment: sourceReview.assessment, finalAssessment: sourceReview.assessment, visualAcceptance,
          summary: response.summary, resolved: response.resolved, remaining: response.remaining
        }, projectRoot);
        return {
          status: 'kept', parentId: refinementRequest.id, receipt: sourceReceipt,
          sourceAssessment: sourceReview.assessment, finalAssessment: sourceReview.assessment, visualAcceptance,
          summary: response.summary, resolved: response.resolved, remaining: response.remaining
        };
      }
      try {
        if (!response.bundle) throw new Error('修订决定缺少 bundle。');
        const materialized = await validateAndMaterializeDedicatedBundle(sourceRequest, canonicalizeBundle(response.bundle, sourceRequest), environment, model, attempt);
        finalReview = await captureDedicatedVisualReview(materialized.bundle.id, origin, environment);
        const candidateDirectory = resolve(projectRoot, materialized.receipt.directory);
        await writeVisualReview(candidateDirectory, finalReview);
        if (finalReview.assessment.verdict !== 'pass') {
          const failure = `机械复验未通过：${finalReview.assessment.verdict}（${finalReview.assessment.score} 分）— ${finalReview.assessment.summary}`;
          await recordRefinementResult(materialized.receipt.directory, {
            status: 'rejected', parentId: refinementRequest.id, selectedId: sourceReceipt.id, model,
            sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment,
            summary: response.summary, resolved: response.resolved, remaining: [...response.remaining, failure]
          }, projectRoot);
          await cleanupCapturedVisualReview(finalReview);
          finalReview = null;
          throw new Error(failure);
        }
        const visualAcceptance = await runCodexVisualAcceptance(codexBinary, sourceRequest, materialized.bundle, finalReview, environment);
        await writeVisualReview(candidateDirectory, finalReview, visualAcceptance);
        if (!isFinalVisualCandidateEligible(finalReview.assessment, visualAcceptance)) {
          const failure = visualAcceptanceFailure(visualAcceptance);
          await recordRefinementResult(materialized.receipt.directory, {
            status: 'rejected', parentId: refinementRequest.id, selectedId: sourceReceipt.id, model,
            sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
            summary: response.summary, resolved: response.resolved, remaining: [...response.remaining, failure]
          }, projectRoot);
          await cleanupCapturedVisualReview(finalReview);
          finalReview = null;
          throw new Error(failure);
        }
        await recordRefinementResult(materialized.receipt.directory, {
          status: 'refined', parentId: refinementRequest.id, selectedId: materialized.receipt.id, model,
          sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
          summary: response.summary, resolved: response.resolved, remaining: response.remaining
        }, projectRoot);
        await recordRefinementResult(sourceReceipt.directory, {
          status: 'refined', parentId: refinementRequest.id, selectedId: materialized.receipt.id, model,
          sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
          summary: response.summary, resolved: response.resolved, remaining: response.remaining
        }, projectRoot);
        return {
          status: 'refined', parentId: refinementRequest.id, receipt: materialized.receipt,
          sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
          summary: response.summary, resolved: response.resolved, remaining: response.remaining
        };
      } catch (error) {
        lastFailure = cleanError(error);
        if (attempt === 2) throw new Error('自动视觉精修两次构建或复验均未通过：' + lastFailure);
      }
    }
    throw new Error('自动视觉精修没有形成结果。');
  } finally {
    if (finalReview) await cleanupCapturedVisualReview(finalReview);
    if (sourceReview) await cleanupCapturedVisualReview(sourceReview);
  }
}

export async function assessDedicatedVisualAcceptance(input: unknown, environment: Environment = process.env): Promise<{ assessment: VisualReviewAssessment; visualAcceptance: VisualAcceptance }> {
  const request = dedicatedRefinementRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能执行最终视觉验收。');
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const directory = resolve(runsRoot, request.id);
  assertInside(runsRoot, directory, '待验收运行越过生成根目录。');
  const bundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(directory, 'bundle.json'), 'utf8')) as unknown);
  const report = storedDedicatedReportSchema.parse(JSON.parse(await readFile(join(directory, 'build-report.json'), 'utf8')) as unknown);
  const sourceRequest = dedicatedCodeRequestSchema.parse(report.request);
  const origin = environment.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143';
  const review = await captureDedicatedVisualReview(request.id, origin, environment);
  try {
    if (review.assessment.verdict !== 'pass') throw new Error(`机械复验未通过：${review.assessment.verdict}（${review.assessment.score} 分）。`);
    const visualAcceptance = await runCodexVisualAcceptance(codexBinary, sourceRequest, bundle, review, environment);
    await writeVisualReview(directory, review, visualAcceptance);
    return { assessment: review.assessment, visualAcceptance };
  } finally {
    await cleanupCapturedVisualReview(review);
  }
}

async function writeVisualReview(directory: string, review: CapturedVisualReview, visualAcceptance?: VisualAcceptance): Promise<void> {
  await writeFile(join(directory, 'visual-review.json'), JSON.stringify({
    evidence: review.evidence,
    assessment: review.assessment,
    ...(visualAcceptance ? { visualAcceptance } : {})
  }, null, 2), 'utf8');
}

function visualAcceptanceFailure(acceptance: VisualAcceptance): string {
  const detail = acceptance.findings.filter((finding) => finding.severity === 'major').map((finding) => finding.message).join('；');
  return `最终视觉验收未通过：${acceptance.score} 分—${acceptance.summary}${detail ? `；${detail}` : ''}`;
}
async function recordRefinementResult(directory: string, refinement: unknown, projectRoot: string): Promise<void> {
  const target = resolve(projectRoot, directory, 'build-report.json');
  assertInside(projectRoot, target, '精修报告越过项目目录。');
  const report = JSON.parse(await readFile(target, 'utf8')) as Record<string, unknown>;
  await writeFile(target, JSON.stringify({ ...report, refinement }, null, 2), 'utf8');
}

export async function validateAndMaterializeDedicatedBundle(
  input: DedicatedCodeRequest, value: unknown, environment: Environment = process.env, model = 'test-model', attempts = 1
): Promise<MaterializedRun> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const bundle = assertGeneratedExperienceBundle(value);
  const usedAssetCount = assertApprovedAssetUsage(request, bundle);
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  assertInside(projectRoot, runsRoot, '生成目录必须位于项目目录内。');
  const runDirectory = resolve(runsRoot, bundle.id);
  const staging = resolve(runsRoot, `.staging-${bundle.id}-${process.pid}`);
  assertInside(runsRoot, runDirectory, 'bundle 目录越过生成根目录。');
  assertInside(runsRoot, staging, 'staging 目录越过生成根目录。');
  await mkdir(runsRoot, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const compileStarted = Date.now();
  try {
    for (const file of bundle.files) {
      const target = resolve(staging, file.path);
      assertInside(staging, target, `生成文件越过 bundle 目录：${file.path}`);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, 'utf8');
    }
    await writeFile(join(staging, 'bundle.json'), JSON.stringify(bundle, null, 2), 'utf8');
    const diagnostics = await compileDedicatedSources(staging, projectRoot, bundle);
    if (diagnostics.length) throw new Error(`TypeScript 编译失败：${diagnostics.slice(0, 6).join('；')}`);
    const compileMs = Date.now() - compileStarted;
    const summary = generatedBundleSummary(bundle);
    const receipt: DedicatedBuildReceipt = {
      id: bundle.id, provider: 'codex', model, status: 'compiled', previewUrl: `/generated-runs/${bundle.id}/`, generatedAt: new Date().toISOString(),
      ...summary, assets: usedAssetCount, compileMs, attempts, directory: normalizeRelative(projectRoot, runDirectory)
    };
    await writeFile(join(staging, 'build-report.json'), JSON.stringify({ receipt, request, usedAssets: request.reference.assets?.filter((asset) => bundleUsesUri(bundle, asset.uri)) || [] }, null, 2), 'utf8');
    await rm(runDirectory, { recursive: true, force: true });
    await mkdir(runDirectory, { recursive: true });
    await cp(staging, runDirectory, { recursive: true, force: false, errorOnExist: true });
    await rm(staging, { recursive: true, force: true });
    return { bundle, receipt };
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readDedicatedRun(id: string, environment: Environment = process.env): Promise<{ entryUrl: string; cssUrl: string; title: string } | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return null;
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const directory = resolve(runsRoot, id);
  assertInside(runsRoot, directory, 'bundle id 越过生成根目录。');
  try {
    const bundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(directory, 'bundle.json'), 'utf8')) as unknown);
    return { entryUrl: `/${normalizeRelative(projectRoot, join(directory, bundle.entry))}`, cssUrl: `/${normalizeRelative(projectRoot, join(directory, 'src', 'page.css'))}`, title: bundle.id };
  } catch { return null; }
}

function canonicalizeBundle(value: unknown, request: DedicatedCodeRequest): GeneratedExperienceBundle {
  const parsed = generatedExperienceBundleSchema.parse(value);
  const hash = createHash('sha256').update(`${request.brief}|${request.seed}|${Date.now()}|${parsed.id}`).digest('hex').slice(0, 12);
  return assertGeneratedExperienceBundle({ ...parsed, id: `dedicated-${hash}`, runId: request.runId, effectSpecId: request.selectedId });
}

export function applyDedicatedRevision(
  current: GeneratedExperienceBundle,
  changes: Array<{ path: string; content: string }>,
  request: DedicatedCodeRequest
): GeneratedExperienceBundle {
  const changeByPath = new Map<string, string>();
  const knownPaths = new Set(current.files.map((file) => file.path));
  for (const change of changes) {
    if (changeByPath.has(change.path)) throw new Error(`增量修订重复修改文件：${change.path}`);
    if (!knownPaths.has(change.path)) throw new Error(`增量修订只能修改现有文件：${change.path}`);
    changeByPath.set(change.path, change.content);
  }
  const files = current.files.map((file) => (
    changeByPath.has(file.path) ? { ...file, content: changeByPath.get(file.path)! } : file
  ));
  if (!files.some((file, index) => file.content !== current.files[index].content)) throw new Error('增量修订没有形成实际代码变化。');
  const hash = createHash('sha256').update(`${current.id}|${Date.now()}|${changes.map((item) => item.path + item.content).join('|')}`).digest('hex').slice(0, 12);
  return assertGeneratedExperienceBundle({ ...current, id: `dedicated-${hash}`, runId: request.runId, effectSpecId: request.selectedId, files });
}

function assertApprovedAssetUsage(request: DedicatedCodeRequest, bundle: GeneratedExperienceBundle): number {
  const approved = request.reference.assets || [];
  const approvedByUri = new Map(approved.map((asset) => [asset.uri, asset]));
  const source = bundle.files.map((file) => file.content).join('\n');
  const usedUris = [...new Set(source.match(/\/(?:api\/creative\/assets|creative-assets)\/[a-zA-Z0-9._/-]+/g) || [])];
  for (const uri of usedUris) {
    const asset = approvedByUri.get(uri);
    if (!asset) throw new Error(`生成代码引用了未获批的素材 URI：${uri}`);
    if (!bundle.assets.some((item) => item.path === asset.bundlePath)) throw new Error(`生成 bundle 未声明已使用素材：${asset.bundlePath}`);
  }
  for (const required of bundle.assets.filter((asset) => asset.required)) {
    const approvedAsset = approved.find((asset) => asset.bundlePath === required.path);
    if (!approvedAsset) throw new Error(`生成 bundle 声明了未获批的必需素材：${required.path}`);
    if (!usedUris.includes(approvedAsset.uri)) throw new Error(`生成代码没有实际使用必需素材：${approvedAsset.uri}`);
  }
  for (const required of approved.filter((asset) => asset.required)) {
    if (!usedUris.includes(required.uri)) throw new Error(`生成代码没有实际使用素材合同中的关键素材：${required.uri}`);
    const declared = bundle.assets.find((asset) => asset.path === required.bundlePath);
    if (!declared?.required) throw new Error(`生成 bundle 没有把素材合同中的关键素材声明为 required：${required.bundlePath}`);
  }
  if (approved.length && request.quality !== 'low' && !usedUris.length) throw new Error('已有获批素材，但生成代码没有实际使用；请把素材作为 DOM 或 Three.js 视觉锚点。');
  return usedUris.length;
}

function bundleUsesUri(bundle: GeneratedExperienceBundle, uri: string): boolean {
  return bundle.files.some((file) => file.content.includes(uri));
}


async function runCodexRevision(
  codexBinary: string,
  request: DedicatedCodeRequest,
  bundle: GeneratedExperienceBundle,
  instruction: string,
  environment: Environment
): Promise<z.infer<typeof dedicatedRevisionModelResponseSchema>> {
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-revision-'));
  const schemaPath = join(directory, 'revision.schema.json');
  const outputPath = join(directory, 'revision.json');
  try {
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(dedicatedRevisionModelResponseSchema, { target: 'draft-7' })), 'utf8');
    const args = ['exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never', '--output-schema', schemaPath, '--output-last-message', outputPath];
    const model = environment.CODEX_REVISION_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_REVISION_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', `model_reasoning_effort=${readReasoning(environment.CODEX_REVISION_REASONING_EFFORT || 'medium')}`, '-');
    const timeout = numberFrom(environment.CODEX_REVISION_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 240_000);
    const result = await runProcess(codexBinary, args, dedicatedRevisionPrompt(request, bundle, instruction), directory, timeout);
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return dedicatedRevisionModelResponseSchema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}

function dedicatedRevisionPrompt(request: DedicatedCodeRequest, bundle: GeneratedExperienceBundle, instruction: string): string {
  return [
    '你正在修改一个已经可运行并通过 TypeScript 门禁的专属 Three.js 网页。只返回符合 JSON Schema 的对象。',
    '严格落实用户这次修改意见，同时保持未涉及的视觉、交互、响应式与生命周期行为。',
    '只返回确实需要变化的现有文件，最多四个；禁止新增路径、占位内容、伪造素材或网络请求。',
    'DOM 负责清晰内容和控件，Three.js 负责空间、材质、镜头与氛围；最终体感优先于炫技。',
    `Original brief: ${request.brief}`,
    `Revision instruction: ${instruction}`,
    'Current complete bundle:',
    JSON.stringify(bundle)
  ].join('\n\n');
}
async function runCodexBundle(codexBinary: string, request: DedicatedCodeRequest, environment: Environment, previousFailure: string): Promise<unknown> {
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-dedicated-'));
  const schemaPath = join(directory, 'bundle.schema.json');
  const outputPath = join(directory, 'bundle.json');
  try {
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(generatedExperienceBundleSchema, { target: 'draft-7' })), 'utf8');
    const args = ['exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never', '--output-schema', schemaPath, '--output-last-message', outputPath];
    const model = environment.CODEX_BUNDLE_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-terra';
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_CREATIVE_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', `model_reasoning_effort=${readReasoning(environment.CODEX_CREATIVE_REASONING_EFFORT)}`, '-');
    const result = await runProcess(codexBinary, args, dedicatedCodePrompt(request, previousFailure), directory, numberFrom(environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 300_000));
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return JSON.parse(await readFile(outputPath, 'utf8')) as unknown;
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}


async function runCodexVisualRefinement(
  codexBinary: string,
  request: DedicatedCodeRequest,
  bundle: GeneratedExperienceBundle,
  review: CapturedVisualReview,
  environment: Environment,
  previousFailure: string
): Promise<VisualRefinementModelResponse> {
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-visual-refinement-'));
  const schemaPath = join(directory, 'refinement.schema.json');
  const outputPath = join(directory, 'refinement.json');
  try {
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(visualRefinementModelResponseSchema, { target: 'draft-7' })), 'utf8');
    const args = [
      'exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never',
      '--output-schema', schemaPath, '--output-last-message', outputPath, '-i', ...review.imagePaths
    ];
    const model = environment.CODEX_VISUAL_REFINEMENT_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_VISUAL_REFINEMENT_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', 'model_reasoning_effort=' + readReasoning(environment.CODEX_VISUAL_REFINEMENT_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT), '-');
    const timeout = numberFrom(environment.VISUAL_REFINEMENT_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 300_000);
    const result = await runProcess(codexBinary, args, visualRefinementPrompt(request, bundle, review, previousFailure), directory, timeout);
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return visualRefinementModelResponseSchema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}

async function runCodexVisualAcceptance(
  codexBinary: string,
  request: DedicatedCodeRequest,
  bundle: GeneratedExperienceBundle,
  review: CapturedVisualReview,
  environment: Environment
): Promise<VisualAcceptance> {
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-visual-acceptance-'));
  const schemaPath = join(directory, 'acceptance.schema.json');
  const outputPath = join(directory, 'acceptance.json');
  try {
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(visualAcceptanceSchema, { target: 'draft-7' })), 'utf8');
    const args = [
      'exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never',
      '--output-schema', schemaPath, '--output-last-message', outputPath, '-i', ...review.imagePaths
    ];
    const model = environment.CODEX_VISUAL_ACCEPTANCE_MODEL || environment.CODEX_VISUAL_REFINEMENT_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_VISUAL_ACCEPTANCE_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', 'model_reasoning_effort=' + readReasoning(environment.CODEX_VISUAL_ACCEPTANCE_REASONING_EFFORT || environment.CODEX_VISUAL_REFINEMENT_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT), '-');
    const timeout = numberFrom(environment.VISUAL_ACCEPTANCE_TIMEOUT_MS || environment.VISUAL_REFINEMENT_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS, 300_000);
    const result = await runProcess(codexBinary, args, visualAcceptancePrompt(request, bundle, review), directory, timeout);
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return visualAcceptanceSchema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}

function visualAcceptancePrompt(request: DedicatedCodeRequest, bundle: GeneratedExperienceBundle, review: CapturedVisualReview): string {
  return [
    '你是独立的最终视觉验收人，不负责写代码，也不能相信生成模型对自身结果的描述。附件依次是最终候选的桌面首屏、滚动中段、滚动终点和 390px 移动端减弱动效截图。只返回符合 JSON Schema 的验收结果。',
    '',
    '按以下顺序判断：',
    '1. 构图是否有唯一、可信的视觉焦点，文字与主体是否形成同一画面。',
    '2. 已获批素材是否按照 brief 和 role 成为主体、环境或支持层；仅加载、躲在暗处、被程序化几何遮挡都不算有效使用。',
    '3. 是否存在明显矩形边缘、贴图感、占位球体/蛋形/圆柱、拉伸失真或素材与背景割裂。',
    '4. 中段 Three.js 变化是否表达叙事，而不是随机线条、粒子或几何堆积。',
    '5. 末段是否完成收束并保持文案、CTA 可读；移动端是否仍有清楚焦点。',
    '6. 只有已经可以作为该 brief 最终作品的页面才能 verdict=pass。轻微不影响成品的问题可作为 minor；任何主体错误、遮挡、割裂或弱收束必须 verdict=revise。',
    '',
    '原始 brief：', request.brief,
    '素材及声明角色：', JSON.stringify(request.reference.assets || []),
    '候选 bundle 摘要：', JSON.stringify(generatedBundleSummary(bundle)),
    '机械评审：', JSON.stringify(review.assessment)
  ].join('\n');
}
function visualRefinementPrompt(
  request: DedicatedCodeRequest,
  bundle: GeneratedExperienceBundle,
  review: CapturedVisualReview,
  previousFailure: string
): string {
  return [
    '你是负责最终成片质量的创意技术总监。附件依次是当前网页的桌面首屏、滚动中段、滚动终点和 390px 移动端减弱动效截图。',
    '请结合原始 brief、机械证据和当前完整代码，决定保留当前版本还是做一次有明确证据的修订。只返回符合 JSON Schema 的对象。',
    '',
    '判断规则：',
    '- 先检查构图、唯一焦点、文字与 WebGL 主体关系、滚动结构事件、最终英雄画面，再检查字体、颜色、材质、深度、密度和运动。',
    '- 如果截图已经有清楚的阅读顺序、可信视觉锚点和稳定最终构图，decision=keep，bundle=null；不要为了显示工作量而改代码。',
    '- 机械证据中的 findings 是结构或交互缺陷；observations 中的 editorial-overlap 只是创意叠层提示，不能单独作为修订理由，必须以截图中的阅读顺序和构图意图为准。',
    '- 如果截图中存在真正妨碍阅读或交互的重叠、主体像占位符、素材边界、首屏失焦、章节重复、手机裁切或最终画面弱，decision=revise，并返回完整可编译 bundle。',
    '- 修订必须保持原 brief、语义内容和已获批素材来源，不得凭空增加图片、模型、音频或外部 URL。',
    '- 不得用 html/body/#app 的 overflow:hidden 或仅 100vh 固定高度来消除横向溢出；必须保留至少约 80vh 的桌面有效纵向滚动行程，同时用 margin:0、box-sizing:border-box、max-width:100% 和 overflow-x:hidden/clip 解决横向边界。',
    '- 任何 CSS 修订都必须同时保留 opening、middle、final 三个证据位置可达；不能修复边界后让 generated progress 停在 0 或只剩几十像素滚动距离。',
    '- 若截图显示程序化几何压过获批主体、全幅环境只剩局部、终局素材缺席或移动端出现贴图矩形，必须优先重做素材层级与 cover/contain 逻辑；不能只调整文字、边距、颜色或继续增加粒子和线条。',
    '- 保持 @signal-lab/experience-sdk 生命周期；不得新增 requestAnimationFrame、网络、存储、动态导入或非白名单模块。',
    '- 保留可读 DOM、移动端、quality=low、reducedMotion、WebGL 失败回退和完整 dispose。',
    '- 只修有证据的问题，优先调整构图和状态导演，不要无理由彻底换风格。',
    '',
    '原始 brief：', request.brief,
    '机械证据：', JSON.stringify({ evidence: review.evidence, assessment: review.assessment }),
    '当前 bundle：', JSON.stringify(bundle),
    previousFailure ? '上一次修订失败：' + previousFailure + '。请返回更保守、类型完整的新修订。' : ''
  ].join('\n');
}

function dedicatedCodePrompt(request: DedicatedCodeRequest, previousFailure: string): string {
  const approvedAssets = request.reference.assets || [];
  const assetContract = approvedAssets.length ? [
    '', '已获批本地素材（只允许使用这些 URI）：', JSON.stringify(approvedAssets),
    '- quality 为 balanced/high 时必须实际使用至少一个获批素材；可用 DOM、CSS 或 THREE.TextureLoader，但素材必须服务于视觉主体和叙事变化。',
    '- 除非 brief 明确要求画框、卡片或档案图片，禁止把图片作为边界清晰的矩形平面悬在页面中央。应按素材特征选择全幅融合、透明/亮度遮罩、分层 2.5D、深度位移、纹理投影或粒子重组等方法；选择其中最合适的，不要机械叠加全部技术。',
    '- 图片只是素材证据，不是成品构图。需要让它与背景色、空间遮挡、光场、文字层级和滚动事件形成同一视觉系统；素材边缘、底色或画布比例不得显得像贴图。必须保持素材固有宽高比；若生成时未知，须在纹理加载后读取 image width/height 再缩放几何体，禁止把横图硬压成竖图。',
    '- 同时提供多个素材时，必须依据 role 分配主体、环境、纹理或前景职责，禁止简单叠成多张海报。带 Alpha 的素材优先直接使用 tex.a 或 PNG 透明度，不得用亮度阈值误删半透明主体；无 Alpha 的环境图应使用全幅融合或柔和边缘，而不是硬矩形。',
    '- 素材中的 experience 是本次作品的动态叙事合同：anchor 表示最强视觉责任位置，function 表示用途，visualState 是必须形成的画面，continuity 约束前后连续性，integration 约束融合手段。按 anchor 排序形成所需的关键状态，但不要据此套用固定章节数。',
    '- required=true 的素材必须在对应 anchor 附近可见地承担声明职责，代码必须实际引用，并在 bundle.assets 中声明 required=true；不能只预加载、藏在暗处或被程序化几何遮挡。',
    '- integration=alpha-subject 时，素材轮廓必须成为对应状态唯一或明确主导的视觉焦点；禁止在其前方放置不透明球体、蛋形、圆柱、粗竖线或其他占位几何。程序化几何只能作为低对比支持层，不能覆盖主体内部细节。',
    '- integration=full-bleed-environment 时，对应 anchor 的环境必须覆盖完整视口并保持原始宽高比，使用 cover 式裁切、柔和遮罩或空间深度融合；禁止只露出顶部残片、窄条、中央矩形或在最终状态淡化为空背景。',
    '- function=resolve 的关键素材必须在 progress 接近 1 时仍清晰可见，并与最终文案和 CTA 形成稳定英雄构图；最终画面不得比中段更空、更暗或更像占位场景。',
    '- 使用 THREE.TextureLoader 时调用 setCrossOrigin("anonymous")；必须提供加载失败后的程序化视觉回退，不能让素材阻塞页面 ready。',
    '- 对每个实际使用的素材，在 bundle.assets 中用对应 bundlePath 声明；source 映射为 generated/user-provided/licensed。',
    '- 不得编造新素材 URI，不得把静态图片当作全部 Three.js 能力。'
  ] : ['', '当前没有获批素材：使用程序化几何、Shader 和 CSS，不得声明不存在的图片、模型或音频。'];
  const retry = previousFailure ? `\n上一次输出没有通过本地构建，失败摘要：${previousFailure}\n请从头返回一份更保守、类型完整、可编译的新 bundle。` : '';
  return [
    '你是资深创意技术总监和 Three.js 工程师。请为给定 brief 创作一个独立、可运行、非模板换参的沉浸式产品网页代码 bundle。',
    '只返回符合 JSON Schema 的对象，不要 markdown，不要解释。', '', '硬性工程契约：',
    '- files 必须至少包含 src/experience.ts、src/scene.ts、src/director.ts、src/page.css。',
    "- experience.ts 必须从 @signal-lab/experience-sdk 导入 defineExperience 与 startExperience，并调用 startExperience(defineExperience({ mount, update, resize, dispose }))。",
    '- SDK 类型契约必须精确遵守：GeneratedViewport 只有 width、height、dpr；像素比使用 viewport.dpr，禁止使用 pixelRatio。',
    '- GeneratedFrame 只有 elapsed、delta、progress、pointer、viewport、reducedMotion；GeneratedMountContext 只有 container、canvas、quality、reducedMotion、viewport。',
    '- scene.ts 使用 three 和传入的 canvas 建立 WebGLRenderer；SDK 已负责 requestAnimationFrame，禁止另开动画循环。',
    '- director.ts 必须把 progress、pointer、elapsed 转成有叙事目的的镜头和场景状态，不得只是无限旋转。',
    '- page.css 会由宿主页直接加载；不要在 TypeScript 中 import CSS。',
    '- 页面必须创建可读 DOM 文案和明确行动；Canvas 负责空间、氛围和记忆点，不能承载全部文字。',
    '- 必须适配手机、quality=low、reducedMotion；WebGL 或素材失败时 DOM 仍完整可读。',
    '- 若本次体验由 scroll 驱动，DOM 必须提供真实纵向滚动行程：桌面 document.scrollHeight - innerHeight 至少约为 0.8 * innerHeight；canvas 可以 fixed，但叙事容器不能被锁成只有 100vh。使用 margin:0、box-sizing:border-box、max-width:100% 与 overflow-x:hidden/clip 解决横向溢出，禁止用全局 overflow:hidden 同时消灭纵向滚动。',
    '- dispose 必须释放 renderer、geometry、material、texture 和监听器。',
    '- 禁止 fetch、WebSocket、XMLHttpRequest、eval、new Function、动态 import、外部 URL、加载器和未获批资产声明。',
    '- 只允许导入 three、three/*、@signal-lab/experience-sdk 和同目录 ./ 相对模块。',
    '- 使用严格 TypeScript；不要 any、@ts-ignore、未声明全局变量或 React。',
    '- 视觉必须针对 brief 创作，有一个明确 hero、一次结构性变化、一个静止可读的最终构图。变化必须是可描述的事件，例如聚合、解构、穿越、显影、变形或材质转换，不能只有镜头推进、整体缩放和透明度变化。',
    '- 根据 brief 和素材 experience 自主决定关键状态数量与时间位置；至少形成一次有意义的视觉变化和一个静止可读的最终构图，但禁止机械套用三段、四章或等距时间点。滚动与指针只负责驱动状态，不能让元素直接追逐鼠标或机械抖动。',
    '- 标题字号必须使用带像素上限的 clamp；桌面 hero 标题上限不超过 96px，390px 手机不超过 64px，标题块不得超过首屏高度的 42%，长中文必须自然换行且不能遮挡正文、CTA 或视觉主体。',
    '- 首屏必须有唯一主焦点和清晰阅读顺序；标题、主体、正文和行动入口不得同时争抢中心。桌面与手机均不得出现无意裁字、贴边、正文被标题挤压或 CTA 过小。',
    '- 保持创意开放：不要套用固定章节数、固定居中构图或固定紫色科技风。根据 brief 自主选择空间隐喻、排版关系、材质语言和动作节奏，但必须能说明这些选择如何服务目标。',
    '- 代码质量同样是交付目标：只使用一个 SDK Canvas 和一套 progress/pointer 时间线；避免每帧创建大量临时对象；把状态导演、Three.js 场景和可读 DOM 分离。',
    ...assetContract, '',
    `brief: ${request.brief}`, `seed: ${request.seed}`, `quality target: ${request.quality}`,
    `已有方向仅供理解、不得复制运行时：${JSON.stringify({ ...request.reference, assets: undefined })}`, retry
  ].join('\n');
}

function assertInside(root: string, target: string, message: string): void {
  const path = relative(root, target); if (path.startsWith(`..${sep}`) || path === '..' || isAbsolute(path)) throw new Error(message);
}
function normalizeRelative(root: string, target: string): string {
  const path = relative(root, target); if (path.startsWith(`..${sep}`) || path === '..' || isAbsolute(path)) throw new Error('目标不在项目目录内。'); return path.split(sep).join('/');
}
async function findCodexBinary(environment: Environment): Promise<string | null> {
  if (environment.CODEX_BINARY) { try { await access(environment.CODEX_BINARY); return environment.CODEX_BINARY; } catch { return null; } }
  if (codexBinaryPromise) return codexBinaryPromise;
  codexBinaryPromise = (async () => {
    const locator = process.platform === 'win32' ? ['where.exe', ['codex.cmd']] as const : ['which', ['codex']] as const;
    const result = await runProcess(locator[0], [...locator[1]], '', process.cwd(), 5_000).catch(() => null);
    if (!result || result.code !== 0) return null;
    const candidate = result.stdout.split(/\r?\n/).map((line) => line.trim()).find((path) => process.platform !== 'win32' || basename(path).toLowerCase() === 'codex.cmd');
    if (!candidate) return null; try { await access(candidate); return candidate; } catch { return null; }
  })(); return codexBinaryPromise;
}
function runProcess(command: string, args: readonly string[], input: string, cwd: string, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const commandScript = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
    const executable = commandScript ? process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe' : command;
    const child = spawn(executable, commandScript ? ['/d', '/s', '/c', `call ${[command, ...args].map(cmdQuote).join(' ')}`] : [...args], { cwd, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => {
      terminateProcessTree(child.pid);
      reject(new Error(`专属代码模型调用超过 ${Math.round(timeoutMs / 1000)} 秒。`));
    }, timeoutMs);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', (chunk: string) => { stdout += chunk; }); child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', (error) => { if (settled) return; settled = true; clearTimeout(timer); reject(error); });
    child.once('close', (code) => { if (settled) return; settled = true; clearTimeout(timer); resolvePromise({ code: code ?? -1, stdout, stderr }); }); child.stdin.end(input);
  });
}
function terminateProcessTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === 'win32') {
    const killer = spawn('taskkill.exe', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.unref();
    return;
  }
  try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* already exited */ } }
}
function cmdQuote(value: string): string { if (/['"\r\n]/.test(value)) throw new Error('Codex 启动参数包含不安全字符。'); return /\s/.test(value) ? `"${value}"` : value; }
function readReasoning(value: string | undefined): string { return value && ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(value) ? value : 'high'; }
function numberFrom(value: string | undefined, fallback: number): number { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 5_000 ? Math.min(parsed, 600_000) : fallback; }
function cleanProcessError(value: string): string { return (value.trim().split(/\r?\n/).filter(Boolean).slice(-5).join(' ') || 'Codex 未返回有效专属代码。').slice(0, 900); }
function cleanError(error: unknown): string { return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 1200); }
