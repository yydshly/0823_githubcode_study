import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertV25DirectCreativeArchiveEligible,
  assertV25RegistrationMatchesRun,
  createV25VerifiedDeliveryRegistration
} from '../src/v2/direct-creative-archive-gate.ts';
import { V25_VERIFIED_DELIVERIES } from '../src/v2/v25-verified-deliveries.ts';

const evidencePath = new URL(
  '../docs/v2-research/evidence/r125-ice-core-letters.direct-creative-run.json',
  import.meta.url
);
const pagePath = new URL('../pages/v2/index.html', import.meta.url);

function frozenRun(): Record<string, unknown> {
  return JSON.parse(readFileSync(evidencePath, 'utf8')) as Record<string, unknown>;
}

describe('V2.5 verified delivery archive gate', () => {
  it('accepts R125 only through the frozen protocol v2 identity and structure evidence', () => {
    const registration = createV25VerifiedDeliveryRegistration({
      deliveryId: 'ice-core-letters',
      route: './deliveries/ice-core-letters/',
      evidencePath: 'docs/v2-research/evidence/r125-ice-core-letters.direct-creative-run.json',
      run: frozenRun()
    });

    expect(registration).toEqual(V25_VERIFIED_DELIVERIES[0]);
    expect(assertV25RegistrationMatchesRun(registration, frozenRun())).toMatchObject({
      creativeProtocolVersion: 2,
      verdict: 'pass',
      finalCandidate: {
        runId: registration.runId,
        bundleHash: registration.bundleHash
      },
      adaptiveEvidence: {
        macroStructureReview: {
          verdict: 'pass',
          contentJustified: true,
          candidate: { layout: 'spatial-journey' }
        }
      }
    });
  });

  it('rejects legacy protocol, non-pass, missing structure review and stale bundle evidence', () => {
    const run = frozenRun();
    expect(() => assertV25DirectCreativeArchiveEligible({
      ...run,
      creativeProtocolVersion: 1
    })).toThrow(/protocol v2/);
    expect(() => assertV25DirectCreativeArchiveEligible({
      ...run,
      verdict: 'pending'
    })).toThrow(/要求 pass/);

    const evidence = run.adaptiveEvidence as Record<string, unknown>;
    expect(() => assertV25DirectCreativeArchiveEligible({
      ...run,
      adaptiveEvidence: { ...evidence, macroStructureReview: undefined }
    })).toThrow();

    const candidate = run.finalCandidate as Record<string, unknown>;
    expect(() => assertV25DirectCreativeArchiveEligible({
      ...run,
      finalCandidate: { ...candidate, bundleHash: 'f'.repeat(64) }
    })).toThrow();
  });

  it('binds the public R125 card to the same versioned registry identity', () => {
    const html = readFileSync(pagePath, 'utf8');
    const registration = V25_VERIFIED_DELIVERIES[0];
    expect(html).toContain(`data-v25-archive-id="${registration.deliveryId}"`);
    expect(html).toContain(`data-run-id="${registration.runId}"`);
    expect(html).toContain(`data-bundle-hash="${registration.bundleHash}"`);
    expect(html).toContain(`href="${registration.route}"`);
  });
});
