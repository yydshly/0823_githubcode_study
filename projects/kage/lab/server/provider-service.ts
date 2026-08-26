import { createOpenAI, type OpenAILanguageModelResponsesOptions } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, Output } from 'ai';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter.ts';
import type { BriefInterpretation, CreativeBrief, CreativeProviderId, ProviderAvailability, ProviderProvenance, ProviderStatusResponse } from '../src/generation/schema.ts';
import { creativeDirectorPrompt, modelInterpretationJsonSchema, modelInterpretationSchema, normalizeModelInterpretation, type ModelInterpretation } from './model-schema.ts';
import { availableProductionCapabilities, createProductionCapabilityProfile } from '../src/generation/production-capabilities.ts';
import { interpretationCacheFromEnvironment } from './interpretation-cache.ts';

type RemoteProviderId = Exclude<CreativeProviderId, 'auto' | 'local'>;
type Environment = Readonly<Record<string, string | undefined>>;

interface ProviderRuntime {
  codexBinary: string | null;
  environment: Environment;
}

interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

const baseline = new BaselineBriefInterpreter();
let codexBinaryPromise: Promise<string | null> | null = null;

export async function providerStatus(environment: Environment = process.env): Promise<ProviderStatusResponse> {
  const codexBinary = await findCodexBinary(environment);
  const providers: ProviderAvailability[] = [
    availability('codex', Boolean(codexBinary), modelId('codex', environment), codexBinary ? null : '未找到 Codex CLI'),
    availability('mimo', Boolean(environment.MIMO_API_KEY), environment.MIMO_MODEL || 'mimo-v2.5', environment.MIMO_API_KEY ? null : '缺少 MIMO_API_KEY'),
    availability('minimax', Boolean(environment.MINIMAX_API_KEY), environment.MINIMAX_MODEL || 'MiniMax-M3', environment.MINIMAX_API_KEY ? null : '缺少 MINIMAX_API_KEY', environment.MINIMAX_API_KEY ? { 'image-generation': 'minimax-image-01', 'texture-generation': 'minimax-image-01' } : {}),
    availability('openai', Boolean(environment.OPENAI_API_KEY), environment.OPENAI_CREATIVE_MODEL || 'gpt-5.6-luna', environment.OPENAI_API_KEY ? null : '缺少 OPENAI_API_KEY'),
    availability('local', true, 'baseline-keyword-v1', null)
  ];
  return { defaultProvider: readProviderId(environment.CREATIVE_PROVIDER, 'auto'), providers };
}

export async function interpretWithProvider(brief: CreativeBrief, requested: CreativeProviderId, environment: Environment = process.env): Promise<BriefInterpretation> {
  const text = brief.text.trim();
  if (text.length < 8) throw new Error('请至少描述目标、主体或氛围，建议不少于 8 个字符。');
  const runtime: ProviderRuntime = { codexBinary: await findCodexBinary(environment), environment };
  const status = await providerStatus(environment);
  const order = providerOrder(requested, status, environment);
  const failures: string[] = [];
  const cache = interpretationCacheFromEnvironment(environment);

  for (const selected of order) {
    const started = Date.now();
    try {
      if (selected === 'local') {
        const local = await baseline.interpret(brief);
        return {
          ...local,
          providerId: 'local:baseline-keyword-v1',
          provenance: provenance(requested, 'local', 'baseline-keyword-v1', Date.now() - started, failures.length ? failures.join('；') : null, 'bypass')
        };
      }
      const model = modelId(selected, environment);
      const cached = await cache.read(selected, model, brief);
      if (cached) return normalizeModelInterpretation(cached.output, provenance(requested, selected, model, Date.now() - started, null, 'hit'), brief);
      const output = await runRemoteProvider(selected, brief, runtime);
      const interpretation = normalizeModelInterpretation(output, provenance(requested, selected, model, Date.now() - started, null, 'miss'), brief);
      await cache.write(selected, model, brief, output).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[creative-provider] EffectSpec cache write failed: ${message}`);
      });
      return interpretation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${selected}: ${message}`);
      if (requested !== 'auto') throw new Error(message);
    }
  }
  throw new Error(failures.join('；') || '没有可用的创意解释器。');
}

export function providerOrder(requested: CreativeProviderId, status: ProviderStatusResponse, environment: Environment): Exclude<CreativeProviderId, 'auto'>[] {
  if (requested !== 'auto') {
    const available = status.providers.find((item) => item.id === requested)?.available;
    if (!available) throw new Error(status.providers.find((item) => item.id === requested)?.reason || `${requested} 不可用`);
    return [requested];
  }
  const configured = readProviderId(environment.CREATIVE_PROVIDER, 'auto');
  const preferred: Exclude<CreativeProviderId, 'auto'>[] = configured !== 'auto'
    ? [configured, 'codex', 'mimo', 'minimax', 'openai', 'local']
    : ['codex', 'mimo', 'minimax', 'openai', 'local'];
  return [...new Set(preferred)].filter((id) => status.providers.find((item) => item.id === id)?.available);
}

function availability(id: ProviderAvailability['id'], available: boolean, model: string, reason: string | null, mediaCapabilities: Parameters<typeof createProductionCapabilityProfile>[2] = {}): ProviderAvailability {
  const profile = createProductionCapabilityProfile(id, model, mediaCapabilities);
  return { id, available, model, reason, capabilities: availableProductionCapabilities(profile) };
}

function provenance(
  requested: CreativeProviderId,
  selected: Exclude<CreativeProviderId, 'auto'>,
  model: string,
  latencyMs: number,
  fallbackReason: string | null,
  cacheStatus: ProviderProvenance['cacheStatus']
): ProviderProvenance {
  return { requested, selected, model, mode: selected === 'local' ? 'local' : 'remote', latencyMs, fallbackReason, cacheStatus };
}

function modelId(provider: RemoteProviderId, environment: Environment): string {
  if (provider === 'minimax') return environment.MINIMAX_MODEL || 'MiniMax-M3';
  if (provider === 'mimo') return environment.MIMO_MODEL || 'mimo-v2.5';
  if (provider === 'openai') return environment.OPENAI_CREATIVE_MODEL || 'gpt-5.6-luna';
  return environment.CODEX_INTERPRETATION_MODEL || environment.CODEX_CREATIVE_MODEL || 'gpt-5.6-terra';
}

async function runRemoteProvider(provider: RemoteProviderId, brief: CreativeBrief, runtime: ProviderRuntime): Promise<ModelInterpretation> {
  if (provider === 'codex') return runCodex(brief, runtime);
  const { system, prompt } = creativeDirectorPrompt(brief.text);
  if (provider === 'minimax' || provider === 'mimo') {
    const minimax = createOpenAICompatible({
      name: provider,
      apiKey: provider === 'mimo' ? runtime.environment.MIMO_API_KEY! : runtime.environment.MINIMAX_API_KEY!,
      baseURL: provider === 'mimo' ? runtime.environment.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1' : runtime.environment.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
      supportsStructuredOutputs: false,
      ...(provider === 'minimax' ? { transformRequestBody: (body: Record<string, unknown>) => {
        const transformed: Record<string, unknown> = { ...body, reasoning_split: true };
        if (typeof transformed.max_tokens === 'number') {
          transformed.max_completion_tokens = transformed.max_tokens;
          delete transformed.max_tokens;
        }
        return transformed;
      }} : {})
    });
    const result = await generateText({
      model: minimax(modelId(provider, runtime.environment)),
      system,
      prompt,
      maxOutputTokens: 12000,
      temperature: .55,
      output: Output.object({ name: 'creative_interpretation', description: 'Goal-driven EffectSpecs and aligned page blueprints.', schema: modelInterpretationSchema })
    });
    return result.output;
  }

  const openai = createOpenAI({ apiKey: runtime.environment.OPENAI_API_KEY! });
  const result = await generateText({
    model: openai.responses(modelId(provider, runtime.environment)),
    system,
    prompt,
    maxOutputTokens: 12000,
    output: Output.object({ name: 'creative_interpretation', description: 'Goal-driven EffectSpecs and aligned page blueprints.', schema: modelInterpretationSchema }),
    providerOptions: {
      openai: { store: false, reasoningEffort: 'low', reasoningSummary: null, textVerbosity: 'low' } satisfies OpenAILanguageModelResponsesOptions
    }
  });
  return result.output;
}

async function runCodex(brief: CreativeBrief, runtime: ProviderRuntime): Promise<ModelInterpretation> {
  if (!runtime.codexBinary) throw new Error('未找到 Codex CLI。');
  const directory = await mkdtemp(join(tmpdir(), 'signal-lab-codex-'));
  const schemaPath = join(directory, 'interpretation.schema.json');
  const outputPath = join(directory, 'interpretation.json');
  const { system, prompt } = creativeDirectorPrompt(brief.text);
  try {
    await writeFile(schemaPath, JSON.stringify(modelInterpretationJsonSchema()), 'utf8');
    const args = ['exec', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never', '--output-schema', schemaPath, '--output-last-message', outputPath];
    const requestedModel = modelId('codex', runtime.environment);
    if (requestedModel && !/^[A-Za-z0-9._:-]+$/.test(requestedModel)) throw new Error('CODEX_CREATIVE_MODEL 包含不安全字符。');
    if (requestedModel) args.push('--model', requestedModel);
    const reasoningEffort = readCodexReasoningEffort(runtime.environment.CODEX_CREATIVE_REASONING_EFFORT);
    args.push('-c', `model_reasoning_effort=${reasoningEffort}`);
    args.push('-');
    const result = await runProcess(runtime.codexBinary, args, `${system}\n\n${prompt}`, directory, numberFrom(runtime.environment.CREATIVE_MODEL_TIMEOUT_MS, 240_000));
    if (result.code !== 0) throw new Error(cleanProcessError(result.stderr || result.stdout));
    const raw = await readFile(outputPath, 'utf8');
    return modelInterpretationSchema.parse(JSON.parse(raw));
  } finally {
    await cleanupCodexDirectory(directory);
  }
}
async function cleanupCodexDirectory(directory: string): Promise<void> {
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Cleanup must remain observable, but a transient Windows file lock must not replace a valid model result.
    console.warn(`[creative-provider] Codex temporary directory cleanup failed: ${message}`);
  }
}


async function findCodexBinary(environment: Environment): Promise<string | null> {
  if (environment.CODEX_BINARY) {
    try { await access(environment.CODEX_BINARY); return environment.CODEX_BINARY; } catch { return null; }
  }
  if (codexBinaryPromise) return codexBinaryPromise;
  codexBinaryPromise = (async () => {
    const locator = process.platform === 'win32' ? ['where.exe', ['codex.cmd']] as const : ['which', ['codex']] as const;
    const result = await runProcess(locator[0], [...locator[1]], '', process.cwd(), 5_000).catch(() => null);
    if (!result || result.code !== 0) return null;
    const candidates = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const candidate = candidates.find((path) => process.platform !== 'win32' || basename(path).toLowerCase() === 'codex.cmd');
    if (!candidate) return null;
    try { await access(candidate); return candidate; } catch { return null; }
  })();
  return codexBinaryPromise;
}

function runProcess(command: string, args: readonly string[], input: string, cwd: string, timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const usesCommandScript = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
    const executable = usesCommandScript ? process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe' : command;
    const child = spawn(executable, usesCommandScript ? ['/d', '/s', '/c', `call ${[command, ...args].map(cmdQuote).join(' ')}`] : [...args], { cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = ''; let settled = false;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`模型调用超过 ${Math.round(timeoutMs / 1000)} 秒。`)); }, timeoutMs);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', (error) => { if (settled) return; settled = true; clearTimeout(timer); reject(error); });
    child.once('close', (code) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ code: code ?? -1, stdout, stderr }); });
    child.stdin.end(input);
  });
}
function cmdQuote(value: string): string {
  if (/["\r\n]/.test(value)) throw new Error('Codex 启动参数包含不安全字符。');
  return /\s/.test(value) ? `"${value}"` : value;
}


function cleanProcessError(value: string): string {
  const lines = value.trim().split(/\r?\n/).filter(Boolean);
  return (lines.slice(-4).join(' ') || 'Codex 未返回有效结果。').slice(0, 600);
}

function numberFrom(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5_000 ? Math.min(parsed, 300_000) : fallback;
}

function readCodexReasoningEffort(value: string | undefined): string {
  const allowed = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);
  return value && allowed.has(value) ? value : 'high';
}

function readProviderId(value: string | undefined, fallback: CreativeProviderId): CreativeProviderId {
  return value === 'auto' || value === 'codex' || value === 'mimo' || value === 'minimax' || value === 'openai' || value === 'local' ? value : fallback;
}
