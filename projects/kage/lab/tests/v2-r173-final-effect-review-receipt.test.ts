import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findFinalEffectReviewReceipts,
  finalEffectReviewReceiptSchema,
  receiptMatchesArtifact,
  V2_FINAL_EFFECT_REVIEW_RECEIPTS
} from '../src/v2/final-effect-review-receipt.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('R173 final effect review receipts', () => {
  it('creates one current receipt for every formal product identity', () => {
    expect(V2_FINAL_EFFECT_REVIEW_RECEIPTS).toHaveLength(V2_FORMAL_PRODUCT_ARCHIVE.length);
    for (const receipt of V2_FINAL_EFFECT_REVIEW_RECEIPTS) {
      expect(finalEffectReviewReceiptSchema.parse(receipt)).toEqual(receipt);
      const artifact = V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === receipt.id);
      expect(artifact).toBeDefined();
      expect(receiptMatchesArtifact(receipt, artifact!)).toBe(true);
      expect(receipt.executableEvidence.testsPassed).toBe(receipt.executableEvidence.testsTotal);
      expect(receipt.executableEvidence.captureCount).toBeGreaterThanOrEqual(4);
    }
  });

  it('invalidates a receipt as soon as the final bundle identity changes', () => {
    const receipt = V2_FINAL_EFFECT_REVIEW_RECEIPTS[0];
    expect(receiptMatchesArtifact(receipt, {
      id: receipt.id,
      runId: receipt.artifact.runId,
      bundleHash: `${'0'.repeat(63)}1`
    })).toBe(false);
  });

  it('finds artifacts by title, runId and bundle hash without changing the registry', () => {
    expect(findFinalEffectReviewReceipts('开场排练室').map((item) => item.id)).toEqual(['kage-opening-rehearsal']);
    expect(findFinalEffectReviewReceipts('direct-r169').map((item) => item.id)).toEqual(['kage-feeling-lens']);
    expect(findFinalEffectReviewReceipts('51fcaa3e').map((item) => item.id)).toEqual(['rainlight-walk-recorder']);
    expect(findFinalEffectReviewReceipts('不存在的产物')).toEqual([]);
    expect(findFinalEffectReviewReceipts('')).toHaveLength(4);
  });

  it('exposes the receipt on V2 without adding a new example or style restriction', () => {
    const page = read('pages/v2/index.html');
    const source = read('src/v2/final-effect-review-receipt.ts');
    expect(page).toContain('id="effect-review-receipts"');
    expect(page).toContain('看最终效果');
    expect(page).toContain('不冒充独立人类审美结论');
    expect(source).not.toContain('globalStyleBans');
    expect(source).not.toContain('newRulesAllowed');
  });
});

