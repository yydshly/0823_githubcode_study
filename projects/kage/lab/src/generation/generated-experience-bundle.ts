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
const cssStringUrlFunctions = new Set(['src', 'image', 'image-set', '-webkit-image-set']);
const blockedSourcePatterns = [
  /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/,
  /\bWorker\s*\(/, /\bSharedWorker\s*\(/, /\bnavigator\.sendBeacon\b/, /\bimport\s*\(/,
  /\blocalStorage\b/, /\bsessionStorage\b/, /\bdocument\.cookie\b/, /\bdocument\.write\b/,
  /\b(?:window|globalThis|self)\.(?:parent|top|opener|frameElement)\b/,
  /(?<![\w$?.#])\b(?:parent|top|opener|frameElement)\s*(?:\.|\?\.)/, /\bdocument\.(?:domain|defaultView)\b/,
  /\brequestAnimationFrame\s*\(/, /\bsetInterval\s*\(/
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
  bundle.files.filter((file) => file.language === 'css').forEach((file) => assertCssNetworkReferences(file.path, file.content));
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

function assertCssNetworkReferences(path: string, source: string): void {
  let index = 0;
  while (index < source.length) {
    if (source.startsWith('/*', index)) {
      index = skipCssComment(source, index);
      continue;
    }
    if (source[index] === '"' || source[index] === "'") {
      index = skipCssString(source, index);
      continue;
    }
    if (source[index] === '@') {
      const atRule = readCssIdentifier(source, index + 1);
      if (atRule.value.toLowerCase() === 'import') throw new Error(`生成文件 ${path} 包含不允许的 CSS 网络能力：@import`);
      index = Math.max(atRule.end, index + 1);
      continue;
    }
    const identifier = readCssIdentifier(source, index);
    const identifierName = identifier.value.toLowerCase();
    if (identifier.end > index && (identifierName === 'url' || cssStringUrlFunctions.has(identifierName))) {
      const openParen = skipCssTrivia(source, identifier.end);
      if (source[openParen] === '(') {
        if (identifierName === 'url') {
          const reference = readCssUrl(source, openParen + 1);
          assertLocalCssReference(path, reference.value);
          index = reference.end;
          continue;
        }
        const reference = findRemoteCssStringInFunction(source, openParen + 1);
        if (reference !== undefined) assertLocalCssReference(path, reference);
      }
    }
    index = Math.max(identifier.end, index + 1);
  }
}

function readCssIdentifier(source: string, start: number): { value: string; end: number } {
  let value = '';
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (/[a-zA-Z0-9_-]/.test(char)) {
      value += char;
      index += 1;
      continue;
    }
    if (char !== '\\') break;
    const escape = readCssEscape(source, index);
    value += escape.value;
    index = escape.end;
  }
  return { value, end: index };
}

function readCssUrl(source: string, start: number): { value: string; end: number } {
  let index = skipCssTrivia(source, start);
  const quote = source[index];
  if (quote === '"' || quote === "'") {
    const valueStart = index + 1;
    index = skipCssString(source, index);
    const valueEnd = source[index - 1] === quote ? index - 1 : index;
    index = skipCssTrivia(source, index);
    return { value: source.slice(valueStart, valueEnd), end: source[index] === ')' ? index + 1 : index };
  }
  let value = '';
  while (index < source.length && source[index] !== ')') {
    if (source.startsWith('/*', index)) {
      index = skipCssComment(source, index);
      continue;
    }
    if (source[index] === '\\') {
      const escape = readCssEscape(source, index);
      value += source.slice(index, escape.end);
      index = escape.end;
      continue;
    }
    value += source[index];
    index += 1;
  }
  return { value, end: source[index] === ')' ? index + 1 : index };
}

function findRemoteCssStringInFunction(source: string, start: number): string | undefined {
  let depth = 1;
  let index = start;
  while (index < source.length && depth > 0) {
    if (source.startsWith('/*', index)) {
      index = skipCssComment(source, index);
      continue;
    }
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const valueStart = index + 1;
      index = skipCssString(source, index);
      const valueEnd = source[index - 1] === quote ? index - 1 : index;
      const value = source.slice(valueStart, valueEnd);
      if (isRemoteCssReference(value)) return value;
      continue;
    }
    if (source[index] === '(') depth += 1;
    else if (source[index] === ')') depth -= 1;
    index += 1;
  }
  return undefined;
}

function readCssEscape(source: string, start: number): { value: string; end: number } {
  const hex = /^[0-9a-fA-F]{1,6}/.exec(source.slice(start + 1));
  if (hex) {
    let end = start + 1 + hex[0].length;
    if (/\s/.test(source[end] || '')) end += source[end] === '\r' && source[end + 1] === '\n' ? 2 : 1;
    const codePoint = Number.parseInt(hex[0], 16);
    return { value: codePoint === 0 || codePoint > 0x10ffff ? '\uFFFD' : String.fromCodePoint(codePoint), end };
  }
  return { value: source[start + 1] || '', end: Math.min(start + 2, source.length) };
}

function skipCssTrivia(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) index += 1;
    else if (source.startsWith('/*', index)) index = skipCssComment(source, index);
    else break;
  }
  return index;
}

function skipCssComment(source: string, start: number): number {
  const end = source.indexOf('*/', start + 2);
  return end === -1 ? source.length : end + 2;
}

function skipCssString(source: string, start: number): number {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '\\') {
      index = Math.min(index + 2, source.length);
      continue;
    }
    index += 1;
    if (source[index - 1] === quote) break;
  }
  return index;
}

function isRemoteCssReference(reference: string): boolean {
  let decoded = '';
  let index = 0;
  while (index < reference.length) {
    if (reference[index] !== '\\') {
      decoded += reference[index];
      index += 1;
      continue;
    }
    const escape = readCssEscape(reference, index);
    decoded += escape.value;
    index = escape.end;
  }
  const normalized = decoded.trim();
  if (normalized.startsWith('//')) return true;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized)?.[1]?.toLowerCase();
  return scheme !== undefined && scheme !== 'data';
}

function assertLocalCssReference(path: string, reference: string): void {
  if (isRemoteCssReference(reference)) throw new Error(`生成文件 ${path} 包含不允许的 CSS 网络引用：${reference.trim()}`);
}
