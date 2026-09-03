type Environment = Readonly<Record<string, string | undefined>>;

const DEFAULT_MINIMUM_STEP_MS = 250;

export function remainingGenerationDeadlineMs(
  environment: Environment,
  now = Date.now(),
): number | null {
  const parsed = Date.parse(environment.GENERATION_JOB_DEADLINE_AT || '');
  return Number.isFinite(parsed) ? parsed - now : null;
}

export function assertGenerationDeadline(
  environment: Environment,
  minimumMs = DEFAULT_MINIMUM_STEP_MS,
  now = Date.now(),
): number | null {
  const remaining = remainingGenerationDeadlineMs(environment, now);
  if (remaining !== null && remaining < minimumMs) {
    throw new Error('生成任务达到总时间上限，已停止后续处理。');
  }
  return remaining;
}

export function clampTimeoutToGenerationDeadline(
  environment: Environment,
  requestedMs: number,
  minimumMs = DEFAULT_MINIMUM_STEP_MS,
  now = Date.now(),
): number {
  const remaining = assertGenerationDeadline(environment, minimumMs, now);
  const requested = Math.max(minimumMs, Math.round(requestedMs));
  return remaining === null ? requested : Math.max(minimumMs, Math.min(requested, Math.floor(remaining)));
}
