import { z } from 'zod';

const safePath = z.string().min(1).max(120).refine((value) => {
  if (value.startsWith('/') || value.startsWith('\\') || value.includes('..') || value.includes('\\')) return false;
  return /^(src|assets)\/[a-zA-Z0-9_./-]+$/.test(value);
}, '生成文件必须位于 src/ 或 assets/，且不能包含路径穿越。');
const sourceFileSchema = z.object({ path: safePath, language: z.enum(['typescript', 'css', 'glsl', 'json']), content: z.string().max(48_000) }).strict();
const assetReferenceSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), path: safePath,
  kind: z.enum(['image', 'texture', 'environment', 'model-3d', 'audio', 'video', 'font']),
  source: z.enum(['generated', 'uploaded', 'licensed', 'procedural']), required: z.boolean()
}).strict();

export const generatedExperienceBundleSchema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), runId: z.string().min(4).max(100),
  effectSpecId: z.string().min(4).max(120), kind: z.literal('dedicated-module'), entry: z.literal('src/experience.ts'),
  files: z.array(sourceFileSchema).min(4).max(18), assets: z.array(assetReferenceSchema).max(24),
  contract: z.object({
    sdkVersion: z.literal(1), imports: z.array(z.enum(['three', '@signal-lab/experience-sdk'])).min(1).max(2),
    lifecycle: z.array(z.enum(['mount', 'update', 'resize', 'dispose'])).length(4), network: z.literal('disabled'), deterministicTimeline: z.boolean()
  }).strict()
}).strict();
export type GeneratedExperienceBundle = z.infer<typeof generatedExperienceBundleSchema>;

const requiredFiles = ['src/experience.ts', 'src/scene.ts', 'src/director.ts', 'src/page.css'] as const;
const requiredLifecycle = ['mount', 'update', 'resize', 'dispose'] as const;
const blockedSourcePatterns = [
  /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/,
  /\bWorker\s*\(/, /\bSharedWorker\s*\(/, /\bnavigator\.sendBeacon\b/, /\bimport\s*\(/,
  /\blocalStorage\b/, /\bsessionStorage\b/, /\bdocument\.cookie\b/, /\bdocument\.write\b/,
  /\b(?:window|globalThis)\.(?:parent|top|opener)\b/, /\brequestAnimationFrame\s*\(/, /\bsetInterval\s*\(/
] as const;

export function assertGeneratedExperienceBundle(value: unknown): GeneratedExperienceBundle {
  const bundle = generatedExperienceBundleSchema.parse(value);
  const paths = bundle.files.map((file) => file.path);
  if (new Set(paths).size !== paths.length) throw new Error('生成束包含重复文件路径。');
  requiredFiles.forEach((path) => { if (!paths.includes(path)) throw new Error(`生成束缺少必需文件：${path}`); });
  if (new Set(bundle.contract.lifecycle).size !== requiredLifecycle.length || requiredLifecycle.some((item) => !bundle.contract.lifecycle.includes(item))) {
    throw new Error('生成束必须完整实现 mount、update、resize、dispose 生命周期。');
  }
  const totalBytes = bundle.files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0);
  if (totalBytes > 160_000) throw new Error('生成束源代码超过 160 KB 限制。');
  bundle.files.filter((file) => file.language === 'typescript').forEach((file) => {
    const blocked = blockedSourcePatterns.find((pattern) => pattern.test(file.content));
    if (blocked) throw new Error(`生成文件 ${file.path} 包含不允许的运行能力：${blocked.source}`);
    assertStaticImports(file.path, file.content);
  });
  return bundle;
}

export function generatedBundleSummary(bundle: GeneratedExperienceBundle): { files: number; assets: number; sourceBytes: number; hasShaders: boolean } {
  return {
    files: bundle.files.length, assets: bundle.assets.length,
    sourceBytes: bundle.files.reduce((sum, file) => sum + new TextEncoder().encode(file.content).byteLength, 0),
    hasShaders: bundle.files.some((file) => file.language === 'glsl' || /ShaderMaterial|vertexShader|fragmentShader/.test(file.content))
  };
}

function assertStaticImports(path: string, source: string): void {
  const pattern = /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1];
    const allowSdk = specifier === '@signal-lab/experience-sdk';
    const allowThree = specifier === 'three' || specifier.startsWith('three/');
    const allowLocal = specifier.startsWith('./') && !specifier.includes('..') && /^[.\/a-zA-Z0-9_-]+$/.test(specifier);
    if (!allowSdk && !allowThree && !allowLocal) throw new Error(`生成文件 ${path} 导入了非白名单模块：${specifier}`);
  }
}
