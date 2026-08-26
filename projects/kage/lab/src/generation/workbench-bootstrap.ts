export interface RecoverableGenerationJob {
  status: string;
  stage: string;
}

export interface WorkbenchBootstrapInput {
  autorun: boolean;
  provider: string;
  jobId: string | null;
  recovered: RecoverableGenerationJob | null;
}

export interface WorkbenchBootstrapDecision {
  runModel: boolean;
  resumeJobId: string | null;
}

/**
 * A shareable autorun URL may start one remote generation. Once a job id has
 * been persisted in the URL, reloads and Vite HMR must recover that job instead
 * of creating a second expensive model run.
 */
export function decideWorkbenchBootstrap(input: WorkbenchBootstrapInput): WorkbenchBootstrapDecision {
  const resumeRunning = Boolean(
    input.jobId
    && input.recovered?.status === 'running'
  );
  const firstAutorun = input.autorun && input.provider !== 'local' && !input.jobId;
  return {
    runModel: firstAutorun || resumeRunning,
    resumeJobId: resumeRunning ? input.jobId : null
  };
}
