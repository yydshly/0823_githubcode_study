import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { V2_EXPERIENCE_ARCHIVE } from '../src/v2/experience-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'windborne-letter-valley');
const finalRecordPath = path.join(root, 'docs', 'v2-research', 'evidence', 'r159-windborne-letter-valley.final.json');

describe('R159 windborne letter valley final delivery', () => {
  it('keeps one generated asset batch and binds runtime causality', () => {
    const html = fs.readFileSync(path.join(deliveryRoot, 'index.html'), 'utf8');
    const source = fs.readFileSync(path.join(deliveryRoot, 'main.ts'), 'utf8');
    expect(html).toContain('valley-after-rain-v1.png');
    expect(source).toContain("root.dataset.assetBatchCount = '1'");
    expect(source).toContain("root.dataset.mediumRoute = 'generated-image-runtime'");
    expect(source).toContain('targetWindBias');
    expect(source).toContain('targetProgress');
    expect(source).toContain("root.dataset.delivered = 'true'");
  });

  it('binds the final record to the final code and generated asset', () => {
    const record = JSON.parse(fs.readFileSync(finalRecordPath, 'utf8')) as {
      identity: { runId: string; bundleHash: string; bundleFiles: string[] };
      verdict: string;
      executionBudget: { assetBatches: number; fullBuilds: number; visualRefinements: number };
    };
    const hash = createHash('sha256');
    for (const file of record.identity.bundleFiles) {
      hash.update(file);
      hash.update(Buffer.from([0]));
      hash.update(fs.readFileSync(path.join(deliveryRoot, file)));
    }
    expect(record.identity.runId).toBe('direct-r159-windborne-letter-valley');
    expect(record.identity.bundleHash).toBe(hash.digest('hex'));
    expect(record.executionBudget).toMatchObject({ assetBatches: 1, fullBuilds: 1, visualRefinements: 1 });
    expect(record.verdict).toBe('pass');
  });

  it('promotes only the final result into the bounded archive', () => {
    expect(V2_EXPERIENCE_ARCHIVE).toHaveLength(12);
    expect(V2_EXPERIENCE_ARCHIVE.map((entry) => entry.id)).toContain('windborne-letter-valley');
  });
});

