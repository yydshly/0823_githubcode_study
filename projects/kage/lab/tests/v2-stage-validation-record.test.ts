import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible
} from '../src/v2/direct-creative-run.ts';

const recordUrl = new URL(
  '../docs/v2-research/evidence/r113-sign-language-season.direct-creative-run.json',
  import.meta.url
);

describe('V2 R113 persisted direct creative evidence', () => {
  it('binds the archived result to one final run and bundle hash', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(recordUrl, 'utf8')));

    expect(run.verdict).toBe('pass');
    expect(run.finalCandidate).toEqual({
      runId: 'direct-sign-language-season-r113',
      bundleHash: '3c865222ec507ac52605d2cbf7d3b1ca247d40670bfa427ced28a05ee94a9734'
    });
    expect(run.adaptiveEvidence?.profile.requiredCheckpoints).toEqual([
      'opening', 'core', 'mobile', 'interaction'
    ]);
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
  });
});
