import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CREATIVE_GUIDANCE_BASELINE_R171 } from '../src/v2/creative-guidance-baseline.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'kage-opening-rehearsal');
const finalEvidence = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'v2-research', 'evidence', 'r172-kage-opening-rehearsal.final.json'),
  'utf8'
));
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/kage-opening-rehearsal-v1.png'];

function read(file: string) {
  return fs.readFileSync(path.join(deliveryRoot, file), 'utf8');
}

describe('R172 KAGE opening rehearsal', () => {
  it('uses the frozen R171 first goal without adding a global style ban', () => {
    expect(CREATIVE_GUIDANCE_BASELINE_R171.firstGoal.outcome).toBe('idea-to-emotionally-resonant-creative-web-product');
    expect(CREATIVE_GUIDANCE_BASELINE_R171.authority.globalStyleBans).toEqual([]);
    expect(CREATIVE_GUIDANCE_BASELINE_R171.nextValidation.newRulesAllowedDuringValidation).toBe(false);
  });

  it('delivers entry, use, result and continuation in one persistent spatial scene', () => {
    const html = read('index.html');
    expect(html).toContain('KAGE 开场排练室');
    expect(html).toContain('data-signal-visual-anchor');
    expect(html).toContain('data-signal-primary-control');
    expect(html).toContain('data-signal-primary-result');
    expect(html).toContain('保存的是可交给 Codex 的开场方向');
    expect(html).not.toContain('<svg');
  });

  it('binds scroll, pointer, keyboard, sound and rhythm to the same product state', () => {
    const source = read('main.ts');
    expect(source).toContain("window.addEventListener('scroll'");
    expect(source).toContain("scene?.addEventListener('pointerdown'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain('new AudioContext()');
    expect(source).toContain("root.dataset.rhythm = rhythm");
    expect(source).toContain("source: 'kage-opening-rehearsal-r172'");
  });

  it('uses one formal generated asset and preserves capability fallbacks', () => {
    const manifest = JSON.parse(read('asset-manifest.json'));
    const asset = path.join(deliveryRoot, 'assets', 'kage-opening-rehearsal-v1.png');
    expect(manifest.source).toMatchObject({ type: 'openai-imagegen', mode: 'built-in', batch: 1 });
    expect(fs.statSync(asset).size).toBeGreaterThan(1_000_000);
    expect(read('style.css')).toContain('html[data-asset="fallback"]');
    expect(read('style.css')).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('binds the final evidence, preview and formal product registration to the exact bundle', () => {
    const hash = createHash('sha256');
    for (const file of bundleFiles) {
      hash.update(file);
      hash.update(Buffer.from([0]));
      hash.update(fs.readFileSync(path.join(deliveryRoot, file)));
    }
    expect(hash.digest('hex')).toBe(finalEvidence.identity.bundleHash);
    expect(V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === 'kage-opening-rehearsal')).toMatchObject({
      runId: finalEvidence.identity.runId,
      bundleHash: finalEvidence.identity.bundleHash,
      status: 'formal-product'
    });
    expect(fs.existsSync(path.join(root, 'public', 'creative-assets', 'v2-formal-products', 'kage-opening-rehearsal.png'))).toBe(true);
  });

  it('includes the new product in the deployable Pages input while keeping V1 present', () => {
    const config = fs.readFileSync(path.join(root, 'vite.pages.config.ts'), 'utf8');
    expect(config).toContain("'pages/v2/deliveries/kage-opening-rehearsal/index'");
    expect(config).toContain("'pages/v2/deliveries/kage-opening-rehearsal/index.html'");
    expect(config).toContain("'pages/v1/index'");
  });
});
