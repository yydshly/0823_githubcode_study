import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateV3DirectCreativeArchiveEligibility } from '../src/v2/direct-creative-v3-archive-gate.ts';
import { directCreativeRunSchema } from '../src/v2/direct-creative-run.ts';
import { V3_VERIFIED_DELIVERIES } from '../src/v2/v3-verified-deliveries.ts';

const deliveryId = 'eclipse-post-office';
const runId = 'direct-r149-eclipse-post-office';
const expectedBundleHash = '8b33a2fbb920fbf3a62c325b8fd809edad21201c64c8583f9b5a16009f5d4ea8';
const expectedAssetHash = '13ed8583aa062308168abc88b8ed26e63d025ca3dec82d643336e5377463d470';
const sourceRoot = new URL('../pages/v2/deliveries/eclipse-post-office/', import.meta.url);
const evidencePath = new URL('../docs/v2-research/evidence/r149-eclipse-post-office.direct-creative-run.json', import.meta.url);
const reportPath = new URL('../docs/v2-research/evidence/r149-eclipse-post-office/report.json', import.meta.url);

function hash(files: string[]): string {
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(file);
    digest.update(Buffer.from([0]));
    digest.update(readFileSync(new URL(file, sourceRoot)));
  }
  return digest.digest('hex');
}

describe('R149 eclipse-post-office open resource validation', () => {
  it('binds the single generated environment asset and final browser proof to one bundle', () => {
    const run = directCreativeRunSchema.parse(JSON.parse(readFileSync(evidencePath, 'utf8')));
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { bundleHash: string; complete: boolean };
    const manifest = JSON.parse(readFileSync(new URL('asset-manifest.json', sourceRoot), 'utf8')) as {
      generationCalls: number;
      assets: Array<{ path: string; sha256: string; role: string }>;
    };

    expect(manifest.generationCalls).toBe(1);
    expect(manifest.assets[0]).toMatchObject({
      path: './assets/eclipse-post-office-salt-flat-v1.png',
      sha256: expectedAssetHash,
      role: 'environment-and-material-identity',
    });
    expect(hash(['assets/eclipse-post-office-salt-flat-v1.png'])).not.toBe(expectedAssetHash);
    expect(createHash('sha256').update(readFileSync(new URL('assets/eclipse-post-office-salt-flat-v1.png', sourceRoot))).digest('hex')).toBe(expectedAssetHash);
    expect(hash(['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/eclipse-post-office-salt-flat-v1.png'])).toBe(expectedBundleHash);
    expect(report).toMatchObject({ bundleHash: expectedBundleHash, complete: true });
    expect(run.finalCandidate).toMatchObject({ runId, bundleHash: expectedBundleHash });
    expect(evaluateV3DirectCreativeArchiveEligibility(run)).toMatchObject({ eligible: true, reasons: [] });
  });

  it('registers the final spatial journey without turning optional resources into requirements', () => {
    const registration = V3_VERIFIED_DELIVERIES.find((item) => item.deliveryId === deliveryId);
    const html = readFileSync(new URL('index.html', sourceRoot), 'utf8');
    const main = readFileSync(new URL('main.ts', sourceRoot), 'utf8');

    expect(registration).toMatchObject({
      deliveryId,
      runId,
      bundleHash: expectedBundleHash,
      macroStructure: 'spatial-journey',
      mediumRoute: 'generated-image',
      renderingMedium: 'raster-image',
    });
    expect(html).toContain('data-experience="eclipse-post-office"');
    expect(html).toContain('draggable="false"');
    expect(main).toContain('waiting');
    expect(main).toContain('diamond-ring');
    expect(main).toContain('savePostcard');
  });
});
