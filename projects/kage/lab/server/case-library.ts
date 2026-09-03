import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { assertGeneratedExperienceBundle } from '../src/generation/generated-experience-bundle.ts';
import { visualReviewAssessmentSchema } from '../src/generation/visual-review.ts';
import { isFinalVisualCandidateEligible, visualAcceptanceSchema } from '../src/generation/visual-acceptance.ts';
import { assessDeliveryQuality } from '../src/generation/delivery-quality.ts';
import { v2CreativeContractSchema } from '../src/v2/creative-contract.ts';
import { visualReviewPlanSchema } from '../src/generation/visual-review-plan.ts';

type Environment = Readonly<Record<string, string | undefined>>;

const caseIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const casePresentationSchema = z.object({
  assetUrl: z.string().regex(/^\/creative-assets\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:png|jpe?g|webp|avif)$/),
  kind: z.enum(['subject', 'environment']),
  fit: z.enum(['contain', 'cover']),
  position: z.string().regex(/^\d{1,3}% \d{1,3}%$/),
  opacity: z.number().min(0.2).max(1),
  tone: z.string().min(1).max(240).refine((value) => !/[;{}]|url\s*\(/i.test(value), '案例底色包含不安全的 CSS。')
}).strict();

const caseEntrySchema = z.object({
  id: caseIdSchema,
  title: z.string().min(1).max(140),
  brief: z.string().min(1).max(800),
  model: z.string().min(1).max(80),
  stage: z.enum(['baseline', 'exploration', 'refined', 'featured']),
  parentId: caseIdSchema.optional(),
  note: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(40)).max(12),
  generatedAt: z.string(),
  archivedAt: z.string(),
  previewUrl: z.string(),
  presentation: casePresentationSchema.optional()
}).strict().superRefine((entry, context) => {
  if ((entry.stage === 'featured' || entry.stage === 'refined') && !entry.presentation) {
    context.addIssue({ code: 'custom', path: ['presentation'], message: '公开案例必须包含专属封面展示元数据。' });
  }
});

const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
  cases: z.array(caseEntrySchema)
}).strict();

export type CaseEntry = z.infer<typeof caseEntrySchema>;

export const archiveCaseRequestSchema = z.object({
  id: caseIdSchema,
  title: z.string().trim().min(1).max(140).optional(),
  note: z.string().trim().max(500).optional(),
  stage: z.enum(['baseline', 'exploration', 'refined', 'featured']).default('exploration'),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  presentation: casePresentationSchema.optional()
}).strict();

export async function listCases(environment: Environment = process.env): Promise<CaseEntry[]> {
  const catalog = await readCatalog(environment);
  return [...catalog.cases].sort((a, b) => {
    const rank = { featured: 0, refined: 1, exploration: 2, baseline: 3 } as const;
    return rank[a.stage] - rank[b.stage] || b.archivedAt.localeCompare(a.archivedAt);
  });
}

export async function archiveDedicatedCase(input: unknown, environment: Environment = process.env): Promise<CaseEntry> {
  const request = archiveCaseRequestSchema.parse(input);
  const roots = caseRoots(environment);
  const selectedId = await resolveFinalSelectedRun(request.id, roots.generatedRuns);
  const source = resolve(roots.generatedRuns, selectedId);
  const destination = resolve(roots.caseRuns, selectedId);
  assertInside(roots.generatedRuns, source);
  assertInside(roots.caseRuns, destination);
  const report = z.object({
    receipt: z.object({ model: z.string(), generatedAt: z.string() }).passthrough(),
    request: z.object({
      brief: z.string(),
      quality: z.enum(['high', 'balanced', 'low']).optional().default('balanced'),
      creativeContract: z.unknown().optional(),
      reference: z.object({
        title: z.string(),
        theme: z.object({ deep: z.string(), surface: z.string(), accent: z.string() }).passthrough().optional(),
        assets: z.array(z.object({
          id: z.string().optional(),
          uri: z.string(),
          kind: z.enum(['image', 'texture', 'environment', 'model-3d', 'audio', 'video', 'font']).optional(),
          source: z.enum(['chatgpt-generated', 'model-generated', 'user-provided', 'licensed']).optional(),
          qualityLevel: z.enum(['L2-inspectable', 'L3-presentable', 'L4-cinematic']).optional(),
          required: z.boolean().optional(),
          role: z.string().optional(),
          description: z.string().optional(),
          experience: z.object({ integration: z.string().optional() }).passthrough().optional()
        }).passthrough()).optional()
      }).passthrough()
    }).passthrough(),
    revision: z.object({ parentId: caseIdSchema }).passthrough().optional(),
    refinement: z.object({ parentId: caseIdSchema }).passthrough().optional()
  }).passthrough().parse(JSON.parse(await readFile(join(source, 'build-report.json'), 'utf8')));
  assertGeneratedExperienceBundle(JSON.parse(await readFile(join(source, 'bundle.json'), 'utf8')));
  const presentation = request.presentation || deriveCasePresentation(report.request.reference);
  if ((request.stage === 'featured' || request.stage === 'refined') && !presentation) {
    throw new Error('公开案例缺少专属封面；请提供 presentation，或在最终 bundle 中登记真实素材。');
  }
  if (presentation) await assertCasePresentationAsset(presentation, roots.publicAssets);
  if (request.stage === 'featured') {
    let review: unknown;
    try { review = JSON.parse(await readFile(join(source, 'visual-review.json'), 'utf8')); }
    catch { throw new Error('精选案例必须先完成最终浏览器视觉评审。'); }
    assertFeaturedCaseReview(request.stage, review);
    assertFeaturedDeliveryQuality(report.request, review);
  }
  await mkdir(roots.caseRuns, { recursive: true });
  // Re-archiving the selected final run must refresh its files. Keeping the first
  // copy left later visual fixes in generated/runs while the public case stayed stale.
  await cp(source, destination, { recursive: true, errorOnExist: false, force: true });

  const catalog = await readCatalog(environment);
  const previous = catalog.cases.find((item) => item.id === selectedId);
  const parentId = report.revision?.parentId || report.refinement?.parentId;
  const entry = caseEntrySchema.parse({
    id: selectedId,
    title: request.title || report.request.reference.title,
    brief: report.request.brief,
    model: report.receipt.model,
    stage: request.stage,
    ...(parentId ? { parentId } : {}),
    ...(request.note ? { note: request.note } : {}),
    tags: request.tags,
    generatedAt: report.receipt.generatedAt,
    archivedAt: previous?.archivedAt || new Date().toISOString(),
    previewUrl: `/cases/${selectedId}/`,
    ...(presentation ? { presentation } : {})
  });
  // One goal exposes one case: superseded versions remain in generated/runs for rollback,
  // while the public case catalog points only at the final visually selected result.
  catalog.cases = [...catalog.cases.filter((item) => item.id !== selectedId && item.brief !== entry.brief), entry];
  catalog.updatedAt = new Date().toISOString();
  await writeCatalog(catalog, environment);
  return entry;
}

export function assertFeaturedCaseReview(stage: z.infer<typeof archiveCaseRequestSchema>['stage'], value: unknown): void {
  if (stage !== 'featured') return;
  const review = z.object({ assessment: visualReviewAssessmentSchema, visualAcceptance: visualAcceptanceSchema }).passthrough().safeParse(value);
  if (!review.success) throw new Error('精选案例缺少有效的机械评审或独立视觉验收。');
  if (review.data.assessment.verdict !== 'pass') {
    throw new Error(`精选案例机械评审未通过：${review.data.assessment.verdict}（${review.data.assessment.score} 分）。`);
  }
  if (review.data.visualAcceptance.verdict !== 'pass') {
    throw new Error(`精选案例独立视觉验收未通过：${review.data.visualAcceptance.verdict}（${review.data.visualAcceptance.score} 分）。`);
  }
  if (!isFinalVisualCandidateEligible(review.data.assessment, review.data.visualAcceptance)) {
    throw new Error('精选案例独立视觉验收仍包含重大缺陷。');
  }
}

export function assertFeaturedDeliveryQuality(
  request: {
    quality: 'high' | 'balanced' | 'low';
    creativeContract?: unknown;
    reference: { assets?: Array<Record<string, unknown>> };
  },
  reviewValue: unknown,
): void {
  const contract = v2CreativeContractSchema.safeParse(request.creativeContract);
  if (!contract.success) return;
  const review = z.object({
    plan: visualReviewPlanSchema.optional(),
    assessment: visualReviewAssessmentSchema.optional(),
    visualAcceptance: visualAcceptanceSchema
  }).passthrough().parse(reviewValue);
  const candidateSchema = z.object({
    id: z.string(),
    kind: z.enum(['image', 'texture', 'environment', 'model-3d', 'audio', 'video', 'font']),
    source: z.enum(['chatgpt-generated', 'model-generated', 'user-provided', 'licensed']),
    role: z.string(),
    description: z.string(),
    qualityLevel: z.enum(['L2-inspectable', 'L3-presentable', 'L4-cinematic']).optional(),
    experience: z.object({ integration: z.enum(['alpha-subject', 'full-bleed-environment', 'seamless-field', 'spatial-object', 'native-media']) }).passthrough().optional(),
  }).passthrough();
  const candidates = (request.reference.assets || []).flatMap((asset) => {
    const parsed = candidateSchema.safeParse(asset);
    return parsed.success ? [parsed.data] : [];
  });
  const assessment = assessDeliveryQuality(request.quality, contract.data, candidates, review.visualAcceptance, {
    mechanical: review.assessment || null,
    plan: review.plan || null
  });
  if (!assessment.finalEligible) throw new Error(`精选案例素材交付质量未通过：${assessment.summary}`);
}

export async function readCaseRun(id: string, environment: Environment = process.env): Promise<{ entryUrl: string; cssUrl: string; title: string } | null> {
  const safeId = caseIdSchema.safeParse(id);
  if (!safeId.success) return null;
  const roots = caseRoots(environment);
  const directory = resolve(roots.caseRuns, safeId.data);
  assertInside(roots.caseRuns, directory);
  try {
    const bundle = assertGeneratedExperienceBundle(JSON.parse(await readFile(join(directory, 'bundle.json'), 'utf8')));
    const report = JSON.parse(await readFile(join(directory, 'build-report.json'), 'utf8')) as { request?: { reference?: { title?: string } } };
    return {
      entryUrl: `/cases/runs/${safeId.data}/${bundle.entry}`,
      cssUrl: `/cases/runs/${safeId.data}/src/page.css`,
      title: report.request?.reference?.title || safeId.data
    };
  } catch {
    return null;
  }
}

async function resolveFinalSelectedRun(initialId: string, generatedRuns: string): Promise<string> {
  let current = caseIdSchema.parse(initialId);
  const seen = new Set<string>();
  for (let depth = 0; depth < 6; depth += 1) {
    if (seen.has(current)) throw new Error('案例最佳版本指针形成循环。');
    seen.add(current);
    const directory = resolve(generatedRuns, current);
    assertInside(generatedRuns, directory);
    const report = JSON.parse(await readFile(join(directory, 'build-report.json'), 'utf8')) as {
      refinement?: { selectedId?: unknown };
    };
    const selected = report.refinement?.selectedId;
    if (typeof selected !== 'string' || selected === current) return current;
    current = caseIdSchema.parse(selected);
  }
  throw new Error('案例最佳版本指针链过长。');
}

function caseRoots(environment: Environment): { generatedRuns: string; caseRuns: string; catalog: string; publicAssets: string } {
  const projectRoot = resolve(environment.SIGNAL_PROJECT_ROOT || process.cwd());
  return {
    generatedRuns: resolve(environment.SIGNAL_GENERATED_RUNS_DIR || join(projectRoot, 'generated', 'runs')),
    caseRuns: resolve(join(projectRoot, 'cases', 'runs')),
    catalog: resolve(join(projectRoot, 'cases', 'catalog.json')),
    publicAssets: resolve(join(projectRoot, 'public', 'creative-assets'))
  };
}

function deriveCasePresentation(reference: {
  theme?: { deep: string; surface: string; accent: string };
  assets?: Array<{ uri: string; required?: boolean; role?: string; experience?: { integration?: string } }>;
}): z.infer<typeof casePresentationSchema> | undefined {
  const candidate = [...(reference.assets || [])]
    .filter((asset) => asset.uri.startsWith('/creative-assets/'))
    .sort((a, b) => presentationAssetScore(b) - presentationAssetScore(a))[0];
  if (!candidate) return undefined;
  const integration = candidate.experience?.integration || '';
  const role = candidate.role || '';
  const kind = integration === 'alpha-subject' || /subject|hero|product|主体/i.test(role) ? 'subject' : 'environment';
  const deep = safeHex(reference.theme?.deep, '#101514');
  const surface = safeHex(reference.theme?.surface, '#27302d');
  return casePresentationSchema.parse({
    assetUrl: candidate.uri,
    kind,
    fit: kind === 'subject' ? 'contain' : 'cover',
    position: kind === 'subject' ? '78% 50%' : '62% 50%',
    opacity: kind === 'subject' ? 0.92 : 0.86,
    tone: `linear-gradient(135deg, ${deep} 0%, ${surface} 54%, ${deep} 100%)`
  });
}

function presentationAssetScore(asset: { required?: boolean; role?: string; experience?: { integration?: string } }): number {
  const role = asset.role || '';
  const integration = asset.experience?.integration || '';
  return (asset.required === false ? 0 : 8)
    + (integration === 'full-bleed-environment' ? 6 : integration === 'alpha-subject' ? 5 : 0)
    + (/opening|hero|subject|environment|product|主体|环境/i.test(role) ? 3 : 0);
}

async function assertCasePresentationAsset(presentation: z.infer<typeof casePresentationSchema>, publicAssets: string): Promise<void> {
  const relativePath = presentation.assetUrl.replace(/^\/creative-assets\//, '');
  const target = resolve(publicAssets, relativePath);
  assertInside(publicAssets, target);
  let source: Buffer;
  try { source = await readFile(target); }
  catch { throw new Error(`案例封面资源不存在：${presentation.assetUrl}`); }
  if (source.byteLength <= 1024) throw new Error(`案例封面资源无效或仍是占位文件：${presentation.assetUrl}`);
}

function safeHex(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

async function readCatalog(environment: Environment): Promise<z.infer<typeof catalogSchema>> {
  const { catalog } = caseRoots(environment);
  try { return catalogSchema.parse(JSON.parse(await readFile(catalog, 'utf8'))); }
  catch { return { schemaVersion: 1, updatedAt: new Date(0).toISOString(), cases: [] }; }
}

async function writeCatalog(catalog: z.infer<typeof catalogSchema>, environment: Environment): Promise<void> {
  const roots = caseRoots(environment);
  await mkdir(resolve(roots.catalog, '..'), { recursive: true });
  const temporary = `${roots.catalog}.tmp`;
  await writeFile(temporary, `${JSON.stringify(catalogSchema.parse(catalog), null, 2)}\n`, 'utf8');
  await rename(temporary, roots.catalog);
}

function assertInside(root: string, target: string): void {
  const normalized = `${resolve(root)}\\`;
  if (!`${resolve(target)}\\`.startsWith(normalized)) throw new Error('案例路径越过允许目录。');
}
