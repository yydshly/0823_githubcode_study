import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { evaluateProductDeliveryReadiness } from '../src/v2/product-delivery-readiness.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'kage-feeling-lens');
const finalEvidence = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'v2-research', 'evidence', 'r169-kage-feeling-lens.final.json'),
  'utf8'
));
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/kage-paper-light-world-v1.png'];

function read(file: string) {
  return fs.readFileSync(path.join(deliveryRoot, file), 'utf8');
}

describe('R169 KAGE feeling lens', () => {
  it('defines a complete idea, feeling, formed, and continuation product journey', () => {
    const html = read('index.html');
    expect(html).toContain('KAGE 感受取景器');
    expect(html).toContain('data-beat="idea"');
    expect(html).toContain('data-beat="feeling"');
    expect(html).toContain('data-beat="formed"');
    expect(html).toContain('data-signal-primary-control');
    expect(html).toContain('data-signal-primary-result');
    expect(html).toContain('data-signal-primary-action');
    expect(html).toContain('方向试演与产品体验');
  });

  it('uses one formal generated visual as an integrated scene anchor', () => {
    const manifest = JSON.parse(read('asset-manifest.json'));
    const asset = path.join(deliveryRoot, 'assets', 'kage-paper-light-world-v1.png');
    expect(manifest.source).toMatchObject({ type: 'openai-imagegen', mode: 'built-in', batch: 1 });
    expect(manifest.projectPath).toBe('pages/v2/deliveries/kage-feeling-lens/assets/kage-paper-light-world-v1.png');
    expect(fs.existsSync(asset)).toBe(true);
    expect(fs.statSync(asset).size).toBeGreaterThan(500_000);
    expect(read('index.html')).not.toContain('<svg');
  });

  it('binds scroll, pointer, keyboard and emotional intent to the same product state', () => {
    const source = read('main.ts');
    expect(source).toContain("window.addEventListener('scroll'");
    expect(source).toContain("world?.addEventListener('pointerdown'");
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain("root.dataset.emotion = emotion");
    expect(source).toContain("provider: 'codex'");
    expect(source).toContain('drawLight');
  });

  it('keeps generated material and procedural effects in distinct roles', () => {
    const css = read('style.css');
    expect(css).toContain('.world-image--formed');
    expect(css).toContain('clip-path: circle(var(--reveal-size)');
    expect(css).toContain('#light-canvas');
    expect(css).toContain('html[data-asset="fallback"]');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('is included in the deployable Pages bundle without modifying V1', () => {
    const config = fs.readFileSync(path.join(root, 'vite.pages.config.ts'), 'utf8');
    expect(config).toContain("'pages/v2/deliveries/kage-feeling-lens/index'");
    expect(config).toContain("'pages/v2/deliveries/kage-feeling-lens/index.html'");
    expect(config).toContain("'pages/v1/index'");
  });

  it('records bounded execution before browser promotion', () => {
    const contract = fs.readFileSync(
      path.join(root, 'docs', 'v2-deliveries', 'R169-KAGE-FEELING-LENS-CONTRACT.md'),
      'utf8'
    );
    expect(contract).toContain('已使用素材批次：1 / 1');
    expect(contract).toContain('已使用完整构建：1 / 1');
    expect(contract).toContain('最多一次视觉精修');
    expect(contract).toContain('现有 V1 和已部署站点不得改动');
  });

  it('binds final product evidence, preview and archive to the exact bundle', () => {
    const hash = createHash('sha256');
    for (const file of bundleFiles) {
      hash.update(file);
      hash.update(Buffer.from([0]));
      hash.update(fs.readFileSync(path.join(deliveryRoot, file)));
    }
    expect(hash.digest('hex')).toBe(finalEvidence.identity.bundleHash);
    const verdict = evaluateProductDeliveryReadiness(
      finalEvidence.productDeliveryPlan,
      finalEvidence.productDeliveryEvidence,
      {
        runId: finalEvidence.identity.runId,
        bundleHash: finalEvidence.identity.bundleHash
      }
    );
    expect(verdict.productEligible).toBe(true);
    expect(V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === 'kage-feeling-lens')).toMatchObject({
      runId: finalEvidence.identity.runId,
      bundleHash: finalEvidence.identity.bundleHash,
      status: 'formal-product'
    });
    expect(fs.existsSync(path.join(
      root,
      'public',
      'creative-assets',
      'v2-formal-products',
      'kage-feeling-lens.png'
    ))).toBe(true);
  });
});
