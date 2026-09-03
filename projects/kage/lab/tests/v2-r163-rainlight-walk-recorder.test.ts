import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { evaluateProductDeliveryReadiness } from '../src/v2/product-delivery-readiness.ts';
import { V2_FORMAL_PRODUCT_ARCHIVE } from '../src/v2/formal-product-archive.ts';

const root = path.resolve(import.meta.dirname, '..');
const deliveryRoot = path.join(root, 'pages', 'v2', 'deliveries', 'rainlight-walk-recorder');
const evidence = JSON.parse(fs.readFileSync(
  path.join(root, 'docs', 'v2-research', 'evidence', 'r163-rainlight-walk-recorder.final.json'),
  'utf8'
));
const bundleFiles = ['index.html', 'style.css', 'main.ts', 'asset-manifest.json', 'assets/rainlight-street-v1.png'];

function read(file: string) {
  return fs.readFileSync(path.join(deliveryRoot, file), 'utf8');
}

describe('R163 rainlight walk recorder', () => {
  it('implements the full entry, use, result, and continuation product journey', () => {
    const html = read('index.html');
    expect(html).toContain('雨光夜行记录器');
    expect(html).toContain('id="walk-form"');
    expect(html).toContain('id="drag-surface"');
    expect(html).toContain('id="letter"');
    expect(html).toContain('id="save-letter"');
    expect(html).toContain('id="edit-letter"');
    expect(html).toContain('不是地图、定位或真实导航服务');
  });

  it('uses one formal generated asset batch for the persistent scene', () => {
    const manifest = JSON.parse(read('asset-manifest.json'));
    const asset = path.join(deliveryRoot, 'assets', 'rainlight-street-v1.png');
    expect(manifest.batchCount).toBe(1);
    expect(manifest.generator).toContain('OpenAI built-in image generation');
    expect(manifest.projectPath).toBe('pages/v2/deliveries/rainlight-walk-recorder/assets/rainlight-street-v1.png');
    expect(manifest.status).toBe('selected-first-batch');
    expect(fs.existsSync(asset)).toBe(true);
    expect(fs.statSync(asset).size).toBeGreaterThan(500_000);
    expect(read('index.html')).not.toContain('<svg');
  });

  it('binds real wheel, pointer, keyboard, audio, and local save inputs to product state', () => {
    const source = read('main.ts');
    expect(source).toContain("window.addEventListener('wheel'");
    expect(source).toContain("dragSurface.addEventListener('pointerdown'");
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain("event.key === 'End'");
    expect(source).toContain('createBufferSource');
    expect(source).toContain("localStorage.setItem('kage-r163-rainlight-letter'");
    expect(source).toContain('Personal visual memory; not map, location, or navigation data.');
  });

  it('uses Canvas as runtime light behavior rather than fake key art', () => {
    const source = read('main.ts');
    expect(source).toContain('drawTrace');
    expect(source).toContain('createLinearGradient');
    expect(source).toContain("root.dataset.canvas = 'fallback'");
    expect(read('index.html')).toContain('雨后蓝调时刻的安静街巷');
  });

  it('is included in the deployable Pages bundle', () => {
    const config = fs.readFileSync(path.join(root, 'vite.pages.config.ts'), 'utf8');
    expect(config).toContain("'pages/v2/deliveries/rainlight-walk-recorder/index'");
    expect(config).toContain("'pages/v2/deliveries/rainlight-walk-recorder/index.html'");
  });

  it('binds final product evidence to the exact bundle and formal archive', () => {
    const hash = createHash('sha256');
    for (const file of bundleFiles) {
      hash.update(file);
      hash.update(Buffer.from([0]));
      hash.update(fs.readFileSync(path.join(deliveryRoot, file)));
    }
    expect(hash.digest('hex')).toBe(evidence.identity.bundleHash);
    const verdict = evaluateProductDeliveryReadiness(
      evidence.productDeliveryPlan,
      evidence.productDeliveryEvidence,
      {
        runId: evidence.identity.runId,
        bundleHash: evidence.identity.bundleHash
      }
    );
    expect(verdict.productEligible).toBe(true);
    expect(V2_FORMAL_PRODUCT_ARCHIVE.find((entry) => entry.id === 'rainlight-walk-recorder')).toMatchObject({
      runId: evidence.identity.runId,
      bundleHash: evidence.identity.bundleHash,
      status: 'formal-product'
    });
    expect(fs.existsSync(path.join(
      root,
      'public',
      'creative-assets',
      'v2-formal-products',
      'rainlight-walk-recorder.png'
    ))).toBe(true);
  });
});
