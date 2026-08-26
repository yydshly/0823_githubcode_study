import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGenerationJob, readGenerationJob, updateGenerationJob } from '../server/generation-job-store';
import { runGenerationJobPipeline, type GenerationJobRunnerDependencies } from '../server/generation-job-runner';
import type { CreativeRun } from '../src/generation/schema';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('server-owned generation job runner', () => {
  it('owns planning, asset selection, Codex build and final visual selection', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root, GENERATION_JOB_TOTAL_TIMEOUT_MS: '720000' };
    const job = await createGenerationJob({
      brief: '为一件会随着呼吸显露纹理的声音产品构建安静的沉浸式网页。',
      provider: 'codex', quality: 'high', seed: 43,
    }, environment);
    let capturedAssets: unknown[] = [];
    const receipt = {
      id: 'dedicated-server-final', provider: 'codex' as const, model: 'gpt-5.6-sol', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-server-final/', generatedAt: new Date().toISOString(),
      files: 4, assets: 1, sourceBytes: 12000, hasShaders: true, compileMs: 140, attempts: 1,
      directory: 'generated/runs/dedicated-server-final',
    };
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => ({
        providerId: 'codex:gpt-5.6-sol',
        provenance: { requested: 'codex', selected: 'codex', model: 'gpt-5.6-sol', mode: 'remote', latencyMs: 50, fallbackReason: null, cacheStatus: 'miss' },
        subject: '声音产品', audience: '创作者', intentTags: [], evidence: [], capabilityGaps: [], effectSpecs: null, experienceBlueprints: null, directions: [],
      }),
      compileRun: async () => ({
        id: 'run-server',
        candidates: [{
          id: 'candidate-server',
          manifest: { title: '呼吸声场', summary: '声音产品在呼吸中显露结构。', theme: { deep: '#07100d', surface: '#10211b', text: '#edf5ef', muted: '#94a59b', accent: '#9df4cc', accentSoft: '#6ea88d' } },
          direction: { scenePlugin: 'composed-world' },
          productionPlan: { status: 'ready' },
          effectSpec: { assetRequirements: [] },
        }],
      } as unknown as CreativeRun),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [{ id: 'minimax', available: false, model: 'image-01', reason: 'not needed', capabilities: [] }] }),
      selectProjectAssets: () => [{
        id: 'acoustic-resonance-instrument-v1',
        uri: '/creative-assets/acoustic-resonance-instrument-v1.png',
        bundlePath: 'assets/acoustic-resonance-instrument-v1.png',
        kind: 'image', source: 'chatgpt-generated', role: 'acoustic product hero',
        description: 'A transparent acoustic product used as the primary visual anchor.', payloadBytes: 2048, tags: ['声音产品'],
      }],
      generateAssets: async () => { throw new Error('MiniMax should not be called when project assets match.'); },
      build: async (input) => { capturedAssets = ((input as { reference?: { assets?: unknown[] } }).reference?.assets || []); return receipt; },
      refine: async () => ({
        status: 'kept', parentId: receipt.id, receipt,
        sourceAssessment: { schemaVersion: 1, score: 91, verdict: 'pass', summary: '机械检查通过。', findings: [], observations: [] },
        finalAssessment: { schemaVersion: 1, score: 91, verdict: 'pass', summary: '机械复验通过。', findings: [], observations: [] },
        visualAcceptance: { schemaVersion: 1, score: 93, verdict: 'pass', assetRole: 'integrated', summary: '目标和结果一致。', findings: [] },
        summary: '原版本通过。', resolved: [], remaining: [],
      }),
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const completed = await readGenerationJob(job.id, environment);
    expect(completed?.status).toBe('complete');
    expect(completed?.bestRunId).toBe(receipt.id);
    expect(completed?.finalScore).toBe(93);
    expect(completed?.history.map((entry) => entry.stage)).toEqual(expect.arrayContaining(['planning', 'assets', 'authoring', 'reviewing', 'refining', 'complete']));
    expect(capturedAssets).toHaveLength(1);
  });

  it('keeps a compiled page available when automated visual review cannot finish', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-review-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为一座雨中的小型观测站构建连续空间网页。', provider: 'codex', quality: 'balanced', seed: 9,
    }, environment);
    const receipt = {
      id: 'dedicated-review-fallback', provider: 'codex' as const, model: 'gpt-5.6-sol', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-review-fallback/', generatedAt: new Date().toISOString(),
      files: 4, assets: 0, sourceBytes: 9000, hasShaders: true, compileMs: 90, attempts: 1,
      directory: 'generated/runs/dedicated-review-fallback',
    };
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob, updateJob: updateGenerationJob,
      interpret: async () => ({ provenance: { selected: 'codex', model: 'gpt-5.6-sol' } } as never),
      compileRun: async () => ({ id: 'run-review', candidates: [{ id: 'candidate-review', manifest: { title: '雨中观测站', summary: '连续空间。', theme: {} }, direction: { scenePlugin: 'composed-world' }, productionPlan: { status: 'ready' }, effectSpec: { assetRequirements: [] } }] } as unknown as CreativeRun),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [{ id: 'observatory', uri: '/creative-assets/observatory-approach-v1.png', bundlePath: 'assets/observatory.png', kind: 'environment', source: 'chatgpt-generated', role: 'observatory environment', description: 'A full bleed observatory environment for the opening.', payloadBytes: 2048, tags: ['观测站'] }],
      generateAssets: async () => { throw new Error('not expected'); },
      build: async () => receipt,
      refine: async () => { throw new Error('browser capture unavailable'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const completed = await readGenerationJob(job.id, environment);
    expect(completed?.status).toBe('complete');
    expect(completed?.bestReceipt?.id).toBe(receipt.id);
    expect(completed?.finalScore).toBeNull();
    expect(completed?.message).toContain('视觉验收未完成');
  });
});
