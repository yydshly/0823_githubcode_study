import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importUserAsset, readCachedUserAsset, readGeneratedAsset } from '../server/asset-generator';
import { opaquePng, transparentSubjectPng } from './image-test-fixtures.ts';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function minimalGlb(): Buffer {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scenes: [{}], scene: 0 }), 'utf8');
  const paddedLength = Math.ceil(json.byteLength / 4) * 4;
  const jsonChunk = Buffer.alloc(paddedLength, 0x20);
  json.copy(jsonChunk);
  const bytes = Buffer.alloc(20 + jsonChunk.byteLength);
  bytes.write('glTF', 0, 'ascii');
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.byteLength, 8);
  bytes.writeUInt32LE(jsonChunk.byteLength, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(bytes, 20);
  return bytes;
}

describe('user asset intake', () => {
  it('registers a structurally valid GLB as a bounded, non-publishable L2 asset', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-user-asset-'));
    roots.push(root);
    const glb = minimalGlb();
    const asset = await importUserAsset({
      schemaVersion: 1,
      brief: '为新型声学设备构建带真实产品拆解的沉浸网页。',
      fileName: 'sound-device.glb',
      contentType: 'model/gltf-binary',
      dataBase64: glb.toString('base64'),
      role: '声学产品主体'
    }, { SIGNAL_ASSET_CACHE_DIR: root });

    expect(asset).toMatchObject({
      kind: 'model-3d',
      modality: 'model-3d',
      source: 'user-provided',
      qualityLevel: 'L2-inspectable',
      publishable: false,
      license: null
    });
    const served = await readGeneratedAsset(asset.id, { SIGNAL_ASSET_CACHE_DIR: root });
    expect(served?.contentType).toBe('model/gltf-binary');
    expect(served?.bytes).toEqual(glb);
  });

  it('rejects a file whose extension and signature do not match', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-user-asset-'));
    roots.push(root);
    await expect(importUserAsset({
      schemaVersion: 1,
      brief: '为新型声学设备构建带真实产品拆解的沉浸网页。',
      fileName: 'fake.glb',
      contentType: 'model/gltf-binary',
      dataBase64: Buffer.from('not a glb').toString('base64')
    }, { SIGNAL_ASSET_CACHE_DIR: root })).rejects.toThrow(/扩展名与文件签名不匹配/);
  });

  it('preserves inspectable multi-state evidence when an uploaded asset is restored', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-user-state-asset-'));
    roots.push(root);
    const png = await transparentSubjectPng();
    const asset = await importUserAsset({
      schemaVersion: 1,
      brief: '为烘焙学习者展示同一发酵罐随参数变化的三个连续状态。',
      fileName: 'fermentation-three-state.png',
      contentType: 'image/png',
      dataBase64: png.toString('base64'),
      role: '同一发酵罐三态主体',
      experience: {
        anchor: .5,
        function: 'persistent',
        visualState: '同一发酵罐从早期、活跃到成熟的三个连续状态。',
        continuity: '三态保持相同罐体、机位、尺度、裁切和光照，只改变罐内发酵状态。',
        integration: 'alpha-subject',
        stateEvidence: {
          mode: 'sequence',
          distinctStates: 3,
          partGroups: 1,
          continuityKey: 'fermentation-jar-r68',
          proof: '单张透明状态表包含同一发酵罐的三个并列连续状态。'
        }
      }
    }, { SIGNAL_ASSET_CACHE_DIR: root });

    const restored = await readCachedUserAsset(asset.id, { SIGNAL_ASSET_CACHE_DIR: root });
    expect(restored).toMatchObject({
      role: '同一发酵罐三态主体',
      qualityLevel: 'L2-inspectable',
      features: { alpha: 'binary', depth: 'none' },
      experience: {
        integration: 'alpha-subject',
        stateEvidence: {
          mode: 'sequence',
          distinctStates: 3,
          continuityKey: 'fermentation-jar-r68'
        }
      }
    });
  });

  it('rejects an opaque PNG that claims to be a transparent subject', async () => {
    const root = await mkdtemp(join(tmpdir(), 'signal-user-opaque-asset-'));
    roots.push(root);
    const png = await opaquePng(512, 512);
    await expect(importUserAsset({
      schemaVersion: 1,
      brief: '为陶艺学习者提供一个透明茶杯主体素材用于交互配方页面。',
      fileName: 'opaque-checkerboard.png',
      contentType: 'image/png',
      dataBase64: png.toString('base64'),
      role: '透明茶杯主体',
      experience: {
        anchor: .5,
        function: 'persistent',
        visualState: '同一只茶杯保持完整可见并响应参数变化。',
        continuity: '茶杯轮廓、机位和尺度保持不变，只改变釉色。',
        integration: 'alpha-subject'
      }
    }, { SIGNAL_ASSET_CACHE_DIR: root })).rejects.toThrow(/真实透明像素/);
  });
});
