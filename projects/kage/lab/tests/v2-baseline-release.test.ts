import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';

function text(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('V2.5 frozen baseline status', () => {
  it('has one current release truth with no unresolved coverage item', () => {
    const baseline = text('../docs/releases/V2.5-DIRECT-CREATIVE-BASELINE.md');
    expect(baseline).toContain('Status: **FROZEN BASELINE**');
    expect(baseline).toContain('direct-r125-ice-core-letters');
    expect(baseline).toContain('runId + bundleHash');
    expect(baseline).toContain('npm.cmd run verify:v2.5');
    expect(baseline).not.toContain('| continue |');
  });

  it('aligns public status, project READMEs and historical research boundaries', () => {
    const page = text('../pages/v2/index.html');
    const labReadme = text('../README.md');
    const projectReadme = text('../../README.md');
    const historicalContract = text('../docs/V2-REFERENCE-GUIDED-CREATIVE-CONTRACT.md');
    const research = text('../pages/v2/research/index.html');

    expect(page).toContain('V2.5 BASELINE · R159 ASSET PROOF / R160 MASK PROOF');
    expect(page).toContain('复制有界包并交给 Codex');
    expect(page).not.toContain('href="../../workbench.html?provider=codex&quality=high"');
    expect(labReadme).toContain('V2.5 直接创作基线已冻结');
    expect(projectReadme).toContain('V2.5 直接创作基线已冻结');
    expect(historicalContract).toContain('V2.0–V2.2');
    expect(historicalContract).toContain('V2.5 Direct Creative Baseline');
    expect(research).toContain('HISTORICAL APPENDIX / R05–R11');
    expect(page.match(/<a class="verified-example-card\b/g)).toHaveLength(30);
    expect(page.match(/data-v3-archive-id=/g)).toHaveLength(11);
    expect(page).toContain('R160 REPEATABILITY PROOF PASSED');
    expect(page).toContain('12 项有限精选');
    expect(V3_VERIFIED_DELIVERIES).toHaveLength(11);
    expect(V3_VERIFIED_DELIVERIES.at(-1)).toMatchObject({
      deliveryId: 'eclipse-post-office',
      route: './deliveries/eclipse-post-office/',
      evidencePath: 'docs/v2-research/evidence/r149-eclipse-post-office.direct-creative-run.json',
      runId: 'direct-r149-eclipse-post-office',
      bundleHash: '8b33a2fbb920fbf3a62c325b8fd809edad21201c64c8583f9b5a16009f5d4ea8',
      macroStructure: 'spatial-journey',
      mediumRoute: 'generated-image',
      renderingMedium: 'raster-image'
    });
    expect(page).toContain('data-v3-archive-id="eclipse-post-office"');
    expect(page).toContain('data-bundle-hash="8b33a2fbb920fbf3a62c325b8fd809edad21201c64c8583f9b5a16009f5d4ea8"');
  });

  it('keeps one bounded baseline verification command', () => {
    const packageJson = JSON.parse(text('../package.json')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['verify:v2.5']).toBe(
      'npm run test:v2.5 && npm run build && npm run build:pages && npm run test:browser:v2.5'
    );
    expect(packageJson.scripts['test:browser:v2.5']).toContain('v2-r125-ice-core-letters-delivery.spec.ts');
  });
});
