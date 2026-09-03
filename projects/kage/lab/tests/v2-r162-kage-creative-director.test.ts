import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateProductDeliveryReadiness } from '../src/v2/product-delivery-readiness.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'kage-creative-director');
const finalEvidence = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'v2-research', 'evidence', 'r162-kage-creative-director.final.json'),
  'utf8'
));

function read(file: string) {
  return fs.readFileSync(path.join(deliveryRoot, file), 'utf8');
}

describe('R162 KAGE creative director product delivery', () => {
  it('implements a complete entry, use, result, and continuation journey', () => {
    const html = read('index.html');
    expect(html).toContain('让一句想法');
    expect(html).toContain('id="idea-form"');
    expect(html).toContain('data-direction="light"');
    expect(html).toContain('data-direction="sound"');
    expect(html).toContain('data-direction="place"');
    expect(html).toContain('id="result"');
    expect(html).toContain('id="case-link"');
    expect(html).toContain('id="continue-link"');
    expect(html).toContain('产品策划预演');
  });

  it('uses formal verified project visuals rather than handcrafted key art', () => {
    const html = read('index.html');
    const assetNames = [
      'prism-seed-theatre.png',
      'modular-room-sound.png',
      'west-bund-meeting-points.png',
      'folded-light-studio.png'
    ];
    for (const assetName of assetNames) {
      expect(html).toContain(assetName);
      expect(fs.existsSync(path.join(root, 'pages', 'v2', 'assets', 'verified-examples', assetName))).toBe(true);
    }
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('placeholder');
  });

  it('connects idea input to direction, proof result, and a truthful continuation URL', () => {
    const source = read('main.ts');
    expect(source).toContain('resolveRecommendation');
    expect(source).toContain('selectDirection');
    expect(source).toContain('resultImage.src = direction.image');
    expect(source).toContain("url.searchParams.set('brief'");
    expect(source).toContain("root.dataset.productJourney = 'entry-use-result-continuation'");
    expect(source).toContain("root.dataset.assetPolicy = 'formal-source-assets'");
  });

  it('is included in the deployable Pages bundle', () => {
    const config = fs.readFileSync(path.join(root, 'vite.pages.config.ts'), 'utf8');
    expect(config).toContain("'pages/v2/deliveries/kage-creative-director/index'");
    expect(config).toContain("'pages/v2/deliveries/kage-creative-director/index.html'");
  });

  it('binds passing product evidence to the final bundle and archives it separately from research', () => {
    const verdict = evaluateProductDeliveryReadiness(
      finalEvidence.productDeliveryPlan,
      finalEvidence.productDeliveryEvidence,
      {
        runId: finalEvidence.identity.runId,
        bundleHash: finalEvidence.identity.bundleHash
      }
    );
    expect(verdict.productEligible).toBe(true);
    const archived = V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === 'kage-creative-director');
    expect(archived).toMatchObject({
      status: 'formal-product',
      runId: finalEvidence.identity.runId,
      bundleHash: finalEvidence.identity.bundleHash
    });
    expect(fs.existsSync(path.join(
      root,
      'public',
      'creative-assets',
      'v2-formal-products',
      'kage-creative-director.png'
    ))).toBe(true);
  });
});
