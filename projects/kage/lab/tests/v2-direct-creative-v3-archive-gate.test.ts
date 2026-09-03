import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertV3DirectCreativeArchiveEligible,
  assertV3RegistrationMatchesRun,
  createV3VerifiedDeliveryRegistration,
  evaluateV3DirectCreativeArchiveEligibility
} from '../src/v2/direct-creative-v3-archive-gate.ts';

const r134Path = new URL(
  '../docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
  import.meta.url
);
const r125Path = new URL(
  '../docs/v2-research/evidence/r125-ice-core-letters.direct-creative-run.json',
  import.meta.url
);

function r134Run(): Record<string, unknown> {
  return JSON.parse(readFileSync(r134Path, 'utf8')) as Record<string, unknown>;
}

function r125Run(): Record<string, unknown> {
  return JSON.parse(readFileSync(r125Path, 'utf8')) as Record<string, unknown>;
}

describe('DirectCreativeRun protocol V3 verified archive gate', () => {
  it('makes R134 registerable through a versioned medium-bound identity', () => {
    const eligibility = evaluateV3DirectCreativeArchiveEligibility(r134Run());
    expect(eligibility).toEqual({
      eligible: true,
      protocolValid: true,
      verdictPassed: true,
      identityValid: true,
      structurePassed: true,
      qualityPassed: true,
      wowPassed: true,
      mediumConsistent: true,
      reasons: []
    });

    const registration = createV3VerifiedDeliveryRegistration({
      deliveryId: 'stormglass-archive',
      route: './deliveries/stormglass-archive/',
      evidencePath: 'docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
      run: r134Run()
    });
    expect(registration).toEqual({
      schemaVersion: 1,
      archiveGateVersion: 3,
      baselineVersion: '3.0',
      creativeProtocolVersion: 3,
      deliveryId: 'stormglass-archive',
      route: './deliveries/stormglass-archive/',
      evidencePath: 'docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
      runId: 'direct-r134-stormglass-archive',
      bundleHash: 'b518d1bcaeb0c4f4cba2267e29716337e1b1d07e09d1ab9006a704dace474591',
      macroStructure: 'spatial-journey',
      mediumRoute: 'webgl-procedural',
      renderingMedium: 'webgl-shader'
    });
    expect(assertV3RegistrationMatchesRun(registration, r134Run())).toMatchObject({
      creativeProtocolVersion: 3,
      verdict: 'pass',
      mediumDecision: { preferred: 'webgl-procedural' },
      assetPlan: { strategy: 'programmatic' },
      visualAmbition: { rendering: { primary: 'webgl-shader' } }
    });
  });

  it('keeps the V2 and V3 archive boundaries independent', () => {
    const eligibility = evaluateV3DirectCreativeArchiveEligibility(r125Run());
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.protocolValid).toBe(false);
    expect(eligibility.reasons).toContain(
      'V3 精选只接受 DirectCreativeRun protocol v3。'
    );
    expect(() => assertV3DirectCreativeArchiveEligible(r125Run())).toThrow(/protocol v3/);
  });

  it('rejects stale candidate evidence immediately', () => {
    const run = r134Run();
    const candidate = run.finalCandidate as Record<string, unknown>;
    const stale = {
      ...run,
      finalCandidate: { ...candidate, bundleHash: '0'.repeat(64) }
    };
    const eligibility = evaluateV3DirectCreativeArchiveEligibility(stale);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.identityValid).toBe(false);
    expect(eligibility.reasons[0]).toMatch(/结构无效|身份已经过期/);
    expect(() => assertV3DirectCreativeArchiveEligible(stale)).toThrow();
  });

  it('rejects preferred-medium drift in either rendering or asset execution', () => {
    const run = r134Run();
    const decision = run.mediumDecision as Record<string, unknown>;
    const changedRoute = {
      ...run,
      mediumDecision: { ...decision, preferred: 'code-native', alternative: null }
    };
    const routeEligibility = evaluateV3DirectCreativeArchiveEligibility(changedRoute);
    expect(routeEligibility).toMatchObject({ eligible: false, mediumConsistent: false });
    expect(routeEligibility.reasons.join(' ')).toMatch(/媒介漂移/);

    const changedAssets = {
      ...run,
      assetPlan: {
        batchId: 'assets-drifted',
        strategy: 'none',
        rationale: '故意移除程序化资产以验证 V3 归档门会拒绝媒介执行漂移。',
        assets: []
      }
    };
    const assetEligibility = evaluateV3DirectCreativeArchiveEligibility(changedAssets);
    expect(assetEligibility).toMatchObject({ eligible: false, mediumConsistent: false });
    expect(assetEligibility.reasons.join(' ')).toMatch(/资产策略|媒介职责/);
  });

  it('rejects a registration whose medium identity no longer matches the run', () => {
    const registration = createV3VerifiedDeliveryRegistration({
      deliveryId: 'stormglass-archive',
      route: './deliveries/stormglass-archive/',
      evidencePath: 'docs/v2-research/evidence/r134-stormglass-archive.direct-creative-run.json',
      run: r134Run()
    });
    expect(() => assertV3RegistrationMatchesRun({
      ...registration,
      mediumRoute: 'threejs-spatial',
      renderingMedium: 'threejs-3d'
    }, r134Run())).toThrow(/主媒介/);
  });
});
