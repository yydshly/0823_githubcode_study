import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assetCompletionSchema,
  createAssetCompletion,
  createGenerationJob,
  generationJobAssetSubmissionSchema,
  mutateGenerationJob,
  readGenerationJob,
  updateGenerationJob
} from '../server/generation-job-store.ts';
import { createV2CreativeContract } from '../src/v2/creative-contract.ts';
import { summarizeV2CreativeContract } from '../src/v2/workbench-contract-summary.ts';

const roots: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generation job persistence', () => {
  it('persists before generation and keeps only the final best run pointer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为夜间生物材料温室生成具有呼吸结构变化的沉浸式网页。',
      provider: 'codex', quality: 'high', seed: 17,
      intentSource: 'workbench-user'
    }, environment);

    expect(job.stage).toBe('planning');
    expect(job.intentProvenance).toMatchObject({
      rawUserBrief: job.brief,
      submissionSource: 'workbench-user',
      assetPolicy: 'quality-first',
      experimentConstraints: []
    });
    expect(job.v2ContractSummary).toBeNull();
    expect(job.assetCompletion).toBeNull();
    expect(job).toMatchObject({ authoringAttempts: 0, recoveryAttempts: 0, refinementAttempts: 0 });
    expect(job.phaseDurationsMs).toEqual({ planning: 0, assets: 0, authoring: 0, reviewing: 0 });
    expect(Date.parse(job.deadlineAt || '') - Date.parse(job.budgetStartedAt || '')).toBe(180_000);
    expect(await readFile(join(root, 'generated', 'jobs', `${job.id}.json`), 'utf8')).toContain(job.id);

    const v2ContractSummary = summarizeV2CreativeContract(createV2CreativeContract(job.brief), 2);
    const complete = await updateGenerationJob(job.id, {
      stage: 'complete',
      message: '视觉评审完成，最终版本已选中。',
      v2ContractSummary,
      sourceRunId: 'dedicated-source',
      bestRunId: 'dedicated-final',
      bestPreviewUrl: '/generated-runs/dedicated-final/',
      decision: 'refined', sourceScore: 78, finalScore: 94
    }, environment);

    expect(complete.status).toBe('complete');
    expect(complete.bestRunId).toBe('dedicated-final');
    expect(complete.sourceRunId).toBe('dedicated-source');
    expect(complete.v2ContractSummary?.contractId).toBe(v2ContractSummary.contractId);
    expect((await readGenerationJob(job.id, environment))?.bestRunId).toBe('dedicated-final');
  });

  it('locks a V2 composer launch to the same deterministic contract before creating a job', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-contract-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const brief = '为城市夜间鸟鸣档案设计一段可探索的声音排版网页。';
    const expectedContractId = createV2CreativeContract(brief).id;

    const job = await createGenerationJob({
      brief, provider: 'codex', quality: 'high', seed: 43, expectedContractId,
      intentSource: 'workbench-user'
    }, environment);
    expect(job.expectedContractId).toBe(expectedContractId);
    expect((await readGenerationJob(job.id, environment))?.expectedContractId).toBe(expectedContractId);

    await expect(createGenerationJob({
      brief, provider: 'codex', quality: 'high', seed: 43,
      expectedContractId: 'contract-different', intentSource: 'workbench-user'
    }, environment)).rejects.toThrow('V2 合同不一致');
  });

  it('keeps experiment constraints separate from the immutable creative brief', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-intent-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const brief = '为陶艺学习者设计明亮的釉色实验网页，不要暗色科技风。';
    const job = await createGenerationJob({
      brief, provider: 'codex', quality: 'high', seed: 67,
      intentSource: 'system-validation',
      experimentConstraints: ['本轮不调用 MiniMax', '只创建一个验证任务']
    }, environment);

    expect(job.brief).toBe(brief);
    expect(job.brief).not.toContain('不调用 MiniMax');
    expect(job.intentProvenance).toMatchObject({
      rawUserBrief: brief,
      submissionSource: 'system-validation',
      userConstraints: ['为陶艺学习者设计明亮的釉色实验网页，不要暗色科技风'],
      experimentConstraints: ['本轮不调用 MiniMax', '只创建一个验证任务']
    });
  });

  it('persists authoritative phase durations without counting paused time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));
    const root = await mkdtemp(join(tmpdir(), 'signal-job-timing-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为屋顶温室建立一次有界网页生成任务。', provider: 'codex', quality: 'high', seed: 84
    }, environment);

    vi.advanceTimersByTime(4_000);
    await updateGenerationJob(job.id, { stage: 'assets', message: '素材准备。' }, environment);
    vi.advanceTimersByTime(6_000);
    await updateGenerationJob(job.id, { stage: 'authoring', message: '代码构建。' }, environment);
    vi.advanceTimersByTime(10_000);
    await updateGenerationJob(job.id, { stage: 'blocked', message: '等待输入。', error: '等待输入。' }, environment);
    vi.advanceTimersByTime(60_000);
    await updateGenerationJob(job.id, { stage: 'assets', message: '继续素材准备。' }, environment);
    vi.advanceTimersByTime(5_000);
    const complete = await updateGenerationJob(job.id, { stage: 'complete', message: '完成。' }, environment);

    expect(complete.phaseDurationsMs).toEqual({ planning: 4_000, assets: 11_000, authoring: 10_000, reviewing: 0 });
  });

  it('migrates persisted V2 checkpoints when the creative contract schema evolves', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-legacy-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为社区声音档案设计可滚动探索网页。', provider: 'codex', quality: 'balanced', seed: 19
    }, environment);
    const contract = createV2CreativeContract(job.brief);
    await updateGenerationJob(job.id, {
      stage: 'blocked',
      message: '等待素材。',
      error: '等待素材。',
      resumeBuild: {
        brief: job.brief, seed: job.seed, quality: job.quality, runId: 'run-legacy-job', selectedId: 'candidate-legacy-job',
        creativeContract: contract,
        reference: { title: '声音档案', summary: '社区声音探索。', scenePlugin: 'composed-world', productionStatus: 'ready', theme: {}, assets: [] }
      },
      v2ContractSummary: summarizeV2CreativeContract(contract, 1)
    }, environment);
    const path = join(root, 'generated', 'jobs', `${job.id}.json`);
    const persisted = JSON.parse(await readFile(path, 'utf8')) as Record<string, any>;
    delete persisted.assetCompletion;
    persisted.resumeBuild.creativeContract = { schemaVersion: 2, brief: job.brief };
    persisted.v2ContractSummary = { contractId: 'contract-legacy', structureMode: 'obsolete-scroll-story' };
    await writeFile(path, `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');

    const migrated = await readGenerationJob(job.id, environment);
    expect(migrated?.resumeBuild?.creativeContract?.brief).toBe(job.brief);
    expect(migrated?.v2ContractSummary?.structureMode).not.toBe('obsolete-scroll-story');
    expect(migrated?.assetCompletion).toBeNull();
  });

  it('creates a deterministic bounded asset-completion contract', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-completion-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为屋顶温室补齐主体和环境素材后恢复网页构建。', provider: 'codex', quality: 'high', seed: 88
    }, environment);
    const first = createAssetCompletion(job.id, [
      'hero-subject', 'hero-environment', 'hero-foreground', 'hero-depth'
    ], '2026-08-30T01:00:00.000Z');
    const reordered = createAssetCompletion(job.id, [
      'hero-depth', 'hero-foreground', 'hero-environment', 'hero-subject'
    ], '2026-08-30T01:05:00.000Z');

    expect(first).toMatchObject({
      completionId: expect.stringMatching(/^completion-[a-f0-9]{16}$/),
      requirementIds: ['hero-depth', 'hero-environment', 'hero-foreground', 'hero-subject'],
      status: 'requested', submissionId: null, attempts: 0,
      createdAt: '2026-08-30T01:00:00.000Z', resumedAt: null
    });
    expect(reordered.completionId).toBe(first.completionId);
    expect(() => assetCompletionSchema.parse({
      ...first,
      status: 'resumed', attempts: 1,
      submissionId: 'submission-0123456789abcdef'
    })).toThrow('恢复时间');
    expect(() => createAssetCompletion(job.id, ['hero-subject', 'hero-subject'])).toThrow('不能重复');
    expect(() => createAssetCompletion(job.id, ['one', 'two', 'three', 'four', 'five'])).toThrow();
  });

  it('validates reviewed Codex asset receipts and keeps completion submissions bounded', () => {
    const parsed = generationJobAssetSubmissionSchema.parse({
      completionId: 'completion-0123456789abcdef',
      submissionId: 'submission-fedcba9876543210',
      attachments: [{
        assetId: 'greenhouse-subject-v2',
        requirementId: 'hero-subject',
        reviewedCodex: {
          model: 'gpt-image-1',
          summary: '主体、透明合成和同源连续性均通过一次审核。',
          subjectMatch: true,
          integrationMatch: true,
          continuityMatch: true,
          continuityEvidence: '主体与母图使用同一画布、镜位和晨光方向。',
          stateEvidence: {
            mode: 'layered-subject', distinctStates: 2, partGroups: 1,
            continuityKey: 'greenhouse-v2', proof: '母图和透明主体共享像素坐标。'
          },
          qualityLevel: 'L3-presentable'
        }
      }]
    });

    expect(parsed.attachments[0]?.reviewedCodex?.qualityLevel).toBe('L3-presentable');
    expect(generationJobAssetSubmissionSchema.parse({
      completionId: parsed.completionId,
      submissionId: parsed.submissionId,
      attachments: ['one', 'two', 'three', 'four'].map((suffix) => ({
        ...parsed.attachments[0],
        assetId: `greenhouse-${suffix}`,
        requirementId: `hero-${suffix}`
      }))
    }).attachments).toHaveLength(4);
    expect(() => generationJobAssetSubmissionSchema.parse({
      completionId: parsed.completionId,
      submissionId: parsed.submissionId,
      attachments: ['one', 'two', 'three', 'four', 'five'].map((suffix) => ({
        ...parsed.attachments[0],
        assetId: `greenhouse-${suffix}`,
        requirementId: `hero-${suffix}`
      }))
    })).toThrow();
    expect(() => generationJobAssetSubmissionSchema.parse({
      completionId: parsed.completionId,
      submissionId: parsed.submissionId,
      attachments: [{
        ...parsed.attachments[0],
        reviewedCodex: { ...parsed.attachments[0]?.reviewedCodex, subjectMatch: 'yes' }
      }]
    })).toThrow();
    expect(() => generationJobAssetSubmissionSchema.parse({
      completionId: parsed.completionId,
      submissionId: parsed.submissionId,
      attachments: [parsed.attachments[0], parsed.attachments[0]]
    })).toThrow('不能重复素材职责');
  });

  it('mutates a job atomically and supports idempotent no-op decisions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-atomic-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为共享声景任务建立一次原子素材恢复。', provider: 'codex', quality: 'balanced', seed: 41
    }, environment);
    const completion = createAssetCompletion(job.id, ['sound-environment'], '2026-08-30T02:00:00.000Z');
    await updateGenerationJob(job.id, {
      stage: 'blocked', message: '等待一次素材完成。', error: '缺少环境素材。', assetCompletion: completion
    }, environment);

    const results = await Promise.all([
      mutateGenerationJob(job.id, (current) => current.assetCompletion?.attempts === 0 ? {
        stage: 'assets', message: '素材完成已原子领取。',
        assetCompletion: {
          ...current.assetCompletion,
          status: 'resumed', attempts: 1,
          submissionId: 'submission-0123456789abcdef',
          resumedAt: '2026-08-30T02:01:00.000Z'
        }
      } : null, environment),
      mutateGenerationJob(job.id, (current) => current.assetCompletion?.attempts === 0 ? {
        stage: 'assets', message: '不应发生的第二次领取。',
        assetCompletion: {
          ...current.assetCompletion,
          status: 'resumed', attempts: 1,
          submissionId: 'submission-fedcba9876543210',
          resumedAt: '2026-08-30T02:01:01.000Z'
        }
      } : null, environment)
    ]);

    const persisted = await readGenerationJob(job.id, environment);
    expect(results[0].assetCompletion?.submissionId).toBe('submission-0123456789abcdef');
    expect(results[1].assetCompletion?.submissionId).toBe('submission-0123456789abcdef');
    expect(persisted?.assetCompletion).toMatchObject({ status: 'resumed', attempts: 1 });
    expect(persisted?.history.filter((entry) => entry.message.includes('原子领取'))).toHaveLength(1);
    expect(persisted?.history.some((entry) => entry.message.includes('第二次领取'))).toBe(false);
  });

  it('keeps a runnable preview as review-required without claiming final acceptance', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-review-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为一张明亮的公共饮水地图构建可交互网页。',
      provider: 'codex', quality: 'high', seed: 31
    }, environment);

    const pendingReview = await updateGenerationJob(job.id, {
      stage: 'review-required',
      message: '网页已生成，等待视觉定稿。',
      bestRunId: 'dedicated-civic-map',
      bestPreviewUrl: '/generated-runs/dedicated-civic-map/',
      error: '自动视觉检查超时。',
      retryableStage: 'reviewing'
    }, environment);

    expect(pendingReview.status).toBe('review-required');
    expect(pendingReview.finishedAt).not.toBeNull();
    expect(pendingReview.bestPreviewUrl).toContain('dedicated-civic-map');
    expect(pendingReview.finalScore).toBeNull();
    expect(pendingReview.retryableStage).toBe('reviewing');

    const stopped = await updateGenerationJob(job.id, {
      stage: 'review-required',
      message: '自动处理额度已用尽。',
      error: '自动处理已经停止。',
      retryableStage: null
    }, environment);
    expect(stopped.retryableStage).toBeNull();
  });
});
