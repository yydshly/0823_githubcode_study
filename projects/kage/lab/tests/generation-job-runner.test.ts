import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGenerationJob, readGenerationJob, updateGenerationJob } from '../server/generation-job-store';
import { importUserAsset, readCachedUserAsset } from '../server/asset-generator.ts';
import { boundedEnvironment, ensureGenerationJobRunning, recoverGenerationJobCandidate, runGenerationJobPipeline, submitGenerationJobAssets, type GenerationJobRunnerDependencies } from '../server/generation-job-runner';
import type { CreativeRun } from '../src/generation/schema';
import type { DedicatedCodeRequest } from '../server/dedicated-code-service.ts';
import { BaselineBriefInterpreter } from '../src/generation/baseline-interpreter.ts';
import { generateCreativeRun } from '../src/generation/orchestrator.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';
import { evaluateAssetQualityGate } from '../src/generation/asset-quality-gate.ts';
import { transparentSubjectPng } from './image-test-fixtures.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('server-owned generation job runner', () => {
  it('treats host model timeouts as upper bounds rather than expandable defaults', () => {
    expect(boundedEnvironment({
      CREATIVE_MODEL_TIMEOUT_MS: '420000',
      DEDICATED_CODE_TIMEOUT_MS: '420000',
      VISUAL_REFINEMENT_TIMEOUT_MS: '420000',
      VISUAL_ACCEPTANCE_TIMEOUT_MS: '420000'
    })).toMatchObject({
      CREATIVE_MODEL_TIMEOUT_MS: '90000',
      DEDICATED_CODE_TIMEOUT_MS: '90000',
      VISUAL_REFINEMENT_TIMEOUT_MS: '45000',
      VISUAL_ACCEPTANCE_TIMEOUT_MS: '30000',
      GENERATION_JOB_TOTAL_TIMEOUT_MS: '180000'
    });
  });

  it('separates balanced and high-quality authoring roles from visual refinement', () => {
    expect(boundedEnvironment({})).toMatchObject({
      CODEX_BALANCED_AUTHORING_MODEL: 'gpt-5.6-terra',
      CODEX_HIGH_QUALITY_AUTHORING_MODEL: 'gpt-5.6-terra',
      CODEX_AUTHORING_REASONING_EFFORT: 'medium',
      CODEX_VISUAL_REFINEMENT_MODEL: 'gpt-5.6-sol',
      CODEX_VISUAL_REFINEMENT_REASONING_EFFORT: 'medium',
      CODEX_VISUAL_ACCEPTANCE_MODEL: 'gpt-5.6-luna',
    });
  });

  it('honors an explicit legacy bundle-model override without changing the Sol refinement role', () => {
    expect(boundedEnvironment({ CODEX_BUNDLE_MODEL: 'custom-author' })).toMatchObject({
      CODEX_AUTHORING_MODEL: 'custom-author',
      CODEX_BUNDLE_MODEL: 'custom-author',
      CODEX_VISUAL_REFINEMENT_MODEL: 'gpt-5.6-sol',
    });
  });

  it('uses deterministic V2 planning by default and reserves Codex for page authoring', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-deterministic-planning-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为城市机械钟表建立修复档案，展示锈蚀、拆解、校准和重新走时。',
      provider: 'codex', quality: 'high', seed: 89,
    }, environment);
    let remoteCalls = 0;
    let localCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { remoteCalls += 1; throw new Error('不应调用远程创意规划。'); },
      interpretLocally: async (brief) => {
        localCalls += 1;
        return new BaselineBriefInterpreter().interpret(brief);
      },
      compileRun: (brief, interpretation, context) => generateCreativeRun(brief, {
        id: 'deterministic-v2-planning', interpret: async () => interpretation,
      }, context),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('本测试不生成素材。'); },
      build: async () => { throw new Error('素材门禁应先暂停。'); },
      refine: async () => { throw new Error('不应精修。'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const result = await readGenerationJob(job.id, environment);
    expect(remoteCalls).toBe(0);
    expect(localCalls).toBe(1);
    expect(result?.status).toBe('blocked');
    expect(result?.selectedProvider).toBe('local');
    expect(result?.assetGate?.decision).toBe('needs-codex-assets');
  });

  it('recovers a timed-out planning checkpoint once with the local interpreter and keeps the asset gate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-planning-recovery-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root, SIGNAL_REMOTE_CREATIVE_PLANNING: '1' };
    const job = await createGenerationJob({
      brief: '为一款智能声音产品设计安静、真实的发布网页，最后预约体验。',
      provider: 'codex', quality: 'high', seed: 17,
    }, environment);
    let remoteCalls = 0;
    let localCalls = 0;
    let buildCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { remoteCalls += 1; throw new Error('远程规划超时。'); },
      interpretLocally: async (brief) => {
        localCalls += 1;
        return new BaselineBriefInterpreter().interpret(brief);
      },
      compileRun: (brief, interpretation, context) => generateCreativeRun(brief, {
        id: 'local-planning-recovery', interpret: async () => interpretation,
      }, context),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('不应调用图片生成。'); },
      build: async () => { buildCalls += 1; throw new Error('素材门禁应先阻断构建。'); },
      refine: async () => { throw new Error('不应进入精修。'); },
    };

    await expect(runGenerationJobPipeline(job.id, environment, dependencies)).rejects.toThrow('远程规划超时');
    const failed = await readGenerationJob(job.id, environment);
    expect(failed?.retryableStage).toBe('planning');
    expect(failed?.v2ContractSummary?.contractId).toBe(createV2CreativeContract(job.brief).id);
    await updateGenerationJob(job.id, {
      stage: 'failed', message: '模拟旧预算已用尽。', retryableStage: 'planning',
      budgetStartedAt: '2020-01-01T00:00:00.000Z', deadlineAt: '2020-01-01T00:00:01.000Z',
    }, environment);

    const recovered = await recoverGenerationJobCandidate(job.id, environment, dependencies);
    expect(remoteCalls).toBe(1);
    expect(localCalls).toBe(1);
    expect(buildCalls).toBe(0);
    expect(recovered.recoveryAttempts).toBe(1);
    expect(recovered.status, recovered.error || recovered.message).toBe('blocked');
    expect(recovered.assetGate?.decision).toBe('needs-codex-assets');
    expect(Date.parse(recovered.deadlineAt!)).toBeGreaterThan(Date.parse('2020-01-01T00:00:01.000Z'));
    await expect(recoverGenerationJobCandidate(job.id, environment, dependencies)).rejects.toThrow('已经执行过一次');
    expect(remoteCalls).toBe(1);
    expect(localCalls).toBe(1);
  });

  it('terminates planning recovery when the deterministic contract id drifts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-planning-drift-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为城市雨水观测设计连续数据网页。', provider: 'codex', quality: 'balanced', seed: 18,
    }, environment);
    const summary = summarizeV2CreativeContract(createV2CreativeContract(job.brief));
    await updateGenerationJob(job.id, {
      stage: 'failed', message: '远程规划超时。', retryableStage: 'planning',
      v2ContractSummary: { ...summary, contractId: 'contract-drifted' },
    }, environment);
    let localCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob, updateJob: updateGenerationJob,
      interpret: async () => { throw new Error('不应远程规划。'); },
      interpretLocally: async () => { localCalls += 1; throw new Error('不应本地规划。'); },
      compileRun: async () => { throw new Error('不应编译方向。'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [], generateAssets: async () => { throw new Error('不应生成素材。'); },
      build: async () => { throw new Error('不应构建。'); }, refine: async () => { throw new Error('不应精修。'); },
    };

    const result = await recoverGenerationJobCandidate(job.id, environment, dependencies);
    expect(localCalls).toBe(0);
    expect(result.status).toBe('failed');
    expect(result.retryableStage).toBeNull();
    expect(result.recoveryAttempts).toBe(1);
    expect(result.error).toContain('规划合同漂移');
  });

  it('makes a local planning recovery failure terminal without calling the remote interpreter', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-local-planning-failure-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为小型水文档案设计可探索网页。', provider: 'codex', quality: 'low', seed: 19,
    }, environment);
    const summary = summarizeV2CreativeContract(createV2CreativeContract(job.brief));
    await updateGenerationJob(job.id, {
      stage: 'failed', message: '远程规划超时。', retryableStage: 'planning', v2ContractSummary: summary,
    }, environment);
    let remoteCalls = 0;
    let localCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob, updateJob: updateGenerationJob,
      interpret: async () => { remoteCalls += 1; throw new Error('禁止远程规划。'); },
      interpretLocally: async () => { localCalls += 1; throw new Error('本地规划损坏。'); },
      compileRun: async () => { throw new Error('不应编译方向。'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [], generateAssets: async () => { throw new Error('不应生成素材。'); },
      build: async () => { throw new Error('不应构建。'); }, refine: async () => { throw new Error('不应精修。'); },
    };

    const result = await recoverGenerationJobCandidate(job.id, environment, dependencies);
    expect(remoteCalls).toBe(0);
    expect(localCalls).toBe(1);
    expect(result.status).toBe('failed');
    expect(result.retryableStage).toBeNull();
    expect(result.recoveryAttempts).toBe(1);
    expect(result.error).toContain('本地规划损坏');
    await expect(recoverGenerationJobCandidate(job.id, environment, dependencies)).rejects.toThrow('已经执行过一次');
  });

  it('does not advertise or extend recovery when authoring stops before a candidate is saved', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-no-candidate-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为独立剧场灯光设计师制作实时排练台，调整灯具参数时同步改变光束、落点和照度。',
      provider: 'codex', quality: 'high', seed: 83,
    }, environment);
    const contract = createV2CreativeContract(job.brief);
    const resumeBuild: DedicatedCodeRequest = {
      brief: job.brief,
      seed: job.seed,
      quality: job.quality,
      runId: 'run-no-candidate',
      selectedId: 'candidate-no-candidate',
      creativeContract: contract,
      reference: {
        title: '树冠降温观察', summary: '明亮的共享状态观察页。', scenePlugin: 'composed-world',
        productionStatus: 'ready', theme: {}, assets: [],
      },
    };
    await updateGenerationJob(job.id, {
      stage: 'assets',
      message: '程序化路线已确认。',
      assetGate: evaluateAssetQualityGate(contract, []),
      resumeBuild,
    }, environment);
    let recoverCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { throw new Error('not expected'); },
      compileRun: async () => { throw new Error('not expected'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('not expected'); },
      build: async (_input, _runtime, onProgress) => {
        await onProgress?.({ phase: 'attempt-start', attempt: 1, totalAttempts: 1, timeoutMs: 120_000, failure: null });
        throw new Error('专属代码模型调用超过 120 秒。');
      },
      hasRecoveryCandidate: async () => false,
      recover: async () => { recoverCalls += 1; throw new Error('must not recover'); },
      refine: async () => { throw new Error('not expected'); },
    };

    await expect(runGenerationJobPipeline(job.id, environment, dependencies)).rejects.toThrow('120 秒');
    const failed = await readGenerationJob(job.id, environment);
    expect(failed?.status).toBe('failed');
    expect(failed?.retryableStage).toBeNull();
    expect(failed?.message).toContain('没有可恢复检查点');
    expect(failed?.message).not.toContain('可从该阶段恢复');

    const legacy = await updateGenerationJob(job.id, {
      stage: 'failed', message: '旧任务曾错误显示可恢复。', retryableStage: 'authoring',
    }, environment);
    const recovered = await recoverGenerationJobCandidate(job.id, environment, dependencies);
    expect(recovered.status).toBe('failed');
    expect(recovered.retryableStage).toBeNull();
    expect(recovered.recoveryAttempts).toBe(0);
    expect(recovered.budgetStartedAt).toBe(legacy.budgetStartedAt);
    expect(recovered.deadlineAt).toBe(legacy.deadlineAt);
    expect(recoverCalls).toBe(0);
  });

  it('opens one fresh bounded window before replaying an expired authoring candidate', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-expired-authoring-recovery-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root, GENERATION_JOB_TOTAL_TIMEOUT_MS: '300000' };
    const job = await createGenerationJob({
      brief: '为手工工坊设计一个可直接调整材料状态的明亮教学网页。', provider: 'codex', quality: 'low', seed: 92,
    }, environment);
    const resumeBuild: DedicatedCodeRequest = {
      brief: job.brief,
      seed: job.seed,
      quality: job.quality,
      runId: 'run-expired-authoring',
      selectedId: 'candidate-expired-authoring',
      creativeContract: createV2CreativeContract(job.brief),
      reference: {
        title: '材料状态', summary: '同一主体随参数变化。', scenePlugin: 'composed-world',
        productionStatus: 'ready', theme: {}, assets: [],
      },
    };
    await updateGenerationJob(job.id, {
      stage: 'failed',
      message: '候选已保存但旧窗口结束。',
      retryableStage: 'authoring',
      model: 'gpt-5.6-terra',
      authoringAttempts: 1,
      resumeBuild,
      budgetStartedAt: '2020-01-01T00:00:00.000Z',
      deadlineAt: '2020-01-01T00:05:00.000Z',
    }, environment);
    const receipt = {
      id: 'dedicated-expired-recovered', provider: 'codex' as const, model: 'gpt-5.6-terra', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-expired-recovered/', generatedAt: new Date().toISOString(),
      files: 4, assets: 0, sourceBytes: 8000, hasShaders: false, compileMs: 80, attempts: 1,
      directory: 'generated/runs/dedicated-expired-recovered',
    };
    let capturedDeadlineAt: string | undefined;
    let buildCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { throw new Error('interpret must not repeat'); },
      compileRun: async () => { throw new Error('compile must not repeat'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('assets must not repeat'); },
      build: async () => { buildCalls += 1; throw new Error('model authoring must not repeat'); },
      hasRecoveryCandidate: async () => true,
      recover: async (_input, runtime) => { capturedDeadlineAt = runtime.GENERATION_JOB_DEADLINE_AT; return receipt; },
      refine: async () => ({
        status: 'kept', parentId: receipt.id, receipt,
        sourceAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        finalAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        visualAcceptance: { schemaVersion: 1, score: 92, verdict: 'pass', assetRole: 'integrated', summary: '目标一致。', findings: [] },
        summary: '恢复候选通过。', resolved: [], remaining: [],
      }),
    };

    const result = await recoverGenerationJobCandidate(job.id, environment, dependencies);
    expect(buildCalls).toBe(0);
    expect(result.recoveryAttempts).toBe(1);
    expect(Date.parse(result.deadlineAt || '')).toBeGreaterThan(Date.now());
    expect(capturedDeadlineAt).toBe(result.deadlineAt);
  });

  it('recovers an interrupted authoring checkpoint without repeating interpretation or model authoring', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-interrupted-authoring-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为抽象声波关系设计一个可滚动观察的教学网页。', provider: 'codex', quality: 'low', seed: 21,
    }, environment);
    const resumeBuild: DedicatedCodeRequest = {
      brief: job.brief,
      seed: job.seed,
      quality: job.quality,
      runId: 'run-interrupted-authoring',
      selectedId: 'candidate-interrupted-authoring',
      creativeContract: createV2CreativeContract(job.brief),
      reference: {
        title: '声波关系', summary: '观察连续变化。', scenePlugin: 'composed-world',
        productionStatus: 'ready', theme: {}, assets: [],
      },
    };
    await updateGenerationJob(job.id, {
      stage: 'authoring',
      message: 'Codex 构建中服务重启。',
      model: 'gpt-5.6-sol',
      authoringAttempts: 1,
      resumeBuild,
    }, environment);
    let interpretCalls = 0;
    let buildCalls = 0;
    let recoverCalls = 0;
    const receipt = {
      id: 'dedicated-recovered-checkpoint', provider: 'codex' as const, model: 'gpt-5.6-sol', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-recovered-checkpoint/', generatedAt: new Date().toISOString(),
      files: 4, assets: 0, sourceBytes: 8000, hasShaders: false, compileMs: 80, attempts: 1,
      directory: 'generated/runs/dedicated-recovered-checkpoint',
    };
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { interpretCalls += 1; throw new Error('interpret must not repeat'); },
      compileRun: async () => { throw new Error('compile must not repeat'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('assets must not repeat'); },
      build: async () => { buildCalls += 1; throw new Error('model authoring must not repeat'); },
      recover: async () => { recoverCalls += 1; return receipt; },
      refine: async () => ({
        status: 'kept', parentId: receipt.id, receipt,
        sourceAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        finalAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        visualAcceptance: { schemaVersion: 1, score: 92, verdict: 'pass', assetRole: 'integrated', summary: '目标一致。', findings: [] },
        summary: '恢复候选通过。', resolved: [], remaining: [],
      }),
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const result = await readGenerationJob(job.id, environment);
    expect(interpretCalls).toBe(0);
    expect(buildCalls).toBe(0);
    expect(recoverCalls).toBe(1);
    expect(result?.recoveryAttempts).toBe(1);
    expect(result?.refinementAttempts).toBe(1);
    expect(result?.bestRunId).toBe(receipt.id);
    expect(result?.status).not.toBe('running');
  });

  it('does not repeat an interrupted visual refinement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-interrupted-refine-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为植物根系观察设计明亮的交互网页。', provider: 'codex', quality: 'balanced', seed: 22,
    }, environment);
    const receipt = {
      id: 'dedicated-interrupted-refine', provider: 'codex' as const, model: 'gpt-5.6-sol', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-interrupted-refine/', generatedAt: new Date().toISOString(),
      files: 4, assets: 0, sourceBytes: 7000, hasShaders: false, compileMs: 70, attempts: 1,
      directory: 'generated/runs/dedicated-interrupted-refine',
    };
    await updateGenerationJob(job.id, {
      stage: 'refining', message: '视觉验收中服务重启。', sourceRunId: receipt.id,
      sourceReceipt: receipt, refinementAttempts: 1,
    }, environment);
    let refineCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { throw new Error('not expected'); },
      compileRun: async () => { throw new Error('not expected'); },
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('not expected'); },
      build: async () => { throw new Error('not expected'); },
      refine: async () => { refineCalls += 1; throw new Error('refine must not repeat'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const result = await readGenerationJob(job.id, environment);
    expect(refineCalls).toBe(0);
    expect(result?.status).toBe('review-required');
    expect(result?.bestRunId).toBe(receipt.id);
    expect(result?.retryableStage).toBeNull();
  });

  it('owns planning, asset selection, Codex build and final visual selection', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root, GENERATION_JOB_TOTAL_TIMEOUT_MS: '720000' };
    const job = await createGenerationJob({
      brief: '为一件会随着呼吸显露纹理的声音产品构建安静的沉浸式网页。',
      provider: 'codex', quality: 'high', seed: 43,
    }, environment);
    let capturedAssets: unknown[] = [];
    let capturedDeadlineAt: string | undefined;
    const capturedBuild: { current: DedicatedCodeRequest | null } = { current: null };
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
          kind: 'image', source: 'chatgpt-generated', qualityLevel: 'L3-presentable', features: { alpha: 'binary', depth: 'none' }, role: 'acoustic product hero',
          description: 'A transparent acoustic product used as the primary visual anchor.', payloadBytes: 2048, tags: ['声音产品'],
        }, {
          id: 'unreviewed-extra',
          uri: '/creative-assets/unreviewed-extra.png',
          bundlePath: 'assets/unreviewed-extra.png',
          kind: 'image', source: 'model-generated', qualityLevel: 'L2-inspectable', role: 'unreviewed decoration',
          description: 'A low-quality unrelated decoration that must not reach Codex.', payloadBytes: 1024, tags: ['声音产品'],
        }],
      generateAssets: async () => { throw new Error('MiniMax should not be called when project assets match.'); },
      build: async (input, buildEnvironment, onProgress) => {
        capturedDeadlineAt = buildEnvironment.GENERATION_JOB_DEADLINE_AT;
        await onProgress?.({ phase: 'attempt-start', attempt: 1, totalAttempts: 1, timeoutMs: 300_000, failure: null });
        await onProgress?.({ phase: 'candidate-saved', attempt: 1, totalAttempts: 1, timeoutMs: 300_000, failure: null, artifactPath: '.artifacts/generation-candidates/run-server/attempt-01', localRepair: 0, maxLocalRepairs: 2 });
        await onProgress?.({ phase: 'local-repair', attempt: 1, totalAttempts: 1, timeoutMs: 300_000, failure: 'TypeScript 编译失败', artifactPath: '.artifacts/generation-candidates/run-server/attempt-01', localRepair: 1, maxLocalRepairs: 2, actions: ['为背景色增加类型保护'] });
        await onProgress?.({ phase: 'local-recovered', attempt: 1, totalAttempts: 1, timeoutMs: 300_000, failure: null, artifactPath: '.artifacts/generation-candidates/run-server/attempt-01', localRepair: 1, maxLocalRepairs: 2 });
        capturedBuild.current = input as DedicatedCodeRequest;
        capturedAssets = capturedBuild.current.reference.assets || [];
        return receipt;
      },
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
    expect(completed?.deliveryQuality).toMatchObject({ finalEligible: true, achievedAssetQuality: 'L3-presentable' });
    expect(completed?.history.map((entry) => entry.stage)).toEqual(expect.arrayContaining(['planning', 'assets', 'authoring', 'reviewing', 'refining', 'complete']));
    expect(completed?.history.find((entry) => entry.stage === 'authoring')?.message).toContain('gpt-5.6-terra');
    expect(completed?.history.some((entry) => entry.message.includes('唯一一次专属代码生成'))).toBe(true);
    expect(completed?.history.some((entry) => entry.message.includes('模型候选已保存'))).toBe(true);
    expect(completed?.history.some((entry) => entry.message.includes('本地确定性修复 1/2'))).toBe(true);
    expect(completed?.history.some((entry) => entry.message.includes('已通过编译'))).toBe(true);
    expect(capturedAssets).toHaveLength(1);
    expect(capturedAssets).toEqual([expect.objectContaining({ id: 'acoustic-resonance-instrument-v1' })]);
    expect(completed?.v2ContractSummary?.contractId).toMatch(/^contract-/);
    expect(capturedBuild.current?.creativeContract?.brief).toBe(job.brief);
    expect(capturedBuild.current?.creativeContract?.executionLimits.authoringPasses).toBe(1);
    expect(capturedDeadlineAt).toBe(job.deadlineAt);
  });

  it('keeps a compiled preview but does not mark it complete when visual review cannot finish', async () => {
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
      selectProjectAssets: () => [{ id: 'observatory', uri: '/creative-assets/observatory-approach-v1.png', bundlePath: 'assets/observatory.png', kind: 'environment', source: 'chatgpt-generated', qualityLevel: 'L3-presentable', role: 'observatory environment', description: 'A full bleed observatory environment for the opening.', payloadBytes: 2048, tags: ['观测站'] }],
      generateAssets: async () => { throw new Error('not expected'); },
      build: async () => receipt,
      refine: async () => { throw new Error('browser capture unavailable'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const reviewRequired = await readGenerationJob(job.id, environment);
    expect(reviewRequired?.status).toBe('review-required');
    expect(reviewRequired?.stage).toBe('review-required');
    expect(reviewRequired?.bestReceipt?.id).toBe(receipt.id);
    expect(reviewRequired?.bestPreviewUrl).toBe(receipt.previewUrl);
    expect(reviewRequired?.finalScore).toBeNull();
    expect(reviewRequired?.decision).toBeNull();
    expect(reviewRequired?.retryableStage).toBe('reviewing');
    expect(reviewRequired?.message).toContain('待定稿结果');
    expect(reviewRequired?.deliveryQuality?.finalEligible).toBe(false);
  });

  it('resumes from the saved build checkpoint after a trusted asset is attached', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-asset-gate-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root, SIGNAL_ASSET_CACHE_DIR: join(root, 'asset-cache') };
    const job = await createGenerationJob({
      brief: '为一款智能声音产品设计安静、真实的发布网页，最后预约体验。',
      provider: 'codex', quality: 'high', seed: 12,
    }, environment);
    let buildCalled = false;
    let resumedAssets: DedicatedCodeRequest['reference']['assets'] = [];
    let interpretCalls = 0;
    const receipt = {
      id: 'dedicated-resumed-final', provider: 'codex' as const, model: 'gpt-5.6-sol', status: 'compiled' as const,
      previewUrl: '/generated-runs/dedicated-resumed-final/', generatedAt: new Date().toISOString(),
      files: 4, assets: 1, sourceBytes: 11000, hasShaders: true, compileMs: 100, attempts: 1,
      directory: 'generated/runs/dedicated-resumed-final',
    };
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => { interpretCalls += 1; return { provenance: { selected: 'codex', model: 'gpt-5.6-sol' } } as never; },
      compileRun: async () => ({
        id: 'run-asset-gate',
        candidates: [{
          id: 'candidate-asset-gate',
          manifest: { title: '声音产品', summary: '安静的产品发布体验。', theme: {} },
          direction: { scenePlugin: 'composed-world' },
          productionPlan: { status: 'ready' },
          effectSpec: { assetRequirements: [] },
        }],
      } as unknown as CreativeRun),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [{
        id: 'minimax-product-candidate',
        uri: '/creative-assets/minimax-product-candidate.png',
        bundlePath: 'assets/minimax-product-candidate.png',
        kind: 'image', source: 'model-generated', role: 'product hero',
        description: 'An inspectable MiniMax product candidate.', payloadBytes: 2048, tags: ['声音产品'],
      }],
      generateAssets: async () => { throw new Error('catalog candidate already exists'); },
      build: async (input) => {
        buildCalled = true;
        resumedAssets = (input as DedicatedCodeRequest).reference.assets || [];
        return receipt;
      },
      refine: async () => ({
        status: 'kept', parentId: receipt.id, receipt,
        sourceAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        finalAssessment: { schemaVersion: 1, score: 90, verdict: 'pass', summary: '结构通过。', findings: [], observations: [] },
        visualAcceptance: { schemaVersion: 1, score: 92, verdict: 'pass', assetRole: 'dominant', summary: '素材承担主体。', findings: [] },
        summary: '补充素材后的版本通过。', resolved: [], remaining: [],
      }),
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const blocked = await readGenerationJob(job.id, environment);
    expect(buildCalled).toBe(false);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.assetRoute).toBe('blocked');
    expect(blocked?.assetGate?.decision).toBe('needs-codex-assets');
    expect(blocked?.assetGate?.requests[0]?.requirementId).toBe('hero-product');
    expect(blocked?.assetCompletion?.status).toBe('requested');
    expect(blocked?.history.map((entry) => entry.stage)).not.toContain('authoring');
    expect(blocked?.resumeBuild?.runId).toBe('run-asset-gate');

    const png = await transparentSubjectPng();
    const imported = await importUserAsset({
      schemaVersion: 1,
      brief: job.brief,
      fileName: 'approved-product.png',
      contentType: 'image/png',
      dataBase64: png.toString('base64'),
      role: '声音产品主体',
    }, environment);
    const cachedUpload = await readCachedUserAsset(imported.id, environment);
    expect(cachedUpload?.qualityLevel).toBe('L2-inspectable');
    expect(buildCalled).toBe(false);

    await submitGenerationJobAssets(job.id, {
      completionId: blocked!.assetCompletion!.completionId,
      submissionId: 'submission-1111111111111111',
      attachments: [{
        assetId: imported.id,
        requirementId: 'hero-product',
        reviewedCodex: {
          model: 'gpt-5.6-sol',
          summary: '同一声音产品主体清晰完整，透明边缘适合直接合成到页面。',
          subjectMatch: true,
          integrationMatch: true,
          continuityMatch: true,
          continuityEvidence: '产品机位、比例、轮廓和柔和冷光与当前页面合同保持一致。',
          qualityLevel: 'L3-presentable',
        }
      }]
    }, environment, dependencies);
    await submitGenerationJobAssets(job.id, {
      completionId: blocked!.assetCompletion!.completionId,
      submissionId: 'submission-1111111111111111',
      attachments: [{
        assetId: imported.id,
        requirementId: 'hero-product',
        reviewedCodex: {
          model: 'gpt-5.6-sol',
          summary: '同一声音产品主体清晰完整，透明边缘适合直接合成到页面。',
          subjectMatch: true,
          integrationMatch: true,
          continuityMatch: true,
          continuityEvidence: '产品机位、比例、轮廓和柔和冷光与当前页面合同保持一致。',
          qualityLevel: 'L3-presentable',
        }
      }]
    }, environment, dependencies);
    await ensureGenerationJobRunning(job.id, environment, dependencies);

    const completed = await readGenerationJob(job.id, environment);
    expect(buildCalled).toBe(true);
    expect(interpretCalls).toBe(1);
    expect(completed?.status).toBe('complete');
    expect(completed?.bestRunId).toBe(receipt.id);
    expect(completed?.finalScore).toBe(92);
    expect(completed?.deliveryQuality?.finalEligible).toBe(true);
    expect(completed?.assetCompletion).toMatchObject({
      status: 'resumed', submissionId: 'submission-1111111111111111', attempts: 1,
    });
    expect(resumedAssets).toHaveLength(1);
    expect(resumedAssets[0]?.id).toBe(imported.id);
    expect(resumedAssets[0]).toMatchObject({ source: 'chatgpt-generated', qualityLevel: 'L3-presentable' });
    expect(resumedAssets.some((asset) => asset.id === 'minimax-product-candidate')).toBe(false);
    expect((await readCachedUserAsset(imported.id, environment))?.qualityLevel).toBe('L2-inspectable');
    expect(completed?.history.filter((entry) => entry.stage === 'planning')).toHaveLength(2);
    expect(completed?.history.map((entry) => entry.message)).toContain('任务已建立，正在理解目标并形成最佳网页方向。');
  });

  it('stops a physical assembly before authoring when the catalog only has one static image', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-state-gate-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为普通访客设计古建筑榫卯互动学习网页，真实旧木构件逐步对齐并咬合，随后展示受力路径和修复档案。',
      provider: 'codex', quality: 'high', seed: 73,
    }, environment);
    let buildCalled = false;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => ({ provenance: { selected: 'codex', model: 'gpt-5.6-sol' } } as never),
      compileRun: async () => ({
        id: 'run-state-gate',
        candidates: [{
          id: 'candidate-state-gate',
          manifest: { title: '榫卯结构', summary: '观察真实构件的装配关系。', theme: {} },
          direction: { scenePlugin: 'composed-world' },
          productionPlan: { status: 'ready' },
          effectSpec: { assetRequirements: [] },
        }],
      } as unknown as CreativeRun),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [{
        id: 'joinery-static', uri: '/creative-assets/joinery-static.png', bundlePath: 'assets/joinery-static.png',
        kind: 'environment', source: 'chatgpt-generated', qualityLevel: 'L3-presentable',
        role: 'joinery environment', description: 'A single joinery studio image.', payloadBytes: 2048, tags: ['榫卯'],
        experience: {
          anchor: .5, function: 'persistent', visualState: '同一工作台上的静态木构件。',
          continuity: '单一机位、构件和光线。', integration: 'full-bleed-environment',
          stateEvidence: { mode: 'static', distinctStates: 1, partGroups: 0, proof: '只提供一个静态状态。' }
        }
      }],
      generateAssets: async () => { throw new Error('catalog candidate already exists'); },
      build: async () => { buildCalled = true; throw new Error('state gate should stop authoring'); },
      refine: async () => { throw new Error('not expected'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const blocked = await readGenerationJob(job.id, environment);

    expect(buildCalled).toBe(false);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.assetGate?.requests[0]?.requirementId).toBe('state-subject');
    expect(blocked?.history.map((entry) => entry.stage)).not.toContain('authoring');
  });

  it('turns a missing state sequence into a resumable asset request instead of an early route failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-material-gate-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为烘焙学习者展示同一发酵罐，调整参数时体积、气泡密度、表面张力与颜色同步变化。',
      provider: 'codex', quality: 'high', seed: 83,
    }, environment);
    let buildCalled = false;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => ({ provenance: { selected: 'codex', model: 'gpt-5.6-sol' } } as never),
      compileRun: (brief, _interpretation, context) => generateCreativeRun(brief, new BaselineBriefInterpreter(), context),
      providerStatus: async () => ({ defaultProvider: 'codex', providers: [] }),
      selectProjectAssets: () => [],
      generateAssets: async () => { throw new Error('state sequence must be supplied through the resumable quality gate'); },
      build: async () => { buildCalled = true; throw new Error('state gate should stop authoring'); },
      refine: async () => { throw new Error('not expected'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const blocked = await readGenerationJob(job.id, environment);

    expect(buildCalled).toBe(false);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.assetRoute).toBe('blocked');
    expect(blocked?.assetGate?.requests[0]?.requirementId).toBe('state-subject');
    expect(blocked?.resumeBuild?.runId).toMatch(/^run-/);
  });

  it('turns an image-provider failure into one resumable asset gate without repeating planning', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-runner-asset-provider-failure-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为海洋记忆数字展陈设计网页，明确使用前景、中景、后景和景深形成可探索空间，最后选择一条档案路径。',
      provider: 'codex', quality: 'high', seed: 91,
    }, environment);
    let interpretCalls = 0;
    let assetCalls = 0;
    let buildCalls = 0;
    const dependencies: GenerationJobRunnerDependencies = {
      readJob: readGenerationJob,
      updateJob: updateGenerationJob,
      interpret: async () => {
        interpretCalls += 1;
        return new BaselineBriefInterpreter().interpret({ text: job.brief, seed: job.seed });
      },
      compileRun: (brief, interpretation, context) => generateCreativeRun(brief, {
        id: 'test-interpretation', interpret: async () => interpretation,
      }, context),
      providerStatus: async () => ({
        defaultProvider: 'codex',
        providers: [{ id: 'minimax', available: true, model: 'image-01', reason: null, capabilities: ['image-generation'] }]
      }),
      selectProjectAssets: () => [],
      generateAssets: async () => { assetCalls += 1; throw new Error('MiniMax returned no usable image bytes.'); },
      build: async () => { buildCalls += 1; throw new Error('authoring must not start'); },
      refine: async () => { throw new Error('not expected'); },
    };

    await runGenerationJobPipeline(job.id, environment, dependencies);
    const blocked = await readGenerationJob(job.id, environment);
    expect(blocked?.status).toBe('blocked');
    expect(blocked?.assetRoute).toBe('blocked');
    expect(blocked?.assetGate?.decision).toBe('needs-codex-assets');
    expect(blocked?.assetGate?.summary).toContain('自动素材尝试已停止且不会重试');
    expect(blocked?.assetGate?.requests.length).toBeGreaterThan(0);
    expect(blocked?.resumeBuild?.runId).toMatch(/^run-/);
    expect(blocked?.retryableStage).toBeNull();
    expect(interpretCalls).toBe(1);
    expect(assetCalls).toBe(1);
    expect(buildCalls).toBe(0);

    await ensureGenerationJobRunning(job.id, environment, dependencies);
    expect(interpretCalls).toBe(1);
    expect(assetCalls).toBe(1);
    expect(buildCalls).toBe(0);
  });
});
