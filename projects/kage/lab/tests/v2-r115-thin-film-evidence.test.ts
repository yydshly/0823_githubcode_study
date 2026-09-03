import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  directCreativeRunSchema,
  isDirectCreativeRunArchiveEligible
} from '../src/v2/direct-creative-run.ts';
import { evaluateWowGateEvidence } from '../src/v2/visual-ambition.ts';

const evidencePath = new URL(
  '../docs/v2-research/evidence/r115-thin-film-lab.direct-creative-run.json',
  import.meta.url
);

describe('R115 thin-film flagship evidence', () => {
  it('binds both quality gates to the same final bundle and is archive eligible', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));

    expect(run.finalCandidate).toEqual({
      runId: 'direct-thin-film-lab-r114',
      bundleHash: 'b1de4965ebe0c20fdd2b28be2200821c285fa798a7de2b87080a3df3ae8dfd67'
    });
    expect(run.visualAmbition?.intentLevel).toBe('flagship');
    expect(run.wowEvidence?.assessment).toMatchObject({ verdict: 'pass', score: 92 });
    expect(evaluateWowGateEvidence(
      run.wowEvidence,
      run.finalCandidate!,
      run.visualAmbition!
    ).passed).toBe(true);
    expect(isDirectCreativeRunArchiveEligible(run)).toBe(true);
  });
});
