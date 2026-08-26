import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CreativeBrief } from '../src/generation/schema.ts';
import { modelInterpretationSchema, type ModelInterpretation } from './model-schema.ts';

const cacheVersion = 1;
const schemaRevision = 'experience-blueprint-v1';

interface CacheEntry {
  version: 1;
  key: string;
  provider: string;
  model: string;
  createdAt: string;
  output: ModelInterpretation;
}

export interface InterpretationCacheHit {
  key: string;
  createdAt: string;
  output: ModelInterpretation;
}

export class InterpretationCache {
  constructor(
    private readonly directory: string,
    private readonly maxAgeMs = 7 * 24 * 60 * 60 * 1000
  ) {}

  key(provider: string, model: string, brief: CreativeBrief): string {
    return createHash('sha256')
      .update(JSON.stringify({ schemaRevision, provider, model, text: brief.text, seed: brief.seed ?? 0 }))
      .digest('hex');
  }

  async read(provider: string, model: string, brief: CreativeBrief): Promise<InterpretationCacheHit | null> {
    const key = this.key(provider, model, brief);
    try {
      const parsed = JSON.parse(await readFile(join(this.directory, `${key}.json`), 'utf8')) as Partial<CacheEntry>;
      const createdAt = typeof parsed.createdAt === 'string' ? Date.parse(parsed.createdAt) : Number.NaN;
      if (parsed.version !== cacheVersion || parsed.key !== key || parsed.provider !== provider || parsed.model !== model) return null;
      if (!Number.isFinite(createdAt) || Date.now() - createdAt > this.maxAgeMs) return null;
      return { key, createdAt: parsed.createdAt!, output: modelInterpretationSchema.parse(parsed.output) };
    } catch {
      return null;
    }
  }

  async write(provider: string, model: string, brief: CreativeBrief, output: ModelInterpretation): Promise<string> {
    const key = this.key(provider, model, brief);
    const valid = modelInterpretationSchema.parse(output);
    const entry: CacheEntry = {
      version: cacheVersion,
      key,
      provider,
      model,
      createdAt: new Date().toISOString(),
      output: valid
    };
    await mkdir(this.directory, { recursive: true });
    const destination = join(this.directory, `${key}.json`);
    const temporary = join(this.directory, `${key}.${process.pid}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(entry), { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, destination);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => undefined);
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code !== 'EEXIST') throw error;
    }
    return key;
  }
}

export function interpretationCacheFromEnvironment(environment: Readonly<Record<string, string | undefined>>): InterpretationCache {
  const directory = environment.CREATIVE_CACHE_DIR || join(process.cwd(), '.signal-lab-cache', 'creative-v1');
  const configuredAge = Number(environment.CREATIVE_CACHE_MAX_AGE_MS);
  const maxAgeMs = Number.isFinite(configuredAge) && configuredAge > 0 ? Math.min(configuredAge, 30 * 24 * 60 * 60 * 1000) : undefined;
  return new InterpretationCache(directory, maxAgeMs);
}
