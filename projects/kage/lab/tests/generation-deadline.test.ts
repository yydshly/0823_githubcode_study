import { describe, expect, it } from 'vitest';
import {
  assertGenerationDeadline,
  clampTimeoutToGenerationDeadline,
  remainingGenerationDeadlineMs,
} from '../server/generation-deadline.ts';

describe('generation absolute deadline', () => {
  it('clamps every nested timeout to the same remaining budget', () => {
    const now = Date.UTC(2026, 7, 29, 12, 0, 0);
    const environment = { GENERATION_JOB_DEADLINE_AT: new Date(now + 8_000).toISOString() };
    expect(remainingGenerationDeadlineMs(environment, now)).toBe(8_000);
    expect(clampTimeoutToGenerationDeadline(environment, 45_000, 250, now)).toBe(8_000);
    expect(clampTimeoutToGenerationDeadline(environment, 2_000, 250, now)).toBe(2_000);
  });

  it('stops before starting another nested step after the budget is exhausted', () => {
    const now = Date.UTC(2026, 7, 29, 12, 0, 10);
    const environment = { GENERATION_JOB_DEADLINE_AT: new Date(now - 1).toISOString() };
    expect(() => assertGenerationDeadline(environment, 250, now)).toThrow('总时间上限');
    expect(() => clampTimeoutToGenerationDeadline(environment, 45_000, 250, now)).toThrow('总时间上限');
  });
});
