import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { casePresentation, type CasePresentation } from '../src/case-presentations';

interface CatalogCase { id: string; stage: string; presentation?: CasePresentation; }

const projectRoot = resolve(process.cwd());

describe('case library presentation', () => {
  it('gives every curated model case its own real preview asset', async () => {
    const catalog = JSON.parse(await readFile(join(projectRoot, 'cases', 'catalog.json'), 'utf8')) as { cases: CatalogCase[] };
    const curated = catalog.cases.filter((entry) => entry.stage === 'featured' || entry.stage === 'refined');
    const urls = curated.map((entry) => {
      const presentation = casePresentation(entry);
      expect(presentation, `${entry.id} needs a dedicated preview`).not.toBeNull();
      return presentation!.assetUrl;
    });
    expect(new Set(urls).size).toBe(curated.length);

    for (const url of urls) {
      expect(url.startsWith('/creative-assets/')).toBe(true);
      const relativeAssetPath = url.replace(/^\//, '');
      const source = await readFile(join(projectRoot, 'public', relativeAssetPath));
      expect(source.byteLength, `${url} should be a real asset`).toBeGreaterThan(1024);
    }
  });

  it('makes stable archives the primary case action', async () => {
    const source = await readFile(join(projectRoot, 'src', 'cases-main.ts'), 'utf8');
    expect(source).toContain("open.href = item.previewUrl");
    expect(source).toContain("open.textContent = isModelFinal ? '打开稳定归档 ↗'");
    expect(source).toContain("source.textContent = '生成记录'");
    expect(source).toContain('casePresentation(item)');
    expect(source).not.toContain('casePresentation(item.id)');
  });
});
