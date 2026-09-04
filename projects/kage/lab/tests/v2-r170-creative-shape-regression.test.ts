import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const reportPath = path.join(root, 'docs', 'v2-research', 'evidence', 'r170-creative-shape-regression', 'report.json');

describe('R170 creative shape regression', () => {
  it('records two final-bundle-bound products with different experience shapes', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report).toMatchObject({
      stage: 'r170-creative-shape-regression',
      freshEvidence: true,
      identityBinding: 'runId+bundleHash',
      complete: true,
      comparison: {
        sameTemplate: false,
        verdict: 'pass-with-note'
      }
    });
    expect(report.identities).toHaveLength(2);
    expect(report.identities).toEqual([
      {
        deliveryId: 'kage-feeling-lens',
        runId: 'direct-r169-kage-feeling-lens',
        bundleHash: '08472f8b9d36229381e9a71af98f636a9236f56b541f7af3753f03886e9b7550'
      },
      {
        deliveryId: 'night-reflective-catalog',
        runId: 'direct-r128-night-reflective-catalog',
        bundleHash: 'ef0ae71482af63a997095d6398b03f806833a418593d1ac46b8d0e709faca379'
      }
    ]);
    expect(report.observations).toHaveLength(2);
    expect(new Set(report.observations.map((item: { architecture: string }) => item.architecture)).size).toBe(2);
    expect(new Set(report.observations.map((item: { interactionModel: string }) => item.interactionModel)).size).toBe(2);
    expect(report.comparison.distinctAxes).toEqual(expect.arrayContaining([
      'macro-architecture',
      'visual-language',
      'interaction-model'
    ]));
  });

  it('keeps the regression advisory instead of turning it into a style ban', () => {
    const report = fs.readFileSync(reportPath, 'utf8');
    expect(report).toContain('nonBlockingRisk');
    expect(report).not.toContain('hardStyleBan');
    expect(report).not.toContain('mustDiffer');
    for (const capture of [
      '01-feeling-lens-opening.png',
      '02-feeling-lens-formed.png',
      '03-reflective-catalog-opening.png',
      '04-reflective-catalog-compare.png'
    ]) {
      expect(fs.statSync(path.join(path.dirname(reportPath), capture)).size).toBeGreaterThan(50_000);
    }
  });
});
