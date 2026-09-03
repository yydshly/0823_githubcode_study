import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { assertGeneratedExperienceBundle, generatedBundleSummary, generatedExperienceBundleSchema, type GeneratedExperienceBundle } from '../src/generation/generated-experience-bundle.ts';
import { assessVisualQualityPreflight, type VisualReviewAssessment, type VisualReviewEvidence } from '../src/generation/visual-review.ts';
import {
  assessVisualRefinementOpportunity,
  isFinalVisualCandidateEligible,
  visualAcceptanceModelResponseSchema,
  visualAcceptanceSchema,
  type VisualAcceptance
} from '../src/generation/visual-acceptance.ts';
import { compileDedicatedSources } from './dedicated-typescript-compiler.ts';
import { captureDedicatedVisualReview, cleanupCapturedVisualReview, type CapturedVisualReview } from './dedicated-visual-review.ts';
import { createVisualReviewPlan, type VisualReviewPlan } from '../src/generation/visual-review-plan.ts';
import { v2CreativeContractSchema } from '../src/v2/creative-contract.ts';
import { stateAssetEvidenceSchema } from '../src/v2/state-asset-strategy.ts';
import { createCodexExecutionBrief, serializeCodexAuthoringBrief, serializeCodexExecutionBrief } from '../src/v2/codex-execution-brief.ts';
import { assertMediaDominance } from '../src/generation/media-dominance-gate.ts';
import { assertGenerationDeadline, clampTimeoutToGenerationDeadline } from './generation-deadline.ts';
import { assetSpatialFeaturesSchema } from '../src/generation/asset-plan.ts';

type Environment = Readonly<Record<string, string | undefined>>;
interface ProcessResult { code: number; stdout: string; stderr: string; }
interface MaterializedRun { bundle: GeneratedExperienceBundle; receipt: DedicatedBuildReceipt; }

const dedicatedAssetContextSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  uri: z.string().regex(/^\/(?:api\/creative\/assets|creative-assets)\/[a-zA-Z0-9._/-]+$/).refine((value) => !value.includes('..'), '素材 URI 不能包含路径穿越。'),
  bundlePath: z.string().regex(/^assets\/[a-zA-Z0-9_./-]+$/).refine((value) => !value.includes('..'), '素材 bundlePath 不能包含路径穿越。'),
  kind: z.enum(['image', 'texture', 'environment', 'model-3d', 'audio', 'video', 'font']),
  source: z.enum(['chatgpt-generated', 'model-generated', 'user-provided', 'licensed']),
  qualityLevel: z.enum(['L2-inspectable', 'L3-presentable', 'L4-cinematic']).optional(),
  role: z.string().trim().min(2).max(120),
  description: z.string().trim().min(4).max(300),
  payloadBytes: z.number().int().nonnegative().max(50_000_000),
  features: assetSpatialFeaturesSchema.optional(),
  required: z.boolean().optional(),
  experience: z.object({
    anchor: z.number().min(0).max(1),
    function: z.enum(['establish', 'develop', 'transform', 'resolve', 'persistent']),
    visualState: z.string().min(8).max(180),
    continuity: z.string().min(8).max(180),
    integration: z.enum(['alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-media']),
    stateEvidence: stateAssetEvidenceSchema.optional()
  }).strict().optional()
}).strict();

export const dedicatedCodeRequestSchema = z.object({
  brief: z.string().trim().min(8).max(600), seed: z.number().int().min(0).max(1_000_000),
  quality: z.enum(['high', 'balanced', 'low']), runId: z.string().min(4).max(120), selectedId: z.string().min(4).max(160),
  creativeContract: v2CreativeContractSchema.optional(),
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

const dedicatedAuthoringFileSchema = z.object({
  path: z.enum(['src/experience.ts', 'src/scene.ts', 'src/director.ts', 'src/page.css']),
  language: z.enum(['typescript', 'css']),
  content: z.string().max(24_000),
}).strict().superRefine((file, context) => {
  const expected = file.path === 'src/page.css' ? 'css' : 'typescript';
  if (file.language !== expected) context.addIssue({ code: 'custom', path: ['language'], message: `${file.path} 的语言必须为 ${expected}。` });
});

export const dedicatedAuthoringModelResponseSchema = z.object({
  files: z.array(dedicatedAuthoringFileSchema).length(4)
    .refine((files) => new Set(files.map((file) => file.path)).size === 4, '首稿必须只返回四个必要源码文件。')
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

export interface DedicatedVisualAuditResult {
  plan: VisualReviewPlan;
  evidence: VisualReviewEvidence;
  assessment: VisualReviewAssessment;
}

export interface DedicatedGenerationProgress {
  phase: 'attempt-start' | 'candidate-saved' | 'local-repair' | 'local-recovered';
  attempt: number;
  totalAttempts: number;
  timeoutMs: number;
  failure: string | null;
  localRepair?: number;
  maxLocalRepairs?: number;
  artifactPath?: string;
  actions?: string[];
}

export type DedicatedGenerationFailureCategory = 'bundle-schema' | 'asset-contract' | 'typescript' | 'security' | 'runtime' | 'unknown';

interface DedicatedCandidateRepair {
  value: unknown;
  actions: string[];
}

interface CandidateRecoveryRound {
  round: number;
  category: DedicatedGenerationFailureCategory;
  failure: string;
  actions: string[];
  at: string;
}

interface CandidateRecoveryReport {
  schemaVersion: 1;
  runId: string;
  selectedId: string;
  model: string;
  status: 'captured' | 'repairing' | 'validated' | 'recovered' | 'failed';
  artifactPath: string;
  capturedAt: string;
  updatedAt: string;
  finalCategory: DedicatedGenerationFailureCategory | null;
  finalFailure: string | null;
  repairRounds: CandidateRecoveryRound[];
}

const MAX_LOCAL_REPAIRS = 2;

export function dedicatedAuthoringModel(
  environment: Environment = process.env,
  quality: DedicatedCodeRequest['quality'] = 'balanced',
): string {
  const explicitOverride = environment.CODEX_AUTHORING_MODEL || environment.CODEX_BUNDLE_MODEL;
  if (explicitOverride) return explicitOverride;
  if (quality === 'high') return environment.CODEX_HIGH_QUALITY_AUTHORING_MODEL || 'gpt-5.6-terra';
  return environment.CODEX_BALANCED_AUTHORING_MODEL || 'gpt-5.6-terra';
}

export function dedicatedVisualRefinementModel(environment: Environment = process.env): string {
  return environment.CODEX_VISUAL_REFINEMENT_MODEL || 'gpt-5.6-sol';
}


let codexBinaryPromise: Promise<string | null> | null = null;
const dedicatedRunPublicationLocks = new Map<string, Promise<void>>();

export async function generateDedicatedExperience(
  input: unknown,
  environment: Environment = process.env,
  onProgress?: (progress: DedicatedGenerationProgress) => void | Promise<void>,
): Promise<DedicatedBuildReceipt> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能生成专属网页代码。');
  const model = dedicatedAuthoringModel(environment, request.quality);
  const timeoutMs = clampTimeoutToGenerationDeadline(
    environment,
    numberFrom(environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 300_000),
  );
  await emitGenerationProgress(onProgress, { phase: 'attempt-start', attempt: 1, totalAttempts: 1, timeoutMs, failure: null });
  const raw = await runCodexBundle(codexBinary, request, environment, '');
  return recoverAndMaterializeDedicatedBundle(request, raw, environment, model, onProgress, timeoutMs);
}

export function completeDedicatedAuthoringResponse(
  input: unknown,
  value: unknown,
): GeneratedExperienceBundle {
  const request = dedicatedCodeRequestSchema.parse(input);
  const complete = generatedExperienceBundleSchema.safeParse(value);
  if (complete.success) return complete.data;
  const response = dedicatedAuthoringModelResponseSchema.parse(value);
  const source = response.files.map((file) => file.content).join('\n');
  const imports: Array<'three' | '@signal-lab/experience-sdk'> = ['@signal-lab/experience-sdk'];
  if (/from\s+['"]three(?:\/[^'"]*)?['"]|import\s+\*\s+as\s+THREE\s+from\s+['"]three['"]/.test(source)) imports.unshift('three');
  const assets = (request.reference.assets || []).map((asset) => ({
    id: asset.id,
    path: asset.bundlePath,
    kind: asset.kind,
    source: asset.source === 'user-provided'
      ? 'uploaded' as const
      : asset.source === 'licensed'
        ? 'licensed' as const
        : 'generated' as const,
    required: asset.required ?? false,
  }));
  const digest = createHash('sha256')
    .update(`${request.runId}|${request.selectedId}|${request.seed}|${response.files.map((file) => file.content).join('|')}`)
    .digest('hex')
    .slice(0, 12);
  return assertGeneratedExperienceBundle({
    schemaVersion: 1,
    id: `dedicated-draft-${digest}`,
    runId: request.runId,
    effectSpecId: request.selectedId,
    kind: 'dedicated-module',
    entry: 'src/experience.ts',
    files: response.files,
    assets,
    contract: {
      sdkVersion: 1,
      imports,
      lifecycle: ['mount', 'update', 'resize', 'dispose'],
      network: 'disabled',
      deterministicTimeline: true,
    },
  });
}

async function emitGenerationProgress(
  listener: ((progress: DedicatedGenerationProgress) => void | Promise<void>) | undefined,
  progress: DedicatedGenerationProgress,
): Promise<void> {
  if (!listener) return;
  try { await listener(progress); } catch { /* Progress reporting must not abort a valid build. */ }
}

export async function recoverAndMaterializeDedicatedBundle(
  input: unknown,
  rawCandidate: unknown,
  environment: Environment = process.env,
  model = 'test-model',
  onProgress?: (progress: DedicatedGenerationProgress) => void | Promise<void>,
  timeoutMs = numberFrom(environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 300_000),
): Promise<DedicatedBuildReceipt> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const artifact = await createCandidateArtifact(request, rawCandidate, model, environment);
  await emitGenerationProgress(onProgress, {
    phase: 'candidate-saved', attempt: 1, totalAttempts: 1, timeoutMs, failure: null,
    localRepair: 0, maxLocalRepairs: MAX_LOCAL_REPAIRS, artifactPath: artifact.report.artifactPath,
  });
  let candidate = rawCandidate;
  let repairCount = 0;
  while (true) {
    assertGenerationDeadline(environment);
    try {
      const materialized = await validateAndMaterializeDedicatedBundle(
        request,
        canonicalizeBundle(candidate, request),
        environment,
        model,
        1,
      );
      artifact.report.status = repairCount ? 'recovered' : 'validated';
      artifact.report.finalCategory = null;
      artifact.report.finalFailure = null;
      artifact.report.updatedAt = new Date().toISOString();
      await writeCandidateReport(artifact.directory, artifact.report);
      if (repairCount) {
        await emitGenerationProgress(onProgress, {
          phase: 'local-recovered', attempt: 1, totalAttempts: 1, timeoutMs, failure: null,
          localRepair: repairCount, maxLocalRepairs: MAX_LOCAL_REPAIRS, artifactPath: artifact.report.artifactPath,
        });
      }
      return materialized.receipt;
    } catch (error) {
      const failure = cleanError(error);
      const category = classifyDedicatedGenerationFailure(error);
      artifact.report.finalCategory = category;
      artifact.report.finalFailure = failure;
      artifact.report.updatedAt = new Date().toISOString();
      if (repairCount >= MAX_LOCAL_REPAIRS) {
        artifact.report.status = 'failed';
        await writeCandidateReport(artifact.directory, artifact.report);
        throw new Error(`专属代码在 ${MAX_LOCAL_REPAIRS} 轮本地修复后停止（${category}）：${failure}；候选已保存在 ${artifact.report.artifactPath}`);
      }
      const repaired = repairDedicatedCandidate(candidate, request, category);
      if (!repaired.actions.length || stableCandidateJson(repaired.value) === stableCandidateJson(candidate)) {
        artifact.report.status = 'failed';
        await writeCandidateReport(artifact.directory, artifact.report);
        throw new Error(`专属代码未通过（${category}），且没有安全的确定性修复动作：${failure}；候选已保存在 ${artifact.report.artifactPath}`);
      }
      repairCount += 1;
      candidate = repaired.value;
      artifact.report.status = 'repairing';
      artifact.report.repairRounds.push({ round: repairCount, category, failure, actions: repaired.actions, at: new Date().toISOString() });
      artifact.report.updatedAt = new Date().toISOString();
      await writeFile(join(artifact.directory, `repair-${String(repairCount).padStart(2, '0')}-bundle.json`), stableCandidateJson(candidate), 'utf8');
      await writeCandidateReport(artifact.directory, artifact.report);
      await emitGenerationProgress(onProgress, {
        phase: 'local-repair', attempt: 1, totalAttempts: 1, timeoutMs, failure,
        localRepair: repairCount, maxLocalRepairs: MAX_LOCAL_REPAIRS,
        artifactPath: artifact.report.artifactPath, actions: repaired.actions,
      });
    }
  }
}

export async function recoverSavedDedicatedCandidate(
  input: unknown,
  environment: Environment = process.env,
  model?: string,
  onProgress?: (progress: DedicatedGenerationProgress) => void | Promise<void>,
): Promise<DedicatedBuildReceipt> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const resolvedModel = model || dedicatedAuthoringModel(environment, request.quality);
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const root = resolve(environment.SIGNAL_GENERATION_CANDIDATES_DIR || join(projectRoot, '.artifacts', 'generation-candidates'));
  assertInside(projectRoot, root, '候选保全目录必须位于项目目录内。');
  const directory = resolve(root, safeArtifactSegment(request.runId), 'attempt-01');
  assertInside(root, directory, '候选恢复目录越过 artifact 根目录。');
  const rawCandidate = JSON.parse(await readFile(join(directory, 'raw-bundle.json'), 'utf8')) as unknown;
  return recoverAndMaterializeDedicatedBundle(request, rawCandidate, environment, resolvedModel, onProgress);
}

export async function hasSavedDedicatedCandidate(
  input: unknown,
  environment: Environment = process.env,
): Promise<boolean> {
  const request = dedicatedCodeRequestSchema.parse(input);
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const root = resolve(environment.SIGNAL_GENERATION_CANDIDATES_DIR || join(projectRoot, '.artifacts', 'generation-candidates'));
  assertInside(projectRoot, root, '候选保全目录必须位于项目目录内。');
  const directory = resolve(root, safeArtifactSegment(request.runId), 'attempt-01');
  assertInside(root, directory, '候选恢复目录越过 artifact 根目录。');
  try {
    await access(join(directory, 'raw-bundle.json'));
    return true;
  } catch {
    return false;
  }
}

export function classifyDedicatedGenerationFailure(error: unknown): DedicatedGenerationFailureCategory {
  if (error instanceof z.ZodError) return 'bundle-schema';
  const message = cleanError(error);
  if (/TypeScript|编译超时|ts\(\d+\)/i.test(message)) return 'typescript';
  if (/路径穿越|越过.*目录|不允许的运行能力|非白名单模块|未获批/.test(message)) return 'security';
  if (/素材|asset|bundle 未声明/i.test(message)) return 'asset-contract';
  if (/生成文件必须|生成束|必需文件|生命周期|源代码超过/.test(message)) return 'bundle-schema';
  if (/WebGL|运行时|runtime|renderer/i.test(message)) return 'runtime';
  return 'unknown';
}

export function repairDedicatedCandidate(
  value: unknown,
  request: DedicatedCodeRequest,
  category: DedicatedGenerationFailureCategory,
): DedicatedCandidateRepair {
  if (category === 'runtime' || category === 'unknown') return { value, actions: [] };
  const candidate = cloneJsonCandidate(value);
  if (!isRecord(candidate)) return { value, actions: [] };
  const actions: string[] = [];
  if (category === 'security' && Array.isArray(candidate.files)) {
    let intervalCalls = 0;
    for (const file of candidate.files) {
      if (!isRecord(file) || file.language !== 'typescript' || typeof file.content !== 'string') continue;
      const matches = file.content.match(/\b(?:window\.)?setInterval\s*\(/g);
      if (!matches?.length) continue;
      intervalCalls += matches.length;
      file.content = file.content
        .replace(/\bwindow\.setInterval\s*\(/g, 'window.setTimeout(')
        .replace(/\bsetInterval\s*\(/g, 'setTimeout(')
        .replace(/\bwindow\.clearInterval\s*\(/g, 'window.clearTimeout(')
        .replace(/\bclearInterval\s*\(/g, 'clearTimeout(');
    }
    if (intervalCalls) actions.push(`把 ${intervalCalls} 处不受控周期定时器降级为可取消的一次性提示`);
  }
  if (category === 'bundle-schema' || category === 'asset-contract') {
    const normalized = normalizeCandidatePaths(candidate);
    if (normalized) actions.push(`规范化 ${normalized} 个 bundle 路径`);
    if (!(request.reference.assets?.length) && Array.isArray(candidate.assets) && candidate.assets.length) {
      candidate.assets = [];
      actions.push('移除无素材任务中伪声明的 bundle.assets');
    }
    if (category === 'asset-contract' && Array.isArray(candidate.files)) {
      const source = stableCandidateJson(candidate);
      const missingFields = (request.reference.assets || []).filter((asset) => (
        asset.required
        && asset.kind === 'texture'
        && asset.experience?.integration === 'seamless-field'
        && !source.includes(asset.uri)
      ));
      const css = candidate.files.find((file) => isRecord(file) && file.language === 'css' && typeof file.content === 'string');
      if (missingFields.length && isRecord(css) && typeof css.content === 'string') {
        const rules = missingFields.map((asset, index) => (
          `body::${index ? 'after' : 'before'}{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.07;`
          + `background:linear-gradient(112deg,rgba(238,246,237,.22),rgba(255,255,255,0) 64%);`
          + `-webkit-mask:url('${asset.uri}') center/cover no-repeat;mask:url('${asset.uri}') center/cover no-repeat;mix-blend-mode:soft-light}`
        ));
        css.content = `${css.content}\n${rules.join('\n')}`;
        actions.push(`把 ${missingFields.length} 个已批准深度/状态场接入页面合成遮罩`);
      }
    }
  }
  if (category === 'typescript' && Array.isArray(candidate.files)) {
    let guarded = 0;
    let pointerAliases = 0;
    let qualityUnions = 0;
    let buttonEventTargets = 0;
    let mountContextAdapters = 0;
    for (const file of candidate.files) {
      if (!isRecord(file) || file.language !== 'typescript' || typeof file.content !== 'string') continue;
      let next = file.content;
      if (next.includes('THREE.')) {
        next = next.replace(
          /((?:[A-Za-z_$][\w$]*\.)+background)\.set\(([^;\n]*)\);/g,
          (_match, target: string, argument: string) => {
            guarded += 1;
            return `if (${target} instanceof THREE.Color) ${target}.set(${argument});`;
          },
        );
      }
      if (/\bGeneratedPointer\b/.test(next)) {
        const alreadyImportsGeneratedFrame = /import\s+type\s*\{[^}]*\bGeneratedFrame\b[^}]*\}\s*from\s*['"]@signal-lab\/experience-sdk['"]/.test(next);
        next = next.replace(
          /import\s+type\s*\{([^}]*)\}\s*from\s*['"]@signal-lab\/experience-sdk['"];?/g,
          (_match, imports: string) => {
            const names = imports.split(',').map((name: string) => name.trim()).filter(Boolean).filter((name: string) => name !== 'GeneratedPointer');
            if (!alreadyImportsGeneratedFrame && !names.includes('GeneratedFrame')) names.push('GeneratedFrame');
            return names.length ? `import type { ${names.join(', ')} } from '@signal-lab/experience-sdk';` : '';
          },
        );
        next = next.replace(/\bGeneratedPointer\b/g, () => {
          pointerAliases += 1;
          return `GeneratedFrame['pointer']`;
        });
      }
      next = next.replace(/(['"])low\1\s*\|\s*(['"])high\2/g, () => {
        qualityUnions += 1;
        return `'low' | 'balanced' | 'high'`;
      });
      next = next.replace(/(['"])high\1\s*\|\s*(['"])low\2/g, () => {
        qualityUnions += 1;
        return `'high' | 'balanced' | 'low'`;
      });
      next = next.replace(/(['"])low\1\s*\|\s*(['"])medium\2\s*\|\s*(['"])high\3/g, () => {
        qualityUnions += 1;
        return `'low' | 'balanced' | 'high'`;
      });
      next = next.replace(/(['"])high\1\s*\|\s*(['"])medium\2\s*\|\s*(['"])low\3/g, () => {
        qualityUnions += 1;
        return `'high' | 'balanced' | 'low'`;
      });
      next = next.replace(
        /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\.currentTarget\s*;/g,
        (match, variable: string, event: string) => {
          if (!variable.toLowerCase().includes('button')) return match;
          buttonEventTargets += 1;
          return `const ${variable} = ${event}.currentTarget as HTMLButtonElement;`;
        },
      );
      next = next.replace(
        /\bmount\s*\(\s*([A-Za-z_$][\w$]*)\s*:\s*HTMLElement\s*\)\s*\{/g,
        (_match, rootVariable: string) => {
          mountContextAdapters += 1;
          return `mount(sdkContext) {\n    const ${rootVariable} = sdkContext.container;`;
        },
      );
      file.content = next;
    }
    if (guarded) actions.push(`为 ${guarded} 处 scene.background.set 增加 THREE.Color 类型保护`);
    if (pointerAliases) actions.push(`把 ${pointerAliases} 处无效 GeneratedPointer 改为 GeneratedFrame['pointer']`);
    if (qualityUnions) actions.push(`为 ${qualityUnions} 处运行时质量联合类型统一 balanced 档`);
    if (buttonEventTargets) actions.push(`为 ${buttonEventTargets} 处按钮事件 currentTarget 增加非空元素类型收窄`);
    if (mountContextAdapters) actions.push(`把 ${mountContextAdapters} 处 HTMLElement mount 参数适配为 SDK GeneratedMountContext.container`);
  }
  return { value: candidate, actions };
}

async function createCandidateArtifact(
  request: DedicatedCodeRequest,
  rawCandidate: unknown,
  model: string,
  environment: Environment,
): Promise<{ directory: string; report: CandidateRecoveryReport }> {
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const root = resolve(environment.SIGNAL_GENERATION_CANDIDATES_DIR || join(projectRoot, '.artifacts', 'generation-candidates'));
  assertInside(projectRoot, root, '候选保全目录必须位于项目目录内。');
  const safeRunId = safeArtifactSegment(request.runId);
  const directory = resolve(root, safeRunId, 'attempt-01');
  assertInside(root, directory, '候选保全目录越过 artifact 根目录。');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'raw-bundle.json'), stableCandidateJson(rawCandidate), 'utf8');
  const now = new Date().toISOString();
  const report: CandidateRecoveryReport = {
    schemaVersion: 1,
    runId: request.runId,
    selectedId: request.selectedId,
    model,
    status: 'captured',
    artifactPath: normalizeRelative(projectRoot, directory),
    capturedAt: now,
    updatedAt: now,
    finalCategory: null,
    finalFailure: null,
    repairRounds: [],
  };
  await writeCandidateReport(directory, report);
  return { directory, report };
}

async function writeCandidateReport(directory: string, report: CandidateRecoveryReport): Promise<void> {
  await writeFile(join(directory, 'recovery-report.json'), JSON.stringify(report, null, 2), 'utf8');
}

function normalizeCandidatePaths(candidate: Record<string, unknown>): number {
  let changes = 0;
  const collections = [candidate.files, candidate.assets];
  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      if (!isRecord(entry) || typeof entry.path !== 'string') continue;
      const normalized = normalizeCandidatePath(entry.path);
      if (normalized !== entry.path) {
        entry.path = normalized;
        changes += 1;
      }
    }
  }
  return changes;
}

function normalizeCandidatePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/^\/+/, '');
  if (normalized.includes('..') || !/^(?:src|assets)\/[a-zA-Z0-9_./-]+$/.test(normalized)) return path;
  return normalized;
}

function safeArtifactSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return normalized || `run-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function cloneJsonCandidate(value: unknown): unknown {
  try { return JSON.parse(JSON.stringify(value)) as unknown; } catch { return value; }
}

function stableCandidateJson(value: unknown): string {
  try { return JSON.stringify(value, null, 2); } catch { return JSON.stringify({ serializationError: 'Candidate is not JSON serializable.' }, null, 2); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  assertGenerationDeadline(environment);
  const refinementRequest = dedicatedRefinementRequestSchema.parse(input);
  const codexBinary = await findCodexBinary(environment);
  if (!codexBinary) throw new Error('未找到 Codex CLI，不能执行自动视觉精修。');
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const runDirectory = resolve(runsRoot, refinementRequest.id);
  assertInside(runsRoot, runDirectory, '待精修运行越过生成根目录。');
  let currentBundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(runDirectory, 'bundle.json'), 'utf8')) as unknown);
  const storedReport = storedDedicatedReportSchema.parse(JSON.parse(await readFile(join(runDirectory, 'build-report.json'), 'utf8')) as unknown);
  const sourceRequest = dedicatedCodeRequestSchema.parse(storedReport.request);
  const sourceReceipt = dedicatedBuildReceiptSchema.parse(storedReport.receipt);
  let currentReceipt = sourceReceipt;
  const origin = environment.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143';
  const model = dedicatedVisualRefinementModel(environment);
  let sourceReview: CapturedVisualReview | null = null;
  let finalReview: CapturedVisualReview | null = null;
  try {
    const reviewPlan = createVisualReviewPlan(sourceRequest.creativeContract);
    sourceReview = await captureDedicatedVisualReview(refinementRequest.id, origin, environment, reviewPlan);
    await writeVisualReview(runDirectory, sourceReview);
    let preflight = assessVisualQualityPreflight(sourceReview.assessment);
    const localOcclusionRepair = createCanvasOcclusionRepair(currentBundle, sourceReview);
    if (preflight.decision === 'stop' && localOcclusionRepair && allowsLocalCanvasOcclusionRepair(sourceReview.assessment)) {
      const repairedBundle = applyDedicatedRevision(currentBundle, [localOcclusionRepair], sourceRequest);
      const materialized = await validateAndMaterializeDedicatedBundle(sourceRequest, repairedBundle, environment, model, 1);
      finalReview = await captureDedicatedVisualReview(materialized.bundle.id, origin, environment, reviewPlan);
      await writeVisualReview(resolve(projectRoot, materialized.receipt.directory), finalReview);
      await cleanupCapturedVisualReview(sourceReview);
      sourceReview = finalReview;
      finalReview = null;
      currentBundle = materialized.bundle;
      currentReceipt = materialized.receipt;
      preflight = assessVisualQualityPreflight(sourceReview.assessment);
    }
    const localAnchorRepair = createCanvasVisualAnchorRepair(currentBundle, sourceReview);
    if (preflight.decision === 'stop' && localAnchorRepair && allowsLocalCanvasVisualAnchorRepair(sourceReview.assessment)) {
      const repairedBundle = applyDedicatedRevision(currentBundle, [localAnchorRepair], sourceRequest);
      const materialized = await validateAndMaterializeDedicatedBundle(sourceRequest, repairedBundle, environment, model, 1);
      finalReview = await captureDedicatedVisualReview(materialized.bundle.id, origin, environment, reviewPlan);
      await writeVisualReview(resolve(projectRoot, materialized.receipt.directory), finalReview);
      await cleanupCapturedVisualReview(sourceReview);
      sourceReview = finalReview;
      finalReview = null;
      currentBundle = materialized.bundle;
      currentReceipt = materialized.receipt;
      preflight = assessVisualQualityPreflight(sourceReview.assessment);
    }
    if (preflight.decision === 'stop') {
      const visualAcceptance = preflightRejectionAcceptance(sourceReview.assessment, preflight.summary);
      await writeVisualReview(resolve(projectRoot, currentReceipt.directory), sourceReview, visualAcceptance);
      const result = {
        status: 'rejected' as const,
        parentId: refinementRequest.id,
        receipt: currentReceipt,
        sourceAssessment: sourceReview.assessment,
        finalAssessment: sourceReview.assessment,
        visualAcceptance,
        summary: preflight.summary,
        resolved: [],
        remaining: sourceReview.assessment.findings.map((finding) => finding.message)
      };
      await recordRefinementResult(currentReceipt.directory, {
        ...result,
        selectedId: currentReceipt.id,
        model
      }, projectRoot);
      return result;
    }

    assertGenerationDeadline(environment);
    const sourceAcceptance = await runCodexVisualAcceptance(codexBinary, sourceRequest, currentBundle, sourceReview, environment);
    await writeVisualReview(resolve(projectRoot, currentReceipt.directory), sourceReview, sourceAcceptance);
    if (isFinalVisualCandidateEligible(sourceReview.assessment, sourceAcceptance)) {
      await recordRefinementResult(currentReceipt.directory, {
        status: 'kept', parentId: refinementRequest.id, selectedId: currentReceipt.id, model,
        sourceAssessment: sourceReview.assessment, finalAssessment: sourceReview.assessment, visualAcceptance: sourceAcceptance,
        summary: sourceAcceptance.summary, resolved: [], remaining: []
      }, projectRoot);
      return {
        status: 'kept', parentId: refinementRequest.id, receipt: currentReceipt,
        sourceAssessment: sourceReview.assessment, finalAssessment: sourceReview.assessment, visualAcceptance: sourceAcceptance,
        summary: sourceAcceptance.summary, resolved: [], remaining: []
      };
    }
    const opportunity = assessVisualRefinementOpportunity(sourceAcceptance);
    if (opportunity.decision === 'stop') {
      const result = {
        status: 'rejected' as const,
        parentId: refinementRequest.id,
        receipt: currentReceipt,
        sourceAssessment: sourceReview.assessment,
        finalAssessment: sourceReview.assessment,
        visualAcceptance: sourceAcceptance,
        summary: opportunity.summary,
        resolved: [],
        remaining: sourceAcceptance.findings.map((finding) => finding.message)
      };
      await recordRefinementResult(currentReceipt.directory, {
        ...result,
        selectedId: currentReceipt.id,
        model
      }, projectRoot);
      return result;
    }
    const evidenceFailure = visualAcceptanceFailure(sourceAcceptance);

    let response: Awaited<ReturnType<typeof runCodexVisualRefinement>>;
    try {
      assertGenerationDeadline(environment);
      response = await runCodexVisualRefinement(codexBinary, sourceRequest, currentBundle, sourceReview, environment, evidenceFailure);
    } catch (error) {
      const refinementFailure = cleanError(error);
      const result = {
        status: 'rejected' as const,
        parentId: refinementRequest.id,
        receipt: currentReceipt,
        sourceAssessment: sourceReview.assessment,
        finalAssessment: sourceReview.assessment,
        visualAcceptance: sourceAcceptance,
        summary: `独立视觉验收已完成；唯一精修未在时限内形成可验证结果，保留原页面并停止：${refinementFailure}`,
        resolved: [],
        remaining: [
          ...sourceAcceptance.findings.map((finding) => finding.message),
          `唯一精修停止：${refinementFailure}`
        ]
      };
      await recordRefinementResult(currentReceipt.directory, {
        ...result,
        selectedId: currentReceipt.id,
        model
      }, projectRoot);
      return result;
    }
    if (response.decision === 'keep') {
      if (response.bundle) throw new Error('保留决定不应返回修订 bundle。');
      throw new Error(`当前版本已有明确未通过证据，唯一精修机会不能选择 keep：${evidenceFailure}`);
    }
    if (!response.bundle) throw new Error('唯一精修决定缺少 bundle。');

    const materialized = await validateAndMaterializeDedicatedBundle(sourceRequest, canonicalizeBundle(response.bundle, sourceRequest), environment, model, 1);
    assertGenerationDeadline(environment);
    finalReview = await captureDedicatedVisualReview(materialized.bundle.id, origin, environment, reviewPlan);
    const candidateDirectory = resolve(projectRoot, materialized.receipt.directory);
    await writeVisualReview(candidateDirectory, finalReview);
    if (finalReview.assessment.verdict !== 'pass') {
      const failure = `唯一精修的机械复验未通过：${finalReview.assessment.verdict}（${finalReview.assessment.score} 分）— ${finalReview.assessment.summary}`;
      await recordRefinementResult(materialized.receipt.directory, {
        status: 'rejected', parentId: refinementRequest.id, selectedId: currentReceipt.id, model,
        sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment,
        summary: response.summary, resolved: response.resolved, remaining: [...response.remaining, failure]
      }, projectRoot);
      throw new Error(failure);
    }
    assertGenerationDeadline(environment);
    const visualAcceptance = await runCodexVisualAcceptance(codexBinary, sourceRequest, materialized.bundle, finalReview, environment);
    await writeVisualReview(candidateDirectory, finalReview, visualAcceptance);
    if (!isFinalVisualCandidateEligible(finalReview.assessment, visualAcceptance)) {
      const failure = visualAcceptanceFailure(visualAcceptance);
      await recordRefinementResult(materialized.receipt.directory, {
        status: 'rejected', parentId: refinementRequest.id, selectedId: currentReceipt.id, model,
        sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
        summary: response.summary, resolved: response.resolved, remaining: [...response.remaining, failure]
      }, projectRoot);
      throw new Error(`唯一精修未通过最终视觉验收：${failure}`);
    }
    await recordRefinementResult(materialized.receipt.directory, {
      status: 'refined', parentId: refinementRequest.id, selectedId: materialized.receipt.id, model,
      sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
      summary: response.summary, resolved: response.resolved, remaining: response.remaining
    }, projectRoot);
    await recordRefinementResult(currentReceipt.directory, {
      status: 'refined', parentId: refinementRequest.id, selectedId: materialized.receipt.id, model,
      sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
      summary: response.summary, resolved: response.resolved, remaining: response.remaining
    }, projectRoot);
    return {
      status: 'refined', parentId: refinementRequest.id, receipt: materialized.receipt,
      sourceAssessment: sourceReview.assessment, finalAssessment: finalReview.assessment, visualAcceptance,
      summary: response.summary, resolved: response.resolved, remaining: response.remaining
    };
  } finally {
    if (finalReview) await cleanupCapturedVisualReview(finalReview);
    if (sourceReview) await cleanupCapturedVisualReview(sourceReview);
  }
}

export async function auditDedicatedVisualEvidence(
  input: unknown,
  environment: Environment = process.env
): Promise<DedicatedVisualAuditResult> {
  const auditRequest = dedicatedRefinementRequestSchema.parse(input);
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  const runDirectory = resolve(runsRoot, auditRequest.id);
  assertInside(runsRoot, runDirectory, '待评审运行越过生成根目录。');
  const storedReport = storedDedicatedReportSchema.parse(JSON.parse(await readFile(join(runDirectory, 'build-report.json'), 'utf8')) as unknown);
  const review = await captureDedicatedVisualReview(
    auditRequest.id,
    environment.SIGNAL_PREVIEW_ORIGIN || 'http://127.0.0.1:8143',
    environment,
    createVisualReviewPlan(storedReport.request.creativeContract)
  );
  try {
    await writeVisualReview(runDirectory, review);
    return { plan: review.plan, evidence: review.evidence, assessment: review.assessment };
  } finally {
    await cleanupCapturedVisualReview(review);
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
  const review = await captureDedicatedVisualReview(
    request.id,
    origin,
    environment,
    createVisualReviewPlan(sourceRequest.creativeContract)
  );
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
  let retainedAcceptance = visualAcceptance;
  if (!retainedAcceptance) {
    try {
      const existing = JSON.parse(await readFile(join(directory, 'visual-review.json'), 'utf8')) as { visualAcceptance?: unknown };
      const parsed = visualAcceptanceSchema.safeParse(existing.visualAcceptance);
      if (parsed.success) retainedAcceptance = parsed.data;
    } catch {
      // A first review has no prior independent acceptance to retain.
    }
  }
  await writeFile(join(directory, 'visual-review.json'), JSON.stringify({
    plan: review.plan,
    evidence: review.evidence,
    assessment: review.assessment,
    ...(retainedAcceptance ? { visualAcceptance: retainedAcceptance } : {})
  }, null, 2), 'utf8');
}

function visualAcceptanceFailure(acceptance: VisualAcceptance): string {
  const detail = acceptance.findings.filter((finding) => finding.severity === 'major').map((finding) => finding.message).join('；');
  return `最终视觉验收未通过：${acceptance.score} 分—${acceptance.summary}${detail ? `；${detail}` : ''}`;
}

function preflightRejectionAcceptance(assessment: VisualReviewAssessment, summary: string): VisualAcceptance {
  const codeOf = (finding: VisualReviewAssessment['findings'][number]): VisualAcceptance['findings'][number]['code'] => {
    if (finding.code.startsWith('semantic-')) return 'interaction-causality-weak';
    if (finding.code.startsWith('mobile-') || finding.code === 'horizontal-overflow') return 'mobile-composition-weak';
    if (finding.code === 'text-collision'
      || finding.code === 'opening-heading-missing'
      || finding.code === 'heading-dominance-forbidden') return 'copy-obstructed';
    return 'structure-mode-mismatch';
  };
  return visualAcceptanceSchema.parse({
    schemaVersion: 1,
    verdict: 'revise',
    score: Math.min(79, assessment.score),
    assetRole: 'not-applicable',
    summary,
    findings: assessment.findings.slice(0, 16).map((finding) => ({
      code: codeOf(finding),
      severity: finding.severity === 'minor' ? 'minor' : 'major',
      frameId: finding.frameId,
      message: finding.message
    }))
  });
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
  assertGenerationDeadline(environment);
  const request = dedicatedCodeRequestSchema.parse(input);
  const bundle = assertGeneratedExperienceBundle(value);
  const usedAssetCount = assertApprovedAssetUsage(request, bundle);
  const mediaDominance = assertMediaDominance({
    creativeContract: request.creativeContract,
    assets: request.reference.assets,
    bundle,
  });
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  const runsRoot = resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs'));
  assertInside(projectRoot, runsRoot, '生成目录必须位于项目目录内。');
  const runDirectory = resolve(runsRoot, bundle.id);
  const stagingPrefix = resolve(runsRoot, `.staging-${bundle.id}-${process.pid}-`);
  assertInside(runsRoot, runDirectory, 'bundle 目录越过生成根目录。');
  assertInside(runsRoot, stagingPrefix, 'staging 目录越过生成根目录。');
  await mkdir(runsRoot, { recursive: true });
  const staging = await mkdtemp(stagingPrefix);
  const compileStarted = Date.now();
  try {
    for (const file of bundle.files) {
      const target = resolve(staging, file.path);
      assertInside(staging, target, `生成文件越过 bundle 目录：${file.path}`);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, 'utf8');
    }
    await writeFile(join(staging, 'bundle.json'), JSON.stringify(bundle, null, 2), 'utf8');
    const diagnostics = await compileDedicatedSources(
      staging,
      projectRoot,
      bundle,
      clampTimeoutToGenerationDeadline(environment, 45_000),
    );
    if (diagnostics.length) throw new Error(`TypeScript 编译失败：${diagnostics.slice(0, 6).join('；')}`);
    const compileMs = Date.now() - compileStarted;
    const summary = generatedBundleSummary(bundle);
    const receipt: DedicatedBuildReceipt = {
      id: bundle.id, provider: 'codex', model, status: 'compiled', previewUrl: `/generated-runs/${bundle.id}/`, generatedAt: new Date().toISOString(),
      ...summary, assets: usedAssetCount, compileMs, attempts, directory: normalizeRelative(projectRoot, runDirectory)
    };
    await writeFile(join(staging, 'build-report.json'), JSON.stringify({ receipt, request, mediaDominance, usedAssets: request.reference.assets?.filter((asset) => bundleUsesUri(bundle, asset.uri)) || [] }, null, 2), 'utf8');
    await publishDedicatedRun(staging, runDirectory);
    await rm(staging, { recursive: true, force: true });
    return { bundle, receipt };
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function publishDedicatedRun(staging: string, runDirectory: string): Promise<void> {
  const previous = dedicatedRunPublicationLocks.get(runDirectory) || Promise.resolve();
  let release = (): void => undefined;
  const current = new Promise<void>((resolveLock) => { release = resolveLock; });
  const tail = previous.then(() => current, () => current);
  dedicatedRunPublicationLocks.set(runDirectory, tail);
  await previous.catch(() => undefined);
  try {
    await rm(runDirectory, { recursive: true, force: true });
    await mkdir(runDirectory, { recursive: true });
    await cp(staging, runDirectory, { recursive: true, force: false, errorOnExist: true });
  } finally {
    release();
    if (dedicatedRunPublicationLocks.get(runDirectory) === tail) {
      dedicatedRunPublicationLocks.delete(runDirectory);
    }
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

export function createCanvasOcclusionRepair(
  bundle: GeneratedExperienceBundle,
  review: Pick<CapturedVisualReview, 'evidence' | 'assessment'>,
): { path: string; content: string } | null {
  const hasBlockingOcclusion = review.assessment.findings.some((finding) => (
    finding.code === 'canvas-occluded' && finding.severity === 'blocking'
  ));
  if (!hasBlockingOcclusion) return null;
  const selectors = new Set<string>();
  for (const frame of review.evidence.frames) {
    if (!frame.canvasOcclusionRisk || (frame.canvasOcclusionRatio || 0) < .94) continue;
    const firstClass = (frame.canvasOccludingLayer || '').match(/\.([A-Za-z][A-Za-z0-9_-]*)/);
    if (firstClass) selectors.add(`.${firstClass[1]}`);
  }
  if (!selectors.size) return null;
  const css = bundle.files.find((file) => file.path === 'src/page.css' && file.language === 'css');
  if (!css || css.content.includes('signal-local-repair:canvas-occlusion')) return null;
  const selectorList = [...selectors].sort().join(',');
  return {
    path: css.path,
    content: `${css.content}\n/* signal-local-repair:canvas-occlusion */\n${selectorList}{background-color:transparent!important;background-image:none!important}\n`,
  };
}

export function allowsLocalCanvasOcclusionRepair(assessment: VisualReviewAssessment): boolean {
  const hasBlockingOcclusion = assessment.findings.some((finding) => (
    finding.code === 'canvas-occluded' && finding.severity === 'blocking'
  ));
  if (!hasBlockingOcclusion) return false;
  // A hidden canvas also makes the causal probe report a static journey. Allow
  // one deterministic transparency repair when those are the only findings;
  // unrelated composition, runtime or heading failures still require a real
  // revision and must never be papered over by CSS.
  return assessment.findings.every((finding) => (
    finding.code === 'canvas-occluded'
    || finding.code === 'primary-journey-unverified'
  ));
}

export function createCanvasVisualAnchorRepair(
  bundle: GeneratedExperienceBundle,
  review: Pick<CapturedVisualReview, 'evidence' | 'assessment'>,
): { path: string; content: string } | null {
  const needsAnchor = review.assessment.findings.some((finding) => finding.code === 'primary-journey-unverified')
    && review.evidence.frames.some((frame) => frame.canvasCount > 0 && frame.subjectCaptureAvailable === false);
  if (!needsAnchor) return null;
  const experience = bundle.files.find((file) => file.path === 'src/experience.ts' && file.language === 'typescript');
  if (!experience || !experience.content.includes('data-signal-visual-anchor') || !experience.content.includes('context.canvas')) return null;
  if (/context\.canvas\.(?:dataset\.signalVisualAnchor|setAttribute\(['"]data-signal-visual-anchor['"])/.test(experience.content)) return null;
  const withoutProxy = experience.content.replace(/\sdata-signal-visual-anchor(?:=(?:"[^"]*"|'[^']*'))?/g, '');
  const marker = 'context.container.appendChild(root);';
  if (!withoutProxy.includes(marker)) return null;
  return {
    path: experience.path,
    content: withoutProxy.replace(
      marker,
      `${marker}\n    context.canvas.setAttribute('data-signal-visual-anchor', 'true'); // signal-local-repair:canvas-visual-anchor`,
    ),
  };
}

export function allowsLocalCanvasVisualAnchorRepair(assessment: VisualReviewAssessment): boolean {
  const causalFindings = assessment.findings.filter((finding) => finding.code === 'primary-journey-unverified');
  return causalFindings.length > 0
    && assessment.findings.every((finding) => finding.code === 'primary-journey-unverified');
}

function assertApprovedAssetUsage(request: DedicatedCodeRequest, bundle: GeneratedExperienceBundle): number {
  const approved = request.reference.assets || [];
  if (!approved.length && bundle.assets.length) throw new Error('当前是无素材任务，但生成 bundle 声明了不存在的素材。');
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
    const timeout = clampTimeoutToGenerationDeadline(
      environment,
      numberFrom(environment.CODEX_REVISION_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 240_000),
    );
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
    request.creativeContract ? `V2 Codex execution brief: ${serializeCodexExecutionBrief(request.creativeContract)}` : '',
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
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(dedicatedAuthoringModelResponseSchema, { target: 'draft-7' })), 'utf8');
    const args = ['exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never', '--output-schema', schemaPath, '--output-last-message', outputPath];
    const model = dedicatedAuthoringModel(environment, request.quality);
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_AUTHORING_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', `model_reasoning_effort=${readReasoning(environment.CODEX_AUTHORING_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT)}`, '-');
    const result = await runProcess(
      codexBinary,
      args,
      dedicatedCompactCodePrompt(request, previousFailure),
      directory,
      clampTimeoutToGenerationDeadline(
        environment,
        numberFrom(environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS, 300_000),
      ),
    );
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return completeDedicatedAuthoringResponse(request, JSON.parse(await readFile(outputPath, 'utf8')) as unknown);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}

export function dedicatedCompactCodePrompt(request: DedicatedCodeRequest, previousFailure: string): string {
  const contract = request.creativeContract;
  const execution = contract ? createCodexExecutionBrief(contract) : null;
  const compactExecution = execution ? {
    goal: execution.goal,
    instructions: execution.instructions,
    references: execution.references.map((reference) => ({
      id: reference.id,
      title: reference.title,
      positiveBorrowPrinciples: reference.positiveBorrowPrinciples,
      observedMechanism: reference.observedMechanism,
      relevanceReason: reference.relevanceReason,
      confidence: reference.confidence,
      advisoryRisks: reference.advisoryRisks,
    })),
    authoring: execution.authoring,
    story: {
      structure: execution.story.structure,
      thesis: execution.story.thesis,
      continuity: execution.story.continuity,
      pointer: execution.story.pointer,
      reducedMotion: execution.story.reducedMotion,
      visualAnchor: execution.story.visualAnchor,
      beats: execution.story.beats,
    },
    direction: {
      renderer: execution.direction.renderer,
      interaction: execution.direction.interaction,
    },
    technical: {
      interactionDriver: execution.technical.interactionDriver,
      productSemanticFeedback: execution.technical.productSemanticFeedback,
      sceneComposition: execution.technical.sceneComposition,
      styleFingerprint: execution.technical.styleDiversity.fingerprint,
      structureDirection: execution.technical.styleDiversity.structureDirection,
      domResponsibilities: execution.technical.domResponsibilities,
      webglResponsibilities: execution.technical.webglResponsibilities,
    },
    blockers: execution.acceptance.filter((item) => item.priority === 'blocker'),
    limits: execution.limits,
  } : null;
  const assets = (request.reference.assets || []).map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    bundlePath: asset.bundlePath,
    kind: asset.kind,
    role: asset.role,
    required: asset.required ?? false,
    qualityLevel: asset.qualityLevel,
    features: asset.features,
    experience: asset.experience,
  }));
  const retry = previousFailure
    ? `上次候选未通过：${previousFailure.slice(0, 500)}。从头返回更小、更保守且可编译的四文件响应。`
    : '';
  return [
    '你是资深创意技术总监和严格 TypeScript 工程师。目标是在一次响应内落下可运行、主题专属、非模板换参的网页首稿。',
    '只返回 JSON 对象 {"files":[...]}。服务器会补齐 id、assets 和运行合同；不要返回这些元数据、markdown、解释或备用文件。',
    'files 必须恰好是 src/experience.ts、src/scene.ts、src/director.ts、src/page.css。源码总量目标不超过 18KB。',
    '',
    `brief: ${request.brief}`,
    `seed: ${request.seed}; quality: ${request.quality}`,
    compactExecution ? `执行边界: ${JSON.stringify(compactExecution)}` : `参考方向: ${JSON.stringify(request.reference)}`,
    assets.length ? `获批素材: ${JSON.stringify(assets)}` : '获批素材: []',
    '',
    '工程与体验硬规则：',
    '- experience.ts 从 @signal-lab/experience-sdk 导入 defineExperience 与 startExperience，并调用 startExperience(defineExperience({ mount, update, resize, dispose }))。使用严格 TypeScript；禁止 any、@ts-ignore、fetch、动态 import、额外动画循环和 setInterval。',
    '- page.css 由宿主加载，不在 TypeScript 中导入。DOM 负责可读内容、真实控件、结果和最终行动；scene.ts 只承担合同声明的 Canvas/Three.js 增强，没有必要时保持轻量空增强。',
    '- 用 data-signal-visual-anchor 标记真正产生像素差异的最小主体；用 data-signal-primary-control、data-signal-primary-result、data-signal-primary-action 标记真实控制、结果和行动。它们必须共享一个目标状态。',
    '- 主要操作必须同时改变可见主体关系与业务结果；只切换文字、数字、active class、整体透明度、缩放、模糊或镜头不算完成。拖拽必须有清晰落区、键盘替代、人工输入后停止自动演示。',
    '- required 素材必须实际引用 uri 并可见承担 role。alpha-subject 保持透明轮廓且可独立定位；full-bleed-environment 保持比例覆盖工作区；禁止中央硬矩形贴图、棋盘格、占位几何或无关粒子。',
    '- 若单张透明图集包含多个分离主体，必须用裁切窗口、object-position 或背景定位把每个主体隔离显示；禁止在多个控件里重复铺开整张图集，也不能让透明图层拦截拖拽或点击。',
    '- 最终交付禁止红框、箭头、辅助线、坐标、调试文字、素材说明和评审批注。不了解行业的用户应在约 10 秒内看懂对象、操作、结果和行动。',
    '- instructions.hard 是唯一创意硬约束；instructions.advisory、references、styleFingerprint 与 structureDirection 都是可组合或放弃的建议，不能覆盖当前 brief。',
    '- 页面结构由内容和操作关系自主决定。三栏、三屏、巨型标题、暗色科技等形式都不是默认答案，也不是全局禁令；只有服务当前目标时才采用。390px 手机必须完成同一核心任务；reducedMotion 和 WebGL/素材失败时仍可读可操作。',
    '- 使用同一主体、机位、尺度和光向建立连续性。素材与背景必须像同一空间；质量来自构图、层级和因果反馈，不来自代码长度或技术堆叠。',
    '- 若使用 Three.js，复用 SDK 的 update/resize/dispose 生命周期并释放资源；媒体主导路线禁止用基础几何遮挡清晰素材。',
    retry,
  ].filter(Boolean).join('\n');
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
    const model = dedicatedVisualRefinementModel(environment);
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_VISUAL_REFINEMENT_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', 'model_reasoning_effort=' + readReasoning(environment.CODEX_VISUAL_REFINEMENT_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT), '-');
    const timeout = clampTimeoutToGenerationDeadline(
      environment,
      boundedVisualModelTimeout(environment.VISUAL_REFINEMENT_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS || environment.CREATIVE_MODEL_TIMEOUT_MS),
    );
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
    await writeFile(schemaPath, JSON.stringify(z.toJSONSchema(visualAcceptanceModelResponseSchema, { target: 'draft-7' })), 'utf8');
    const args = [
      'exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never',
      '--output-schema', schemaPath, '--output-last-message', outputPath, '-i', ...review.imagePaths
    ];
    const model = environment.CODEX_VISUAL_ACCEPTANCE_MODEL || environment.CODEX_VISUAL_REFINEMENT_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-sol';
    if (!/^[A-Za-z0-9._:-]+$/.test(model)) throw new Error('CODEX_VISUAL_ACCEPTANCE_MODEL 包含不安全字符。');
    args.push('--model', model, '-c', 'model_reasoning_effort=' + readReasoning(environment.CODEX_VISUAL_ACCEPTANCE_REASONING_EFFORT || environment.CODEX_VISUAL_REFINEMENT_REASONING_EFFORT || environment.CODEX_CREATIVE_REASONING_EFFORT), '-');
    const timeout = clampTimeoutToGenerationDeadline(
      environment,
      boundedVisualModelTimeout(environment.VISUAL_ACCEPTANCE_TIMEOUT_MS || environment.VISUAL_REFINEMENT_TIMEOUT_MS || environment.DEDICATED_CODE_TIMEOUT_MS),
    );
    const result = await runProcess(codexBinary, args, visualAcceptancePrompt(request, bundle, review), directory, timeout);
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    return visualAcceptanceModelResponseSchema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);
  } finally {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }).catch(() => undefined);
  }
}

function visualAcceptancePrompt(request: DedicatedCodeRequest, bundle: GeneratedExperienceBundle, review: CapturedVisualReview): string {
  return [
    '你是独立的最终视觉验收人，不负责写代码，也不能相信生成模型对自身结果的描述。附件按 V2 story.beats 派生，并包含移动端减弱动效基线；只有合同选择语义交互或 WebGL 增强时，才包含对应交互/无 WebGL 回退状态，数量不是固定四张。只返回符合 JSON Schema 的验收结果。',
    '附件状态：', visualFrameDescription(review),
    '',
    '按以下顺序判断：',
    '0. 必须填写 dimensions 六项分数。先判断 V2 experience.structure.mode 与 layoutRule 是否真的适合产品目标；story.beats 是语义状态，不是必须对应相同数量的全屏 DOM 章节。若页面机械复制成固定三屏、固定 hero/process/final，或视觉状态与产品任务无关，structureFit 必须低于 75，并加入 structure-mode-mismatch。',
    '1. 构图是否有唯一、可信且符合 story.visualAnchor 的主题视觉焦点，文字与主体是否形成同一画面；纯色、通用网格、无主题依据的渐变、随机粒子或无关几何不能单独算作主视觉。',
    '2. 已获批素材是否按照 brief 和 role 成为主体、环境或支持层；仅加载、躲在暗处、被程序化几何遮挡都不算有效使用。',
    '3. 是否存在明显矩形边缘、贴图感、占位球体/蛋形/圆柱、拉伸失真或素材与背景割裂。对于茶杯、器物、设备、家具等可辨认实体，还必须检查定义性轮廓、比例、连接关系、厚度、接地和受光；圆柱与圆环等草模拼接若破坏主体辨识，加入 placeholder-dominant 且 severity=major，productIntent 不得高于 65。',
    '4. 各关键状态是否保持主体/空间连续，并让变化表达对应叙事，而不是随机线条、粒子、几何堆积或互不相关的换图。若连续素材的主体尺度、锚点或裁切跳变，或关键连接部位在相邻状态不匹配，加入 subject-crop-unstable。',
    '5. 从非行业专家视角，是否能在约 10 秒内说清楚“核心对象是什么、用户能做什么、操作后业务结果是什么”。若只能看到专业参数、抽象效果或宣传文案，productIntent 必须低于 80，并加入 business-loop-unclear。',
    '6. 交互是否造成足够明显、可归因的产品状态变化；装饰性鼠标跟随、按钮高亮、数字或说明文字变化不能替代主体/场景变化。视觉反馈过弱时加入 feedback-delta-weak，模式、Cue、预设、路线或方案只改文案而不改底层状态时加入 interaction-causality-weak。',
    '7. 专业数值、评分、照度、距离、比例或状态证据是否与完整目标状态同源。简单公式或随机数若被包装成真实业务结论且未明确标注估算，加入 pseudo-evidence。',
    '8. 自动演示是否与用户操作边界清楚；自动循环、鼠标选项或持续变化不得让用户无法判断是谁造成结果。',
    '9. 末段是否完成收束并保持文案、CTA 可读；移动端和减弱动效状态是否仍有清楚焦点，并能完成与桌面等价的主要控件→结果→行动路径，而不是横向工作台的裁切局部。任何面向开发或评审的箭头、红框、坐标、标签、辅助线、调试文字或批注若进入交付画面，加入 debug-artifact-visible，severity=major。',
    '10. 只有已经可以作为该 brief 最终作品、综合 score 不低于 88、productIntent 与 structureFit 均不低于 80、其他 dimensions 不低于 75 的页面才能 verdict=pass。',
    '',
    '原始 brief：', request.brief,
    'V2 Codex 执行包：', request.creativeContract ? serializeCodexExecutionBrief(request.creativeContract) : 'null',
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
    '你是负责最终成片质量的创意技术总监。附件按 V2 story.beats 派生，并包含移动端减弱动效基线；只有合同选择语义交互或 WebGL 增强时，才包含对应交互/无 WebGL 回退状态，数量不是固定四张。',
    '附件状态：' + visualFrameDescription(review),
    '请结合原始 brief、机械证据和当前完整代码，决定保留当前版本还是做一次有明确证据的修订。只返回符合 JSON Schema 的对象。',
    '',
    '判断规则：',
    '- 先检查构图、唯一焦点、文字与 WebGL 主体关系、滚动结构事件、最终英雄画面，再检查字体、颜色、材质、深度、密度和运动。',
    '- 如果截图已经有清楚的阅读顺序、可信视觉锚点和稳定最终构图，decision=keep，bundle=null；不要为了显示工作量而改代码。',
    '- 机械证据中的 findings 是结构或交互缺陷；observations 中的 editorial-overlap 只是创意叠层提示，不能单独作为修订理由，必须以截图中的阅读顺序和构图意图为准。',
    '- 如果截图中存在真正妨碍阅读或交互的重叠、主体像占位符、素材边界、首屏失焦、章节重复、手机裁切或最终画面弱，decision=revise，并返回完整可编译 bundle。',
    '- 如果交付截图中残留箭头、红框、辅助线、坐标、调试文字或评审批注，必须移除对应交付层；不能把批注当成产品 UI。',
    '- 连续状态必须保持主体尺度、锚点、镜位和定义性连接部位一致。若两张素材本身无法匹配，不得用文字掩盖，应选用一个可信锚点重构变化或停止为待评审。',
    '- 页面必须让非行业专家在约 10 秒内理解核心对象、可执行操作和业务结果；不能用专业参数、抽象效果或宣传文案代替业务闭环。',
    '- 当核心对象是茶杯、器物、设备、家具等可辨认实体，优先修复定义性轮廓、比例、连接、厚度、接地和受光；圆柱、蛋形、球体或圆环拼接的草模不得通过最终验收。若已有获批参考素材，必须用它校正形体或让它承担可见主体。',
    '- 模式、Cue、预设、路线或方案按钮必须修改对应底层状态与主体画面；只更新按钮样式、数字或说明文字属于阻断缺陷。专业指标必须与完整目标状态同源，估算值必须明确标注。',
    '- 修订必须保持原 brief、语义内容和已获批素材来源，不得凭空增加图片、模型、音频或外部 URL。',
    '- 不得用 html/body/#app 的 overflow:hidden 或仅 100vh 固定高度来消除横向溢出；必须保留至少约 80vh 的桌面有效纵向滚动行程，同时用 margin:0、box-sizing:border-box、max-width:100% 和 overflow-x:hidden/clip 解决横向边界。',
    '- 任何 CSS 修订都必须同时保留机械证据中全部桌面关键状态可达；不能修复边界后让 generated progress 停在 0 或只剩几十像素滚动距离。',
    '- 若截图显示程序化几何压过获批主体、全幅环境只剩局部、终局素材缺席或移动端出现贴图矩形，必须优先重做素材层级与 cover/contain 逻辑；不能只调整文字、边距、颜色或继续增加粒子和线条。',
    '- 保持 @signal-lab/experience-sdk 生命周期；不得新增 requestAnimationFrame、网络、存储、动态导入或非白名单模块。',
    '- 保留可读 DOM、移动端、quality=low、reducedMotion、WebGL 失败回退和完整 dispose。',
    '- 只修有证据的问题，优先调整构图和状态导演，不要无理由彻底换风格。',
    '',
    '原始 brief：', request.brief,
    'V2 Codex 执行包：', request.creativeContract ? serializeCodexExecutionBrief(request.creativeContract) : 'null',
    '机械证据：', JSON.stringify({ evidence: review.evidence, assessment: review.assessment }),
    '当前 bundle：', JSON.stringify(bundle),
    previousFailure ? '上一次修订失败：' + previousFailure + '。请返回更保守、类型完整的新修订。' : ''
  ].join('\n');
}

function visualFrameDescription(review: CapturedVisualReview): string {
  return review.evidence.frames.map((frame, index) => (
    `${index + 1}. ${frame.id} · ${frame.viewport.width}×${frame.viewport.height} · progress ${frame.progress.toFixed(2)} · ${review.plan.checkpoints.find((checkpoint) => checkpoint.id === frame.id)?.label || '兼容状态'} · action ${frame.action || 'none'}${frame.subjectChangeExpected ? ` · subject ${frame.subjectChanged ? 'changed' : 'static/unverified'} · delta ${((frame.subjectDelta || 0) * 100).toFixed(1)}% · anchor ${frame.subjectSelector || 'missing'}` : ''}${frame.mobileTaskPath ? ` · mobile task ${frame.mobileTaskPath.reachableControlCount}/${frame.mobileTaskPath.controlCount} control, ${frame.mobileTaskPath.reachableResultCount}/${frame.mobileTaskPath.resultCount} result, ${frame.mobileTaskPath.reachableActionCount}/${frame.mobileTaskPath.actionCount} action` : ''}`
  )).join('；');
}

export function dedicatedCodePrompt(request: DedicatedCodeRequest, previousFailure: string): string {
  const sourceBudgetKb = request.quality === 'high' ? 40 : request.quality === 'balanced' ? 28 : 18;
  const approvedAssets = request.reference.assets || [];
  const authoringAssets = approvedAssets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    bundlePath: asset.bundlePath,
    kind: asset.kind,
    source: asset.source,
    qualityLevel: asset.qualityLevel,
    features: asset.features,
    role: asset.role,
    required: asset.required,
    experience: asset.experience,
  }));
  const creativeContract = request.creativeContract;
  const mediaLedRoute = creativeContract && creativeContract.direction.renderer.route !== 'dom-three-hybrid';
  const stateChangeContract = creativeContract?.technical.stateAssetStrategy.required
    && creativeContract.technical.stateAssetStrategy.changeKind !== 'none'
    ? [
        '- 本次合同要求实体状态变化。把持续承担装配、拆解或结构形变的最小视觉根节点标记为 data-signal-visual-anchor；该节点必须只包含主体/环境增强层，不包含标题、说明卡或 CTA。',
        '- 每个 story beat 都要让该视觉根节点产生足够明显、可归因的主体差异；只改变文案、箭头、裁切、整体缩放、模糊或镜头位置不能算作实体状态完成。'
      ]
    : [];
  const semanticInteractionContract = creativeContract?.technical.semanticInteraction.selected
    ? [
        '- 本次合同要求语义交互。把不包含标题、说明卡或 CTA 的最小主体/场景根节点标记为 data-signal-visual-anchor；主要参数或高层操作后，该节点必须产生无需依赖数字和说明文字也能辨认的差异。',
        '- 核心对象或主要可变场必须成为工作区最大、最清晰的视觉焦点，不能缩成图标或淹没在大面积通用背景中；控件、数字和说明不得比被操作主体更抢眼。',
        '- 在提交前用至少一组参数极值或两个相反状态自检：轮廓、姿态、轨迹、覆盖范围、材质或光照中至少一项必须在正常浏览尺度下明显改变，不能只让内部变量和 DOM 文案变化。',
        '- 分别用 data-signal-primary-control、data-signal-primary-result、data-signal-primary-action 标记核心控件、结果和最终行动。390px 移动端必须沿纵向完成同一任务路径，不能只显示横向桌面工作台的裁切局部。'
      ]
    : [];
  const continuousCanvasContract = creativeContract?.experience.structure.mode === 'continuous-canvas'
    ? [
        '- 本次合同是 continuous-canvas：opening、middle 与 final 必须持续显示同一个 data-signal-visual-anchor 主体；状态可以变化，但主体身份、核心轮廓与空间坐标不能在终点消失。',
        '- story beats 只能是持续视觉场中的状态锚点；禁止用多个不透明的 min-height/full-viewport hero、process、final 面板机械对应 beats，也禁止通过整屏纯色切换伪造连续画布。',
        '- final 必须保留同一主体，并把 authoring.primaryJourney.businessResult 变成可见对象、排列、路径或状态证据；纯色背景加标题、说明和 CTA，或只更新结果文案，不能作为完成。'
      ]
    : [];
  const v2Contract = creativeContract ? [
    '', 'V2 Codex 执行包（唯一执行边界；完整研究合同只留档）：', serializeCodexAuthoringBrief(creativeContract),
    '- instructions.hard 是当前任务唯一创意硬约束，仅能来自用户明确要求或通用质量门。instructions.advisory 不得被升级成禁令。',
    '- references 提供可融合的正向原理；按相关性选择、组合或放弃，不得复制来源页面，也不得把 advisoryRisks 继承成全局禁令。',
    '- technical.selectedCapabilities 是已经验证的实现建议；优先复用，但可以在更能实现用户目标且仍通过质量门时采用其他现有能力。',
    '- technical.styleDiversity 只用于发现模板惯性和辅助排序。structureDirection、fingerprint、mustDifferOn 与 workbenchPolicy 都不是业务硬约束，不得强制旋转风格或改写用户创意。',
    '- direction.renderer 是职责分配：dom-media-hybrid 由语义 DOM 与连续媒体承担主叙事；dom-canvas-hybrid 由 Canvas/Shader 承担变化；dom-three-hybrid 才让 Three.js 承担空间或材质主职责。',
    '- story.visualAnchor 是阻断级首屏合同：必须让声明的主题对象、空间或证据成为主视觉，并按 interactionBinding 响应输入。纯色、通用网格、无主题依据的渐变、随机粒子或无关几何不能单独替代它。',
    '- authoring.primaryJourney 是一条因果主线，不是页面、章节、屏幕或固定 beat 数：主要输入必须通过同一目标状态依次驱动视觉主体变化、可读业务结果和最终行动。不得把四个字段机械拆成四段 DOM。',
    '- 必须按 authoring.primaryJourney.markers 标记 data-signal-visual-anchor、data-signal-primary-result 与 data-signal-primary-action；只有真实存在的滑杆、按钮、选择器或其他直接控件才标记 data-signal-primary-control。原生滚动是输入而不是伪造控件。',
    '- authoring.subjectContinuity 对所有派生状态生效：复用同一主体身份锚点和规范化主体框，保持定义性特征、观察关系、可比尺度与安全裁切；禁止每个状态分别 cover、重新居中、无因果放大、换镜或换成另一主体。',
    '- 文案、数值、active class、整体缩放、透明度、模糊、裁切跳变或相机切换不能单独满足 authoring.primaryJourney.visibleSubjectDelta；结果和行动也不能脱离同一因果状态另行伪造。',
    '- 模型生成素材、项目已有素材与程序化 Three.js 都只是实现候选，不得为了使用某种技术而预先排除其他手段；最终选择由主体辨识度、融合质量、交互因果和来源约束共同决定，实现偏好不能降低 L3 主体质量门。',
    '- 茶杯、器物、设备、家具等可辨认实体必须守住定义性轮廓、比例、连接关系、厚度、接地和受光。圆柱、蛋形、球体或圆环拼接只算草模；若无法达到上述要求，应保留为待评审原型，不能声称最终完成。',
    '- 即使 bundle 工程保留 Three.js 场景模块，也不得用无意义几何、粒子或镜头运动覆盖契约指定的媒体、信息或主体责任。',
    ...(mediaLedRoute ? [
      `- 本次路线是 ${creativeContract.direction.renderer.route}，不是 dom-three-hybrid。scene.ts 只能承载获批媒体、轻量遮罩、景深、色彩或证据标注；禁止用 BoxGeometry、CylinderGeometry、SphereGeometry、TorusGeometry、LatheGeometry 等基础几何重新制作或遮挡素材中已经清楚可见的主体。`,
      '- 如果获批 L3/L4 素材已经提供可辨认对象，程序化层必须视觉从属；不能把低精度棕色块、轮廓草模或不透明几何放在它前方模拟同一对象。无法形成同等级增益时，宁可只使用媒体与 DOM。'
    ] : []),
    '- story.beats 是语义状态而非固定页面章节；assets 中 required=true 的职责必须获得可见证据；acceptance 是最终检查项。',
    ...semanticInteractionContract,
    ...stateChangeContract,
    ...continuousCanvasContract,
    '- limits 是停止条件：只创作一个候选，不进行开放式自我探索。'
  ] : [];
  const assetContract = approvedAssets.length ? [
    '', '已获批本地素材（只允许使用这些 URI）：', JSON.stringify(authoringAssets),
    '- quality 为 balanced/high 时必须实际使用至少一个获批素材；可用 DOM、CSS 或 THREE.TextureLoader，但素材必须服务于视觉主体和叙事变化。',
    '- 除非 brief 明确要求画框、卡片或档案图片，禁止把图片作为边界清晰的矩形平面悬在页面中央。应按素材特征选择全幅融合、透明/亮度遮罩、分层 2.5D、深度位移、纹理投影或粒子重组等方法；选择其中最合适的，不要机械叠加全部技术。',
    '- 图片只是素材证据，不是成品构图。需要让它与背景色、空间遮挡、光场、文字层级和滚动事件形成同一视觉系统；素材边缘、底色或画布比例不得显得像贴图。必须保持素材固有宽高比；若生成时未知，须在纹理加载后读取 image width/height 再缩放几何体，禁止把横图硬压成竖图。',
    '- 同时提供多个素材时，必须依据 role 分配主体、环境、纹理或前景职责，禁止简单叠成多张海报。带 Alpha 的素材优先直接使用 tex.a 或 PNG 透明度，不得用亮度阈值误删半透明主体；无 Alpha 的环境图应使用全幅融合或柔和边缘，而不是硬矩形。',
    '- source=model-generated 表示 MiniMax 的 L2 候选，不等于已经证明主体连续。若多个候选声称是同一产品、同一地点或同一文献，但元数据无法证明外观、机位与光线一致，不得把它们硬切成连续序列；优先选择一个最强锚点，由同一素材配合 Three.js、遮罩、景深和状态变化完成叙事，并把其他素材降为局部证据。',
    '- 素材中的 experience 是本次作品的动态叙事合同：anchor 表示最强视觉责任位置，function 表示用途，visualState 是必须形成的画面，continuity 约束前后连续性，integration 约束融合手段。按 anchor 排序形成所需的关键状态，但不要据此套用固定章节数。',
    '- required=true 的素材必须在对应 anchor 附近可见地承担声明职责，代码必须实际引用，并在 bundle.assets 中声明 required=true；不能只预加载、藏在暗处或被程序化几何遮挡。',
    '- integration=alpha-subject 时，素材轮廓必须成为对应状态唯一或明确主导的视觉焦点；禁止在其前方放置不透明球体、蛋形、圆柱、粗竖线或其他占位几何。程序化几何只能作为低对比支持层，不能覆盖主体内部细节。',
    '- integration=full-bleed-environment 时，对应 anchor 的环境必须覆盖完整视口并保持原始宽高比，使用 cover 式裁切、柔和遮罩或空间深度融合；禁止只露出顶部残片、窄条、中央矩形或在最终状态淡化为空背景。',
    '- function=resolve 的关键素材必须在 progress 接近 1 时仍清晰可见，并与最终文案和 CTA 形成稳定英雄构图；最终画面不得比中段更空、更暗或更像占位场景。',
    '- 使用 THREE.TextureLoader 时调用 setCrossOrigin("anonymous")；必须提供加载失败后的程序化视觉回退，不能让素材阻塞页面 ready。',
    '- 对每个实际使用的素材，在 bundle.assets 中用对应 bundlePath 声明；source 映射为 generated/user-provided/licensed。',
    '- 不得编造新素材 URI，不得把静态图片当作全部 Three.js 能力。'
  ] : creativeContract?.direction.renderer.route === 'dom-only' ? [
    '',
    '当前没有获批素材，且合同路线为 dom-only：使用语义 DOM 与 CSS 完成主题、状态、控件和行动。',
    '- scene.ts 保持受控的空增强模块；禁止为了填充文件而创建装饰性 Three.js 几何、Shader 或伪素材。bundle.assets 必须为 []。'
  ] : creativeContract?.direction.renderer.route === 'dom-canvas-hybrid' ? [
    '',
    '当前没有获批素材：按合同使用 Canvas/Shader、语义 DOM 与 CSS 构建可辨认的程序化状态，不得声明不存在的图片、模型或音频。',
    '- bundle.assets 必须为 []；Canvas/Shader 属于 src/ 文件实现，不得为了描述它们而伪造 asset path。'
  ] : [
    '',
    '当前没有获批素材：按合同使用程序化 Three.js 几何、Shader、语义 DOM 和 CSS，不得声明不存在的图片、模型或音频。',
    '- 此时 bundle.assets 必须为 []；程序化几何、灯光和着色器属于 src/ 文件实现，不得为了描述它们而伪造 asset path。'
  ];
  const retry = previousFailure ? `\n上一次输出没有通过本地构建，失败摘要：${previousFailure}\n请从头返回一份更保守、类型完整、可编译的新 bundle。` : '';
  const legacyReferenceFooter = creativeContract ? [] : [
    `已有方向仅供理解、不得复制运行时：${JSON.stringify({ ...request.reference, assets: undefined })}`,
  ];
  return [
    '你是资深创意技术总监和前端图形工程师。请为给定 brief 创作一个独立、可运行、非模板换参的沉浸式产品网页代码 bundle；Three.js 只在执行合同证明它能提升最终效果时承担主职责。',
    '只返回符合 JSON Schema 的对象，不要 markdown，不要解释。', '', '硬性工程契约：',
    '- files 必须至少包含 src/experience.ts、src/scene.ts、src/director.ts、src/page.css。',
    "- experience.ts 必须从 @signal-lab/experience-sdk 导入 defineExperience 与 startExperience，并调用 startExperience(defineExperience({ mount, update, resize, dispose }))。",
    '- SDK 类型契约必须精确遵守：GeneratedViewport 只有 width、height、dpr；像素比使用 viewport.dpr，禁止使用 pixelRatio。',
    '- GeneratedFrame 只有 elapsed、delta、progress、pointer、viewport、reducedMotion；GeneratedMountContext 只有 container、canvas、quality、reducedMotion、viewport。',
    '- scene.ts 保留受控图形层；使用 three 时通过传入 canvas 建立 WebGLRenderer。SDK 已负责 requestAnimationFrame，禁止另开动画循环。媒体主导路线不得为了填充 scene.ts 强行创建三维主体。',
    '- 禁止 setInterval。重复视觉更新必须使用 SDK update；用户触发的短音频或提示只能使用可取消的 setTimeout，并在 dispose 中清理。',
    '- 标准透视场景优先从 @signal-lab/experience-sdk 使用 createGeneratedThreeRuntime：它统一 renderer、DPR、resize、render 与资源释放，但不提供主体几何、材质、灯光、镜头路径或页面构图。只有正交相机、多个 render target 或特殊渲染管线确实需要时才自行管理 renderer。',
    '- director.ts 必须把 progress、pointer、elapsed 转成有叙事目的的镜头和场景状态，不得只是无限旋转。',
    '- page.css 会由宿主页直接加载；不要在 TypeScript 中 import CSS。',
    '- 页面必须创建可读 DOM 文案和明确行动；Canvas 负责空间、氛围和记忆点，不能承载全部文字。',
    '- SDK Canvas 由宿主放在页面根节点旁，不一定是生成页面 DOM 的子元素；禁止依赖 `.page canvas` 这类后代选择器。若 Canvas 承担主视觉，生成页面根层和主视觉区域必须透明或显式留出可见合成窗口，首屏不得出现大面积空白占位框。',
    '- `data-signal-visual-anchor` 必须标在真正发生像素或几何变化的主体上；Canvas 是主视觉时直接标记 context.canvas，禁止把标记放在空的占位 div 上。',
    '- 最终交付层禁止出现箭头、红框、辅助线、坐标、调试文字、评审批注或素材制作说明；开发诊断只能存在于不参与交付渲染的日志或测试中。',
    '- 连续状态中的主体必须保持尺度、锚点、镜位和定义性连接部位一致；不得把不匹配的两张素材硬切成装配、拆解或形变过程，也不得靠裁切跳变伪造状态变化。',
    '- 首个稳定视口必须让不了解行业背景的用户在约 10 秒内识别“核心对象、当前任务、可执行操作、操作后的业务结果”；专业术语和参数只能作为辅助证据，不能代替可见结果。',
    '- 交互工作区的核心对象或主要可变场必须是最大、最清晰的视觉焦点，不能缩成图标或淹没在大面积通用背景中；必须用至少一组参数极值确认主体在正常浏览尺度下产生明显差异。',
    '- 把 primary journey 实现成明确的对象→操作→结果闭环。高层控件（模式、Cue、预设、路线、方案、步骤）必须写入真实底层状态并同步改变 Canvas/Three.js 主体；禁止只切换 active class、说明文字或数字。',
    '- 参数变化必须形成足够明显且可归因的视觉差异：方向改变落点，范围改变覆盖区域，强度改变主体与环境，模式改变组合状态。不要让多个半透明效果互相覆盖到无法分辨。',
    '- 照度、距离、比例、评分等专业指标必须由声明的完整目标状态计算；简化模型必须在界面标为“估算”，禁止用随机数或单一局部公式冒充真实综合证据。',
    '- 直接操作型工作区默认由用户控制。不得在用户尚未操作时自动循环模式、随指针替用户选择对象或持续改变关键业务状态；如 brief 明确需要演示，必须提供清晰的“自动演示”入口，并在首次人工输入后停止。',
    '- 必须适配手机、quality=low、reducedMotion；WebGL 或素材失败时 DOM 仍完整可读。',
    '- reducedMotion 必须同时服从 SDK 的 context.reducedMotion / frame.reducedMotion；若 CSS 需要切换布局，mount 时把 context.reducedMotion 映射为根节点 class。不能只依赖 prefers-reduced-motion，因为 URL 的 motion=reduce 也必须独立生效。',
    '- 若本次体验由 scroll 驱动，DOM 必须提供真实纵向滚动行程：桌面 document.scrollHeight - innerHeight 至少约为 0.8 * innerHeight；canvas 可以 fixed，但叙事容器不能被锁成只有 100vh。使用 margin:0、box-sizing:border-box、max-width:100% 与 overflow-x:hidden/clip 解决横向溢出，禁止用全局 overflow:hidden 同时消灭纵向滚动。',
    '- dispose 必须释放 renderer、geometry、material、texture 和监听器。',
    '- 禁止 fetch、WebSocket、XMLHttpRequest、eval、new Function、动态 import、外部 URL、加载器和未获批资产声明。',
    '- 只允许导入 three、three/*、@signal-lab/experience-sdk 和同目录 ./ 相对模块。',
    '- 使用严格 TypeScript；不要 any、@ts-ignore、未声明全局变量或 React。',
    '- 遍历 THREE.Mesh 时必须处理 mesh.material 可能是 Material[]：先用 Array.isArray(material) 分支或统一展开后再修改 opacity、transparent、color 等属性；禁止直接把联合类型当成单一 Material。',
    '- scene.background 的类型是 Color | Texture | null；需要动态改背景色时先保存独立的 THREE.Color 变量、赋给 scene.background，再调用该 Color 变量的 set/copy/lerp，禁止直接对 scene.background 调用 set。',
    '- 视觉必须针对 brief 创作，有一个明确 hero、一次结构性变化、一个静止可读的最终构图。变化必须是可描述的事件，例如聚合、解构、穿越、显影、变形或材质转换，不能只有镜头推进、整体缩放和透明度变化。',
    '- 根据 brief 和素材 experience 自主决定关键状态数量与时间位置；至少形成一次有意义的视觉变化和一个静止可读的最终构图，但禁止机械套用三段、四章或等距时间点。滚动与指针只负责驱动状态，不能让元素直接追逐鼠标或机械抖动。',
    '- 标题字号必须使用带像素上限的 clamp；桌面 hero 标题上限不超过 96px，390px 手机不超过 64px，标题块不得超过首屏高度的 42%，长中文必须自然换行且不能遮挡正文、CTA 或视觉主体。',
    '- 首屏必须有唯一主焦点和清晰阅读顺序；标题、主体、正文和行动入口不得同时争抢中心。桌面与手机均不得出现无意裁字、贴边、正文被标题挤压或 CTA 过小。',
    '- 保持创意开放：不要套用固定章节数、固定居中构图或固定紫色科技风。根据 brief 自主选择空间隐喻、排版关系、材质语言和动作节奏，但必须能说明这些选择如何服务目标。',
    '- 代码质量同样是交付目标：只使用一个 SDK Canvas 和一套 progress/pointer 时间线；避免每帧创建大量临时对象；把状态导演、Three.js 场景和可读 DOM 分离。',
    `- 初版严格控制输出规模：只生成 4 个必要文件，源码总量目标不超过 ${sourceBudgetKb} KB；优先复用函数、共享几何和数据驱动部件，不写解释性注释、重复样式或未被当前 brief 使用的备用系统。质量来自构图与状态因果，不来自代码长度。`,
    ...v2Contract,
    ...assetContract, '',
    `brief: ${request.brief}`, `seed: ${request.seed}`, `quality target: ${request.quality}`,
    ...legacyReferenceFooter, retry
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
function boundedVisualModelTimeout(value: string | undefined): number { return Math.min(numberFrom(value, 45_000), 45_000); }
function cleanProcessError(value: string): string { return (value.trim().split(/\r?\n/).filter(Boolean).slice(-5).join(' ') || 'Codex 未返回有效专属代码。').slice(0, 900); }
function cleanError(error: unknown): string { return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').slice(0, 1200); }
