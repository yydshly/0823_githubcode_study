import { basename, join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

interface CatalogCase { id: string; }
interface BundleAsset { path: string; kind: string; required?: boolean; }

const projectRoot = resolve(process.cwd());
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('curated case asset integrity', () => {
  it('keeps every required case image as a real shared production asset', async () => {
    const catalog = JSON.parse(await readFile(join(projectRoot, 'cases', 'catalog.json'), 'utf8')) as { cases: CatalogCase[] };
    for (const entry of catalog.cases) {
      const bundle = JSON.parse(await readFile(join(projectRoot, 'cases', 'runs', entry.id, 'bundle.json'), 'utf8')) as { assets?: BundleAsset[] };
      for (const asset of bundle.assets || []) {
        if (asset.required === false || asset.kind === 'font') continue;
        const source = await readFile(join(projectRoot, 'public', 'creative-assets', basename(asset.path)));
        expect(source.byteLength, `${entry.id}/${asset.path} should not be a placeholder`).toBeGreaterThan(1024);
        if (asset.path.toLowerCase().endsWith('.png')) {
          expect(source.subarray(0, pngSignature.length).equals(pngSignature), `${entry.id}/${asset.path} should be a valid PNG`).toBe(true);
        }
      }
    }
  });
});
