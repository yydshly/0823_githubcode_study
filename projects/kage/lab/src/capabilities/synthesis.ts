import type { CapabilityGapKind, CapabilityProposal } from './proposal.ts';

export interface SynthesisFile {
  path: string;
  language: 'typescript' | 'markdown' | 'json';
  content: string;
  bytes: number;
}

export interface SynthesisCheck {
  id: string;
  status: 'pass' | 'warn' | 'block';
  message: string;
}

export interface SynthesisWorkspace {
  schemaVersion: 1;
  id: string;
  proposalId: string;
  targetCapabilityId: string;
  kind: CapabilityGapKind;
  status: 'draft' | 'blocked';
  isolation: 'virtual-workspace';
  execution: 'never';
  registration: 'not-registered';
  files: readonly SynthesisFile[];
  checks: readonly SynthesisCheck[];
  metrics: { fileCount: number; totalBytes: number; blockingChecks: number; warnings: number };
  nextAction: string;
}

const forbiddenPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ['network request', /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/],
  ['dynamic code execution', /\beval\s*\(|\bnew\s+Function\b/],
  ['browser global mutation', /\b(?:window|document|localStorage|sessionStorage)\s*\./],
  ['Node runtime access', /\bprocess\s*\.|from\s+['"]node:/],
  ['remote asset URL', /https?:\/\//]
];

export function synthesizeProposal(proposal: CapabilityProposal): SynthesisWorkspace {
  const targetId = proposal.targetCapabilityId.split(':')[1] || '';
  const files = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetId) ? scaffoldFiles(proposal.kind, targetId, proposal) : [];
  const checks = auditSynthesisFiles(proposal, files);
  const blockingChecks = checks.filter((check) => check.status === 'block').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  return {
    schemaVersion: 1,
    id: `synthesis-${targetId || 'invalid'}-${stableHash(`${proposal.id}|${proposal.summary}`)}`,
    proposalId: proposal.id,
    targetCapabilityId: proposal.targetCapabilityId,
    kind: proposal.kind,
    status: blockingChecks ? 'blocked' : 'draft',
    isolation: 'virtual-workspace',
    execution: 'never',
    registration: 'not-registered',
    files,
    checks,
    metrics: { fileCount: files.length, totalBytes, blockingChecks, warnings },
    nextAction: blockingChecks
      ? '修复阻断项后重新生成；不得执行或注册当前草案。'
      : '人工检查文件内容；下一阶段在独立目录物化并运行契约测试，当前草案不得执行或注册。'
  };
}

export function auditSynthesisFiles(proposal: CapabilityProposal, files: readonly SynthesisFile[]): SynthesisCheck[] {
  const targetId = proposal.targetCapabilityId.split(':')[1] || '';
  const combined = files.map((file) => file.content).join('\n');
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
  const pathsSafe = files.length > 0 && files.every((file) => isSafePath(file.path, targetId));
  const forbidden = forbiddenPatterns.flatMap(([label, pattern]) => pattern.test(combined) ? [label] : []);
  const imports = files.flatMap((file) => [...file.content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]));
  const importsSafe = imports.every((value) => value === 'three' || value === 'vitest' || value.startsWith('../'));
  const hasDocs = files.some((file) => file.path.startsWith('docs/') && file.language === 'markdown');
  const hasTests = files.some((file) => file.path.startsWith('tests/') && file.language === 'typescript');
  const lifecycleRequired = proposal.kind === 'scene' || proposal.kind === 'effect';
  const hasLifecycle = !lifecycleRequired || ['initialize(', 'update(', 'setQuality(', 'snapshot(', 'dispose('].every((token) => combined.includes(token));
  const assetHonest = proposal.kind !== 'asset' || combined.includes('L0-missing');
  return [
    check('target-id', /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetId), '目标 ID 为安全 kebab-case。', '目标 ID 不安全，不能创建隔离文件。'),
    check('safe-paths', pathsSafe, '所有文件都位于目标能力的允许目录。', '文件路径越界、扩展名不受支持或未产生文件。'),
    check('file-budget', totalBytes <= 24_000, `草案总量 ${totalBytes} bytes，位于 24 KB 预算内。`, `草案总量 ${totalBytes} bytes，超过 24 KB 预算。`),
    check('forbidden-api', forbidden.length === 0, '未发现网络、动态执行、浏览器全局或 Node 运行时访问。', `发现禁止能力：${forbidden.join('、')}。`),
    check('import-allowlist', importsSafe, 'TypeScript import 位于允许集合。', '发现不受信任的包或绝对导入。'),
    check('documentation', hasDocs, '包含边界与验收文档。', '缺少能力文档。'),
    check('test-scaffold', hasTests, '包含独立测试脚手架。', '缺少测试脚手架。'),
    check('plugin-lifecycle', hasLifecycle, lifecycleRequired ? '包含完整插件生命周期方法。' : '该能力不使用 Scene/Effect 生命周期。', 'Scene/Effect 草案缺少生命周期方法。'),
    check('asset-honesty', assetHonest, proposal.kind === 'asset' ? '资产状态明确标记为 L0 Missing。' : '该能力不产生真实资产承诺。', '资产草案未明确标记为 L0 Missing。'),
    { id: 'execution-policy', status: 'pass', message: 'execution=never；静态审计不会运行生成代码。' }
  ];
}

function scaffoldFiles(kind: CapabilityGapKind, id: string, proposal: CapabilityProposal): SynthesisFile[] {
  if (kind === 'asset') return assetFiles(id, proposal);
  if (kind === 'scene' || kind === 'effect') return pluginFiles(kind, id, proposal);
  if (kind === 'driver') return driverFiles(id, proposal);
  if (kind === 'output') return outputFiles(id, proposal);
  return contractFiles(kind, id, proposal);
}

function pluginFiles(kind: 'scene' | 'effect', id: string, proposal: CapabilityProposal): SynthesisFile[] {
  const className = pascal(id) + (kind === 'scene' ? 'Scene' : 'Effect');
  const interfaceName = kind === 'scene' ? 'ScenePlugin' : 'EffectPlugin';
  const source = `import type { PluginContext, RuntimeFrame, ${interfaceName} } from '../runtime/plugin-contract';
import type { EffectiveQuality } from '../runtime/quality';

export class ${className} implements ${interfaceName} {
  readonly id = '${id}';
  private quality: EffectiveQuality = 'balanced';

  initialize(context: PluginContext): void { void context; }
  update(frame: RuntimeFrame): void { void frame; }
  setQuality(quality: EffectiveQuality): void { this.quality = quality; }
  snapshot() { return { id: this.id, metrics: { quality: this.quality, draft: 1 } }; }
  dispose(): void {}
}
`;
  const test = `import { describe, expect, it } from 'vitest';
import { ${className} } from '../src/plugins/${id}-${kind}';

describe('${id} ${kind} contract', () => {
  it('exposes the required lifecycle without initializing WebGL', () => {
    const plugin = new ${className}();
    expect(plugin.id).toBe('${id}');
    expect(typeof plugin.dispose).toBe('function');
  });
});
`;
  return finalize([
    raw(`src/plugins/${id}-${kind}.ts`, 'typescript', source),
    raw(`tests/${id}.test.ts`, 'typescript', test),
    raw(`docs/${id}.md`, 'markdown', documentation(proposal, 'L1 Placeholder：只有生命周期脚手架，没有可展示视觉。'))
  ]);
}

function driverFiles(id: string, proposal: CapabilityProposal): SynthesisFile[] {
  const className = pascal(id) + 'Driver';
  const source = `export interface ${className}Sample { nodeId: string; localProgress: number; globalProgress: number; }

export class ${className} {
  readonly id = '${id}';
  sample(input: number): ${className}Sample {
    const progress = Math.max(0, Math.min(1, input));
    return { nodeId: 'draft-node', localProgress: progress, globalProgress: progress };
  }
  reset(): void {}
  dispose(): void {}
}
`;
  const test = `import { describe, expect, it } from 'vitest';
import { ${className} } from '../src/drivers/${id}-driver';

describe('${id} driver contract', () => {
  it('clamps deterministic progress', () => { expect(new ${className}().sample(2).globalProgress).toBe(1); });
});
`;
  return finalize([
    raw(`src/drivers/${id}-driver.ts`, 'typescript', source),
    raw(`tests/${id}.test.ts`, 'typescript', test),
    raw(`docs/${id}.md`, 'markdown', documentation(proposal, '输入源尚未接入；当前只定义确定性 Driver 输出契约。'))
  ]);
}

function assetFiles(id: string, proposal: CapabilityProposal): SynthesisFile[] {
  const manifest = JSON.stringify({ schemaVersion: 1, id, qualityLevel: 'L0-missing', source: null, license: null, units: null, payloadBytes: 0, publishable: false }, null, 2);
  const test = `import { describe, it } from 'vitest';

describe('${id} asset gate', () => {
  it.todo('loads a licensed GLB/glTF candidate and verifies scale, materials, parts and payload');
});
`;
  return finalize([
    raw(`assets/${id}/asset-manifest.json`, 'json', manifest),
    raw(`tests/${id}-asset.test.ts`, 'typescript', test),
    raw(`docs/assets/${id}-intake.md`, 'markdown', documentation(proposal, 'L0 Missing：没有上传、生成或验证任何真实三维资产。'))
  ]);
}

function outputFiles(id: string, proposal: CapabilityProposal): SynthesisFile[] {
  const source = `export interface ${pascal(id)}Plan { duration: number; fps: number; container: 'mp4'; status: 'draft'; }

export function create${pascal(id)}Plan(duration: number): ${pascal(id)}Plan {
  return { duration: Math.max(1, duration), fps: 30, container: 'mp4', status: 'draft' };
}
`;
  const test = `import { describe, expect, it } from 'vitest';
import { create${pascal(id)}Plan } from '../src/outputs/${id}';

describe('${id} output contract', () => {
  it('creates metadata only and does not encode media', () => { expect(create${pascal(id)}Plan(8).status).toBe('draft'); });
});
`;
  return finalize([
    raw(`src/outputs/${id}.ts`, 'typescript', source),
    raw(`tests/${id}.test.ts`, 'typescript', test),
    raw(`docs/${id}.md`, 'markdown', documentation(proposal, '只生成输出计划；没有录制、编码、音频或可播放 MP4。'))
  ]);
}

function contractFiles(kind: CapabilityGapKind, id: string, proposal: CapabilityProposal): SynthesisFile[] {
  return finalize([
    raw(`src/plugins/${id}-${kind}.ts`, 'typescript', `export const capabilityId = '${kind}:${id}';\n`),
    raw(`tests/${id}.test.ts`, 'typescript', `import { describe, it } from 'vitest';\ndescribe('${id}', () => { it.todo('defines an executable contract'); });\n`),
    raw(`docs/${id}.md`, 'markdown', documentation(proposal, '只有契约占位，不包含运行时实现。'))
  ]);
}

function documentation(proposal: CapabilityProposal, state: string): string {
  return `# ${proposal.title}\n\nStatus: review-required\n\n${state}\n\n## Need\n\n${proposal.summary}\n\n## Contract\n\n${proposal.contract.map((item) => `- ${item}`).join('\n')}\n\n## Quality gates\n\n${proposal.qualityGates.map((item) => `- ${item}`).join('\n')}\n`;
}

function raw(path: string, language: SynthesisFile['language'], content: string): Omit<SynthesisFile, 'bytes'> { return { path, language, content }; }
function finalize(files: Array<Omit<SynthesisFile, 'bytes'>>): SynthesisFile[] { return files.map((file) => ({ ...file, bytes: new TextEncoder().encode(file.content).byteLength })); }
function isSafePath(path: string, targetId: string): boolean {
  return Boolean(targetId) && !path.includes('..') && !path.startsWith('/') && !/^[A-Za-z]:/.test(path)
    && /^(?:src|tests|docs|assets)\/[a-z0-9/_.-]+\.(?:ts|md|json)$/.test(path)
    && path.includes(targetId);
}
function check(id: string, passed: boolean, success: string, failure: string): SynthesisCheck { return { id, status: passed ? 'pass' : 'block', message: passed ? success : failure }; }
function pascal(value: string): string { return value.split('-').map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(''); }
function stableHash(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }

