import { describe, expect, it } from 'vitest';
import { decideWorkbenchBootstrap } from '../src/generation/workbench-bootstrap';

describe('workbench bootstrap policy', () => {
  it('runs a shareable autorun URL exactly once before a job exists', () => {
    expect(decideWorkbenchBootstrap({ autorun: true, provider: 'codex', jobId: null, recovered: null })).toEqual({
      runModel: true,
      resumeJobId: null
    });
  });

  it('monitors the same server task after a job id was persisted', () => {
    expect(decideWorkbenchBootstrap({ autorun: true, provider: 'codex', jobId: 'job-0123456789abcdef', recovered: { status: 'running', stage: 'refining' } })).toEqual({
      runModel: true,
      resumeJobId: 'job-0123456789abcdef'
    });
  });

  it('resumes the same job while planning without creating a replacement', () => {
    expect(decideWorkbenchBootstrap({ autorun: false, provider: 'codex', jobId: 'job-0123456789abcdef', recovered: { status: 'running', stage: 'planning' } })).toEqual({
      runModel: true,
      resumeJobId: 'job-0123456789abcdef'
    });
  });

  it('restores a generated page that is waiting for visual sign-off without rerunning the model', () => {
    expect(decideWorkbenchBootstrap({ autorun: false, provider: 'codex', jobId: 'job-0123456789abcdef', recovered: { status: 'review-required', stage: 'review-required' } })).toEqual({
      runModel: true,
      resumeJobId: 'job-0123456789abcdef'
    });
  });

  it('never autoruns the local baseline', () => {
    expect(decideWorkbenchBootstrap({ autorun: true, provider: 'local', jobId: null, recovered: null }).runModel).toBe(false);
  });
});
