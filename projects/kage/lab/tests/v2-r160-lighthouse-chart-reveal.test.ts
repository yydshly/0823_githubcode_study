import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { V2_EXPERIENCE_ARCHIVE } from '../src/v2/experience-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'lighthouse-chart-reveal');
const finalRecordPath = path.join(root, 'docs', 'v2-research', 'evidence', 'r160-lighthouse-chart-reveal.final.json');

describe('R160 lighthouse chart reveal capability research', () => {
  it('uses zero generated assets and binds discovery to real input', () => {
    const html = fs.readFileSync(path.join(deliveryRoot, 'index.html'), 'utf8');
    const source = fs.readFileSync(path.join(deliveryRoot, 'main.ts'), 'utf8');
    expect(html).toContain('id="reveal-mask"');
    expect(html).toContain('id="return-route"');
    expect(source).toContain("root.dataset.assetBatchCount = '0'");
    expect(source).toContain("root.dataset.mediumRoute = 'svg-mask-canvas-runtime'");
    expect(source).toContain('nearest.distance <= 96');
    expect(source).toContain("root.dataset.state = 'route-complete'");
  });

  it('binds the final record to the final bundle', () => {
    const record = JSON.parse(fs.readFileSync(finalRecordPath, 'utf8')) as {
      identity: { runId: string; bundleHash: string; bundleFiles: string[] };
      verdict: string;
      archiveDisposition: string;
      productAssessment: { verdict: string };
      executionBudget: { assetBatches: number; fullBuilds: number; visualRefinements: number };
    };
    const hash = createHash('sha256');
    for (const file of record.identity.bundleFiles) {
      hash.update(file);
      hash.update(Buffer.from([0]));
      hash.update(fs.readFileSync(path.join(deliveryRoot, file)));
    }
    expect(record.identity.runId).toBe('direct-r160-lighthouse-chart-reveal');
    expect(record.identity.bundleHash).toBe(hash.digest('hex'));
    expect(record.executionBudget).toMatchObject({ assetBatches: 0, fullBuilds: 1, visualRefinements: 1 });
    expect(record.verdict).toBe('research-pass');
    expect(record.archiveDisposition).toBe('capability-research-only-not-formal-product');
    expect(record.productAssessment.verdict).toBe('not-product-ready');
  });

  it('keeps the archive bounded and stores the result only as a research reference', () => {
    const ids = V2_EXPERIENCE_ARCHIVE.map((entry) => entry.id);
    expect(V2_EXPERIENCE_ARCHIVE).toHaveLength(12);
    expect(ids).toContain('lighthouse-chart-reveal');
    expect(ids).not.toContain('ten-second-callsign-decode');
  });
});
