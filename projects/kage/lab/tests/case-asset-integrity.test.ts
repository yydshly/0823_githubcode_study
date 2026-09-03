import { join, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

interface CatalogCase { id: string; }
interface ReportAsset { uri: string; kind: string; required?: boolean; }

const projectRoot = resolve(process.cwd());
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('curated case asset integrity', () => {
  it('keeps every required case image as a real shared production asset', async () => {
    const catalog = JSON.parse(await readFile(join(projectRoot, 'cases', 'catalog.json'), 'utf8')) as { cases: CatalogCase[] };
    for (const entry of catalog.cases) {
      const report = JSON.parse(await readFile(join(projectRoot, 'cases', 'runs', entry.id, 'build-report.json'), 'utf8')) as {
        request?: { reference?: { assets?: ReportAsset[] } };
      };
      for (const asset of report.request?.reference?.assets || []) {
        if (asset.required === false || asset.kind === 'font') continue;
        expect(asset.uri.startsWith('/creative-assets/'), `${entry.id}/${asset.uri} should use the shared asset root`).toBe(true);
        const source = await readFile(join(projectRoot, 'public', asset.uri.replace(/^\//, '')));
        expect(source.byteLength, `${entry.id}/${asset.uri} should not be a placeholder`).toBeGreaterThan(1024);
        if (asset.uri.toLowerCase().endsWith('.png')) {
          expect(source.subarray(0, pngSignature.length).equals(pngSignature), `${entry.id}/${asset.uri} should be a valid PNG`).toBe(true);
        }
      }
    }
  });
});
