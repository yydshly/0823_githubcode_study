import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importUserAsset, readGeneratedAsset } from '../server/asset-generator';

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
});
