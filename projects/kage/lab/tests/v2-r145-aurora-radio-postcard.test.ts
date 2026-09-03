import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const delivery = path.join(root, 'pages', 'v2', 'deliveries', 'aurora-radio-postcard');

describe('R145 aurora radio postcard delivery contract', () => {
  it('ships one generated lead visual with explicit truth boundary', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(delivery, 'asset-manifest.json'), 'utf8')) as {
      assetBatch: string;
      assets: Array<{ path: string; role: string; truthBoundary: string }>;
    };
    const asset = path.join(delivery, manifest.assets[0]!.path);

    expect(manifest.assetBatch).toBe('r145-aurora-radio-postcard-v1');
    expect(manifest.assets).toHaveLength(1);
    expect(manifest.assets[0]).toMatchObject({ role: 'lead-visual' });
    expect(manifest.assets[0]!.truthBoundary).toContain('艺术化生成场景');
    expect(fs.existsSync(asset)).toBe(true);
    expect(fs.statSync(asset).size).toBeGreaterThan(1_000_000);
  });

  it('binds wheel, drag, keyboard, WebGL and Web Audio to one frequency state', () => {
    const source = fs.readFileSync(path.join(delivery, 'main.ts'), 'utf8');

    expect(source).toContain("stage.addEventListener('wheel'");
    expect(source).toContain("control.addEventListener('pointermove'");
    expect(source).toContain("control.addEventListener('keydown'");
    expect(source).toContain('new THREE.WebGLRenderer');
    expect(source).toContain('new AudioContext()');
    expect(source).toContain('function applyTune');
    expect(source).toContain('updateAudio();');
    expect(source).toContain('renderState(announce);');
    expect(source).toContain('float sky = smoothstep(.32, .86, vUv.y)');
    expect(source).toContain('visualEnergy: round(.18 + tune * .82)');
  });

  it('declares fallback, reduced-motion, accessibility and final action surfaces', () => {
    const html = fs.readFileSync(path.join(delivery, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(delivery, 'style.css'), 'utf8');

    expect(html).toContain('role="slider"');
    expect(html).toContain('aria-valuetext');
    expect(html).toContain('id="audio-toggle"');
    expect(html).toContain('id="send-postcard"');
    expect(html).toContain('class="receiver-signal"');
    expect(html).toContain('不代表真实极光频率或科学观测');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('html[data-fallback="true"]');
    expect(css).toContain('html[data-asset-fallback="true"]');
  });
});
