import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createGenerationJob, readGenerationJob, updateGenerationJob } from '../server/generation-job-store.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('generation job persistence', () => {
  it('persists before generation and keeps only the final best run pointer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-job-'));
    roots.push(root);
    const environment = { SIGNAL_PROJECT_ROOT: root };
    const job = await createGenerationJob({
      brief: '为夜间生物材料温室生成具有呼吸结构变化的沉浸式网页。',
      provider: 'codex', quality: 'high', seed: 17
    }, environment);

    expect(job.stage).toBe('planning');
    expect(await readFile(join(root, 'generated', 'jobs', `${job.id}.json`), 'utf8')).toContain(job.id);

    const complete = await updateGenerationJob(job.id, {
      stage: 'complete',
      message: '视觉评审完成，最终版本已选中。',
      sourceRunId: 'dedicated-source',
      bestRunId: 'dedicated-final',
      bestPreviewUrl: '/generated-runs/dedicated-final/',
      decision: 'refined', sourceScore: 78, finalScore: 94
    }, environment);

    expect(complete.status).toBe('complete');
    expect(complete.bestRunId).toBe('dedicated-final');
    expect(complete.sourceRunId).toBe('dedicated-source');
    expect((await readGenerationJob(job.id, environment))?.bestRunId).toBe('dedicated-final');
  });
});
