import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { evaluateImageAssetFitness, inspectImageAsset } from '../server/image-asset-inspection.ts';
import { opaqueJpeg, opaquePng, transparentSubjectPng } from './image-test-fixtures.ts';

describe('deterministic image asset inspection', () => {
  it('distinguishes binary alpha, soft alpha and fully opaque images from decoded pixels', async () => {
    const binary = await inspectImageAsset(await transparentSubjectPng(512, 512, 255));
    const soft = await inspectImageAsset(await transparentSubjectPng(512, 512, 128));
    const opaque = await inspectImageAsset(await opaquePng(512, 512));
    const jpeg = await inspectImageAsset(await opaqueJpeg(1024, 576));

    expect(binary).toMatchObject({ format: 'png', width: 512, height: 512, alpha: 'binary' });
    expect(soft.alpha).toBe('soft');
    expect(opaque.alpha).toBe('none');
    expect(jpeg).toMatchObject({ format: 'jpeg', width: 1024, height: 576, alpha: 'none' });
  });

  it('does not mistake a baked checkerboard for transparency', async () => {
    const width = 512;
    const height = 512;
    const rgb = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tone = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 220 : 248;
        const offset = (y * width + x) * 3;
        rgb[offset] = tone;
        rgb[offset + 1] = tone;
        rgb[offset + 2] = tone;
      }
    }
    const png = await sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
    const inspection = await inspectImageAsset(png);
    const fitness = evaluateImageAssetFitness(inspection, { integration: 'alpha-subject', role: 'isolated subject' });

    expect(inspection.alpha).toBe('none');
    expect(fitness.decision).toBe('reject');
    expect(fitness.issues.join(' ')).toContain('真实透明像素');
  });

  it('rejects truncated PNG and JPEG bytes rather than accepting their signatures', async () => {
    const png = await transparentSubjectPng();
    const jpeg = await opaqueJpeg();

    await expect(inspectImageAsset(png.subarray(0, Math.floor(png.length * .6)))).rejects.toThrow(/无法完整解码/);
    await expect(inspectImageAsset(jpeg.subarray(0, Math.floor(jpeg.length * .6)))).rejects.toThrow(/无法完整解码/);
    await expect(inspectImageAsset(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).rejects.toThrow(/无法完整解码/);
  });

  it('rejects tiny images and checks environment dimensions without confusing opacity with failure', async () => {
    const tiny = await inspectImageAsset(await opaquePng(1, 1));
    const environment = await inspectImageAsset(await opaqueJpeg(1024, 576));

    expect(evaluateImageAssetFitness(tiny).decision).toBe('reject');
    expect(evaluateImageAssetFitness(environment, { integration: 'full-bleed-environment' })).toEqual({ decision: 'pass', issues: [] });
  });
});
