import { BaselineBriefInterpreter } from './baseline-interpreter';
import type { BriefInterpretation, BriefInterpreter, CreativeBrief, CreativeProviderId, ProviderProvenance, ProviderStatusResponse } from './schema';

const baseline = new BaselineBriefInterpreter();

export class RemoteBriefInterpreter implements BriefInterpreter {
  readonly id: string;
  lastProvenance: ProviderProvenance | null = null;

  constructor(readonly requested: CreativeProviderId, readonly jobId: string | null = null) {
    this.id = `remote-${requested}`;
  }

  async interpret(brief: CreativeBrief): Promise<BriefInterpretation> {
    try {
      const response = await fetch('/api/creative/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, provider: this.requested, ...(this.jobId ? { jobId: this.jobId } : {}) })
      });
      const body = await response.json() as { interpretation?: BriefInterpretation; error?: string };
      if (!response.ok || !body.interpretation) throw new Error(body.error || `模型服务返回 HTTP ${response.status}`);
      assertRemoteInterpretation(body.interpretation);
      this.lastProvenance = body.interpretation.provenance;
      return body.interpretation;
    } catch (error) {
      if (this.requested !== 'auto') throw error;
      const started = performance.now();
      const local = await baseline.interpret(brief);
      const message = error instanceof Error ? error.message : String(error);
      const provenance: ProviderProvenance = {
        requested: 'auto', selected: 'local', model: 'baseline-keyword-v1', mode: 'local',
        latencyMs: Math.round(performance.now() - started), fallbackReason: `模型服务不可用：${message}`, cacheStatus: 'bypass'
      };
      this.lastProvenance = provenance;
      return { ...local, providerId: 'local:baseline-keyword-v1', provenance };
    }
  }
}

export async function fetchProviderStatus(): Promise<ProviderStatusResponse | null> {
  try {
    const response = await fetch('/api/creative/providers', { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json() as ProviderStatusResponse;
    if (!Array.isArray(body.providers)) return null;
    return body;
  } catch {
    return null;
  }
}

function assertRemoteInterpretation(value: BriefInterpretation): void {
  if (!value || typeof value.providerId !== 'string' || !value.provenance || !Array.isArray(value.directions) || value.directions.length < 1) {
    throw new Error('模型服务返回了无效的解释结构。');
  }
  if (value.provenance.mode === 'remote' && (!Array.isArray(value.effectSpecs) || value.effectSpecs.length !== value.directions.length)) {
    throw new Error('模型服务没有返回与预览方向一一对应的 EffectSpec。');
  }
}
